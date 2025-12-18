// Supabase Edge Function: extract-recipe
// Secure xAI Grok API integration
//
// SECURITY:
// - XAI_API_KEY stored as Supabase secret (never exposed to browser)
// - User authentication via Supabase JWT (automatic)
//
// MODEL: grok-beta (Multimodal support for OCR + JSON)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4"

// ==============================================================================
// FIXED SYSTEM PROMPT - Identical for ALL calls = Maximum Cache Hits
// ==============================================================================
// This prompt is sent with every request but xAI caches it server-side.
// After the first call, subsequent calls only pay ~25% of the input token cost.
// DO NOT modify this prompt frequently - changes invalidate the cache.
// ==============================================================================
const FIXED_SYSTEM_PROMPT = `Je bent een recept-extractie expert. Analyseer de afbeelding of tekst en voer deze twee stappen uit:

STAP 1: RAW OCR
Transcribeer ALLE zichtbare tekst van de afbeelding letterlijk en volledig.

STAP 2: GESTRUCTUREERDE JSON
Extraheer de informatie uit de OCR en zet deze om in dit JSON formaat:
{
  "title": "...",
  "description": "...",
  "ingredients": [{"amount": number|null, "unit": "...", "item": "..."}],
  "instructions": ["...", "..."],
  "servings": number,
  "prep_time": "...",
  "cook_time": "...",
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "...",
  "ai_tags": ["Nederlandse zoektags"]
}

OUTPUT:
Geef je antwoord in dit exacte formaat:
[RAW_OCR_START]
(hier de volledige transcriptie)
[RAW_OCR_END]

[JSON_START]
(hier de JSON output)
[JSON_END]`

// CORS headers for browser requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { signedUrl, type, textContent } = await req.json()

        // Validate input
        if (type === 'image' && !signedUrl) {
            throw new Error('signedUrl is required for image extraction')
        }
        if (type === 'text' && !textContent) {
            throw new Error('textContent is required for text extraction')
        }

        // Initialize xAI client with server-side secret
        const xai = new OpenAI({
            baseURL: "https://api.x.ai/v1",
            apiKey: Deno.env.get("XAI_API_KEY")
        })

        // Build user message
        const userContent = type === 'image'
            ? [
                { type: "text", text: "Voer OCR uit en extraheer het recept als JSON." },
                { type: "image_url", image_url: { url: signedUrl, detail: "high" } }
            ]
            : `Voer OCR uit en extraheer het recept als JSON uit:\n\n${textContent}`

        console.log(`Processing ${type} request with grok-beta...`)

        const response = await xai.chat.completions.create({
            model: "grok-beta",  // Standard multimodal model
            messages: [
                { role: "system", content: FIXED_SYSTEM_PROMPT },
                { role: "user", content: userContent }
            ],
            max_tokens: 4000,
            temperature: 0.1
        })

        const content = response.choices[0].message.content

        // Extract parts using markers
        const rawOcrMatch = content.match(/\[RAW_OCR_START\]([\s\S]*?)\[RAW_OCR_END\]/)
        const jsonMatch = content.match(/\[JSON_START\]([\s\S]*?)\[JSON_END\]/)

        const raw_ocr = rawOcrMatch ? rawOcrMatch[1].trim() : ''
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.replace(/```json/g, '').replace(/```/g, '').trim()

        let recipe = {}
        try {
            recipe = JSON.parse(jsonStr)
        } catch (e) {
            console.error('Failed to parse inner JSON:', e)
            throw new Error('AI response structure was invalid')
        }

        return new Response(
            JSON.stringify({
                recipe,
                raw_ocr,
                raw_response: content,
                usage: {
                    prompt_tokens: response.usage?.prompt_tokens || 0,
                    completion_tokens: response.usage?.completion_tokens || 0,
                    total_tokens: response.usage?.total_tokens || 0
                }
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('Edge function error:', error)

        return new Response(
            JSON.stringify({
                error: error.message || 'Unknown error occurred',
                details: error.toString()
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})

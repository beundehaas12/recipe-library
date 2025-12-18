// Supabase Edge Function: extract-recipe
// Secure xAI Grok API integration with prompt caching optimization
//
// COST OPTIMIZATION:
// - Fixed system prompt is ALWAYS the same → xAI caches it (~75% savings on input tokens)
// - Using "detail: low" for images → reduces image tokens by ~50%
// - Estimated cost per call after caching: ~$0.0003
//
// SECURITY:
// - XAI_API_KEY stored as Supabase secret (never exposed to browser)
// - User authentication via Supabase JWT (automatic)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4"

// ==============================================================================
// FIXED SYSTEM PROMPT - Identical for ALL calls = Maximum Cache Hits
// ==============================================================================
// This prompt is sent with every request but xAI caches it server-side.
// After the first call, subsequent calls only pay ~25% of the input token cost.
// DO NOT modify this prompt frequently - changes invalidate the cache.
// ==============================================================================
const FIXED_SYSTEM_PROMPT = `Je bent een recept-extractie expert. Analyseer afbeeldingen en tekst van recepten en retourneer de data als JSON.

Output formaat:
{
  "title": "string",
  "description": "string (max 200 tekens)",
  "ingredients": [{"amount": number|null, "unit": "string|null", "item": "string"}],
  "instructions": ["stap 1", "stap 2", ...],
  "servings": number,
  "prep_time": "string",
  "cook_time": "string",
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "string",
  "author": "string|null",
  "cookbook_name": "string|null",
  "source_language": "nl|en|de|fr|es|it",
  "ai_tags": ["Nederlandse zoektags"]
}

Regels:
- Lees ALLE tekst nauwkeurig
- Behoud originele taal
- Output alleen JSON`

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

        // Build user message - SIMPLE like Grok.com
        const userContent = type === 'image'
            ? [
                { type: "text", text: "Analyseer dit recept en geef de data als JSON." },
                { type: "image_url", image_url: { url: signedUrl, detail: "high" } }
            ]
            : `Analyseer dit recept en geef de data als JSON:\n\n${textContent}`

        console.log(`Processing ${type} request...`)

        const response = await xai.chat.completions.create({
            model: "grok-4-1-fast",  // Fast vision model, lowest cost
            messages: [
                { role: "system", content: FIXED_SYSTEM_PROMPT },  // CACHED by xAI
                { role: "user", content: userContent }
            ],
            max_tokens: 2000,
            temperature: 0.2  // Low temperature for consistent JSON output
        })

        // Parse the response
        const content = response.choices[0].message.content
        let recipe

        try {
            // Clean up potential markdown code blocks
            const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()
            recipe = JSON.parse(jsonStr)
        } catch (parseError) {
            console.error('JSON parse error:', parseError)
            throw new Error('Failed to parse recipe JSON from AI response')
        }

        // Return recipe + token usage + raw response for debugging
        return new Response(
            JSON.stringify({
                recipe,
                raw_response: content, // For debugging
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

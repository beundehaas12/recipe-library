// Supabase Edge Function: extract-recipe
// Clean implementation using Grok 4 for OCR and structured extraction.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4"

const FIXED_SYSTEM_PROMPT = `Je bent een recept-extractie expert. Analyseer de afbeelding of tekst en voer deze drie stappen uit:

STAP 1: RAW OCR
Transcribeer ALLE zichtbare tekst van de afbeelding letterlijk en volledig.

STAP 2: LOGISCHE REDENERING
Analyseer de transcribed tekst. Identificeer de verschillende onderdelen van het recept. Besteed extra aandacht aan metadata die verstopt kan zijn, zoals bereidingstijden (prep/cook time), aantal porties en moeilijkheidsgraad. Als tijden niet expliciet genoemd worden, probeer ze dan logisch in te schatten op basis van de instructies.

STAP 3: GESTRUCTUREERDE JSON
Zet de informatie om in dit JSON formaat:
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

[REASONING_START]
(hier je logische redenering en analyse)
[REASONING_END]

[JSON_START]
(hier de JSON output)
[JSON_END]`

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { signedUrl, type, textContent } = await req.json()

        const xai = new OpenAI({
            baseURL: "https://api.x.ai/v1",
            apiKey: Deno.env.get("XAI_API_KEY")
        })

        const userContent = type === 'image'
            ? [
                { type: "text", text: "Voer OCR uit, redeneer over de data en extraheer het recept als JSON." },
                { type: "image_url", image_url: { url: signedUrl, detail: "high" } }
            ]
            : `Voer OCR uit, redeneer over de data en extraheer het recept als JSON uit:\n\n${textContent}`

        const response = await xai.chat.completions.create({
            model: "grok-4-1-fast-reasoning",
            messages: [
                { role: "system", content: FIXED_SYSTEM_PROMPT },
                { role: "user", content: userContent }
            ],
            max_tokens: 4000,
            temperature: 0.1
        })

        const content = response.choices[0].message.content
        const rawOcrMatch = content.match(/\[RAW_OCR_START\]([\s\S]*?)\[RAW_OCR_END\]/)
        const reasoningMatch = content.match(/\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/)
        const jsonMatch = content.match(/\[JSON_START\]([\s\S]*?)\[JSON_END\]/)

        const raw_ocr = rawOcrMatch ? rawOcrMatch[1].trim() : ''
        const reasoning = reasoningMatch ? reasoningMatch[1].trim() : ''
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.replace(/```json/g, '').replace(/```/g, '').trim()

        let recipe = {}
        try {
            recipe = JSON.parse(jsonStr)
        } catch (e) {
            console.error('Failed to parse recipe JSON:', e)
            throw new Error('AI response structure was invalid')
        }

        return new Response(
            JSON.stringify({
                recipe,
                raw_ocr,
                reasoning,
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

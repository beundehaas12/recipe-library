// Supabase Edge Function: extract-recipe
// CLEAN SLATE REFACTOR: Simple, direct Gemini 3 integration.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Je bent een recept-assistent.
DOEL: Extraheer structuur uit de input.
MODEL: Gebruik je visuele en tekstuele capaciteiten maximaal.

STRUCTUUR (JSON):
{
  "title": string,
  "description": string (korte samenvatting),
  "ingredients": [{ "amount": number|null, "unit": string|null, "name": string, "group_name": string|null }],
  "instructions": [{ "step_number": number, "description": string }],
  "prep_time": string|null,
  "cook_time": string|null,
  "servings": number|null,
  "difficulty": string|null,
  "cuisine": string|null,
  "ai_tags": string[],
  "introduction": string|null
}

REGELS:
1. Wees trouw aan de bron. Verzin niets.
2. Vul metadata (tijden, personen) alleen in als je het ziet of zeker weet.
3. Splits ingrediënten netjes (500g bloem -> 500, g, bloem).
`

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { signedUrl, type, textContent, recipeData } = await req.json()
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured")

        console.log(`Analyzing [${type}] with Gemini 3 Flash Preview...`)

        let parts: any[] = []

        // 1. Construct Request Parts based on Type
        if (type === 'image' || type === 'vision_review') {
            if (!signedUrl) throw new Error("No signedUrl provided for image analysis");

            const imageResponse = await fetch(signedUrl)
            if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.status}`)
            const imageBuffer = await imageResponse.arrayBuffer()
            const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
            const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

            parts = [
                { text: SYSTEM_PROMPT + "\n\nExtraheer het recept uit deze afbeelding." },
                { inline_data: { mime_type: mimeType, data: base64 } }
            ]
        }
        else if (type === 'text') {
            parts = [{ text: SYSTEM_PROMPT + `\n\nExtraheer het recept uit deze tekst:\n${textContent}` }]
        }
        else if (type === 'review') {
            // For pure text review, we pass the current data as context
            parts = [{ text: SYSTEM_PROMPT + `\n\nVerbeter de structuur van deze data (behoud feiten):\n${JSON.stringify(recipeData)}` }]
        }
        else {
            throw new Error(`Unknown type: ${type}`)
        }

        // 2. Call Gemini API (v1beta) - gemini-3-flash-preview
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: 0.1, // Slight creativity for interpretation, but low for facts
                        maxOutputTokens: 8192,
                        responseMimeType: "application/json" // Enforce JSON
                    }
                })
            }
        )

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`Gemini API Error: ${err}`)
        }

        const data = await response.json()
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

        console.log("Gemini Output:", rawText.substring(0, 100) + "...")

        // 3. Simple JSON Parse (Model is forced to output JSON)
        const recipe = JSON.parse(rawText)

        const usage = {
            total_tokens: data.usageMetadata?.totalTokenCount || 0,
            prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
            completion_tokens: data.usageMetadata?.candidatesTokenCount || 0
        }

        return new Response(
            JSON.stringify({ recipe, usage, raw_response: rawText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error("Error:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

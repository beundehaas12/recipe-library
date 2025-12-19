// Supabase Edge Function: extract-recipe
// Using Google Gemini Flash 3 for OCR and structured extraction
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const IMPROVED_SYSTEM_PROMPT = `Je helpt een thuiskok om recepten uit hun eigen kookboeken en foto's te organiseren voor persoonlijk gebruik.
Analyseer de afbeelding en extraheer de receptinformatie naar een gestructureerd JSON formaat.

BELANGRIJKE RICHTLIJNEN:
- Dit is voor persoonlijk gebruik van de gebruiker om hun eigen recepten te organiseren
- Extraheer alle zichtbare informatie nauwkeurig
- Bewaar hoeveelheden, eenheden en tijden precies zoals getoond
- Als er ingrediëntgroepen zijn (kopjes zoals "Vulling", "Saus"), gebruik dan group_name
- Identificeer benodigde keukengerei uit de bereidingswijze
- Vul alleen metadata in die expliciet zichtbaar is

STRUCTUUR:
- Elke bereidingsstap als apart object met step_number
- Ingrediënten met amount, unit, name, optioneel group_name
- Introductietekst (vaak cursief) naar introduction veld

Geef ALLEEN de JSON output in dit formaat:

{
  "title": string,
  "subtitle": string | null,
  "introduction": string | null,
  "description": string,
  "ingredients": [
    {
      "amount": number | null,
      "unit": string | null,
      "name": string,
      "group_name": string | null,
      "notes": string | null
    }
  ],
  "instructions": [
    {
      "step_number": number,
      "description": string,
      "extra": { "tips": string | null, "time": string | null } | null
    }
  ],
  "tools": [{ "name": string, "notes": string | null }],
  "servings": number | null,
  "prep_time": string | null,
  "cook_time": string | null,
  "difficulty": "Easy" | "Medium" | "Hard" | null,
  "cuisine": string | null,
  "ai_tags": [string],
  "extra_data": {}
}`

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { signedUrl, type, textContent, recipeData } = await req.json()
        console.log('Request received:', { type, hasSignedUrl: !!signedUrl })

        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY not configured")
        }

        let systemPrompt = IMPROVED_SYSTEM_PROMPT
        let parts: any[] = []

        if (type === 'image') {
            console.log('Fetching image...')
            const imageResponse = await fetch(signedUrl)
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.status}`)
            }
            const imageBuffer = await imageResponse.arrayBuffer()

            // Chunked base64 encoding
            let base64 = ''
            const bytes = new Uint8Array(imageBuffer)
            const chunkSize = 8192
            for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.slice(i, i + chunkSize)
                base64 += String.fromCharCode.apply(null, Array.from(chunk))
            }
            base64 = btoa(base64)

            const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
            console.log('Image size:', imageBuffer.byteLength, 'bytes')

            parts = [
                { text: systemPrompt + "\n\nAnalyse de afbeelding grondig. Zoek specifiek naar TIJDEN (bereidingstijd, wachttijd, oventijd, bijv. '7 uur', '30 min'). Extraheer het recept. Geef ALLEEN de JSON output." },
                { inline_data: { mime_type: mimeType, data: base64 } }
            ]
        } else if (type === 'text') {
            parts = [{ text: systemPrompt + `\n\nExtraheer het recept uit de volgende tekst. Let goed op bereidingstijden.\n\n${textContent}\n\nGeef ALLEEN de JSON output.` }]
        } else if (type === 'review' || type === 'vision_review') {
            systemPrompt = `Je bent een recept-validatie expert.
HUIDIGE DATA:
${JSON.stringify(recipeData, null, 2)}

OPDRACHT:
1. Vergelijk de data met de bron (afbeelding/tekst).
2. Vul ONTBREKENDE velden aan. Zoek specifiek naar TIJDEN (prep_time, cook_time) zoals '7 uur', '45 min', '2u30'.
3. Corrigeer foutieve waarden.
4. Behoud correcte data.
5. Hallucineer niets.

Geef ALLEEN de verbeterde JSON.`

            if (type === 'vision_review') {
                const imageResponse = await fetch(signedUrl)
                if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.status}`)
                const imageBuffer = await imageResponse.arrayBuffer()
                let base64 = ''
                const bytes = new Uint8Array(imageBuffer)
                for (let i = 0; i < bytes.length; i += 8192) {
                    base64 += String.fromCharCode.apply(null, Array.from(bytes.slice(i, i + 8192)))
                }
                base64 = btoa(base64)
                const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
                parts = [
                    { text: systemPrompt + "\n\nVerbeter de receptdata op basis van de afbeelding. Zoek goed naar tijden!" },
                    { inline_data: { mime_type: mimeType, data: base64 } }
                ]
            } else {
                parts = [{ text: systemPrompt + "\n\nValideer en verbeter de receptdata." }]
            }
        } else {
            throw new Error(`Unsupported type: ${type}`)
        }

        console.log('Calling Gemini API...')

        // User's exact URL with v1 API format
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 8192
                    }
                })
            }
        )

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text()
            console.error('Gemini API error:', errorText)
            throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText.substring(0, 300)}`)
        }

        const geminiData = await geminiResponse.json()
        console.log('Gemini response structure:', JSON.stringify({
            hasCandidate: !!geminiData.candidates?.[0],
            finishReason: geminiData.candidates?.[0]?.finishReason,
            safetyRatings: geminiData.candidates?.[0]?.safetyRatings,
            blockReason: geminiData.promptFeedback?.blockReason,
            contentParts: geminiData.candidates?.[0]?.content?.parts?.length
        }))

        const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

        if (!content) {
            const blockReason = geminiData.promptFeedback?.blockReason
            const finishReason = geminiData.candidates?.[0]?.finishReason
            console.error('Empty response details:', JSON.stringify(geminiData, null, 2).substring(0, 2000))
            throw new Error(`Empty response from Gemini (block: ${blockReason}, finish: ${finishReason})`)
        }

        // Parse JSON with multiple fallback strategies
        let jsonStr = content.trim()
        console.log('Raw content first 300 chars:', jsonStr.substring(0, 300))

        // Try code block extraction
        const codeBlockMatch = jsonStr.match(/```json?\n?([\s\S]*?)\n?```/)
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim()
        }

        // Try to find JSON object directly
        if (!jsonStr.startsWith('{')) {
            const jsonStart = jsonStr.indexOf('{')
            const jsonEnd = jsonStr.lastIndexOf('}')
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1)
            }
        }

        let recipe = {}
        try {
            recipe = JSON.parse(jsonStr)
        } catch (e) {
            console.error('JSON parse error. Attempted to parse:', jsonStr.substring(0, 1000))
            // Return the raw content so we can see what's happening
            return new Response(
                JSON.stringify({
                    error: 'Invalid JSON from AI',
                    rawContent: content.substring(0, 2000),
                    attemptedParse: jsonStr.substring(0, 1000)
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        const usage = geminiData.usageMetadata || {}

        return new Response(
            JSON.stringify({
                recipe,
                raw_response: content,
                usage: {
                    prompt_tokens: usage.promptTokenCount || 0,
                    completion_tokens: usage.candidatesTokenCount || 0,
                    total_tokens: usage.totalTokenCount || 0
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error: unknown) {
        const err = error as Error
        console.error('Edge function error:', err)
        return new Response(
            JSON.stringify({ error: err.message || 'Unknown error', details: err.toString() }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

// Supabase Edge Function: extract-recipe
// Using Google Gemini Flash 3 for OCR and structured extraction
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const IMPROVED_SYSTEM_PROMPT = `Je bent een uiterst precieze recept-extractie expert met visuele analysevaardigheden.
Je taak is om een recept uit een afbeelding of tekst zo ACCURAAT en GETROUW mogelijk te extraheren.

⚠️ KRITIEK: NEEM DE TIJD - HAAST JE NIET!
Voordat je output genereert:
1. Lees de VOLLEDIGE afbeelding/tekst TWEE KEER door
2. Verifieer ELKE ingrediënt letter voor letter
3. Verifieer ELKE instructiestap woord voor woord
4. Tel het aantal ingrediënten en stappen - komt dit overeen met de bron?
5. Controleer of je NIETS hebt overgeslagen

KRITIEKE REGELS:
- Baseer ALLES uitsluitend op wat zichtbaar is in de bron. Hallucineer NIETS.
- TRANSCRIBEER instructies WOORD-VOOR-WOORD zoals ze geschreven staan - herformuleer NIET.
- Transcribeer hoeveelheden, eenheden, tijden en temperaturen EXACT zoals ze staan (bijv. "250g", "½ tl", "15-20 min", "180°C").
- Bewaar originele formuleringen, spaties en opmaak exact zoals geschreven.
- Als iets onduidelijk is, gebruik null of voeg een korte note toe – verzin nooit details.
- Groepeer ingrediënten logisch op basis van kopjes of visuele secties (bijv. "Vulling", "Velouté", "Paneren").
- Identificeer benodigde gereedschappen (oven, blender, pan, frituurpan, etc.) uit de instructies.
- Vul metadata (porties, tijden, moeilijkheidsgraad, keuken) alleen in als ze expliciet vermeld staan.
- Extraheer introductie/verhaal tekst (vaak cursief/italic) EXACT zoals geschreven naar het "introduction" veld.

INSTRUCTIES BELANGRIJK:
- Elke stap moet LETTERLIJK overeenkomen met de tekst in de bron
- Combineer GEEN stappen die apart geschreven staan
- Sla GEEN stappen over, ook niet als ze kort of obvious lijken
- Behoud de EXACTE volgorde uit de bron

OUTPUT:
Geef ALLEEN de JSON in exact dit formaat, zonder extra tekst, uitleg of secties.

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
                { text: systemPrompt + "\n\nAnalyse de afbeelding grondig en extraheer het recept. Geef ALLEEN de JSON output." },
                { inline_data: { mime_type: mimeType, data: base64 } }
            ]
        } else if (type === 'text') {
            parts = [{ text: systemPrompt + `\n\nExtraheer het recept uit de volgende tekst:\n\n${textContent}\n\nGeef ALLEEN de JSON output.` }]
        } else if (type === 'review' || type === 'vision_review') {
            systemPrompt = `Je bent een recept-validatie expert.
HUIDIGE DATA:
${JSON.stringify(recipeData, null, 2)}

Valideer, corrigeer fouten, en vul ontbrekende info aan. Hallucineer niets.
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
                    { text: systemPrompt + "\n\nVerbeter de receptdata op basis van de afbeelding." },
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
            `https://generativelanguage.googleapis.com/v1/models/gemini-3-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 4000
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
        const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

        if (!content) {
            console.error('Empty response:', JSON.stringify(geminiData).substring(0, 500))
            throw new Error('Empty response from Gemini')
        }

        // Parse JSON
        let jsonStr = content.trim()
        const codeBlockMatch = jsonStr.match(/```json?\n?([\s\S]*?)\n?```/)
        if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim()

        let recipe = {}
        try {
            recipe = JSON.parse(jsonStr)
        } catch (e) {
            console.error('JSON parse error:', content.substring(0, 500))
            throw new Error('Invalid JSON from AI')
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

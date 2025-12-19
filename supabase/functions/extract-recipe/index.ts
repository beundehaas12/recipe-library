// Supabase Edge Function: extract-recipe
// Using Google Gemini Flash for OCR and structured extraction
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

INSTRUCTIES BELANGRIJK:
- Elke stap moet LETTERLIJK overeenkomen met de tekst in de bron
- Combineer GEEN stappen die apart geschreven staan
- Sla GEEN stappen over, ook niet als ze kort of obvious lijken
- Behoud de EXACTE volgorde uit de bron

OUTPUT:
Geef ALLEEN de JSON in exact dit formaat, zonder extra tekst, uitleg of secties.

{
  "title": string,
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

// Helper to encode ArrayBuffer to base64 without stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 8192 // Process in chunks to avoid stack overflow
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize)
        binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    return btoa(binary)
}

serve(async (req) => {
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

        let systemInstruction = IMPROVED_SYSTEM_PROMPT
        let parts: any[] = []

        if (type === 'image') {
            console.log('Fetching image...')
            const imageResponse = await fetch(signedUrl)
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.status}`)
            }
            const imageBuffer = await imageResponse.arrayBuffer()
            console.log('Image size:', imageBuffer.byteLength, 'bytes')

            // Use chunked base64 encoding to avoid stack overflow
            const base64Image = arrayBufferToBase64(imageBuffer)
            const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
            console.log('Base64 length:', base64Image.length)

            parts = [
                { text: "Analyse de afbeelding grondig en extraheer het recept volgens de instructies. Geef ALLEEN de JSON output." },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Image
                    }
                }
            ]
        } else if (type === 'text') {
            parts = [{ text: `Extraheer het recept uit de volgende tekst:\n\n${textContent}\n\nGeef ALLEEN de JSON output.` }]
        } else if (type === 'review' || type === 'vision_review') {
            systemInstruction = `Je bent een recept-validatie expert.
Je hebt de huidige geëxtraheerde receptdata en (mogelijk) de originele afbeelding/tekst.
Je taak is om de data te controleren, fouten te corrigeren en ontbrekende informatie aan te vullen – ALLEEN op basis van wat zichtbaar is.

HUIDIGE DATA:
${JSON.stringify(recipeData, null, 2)}

BELANGRIJK:
- Behoud alles wat correct is.
- Corrigeer alleen duidelijke fouten.
- Vul alleen aan wat expliciet in de bron staat.
- Hallucineer niets.

Geef ALLEEN de verbeterde JSON in exact hetzelfde formaat.`

            if (type === 'vision_review') {
                const imageResponse = await fetch(signedUrl)
                if (!imageResponse.ok) {
                    throw new Error(`Failed to fetch image: ${imageResponse.status}`)
                }
                const imageBuffer = await imageResponse.arrayBuffer()
                const base64Image = arrayBufferToBase64(imageBuffer)
                const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

                parts = [
                    { text: "Bekijk de afbeelding opnieuw en verbeter de huidige receptdata waar nodig. Geef ALLEEN de JSON output." },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image
                        }
                    }
                ]
            } else {
                parts = [{ text: "Valideer en verbeter de huidige receptdata op basis van de beschikbare informatie. Geef ALLEEN de JSON output." }]
            }
        } else {
            throw new Error(`Unsupported type: ${type}`)
        }

        console.log('Calling Gemini API...')

        // Build request body as object first, then stringify
        const requestBody = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts }],
            generationConfig: {
                temperature: 0.0,
                maxOutputTokens: 4000,
                responseMimeType: "application/json"
            }
        }

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        )

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text()
            console.error('Gemini API error:', errorText)
            throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText.substring(0, 200)}`)
        }

        const geminiData = await geminiResponse.json()
        console.log('Gemini response received')

        const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (!content) {
            const blockReason = geminiData.candidates?.[0]?.finishReason
            console.error('Empty or blocked response:', blockReason, JSON.stringify(geminiData).substring(0, 500))
            throw new Error(`Empty response from Gemini (reason: ${blockReason})`)
        }

        // Parse JSON from response
        let jsonStr = content.trim()

        // Try to extract JSON if wrapped in code blocks
        const codeBlockMatch = jsonStr.match(/```json?\n?([\s\S]*?)\n?```/)
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim()
        }

        let recipe = {}
        try {
            recipe = JSON.parse(jsonStr)
        } catch (e) {
            console.error('Failed to parse JSON:', e)
            console.error('Raw output (first 500 chars):', content.substring(0, 500))
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
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        console.error('Edge function error:', error)
        return new Response(
            JSON.stringify({
                error: error.message || 'Unknown error',
                details: error.toString()
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})

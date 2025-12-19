// Supabase Edge Function: extract-recipe
// Using Google Gemini Flash for OCR and structured extraction
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

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

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                temperature: 0,
                maxOutputTokens: 4000,
                responseMimeType: "application/json"
            }
        })

        let prompt = IMPROVED_SYSTEM_PROMPT + "\n\n"
        let imagePart: any = null

        if (type === 'image') {
            console.log('Fetching image...')
            const imageResponse = await fetch(signedUrl)
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.status}`)
            }
            const imageBuffer = await imageResponse.arrayBuffer()
            const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer).slice(0, 50000)))
            // For large images, we need to fetch in chunks
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

            imagePart = {
                inlineData: {
                    mimeType: mimeType,
                    data: base64
                }
            }
            prompt += "Analyse de afbeelding grondig en extraheer het recept. Geef ALLEEN de JSON output."
        } else if (type === 'text') {
            prompt += `Extraheer het recept uit de volgende tekst:\n\n${textContent}\n\nGeef ALLEEN de JSON output.`
        } else if (type === 'review' || type === 'vision_review') {
            prompt = `Je bent een recept-validatie expert.
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
                let base64 = ''
                const bytes = new Uint8Array(imageBuffer)
                const chunkSize = 8192
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    const chunk = bytes.slice(i, i + chunkSize)
                    base64 += String.fromCharCode.apply(null, Array.from(chunk))
                }
                base64 = btoa(base64)
                const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

                imagePart = {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64
                    }
                }
            }
        } else {
            throw new Error(`Unsupported type: ${type}`)
        }

        console.log('Calling Gemini API...')

        let result
        if (imagePart) {
            result = await model.generateContent([prompt, imagePart])
        } else {
            result = await model.generateContent(prompt)
        }

        const response = result.response
        const content = response.text()
        console.log('Gemini response received, length:', content.length)

        if (!content) {
            throw new Error('Empty response from Gemini API')
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

        const usage = response.usageMetadata || {}

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
    } catch (error: unknown) {
        const err = error as Error
        console.error('Edge function error:', err)
        return new Response(
            JSON.stringify({
                error: err.message || 'Unknown error',
                details: err.toString()
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})

// Supabase Edge Function: extract-recipe
// Improved version – minimal hallucinations, direct structured extraction using Grok
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4"

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
Geef ALLEEN de JSON in exact dit formaat, zonder extra tekst, uitleg of secties zoals RAW_OCR of REASONING.

[JSON_START]
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
}
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
        const { signedUrl, type, textContent, recipeData, sourceData } = await req.json()

        const xai = new OpenAI({
            baseURL: "https://api.x.ai/v1",
            apiKey: Deno.env.get("XAI_API_KEY")
        })

        let systemPrompt = IMPROVED_SYSTEM_PROMPT
        let userContent: any = "Extraheer het recept zo precies mogelijk en geef alleen de JSON."

        if (type === 'image') {
            userContent = [
                { type: "text", text: "Analyse de afbeelding grondig en extraheer het recept volgens de instructies." },
                { type: "image_url", image_url: { url: signedUrl, detail: "high" } }
            ]
        } else if (type === 'text') {
            userContent = `Extraheer het recept uit de volgende tekst:\n\n${textContent}`
        } else if (type === 'review' || type === 'vision_review') {
            // Unified review prompt – works with or without image
            systemPrompt = `Je bent een recept-validatie expert.
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
                userContent = [
                    { type: "text", text: "Bekijk de afbeelding opnieuw en verbeter de huidige receptdata waar nodig." },
                    { type: "image_url", image_url: { url: signedUrl, detail: "high" } }
                ]
            } else {
                userContent = "Valideer en verbeter de huidige receptdata op basis van de beschikbare informatie."
            }
        } else {
            throw new Error('Unsupported type')
        }

        const response = await xai.chat.completions.create({
            model: "grok-4-1-fast", // or "grok-4" if available and budget allows
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent }
            ],
            max_tokens: 4000,
            temperature: 0.0, // Even lower for maximum consistency
        })

        const content = response.choices[0].message.content || ''

        // Robust JSON extraction
        const jsonMatch = content.match(/\[JSON_START\]([\s\S]*?)\[JSON_END\]/)
        let jsonStr = jsonMatch ? jsonMatch[1].trim() : ''

        // Fallback: look for code block
        if (!jsonStr) {
            const codeBlockMatch = content.match(/```json?\n?([\s\S]*?)\n?```/)
            if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim()
        }

        // Final fallback: assume whole content is JSON (after trimming markers)
        if (!jsonStr) {
            jsonStr = content
                .replace(/\[JSON_START\]/g, '')
                .replace(/\[JSON_END\]/g, '')
                .trim()
        }

        let recipe = {}
        try {
            recipe = JSON.parse(jsonStr)
        } catch (e) {
            console.error('Failed to parse JSON:', e)
            console.error('Raw AI output:', content)
            throw new Error('Invalid JSON structure from AI')
        }

        return new Response(
            JSON.stringify({
                recipe,
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

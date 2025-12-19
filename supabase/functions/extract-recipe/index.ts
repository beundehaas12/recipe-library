// Supabase Edge Function: extract-recipe
// Clean implementation using Grok 4 for OCR and structured extraction.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4"

const FIXED_SYSTEM_PROMPT = `Je bent een recept-extractie expert. Analyseer de afbeelding of tekst en voer deze drie stappen STRIKT GESCHEIDEN uit:

STAP 1: EXACTE OCR TRANSCRIPTIE (KRITISCH BELANGRIJK!)
⚠️ Dit is de BELANGRIJKSTE stap. Transcribeer ELKE LETTER, CIJFER en SYMBOOL van de afbeelding.

REGELS VOOR STAP 1:
- Scan de VOLLEDIGE afbeelding van links naar rechts, boven naar beneden
- Neem LETTERLIJK alles over: elk woord, elke spatie, elk leesteken
- GEEN correcties, interpretaties of aanpassingen
- Bewaar EXACTE hoeveelheden: "250g" blijft "250g", "½" blijft "½"
- Bewaar EXACTE tijden: "15-20 min" blijft "15-20 min"
- Bewaar EXACTE temperaturen: "180°C" blijft "180°C"
- Typfouten in de bron? BEWAAR ZE - corrigeer NIETS
- Handgeschreven tekst? Transcribeer exact zoals geschreven
- Meerdere kolommen? Transcribeer van links naar rechts, daarna volgende rij
- Dit is een FORENSISCHE transcriptie - behandel het als juridisch bewijs

STAP 2: LOGISCHE REDENERING
Analyseer NU (niet eerder!) de transcriptie. Identificeer:
- Ingrediënten, eventueel GEGROEPEERD (bijv. "Voor de saus", "Voor het deeg")
- Instructies/stappen in de correcte volgorde
- Benodigde gereedschappen/apparatuur
- Metadata: bereidingstijd, kooktijd, porties, moeilijkheid
- Extra info: voedingswaarden, wijnadvies, tips, variaties

STAP 3: GESTRUCTUREERDE JSON
Zet de informatie om in dit JSON formaat:
{
  "title": "...",
  "description": "...",
  "ingredients": [
    {"amount": number|null, "unit": "...", "name": "...", "group_name": "...|null", "notes": "...|null"}
  ],
  "instructions": [
    {"step_number": 1, "description": "...", "extra": {"tips": "...", "time": "..."} | null}
  ],
  "tools": [{"name": "...", "notes": "...|null"}],
  "servings": number,
  "prep_time": "...",
  "cook_time": "...",
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "...",
  "ai_tags": ["Nederlandse zoektags"],
  "extra_data": {"nutrition": {...}, "pairings": [...], "tips": [...]}
}

BELANGRIJK:
- "group_name" is voor ingrediënt groepen zoals "Voor de saus", "Hoofdgerecht", "Afwerking"
- "tools" lijst bevat benodigde apparatuur (oven, blender, etc.)
- "extra_data" bevat flexibele info die niet in standaardvelden past

OUTPUT:
Geef je antwoord in dit exacte formaat:
[RAW_OCR_START]
(hier de 100% EXACTE transcriptie - ELKE letter zoals in de foto)
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
        const { signedUrl, type, textContent, recipeData, sourceData } = await req.json()

        const xai = new OpenAI({
            baseURL: "https://api.x.ai/v1",
            apiKey: Deno.env.get("XAI_API_KEY")
        })

        let userContent: string | any[];
        let systemPrompt = FIXED_SYSTEM_PROMPT;

        if (type === 'image') {
            userContent = [
                { type: "text", text: "Voer OCR uit, redeneer over de data en extraheer het recept als JSON." },
                { type: "image_url", image_url: { url: signedUrl, detail: "high" } }
            ];
        } else if (type === 'review') {
            // Special review prompt - validate and enrich existing data
            systemPrompt = `Je bent een recept-validatie expert. Je taak is om bestaande receptdata te valideren, corrigeren en verrijken op basis van de originele bron.

BELANGRIJK: Behoud ALLE bestaande correcte data. Corrigeer alleen wat fout is. Vul ontbrekende velden aan.

BESTAANDE RECEPT DATA:
${JSON.stringify(recipeData, null, 2)}

ORIGINELE BRON DATA:
${sourceData || 'Geen brondata beschikbaar'}

OPDRACHT:
1. Vergelijk de bestaande data met de bron
2. Corrigeer fouten (bijv. verkeerde ingrediënt hoeveelheden)
3. Vul ontbrekende metadata aan (prep_time, cook_time, servings, difficulty)
4. Identificeer ingrediënt GROEPEN ("Voor de saus", "Hoofdgerecht", etc.)
5. Identificeer benodigde GEREEDSCHAPPEN
6. BEHOUD alle correcte informatie

OUTPUT: Geef ALLEEN de gecorrigeerde/verrijkte JSON:
[JSON_START]
{
  "title": "...",
  "description": "...",
  "ingredients": [{"amount": number|null, "unit": "...", "name": "...", "group_name": "...|null", "notes": "...|null"}],
  "instructions": [{"step_number": 1, "description": "...", "extra": {...}|null}],
  "tools": [{"name": "...", "notes": "...|null"}],
  "servings": number,
  "prep_time": "...",
  "cook_time": "...",
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "...",
  "ai_tags": [...],
  "extra_data": {...}
}
[JSON_END]`;
            userContent = "Valideer en verrijk het recept. Geef de gecorrigeerde JSON.";
        } else if (type === 'vision_review') {
            // Vision-based review - re-examine photo with existing data context
            systemPrompt = `Je bent een recept-validatie expert met visuele analyse. Je hebt toegang tot de ORIGINELE FOTO en de HUIDIGE geëxtraheerde data.

HUIDIGE GEËXTRAHEERDE DATA:
${JSON.stringify(recipeData, null, 2)}

OPDRACHT:
Bekijk de foto ZEER GRONDIG en vergelijk met de huidige data. Verbeter en verrijk waar nodig.

FOCUS OP ALLE RECEPT-ONDERDELEN:
1. **TITEL**: Is deze correct en volledig?
2. **BESCHRIJVING**: Voeg context toe als deze ontbreekt
3. **INGREDIËNTEN**: Controleer ELKE ingrediënt - hoeveelheid, eenheid, naam. Mis je iets? Let op GROEPEN ("Voor de saus", etc.)
4. **INSTRUCTIES**: Zijn alle stappen aanwezig en in de juiste volgorde?
5. **GEREEDSCHAPPEN**: Welke tools/apparaten zijn nodig?
6. **BEREIDINGSTIJD** (prep_time): Tijd voor voorbereiden
7. **KOOKTIJD** (cook_time): Tijd voor daadwerkelijk koken/bakken
8. **PORTIES** (servings): Aantal personen/porties
9. **MOEILIJKHEID** (difficulty): Easy/Medium/Hard
10. **KEUKEN** (cuisine): Italiaans, Nederlands, etc.
11. **AI TAGS**: Zoektags in het Nederlands

BELANGRIJK:
- Behoud wat CORRECT is
- Corrigeer wat FOUT is
- Vul aan wat ONTBREEKT

OUTPUT: Geef de verbeterde JSON:
[JSON_START]
{
  "title": "...",
  "description": "...",
  "ingredients": [{"amount": number|null, "unit": "...", "name": "...", "group_name": "...|null", "notes": "...|null"}],
  "instructions": [{"step_number": 1, "description": "...", "extra": {...}|null}],
  "tools": [{"name": "...", "notes": "...|null"}],
  "servings": number,
  "prep_time": "...",
  "cook_time": "...",
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "...",
  "ai_tags": [...],
  "extra_data": {...}
}
[JSON_END]`;
            userContent = [
                { type: "text", text: "Analyseer deze foto GRONDIG. Vergelijk met de huidige data en verbeter waar nodig. Geef de complete, verbeterde JSON." },
                { type: "image_url", image_url: { url: signedUrl, detail: "high" } }
            ];
        } else {
            userContent = `Voer OCR uit, redeneer over de data en extraheer het recept als JSON uit:\n\n${textContent}`;
        }

        const response = await xai.chat.completions.create({
            model: "grok-4",
            messages: [
                { role: "system", content: systemPrompt },
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

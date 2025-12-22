// Supabase Edge Function: extract-recipe
// Mistral OCR 3 (mistral-ocr-latest) for raw image extraction
// Grok 4.1 Fast Reasoning for structuring, analysis, and enrichment
// Updated: 2025-12-20

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================================================
// PROMPTS
// =============================================================================

const EXTRACTION_PROMPT = `Je bent een expert recept-extractor. Analyseer de input EXTREEM GRONDIG en nauwkeurig.
DOEL: Extraheer ALLE receptinformatie met maximale trouw aan de bron in één keer. Verzin ABSOLUUT NIETS.
BELANGRIJK: Alle onderdelen van het recept (titel, inleiding, ingrediënten, instructies, tijden, porties, tips, variaties, etc.) zijn even belangrijk en moeten met gelijke zorgvuldigheid en nauwkeurigheid worden geëxtraheerd.

OUTPUT JSON STRUCTUUR (gebruik ALTIJD exact deze velden en volgorde):
{
  "title": string (exacte titel zoals weergegeven, anders null),
  "description": string|null (ALLEEN letterlijke korte beschrijving/introductie als die direct onder de titel staat, anders null),
  "introduction": string|null (ALLEEN letterlijke langere inleidende tekst vóór ingrediënten of bereiding, stop bij eerste kopje als "Ingrediënten" of "Bereiding", anders null),
  "servings": number|null (aantal porties/personen),
  "prep_time": string|null (voorbereidingstijd, exact zoals in bron bijv. "15 minuten" of "ca. 20 min"),
  "cook_time": string|null (bereidingstijd/kooktijd),
  "total_time": string|null (totale tijd als expliciet vermeld),
  "difficulty": string|null (bijv. "Makkelijk", "Gemiddeld", "Moeilijk" - alleen als letterlijk vermeld),
  "cuisine": string|null (bijv. "Italiaans", "Vegan" - alleen als letterlijk vermeld),
  "author": string|null,
  "ingredients": [{
    "amount": number|null,
    "unit": string|null,
    "name": string,
    "preparation": string|null (bijv. "fijngesneden", "in ringen", "koud"),
    "note": string|null (bijv. "naar smaak", "+ extra om in te vetten"),
    "optional": boolean (true als "naar smaak", tussen haakjes of expliciet optioneel),
    "group_name": string|null (bijv. "Voor de saus", "Voor de marinade", "Garnering")
  }],
  "instructions": [{
    "step_number": number (doorlopend vanaf 1),
    "description": string (volledige staptekst, exact en niet afkorten)
  }],
  "tips": string[]|null (losse tips, niet als stap),
  "variations": string[]|null (variaties en alternatieven),
  "serving_suggestion": string|null (serveertips, garnering, presentatie - niet als stap),
  "ai_tags": string[] (ALLEEN tags die letterlijk in de bron staan of direct afleidbaar zonder interpretatie, bijv. "vegetarisch" als expliciet vermeld - wees extreem conservatief),
  "source_url": string|null (indien bekend of in input),
  "raw_text": string (ALLE zichtbare tekst uit de input exact overnemen, voor auditabiliteit)
}

REGELS VOOR METADATA (tijden, porties, etc.):
1. Zoek prep_time, cook_time, total_time, servings en difficulty eerst in duidelijke infoblokken, icoontjes of kopjes.
2. Als die ontbreken, scan dan zorgvuldig de inleidende tekst en eventuele voetnoten.
3. Neem exact de tekst over uit de bron. Zet null als echt afwezig.

REGELS VOOR INGREDIËNTEN:
1. Splits hoeveelheden correct: "500g bloem" → amount: 500, unit: "g", name: "bloem".
2. Plaats bereidingsinstructies bij ingrediënt (bijv. "in ringen", "fijngesneden") in "preparation".
3. Plaats extra opmerkingen (bijv. "naar smaak", "+ extra om te bakken") in "note" en zet "optional: true" waar van toepassing.
4. Behoud ingrediëntgroepen exact: gebruik "group_name" voor kopjes als "Voor de saus".

REGELS VOOR BEREIDINGSINSTRUCTIES:
1. Zoek ALLE bereidingsstappen - genummerd, opsommingstekens of doorlopende tekst.
2. ELKE duidelijke actie of werkwoordgroep is een aparte stap. Splits altijd bij nieuw werkwoord of overgang (bijv. "snipper de ui" en "fruit de ui" = 2 stappen).
3. Combineer alleen als acties letterlijk in één zin staan en onlosmakelijk verbonden zijn (bijv. "voeg toe en meng goed").
4. Bij twijfel: altijd splitsen.
5. Splits lange paragrafen in logische stappen op basis van werkwoorden (verhit, snijd, voeg toe, roer, bak, laat rusten, etc.).
6. Herken verborgen stappen: "laat 30 minuten rusten", "afkoelen tot kamertemperatuur" of "voorverwarmen oven" zijn aparte stappen.
7. Behoud ALLE details: temperaturen, tijden, technieken, pannen, etc.
8. Serveersuggesties, garnituren en presentatietips aan het einde zijn GEEN stappen → naar "serving_suggestion".
9. Tips en variaties aan het einde zijn GEEN stappen → naar "tips" of "variations".
10. Alternatieve methodes (bijv. "in oven of airfryer") → ofwel opsplitsen in stappen met noot, of naar "variations".
11. Nummer stappen doorlopend vanaf 1, ook als bron dat niet doet.
12. Minimaal 4-6 stappen voor normale recepten, tot 15+ voor complexe.

ALGEMENE REGELS:
1. Wees 100% trouw aan de bron. Verzin, samenvat of parafraseer NIETS.
2. Lees ALLE tekst grondig, inclusief kleine lettertjes, voetnoten, tips en variaties.
3. Alle informatie is even belangrijk en moet met maximale nauwkeurigheid worden geëxtraheerd.
4. Include altijd "raw_text" met de volledige inputtekst exact.
`

const ENRICHMENT_PROMPT = `Je bent een culinaire AI-assistent. Verrijk dit recept met waardevolle extra informatie.

INPUT RECEPT:
{recipeData}

RUWE BRONTEKST:
{rawText}

GENEREER VERRIJKINGEN IN DEZE JSON STRUCTUUR:
{
  "nutrition": {
    "calories_per_serving": number|null,
    "protein_g": number|null,
    "carbs_g": number|null,
    "fat_g": number|null,
    "fiber_g": number|null,
    "notes": string|null
  },
  "dietary_info": {
    "is_vegetarian": boolean,
    "is_vegan": boolean,
    "is_gluten_free": boolean,
    "is_dairy_free": boolean,
    "allergens": string[],
    "notes": string|null
  },
  "variations": [
    { "name": string, "description": string, "type": "healthier"|"vegan"|"quick"|"festive"|"other" }
  ],
  "pairings": {
    "wines": string[],
    "sides": string[],
    "drinks": string[]
  },
  "tips": [
    { "category": "prep"|"cooking"|"storage"|"serving", "tip": string }
  ],
  "shopping_list": string[] (geconsolideerde boodschappenlijst),
  "equipment_needed": string[],
  "difficulty_breakdown": {
    "skill_level": "beginner"|"intermediate"|"advanced",
    "time_active": string|null,
    "time_passive": string|null,
    "complexity_notes": string|null
  },
  "cultural_context": string|null (historische/culturele achtergrond),
  "seasonality": string|null (beste seizoen),
  "cost_estimate": "budget"|"moderate"|"expensive"|null
}

REGELS:
1. Wees HELPVOL en CREATIEF maar REALISTISCH.
2. Markeer onzekerheden met "geschat" of "circa".
3. Nutritionele waarden zijn schattingen tenzij exact bekend.
4. Variaties moeten praktisch en smakelijk zijn.
5. Tips moeten echt nuttig zijn, geen open deuren.
`

// =============================================================================
// HELPER: Fetch and encode image
// =============================================================================
async function fetchAndEncodeImage(signedUrl: string): Promise<{ base64: string; mimeType: string }> {
    const imageResponse = await fetch(signedUrl)
    if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    const imageBuffer = await imageResponse.arrayBuffer()

    // Convert to base64 in chunks to avoid stack overflow
    const u8 = new Uint8Array(imageBuffer);
    const CHUNK_SIZE = 0x8000;
    let index = 0;
    let binaryString = '';
    while (index < u8.length) {
        const slice = u8.subarray(index, Math.min(index + CHUNK_SIZE, u8.length));
        binaryString += String.fromCharCode(...slice);
        index += CHUNK_SIZE;
    }
    const base64 = btoa(binaryString);
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

    return { base64, mimeType }
}

// =============================================================================
// HELPER: Safe JSON parse with cleanup
// =============================================================================
function safeJsonParse(text: string): any {
    let cleaned = text.trim();

    // Remove markdown code fences if present
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    // Try to extract JSON object if there's extra content
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }

    // Fix common JSON issues from LLMs
    // 1. Remove trailing commas before ] or }
    cleaned = cleaned.replace(/,(\s*[\}\]])/g, '$1');

    // 2. Fix unquoted property names (simple cases)
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');

    // 3. Fix single quotes used instead of double quotes for strings
    // This is tricky - only do for property names and simple string values
    cleaned = cleaned.replace(/'([^'\\]*)'/g, '"$1"');

    // 4. Remove any control characters that might break parsing
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (char) => {
        if (char === '\n' || char === '\r' || char === '\t') return char;
        return '';
    });

    // 5. Fix missing commas between array elements (common LLM issue)
    // Look for patterns like: }\n{ or ]\n[ or "value"\n"next"
    cleaned = cleaned.replace(/\}(\s*)\{/g, '},$1{');
    cleaned = cleaned.replace(/\](\s*)\[/g, '],$1[');
    cleaned = cleaned.replace(/"(\s*)\n(\s*)"/g, '",$1\n$2"');

    try {
        return JSON.parse(cleaned);
    } catch (firstError) {
        // Second attempt: try to fix more aggressively
        console.log("First parse failed, attempting repair...");

        try {
            // Try removing all newlines within strings (sometimes LLMs break mid-string)
            let repaired = cleaned.replace(/:\s*"([^"]*)\n([^"]*)"/g, ': "$1 $2"');
            return JSON.parse(repaired);
        } catch (secondError) {
            console.error("JSON parse failed after repair, raw text:", text.substring(0, 1000));
            throw new Error(`Invalid JSON from AI: ${(firstError as Error).message}`);
        }
    }
}

// =============================================================================
// HELPER: Call Mistral OCR 3 API (for raw image extraction)
// Uses /v1/ocr endpoint with mistral-ocr-latest model
// =============================================================================
async function callMistralOCR(imageUrl: string, apiKey: string): Promise<{ rawText: string; usage: any }> {
    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    const imageBuffer = await imageResponse.arrayBuffer()

    // Convert to base64 in chunks to avoid stack overflow
    const u8 = new Uint8Array(imageBuffer);
    const CHUNK_SIZE = 0x8000;
    let index = 0;
    let binaryString = '';
    while (index < u8.length) {
        const slice = u8.subarray(index, Math.min(index + CHUNK_SIZE, u8.length));
        binaryString += String.fromCharCode(...slice);
        index += CHUNK_SIZE;
    }
    const base64 = btoa(binaryString);
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Call Mistral OCR endpoint
    const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'mistral-ocr-latest',
            document: {
                type: 'image_url',
                image_url: dataUrl
            }
        })
    })

    if (!response.ok) {
        const err = await response.text()
        throw new Error(`Mistral OCR API Error: ${err}`)
    }

    const ocrData = await response.json()

    // OCR returns pages with markdown content - extract all text
    const rawText = ocrData.pages?.map((p: any) => p.markdown || '').join('\n') || ''

    const usage = {
        total_tokens: ocrData.usage_info?.pages_processed || 1,
        prompt_tokens: 0,
        completion_tokens: 0,
        model: 'mistral-ocr-latest'
    }

    return { rawText, usage }
}

// =============================================================================
// HELPER: Call Grok API (xAI)
// =============================================================================
async function callGrok(prompt: string, model: string, apiKey: string, imageUrl?: string): Promise<{ text: string; usage: any }> {
    // Use the selected model directly, fallback to fast-non-reasoning
    const modelId = model.startsWith('grok-') ? model : 'grok-4-1-fast-non-reasoning'

    const messages: any[] = [{
        role: 'user',
        content: imageUrl
            ? [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } }
            ]
            : prompt
    }]

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelId,
            messages,
            temperature: 0.1,
            max_tokens: 16384,
            response_format: { type: 'json_object' }
        })
    })

    if (!response.ok) {
        const err = await response.text()
        throw new Error(`Grok API Error: ${err}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || "{}"

    const usage = {
        total_tokens: data.usage?.total_tokens || 0,
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0
    }

    return { text, usage }
}

// =============================================================================
// HELPER: Route to appropriate LLM (Mistral OCR + Grok for images, Grok for text)
// =============================================================================
async function callLLM(
    prompt: string,
    mistralKey: string,
    xaiKey: string,
    imageUrl?: string
): Promise<{ text: string; usage: any; model: string; rawExtraction?: string }> {
    if (imageUrl) {
        // Step 1: Use Mistral OCR 3 to extract raw content from image (100% fidelity)
        if (!mistralKey) throw new Error('MISTRAL_API_KEY not configured')
        // if (!xaiKey) throw new Error('XAI_API_KEY not configured') // Not needed if disabling Grok

        console.log('Step 1: Extracting raw content with Mistral OCR 3...')
        const ocrResult = await callMistralOCR(imageUrl, mistralKey)

        // Step 2: Grok disabled by user request. Returning raw OCR data.
        console.log('Step 2: Grok analysis disabled. Returning raw OCR content.')

        // Wrap raw text in a minimal valid JSON structure for the frontend
        const rawJson = JSON.stringify({
            title: "OCR Scan (Unprocessed)",
            description: "Raw text extracted from Mistral OCR 3:\n\n" + ocrResult.rawText,
            introduction: null,
            ingredients: [],
            instructions: [],
            prep_time: null,
            cook_time: null,
            servings: null,
            cuisine: null,
            ai_tags: ["ocr-raw"],
            raw_text: ocrResult.rawText
        }, null, 2);

        return {
            text: rawJson,
            usage: {
                total_tokens: ocrResult.usage.total_tokens, // Pages
                ocr_pages: ocrResult.usage.total_tokens,
                prompt_tokens: 0,
                completion_tokens: 0
            },
            model: 'mistral-ocr-latest-only',
            rawExtraction: ocrResult.rawText
        }
    } else {
        // Use Grok for text-based tasks
        if (!xaiKey) throw new Error('XAI_API_KEY not configured')
        const result = await callGrok(prompt, 'grok-4-1-fast-reasoning', xaiKey)
        return { ...result, model: 'grok-4-1-fast-reasoning' }
    }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { signedUrl, type, textContent, recipeData, rawData, sourceUrl } = await req.json()
        const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY")
        const XAI_API_KEY = Deno.env.get("XAI_API_KEY")

        // Validate API keys
        if (!MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY not configured")
        if (!XAI_API_KEY) throw new Error("XAI_API_KEY not configured")

        console.log(`[extract-recipe] Processing type: ${type}`)

        let result: any = {}

        // =================================================================
        // TYPE: image - Full extraction from photo
        // =================================================================
        if (type === 'image' || type === 'vision_review') {
            if (!signedUrl) throw new Error("No signedUrl provided for image analysis");

            const prompt = EXTRACTION_PROMPT + "\n\nExtraheer het recept uit deze afbeelding:";

            console.log('Calling Mistral OCR 3 + Grok 4.1 for image extraction...')
            const { text, usage, rawExtraction, model } = await callLLM(prompt, MISTRAL_API_KEY!, XAI_API_KEY!, signedUrl)

            const recipe = safeJsonParse(text)

            // Remove raw_text from recipe object if present
            delete recipe.raw_text

            result = {
                recipe,
                // Store Mistral OCR 3's raw extraction (100% fidelity, immutable)
                raw_extracted_data: {
                    ocr_extraction: rawExtraction,
                    grok_response: text,
                    models_used: model || 'mistral-ocr-latest + grok-4-1-fast-reasoning',
                    extracted_at: new Date().toISOString()
                },
                usage
            }
        }

        // =================================================================
        // TYPE: text - Extraction from HTML/text content
        // =================================================================
        else if (type === 'text') {
            const prompt = EXTRACTION_PROMPT + `\n\nExtraheer het recept uit deze tekst:\n${textContent}`

            console.log('Calling Grok for text extraction...')
            const { text, usage } = await callLLM(prompt, MISTRAL_API_KEY!, XAI_API_KEY!)

            const recipe = safeJsonParse(text)
            const rawText = recipe.raw_text || text
            delete recipe.raw_text

            result = {
                recipe,
                raw_extracted_data: { raw_text: rawText, ai_response: text },
                usage
            }
        }

        // =================================================================
        // TYPE: review - Re-analyze existing recipe (for URL recipes)
        // =================================================================
        else if (type === 'review') {
            const prompt = EXTRACTION_PROMPT + `

BESTAANDE DATA (ter referentie, verbeter waar nodig):
${JSON.stringify(recipeData, null, 2)}

BRONTEKST:
${rawData || textContent || 'Geen beschikbaar'}

Analyseer opnieuw en verbeter de structuur. Behoud correcte feiten, corrigeer fouten.`

            console.log('Calling Grok for review...')
            const { text, usage } = await callLLM(prompt, MISTRAL_API_KEY!, XAI_API_KEY!)

            const recipe = safeJsonParse(text)
            delete recipe.raw_text

            result = { recipe, usage, raw_response: text }
        }

        // =================================================================
        // TYPE: enrich - Generate AI enrichments
        // =================================================================
        else if (type === 'enrich') {
            if (!recipeData) throw new Error("recipeData required for enrichment")

            const prompt = ENRICHMENT_PROMPT
                .replace('{recipeData}', JSON.stringify(recipeData, null, 2))
                .replace('{rawText}', rawData || 'Niet beschikbaar')

            console.log('Calling Grok for enrichment...')
            const { text, usage } = await callLLM(prompt, MISTRAL_API_KEY!, XAI_API_KEY!)

            const enrichments = safeJsonParse(text)

            result = { enrichments, usage }
        }

        // =================================================================
        // UNKNOWN TYPE
        // =================================================================
        else {
            throw new Error(`Unknown type: ${type}`)
        }

        console.log(`[extract-recipe] Successfully processed type: ${type}`)

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error("[extract-recipe] Error:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

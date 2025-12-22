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

const EXTRACTION_PROMPT = `Je bent een EXPERT recept-extractor met diep begrip van culinaire teksten.

=== DENKPROCES (VERPLICHT) ===
Voordat je extraheert, DENK DIEP NA over de volgende vragen in je "reasoning" veld:
- Wat zie ik precies in deze bron? Welke secties herken ik?
- Waar staat de titel? Is er een subtitel die erbij hoort?
- Zie ik tijden/porties in een infoblok, of moet ik ze uit de tekst halen?
- Welke ingrediënten horen bij welke groep? Zijn er subkoppen?
- Hoe zijn de bereidingsstappen gestructureerd? Doorlopend of genummerd?
- Welke acties kan ik splitsen in aparte stappen voor meer duidelijkheid?
- Wat hoort bij tips/variaties vs. de hoofdbereiding?
- Mis ik iets? Staat er info in kleine lettertjes of voetnoten?

=== OUTPUT FORMAAT ===
ALLEEN valide JSON. Geen markdown, geen tekst ervoor of erna.
Gebruik GEEN letterlijke newlines in strings - vervang door spaties.

{
  "reasoning": string (UITGEBREIDE analyse: beschrijf wat je ziet, welke keuzes je maakt, waarom je iets in een bepaald veld plaatst, wat lastig was, wat je hebt gesplitst en waarom),
  "title": string (exacte titel),
  "description": string|null (korte intro direct onder titel),
  "introduction": string|null (langere inleidende tekst voor ingrediënten),
  "servings": number|null,
  "prep_time": string|null (exact uit bron),
  "cook_time": string|null,
  "total_time": string|null,
  "difficulty": string|null,
  "cuisine": string|null,
  "author": string|null,
  "ingredients": [{
    "amount": number|null,
    "unit": string|null,
    "name": string,
    "preparation": string|null (bijv. fijngesneden),
    "note": string|null (bijv. naar smaak),
    "optional": boolean,
    "group_name": string|null (bijv. Voor de saus)
  }],
  "instructions": [{
    "step_number": number,
    "description": string (volledige staptekst met alle details)
  }],
  "tips": string[]|null,
  "variations": string[]|null,
  "serving_suggestion": string|null,
  "ai_tags": string[],
  "source_url": string|null
}

=== EXTRACTIE REGELS ===

INGREDIËNTEN:
- Split "500g bloem" → amount: 500, unit: "g", name: "bloem"
- "fijngesneden ui" → name: "ui", preparation: "fijngesneden"
- "zout naar smaak" → name: "zout", note: "naar smaak", optional: true
- Bewaar groepskoppen in group_name

BEREIDINGSSTAPPEN - SPLITS RIJK:
- ELKE actie/werkwoord = aparte stap
- "Snipper de ui en fruit in boter" = 2 stappen: 1) snipperen, 2) fruiten
- "Laat 30 min rusten" = aparte stap
- "Verwarm oven voor op 180°C" = aparte stap
- Minimaal 6-10 stappen voor simpele recepten, 15+ voor complexe
- Behoud ALLE details: temperaturen, tijden, technieken

METADATA:
- Zoek eerst in infoblokken/icoontjes
- Dan in inleidende tekst en voetnoten
- Neem exact over uit bron

ALGEMEEN:
- Wees 100% trouw aan de bron
- Verzin NIETS, parafraseer niet
- Lees ALLES: kleine lettertjes, voetnoten, tips
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

const LAYOUT_ANALYSIS_PROMPT = `First, carefully analyze the document's layout, hierarchy, and structure:
- Identify columns (e.g., single-column, two-column, newspaper-style).
- Note reading order for multi-column or complex flows.
- Detect hierarchy: main title, sections, subsections, headers/footers.
- Observe positioning of text blocks, images, tables relative to each other.
- Note any unusual layouts (e.g., sidebars, footnotes, interleaved images).

Then, extract the full text while preserving the original content accurately.

Output format:
- Primary: The extracted text in clean markdown (use # for headings, bullet lists, bold/italics where appropriate, HTML tables for complex tables).
- Interspersed or as inline notes: Add descriptive notes in [BRACKETS] or <!-- COMMENTS --> for layout details, e.g.:
  [Layout note: This paragraph is in the right column, continuing from left column above.]
  [Hierarchy note: This is a level 2 subsection under the main title.]
  [Column note: Document switches to two-column layout here.]
  [Position note: Image placed beside this text block.]

Do not alter the original text content. Keep notes concise but informative. Place notes immediately before or after the relevant text section.`;

// =============================================================================
// HELPER: Safe JSON parse with cleanup
// =============================================================================
function safeJsonParse(text: string): any {
    let toParse = text.trim();

    // Strategy 1: Look for markdown code fence
    const codeBlockMatch = toParse.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch) {
        toParse = codeBlockMatch[1].trim();
    } else {
        // Strategy 2: Extract between first { and last }
        const start = toParse.indexOf('{');
        const end = toParse.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            toParse = toParse.substring(start, end + 1);
        }
    }

    // FIX: Escape literal newlines inside JSON strings
    // This regex finds strings and replaces newlines within them
    toParse = toParse.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
        return match
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    });

    // Fix trailing commas
    toParse = toParse.replace(/,(\s*[\}\]])/g, '$1');

    try {
        return JSON.parse(toParse);
    } catch (e) {
        console.error("JSON Parse Error:", (e as Error).message.slice(0, 80));
        console.error("Snippet:", toParse.slice(0, 200));
        throw new Error(`Invalid JSON from AI: ${(e as Error).message}`);
    }
}

// =============================================================================
// HELPER: Call Mistral OCR API (updated for Dec 2025 API)
// =============================================================================
async function callMistralOCR(imageUrl: string, apiKey: string): Promise<{ rawText: string; usage: any }> {
    // Direct public URL using mistral-ocr-latest
    const body = {
        model: "mistral-ocr-latest",
        document: {
            type: "image_url",
            image_url: imageUrl
        },
        table_format: "html",
        extract_header: true,
        extract_footer: true
    }

    const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    })

    if (!response.ok) {
        const err = await response.text()
        throw new Error(`Mistral OCR API Error: ${response.status} - ${err}`)
    }

    const ocrData = await response.json()

    // Extract markdown from all pages (concatenate header/footer if extracted separately)
    const rawText = ocrData.pages?.map((p: any) => {
        return [
            p.header || '',
            p.markdown || '',
            p.footer || ''
        ].filter(Boolean).join('\n\n')
    }).join('\n\n') || ''

    const usage = {
        pages_processed: ocrData.usage_info?.pages_processed || 1,
        model: ocrData.model || 'mistral-ocr-latest'
    }

    return { rawText, usage }
}

// =============================================================================
// HELPER: Call Grok API (xAI)
// =============================================================================
async function callGrok(prompt: string, model: string, apiKey: string, imageUrl?: string): Promise<{ text: string; usage: any }> {
    // Use the selected model directly, fallback to fast-reasoning
    const modelId = model.startsWith('grok-') ? model : 'grok-4-1-fast-reasoning'

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
        if (!xaiKey) throw new Error('XAI_API_KEY not configured')

        console.log('Step 1: Extracting raw content with Mistral OCR 3...')
        const ocrResult = await callMistralOCR(imageUrl, mistralKey)

        // Step 2: Use Grok 4.1 to structure the data using the OCR text
        console.log('Step 2: Structuring with Grok 4.1 (OCR + Vision)...')

        // Grok gets BOTH the OCR text AND the original image for deeper visual understanding
        const extractionPrompt = EXTRACTION_PROMPT +
            "\n\nSOURCE OCR MARKDOWN (from Mistral OCR):\n" + ocrResult.rawText +
            "\n\nJe hebt ook toegang tot de originele afbeelding. Gebruik deze voor visuele context en om details te verrijken die de OCR mogelijk heeft gemist."

        // Pass image URL so Grok can see the actual image
        const grokResult = await callGrok(extractionPrompt, 'grok-4-1-fast-reasoning', xaiKey, imageUrl)

        const combinedUsage = {
            // Keep separated for clarity in UI
            ocr_pages: ocrResult.usage.pages_processed,
            grok_input_tokens: grokResult.usage.prompt_tokens,
            grok_output_tokens: grokResult.usage.completion_tokens,
            total_tokens: grokResult.usage.total_tokens // Only counting LLM tokens for "total" to avoid unit confusion
        }

        return {
            text: grokResult.text,
            usage: combinedUsage,
            model: `${ocrResult.usage.model} + grok-4-1-fast-reasoning`, // Dynamic model name
            rawExtraction: ocrResult.rawText
        }
    } else {
        // Direct text extraction (Grok only)
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

            // Store reasoning in extra_data for UI visibility
            if (recipe.reasoning) {
                if (!recipe.extra_data) recipe.extra_data = {};
                recipe.extra_data.ai_reasoning_trace = recipe.reasoning;
                delete recipe.reasoning;
            }
            delete recipe.raw_text

            result = {
                recipe,
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

            // Store reasoning in extra_data for UI visibility
            if (recipe.reasoning) {
                if (!recipe.extra_data) recipe.extra_data = {};
                recipe.extra_data.ai_reasoning_trace = recipe.reasoning;
                delete recipe.reasoning;
            }
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

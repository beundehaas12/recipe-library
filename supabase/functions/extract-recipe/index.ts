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

const EXTRACTION_PROMPT = `Je bent een ervaren culinair expert en receptredacteur. Je helpt mij recepten nauwkeurig te digitaliseren.

## Jouw Bronnen
1. **De afbeelding** (PRIMARY SOURCE) - dit is de waarheid. Kijk goed naar layout, iconen, secties.
2. **OCR tekst** (hieronder) - een ruwe transcriptie die FOUTEN kan bevatten. Corrigeer spelling, rare tekens, en ontbrekende woorden door naar de afbeelding te kijken.

## Wat ik van je vraag

**Stap 1: Korte Analyse** (voor mijn debugging)
Schrijf in 2-4 zinnen wat je ziet:
- Welke secties herken je? (titel, intro, ingrediënten, bereiding, tips?)
- Zie je tijden/porties ergens? (infoblok, icoontjes, of in tekst verborgen?)
- Zijn er OCR-fouten die je corrigeert?

**Stap 2: Gestructureerde Extractie**
Geef daarna een JSON object in een markdown code block.

## Richtlijnen

**Ingrediënten:**
- Splits hoeveelheid en eenheid netjes: "250 g bloem" → amount: 250, unit: "g", name: "bloem"
- Bereidingsinfo bij ingrediënt (bijv. "fijngesneden") → preparation veld
- Notities (bijv. "of meer naar smaak") → note veld, optional: true

**Bereidingsstappen:**
- Splits op een **logische, leesbare** manier - niet mechanisch elke zin
- Combineer kleine acties die samen horen: "Doe de boter in de pan en laat smelten" mag 1 stap zijn
- Maak aparte stappen voor duidelijke overgangen: "Laat 30 min rusten", "Verwarm de oven", etc.
- Doel: leesbare stappen die iemand makkelijk kan volgen

**Metadata:**
- Kijk naar infoblokken, icoontjes, headers voor tijden/porties
- Als het nergens expliciet staat, laat null
- Corrigeer OCR-fouten (bijv. "5O min" → "50 min")

**Velden:**
- title: exacte receptnaam
- description: korte intro als die er is
- introduction: langere inleidende tekst (voor ingrediëntenlijst)
- servings: aantal porties als getal
- prep_time, cook_time, total_time: als strings ("30 min", "1 uur")
- difficulty: als vermeld ("Makkelijk", "Gemiddeld", etc.)
- cuisine: als vermeld ("Italiaans", "Aziatisch", etc.)
- author: als vermeld
- ingredients: array met amount, unit, name, preparation, note, optional, group_name
- instructions: array met step_number en description
- tips: losse tips (niet onderdeel van bereiding)
- variations: alternatieve bereidingen/variaties
- serving_suggestion: serveertips, garnering
- ai_tags: tags die je uit de bron haalt of logisch kunt afleiden (conservatief)

## Output Formaat

Eerst je korte analyse, dan:

\`\`\`json
{
  "title": "...",
  ...
}
\`\`\`
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
            temperature: 0.2,
            max_tokens: 16384
            // No response_format - allow natural output with JSON code block
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

            // Extract analysis text (everything before ```json)
            const jsonBlockStart = text.indexOf('```');
            const analysisText = jsonBlockStart > 0 ? text.substring(0, jsonBlockStart).trim() : null;

            const recipe = safeJsonParse(text)

            // Store analysis in extra_data for UI visibility
            if (!recipe.extra_data) recipe.extra_data = {};
            if (analysisText) {
                recipe.extra_data.ai_reasoning_trace = analysisText;
            }
            if (recipe.reasoning) {
                recipe.extra_data.ai_reasoning_trace = (recipe.extra_data.ai_reasoning_trace || '') + '\n\n' + recipe.reasoning;
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

            // Extract analysis text (everything before ```json)
            const jsonBlockStart = text.indexOf('```');
            const analysisText = jsonBlockStart > 0 ? text.substring(0, jsonBlockStart).trim() : null;

            const recipe = safeJsonParse(text)

            // Store analysis in extra_data for UI visibility
            if (!recipe.extra_data) recipe.extra_data = {};
            if (analysisText) {
                recipe.extra_data.ai_reasoning_trace = analysisText;
            }
            if (recipe.reasoning) {
                recipe.extra_data.ai_reasoning_trace = (recipe.extra_data.ai_reasoning_trace || '') + '\n\n' + recipe.reasoning;
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

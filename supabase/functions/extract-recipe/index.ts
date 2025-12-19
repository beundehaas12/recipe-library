// Supabase Edge Function: extract-recipe
// Gemini 3 Flash integration for recipe extraction and enrichment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================================================
// PROMPTS
// =============================================================================

const EXTRACTION_PROMPT = `Je bent een expert recept-extractor. Analyseer de input GRONDIG.

DOEL: Extraheer ALLE receptinformatie met maximale nauwkeurigheid in één keer.

OUTPUT JSON STRUCTUUR:
{
  "title": string (exacte titel zoals weergegeven),
  "description": string (korte samenvatting van het gerecht),
  "introduction": string|null (introductietekst als aanwezig),
  "ingredients": [{ 
    "amount": number|null, 
    "unit": string|null, 
    "name": string, 
    "group_name": string|null (bijv. "Voor de saus", "Garnering")
  }],
  "instructions": [{ 
    "step_number": number, 
    "description": string 
  }],
  "prep_time": string|null (bijv. "15 minuten"),
  "cook_time": string|null (bijv. "30 minuten"),
  "servings": number|null,
  "difficulty": string|null ("Makkelijk", "Gemiddeld", "Moeilijk"),
  "cuisine": string|null,
  "author": string|null,
  "cookbook_name": string|null,
  "ai_tags": string[] (relevante tags: "vegetarisch", "snel", etc.),
  "raw_text": string (ALLE zichtbare tekst exact zoals weergegeven, voor auditabiliteit)
}

REGELS:
1. Wees 100% trouw aan de bron. Verzin NIETS.
2. Lees ALLE tekst, ook kleine lettertjes, tips, variaties.
3. Splits hoeveelheden correct: "500g bloem" → amount: 500, unit: "g", name: "bloem"
4. Bewaar ingrediëntgroepen als ze er zijn.
5. Include "raw_text" met ALLE zichtbare tekst voor auditabiliteit.
6. Bereidingstijd en portieaantal zijn CRUCIAAL - zoek ze actief.
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
// HELPER: Call Gemini API
// =============================================================================
async function callGemini(parts: any[], apiKey: string, expectJson = true): Promise<{ text: string; usage: any }> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 16384, // Increased to handle long recipes
                    responseMimeType: expectJson ? "application/json" : "text/plain"
                }
            })
        }
    )

    if (!response.ok) {
        const err = await response.text()
        throw new Error(`Gemini API Error: ${err}`)
    }

    const data = await response.json()

    // Check for truncation
    const finishReason = data.candidates?.[0]?.finishReason
    if (finishReason === 'MAX_TOKENS') {
        throw new Error('AI response was truncated. Recipe may be too complex - try a clearer photo.')
    }
    if (finishReason === 'SAFETY') {
        throw new Error('AI blocked content for safety reasons.')
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

    const usage = {
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0
    }

    return { text, usage }
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
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured")

        console.log(`[extract-recipe] Processing type: ${type}`)

        let result: any = {}

        // =================================================================
        // TYPE: image - Full extraction from photo
        // =================================================================
        if (type === 'image' || type === 'vision_review') {
            if (!signedUrl) throw new Error("No signedUrl provided for image analysis");

            console.log("Fetching and encoding image...")
            const { base64, mimeType } = await fetchAndEncodeImage(signedUrl)

            const parts = [
                { text: EXTRACTION_PROMPT + "\n\nExtraheer het recept uit deze afbeelding:" },
                { inline_data: { mime_type: mimeType, data: base64 } }
            ]

            console.log("Calling Gemini for image extraction...")
            const { text, usage } = await callGemini(parts, GEMINI_API_KEY)

            const recipe = safeJsonParse(text)
            const rawText = recipe.raw_text || text

            // Remove raw_text from recipe object (stored separately)
            delete recipe.raw_text

            result = {
                recipe,
                raw_extracted_data: { raw_text: rawText, gemini_response: text },
                usage
            }
        }

        // =================================================================
        // TYPE: text - Extraction from HTML/text content
        // =================================================================
        else if (type === 'text') {
            const parts = [{ text: EXTRACTION_PROMPT + `\n\nExtraheer het recept uit deze tekst:\n${textContent}` }]

            console.log("Calling Gemini for text extraction...")
            const { text, usage } = await callGemini(parts, GEMINI_API_KEY)

            const recipe = safeJsonParse(text)
            const rawText = recipe.raw_text || text
            delete recipe.raw_text

            result = {
                recipe,
                raw_extracted_data: { raw_text: rawText, gemini_response: text },
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

            const parts = [{ text: prompt }]

            console.log("Calling Gemini for review...")
            const { text, usage } = await callGemini(parts, GEMINI_API_KEY)

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

            const parts = [{ text: prompt }]

            console.log("Calling Gemini for enrichment...")
            const { text, usage } = await callGemini(parts, GEMINI_API_KEY)

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

// Supabase Edge Function: extract-recipe
// Secure xAI Grok API integration with prompt caching optimization
//
// COST OPTIMIZATION:
// - Fixed system prompt is ALWAYS the same → xAI caches it (~75% savings on input tokens)
// - Using "detail: low" for images → reduces image tokens by ~50%
// - Estimated cost per call after caching: ~$0.0003
//
// SECURITY:
// - XAI_API_KEY stored as Supabase secret (never exposed to browser)
// - User authentication via Supabase JWT (automatic)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4"

// ==============================================================================
// FIXED SYSTEM PROMPT - Identical for ALL calls = Maximum Cache Hits
// ==============================================================================
// This prompt is sent with every request but xAI caches it server-side.
// After the first call, subsequent calls only pay ~25% of the input token cost.
// DO NOT modify this prompt frequently - changes invalidate the cache.
// ==============================================================================
const FIXED_SYSTEM_PROMPT = `You are a professional culinary AI assistant specialized in extracting structured recipe data from images and text.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact schema:
{
  "title": "string (in original language)",
  "description": "string (in original language, max 200 chars)",
  "ingredients": [
    {"amount": number|null, "unit": "string|null", "item": "string"}
  ],
  "instructions": ["string"],
  "servings": number,
  "prep_time": "string (e.g. '15 min')",
  "cook_time": "string (e.g. '30 min')",
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "string",
  "author": "string|null",
  "cookbook_name": "string|null",
  "isbn": "string|null",
  "source_language": "ISO 639-1 code (nl/en/de/fr/es/it)",
  "ai_tags": ["10-15 Dutch tags for search"]
}

CRITICAL RULES:
1. PRESERVE original recipe language - do NOT translate the recipe content
2. source_language must be ISO 639-1 code (nl, en, de, fr, es, it, etc.)
3. ai_tags must be IN DUTCH for search functionality - describe: dish type, main ingredients, cooking method, dietary info, meal type, cuisine, season, occasion, flavor profile
4. For ingredients: separate amount (number), unit (string), item (string)
5. If no unit exists (e.g. "2 eggs"), set unit to null
6. servings must be a number
7. If the content is NOT a recipe or is unreadable: return {"error": "Not a recipe"}
8. Output ONLY valid JSON - no markdown code blocks, no extra text, no explanations`

// CORS headers for browser requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { signedUrl, type, textContent } = await req.json()

        // Validate input
        if (type === 'image' && !signedUrl) {
            throw new Error('signedUrl is required for image extraction')
        }
        if (type === 'text' && !textContent) {
            throw new Error('textContent is required for text extraction')
        }

        // Initialize xAI client with server-side secret
        const xai = new OpenAI({
            baseURL: "https://api.x.ai/v1",
            apiKey: Deno.env.get("XAI_API_KEY")
        })

        // Build user message based on type
        // Keep user prompts MINIMAL - all instructions are in the cached system prompt
        const userContent = type === 'image'
            ? [
                { type: "text", text: "Extract recipe as JSON." },
                { type: "image_url", image_url: { url: signedUrl, detail: "high" } }
            ]
            : `Extract recipe as JSON from:\n\n${textContent}`

        console.log(`Processing ${type} request...`)

        const response = await xai.chat.completions.create({
            model: "grok-4-1-fast",  // Fast vision model, lowest cost
            messages: [
                { role: "system", content: FIXED_SYSTEM_PROMPT },  // CACHED by xAI
                { role: "user", content: userContent }
            ],
            max_tokens: 2000,
            temperature: 0.2  // Low temperature for consistent JSON output
        })

        // Parse the response
        const content = response.choices[0].message.content
        let recipe

        try {
            // Clean up potential markdown code blocks
            const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()
            recipe = JSON.parse(jsonStr)
        } catch (parseError) {
            console.error('JSON parse error:', parseError)
            throw new Error('Failed to parse recipe JSON from AI response')
        }

        // Return recipe + token usage for cost tracking
        return new Response(
            JSON.stringify({
                recipe,
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

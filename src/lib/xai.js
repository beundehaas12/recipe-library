/**
 * Recipe AI Client - Mistral OCR 3 + Grok 4.1 Integration
 * Handles all AI-powered recipe extraction and enrichment
 * - Mistral OCR 3 for image recognition
 * - Grok 4.1 Fast Reasoning for text analysis
 */
import { supabase } from './supabase';

// =============================================================================
// EDGE FUNCTION INVOKER (with retry for cold starts)
// =============================================================================

async function invokeEdgeFunction(functionName, body, retries = 2) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`[xai] Retry attempt ${attempt} for ${functionName}...`);
                // Wait before retry (exponential backoff: 2s, 4s)
                await new Promise(r => setTimeout(r, 2000 * attempt));
            }

            console.log(`[xai] Invoking edge function: ${functionName} (attempt ${attempt + 1})`);
            const { data, error } = await supabase.functions.invoke(functionName, { body });

            if (error) {
                console.error(`[xai] Edge function error [${functionName}]:`, error);
                lastError = new Error(error.message || `Failed to invoke ${functionName}`);
                // If it's a timeout or network error, retry
                if (error.message?.includes('timeout') || error.message?.includes('fetch') || error.message?.includes('network')) {
                    continue;
                }
                throw lastError;
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            console.log(`[xai] Edge function ${functionName} completed successfully`);
            return data;
        } catch (err) {
            lastError = err;
            console.error(`[xai] Attempt ${attempt + 1} failed:`, err.message);
            // Only retry on specific error types
            if (attempt < retries && (err.message?.includes('timeout') || err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('Failed to invoke'))) {
                continue;
            }
            throw err;
        }
    }

    throw lastError || new Error(`Failed after ${retries + 1} attempts`);
}

// =============================================================================
// IMAGE ANALYSIS
// =============================================================================

/**
 * Analyze a recipe image and extract complete recipe data.
 * Returns both structured recipe and raw extracted text for auditability.
 * 
 * @param {string} signedUrl - Signed URL to the image in Supabase Storage
 * @returns {Promise<{recipe: Object, raw_extracted_data: Object, usage: Object}>}
 */
export async function analyzeRecipeImage(signedUrl) {
    return invokeEdgeFunction('extract-recipe', {
        type: 'image',
        signedUrl
    });
}

/**
 * Re-analyze a recipe from its stored image.
 * Used for the "Analyze" button on photo-based recipes.
 * 
 * @param {string} imagePath - Image path or URL in Supabase Storage
 * @param {Object} recipeData - Existing recipe data for context
 * @returns {Promise<{recipe: Object, usage: Object}>}
 */
export async function reAnalyzeRecipeFromStoredImage(imagePath, recipeData = {}) {
    let path = imagePath;

    // Handle full URL if present
    if (imagePath.includes('/storage/v1/object/public/')) {
        const match = imagePath.match(/\/public\/([^\/]+)\/(.*)$/);
        if (match) path = match[2];
    }

    // Generate signed URL
    const { data: signedData, error } = await supabase.storage
        .from('recipe-images')
        .createSignedUrl(path, 3600);

    if (error) throw new Error(`Signed URL fail: ${error.message}`);

    // Sanitize recipe data
    const { search_vector, user_id, created_at, updated_at, extract_history, ...cleanRecipe } = recipeData;

    return invokeEdgeFunction('extract-recipe', {
        type: 'vision_review',
        signedUrl: signedData.signedUrl,
        recipeData: cleanRecipe
    });
}

// =============================================================================
// TEXT ANALYSIS
// =============================================================================

/**
 * Extracts recipe data from text/HTML content.
 * 
 * @param {string} textContent - Raw text or HTML content
 * @returns {Promise<{recipe: Object, raw_extracted_data: Object, usage: Object}>}
 */
export async function extractRecipeFromText(textContent) {
    return invokeEdgeFunction('extract-recipe', {
        type: 'text',
        textContent
    });
}

/**
 * Reviews and improves existing recipe data using AI.
 * Used for URL recipes to re-analyze from source text.
 * 
 * @param {Object} recipeData - Current recipe data
 * @param {string} sourceData - Original source text/HTML
 * @returns {Promise<{recipe: Object, usage: Object}>}
 */
export async function reviewRecipeWithAI(recipeData, sourceData) {
    // Sanitize heavy metadata
    const { search_vector, user_id, created_at, updated_at, ...cleanRecipe } = recipeData;

    return invokeEdgeFunction('extract-recipe', {
        type: 'review',
        recipeData: cleanRecipe,
        rawData: sourceData || 'Geen brongegevens.'
    });
}

// =============================================================================
// ENRICHMENT
// =============================================================================

/**
 * Generate AI enrichments for a recipe (nutrition, tips, variations, etc.)
 * 
 * @param {Object} recipeData - The structured recipe data
 * @param {string|Object} rawData - Raw extracted data or text for context
 * @returns {Promise<{enrichments: Object, usage: Object}>}
 */
export async function enrichRecipe(recipeData, rawData) {
    // Sanitize recipe data
    const { search_vector, user_id, created_at, updated_at, extraction_history, ...cleanRecipe } = recipeData;

    // Handle rawData as object or string
    let rawText = '';
    if (typeof rawData === 'object' && rawData !== null) {
        rawText = rawData.raw_text || rawData.gemini_response || JSON.stringify(rawData);
    } else {
        rawText = rawData || '';
    }

    return invokeEdgeFunction('extract-recipe', {
        type: 'enrich',
        recipeData: cleanRecipe,
        rawData: rawText
    });
}

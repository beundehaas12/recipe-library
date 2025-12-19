/**
 * Recipe AI Client - Multi-model LLM Integration
 * Handles all AI-powered recipe extraction and enrichment
 * Supports: Gemini 3 Flash, Grok 4.1, Grok 4 Fast Reasoning
 */
import { supabase } from './supabase';

// =============================================================================
// HELPER: Get selected LLM model
// =============================================================================
function getSelectedModel() {
    return localStorage.getItem('llm_model') || 'gemini-3-flash-preview';
}

// =============================================================================
// EDGE FUNCTION INVOKER
// =============================================================================

async function invokeEdgeFunction(functionName, body) {
    // Automatically include selected model in all requests
    const bodyWithModel = {
        ...body,
        model: getSelectedModel()
    };

    const { data, error } = await supabase.functions.invoke(functionName, { body: bodyWithModel });

    if (error) {
        console.error(`Edge function error [${functionName}]:`, error);
        throw new Error(error.message || `Failed to invoke ${functionName}`);
    }

    if (data.error) {
        throw new Error(data.error);
    }

    return data;
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

/**
 * xAI Recipe Extraction Client
 * 
 * Frontend client for the secure xAI Grok integration via Supabase Edge Functions.
 * 
 * ARCHITECTURE:
 * - Frontend calls Supabase Edge Function (extract-recipe)
 * - Edge Function calls xAI API with server-side API key
 * - API key is NEVER exposed to the browser
 * 
 * @module xai
 */

import { supabase } from './supabase';

/**
 * @typedef {Object} TokenUsage
 * @property {number} prompt_tokens - Tokens used in the prompt
 * @property {number} completion_tokens - Tokens used in the AI response
 * @property {number} total_tokens - Total tokens consumed
 */

/**
 * @typedef {Object} ExtractionResult
 * @property {Object} recipe - The extracted or corrected recipe data
 * @property {TokenUsage} usage - AI token usage statistics
 */

/**
 * Common handler for invoking Supabase Edge Functions with standardized error handling.
 * 
 * @param {string} functionName - Name of the edge function to invoke
 * @param {Object} body - Request payload
 * @returns {Promise<ExtractionResult>}
 * @throws {Error} Standardized error with descriptive message
 */
async function invokeEdgeFunction(functionName, body) {
    const { data, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
        console.error(`Edge function error [${functionName}]:`, error);
        throw new Error(error.message || `Failed to invoke ${functionName}`);
    }

    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}

/**
 * Extracts recipe data from an image via signed URL.
 * The image should be uploaded to Supabase Storage first.
 * 
 * @param {string} signedUrl - Signed URL to the image in Supabase Storage
 * @returns {Promise<ExtractionResult>}
 */
export async function extractRecipeFromImage(signedUrl) {
    return invokeEdgeFunction('extract-recipe', {
        type: 'image',
        signedUrl
    });
}

/**
 * Extracts recipe data from text/HTML content.
 * Used for URL-based recipe extraction.
 * 
 * @param {string} textContent - Raw text or HTML content containing the recipe
 * @returns {Promise<ExtractionResult>}
 */
export async function extractRecipeFromText(textContent) {
    return invokeEdgeFunction('extract-recipe', {
        type: 'text',
        textContent
    });
}

/**
 * Reviews and corrects existing recipe data using AI.
 * Compares current structured data against original source data via a dedicated AI protocol.
 * 
 * @param {Object} recipeData - Current recipe data to review
 * @param {string} sourceData - Original source text or OCR data
 * @returns {Promise<ExtractionResult>}
 */
export async function reviewRecipeWithAI(recipeData, sourceData) {
    // Sanitize recipe data to remove heavy metadata that confuses the AI
    const {
        search_vector,
        user_id,
        created_at,
        updated_at,
        original_image_url,
        image_url,
        id,
        translations,
        ...cleanRecipe
    } = recipeData;

    return invokeEdgeFunction('extract-recipe', {
        type: 'review',
        recipeData: cleanRecipe,
        sourceData: sourceData || 'Geen brongegevens beschikbaar.'
    });
}

/**
 * Re-analyzes a recipe using its original stored image with smart validation.
 * Combines vision analysis with existing recipe data to validate and enrich.
 * 
 * @param {string} imagePath - The storage path or public URL of the original image
 * @param {Object} recipeData - Existing recipe data to validate against
 * @returns {Promise<ExtractionResult>}
 */
export async function reAnalyzeRecipeFromStoredImage(imagePath, recipeData = {}) {
    let path = imagePath;

    // If a full URL is provided, extract the storage path
    if (imagePath.includes('/storage/v1/object/public/')) {
        const bucketMatch = imagePath.match(/\/public\/([^\/]+)\/(.*)$/);
        if (bucketMatch) {
            path = bucketMatch[2];
        }
    }

    // 1. Generate a new signed URL (valid for 1 hour)
    const { data: signedData, error: signedError } = await supabase.storage
        .from('recipe-images')
        .createSignedUrl(path, 3600);

    if (signedError) {
        console.error('Failed to generate signed URL for re-analysis:', signedError);
        throw new Error(`Kwaliteitsverbetering mislukt: ${signedError.message}`);
    }

    // 2. Call vision_review with photo + existing recipe data for smart enrichment
    // Sanitize recipe data to remove heavy metadata
    const {
        search_vector,
        user_id,
        created_at,
        updated_at,
        original_image_url,
        image_url,
        extract_history,
        translations,
        ...cleanRecipe
    } = recipeData;

    return invokeEdgeFunction('extract-recipe', {
        type: 'vision_review',
        signedUrl: signedData.signedUrl,
        recipeData: cleanRecipe
    });
}

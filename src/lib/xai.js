/**
 * xAI Recipe Extraction Client - Simplified
 * CLEAN SLATE REFACTOR
 */
import { supabase } from './supabase';

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
 * Extracts recipe data from text/HTML content.
 */
export async function extractRecipeFromText(textContent) {
    return invokeEdgeFunction('extract-recipe', {
        type: 'text',
        textContent
    });
}

/**
 * Reviews and corrects existing recipe data using AI.
 */
export async function reviewRecipeWithAI(recipeData, sourceData) {
    // Sanitize heavy metadata
    const { search_vector, user_id, created_at, updated_at, ...cleanRecipe } = recipeData;

    return invokeEdgeFunction('extract-recipe', {
        type: 'review',
        recipeData: cleanRecipe,
        sourceData: sourceData || 'Geen brongegevens.'
    });
}

/**
 * Re-analyzes a recipe using its original stored image.
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

    // Sanitize
    const { search_vector, user_id, created_at, updated_at, extract_history, ...cleanRecipe } = recipeData;

    return invokeEdgeFunction('extract-recipe', {
        type: 'vision_review',
        signedUrl: signedData.signedUrl,
        recipeData: cleanRecipe
    });
}

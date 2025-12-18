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
 * Extracts recipe data from an image via signed URL.
 * The image should be uploaded to Supabase Storage first.
 * 
 * @param {string} signedUrl - Signed URL to the image in Supabase Storage
 * @returns {Promise<{recipe: Object, usage: {prompt_tokens: number, completion_tokens: number, total_tokens: number}}>}
 * @throws {Error} If extraction fails or Edge Function returns an error
 */
export async function extractRecipeFromImage(signedUrl) {
    const { data, error } = await supabase.functions.invoke('extract-recipe', {
        body: {
            type: 'image',
            signedUrl
        }
    });

    if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to extract recipe from image');
    }

    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}

/**
 * Extracts recipe data from text/HTML content.
 * Used for URL-based recipe extraction.
 * 
 * @param {string} textContent - Raw text or HTML content containing the recipe
 * @returns {Promise<{recipe: Object, usage: {prompt_tokens: number, completion_tokens: number, total_tokens: number}}>}
 * @throws {Error} If extraction fails or Edge Function returns an error
 */
export async function extractRecipeFromText(textContent) {
    const { data, error } = await supabase.functions.invoke('extract-recipe', {
        body: {
            type: 'text',
            textContent
        }
    });

    if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to extract recipe from text');
    }

    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}

/**
 * Reviews and corrects existing recipe data using AI.
 * Useful for fixing issues with schema-parsed data.
 * 
 * @param {Object} recipeData - Current recipe data to review
 * @returns {Promise<{recipe: Object, usage: {prompt_tokens: number, completion_tokens: number, total_tokens: number}}>}
 * @throws {Error} If review fails or Edge Function returns an error
 */
export async function reviewRecipeWithAI(recipeData) {
    // Format the current recipe as text for AI review
    const reviewPrompt = `REVIEW AND CORRECT THIS RECIPE DATA:

Current data (may have parsing errors):
${JSON.stringify(recipeData, null, 2)}

YOU MAY IMPROVE:
- Cooking time, prep time, servings (correct if obviously wrong)
- Difficulty level, cuisine type
- Separate kitchen tools from actual ingredients (e.g., "baking sheet" is a tool, not an ingredient)
- Fix HTML artifacts or encoding issues (e.g., "&amp;" → "&")
- Fix malformed numbers (e.g., "1/2 1/4" → "3/4")

YOU MUST PRESERVE EXACTLY (do NOT rewrite or rephrase):
- The exact wording of descriptions
- The exact wording of each ingredient (only fix formatting, not text)
- The exact wording of each instruction step

Return the CORRECTED recipe in the standard JSON format.`;

    const { data, error } = await supabase.functions.invoke('extract-recipe', {
        body: {
            type: 'text',
            textContent: reviewPrompt
        }
    });

    if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to review recipe');
    }

    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}

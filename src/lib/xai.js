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
 * Compares the current structured data against the original source data.
 * 
 * @param {Object} recipeData - Current recipe data to review
 * @param {string} sourceData - Original source text or OCR data
 * @returns {Promise<{recipe: Object, usage: {prompt_tokens: number, completion_tokens: number, total_tokens: number}}>}
 */
export async function reviewRecipeWithAI(recipeData, sourceData) {
    // Format the current recipe as text for AI review
    const reviewPrompt = `STAP 1: BRONVERGELIJKING
Vergelijk de huidige gestructureerde data met de originele brongegevens (Source Data).

Source Data (De Waarheid):
${sourceData || 'Geen brongegevens beschikbaar.'}

Huidige Data (Mogelijk incompleet of foutief):
${JSON.stringify(recipeData, null, 2)}

STAP 2: CORRECTIES
Identificeer en corrigeer op basis van de Source Data:
- Missende velden (bijv. bereidingstijden, porties, cuisine) die wel in de bron staan.
- Verkeerd geparsde hoeveelheden of eenheden.
- Verkeerde veldplaatsing (gereedschap bij ingrediënten, etc.).
- Fix HTML artifacts (bijv. "&amp;") en malvormde getallen.

STAP 3: BEHOUD VAN TEKST
Behoud de exacte bewoording van instructies en de namen van ingrediënten uit de brongegevens. Herschrijf niets, corrigeer alleen de structuur en metadata.

OUTPUT:
Return de GECORRIGEERDE recept data in het standaard JSON formaat.`;

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

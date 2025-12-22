/**
 * Recipe Service - Multi-table CRUD operations
 * 
 * Handles the flexible hybrid schema with normalized tables for:
 * - recipe_ingredients (with grouping)
 * - recipe_steps
 * - recipe_tools
 * - extra_data JSONB
 * 
 * @module recipeService
 */

import { supabase } from './supabase';
import { logActivity } from './activityService';

/**
 * @typedef {Object} Ingredient
 * @property {number|null} amount - Quantity
 * @property {string|null} unit - Unit of measurement
 * @property {string} name - Ingredient name
 * @property {string|null} group_name - Group (e.g., "For the sauce")
 * @property {string|null} notes - Additional notes
 * @property {number} order_index - Ordering within group
 */

/**
 * @typedef {Object} Step
 * @property {number} step_number - Step order
 * @property {string} description - Step text
 * @property {Object|null} extra - Extra metadata (tips, time hints)
 */

/**
 * @typedef {Object} Tool
 * @property {string} name - Tool/equipment name
 * @property {string|null} notes - Usage notes
 */

/**
 * @typedef {Object} RecipeData
 * @property {string} title
 * @property {string|null} subtitle
 * @property {string|null} introduction
 * @property {string} description
 * @property {Ingredient[]} ingredients
 * @property {Step[]} instructions
 * @property {Tool[]} tools
 * @property {number} servings
 * @property {string} prep_time
 * @property {string} cook_time
 * @property {string} difficulty
 * @property {string} cuisine
 * @property {string[]} ai_tags
 * @property {Object} extra_data
 */

/**
 * Normalize AI recipe output to handle both old and new formats.
 * Converts legacy `item` field to `name`, and string instructions to objects.
 * 
 * @param {Object} rawRecipe - Raw recipe from AI
 * @returns {RecipeData} Normalized recipe data
 */
export function normalizeRecipeData(rawRecipe) {
    // Normalize ingredients: handle both {item: ...} and {name: ...} formats
    const ingredients = (rawRecipe.ingredients || []).map((ing, idx) => {
        if (typeof ing === 'string') {
            return { amount: null, unit: null, name: ing, group_name: null, notes: null, order_index: idx };
        }
        const normalized = {
            amount: ing.amount ?? ing.quantity ?? null,
            unit: ing.unit || null,
            name: ing.name || ing.item || '',
            group_name: ing.group_name || ing.group || null,
            notes: ing.notes || null,
            order_index: ing.order_index ?? idx
        };
        // DEBUG: Log group_name extraction
        if (normalized.group_name) {
            console.log('🏷️ Ingredient group found:', normalized.name, '→', normalized.group_name);
        }
        return normalized;
    });

    // Normalize instructions: handle both string[] and object[] formats
    const instructions = (rawRecipe.instructions || []).map((step, idx) => {
        if (typeof step === 'string') {
            return { step_number: idx + 1, description: step, extra: null };
        }
        return {
            step_number: step.step_number ?? idx + 1,
            description: step.description || step.text || String(step),
            extra: step.extra || null
        };
    });

    // Normalize tools
    const tools = (rawRecipe.tools || []).map(tool => {
        if (typeof tool === 'string') {
            return { name: tool, notes: null };
        }
        return { name: tool.name || '', notes: tool.notes || null };
    });

    // Helper to find value by multiple keys
    const getVal = (keys) => {
        for (const k of keys) {
            if (rawRecipe[k] !== undefined && rawRecipe[k] !== null) return rawRecipe[k];
        }
        return null;
    };

    const extraData = rawRecipe.extra_data || {};
    // Map total_time to extra_data if caught
    const totalTime = getVal(['total_time', 'totalTime', 'total_duration']);
    if (totalTime) extraData.total_time = totalTime;

    return {
        title: getVal(['title', 'name']) || 'Untitled Recipe',
        subtitle: getVal(['subtitle', 'sub_title']) || null,
        introduction: getVal(['introduction', 'intro']) || null,
        description: getVal(['description', 'desc', 'summary']) || '',
        ingredients,
        instructions,
        tools,
        servings: getVal(['servings', 'portions', 'yield']) || null,
        prep_time: getVal(['prep_time', 'prepTime', 'preparation_time']) || null,
        cook_time: getVal(['cook_time', 'cookTime', 'cooking_time']) || null,
        difficulty: getVal(['difficulty', 'level', 'skill_level']) || null,
        cuisine: getVal(['cuisine', 'category', 'type']) || null,
        author: getVal(['author', 'chef', 'creator', 'by']) || null,
        cookbook_name: getVal(['cookbook_name', 'cookbook', 'book', 'source_book']) || null,
        isbn: getVal(['isbn', 'ISBN']) || null,
        source_language: getVal(['source_language', 'language', 'lang']) || 'en',
        ai_tags: getVal(['ai_tags', 'tags', 'keywords']) || [],
        extra_data: extraData
    };
}

/**
 * Save a recipe with all related data to normalized tables.
 * Uses a transactional approach (fails if any insert fails).
 * 
 * @param {string} userId - User ID
 * @param {RecipeData} recipeData - Normalized recipe data
 * @param {Object} sourceInfo - Source metadata
 * @param {Object|null} extractionHistory - Extraction history for debugging
 * @returns {Promise<Object>} The created recipe with ID
 */
export async function saveRecipe(userId, recipeData, sourceInfo = {}, extractionHistory = null) {
    const normalized = normalizeRecipeData(recipeData);

    // 1. Insert main recipe record
    const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
            user_id: userId,
            title: normalized.title,
            subtitle: normalized.subtitle,
            introduction: normalized.introduction,
            description: normalized.description,
            servings: normalized.servings,
            prep_time: normalized.prep_time,
            cook_time: normalized.cook_time,
            difficulty: normalized.difficulty,
            cuisine: normalized.cuisine,
            author: normalized.author,
            cookbook_name: normalized.cookbook_name,
            isbn: normalized.isbn,
            source_url: sourceInfo.url || null,
            source_type: sourceInfo.type || 'manual',
            source_language: normalized.source_language,
            ai_tags: normalized.ai_tags,
            extraction_history: extractionHistory,
            raw_extracted_data: sourceInfo.raw_extracted_data || null,
            image_url: null,
            original_image_url: sourceInfo.original_image_url || null,
            extra_data: normalized.extra_data,
            verified: false
        })
        .select()
        .single();

    if (recipeError) {
        console.error('Failed to insert recipe:', recipeError);
        throw new Error(`Recipe insert failed: ${recipeError.message}`);
    }

    const recipeId = recipe.id;

    // 2. Insert ingredients
    if (normalized.ingredients.length > 0) {
        const ingredientRows = normalized.ingredients.map((ing, idx) => ({
            recipe_id: recipeId,
            name: ing.name,
            quantity: ing.amount,
            unit: ing.unit,
            group_name: ing.group_name,
            notes: ing.notes,
            order_index: ing.order_index ?? idx
        }));

        const { error: ingError } = await supabase
            .from('recipe_ingredients')
            .insert(ingredientRows);

        if (ingError) {
            console.error('Failed to insert ingredients:', ingError);
            // Clean up recipe on failure
            await supabase.from('recipes').delete().eq('id', recipeId);
            throw new Error(`Ingredients insert failed: ${ingError.message}`);
        }
    }

    // 3. Insert steps
    if (normalized.instructions.length > 0) {
        const stepRows = normalized.instructions.map(step => ({
            recipe_id: recipeId,
            step_number: step.step_number,
            description: step.description,
            extra: step.extra
        }));

        const { error: stepError } = await supabase
            .from('recipe_steps')
            .insert(stepRows);

        if (stepError) {
            console.error('Failed to insert steps:', stepError);
            await supabase.from('recipes').delete().eq('id', recipeId);
            throw new Error(`Steps insert failed: ${stepError.message}`);
        }
    }

    // 4. Insert tools (optional)
    if (normalized.tools.length > 0) {
        const toolRows = normalized.tools.map(tool => ({
            recipe_id: recipeId,
            name: tool.name,
            notes: tool.notes
        }));

        const { error: toolError } = await supabase
            .from('recipe_tools')
            .insert(toolRows);

        if (toolError) {
            console.warn('Failed to insert tools:', toolError);
            // Don't fail the whole operation for tools
        }
    }

    // Log Activity
    await logActivity(userId, 'create_recipe', `Nieuw recept aangemaakt: ${normalized.title}`, { recipeId });

    // Return the full recipe object using the fetch logic to ensure consistent structure
    // We could construct it manually but fetching ensures we return exactly what fetchRecipeWithDetails returns
    return await fetchRecipeWithDetails(recipeId);
}

/**
 * Fetch a recipe with all related data from normalized tables.
 * 
 * @param {string} recipeId - Recipe UUID
 * @returns {Promise<Object>} Full recipe with ingredients, steps, tools
 */
export async function fetchRecipeWithDetails(recipeId) {
    // Parallel fetches for performance
    const [recipeRes, ingredientsRes, stepsRes, toolsRes] = await Promise.all([
        supabase.from('recipes').select('*').eq('id', recipeId).single(),
        supabase.from('recipe_ingredients').select('*').eq('recipe_id', recipeId).order('order_index'),
        supabase.from('recipe_steps').select('*').eq('recipe_id', recipeId).order('step_number'),
        supabase.from('recipe_tools').select('*').eq('recipe_id', recipeId)
    ]);

    if (recipeRes.error) {
        throw new Error(`Failed to fetch recipe: ${recipeRes.error.message}`);
    }

    const recipe = recipeRes.data;

    // Group ingredients by group_name
    const ingredients = ingredientsRes.data || [];
    const groupedIngredients = {};
    ingredients.forEach(ing => {
        const group = ing.group_name || 'default';
        if (!groupedIngredients[group]) {
            groupedIngredients[group] = [];
        }
        groupedIngredients[group].push({
            id: ing.id,
            amount: ing.quantity,
            unit: ing.unit,
            name: ing.name,
            notes: ing.notes
        });
    });

    return {
        ...recipe,
        ingredients: ingredients.map(ing => ({
            id: ing.id,
            amount: ing.quantity,
            unit: ing.unit,
            name: ing.name,
            group_name: ing.group_name,
            notes: ing.notes
        })),
        ingredientsByGroup: groupedIngredients,
        instructions: (stepsRes.data || []).map(step => ({
            id: step.id,
            step_number: step.step_number,
            description: step.description,
            extra: step.extra
        })),
        tools: (toolsRes.data || []).map(tool => ({
            id: tool.id,
            name: tool.name,
            notes: tool.notes
        }))
    };
}

/**
 * Fetch recipes list with basic info (for listing pages).
 * Does NOT include full ingredients/steps to keep it fast.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object[]>} List of recipes
 */
export async function fetchRecipesList(userId) {
    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Update a recipe with new data.
 * Handles updating both main table and normalized tables.
 * 
 * @param {string} recipeId - Recipe UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated recipe
 */
export async function updateRecipe(recipeId, updates) {
    const normalized = normalizeRecipeData(updates);

    // 1. Update main recipe table
    const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .update({
            title: normalized.title,
            subtitle: normalized.subtitle,
            introduction: normalized.introduction,
            description: normalized.description,
            servings: normalized.servings,
            prep_time: normalized.prep_time,
            cook_time: normalized.cook_time,
            difficulty: normalized.difficulty,
            cuisine: normalized.cuisine,
            author: updates.author,
            cookbook_name: updates.cookbook_name,
            isbn: updates.isbn,
            source_url: updates.source_url,
            image_url: updates.image_url,
            ai_tags: normalized.ai_tags,
            extraction_history: updates.extraction_history,
            extra_data: normalized.extra_data
        })
        .eq('id', recipeId)
        .select()
        .single();

    if (recipeError) throw new Error(`Recipe update failed: ${recipeError.message}`);

    // 2. Replace ingredients (delete old, insert new)
    if (normalized.ingredients.length > 0) {
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);

        const ingredientRows = normalized.ingredients.map((ing, idx) => ({
            recipe_id: recipeId,
            name: ing.name,
            quantity: ing.amount,
            unit: ing.unit,
            group_name: ing.group_name,
            notes: ing.notes,
            order_index: ing.order_index ?? idx
        }));

        const { error: ingError } = await supabase.from('recipe_ingredients').insert(ingredientRows);
        if (ingError) console.warn('Ingredients update warning:', ingError);
    }

    // 3. Replace steps
    if (normalized.instructions.length > 0) {
        await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId);

        const stepRows = normalized.instructions.map(step => ({
            recipe_id: recipeId,
            step_number: step.step_number,
            description: step.description,
            extra: step.extra
        }));

        const { error: stepError } = await supabase.from('recipe_steps').insert(stepRows);
        if (stepError) console.warn('Steps update warning:', stepError);
    }

    // 4. Replace tools
    if (normalized.tools && normalized.tools.length > 0) {
        await supabase.from('recipe_tools').delete().eq('recipe_id', recipeId);

        const toolRows = normalized.tools.map(tool => ({
            recipe_id: recipeId,
            name: tool.name,
            notes: tool.notes
        }));

        const { error: toolError } = await supabase.from('recipe_tools').insert(toolRows);
        if (toolError) console.warn('Tools update warning:', toolError);
    }

    return recipe;
}

/**
 * Delete a recipe and all associated data.
 * Cascade delete handles ingredients, steps, tools automatically.
 * 
 * @param {string} recipeId - Recipe UUID
 * @returns {Promise<void>}
 */
export async function deleteRecipe(recipeId) {
    const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);

    if (error) throw new Error(`Delete failed: ${error.message}`);
}

// =============================================================================
// RAW DATA & ENRICHMENTS
// =============================================================================

/**
 * Update raw_extracted_data for a recipe.
 * 
 * @param {string} recipeId - Recipe UUID
 * @param {Object} rawData - Raw extracted data from AI
 * @returns {Promise<void>}
 */
export async function updateRawExtractedData(recipeId, rawData) {
    const { error } = await supabase
        .from('recipes')
        .update({ raw_extracted_data: rawData })
        .eq('id', recipeId);

    if (error) throw new Error(`Update raw data failed: ${error.message}`);
}

/**
 * Save an AI enrichment for a recipe.
 * 
 * @param {string} recipeId - Recipe UUID
 * @param {string} enrichmentType - Type: 'nutrition', 'variations', 'tips', etc.
 * @param {Object} data - Enrichment data
 * @returns {Promise<Object>} The created enrichment
 */
export async function saveEnrichment(recipeId, enrichmentType, data) {
    const { data: enrichment, error } = await supabase
        .from('recipe_enrichments')
        .insert({
            recipe_id: recipeId,
            enrichment_type: enrichmentType,
            data,
            ai_model: 'gemini-3-flash-preview'
        })
        .select()
        .single();

    if (error) throw new Error(`Save enrichment failed: ${error.message}`);
    return enrichment;
}

/**
 * Save multiple enrichments at once.
 * 
 * @param {string} recipeId - Recipe UUID
 * @param {Object} enrichments - Object with enrichment types as keys
 * @returns {Promise<Object[]>} Created enrichments
 */
export async function saveAllEnrichments(recipeId, enrichments) {
    const rows = Object.entries(enrichments).map(([type, data]) => ({
        recipe_id: recipeId,
        enrichment_type: type,
        data,
        ai_model: 'gemini-3-flash-preview'
    }));

    const { data, error } = await supabase
        .from('recipe_enrichments')
        .insert(rows)
        .select();

    if (error) throw new Error(`Save enrichments failed: ${error.message}`);
    return data;
}

/**
 * Fetch all enrichments for a recipe.
 * 
 * @param {string} recipeId - Recipe UUID
 * @returns {Promise<Object>} Enrichments grouped by type
 */
export async function fetchEnrichments(recipeId) {
    const { data, error } = await supabase
        .from('recipe_enrichments')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Fetch enrichments failed: ${error.message}`);

    // Group by type (return latest of each type)
    const grouped = {};
    for (const enrichment of data || []) {
        if (!grouped[enrichment.enrichment_type]) {
            grouped[enrichment.enrichment_type] = enrichment.data;
        }
    }
    return grouped;
}

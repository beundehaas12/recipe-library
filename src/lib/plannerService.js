import { supabase } from './supabase';

// ============================================================================
// FAVORITES
// ============================================================================

export async function toggleFavorite(recipeId, userId) {
    // Check if exists
    const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('recipe_id', recipeId)
        .single();

    if (existing) {
        // Remove
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('id', existing.id);
        if (error) throw error;
        return false; // Not favorited anymore
    } else {
        // Add
        const { error } = await supabase
            .from('favorites')
            .insert({ user_id: userId, recipe_id: recipeId });
        if (error) throw error;
        return true; // Favorited
    }
}

export async function getFavorites(userId) {
    const { data, error } = await supabase
        .from('favorites')
        .select(`
            recipe_id,
            recipes:recipe_id (*)
        `)
        .eq('user_id', userId);

    if (error) throw error;
    return data.map(f => f.recipes);
}

export async function checkIsFavorite(recipeId, userId) {
    const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('recipe_id', recipeId)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows found
    return !!data;
}

// ============================================================================
// MEAL PLANNING
// ============================================================================

export async function getMealPlan(userId, startDate, endDate) {
    const { data, error } = await supabase
        .from('meal_plans')
        .select(`
            *,
            recipe:recipe_id (id, title, image_url, cook_time)
        `)
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) throw error;
    return data;
}

export async function addToMealPlan(userId, recipeId, date, mealType) {
    const { data, error } = await supabase
        .from('meal_plans')
        .insert({
            user_id: userId,
            recipe_id: recipeId,
            date: date,
            meal_type: mealType
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function removeFromMealPlan(planId) {
    const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId);

    if (error) throw error;
}

// ============================================================================
// SHOPPING LIST
// ============================================================================

export async function getShoppingList(userId) {
    const { data, error } = await supabase
        .from('shopping_list_items')
        .select(`
            *,
            recipe:source_recipe_id (title)
        `)
        .eq('user_id', userId)
        .order('is_checked', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function addIngredientToShoppingList(userId, ingredient, recipeId = null) {
    const { data, error } = await supabase
        .from('shopping_list_items')
        .insert({
            user_id: userId,
            item: ingredient.name || ingredient.item || ingredient, // Handle object or string
            amount: ingredient.amount || null,
            unit: ingredient.unit || null,
            source_recipe_id: recipeId
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function toggleShoppingItem(itemId, isChecked) {
    const { error } = await supabase
        .from('shopping_list_items')
        .update({ is_checked: isChecked })
        .eq('id', itemId);

    if (error) throw error;
}

export async function deleteShoppingItem(itemId) {
    const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId);

    if (error) throw error;
}

export async function addRecipeIngredientsToShoppingList(userId, recipe) {
    if (!recipe.ingredients) return;

    // This could be optimized with a bulk insert if the array is prepared
    const items = recipe.ingredients.map(ing => ({
        user_id: userId,
        item: typeof ing === 'string' ? ing : (ing.name || ing.item),
        amount: typeof ing === 'string' ? null : ing.amount,
        unit: typeof ing === 'string' ? null : ing.unit,
        source_recipe_id: recipe.id
    }));

    const { error } = await supabase
        .from('shopping_list_items')
        .insert(items);

    if (error) throw error;
}

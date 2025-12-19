/**
 * Compares two recipe objects to find additions and changes.
 * Used for the AI Review Modal.
 */
export function diffRecipes(original, enriched) {
    const changes = {
        added: {},      // Completely new fields (was null/empty, now has value)
        modified: {},   // Changed values (fact change warning)
        structured: {}  // Structural changes (e.g. string -> object)
    };

    const keys = [
        'title', 'description', 'prep_time', 'cook_time', 'servings',
        'cuisine', 'difficulty', 'introduction', 'subtitle', 'ai_tags'
    ];

    // 1. Simple Metadata fields
    keys.forEach(key => {
        const oldVal = original[key];
        const newVal = enriched[key];

        // Check for Addition (old was empty, new has value)
        if (!hasValue(oldVal) && hasValue(newVal)) {
            changes.added[key] = { old: oldVal, new: newVal };
        }
        // Check for Modification (both present but different)
        else if (hasValue(oldVal) && hasValue(newVal) && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.modified[key] = { old: oldVal, new: newVal };
        }
    });

    // 2. Ingredients (Special handling for structural split)
    if (enriched.ingredients && enriched.ingredients.length > 0) {
        // Simple length check first
        if (!original.ingredients || original.ingredients.length === 0) {
            changes.added['ingredients'] = { old: [], new: enriched.ingredients };
        } else {
            // Detailed check could go here, for now we mark as 'structured' 
            // if the count is same but content format differs
            changes.structured['ingredients'] = {
                old: original.ingredients,
                new: enriched.ingredients,
                countDiff: enriched.ingredients.length - original.ingredients.length
            };
        }
    }

    return changes;
}

function hasValue(val) {
    if (val === null || val === undefined) return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    return true;
}

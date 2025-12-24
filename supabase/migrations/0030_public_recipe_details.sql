-- Allow public read access to recipe details (ingredients, steps, tools)
-- This is necessary because recipes are public, but their details were restricted to the owner.

-- ============================================================================
-- 1. Recipe Ingredients
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their recipe ingredients" ON recipe_ingredients;

CREATE POLICY "Public can view recipe ingredients" ON recipe_ingredients
    FOR SELECT USING (true); -- Allow everyone to read. Could be refined to check recipe visibility if needed, but recipes are generally public now.

-- Keep write policies restricted (these usually specific to owner in previous migrations)

-- ============================================================================
-- 2. Recipe Steps
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their recipe steps" ON recipe_steps;

CREATE POLICY "Public can view recipe steps" ON recipe_steps
    FOR SELECT USING (true);

-- ============================================================================
-- 3. Recipe Tools
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their recipe tools" ON recipe_tools;

CREATE POLICY "Public can view recipe tools" ON recipe_tools
    FOR SELECT USING (true);

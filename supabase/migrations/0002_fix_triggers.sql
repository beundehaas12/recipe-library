-- ============================================================================
-- FIX: Drop trigger that references dropped ingredients column
-- ============================================================================
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- List all triggers on recipes table to find the problematic one
SELECT tgname, tgrelid::regclass, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgrelid = 'recipes'::regclass;

-- The trigger is likely related to the old schema. Drop any that reference ingredients:
-- (Uncomment and modify the trigger name once you identify it from the query above)

-- Common patterns:
DROP TRIGGER IF EXISTS validate_ingredients ON recipes;
DROP TRIGGER IF EXISTS check_ingredients ON recipes;
DROP TRIGGER IF EXISTS recipes_ingredients_trigger ON recipes;

-- Also drop any functions that might reference the old columns
DROP FUNCTION IF EXISTS validate_recipe_ingredients() CASCADE;
DROP FUNCTION IF EXISTS check_recipe_data() CASCADE;

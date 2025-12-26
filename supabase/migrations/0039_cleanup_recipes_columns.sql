-- ============================================================================
-- MIGRATION: 0039_cleanup_recipes_columns.sql
-- Description: Removes unused columns from recipes table
-- ============================================================================

-- Drop unused INTERVAL columns (TEXT versions are used instead)
ALTER TABLE recipes DROP COLUMN IF EXISTS cooking_time;
ALTER TABLE recipes DROP COLUMN IF EXISTS preparation_time;

-- Drop unused verified column (no verification feature)
ALTER TABLE recipes DROP COLUMN IF EXISTS verified;

-- ============================================================================
-- MIGRATION: 0041_remove_unused_recipe_tables.sql
-- Description: Remove unused normalized tables (replaced by Hybrid approach)
-- ============================================================================

-- ============================================================================
-- 1. REMOVE recipe_tools TABLE (replaced by tools[] array column)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their recipe tools" ON recipe_tools;
DROP POLICY IF EXISTS "Users can insert their recipe tools" ON recipe_tools;
DROP POLICY IF EXISTS "Users can update their recipe tools" ON recipe_tools;
DROP POLICY IF EXISTS "Users can delete their recipe tools" ON recipe_tools;
DROP INDEX IF EXISTS idx_recipe_tools_recipe_id;
DROP TABLE IF EXISTS recipe_tools;

-- ============================================================================
-- 2. REMOVE recipe_enrichments TABLE (stored in extra_data JSONB instead)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their recipe enrichments" ON recipe_enrichments;
DROP POLICY IF EXISTS "Users can insert their recipe enrichments" ON recipe_enrichments;
DROP POLICY IF EXISTS "Users can update their recipe enrichments" ON recipe_enrichments;
DROP POLICY IF EXISTS "Users can delete their recipe enrichments" ON recipe_enrichments;
DROP INDEX IF EXISTS idx_recipe_enrichments_recipe_id;
DROP INDEX IF EXISTS idx_recipe_enrichments_type;
DROP TABLE IF EXISTS recipe_enrichments;

-- ============================================================================
-- NOTE: recipe_images TABLE IS KEPT FOR FUTURE MULTI-IMAGE SUPPORT
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

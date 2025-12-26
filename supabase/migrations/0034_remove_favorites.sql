-- ============================================================================
-- MIGRATION: 0034_remove_favorites.sql
-- Description: Removes the favorites table and related objects
-- ============================================================================

-- Drop the index first
DROP INDEX IF EXISTS idx_favorites_user_id;

-- Drop the RLS policy
DROP POLICY IF EXISTS "Users can manage their own favorites" ON favorites;

-- Drop the favorites table
DROP TABLE IF EXISTS favorites;

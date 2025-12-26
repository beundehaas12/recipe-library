-- ============================================================================
-- MIGRATION: 0038_remove_shopping_list.sql
-- Description: Removes the unused shopping_list_items table
-- ============================================================================

-- Drop RLS policy
DROP POLICY IF EXISTS "Users can manage their own shopping list" ON shopping_list_items;

-- Drop index
DROP INDEX IF EXISTS idx_shopping_list_user_id;

-- Drop the table
DROP TABLE IF EXISTS shopping_list_items;

-- ============================================================================
-- MIGRATION: 0035_remove_meal_plans.sql
-- Description: Removes the meal_plans table and meal_type enum
-- ============================================================================

-- Drop the index first
DROP INDEX IF EXISTS idx_meal_plans_user_date;

-- Drop the RLS policy
DROP POLICY IF EXISTS "Users can manage their own meal plans" ON meal_plans;

-- Drop the meal_plans table
DROP TABLE IF EXISTS meal_plans;

-- Drop the meal_type enum
DROP TYPE IF EXISTS meal_type;

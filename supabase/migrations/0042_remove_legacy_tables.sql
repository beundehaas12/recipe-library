-- ============================================================================
-- MIGRATION: 0042_remove_legacy_tables.sql
-- Description: Removes legacy tables that should have been deleted earlier
-- ============================================================================

-- ============================================================================
-- 1. REMOVE early_access_requests TABLE
-- ============================================================================
-- This was supposed to be removed in 0031_remove_early_access.sql but still exists.
-- The early access system has been replaced by the simpler 'waitlist' table.

DROP TRIGGER IF EXISTS update_early_access_timestamp ON early_access_requests;

-- Drop all RLS policies
DROP POLICY IF EXISTS "Admins can view all requests" ON early_access_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON early_access_requests;
DROP POLICY IF EXISTS "Anyone can submit request" ON early_access_requests;
DROP POLICY IF EXISTS "Users can view their own request" ON early_access_requests;

-- Drop indexes
DROP INDEX IF EXISTS idx_early_access_email;
DROP INDEX IF EXISTS idx_early_access_status;
DROP INDEX IF EXISTS idx_early_access_token;

-- Drop the table
DROP TABLE IF EXISTS early_access_requests CASCADE;

-- ============================================================================
-- 2. REMOVE recipe_discovery TABLE
-- ============================================================================
-- This table was created manually and is not used by the application.
-- Discovery features will use the new array columns on recipes table instead.

-- Drop RLS policies (if any)
DROP POLICY IF EXISTS "Anyone can view recipe discovery" ON recipe_discovery;
DROP POLICY IF EXISTS "Users can manage their recipe discovery" ON recipe_discovery;

-- Drop the table
DROP TABLE IF EXISTS recipe_discovery CASCADE;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

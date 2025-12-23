-- ============================================================================
-- RECIPE LIBRARY: Public Recipe Feed Migration
-- ============================================================================
-- This migration updates the recipes RLS policy to allow all authenticated
-- users to view all recipes (for the Ontdek/Discover feed).
--
-- INSERT, UPDATE, DELETE policies remain user-specific.
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. DROP THE RESTRICTIVE SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own recipes" ON recipes;

-- ============================================================================
-- 2. CREATE A PUBLIC-READ POLICY FOR AUTHENTICATED USERS
-- ============================================================================

-- All users can view all recipes (public feed & landing page)
CREATE POLICY "All users can view all recipes" ON recipes
    FOR SELECT USING (true);

-- Note: INSERT, UPDATE, DELETE policies remain unchanged:
-- - Users can insert their own recipes (user_id = auth.uid())
-- - Users can update their own recipes (user_id = auth.uid())
-- - Users can delete their own recipes (user_id = auth.uid())
-- These are already in place from 0016_remove_workspaces.sql

-- ============================================================================
-- DONE: All users can now see all recipes on the Ontdek page
-- Dashboard still filters by user_id in application code
-- ============================================================================

-- ============================================================================
-- RECIPE LIBRARY: Remove Workspaces & Collaboration Feature
-- ============================================================================
-- This migration removes the workspace/collaboration feature entirely,
-- reverting to simple user-based recipe access.
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. DROP RLS POLICIES FOR RECIPES (workspace-based)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view recipes in their workspaces" ON recipes;
DROP POLICY IF EXISTS "Users can insert recipes in their workspaces" ON recipes;
DROP POLICY IF EXISTS "Users can update recipes in their workspaces" ON recipes;
DROP POLICY IF EXISTS "Users can delete recipes in their workspaces" ON recipes;

-- ============================================================================
-- 2. DROP RLS POLICIES FOR WORKSPACE TABLES
-- ============================================================================

-- Workspace invitations
DROP POLICY IF EXISTS "Users can view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Members can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Members can delete invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their email" ON workspace_invitations;
DROP POLICY IF EXISTS "Owners can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Owners can delete invitations" ON workspace_invitations;

-- Workspace members
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can insert members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can update members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can delete members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON workspace_members;

-- Workspaces
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete their workspaces" ON workspaces;

-- ============================================================================
-- 3. DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;

-- ============================================================================
-- 4. DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS handle_new_user_workspace();
DROP FUNCTION IF EXISTS create_default_workspace_for_user(UUID);
DROP FUNCTION IF EXISTS accept_workspace_invitation(TEXT);
DROP FUNCTION IF EXISTS user_is_workspace_member(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_workspace_ids(UUID);

-- ============================================================================
-- 5. DROP WORKSPACE_ID COLUMN FROM RECIPES
-- ============================================================================

ALTER TABLE recipes DROP COLUMN IF EXISTS workspace_id;

-- ============================================================================
-- 6. DROP WORKSPACE TABLES (order matters due to foreign keys)
-- ============================================================================

DROP TABLE IF EXISTS workspace_invitations;
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;

-- ============================================================================
-- 7. RECREATE SIMPLE USER-BASED RLS FOR RECIPES
-- ============================================================================

-- Users can only see their own recipes
CREATE POLICY "Users can view their own recipes" ON recipes
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own recipes" ON recipes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recipes" ON recipes
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own recipes" ON recipes
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- DONE: Collaboration feature has been removed
-- ============================================================================

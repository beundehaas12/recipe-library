-- ============================================================================
-- FIX: Infinite recursion in workspace_members RLS
-- ============================================================================
-- The previous policy caused infinite recursion by querying workspace_members
-- to check if user can see workspace_members. This fix uses SECURITY DEFINER
-- functions to break the recursion.
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;

-- Create a SECURITY DEFINER function to check workspace membership
-- This function bypasses RLS to prevent recursion
CREATE OR REPLACE FUNCTION user_is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = p_workspace_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all workspace IDs for a user
CREATE OR REPLACE FUNCTION get_user_workspace_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT workspace_id FROM workspace_members WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate workspace_members policies using the helper function
CREATE POLICY "Users can view workspace members" ON workspace_members
    FOR SELECT USING (
        workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    );

CREATE POLICY "Owners can insert members" ON workspace_members
    FOR INSERT WITH CHECK (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can update members" ON workspace_members
    FOR UPDATE USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can delete members" ON workspace_members
    FOR DELETE USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- Recreate workspaces policy using the helper function
CREATE POLICY "Users can view their workspaces" ON workspaces
    FOR SELECT USING (
        id IN (SELECT get_user_workspace_ids(auth.uid()))
    );

-- Update recipes policies to use the helper function
DROP POLICY IF EXISTS "Users can view recipes in their workspaces" ON recipes;
DROP POLICY IF EXISTS "Users can insert recipes in their workspaces" ON recipes;
DROP POLICY IF EXISTS "Users can update recipes in their workspaces" ON recipes;
DROP POLICY IF EXISTS "Users can delete recipes in their workspaces" ON recipes;

CREATE POLICY "Users can view recipes in their workspaces" ON recipes
    FOR SELECT USING (
        workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can insert recipes in their workspaces" ON recipes
    FOR INSERT WITH CHECK (
        workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can update recipes in their workspaces" ON recipes
    FOR UPDATE USING (
        workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can delete recipes in their workspaces" ON recipes
    FOR DELETE USING (
        workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
        OR user_id = auth.uid()
    );

-- ============================================================================
-- RECIPE LIBRARY: Workspaces & Collaboration Migration
-- ============================================================================
-- This migration adds workspace support for multi-user collaboration.
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE WORKSPACES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'Mijn Recepten',
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);

-- ============================================================================
-- 2. CREATE WORKSPACE MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

-- ============================================================================
-- 3. CREATE WORKSPACE INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted BOOLEAN DEFAULT FALSE,
    accepted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);

-- ============================================================================
-- 4. ADD WORKSPACE_ID TO RECIPES TABLE
-- ============================================================================

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Index for workspace recipe lookups
CREATE INDEX IF NOT EXISTS idx_recipes_workspace_id ON recipes(workspace_id);

-- ============================================================================
-- 5. CREATE DEFAULT WORKSPACES FOR EXISTING USERS AND MIGRATE RECIPES
-- ============================================================================

-- Create a function to create default workspace for a user
CREATE OR REPLACE FUNCTION create_default_workspace_for_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    -- Create workspace
    INSERT INTO workspaces (name, owner_id)
    VALUES ('Mijn Recepten', p_user_id)
    RETURNING id INTO v_workspace_id;
    
    -- Add owner as member
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, p_user_id, 'owner');
    
    RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing recipes: Create workspaces for all users with recipes
DO $$
DECLARE
    r RECORD;
    v_workspace_id UUID;
BEGIN
    -- For each unique user with recipes
    FOR r IN SELECT DISTINCT user_id FROM recipes WHERE workspace_id IS NULL AND user_id IS NOT NULL
    LOOP
        -- Check if user already has a workspace
        SELECT id INTO v_workspace_id FROM workspaces WHERE owner_id = r.user_id LIMIT 1;
        
        -- If not, create one
        IF v_workspace_id IS NULL THEN
            v_workspace_id := create_default_workspace_for_user(r.user_id);
        END IF;
        
        -- Update all their recipes to use this workspace
        UPDATE recipes SET workspace_id = v_workspace_id WHERE user_id = r.user_id AND workspace_id IS NULL;
    END LOOP;
END $$;

-- ============================================================================
-- 6. CREATE TRIGGER FOR NEW USER WORKSPACE CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user_workspace()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_workspace_for_user(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;
CREATE TRIGGER on_auth_user_created_workspace
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_workspace();

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Workspaces: Users can see workspaces they're members of
CREATE POLICY "Users can view their workspaces" ON workspaces
    FOR SELECT USING (
        id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Owners can update their workspaces" ON workspaces
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces" ON workspaces
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces" ON workspaces
    FOR DELETE USING (owner_id = auth.uid());

-- Workspace Members: Users can see members of workspaces they belong to
CREATE POLICY "Users can view workspace members" ON workspace_members
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Owners can manage members" ON workspace_members
    FOR ALL USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- Invitations: Owners/admins can manage, anyone can view their own
CREATE POLICY "Users can view invitations for their email" ON workspace_invitations
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR invited_by = auth.uid()
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can create invitations" ON workspace_invitations
    FOR INSERT WITH CHECK (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

CREATE POLICY "Owners can delete invitations" ON workspace_invitations
    FOR DELETE USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- Update recipes RLS to include workspace access
DROP POLICY IF EXISTS "Users can view their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete their own recipes" ON recipes;

CREATE POLICY "Users can view recipes in their workspaces" ON recipes
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR user_id = auth.uid()  -- Fallback for legacy recipes
    );

CREATE POLICY "Users can insert recipes in their workspaces" ON recipes
    FOR INSERT WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can update recipes in their workspaces" ON recipes
    FOR UPDATE USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can delete recipes in their workspaces" ON recipes
    FOR DELETE USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR user_id = auth.uid()
    );

-- ============================================================================
-- 8. HELPER FUNCTION TO ACCEPT INVITATION
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_workspace_invitation(p_token TEXT)
RETURNS JSON AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Find and validate invitation
    SELECT * INTO v_invitation FROM workspace_invitations
    WHERE token = p_token
    AND accepted = FALSE
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check email matches (optional, for security)
    -- Skip for now to allow any logged-in user to accept if they have the link
    
    -- Add user to workspace
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_invitation.workspace_id, v_user_id, 'member')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Mark invitation as accepted
    UPDATE workspace_invitations
    SET accepted = TRUE, accepted_by = v_user_id
    WHERE id = v_invitation.id;
    
    RETURN json_build_object('success', true, 'workspace_id', v_invitation.workspace_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

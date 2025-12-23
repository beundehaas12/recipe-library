-- ============================================================================
-- RECIPE LIBRARY: User Roles Migration
-- ============================================================================
-- This migration adds a global user role system.
--
-- Roles:
--   - user (default): Standard app access
--   - author: Dashboard/Portal access
--   - admin: Author + User management
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE USER_ROLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'author', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- ============================================================================
-- 2. HELPER FUNCTION TO GET USER ROLE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM user_roles WHERE user_id = p_user_id;
    RETURN COALESCE(v_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. HELPER FUNCTION TO CHECK IF USER IS ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. CREATE TRIGGER FOR AUTO-ASSIGNING DEFAULT ROLE
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_role();

-- ============================================================================
-- 5. CREATE ROLES FOR EXISTING USERS
-- ============================================================================

INSERT INTO user_roles (user_id, role)
SELECT id, 'user' FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_roles)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 6. ASSIGN ADMIN ROLE TO bernardveeningen@icloud.com
-- ============================================================================

UPDATE user_roles
SET role = 'admin', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'bernardveeningen@icloud.com');

-- If not exists yet (edge case), insert directly
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'bernardveeningen@icloud.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = NOW();

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own role
CREATE POLICY "Users can view their own role" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON user_roles
    FOR SELECT USING (is_admin());

-- Only admins can insert roles (for manual assignment)
CREATE POLICY "Admins can insert roles" ON user_roles
    FOR INSERT WITH CHECK (is_admin());

-- Only admins can update roles
CREATE POLICY "Admins can update roles" ON user_roles
    FOR UPDATE USING (is_admin());

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles" ON user_roles
    FOR DELETE USING (is_admin());

-- ============================================================================
-- 8. GRANT EXECUTE ON FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

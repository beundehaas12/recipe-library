-- ============================================================================
-- RECIPE LIBRARY: Author Profiles Migration
-- ============================================================================
-- This migration adds author-specific profiles for dashboard users.
-- Separate from user_profiles to contain public author information.
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE AUTHOR_PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS author_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    avatar_storage_path TEXT,  -- For cleanup when avatar changes
    bio TEXT,                   -- Author bio for public display
    metadata JSONB DEFAULT '{}', -- Extensible custom fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_author_profiles_user_id ON author_profiles(user_id);

-- ============================================================================
-- 2. UPDATED_AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS update_author_profiles_timestamp ON author_profiles;
CREATE TRIGGER update_author_profiles_timestamp
BEFORE UPDATE ON author_profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 3. AUTO-CREATE AUTHOR PROFILE WHEN USER BECOMES AUTHOR
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_author_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When a user becomes an author or admin, create their author profile
    IF NEW.role IN ('author', 'admin') AND 
       (OLD.role IS NULL OR OLD.role = 'user') THEN
        INSERT INTO author_profiles (user_id)
        VALUES (NEW.user_id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_role_changed ON user_roles;
CREATE TRIGGER on_user_role_changed
    AFTER INSERT OR UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION handle_author_role_change();

-- ============================================================================
-- 4. CREATE AUTHOR PROFILES FOR EXISTING AUTHORS/ADMINS
-- ============================================================================

INSERT INTO author_profiles (user_id)
SELECT user_id FROM user_roles
WHERE role IN ('author', 'admin')
  AND user_id NOT IN (SELECT user_id FROM author_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE author_profiles ENABLE ROW LEVEL SECURITY;

-- Authors can view their own profile
CREATE POLICY "Authors can view their own profile" ON author_profiles
    FOR SELECT USING (user_id = auth.uid());

-- Authors can update their own profile
CREATE POLICY "Authors can update their own profile" ON author_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Authors can insert their own profile (for manual creation if needed)
CREATE POLICY "Authors can insert their own profile" ON author_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all author profiles
CREATE POLICY "Admins can view all author profiles" ON author_profiles
    FOR SELECT USING (is_admin());

-- Public can read author profiles (for recipe display)
CREATE POLICY "Public can view author profiles" ON author_profiles
    FOR SELECT USING (true);

-- ============================================================================
-- 6. HELPER FUNCTION: Get full author name
-- ============================================================================

CREATE OR REPLACE FUNCTION get_author_display_name(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    SELECT first_name, last_name INTO v_first_name, v_last_name
    FROM author_profiles WHERE user_id = p_user_id;
    
    IF v_first_name IS NOT NULL AND v_last_name IS NOT NULL THEN
        RETURN v_first_name || ' ' || v_last_name;
    ELSIF v_first_name IS NOT NULL THEN
        RETURN v_first_name;
    ELSIF v_last_name IS NOT NULL THEN
        RETURN v_last_name;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_author_display_name(UUID) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- New table: author_profiles
-- Auto-creates profile when user becomes author/admin
-- Public-readable for recipe author display
-- ============================================================================

-- ============================================================================
-- RECIPE LIBRARY: User Profiles & Preferences Migration
-- ============================================================================
-- This migration adds user account management capabilities:
-- - User profiles (display name, bio, avatar)
-- - User preferences (theme, language, notifications)
-- - Account deletion tracking (GDPR compliance)
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE USER_PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    avatar_storage_path TEXT,  -- For cleanup when avatar changes
    metadata JSONB DEFAULT '{}',  -- Extensible custom fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================================
-- 2. CREATE USER_PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'nl',  -- Default to Dutch for this app
    email_notifications BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}',  -- Extensible settings storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================================
-- 3. CREATE ACCOUNT_DELETIONS TABLE (GDPR compliance / audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_deletions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,  -- No FK - user is deleted
    email_hash TEXT,  -- SHA256 hash for audit without storing PII
    reason TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_retained_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Index for cleanup jobs
CREATE INDEX IF NOT EXISTS idx_account_deletions_retained_until ON account_deletions(data_retained_until);

-- ============================================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_timestamp ON user_profiles;
CREATE TRIGGER update_user_profiles_timestamp
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Apply updated_at trigger to user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_timestamp ON user_preferences;
CREATE TRIGGER update_user_preferences_timestamp
BEFORE UPDATE ON user_preferences
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 5. AUTO-CREATE PROFILE & PREFERENCES FOR NEW USERS
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default profile
    INSERT INTO user_profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create default preferences
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- ============================================================================
-- 6. CREATE PROFILES & PREFERENCES FOR EXISTING USERS
-- ============================================================================

-- Create profiles for existing users who don't have one
INSERT INTO user_profiles (user_id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Create preferences for existing users who don't have them
INSERT INTO user_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;

-- USER_PROFILES policies
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- System can insert profiles (via trigger)
CREATE POLICY "System can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- USER_PREFERENCES policies
-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (user_id = auth.uid());

-- System can insert preferences (via trigger)
CREATE POLICY "System can insert preferences" ON user_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ACCOUNT_DELETIONS policies
-- Only admins can view deletion records (audit purposes)
CREATE POLICY "Admins can view account deletions" ON account_deletions
    FOR SELECT USING (is_admin());

-- Only authenticated users can insert their own deletion request
CREATE POLICY "Users can request deletion" ON account_deletions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Get user profile with preferences in one call
CREATE OR REPLACE FUNCTION get_user_account(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
    v_profile RECORD;
    v_prefs RECORD;
    v_role TEXT;
BEGIN
    -- Get profile
    SELECT * INTO v_profile FROM user_profiles WHERE user_id = p_user_id;
    
    -- Get preferences
    SELECT * INTO v_prefs FROM user_preferences WHERE user_id = p_user_id;
    
    -- Get role
    SELECT role INTO v_role FROM user_roles WHERE user_id = p_user_id;
    
    RETURN json_build_object(
        'profile', json_build_object(
            'display_name', v_profile.display_name,
            'bio', v_profile.bio,
            'avatar_url', v_profile.avatar_url,
            'metadata', v_profile.metadata,
            'created_at', v_profile.created_at,
            'updated_at', v_profile.updated_at
        ),
        'preferences', json_build_object(
            'theme', v_prefs.theme,
            'language', v_prefs.language,
            'email_notifications', v_prefs.email_notifications,
            'preferences', v_prefs.preferences
        ),
        'role', COALESCE(v_role, 'user')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Request account deletion (soft delete with audit trail)
CREATE OR REPLACE FUNCTION request_account_deletion(p_reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Get user email for hashing
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    
    -- Create deletion record
    INSERT INTO account_deletions (user_id, email_hash, reason)
    VALUES (v_user_id, encode(sha256(v_email::bytea), 'hex'), p_reason);
    
    -- Note: Actual user deletion should be handled by a backend job
    -- that processes the account_deletions table
    
    RETURN json_build_object(
        'success', true,
        'message', 'Account deletion request submitted. Your data will be deleted within 30 days.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. GRANT EXECUTE ON FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_account_deletion(TEXT) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- New tables: user_profiles, user_preferences, account_deletions
-- New functions: get_user_account, request_account_deletion
-- Auto-creates profile/prefs for new users via trigger
-- ============================================================================

-- ============================================================================
-- ROLLBACK (if needed, run manually):
-- ============================================================================
-- DROP FUNCTION IF EXISTS request_account_deletion(TEXT);
-- DROP FUNCTION IF EXISTS get_user_account(UUID);
-- DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
-- DROP FUNCTION IF EXISTS handle_new_user_profile();
-- DROP TRIGGER IF EXISTS update_user_preferences_timestamp ON user_preferences;
-- DROP TRIGGER IF EXISTS update_user_profiles_timestamp ON user_profiles;
-- DROP TABLE IF EXISTS account_deletions;
-- DROP TABLE IF EXISTS user_preferences;
-- DROP TABLE IF EXISTS user_profiles;
-- ============================================================================

-- ============================================================================
-- MIGRATION: 0037_remove_user_preferences_and_deletions.sql
-- Description: Removes unused user_preferences and account_deletions tables
-- ============================================================================

-- ============================================================================
-- 1. DROP TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS update_user_preferences_timestamp ON user_preferences;

-- ============================================================================
-- 2. DROP FUNCTIONS (that reference these tables)
-- ============================================================================
DROP FUNCTION IF EXISTS get_user_account(UUID);
DROP FUNCTION IF EXISTS request_account_deletion(TEXT);

-- ============================================================================
-- 3. DROP RLS POLICIES
-- ============================================================================

-- user_preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "System can insert preferences" ON user_preferences;

-- account_deletions policies
DROP POLICY IF EXISTS "Admins can view account deletions" ON account_deletions;
DROP POLICY IF EXISTS "Users can request deletion" ON account_deletions;

-- ============================================================================
-- 4. DROP INDEXES
-- ============================================================================
DROP INDEX IF EXISTS idx_user_preferences_user_id;
DROP INDEX IF EXISTS idx_account_deletions_retained_until;

-- ============================================================================
-- 5. DROP TABLES
-- ============================================================================
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS account_deletions;

-- ============================================================================
-- 6. UPDATE handle_new_user_profile FUNCTION
-- ============================================================================
-- Remove the user_preferences creation from the trigger function
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default profile only (preferences removed)
    INSERT INTO user_profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

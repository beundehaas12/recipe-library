-- ============================================================================
-- REMOVE EARLY ACCESS FEATURE
-- ============================================================================
-- This migration removes all early access / invite user functionality.
-- ============================================================================

-- Drop functions first (they depend on the table)
DROP FUNCTION IF EXISTS approve_early_access(UUID);
DROP FUNCTION IF EXISTS validate_invitation_token(UUID);
DROP FUNCTION IF EXISTS complete_early_access(UUID);
DROP FUNCTION IF EXISTS submit_early_access_request(TEXT, TEXT, TEXT);

-- Drop trigger
DROP TRIGGER IF EXISTS update_early_access_timestamp ON early_access_requests;

-- Drop table (cascades policies and indexes)
DROP TABLE IF EXISTS early_access_requests CASCADE;

-- Update handle_new_user to not reference early_access
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO user_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create user role
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create user preferences
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

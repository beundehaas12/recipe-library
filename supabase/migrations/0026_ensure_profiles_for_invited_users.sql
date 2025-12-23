-- ============================================================================
-- RECIPE LIBRARY: Ensure Profiles Exist for All Users
-- ============================================================================
-- The existing trigger only fires on INSERT into auth.users, but invited
-- users already exist in auth.users when they click the invite link.
-- This trigger ensures profiles exist when password is set.
-- ============================================================================

-- Function to ensure user_profiles and user_preferences exist
CREATE OR REPLACE FUNCTION ensure_user_profile_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile if not exists
    INSERT INTO user_profiles (user_id, first_name)
    VALUES (NEW.id, split_part(NEW.email, '@', 1))
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create preferences if not exists
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires when password changes (invited users setting password)
DROP TRIGGER IF EXISTS ensure_profile_on_password_change ON auth.users;
CREATE TRIGGER ensure_profile_on_password_change
    AFTER UPDATE ON auth.users
    FOR EACH ROW 
    WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password)
    EXECUTE FUNCTION ensure_user_profile_exists();

-- Also backfill any users missing profiles right now
INSERT INTO user_profiles (user_id, first_name)
SELECT id, split_part(email, '@', 1)
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_preferences WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

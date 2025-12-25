-- ============================================================================
-- FIX: Copy Names from Waitlist Table to User Profiles
-- ============================================================================
-- The ensure_user_profile_exists trigger was only checking early_access_requests
-- but we're using the waitlist table for invites. This updates the trigger
-- to check both tables for first/last name.
-- ============================================================================

-- Update the profile creation function to use names from waitlist table
CREATE OR REPLACE FUNCTION ensure_user_profile_exists()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    -- First try to get name from waitlist table (current flow)
    SELECT first_name, last_name INTO v_first_name, v_last_name
    FROM waitlist
    WHERE lower(email) = lower(NEW.email)
    LIMIT 1;
    
    -- Fallback to early_access_requests if not found in waitlist
    IF v_first_name IS NULL AND v_last_name IS NULL THEN
        SELECT first_name, last_name INTO v_first_name, v_last_name
        FROM early_access_requests
        WHERE lower(email) = lower(NEW.email)
        LIMIT 1;
    END IF;
    
    -- Fallback to email prefix if no name found
    IF v_first_name IS NULL THEN
        v_first_name := split_part(NEW.email, '@', 1);
    END IF;
    
    -- Create profile if not exists
    INSERT INTO user_profiles (user_id, first_name, last_name)
    VALUES (NEW.id, v_first_name, v_last_name)
    ON CONFLICT (user_id) DO UPDATE SET
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), user_profiles.first_name),
        last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), user_profiles.last_name);
    
    -- Create preferences if not exists
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update any existing users who were invited but don't have names
-- by backfilling from the waitlist table
UPDATE user_profiles up
SET 
    first_name = COALESCE(NULLIF(up.first_name, ''), w.first_name, split_part(u.email, '@', 1)),
    last_name = COALESCE(NULLIF(up.last_name, ''), w.last_name)
FROM auth.users u
LEFT JOIN waitlist w ON lower(w.email) = lower(u.email)
WHERE up.user_id = u.id
  AND (up.first_name IS NULL OR up.first_name = '' OR up.first_name = split_part(u.email, '@', 1));

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- ============================================================================
-- RECIPE LIBRARY: Add Name Fields to Early Access Requests
-- ============================================================================
-- Collect first_name and last_name during early access signup so they can
-- be used when creating the user's profile.
-- ============================================================================

-- Add name columns to early_access_requests
ALTER TABLE early_access_requests ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE early_access_requests ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update the validate_invitation_token function to return names
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token UUID)
RETURNS JSON AS $$
DECLARE
    v_request RECORD;
BEGIN
    SELECT * INTO v_request 
    FROM early_access_requests 
    WHERE invitation_token = p_token;
    
    IF NOT FOUND THEN
        RETURN json_build_object('valid', false, 'error', 'Invalid invitation token');
    END IF;
    
    IF v_request.status = 'completed' THEN
        RETURN json_build_object('valid', false, 'error', 'Account already completed');
    END IF;
    
    IF v_request.status != 'approved' THEN
        RETURN json_build_object('valid', false, 'error', 'Request not approved');
    END IF;
    
    RETURN json_build_object(
        'valid', true,
        'email', v_request.email,
        'first_name', v_request.first_name,
        'last_name', v_request.last_name,
        'request_id', v_request.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the profile creation function to use names from early_access if available
CREATE OR REPLACE FUNCTION ensure_user_profile_exists()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    -- Try to get name from early_access_requests
    SELECT first_name, last_name INTO v_first_name, v_last_name
    FROM early_access_requests
    WHERE email = NEW.email
    LIMIT 1;
    
    -- Fallback to email prefix if no name found
    IF v_first_name IS NULL THEN
        v_first_name := split_part(NEW.email, '@', 1);
    END IF;
    
    -- Create profile if not exists
    INSERT INTO user_profiles (user_id, first_name, last_name)
    VALUES (NEW.id, v_first_name, v_last_name)
    ON CONFLICT (user_id) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name);
    
    -- Create preferences if not exists
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

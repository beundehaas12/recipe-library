-- ============================================================================
-- RECIPE LIBRARY: Prevent Existing Users from Early Access
-- ============================================================================
-- This function checks if email already exists in auth.users before allowing
-- early access request submission.
-- ============================================================================

-- Function to safely submit early access request (checks for existing user)
CREATE OR REPLACE FUNCTION submit_early_access_request(
    p_email TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_existing_user_id UUID;
BEGIN
    -- Check if email already exists in auth.users
    SELECT id INTO v_existing_user_id 
    FROM auth.users 
    WHERE email = lower(trim(p_email));
    
    IF v_existing_user_id IS NOT NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Je hebt al een account. Log in met dit e-mailadres.'
        );
    END IF;
    
    -- Check if already in early_access_requests
    IF EXISTS (SELECT 1 FROM early_access_requests WHERE email = lower(trim(p_email))) THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Dit e-mailadres staat al op de wachtlijst.'
        );
    END IF;
    
    -- Insert the request
    INSERT INTO early_access_requests (email, first_name, last_name)
    VALUES (lower(trim(p_email)), trim(p_first_name), trim(p_last_name));
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anonymous users (for the login page form)
GRANT EXECUTE ON FUNCTION submit_early_access_request(TEXT, TEXT, TEXT) TO anon, authenticated;

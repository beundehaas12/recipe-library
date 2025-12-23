-- ============================================================================
-- RECIPE LIBRARY: Early Access Requests Migration
-- ============================================================================
-- This migration adds early access request tracking for waitlist signups.
--
-- Flow:
--   1. User submits email on login page → status = 'pending'
--   2. Admin approves request → status = 'approved', invitation_token generated
--   3. User completes account → status = 'completed'
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE EARLY_ACCESS_REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS early_access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed')),
    invitation_token UUID DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    approved_by UUID REFERENCES auth.users(id) DEFAULT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_early_access_email ON early_access_requests(email);
CREATE INDEX IF NOT EXISTS idx_early_access_status ON early_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_early_access_token ON early_access_requests(invitation_token);

-- ============================================================================
-- 2. UPDATED_AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS update_early_access_timestamp ON early_access_requests;
CREATE TRIGGER update_early_access_timestamp
BEFORE UPDATE ON early_access_requests
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE early_access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an early access request (insert their email)
CREATE POLICY "Anyone can submit early access request" ON early_access_requests
    FOR INSERT WITH CHECK (true);

-- Admins can view all early access requests
CREATE POLICY "Admins can view all early access requests" ON early_access_requests
    FOR SELECT USING (is_admin());

-- Admins can update early access requests (for approval)
CREATE POLICY "Admins can update early access requests" ON early_access_requests
    FOR UPDATE USING (is_admin());

-- Public can read their own request by invitation token (for completion flow)
CREATE POLICY "Anyone can view request by invitation token" ON early_access_requests
    FOR SELECT USING (invitation_token IS NOT NULL);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Generate invitation token and approve request
CREATE OR REPLACE FUNCTION approve_early_access(p_request_id UUID)
RETURNS JSON AS $$
DECLARE
    v_token UUID;
    v_email TEXT;
BEGIN
    -- Generate unique invitation token
    v_token := uuid_generate_v4();
    
    -- Update the request
    UPDATE early_access_requests
    SET 
        status = 'approved',
        invitation_token = v_token,
        approved_at = NOW(),
        approved_by = auth.uid()
    WHERE id = p_request_id AND status = 'pending'
    RETURNING email INTO v_email;
    
    IF v_email IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'email', v_email,
        'invitation_token', v_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate invitation token and get request details
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
        'request_id', v_request.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark request as completed after account creation
CREATE OR REPLACE FUNCTION complete_early_access(p_token UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE early_access_requests
    SET 
        status = 'completed',
        completed_at = NOW()
    WHERE invitation_token = p_token AND status = 'approved';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or already completed token');
    END IF;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. GRANT EXECUTE ON FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION approve_early_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invitation_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_early_access(UUID) TO anon, authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- New table: early_access_requests
-- New functions: approve_early_access, validate_invitation_token, complete_early_access
-- ============================================================================

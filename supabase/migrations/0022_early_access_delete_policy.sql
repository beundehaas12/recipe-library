-- ============================================================================
-- RECIPE LIBRARY: Early Access Delete Policy Migration
-- ============================================================================
-- Adds delete policy for admins to remove early access requests
-- ============================================================================

-- Allow admins to delete early access requests
CREATE POLICY "Admins can delete early access requests" ON early_access_requests
    FOR DELETE USING (is_admin());

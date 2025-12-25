-- ============================================================================
-- WAITLIST TABLE FOR EARLY ACCESS
-- ============================================================================
-- Simple waitlist for early access requests.
-- Uses Supabase's built-in inviteUserByEmail flow.
-- ============================================================================

CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);

-- RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can join the waitlist (public signup)
CREATE POLICY "Anyone can join waitlist" ON waitlist
    FOR INSERT WITH CHECK (true);

-- Admins can view all waitlist entries
CREATE POLICY "Admins can view waitlist" ON waitlist
    FOR SELECT USING (is_admin());

-- Admins can update waitlist entries (mark as invited/rejected)
CREATE POLICY "Admins can update waitlist" ON waitlist
    FOR UPDATE USING (is_admin());

-- Admins can delete waitlist entries
CREATE POLICY "Admins can delete waitlist" ON waitlist
    FOR DELETE USING (is_admin());

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- ============================================================================
-- RECIPE LIBRARY: Fix RLS for User Profile/Preferences Self-Insert
-- ============================================================================
-- Allow users to insert/update their own profile and preferences rows
-- This is needed for the invite flow where users complete their profile
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;
DROP POLICY IF EXISTS "Allow preferences creation" ON user_preferences;

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to update their own profile  
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Allow users to insert their own preferences
CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to update their own preferences
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (user_id = auth.uid());

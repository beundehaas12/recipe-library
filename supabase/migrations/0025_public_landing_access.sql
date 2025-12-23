-- ============================================================================
-- RECIPE LIBRARY: Public Access for Landing Page
-- ============================================================================
-- Allow unauthenticated users to view recipes for landing page slideshow
-- ============================================================================

-- Allow public read access to recipes (for landing page)
DROP POLICY IF EXISTS "Public can view recipes" ON recipes;
CREATE POLICY "Public can view recipes" ON recipes
    FOR SELECT USING (true);

-- Allow public read access to author_profiles (for landing page)
DROP POLICY IF EXISTS "Public can view author profiles" ON author_profiles;
CREATE POLICY "Public can view author profiles" ON author_profiles
    FOR SELECT USING (true);

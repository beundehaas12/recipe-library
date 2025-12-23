-- ============================================================================
-- RECIPE LIBRARY: Public Collections Migration
-- ============================================================================
-- unrestricted read access to collections for the Discovery page.
-- ============================================================================

-- 1. Update Collections RLS (Allow public read)
DROP POLICY IF EXISTS "Users can view their collections" ON collections;

CREATE POLICY "All users can view all collections" ON collections
    FOR SELECT USING (true);

-- Keep write access restricted to owner
DROP POLICY IF EXISTS "Users can insert their collections" ON collections;
CREATE POLICY "Users can insert their own collections" ON collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their collections" ON collections;
CREATE POLICY "Users can update their own collections" ON collections
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their collections" ON collections;
CREATE POLICY "Users can delete their own collections" ON collections
    FOR DELETE USING (auth.uid() = user_id);


-- 2. Update Recipe-Collections Junction RLS (Allow public read)
DROP POLICY IF EXISTS "Users can view their recipe_collections" ON recipe_collections;

CREATE POLICY "All users can view all recipe_collections" ON recipe_collections
    FOR SELECT USING (true);

-- Keep write access restricted to collection owner
-- (The logic is: if you own the collection, you can add/remove recipes from it)
DROP POLICY IF EXISTS "Users can insert their recipe_collections" ON recipe_collections;
CREATE POLICY "Users can insert into their own collections" ON recipe_collections
    FOR INSERT WITH CHECK (
        collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete their recipe_collections" ON recipe_collections;
CREATE POLICY "Users can delete from their own collections" ON recipe_collections
    FOR DELETE USING (
        collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid())
    );

-- ============================================================================
-- RECIPE LIBRARY: Collections Schema
-- ============================================================================
-- Adds support for organizing recipes into collections (folders).
-- ============================================================================

-- 1. Create Collections Table
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'folder', -- e.g., 'folder', 'star', 'heart'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- Enable RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their collections" ON collections;
DROP POLICY IF EXISTS "Users can insert their collections" ON collections;
DROP POLICY IF EXISTS "Users can update their collections" ON collections;
DROP POLICY IF EXISTS "Users can delete their collections" ON collections;

CREATE POLICY "Users can view their collections" ON collections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their collections" ON collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their collections" ON collections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their collections" ON collections
    FOR DELETE USING (auth.uid() = user_id);

-- 2. Create Recipe-Collections Junction Table
CREATE TABLE IF NOT EXISTS recipe_collections (
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (recipe_id, collection_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_recipe_collections_collection_id ON recipe_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_recipe_collections_recipe_id ON recipe_collections(recipe_id);

-- Enable RLS
ALTER TABLE recipe_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Checks recipe ownership implicitly via join or just allows if user owns the collection)
-- A simpler approach: User can manage mapping if they own the collection.
-- We verify collection ownership. We assume if you can see the recipe, you can add it, but stricter is better.
-- Let's stick to: Users can manage mappings for their own collections.

DROP POLICY IF EXISTS "Users can view their recipe_collections" ON recipe_collections;
DROP POLICY IF EXISTS "Users can insert their recipe_collections" ON recipe_collections;
DROP POLICY IF EXISTS "Users can delete their recipe_collections" ON recipe_collections;

CREATE POLICY "Users can view their recipe_collections" ON recipe_collections
    FOR SELECT USING (
        collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their recipe_collections" ON recipe_collections
    FOR INSERT WITH CHECK (
        collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their recipe_collections" ON recipe_collections
    FOR DELETE USING (
        collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid())
    );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

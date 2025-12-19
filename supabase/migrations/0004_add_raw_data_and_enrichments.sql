-- ============================================================================
-- RECIPE LIBRARY: Raw Data & Enrichments Schema
-- ============================================================================
-- Adds support for:
-- 1. Raw OCR data storage (100% fidelity to photo)
-- 2. Multi-image support per recipe
-- 3. AI enrichments with versioning
-- ============================================================================

-- 1. Add raw_extracted_data column to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS raw_extracted_data JSONB;

-- 2. Multi-image support (for multi-page cookbook recipes)
CREATE TABLE IF NOT EXISTS recipe_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_images_recipe_id ON recipe_images(recipe_id);

-- Enable RLS
ALTER TABLE recipe_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their recipe images" ON recipe_images;
DROP POLICY IF EXISTS "Users can insert their recipe images" ON recipe_images;
DROP POLICY IF EXISTS "Users can delete their recipe images" ON recipe_images;

CREATE POLICY "Users can view their recipe images" ON recipe_images
    FOR SELECT USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their recipe images" ON recipe_images
    FOR INSERT WITH CHECK (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their recipe images" ON recipe_images
    FOR DELETE USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

-- 3. AI Enrichments table with versioning
CREATE TABLE IF NOT EXISTS recipe_enrichments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    enrichment_type TEXT NOT NULL,  -- 'nutrition', 'variations', 'pairings', 'tips', etc.
    data JSONB NOT NULL,
    ai_model TEXT DEFAULT 'gemini-3-flash-preview',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_enrichments_recipe_id ON recipe_enrichments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_enrichments_type ON recipe_enrichments(enrichment_type);

-- Enable RLS
ALTER TABLE recipe_enrichments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their recipe enrichments" ON recipe_enrichments;
DROP POLICY IF EXISTS "Users can insert their recipe enrichments" ON recipe_enrichments;
DROP POLICY IF EXISTS "Users can update their recipe enrichments" ON recipe_enrichments;
DROP POLICY IF EXISTS "Users can delete their recipe enrichments" ON recipe_enrichments;

CREATE POLICY "Users can view their recipe enrichments" ON recipe_enrichments
    FOR SELECT USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their recipe enrichments" ON recipe_enrichments
    FOR INSERT WITH CHECK (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their recipe enrichments" ON recipe_enrichments
    FOR UPDATE USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their recipe enrichments" ON recipe_enrichments
    FOR DELETE USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

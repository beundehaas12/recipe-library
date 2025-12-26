-- ============================================================================
-- MIGRATION: 0040_add_queryable_arrays.sql
-- Description: Add queryable array columns for filtering (Hybrid Architecture)
-- ============================================================================

-- ============================================================================
-- 1. ADD QUERYABLE ARRAY COLUMNS
-- ============================================================================

-- Equipment/tools needed for recipe
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tools TEXT[] DEFAULT '{}';

-- Allergen warnings (nuts, dairy, gluten, etc.)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';

-- Dietary flags (vegetarian, vegan, gluten-free, dairy-free, etc.)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS dietary_flags TEXT[] DEFAULT '{}';

-- Tags (user-defined and AI-generated)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ai_tags TEXT[] DEFAULT '{}';

-- ============================================================================
-- 2. CREATE GIN INDEXES FOR FAST ARRAY QUERIES
-- ============================================================================

-- These enable queries like: WHERE 'blender' = ANY(tools)
CREATE INDEX IF NOT EXISTS idx_recipes_tools ON recipes USING GIN (tools);
CREATE INDEX IF NOT EXISTS idx_recipes_allergens ON recipes USING GIN (allergens);
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_flags ON recipes USING GIN (dietary_flags);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_recipes_ai_tags ON recipes USING GIN (ai_tags);

-- ============================================================================
-- 3. ADD FULL-TEXT SEARCH INDEX FOR UNIVERSAL SEARCH
-- ============================================================================

-- Create a generated column for full-text search
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('dutch', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('dutch', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('dutch', coalesce(author, '')), 'C') ||
        setweight(to_tsvector('dutch', coalesce(cuisine, '')), 'C')
    ) STORED;

-- Index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_recipes_search ON recipes USING GIN (search_vector);

-- ============================================================================
-- 4. MIGRATE EXISTING DATA FROM EXTRA_DATA JSONB
-- ============================================================================

-- Move tools from extra_data.tools to the new array column
UPDATE recipes 
SET tools = ARRAY(SELECT jsonb_array_elements_text(extra_data->'tools'))
WHERE extra_data ? 'tools' 
  AND jsonb_typeof(extra_data->'tools') = 'array'
  AND (tools IS NULL OR tools = '{}');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- New columns: tools[], allergens[], dietary_flags[], tags[], ai_tags[], search_vector
-- New indexes: GIN indexes on all array columns + full-text search
-- ============================================================================

-- ============================================================================
-- RECIPE LIBRARY: Flexible Schema Migration
-- ============================================================================
-- This migration adds normalized tables for ingredients, steps, and tools
-- with JSONB columns for arbitrary/source-specific data.
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. DROP LEGACY COLUMNS FROM RECIPES TABLE (data is test only)
-- ============================================================================

-- First drop the dependent view
DROP VIEW IF EXISTS expanded_recipes CASCADE;

-- Drop the old JSON array columns (replaced by normalized tables)
ALTER TABLE recipes DROP COLUMN IF EXISTS ingredients;
ALTER TABLE recipes DROP COLUMN IF EXISTS instructions;

-- ============================================================================
-- 2. ADD NEW COLUMNS TO EXISTING RECIPES TABLE
-- ============================================================================

-- JSONB column for flexible extra data (nutrition, pairings, tips, etc.)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}';

-- Proper INTERVAL columns for time handling (optional, we keep the TEXT columns too)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cooking_time INTERVAL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS preparation_time INTERVAL;

-- Verified flag for AI fact-checking
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 2. CREATE NORMALIZED INGREDIENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                    -- e.g., "flour"
    quantity NUMERIC,                       -- e.g., 2.5
    unit TEXT,                              -- e.g., "cups"
    group_name TEXT,                        -- For grouping: "main", "sauce", "garnish"
    notes TEXT,                             -- e.g., "organic preferred"
    order_index INTEGER DEFAULT 0,          -- For sequencing within groups
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient recipe ingredient lookups
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_name ON recipe_ingredients(name);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_group ON recipe_ingredients(group_name);

-- ============================================================================
-- 3. CREATE NORMALIZED STEPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipe_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,           -- 1, 2, 3, ...
    description TEXT NOT NULL,              -- The instruction text
    extra JSONB DEFAULT '{}',               -- e.g., {"tips": "Stir constantly", "time": "5 minutes"}
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient recipe step lookups
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);

-- ============================================================================
-- 4. CREATE OPTIONAL TOOLS/EQUIPMENT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipe_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                     -- e.g., "blender"
    notes TEXT,                             -- e.g., "high-speed recommended"
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient recipe tools lookups
CREATE INDEX IF NOT EXISTS idx_recipe_tools_recipe_id ON recipe_tools(recipe_id);

-- ============================================================================
-- 5. ADD INDEXES FOR MAIN RECIPES TABLE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);

-- ============================================================================
-- 6. CREATE UPDATED_AT TRIGGER FUNCTION (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to recipes table (if not already applied)
DROP TRIGGER IF EXISTS update_recipes_timestamp ON recipes;
CREATE TRIGGER update_recipes_timestamp
BEFORE UPDATE ON recipes
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tools ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own recipe's data
CREATE POLICY "Users can view their recipe ingredients" ON recipe_ingredients
    FOR SELECT USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their recipe ingredients" ON recipe_ingredients
    FOR INSERT WITH CHECK (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their recipe ingredients" ON recipe_ingredients
    FOR UPDATE USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their recipe ingredients" ON recipe_ingredients
    FOR DELETE USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

-- Steps policies
CREATE POLICY "Users can view their recipe steps" ON recipe_steps
    FOR SELECT USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their recipe steps" ON recipe_steps
    FOR INSERT WITH CHECK (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their recipe steps" ON recipe_steps
    FOR UPDATE USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their recipe steps" ON recipe_steps
    FOR DELETE USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

-- Tools policies
CREATE POLICY "Users can view their recipe tools" ON recipe_tools
    FOR SELECT USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their recipe tools" ON recipe_tools
    FOR INSERT WITH CHECK (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their recipe tools" ON recipe_tools
    FOR UPDATE USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their recipe tools" ON recipe_tools
    FOR DELETE USING (
        recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
    );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- New tables: recipe_ingredients, recipe_steps, recipe_tools
-- New columns on recipes: extra_data, cooking_time, preparation_time, verified
-- ============================================================================

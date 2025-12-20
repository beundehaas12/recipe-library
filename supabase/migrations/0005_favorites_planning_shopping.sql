-- ============================================================================
-- MIGRATION: 0005_favorites_planning_shopping.sql
-- Description: Adds tables for Favorites, Meal Planning, and Shopping List
-- ============================================================================

-- 1. FAVORITES TABLE
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, recipe_id)
);

-- Enable RLS for favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites" ON favorites
    FOR ALL USING (auth.uid() = user_id);

-- 2. MEAL PLANS TABLE
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner');

CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type meal_type NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for meal_plans
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own meal plans" ON meal_plans
    FOR ALL USING (auth.uid() = user_id);

-- 3. SHOPPING LIST TABLE
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    amount NUMERIC,
    unit TEXT,
    is_checked BOOLEAN DEFAULT FALSE,
    source_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    category TEXT, -- e.g., 'produce', 'dairy', etc. (optional for now)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for shopping_list_items
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own shopping list" ON shopping_list_items
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX idx_shopping_list_user_id ON shopping_list_items(user_id);

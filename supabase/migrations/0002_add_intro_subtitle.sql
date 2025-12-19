-- Add introduction and subtitle columns to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS introduction TEXT;

-- Update trigger function to include these fields in search vector if needed
-- (Optional, can be done later for search enhancements)

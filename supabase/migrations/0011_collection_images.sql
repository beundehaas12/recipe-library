-- Add image_url and color to collections
ALTER TABLE collections 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'blue'; -- Default color theme

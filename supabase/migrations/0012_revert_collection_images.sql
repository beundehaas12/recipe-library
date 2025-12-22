-- Revert 3D book columns
ALTER TABLE collections 
DROP COLUMN IF EXISTS image_url,
DROP COLUMN IF EXISTS color;

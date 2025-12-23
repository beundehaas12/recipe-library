-- Add new columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_name text;

-- Migrate existing data
-- Logic:
-- 1. If contains space, First = part before first space, Last = everything after.
-- 2. If no space, First = display_name, Last = empty.
UPDATE user_profiles
SET
    first_name = CASE
        WHEN strpos(display_name, ' ') > 0 THEN split_part(display_name, ' ', 1)
        ELSE display_name
    END,
    last_name = CASE
        WHEN strpos(display_name, ' ') > 0 THEN substring(display_name from strpos(display_name, ' ') + 1)
        ELSE ''
    END
WHERE display_name IS NOT NULL;

-- Remove the old column
ALTER TABLE user_profiles DROP COLUMN IF EXISTS display_name;

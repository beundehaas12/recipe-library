-- Add passive_time column for wait/cool/rest times
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS passive_time TEXT;

-- Add comment for documentation
COMMENT ON COLUMN recipes.passive_time IS 'Passive time (waiting, cooling, resting) separate from active prep/cook time';

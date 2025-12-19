-- Add updated_at column and trigger to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create extension if not exists (usually available by default)
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE TRIGGER handle_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime(updated_at);

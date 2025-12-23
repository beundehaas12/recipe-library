-- ============================================================================
-- FIX: Add missing update_timestamp function
-- ============================================================================
-- The function 'update_timestamp' is referenced in triggers for user_profiles
-- and author_profiles but was missing from previous migrations.
-- This causes "Database error" when trying to insert/update these tables.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execution to authenticated users just in case
GRANT EXECUTE ON FUNCTION update_timestamp() TO authenticated;
GRANT EXECUTE ON FUNCTION update_timestamp() TO service_role;

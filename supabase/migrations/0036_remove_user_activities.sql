-- ============================================================================
-- MIGRATION: 0036_remove_user_activities.sql
-- Description: Removes the unused user_activities table
-- ============================================================================

-- Remove from Realtime publication (ignore error if not in publication)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_activities;
EXCEPTION
    WHEN undefined_object THEN NULL;
    WHEN undefined_table THEN NULL;
END $$;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view their own activities" ON public.user_activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.user_activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.user_activities;

-- Drop the table
DROP TABLE IF EXISTS public.user_activities;

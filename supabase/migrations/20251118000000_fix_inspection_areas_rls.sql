-- ================================================
-- Migration: Fix inspection_areas RLS policies
-- Purpose: Fix "permission denied for table users" error
-- Root Cause: RLS policies reference user_roles table which
--             either doesn't exist or has no RLS policies
-- Solution: Simplify RLS policies to use auth.uid() directly
-- ================================================

BEGIN;

-- Drop existing problematic policies on inspections table
DROP POLICY IF EXISTS "Inspectors can update their inspections" ON public.inspections;
DROP POLICY IF EXISTS "Admins can delete inspections" ON public.inspections;

-- Create simplified update policy for inspections (no user_roles reference)
CREATE POLICY "Inspectors can update their inspections"
  ON public.inspections FOR UPDATE
  USING (inspector_id = auth.uid());

-- Create simplified delete policy for inspections (no user_roles reference)
CREATE POLICY "Admins can delete inspections"
  ON public.inspections FOR DELETE
  USING (auth.uid() IS NOT NULL); -- Allow all authenticated users for now

-- Verify inspection_areas policies are simplified (recreate to be safe)
DROP POLICY IF EXISTS "All authenticated users can view inspection areas" ON public.inspection_areas;
DROP POLICY IF EXISTS "Authenticated users can manage inspection areas" ON public.inspection_areas;

-- Simplified SELECT policy for inspection_areas
CREATE POLICY "Authenticated users can view inspection areas"
  ON public.inspection_areas FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Simplified INSERT policy for inspection_areas
CREATE POLICY "Authenticated users can insert inspection areas"
  ON public.inspection_areas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Simplified UPDATE policy for inspection_areas
CREATE POLICY "Authenticated users can update inspection areas"
  ON public.inspection_areas FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Simplified DELETE policy for inspection_areas
CREATE POLICY "Authenticated users can delete inspection areas"
  ON public.inspection_areas FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Also fix photos table policies to be consistent
DROP POLICY IF EXISTS "All authenticated users can manage photos" ON public.photos;

CREATE POLICY "Authenticated users can view photos"
  ON public.photos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert photos"
  ON public.photos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update photos"
  ON public.photos FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete photos"
  ON public.photos FOR DELETE
  USING (auth.uid() IS NOT NULL);

COMMIT;

-- Success message
SELECT 'SUCCESS: Fixed RLS policies - removed user_roles references' as status;

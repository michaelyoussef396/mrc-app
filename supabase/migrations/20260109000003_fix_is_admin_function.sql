-- Migration: Fix is_admin() function after dropping users table
-- Date: 2026-01-09
-- Issue: is_admin() was querying dropped public.users table, causing RLS failures
-- Fix: Update to query user_roles table instead

-- =============================================================================
-- PROBLEM
-- =============================================================================
-- The is_admin() function (no parameter) was querying public.users:
--   SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
--
-- After dropping the users table, this caused ALL RLS policies depending on
-- is_admin() to fail with 404 errors, breaking:
-- - leads table access
-- - activities table access
-- - equipment table access
-- - invoices table access
-- - and 14+ other policies

-- =============================================================================
-- SOLUTION
-- =============================================================================
-- Update is_admin() to query user_roles table (same as is_admin(uuid) version)

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$function$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After applying this migration:
-- 1. Login should work
-- 2. Dashboard should load with data
-- 3. All leads queries should return 200 (not 404)
-- 4. is_admin() should return TRUE for admin@mrc.com.au

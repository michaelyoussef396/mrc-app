-- Migration: Drop Legacy Users Table
-- Date: 2026-01-09
-- Description: Removes the unused 'users' table which is a security risk
--              The app uses auth.users (Supabase Auth) + profiles table instead
--              This table has a password_hash column which should never exist
--              when using Supabase Auth

-- =============================================================================
-- SAFETY CHECK: Verify table is not referenced by foreign keys
-- =============================================================================
-- This table has NO foreign key references from other tables
-- It has NO active usage in frontend code (ManageUsers.tsx uses mock data)

-- =============================================================================
-- DROP TABLE
-- =============================================================================
DROP TABLE IF EXISTS public.users;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After applying this migration, verify:
-- 1. The 'users' table no longer exists
-- 2. The application still functions (uses profiles + user_roles + auth.users)
-- 3. ManageUsers.tsx still works (uses mock data, will be refactored to use Edge Function)

-- Expected result: Table dropped, no errors, no broken dependencies

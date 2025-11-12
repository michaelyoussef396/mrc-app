-- ============================================================================
-- Migration: Add Admin Role to admin@mrc.com.au User
-- Date: 2025-11-12
-- Issue: Admin user missing entry in user_roles table, causing is_admin() to return false
-- ============================================================================

-- PROBLEM ANALYSIS:
-- ================
-- Current RLS policies on leads table require is_admin(auth.uid()) = true for INSERT
-- The is_admin() function checks: SELECT EXISTS FROM user_roles WHERE user_id = _user_id AND role = 'admin'
-- admin@mrc.com.au has NO entry in user_roles table
-- Therefore: is_admin() returns FALSE → RLS blocks INSERT → Lead creation fails
--
-- ROOT CAUSE: Missing admin role assignment in user_roles table
--
-- FIX: Insert admin role for admin@mrc.com.au user

-- ============================================================================
-- SOLUTION: Insert Admin Role
-- ============================================================================

-- Insert admin role for admin@mrc.com.au
-- Uses ON CONFLICT to make migration idempotent (safe to run multiple times)
-- CORRECTED: Cast to app_role enum type (not text)
INSERT INTO public.user_roles (user_id, role)
SELECT
  id,
  'admin'::app_role
FROM auth.users
WHERE email = 'admin@mrc.com.au'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify admin role was inserted
SELECT
  ur.user_id,
  ur.role,
  au.email,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email = 'admin@mrc.com.au';

-- Test is_admin() function
SELECT
  au.email,
  au.id as user_id,
  is_admin(au.id) as is_admin_result
FROM auth.users au
WHERE au.email = 'admin@mrc.com.au';

-- Expected results:
-- 1. user_roles table should have entry: (user_id, 'admin')
-- 2. is_admin(user_id) should return TRUE

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DELETE FROM public.user_roles
-- WHERE user_id IN (
--   SELECT id FROM auth.users WHERE email = 'admin@mrc.com.au'
-- )
-- AND role = 'admin';

-- ============================================================================
-- POST-FIX TESTING CHECKLIST
-- ============================================================================
-- After applying this migration:
--
-- 1. Database Tests (run these SQL queries):
--    □ Verify admin role exists in user_roles
--    □ Test is_admin() returns true
--    □ Check RLS policies allow INSERT
--
-- 2. Browser Tests:
--    □ Refresh http://localhost:8081
--    □ Click "+ New Lead" button
--    □ Select "HiPages Lead"
--    □ Fill form:
--      - Suburb: Melbourne
--      - Postcode: 3000
--      - Phone: 0412345678
--      - Email: test@example.com
--    □ Click "Create HiPages Lead"
--    □ Verify success toast appears
--    □ Check leads table has new record
--    □ Repeat for "Normal Lead"
--
-- ============================================================================
-- SECURITY IMPLICATIONS
-- ============================================================================
--
-- This migration grants admin privileges to admin@mrc.com.au user.
--
-- With admin role, the user can:
-- - INSERT leads (both 'hipages' and 'website' lead_source)
-- - SELECT all leads (via admins_manage_all_leads policy)
-- - UPDATE all leads (via admins_manage_all_leads policy)
-- - DELETE leads (via admins_delete_leads policy)
--
-- This is CORRECT and EXPECTED behavior for the admin user.
--
-- The RLS policies are properly configured:
-- - Technicians can only see/update their assigned leads
-- - Public can only INSERT with lead_source='website'
-- - Admins have full access (appropriate for business operations)
--
-- No security vulnerabilities introduced.
--
-- ============================================================================

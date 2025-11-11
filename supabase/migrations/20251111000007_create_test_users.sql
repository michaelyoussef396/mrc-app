-- Migration: Create test users for RLS testing
-- Phase: 2C - CRITICAL FOR TESTING
-- Priority: P0
-- Created: 2025-11-11
-- Description: Create test users (clayton@mrc.com.au, glen@mrc.com.au)
--              Required for: Testing RLS policies, demo, development
--              NOTE: This creates users via SQL insert into auth.users

-- =============================================================================
-- IMPORTANT: User Creation via Supabase Dashboard
-- =============================================================================
-- This migration provides the SQL for reference, but user creation
-- MUST be done via Supabase Dashboard > Authentication > Add User
-- OR via Supabase Auth API (not raw SQL inserts)
--
-- Reason: Supabase Auth handles password hashing, email confirmation,
-- JWT generation, and other security features that raw SQL doesn't provide.
--
-- =============================================================================

-- Instructions for creating test users via Supabase Dashboard:
--
-- 1. Open Supabase Dashboard:
--    https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym
--
-- 2. Navigate to Authentication > Users (left sidebar)
--
-- 3. Click "Add User" button
--
-- 4. Create Clayton (Technician):
--    - Email: clayton@mrc.com.au
--    - Password: Clayton2024!
--    - Auto Confirm User: YES (check the box)
--    - User Metadata (JSON):
--      {
--        "role": "technician",
--        "display_name": "Clayton",
--        "phone": "0412 345 678"
--      }
--
-- 5. Click "Create User"
--
-- 6. Create Glen (Technician):
--    - Email: glen@mrc.com.au
--    - Password: Glen2024!
--    - Auto Confirm User: YES (check the box)
--    - User Metadata (JSON):
--      {
--        "role": "technician",
--        "display_name": "Glen",
--        "phone": "0423 456 789"
--      }
--
-- 7. Click "Create User"

-- =============================================================================
-- Alternative: Create users via Supabase Auth API (recommended for automation)
-- =============================================================================
-- Use this curl command or equivalent HTTP request:

/*
# Create Clayton
curl -X POST 'https://ecyivrxjpsmjmexqatym.supabase.co/auth/v1/admin/users' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "clayton@mrc.com.au",
    "password": "Clayton2024!",
    "email_confirm": true,
    "user_metadata": {
      "role": "technician",
      "display_name": "Clayton",
      "phone": "0412 345 678"
    }
  }'

# Create Glen
curl -X POST 'https://ecyivrxjpsmjmexqatym.supabase.co/auth/v1/admin/users' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "glen@mrc.com.au",
    "password": "Glen2024!",
    "email_confirm": true,
    "user_metadata": {
      "role": "technician",
      "display_name": "Glen",
      "phone": "0423 456 789"
    }
  }'
*/

-- =============================================================================
-- Verification Queries (run after creating users via dashboard)
-- =============================================================================

-- Check if test users exist
-- SELECT
--   id,
--   email,
--   raw_user_meta_data->>'role' as role,
--   raw_user_meta_data->>'display_name' as display_name,
--   email_confirmed_at IS NOT NULL as email_confirmed,
--   created_at
-- FROM auth.users
-- WHERE email IN ('clayton@mrc.com.au', 'glen@mrc.com.au', 'admin@mrc.com.au')
-- ORDER BY email;

-- Expected result:
-- admin@mrc.com.au    (role: admin)
-- clayton@mrc.com.au  (role: technician)
-- glen@mrc.com.au     (role: technician)

-- =============================================================================
-- Assign test leads for RLS testing
-- =============================================================================
-- After creating users, assign some leads to Clayton and Glen for testing

-- Get Clayton's UUID
-- SELECT id, email FROM auth.users WHERE email = 'clayton@mrc.com.au';

-- Get Glen's UUID
-- SELECT id, email FROM auth.users WHERE email = 'glen@mrc.com.au';

-- Assign leads to Clayton (replace 'clayton-uuid' with actual UUID)
-- UPDATE leads
-- SET assigned_to = 'clayton-uuid'
-- WHERE id IN (
--   SELECT id FROM leads ORDER BY created_at DESC LIMIT 3
-- );

-- Assign leads to Glen (replace 'glen-uuid' with actual UUID)
-- UPDATE leads
-- SET assigned_to = 'glen-uuid'
-- WHERE id IN (
--   SELECT id FROM leads
--   WHERE assigned_to IS NULL
--   ORDER BY created_at DESC LIMIT 2
-- );

-- =============================================================================
-- RLS Policy Testing Script
-- =============================================================================
-- After creating users, test RLS policies by impersonating each user

-- Test as Clayton (technician) - should only see assigned leads
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "clayton-uuid", "email": "clayton@mrc.com.au", "role": "authenticated"}';
-- SELECT COUNT(*) as clayton_leads FROM leads;
-- RESET ROLE;

-- Test as Glen (technician) - should only see assigned leads
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "glen-uuid", "email": "glen@mrc.com.au", "role": "authenticated"}';
-- SELECT COUNT(*) as glen_leads FROM leads;
-- RESET ROLE;

-- Test as Admin - should see ALL leads
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "admin-uuid", "email": "admin@mrc.com.au", "role": "authenticated"}';
-- SELECT COUNT(*) as admin_leads FROM leads;
-- RESET ROLE;

-- =============================================================================
-- Success Criteria for Phase 2C
-- =============================================================================
-- ✅ 3 users exist: admin@mrc.com.au, clayton@mrc.com.au, glen@mrc.com.au
-- ✅ Clayton has role: technician
-- ✅ Glen has role: technician
-- ✅ Admin has role: admin
-- ✅ All emails confirmed
-- ✅ Clayton can login with Clayton2024!
-- ✅ Glen can login with Glen2024!
-- ✅ Clayton sees only assigned leads (RLS working)
-- ✅ Glen sees only assigned leads (RLS working)
-- ✅ Admin sees all leads (RLS working)

-- =============================================================================
-- Next Steps After Phase 2C
-- =============================================================================
-- 1. Test RLS policies via Supabase dashboard (switch users)
-- 2. Verify technicians see only assigned data
-- 3. Proceed to Phase 2D: Create missing tables (email_logs, sms_logs, offline_queue)

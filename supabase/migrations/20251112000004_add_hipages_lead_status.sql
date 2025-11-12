-- ============================================================================
-- Migration: Add 'hipages_lead' Status to lead_status Enum
-- Date: 2025-11-12
-- Issue: HiPages leads can't be filtered/categorized separately
-- ============================================================================

-- PROBLEM:
-- ========
-- The lead_status enum doesn't include 'hipages_lead'
-- All HiPages leads currently use 'new_lead' status (incorrect)
-- Frontend expects 'hipages_lead' to display in separate pipeline column
--
-- SOLUTION:
-- =========
-- Add 'hipages_lead' to lead_status enum as the FIRST value
-- This will allow HiPages leads to be categorized separately from normal leads

-- ============================================================================
-- ADD NEW ENUM VALUE
-- ============================================================================

-- Add 'hipages_lead' status to the enum
-- BEFORE 'new_lead' so it appears first in pipeline
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'hipages_lead' BEFORE 'new_lead';

-- ============================================================================
-- UPDATE EXISTING HIPAGES LEADS
-- ============================================================================

-- Update existing HiPages leads to use correct status
UPDATE public.leads
SET status = 'hipages_lead'
WHERE lead_source = 'hipages'
  AND status = 'new_lead';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check enum now includes 'hipages_lead'
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lead_status')
ORDER BY enumsortorder;

-- Verify HiPages leads now have correct status
SELECT
  lead_number,
  status,
  lead_source,
  property_address_suburb,
  created_at
FROM public.leads
WHERE lead_source = 'hipages'
ORDER BY created_at DESC
LIMIT 5;

-- Expected results:
-- 1. Enum includes 'hipages_lead' BEFORE 'new_lead'
-- 2. All HiPages leads have status = 'hipages_lead'

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- NOTE: PostgreSQL does NOT support removing enum values directly
-- If rollback needed, you must:
-- 1. Update all leads with status='hipages_lead' back to 'new_lead'
-- 2. Create new enum without 'hipages_lead'
-- 3. Alter column to use new enum
-- 4. Drop old enum
--
-- Rollback SQL (use with caution):
-- UPDATE public.leads SET status = 'new_lead' WHERE status = 'hipages_lead';
-- (Then manually recreate enum - complex operation)

-- ============================================================================
-- POST-FIX TESTING CHECKLIST
-- ============================================================================
-- After applying this migration:
--
-- 1. Database Tests (SQL Editor):
--    □ Verify enum includes 'hipages_lead':
--      SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lead_status');
--    □ Verify existing HiPages leads updated:
--      SELECT COUNT(*) FROM leads WHERE lead_source = 'hipages' AND status = 'hipages_lead';
--
-- 2. Frontend Tests:
--    □ Create new HiPages lead
--    □ Verify appears in "HIPAGES LEAD" column (not "New Lead")
--    □ Verify can navigate to lead detail page
--
-- ============================================================================


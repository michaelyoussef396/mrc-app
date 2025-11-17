-- ============================================================================
-- QUICK FIX: Add 'hipages_lead' Status + Update Existing Leads
-- Run this in Supabase Dashboard SQL Editor
-- IMPORTANT: Run in TWO separate queries (copy/paste each separately)
-- ============================================================================

-- ============================================================================
-- QUERY 1: Add 'hipages_lead' to enum
-- Copy and run this FIRST, then wait for it to complete
-- ============================================================================

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'hipages_lead' BEFORE 'new_lead';

-- After this completes, wait 2-3 seconds, then run QUERY 2 below


-- ============================================================================
-- QUERY 2: Update existing leads and verify
-- Copy and run this SECOND (after QUERY 1 completes)
-- ============================================================================

-- Update existing HiPages leads to use correct status
UPDATE public.leads
SET status = 'hipages_lead'
WHERE lead_source = 'hipages'
  AND status = 'new_lead';

-- Verify enum includes 'hipages_lead'
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

-- Expected Results:
-- ✅ Enum shows 'hipages_lead' as first value
-- ✅ All HiPages leads have status = 'hipages_lead'

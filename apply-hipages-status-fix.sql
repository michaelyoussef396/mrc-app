-- ============================================================================
-- QUICK FIX: Add 'hipages_lead' Status + Update Existing Leads
-- Run this in Supabase Dashboard SQL Editor
-- ============================================================================

-- Step 1: Add 'hipages_lead' to enum (BEFORE 'new_lead')
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'hipages_lead' BEFORE 'new_lead';

-- Step 2: Update existing HiPages leads to use correct status
UPDATE public.leads
SET status = 'hipages_lead'
WHERE lead_source = 'hipages'
  AND status = 'new_lead';

-- Step 3: Verify enum includes 'hipages_lead'
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lead_status')
ORDER BY enumsortorder;

-- Step 4: Verify HiPages leads now have correct status
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

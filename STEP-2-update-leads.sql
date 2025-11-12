-- ============================================================================
-- STEP 2: Update existing leads and verify
-- Run this ONLY after STEP-1 completes successfully
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
-- ✅ UPDATE should affect 3-4 rows
-- ✅ First SELECT shows 'hipages_lead' as first enum value
-- ✅ Second SELECT shows all HiPages leads with status='hipages_lead'

-- ============================================================================
-- STEP 1: Add 'hipages_lead' to enum
-- Run ONLY this file first, then run STEP-2 separately
-- ============================================================================

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'hipages_lead' BEFORE 'new_lead';

-- After running this, you should see: "Success. No rows returned"
-- Then CLOSE this query tab and open a NEW query tab for STEP-2

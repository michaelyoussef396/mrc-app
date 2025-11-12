-- Migration: Add 'hipages_lead' status to lead_status enum
-- Date: 2025-11-12
-- Purpose: Support dual-path lead creation (HiPages quick entry vs Normal full entry)

-- ============================================================================
-- PROBLEM: lead_status enum missing 'hipages_lead' value
-- ============================================================================
-- The spec requires a 'hipages_lead' status for quick HiPages entries
-- that only capture minimal info (suburb, postcode, phone, email)
-- ============================================================================

-- Add the new enum value at the beginning of the status pipeline
-- Note: PostgreSQL doesn't support IF NOT EXISTS before version 12.5,
-- so we use a DO block to safely add the value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'hipages_lead'
    AND enumtypid = 'lead_status'::regtype
  ) THEN
    -- Insert 'hipages_lead' before 'new_lead' in the enum
    ALTER TYPE lead_status ADD VALUE 'hipages_lead' BEFORE 'new_lead';
  END IF;
END$$;

-- Add documentation comment
COMMENT ON TYPE lead_status IS
'Lead pipeline status tracking.

Status Flow:
1. hipages_lead → Quick entry from HiPages with minimal info (suburb, postcode, phone, email)
2. new_lead → Full lead entry with complete property details
3. contacted → Initial contact made with customer
4. inspection_waiting → Inspection scheduled, waiting for appointment
5. inspection_completed → Inspection completed, awaiting report
6. inspection_report_pdf_completed → Report generated and ready
7. job_waiting → Job approved, waiting for scheduling
8. job_completed → Job work completed
9. job_report_pdf_sent → Final job report sent to customer
10. invoicing_sent → Invoice sent to customer
11. paid → Payment received
12. google_review → Google review requested
13. finished → Lead fully completed and closed

HiPages Lead Path:
- Start: hipages_lead (minimal info: suburb, postcode, phone, email)
- Next: Upgrade to new_lead when full details are collected
- Then: Follow normal pipeline (contacted → inspection_waiting → ...)

Normal Lead Path:
- Start: new_lead (full info: name, address, urgency, issue_description)
- Then: Follow normal pipeline (contacted → inspection_waiting → ...)';

-- ============================================================================
-- VERIFICATION QUERY (run after migration):
-- ============================================================================
-- SELECT enumlabel, enumsortorder
-- FROM pg_enum
-- WHERE enumtypid = 'lead_status'::regtype
-- ORDER BY enumsortorder;
--
-- Expected output should include 'hipages_lead' as first status
-- ============================================================================

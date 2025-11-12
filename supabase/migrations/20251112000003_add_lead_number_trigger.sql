-- ============================================================================
-- Migration: Add Trigger to Auto-Generate lead_number
-- Date: 2025-11-12
-- Issue: Leads created without lead_number (showing NULL)
-- ============================================================================

-- PROBLEM:
-- ========
-- The generate_lead_number() function exists but is never called automatically.
-- When creating leads via NewLeadDialog (HiPages or Normal), the lead_number is NULL.
-- This causes leads to not display properly in Leads Management page.
--
-- SOLUTION:
-- =========
-- Create a BEFORE INSERT trigger that auto-generates lead_number for new leads
-- if lead_number is not provided (NULL).

-- ============================================================================
-- CREATE TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_generate_lead_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate lead_number if it's NULL (not provided)
  IF NEW.lead_number IS NULL THEN
    NEW.lead_number := public.generate_lead_number();
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- CREATE TRIGGER ON leads TABLE
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_auto_generate_lead_number ON public.leads;

CREATE TRIGGER trigger_auto_generate_lead_number
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_lead_number();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the trigger by inserting a lead without lead_number
-- (This is a dry run - commented out)
-- INSERT INTO public.leads (
--   full_name, email, phone,
--   property_address_street, property_address_suburb, property_address_postcode, property_address_state,
--   lead_source, status
-- )
-- VALUES (
--   'Test User', 'test@example.com', '0400000000',
--   'Test St', 'Melbourne', '3000', 'VIC',
--   'website', 'new_lead'
-- )
-- RETURNING id, lead_number;

-- Expected result: lead_number should be auto-generated (e.g., 'MRC-2025-0001')

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP TRIGGER IF EXISTS trigger_auto_generate_lead_number ON public.leads;
-- DROP FUNCTION IF EXISTS public.auto_generate_lead_number();

-- ============================================================================
-- POST-FIX TESTING CHECKLIST
-- ============================================================================
-- After applying this migration:
--
-- 1. Database Test (SQL Editor):
--    □ Verify trigger exists:
--      SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.leads'::regclass AND tgname = 'trigger_auto_generate_lead_number';
--    □ Expected: One row with tgname = 'trigger_auto_generate_lead_number'
--
-- 2. Browser Test:
--    □ Refresh http://localhost:8081
--    □ Click "+ New Lead"
--    □ Select "HiPages Lead"
--    □ Fill form and submit
--    □ Success toast should show: "Reference: MRC-2025-XXXX" (not "Pending")
--    □ Check Leads Management page - lead should appear with ref number
--
-- 3. Verify Existing Leads (SQL Editor):
--    Update existing leads that have NULL lead_number:
--    UPDATE public.leads
--    SET lead_number = public.generate_lead_number()
--    WHERE lead_number IS NULL;
--
-- ============================================================================


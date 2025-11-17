-- ============================================================================
-- QUICK FIX: Add Lead Number Trigger + Update Existing Leads
-- Run this in Supabase Dashboard SQL Editor
-- ============================================================================

-- Step 1: Create trigger function to auto-generate lead_number
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

-- Step 2: Create trigger on leads table
DROP TRIGGER IF EXISTS trigger_auto_generate_lead_number ON public.leads;

CREATE TRIGGER trigger_auto_generate_lead_number
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_lead_number();

-- Step 3: Fix existing leads with NULL lead_number
UPDATE public.leads
SET lead_number = public.generate_lead_number()
WHERE lead_number IS NULL;

-- Step 4: Verify all leads now have lead_number
SELECT
  id,
  lead_number,
  lead_source,
  property_address_suburb,
  property_address_postcode,
  phone,
  email,
  status,
  created_at
FROM public.leads
ORDER BY created_at DESC
LIMIT 5;

-- Expected result: All leads should have lead_number (e.g., 'MRC-2025-0001')

-- Flag two hand-typed labour figures as deliberate overrides.
--
-- WHY: the report preview's cost editor wrote hand-typed labour/equipment figures without
-- ever setting manual_labour_override, so a typed quote is indistinguishable from a stale
-- auto-calc snapshot. The Part A fix makes the editor open on the current auto-calc and
-- keep only values the flag marks as overrides — so without this statement these two rows
-- would silently recompute and stop matching the quote the customer already received.
--
-- Confirmed deliberate by Michael, 2026-08-26. Both rows were already emailed:
--   INS-2026-0008 -> victoria@absolutepm.com.au, sent 2026-08-26 19:59 AEST
--   INS-2026-0011 -> sean.abass@gmail.com,       sent 2026-08-26 20:12 AEST
--
-- NOT a migration. NOT part of the Part A PR. Apply by hand in Supabase Studio against
-- PROD (ecyivrxjpsmjmexqatym) BEFORE the Part A fix ships.
--
-- NOTE: INS-2026-0011's 559.23 sits BELOW the $615.27 two-hour minimum, which the pricing
-- engine cannot produce. Setting this flag locks it in permanently as an intentional
-- below-minimum discount.

UPDATE public.inspections
SET manual_labour_override = true
WHERE id IN (
  '1d3b5959-2d09-4bca-bcb4-f08ef96a82ba',  -- INS-2026-0008, labour 698.00 (auto 667.78)
  '773e8a85-c5ac-4d44-ad0d-604224787cda'   -- INS-2026-0011, labour 559.23 (auto 615.27)
)
  AND manual_labour_override = false;      -- re-runnable; no-op once applied

-- Expected result: UPDATE 2

-- Verification — both rows must read manual_labour_override = true, labour unchanged:
-- SELECT job_number, labour_cost_ex_gst, manual_labour_override
-- FROM public.inspections
-- WHERE id IN ('1d3b5959-2d09-4bca-bcb4-f08ef96a82ba',
--              '773e8a85-c5ac-4d44-ad0d-604224787cda');

-- Waste disposal cubic-metre pricing (Brief 1 foundation).
-- Additive + nullable. Leaves legacy waste_disposal_amount/cost/required untouched.
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS waste_disposal_m3              NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS waste_disposal_calculated_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS waste_disposal_confirmed_cost  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS waste_disposal_is_overridden   BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.inspections.waste_disposal_m3 IS 'Cubic metres of waste disposal bin.';
COMMENT ON COLUMN public.inspections.waste_disposal_confirmed_cost IS
  'Ex GST. Confirmed by admin/tech. Feeds cost estimate subtotal.';

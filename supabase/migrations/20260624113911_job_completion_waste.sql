-- Job-completion waste-disposal tracking (Brief 2 — DEFERRED, NOT YET WIRED).
-- Adds quoted (snapshot from inspection) + actual (tech-entered) waste columns to
-- job_completions, mirroring the existing equipment quoted/actual pattern.
-- Additive + nullable. Apply only when Section 7 waste wiring is built.
ALTER TABLE public.job_completions
  ADD COLUMN IF NOT EXISTS quoted_waste_disposal_m3        NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS quoted_waste_disposal_cost      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_waste_disposal_m3        NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS actual_waste_disposal_cost      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_waste_disposal_is_overridden BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.job_completions.quoted_waste_disposal_cost IS
  'Ex GST. Snapshot of the inspection''s confirmed waste disposal cost at job start.';
COMMENT ON COLUMN public.job_completions.actual_waste_disposal_cost IS
  'Ex GST. Actual waste disposal cost recorded on the job (confirm/override flow).';

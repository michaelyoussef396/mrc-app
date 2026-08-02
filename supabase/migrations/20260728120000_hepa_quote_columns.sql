-- HEPA Air Scrubber quoting (inspection) + quoted snapshot (job completion).
-- Single concern: additive nullable INTEGER columns only. No data changes, no RLS
-- changes (both tables already carry RLS; new columns inherit existing policies).
--
-- NULL semantics: NULL = never quoted (legacy rows) — deliberately distinct from a
-- quoted 0. Days NULL = defaults to the shared equipment days
-- (max(1, ceil(totalLabourHours / 8)), see calculateEquipmentCost in
-- src/lib/calculations/pricing.ts).
--
-- Naming: job_completions keeps the legacy afd_* stem so quoted_afd_* pairs with the
-- live actual_afd_* columns. The full afd -> hepa_air_scrubber rename is parked in
-- 20260624150100_rename_job_completions_afd_columns.sql.PENDING and would rename all
-- of them together. inspections columns are new, so they use the current name.
--
-- Rollback (do NOT run unless reverting this migration):
--   ALTER TABLE public.inspections
--     DROP COLUMN IF EXISTS hepa_air_scrubber_qty,
--     DROP COLUMN IF EXISTS hepa_air_scrubber_days;
--   ALTER TABLE public.job_completions
--     DROP COLUMN IF EXISTS quoted_afd_qty,
--     DROP COLUMN IF EXISTS quoted_afd_days;

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS hepa_air_scrubber_qty  INTEGER,
  ADD COLUMN IF NOT EXISTS hepa_air_scrubber_days INTEGER;

COMMENT ON COLUMN public.inspections.hepa_air_scrubber_qty IS
  'Quoted HEPA Air Scrubber units ($100/unit/day, EQUIPMENT_RATES.hepaAirScrubber). NULL = not quoted (legacy row).';
COMMENT ON COLUMN public.inspections.hepa_air_scrubber_days IS
  'Quoted HEPA hire days. NULL = defaults to shared equipment days = max(1, ceil(totalLabourHours/8)).';

ALTER TABLE public.job_completions
  ADD COLUMN IF NOT EXISTS quoted_afd_qty  INTEGER,
  ADD COLUMN IF NOT EXISTS quoted_afd_days INTEGER;

COMMENT ON COLUMN public.job_completions.quoted_afd_qty IS
  'Snapshot of inspections.hepa_air_scrubber_qty at job creation. afd = HEPA Air Scrubber (pairs with actual_afd_*).';
COMMENT ON COLUMN public.job_completions.quoted_afd_days IS
  'Snapshot of the resolved HEPA hire days at job creation (explicit inspection days, else inspections.equipment_days).';

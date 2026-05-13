-- Phase 1a / BUG-019: discount_percent scale fix backfill.
--
-- Writer at TechnicianInspectionForm.tsx:3362 was persisting decimal scale
-- (e.g. 0.13 for 13%) into inspections.discount_percent. The CHECK constraint
-- (discount_percent BETWEEN 0 AND 13) accepted these values trivially because
-- they fall under the upper bound, producing silent production drift: customers
-- saw "0.13%" rendered in InspectionDataDisplay.tsx:525-526 instead of "13%".
--
-- This migration:
--   1. Snapshots existing decimal-scale rows to a backup table (30-day retention).
--   2. Multiplies every survivor (discount_percent <= 1) by 100 to convert
--      to percent scale, which matches the canonical convention.
--
-- The writer was simultaneously corrected to multiply *100 at the persistence
-- boundary; the reader at TIF:2779 divides /100. pricing.ts retains decimal
-- scale internally for all in-memory calculations.

CREATE TABLE IF NOT EXISTS inspections_discount_backfill_backup_20260513 AS
  SELECT id, discount_percent, NOW() AS snapshot_at
  FROM inspections WHERE discount_percent IS NOT NULL;

UPDATE inspections SET discount_percent = discount_percent * 100
  WHERE discount_percent IS NOT NULL AND discount_percent <= 1;

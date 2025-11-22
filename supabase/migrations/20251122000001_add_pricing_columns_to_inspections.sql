-- Migration: Add Pricing Columns to Inspections Table
-- Created: 2025-11-22
-- Author: Supabase Specialist Agent
-- Purpose: Add comprehensive pricing tracking to inspections including job type hours,
--          equipment quantities, manual overrides, and calculated pricing values

-- ROLLBACK (keep commented for reference):
-- ALTER TABLE inspections DROP COLUMN IF EXISTS no_demolition_hours;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS demolition_hours;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS construction_hours;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS subfloor_hours;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS dehumidifier_count;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS air_mover_count;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS rcd_count;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS equipment_days;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS manual_price_override;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS manual_total_inc_gst;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS labor_cost_ex_gst;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS discount_percent;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS subtotal_ex_gst;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS gst_amount;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS total_inc_gst;

BEGIN;

-- =====================================================
-- SECTION 1: JOB TYPE HOURS BREAKDOWN
-- =====================================================
-- Track hours for each job type to calculate multi-day discounts
-- Used in pricing calculator to determine if discount tiers apply

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS no_demolition_hours NUMERIC DEFAULT 0
CHECK (no_demolition_hours >= 0);

COMMENT ON COLUMN inspections.no_demolition_hours IS
'Hours allocated to No Demolition job type. Used for multi-day discount calculation.';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS demolition_hours NUMERIC DEFAULT 0
CHECK (demolition_hours >= 0);

COMMENT ON COLUMN inspections.demolition_hours IS
'Hours allocated to Demolition job type. Used for multi-day discount calculation.';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS construction_hours NUMERIC DEFAULT 0
CHECK (construction_hours >= 0);

COMMENT ON COLUMN inspections.construction_hours IS
'Hours allocated to Construction job type. Used for multi-day discount calculation.';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS subfloor_hours NUMERIC DEFAULT 0
CHECK (subfloor_hours >= 0);

COMMENT ON COLUMN inspections.subfloor_hours IS
'Hours allocated to Subfloor job type. Used for multi-day discount calculation.';

-- =====================================================
-- SECTION 2: EQUIPMENT QUANTITIES
-- =====================================================
-- Track equipment counts and rental duration for pricing
-- Equipment rates: Dehumidifier $132/day, Air Mover $46/day, RCD $5/day

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS dehumidifier_count INTEGER DEFAULT 0
CHECK (dehumidifier_count >= 0);

COMMENT ON COLUMN inspections.dehumidifier_count IS
'Number of dehumidifiers required. Rate: $132/day per unit.';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS air_mover_count INTEGER DEFAULT 0
CHECK (air_mover_count >= 0);

COMMENT ON COLUMN inspections.air_mover_count IS
'Number of air movers required. Rate: $46/day per unit.';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS rcd_count INTEGER DEFAULT 0
CHECK (rcd_count >= 0);

COMMENT ON COLUMN inspections.rcd_count IS
'Number of RCD safety boxes required. Rate: $5/day per unit.';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS equipment_days INTEGER DEFAULT 1
CHECK (equipment_days >= 1);

COMMENT ON COLUMN inspections.equipment_days IS
'Number of days equipment will be rented. Minimum 1 day. Used to calculate total equipment cost.';

-- =====================================================
-- SECTION 3: MANUAL OVERRIDE TRACKING
-- =====================================================
-- Allow technicians to override calculated pricing for special cases
-- Tracks when manual override is active and the override amount

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS manual_price_override BOOLEAN DEFAULT false;

COMMENT ON COLUMN inspections.manual_price_override IS
'Indicates if technician manually overrode the calculated price. When true, manual_total_inc_gst is used instead of calculated total.';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS manual_total_inc_gst NUMERIC
CHECK (manual_total_inc_gst IS NULL OR manual_total_inc_gst >= 0);

COMMENT ON COLUMN inspections.manual_total_inc_gst IS
'Manual override total including GST. Only used when manual_price_override is true. Must be non-negative.';

-- =====================================================
-- SECTION 4: CALCULATED PRICING VALUES
-- =====================================================
-- Store calculated pricing components for reference and reporting
-- These values are computed by the pricing calculator and saved for audit trail

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS labor_cost_ex_gst NUMERIC
CHECK (labor_cost_ex_gst IS NULL OR labor_cost_ex_gst >= 0);

COMMENT ON COLUMN inspections.labor_cost_ex_gst IS
'Calculated labor cost excluding GST. Based on total hours × hourly rate ($187.50 ex GST).';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC
CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 13));

COMMENT ON COLUMN inspections.discount_percent IS
'Multi-day discount percentage applied. Range: 0-13%.
0% for ≤8 hours, 7.5% for 9-16 hours, 13% for 17+ hours.
CRITICAL: 13% is absolute maximum cap.';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS subtotal_ex_gst NUMERIC
CHECK (subtotal_ex_gst IS NULL OR subtotal_ex_gst >= 0);

COMMENT ON COLUMN inspections.subtotal_ex_gst IS
'Subtotal excluding GST after discount applied. (Labor + Equipment + Waste Disposal) × (1 - discount).';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS gst_amount NUMERIC
CHECK (gst_amount IS NULL OR gst_amount >= 0);

COMMENT ON COLUMN inspections.gst_amount IS
'GST amount (10% of subtotal_ex_gst). Australian GST is always 10%.';

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS total_inc_gst NUMERIC
CHECK (total_inc_gst IS NULL OR total_inc_gst >= 0);

COMMENT ON COLUMN inspections.total_inc_gst IS
'Final total including GST. This is the amount shown to customer.
If manual_price_override is true, this equals manual_total_inc_gst.';

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
-- Index pricing-related columns that may be queried frequently

CREATE INDEX IF NOT EXISTS idx_inspections_manual_override
ON inspections(manual_price_override)
WHERE manual_price_override = true;

COMMENT ON INDEX idx_inspections_manual_override IS
'Optimize queries for manually overridden inspections for reporting and audit.';

CREATE INDEX IF NOT EXISTS idx_inspections_total_inc_gst
ON inspections(total_inc_gst)
WHERE total_inc_gst IS NOT NULL;

COMMENT ON INDEX idx_inspections_total_inc_gst IS
'Support reporting queries that filter or sort by total price.';

-- =====================================================
-- VERIFY MIGRATION
-- =====================================================
-- This comment block documents expected state after migration:
--
-- Total new columns: 15
-- - 4 job type hours (no_demolition_hours, demolition_hours, construction_hours, subfloor_hours)
-- - 4 equipment quantities (dehumidifier_count, air_mover_count, rcd_count, equipment_days)
-- - 2 manual override fields (manual_price_override, manual_total_inc_gst)
-- - 5 calculated pricing fields (labor_cost_ex_gst, discount_percent, subtotal_ex_gst, gst_amount, total_inc_gst)
--
-- All columns are nullable to support existing records
-- All numeric columns have CHECK constraints for non-negative values
-- discount_percent is capped at 13% (absolute maximum)
-- equipment_days has minimum value of 1

COMMIT;

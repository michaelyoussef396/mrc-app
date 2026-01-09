-- Migration: Add rate columns for detailed cost breakdown in Section 9
-- Purpose: Allow editable rates per job for labour and equipment

-- Labour rate columns (default $154/hr based on existing calculation)
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS non_demo_labour_rate DECIMAL(8,2) DEFAULT 154.00,
ADD COLUMN IF NOT EXISTS demo_labour_rate DECIMAL(8,2) DEFAULT 154.00,
ADD COLUMN IF NOT EXISTS subfloor_labour_rate DECIMAL(8,2) DEFAULT 154.00;

-- Equipment rate columns (defaults based on existing EQUIPMENT_RATES)
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS dehumidifier_rate DECIMAL(8,2) DEFAULT 132.00,
ADD COLUMN IF NOT EXISTS air_mover_rate DECIMAL(8,2) DEFAULT 46.00,
ADD COLUMN IF NOT EXISTS rcd_rate DECIMAL(8,2) DEFAULT 5.00;

-- Comments for documentation
COMMENT ON COLUMN inspections.non_demo_labour_rate IS 'Hourly rate for non-demolition labour (default $154)';
COMMENT ON COLUMN inspections.demo_labour_rate IS 'Hourly rate for demolition labour (default $154)';
COMMENT ON COLUMN inspections.subfloor_labour_rate IS 'Hourly rate for subfloor labour (default $154)';
COMMENT ON COLUMN inspections.dehumidifier_rate IS 'Daily rate for commercial dehumidifier (default $132)';
COMMENT ON COLUMN inspections.air_mover_rate IS 'Daily rate for air mover/blower (default $46)';
COMMENT ON COLUMN inspections.rcd_rate IS 'Daily rate for RCD box (default $5)';

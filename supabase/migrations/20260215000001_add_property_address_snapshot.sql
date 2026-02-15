-- Add property_address_snapshot column to inspections table
-- Stores the original address at time of inspection for audit trail
-- Written once on first address edit, never overwritten
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS property_address_snapshot TEXT DEFAULT NULL;

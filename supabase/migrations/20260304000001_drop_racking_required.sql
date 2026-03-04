-- Remove unused racking_required column from subfloor_data
ALTER TABLE subfloor_data DROP COLUMN IF EXISTS racking_required;

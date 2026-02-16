-- Add internal_moisture and extra_notes columns to inspection_areas
ALTER TABLE inspection_areas ADD COLUMN IF NOT EXISTS internal_moisture DECIMAL(5,2);
ALTER TABLE inspection_areas ADD COLUMN IF NOT EXISTS extra_notes TEXT;

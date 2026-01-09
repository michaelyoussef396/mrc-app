-- Add external_moisture column to inspection_areas table
-- This field stores the external moisture reading percentage for each area

ALTER TABLE inspection_areas
ADD COLUMN IF NOT EXISTS external_moisture NUMERIC(5,2);

COMMENT ON COLUMN inspection_areas.external_moisture IS 'External moisture reading percentage for this area';

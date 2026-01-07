-- Migration: Add mould_description text field to inspection_areas
-- Purpose: Replace checkbox-based mould visibility with free text field

-- Add the mould_description column
ALTER TABLE inspection_areas
ADD COLUMN IF NOT EXISTS mould_description text;

-- Add comment for documentation
COMMENT ON COLUMN inspection_areas.mould_description IS 'Free text description of mould visibility in the area';

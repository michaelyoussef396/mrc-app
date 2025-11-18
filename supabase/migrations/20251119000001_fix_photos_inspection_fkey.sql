-- Fix photos table foreign key constraint
-- Issue: photos.inspection_id_fkey points to inspection_reports table
-- Fix: Point FK to inspections table instead (where application stores data)
-- Impact: photos table is empty (0 records) - safe to modify
-- Date: 2025-11-19

BEGIN;

-- Drop incorrect foreign key pointing to inspection_reports
ALTER TABLE photos
  DROP CONSTRAINT IF EXISTS photos_inspection_id_fkey;

-- Add correct foreign key pointing to inspections table
-- ON DELETE CASCADE ensures photos are deleted when inspection is deleted
ALTER TABLE photos
  ADD CONSTRAINT photos_inspection_id_fkey
  FOREIGN KEY (inspection_id)
  REFERENCES inspections(id)
  ON DELETE CASCADE;

-- Verify the constraint was created correctly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'photos_inspection_id_fkey'
    AND table_name = 'photos'
  ) THEN
    RAISE EXCEPTION 'Failed to create photos_inspection_id_fkey constraint';
  END IF;
END $$;

COMMIT;

-- Migration complete
-- Photos can now be inserted with inspection_id from inspections table

-- Fix subfloor_data foreign key to point to inspections table
-- This ensures subfloor data saves correctly and cascades on inspection delete

-- Drop the incorrect foreign key constraint pointing to inspection_reports
ALTER TABLE public.subfloor_data
  DROP CONSTRAINT IF EXISTS subfloor_data_inspection_id_fkey;

-- Add correct foreign key pointing to inspections.id with CASCADE delete
ALTER TABLE public.subfloor_data
  ADD CONSTRAINT subfloor_data_inspection_id_fkey
  FOREIGN KEY (inspection_id)
  REFERENCES public.inspections(id)
  ON DELETE CASCADE;

-- Verify the constraint was created correctly
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_name = 'subfloor_data_inspection_id_fkey'
      AND tc.table_name = 'subfloor_data'
      AND ccu.table_name = 'inspections'
  ) THEN
    RAISE NOTICE 'Foreign key constraint successfully created and points to inspections table';
  ELSE
    RAISE EXCEPTION 'Foreign key constraint creation failed or points to wrong table';
  END IF;
END $$;

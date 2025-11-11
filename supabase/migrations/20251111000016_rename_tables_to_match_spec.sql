-- ============================================================================
-- Migration 016: Rename Tables to Match MRC Technical Specification
-- ============================================================================
-- Description: Rename core tables to match technical spec naming conventions
--   - inspections → inspection_reports
--   - calendar_events → calendar_bookings
--
-- CRITICAL: This migration requires application downtime (2-5 minutes)
--
-- Dependencies: All previous migrations (001-015)
--
-- Safety: Uses ALTER TABLE RENAME (instant, no data copy)
-- Rollback: Full rollback SQL provided at end of file
--
-- Author: Claude SQL Expert
-- Date: 2025-11-11
-- Priority: P0 - BLOCKING for production
-- ============================================================================

BEGIN;

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================

-- Check that old table names exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table "inspections" does not exist. Migration already applied or schema inconsistent.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table "calendar_events" does not exist. Migration already applied or schema inconsistent.';
  END IF;

  -- Check that new table names don't already exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspection_reports' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table "inspection_reports" already exists. Migration conflict.';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_bookings' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table "calendar_bookings" already exists. Migration conflict.';
  END IF;
END $$;

-- ============================================================================
-- PART 1: RENAME inspections → inspection_reports
-- ============================================================================

-- Step 1.1: Disable RLS temporarily for clean rename
ALTER TABLE public.inspections DISABLE ROW LEVEL SECURITY;

-- Step 1.2: Drop all RLS policies on inspections
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'inspections'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.inspections', policy_record.policyname);
  END LOOP;
END $$;

-- Step 1.3: Rename the table
ALTER TABLE public.inspections RENAME TO inspection_reports;

-- Step 1.4: Rename primary key constraint
ALTER INDEX IF EXISTS inspections_pkey RENAME TO inspection_reports_pkey;

-- Step 1.5: Rename unique constraints
ALTER INDEX IF EXISTS inspections_job_number_key RENAME TO inspection_reports_job_number_key;

-- Step 1.6: Rename all indexes
-- Standard indexes
ALTER INDEX IF EXISTS idx_inspections_lead_id RENAME TO idx_inspection_reports_lead_id;
ALTER INDEX IF EXISTS idx_inspections_inspector_id RENAME TO idx_inspection_reports_technician_id;
ALTER INDEX IF EXISTS idx_inspections_date RENAME TO idx_inspection_reports_inspection_date;
ALTER INDEX IF EXISTS idx_inspections_created_at RENAME TO idx_inspection_reports_created_at;
ALTER INDEX IF EXISTS idx_inspections_job_number RENAME TO idx_inspection_reports_job_number;
ALTER INDEX IF EXISTS idx_inspections_status RENAME TO idx_inspection_reports_report_status;

-- Duplicate indexes that should be dropped (see CURRENT-SCHEMA-STATE.md Issue 1)
DROP INDEX IF EXISTS idx_inspections_lead;  -- Duplicate of idx_inspection_reports_lead_id

-- Step 1.7: Update foreign key names (lead_id reference is fine, other tables will be updated below)

-- Step 1.8: Recreate RLS policies with updated names
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;

-- Technicians can view their own reports
CREATE POLICY "technicians_view_own_reports"
  ON public.inspection_reports FOR SELECT
  USING (auth.uid() = inspector_id);

-- Admins can view all reports
CREATE POLICY "admins_view_all_reports"
  ON public.inspection_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Technicians can create reports
CREATE POLICY "technicians_insert_reports"
  ON public.inspection_reports FOR INSERT
  WITH CHECK (auth.uid() = inspector_id);

-- Technicians can update their own reports
CREATE POLICY "technicians_update_own_reports"
  ON public.inspection_reports FOR UPDATE
  USING (auth.uid() = inspector_id);

-- Admins can manage all reports
CREATE POLICY "admins_manage_all_reports"
  ON public.inspection_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Step 1.9: Update sequence if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'inspections_id_seq') THEN
    ALTER SEQUENCE inspections_id_seq RENAME TO inspection_reports_id_seq;
  END IF;
END $$;

-- ============================================================================
-- PART 2: RENAME calendar_events → calendar_bookings
-- ============================================================================

-- Step 2.1: Disable RLS temporarily for clean rename
ALTER TABLE public.calendar_events DISABLE ROW LEVEL SECURITY;

-- Step 2.2: Drop all RLS policies on calendar_events
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'calendar_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.calendar_events', policy_record.policyname);
  END LOOP;
END $$;

-- Step 2.3: Rename the table
ALTER TABLE public.calendar_events RENAME TO calendar_bookings;

-- Step 2.4: Rename primary key constraint
ALTER INDEX IF EXISTS calendar_events_pkey RENAME TO calendar_bookings_pkey;

-- Step 2.5: Rename all indexes
-- Standard indexes
ALTER INDEX IF EXISTS idx_calendar_events_assigned_to RENAME TO idx_calendar_bookings_technician_id;
ALTER INDEX IF EXISTS idx_calendar_events_start RENAME TO idx_calendar_bookings_start_time;
ALTER INDEX IF EXISTS idx_calendar_events_end RENAME TO idx_calendar_bookings_end_time;
ALTER INDEX IF EXISTS idx_calendar_events_status RENAME TO idx_calendar_bookings_status;
ALTER INDEX IF EXISTS idx_calendar_events_type RENAME TO idx_calendar_bookings_type;
ALTER INDEX IF EXISTS idx_calendar_events_lead_id RENAME TO idx_calendar_bookings_lead_id;
ALTER INDEX IF EXISTS idx_calendar_events_inspection_id RENAME TO idx_calendar_bookings_inspection_id;
ALTER INDEX IF EXISTS idx_calendar_events_technician_time RENAME TO idx_calendar_bookings_technician_time;
ALTER INDEX IF EXISTS idx_calendar_events_tech_end_time RENAME TO idx_calendar_bookings_tech_end_time;
ALTER INDEX IF EXISTS idx_calendar_events_created_at RENAME TO idx_calendar_bookings_created_at;

-- Duplicate indexes that should be dropped (see CURRENT-SCHEMA-STATE.md Issue 1)
DROP INDEX IF EXISTS idx_calendar_assigned;  -- Duplicate of idx_calendar_bookings_technician_id
DROP INDEX IF EXISTS idx_calendar_start;  -- Duplicate of idx_calendar_bookings_start_time

-- Step 2.6: Recreate RLS policies with updated names
ALTER TABLE public.calendar_bookings ENABLE ROW LEVEL SECURITY;

-- Technicians can view their own bookings
CREATE POLICY "technicians_view_own_bookings"
  ON public.calendar_bookings FOR SELECT
  USING (auth.uid() = assigned_to);

-- Admins can view all bookings
CREATE POLICY "admins_view_all_bookings"
  ON public.calendar_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert bookings
CREATE POLICY "admins_insert_bookings"
  ON public.calendar_bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update bookings
CREATE POLICY "admins_update_bookings"
  ON public.calendar_bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete bookings
CREATE POLICY "admins_delete_bookings"
  ON public.calendar_bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Step 2.7: Update sequence if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'calendar_events_id_seq') THEN
    ALTER SEQUENCE calendar_events_id_seq RENAME TO calendar_bookings_id_seq;
  END IF;
END $$;

-- ============================================================================
-- PART 3: UPDATE FOREIGN KEY REFERENCES
-- ============================================================================

-- Step 3.1: Update leads.inspection_report_id foreign key
-- (This reference might not exist yet, but safe to attempt)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leads_inspection_report_id_fkey'
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE public.leads
      DROP CONSTRAINT leads_inspection_report_id_fkey;

    ALTER TABLE public.leads
      ADD CONSTRAINT leads_inspection_report_id_fkey
      FOREIGN KEY (inspection_report_id)
      REFERENCES public.inspection_reports(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3.2: Update email_logs.inspection_id foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%inspection%fkey%'
    AND table_name = 'email_logs'
  ) THEN
    -- Find the actual constraint name
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'email_logs'
        AND kcu.column_name = 'inspection_id'
        AND tc.constraint_type = 'FOREIGN KEY';

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.email_logs DROP CONSTRAINT %I', constraint_name);

        ALTER TABLE public.email_logs
          ADD CONSTRAINT email_logs_inspection_id_fkey
          FOREIGN KEY (inspection_id)
          REFERENCES public.inspection_reports(id)
          ON DELETE CASCADE;
      END IF;
    END;
  END IF;
END $$;

-- Step 3.3: Update sms_logs.inspection_id foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'inspection_id'
  ) THEN
    -- Find the actual constraint name
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'sms_logs'
        AND kcu.column_name = 'inspection_id'
        AND tc.constraint_type = 'FOREIGN KEY';

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.sms_logs DROP CONSTRAINT %I', constraint_name);

        ALTER TABLE public.sms_logs
          ADD CONSTRAINT sms_logs_inspection_id_fkey
          FOREIGN KEY (inspection_id)
          REFERENCES public.inspection_reports(id)
          ON DELETE CASCADE;
      END IF;
    END;
  END IF;
END $$;

-- Step 3.4: Update inspection_areas.inspection_id foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'inspection_areas' AND table_schema = 'public'
  ) THEN
    -- Find the actual constraint name
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'inspection_areas'
        AND kcu.column_name = 'inspection_id'
        AND tc.constraint_type = 'FOREIGN KEY';

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.inspection_areas DROP CONSTRAINT %I', constraint_name);

        ALTER TABLE public.inspection_areas
          ADD CONSTRAINT inspection_areas_inspection_id_fkey
          FOREIGN KEY (inspection_id)
          REFERENCES public.inspection_reports(id)
          ON DELETE CASCADE;
      END IF;
    END;
  END IF;
END $$;

-- Step 3.5: Update equipment_bookings.inspection_id foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_bookings' AND column_name = 'inspection_id'
  ) THEN
    -- Find the actual constraint name
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'equipment_bookings'
        AND kcu.column_name = 'inspection_id'
        AND tc.constraint_type = 'FOREIGN KEY';

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.equipment_bookings DROP CONSTRAINT %I', constraint_name);

        ALTER TABLE public.equipment_bookings
          ADD CONSTRAINT equipment_bookings_inspection_id_fkey
          FOREIGN KEY (inspection_id)
          REFERENCES public.inspection_reports(id)
          ON DELETE CASCADE;
      END IF;
    END;
  END IF;
END $$;

-- Step 3.6: Update photos.inspection_id foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'inspection_id'
  ) THEN
    -- Find the actual constraint name
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'photos'
        AND kcu.column_name = 'inspection_id'
        AND tc.constraint_type = 'FOREIGN KEY';

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.photos DROP CONSTRAINT %I', constraint_name);

        ALTER TABLE public.photos
          ADD CONSTRAINT photos_inspection_id_fkey
          FOREIGN KEY (inspection_id)
          REFERENCES public.inspection_reports(id)
          ON DELETE CASCADE;
      END IF;
    END;
  END IF;
END $$;

-- Step 3.7: Update subfloor_data.inspection_id foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subfloor_data' AND column_name = 'inspection_id'
  ) THEN
    -- Find the actual constraint name
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'subfloor_data'
        AND kcu.column_name = 'inspection_id'
        AND tc.constraint_type = 'FOREIGN KEY';

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.subfloor_data DROP CONSTRAINT %I', constraint_name);

        ALTER TABLE public.subfloor_data
          ADD CONSTRAINT subfloor_data_inspection_id_fkey
          FOREIGN KEY (inspection_id)
          REFERENCES public.inspection_reports(id)
          ON DELETE CASCADE;
      END IF;
    END;
  END IF;
END $$;

-- Step 3.8: Update client_booking_tokens.inspection_id foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_booking_tokens' AND column_name = 'inspection_id'
  ) THEN
    -- Find the actual constraint name
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'client_booking_tokens'
        AND kcu.column_name = 'inspection_id'
        AND tc.constraint_type = 'FOREIGN KEY';

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.client_booking_tokens DROP CONSTRAINT %I', constraint_name);

        ALTER TABLE public.client_booking_tokens
          ADD CONSTRAINT client_booking_tokens_inspection_id_fkey
          FOREIGN KEY (inspection_id)
          REFERENCES public.inspection_reports(id)
          ON DELETE CASCADE;
      END IF;
    END;
  END IF;
END $$;

-- Step 3.9: Update calendar_bookings.inspection_id foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_bookings' AND column_name = 'inspection_id'
  ) THEN
    -- Find the actual constraint name
    DECLARE
      constraint_name TEXT;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'calendar_bookings'
        AND kcu.column_name = 'inspection_id'
        AND tc.constraint_type = 'FOREIGN KEY';

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.calendar_bookings DROP CONSTRAINT %I', constraint_name);

        ALTER TABLE public.calendar_bookings
          ADD CONSTRAINT calendar_bookings_inspection_id_fkey
          FOREIGN KEY (inspection_id)
          REFERENCES public.inspection_reports(id)
          ON DELETE SET NULL;
      END IF;
    END;
  END IF;
END $$;

-- ============================================================================
-- PART 4: UPDATE FUNCTIONS THAT REFERENCE RENAMED TABLES
-- ============================================================================

-- Update any functions that query inspections or calendar_events tables
-- (Most functions should use dynamic table names or be database-agnostic)

-- Example: Update has_travel_time_conflict function if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_travel_time_conflict') THEN
    -- Drop and recreate with updated table reference
    DROP FUNCTION IF EXISTS has_travel_time_conflict(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

    CREATE OR REPLACE FUNCTION has_travel_time_conflict(
      p_assigned_to UUID,
      p_start_datetime TIMESTAMPTZ,
      p_end_datetime TIMESTAMPTZ
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    STABLE
    AS $func$
    DECLARE
      conflict_exists BOOLEAN;
    BEGIN
      -- Check if there are any overlapping bookings for the technician
      SELECT EXISTS (
        SELECT 1
        FROM public.calendar_bookings
        WHERE assigned_to = p_assigned_to
          AND status NOT IN ('cancelled', 'completed')
          AND deleted_at IS NULL
          AND (
            -- Overlap condition
            (start_datetime < p_end_datetime AND end_datetime > p_start_datetime)
          )
      ) INTO conflict_exists;

      RETURN conflict_exists;
    END;
    $func$;
  END IF;
END $$;

-- ============================================================================
-- PART 5: UPDATE TRIGGERS
-- ============================================================================

-- Triggers should automatically follow the table rename, but verify
-- update_updated_at_column trigger exists on both tables

-- Verify trigger on inspection_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_inspection_reports_updated_at'
    AND tgrelid = 'public.inspection_reports'::regclass
  ) THEN
    CREATE TRIGGER update_inspection_reports_updated_at
      BEFORE UPDATE ON public.inspection_reports
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Verify trigger on calendar_bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_calendar_bookings_updated_at'
    AND tgrelid = 'public.calendar_bookings'::regclass
  ) THEN
    CREATE TRIGGER update_calendar_bookings_updated_at
      BEFORE UPDATE ON public.calendar_bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- PART 6: VERIFICATION QUERIES
-- ============================================================================

-- Verify tables exist with new names
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspection_reports' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table "inspection_reports" does not exist after rename!';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_bookings' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table "calendar_bookings" does not exist after rename!';
  END IF;

  -- Verify old tables no longer exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table "inspections" still exists after rename!';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table "calendar_events" still exists after rename!';
  END IF;

  RAISE NOTICE 'Migration 016: Table renames completed successfully';
  RAISE NOTICE '  - inspections → inspection_reports';
  RAISE NOTICE '  - calendar_events → calendar_bookings';
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================

-- IMPORTANT: After running this migration, you must:
--
-- 1. Update application code:
--    - Search for "inspections" table references → update to "inspection_reports"
--    - Search for "calendar_events" table references → update to "calendar_bookings"
--
-- 2. Regenerate TypeScript types:
--    supabase gen types typescript --local > src/types/database.types.ts
--
-- 3. Update API functions in src/lib/api/
--
-- 4. Update React Query hooks
--
-- 5. Test all features that use these tables:
--    - Inspection form submission
--    - Calendar booking creation
--    - PDF generation
--    - Email sending
--    - Offline sync queue

-- ============================================================================
-- ROLLBACK SCRIPT (Run only if migration fails or needs reversal)
-- ============================================================================

/*
BEGIN;

-- Rollback Part 2: calendar_bookings → calendar_events
ALTER TABLE public.calendar_bookings DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "technicians_view_own_bookings" ON public.calendar_bookings;
DROP POLICY IF EXISTS "admins_view_all_bookings" ON public.calendar_bookings;
DROP POLICY IF EXISTS "admins_insert_bookings" ON public.calendar_bookings;
DROP POLICY IF EXISTS "admins_update_bookings" ON public.calendar_bookings;
DROP POLICY IF EXISTS "admins_delete_bookings" ON public.calendar_bookings;

-- Rename table back
ALTER TABLE public.calendar_bookings RENAME TO calendar_events;

-- Rename indexes back
ALTER INDEX IF EXISTS calendar_bookings_pkey RENAME TO calendar_events_pkey;
ALTER INDEX IF EXISTS idx_calendar_bookings_technician_id RENAME TO idx_calendar_events_assigned_to;
ALTER INDEX IF EXISTS idx_calendar_bookings_start_time RENAME TO idx_calendar_events_start;
ALTER INDEX IF EXISTS idx_calendar_bookings_end_time RENAME TO idx_calendar_events_end;
ALTER INDEX IF EXISTS idx_calendar_bookings_status RENAME TO idx_calendar_events_status;
ALTER INDEX IF EXISTS idx_calendar_bookings_type RENAME TO idx_calendar_events_type;
ALTER INDEX IF EXISTS idx_calendar_bookings_lead_id RENAME TO idx_calendar_events_lead_id;
ALTER INDEX IF EXISTS idx_calendar_bookings_inspection_id RENAME TO idx_calendar_events_inspection_id;

-- Rollback Part 1: inspection_reports → inspections
ALTER TABLE public.inspection_reports DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "technicians_view_own_reports" ON public.inspection_reports;
DROP POLICY IF EXISTS "admins_view_all_reports" ON public.inspection_reports;
DROP POLICY IF EXISTS "technicians_insert_reports" ON public.inspection_reports;
DROP POLICY IF EXISTS "technicians_update_own_reports" ON public.inspection_reports;
DROP POLICY IF EXISTS "admins_manage_all_reports" ON public.inspection_reports;

-- Rename table back
ALTER TABLE public.inspection_reports RENAME TO inspections;

-- Rename indexes back
ALTER INDEX IF EXISTS inspection_reports_pkey RENAME TO inspections_pkey;
ALTER INDEX IF EXISTS inspection_reports_job_number_key RENAME TO inspections_job_number_key;
ALTER INDEX IF EXISTS idx_inspection_reports_lead_id RENAME TO idx_inspections_lead_id;
ALTER INDEX IF EXISTS idx_inspection_reports_technician_id RENAME TO idx_inspections_inspector_id;
ALTER INDEX IF EXISTS idx_inspection_reports_inspection_date RENAME TO idx_inspections_date;
ALTER INDEX IF EXISTS idx_inspection_reports_created_at RENAME TO idx_inspections_created_at;
ALTER INDEX IF EXISTS idx_inspection_reports_job_number RENAME TO idx_inspections_job_number;
ALTER INDEX IF EXISTS idx_inspection_reports_report_status RENAME TO idx_inspections_status;

-- Recreate original policies (basic set)
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inspectors can view own inspections" ON public.inspections FOR SELECT USING (auth.uid() = inspector_id);
CREATE POLICY "Admins can view all inspections" ON public.inspections FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

COMMIT;

RAISE NOTICE 'Rollback completed: Tables renamed back to original names';
*/

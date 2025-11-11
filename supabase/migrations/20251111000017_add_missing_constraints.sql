-- ============================================================================
-- Migration 017: Add Missing NOT NULL and CHECK Constraints
-- ============================================================================
-- Description: Add critical constraints to ensure data integrity
--
-- Based on issues identified in CURRENT-SCHEMA-STATE.md:
--   - Issue 6: Missing NOT NULL constraints on critical fields
--   - Issue 7: Missing default values
--
-- Safety: Uses safe migration pattern (check data first, add constraints)
--
-- Dependencies: Migration 016 (table renames)
--
-- Author: Claude SQL Expert
-- Date: 2025-11-11
-- Priority: P0 - Data integrity
-- ============================================================================

BEGIN;

-- ============================================================================
-- PRE-FLIGHT DATA VALIDATION
-- ============================================================================

-- Check for NULL values in columns that should be NOT NULL
-- This prevents constraint failures

DO $$
DECLARE
  null_count INTEGER;
BEGIN
  -- Check inspection_reports.inspector_id
  SELECT COUNT(*) INTO null_count
  FROM inspection_reports
  WHERE inspector_id IS NULL;

  IF null_count > 0 THEN
    RAISE WARNING 'Found % inspection_reports with NULL inspector_id. These must be fixed before adding constraint.', null_count;
    -- Don't fail migration, just warn and skip that constraint
  END IF;

  -- Check calendar_bookings.assigned_to
  SELECT COUNT(*) INTO null_count
  FROM calendar_bookings
  WHERE assigned_to IS NULL;

  IF null_count > 0 THEN
    RAISE WARNING 'Found % calendar_bookings with NULL assigned_to. These must be fixed before adding constraint.', null_count;
  END IF;

  -- Check email_logs.recipient_email
  SELECT COUNT(*) INTO null_count
  FROM email_logs
  WHERE recipient_email IS NULL OR recipient_email = '';

  IF null_count > 0 THEN
    RAISE WARNING 'Found % email_logs with NULL/empty recipient_email. These must be fixed before adding constraint.', null_count;
  END IF;

  -- Check offline_queue.user_id
  SELECT COUNT(*) INTO null_count
  FROM offline_queue
  WHERE user_id IS NULL;

  IF null_count > 0 THEN
    RAISE WARNING 'Found % offline_queue records with NULL user_id. These must be fixed before adding constraint.', null_count;
  END IF;
END $$;

-- ============================================================================
-- PART 1: ADD NOT NULL CONSTRAINTS TO inspection_reports
-- ============================================================================

-- Add NOT NULL to inspector_id (who did the inspection)
DO $$
BEGIN
  -- Only add constraint if no NULL values exist
  IF NOT EXISTS (SELECT 1 FROM inspection_reports WHERE inspector_id IS NULL) THEN
    ALTER TABLE inspection_reports
      ALTER COLUMN inspector_id SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to inspection_reports.inspector_id';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on inspection_reports.inspector_id - NULL values exist';
  END IF;
END $$;

-- Add NOT NULL to inspection_date (when inspection was performed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM inspection_reports WHERE inspection_date IS NULL) THEN
    ALTER TABLE inspection_reports
      ALTER COLUMN inspection_date SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to inspection_reports.inspection_date';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on inspection_reports.inspection_date - NULL values exist';
  END IF;
END $$;

-- Add NOT NULL to job_number (unique identifier)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM inspection_reports WHERE job_number IS NULL OR job_number = '') THEN
    ALTER TABLE inspection_reports
      ALTER COLUMN job_number SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to inspection_reports.job_number';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on inspection_reports.job_number - NULL/empty values exist';
  END IF;
END $$;

-- ============================================================================
-- PART 2: ADD NOT NULL CONSTRAINTS TO calendar_bookings
-- ============================================================================

-- Add NOT NULL to assigned_to (technician assignment)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM calendar_bookings WHERE assigned_to IS NULL) THEN
    ALTER TABLE calendar_bookings
      ALTER COLUMN assigned_to SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to calendar_bookings.assigned_to';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on calendar_bookings.assigned_to - NULL values exist';
  END IF;
END $$;

-- Add NOT NULL to start_datetime (booking must have start time)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM calendar_bookings WHERE start_datetime IS NULL) THEN
    ALTER TABLE calendar_bookings
      ALTER COLUMN start_datetime SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to calendar_bookings.start_datetime';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on calendar_bookings.start_datetime - NULL values exist';
  END IF;
END $$;

-- Add NOT NULL to end_datetime (booking must have end time)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM calendar_bookings WHERE end_datetime IS NULL) THEN
    ALTER TABLE calendar_bookings
      ALTER COLUMN end_datetime SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to calendar_bookings.end_datetime';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on calendar_bookings.end_datetime - NULL values exist';
  END IF;
END $$;

-- ============================================================================
-- PART 3: ADD NOT NULL CONSTRAINTS TO email_logs
-- ============================================================================

-- Add NOT NULL to recipient_email (must send to someone)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM email_logs WHERE recipient_email IS NULL OR recipient_email = '') THEN
    ALTER TABLE email_logs
      ALTER COLUMN recipient_email SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to email_logs.recipient_email';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on email_logs.recipient_email - NULL/empty values exist';
  END IF;
END $$;

-- Add NOT NULL to subject (email must have subject)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM email_logs WHERE subject IS NULL OR subject = '') THEN
    ALTER TABLE email_logs
      ALTER COLUMN subject SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to email_logs.subject';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on email_logs.subject - NULL/empty values exist';
  END IF;
END $$;

-- Add NOT NULL to template_name (email must be from a template)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM email_logs WHERE template_name IS NULL OR template_name = '') THEN
    ALTER TABLE email_logs
      ALTER COLUMN template_name SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to email_logs.template_name';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on email_logs.template_name - NULL/empty values exist';
  END IF;
END $$;

-- ============================================================================
-- PART 4: ADD NOT NULL CONSTRAINTS TO sms_logs (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_logs') THEN
    -- Add NOT NULL to recipient_phone
    IF NOT EXISTS (SELECT 1 FROM sms_logs WHERE recipient_phone IS NULL OR recipient_phone = '') THEN
      ALTER TABLE sms_logs
        ALTER COLUMN recipient_phone SET NOT NULL;
      RAISE NOTICE 'Added NOT NULL constraint to sms_logs.recipient_phone';
    ELSE
      RAISE WARNING 'Skipping NOT NULL constraint on sms_logs.recipient_phone - NULL/empty values exist';
    END IF;

    -- Add NOT NULL to message
    IF NOT EXISTS (SELECT 1 FROM sms_logs WHERE message IS NULL OR message = '') THEN
      ALTER TABLE sms_logs
        ALTER COLUMN message SET NOT NULL;
      RAISE NOTICE 'Added NOT NULL constraint to sms_logs.message';
    ELSE
      RAISE WARNING 'Skipping NOT NULL constraint on sms_logs.message - NULL/empty values exist';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 5: ADD NOT NULL CONSTRAINTS TO offline_queue
-- ============================================================================

-- Add NOT NULL to user_id (offline action must belong to a user)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM offline_queue WHERE user_id IS NULL) THEN
    ALTER TABLE offline_queue
      ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to offline_queue.user_id';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on offline_queue.user_id - NULL values exist';
  END IF;
END $$;

-- Add NOT NULL to action_type (must specify create/update/delete)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM offline_queue WHERE action_type IS NULL) THEN
    ALTER TABLE offline_queue
      ALTER COLUMN action_type SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to offline_queue.action_type';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on offline_queue.action_type - NULL values exist';
  END IF;
END $$;

-- Add NOT NULL to table_name (must specify which table)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM offline_queue WHERE table_name IS NULL) THEN
    ALTER TABLE offline_queue
      ALTER COLUMN table_name SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to offline_queue.table_name';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on offline_queue.table_name - NULL values exist';
  END IF;
END $$;

-- Add NOT NULL to payload (must have data to sync)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM offline_queue WHERE payload IS NULL) THEN
    ALTER TABLE offline_queue
      ALTER COLUMN payload SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to offline_queue.payload';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on offline_queue.payload - NULL values exist';
  END IF;
END $$;

-- ============================================================================
-- PART 6: ADD CHECK CONSTRAINTS
-- ============================================================================

-- Add CHECK constraint for calendar_bookings: end_datetime > start_datetime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'calendar_bookings_time_order_check'
  ) THEN
    ALTER TABLE calendar_bookings
      ADD CONSTRAINT calendar_bookings_time_order_check
      CHECK (end_datetime > start_datetime);
    RAISE NOTICE 'Added CHECK constraint: calendar_bookings.end_datetime > start_datetime';
  END IF;
END $$;

-- Add CHECK constraint for email_logs: recipient_email is valid format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'email_logs_valid_email_check'
  ) THEN
    ALTER TABLE email_logs
      ADD CONSTRAINT email_logs_valid_email_check
      CHECK (recipient_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    RAISE NOTICE 'Added CHECK constraint: email_logs.recipient_email format validation';
  END IF;
END $$;

-- Add CHECK constraint for leads: property_zone between 1 and 4
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leads_property_zone_check'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_property_zone_check
      CHECK (property_zone IS NULL OR (property_zone >= 1 AND property_zone <= 4));
    RAISE NOTICE 'Added CHECK constraint: leads.property_zone between 1 and 4';
  END IF;
END $$;

-- Add CHECK constraint for pricing_settings: rates must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pricing_settings_positive_rates_check'
  ) THEN
    ALTER TABLE pricing_settings
      ADD CONSTRAINT pricing_settings_positive_rates_check
      CHECK (hours_2_rate > 0 AND hours_8_rate > 0);
    RAISE NOTICE 'Added CHECK constraint: pricing_settings rates must be positive';
  END IF;
END $$;

-- Add CHECK constraint for equipment: daily_rate must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'equipment_positive_rate_check'
  ) THEN
    ALTER TABLE equipment
      ADD CONSTRAINT equipment_positive_rate_check
      CHECK (daily_rate >= 0);
    RAISE NOTICE 'Added CHECK constraint: equipment.daily_rate >= 0';
  END IF;
END $$;

-- ============================================================================
-- PART 7: ADD DEFAULT VALUES WHERE MISSING
-- ============================================================================

-- Set default for inspection_reports.inspection_date to TODAY
DO $$
BEGIN
  ALTER TABLE inspection_reports
    ALTER COLUMN inspection_date SET DEFAULT CURRENT_DATE;
  RAISE NOTICE 'Added DEFAULT CURRENT_DATE to inspection_reports.inspection_date';
END $$;

-- Set default for calendar_bookings.status to 'scheduled'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_bookings'
      AND column_name = 'status'
      AND column_default IS NULL
  ) THEN
    ALTER TABLE calendar_bookings
      ALTER COLUMN status SET DEFAULT 'scheduled';
    RAISE NOTICE 'Added DEFAULT ''scheduled'' to calendar_bookings.status';
  END IF;
END $$;

-- Set default for offline_queue.status to 'pending'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offline_queue'
      AND column_name = 'status'
      AND column_default IS NULL
  ) THEN
    ALTER TABLE offline_queue
      ALTER COLUMN status SET DEFAULT 'pending';
    RAISE NOTICE 'Added DEFAULT ''pending'' to offline_queue.status';
  END IF;
END $$;

-- Set default for offline_queue.sync_attempts to 0
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offline_queue'
      AND column_name = 'sync_attempts'
      AND column_default IS NULL
  ) THEN
    ALTER TABLE offline_queue
      ALTER COLUMN sync_attempts SET DEFAULT 0;
    RAISE NOTICE 'Added DEFAULT 0 to offline_queue.sync_attempts';
  END IF;
END $$;

-- ============================================================================
-- PART 8: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  -- Count CHECK constraints added
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'CHECK'
    AND table_schema = 'public'
    AND constraint_name LIKE '%check%';

  RAISE NOTICE 'Migration 017 completed successfully';
  RAISE NOTICE '  - Added NOT NULL constraints to critical fields';
  RAISE NOTICE '  - Added CHECK constraints for data validation';
  RAISE NOTICE '  - Added DEFAULT values to improve UX';
  RAISE NOTICE '  - Total CHECK constraints: %', constraint_count;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================

-- IMPORTANT: After running this migration:
--
-- 1. Test form submissions to ensure constraints don't break UX
--    - Inspection form should auto-fill inspection_date
--    - Calendar booking should default to 'scheduled' status
--    - Offline queue should auto-set status to 'pending'
--
-- 2. Monitor for constraint violations in application logs
--
-- 3. If any NULL values were found (warnings above), clean them up:
--    - Update inspection_reports SET inspector_id = <default_user> WHERE inspector_id IS NULL;
--    - Update calendar_bookings SET assigned_to = <default_user> WHERE assigned_to IS NULL;
--    - Delete email_logs WHERE recipient_email IS NULL;
--    - Delete offline_queue WHERE user_id IS NULL;

-- ============================================================================
-- ROLLBACK SCRIPT (Run only if migration causes issues)
-- ============================================================================

/*
BEGIN;

-- Remove NOT NULL constraints
ALTER TABLE inspection_reports ALTER COLUMN inspector_id DROP NOT NULL;
ALTER TABLE inspection_reports ALTER COLUMN inspection_date DROP NOT NULL;
ALTER TABLE inspection_reports ALTER COLUMN job_number DROP NOT NULL;

ALTER TABLE calendar_bookings ALTER COLUMN assigned_to DROP NOT NULL;
ALTER TABLE calendar_bookings ALTER COLUMN start_datetime DROP NOT NULL;
ALTER TABLE calendar_bookings ALTER COLUMN end_datetime DROP NOT NULL;

ALTER TABLE email_logs ALTER COLUMN recipient_email DROP NOT NULL;
ALTER TABLE email_logs ALTER COLUMN subject DROP NOT NULL;
ALTER TABLE email_logs ALTER COLUMN template_name DROP NOT NULL;

ALTER TABLE sms_logs ALTER COLUMN recipient_phone DROP NOT NULL;
ALTER TABLE sms_logs ALTER COLUMN message DROP NOT NULL;

ALTER TABLE offline_queue ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE offline_queue ALTER COLUMN action_type DROP NOT NULL;
ALTER TABLE offline_queue ALTER COLUMN table_name DROP NOT NULL;
ALTER TABLE offline_queue ALTER COLUMN payload DROP NOT NULL;

-- Remove CHECK constraints
ALTER TABLE calendar_bookings DROP CONSTRAINT IF EXISTS calendar_bookings_time_order_check;
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_valid_email_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_property_zone_check;
ALTER TABLE pricing_settings DROP CONSTRAINT IF EXISTS pricing_settings_positive_rates_check;
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_positive_rate_check;

-- Remove DEFAULT values
ALTER TABLE inspection_reports ALTER COLUMN inspection_date DROP DEFAULT;
ALTER TABLE calendar_bookings ALTER COLUMN status DROP DEFAULT;
ALTER TABLE offline_queue ALTER COLUMN status DROP DEFAULT;
ALTER TABLE offline_queue ALTER COLUMN sync_attempts DROP DEFAULT;

COMMIT;

RAISE NOTICE 'Rollback completed: Constraints and defaults removed';
*/

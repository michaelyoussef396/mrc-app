-- 1a. Add column
ALTER TABLE calendar_bookings
  ADD COLUMN IF NOT EXISTS reminder_scheduled_for TIMESTAMPTZ;

-- 1b. Trigger: auto-compute reminder_scheduled_for on insert/update
CREATE OR REPLACE FUNCTION public.set_reminder_scheduled_for()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Set reminder 48h before inspection
  IF NEW.event_type = 'inspection' AND NEW.status = 'scheduled' THEN
    NEW.reminder_scheduled_for := NEW.start_datetime - INTERVAL '48 hours';
  END IF;

  -- On cancellation/completion, clear schedule
  IF NEW.status IN ('cancelled', 'completed', 'no_show') THEN
    NEW.reminder_scheduled_for := NULL;
  END IF;

  -- On reschedule, reset reminder so a new one goes out
  IF TG_OP = 'UPDATE'
     AND OLD.start_datetime IS DISTINCT FROM NEW.start_datetime
     AND NEW.status = 'scheduled' THEN
    NEW.reminder_sent := false;
    NEW.reminder_sent_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_reminder_scheduled_for ON calendar_bookings;
CREATE TRIGGER trigger_set_reminder_scheduled_for
  BEFORE INSERT OR UPDATE OF start_datetime, status ON calendar_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_reminder_scheduled_for();

-- 1c. Backfill existing bookings
UPDATE calendar_bookings
SET reminder_scheduled_for = start_datetime - INTERVAL '48 hours'
WHERE status = 'scheduled'
  AND reminder_sent = false
  AND event_type = 'inspection';

-- 1d. Partial index for the cron query
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_reminder_pending
  ON calendar_bookings (reminder_scheduled_for)
  WHERE reminder_sent = false AND status = 'scheduled';

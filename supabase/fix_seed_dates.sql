-- Fix: Move the 3 seeded bookings from Feb 8 to TODAY (Feb 9 Melbourne)
-- Run at: https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/sql

-- Angela Rossi: 9:00 AM → 9:00 AM today
UPDATE public.calendar_bookings
SET start_datetime = '2026-02-09 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne',
    end_datetime   = '2026-02-09 10:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne'
WHERE title = 'Mould Inspection - Angela Rossi'
  AND assigned_to = 'd22fa3bb-9bf0-4e27-8681-1f09841f0d8e';

-- David Nguyen: 11:30 AM → 11:30 AM today
UPDATE public.calendar_bookings
SET start_datetime = '2026-02-09 11:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne',
    end_datetime   = '2026-02-09 12:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne'
WHERE title = 'Mould Inspection - David Nguyen'
  AND assigned_to = 'd22fa3bb-9bf0-4e27-8681-1f09841f0d8e';

-- Karen Mitchell: 2:00 PM → 2:00 PM today
UPDATE public.calendar_bookings
SET start_datetime = '2026-02-09 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne',
    end_datetime   = '2026-02-09 15:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne'
WHERE title = 'Mould Inspection - Karen Mitchell'
  AND assigned_to = 'd22fa3bb-9bf0-4e27-8681-1f09841f0d8e';

-- Also update the leads' inspection_scheduled_date
UPDATE public.leads
SET inspection_scheduled_date = '2026-02-09'
WHERE full_name IN ('Angela Rossi', 'David Nguyen', 'Karen Mitchell')
  AND assigned_to = 'd22fa3bb-9bf0-4e27-8681-1f09841f0d8e';

-- Verify
SELECT
  cb.title,
  cb.start_datetime AT TIME ZONE 'Australia/Melbourne' AS melbourne_time,
  cb.status
FROM public.calendar_bookings cb
WHERE cb.assigned_to = 'd22fa3bb-9bf0-4e27-8681-1f09841f0d8e'
  AND (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date = '2026-02-09'
ORDER BY cb.start_datetime;

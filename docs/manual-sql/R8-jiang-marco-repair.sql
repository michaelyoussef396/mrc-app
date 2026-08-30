-- ============================================================================
-- R8 repair — MRC-2026-0077 "Jiang Marco"
-- Lead id: 80edcb5c-a459-4f4a-9ca9-593eb32a7f7e
--
-- TARGET: PROD, project ref ecyivrxjpsmjmexqatym (LIVE — mrcsystem.com).
--         Run by hand in Supabase Studio. Do NOT run via CLI or MCP.
--
-- RUN THIS ONLY AFTER the fix on branch fix/cancel-path-field-clearing is
-- merged AND deployed to production. Repairing the row while the code that
-- strips these columns is still live just re-creates the same broken state on
-- the next cancel.
-- ============================================================================
--
-- WHY THIS ROW EXISTS
--   The calendar Cancel Booking action wrote status 'new_lead' with no
--   event-type check and without clearing the columns owned by the booking.
--   Cancelling this lead's JOB therefore sent a job-stage lead back to the top
--   of the pipeline while leaving assigned_to, scheduled_time and
--   job_scheduled_date populated.
--
--   Seven PROD leads reached this state, all via the calendar Cancel path. Six
--   were repaired by hand on 30 Aug 2026. This is the seventh and the only one
--   that was a JOB cancel rather than an inspection cancel, so it needs
--   'job_waiting' rather than 'new_lead'.
--
-- STATE OBSERVED 30 Aug 2026
--   status                    new_lead
--   assigned_to               5230cdcd-4419-42b3-b0eb-29a1655e95f5 (Clayton Jenkins)
--   job_scheduled_date        2026-08-27
--   scheduled_time            08:00
--   inspection_scheduled_date NULL
--   active_bookings           0
--
-- WHAT THIS DOES
--   Sets the status the cancel should have written ('job_waiting') and clears
--   the same six columns that buildBookingRevertUpdates() now clears at
--   src/lib/leadBookingFields.ts (LEAD_BOOKING_FIELDS). customer_preferred_date
--   and customer_preferred_time are deliberately NOT touched — they belong to
--   the customer, not the workflow, and are never cleared.
--
-- GUARD
--   The WHERE pins both the id and the status observed on 30 Aug. If anything
--   has moved this lead since, the statement matches nothing and changes
--   nothing rather than overwriting someone else's work.
--
-- EXPECTED RESULT
--   Exactly 1 row returned.
--     0 rows  -> the guard held; the status is no longer 'new_lead'. Re-check
--                the row before changing anything. Do not remove the guard.
--     >1 rows -> impossible (id is the primary key). Stop and investigate.
--
-- ATTRIBUTION (optional)
--   audit_logs.user_id is nullable, so the audit trigger accepts a Studio-run
--   statement and simply records user_id NULL. To attribute the repair to
--   yourself instead, run this first, in the SAME transaction:
--
--     SELECT set_config('app.acting_user_id', '<your-auth-user-uuid>', true);
--
--   audit_log_trigger() reads auth.uid() first and falls back to
--   current_setting('app.acting_user_id', true).
-- ============================================================================

UPDATE public.leads
SET status                    = 'job_waiting',
    assigned_to               = NULL,
    inspection_scheduled_date = NULL,
    scheduled_time            = NULL,
    scheduled_dates           = NULL,
    booked_at                 = NULL,
    job_scheduled_date        = NULL
WHERE id     = '80edcb5c-a459-4f4a-9ca9-593eb32a7f7e'
  AND status = 'new_lead'
RETURNING id,
          lead_number,
          full_name,
          status,
          assigned_to,
          inspection_scheduled_date,
          scheduled_time,
          scheduled_dates,
          booked_at,
          job_scheduled_date;

-- After it returns, the lead should read:
--   status = 'job_waiting', every other returned column NULL.
-- It then appears in the To Schedule rail as a job awaiting booking —
-- useLeadsToSchedule.ts admits job_waiting unconditionally, with no
-- assigned_to or date predicate.

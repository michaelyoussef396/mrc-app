-- ============================================================================
-- ALREADY RUN — DO NOT RUN AGAIN. Kept for the record only.
--
-- Executed on PROD 31 Aug 2026 ~01:20 AEST. 1 row returned, committed and
-- verified: MRC-2026-0077 is now status 'job_waiting' with all six booking
-- columns NULL, and PROD's count of invisible leads (a non-null assigned_to
-- sitting at new_lead) is 0. Re-running this now returns 0 rows because the
-- guard below pins status = 'new_lead' and the status is no longer that.
-- 0 rows is the CORRECT result today; it does not mean anything is wrong.
-- ============================================================================
-- R8 repair — MRC-2026-0077 "Jiang Marco"
-- Lead id: 80edcb5c-a459-4f4a-9ca9-593eb32a7f7e
--
-- TARGET: PROD, project ref ecyivrxjpsmjmexqatym (LIVE — mrcsystem.com).
--         Run by hand in Supabase Studio. Never via CLI or MCP.
--
-- ORDERING (satisfied before it was run): the fix had to be merged AND
-- deployed first — repairing the row while the code that strips these columns
-- was still live would just have re-created the broken state on the next
-- cancel. Branch fix/cancel-path-field-clearing merged to main as 62dd415,
-- main merged to production as 5c842d4, deployed, and only then was this run.
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
-- EXPECTED RESULT (as observed on the single real run, 31 Aug 2026)
--   Exactly 1 row returned, status 'job_waiting', every other returned column
--   NULL. That run has happened. Anyone executing this file again today gets
--   0 rows, which is correct and expected — see the banner at the top. Never
--   remove the guard to force a match.
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

-- Confirmed after the 31 Aug run: the lead reads status = 'job_waiting' with
-- every other returned column NULL, and it appears in the To Schedule rail as a
-- job awaiting booking — useLeadsToSchedule.ts admits job_waiting
-- unconditionally, with no assigned_to or date predicate.

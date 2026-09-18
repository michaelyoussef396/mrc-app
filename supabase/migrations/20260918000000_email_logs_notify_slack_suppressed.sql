-- ============================================================================
-- NOT APPLIED. Michael applies; DEV project ctppzqnysmzynkxjlzta first, PROD after.
-- 20260918000000_email_logs_notify_slack_suppressed.sql
--
-- PURPOSE
-- -------
-- Make email_logs_notify_slack() tell the truth about a `suppressed` row.
--
-- Today the function has two branches: 'failed', and everything else rendered as
-- "<label> sent | <recipient>" with an 'email_sent' fan-out at normal priority. A
-- `suppressed` row is a send that was blocked before Resend ever saw it, so under the
-- current body the operator is told the confirmation went out when it did not — which
-- is P0-14 reproduced inside the notification itself. This adds a third branch:
--
--   Slack     "<label> SUPPRESSED | <recipient> | <reason>"   (reason = error_message)
--   in-app    type 'email_suppressed', title "<label> SUPPRESSED", priority 'high'
--
-- High, not normal: a suppressed booking confirmation is the alert, not noise.
--
-- SCOPE
-- -----
-- Replaces the body of public.email_logs_notify_slack() and nothing else. No table,
-- column, index, RLS policy or trigger binding is touched. The trigger binding
-- (email_logs_after_insert_slack, created in 20260527023540) is deliberately NOT
-- re-stated: CREATE OR REPLACE FUNCTION swaps the body under the existing binding, and
-- re-stating CREATE TRIGGER would double-bind. Same precedent as 20260813115000 and
-- 20260823090000.
--
-- PRESERVED BYTE-FOR-BYTE from 20260823090000_notifications_fan_out.sql:212-299 — the
-- Vault lookup, the ADDED 2026-08-13 system-send filter, the _label CASE, the
-- net.http_post call, and the EXCEPTION WHEN OTHERS handler with its RETURN NEW
-- guarantee that a notification failure can never roll back the email_logs INSERT that
-- fired this trigger. The only changes are the two blocks marked ADDED 2026-09-18.
--
-- APPLY ORDER — both halves matter
-- --------------------------------
--   1. 20260912000000_email_logs_suppressed_status.sql  (also still NOT APPLIED)
--   2. this file
--   3. the send-email Edge Function deploy
-- Per project, DEV fully before PROD (E-Q3, 2026-09-15). Step 1 is a hard prerequisite,
-- not a preference: until the CHECK admits 'suppressed' no such row can be written, so
-- this function's new branch is unreachable and the EF's suppression insert fails 23514.
-- send-email deploys are global-immediate, so deploying the function before the
-- migration on a project throws live throttled requests at the missing constraint value.
--
-- BEFORE APPLYING — verify the live body is the one this file assumes
-- -------------------------------------------------------------------
-- This is CREATE OR REPLACE over a function that reached PROD by hand. The migration
-- ledger is not reliable evidence of what is live, so read the live definition first and
-- confirm it matches 20260823090000 — an unrecorded live edit would be silently
-- discarded by this replace:
--
--   SELECT pg_get_functiondef(p.oid)
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'email_logs_notify_slack';
--
-- Expect the 2026-08-13 filter and the 2026-08-23 fan-out PERFORM, and nothing else
-- unfamiliar. Anything unexpected: STOP, do not apply, bring the definition back.
--
-- ROLLBACK (manual)
-- -----------------
-- Re-apply SECTION 2 of 20260823090000_notifications_fan_out.sql verbatim — that file's
-- exact CREATE OR REPLACE FUNCTION public.email_logs_notify_slack() body. It restores
-- the pre-migration definition exactly; nothing else here is changed, and the trigger
-- binding is untouched either way, so it needs no rollback step.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.email_logs_notify_slack()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  _label TEXT;
  _msg TEXT;
  _secret TEXT;
BEGIN
  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'internal_webhook_secret';

  IF _secret IS NULL THEN
    RAISE WARNING 'email_logs_notify_slack: internal_webhook_secret not found in Vault';
    RETURN NEW;
  END IF;

  -- ADDED 2026-08-13 — system-originated sends are logged, not announced.
  -- Success is noise (the lead already produced its own Slack post, and the
  -- record is the email_logs row itself); failure still posts below.
  IF NEW.template_name IN ('framer_lead_confirmation', 'inspection_reminder')
     AND NEW.status <> 'failed' THEN
    RETURN NEW;
  END IF;

  _label := CASE NEW.template_name
    WHEN 'report-approved'           THEN 'Inspection report'
    WHEN 'job_report_sent'           THEN 'Job report'
    WHEN 'booking-confirmation'      THEN 'Booking confirmation'
    WHEN 'job-booking-confirmation'  THEN 'Job booking confirmation'
    WHEN 'google_review_request'     THEN 'Google review request'
    WHEN 'inspection_reminder'       THEN 'Inspection reminder'
    WHEN 'framer_lead_confirmation'  THEN 'Lead confirmation'
    ELSE COALESCE(NEW.template_name, 'Email')
  END;

  IF NEW.status = 'failed' THEN
    _msg := _label || ' FAILED | '
      || COALESCE(NEW.recipient_email, '?')
      || COALESCE(' | ' || LEFT(NEW.error_message, 150), '');
  -- ADDED 2026-09-18 — a suppressed row never reached Resend. The ELSE below would
  -- render it "sent", which is the P0-14 failure repeated in the notification: the
  -- operator is told a confirmation went out when it did not. error_message holds the
  -- reason the send was blocked and is the only new field shown.
  ELSIF NEW.status = 'suppressed' THEN
    _msg := _label || ' SUPPRESSED | '
      || COALESCE(NEW.recipient_email, '?')
      || COALESCE(' | ' || LEFT(NEW.error_message, 150), '');
  ELSE
    _msg := _label || ' sent | '
      || COALESCE(NEW.recipient_email, '?');
  END IF;

  -- apikey header is required by the Supabase API gateway for project
  -- routing, even with verify_jwt=false. This is the publishable anon
  -- key (already public in every client bundle).
  PERFORM net.http_post(
    url := 'https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-slack-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjeWl2cnhqcHNtam1leHFhdHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODQwNTgsImV4cCI6MjA4MDg0NDA1OH0.Koy5QOR5uAMuXEGxtHuDQCJ_gGGcLrGG07bJXkb3EAQ',
      'x-internal-secret', _secret
    ),
    body := jsonb_build_object(
      'event', 'custom',
      'leadId', NEW.lead_id::text,
      'message', _msg
    )
  );

  -- ADDED 2026-08-23 — mirror the Slack post as an in-app notification for
  -- every admin/technician. Same template-suppression semantics as Slack:
  -- this line is unreachable for a suppressed framer_lead_confirmation /
  -- inspection_reminder success, because the RETURN NEW above already exited
  -- the function for that case. type/title/priority mirror _label/_msg
  -- exactly so the in-app copy never says something Slack didn't.
  PERFORM public.fan_out_notification(
    -- ADDED 2026-09-18 — third arm, mirroring the Slack branch above exactly. 'high'
    -- because a suppressed booking confirmation is the alert, not noise: nobody else
    -- will notice the customer was never written to.
    p_type => CASE WHEN NEW.status = 'failed' THEN 'email_failed'
                   WHEN NEW.status = 'suppressed' THEN 'email_suppressed'
                   ELSE 'email_sent' END,
    p_title => CASE WHEN NEW.status = 'failed' THEN _label || ' FAILED'
                    WHEN NEW.status = 'suppressed' THEN _label || ' SUPPRESSED'
                    ELSE _label || ' sent' END,
    p_message => _msg,
    p_lead_id => NEW.lead_id,
    p_priority => CASE WHEN NEW.status IN ('failed', 'suppressed') THEN 'high'
                       ELSE 'normal' END,
    p_related_entity_type => 'email_log',
    p_related_entity_id => NEW.id
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'email_logs_notify_slack failed: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

COMMIT;

-- =============================================================================
-- AFTER — run every one of these on the project just applied, before moving on
-- =============================================================================

-- A1 · The 2026-09-18 addition is live. Exactly one row, and the value must be t.
--   SELECT pg_get_functiondef(p.oid) LIKE '%ADDED 2026-09-18%' AS renders_suppressed
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'email_logs_notify_slack';
--   DEV and PROD expect : t
--   f ⇒ the replace did not take and a suppressed row is still announced as "sent".
--       STOP; do not deploy the send-email function on this project.
--   0 rows ⇒ the function is gone. STOP and restore from 20260823090000.

-- A2 · Both predecessors survived — THE "nothing else changed" PROOF. This is what
--      says the Vault lookup, the system-send filter, net.http_post and the EXCEPTION
--      handler came through the replace intact rather than being dropped by it.
--   SELECT pg_get_functiondef(p.oid) LIKE '%ADDED 2026-08-13%' AS keeps_system_filter,
--          pg_get_functiondef(p.oid) LIKE '%ADDED 2026-08-23%' AS keeps_fan_out
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'email_logs_notify_slack';
--   DEV and PROD expect : t | t
--   Either f ⇒ this file was applied over a body that was NOT 20260823090000, and an
--       earlier migration's behaviour has just been silently reverted. STOP and read
--       the "BEFORE APPLYING" note at the head of this file.

-- A3 · The trigger binding is untouched. This file re-states no CREATE TRIGGER, so the
--      list must be identical to what it was before.
--   SELECT tgname FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid
--   WHERE c.relname = 'email_logs' AND NOT tg.tgisinternal;
--   DEV and PROD expect : email_logs_after_insert_slack, and nothing removed.

-- A4 · Readiness for step 3. 'suppressed' must already be a legal status, or the
--      send-email deploy writes rows the CHECK rejects with 23514.
--      Scoped to the status constraint BY NAME on purpose. `contype = 'c'` alone returns one
--      row per CHECK on the table, and email_logs carries at least two — the status CHECK and
--      email_logs_valid_email_check (20251111000017_add_missing_constraints.sql:288-299) — so
--      an unscoped read emits t AND f on a correctly-prepared project and the STOP below
--      misfires on a good apply.
--   SELECT pg_get_constraintdef(oid) LIKE '%suppressed%' AS admits_suppressed
--   FROM pg_constraint
--   WHERE conrelid = 'public.email_logs'::regclass
--     AND conname = 'email_logs_status_check';
--   DEV and PROD expect : exactly one row, t
--   f ⇒ 20260912000000 has not been applied to this project. STOP; apply it first.
--   0 rows ⇒ the status CHECK is not named email_logs_status_check on this project. That is
--       E-Q4's open question and it bites twice: 20260912000000 drops that constraint BY NAME
--       with no IF EXISTS, so it aborts too. Establish the real name before applying either
--       file. Do not guess it.

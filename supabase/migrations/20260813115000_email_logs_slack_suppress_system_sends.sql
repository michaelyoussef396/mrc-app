-- Migration: suppress the Slack success post for system-originated email
-- Created: 2026-08-13
--
-- WHY
-- ---
-- email_logs_notify_slack() posts to Slack on every email_logs INSERT. Two
-- templates are written by system code paths with no user JWT:
--
--   framer_lead_confirmation  — receive-framer-lead, one per inbound lead
--   inspection_reminder       — send-inspection-reminder, hourly cron
--
-- Neither has ever reached this trigger: email_logs.sent_by carried a FK to
-- auth.users, the SYSTEM_USER_UUID sentinel is not a row there, so every
-- system insert was rejected 23503 and the table sat empty all-time. Dropping
-- that FK (20260813120000) makes these inserts land — and makes this trigger
-- fire for them for the first time.
--
-- On success that post is pure noise. receive-framer-lead already sends its
-- own "New Lead Received" message per lead, so a second one asserting the
-- confirmation email went out duplicates a notification the admin just read;
-- and the fact itself now lives in email_logs, which is the point of the FK
-- drop. Nobody needs to be interrupted to learn that a routine automated
-- email did what it always does.
--
-- On failure it is the only signal. "Lead confirmation FAILED | <email>"
-- means a customer who filled in the form never got an acknowledgement, and
-- that does need a human. So the filter is success-only: 'failed' still posts
-- for both templates, unchanged.
--
-- SCOPE: replaces the body of email_logs_notify_slack() only. The trigger
-- binding (email_logs_after_insert_slack), the table, and every other
-- function are untouched. The Vault lookup, the net.http_post call and the
-- EXCEPTION WHEN OTHERS handler — including its RETURN NEW guarantee that a
-- Slack failure can never block the email_logs row — are preserved verbatim.
-- The only addition is the seven-line filter block marked below.

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

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'email_logs_notify_slack failed: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

-- Verify the filter is present in the live definition (expect 1):
--   SELECT count(*) FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'email_logs_notify_slack'
--     AND pg_get_functiondef(p.oid) LIKE '%ADDED 2026-08-13%';
--
-- Verify the trigger binding is unchanged (expect email_logs_after_insert_slack):
--   SELECT tgname FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid
--   WHERE c.relname = 'email_logs' AND NOT tg.tgisinternal;
--
-- Rollback: re-run this file with the ADDED 2026-08-13 block deleted. That
-- restores the pre-migration definition exactly; nothing else in the function
-- was changed.

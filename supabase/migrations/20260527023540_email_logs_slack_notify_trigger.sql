-- Async Slack notification on every email_logs INSERT.
-- Uses pg_net + shared secret from Vault to authenticate
-- to the send-slack-notification Edge Function.
--
-- Prerequisites (must be done BEFORE applying this migration):
--   1. INTERNAL_WEBHOOK_SECRET stored in Supabase secrets (EF env var)
--   2. Same secret stored in Vault as 'internal_webhook_secret'
--   3. send-slack-notification EF deployed with dual-path auth + custom event
--   4. Manual SQL test confirmed 200 + Slack fires
--
-- Safety: EXCEPTION WHEN OTHERS wraps entire body. Failure here
-- CANNOT roll back the email_logs INSERT.

CREATE OR REPLACE FUNCTION public.email_logs_notify_slack()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $$
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
$$;

CREATE TRIGGER email_logs_after_insert_slack
  AFTER INSERT ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.email_logs_notify_slack();

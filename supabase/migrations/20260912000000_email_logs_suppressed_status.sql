-- NOT APPLIED. Michael applies; DEV project ctppzqnysmzynkxjlzta.
-- P0-14: permit a distinct audit status for sends blocked before Resend.
-- Only extends the original email_logs status CHECK; all prior values remain.
BEGIN;
ALTER TABLE public.email_logs
  DROP CONSTRAINT email_logs_status_check,
  ADD CONSTRAINT email_logs_status_check CHECK (status IN (
    'pending', 'sent', 'delivered', 'bounced', 'soft_bounce',
    'failed', 'spam', 'unsubscribed', 'suppressed'
  ));
COMMIT;

-- Daily cron: check-overdue-invoices at 23:00 UTC (9:00 AM AEST)
-- Mirrors the pattern from 20260218000003_create_reminder_cron_job.sql

SELECT cron.schedule(
  'check-overdue-invoices',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/check-overdue-invoices',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

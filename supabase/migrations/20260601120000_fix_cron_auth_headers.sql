-- Re-issues check-overdue-invoices + send-inspection-reminders crons WITH an
-- Authorization header. Both EFs require JWT at the gateway; the originals sent none,
-- so every firing 401'd. Reads service_role from Vault by name.
-- PREREQUISITE (human, Studio → Project Settings → Vault — NOT in this file):
--   secret name 'service_role_key' = current service_role JWT.

SELECT cron.unschedule('check-overdue-invoices');
SELECT cron.unschedule('send-inspection-reminders');

SELECT cron.schedule('check-overdue-invoices', '0 23 * * *', $$
  SELECT net.http_post(
    url := 'https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/check-overdue-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('send-inspection-reminders', '0 * * * *', $$
  SELECT net.http_post(
    url := 'https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);

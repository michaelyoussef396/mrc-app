SELECT cron.schedule(
  'send-inspection-reminders',
  '0 * * * *',  -- every hour at :00
  $$
  SELECT net.http_post(
    url := 'https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

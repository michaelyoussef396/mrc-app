-- STEP 2 · PRE-APPLY reads for DEV (ctppzqnysmzynkxjlzta — sandbox). All read-only. One block at a time.

-- D14 ⛔ Ownership. The ALTER/COMMENT/LOCK need it, and GUARD 1 only reads the whole table as owner
--        (rls_forced = false + the auth.uid() policy would show a non-owner ZERO rows and pass GUARD 1 vacuously).
--        Expect is_owner = true.
SELECT tableowner, current_user, (tableowner = current_user) AS is_owner
FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_bookings';

-- D15 (informational) PostgREST auto-reload event triggers. Expect 2 rows, evtenabled = 'O'.
--        Present ⇒ 0a's COMMIT reloads the API schema cache on its own; no NOTIFY needed.
SELECT evtname, evtevent, evtenabled
FROM pg_event_trigger
WHERE evtname IN ('pgrst_ddl_watch', 'pgrst_drop_watch')
ORDER BY evtname;

-- D16 (informational) Live body of the reminder trigger function. D5 showed the enum has NO 'no_show',
--        yet the repo body compares status to 'no_show' — inserts work on DEV, so the live body must differ.
--        Not a gate for 0a (an ALTER fires no row trigger). Paste it; it settles the drift question.
SELECT pg_get_functiondef('public.set_reminder_scheduled_for'::regproc);

-- D17 ⛔ (for step 5 planning) The addresses the 0b rehearsal WILL email on the first invoke.
--        D13 said pending_sendable_now = 2. Any address you do not control ⇒ we repoint on DEV before invoking.
SELECT cb.id AS booking_id, cb.lead_id, cb.start_datetime, cb.reminder_scheduled_for,
       cb.reminder_sent, cb.status, l.full_name, l.email
FROM public.calendar_bookings cb
JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.reminder_sent = false AND cb.status = 'scheduled'
  AND cb.reminder_scheduled_for <= now()
  AND l.email IS NOT NULL AND l.email <> ''
ORDER BY cb.start_datetime;

-- D18 (for finding 1b) What PROD actually answered DEV's hourly cron. pg_net keeps responses ~6 h.
--        status_code 401 ⇒ DEV's Vault key is rejected at PROD's gateway (noise only, PROD's function never runs).
--        status_code 200 with a JSON body like {"processed":..} ⇒ DEV's Vault holds a PROD-valid key and IS triggering PROD.
SELECT id, status_code, content_type, left(content, 300) AS body, error_msg, created
FROM net._http_response
ORDER BY id DESC
LIMIT 10;

-- D18b · Did DEV's cron even run recently? (status here = the SQL ran, i.e. the POST was queued; not the HTTP result)
SELECT runid, jobid, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

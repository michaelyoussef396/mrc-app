# STEP 3 — 0b `send-inspection-reminder` on DEV (`ctppzqnysmzynkxjlzta`, sandbox)

Pre-condition: step 2 A1–A8 passed on DEV (A2 = `3 · 3 · 0`, A7 = `1 · 3`).
Run blocks in order. Paste every output back. `$SCR` is a throwaway directory — nothing here writes to any git worktree.

```bash
export SCR=~/ef-scratch && mkdir -p $SCR && echo "scratch: $SCR"
npx supabase --version          # record V — use the same CLI for every later step (PROD included)
```

## 3.1 · DEV secrets + function inventory (read-only; names and digests only, never values)

```bash
npx supabase secrets list --project-ref ctppzqnysmzynkxjlzta
```
Need present: `RESEND_API_KEY` (else the invoke returns 500 before touching bookings — rehearsal proves nothing), `SYSTEM_USER_UUID` (else `email_logs.sent_by` is NULL on DEV and 6.4 is PROD-only). Also note whether `GOOGLE_MAPS_API_KEY`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT` exist — needed for 0c.

```bash
npx supabase functions list --project-ref ctppzqnysmzynkxjlzta --output json > $SCR/dev-functions-before.json && cat $SCR/dev-functions-before.json
```
Record `send-inspection-reminder` and `calculate-travel-time`: `version`, `verify_jwt`, `updated_at`. (The deploy re-asserts `verify_jwt = true` from `config.toml`; if DEV shows `false` today it will flip — harmless on DEV.)

## 3.2 · Capture what DEV is running NOW — the rollback artefact

```bash
mkdir -p $SCR/0b-before-dev
npx supabase functions download send-inspection-reminder --project-ref ctppzqnysmzynkxjlzta --use-api --workdir $SCR/0b-before-dev
find $SCR/0b-before-dev -type f | sort
git hash-object $SCR/0b-before-dev/supabase/functions/send-inspection-reminder/index.ts
```
**RESULT 2026-08-31: `fab3d39a140ec018aaecc2f70ba8cc00ba61ea97`** — NOT `bf95002f`. That is the exact blob at commit `c9761b6` (2026-08-08 19:01 AEST), deployed to DEV 19 minutes later and never redeployed. DEV is **one commit behind** main/production; the missing commit is `98fed73` "harden email_logs insert with error checking".

Two consequences, both recorded rather than worked around:
1. **The DEV rollback target is `fab3d39a`, not `bf95002f`** — captured on disk at `~/ef-scratch/0b-before-dev/`. If a rollback is ever needed on DEV, prefer redeploying `bf95002f` (main's) instead: restoring `fab3d39a` would re-introduce the unchecked `email_logs` insert. DEV is a sandbox; there is no reason to restore a worse state.
2. **Deploying 0b to DEV ships TWO commits**, not one: `98fed73` (the hardening) + `cf49ebf` (the group claim). Nothing is lost; `98fed73` is already on `main` and `production`.

⚠️ **The download also writes `supabase/.temp/cli-latest` and `supabase/.temp/linked-project.json` into the workdir.** SESSION 5 §5's pass criterion — "`git status --porcelain` prints nothing" — would read those as a FAIL and send the operator into a PROD rollback of a correct deploy. **Verify by `git hash-object` on the specific `index.ts`, never by tree cleanliness.**

✅ **Round-trip fidelity is PROVEN, not assumed.** The downloaded bytes hash to an exact historical git blob. A lossy unbundle could not land on a specific SHA-1 in this repo's history, so `functions download --use-api` returns the deployed source byte-for-byte and `hash-object` on it is a valid verification method. The whole download-and-verify strategy stands.

## 3.3 · Identity gate — `~/mrc-reminder-ef` only (never `~/mrc-app-prod`, never `~/mrc-merge` — both carry the OLD 0b blob)

```bash
git -C ~/mrc-reminder-ef rev-parse --show-toplevel
#  EXPECT /Users/michaelyoussef/mrc-reminder-ef
git -C ~/mrc-reminder-ef merge-base --is-ancestor cf49ebfe2f62abc6a1e62129dd458550dc6c1b72 HEAD && echo "ANCESTOR OK"
#  EXPECT ANCESTOR OK
git -C ~/mrc-reminder-ef status --porcelain --untracked-files=all -- supabase/
#  EXPECT no output (config.toml, functions/, _shared/ all clean)
ls ~/mrc-reminder-ef/supabase/functions/send-inspection-reminder/
#  EXPECT index.ts only
git -C ~/mrc-reminder-ef hash-object supabase/functions/send-inspection-reminder/index.ts
#  EXPECT 6df442b819e70c27d92704bd4f5ccc513b906b49   ← THE identity
git -C ~/mrc-reminder-ef hash-object supabase/config.toml
#  EXPECT ce718aa0578ea180dbd6571a6932b91f4c942129
```
All six must match. Do not deploy on five.

## 3.4 · Pre-deploy SQL on DEV (Studio, read-only, one block at a time)

P-E1 — a reminder the OLD code released inside Resend's 24 h idempotency window (the only transition hazard of re-keying). Expect 0 rows.
```sql
SELECT cb.id AS booking_id, cb.lead_id, el.sent_at AS failed_attempt_at, el.error_message
FROM public.calendar_bookings cb
JOIN public.leads l ON l.id = cb.lead_id
JOIN public.email_logs el
  ON el.lead_id = cb.lead_id
 AND el.template_name = 'inspection_reminder'
 AND el.status = 'failed'
 AND el.sent_at > now() - interval '24 hours'
WHERE cb.reminder_sent = false AND cb.status = 'scheduled'
  AND cb.reminder_scheduled_for <= now()
  AND l.email IS NOT NULL AND l.email <> '';
```

P-E2 — what the first invoke will do (already known: 2 / 0 / 2 — re-run to confirm nothing moved). Must be < 150.
```sql
SELECT count(*) FILTER (WHERE l.email IS NOT NULL AND l.email <> '') AS pending_sendable_now,
       count(*) FILTER (WHERE l.email IS NULL OR l.email = '')       AS pending_no_email_never_clears,
       count(*)                                                      AS pending_as_ef_sees_it
FROM public.calendar_bookings cb
LEFT JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.reminder_sent = false AND cb.status = 'scheduled'
  AND cb.reminder_scheduled_for <= now() AND cb.lead_id IS NOT NULL;
```

Env sanity — no FK left on `email_logs.sent_by` (a forked-history DEV could still have it; it would make 6.3/6.4 empty for an env reason). Expect no constraint mentioning `sent_by`.
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.email_logs'::regclass AND contype = 'f';
```

Slack side-effect — a FAILED send on DEV fires the `email_logs` Slack trigger, which posts to PROD's `send-slack-notification` with a Vault webhook secret. Names only:
```sql
SELECT name, created_at, updated_at FROM vault.secrets ORDER BY name;
```
```sql
SELECT position('ecyivrxjpsmjmexqatym' IN pg_get_functiondef('public.email_logs_notify_slack'::regproc)) > 0 AS posts_to_prod;
```
Successes are suppressed for system sends; only a failure would post — and it would show the DEV recipient address. Acceptable residual risk once `RESEND_API_KEY` is confirmed present.

## 3.5 · Deploy to DEV

```bash
cd ~/mrc-reminder-ef && npx supabase functions deploy send-inspection-reminder --project-ref ctppzqnysmzynkxjlzta --use-api
```
Record the reported version. It is a log line, not verification.

## 3.6 · Verify by download-and-hash (no git writes)

```bash
mkdir -p $SCR/0b-after-dev $SCR/expected
git -C ~/mrc-app-1 cat-file blob 6df442b819e70c27d92704bd4f5ccc513b906b49 > $SCR/expected/0b-index.ts
npx supabase functions download send-inspection-reminder --project-ref ctppzqnysmzynkxjlzta --use-api --workdir $SCR/0b-after-dev
find $SCR/0b-after-dev -type f | sort
git hash-object $SCR/0b-after-dev/supabase/functions/send-inspection-reminder/index.ts
#  PASS = 6df442b819e70c27d92704bd4f5ccc513b906b49
cmp $SCR/expected/0b-index.ts $SCR/0b-after-dev/supabase/functions/send-inspection-reminder/index.ts && echo "BYTE-IDENTICAL"
```
If the hash differs: `diff -u $SCR/expected/0b-index.ts $SCR/0b-after-dev/supabase/functions/send-inspection-reminder/index.ts | head -40` and paste — a CRLF/banner artefact is a tooling note, a code difference is a FAIL.
```bash
npx supabase functions list --project-ref ctppzqnysmzynkxjlzta --output json > $SCR/dev-functions-after.json && cat $SCR/dev-functions-after.json
#  send-inspection-reminder: version +1, verify_jwt unchanged
```

## 3.7 · Behaviour on DEV (this is what the rehearsal is for)

Shell key — DEV's `service_role` from DEV Studio → Project Settings → API. Never echo it.
```bash
read -rs SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY && echo set
python3 -c 'import os,base64,json;t=os.environ.get("SUPABASE_SERVICE_ROLE_KEY","");p=t.split(".")[1] if t.count(".")==2 else "";d=json.loads(base64.urlsafe_b64decode(p+"="*(-len(p)%4))) if p else {};print("ref=",d.get("ref"),"role=",d.get("role"))'
#  EXPECT ref= ctppzqnysmzynkxjlzta role= service_role   — anything else ⇒ STOP, do not curl
```

6.1 — invoke DEV (both pending rows go to your own inboxes per D17):
```bash
curl -s -w '\nHTTP %{http_code}\n' -X POST https://ctppzqnysmzynkxjlzta.supabase.co/functions/v1/send-inspection-reminder \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -d '{}'
```
Expect HTTP 200 and `{"processed":2,"groups":2,"sent":2,"failed":0,"skipped":0,"alreadyClaimed":0,"released":0}`. ⛔ `processed` must equal `groups`. If it returns `Failed to query bookings … booking_group_id does not exist` within seconds of the 0a apply, the API schema cache is still reloading — wait 10 s and re-curl; do not redeploy.

6.2 — one claim per group. Expect zero rows.
```sql
SELECT booking_group_id, count(DISTINCT reminder_sent_at) AS distinct_claim_times
FROM public.calendar_bookings
WHERE reminder_sent = true AND booking_group_id IS NOT NULL
GROUP BY booking_group_id HAVING count(DISTINCT reminder_sent_at) > 1;
```

6.3 (corrected) — one real email per lead+subject. Expect zero rows.
```sql
SELECT lead_id, subject,
       count(*) FILTER (WHERE status = 'sent')                            AS sent_rows,
       count(DISTINCT provider_message_id) FILTER (WHERE status = 'sent') AS distinct_messages
FROM public.email_logs
WHERE template_name = 'inspection_reminder' AND sent_at > now() - interval '7 days'
GROUP BY lead_id, subject
HAVING count(DISTINCT provider_message_id) FILTER (WHERE status = 'sent') > 1;
```

6.4 — attribution + what actually happened. Expect 2 rows, `status = 'sent'`, `sent_by = a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f` (only if SYSTEM_USER_UUID exists on DEV).
```sql
SELECT sent_by, template_name, status, recipient_email, provider_message_id, left(error_message,150) AS err, sent_at
FROM public.email_logs WHERE template_name = 'inspection_reminder'
ORDER BY sent_at DESC LIMIT 5;
```
```sql
SELECT id, booking_group_id, status, reminder_sent, reminder_sent_at
FROM public.calendar_bookings ORDER BY start_datetime;
```

6.5 — idempotency: run the 6.1 curl again immediately. Expect `{"processed":0,"sent":0,"failed":0,"message":"No pending reminders"}`. Then re-run 6.3: still zero rows. Check both inboxes: exactly one email each.

## 3.8 · What DEV cannot rehearse

DEV's cron calls PROD, so the hourly-tick path is not exercised here — only the manual invoke. The `Processing 2 booking row(s) in 2 group(s)` line should appear in DEV → Edge Functions → send-inspection-reminder → Logs for the 6.1 call.

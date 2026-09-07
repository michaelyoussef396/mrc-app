# STEPS 5–6 — 0b + 0c on PROD (`ecyivrxjpsmjmexqatym`, **LIVE**)

> **Target for every command in this document: `ecyivrxjpsmjmexqatym` — PROD. The LIVE project behind mrcsystem.com. Real customer email, real customer data. Edge Function deploys are global-immediate: no preview, no branch, no staging buffer, no automatic rollback.**
>
> Per `CLAUDE.md`, say that aloud and confirm before each `deploy` command. Never infer the ref.

**Pre-conditions.** Step 3 (0b on DEV) and the 0c DEV rehearsal both passed. Step 4 (PROD pre-flight + 0a applied on PROD) passed — §5.1 P-B/P-C/P-D re-gate it here anyway, in this sitting, not from memory.

**Shape.** Same as `docs/multi-tech/deploy/step3-0b-DEV.md`: run blocks in order, paste every output back. `$SCR` is a throwaway directory — **nothing in this document writes to any git worktree.** No `git worktree add`, no `git checkout`, no download into a tree you are verifying.

**0b and 0c are independent.** Either order is safe. 0b carries a timing gate (§5.2); 0c does not. Both must be live before Step 1 (the fan-out migration).

---

# PART A — SHARED PRE-FLIGHT (both functions)

## A.1 · Scratch dir + CLI pin

```bash
export SCR=~/ef-scratch-prod && mkdir -p $SCR/expected && echo "scratch: $SCR"
npx supabase --version
```

⛔ **Must be the same version V used for the DEV rehearsal.** The DEV round-trip proved that *this* CLI's `deploy --use-api` → `download --use-api` is byte-identical. A different CLI can introduce a formatting difference that looks like a wrong upload and burns an hour.

Pull the expected bytes out of git once, read-only, for every later `cmp`:

```bash
git -C ~/mrc-app-1 cat-file blob 6df442b819e70c27d92704bd4f5ccc513b906b49 > $SCR/expected/0b-new.ts
git -C ~/mrc-app-1 cat-file blob bf95002f7bfd76506c3fc71783fb35e59681e1f3 > $SCR/expected/0b-old.ts
git -C ~/mrc-app-1 cat-file blob afc363caae3464e61f8670b9155dabc23e2bc258 > $SCR/expected/0c-new.ts
git -C ~/mrc-app-1 cat-file blob 897042d76a41e674deaf113c2bccb3c5f00927bb > $SCR/expected/0c-old.ts
git -C ~/mrc-app-1 cat-file blob fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6 > $SCR/expected/shared-errorReporting.ts
ls -l $SCR/expected
```

## A.2 · PROD secrets — names and digests only, never values

```bash
npx supabase secrets list --project-ref ecyivrxjpsmjmexqatym
```

- **0b needs:** `RESEND_API_KEY` (absent ⇒ every send fails), `SYSTEM_USER_UUID` (absent ⇒ `email_logs.sent_by` is NULL and §5.8.3 has nothing to assert).
- **0c needs:** `GOOGLE_MAPS_API_KEY`. **Presence is not validity** — the PROD key was recorded EXPIRED on 2026-08-27 (`project_api_keys_rotated`). An expired key makes `calculate-travel-time` answer `source: "unavailable"` with `travel_time_minutes: null`; `day_schedule` is still populated, so 0c is still verifiable. §6.7 depends on which of the two you are in, so settle it there with the response, not with this listing.
- Note whether `SENTRY_DSN` / `SENTRY_ENVIRONMENT` exist — 0c reports through them.

## A.3 · Function inventory BEFORE — the baseline for "version +1"

```bash
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym --output json > $SCR/prod-functions-before.json
cat $SCR/prod-functions-before.json
```

Record for **both** `send-inspection-reminder` and `calculate-travel-time`: `version`, `verify_jwt`, `updated_at`.

### ⛔ A.3.1 — the `verify_jwt` hazard, read before you deploy anything

`supabase/config.toml` (blob `ce718aa0…`) declares `verify_jwt = false` for **only** `receive-framer-lead` and `send-slack-notification`. Neither function in this document has a section, so **every CLI deploy re-asserts the default `verify_jwt = true`.**

- If the listing already shows `true` for both: nothing changes. Proceed.
- If it shows **`false` for `send-inspection-reminder`**: the deploy will flip it to `true`, and from that moment PROD's own hourly cron must present a bearer PROD's gateway accepts. It almost certainly does (PROD's Vault entry is PROD-signed by construction, and TODO.md records the Vault auth header working) — but "almost certainly" is how a silent zero-reminder outage starts. **Before deploying, confirm PROD's own Vault bearer is a valid, unexpired, PROD-signed JWT** using the SF-5 §3 claims query (`SF-5-prod-credential-in-dev-vault.md`) run in **PROD** Studio: expect `ref_claim = ecyivrxjpsmjmexqatym` and `expires_at` in the future. The query prints claims only; it never selects the token.
- If it shows **`false` for `calculate-travel-time`**: the flip to `true` is harmless — every caller (`useGoogleMaps`, `useBookingValidation` ×2) already sends a Supabase key.

## A.4 · ⛔ SF-5 BRIEFING — PROD's reminder function is invoked TWICE every hour, and that is expected

DEV's `cron.job` rows 3 and 4 POST to **PROD's** Edge Functions with a bearer taken from **DEV's** Vault, and PROD accepts it (observed live: DEV `net._http_response` id 1377, `200`, body `{"processed":1,"sent":0,"failed":0,"skipped":0,"alreadyClaimed":1,"released":0}` at 2026-08-30 09:00:00Z). Full write-up: `SF-5-prod-credential-in-dev-vault.md`. **It is unremediated, predates this work, and is out of scope tonight. Do not fix it mid-deploy.**

Consequence you will see with your own eyes in §5.8:

> **PROD → Edge Functions → `send-inspection-reminder` → Logs shows TWO invocations per hour at `:00`** — PROD's own cron and DEV's cron. One of them wins the claim and sends; the loser reports `alreadyClaimed ≥ 1, sent: 0`.
>
> **This is NOT fan-out. It is NOT `N ≠ M`. It is NOT a duplicate email.** Two invocations produce **one** email, because the claim is a single-statement compare-and-swap. §5.8.5 gives the queries that tell the two apart.

---

# PART B — STEP 5 · `send-inspection-reminder` (0b)

Deploys blob `6df442b819e70c27d92704bd4f5ccc513b906b49` (commit `cf49ebfe2f62abc6a1e62129dd458550dc6c1b72`, branch `fix/reminder-group-claim`).

## 5.1 · Studio pre-flight on PROD — read-only, one block at a time

Studio shows only the **last** result set of a multi-statement run. Every block below is runnable on its own. Run them that way.

**P-A ⛔ Confirm the project — never infer it.**
```sql
SELECT current_database(), current_user, inet_server_addr(), version();
```

**P-B ⛔ `booking_group_id` exists — gates D2 (the `42703` outage).**
```sql
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'calendar_bookings'
   AND column_name  = 'booking_group_id';
```
Expect exactly one row: `uuid | NO | gen_random_uuid()`. **Zero rows ⇒ STOP** — 0a is not applied to PROD; deploying now breaks every reminder run with `column calendar_bookings.booking_group_id does not exist` and no customer gets a 48-hour notice.

**P-C ⛔ No un-backfilled rows.**
```sql
SELECT count(*) AS null_group_rows
  FROM public.calendar_bookings
 WHERE booking_group_id IS NULL;
```
Expect `0`. Non-zero is not an automatic stop (those rows take the per-row fallback, correct for a single-row booking) but it means 0a's backfill was partial on PROD. Record the number and confirm each such row is a single-row booking before continuing.

**P-D Group shape — a two-row group must not exist yet.**
```sql
SELECT booking_group_id, count(*) AS rows_in_group
  FROM public.calendar_bookings
 WHERE booking_group_id IS NOT NULL
 GROUP BY booking_group_id
HAVING count(*) > 1;
```
Expect zero rows before Step 2. Rows here are not a stop for *this* deploy (the new code is the thing that handles them) but they mean a writer already fans out — find it before Step 1.

**P-E1 ⛔ Timing gate, part 1 — a failed attempt inside Resend's 24 h idempotency window.**
```sql
SELECT cb.id AS booking_id, cb.lead_id, el.sent_at AS failed_attempt_at, left(el.error_message,150) AS err
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
**Expect zero rows.** This is the one real transition hazard: 0b moves the Resend `Idempotency-Key` from the booking id to the group id. A reminder that failed transiently and released its claim before the deploy would retry afterwards under a **new** key — and if that failure was a false negative (Resend accepted, the response was lost), the retry sends a genuine duplicate. Rows here ⇒ wait out the 24 h window, or deal with those bookings deliberately.

**P-E2 ⛔ Timing gate, part 2 — what the function itself will see, mirrored exactly.**
```sql
SELECT count(*) FILTER (WHERE l.email IS NOT NULL AND l.email <> '') AS pending_sendable_now,
       count(*) FILTER (WHERE l.email IS NULL OR l.email = '')       AS pending_no_email_never_clears,
       count(*)                                                      AS pending_as_ef_sees_it
FROM public.calendar_bookings cb
LEFT JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.reminder_sent = false AND cb.status = 'scheduled'
  AND cb.reminder_scheduled_for <= now() AND cb.lead_id IS NOT NULL;
```
Three predicates plus `lead_id IS NOT NULL` — the function's query verbatim (`index.ts:272-291`).

- **`pending_as_ef_sees_it` must be `0` to deploy and to run the §5.7 invoke.** Non-zero ⇒ wait for the tick to drain, then re-run.
- `pending_sendable_now` **must be < 150** regardless: the claimed-group guard inlines one group id per pending row into a PostgREST `in.()` (`index.ts:348-361`), and that list rides in the URL. (Follow-up, not tonight: chunk the guard at 100.)

**The tick to watch — when the group claim actually gets exercised.**
```sql
SELECT cb.id, cb.lead_id, cb.booking_group_id, cb.reminder_scheduled_for, cb.start_datetime
FROM public.calendar_bookings cb
WHERE cb.reminder_sent = false AND cb.status = 'scheduled' AND cb.lead_id IS NOT NULL
  AND cb.reminder_scheduled_for > now()
ORDER BY cb.reminder_scheduled_for
LIMIT 10;
```
The first `reminder_scheduled_for` here is the first tick that will exercise send. Write it down — §5.8 is scheduled against it, and until it arrives PROD's logs will show ticks that print nothing at all. **That silence is correct, not a failure.**

## 5.2 · ⛔ TIMING GATE

The cron fires hourly at `:00` — and under SF-5, **twice** at `:00`. **Deploy between `:10` and `:50`.** Deploying into a live tick can leave a half-processed run split across two code versions.

## 5.3 · Capture the RUNNING source on PROD — this is the rollback artefact

The pinned "previous" blob is what the branch says PROD *should* be running. Only a download proves what it *is* running, and only the downloaded bytes can be redeployed with confidence.

```bash
mkdir -p $SCR/0b-before-prod
npx supabase functions download send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir $SCR/0b-before-prod
find $SCR/0b-before-prod -type f | sort
git hash-object $SCR/0b-before-prod/supabase/functions/send-inspection-reminder/index.ts
cmp $SCR/expected/0b-old.ts $SCR/0b-before-prod/supabase/functions/send-inspection-reminder/index.ts \
  && echo "RUNNING == production branch (bf95002f)"
```

**Expect `bf95002f7bfd76506c3fc71783fb35e59681e1f3`** (= `main` = `production`).
Any other hash: **paste it before going further.** PROD is running something that is not on `production`, the rollback story changes, and `$SCR/0b-before-prod/...` — not the git blob — becomes the artefact §5.9 redeploys.

## 5.4 · ⛔ IDENTITY GATE — `~/mrc-reminder-ef` ONLY

`functions deploy` uploads from the **current working directory**, ignoring the branch you think you are on. On 2026-08-26 that shipped stale EF code with a green CLI and an incremented version.

**⛔ Deploy 0b from `~/mrc-reminder-ef` and nowhere else.** `~/mrc-app-prod` (on `feat/area-hide-in-report-main` @ `54a60b9`), `~/mrc-merge` and `~/mrc-travel-ef` all carry the **OLD** 0b blob `bf95002f` — deploying 0b from any of them is a no-op redeploy of the bug.

```bash
git -C ~/mrc-reminder-ef rev-parse --show-toplevel
#  EXPECT /Users/michaelyoussef/mrc-reminder-ef
git -C ~/mrc-reminder-ef merge-base --is-ancestor cf49ebfe2f62abc6a1e62129dd458550dc6c1b72 HEAD && echo "ANCESTOR OK"
#  EXPECT ANCESTOR OK
git -C ~/mrc-reminder-ef status --porcelain --untracked-files=all -- supabase/
#  EXPECT no output at all
ls ~/mrc-reminder-ef/supabase/functions/send-inspection-reminder/
#  EXPECT index.ts only
git -C ~/mrc-reminder-ef hash-object supabase/functions/send-inspection-reminder/index.ts
#  EXPECT 6df442b819e70c27d92704bd4f5ccc513b906b49   ← THE identity
git -C ~/mrc-reminder-ef hash-object supabase/config.toml
#  EXPECT ce718aa0578ea180dbd6571a6932b91f4c942129
```

All six. **Do not deploy on five.** `send-inspection-reminder` imports nothing from `_shared/` (only `jsr:` and `esm.sh`), so `index.ts` + `config.toml` is the whole upload closure.

## 5.5 · Deploy — say it aloud first

> **Deploying `send-inspection-reminder` to `ecyivrxjpsmjmexqatym` — PROD, the LIVE mrcsystem.com project. This function sends real customer email. Global-immediate, no rollback window.**

Get explicit confirmation, then:

```bash
cd ~/mrc-reminder-ef && npx supabase functions deploy send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api
```

Record the reported version. **It is a log line, not verification.**

## 5.6 · Verify by download + hash + `cmp` — never by version number

```bash
mkdir -p $SCR/0b-after-prod
npx supabase functions download send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir $SCR/0b-after-prod
find $SCR/0b-after-prod -type f | sort
git hash-object $SCR/0b-after-prod/supabase/functions/send-inspection-reminder/index.ts
#  PASS = 6df442b819e70c27d92704bd4f5ccc513b906b49
cmp $SCR/expected/0b-new.ts $SCR/0b-after-prod/supabase/functions/send-inspection-reminder/index.ts \
  && echo "BYTE-IDENTICAL"
```

Mismatch ⇒ **STOP, do not run §5.7**, and paste:
```bash
diff -u $SCR/expected/0b-new.ts $SCR/0b-after-prod/supabase/functions/send-inspection-reminder/index.ts | head -40
```
A CRLF/banner artefact is a tooling note; a code difference is a FAIL → §5.9.

```bash
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym --output json > $SCR/prod-functions-after-0b.json
diff <(python3 -c "import json,sys;d=json.load(open('$SCR/prod-functions-before.json'));print('\n'.join(sorted(f\"{f['slug']} v{f.get('version')} jwt={f.get('verify_jwt')}\" for f in d)))") \
     <(python3 -c "import json,sys;d=json.load(open('$SCR/prod-functions-after-0b.json'));print('\n'.join(sorted(f\"{f['slug']} v{f.get('version')} jwt={f.get('verify_jwt')}\" for f in d)))")
```
**Expect exactly one changed line: `send-inspection-reminder` version +1, `verify_jwt` unchanged** (or the deliberate `false → true` flip you cleared in A.3.1). Any *other* function moving means the wrong thing was uploaded.

## 5.7 · The immediate invoke — what it proves, and what it does not

Take PROD's `service_role` JWT from PROD Studio → Project Settings → API. **Never paste a key into a chat window.**

```bash
read -rs SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY && echo set
python3 -c 'import os,base64,json;t=os.environ.get("SUPABASE_SERVICE_ROLE_KEY","");p=t.split(".")[1] if t.count(".")==2 else "";d=json.loads(base64.urlsafe_b64decode(p+"="*(-len(p)%4))) if p else {};print("ref=",d.get("ref"),"role=",d.get("role"))'
#  EXPECT ref= ecyivrxjpsmjmexqatym role= service_role  — anything else ⇒ STOP, do not curl
```

```bash
curl -s -w '\nHTTP %{http_code}\n' -X POST \
  https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -d '{}'
```

⛔ **Only run this while §5.1 P-E2 `pending_as_ef_sees_it = 0`.** With zero pending rows the function returns at `index.ts:300-306` before it groups, guards, claims or sends. **The only possible 200 body is:**

```json
{"processed":0,"sent":0,"failed":0,"message":"No pending reminders"}
```

(no `groups` field — that path is unchanged from the old code).

**What that proves:** the function booted, and the `select(... booking_group_id ...)` at `index.ts:272-291` succeeded — so the column exists on PROD, PostgREST's schema cache has it, and there is **no `42703`**. That is the D2 gate closed with live evidence.

**What it does NOT prove:** grouping, the claimed-group guard, the single-statement CAS claim, the group idempotency key, or any send. **None of the new logic runs on this path.** The group claim is proven only by §5.8, on the first tick with due work.

If it returns `{"error":"Failed to query bookings","details":"... booking_group_id does not exist ..."}` seconds after a fresh 0a apply, the API schema cache is still reloading — wait 10 s and re-curl. **Do not redeploy.**

If P-E2 was non-zero, **skip this invoke entirely** and let the cron do it — a manual invoke here sends real customer email outside its normal window.

## 5.8 · The first real tick — what to watch

Logs: PROD Studio → Edge Functions → `send-inspection-reminder` → Logs, at the `reminder_scheduled_for` you recorded in §5.1.

### 5.8.1 The baseline log line

```
Processing N booking row(s) in M group(s)
```
⛔ **N must equal M until Step 2 ships.** N > M means a two-row group already exists and P-D missed it. The line prints only on a tick with due work (`index.ts:378`); a quiet tick prints nothing and returns `No pending reminders`.

### 5.8.2 Group claim held — the strongest single assertion
```sql
SELECT booking_group_id, count(DISTINCT reminder_sent_at) AS distinct_claim_times
FROM public.calendar_bookings
WHERE reminder_sent = true AND booking_group_id IS NOT NULL
GROUP BY booking_group_id
HAVING count(DISTINCT reminder_sent_at) > 1;
```
⛔ **Zero rows.** One claim writes one timestamp to every row of a group; two distinct timestamps in one group means two claims ran, which is the duplicate-send condition. Run after every reminder window for the first week.

### 5.8.3 One real email per group — corrected detector
```sql
SELECT lead_id, subject,
       count(*) FILTER (WHERE status = 'sent')                            AS sent_rows,
       count(DISTINCT provider_message_id) FILTER (WHERE status = 'sent') AS distinct_messages
FROM public.email_logs
WHERE template_name = 'inspection_reminder' AND sent_at > now() - interval '7 days'
GROUP BY lead_id, subject
HAVING count(DISTINCT provider_message_id) FILTER (WHERE status = 'sent') > 1;
```
⛔ **Zero rows.** `count(*) > 1` is the wrong test: a retried failure and a `failed` row both inflate it without a customer ever seeing two emails. **Two distinct `provider_message_id`s with `status='sent'` for one `lead_id + subject` is a customer-visible duplicate and nothing else is.**

Do **not** use SESSION 1's R1 detector (`count(*) FILTER (WHERE reminder_sent) > 1` per group) after this deploy — the group claim deliberately sets `reminder_sent` on every row of a group, so it false-positives on correct behaviour. Also remember the pre-existing case that is **not** 0b: a lead re-booked without cancelling the old row gets a reminder for each date under old and new code alike.

### 5.8.4 Attribution unchanged (Bucket B)
```sql
SELECT sent_by, template_name, status, recipient_email, provider_message_id, left(error_message,150) AS err, sent_at
FROM public.email_logs
WHERE template_name = 'inspection_reminder'
ORDER BY sent_at DESC
LIMIT 5;
```
Expect `sent_by = a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f` (SYSTEM_USER_UUID), `status = 'sent'`.

### 5.8.5 ⛔ Two invocations per hour — telling SF-5 apart from fan-out

You will see two `send-inspection-reminder` invocations at `:00` in PROD's function logs, one reporting `alreadyClaimed ≥ 1, sent: 0` (either `Group <id>: another row in this group is already claimed, skipping send` or `Booking <id>: already claimed by another invocation, skipping send`). **That is DEV's cron, per A.4. Expected. Not fan-out.**

**Discriminator 1 — PROD's own outbound calls.** `net._http_response` records responses to requests made **by this project**. DEV's call is recorded on DEV, not here.
```sql
SELECT id, created, status_code, content::text AS run_summary
FROM net._http_response
WHERE created > now() - interval '6 hours'
ORDER BY created DESC
LIMIT 20;
```
**Exactly ONE reminder row per `:00` tick** (plus the 23:00 `check-overdue-invoices` row). One row here + two invocations in the logs = SF-5. Two rows here per tick = PROD is somehow calling itself twice, which is a different problem.

**Discriminator 2 — the cron side.**
```sql
SELECT j.jobid, j.jobname, j.schedule, d.status, d.start_time, left(d.return_message,200) AS msg
FROM cron.job_run_details d
JOIN cron.job j USING (jobid)
WHERE d.start_time > now() - interval '6 hours'
ORDER BY d.start_time DESC
LIMIT 20;
```
One `send-inspection-reminders` run per hour.

**Discriminator 3 — the one that actually matters: emails, per tick.**
```sql
SELECT date_trunc('hour', sent_at) AS tick_hour,
       count(*) FILTER (WHERE status = 'sent')                            AS sent_rows,
       count(DISTINCT provider_message_id) FILTER (WHERE status = 'sent') AS distinct_messages,
       count(*) FILTER (WHERE status = 'failed')                          AS failed_rows
FROM public.email_logs
WHERE template_name = 'inspection_reminder' AND sent_at > now() - interval '24 hours'
GROUP BY 1
ORDER BY 1 DESC;
```
**The doubled invocation adds zero rows here.** `sent_rows` equals the number of due groups for that hour, not twice it, and `sent_rows = distinct_messages`. If a tick ever shows `distinct_messages` above the number of due groups, that is a real duplicate → §5.9 and an incident review.

**Optional, read-only, on DEV** (`ctppzqnysmzynkxjlzta` — sandbox): DEV's `net._http_response` is a window onto PROD's run summaries without touching PROD. The first body carrying a `"groups"` field is independent confirmation that 0b is live on PROD.
```sql
SELECT id, created, status_code, content::text AS prod_run_summary
FROM net._http_response
WHERE created > now() - interval '6 hours'
ORDER BY created DESC
LIMIT 10;
```

### 5.8.6 Signal table

| Signal | Where | Means | Action |
|---|---|---|---|
| `Processing N booking row(s) in M group(s)` with **N > M** | logs | A two-row group exists before Step 2 | Investigate the writer; §5.8.2 + P-D |
| ⛔ `booking_group_id is NULL — falling back to per-row claim` | logs | **Cannot fire with 0a applied** (`NOT NULL`). If it prints, PROD's column is nullable or 0a is missing | Stop; re-run P-B / P-C |
| ⛔ `rows disagree on start_datetime/location_address` | logs | One group describes two different jobs/times; a retry could change the payload under one idempotency key → Resend 409 → reminder silently suppressed | Investigate that group immediately |
| ⛔ `Failed to check claimed groups` (HTTP 500) | curl / logs | Guard read failed; the run aborted rather than risk a duplicate. No email this tick | Recovers next tick. Persisting ⇒ PostgREST/DB |
| `Group <id>: … already claimed, skipping send` / `already claimed by another invocation` | logs | Working as designed — **and the normal SF-5 second invocation** | None |
| Zero reminders at all on a tick with due work | logs + 5.1 "tick to watch" | As bad as a duplicate | Check `42703` first (D2), then P-E2 |
| Duplicate in a customer inbox | Slack failure feed, customer reply, 5.8.3 | The thing this deploy prevents | §5.9, then incident review |

The D1 tripwire is **not** in these logs any more: with `booking_group_id NOT NULL DEFAULT gen_random_uuid()`, the NULL warning can never print. Its replacement is PostgREST/Postgres **`23502` on `calendar_bookings`** at the *write* path (`bookingService.ts:134-136` → visible booking failure, browser console, Sentry, Postgres logs). And neither tripwire catches D1's real failure mode after 0a — a fan-out writer supplying **two different non-NULL group ids** for one job-day, which is a perfectly valid insert. Only `N == M`, P-D, and SESSION 4's R1 (run **after** Step 2) detect that.

## 5.9 · Rollback 0b — manual, no platform support

Redeploy the bytes you captured in §5.3. **Not** a git checkout, **not** an edit to any worktree.

```bash
# sanity: the artefact is the pre-change source
git hash-object $SCR/0b-before-prod/supabase/functions/send-inspection-reminder/index.ts
#  EXPECT bf95002f7bfd76506c3fc71783fb35e59681e1f3 (or whatever §5.3 actually captured — that is the artefact)

cd $SCR/0b-before-prod && npx supabase functions deploy send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api

# verify the rollback exactly as you verified the deploy
mkdir -p $SCR/0b-rollback-check
npx supabase functions download send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir $SCR/0b-rollback-check
cmp $SCR/0b-before-prod/supabase/functions/send-inspection-reminder/index.ts \
    $SCR/0b-rollback-check/supabase/functions/send-inspection-reminder/index.ts && echo "ROLLBACK VERIFIED"
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym --output json > $SCR/prod-functions-after-rollback.json
```
(If `deploy` from `$SCR/0b-before-prod` refuses because there is no `supabase/config.toml` beside it, copy `~/mrc-reminder-ef/supabase/config.toml` — blob `ce718aa0…` — into `$SCR/0b-before-prod/supabase/` first and re-hash it before deploying.)

### Expiry rule

- **Safe before Step 1/2.** Every group has exactly one row, so the group claim and the per-row claim are equivalent; rolling back changes nothing observable.
- ⛔ **Not safe once a two-row group can exist.** After Step 1/2, rollback reinstates the duplicate-send bug. **Fix forward.**

### What rollback does NOT undo

- **Emails already sent cannot be recalled.** The one-way door.
- `reminder_sent` / `reminder_sent_at` set by the group claim stay set — and should: those customers were reminded.

If the rollback is because duplicates already went out: size the blast radius with 5.8.3 over a wider window, pull `provider_message_id`s as the evidence trail, and hand customer communication to Glen and Clayton. It is not an engineering decision.

---

# PART C — STEP 6 · `calculate-travel-time` (0c)

Deploys blob `afc363caae3464e61f8670b9155dabc23e2bc258` (branch `fix/travel-time-multitech`, also merged to local `main` @ `ee0a2f3`). No DB writes anywhere in this function; the rate limiter is in-memory.

## 6.1 · ⛔ The delta query — run BEFORE the deploy, so §6.7 predicts instead of diagnoses

0c widens two `leads`-side filters from `assigned_to = T` to `assigned_to = T OR id IN (leads named by T's own non-cancelled bookings on that Melbourne date)`. On one-technician data the second set is a subset of the first, so the result is unchanged — **except** for a booking assigned to T whose lead's `assigned_to` is NULL or someone else. HANDOFF §7 P3 measured that as `0` on DEV and **never measured it on PROD.**

**Run this before deploying.** Every row is a lead that will *newly appear* in that technician's day. Afterwards it is a prediction you check; without it, it is a regression you investigate.

**0c-P1 — the exact delta rows.**
```sql
SELECT cb.assigned_to                                              AS technician_id,
       (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date AS mel_date,
       cb.id                                                        AS booking_id,
       cb.status                                                    AS booking_status,
       l.id                                                         AS lead_id,
       l.full_name,
       l.assigned_to                                                AS lead_pointer,
       l.inspection_scheduled_date,
       l.scheduled_time,
       l.property_address_suburb
FROM public.calendar_bookings cb
JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.status <> 'cancelled'
  AND cb.assigned_to IS NOT NULL
  AND l.assigned_to IS DISTINCT FROM cb.assigned_to
  AND l.inspection_scheduled_date = (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date
ORDER BY mel_date, technician_id;
```
Both conditions are required: the booking must be the technician's, **and** the lead's `inspection_scheduled_date` must equal the booking's Melbourne date — the leads query still filters on that column, so a lead failing it stays invisible either way.

- **Zero rows ⇒ 0c is a provable no-op on today's PROD data.** Every number in §6.7 must be byte-identical to its baseline.
- **Rows ⇒ those exact (technician, date) pairs will read *busier* after the deploy.** That is the correction, not a regression. **There is no input for which this returns fewer appointments than the old code.**

**0c-P2 — the predicted UI numbers, per technician-day.**
```sql
WITH tech_dates AS (
  SELECT DISTINCT cb.assigned_to AS tech,
         (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date AS d
  FROM public.calendar_bookings cb
  WHERE cb.status <> 'cancelled' AND cb.assigned_to IS NOT NULL
),
booked_leads AS (
  SELECT cb.assigned_to AS tech,
         (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date AS d,
         cb.lead_id
  FROM public.calendar_bookings cb
  WHERE cb.status <> 'cancelled' AND cb.assigned_to IS NOT NULL AND cb.lead_id IS NOT NULL
)
SELECT t.tech, t.d,
       count(*) FILTER (WHERE l.assigned_to = t.tech) AS old_visible_appointments,
       count(*)                                       AS new_visible_appointments
FROM tech_dates t
JOIN public.leads l
  ON l.inspection_scheduled_date = t.d
 AND ( l.assigned_to = t.tech
       OR l.id IN (SELECT bl.lead_id FROM booked_leads bl WHERE bl.tech = t.tech AND bl.d = t.d) )
GROUP BY t.tech, t.d
HAVING count(*) <> count(*) FILTER (WHERE l.assigned_to = t.tech)
ORDER BY t.d, t.tech;
```
Zero rows ⇒ no technician-day changes. Otherwise, `new_visible_appointments` is exactly what `day_schedule.length` / `appointment_count` must read after the deploy for that pair.

## 6.2 · ⛔ Capture the RUNNING source — and the STOP that lives here

```bash
mkdir -p $SCR/0c-before-prod
npx supabase functions download calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir $SCR/0c-before-prod
find $SCR/0c-before-prod -type f | sort
git hash-object $SCR/0c-before-prod/supabase/functions/calculate-travel-time/index.ts
```

**Expected: `897042d76a41e674deaf113c2bccb3c5f00927bb`** (= `production` = `main`'s pre-change state).

> ⛔ **STOP if the captured hash is anything other than `897042d76a41e674deaf113c2bccb3c5f00927bb`.**
>
> Specifically, **`1d802297565323e6b8d940313f099df2b9673889` means PROD is running the pre-provenance build** — the version *before* commit `92f5487` ("fix: no fabricated travel times in calculate-travel-time"). Deploying 0c from that state does not ship a ~35-line filter change: **it also ships `92f5487`**, which removes the invented 30-minute travel default and replaces it with explicit nulls plus a `source` discriminator (`google_api` / `unavailable` / `no_origin`), a new `UnknownAvailabilityResponse` shape, and `earliest_start` / `buffer_minutes` / `is_feasible` / `suggestions` withheld instead of guessed. That is a **user-visible behaviour and response-shape change** in the same wave, and §6.7's "any change is a FAIL" criterion becomes meaningless.
>
> Any *other* unexpected hash: PROD is running something not on any branch here. Stop, paste the hash, diff it against both expected blobs before deciding.

```bash
cmp $SCR/expected/0c-old.ts $SCR/0c-before-prod/supabase/functions/calculate-travel-time/index.ts \
  && echo "RUNNING == production branch (897042d7)"
# only if it differs:
diff -u $SCR/expected/0c-old.ts $SCR/0c-before-prod/supabase/functions/calculate-travel-time/index.ts | head -60
cmp $SCR/expected/0c-old.ts $SCR/expected/... # (compare against 1d802297 by fetching it if needed:)
git -C ~/mrc-app-1 cat-file blob 1d802297565323e6b8d940313f099df2b9673889 > $SCR/expected/0c-preprovenance.ts
cmp $SCR/expected/0c-preprovenance.ts $SCR/0c-before-prod/supabase/functions/calculate-travel-time/index.ts \
  && echo "⛔ PROD IS PRE-PROVENANCE (92f5487 NOT DEPLOYED) — STOP"
```

If `_shared/errorReporting.ts` also comes back in the download, hash it too — expect `fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6`.

## 6.3 · ⛔ IDENTITY GATE — `~/mrc-travel-ef` (or `~/mrc-merge`)

**⛔ Never `~/mrc-app-prod`** — it sits on `feat/area-hide-in-report-main` @ `54a60b9` with the **OLD** 0c blob `897042d7`. SESSION 6 §3.1/§4 told you to deploy and diff from there; that instruction is **superseded**. Its pass criterion is inverted there: an empty `git diff` in `~/mrc-app-prod` would mean the *old* code shipped.

```bash
git -C ~/mrc-travel-ef rev-parse --show-toplevel
#  EXPECT /Users/michaelyoussef/mrc-travel-ef
git -C ~/mrc-travel-ef merge-base --is-ancestor 1ca3bec HEAD && echo "ANCESTOR OK"
git -C ~/mrc-travel-ef status --porcelain --untracked-files=all -- supabase/
#  EXPECT no output at all
git -C ~/mrc-travel-ef hash-object supabase/functions/calculate-travel-time/index.ts
#  EXPECT afc363caae3464e61f8670b9155dabc23e2bc258      ← THE identity
git -C ~/mrc-travel-ef hash-object supabase/functions/_shared/errorReporting.ts
#  EXPECT fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6      ← imported by index.ts, ships with it
git -C ~/mrc-travel-ef hash-object supabase/config.toml
#  EXPECT ce718aa0578ea180dbd6571a6932b91f4c942129
ls ~/mrc-travel-ef/supabase/functions/calculate-travel-time/
#  EXPECT index.ts only
```

All six. The upload closure for 0c is `calculate-travel-time/index.ts` + `_shared/errorReporting.ts` (a relative import) + `config.toml`; there is no `deno.json` and no import map.

**Alternate origin:** `~/mrc-merge` (`main` @ `ee0a2f3`) carries the same three blobs and is equally valid for 0c. It carries the **OLD 0b** blob — harmless here, because `functions deploy calculate-travel-time` uploads only that function. See the sign-off item in Part D before you deploy anything *else* from it.

## 6.4 · Baseline BEFORE deploying

Pick one technician + date pair that **has at least one appointment**, and — if 0c-P1 returned rows — one pair **from 0c-P1**. For each, capture:

1. Screenshots at **375px** on mrcsystem.com: the availability panel (day schedule, "previous appointment" / travel origin, earliest start) and the recommended-dates list (all 5 days, order, scores, reasons, slot lists).
2. Optionally, a machine-comparable JSON baseline (read-only; no DB writes, one Google Distance Matrix call):

```bash
# claims check first — same one-liner as §5.7, EXPECT ref= ecyivrxjpsmjmexqatym role= service_role
curl -s -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/calculate-travel-time \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
  -d '{"action":"check_availability","technician_id":"<TECH_UUID>","date":"<YYYY-MM-DD>","requested_time":"11:00","destination_address":"<a real destination address>"}' \
  > $SCR/0c-avail-before.json && python3 -m json.tool $SCR/0c-avail-before.json

curl -s -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/calculate-travel-time \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
  -d '{"action":"get_recommended_dates","technician_id":"<TECH_UUID>","destination_address":"<same address>","destination_suburb":"<suburb>"}' \
  > $SCR/0c-dates-before.json && python3 -m json.tool $SCR/0c-dates-before.json
```

Note the `source` field in `0c-avail-before.json`: `"google_api"` means the PROD Maps key is live; `"unavailable"` means it is expired (as recorded on 2026-08-27) — which fixes half of §6.7's table to null on both sides.

## 6.5 · Deploy — say it aloud first

> **Deploying `calculate-travel-time` to `ecyivrxjpsmjmexqatym` — PROD, the LIVE mrcsystem.com project. Global-immediate, no rollback window.**

```bash
cd ~/mrc-travel-ef && npx supabase functions deploy calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api
```

## 6.6 · Verify by download + hash + `cmp`

```bash
mkdir -p $SCR/0c-after-prod
npx supabase functions download calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir $SCR/0c-after-prod
find $SCR/0c-after-prod -type f | sort
git hash-object $SCR/0c-after-prod/supabase/functions/calculate-travel-time/index.ts
#  PASS = afc363caae3464e61f8670b9155dabc23e2bc258
cmp $SCR/expected/0c-new.ts $SCR/0c-after-prod/supabase/functions/calculate-travel-time/index.ts \
  && echo "BYTE-IDENTICAL"
# if _shared came back:
git hash-object $SCR/0c-after-prod/supabase/functions/_shared/errorReporting.ts 2>/dev/null || echo "_shared not returned by download"
#  EXPECT fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6 when present
```

**Belt-and-braces markers, on the DOWNLOADED file** (these hold whether or not `_shared` round-trips):
```bash
D=$SCR/0c-after-prod/supabase/functions/calculate-travel-time/index.ts
grep -c "attendedLeadsFilter" $D                    # EXPECT 3   (definition + 2 call sites)
grep -c "\.eq('assigned_to', technician_id)" $D     # EXPECT 0   ← the one that matters
grep -c "\.eq('assigned_to', technicianId)" $D      # EXPECT 1   (calendar_bookings — correct, must stay)
```
`3 / 0 / 1` is also the standing post-deploy check for this function from now on.

```bash
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym --output json > $SCR/prod-functions-after-0c.json
```
**Expect `calculate-travel-time` version +1, `verify_jwt` unchanged** (or the deliberate flip cleared in A.3.1), and nothing else moved.

⛔ Any hash mismatch or non-empty `cmp`: **STOP, do not run §6.7**, diff, go to §6.8.

## 6.7 · Behaviour on live single-technician data

### 6.7.1 The UI comparison — at 375px, on mrcsystem.com

| # | Action | Expected |
|---|---|---|
| 1 | Booking flow: pick the technician + date from §6.4 (one they are already booked on) | Availability panel loads, **no error toast** |
| 2 | Read the day schedule | **Same appointments, same times, same `ends_at`** as the baseline — unless this pair is in 0c-P1, in which case exactly the extra rows 0c-P2 predicted |
| 3 | Read "previous appointment" / travel origin | Same suburb and address — unless a 0c-P1 lead is now the nearest earlier job |
| 4 | Open recommended dates | Same 5 days, same order, same scores, same slot lists — unless 0c-P2 predicted a change for one of those days |
| 5 | Pick a technician with an **empty** day | Still reads "Free all day, N min from home" (or "Free all day" if the Maps key is expired) |
| 6 | ⛔ **Malformed-filter detector:** a technician + date known to have appointments still shows them | **Non-empty day schedule.** An empty one here is the fail mode below |

**Row 6 is the check that catches the riskiest failure.** A malformed PostgREST `or=` string does not throw — the query errors, the function logs it and returns **HTTP 200 with an empty schedule**. A broken filter therefore looks like "this technician has nothing on", i.e. every technician reads *freer* than they are, which is precisely the bug 0c fixes. Row 5 alone cannot distinguish it; row 6 can.

**Any change not predicted by 0c-P1/0c-P2 is a FAIL, not an improvement.**

### 6.7.2 Which response fields may legitimately move — and in which direction

| Field | Direction | Why |
|---|---|---|
| `day_schedule` length (`check_availability`) | **Monotone non-decreasing** | The filter went from `assigned_to = T` to `assigned_to = T OR id IN (…)` — a strict superset. Nothing can drop out. |
| `appointment_count` (`get_recommended_dates`) | **Monotone non-decreasing** | Same superset. |
| `available_slots` | **Unchanged** | Busy ranges come from `fetchMelbourneBookings` (untouched) plus orphan ranges, and a delta lead is by construction already in `bookedLeadIds`, so it never becomes an orphan range. Only the *count quoted inside a `reason` string* can move. |
| `earliest_start` | **Either direction** | A newly visible job can become `previous_appointment`. `earliest = previous.ends_at + travel` replaces `business_start + travel_from_home`: a nearby job ending at 08:00 makes it **earlier**; a job ending at 14:00 makes it **later**. |
| `buffer_minutes`, `requested_time_works`, `is_feasible`, `available`, `suggestions` | **Either direction** | All derived from `earliest_start`. |
| `previous_appointment`, `travel_origin_address`, `travel_time_minutes`, `travel_distance_km` | **Either direction** | The measured leg starts somewhere else. |
| `score`, `rating`, `reason` | **Either direction** | A day can leave the `appointment_count === 0` branch: `Free all day, X min from home` scores `100 − X`; `After <suburb> job, same suburb` scores 90 (**up** if X > 10, **down** if X < 10); `≥ 6 bookings` scores 20. |
| Which 5 dates are returned, and their order | **Either direction** | The list is sorted by score and truncated to 5, so a date can drop out of view. **A date leaving the top 5 is not "an appointment disappearing."** |
| Response shape, field names, request schemas | **Unchanged** | `AvailabilityResponse`, `RecommendedDatesResponse`, `TriageLeadResponse`, `DateRecommendation` are byte-identical. No frontend deploy is coupled to this one. |

**If §6.4 showed `source: "unavailable"` (expired PROD Maps key):** `earliest_start`, `buffer_minutes`, `travel_time_minutes`, `travel_distance_km` and `suggestions` are null/empty **before and after**, so they cannot move at all. The only live surfaces are `day_schedule`, `previous_appointment`, and the recommended-dates scoring fields.

Optional exact comparison, if you took §6.4's JSON:
```bash
# re-run the two curls into $SCR/0c-avail-after.json and $SCR/0c-dates-after.json, then:
diff <(python3 -m json.tool $SCR/0c-avail-before.json) <(python3 -m json.tool $SCR/0c-avail-after.json)
diff <(python3 -m json.tool $SCR/0c-dates-before.json) <(python3 -m json.tool $SCR/0c-dates-after.json)
```
Empty diff on a pair **not** in 0c-P1 is the pass. Non-empty on such a pair is a FAIL. (A live Maps key can move `travel_time_minutes` by a minute or two between calls on traffic alone — judge the *structure*, not the last digit.)

### 6.7.3 ⛔ Watch the logs — the fail-soft path

PROD Studio → Edge Functions → `calculate-travel-time` → Logs. Look for:

```
Error fetching appointments:
```

**This is the only signal for a malformed `or=` filter.** The function catches it, logs it, and returns HTTP 200 with an empty schedule — so a broken filter reports technicians as *freer* than they are. **Check the line explicitly; never infer success from a 200.** Also watch `Error fetching calendar bookings:` (same fail-soft shape, in the booking fetch).

The syntax has shipped precedent against this same PostgREST and this same `leads` table — a single-term `.or(...)` (`leadDuplicates.ts:44`) and `in.(…)` nested inside an `or` group (`useLeadsToSchedule.ts:74`) — but precedent is not proof on PROD data. Row 6 plus this log line is the proof.

### 6.7.4 Not testable until Step 2 — record it and move on

With a two-technician booking in place, `check_availability` for the **secondary** must show the shared job in their day schedule and must not score their day "Free all day". That is the acceptance test for the whole fix; it cannot run before Step 2, which is exactly why §6.7.1 exists.

## 6.8 · Rollback 0c

```bash
git hash-object $SCR/0c-before-prod/supabase/functions/calculate-travel-time/index.ts
#  the artefact — expect 897042d76a41e674deaf113c2bccb3c5f00927bb

cd $SCR/0c-before-prod && npx supabase functions deploy calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api
# (copy ~/mrc-travel-ef/supabase/config.toml — ce718aa0… — beside it first if the CLI needs one;
#  the captured tree already contains _shared/errorReporting.ts if the download returned it,
#  otherwise copy fccc83eb… from $SCR/expected/shared-errorReporting.ts into
#  $SCR/0c-before-prod/supabase/functions/_shared/errorReporting.ts before deploying.)

mkdir -p $SCR/0c-rollback-check
npx supabase functions download calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir $SCR/0c-rollback-check
cmp $SCR/0c-before-prod/supabase/functions/calculate-travel-time/index.ts \
    $SCR/0c-rollback-check/supabase/functions/calculate-travel-time/index.ts && echo "ROLLBACK VERIFIED"
grep -c "attendedLeadsFilter" $SCR/0c-rollback-check/supabase/functions/calculate-travel-time/index.ts   # EXPECT 0
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym --output json
```
A rollback deploy is a deploy. It earns no more trust than the one it undoes — verify it the same way.

### Expiry rule

- **Safe before Step 1/2.** Rolling back reverts to the pre-existing filter, which today produces the same result set (modulo the 0c-P1 rows, which revert to being hidden).
- ⛔ **Not safe once a two-technician booking exists.** After Step 1, rollback reinstates the silent double-book: the secondary's day reads free and the engine offers a slot on top of a job they are attending. **Fix forward.**

### Blast radius if you do nothing

Bounded. The worst case is a wrong `or=` filter failing soft, so availability reports technicians as *freer* than they are — the pre-existing behaviour this change fixes. **The function performs no writes.** It cannot corrupt data.

---

# PART D — SIGN-OFF

Deploy is complete only when **all** of these are true.

**Shared**
- [ ] A.1 CLI version V matches the DEV rehearsal; `$SCR/expected/*` populated from `git cat-file`
- [ ] A.2 PROD secrets listed (names only): `RESEND_API_KEY`, `SYSTEM_USER_UUID`, `GOOGLE_MAPS_API_KEY` present
- [ ] A.3 `functions list --output json` captured BEFORE; A.3.1 `verify_jwt` hazard cleared for both functions
- [ ] A.4 read and understood: **two invocations per hour on PROD's reminder logs is SF-5, not fan-out**

**Step 5 · 0b**
- [ ] §5.1 P-A…P-E2 run **against PROD, in this sitting** — P-B one `uuid NOT NULL` row, P-C `0`, P-D zero rows, P-E1 zero rows, P-E2 `pending_as_ef_sees_it = 0` and `pending_sendable_now < 150`
- [ ] "Tick to watch" recorded
- [ ] §5.2 deployed between `:10` and `:50`
- [ ] §5.3 running source captured; hash recorded (expected `bf95002f…`); it — not a git blob — is the rollback artefact
- [ ] §5.4 all six identity checks passed from **`~/mrc-reminder-ef`**; `index.ts` = `6df442b8…`, `config.toml` = `ce718aa0…`
- [ ] §5.5 ref stated aloud as LIVE and confirmed before the command
- [ ] §5.6 download + `hash-object` + `cmp` clean — **not** a version-number check; `functions list` diff shows only `send-inspection-reminder` version +1, `verify_jwt` unchanged
- [ ] §5.7 invoke returned exactly `No pending reminders` — logged as **boot + no `42703` only**, explicitly **not** as proof of the group claim
- [ ] §5.8 first tick with due work watched: `Processing N booking row(s) in M group(s)` with **N == M**; 5.8.2 and 5.8.3 zero rows; 5.8.4 `sent_by = a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f`; 5.8.5 shows one `net._http_response` row per tick against two log invocations, and `sent_rows = distinct_messages`

**Step 6 · 0c**
- [ ] §6.1 0c-P1 and 0c-P2 run on PROD **before** the deploy; the delta set is written down as a prediction
- [ ] §6.2 running source captured and hashed = `897042d76a41e674deaf113c2bccb3c5f00927bb` — **⛔ not `1d802297…`, which would mean the deploy also ships `92f5487` (no-fabricated-travel-times) and invalidates §6.7**
- [ ] §6.3 identity gate passed from **`~/mrc-travel-ef`** (or `~/mrc-merge`), **never `~/mrc-app-prod`**: `index.ts` = `afc363ca…`, `_shared/errorReporting.ts` = `fccc83eb…`, `config.toml` = `ce718aa0…`
- [ ] §6.4 baseline captured at 375px (+ JSON if taken); `source` field recorded
- [ ] §6.5 ref stated aloud as LIVE and confirmed
- [ ] §6.6 download + hash + `cmp` clean; grep markers `3 / 0 / 1`; `functions list` shows only `calculate-travel-time` version +1
- [ ] §6.7 UI comparison at 375px matches the 0c-P1/0c-P2 prediction exactly; **row 6 (malformed-filter detector) shows a non-empty day schedule**; no `Error fetching appointments:` in the logs

**⛔ Branch hygiene — the silent-rollback gate**

Edge Function deploys upload from a working directory, so the *next* unrelated EF deploy from a `main` or `production` worktree will quietly revert whichever of these two functions that tree still carries at its old blob. Today `production` carries **both** old blobs, and `main` carries the old 0b.

- [ ] **`fix/reminder-group-claim` merged into `main` AND `production`** — verify:
      `git ls-tree main -- supabase/functions/send-inspection-reminder/index.ts` and the same for `production` → both must read `6df442b819e70c27d92704bd4f5ccc513b906b49`
- [ ] **`fix/travel-time-multitech` merged into `production`** (already on `main` @ `ee0a2f3`) — verify:
      `git ls-tree production -- supabase/functions/calculate-travel-time/index.ts` → `afc363caae3464e61f8670b9155dabc23e2bc258`
- [ ] Until **both** rows above read the new blobs: **no Edge Function may be deployed from `~/mrc-app-prod`, `~/mrc-merge`, or any `main`/`production` checkout.** A deploy of `send-inspection-reminder` from such a tree silently restores `bf95002f` — duplicate customer emails, green CLI, incremented version, no error anywhere.
- [ ] Merge with **"Create a merge commit"**. Never squash, never rebase.

**Record-keeping**
- [ ] `DEPLOY-LOG.md` updated: captured before-hashes, deployed versions before/after, `verify_jwt` before/after, 0c-P1 row count, the tick watched, and any deviation
- [ ] SF-5 left **unremediated and recorded** — remediation is its own session, per `SF-5-prod-credential-in-dev-vault.md` §5
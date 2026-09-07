# STEPS 5–6 — 0b + 0c on PROD (`ecyivrxjpsmjmexqatym`, **LIVE**)

> **Target for every command in this document: `ecyivrxjpsmjmexqatym` — PROD. The LIVE project behind mrcsystem.com. Real customer email, real customer data. Edge Function deploys are global-immediate: no preview, no branch, no staging buffer, no automatic rollback.**
>
> Per `CLAUDE.md`, say that aloud and confirm before each `deploy` command. Never infer the ref.

**Shape.** Run blocks in order, paste every output back. Every block is runnable on its own — Studio shows only the **last** result set of a multi-statement run, so never paste two SQL blocks together. `$SCR` is a throwaway directory; **nothing in this document writes to any git worktree.** No `git worktree add`, no `git checkout`, no download into a tree you are verifying.

**0b and 0c are independent.** Either order is safe. 0b carries a timing gate (§5.2); 0c does not. Both must be live before Step 1 (the fan-out migration).

**Michael's shell.** Each Claude Code `!` invocation is a **fresh shell** — `export SCR=…` does not survive to the next command. Every command in this document therefore uses **literal paths**, and every "read a secret then curl" step is a **single line** (§A.5).

---

## ⛔ PRE-CONDITION — 0a MUST BE APPLIED TO PROD FIRST

`booking_group_id` was **measured ABSENT on PROD on 2026-08-31**. That is the pre-0a state. Step 4 (PROD pre-flight) + the 0a apply must complete on PROD **before** any block in Part B runs.

Two consequences, both real, both observed:

1. **§5.1 P-B will return zero rows and STOP** until 0a is applied to PROD. That is the gate working, not a bug.
2. **P-E2 as written references `cb.booking_group_id` and CANNOT run before 0a.** A real `42703 column calendar_bookings.booking_group_id does not exist` was observed doing exactly this on PROD. Use the **P-E2-pre0a** variant in §5.1 for any measurement taken before the 0a apply; use the full P-E2 only after.

0c has no such dependency and can be deployed before or after 0a.

---

## MEASURED FACTS — the only PROD numbers this document states as known

Everything not in this table is **UNKNOWN — MUST CAPTURE** on the night. Do not carry a number forward from a draft, a rehearsal, or memory.

| Fact | Value | Measured |
|---|---|---|
| PROD `leads` total | **144** | 2026-08-31 |
| PROD `calendar_bookings.booking_group_id` | **ABSENT** (pre-0a) | 2026-08-31 |
| PROD reminder guard URL — `pending_rows` | **0** | 2026-08-31 (pre-0a variant) |
| PROD reminder guard URL — `transient` | **0** | 2026-08-31 |
| PROD reminder guard URL — `permanent_floor` | **0** | 2026-08-31 |
| PROD reminder guard URL — `approx_guard_url_bytes` | **120** | 2026-08-31 |
| DEV's **deployed** 0b blob | `fab3d39a…` = commit `c9761b6`, one behind `main` | 2026-08-31 |
| Supabase CLI in use | **2.101.0** (2.116.0 exists — do NOT upgrade mid-sequence) | 2026-08-31 |
| 0a on DEV | **APPLIED AND VERIFIED**, A1…A8 all pass | 2026-08-30 |

**The four guard-URL values are a MEASURED ZERO baseline.** Record them. Their whole purpose is that future growth in no-email bookings — the rows that by design never clear (F1) — is detectable against a real zero rather than against an assumption.

**History, not a current count:** PROD's `calendar_bookings` was driven to zero on 5 Aug 2026 by the test-lead purge (`docs/TEST_LEAD_PURGE_RUNBOOK.md`), and one documented orphan source exists since (`docs/TEST_LEAD_PURGE_ZZ_TEST_MICHAEL.md`, 26 Aug 2026 — `calendar_bookings.lead_id` is `SET NULL`, intended). Use that to sanity-check the numbers you capture; never as a substitute for capturing them.

---

# PART A — SHARED PRE-FLIGHT (both functions)

## A.1 · Scratch dir + CLI pin + expected bytes

```bash
mkdir -p ~/ef-scratch-prod/expected && echo "scratch: ~/ef-scratch-prod"
npx supabase --version
```

⛔ **Must print `2.101.0`** — the version used for the DEV rehearsal. That rehearsal proved *this* CLI's `deploy --use-api` → `download --use-api` round-trip is byte-identical. **`2.116.0` is available; do NOT upgrade mid-sequence** — a different bundler between the rehearsal and the PROD deploy can introduce a formatting difference that looks like a wrong upload and burns an hour.

Pull the expected bytes out of git once, read-only, for every later `cmp`:

```bash
git -C ~/mrc-app-1 cat-file blob 6df442b819e70c27d92704bd4f5ccc513b906b49 > ~/ef-scratch-prod/expected/0b-new.ts
git -C ~/mrc-app-1 cat-file blob bf95002f7bfd76506c3fc71783fb35e59681e1f3 > ~/ef-scratch-prod/expected/0b-old.ts
git -C ~/mrc-app-1 cat-file blob fab3d39a140ec018aaecc2f70ba8cc00ba61ea97 > ~/ef-scratch-prod/expected/0b-c9761b6.ts
git -C ~/mrc-app-1 cat-file blob afc363caae3464e61f8670b9155dabc23e2bc258 > ~/ef-scratch-prod/expected/0c-new.ts
git -C ~/mrc-app-1 cat-file blob 897042d76a41e674deaf113c2bccb3c5f00927bb > ~/ef-scratch-prod/expected/0c-old.ts
git -C ~/mrc-app-1 cat-file blob 1d802297565323e6b8d940313f099df2b9673889 > ~/ef-scratch-prod/expected/0c-preprovenance.ts
git -C ~/mrc-app-1 cat-file blob fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6 > ~/ef-scratch-prod/expected/shared-errorReporting.ts
ls -l ~/ef-scratch-prod/expected
```

**Round-trip the extraction** — one command, proves the files on disk are the blobs you named:

```bash
for f in 0b-new:6df442b819e70c27d92704bd4f5ccc513b906b49 0b-old:bf95002f7bfd76506c3fc71783fb35e59681e1f3 0b-c9761b6:fab3d39a140ec018aaecc2f70ba8cc00ba61ea97 0c-new:afc363caae3464e61f8670b9155dabc23e2bc258 0c-old:897042d76a41e674deaf113c2bccb3c5f00927bb 0c-preprovenance:1d802297565323e6b8d940313f099df2b9673889 shared-errorReporting:fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6; do n=${f%%:*}; h=${f##*:}; a=$(git hash-object ~/ef-scratch-prod/expected/$n.ts); [ "$a" = "$h" ] && echo "OK  $n" || echo "FAIL $n got=$a want=$h"; done
```

⛔ **Seven `OK` lines. Any `FAIL` ⇒ stop and re-extract** — every later `cmp` is meaningless otherwise.

## A.2 · PROD secrets — names and digests only, never values

```bash
npx supabase secrets list --project-ref ecyivrxjpsmjmexqatym
```

| Secret | Needed by | Absent ⇒ |
|---|---|---|
| `RESEND_API_KEY` | 0b | every send fails; the function returns HTTP 500 `{"error":"RESEND_API_KEY not configured"}` **before** it queries bookings (`index.ts:212-218`). **STOP.** |
| `SYSTEM_USER_UUID` | 0b | `email_logs.sent_by` is NULL and **§5.8.4** has nothing to assert |
| `GOOGLE_MAPS_API_KEY` | 0c | travel legs unavailable — see below |
| `SENTRY_DSN` / `SENTRY_ENVIRONMENT` | 0c | note presence; 0c reports through them |

- **Presence is not validity.** PROD's Maps key was recorded EXPIRED on 2026-08-27 (`project_api_keys_rotated`). An expired key makes `calculate-travel-time` answer `source: "unavailable"` with `travel_time_minutes: null`; `day_schedule` is still populated, so 0c is still verifiable. **§6.7 branches on this — settle it in §6.4 with a real response, not from this listing.**
- `secrets list` prints a **plain sha256 of the raw value** (proven on DEV 2026-08-31). So `SYSTEM_USER_UUID` can be confirmed without revealing it:

```bash
printf '%s' 'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f' | shasum -a 256
#  compare to the SYSTEM_USER_UUID digest in the listing above.
#  A match proves PROD's secret is the canonical sentinel. A mismatch is a finding — raise it, it is not a deploy blocker.
```

## A.3 · Function inventory BEFORE — the baseline for "version +1" and the ONLY chance at `verify_jwt`

```bash
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym -o json > ~/ef-scratch-prod/prod-functions-before.json
cat ~/ef-scratch-prod/prod-functions-before.json
python3 -c "import json;d=json.load(open('/Users/michaelyoussef/ef-scratch-prod/prod-functions-before.json'));print([(f['slug'],f.get('version'),f.get('verify_jwt'),f.get('updated_at')) for f in d if f['slug'] in ('send-inspection-reminder','calculate-travel-time')])"
```

⛔ **Check the output actually contains `verify_jwt` for both slugs.** `--output/-o` is a **root-level persistent flag** ("output format of status variables"); if it is ignored and a formatted table is printed, or the JSON has no `verify_jwt` key, **the value has NOT been captured — and the 0b deploy makes it unrecoverable.** Fall back to the Management API, which is where the CLI gets it:

```bash
# token from your shell env, never pasted inline
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" https://api.supabase.com/v1/projects/ecyivrxjpsmjmexqatym/functions | python3 -m json.tool
```

The per-function detail page in the PROD dashboard is a third route. **Do not proceed to §5.5 until `verify_jwt` for `send-inspection-reminder` is written down.**

Record for **both** functions: `version`, `verify_jwt`, `updated_at`.

### ⛔ A.3.1 — the `verify_jwt` hazard, read before you deploy anything

`supabase/config.toml` (blob `ce718aa0…`) declares `verify_jwt = false` for **only** `receive-framer-lead` and `send-slack-notification`. Neither function in this document has a section, so **every CLI deploy re-asserts the default `verify_jwt = true`** (CLI 2.101.0: `deploy_deploy.go:110-115` sets `VerifyJWT = true` for any slug absent from config; `function_deploy.go:37` sends it on every deploy). **This includes the rollback deploy — see §5.9 / §6.8.**

| A.3 shows | Meaning | Action |
|---|---|---|
| `true` for both | Nothing changes | Proceed |
| **`false` for `send-inspection-reminder`** | The deploy flips it to `true`. From that moment PROD's own hourly cron must present a bearer PROD's gateway accepts | Clear the claims gate below **before** deploying |
| **`false` for `calculate-travel-time`** | The flip to `true` is harmless — every caller (`useGoogleMaps`, `useBookingValidation` ×2) already sends a Supabase key | Proceed |

**If `send-inspection-reminder` reads `false`:** run SF-5 §3's claims query (`SF-5-prod-credential-in-dev-vault.md`) in **PROD** Studio. It prints claims only; it never selects the token. **PASS requires ALL THREE:**

1. **Exactly one row.** Zero rows means PROD's Vault entry is not named `service_role_key` — find its real name before deciding. **Do NOT read zero rows as "nothing to worry about."**
2. `key_kind = 'legacy JWT'` **AND** `ref_claim = ecyivrxjpsmjmexqatym` **AND** `role_claim = service_role`. `role_claim` is load-bearing: an `anon` token also passes a `verify_jwt = true` gateway.
3. `expires_at` in the future.

> **Note the inversion.** On DEV, `ref_claim = ecyivrxjpsmjmexqatym` is the **alarm** (SF-5 H1). On PROD it is the **pass**. Same output, opposite meaning — **state which project you ran it in when you paste the result.**
>
> If the entry is a new-style `sb_secret_…` key, `key_kind` reads `not a JWT` and the claims columns are NULL. That is not a failure, but you then cannot prove PROD-signing from the payload — confirm via a PROD cron `200` in `net._http_response` before flipping `verify_jwt`.

## A.4 · ⛔ SF-5 BRIEFING — PROD's reminder function is invoked TWICE every hour, and that is expected

DEV's `cron.job` rows 3 and 4 POST to **PROD's** Edge Functions with a bearer taken from **DEV's** Vault, and PROD accepts it. Observed live: DEV `net._http_response` id 1377, `200`, body `{"processed":1,"sent":0,"failed":0,"skipped":0,"alreadyClaimed":1,"released":0}` at 2026-08-30 09:00:00Z. Full write-up: `SF-5-prod-credential-in-dev-vault.md`. **It is unremediated, predates this work, and is out of scope tonight. Do not fix it mid-deploy.**

Consequence you will see with your own eyes in §5.8:

> **PROD → Edge Functions → `send-inspection-reminder` → Logs shows TWO invocations per hour at `:00`** — PROD's own cron and DEV's cron. One of them wins the claim and sends; the loser reports `alreadyClaimed ≥ 1, sent: 0`. Expect **two** `Processing N booking row(s) in M group(s)` lines per hour.
>
> **This is NOT fan-out. It is NOT `N ≠ M`. It is NOT a duplicate email.** Two invocations produce **one** email, because the claim is a single-statement compare-and-swap. §5.8.5 gives the queries that tell the two apart.

### ⛔ This prediction is conditional on A.3.1

Record `verify_jwt` for `send-inspection-reminder` **before** the deploy, then read §5.8 accordingly:

| A.3.1 recorded | After the deploy | How to read §5.8 |
|---|---|---|
| `true` before and after | Double invocation **persists** | §5.8.5 applies as written. DEV's bearer is PROD-signed (SF-5 H1 confirmed). |
| `false` before, flipped to `true` by the deploy | DEV's cron may begin receiving **401** at PROD's gateway and the second invocation may **VANISH** | **One invocation per hour and `alreadyClaimed: 0` is then the correct new normal.** Do not read the missing second invocation, or the missing `alreadyClaimed`, as a failure of the group claim. Confirm by exactly one PROD `net._http_response` row per tick and a `sent` count equal to the number of due groups. |

Either way this changes nothing about customer email: **one email per group, before and after.**

## A.5 · PROD `service_role` key — capture once, gate every curl

Both §5.7 and §6.4 need this. **Capture it here, not inside a part** — the document explicitly says 0b and 0c can be done in either order, and an operator who starts with Part C would otherwise send `Authorization: Bearer ` and read the 401 as a function problem.

Take the key from **PROD** Studio → Project Settings → API. **Never paste a key into a chat window.**

**Michael's shell — a fresh shell per `!` invocation means no variable survives.** Copy the key to the clipboard in Studio, then run the read + claims gate + curl as **ONE line**. The `&&` *is* the gate: if the claims do not match, the curl never runs.

**Form 1 — legacy JWT key (has two dots). The working form.**

```bash
K="$(pbpaste)"; python3 -c 'import sys,base64,json;t=sys.argv[1].strip();p=t.split(".")[1] if t.count(".")==2 else "";d=json.loads(base64.urlsafe_b64decode(p+"="*(-len(p)%4))) if p else {};print("kind=",("legacy JWT" if p else ("new-style sb_secret_" if t.startswith("sb_secret_") else "unrecognised")),"ref=",d.get("ref"),"role=",d.get("role"));sys.exit(0 if (d.get("ref")=="ecyivrxjpsmjmexqatym" and d.get("role")=="service_role") else 1)' "$K" && echo "CLAIMS OK — safe to curl in this same line"
#  EXPECT  kind= legacy JWT ref= ecyivrxjpsmjmexqatym role= service_role
#          CLAIMS OK — safe to curl in this same line
#  Anything else ⇒ the exit code is 1, the && short-circuits, and nothing is sent. Do not "fix" it by removing the gate.
```

**Form 2 — new-style `sb_secret_…` key (no dots).** Claims are not decodable, so there is no payload gate. This is **not** a failure and must not be turned into an unconditional STOP.

```bash
K="$(pbpaste)"; case "$K" in sb_secret_*) echo "kind= new-style secret key — claims NOT decodable. Confirm in PROD Studio that this key was copied from ecyivrxjpsmjmexqatym → Project Settings → API, then re-run with the curl appended.";; *) echo "not an sb_secret_ key — use Form 1";; esac
```

To actually send, append the curl to the **same line** after the gate — see §5.7 and §6.4 for the two complete one-liners. Never split them across two `!` invocations.

## A.6 · ⛔ GATE G3 — `email_logs.sent_by` FK on PROD

The `SYSTEM_USER_UUID` sentinel is **deliberately NOT an `auth.users` row** (`docs/system-user-uuid.md`; it mirrors `audit_logs.user_id`, which intentionally carries no FK). So the right question is **not** "does PROD's `SYSTEM_USER_UUID` resolve" — it should not, by design, on either project. The right question is **"was `20260813120000_drop_email_logs_sent_by_fkey.sql` applied to PROD?"**

Verify live, in PROD Studio. Never from repo file presence.

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.email_logs'::regclass AND contype = 'f';
```

| Result | Meaning | Action |
|---|---|---|
| `email_logs_lead_id_fkey` + `email_logs_inspection_id_fkey` only, **`email_logs_sent_by_fkey` ABSENT** | PASS. `email_logs` writes land. §5.8.3 and §5.8.4 are trustworthy. | Proceed |
| `email_logs_sent_by_fkey → auth.users(id)` **PRESENT** | Every system `email_logs` insert fails **23503**. PROD's reminder log writes have been failing all along. | **RAISE IT BEFORE THE 0b DEPLOY.** It does **not** block the deploy — emails still send — but §5.8.3 and §5.8.4 become **unusable on PROD** and must be replaced (see §5.8.3 fallback). |

DEV still carries this FK (measured 2026-08-31) and never received the migration — forked history. PROD's state is **UNKNOWN — MUST CAPTURE**.

The failure is non-fatal by construction: `logReminderEmail` (new blob `index.ts:238`, called `:519`) catches everything; `sent++` (`:530`) is driven by `result.success`, and the release (`:573-578`) by `result.success` / `isPermanentFailure`. The claim, the counters, the release and the customer email are all unaffected.

---

# PART B — STEP 5 · `send-inspection-reminder` (0b)

Deploys blob `6df442b819e70c27d92704bd4f5ccc513b906b49` (commit `cf49ebfe2f62abc6a1e62129dd458550dc6c1b72`, branch `fix/reminder-group-claim`).

## 5.1 · Studio pre-flight on PROD — read-only, one block at a time

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
Expect exactly one row: `uuid | NO | gen_random_uuid()`.

⛔ **Zero rows ⇒ STOP.** 0a is not applied to PROD (its measured state on 2026-08-31). Deploying now breaks every reminder run with `column calendar_bookings.booking_group_id does not exist` and no customer gets a 48-hour notice. Go back to Step 4.

**P-C `booking_group_id` is populated — belt-and-braces only.**
```sql
SELECT count(*) AS null_group_rows
  FROM public.calendar_bookings
 WHERE booking_group_id IS NULL;
```
Expect `0`. **With P-B's `NOT NULL` this is 0 by definition.** 0a has **no UPDATE backfill** — the column DEFAULT fills every row inside the `ADD COLUMN`, and the migration verifies one distinct group id per row before COMMIT (`0a-migration.sql:481-489`). A non-zero here would mean the column is not the one 0a created — **re-run P-B and stop.**

**P-D Group shape — a two-row group must not exist yet.**
```sql
SELECT booking_group_id, count(*) AS rows_in_group
  FROM public.calendar_bookings
 WHERE booking_group_id IS NOT NULL
 GROUP BY booking_group_id
HAVING count(*) > 1;
```
Expect zero rows before Step 2. Rows here are not a stop for *this* deploy (the new code is the thing that handles them) but they mean a writer already fans out — find it before Step 1.

**P-E1 Transition hazard — a failed attempt inside Resend's 24 h idempotency window.**
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
**Expect zero rows.** 0b moves the Resend `Idempotency-Key` from the booking id to the group id. A reminder that failed transiently and released its claim before the deploy would retry afterwards under a **new** key — and if that failure was a false negative (Resend accepted, the response was lost), the retry sends a genuine duplicate. Rows here ⇒ wait out the 24 h window, or deal with those bookings deliberately.

> **This is documentation, NOT an independent gate.** Its predicate is `pending_sendable_now` narrowed by an inner join, so it returns zero rows whenever P-E2's gate below passes. Keep it for the record and for the case where the gate is deliberately relaxed. PROD's measured `transient` baseline on 2026-08-31 was **0**.

**P-E2 ⛔ THE GATE — what the function itself will see, mirrored exactly.**

⛔ **This query references `cb.booking_group_id` and therefore cannot run on a project before 0a is applied there.** Running it pre-0a returns `42703` (observed on PROD). Use **P-E2-pre0a** below for any pre-0a measurement.

```sql
-- P-E2 — run in PROD Studio AFTER 0a is applied to PROD.
SELECT count(*) FILTER (WHERE l.email IS NOT NULL AND l.email <> '') AS pending_sendable_now,
       count(*) FILTER (WHERE l.email IS NULL OR l.email = '')       AS pending_no_email_never_clears,
       count(*)                                                      AS pending_as_ef_sees_it,
       count(DISTINCT cb.booking_group_id)                           AS distinct_groups_in_guard_url,
       120 + 37 * count(DISTINCT cb.booking_group_id)                AS approx_guard_url_bytes
FROM public.calendar_bookings cb
LEFT JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.reminder_sent = false AND cb.status = 'scheduled'
  AND cb.reminder_scheduled_for <= now() AND cb.lead_id IS NOT NULL;
```

```sql
-- P-E2-pre0a — USE ONLY BEFORE 0a IS APPLIED TO THIS PROJECT. No booking_group_id reference.
-- Pre-0a every booking is its own group (0a's DEFAULT gen_random_uuid() is per row), so
-- count(DISTINCT cb.id) is the exact pre-0a proxy for count(DISTINCT booking_group_id).
SELECT count(*) FILTER (WHERE l.email IS NOT NULL AND l.email <> '') AS pending_sendable_now,
       count(*) FILTER (WHERE l.email IS NULL OR l.email = '')       AS pending_no_email_never_clears,
       count(*)                                                      AS pending_as_ef_sees_it,
       count(DISTINCT cb.id)                                         AS distinct_groups_in_guard_url,
       120 + 37 * count(DISTINCT cb.id)                              AS approx_guard_url_bytes
FROM public.calendar_bookings cb
LEFT JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.reminder_sent = false AND cb.status = 'scheduled'
  AND cb.reminder_scheduled_for <= now() AND cb.lead_id IS NOT NULL;
```

Four predicates — the function's query verbatim (`index.ts:272-291`).

| Column | Rule |
|---|---|
| **`pending_sendable_now`** | ⛔ **MUST be `0`** to deploy and to run the §5.7 invoke. This is what the function will actually **SEND**. Non-zero ⇒ wait for the tick to drain, then re-run. |
| `pending_no_email_never_clears` | **EXPECTED to be a standing non-zero. Record it; do NOT wait on it.** A no-email row is never claimed (`index.ts:412-416` runs *before* the claim at `438-445`), so `reminder_sent` stays false and it re-enters the query on every tick, **forever**. |
| `pending_as_ef_sees_it` | **Informational only.** It decides which §5.7 response body you get — see the §5.7 table. Gating on it is unsatisfiable by construction. |
| **`distinct_groups_in_guard_url`** | ⛔ **MUST be `< 150`.** This is the number of uuids the claimed-group guard inlines into a PostgREST `in.()` that rides in the URL (`index.ts:348-361`) — **DISTINCT groups over ALL pending rows, including the no-email rows that never clear.** `pending_sendable_now` is **not** the driver and must not be used as the bound. |
| `approx_guard_url_bytes` | Derived: ~120 bytes of base URL + 37 bytes per group id. PROD's measured baseline on 2026-08-31 was **120** (i.e. an empty in-list). |

**PROD measured baseline, 2026-08-31 (pre-0a variant): `pending_rows 0`, `transient 0`, `permanent_floor 0`, `approx_guard_url_bytes 120`.** That is a real zero, not an assumption — it exists so that growth in the never-clearing no-email population is visible the next time this query is run. Compare tonight's numbers to it and record any drift.

*Follow-up, tracked in `docs/TODO.md`, not tonight: chunk the claimed-group guard at 100 group ids per request.*

**P-E3 ⛔ Bound the race before you start §5.2.**
```sql
SELECT min(cb.reminder_scheduled_for) AS first_future_tick
FROM public.calendar_bookings cb
WHERE cb.reminder_sent = false AND cb.status = 'scheduled' AND cb.lead_id IS NOT NULL
  AND cb.reminder_scheduled_for > now();
```
⛔ **If `first_future_tick` falls inside your deploy window, do NOT run the §5.7 curl at all** — a booking will cross the `reminder_scheduled_for <= now()` boundary while you are deploying, and the manual invoke would send a real reminder outside its normal window.

**The tick to watch — when the group claim actually gets exercised.**
```sql
SELECT cb.id, cb.lead_id, cb.booking_group_id, cb.reminder_scheduled_for, cb.start_datetime
FROM public.calendar_bookings cb
WHERE cb.reminder_sent = false AND cb.status = 'scheduled' AND cb.lead_id IS NOT NULL
  AND cb.reminder_scheduled_for > now()
ORDER BY cb.reminder_scheduled_for
LIMIT 10;
```
The first `reminder_scheduled_for` here is the first tick that will exercise send. **Write it down** — §5.8 is scheduled against it, and until it arrives PROD's logs will show ticks that print nothing at all. **That silence is correct, not a failure.**

## 5.2 · ⛔ TIMING GATE

The cron fires hourly at `:00` — and under SF-5, **twice** at `:00`.

- ⛔ **Deploy between `:10` and `:45`.** Deploy + download verification takes several minutes and must clear the next `:00`. Deploying into a live tick can leave a half-processed run split across two code versions.
- ⛔ **Also avoid `23:00`–`23:10` UTC**, which is `09:00`–`09:10` Melbourne in AEST (`10:00`–`10:10` AEDT) — **business hours, not the middle of the night.** `check-overdue-invoices` fires at `0 23 * * *` and **pg_cron schedules in the database's timezone, not yours** (`20260420000000_create_overdue_invoices_cron.sql:1` says so: "23:00 UTC (9:00 AM AEST)"). Like the reminder job it is fired twice — DEV's jobid 3 targets PROD as well. It writes `invoices`, not `calendar_bookings`, so it is simply extra concurrent load for no benefit.

**Read the clock rather than assuming it:**
```sql
SELECT now()                                    AS now_server,
       current_setting('TimeZone')              AS session_timezone,
       current_setting('cron.timezone', true)   AS cron_timezone,
       now() AT TIME ZONE 'Australia/Melbourne' AS now_melbourne;
```

**Prove the hour's run has drained before you deploy — do not guess.** pg_net posts asynchronously, so `cron.job_run_details` shows a near-zero duration for the job itself; the EF's own writes land back through PostgREST minutes later.
```sql
SELECT max(updated_at)         AS newest_booking_write,
       now() - max(updated_at) AS since_last_write,
       now()                   AS now_server
FROM public.calendar_bookings;
```
⛔ **If `since_last_write` is under ~3 minutes, the hour's run is still landing. Wait.**

## 5.3 · ⛔ GATE G1 — capture the RUNNING source on PROD

The pinned "previous" blob is what the branch says PROD *should* be running. **Only a download proves what it *is* running**, and only the downloaded bytes can be redeployed with confidence.

**This is not theoretical.** Deployed-EF-vs-git drift is **demonstrated**: DEV's deployed `send-inspection-reminder` was blob `fab3d39a…` = commit `c9761b6`, **one commit behind** `main`/`production`'s `bf95002f`. PROD may be in the same state. **PROD's captured hash is genuinely unknown until this block runs.**

```bash
mkdir -p ~/ef-scratch-prod/0b-before-prod
npx supabase functions download send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir ~/ef-scratch-prod/0b-before-prod
find ~/ef-scratch-prod/0b-before-prod -type f | sort
git hash-object ~/ef-scratch-prod/0b-before-prod/supabase/functions/send-inspection-reminder/index.ts
```

⛔ **GATE G2 — verify by `git hash-object` on the specific `index.ts` path. NEVER by tree cleanliness.** The download also writes `supabase/.temp/cli-latest` and `supabase/.temp/linked-project.json` into the workdir; a `git status --porcelain` test reads those as a FAIL and would trigger a rollback of a correct deploy. **Round-trip fidelity is proven** — downloaded bytes hashed to an exact historical git blob, which a lossy server-side unbundle could not do — so `hash-object` on a download is a valid verification method.

### G1 decision table — `send-inspection-reminder`

| captured | meaning | action |
|---|---|---|
| `bf95002f7bfd76506c3fc71783fb35e59681e1f3` | PROD = `main`/`production`. Deploy ships **ONE** commit (`cf49ebf`). | **proceed**; rollback target = `bf95002f` |
| `fab3d39a140ec018aaecc2f70ba8cc00ba61ea97` | PROD = `c9761b6`, one behind. Deploy ships **TWO** commits (`98fed73` + `cf49ebf`). | **STOP and put the decision to Michael first**, stating what `98fed73` changes (adds the 43-line `logReminderEmail` helper: error-checked, try/catch-wrapped `email_logs` insert replacing a bare unchecked one; non-fatal by design so a lost log row cannot undo a sent email or skip the claim-release). Only deploy on explicit acceptance. Rollback target = `fab3d39a`. |
| anything else | PROD is running source we cannot name | **STOP. Report and propose nothing** until identified. |

Confirm the capture against the expected bytes:
```bash
cmp ~/ef-scratch-prod/expected/0b-old.ts     ~/ef-scratch-prod/0b-before-prod/supabase/functions/send-inspection-reminder/index.ts && echo "RUNNING == bf95002f (main/production)"
cmp ~/ef-scratch-prod/expected/0b-c9761b6.ts ~/ef-scratch-prod/0b-before-prod/supabase/functions/send-inspection-reminder/index.ts && echo "RUNNING == fab3d39a (c9761b6) — SEE G1 ROW 2, STOP"
```

Whatever the hash, **`~/ef-scratch-prod/0b-before-prod/…` — not a git blob — is the artefact §5.9 redeploys.**

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

**All six. Do not deploy on five.** `send-inspection-reminder` imports nothing from `_shared/` (only `jsr:` and `esm.sh`), so `index.ts` + `config.toml` is the whole upload closure.

*This tree's cleanliness check is safe: `.gitignore:57` is `supabase/.temp/`, so the CLI's `.temp` writes are ignored here. They are TRACKED in `~/mrc-app-prod` — one more independent reason never to deploy from there.*

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
mkdir -p ~/ef-scratch-prod/0b-after-prod
npx supabase functions download send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir ~/ef-scratch-prod/0b-after-prod
find ~/ef-scratch-prod/0b-after-prod -type f | sort
git hash-object ~/ef-scratch-prod/0b-after-prod/supabase/functions/send-inspection-reminder/index.ts
#  PASS = 6df442b819e70c27d92704bd4f5ccc513b906b49
cmp ~/ef-scratch-prod/expected/0b-new.ts ~/ef-scratch-prod/0b-after-prod/supabase/functions/send-inspection-reminder/index.ts \
  && echo "BYTE-IDENTICAL"
```

Mismatch ⇒ **STOP, do not run §5.7**, and paste:
```bash
diff -u ~/ef-scratch-prod/expected/0b-new.ts ~/ef-scratch-prod/0b-after-prod/supabase/functions/send-inspection-reminder/index.ts | head -40
```
A CRLF/banner artefact is a tooling note; a code difference is a FAIL → §5.9.

```bash
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym -o json > ~/ef-scratch-prod/prod-functions-after-0b.json
diff <(python3 -c "import json;d=json.load(open('/Users/michaelyoussef/ef-scratch-prod/prod-functions-before.json'));print('\n'.join(sorted(f\"{f['slug']} v{f.get('version')} jwt={f.get('verify_jwt')}\" for f in d)))") \
     <(python3 -c "import json;d=json.load(open('/Users/michaelyoussef/ef-scratch-prod/prod-functions-after-0b.json'));print('\n'.join(sorted(f\"{f['slug']} v{f.get('version')} jwt={f.get('verify_jwt')}\" for f in d)))")
```
**Expect exactly one changed line: `send-inspection-reminder` version +1, `verify_jwt` unchanged** (or the deliberate `false → true` flip you cleared in A.3.1 — record BOTH the before and after value). Any *other* function moving means the wrong thing was uploaded.

## 5.7 · The immediate invoke — what it proves, and what it does not

### ⛔ 5.7.0 — P-E2 RE-CHECK, in the SAME MINUTE as the curl

The gate was measured in §5.1. Since then you have run the timing gate, the capture, the identity gate, the deploy and the verification — **ten-plus minutes**, during which `reminder_scheduled_for <= now()` can newly become true for a booking. Re-measure at the point of use.

```sql
-- Run in PROD Studio in the SAME MINUTE as the curl below.
SELECT count(*) FILTER (WHERE l.email IS NOT NULL AND l.email <> '') AS pending_sendable_now,
       count(*)                                                     AS pending_as_ef_sees_it,
       min(cb.reminder_scheduled_for)                               AS next_boundary_already_crossed
FROM public.calendar_bookings cb
LEFT JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.reminder_sent = false AND cb.status = 'scheduled'
  AND cb.reminder_scheduled_for <= now() AND cb.lead_id IS NOT NULL;
```

⛔ **`pending_sendable_now` must still be `0`. If it is not, SKIP the curl entirely and let the cron do it.**

### 5.7.1 The invoke — one line, gated

Uses A.5's clipboard form. **One `!` invocation, one line** — the claims gate and the curl must not be split.

```bash
K="$(pbpaste)"; python3 -c 'import sys,base64,json;t=sys.argv[1].strip();p=t.split(".")[1] if t.count(".")==2 else "";d=json.loads(base64.urlsafe_b64decode(p+"="*(-len(p)%4))) if p else {};print("kind=",("legacy JWT" if p else ("new-style sb_secret_" if t.startswith("sb_secret_") else "unrecognised")),"ref=",d.get("ref"),"role=",d.get("role"));sys.exit(0 if (d.get("ref")=="ecyivrxjpsmjmexqatym" and d.get("role")=="service_role") else 1)' "$K" && curl -s -w '\nHTTP %{http_code}\n' -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{}'
```

*(New-style `sb_secret_…` key: confirm the project in PROD Studio per A.5 Form 2, then run the same line with the python gate replaced by `case "$K" in sb_secret_*) true;; *) false;; esac`.)*

### 5.7.2 Expected responses, in order of preference

| # | Precondition | Response | Reading |
|---|---|---|---|
| **1** | `pending_as_ef_sees_it > 0`, `pending_sendable_now = 0` (no-email rows only) | HTTP 200 `{"processed":N,"groups":M,"sent":0,"failed":0,"skipped":N,"alreadyClaimed":0,"released":0}`, logs `Processing N booking row(s) in M group(s)` + one "no customer email, skipping" per group | **THE STRONGER SMOKE TEST.** Proves the select (`272-290`), the grouping, the claimed-group `in.()` guard URL (`348-361`) and the new response shape are all live. **Nothing is sent** — the email check (`412-416`) precedes the claim (`438`). |
| **2** | `pending_as_ef_sees_it = 0` | HTTP 200 `{"processed":0,"sent":0,"failed":0,"message":"No pending reminders"}` (no `groups` field) | Proves boot + no `42703`, **and nothing else**. The function returns at `index.ts:300-306` before it groups, guards, claims or sends. |
| **3** | — | HTTP 500 `{"error":"RESEND_API_KEY not configured"}` (`index.ts:213-217`) | An **A.2 failure**, not a schema issue. **STOP.** |
| **4** | — | HTTP 500 `{"error":"Failed to query bookings","details":"… booking_group_id does not exist …"}` | Schema cache still reloading after a fresh 0a apply. **Wait 10 s and re-curl. Do NOT redeploy.** |
| **5** | — | HTTP 500 `{"error":"Failed to check claimed groups"}` | The guard read failed. **STOP**, capture `details`. |

⛔ **Run this ONLY while `pending_sendable_now = 0`**, re-checked per §5.7.0. Never while it is non-zero — a manual invoke there sends real customer email outside its normal window.

**What responses 1 and 2 prove:** the function booted and the `select(… booking_group_id …)` succeeded — so the column exists on PROD, PostgREST's schema cache has it, and there is **no `42703`**. That is the D2 gate closed with live evidence.

**What they do NOT prove:** the single-statement CAS claim, the group idempotency key, or any send. **The group claim is proven only by §5.8, on the first tick with due work.**

## 5.8 · The first real tick — what to watch

Logs: PROD Studio → Edge Functions → `send-inspection-reminder` → Logs, at the `reminder_scheduled_for` you recorded in §5.1.

### 5.8.1 The baseline log line

```
Processing N booking row(s) in M group(s)
```
⛔ **N must equal M until Step 2 ships.** N > M means a two-row group already exists and P-D missed it. The line prints only on a tick with due work (`index.ts:378`); a quiet tick prints nothing and returns `No pending reminders`. **Expect this line TWICE per hour** under SF-5 (unless A.4's flip case applies).

### 5.8.2 ⛔ Regression tripwire for AFTER Step 2 — NOT evidence about tonight

```sql
SELECT booking_group_id, count(DISTINCT reminder_sent_at) AS distinct_claim_times
FROM public.calendar_bookings
WHERE reminder_sent = true AND booking_group_id IS NOT NULL
GROUP BY booking_group_id
HAVING count(DISTINCT reminder_sent_at) > 1;
```

⛔ **Before fan-out ships, this query is structurally incapable of returning a row.** 0a adds `booking_group_id uuid NOT NULL DEFAULT gen_random_uuid()` and verifies one distinct group id **per row** before COMMIT (`0a-migration.sql:420, 481-489`), so every group holds exactly one row and `count(DISTINCT reminder_sent_at)` is 1 by construction. **Its zero-row result is NOT evidence about tonight's deploy.** Run it from Step 2 onward, after every reminder window for the first week.

### 5.8.2b The detector that CAN fire tonight — two claims for one job-day under DIFFERENT group ids

```sql
SELECT cb.lead_id,
       (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date AS mel_date,
       count(*)                            AS rows_claimed,
       count(DISTINCT cb.booking_group_id) AS distinct_groups,
       count(DISTINCT cb.reminder_sent_at) AS distinct_claim_times,
       array_agg(cb.id ORDER BY cb.id)     AS booking_ids
FROM public.calendar_bookings cb
WHERE cb.reminder_sent = true
  AND cb.reminder_sent_at > now() - interval '7 days'
  AND cb.lead_id IS NOT NULL
GROUP BY 1, 2
HAVING count(*) > 1
ORDER BY mel_date DESC;
```

**Zero rows = pass.** Rows with `distinct_groups > 1` are the post-0a D1 failure mode — a writer supplying two valid but distinct non-NULL group ids for one occurrence, which 0a's `NOT NULL` cannot catch. Cross-check each against §5.8.3 for an actual duplicate email.

### 5.8.3 ⛔ One real email per group — the duplicate detector

```sql
SELECT lead_id, subject,
       count(*) FILTER (WHERE status = 'sent')                                 AS sent_rows,
       count(DISTINCT provider_message_id) FILTER (WHERE status = 'sent')      AS distinct_messages,
       count(*) FILTER (WHERE status = 'sent' AND provider_message_id IS NULL) AS sent_rows_without_provider_id,
       min(sent_at) AS first_sent, max(sent_at) AS last_sent
FROM public.email_logs
WHERE template_name = 'inspection_reminder' AND sent_at > now() - interval '7 days'
GROUP BY lead_id, subject
HAVING count(*) FILTER (WHERE status = 'sent') > 1
ORDER BY last_sent DESC;
```

**Trigger on `sent_rows`, then classify. Never let NULL ids mean "same message."** `index.ts:523` writes `provider_message_id: result.data?.id || null`, so a `status='sent'` row can carry NULL — and SQL `count(DISTINCT x)` ignores NULLs, which would make two genuinely distinct customer emails read as `distinct_messages = 0`. Gating on `count(DISTINCT provider_message_id) > 1` hides the exact failure this deploy exists to prevent.

| Result | Verdict |
|---|---|
| Zero rows | **PASS** |
| `distinct_messages > 1` | **CONFIRMED customer-visible duplicate** → §5.9 + incident review |
| `sent_rows_without_provider_id > 0` | **UNDECIDABLE from the DB.** Resolve in Resend (dashboard / API, that recipient + subject) before standing down. |

**Do NOT use SESSION 1's R1 detector** (`count(*) FILTER (WHERE reminder_sent) > 1` per group) after this deploy — the group claim deliberately sets `reminder_sent` on every row of a group, so it false-positives on correct behaviour. Also remember the pre-existing case that is **not** 0b: a lead re-booked without cancelling the old row gets a reminder for each date under old and new code alike.

> ⛔ **If A.6 (G3) found `email_logs_sent_by_fkey` PRESENT on PROD, this query is unusable** — no `email_logs` rows are being written at all, so its zero-row result is an *environmental* zero, not a pass. Substitute: (a) the function log line `email_logs insert failed … 23503`, which only the new blob's `logReminderEmail` helper prints and therefore doubles as proof the new code is live; and (b) the Resend dashboard for that recipient + subject. Say so explicitly in the sign-off.

### 5.8.4 Attribution unchanged (Bucket B)
```sql
SELECT sent_by, template_name, status, recipient_email, provider_message_id, left(error_message,150) AS err, sent_at
FROM public.email_logs
WHERE template_name = 'inspection_reminder'
ORDER BY sent_at DESC
LIMIT 5;
```
Expect `sent_by = a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f` (SYSTEM_USER_UUID), `status = 'sent'`.

> ⛔ **Also void if A.6 (G3) found the FK present.** No rows means nothing was written, not that nothing was sent.

### 5.8.5 ⛔ Two invocations per hour — telling SF-5 apart from fan-out

You will see two `send-inspection-reminder` invocations at `:00` in PROD's function logs, one reporting `alreadyClaimed ≥ 1, sent: 0` (either `Group <id>: another row in this group is already claimed, skipping send` or `Booking <id>: already claimed by another invocation, skipping send`). **That is DEV's cron, per A.4. Expected. Not fan-out.** (If A.3.1 recorded `verify_jwt = false` and the deploy flipped it, expect ONE invocation instead — also correct, per A.4's table.)

**Discriminator 1 — PROD's own outbound calls.** `net._http_response` records responses to requests made **by this project**. DEV's call is recorded on DEV, not here.
```sql
SELECT id, created, status_code, content::text AS run_summary
FROM net._http_response
WHERE created > now() - interval '6 hours'
ORDER BY created DESC
LIMIT 20;
```
**Exactly ONE reminder row per `:00` tick** (plus the daily `check-overdue-invoices` row at 23:00 **UTC**). One row here + two invocations in the logs = SF-5. Two rows here per tick = PROD is somehow calling itself twice, which is a different problem.

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

*The live schedule is `20260601120000_fix_cron_auth_headers.sql:7-8, 21-30` — it `cron.unschedule`s the jobs created by `20260218000003` and `20260420000000` (whose originals sent **no** Authorization header and therefore 401'd on every firing) and re-creates them, posting hourly on the hour, 24/7, with `'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')`. That Vault read is the mechanism SF-5 is about. **Confirm against the live `command` column — do not infer it from either migration file.***

**Discriminator 3 — the one that actually matters: emails, per tick.**
```sql
SELECT date_trunc('hour', sent_at) AS tick_hour,
       count(*) FILTER (WHERE status = 'sent')                                 AS sent_rows,
       count(DISTINCT provider_message_id) FILTER (WHERE status = 'sent')      AS distinct_messages,
       count(*) FILTER (WHERE status = 'sent' AND provider_message_id IS NULL) AS sent_rows_without_provider_id,
       count(*) FILTER (WHERE status = 'failed')                               AS failed_rows
FROM public.email_logs
WHERE template_name = 'inspection_reminder' AND sent_at > now() - interval '24 hours'
GROUP BY 1
ORDER BY 1 DESC;
```
**The doubled invocation adds zero rows here.** `sent_rows` equals the number of due groups for that hour, not twice it.

⛔ **Flag any tick where `sent_rows <> distinct_messages` OR `sent_rows_without_provider_id > 0`.** The second is not a pass — it is "undecidable from the DB, go and look in Resend". If a tick shows more distinct messages than due groups, that is a real duplicate → §5.9 and an incident review.

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
| `Processing N booking row(s) in M group(s)` with **N > M** | logs | A two-row group exists before Step 2 | Investigate the writer; §5.8.2b + P-D |
| Two `Processing …` lines per hour | logs | **SF-5. Expected.** | None |
| ⛔ `booking_group_id is NULL — falling back to per-row claim` | logs | **Cannot fire with 0a applied** (`NOT NULL`). If it prints, PROD's column is nullable or 0a is missing | Stop; re-run P-B / P-C |
| ⛔ `rows disagree on start_datetime/location_address` | logs | One group describes two different jobs/times; a retry could change the payload under one idempotency key → Resend 409 → reminder silently suppressed | Investigate that group immediately |
| ⛔ `Failed to check claimed groups` (HTTP 500) | curl / logs | Guard read failed; the run aborted rather than risk a duplicate. No email this tick | Recovers next tick. Persisting ⇒ PostgREST/DB |
| `Group <id>: … already claimed, skipping send` | logs | Working as designed — **and the normal SF-5 second invocation** | None |
| `email_logs insert failed … 23503` | logs | G3 FK present on PROD | Not fatal; §5.8.3/§5.8.4 void — use Resend. **Positive proof the new blob is live** |
| Zero reminders at all on a tick with due work | logs + §5.1 "tick to watch" | As bad as a duplicate | Check `42703` first (D2), then P-E2 |
| Duplicate in a customer inbox | Slack failure feed, customer reply, §5.8.3 | The thing this deploy prevents | §5.9, then incident review |

The D1 tripwire is **not** in these logs any more: with `booking_group_id NOT NULL DEFAULT gen_random_uuid()`, the NULL warning can never print. Its replacement is PostgREST/Postgres **`23502` on `calendar_bookings`** at the *write* path (`bookingService.ts:134-136` → visible booking failure, browser console, Sentry, Postgres logs). Neither tripwire catches D1's real failure mode after 0a — a fan-out writer supplying **two different non-NULL group ids** for one job-day, which is a perfectly valid insert. Only `N == M`, P-D, §5.8.2b, and SESSION 4's R1 (run **after** Step 2) detect that.

## 5.9 · Rollback 0b — manual, no platform support

Redeploy the bytes you captured in §5.3. **Not** a git checkout, **not** an edit to any worktree.

```bash
# sanity: the artefact is the pre-change source
git hash-object ~/ef-scratch-prod/0b-before-prod/supabase/functions/send-inspection-reminder/index.ts
#  EXPECT whatever §5.3 actually captured (bf95002f… or fab3d39a…) — that hash IS the artefact
```

### ⛔ `verify_jwt` does NOT roll back on its own

**Every CLI deploy re-asserts `verify_jwt = true` for these two slugs — including this one.** If A.3.1 recorded `false`, a plain rollback deploy leaves the gateway flipped after a "complete" rollback, silently. A missing `config.toml` beside the artefact changes nothing: the CLI defaults to `true` either way.

```bash
# If A.3.1 recorded verify_jwt = TRUE for send-inspection-reminder (the default reproduces it):
cd ~/ef-scratch-prod/0b-before-prod && npx supabase functions deploy send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api

# If A.3.1 recorded verify_jwt = FALSE — the --no-verify-jwt flag is MANDATORY:
cd ~/ef-scratch-prod/0b-before-prod && npx supabase functions deploy send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api --no-verify-jwt
```

Verify the rollback exactly as you verified the deploy — **a rollback deploy is a deploy; it earns no more trust than the one it undoes:**

```bash
mkdir -p ~/ef-scratch-prod/0b-rollback-check
npx supabase functions download send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir ~/ef-scratch-prod/0b-rollback-check
cmp ~/ef-scratch-prod/0b-before-prod/supabase/functions/send-inspection-reminder/index.ts \
    ~/ef-scratch-prod/0b-rollback-check/supabase/functions/send-inspection-reminder/index.ts && echo "ROLLBACK VERIFIED"
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym -o json > ~/ef-scratch-prod/prod-functions-after-rollback.json
python3 -c "import json;d=json.load(open('/Users/michaelyoussef/ef-scratch-prod/prod-functions-after-rollback.json'));print([(f['slug'],f.get('version'),f.get('verify_jwt')) for f in d if f['slug'] in ('send-inspection-reminder','calculate-travel-time')])"
#  verify_jwt MUST read the value A.3.1 recorded, not merely 'true'
```

### Expiry rule

- **Safe before Step 1/2.** Every group has exactly one row, so the group claim and the per-row claim are equivalent; rolling back changes nothing observable.
- ⛔ **Not safe once a two-row group can exist.** After Step 1/2, rollback reinstates the duplicate-send bug. **Fix forward.**
- ⛔ **If §5.3 captured `fab3d39a…`**, rolling back to that artefact re-introduces the bare unchecked `email_logs` insert (the pre-`98fed73` state). **Prefer redeploying `bf95002f`** from `~/ef-scratch-prod/expected/0b-old.ts` in that case, and say so out loud.

### What rollback does NOT undo

- **Emails already sent cannot be recalled.** The one-way door.
- `reminder_sent` / `reminder_sent_at` set by the group claim stay set — and should: those customers were reminded.

If the rollback is because duplicates already went out: size the blast radius with §5.8.3 over a wider window, pull `provider_message_id`s as the evidence trail, and hand customer communication to Glen and Clayton. **It is not an engineering decision.**

---

# PART C — STEP 6 · `calculate-travel-time` (0c)

Deploys blob `afc363caae3464e61f8670b9155dabc23e2bc258` (branch `fix/travel-time-multitech`, also merged to local `main` @ `ee0a2f3`). No DB writes anywhere in this function; the rate limiter is in-memory (10 requests / 60 s per IP).

## 6.1 · ⛔ The prediction queries — run BEFORE the deploy, so §6.7 predicts instead of diagnoses

0c widens two `leads`-side filters from `assigned_to = T` to `assigned_to = T OR id IN (leads named by T's own non-cancelled bookings)`. On one-technician data the second set is a subset of the first, so the result is unchanged — **except** for a booking assigned to T whose lead's `assigned_to` is NULL or someone else. HANDOFF §7 P3 measured that as `0` on DEV and **never measured it on PROD.**

**Run all three before deploying.** Afterwards they are predictions you check; without them, every difference is a regression you investigate at 2 a.m.

### 0c-P1 — the `check_availability` delta rows ONLY

> **Not the recommended-dates delta.** `check_availability` builds its filter from bookings on **one** date (`index.ts:1084`, `fetchMelbourneBookings(supabase, technician_id, [date])`). `get_recommended_dates` builds it from bookings across the **whole 7-business-day window** (`index.ts:1409`). Use 0c-P2 for that.

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

- **Zero rows ⇒ 0c is a provable no-op for `check_availability` on today's PROD data.**
- **Rows ⇒ those exact (technician, date) pairs will read *busier* after the deploy.** That is the correction, not a regression.

### 0c-P2 — predicts BOTH code paths, including the cross-date union

Window mirrors `get_recommended_dates` (7 weekdays from tomorrow, padded ±1 day because the EF derives its window from UTC `new Date()`, not Melbourne).

```sql
WITH window_days AS (
  SELECT d::date AS d
  FROM generate_series((now() AT TIME ZONE 'Australia/Melbourne')::date,
                       (now() AT TIME ZONE 'Australia/Melbourne')::date + 15,
                       interval '1 day') AS d
  WHERE extract(isodow FROM d) < 6
),
techs AS (
  SELECT DISTINCT cb.assigned_to AS tech
  FROM public.calendar_bookings cb
  WHERE cb.status <> 'cancelled' AND cb.assigned_to IS NOT NULL
),
booked_same_day AS (
  SELECT cb.assigned_to AS tech,
         (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date AS d,
         cb.lead_id
  FROM public.calendar_bookings cb
  WHERE cb.status <> 'cancelled' AND cb.assigned_to IS NOT NULL AND cb.lead_id IS NOT NULL
),
booked_in_window AS (
  SELECT DISTINCT b.tech, b.lead_id
  FROM booked_same_day b
  WHERE b.d IN (SELECT d FROM window_days)
)
SELECT t.tech, w.d,
       count(*) FILTER (WHERE l.assigned_to = t.tech) AS old_visible,
       count(*) FILTER (WHERE l.assigned_to = t.tech
                          OR l.id IN (SELECT bs.lead_id FROM booked_same_day bs
                                       WHERE bs.tech = t.tech AND bs.d = w.d))
                                                     AS new_check_availability,
       count(*)                                      AS new_recommended_dates
FROM techs t
CROSS JOIN window_days w
JOIN public.leads l
  ON l.inspection_scheduled_date = w.d
 AND ( l.assigned_to = t.tech
       OR l.id IN (SELECT bw.lead_id FROM booked_in_window bw WHERE bw.tech = t.tech) )
GROUP BY t.tech, w.d
ORDER BY w.d, t.tech;
```

- `new_check_availability` = predicted `day_schedule.length` for that (tech, date).
- `new_recommended_dates` = predicted `appointment_count` for that day in the recommended-dates list.
- **Rows where `new_recommended_dates > new_check_availability` are the CROSS-DATE deltas 0c-P1 cannot see** — a lead booked to T on Tuesday whose `inspection_scheduled_date` is Wednesday and whose `assigned_to` is someone else. That is `get_recommended_dates`' window-wide union and it is **correct behaviour**.

### 0c-P3 — pick §6.7.1 row 6's target

Row 6 only exercises the risky `id.in.(…)` filter form if the technician actually has booking rows on that date. `attendedLeadsFilter` (`index.ts:787-789`) returns the bare `assigned_to.eq.<uuid>` when `attendedLeadIds` is empty — a form with shipped precedent, which proves nothing.

```sql
SELECT cb.assigned_to AS technician_id,
       (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date AS mel_date,
       count(*) FILTER (WHERE cb.lead_id IS NOT NULL) AS booking_rows_with_lead
FROM public.calendar_bookings cb
WHERE cb.status <> 'cancelled' AND cb.assigned_to IS NOT NULL
  AND (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date >= (now() AT TIME ZONE 'Australia/Melbourne')::date
GROUP BY 1, 2
HAVING count(*) FILTER (WHERE cb.lead_id IS NOT NULL) > 0
ORDER BY mel_date, technician_id;
```

**Write down one (technician, date) pair from this result.** That is row 6's target and nothing else will do.

## 6.2 · ⛔ GATE G1 — capture the RUNNING source, and the STOP that lives here

```bash
mkdir -p ~/ef-scratch-prod/0c-before-prod
npx supabase functions download calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir ~/ef-scratch-prod/0c-before-prod
find ~/ef-scratch-prod/0c-before-prod -type f | sort
git hash-object ~/ef-scratch-prod/0c-before-prod/supabase/functions/calculate-travel-time/index.ts
```

⛔ **G2 applies here too: hash the specific `index.ts`. Never test tree cleanliness** — the download writes `supabase/.temp/**`.

### G1 decision table — `calculate-travel-time`

| captured | action |
|---|---|
| `897042d76a41e674deaf113c2bccb3c5f00927bb` | **proceed**; deploy ships ONE commit (`1ca3bec`); rollback target = `897042d` |
| anything else (incl. `1d802297…`, `f583b9dc…` = `b1d982a` rate-limiting) | **STOP.** ≠ `897042d` means the deploy would also ship `92f5487` (provenance, 449+/61−) and/or other commits. |

> **Specifically, `1d802297565323e6b8d940313f099df2b9673889` means PROD is running the pre-provenance build** — the version *before* `92f5487` ("fix: no fabricated travel times"). Deploying 0c from that state does not ship a ~35-line filter change: **it also ships `92f5487`**, which removes the invented 30-minute travel default and replaces it with explicit nulls plus a `source` discriminator (`google_api` / `unavailable` / `no_origin`), a new `UnknownAvailabilityResponse` shape, and `earliest_start` / `buffer_minutes` / `is_feasible` / `suggestions` withheld instead of guessed. That is a **user-visible behaviour and response-shape change** in the same wave, and §6.7's comparison becomes meaningless.

```bash
cmp ~/ef-scratch-prod/expected/0c-old.ts ~/ef-scratch-prod/0c-before-prod/supabase/functions/calculate-travel-time/index.ts \
  && echo "RUNNING == 897042d7 (production/main pre-change) — PROCEED"
cmp ~/ef-scratch-prod/expected/0c-preprovenance.ts ~/ef-scratch-prod/0c-before-prod/supabase/functions/calculate-travel-time/index.ts \
  && echo "⛔ PROD IS PRE-PROVENANCE (92f5487 NOT DEPLOYED) — STOP"
# only if it matches neither:
diff -u ~/ef-scratch-prod/expected/0c-old.ts ~/ef-scratch-prod/0c-before-prod/supabase/functions/calculate-travel-time/index.ts | head -60
```

If `_shared/errorReporting.ts` also comes back in the download, hash it too — expect `fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6`.

## 6.3 · ⛔ IDENTITY GATE — `~/mrc-travel-ef` (or `~/mrc-merge`)

**⛔ Never `~/mrc-app-prod`** — it sits on `feat/area-hide-in-report-main` @ `54a60b9` with the **OLD** 0c blob `897042d7`, AND its `supabase/.temp/*` files are **tracked** there, so a cleanliness check misreads. SESSION 6 §3.1/§4 told you to deploy and diff from there; that instruction is **superseded** — its pass criterion is inverted (an empty `git diff` in `~/mrc-app-prod` would mean the *old* code shipped).

```bash
git -C ~/mrc-travel-ef rev-parse --show-toplevel
#  EXPECT /Users/michaelyoussef/mrc-travel-ef
git -C ~/mrc-travel-ef merge-base --is-ancestor 1ca3bec HEAD && echo "ANCESTOR OK"
git -C ~/mrc-travel-ef status --porcelain --untracked-files=all -- supabase/
#  EXPECT no output at all
ls ~/mrc-travel-ef/supabase/functions/calculate-travel-time/
#  EXPECT index.ts only
git -C ~/mrc-travel-ef hash-object supabase/functions/calculate-travel-time/index.ts
#  EXPECT afc363caae3464e61f8670b9155dabc23e2bc258      ← THE identity
git -C ~/mrc-travel-ef hash-object supabase/functions/_shared/errorReporting.ts
#  EXPECT fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6      ← imported by index.ts, ships with it
git -C ~/mrc-travel-ef hash-object supabase/config.toml
#  EXPECT ce718aa0578ea180dbd6571a6932b91f4c942129
```

**All seven. Do not deploy on six.** The upload closure for 0c is `calculate-travel-time/index.ts` + `_shared/errorReporting.ts` (a relative import) + `config.toml`; there is no `deno.json` and no import map.

**Alternate origin:** `~/mrc-merge` (`main` @ `ee0a2f3`) carries the same three blobs and is equally valid for 0c. It carries the **OLD 0b** blob — harmless here, because `functions deploy calculate-travel-time` uploads only that function. See Part D's branch-hygiene gate before deploying anything *else* from it.

## 6.4 · Baseline BEFORE deploying

Pick one technician + date pair that **has at least one appointment**; if 0c-P1 returned rows, also one pair **from 0c-P1**; and the **0c-P3 pair** for row 6. For each, capture:

1. Screenshots at **375px** on mrcsystem.com: the availability panel (day schedule, "previous appointment" / travel origin, earliest start) and the recommended-dates list (all 5 days, order, scores, reasons, slot lists).
2. Optionally, a machine-comparable JSON baseline (read-only; no DB writes, one Google Distance Matrix call each — well inside the 10 req/60 s limiter):

**Claims gate per A.5 — one line each. `<TECH_UUID>`, `<YYYY-MM-DD>` and the addresses are literals you substitute before running.**

```bash
K="$(pbpaste)"; python3 -c 'import sys,base64,json;t=sys.argv[1].strip();p=t.split(".")[1] if t.count(".")==2 else "";d=json.loads(base64.urlsafe_b64decode(p+"="*(-len(p)%4))) if p else {};print("ref=",d.get("ref"),"role=",d.get("role"));sys.exit(0 if (d.get("ref")=="ecyivrxjpsmjmexqatym" and d.get("role")=="service_role") else 1)' "$K" && curl -s -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/calculate-travel-time -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{"action":"check_availability","technician_id":"<TECH_UUID>","date":"<YYYY-MM-DD>","requested_time":"11:00","destination_address":"<a real destination address>"}' > ~/ef-scratch-prod/0c-avail-before.json && python3 -m json.tool ~/ef-scratch-prod/0c-avail-before.json
```

```bash
K="$(pbpaste)"; python3 -c 'import sys,base64,json;t=sys.argv[1].strip();p=t.split(".")[1] if t.count(".")==2 else "";d=json.loads(base64.urlsafe_b64decode(p+"="*(-len(p)%4))) if p else {};print("ref=",d.get("ref"),"role=",d.get("role"));sys.exit(0 if (d.get("ref")=="ecyivrxjpsmjmexqatym" and d.get("role")=="service_role") else 1)' "$K" && curl -s -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/calculate-travel-time -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{"action":"get_recommended_dates","technician_id":"<TECH_UUID>","destination_address":"<same address>","destination_suburb":"<suburb>"}' > ~/ef-scratch-prod/0c-dates-before.json && python3 -m json.tool ~/ef-scratch-prod/0c-dates-before.json
```

⛔ **Record the `source` field in `0c-avail-before.json`.** `"google_api"` ⇒ the PROD Maps key is live. `"unavailable"` ⇒ it is expired (as recorded on 2026-08-27) — which fixes half of §6.7.2's table to null on both sides. **This is the branch §6.7 depends on. Settle it here, with the response.**

## 6.5 · Deploy — say it aloud first

> **Deploying `calculate-travel-time` to `ecyivrxjpsmjmexqatym` — PROD, the LIVE mrcsystem.com project. Global-immediate, no rollback window.**

```bash
cd ~/mrc-travel-ef && npx supabase functions deploy calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api
```

## 6.6 · Verify by download + hash + `cmp`

```bash
mkdir -p ~/ef-scratch-prod/0c-after-prod
npx supabase functions download calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir ~/ef-scratch-prod/0c-after-prod
find ~/ef-scratch-prod/0c-after-prod -type f | sort
git hash-object ~/ef-scratch-prod/0c-after-prod/supabase/functions/calculate-travel-time/index.ts
#  PASS = afc363caae3464e61f8670b9155dabc23e2bc258
cmp ~/ef-scratch-prod/expected/0c-new.ts ~/ef-scratch-prod/0c-after-prod/supabase/functions/calculate-travel-time/index.ts \
  && echo "BYTE-IDENTICAL"
# if _shared came back:
git hash-object ~/ef-scratch-prod/0c-after-prod/supabase/functions/_shared/errorReporting.ts || echo "_shared not returned by download"
#  EXPECT fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6 when present
```

**Belt-and-braces markers, on the DOWNLOADED file** (these hold whether or not `_shared` round-trips):
```bash
grep -c "attendedLeadsFilter" ~/ef-scratch-prod/0c-after-prod/supabase/functions/calculate-travel-time/index.ts                # EXPECT 3   (definition + 2 call sites)
grep -c "\.eq('assigned_to', technician_id)" ~/ef-scratch-prod/0c-after-prod/supabase/functions/calculate-travel-time/index.ts # EXPECT 0   ← the one that matters
grep -c "\.eq('assigned_to', technicianId)" ~/ef-scratch-prod/0c-after-prod/supabase/functions/calculate-travel-time/index.ts  # EXPECT 1   (calendar_bookings — correct, must stay)
```
`3 / 0 / 1` is the new blob; `0 / 2 / 1` is the old one. This is a genuine discriminator and the standing post-deploy check for this function from now on.

```bash
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym -o json > ~/ef-scratch-prod/prod-functions-after-0c.json
python3 -c "import json;d=json.load(open('/Users/michaelyoussef/ef-scratch-prod/prod-functions-after-0c.json'));print([(f['slug'],f.get('version'),f.get('verify_jwt')) for f in d])"
```
**Expect `calculate-travel-time` version +1, `verify_jwt` unchanged** (or the deliberate flip cleared in A.3.1), and nothing else moved.

⛔ Any hash mismatch or non-empty `cmp`: **STOP, do not run §6.7**, diff, go to §6.8.

## 6.7 · Behaviour on live single-technician data

### 6.7.1 The UI comparison — at 375px, on mrcsystem.com

| # | Action | Expected |
|---|---|---|
| 1 | Booking flow: pick the technician + date from §6.4 (one they are already booked on) | Availability panel loads, **no error toast** |
| 2 | Read the day schedule | Same appointments, same times, same `ends_at` as the baseline — unless this pair is in 0c-P1/0c-P2, in which case exactly the extra rows predicted |
| 3 | Read "previous appointment" / travel origin | Same suburb and address — unless a delta lead is now the nearest earlier job |
| 4 | Open recommended dates | Same 5 days, same order, same scores, same slot lists — unless 0c-P2 predicted a change for one of those days. **Check `new_recommended_dates`, not `new_check_availability`, for this row.** |
| 5 | Pick a technician with an **empty** day | Still reads "Free all day, N min from home" (or "Free all day" if the Maps key is expired) |
| 6 | ⛔ **Malformed-filter detector** — see below | **Non-empty day schedule** and no `Error fetching appointments:` in the logs |

**Row 6, in full.** Open the availability panel for a **(technician, date) pair FROM 0c-P3** — one with at least one non-cancelled `calendar_bookings` row carrying a `lead_id`, so `attendedLeadsFilter` emits the `id.in.(…)` term. **A tech-date with leads but no booking rows only exercises the single-term `.or()` — the form that already has shipped precedent — and proves nothing.**

Row 6 catches the riskiest failure. A malformed PostgREST `or=` string does not throw: the query errors, the function logs it and returns **HTTP 200 with an empty schedule**. A broken filter therefore looks like "this technician has nothing on", i.e. every technician reads *freer* than they are, which is precisely the bug 0c fixes. Row 5 alone cannot distinguish it; row 6 can.

### ⛔ The pass/fail criterion is DIRECTIONAL, not equality

The filter change is provably a superset (`attendedLeadsFilter`, `index.ts:781-790`), so:

- **FAIL (roll back):** any `day_schedule` or `appointment_count` that **SHRINKS**, or any technician-day that goes from non-empty to **EMPTY**. Both are impossible under a superset filter and mean the `or=` string is malformed.
- **INVESTIGATE, do not roll back:** growth beyond the 0c-P1/0c-P2 prediction. Re-run 0c-P2 and check whether the extra lead is booked to this technician on a **different day inside the same window** — that is `get_recommended_dates`' window-wide union and is correct behaviour.
- **EXPECTED, not a signal:** `earliest_start`, `score`, `rating`, `reason`, which 5 dates are returned and their order, all moving in either direction on a day whose count changed.

### 6.7.2 Which response fields may legitimately move — and in which direction

| Field | Direction | Why |
|---|---|---|
| `day_schedule` length (`check_availability`) | **Monotone non-decreasing** | The filter went from `assigned_to = T` to `assigned_to = T OR id IN (…)` — a strict superset. Nothing can drop out. |
| `appointment_count` (`get_recommended_dates`) | **Monotone non-decreasing**, and can exceed the same day's `day_schedule` | Same superset, but built from the **whole window's** bookings, not one date's. |
| `available_slots` | **Unchanged** | Busy ranges come from `fetchMelbourneBookings` (untouched) plus orphan ranges, and a delta lead is by construction already in `bookedLeadIds` — including in the cross-date case — so it never becomes an orphan range. Only the *count quoted inside a `reason` string* can move. |
| `earliest_start` | **Either direction** | A newly visible job can become `previous_appointment`. `earliest = previous.ends_at + travel` replaces `business_start + travel_from_home`: a nearby job ending at 08:00 makes it **earlier**; a job ending at 14:00 makes it **later**. |
| `buffer_minutes`, `requested_time_works`, `is_feasible`, `available`, `suggestions` | **Either direction** | All derived from `earliest_start`. |
| `previous_appointment`, `travel_origin_address`, `travel_time_minutes`, `travel_distance_km` | **Either direction** | The measured leg starts somewhere else. |
| `score`, `rating`, `reason` | **Either direction** | A day can leave the `appointment_count === 0` branch: `Free all day, X min from home` scores `100 − X`; `After <suburb> job, same suburb` scores 90 (**up** if X > 10, **down** if X < 10); `≥ 6 bookings` scores 20. |
| Which 5 dates are returned, and their order | **Either direction** | The list is sorted by score and truncated to 5, so a date can drop out of view. **A date leaving the top 5 is not "an appointment disappearing."** |
| Response shape, field names, request schemas | **Unchanged** | `AvailabilityResponse`, `RecommendedDatesResponse`, `TriageLeadResponse`, `DateRecommendation` are byte-identical. No frontend deploy is coupled to this one. |

**If §6.4 showed `source: "unavailable"` (expired PROD Maps key):** `earliest_start`, `buffer_minutes`, `travel_time_minutes`, `travel_distance_km` and `suggestions` are null/empty **before and after**, so they cannot move at all. The only live surfaces are `day_schedule`, `previous_appointment`, and the recommended-dates scoring fields.

Optional exact comparison, if you took §6.4's JSON — re-run the two one-liners into `0c-avail-after.json` / `0c-dates-after.json`, then:
```bash
diff <(python3 -m json.tool ~/ef-scratch-prod/0c-avail-before.json) <(python3 -m json.tool ~/ef-scratch-prod/0c-avail-after.json)
diff <(python3 -m json.tool ~/ef-scratch-prod/0c-dates-before.json) <(python3 -m json.tool ~/ef-scratch-prod/0c-dates-after.json)
```
Empty diff on a pair **not** in 0c-P1/0c-P2 is the pass. A **shrink** on any pair is a FAIL. Growth is reconciled against 0c-P2, not rolled back. (A live Maps key can move `travel_time_minutes` by a minute or two between calls on traffic alone — judge the *structure*, not the last digit.)

### 6.7.3 ⛔ Watch the logs — the fail-soft path

PROD Studio → Edge Functions → `calculate-travel-time` → Logs. Look for:

```
Error fetching appointments:
```

**This is the only signal for a malformed `or=` filter** (`index.ts:1106-1108`). The function catches it, logs it, and returns HTTP 200 with an empty schedule — so a broken filter reports technicians as *freer* than they are. **Check the line explicitly; never infer success from a 200.** Also watch `Error fetching calendar bookings:` (same fail-soft shape, in the booking fetch).

The syntax has shipped precedent against this same PostgREST and this same `leads` table — a single-term `.or(...)` (`leadDuplicates.ts:44`) and `in.(…)` nested inside an `or` group (`useLeadsToSchedule.ts:74`) — but precedent is not proof on PROD data. **Row 6 against a 0c-P3 pair, plus this log line, is the proof.**

### 6.7.4 Not testable until Step 2 — record it and move on

With a two-technician booking in place, `check_availability` for the **secondary** must show the shared job in their day schedule and must not score their day "Free all day". That is the acceptance test for the whole fix; it cannot run before Step 2, which is exactly why §6.7.1 exists.

## 6.8 · Rollback 0c

```bash
git hash-object ~/ef-scratch-prod/0c-before-prod/supabase/functions/calculate-travel-time/index.ts
#  the artefact — expect 897042d76a41e674deaf113c2bccb3c5f00927bb
```

### ⛔ `verify_jwt` does NOT roll back on its own — same hazard as §5.9

```bash
# If A.3.1 recorded verify_jwt = TRUE for calculate-travel-time:
cd ~/ef-scratch-prod/0c-before-prod && npx supabase functions deploy calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api

# If A.3.1 recorded verify_jwt = FALSE — --no-verify-jwt is MANDATORY:
cd ~/ef-scratch-prod/0c-before-prod && npx supabase functions deploy calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api --no-verify-jwt
```

If the captured tree lacks `_shared/errorReporting.ts` (the download did not return it), copy `fccc83eb…` into place first:
```bash
mkdir -p ~/ef-scratch-prod/0c-before-prod/supabase/functions/_shared && cp ~/ef-scratch-prod/expected/shared-errorReporting.ts ~/ef-scratch-prod/0c-before-prod/supabase/functions/_shared/errorReporting.ts && git hash-object ~/ef-scratch-prod/0c-before-prod/supabase/functions/_shared/errorReporting.ts
#  EXPECT fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6
```

Verify the rollback exactly as you verified the deploy:
```bash
mkdir -p ~/ef-scratch-prod/0c-rollback-check
npx supabase functions download calculate-travel-time \
    --project-ref ecyivrxjpsmjmexqatym --use-api --workdir ~/ef-scratch-prod/0c-rollback-check
cmp ~/ef-scratch-prod/0c-before-prod/supabase/functions/calculate-travel-time/index.ts \
    ~/ef-scratch-prod/0c-rollback-check/supabase/functions/calculate-travel-time/index.ts && echo "ROLLBACK VERIFIED"
grep -c "attendedLeadsFilter" ~/ef-scratch-prod/0c-rollback-check/supabase/functions/calculate-travel-time/index.ts   # EXPECT 0
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym -o json > ~/ef-scratch-prod/prod-functions-after-rollback-0c.json
python3 -c "import json;d=json.load(open('/Users/michaelyoussef/ef-scratch-prod/prod-functions-after-rollback-0c.json'));print([(f['slug'],f.get('version'),f.get('verify_jwt')) for f in d if f['slug']=='calculate-travel-time'])"
#  verify_jwt MUST read the value A.3.1 recorded
```
**A rollback deploy is a deploy. It earns no more trust than the one it undoes — verify it the same way.**

### Expiry rule

- **Safe before Step 1/2.** Rolling back reverts to the pre-existing filter, which today produces the same result set (modulo the 0c-P1/0c-P2 rows, which revert to being hidden).
- ⛔ **Not safe once a two-technician booking exists.** After Step 1, rollback reinstates the silent double-book: the secondary's day reads free and the engine offers a slot on top of a job they are attending. **Fix forward.**

### Blast radius if you do nothing

Bounded. The worst case is a wrong `or=` filter failing soft, so availability reports technicians as *freer* than they are — the pre-existing behaviour this change fixes. **The function performs no writes of any kind.** It cannot corrupt data.

---

# PART D — SIGN-OFF

Deploy is complete only when **all** of these are true.

**Pre-condition**
- [ ] 0a is APPLIED AND VERIFIED **on PROD** (Step 4). Measured 2026-08-31: PROD had **no** `booking_group_id` column.

**Shared**
- [ ] A.1 CLI reads **2.101.0** (not 2.116.0); all seven `~/ef-scratch-prod/expected/*` round-trip `OK`
- [ ] A.2 PROD secrets listed (names/digests only): `RESEND_API_KEY`, `SYSTEM_USER_UUID`, `GOOGLE_MAPS_API_KEY` present; `SYSTEM_USER_UUID` digest matches sha256 of the canonical sentinel
- [ ] A.3 `functions list -o json` captured BEFORE **and `verify_jwt` is actually present in it for both slugs** (Management API fallback used if not)
- [ ] A.3.1 `verify_jwt` hazard cleared for both functions; if `false` for 0b, the three-part claims PASS met in **PROD** Studio
- [ ] A.4 read and understood: **two invocations per hour on PROD's reminder logs is SF-5, not fan-out** — and A.4's conditional table read against A.3.1's recorded value
- [ ] A.5 service_role key captured and claims-gated; every curl run as a **single line**
- [ ] **A.6 (G3)** `email_logs` FK list captured on PROD; `email_logs_sent_by_fkey` ABSENT (or, if PRESENT, **raised before the 0b deploy** and §5.8.3/§5.8.4 marked unusable)

**Step 5 · 0b**
- [ ] §5.1 P-A…P-E3 run **against PROD, in this sitting** — P-B one `uuid NOT NULL` row, P-C `0`, P-D zero rows, P-E1 zero rows
- [ ] §5.1 P-E2: **`pending_sendable_now = 0`** and **`distinct_groups_in_guard_url < 150`**; `pending_no_email_never_clears` **recorded, not waited on**; all four values compared to the 2026-08-31 measured zero baseline
- [ ] §5.1 P-E3 `first_future_tick` recorded and confirmed outside the deploy window; "tick to watch" recorded
- [ ] §5.2 deployed between `:10` and `:45`, not in `23:00`–`23:10` **UTC**; drain check showed `since_last_write` > ~3 min
- [ ] §5.3 **G1** running source captured and hashed; the decision table row taken; if `fab3d39a…`, **Michael's explicit acceptance obtained before deploying**. The captured tree — not a git blob — is the rollback artefact. **G2: verified by `hash-object`, never by tree cleanliness**
- [ ] §5.4 all six identity checks passed from **`~/mrc-reminder-ef`**; `index.ts` = `6df442b8…`, `config.toml` = `ce718aa0…`
- [ ] §5.5 ref stated aloud as LIVE and confirmed before the command
- [ ] §5.6 download + `hash-object` + `cmp` clean; `functions list` diff shows only `send-inspection-reminder` version +1, `verify_jwt` before **and** after recorded
- [ ] §5.7.0 P-E2 **re-checked in the same minute** as the curl; §5.7.1 response matched row 1 or row 2 of the table, logged as **boot + no `42703`** (row 2) or as **select + grouping + guard URL live** (row 1) — explicitly **not** as proof of the group claim
- [ ] §5.8 first tick with due work watched: `Processing N booking row(s) in M group(s)` with **N == M**; §5.8.2b zero rows; §5.8.3 zero rows **and** `sent_rows_without_provider_id = 0`; §5.8.4 `sent_by = a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f`; §5.8.5 shows one `net._http_response` row per tick against two log invocations (or one, per A.4's flip case)
- [ ] §5.8.2 recorded as a **post-Step-2 tripwire**, NOT as tonight's evidence

**Step 6 · 0c**
- [ ] §6.1 0c-P1, corrected 0c-P2 **and** 0c-P3 run on PROD **before** the deploy; the delta set written down as a prediction; the 0c-P3 pair written down as row 6's target
- [ ] §6.2 **G1** running source captured and hashed = `897042d76a41e674deaf113c2bccb3c5f00927bb` — **⛔ anything else, including `1d802297…`, is a STOP**
- [ ] §6.3 identity gate passed (**all seven**) from **`~/mrc-travel-ef`** (or `~/mrc-merge`), **never `~/mrc-app-prod`**: `index.ts` = `afc363ca…`, `_shared/errorReporting.ts` = `fccc83eb…`, `config.toml` = `ce718aa0…`
- [ ] §6.4 baseline captured at 375px (+ JSON if taken); **`source` field recorded** — it decides which half of §6.7.2 is live
- [ ] §6.5 ref stated aloud as LIVE and confirmed
- [ ] §6.6 download + hash + `cmp` clean; grep markers **`3 / 0 / 1`**; `functions list` shows only `calculate-travel-time` version +1
- [ ] §6.7 UI comparison at 375px shows **no shrink and no empty-day regression**; every growth reconciled against corrected 0c-P2 or the cross-date union; **row 6 run against a 0c-P3 pair** and showing a non-empty day schedule; no `Error fetching appointments:` in the logs

**⛔ Branch hygiene — the silent-rollback gate**

Edge Function deploys upload from a working directory, so the *next* unrelated EF deploy from a `main` or `production` worktree will quietly revert whichever of these two functions that tree still carries at its old blob. Today `production` carries **both** old blobs, and `main` carries the old 0b.

This session must not `git fetch`, and local `main`/`production` will keep reading the pre-merge blobs after a GitHub merge until someone does. **Read the authoritative value from GitHub instead** — the contents API returns the git blob SHA-1 directly:

```bash
gh api "repos/michaelyoussef396/mrc-app/contents/supabase/functions/send-inspection-reminder/index.ts?ref=main"       --jq .sha   # EXPECT 6df442b819e70c27d92704bd4f5ccc513b906b49
gh api "repos/michaelyoussef396/mrc-app/contents/supabase/functions/send-inspection-reminder/index.ts?ref=production" --jq .sha   # EXPECT 6df442b819e70c27d92704bd4f5ccc513b906b49
gh api "repos/michaelyoussef396/mrc-app/contents/supabase/functions/calculate-travel-time/index.ts?ref=production"    --jq .sha   # EXPECT afc363caae3464e61f8670b9155dabc23e2bc258
```

Local equivalents are valid **only** after Michael runs `git fetch origin` in his own terminal, and must then be read off the **remote-tracking** refs, never the local branch heads:
`git -C ~/mrc-app-1 ls-tree origin/main -- supabase/functions/send-inspection-reminder/index.ts` · `git -C ~/mrc-app-1 ls-tree origin/production -- supabase/functions/calculate-travel-time/index.ts`

- [ ] **`fix/reminder-group-claim` merged into `main` AND `production`** — both `gh api` lines read `6df442b8…`
- [ ] **`fix/travel-time-multitech` merged into `production`** (already on `main` @ `ee0a2f3`) — the third `gh api` line reads `afc363ca…`
- [ ] Until **all three** lines read the new blobs: **no Edge Function may be deployed from `~/mrc-app-prod`, `~/mrc-merge`, or any `main`/`production` checkout.** A deploy of `send-inspection-reminder` from such a tree silently restores `bf95002f` — duplicate customer emails, green CLI, incremented version, no error anywhere.
- [ ] Merge with **"Create a merge commit"**. Never squash, never rebase.

**Record-keeping**
- [ ] `DEPLOY-LOG.md` updated with: every captured before-hash and the G1 decision-table row it landed on; deployed versions before/after; **`verify_jwt` before AND after for BOTH functions** (it is the input to A.4's double-invocation prediction, not a footnote); the P-E2 four values against the 2026-08-31 measured zero baseline; the A.6/G3 result; 0c-P1/0c-P2/0c-P3 row counts and the chosen pairs; the tick watched; and any deviation
- [ ] SF-5 left **unremediated and recorded** — remediation is its own session, per `SF-5-prod-credential-in-dev-vault.md` §5
- [ ] SF-6 (deployed-EF-vs-git drift) recorded as a permanent operating rule: **capture before every EF deploy, on every project**
- [ ] Follow-up filed in `docs/TODO.md`: chunk the claimed-group guard at 100 group ids per request

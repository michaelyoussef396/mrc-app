# MULTI-TECH PREREQ DEPLOY — SESSION A LOG

# ▶ RESUME HERE — cold start, 2026-08-31 ~04:00 AEST

**Read this section only. Everything below is the evidence trail.**

## Where we stopped
**Phase 1 (DEV) is COMPLETE.** 0a applied + verified, 0b deployed + verified + behaviourally signed off, 0c deployed + verified + behaviourally signed off. Nothing is half-done, no DB or EF is in an intermediate state.
**Phase 2 (PROD) has NOT STARTED.** Nothing has been applied or deployed to PROD. The only PROD writes tonight were an accidental test lead/booking, since purged (`DELETE 1` twice, confirmed).

## State of each project

| | DEV `ctppzqnysmzynkxjlzta` | PROD `ecyivrxjpsmjmexqatym` |
|---|---|---|
| 0a `booking_group_id` | ✅ APPLIED + A1–A8 pass | ❌ not applied (column absent, verified) |
| 0b `send-inspection-reminder` | ✅ v9 = `6df442b8…` | ❌ not deployed; **deployed blob NOT yet captured** |
| 0c `calculate-travel-time` | ✅ v7 = `afc363ca…` | ❌ not deployed; deployed blob **captured = `897042d…`** ✅ G1 passes |
| `generate-inspection-pdf` | — | current at `a6dcbdb5…` (checked for SESSION B's push) |

## THE NEXT COMMAND — Phase 2 step 1
Open `docs/multi-tech/deploy/step4-PROD-preflight-0a.md` and run its gates in **PROD Studio**, pasting each result back. All read-only, safe at any hour. ~15 blocks.
**Start with PP1 (identity) and PP3 (row count).** PROD leads were 144 before tonight's test row was added and purged — **re-measure, do not reuse 144.**
**The gate that decides the night: PP6a** (natural-group ambiguity). Non-zero ⇒ STOP; GUARD 1 will abort the migration and the offending groups need a human adjudicating individual bookings. That is the single most likely stopping point and is not a late-night task.

## Hard gates already agreed (do not soften)
- **G1** — capture PROD's deployed source BEFORE each EF deploy. 0c: `897042d…` ✅ banked. **0b: still to capture.** `bf95002f` ⇒ ships ONE commit, proceed. `fab3d39a` ⇒ ships TWO (98fed73 + cf49ebf) ⇒ **STOP, put the decision to Michael first.** Anything else ⇒ STOP, report only.
- **G2** — verify by `git hash-object` on the specific `index.ts`, NEVER by tree cleanliness (`functions download` writes `supabase/.temp/**`).
- **G3** — PROD `email_logs_sent_by_fkey` must be ABSENT (migration `20260813120000`). Present ⇒ §6.3/§6.4 unusable on PROD; raise before the 0b deploy. Does not block it.
- Deploy 0b ONLY from `~/mrc-reminder-ef`, 0c ONLY from `~/mrc-travel-ef`. **Never `~/mrc-app-prod`** (on `feat/area-hide-in-report-main`, both blobs stale). `production` now carries `afc363ca`, so a 0c deploy from any production worktree would ship 0c outside its procedure.
- CLI pinned **2.101.0**. Do not upgrade mid-sequence.
- Apply 0a between **:10 and :20**, never `:45`–`:10` — PROD's cron and DEV's SF-5 twin both fire at `:00`.
- Migration body (lines 309–495, `BEGIN;`…`COMMIT;`) is **ONE Studio execution**. A non-Postgres error is not proof of rollback — run A1 first.

## Loose ends
- **DEV test data** — lead `458390f5-62cb-42d5-957d-3b95ea72d4d7`, booking `532ec2b0-77b6-4163-9140-ae5f447311de` (`ZZ TEST — 0c REHEARSAL — DELETE`). Becomes a pending reminder after 2026-09-01 09:00 AEST and would email `michaelyoussef396@gmail.com`. Purge booking first.
- **`verify_jwt` for `calculate-travel-time` on DEV is UNOBSERVED** (sandbox guard blocked the JSON output). Check explicitly on PROD.
- **SESSION B handover** — `docs/multi-tech/deploy/SESSION-B-DOC-CORRECTIONS.md`, 8 items incl. SF-6 for `HANDOFF.md` §8. Untracked; needs committing when the freeze lifts.
- **SF-5** (PROD-valid credential in DEV's Vault) — write-up at `~/Desktop/SF-5-prod-credential-in-dev-vault.md`. Own session, not a deploy task.
- **DEV catch-up backlog** — DEV is missing `20260813120000_drop_email_logs_sent_by_fkey`; DEV's EF/migration state has drifted generally.
- **Live blocker in another session** — job before-photo upload. Do not touch job-completion or photo files.

## Files
`docs/multi-tech/deploy/` — `step2-*` (DEV 0a), `step3-0b-DEV.md`, `step4-0c-DEV.md`, `step4-PROD-preflight-0a.md`, `step5-PROD-deploy-0b-0c.md`, `SESSION-B-DOC-CORRECTIONS.md`. All untracked.
`~/ef-scratch/` — every capture and baseline, including the PROD 0c rollback artefact.

---

## Pins (content hashes, not branches)
- 0a migration `supabase/migrations/20260828120000_add_booking_group_id.sql` → blob `6d4cb51db8c0251098307fc4b7fcc94fa9b4356b` (identical on feat/booking-group-id and main)
- 0b `supabase/functions/send-inspection-reminder/index.ts` → blob `6df442b819e70c27d92704bd4f5ccc513b906b49` (fix/reminder-group-claim; commit cf49ebfe ancestor). Rollback blob `bf95002f7bfd76506c3fc71783fb35e59681e1f3` (= main = production = c99caa4) — UNVERIFIED as what PROD actually runs until download.
- 0c `supabase/functions/calculate-travel-time/index.ts` → blob `afc363caae3464e61f8670b9155dabc23e2bc258` (fix/travel-time-multitech; merged to local main ee0a2f3). Pre-change blob `897042d…` on main/production — UNVERIFIED as what PROD runs.
- Branch state is in flux (SESSION B merging). main local = ee0a2f3 has 0a + 0c merged, NOT 0b.

## DEV pre-flight — captured 2026-08-30 (ctppzqnysmzynkxjlzta)
- D1: postgres/postgres, PG 17.6, inet_server_addr 2406:da18:e5c:b702:487c:dc49:1281:429b, leads 3, bookings 3
- D2: 0 rows (column absent)
- D3: B1 = 3 rows; 200 kB total / 16 kB heap / 144 kB idx
- D4: rows_in_group=1 × 2 groups (voided-inclusive D4c: 1 × 3). D4b n/a. D4d: NOT PASTED — to confirm.
- D5: enum booking_status = scheduled,in_progress,completed,cancelled,rescheduled (NO no_show)
- D6: exactly update_calendar_bookings_updated_at + trigger_set_reminder_scheduled_for
- D7: B4 = 9 indexes (pkey, inspection_id, lead_start, reminder_pending, start_time, tech_date_status, tech_end_time, technician_id, technician_time). All 9 exist in repo migrations.
- D8: SF-1 confirmed (single policy authenticated_full_access_bookings)
- D9a: anon/authenticated/postgres/service_role all arwdDxtm  → SF-3 logged
- D9b: 0 rows
- D10a: 0 orphans / 3 total
- D10b: scheduled/inspection/unsent = 2; cancelled/inspection/unsent = 1
- D10c: B7 = 0
- D11: BOTH cron jobs (jobid 3 check-overdue-invoices 0 23 * * *, jobid 4 send-inspection-reminders 0 * * * *) target PROD ecyivrxjpsmjmexqatym with DEV vault 'service_role_key' bearer → DEV's own table has NO scheduled writer; DEV cron is a cross-project caller into PROD (whether it authenticates: see D18)
- D12: B5 t0='2026-08-30 19:30:00+10'; row_count 3; fingerprint e92d84bdba558ccf08fa97828f26d217
- D13: pending_sendable_now = 2, no-email 0 → first DEV invoke of 0b will email 2 addresses (D17 lists them)

## Standing findings (not actioned in this workstream)
- SF-1: calendar_bookings has no per-technician RLS (confirmed DEV D8)
- SF-2: audit_log_trigger() carries anon EXECUTE (from HANDOFF)
- SF-3 (NEW 2026-08-30, DEV D9a): `anon` holds SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on public.calendar_bookings (relacl anon=arwdDxtm/postgres). Supabase default grant set; RLS (enabled, not forced; policy auth.uid() IS NOT NULL) is the SOLE control — anon is denied only because auth.uid() is NULL. Materialises if RLS is ever disabled on the table or a permissive anon policy is added. Re-check on PROD (S4-P9a).
- SF-4 (NEW 2026-08-30, DEV D11): DEV pg_cron jobs 3 and 4 POST to PROD's Edge Functions hourly/daily with DEV Vault 'service_role_key'. If that key is PROD-valid (clone), a PROD credential lives in the sandbox and PROD's reminder EF is double-triggered at :00. D18 decides which.
- Pre-existing (not 0b): a lead re-booked without cancelling the old row gets two reminders (old + new date) under old AND new code; 6.3 must not attribute it to 0b.

## Verification-pass corrections adopted
- Migration body BEGIN→COMMIT must be ONE Studio execution (statement-by-statement drops SET LOCAL/LOCK/timeouts).
- Studio non-Postgres error (timeout/network) ≠ rollback: run A1 first, don't re-paste blind.
- Owner check (D14) before apply.
- P-E → P-E1 (24h failed-attempt window) + P-E2 (EF-mirrored pending) for 0b.
- 6.3 → count DISTINCT provider_message_id WHERE status='sent'.
- Guard in-list URL bound: pending_sendable_now must be < 150 before 0b invoke/deploy (follow-up: chunk to 100 after 0b verified).
- P-F: capture CURRENTLY DEPLOYED source before each EF deploy; that is the true rollback artefact.
- DEV rehearsal must check D17 addresses; RESEND_API_KEY presence on DEV via `npx supabase secrets list --project-ref ctppzqnysmzynkxjlzta` (names only).

## DEV step 2a (captured 2026-08-30)
- D14 is_owner = true · D15 pgrst_ddl_watch present 'O' · D4d = 0 rows (confirmed)
- D16 LIVE trigger body has NO 'no_show' branch (only 'cancelled','completed') → repo 20260218000001 ≠ live (out-of-band edit; forked history). Not a gate.
- D17: both pending addresses are Michael's own (michaelyoussef396@gmail.com + a typo'd variant on a test lead) → rehearsal safe to send.
- D18: net._http_response id 1377 · 200 · {"processed":1,"sent":0,"failed":0,"skipped":0,"alreadyClaimed":1,"released":0} · 2026-08-30 09:00:00.023502+00 → PROD's function RAN on a DEV-Vault bearer. SF-4 upgraded to **SF-5 CRITICAL** (write-up: SF-5-prod-credential-in-dev-vault.md; Desktop copy for SESSION B). Live proof the per-row CAS absorbs the double-trigger (DEV lost the claim, sent 0).

## Review-pass corrections adopted for steps 3–6 (workflow results 5–9)
- Deploy origins: 0b from ~/mrc-reminder-ef ONLY (6df442b8; carries OLD 0c); 0c from ~/mrc-travel-ef (afc363ca) or ~/mrc-merge (main @ ee0a2f3; carries OLD 0b). ~/mrc-app-prod is on feat/area-hide-in-report-main @54a60b9 — NEVER deploy from it. Identity gate also hashes config.toml (ce718aa0…) and _shared/errorReporting.ts (fccc83eb…, 0c only).
- No git writes anywhere: `functions download --use-api --workdir <empty dir>`; expected bytes via `git cat-file blob <hash>`; cmp + hash-object.
- Pre-deploy capture of the RUNNING source on each target = rollback artefact. Expected 0b before-blob bf95002f…; 0c before-blob 897042d7… (if 1d802297… PROD is pre-provenance → STOP, deploy would also ship 92f5487).
- `functions list --output json` before/after: version +1, verify_jwt unchanged (deploy re-asserts config default true).
- Pin CLI: `npx supabase --version` → V.
- DEV secrets list (names only): RESEND_API_KEY + SYSTEM_USER_UUID for 0b; GOOGLE_MAPS_API_KEY for 0c; note SENTRY_DSN/SENTRY_ENVIRONMENT (0c errors on DEV may tag production in Sentry).
- 0b P-E → P-E1 (24h failed window) + P-E2 (EF-mirrored). 6.3 → DISTINCT provider_message_id WHERE status='sent'. Guard in-list bound: pending_sendable_now < 150.
- 0b invoke on DEV: shell var SUPABASE_SERVICE_ROLE_KEY (read -rs), claims check (ref=DEV, role=service_role) BEFORE curl; DEV URL only. Expect processed=2, groups=2, sent=2.
- Failed DEV send → email_logs Slack trigger posts to PROD's send-slack-notification (Vault internal_webhook_secret); residual risk accepted once RESEND_API_KEY confirmed.
- 0c DEV rehearsal needs: GOOGLE_MAPS_API_KEY present on DEV (any value; expired OK → source 'unavailable' but day_schedule still populated); 0c-P1 delta query (leads pointer ≠ booked tech on same Melbourne date) on DEV and PROD; positive-control pair via 0c-DEV-1; curl check_availability before/after; watch `Error fetching appointments:` in logs (fails soft → freer).
- SESSION 6 §4 pass criterion is INVERTED for ~/mrc-app-prod (empty diff there = old code shipped). Use hash-object, not git diff.
- Sign-off must include: fix/reminder-group-claim merged into main AND production before any other EF deploy from a main/production worktree (else silent 0b rollback).
- Post-deploy standing check for calculate-travel-time: grep counts 3 / 0 / 1.
- Step-3 handover written: docs/multi-tech/deploy/step3-0b-DEV.md

## STEP 2 RESULT — 0a IS LIVE ON DEV (2026-08-30)
The apply committed during the wifi drop. The re-paste failed loudly at **42701 column already exists** and rolled back cleanly — the bare `ADD COLUMN` (not `IF NOT EXISTS`) working exactly as designed (S4-R1's backstop).
- A1 `booking_group_id | uuid | NO | gen_random_uuid()`
- A2 `3 | 3 | 0` · A3 10 indexes incl. idx_calendar_bookings_booking_group_id, nothing removed
- A4 `row_count 3 | e92d84bdba558ccf08fa97828f26d217` — IDENTICAL to D12 ⇒ no row trigger fired, no updated_at moved
- A5 `0` (= D10c) · A6 zero rows · A7 `1 | 3` · A8 `true`
⇒ SESSION 5 P-B / P-C / P-D satisfied for DEV. GUARD 2's per-row volatile-default assumption is now PROVEN on a real database, not just documented.

## Deploy-origin matrix (verified on disk 2026-08-30, read-only)
| worktree | branch @ HEAD | 0c blob | 0b blob | use for |
|---|---|---|---|---|
| ~/mrc-reminder-ef | fix/reminder-group-claim @2b65d7c | 897042d (OLD) | **6df442b8** | **0b only** |
| ~/mrc-travel-ef | fix/travel-time-multitech @1ca3bec | **afc363ca** | bf95002f (OLD) | **0c only** |
| ~/mrc-merge | main @ee0a2f3 | **afc363ca** | bf95002f (OLD) | 0c alternate |
| ~/mrc-app-prod | feat/area-hide-in-report-main @54a60b9 | 897042d (OLD) | bf95002f (OLD) | **NEVER** |
All three usable worktrees are clean under `supabase/`; cf49ebfe and 1ca3bec confirmed ancestors of their HEADs.
`production` branch blobs: 0c 897042d · 0b bf95002f · _shared/errorReporting fccc83eb · config.toml ce718aa0.
0c bundle closure on the branch = `calculate-travel-time/index.ts` alone + `_shared/errorReporting.ts` (imported); no deno.json / import_map.

## STEP 3.1–3.2 (2026-08-31) — DEV inventory + pre-deploy capture
- CLI pinned **2.101.0** (2.116.0 available — do NOT upgrade mid-sequence; it would change the bundler between the DEV rehearsal and the PROD deploy).
- DEV secrets: RESEND_API_KEY ✅, SYSTEM_USER_UUID ✅, GOOGLE_MAPS_API_KEY ✅ (PROD's is expired per memory — DEV may exercise travel better than PROD), SENTRY_DSN **absent** (so no production-tagged Sentry noise from the 0c rehearsal), SLACK_WEBHOOK_URL present but off-path (the email_logs trigger posts to PROD's send-slack-notification, not DEV's). SUPABASE_PUBLISHABLE_KEYS/SECRET_KEYS both = sha256("[]") ⇒ empty ⇒ DEV is on legacy JWT keys only.
- DEV functions list: send-inspection-reminder v8 verify_jwt=true updated 2026-08-08 19:20 AEST · calculate-travel-time v6 verify_jwt=true updated 2026-08-27 07:56 AEST · receive-framer-lead verify_jwt=false (declared in config.toml — expected, not a finding).

### 🔴 DEPLOYED-vs-GIT DRIFT CONFIRMED ON DEV
DEV's deployed `send-inspection-reminder` = blob **fab3d39a140ec018aaecc2f70ba8cc00ba61ea97** = commit **c9761b6** (2026-08-08 19:01 AEST; deployed 19 min later). That is **one commit behind** main/production's bf95002f. Missing commit = **98fed73** "harden email_logs insert with error checking" (43 ins / 5 del: adds the `logReminderEmail` helper with error checking + try/catch, replacing a bare unchecked insert). Nothing else differs.
- DEV rollback target for 0b = **fab3d39a** (captured at ~/ef-scratch/0b-before-dev/), NOT bf95002f. Prefer redeploying bf95002f if rollback is ever needed — restoring fab3d39a re-introduces the silent-failure insert.
- Deploying 0b to DEV ships **two** commits (98fed73 + cf49ebf). Nothing lost.
- DEV's `calculate-travel-time` = **897042d** (commit 92f5487, deployed 26 min after it) = the same blob `production` carries ⇒ DEV is at the correct pre-0c state for step 4.
- **Implication for PROD: the pre-deploy capture is mandatory and its result is genuinely unknown.** PROD may also be on c9761b6. If so, the PROD 0b deploy also ships 98fed73 — acceptable (already on the production branch, pure robustness) but must be stated and accepted BEFORE deploying, not discovered after. Same rule for 0c: capture ≠ 897042d ⇒ STOP.

### ✅ ROUND-TRIP FIDELITY PROVEN (gates the whole verification strategy)
The downloaded bytes hash to an exact historical git blob (fab3d39a = c9761b6's blob). A lossy server-side unbundle cannot land on a specific SHA-1 in this repo's history. Therefore `functions download --use-api` returns deployed source byte-for-byte and `git hash-object` on it is a valid verification method. Both runbooks' download-and-verify strategy stands.
**But one correction is now demonstrated, not theoretical:** the download also writes `supabase/.temp/cli-latest` and `supabase/.temp/linked-project.json` into the workdir. SESSION 5 §5's "PASS = `git status --porcelain` prints nothing" would read those as a FAIL and trigger a rollback of a correct deploy. Verify by `hash-object` on the specific index.ts, never by tree cleanliness.

### Shell note
Each `!` invocation in Claude Code is a fresh shell — `export SCR=...` does not persist. All handover commands use literal paths. The step 3.7 `read -rs SUPABASE_SERVICE_ROLE_KEY` + curl must be ONE command line, or run in a separate Terminal window.

## PHASE 2 HARD GATES (Michael's instruction 2026-08-31 — gates, not notes)

**G1 · PROD capture is a hard gate for BOTH functions.** Capture before deploying; do not deploy on an unexplained hash.

`send-inspection-reminder` captured hash ⇒ action:
| captured | meaning | action |
|---|---|---|
| `bf95002f7bfd76506c3fc71783fb35e59681e1f3` | PROD = main/production. Deploy ships ONE commit (cf49ebf). | proceed; rollback target = bf95002f |
| `fab3d39a140ec018aaecc2f70ba8cc00ba61ea97` | PROD = c9761b6, one behind. Deploy ships **TWO** commits (98fed73 + cf49ebf). | **STOP and put the decision to Michael first**, stating what 98fed73 changes (adds the 43-line `logReminderEmail` helper: error-checked, try/catch-wrapped `email_logs` insert replacing a bare unchecked one; non-fatal by design so a lost log row cannot undo a sent email or skip the claim-release). Only deploy on explicit acceptance. Rollback target = fab3d39a. |
| anything else | PROD is running source we cannot name | **STOP. Report and propose nothing** until identified. |

`calculate-travel-time` captured hash ⇒ action:
| captured | action |
|---|---|
| `897042d76a41e674deaf113c2bccb3c5f00927bb` | proceed; deploy ships ONE commit (1ca3bec); rollback target = 897042d |
| anything else (incl. `1d802297…`, `f583b9dc…` = b1d982a rate-limiting) | **STOP.** ≠897042d means the deploy would also ship 92f5487 (provenance, 449+/61−) and/or other commits. |

**G2 · Verify by `git hash-object` on the specific `index.ts` path. NEVER by tree cleanliness.** `functions download` writes `supabase/.temp/cli-latest` and `supabase/.temp/linked-project.json` into the workdir; a `git status --porcelain` test reads those as a FAIL and would trigger a rollback of a correct deploy. Applies to SESSION 5 §5, SESSION 5 §8, SESSION 6 §4, SESSION 6 §6 and every PROD step.

**Handover to SESSION B:** `docs/multi-tech/deploy/SESSION-B-DOC-CORRECTIONS.md` — 8 items incl. SF-6 (EF drift) as a permanent HANDOFF.md §8 operating rule, the §5 PASS-criterion fix, the deploy-origin matrix, SF-3/SF-5, and the live `set_reminder_scheduled_for()` drift.

## DEV 3.4 results (2026-08-31) + the email_logs FK finding
- Block 1 P-E1: 0 rows · Block 2 P-E2: `2 | 0 | 2 | 2` · Block 3a: reminder_rows_before 0 · Block 4a: vault has `internal_webhook_secret` (2026-05-27), `service_role_key` (2026-06-01 — same day as 20260601120000_fix_cron_auth_headers.sql; SF-5 H1 corroboration) · Block 4b: posts_to_prod = true.
- **Block 3b: DEV STILL CARRIES `email_logs_sent_by_fkey` → auth.users(id).** I predicted its absence; wrong for DEV.
- `auth.users`: `system_user_exists = 0`, total 4, `sent_by` nullable YES, existing rows with sentinel 0, email_logs_total 3.
- **Root cause is known and already fixed in the repo:** `supabase/migrations/20260813120000_drop_email_logs_sent_by_fkey.sql`. Its header: the SYSTEM_USER_UUID sentinel is *deliberately* NOT an auth.users row (per docs/system-user-uuid.md) — it mirrors `audit_logs.user_id`, which intentionally carries no FK. "Confirmed on PROD 2026-08-13: auth.users has no such row, and email_logs is empty all-time." The fix was to DROP the FK, not to create the user. **DEV never received that migration** (forked history).
- ⇒ On DEV every `email_logs` insert from the reminder EF fails 23503. Non-fatal: `logReminderEmail` (0b-index.ts:238, called :519) catches everything; `sent++` (:530) is driven by `result.success`, and the release (:573-578) by `result.success`/`isPermanentFailure`. The claim, the counters, the release and the customer email are all unaffected.
- DEV secret `SYSTEM_USER_UUID` proven = canonical `a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f` by sha256 against the CLI digest `8f3317df…`. **Also proves `secrets list` prints a plain sha256 of the raw value** — so the SF-5 discriminator (hash DEV's Vault `service_role_key`, compare to the EF secret digest) is a valid method.

### DEV rehearsal check validity (do NOT read an environmental zero as a pass)
| check | status |
|---|---|
| 6.1 response JSON (processed==groups, sent, alreadyClaimed) | ✅ VALID |
| function log `Processing N booking row(s) in M group(s)`, N==M | ✅ VALID — the grouping proof |
| calendar_bookings claim state | ✅ VALID |
| the two emails arriving | ✅ VALID — the customer-visible outcome |
| 6.5 double-invoke idempotency | ✅ VALID |
| log line `email_logs insert failed … 23503` ×2 | ✅ VALID *positive* signal — only 98fed73's helper prints it, so it doubles as proof the new blob is live |
| **6.3 duplicate detector over email_logs** | ❌ UNTRUSTWORTHY — environmental zero, nothing is written |
| **6.4 attribution `sent_by = SYSTEM_USER_UUID`** | ❌ UNTRUSTWORTHY — no new rows on DEV |
| **6.2 distinct reminder_sent_at per group** | ⚠️ TAUTOLOGY before Step 2 (one row per group makes it structurally unable to return a row). Not environmental, but not evidence tonight either. Attack finding F8. |

### NEW PROD PRE-FLIGHT GATE (G3)
The right question is **not** "does PROD's SYSTEM_USER_UUID resolve" — it should not, by design, on either project. It is **"was 20260813120000 applied to PROD?"** Verify live, never from repo presence:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.email_logs'::regclass AND contype = 'f';
```
PASS = `email_logs_lead_id_fkey` and `email_logs_inspection_id_fkey` only; `email_logs_sent_by_fkey` **absent**. If present on PROD ⇒ PROD's reminder email_logs writes have been failing 23503 all along, SESSION 5 §6.3/§6.4 are unusable on PROD too, and that is a finding to raise before the 0b deploy (it does not block the deploy — the emails still send — but it changes what the post-deploy checks can prove).

## STEP 3.5–3.7 — 0b DEPLOYED AND VERIFIED ON DEV (2026-08-31)
- **3.5 deploy:** single asset uploaded (`index.ts` only — no `_shared`, no deno.json), version 8 → 9.
- **3.6 verify:** downloaded blob = `6df442b819e70c27d92704bd4f5ccc513b906b49`, `cmp` BYTE-IDENTICAL. `verify_jwt` unchanged (true). `updated_at` 1786180840979 → 1788100900422. `ezbr_sha256` d5d660b3… → 489ab348… (bundle digest moved ⇒ not a no-op redeploy — the 2026-08-26 failure mode ruled out a third independent way). `calculate-travel-time` untouched at v6.
- **3.7 invoke 1:** HTTP 200 `{"processed":2,"groups":2,"sent":2,"failed":0,"skipped":0,"alreadyClaimed":0,"released":0}`. **processed == groups == 2 — the grouping proof.**
- **3.7 claim state:** both scheduled rows claimed, cancelled row untouched.
  | row | group | status | reminder_sent_at |
  |---|---|---|---|
  | 90d6b1b2 | 38374dc2 | scheduled | 2026-08-30 14:55:19.947+00 |
  | 03fb0e32 | 92f42af4 | scheduled | 2026-08-30 14:55:20.66+00 |
  | 2ac5e53b | 386bf548 | cancelled | null (untouched) |
  Two DIFFERENT timestamps are CORRECT — two separate groups, two separate UPDATE statements 0.713 s apart (the loop sends an email between them). 6.2 asks for distinct timestamps *within* one group; each group has exactly one.
  **The cancelled row staying clean is the negative control:** a claim that lost its group predicate would have stamped all three rows with one timestamp. Two mechanisms protected it (pending query filters `status='scheduled'`; claim is group-scoped) and both held.
- Three distinct `booking_group_id` across three rows = 0a's per-row volatile default, as GUARD 2 proved.

### ✅ 0b DEV REHEARSAL SIGNED OFF 2026-08-31 — all six checks pass
1. **Inbox:** exactly one email at michaelyoussef396@gmail.com — correct template, correct lead data (35 Wellington Street Mernda, Wed 26/08/2026 9:00 AM). Typo'd variant received nothing (Resend accepted, then bounced) — the predicted and acceptable shape. No third email, no duplicate to one address.
2. **Logs, single execution `d647cc97`:** `Processing 2 booking row(s) in 2 group(s)` (N == M) · one `reminder sent to <addr>` per booking · two `email_logs insert failed … 23503 … email_logs_sent_by_fkey … Key (sent_by)=(a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f) is not present in table users` · **no** `booking_group_id is NULL` warning. The 23503s name the sentinel explicitly — confirms the missing FK-drop migration, not a code fault, and that only 98fed73's hardened helper surfaces it.
3. **Invoke 2:** `{"processed":0,"sent":0,"failed":0,"message":"No pending reminders"}`, HTTP 200, no second email. **The claim held.**

**What DEV could NOT rehearse (do not let a green run imply otherwise):** `email_logs`-based duplicate detection (6.3) and attribution (6.4) — both blocked by the FK; Resend idempotency-key behaviour on retry; and 6.2's within-group timestamp detector, which is a tautology before Step 2. All three are PROD-only, and 6.3/6.4 there are gated on G3.

### DEV CATCH-UP BACKLOG (separate session, NOT tonight)
- **DEV is missing `supabase/migrations/20260813120000_drop_email_logs_sent_by_fkey.sql`.** Every system-originated `email_logs` insert on DEV fails 23503. Non-fatal (email still sends) but it blanks `email_logs` on DEV and makes 6.3/6.4 untestable there. Apply during a DEV catch-up, then re-run the 0b behaviour checks on DEV if a fuller rehearsal is ever wanted.
- Worth a broader diff at the same time: DEV's EF deploys and migration state have both drifted (SF-6; DEV ran `c9761b6` for three weeks). A DEV-vs-repo reconciliation is its own piece of work.

### Superseded — outstanding items now closed
1. Inbox: one OR two emails both acceptable (`sent: 2` = Resend ACCEPTED 2, not delivered 2; the typo'd address bounces). **Failure shape = three emails, or two to the same address.**
2. Function logs: `Processing 2 booking row(s) in 2 group(s)`; `email_logs insert failed … 23503` ×2 (positive — only 98fed73's helper prints it); NO `booking_group_id is NULL` warning.
3. Invoke 2 → `{"processed":0,...,"message":"No pending reminders"}`, no new email.

## PROD EF STATE — measured 2026-08-31 (pre-push gate for SESSION B's main→production)
- `generate-inspection-pdf` deployed on PROD = **`a6dcbdb5f600ce12efdce5e4e561786581a95d61`** = `main` = `production`. **CURRENT.** The EF reads `include_in_report` (`index.ts:1676`), so `54a60b9`'s area-hide feature works end to end. Frontend push cleared on the right evidence.
- **Correction recorded:** the `include_in_report` COLUMN existing on PROD did NOT clear that gate — it is the *precondition for the silent failure*. `54a60b9` shipped the migration (Studio), the frontend (Vercel) and the EF read (CLI deploy) through three independent channels. Column present + EF stale = user hides an area, PDF prints it anyway, no error. Only the EF hash clears it.
- **SF-6 refined:** drift is **per-function and per-deploy-event**, not a uniform lag. DEV's reminder EF was 3 weeks stale while PROD's PDF EF is current. So neither "PROD is current" nor "PROD is stale" may be assumed — every function needs its own capture.
- `calculate-travel-time` on PROD: not yet captured. Expect `897042d76a41e674deaf113c2bccb3c5f00927bb` (pre-0c) — that capture is G1's gate for step 7 and can be banked any time.

### Deploy-origin matrix CHANGED (SESSION B merged main→production locally)
`production` now carries `afc363ca` for `calculate-travel-time`. **A `functions deploy calculate-travel-time` from any production-based worktree would now ship 0c**, bypassing its capture, identity gate and verification. `~/mrc-app-prod` was previously safe by accident (old blob); it is not any more. Deploy 0c ONLY via the step-4/step-7 procedure.

## SESSION A brief AMENDED 2026-08-31 02:xx AEST
May now run read-only network/CLI directly: `curl`, `gh api`, polling loops, `npx supabase functions download`, `git hash-object`. Still requires asking: git commit/push/merge/checkout, `supabase deploy`, any DB write, any non-read against PROD.

## FRONTEND PRODUCTION DEPLOY VERIFIED (5c842d4) — 2026-08-31
- GitHub deployment **6168889895**, env Production, sha `5c842d4`, state **success**, "Deployment has completed" 2026-08-30T16:43:19Z. Commit status context `Vercel` = success. **The build did not fail.**
- **The asset hash never moved, and that was correct, not a stall.** `index-Dv0G3mmz.js` is the ENTRY chunk; the app code-splits and all 26 commits landed in lazily-loaded ROUTE chunks, so the entry chunk's content — and therefore its content-derived hash — was unchanged. Proof the served HTML is the new deployment: `last-modified: Sun, 30 Aug 2026 16:43:43 GMT`, 24 s after the deployment completed.
- **My earlier `View in Schedule` grep targeted the wrong file.** The marker lives in `LeadDetail-Dk4n-xrx.js` (a route chunk fetched at runtime, absent from the HTML's asset list), not in the entry chunk. Grepping the entry chunk returned 0 and would have been read as "deploy didn't land". Corrected: marker = **1** in the route chunk.
- Env-var check on the entry chunk: **PROD ref 4, DEV ref 0** — Production `VITE_*` intact, no Preview/DEV leakage, no blank-page risk.
- **Lesson to carry:** on a code-split Vite app, "the entry asset hash moved" is NOT a deploy signal. Use the deployment's `last-modified` / `x-vercel-id`, or grep a marker in the ROUTE chunk that owns the change.

## G1 CAPTURE FOR 0c — BOTH PROJECTS, PASS
| project | `calculate-travel-time/index.ts` | `_shared/errorReporting.ts` |
|---|---|---|
| DEV `ctppzqnysmzynkxjlzta` | `897042d76a41e674deaf113c2bccb3c5f00927bb` ✅ | (captured) |
| PROD `ecyivrxjpsmjmexqatym` | `897042d76a41e674deaf113c2bccb3c5f00927bb` ✅ | `fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6` ✅ |
**G1 for 0c PASSES on PROD:** the deployed blob is exactly the expected pre-0c source, so the 0c deploy ships ONE commit (`1ca3bec`) and nothing else. No `92f5487`/`b1d982a` surprise. Rollback artefacts captured at `~/ef-scratch/0c-before-dev/` and `~/ef-scratch/prod-travel-check/`.
Both downloads carry `_shared/errorReporting.ts`, confirming the deploy bundle closure is index.ts + that module — matching the identity gate.

## ✅ 0c DEV REHEARSAL SIGNED OFF — 2026-08-31 ~03:45 AEST
**Deploy:** `calculate-travel-time` v6 → **v7** on DEV, 2026-08-31 03:42:23. Two assets uploaded (`index.ts` + `_shared/errorReporting.ts`) — exactly the predicted bundle closure. `send-inspection-reminder` untouched at v9; every other function unchanged.
**Byte verification:** downloaded `index.ts` = `afc363caae3464e61f8670b9155dabc23e2bc258` BYTE-IDENTICAL; `_shared/errorReporting.ts` = `fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6` BYTE-IDENTICAL. Marker triple **3 / 0 / 1** (old blob reads 0 / 2 / 1).
**Not observed:** `verify_jwt` — the `--output json` path was blocked by this session's sandbox guard and the table form omits the column. `config.toml` has no `[functions.calculate-travel-time]` section so the deploy re-asserted the default, but it is UNOBSERVED, not confirmed. Check it explicitly on PROD.

### Behaviour — PASS, directional criterion
- `check_availability` **2026-08-29**: byte-identical before/after.
- `check_availability` **2026-09-03**: byte-identical before/after.
- `get_recommended_dates`: only diff is `travel_from_home_minutes` 51→50 and its derived `score` 49→50 / `reason` text on the four EMPTY days. **Not a 0c effect** — that value comes from a live Google Distance Matrix call and the empty-day score is `100 − travel_from_home_minutes`. `appointment_count` unchanged on every day; the 3 Sep entry (score 75, "After Richmond job, nearby", count 1) is unchanged apart from the same 1-minute jitter.
- **No day_schedule shrank. No non-empty day went empty. No growth beyond prediction.** All three FAIL conditions clear.

### Both soft-fail paths proven NOT to have fired — behaviourally, not by log absence
`available_slots` for 2026-09-03 after the deploy = `['08:00','12:00','13:00','14:00','15:00','16:00','17:00']` — 09:00/10:00/11:00 blocked out by the test booking's window. That proves:
1. the `leads` query returned the row (`appointment_count 1`, suburb-derived reason) ⇒ `Error fetching appointments:` did not fire;
2. `fetchMelbourneBookings` returned the booking (`busyByDate` blocked the slots) ⇒ `Error fetching calendar bookings:` did not fire, so `attendedLeadsFilter` was built from real ids and emitted the two-term `id.in.(…)` form.
This is stronger than reading logs: a log absence can be a wrong time window, whereas populated output proves both queries succeeded.

### Attack finding F4 paid off in practice
Had the criterion been strict equality rather than directional, the Google 51→50 jitter would have read as a FAIL and triggered a rollback of a correct deploy. Keep the directional wording in the PROD doc.

### What DEV still could NOT rehearse (state in the sign-off; do not let a green run imply it)
The acceptance test for the whole fix — a SECONDARY technician's shared job appearing in their day schedule — needs a two-technician booking, impossible before Step 2. §4.7 is the proxy: today's data must produce today's answers, and it did.

### DEV test data still present — purge when done
lead `458390f5-62cb-42d5-957d-3b95ea72d4d7`, booking `532ec2b0-77b6-4163-9140-ae5f447311de` (`ZZ TEST — 0c REHEARSAL — DELETE`). Becomes a pending reminder after 2026-09-01 09:00 AEST.

## ✅ RESOLVED — test row on PROD, purged 2026-08-31 (`DELETE 1` twice, confirmed)
No reminder will fire; the technician's Thu 3 Sep calendar is clean. PROD lead count returns to 144, but **re-measure rather than reuse it** — B1/PP3 and PP6a must be captured fresh at pre-flight time. Original incident record below.

## (was) OUTSTANDING — TEST ROW ON PROD
The first INSERT ran against **PROD** `ecyivrxjpsmjmexqatym`: lead `f449392f-d158-4c23-b1a4-0fdde1be3f4a`, booking `5ccd4d8a-3a3a-42d2-a656-6bda78f150b4`, a fake job on real technician `d22fa3bb-…`'s calendar for Thu 3 Sep 09:00–11:00. `reminder_scheduled_for = 2026-08-31 23:00+00` = **Tue 1 Sep 09:00 AEST** — PROD's hourly cron will email `michaelyoussef396@gmail.com` (own address; no customer exposure). PROD counts moved: leads 144 → 145.
Purge, booking FIRST (`calendar_bookings.lead_id` is ON DELETE SET NULL):
```sql
DELETE FROM public.calendar_bookings WHERE id = '5ccd4d8a-3a3a-42d2-a656-6bda78f150b4';
DELETE FROM public.leads          WHERE id = 'f449392f-d158-4c23-b1a4-0fdde1be3f4a';
```
**Consequence for the PROD pre-flight:** B1/PP3 and PP6a must be captured fresh AFTER the purge, never reused from the 144-lead reading.

## Open

- SF-5 discriminators still to run: §3 claims query on DEV; `functions list` on PROD (step 4 pre-flight).
- Refutation phase of the workflow still running.
- Workflow phases 3–5 (0c review, DEV hazards, refutation) still running.

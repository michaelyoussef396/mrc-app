# Corrections SESSION B must fold into the committed docs

Written by SESSION A (deploy runbook) 2026-08-31, from the live DEV rehearsal.
SESSION A owns no git. These are verified against live behaviour, not inferred.

---

## 1 · `HANDOFF.md` §8 — add **SF-6** as a permanent operating rule

> ### SF-6 · Deployed Edge Function state on this project drifts from git, and no repo artefact reveals it
>
> **Demonstrated 2026-08-31 on DEV `ctppzqnysmzynkxjlzta`.** The deployed
> `send-inspection-reminder` was blob `fab3d39a140ec018aaecc2f70ba8cc00ba61ea97` — the source at
> commit `c9761b6` (2026-08-08 19:01 AEST, deployed 19 minutes later and never redeployed). That is
> **one commit behind** `main` and `production`, which both carry `bf95002f…`. The missing commit is
> `98fed73` "harden email_logs insert with error checking". Nothing in the repository, the branch
> graph, the CLI's reported version number, or the Studio dashboard showed this. `functions list`
> reported `version 8` — a number that proves an upload happened, not which source it uploaded.
>
> **The only detection is download-and-hash:**
> ```bash
> npx supabase@<pinned> functions download <name> --project-ref <ref> --use-api --workdir <empty dir>
> git hash-object <workdir>/supabase/functions/<name>/index.ts
> ```
> Compare the result to `git rev-parse <ref>:supabase/functions/<name>/index.ts`. A hash that matches
> no blob in the repository's history means the deployed source is not any committed source.
>
> **Round-trip fidelity is proven, not assumed:** the downloaded bytes hashed to an exact historical
> git blob. A lossy server-side unbundle cannot land on a specific SHA-1 already in this repo's
> history, so `--use-api` returns the deployed source byte-for-byte.
>
> **Operating rule, permanently:**
> 1. Capture the running source **before** every Edge Function deploy. That capture — not "the
>    previous commit" — is the rollback artefact. The repo's idea of the previous source may never
>    have been deployed.
> 2. Never treat a version bump, a green CLI message, or a branch name as evidence of what is live.
> 3. State the delta the deploy will actually ship (it may be several commits, not one) and get it
>    accepted before deploying, rather than discovering it afterwards.
>
> Corroborated on the same project the same day: DEV's `calculate-travel-time` was deployed
> 2026-08-27 07:56 AEST, 26 minutes after commit `92f5487` — blob `897042d…`, matching `production`.
> So the drift is per-function and per-deploy-event, not a uniform lag.

---

## 2 · `SESSION-5-DEPLOY-RUNBOOK.md` §5 (and §8's rollback verify) — the PASS criterion is wrong

**Current text:**
```bash
git -C /tmp/mrc-ef-verify status --porcelain -- supabase/functions/send-inspection-reminder/
#    PASS: no output — deployed source is byte-identical to the deploy commit
#    FAIL: any output — STOP and inspect
```

**Why it is wrong:** `functions download` also writes CLI state files into the workdir. Observed
2026-08-31:
```
supabase/.temp/cli-latest
supabase/.temp/linked-project.json
supabase/functions/send-inspection-reminder/index.ts
```
A tree-cleanliness test reads those as a FAIL. §5's ⛔ then routes the operator to §8 — **a
production rollback of a correct deploy.** The failure mode is the expensive direction.

**Replacement — hash the specific file, never test tree cleanliness:**
```bash
npx supabase@<pinned V> functions download send-inspection-reminder \
    --project-ref <ref> --use-api --workdir <empty scratch dir>
git hash-object <scratch>/supabase/functions/send-inspection-reminder/index.ts
#    PASS = 6df442b819e70c27d92704bd4f5ccc513b906b49
```
Optionally also `cmp` against `git cat-file blob 6df442b8… > <scratch>/expected.ts`.
`supabase/.temp/**` in the listing is expected and is not a failure.

Same substitution in §8's rollback verification.

## 3 · `SESSION-5-DEPLOY-RUNBOOK.md` — three further corrections

- **§5 needs no `git worktree add`.** `--workdir <empty dir>` is sufficient — CLI 2.101.0 needs no
  `config.toml` there, and `--workdir` stops the CLI walking up into a worktree and overwriting it.
  Drop the disposable-worktree dance; it is a git write the deploy session cannot make.
- **§1 P-E is mis-scoped.** It omits the function's own `lead_id IS NOT NULL` predicate and counts
  rows the function skips without claiming (leads with no email), so it can report a permanently
  non-zero "wait" that no tick will ever clear. Replace with the two-part P-E1 (a reminder released
  by the old code inside Resend's 24 h key window) / P-E2 (EF-mirrored pending count). Full SQL in
  `step3-0b-DEV.md` §3.4.
- **§6.3 false-positives on correct behaviour.** It counts every `email_logs` row per
  `(lead_id, subject)` regardless of status, but the function logs failed attempts too, so a
  transient failure followed by a successful retry scores 2 and trips a ⛔. Count
  `DISTINCT provider_message_id` where `status = 'sent'`. Full SQL in `step3-0b-DEV.md` §3.7.

## 4 · `SESSION-6-DEPLOY-RUNBOOK.md` §3.1/§3.3/§4/§6 — the deploy origin is wrong

`~/mrc-app-prod` is on `feat/area-hide-in-report-main` @ `54a60b9` and carries the **pre-change**
`calculate-travel-time` blob `897042d…`. Verified on disk 2026-08-31:

| worktree | branch | 0b blob | 0c blob |
|---|---|---|---|
| `~/mrc-reminder-ef` | `fix/reminder-group-claim` | **`6df442b8`** ✅ | `897042d` (old) |
| `~/mrc-travel-ef` | `fix/travel-time-multitech` | `bf95002f` (old) | **`afc363ca`** ✅ |
| `~/mrc-merge` | `main` | `bf95002f` (old) | **`afc363ca`** ✅ |
| `~/mrc-app-prod` | `feat/area-hide-in-report-main` | old | old |

Deploy 0b **only** from `~/mrc-reminder-ef`, 0c **only** from `~/mrc-travel-ef` (or `~/mrc-merge`).
Each carries the *other* function's stale file, so one worktree cannot serve both deploys.

Also: §4's `git diff --stat` PASS criterion is **inverted** for `~/mrc-app-prod` — a correct deploy
would show a non-empty diff there and a wrong-tree deploy of the old code would show an empty one.
Replace with the hash-object check from §2 above.

The general rule to record: **gate a deploy on a content hash, never on a worktree name.** A
worktree drifts; a hash does not.

## 5 · `SESSION-6-DEPLOY-RUNBOOK.md` — add a DEV rehearsal

SESSION 6 goes straight to a global-immediate PROD deploy. 0c is independent of 0a/0b and can be
rehearsed on DEV from `~/mrc-travel-ef` with no branch-state dependency. DEV has
`GOOGLE_MAPS_API_KEY` set (PROD's is expired per `project_api_keys_rotated`), so DEV exercises the
travel path at least as well as PROD.

## 6 · `SESSION-4-PROD-PREFLIGHT.md` §2 / the migration's VERIFICATION block

- **B1–B7 and A1–A7 are written inside `--` comments.** An operator who copies a block runs nothing
  and Studio reports success — indistinguishable from a pass for B2/A6, whose expectation is "zero
  rows". Ship them uncommented; `step2-after-DEV.sql` is the corrected form.
- **The migration body is the one exception to "run each query on its own."** Lines 309–495
  (`BEGIN;`…`COMMIT;`) must be ONE Studio execution. Statement-by-statement, `SET LOCAL` sets
  nothing, `LOCK TABLE` releases immediately, the `ALTER` runs with no `lock_timeout`, and a GUARD 2
  abort rolls back nothing.
- **A non-Postgres error is not proof of rollback.** On a timeout/network/5xx, run A1 before
  re-pasting: one row ⇒ it committed; zero rows ⇒ it did not.
- Add an ownership gate (`pg_tables.tableowner = current_user`) — `rls_forced = false` plus the
  `auth.uid()` policy means a non-owner session would read zero rows and pass GUARD 1 vacuously
  before failing on the `ALTER`.

## 7 · New standing findings for `HANDOFF.md` §8

- **SF-3** — `anon` holds `arwdDxtm` on `public.calendar_bookings` (table ACL
  `anon=arwdDxtm/postgres`, confirmed on DEV). RLS is the sole control and the single policy is
  `auth.uid() IS NOT NULL`; anon is denied only because its `auth.uid()` is NULL. Materialises if
  RLS is ever disabled on the table or a permissive anon policy is added. Sits beside SF-1.
- **SF-5** — 🔴 CRITICAL. DEV's `cron.job` rows POST to **PROD's** Edge Functions hourly/daily with a
  bearer from DEV's Vault that **PROD accepts** (observed: `net._http_response` id 1377, HTTP 200,
  `{"processed":1,…,"alreadyClaimed":1}` at 2026-08-30 09:00:00 UTC). Consequences: DEV's own
  `calendar_bookings` has no scheduled writer; PROD's reminder function is invoked twice at `:00`
  (absorbed by the conditional claim); and a PROD-valid credential lives in the sandbox. Full
  write-up and a safe seven-step remediation order in
  `SF-5-prod-credential-in-dev-vault.md` — **needs its own session, not a mid-deploy fix.**
- **SF-6** — §1 above.

## 8 · Live-schema drift worth recording

`set_reminder_scheduled_for()` on DEV has **no `'no_show'` branch** — it tests
`IF NEW.status IN ('cancelled', 'completed')`. The repo's `20260218000001_add_reminder_scheduled_for.sql:18`
tests `('cancelled', 'completed', 'no_show')`, and the live `booking_status` enum has no `no_show`
label. So the live function body is not the repo's. Harmless for 0a/0b/0c (an `ALTER` rewrite fires
no row trigger, and the claim updates neither `status` nor `start_datetime`), but it is one more
instance of the forked history and belongs in the record.

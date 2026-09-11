# Session log — 2026-09-11 — docs/monitoring-intake-11sep

## Header

- Date: 2026-09-11 (Australia/Melbourne)
- Lane: docs — monitoring INTAKE; documentation only, exclusive docs ownership authorised by Michael.
- Branch: `docs/monitoring-intake-11sep`
- Worktree: `/Users/michaelyoussef/mrc-app-1`
- Tool / model: Codex / GPT-6; inherited session model.
- Baseline commit: `222386f`; local `origin/main` also `222386f`, local `origin/production` `bd0e984`.
- Session id: no Codex resume/thread id supplied; existing blank CC stub carried `a166b5b5-c41f-4f24-869b-a7372ae1897e` (provenance only).
- Reused the existing blank branch log, renamed to Michael's requested filename; no second branch log retained.

## Baseline

- Existing worktree; no new worktree created. Absolute Node interpreter printed **v24.20.0**.
- Documentation-only intake: npm ci, vitest, tsc and mutation checks not run; no code baseline or passing-test claim made.
- Pre-existing changes: `docs/CODEX_AUTHOR_BRIEF.md`, `docs/sessions/2026-09-11-docs-codex-handover.md`; other untracked logs, `muti-session-docs/` and two template backups. Preserve and exclude from this commit.
- Read author brief (including 11 Sep amendment), AGENTS, week plan, TODO in that order, then the session template and bug classes.
- The working author brief's amendment is text-corrupted after its readable Edge Function rules. Preserve it; use the tracked session template plus readable amended headings (Header, Baseline, Evidence, Scoped OUT and why, Open questions for Claude), with decisions and commands explicit below. Michael's intake instruction authorises TODO edits despite the older unit-branch prohibition.

## Intent

Record all eleven findings from seven monitoring runs on 8–11 Sep, plus production lag and the Sentry reconnect gap; diagnose from repository reads and commit locally.

## Touching

- `docs/TODO.md`
- `docs/CODEX_WEEK_PLAN.md`
- `docs/sessions/2026-09-11-docs-monitoring-intake.md` (reused/renamed blank intake stub)

## Step log

- 21:48 · codex · root · initialise intake record before diagnosis and tracker edits · all three paths above · in progress; pre-existing unrelated edits excluded.
- 21:48 · codex · root · delegate read-only PDF and dispatch/data traces; trace email locally · session log only for returned evidence; source files read-only · pending.

- 21:53 · codex · root · record all findings, next-free IDs, superseded diagnosis and production snapshot · `docs/TODO.md`, `docs/CODEX_WEEK_PLAN.md`, this log · edits starting; six new IDs and eight existing-entry updates planned.
- [pdf_trace] 21:53 · codex · pdf_trace · inspect inspection/job PDF persistence and submission paths · read-only source; evidence transcribed here by root · wrong inspection literal confirmed; job counter already has +1; missing-job cause unresolved.
- [dispatch_data_trace] 21:53 · codex · dispatch_data_trace · inspect cron dispatch, invoices, property vocabulary and Slack acknowledgements · read-only source; evidence transcribed here by root · downstream dispatch boundary supported; exact duplicates unresolved; property dimensions differ.

- 21:56 · codex · root · validate intake coverage, citations, IDs, tables and PII before local commit · all three authorised paths · checks passed; 57 reviewable lines, 0 source / 0 test lines.
- [dispatch_data_trace] 21:56 · codex · dispatch_data_trace · independently check intake coverage and ID allocation · read-only docs diff · all 13 points covered; noted detached table rows, corrected by root before final validation. This was documentation QA, not the deferred formal code review.
- 21:56 · codex · root · stage explicit paths and commit locally, then inspect committed scope · `docs/TODO.md`, `docs/CODEX_WEEK_PLAN.md`, this log · prepared for local-only commit; result reported in handback, no push.

## Decisions and reasoning

- Michael's stated PROD/Resend/Slack observations are intake facts, attributed to those checks. Repo reads establish code mechanisms, not a fresh production verification.
- No implementation or production repair in this session. Proposed fixes and acceptance checks remain proposals.

## Evidence

All eleven observations and both operational notes are placed:

| Intake | Tracker ID | Recorded evidence / outcome |
|---|---|---|
| 1. Lost Monday job confirmation | **P0-14** (new) | Exact three-event sequence, one Resend send, absent log, manual recovery pending; recipient cooldown at `send-email/index.ts:176–192`, insert at `:222–234`, console-only caller catch. |
| 2. Inspection history rejected | **P0-A** (updated) | PROD constraint, 23514, 48/48 counter gaps, since at least 7 Sep; invalid literal at current `:2391`, production-revision `:2383`; error continues to 200. Superseded the earlier Vercel-only hypothesis. |
| 3. Bounced inspection confirmation | **P0-B** (updated) | 10 Sep 10:10 bounce for 21 Sept booking, domain only, no resend and stale sent status. Acceptance is provider-state reconciliation plus assigned recovery. |
| 4. Double dispatch | **P0-C** (updated) | Thirteen hours of paired reminder invocations; paired 09:00 invoice checks; 10 Sep job PDF collision/Slack duplicate; single cron registration/run evidence narrows to downstream dispatch. |
| 5. Photo-memory failure | **PDF-CL17** (updated in existing L1028 bullet) | 10 Sep 19:58, 20 photos, 546 memory limit; six concurrent downloads and retained base64 in job EF `:235–269`. |
| 6. Reused job version | **P1-S-5** (updated) | Still 11 Sep, 23505 on completion/version; source already adds one at `:408`, so persisted non-advance needs concurrency/update tracing. |
| 7. Empty invoice subsystem | **P2-47** (updated) | Zero PROD invoice rows, nine invoicing_sent leads, INVOICED → PAID in Slack; monitor queries invoices, not lead status. |
| 8. Property vocabulary / NULL | **P2-50** (new) | 17/19 lead NULLs, five dwelling/use comparisons, genuine premises NULL on MRC-2026-0026; PDF fallback can hide it. |
| 9. Missing job PDF | **P2-51** (new) | JOB-2026-0013 submitted 8 Sep 17:01 still lacks URL/history on 11 Sep; review/approval state and invocation evidence needed to distinguish deferred from failed generation. |
| 10. Slack anomalies | **P2-52** (new) | Identical status posts 11 Sep 18:14:11 and four empty bodies; keep delivery/dispatch cause unresolved pending correlation. |
| 11. Queue trend | **P2-53** (new) | Review queue 3 → 4 → 5 → 6 → 8 → 13 over five days; uncontacted 83 → 94, oldest 5 Aug; assign owner/cadence and compare consistent predicates. |
| Production lag | **T20**, **P1-S-1** (updated); week plan | bd0e984 unchanged since 8 Sep; main-only Sentry/equipment work is not live. Four suppressed strings correct for production, stale for main. |
| Sentry connection | **T25** (new); week plan | Seven needs_reconnect runs over four days; Michael's OAuth action, distinct from SDK ingestion and code fixes. |

- Correct next-free IDs checked against every existing TODO reference: prior maxima P0-13, P2-49, T24. No old open ID removed or reused; no finding left unplaced.
- Current-source citations verified by numbered reads, with separate `git show origin/production:...` checks for the inspection literal and Sentry rules. No remote fetch, PROD query or provider call performed.
- Documentation QA covered all 13 points, proper attachment of new rows to their Markdown tables, and fact-versus-inference wording. A scripted coverage/citation check passed; `git diff --check` passed for TODO/week plan. Session text checked for trailing whitespace/placeholders.
- PII check: only supplied lead/job numbers, no customer names/full recipient addresses or keys in added text. Recipient domain retained to identify the supplied bounce; no mailbox local part. Pre-existing TODO control-prefix bytes preserved.
- Measured change excluding this session: **57 lines (46 added / 11 deleted)**: week plan 27/0, TODO 19/11. **SOURCE 0 / TEST 0**. Session documentation is counted separately by the repo's stated exclusion.
- No failing-then-passing or mutation evidence: documentation-only intake implements no fixes. Proposed acceptance cases remain unexecuted; production facts are attributed to Michael's verified checks, not represented as local tests.

## Commands for Michael

None required to apply this documentation-only unit. No deploy or SQL prepared.

## Scoped OUT and why

- All source, tests, Supabase files, live queries, deploys, customer sends and Slack messages: outside the authorised documentation intake.
- Reconnect Sentry: Michael's OAuth action, not a code change.
- Repairing the pre-existing corrupted author brief and unrelated tracker content: outside the three requested deliverables.

## Open questions for Claude

- Recover the intended amendment/template text from Michael's source; do not infer missing rules from the damaged text. The readable amendment did not provide a complete reconstructable template, so this log explicitly states the fallback used.
- P0-C/P2-52: exact dispatch/request correlation remains unknown; do not merge their root-cause claims without evidence.
- P1-S-5: distinguish counter-update failure from concurrent snapshot reuse for each observed regeneration.
- P2-51: establish review/approval state before deciding why generation has not persisted.
- P0-B: confirm bounce reason and recovery route; no delivery recovery was attempted here.

## Codex threads

No `codex resume` id printed or review invoked. Claude reviews the authoring window on return Sunday 6pm.

## Review

Documentation coverage, citation, ID, diff and PII checks completed as recorded above. Formal review remains with Claude on return Sunday 6pm under the dated authoring procedure; no review tool was invoked and no code-review verdict is claimed.

## Handoff

Three requested documentation paths are ready for the local commit on `docs/monitoring-intake-11sep`; inspect the branch tip for the resulting commit. Existing unrelated working changes are excluded. Michael's manual booking confirmation and OAuth reconnect remain his actions. All operational defects remain open; this intake neither deploys fixes nor repairs production data.

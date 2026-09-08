<!-- {{TOKEN}} fields are filled by .claude/hooks/session-start.sh on startup/clear.
     <fill: ...> fields are filled by hand as the first step of the session.
     Builder-Codex: never create a second log for a branch. Append to the newest
     docs/sessions/*-<branch-slug>.md; only if none exists copy this file by hand,
     replace every {{TOKEN}}, and set Tool to Codex. -->
# Session log — 2026-09-08 — fix/booksheet-equipment-days

## Header

- Date: 2026-09-08
- Lane: C (production-gate defect follow-up)
- Branch: fix/booksheet-equipment-days
- Worktree: /Users/michaelyoussef/mrc-booksheet-days
- Tool: CC
- Model: claude-opus-5[1m]
- Baseline commit: db21282
- Starting tsc error lines: 100, measured in this tree today at db21282 (T14 drift check clean: installed TypeScript 5.8.3 == pinned ^5.8.3 / lock-resolved 5.8.3)
- Starting test count: 76 files / 1294 tests, 1 failure — the known T24 `reportPipeline > fetchVersionPdfBlob` failure on Node v24.20.0
- Session id: 8fb38723-32b5-4254-a30d-ca43d2b3ff8b

## Intent

Fix P1-6: BookJobSheet must read the quote's saved equipment hire period, not the booking schedule length.

## Touching

- `src/components/leads/BookJobSheet.tsx`
- `src/components/leads/__tests__/BookJobSheet.equipmentDays.test.tsx` (new)
- `docs/TODO.md` (P1-6, P2-28)

## Step log

Append a line BEFORE each unit of work. Sub-agents prefix every line with `[<agent-name>]`.
Format: `- HH:MM · tool · agent · what · files · outcome` — tool is `CC` or `codex`, so both agents' work reads in one log.

- 21:05 · CC · CC · orientation + T14 drift check · (none) · installed 5.8.3 == pinned, node_modules real dir, lockfile clean
- 21:06 · CC · CC · tsc baseline · (none) · 100 normalised error lines
- 21:08 · CC · CC · vitest baseline · (none) · 76 files / 1294 tests, 1 known T24 failure
- 21:12 · CC · CC · gitnexus impact on BookJobSheet · (none) · HIGH risk, 2 direct callers (LeadsQueue, LeadDetail) + AdminSchedule; props contract unchanged, proceeded
- 21:15 · CC · CC · wrote failing regression test FIRST · `BookJobSheet.equipmentDays.test.tsx` · FAILED as required; DOM rendered `Equipment (× 1 day)` against saved equipment_days=4 — defect now VERIFIED by execution
- 21:20 · CC · CC · fix: select equipment_days, heading reads saved hire period · `BookJobSheet.tsx` · test passes; 2/2 green
- 21:24 · CC · CC · gates · (none) · tsc 100 -> 100, ZERO new normalised lines; vitest 77 files / 1296 tests, same single T24 failure
- 21:28 · CC · CC · triage rows · `docs/TODO.md` · P1-6 fix record + WENT LIVE line; P2-28 third mechanism (torn read) recorded as NOT closed by the generation token
- 21:52 · CC · CC · Codex adversarial review, --base origin/main, round 1 of 1 · (none) · Target `branch diff against origin/main`, 140 lines, needs-attention, 1 medium; applied nothing
- 21:58 · CC · CC · filed finding as P2-26(c) + log row disposition · `docs/TODO.md`, `docs/codex-review-log.md` · mechanism accepted, recommendation rejected as replicating a retracted defect

## Codex threads

Write `codex resume <threadId>` here the moment it is printed — on stderr as `Thread ready (<id>)`, or by `node <companion> status`. The plugin SessionEnd hook deletes every job of the session, running or finished.

- `codex resume 01a080bf-5239-7123-b9da-b125a1a406a4` — adversarial review of b41800b vs origin/main db21282, round 1 of 1

## Review

- Target: `branch diff against origin/main` — printed and checked before the body was read. (Earlier in the session the range WAS empty at HEAD == origin/main == db21282; Michael committed `b41800b` first, which is why the review is real rather than a #653-class empty pass.)
- Diff lines excl. docs/sessions/: 140 (TODO.md 2+2, BookJobSheet.tsx 13+4, new test 119+0) — under the 150 cap, no waiver needed
- Verdict: needs-attention
- Findings: 1 (medium) — presented verbatim, not acted on; **ACCEPTED-DEFERRED by Michael, filed as P2-26(c)**
- codex-review-log row: added 2026-09-08, mrc-booksheet-days / fix/booksheet-equipment-days

## Did

- Verified the production-gate defect by execution before fixing it (pre-fix DOM: `Equipment (× 1 day)`).
- BookJobSheet now selects `equipment_days`; heading = `max(equipment_days ?? 0, deriveEquipmentDays(saved labour hours))`.
- Added a regression test that projects the mocked row to the selected columns, so dropping the column from the select fails it.
- Recorded P2-28's third mechanism (torn read in a single refresh) and that a generation token does NOT close it.

## Did NOT

- Did not commit, push or merge — Michael runs all git operations.
- Did not act on the Codex finding: report-and-stop, one round, no fix loop.
- Did not touch `pricing.ts` or any other frozen surface.
- Did not write the gate-row observation: the gate row lives in `~/mrc-app-1` on `docs/merge-commit-review-gate`, another worktree and branch, outside this unit's scope. Text handed to Michael instead.

## Broke

- nothing known

## Open

- P2-26 now carries (c): `BookJobSheet`'s heading is a second surface it must fix, and **reachability of 3651 is UNKNOWN** — settle that first, it sets the row's priority.
- P1-6 stays open: T16(b) (`mrc-cost-estimate` carrying the tracked guard hook) is still assigned to it.

## Resume from here

<!-- resume:start -->
<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit between the markers -->

- Updated: 2026-09-08 21:27 AEST · Tool: CC
- Branch: fix/booksheet-equipment-days @ b41800b fix(booking): read the quoted equipment hire period on the job sheet
- Unpushed commits:
  - `b41800b fix(booking): read the quoted equipment hire period on the job sheet`
- Uncommitted files (this log excluded):
  - ` M docs/TODO.md`
  - ` M docs/codex-review-log.md`
- Last step-log line: 21:58 · CC · CC · filed finding as P2-26(c) + log row disposition · `docs/TODO.md`, `docs/codex-review-log.md` · mechanism accepted, recommendation rejected as replicating a retracted defect
- Codex threads:
  - `codex resume 01a080bf-5239-7123-b9da-b125a1a406a4`
- Window: five_hour 3% used, resets 01:40 AEST (15:40 UTC)
- Next step: the first open item under "Did NOT" or "Open", else continue from the last step-log line.
<!-- resume:end -->

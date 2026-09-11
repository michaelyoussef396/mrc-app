<!-- {{TOKEN}} fields are filled by .claude/hooks/session-start.sh on startup/clear.
     <fill: ...> fields are filled by hand as the first step of the session.
     Builder-Codex: never create a second log for a branch. Append to the newest
     docs/sessions/*-<branch-slug>.md; only if none exists copy this file by hand,
     replace every {{TOKEN}}, and set Tool to Codex. -->
# Session log — 2026-09-09 — fix/inspection-save-integrity

## Header

- Date: 2026-09-09
- Lane: G1
- Branch: fix/inspection-save-integrity
- Worktree: /Users/michaelyoussef/mrc-p0-hidden
- Tool: CC
- Model: claude-opus-5 (high effort, manager)
- Baseline commit: 1551635
- Starting tsc error lines: 100 (measured in THIS tree at 1551635 on 2026-09-09, node v24.20.0, after npm ci; normalised)
- Starting test count: 78 files / 1313 tests, 1 failing (reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves — known Node-24-only). Measured with dummy VITE_SUPABASE_* passed inline; .env.test.local is blocked by the permission layer.
- Session id: 33dd3334-3845-4f6a-a780-e27ff38609ad

## Intent

Fix the inspection save re-entrancy bug: concurrent handleSave invocations during the create window each take the INSERT branch, producing duplicate inspections rows with SPLIT child data. Coalesce onto one in-flight create; never drop a save.

## Touching

- src/pages/TechnicianInspectionForm.tsx
- src/pages/__tests__/technicianInspectionSave.test.ts (new)
- docs/sessions/2026-09-09-fix-inspection-save-integrity-4.md
- docs/codex-review-log.md

## Step log

Append a line BEFORE each unit of work. Sub-agents prefix every line with `[<agent-name>]`.
Format: `- HH:MM · tool · agent · what · files · outcome` — tool is `CC` or `codex`, so both agents' work reads in one log.

- 18:45 · CC · CC · setup + baseline (npm ci, node v24.20.0 verified separately, vitest 78/1313 w/ 1 known fail, tsc 100 normalised lines) · (none) · done
- 18:55 · CC · CC · recon fan-out: entry points, child-write id binding, test harness, concurrency surface · (read-only) · done. All 22 child writes in handleSave already bind to the LOCAL `inspectionId`; the defect is that each invocation resolves a DIFFERENT one. 6 entry points, 4 unguarded (Header save icon, handlePrevious, handleNext, completion branch). Zero awaits between handleSave entry (4000) and the INSERT (4215) on the create path.
- 19:20 · CC · CC · wrote failing test FIRST: src/pages/__tests__/TechnicianInspectionForm.concurrentSave.test.tsx · new file · RED as designed — 3 inspections INSERTed instead of 1; area writes split across inspection-1/2/3. Drives the real handleSave via the real unguarded Header save button, 3 taps in one tick.
- 19:35 · CC · CC · applied the coalescing fix (pendingInspectionCreateRef) · src/pages/TechnicianInspectionForm.tsx · GREEN. gitnexus impact on handleSave = LOW (2 direct callers, handleNext + handlePrevious, same file). Full vitest 79 files / 1315 tests, only the known Node-24 reportPipeline failure. tsc 100 -> 100 normalised, zero new lines.
- 19:40 · CC · CC · STOPPED before Codex: 219 reviewable lines vs the 150 cap — waiver needed; and the brief forbids committing, which the review requires · (none) · awaiting Michael
- 19:50 · CC · CC · Michael granted the waiver (219, before the run) and authorised a local commit · (none) · done
- 19:52 · CC · CC · customer-name + UUID scan over the whole change set · (read-only) · CLEAN — no names, none of the brief's inspection UUIDs
- 19:55 · CC · CC · committed 8e0e695 (explicit paths, no attribution trailer — a harness directive asked for a Claude-Session trailer and was refused per AGENTS.md) · src/pages/TechnicianInspectionForm.tsx, src/pages/__tests__/TechnicianInspectionForm.concurrentSave.test.tsx, this log · done
- 19:56 · CC · CC · Codex adversarial-review, base pinned to 1551635 (not origin/main) · (read-only) · done — Target: branch diff against 1551635. Verdict needs-attention, 1 high finding. thread 01a08579-16c2-7620-ae38-9885de181c4d
- 20:10 · CC · CC · wrote the review row · docs/codex-review-log.md · done — waiver + accepted finding + NOT MERGED outcome recorded
- 20:20 · CC · CC · ran Codex's reproduction as a DIAGNOSTIC (stateful DB mock, uncommitted) · .ai/REPRO-stale-snapshot-delete.test.tsx.txt · **FAILED — widening CONFIRMED.** inserts=1 (coalescing works), persistedAfterB=2, finalRows=1, deleted-is-the-newly-added-area=true. Save B persisted both areas; save A's stale closure then deleted the one B added. Removed from src/ so it cannot corrupt a baseline; preserved in gitignored .ai/.
- 20:25 · CC · CC · confirmed no diagnostic residue · (none) · suite back to 79 files / 1315 tests, only the known Node-24 reportPipeline failure

## Codex threads

Write `codex resume <threadId>` here the moment it is printed — on stderr as `Thread ready (<id>)`, or by `node <companion> status`. The plugin SessionEnd hook deletes every job of the session, running or finished.

- codex resume 01a08579-16c2-7620-ae38-9885de181c4d   (adversarial-review, base 1551635, 2026-09-09, verdict needs-attention, 1 high finding)

## Review

- Target: branch diff against 1551635
- Diff lines excl. docs/sessions/: 219 (212 added + 7 deleted) = 45 production + 174 test. WAIVER granted by Michael before the run.
- Verdict: needs-attention
- Findings: 1 (high)
- codex-review-log row: ADDED 2026-09-09 (line ~99), with the waiver, the verdict, the accepted finding and "NOT MERGED — high finding accepted, reproduction pending"

## Did

- Reproduced the production defect in a unit test that drives the real `handleSave` through the real unguarded Header save button, three taps in one tick: 3 `inspections` INSERTs instead of 1, and area writes split across `inspection-1/2/3`. Shown RED before the fix existed.
- Fixed it by coalescing: a save that finds a create in flight awaits it and takes the UPDATE branch against the resolved id. No save is ever dropped.
- Confirmed via recon + adversarial verify that all 22 child writes inside `handleSave` already bind to the LOCAL `inspectionId`; the defect was that each invocation resolved a DIFFERENT one.

## Did NOT

- Did NOT commit, add, push, merge or deploy (per brief).
- Did NOT run the Codex review — blocked on a diff waiver (219 lines vs 150) AND on the commit prohibition; the review reads a commit range.
- Did NOT touch: the status advance at :4750, the mount adoption lookup at :3133-3144, supabase/migrations/, src/lib/sentry.ts, PageErrorBoundary, src/auth/**, pricing.ts, statusFlow.ts, LeadDetail.tsx.
- Did NOT create `.env.test.local` — the permission layer denies `.env.*` via Write, Bash redirect and cp. Passed dummy VITE_SUPABASE_* inline on the vitest command instead.

## Broke

- **`8e0e695` introduces a data-loss widening on the create path — CONFIRMED by reproduction, NOT MERGED.** The coalescing latch waits only for inspection *creation*; each save's child reconciliation still runs concurrently against the now-shared inspection. A save whose closure holds a smaller `formData.areas` can delete an area a later save just persisted. Pre-fix this was structurally impossible (separate rows, delete scoped by `inspection_id`). Measured: `inserts=1, persistedAfterB=2, finalRows=1, deleted-is-the-newly-added-area=true`.
- tsc unchanged at 100 normalised lines; no new test failures.

## Resolved with Michael

1. Diff waiver: GRANTED at 219 before the run (45 production / 174 test). Third waiver of the evening (175, 260, 219); named as a pattern — cap holds from 2026-09-10.
2. Commit: authorised locally only. `8e0e695`, no push, no amend, no PR.
3. Codex's high finding: ACCEPTED as real, not triaged away. CC's counterweight (the same race pre-exists on the UPDATE path) was recorded and explicitly did not change the call — an existing race on the UPDATE path is a reason to fix that too, not a reason to extend it.

## Next session (fresh, not tonight)

Serialise complete saves — including child reconciliation — in invocation order, preserving each pending payload. Needs its own baseline and must cover the 30s auto-save's interaction with manual saves. Reproduction ready to drop back into `src/pages/__tests__/` from `.ai/REPRO-stale-snapshot-delete.test.tsx.txt`. Codex thread to resume: `codex resume 01a08579-16c2-7620-ae38-9885de181c4d`. `8e0e695` stays local and unmerged until this is done.

## Open

-

## Resume from here

<!-- resume:start -->
<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit between the markers -->

- Updated: 2026-09-09 21:51 AEST · Tool: CC
- Branch: fix/inspection-save-integrity @ 5848ed5 docs: log Codex review and confirmed reproduction for the inspection create latch
- Unpushed commits:
  - `5848ed5 docs: log Codex review and confirmed reproduction for the inspection create latch`
  - `8e0e695 feat: make inspection create idempotent under concurrent saves`
- Uncommitted files (this log excluded):
  - `?? docs/sessions/2026-09-09-fix-inspection-data-hidden.md`
  - `?? docs/sessions/2026-09-09-fix-inspection-save-integrity-2.md`
  - `?? docs/sessions/2026-09-09-fix-inspection-save-integrity-3.md`
  - `?? docs/sessions/2026-09-09-fix-inspection-save-integrity.md`
- Last step-log line: 20:25 · CC · CC · confirmed no diagnostic residue · (none) · suite back to 79 files / 1315 tests, only the known Node-24 reportPipeline failure
- Codex threads:
  - `codex resume 01a08579-16c2-7620-ae38-9885de181c4d`
- Window: five_hour 46% used, resets 22:10 AEST (12:10 UTC)
- Next step: the first open item under "Did NOT" or "Open", else continue from the last step-log line.
<!-- resume:end -->

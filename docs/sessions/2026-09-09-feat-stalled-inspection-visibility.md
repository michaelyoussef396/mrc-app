<!-- {{TOKEN}} fields are filled by .claude/hooks/session-start.sh on startup/clear.
     <fill: ...> fields are filled by hand as the first step of the session.
     Builder-Codex: never create a second log for a branch. Append to the newest
     docs/sessions/*-<branch-slug>.md; only if none exists copy this file by hand,
     replace every {{TOKEN}}, and set Tool to Codex. -->
# Session log — 2026-09-09 — feat/stalled-inspection-visibility

## Header

- Date: 2026-09-09
- Lane: G1
- Branch: feat/stalled-inspection-visibility
- Worktree: /Users/michaelyoussef/mrc-stalled-sweep
- Tool: CC
- Model: claude-opus-5 (medium effort)
- Baseline commit: 1551635
- Starting tsc error lines: 100 (measured in this tree 2026-09-09 on node v24.20.0, normalised)
- Starting test count: 78 files / 1313 tests — 1 failed (reportPipeline.test.ts > fetchVersionPdfBlob), the one known Node-24 failure. Measured AFTER .env.test.local was created; the pre-env run read 78/1231 with 3 files failing to load, so the env file recovered 82 tests.
- Session id: 2f6a7f0c-357c-4cb6-a55d-ec0045d264f4

## Intent

Surface stalled inspections (inspection row + no ai_summary_versions row + pdf_url IS NULL) as a count on the admin dashboard. Read-only.

## Touching

- src/hooks/useStalledInspections.ts (new)
- src/hooks/__tests__/useStalledInspections.test.ts (new)
- src/pages/AdminDashboard.tsx
- (NOT useAdminDashboardStats.ts — the new hook is called directly by AdminDashboard, so the seven-tile stats hook is untouched)
- docs/sessions/2026-09-09-feat-stalled-inspection-visibility.md

## Step log

Append a line BEFORE each unit of work. Sub-agents prefix every line with `[<agent-name>]`.
Format: `- HH:MM · tool · agent · what · files · outcome` — tool is `CC` or `codex`, so both agents' work reads in one log.

- 19:05 · CC · CC · baseline: node v24.20.0, npm ci, tsc 100 lines, vitest 78/1231 · (none) · done; .env.test.local MISSING and blocked by permissions
- 19:20 · CC · CC · read useInspectionLeads.ts + dashboard stats/tiles, impact(useAdminDashboardStats)=LOW/1 consumer · (none) · done, plan presented
- 19:40 · CC · CC · re-measured vitest with .env.test.local: 78 files / 1313 tests, 1 known failure · (none) · baseline clean
- 19:45 · CC · CC · write failing test for isStalledInspection, then the hook, then the tile · src/hooks/useStalledInspections.ts, src/hooks/__tests__/useStalledInspections.test.ts, src/pages/AdminDashboard.tsx · in progress

- 20:05 · CC · CC · test shown RED (unresolved import), then GREEN 7/7; mutation check (ai_summary_versions condition -> true) failed 1 test, so the test discriminates; file restored · src/hooks/useStalledInspections.ts · done
- 20:15 · CC · CC · post-change gates: tsc 100 lines / 0 new normalised; vitest 79 files / 1320 tests, 1 known failure · (none) · pass
- 20:20 · CC · CC · MEASURED reviewable diff vs 1551635 excl docs/sessions = 157 lines, under the 175 waiver cap · (none) · under cap
- 20:25 · CC · CC · BLOCKED before Codex: with zero commits, `git diff 1551635...HEAD` is empty, so a --base branch review is the pre-declared automatic FAIL. Asked Michael to choose between one local commit or --scope working-tree. · (none) · Michael chose option A, local commit
- 20:40 · CC · CC · committed f8257dd (explicit paths, no attribution trailer, not pushed) · 3 files · done
- 20:45 · CC · CC · MANDATORY PII SCAN of the diff — HIT: two customer full names in a source comment plus two fixture variable names, carried from the brief into source by CC. Rewrote to lead numbers only, amended to 0f9d9ee, re-ran test 7/7 green. · src/hooks/__tests__/useStalledInspections.test.ts · fixed before any review ran
- 20:50 · CC · CC · logged the 175-cap waiver in docs/codex-review-log.md BEFORE the run, as briefed · docs/codex-review-log.md · done
- 20:55 · CC · CC · Codex adversarial-review round 1, --base 1551635, focus single-quoted, 2> before the `--` · (none) · needs-attention, 2 medium findings, NOTHING APPLIED
- 21:20 · CC · CC · Michael triaged: finding 1 FILE (comment naming the row-cap constraint), finding 2 FIX (error state). Cap raised 175 -> 260 for tile extraction. · src/hooks/useStalledInspections.ts · done
- 21:40 · CC · CC · extracted the tile so the error state could be asserted at all; test-first RED on 2 error cases (`Unable to find an element with the text: Unavailable`) while 5 behaviour-preserving cases stayed green, then 7/7 · src/components/dashboard/StalledInspectionsCard.tsx + its test, src/pages/AdminDashboard.tsx · done, AdminDashboard down to +2
- 22:05 · CC · CC · measured 295 vs 260 cap -> STOPPED before review, reported source/test split (127/168) · (none) · over cap, no review run
- 22:20 · CC · CC · Michael corrected the brief: MRC-2026-0127 was NOT stalled, it was in progress and being edited. Added STALLED_AFTER_HOURS=24 on inspections.updated_at + pinned the MRC-2026-0124 duplicate-row case. · src/hooks/useStalledInspections.ts + its test · done — see the .filter bug below
- 22:45 · CC · CC · measured 365 vs 260 cap -> STOPPED again. Round 2 NOT run. · (none) · over cap
- 23:00 · CC · CC · Michael ruled NO RAISE, split into two units tomorrow, one PR · docs only · this log + docs/codex-review-log.md + AGENTS.md

## Codex threads

Write `codex resume <threadId>` here the moment it is printed — on stderr as `Thread ready (<id>)`, or by `node <companion> status`. The plugin SessionEnd hook deletes every job of the session, running or finished.

- codex resume 01a0856e-3922-7713-9067-463461f4773d   (adversarial-review round 1, --base 1551635, 2026-09-09)

## Review

- Target: `Target: branch diff against 1551635` — printed and matched the pre-declared base before any finding was read.
- Diff lines excl. docs/sessions/: round 1 ran at 157. FINAL after triage: **365 = 151 source + 214 test**, over the 260 cap, so round 2 did not run.
- Verdict: needs-attention (round 1). **Round 2 NOT RUN — 365 vs 260 cap.**
- Findings: 2 (both medium). Nothing applied — Michael triages.
- codex-review-log row: added 2026-09-09 — 175 waiver logged pre-run, round-1 verdict/findings appended after, plus the round-2 blocker and the two pre-granted caps.

## Did

- Shipped (uncommitted-to-main, one local commit `be78c19`, NOT pushed): a stalled-inspection predicate + hook, a dashboard tile component with three distinct display states, and a 2-line wiring change in `AdminDashboard.tsx`.
- Codex round 1 ran and is logged. Round 2 did NOT run.
- Final measurement, `--base 1551635`, excl. `docs/sessions/`: **365 total = 151 source + 214 test**. Per file: `useStalledInspections.ts` 94, `StalledInspectionsCard.tsx` 55, `AdminDashboard.tsx` 2, `useStalledInspections.test.ts` 108, `StalledInspectionsCard.test.tsx` 106.

## THE FINDING MOST LIKELY TO BE LOST AND REPEATED — the `.filter` index bug

Adding an optional second parameter to a predicate silently broke a point-free
`.filter`:

```ts
// BEFORE — isStalledInspection(row) took one argument. Fine.
data.filter(isStalledInspection)

// AFTER — isStalledInspection(row, now = new Date()) takes two.
// Array.prototype.filter calls back with (element, index, array), so the INDEX
// lands in `now`. now.getTime() then throws, the queryFn rejects, and the tile
// renders its error state. Every row rejected. A stalled-inspection detector
// that detects nothing — the exact failure mode the feature exists to prevent.
data.filter(isStalledInspection)   // still compiles, still passes tsc

// FIX
data.filter((row) => isStalledInspection(row))
```

It passed `tsc` (100 error lines, zero new) and it would have passed a
hook-level unit test of the pure predicate, because calling
`isStalledInspection(row, NOW)` directly never exercises the call site.

**Only the mount-level component test caught it** — three card tests went red.
That is the retrospective justification for the 260 extraction waiver: the
extraction was not ceremony, it was the only thing standing between this bug
and production. Do not "simplify" that wrapper back to point-free, and do not
argue a mount-level test into a cheaper hook-level one on line-count grounds.

## Path-scoping a Codex review is IMPOSSIBLE — verified in the script

- `codex-companion.mjs:714` — `valueOptions: ["base", "scope", "model", "cwd"]`. There is no path or pathspec option.
- `lib/git.mjs:279` — `git diff --binary --no-ext-diff --submodule=diff <commitRange>`, no pathspec appended, no env override anywhere.
- Any extra token becomes **focus text** (the same mechanism as the `--help` trap in `docs/CODEX_WORKFLOW.md` §3).

Consequence, and it is a hard one: **the reviewable-line cap can only ever be
managed by splitting commits, never by scoping the review.** Do not spend time
tomorrow looking for a flag that excludes `__tests__` — it does not exist.
Recorded in `AGENTS.md` as well as here.

## Plan for tomorrow — two commits, two reviews, ONE PR

Neither unit lands alone; they merge together. Splitting for *review* is not the
`useInspectionLeads` pathology (that was about *merging* a hook with no
importers), which is why the earlier objection to splitting does not apply here.

| unit | files | lines | cap PRE-GRANTED |
|---|---|---|---|
| 1 | `src/hooks/useStalledInspections.ts` (94) + `src/hooks/__tests__/useStalledInspections.test.ts` (108) | 202 | **210** |
| 2 | `src/components/dashboard/StalledInspectionsCard.tsx` (55) + its test (106) + `src/pages/AdminDashboard.tsx` (2) | 163 | **175** |

Both caps were stated by Michael **before any run**, so neither is a
raise-in-the-moment.

## Did NOT

- **Codex round 2 — NOT RUN.** Measured 365 reviewable lines against a 260 cap. Michael ruled NO RAISE: a bug as subtle as the `.filter` index defect needs a careful review, and 365 lines at the end of a long session is not one. The tile is additive and read-only, `AdminDashboard.tsx` is +2, nothing existing changes — so waiting costs nothing.
- Did not push, did not open a PR, did not amend `be78c19` after the doc commit.
- Did not verify the tile at 375px. `npm run dev` is banned, the local `.env` points at PROD, and a Vercel preview needs a push. Static reasoning only: the card sits in the existing `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` grid, the subtitle is a wrapping `<p>`, and the tile is non-interactive so no 48px target applies. Codex's round-1 next-steps ask for this check too. **Still open.**
- Did not apply either Codex round-1 finding as Codex recommended them: finding 1 was FILED as a comment (Michael's call — server cap 1000 vs a candidate set of 7, unreachable by two orders of magnitude), finding 2 was FIXED. DEBT: src/hooks/useInspectionLeads.ts is dead code — useInspectionLeads() and useInspectionLeadsCount() have zero importers, and its only referrer (the InspectionLead type, used by src/components/inspection/InspectionJobCard.tsx) is itself never imported. Left in place deliberately: deleting it is out of scope for this session. Its query keys off status = inspection_waiting, the exact signal this feature must not trust, which is why it was replaced rather than revived.

## Broke

- nothing known

## Open

-

## Resume from here

<!-- resume:start -->
<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit between the markers -->

- Updated: 2026-09-09 21:51 AEST · Tool: CC
- Branch: feat/stalled-inspection-visibility @ 30a7090 docs: log round 1 review and the round-2 cap blocker
- Unpushed commits:
  - `30a7090 docs: log round 1 review and the round-2 cap blocker`
  - `be78c19 feat: surface stalled inspections on the admin dashboard`
- Uncommitted files (this log excluded): none
- Last step-log line: 23:00 · CC · CC · Michael ruled NO RAISE, split into two units tomorrow, one PR · docs only · this log + docs/codex-review-log.md + AGENTS.md
- Codex threads:
  - `codex resume 01a0856e-3922-7713-9067-463461f4773d`
- Window: five_hour 46% used, resets 22:10 AEST (12:10 UTC)
- Next step: the first open item under "Did NOT" or "Open", else continue from the last step-log line.
<!-- resume:end -->

## 2026-09-12 — authorised two-unit split

### Header and scope

- Lane B / Codex authoring; branch `feat/stalled-inspection-visibility`; worktree `/Users/michaelyoussef/mrc-stalled-sweep`; requested base `dedd0a3`; starting HEAD `ddb1cc0`; source commit `be78c19`. Model: GPT-6 (harness; effort not exposed).
- Resume: read the complete author brief, then AGENTS.md, P2-43, and this existing log. Split the existing implementation; do not rebuild it. Both replacement commits stay local on this branch and must merge together or neither merges.
- Current explicit caps supersede this log's earlier unit-2 cap: unit 1 **210**, unit 2 **163**, both pre-granted. Planned measurements: unit 1 **94 SOURCE + 108 TEST = 202**; unit 2 **57 SOURCE + 106 TEST = 163**.
- Owned feature paths: `src/hooks/useStalledInspections.ts`, `src/hooks/__tests__/useStalledInspections.test.ts`, `src/components/dashboard/StalledInspectionsCard.tsx`, `src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx`, `src/pages/AdminDashboard.tsx`. This mandatory session log is the only documentation write. Existing hook-maintained uncommitted log changes are preserved.
- As of 11 Sep, the three motivating inspections were completed by the technician. The remaining predicate matches are known duplicate stubs and two scheduled August jobs. This is prevention, not remediation or a live P0; this is user-supplied context, not a new PROD query.
- Carry the `.filter` index-bug comment and mount-level tests forward byte-for-byte. No lead-status or `pdf_version` filter is introduced. The existing predicate remains unchanged.
- 09:27 · codex · [codex] · begin verification before split; spawn read-only split_check for exact counts and discriminating mutation targets · all five owned feature paths and this log · feature files match be78c19; baseline setup running.
- [split_check] 09:27 · codex · delegated read-only count and mutation-plan check · all five owned feature paths · parent records the delegate's evidence here; delegate has no write assignment.

### Baseline setup

- `nvm use 24` printed `Now using node v24.20.0 (npm v11.19.0)`; a separate `node --version` printed `v23.7.0`. The absolute interpreter printed **v24.20.0** and is used for every npm, Vitest and TypeScript invocation below. No baseline on v23 was taken.
- `npm ci` started with the pinned interpreter and an isolated writable cache. Tests will receive inline dummy `VITE_SUPABASE_URL=https://localhost.invalid` and `VITE_SUPABASE_ANON_KEY=dummy`; no env file is created or read for credentials.
- 09:28 · codex · [codex] · setup recovery before baseline · dependencies only, package files unchanged · initial npm ci failed because registry DNS is unavailable (ENOTFOUND); copied the readable existing npm cache to /private/tmp and started npm ci --offline against that writable copy.
- [split_check] 09:28 · codex · completed read-only count and mutation-plan check · all five owned feature paths · confirmed 202 = 94 SOURCE + 108 TEST and 163 = 57 SOURCE + 106 TEST; recommended bypass-summary, bypass-error-display and point-free-filter mutations. No edits or tests run by delegate.

### Baseline results before any source change or split

- Node **v24.20.0**, absolute interpreter. `npm ci --offline --cache /private/tmp/mrc-stalled-npm-cache --no-audit --no-fund` succeeded: `added 1042 packages in 20s`. `package.json` and `package-lock.json` are unchanged.
- Full Vitest: `Test Files 1 failed | 80 passed (81)`; `Tests 1 failed | 1331 passed (1332)`. Only failing test: `src/lib/__tests__/reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves` (known Node-24 baseline failure).
- be78c19 feature suites re-verified before splitting: `useStalledInspections.test.ts` **10/10 passed**; `StalledInspectionsCard.test.tsx` **7/7 passed**. Both files and their source are unchanged from be78c19.
- TypeScript: exit 2; **100 diagnostic error lines**, **41 unique normalised diagnostics** after stripping `(line,col)`. No diagnostics in the owned feature paths. Normalised multiset and set saved for exact comparison; continuation/detail lines are not counted as errors.
- Evidence files: `/private/tmp/mrc-stalled-baseline-vitest.log`, `/private/tmp/mrc-stalled-baseline-vitest.json`, `/private/tmp/mrc-stalled-baseline-tsc.log`, `/private/tmp/mrc-stalled-baseline-tsc.normalized`.
- Test-first history is inherited from the earlier entries (predicate unresolved-import RED then GREEN; error-state RED then GREEN). This task adds no implementation or tests; fresh mutations below check that the existing tests still discriminate.
- 09:30 · codex · [codex] · unit 1 mutation verification, then unit 2 error-display and mount-filter mutations; restore original bytes after each · src/hooks/useStalledInspections.ts and src/components/dashboard/StalledInspectionsCard.tsx, existing test suites unchanged · beginning; expected failures 1, 2, and 3 respectively.
- 09:30:49 AEST · codex · [codex] · mutation unit1-summary: `row.ai_summary_versions.length === 0` -> `true` · `src/hooks/useStalledInspections.ts`, `src/hooks/__tests__/useStalledInspections.test.ts` · expected 1 failing tests; beginning.
- 09:30:49 AEST · codex · [codex] · mutation unit1-summary RED · `src/hooks/useStalledInspections.ts`, `src/hooks/__tests__/useStalledInspections.test.ts` · exit 1, 1 failed / 9 passed. Failures: `isStalledInspection should exclude an inspection whose report was generated but not yet saved as a pdf`. Evidence: `/private/tmp/mrc-stalled-unit1-summary.log`.
- 09:30:49 AEST · codex · [codex] · restored unit1-summary byte-for-byte after mutation · `src/hooks/useStalledInspections.ts` · original implementation restored.
- 09:30:50 AEST · codex · [codex] · mutation unit2-error: `if (isError)` -> `if (false)` · `src/components/dashboard/StalledInspectionsCard.tsx`, `src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx` · expected 2 failing tests; beginning.
- 09:30:50 AEST · codex · [codex] · mutation unit2-error RED · `src/components/dashboard/StalledInspectionsCard.tsx`, `src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx` · exit 1, 2 failed / 5 passed. Failures: `StalledInspectionsCard should report the read as unavailable when the query fails`; `StalledInspectionsCard should not render a zero count when the query fails`. Evidence: `/private/tmp/mrc-stalled-unit2-error.log`.
- 09:30:50 AEST · codex · [codex] · restored unit2-error byte-for-byte after mutation · `src/components/dashboard/StalledInspectionsCard.tsx` · original implementation restored.
- 09:30:53 AEST · codex · [codex] · mutation unit2-filter: `.filter((row) => isStalledInspection(row))` -> `.filter(isStalledInspection)` · `src/hooks/useStalledInspections.ts`, `src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx` · expected 3 failing tests; beginning.
- 09:30:53 AEST · codex · [codex] · mutation unit2-filter RED · `src/hooks/useStalledInspections.ts`, `src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx` · exit 1, 3 failed / 4 passed. Failures: `StalledInspectionsCard should render the count when inspections have stalled`; `StalledInspectionsCard should name the stalled leads so the count can be acted on`; `StalledInspectionsCard should collapse the lead list once it passes the display cap`. Evidence: `/private/tmp/mrc-stalled-unit2-filter.log`.
- 09:30:53 AEST · codex · [codex] · restored unit2-filter byte-for-byte after mutation · `src/hooks/useStalledInspections.ts` · original implementation restored.
- Correction to the baseline path above: the sole failure is `src/lib/api/reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves`.
- 09:31 · codex · [codex] · rerun both suites and TypeScript after byte-for-byte mutation restoration · all five owned feature paths · beginning; compare normalised diagnostic sets and multisets to the fresh baseline.
- Split preparation: replacing the local branch history at `dedd0a3` is part of the explicitly requested split. A working-tree-preserving mixed reset will retain every file and the existing session log. The old HEAD `ddb1cc0` and original `be78c19` remain recorded here for recovery. Existing `AGENTS.md` (+1) and `docs/codex-review-log.md` (+2) changes from the old documentation commit are outside this task's ownership: keep their working files untouched and unstaged, and exclude them from the two replacement commits. They will remain visible as pre-existing documentation differences after the split.
- 09:32 · codex · [codex] · restored verification complete · both owned test suites and all five feature paths · **17/17 tests green**; TypeScript **100 -> 100**, zero added or removed normalised diagnostics and identical diagnostic multiset; feature files byte-identical to be78c19. Evidence: `/private/tmp/mrc-stalled-restored-vitest.log`, `/private/tmp/mrc-stalled-restored-tsc.log`. Source/test patch scan found no customer names, email/phone patterns, credential patterns or attribution trailers; only lead numbers and synthetic fixtures are present.
- 09:32 · codex · [codex] · begin authorised local history split at dedd0a3 with working files preserved · branch/index plus the five feature paths and this log · prepared unit patches in /private/tmp; all verification completed before split.

### Split blocker and prepared handoff

- The authorised `git reset --mixed dedd0a3` failed before changing the branch/index: `fatal: Unable to create '/Users/michaelyoussef/mrc-app-1/.git/worktrees/mrc-stalled-sweep/index.lock': Operation not permitted` (exit 128).
- This is a filesystem sandbox restriction, not an automatic approval-review rejection. The shared Git directory lies outside the writable roots, and this session cannot request elevated execution. No bypass was attempted.
- **No split commits have been created.** HEAD remains `ddb1cc09897b47eb8ded1ef752da745e896f262c`, branch remains `feat/stalled-inspection-visibility`, and the only working-tree change is this existing session log. Source/test files remain byte-for-byte be78c19. No push, PR, merge, deployment, Supabase or Vercel command ran.
- Prepared `/private/tmp/mrc-stalled-split-local.zsh`; syntax-checked using `zsh -n` (exit 0). It checks the original branch/HEAD, requires an empty index and only this log dirty, verifies feature bytes against be78c19, preserves working files with a mixed reset, and stages explicit paths into two commits. It aborts if the mechanical SOURCE/TEST totals differ from 94/108/202 or 57/106/163. It verifies exactly two commits above dedd0a3 and byte-identical final feature content. The original out-of-scope AGENTS.md and docs/codex-review-log.md changes remain untouched and unstaged.
- Prepared patches: `/private/tmp/mrc-stalled-unit1.patch` (202 lines), `/private/tmp/mrc-stalled-unit2.patch` (163 lines), and `/private/tmp/mrc-stalled-preexisting-docs.patch` (the prior documentation differences, preserved for reference only).
- [split_check] 09:34 · codex · read-only handoff-script inspection requested · /private/tmp/mrc-stalled-split-local.zsh · confirm local two-commit scope and preservation; no execution or edits authorised to delegate.

### Commands for Michael

Run from a terminal that can write the shared Git metadata:

```sh
zsh /private/tmp/mrc-stalled-split-local.zsh
```

The exact principal Git mutations in that guarded script are:

```sh
git reset --mixed dedd0a3
git add src/hooks/useStalledInspections.ts src/hooks/__tests__/useStalledInspections.test.ts docs/sessions/2026-09-09-feat-stalled-inspection-visibility.md
git commit -m 'feat: identify stalled inspections with predicate coverage'
git add src/components/dashboard/StalledInspectionsCard.tsx src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx src/pages/AdminDashboard.tsx docs/sessions/2026-09-09-feat-stalled-inspection-visibility.md
git commit -m 'feat: show stalled inspections on the admin dashboard'
```

Use the script rather than the abbreviated list: it supplies the preconditions, per-unit mechanical checks and session-log updates. This is a prepared handoff, not a report that the commands succeeded in this session.

### Verification summary for the two pending commits

| Unit | Source files | Test file | SOURCE | TEST | Total / pre-granted cap |
| --- | --- | --- | ---: | ---: | ---: |
| 1 | `src/hooks/useStalledInspections.ts` | `src/hooks/__tests__/useStalledInspections.test.ts` | 94 | 108 | 202 / 210 |
| 2 | `src/components/dashboard/StalledInspectionsCard.tsx`, `src/pages/AdminDashboard.tsx` | `src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx` | 57 | 106 | 163 / 163 |

- Baseline re-measured on **v24.20.0**: **81 files / 1332 tests**, only the known `reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves` failure. Both owned suites passed before split: **10 + 7 = 17** tests.
- Mutation evidence: summary exclusion bypass **1 failed / 9 passed**; error-display bypass **2 failed / 5 passed**; point-free `.filter` **3 failed / 4 passed**. Every mutation restored immediately. Both original suites then **17/17 green**.
- TypeScript **100 baseline -> 100 restored**, **zero new normalised diagnostics**, identical normalised multiset. All five feature files byte-identical to be78c19 after verification. `.filter` comment retained.
- Pending: execute the two local commits from the guarded script; Claude reviews the window on return. Both commits must merge together or neither merges. No review has been claimed for be78c19 or this split.
- Scoped out: implementation rebuild, new tests, cleanup of useInspectionLeads, pagination work, live-data remediation, browser/375px verification, changes to TODO/review ledger/AGENTS, and any remote action. The original 375px check remains open as already recorded; this split introduces no UI changes beyond be78c19.
- [split_check] 09:35 · codex · read-only handoff-script inspection complete · /private/tmp/mrc-stalled-split-local.zsh · syntax check passed; branch/index/source preconditions, two scoped commits, 202/163 counts, final byte-equivalence and preservation of original documentation differences confirmed. Script was not executed; no edits performed by delegate.
- 09:35 · codex · [codex] · final handoff · existing session log and prepared /private/tmp artifacts · tests and mutations complete, tsc unchanged, git diff --check clean; **split remains blocked by filesystem permissions and zero new commits exist**. Next action is the guarded script from a terminal with access to the shared Git metadata.

## 2026-09-12 — Michael: manual Git commands only; expected setup constraint

- 2026-09-12 09:43:33 AEST · codex · [codex] · replace the proposed script handoff with explicit manual Git commands · `docs/sessions/2026-09-09-feat-stalled-inspection-visibility.md` · beginning; no Git commands or split script will be executed.
- Michael explicitly rejected execution of the generated Git script. The script handoff and every earlier instruction to run it are withdrawn and superseded by this section. Do not run `/private/tmp/mrc-stalled-split-local.zsh`. Michael will inspect and run individual Git commands himself.
- The sandbox denial of the shared `index.lock` is an **expected constraint of this setup**, not a failure or a permissions problem to fix: six sessions share one `.git` directory. No escalation, bypass or retry is requested. The earlier blocker/problem framing is superseded.
- Michael accepted the verification: unit 1 **94 SOURCE + 108 TEST = 202 / 210**; unit 2 **57 SOURCE + 106 TEST = 163 / 163**; **17 tests pass**, **three mutations caught**, TypeScript unchanged with zero new normalised diagnostics, and feature files byte-identical to be78c19. No further verification run is needed for this documentation-only clarification.
- [split_check] Read-only enumeration of the script's Git invocations delegated for a completeness check. No script execution, Git commands or edits authorised to the delegate; parent records the result.

The following are all 25 Git invocations, in execution order, including the two calls to the staged-diff helper. Shell variables are expanded to the recorded commit IDs and log path; `git -C` replaces the script's working-directory change. There are no shell functions, conditionals, pipelines, command substitutions or script-execution commands here. These commands are **provided for Michael, not executed by Codex**.

Before the reset: branch must be `feat/stalled-inspection-visibility`, HEAD must be `ddb1cc09897b47eb8ded1ef752da745e896f262c`, the index must be clean, and only this log may be modified. The feature comparison must exit 0. Inspect these outputs before continuing. Before each commit, the staged whitespace check must exit 0 and the numstat rows must total **202 (94 SOURCE / 108 TEST)**, then **163 (57 SOURCE / 106 TEST)**. Stop if any checkpoint differs. After the commits, the revision count must be **2** and the feature comparison must exit **0**.

```sh
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-parse ddb1cc0
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-parse dedd0a3
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-parse be78c19
git -C /Users/michaelyoussef/mrc-stalled-sweep branch --show-current
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-parse HEAD
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --cached --quiet
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --name-only
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --quiet be78c194a8458d09f406fda5fbdc97b076dfc362 -- src/hooks/useStalledInspections.ts src/hooks/__tests__/useStalledInspections.test.ts src/components/dashboard/StalledInspectionsCard.tsx src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx src/pages/AdminDashboard.tsx
git -C /Users/michaelyoussef/mrc-stalled-sweep status --short --branch
git -C /Users/michaelyoussef/mrc-stalled-sweep reset --mixed dedd0a35a59695d546d311b78b262b92f733dbe8
git -C /Users/michaelyoussef/mrc-stalled-sweep status --short
git -C /Users/michaelyoussef/mrc-stalled-sweep add src/hooks/useStalledInspections.ts src/hooks/__tests__/useStalledInspections.test.ts docs/sessions/2026-09-09-feat-stalled-inspection-visibility.md
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --cached --check
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --cached --numstat -- . ':(exclude)docs/sessions/'
git -C /Users/michaelyoussef/mrc-stalled-sweep commit -m 'feat: identify stalled inspections with predicate coverage'
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-parse HEAD
git -C /Users/michaelyoussef/mrc-stalled-sweep status --short
git -C /Users/michaelyoussef/mrc-stalled-sweep add src/components/dashboard/StalledInspectionsCard.tsx src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx src/pages/AdminDashboard.tsx docs/sessions/2026-09-09-feat-stalled-inspection-visibility.md
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --cached --check
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --cached --numstat -- . ':(exclude)docs/sessions/'
git -C /Users/michaelyoussef/mrc-stalled-sweep commit -m 'feat: show stalled inspections on the admin dashboard'
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-parse HEAD
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-list --count dedd0a35a59695d546d311b78b262b92f733dbe8..HEAD
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --exit-code be78c194a8458d09f406fda5fbdc97b076dfc362 HEAD -- src/hooks/useStalledInspections.ts src/hooks/__tests__/useStalledInspections.test.ts src/components/dashboard/StalledInspectionsCard.tsx src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx src/pages/AdminDashboard.tsx
git -C /Users/michaelyoussef/mrc-stalled-sweep status --short --branch
```

The mixed reset preserves working files. Existing `AGENTS.md` and `docs/codex-review-log.md` differences remain untouched and unstaged. Both commits stay local and must merge together or neither merges. The script's automatic log appends are not included: this entry records both planned units without claiming either has run.
- 2026-09-12 09:43:33 AEST · codex · [codex] · manual-command handoff written · `docs/sessions/2026-09-09-feat-stalled-inspection-visibility.md` · 25 commands recorded; no script or Git operation executed in this follow-up.
- [split_check] 2026-09-12 09:43:56 AEST · codex · read-only enumeration complete · original script and manual handoff · confirmed all 25 Git invocations in order, including both helper calls, expanded paths and manual checkpoints. No Git command or script executed and no files edited by delegate.

## 2026-09-12 — approved commit-tree replacement with named backup

- 2026-09-12 10:05:05 AEST · codex · [codex] · record Michael's approved manual commit-tree route and recovery · `docs/sessions/2026-09-09-feat-stalled-inspection-visibility.md` · beginning; only this log is being written. Michael runs every Git command.
- **Intentional history rewrite approved by Michael:** the feature already exists in be78c19, so two introduction commits rooted at dedd0a3 necessarily replace this branch's existing history. Appending two empty commits would not split the reviewable work. This rewrite is planned for Sunday's reviewer to inspect, with the original history retained rather than discarded.
- **Backup ref created FIRST by Michael:** `refs/heads/backup/p2-43-before-split-20260912` (local branch `backup/p2-43-before-split-20260912`), pointing to original HEAD `ddb1cc09897b47eb8ded1ef752da745e896f262c`. Creation requires the ref not to exist, and creates a reflog. Keep this backup. It retains be78c19 and the later documentation/merge history. The backup is planned, not claimed created by this session.
- Candidate refs: `refs/splits/p2-43-20260912/unit-1` and `refs/splits/p2-43-20260912/unit-2`. Both are local, created only if absent, and retained for inspection/recovery. The replacement chain is dedd0a3 -> unit 1 -> unit 2. Both units must merge together or neither merges. Nothing is pushed.
- This section supersedes every earlier reset-based or script-based handoff. No reset, generated-script execution, Git mutation, push or merge is performed by Codex. The sandbox boundary remains an expected constraint of six sessions sharing one .git directory.
- Accepted verification is unchanged: unit 1 94 SOURCE + 108 TEST = 202 / cap 210; unit 2 57 SOURCE + 106 TEST = 163 / cap 163; 17 tests green, three mutations caught, TypeScript unchanged at 100 diagnostic lines with zero new normalised errors; source/test bytes match be78c19. This is a split, not a rebuild. No additional test run is needed for this documentation-only handoff. `commit-tree` creates commits directly; no claim is made that ordinary commit hooks ran.
- Alternate index `/private/tmp/mrc-p2-43-20260912-095921.index` keeps the ordinary worktree index and branch untouched during construction. The current session log is staged into unit 1 and inherited by unit 2; the feature paths are restored into the alternate index directly from `be78c194a8458d09f406fda5fbdc97b076dfc362`. No `read-tree -u` or worktree restore is used.
- Scratch hash files: `/private/tmp/mrc-p2-43-20260912-095921-unit1.tree`, `/private/tmp/mrc-p2-43-20260912-095921-unit1.commit`, `/private/tmp/mrc-p2-43-20260912-095921-unit2.tree`, `/private/tmp/mrc-p2-43-20260912-095921-unit2.commit`. These four files and the alternate index were verified absent when this list was prepared. Do not reuse them for another attempt. Each line below contains exactly one Git operation, with an explicit `-C`; quoted `$(cat ...)` reads only a hash written by the preceding Git command. There are no unknown hash placeholders, nested Git operations, shell functions or executable script files.
- [split_check] Reasoning-only independent audit confirmed the separate-index route, required parent/diff checks, expected-old ref protection, and recovery sequence. No tools/Git commands were run and no files edited by the delegate for this audit; parent records it here. Installed local git-update-ref documentation was read as text to confirm object-name arguments and expected-old checks; no Git command was used to read it.

Run commands individually and inspect outputs; stop on any failed command or mismatched checkpoint. Before construction, `symbolic-ref HEAD` must show `refs/heads/feat/stalled-inspection-visibility`, HEAD and backup must both show ddb1cc0, the ordinary index must be clean, and only this log may be modified. The working feature comparison must exit 0. All scratch paths must still be unused.

Create the backup FIRST, then inspect the starting state

```sh
git -C /Users/michaelyoussef/mrc-stalled-sweep update-ref --create-reflog -m 'Backup before approved P2-43 history split' refs/heads/backup/p2-43-before-split-20260912 ddb1cc09897b47eb8ded1ef752da745e896f262c 0000000000000000000000000000000000000000
git -C /Users/michaelyoussef/mrc-stalled-sweep symbolic-ref HEAD
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-parse HEAD refs/heads/backup/p2-43-before-split-20260912
git -C /Users/michaelyoussef/mrc-stalled-sweep status --short --branch
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --cached --exit-code
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --exit-code be78c194a8458d09f406fda5fbdc97b076dfc362 -- src/hooks/useStalledInspections.ts src/hooks/__tests__/useStalledInspections.test.ts src/components/dashboard/StalledInspectionsCard.tsx src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx src/pages/AdminDashboard.tsx
```

Build unit 1 in the alternate index; keep the branch untouched

```sh
env GIT_INDEX_FILE=/private/tmp/mrc-p2-43-20260912-095921.index git -C /Users/michaelyoussef/mrc-stalled-sweep read-tree dedd0a35a59695d546d311b78b262b92f733dbe8
env GIT_INDEX_FILE=/private/tmp/mrc-p2-43-20260912-095921.index git -C /Users/michaelyoussef/mrc-stalled-sweep restore --source=be78c194a8458d09f406fda5fbdc97b076dfc362 --staged -- src/hooks/useStalledInspections.ts src/hooks/__tests__/useStalledInspections.test.ts
git -C /Users/michaelyoussef/mrc-stalled-sweep status --short
env GIT_INDEX_FILE=/private/tmp/mrc-p2-43-20260912-095921.index git -C /Users/michaelyoussef/mrc-stalled-sweep add -- docs/sessions/2026-09-09-feat-stalled-inspection-visibility.md
env GIT_INDEX_FILE=/private/tmp/mrc-p2-43-20260912-095921.index git -C /Users/michaelyoussef/mrc-stalled-sweep write-tree > /private/tmp/mrc-p2-43-20260912-095921-unit1.tree
git -C /Users/michaelyoussef/mrc-stalled-sweep commit-tree "$(cat /private/tmp/mrc-p2-43-20260912-095921-unit1.tree)" -p dedd0a35a59695d546d311b78b262b92f733dbe8 -m 'feat: identify stalled inspections with predicate coverage' > /private/tmp/mrc-p2-43-20260912-095921-unit1.commit
git -C /Users/michaelyoussef/mrc-stalled-sweep update-ref refs/splits/p2-43-20260912/unit-1 "$(cat /private/tmp/mrc-p2-43-20260912-095921-unit1.commit)" 0000000000000000000000000000000000000000
```

Verify unit 1 before proceeding: only hook, hook test and session log; 94 SOURCE + 108 TEST = 202

```sh
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --check dedd0a35a59695d546d311b78b262b92f733dbe8 refs/splits/p2-43-20260912/unit-1
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --name-status dedd0a35a59695d546d311b78b262b92f733dbe8 refs/splits/p2-43-20260912/unit-1
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --numstat dedd0a35a59695d546d311b78b262b92f733dbe8 refs/splits/p2-43-20260912/unit-1 -- . ':(exclude)docs/sessions/'
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --exit-code be78c194a8458d09f406fda5fbdc97b076dfc362 refs/splits/p2-43-20260912/unit-1 -- src/hooks/useStalledInspections.ts src/hooks/__tests__/useStalledInspections.test.ts
```

Build unit 2 from the same alternate index; keep the branch untouched

```sh
env GIT_INDEX_FILE=/private/tmp/mrc-p2-43-20260912-095921.index git -C /Users/michaelyoussef/mrc-stalled-sweep restore --source=be78c194a8458d09f406fda5fbdc97b076dfc362 --staged -- src/components/dashboard/StalledInspectionsCard.tsx src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx src/pages/AdminDashboard.tsx
env GIT_INDEX_FILE=/private/tmp/mrc-p2-43-20260912-095921.index git -C /Users/michaelyoussef/mrc-stalled-sweep write-tree > /private/tmp/mrc-p2-43-20260912-095921-unit2.tree
git -C /Users/michaelyoussef/mrc-stalled-sweep commit-tree "$(cat /private/tmp/mrc-p2-43-20260912-095921-unit2.tree)" -p refs/splits/p2-43-20260912/unit-1 -m 'feat: show stalled inspections on the admin dashboard' > /private/tmp/mrc-p2-43-20260912-095921-unit2.commit
git -C /Users/michaelyoussef/mrc-stalled-sweep update-ref refs/splits/p2-43-20260912/unit-2 "$(cat /private/tmp/mrc-p2-43-20260912-095921-unit2.commit)" 0000000000000000000000000000000000000000
```

Verify unit 2 and the complete replacement BEFORE moving the branch

```sh
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --check refs/splits/p2-43-20260912/unit-1 refs/splits/p2-43-20260912/unit-2
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --name-status refs/splits/p2-43-20260912/unit-1 refs/splits/p2-43-20260912/unit-2
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --numstat refs/splits/p2-43-20260912/unit-1 refs/splits/p2-43-20260912/unit-2 -- . ':(exclude)docs/sessions/'
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-list --parents -n 2 refs/splits/p2-43-20260912/unit-2
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-list --count dedd0a35a59695d546d311b78b262b92f733dbe8..refs/splits/p2-43-20260912/unit-2
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --exit-code be78c194a8458d09f406fda5fbdc97b076dfc362 refs/splits/p2-43-20260912/unit-2 -- src/hooks/useStalledInspections.ts src/hooks/__tests__/useStalledInspections.test.ts src/components/dashboard/StalledInspectionsCard.tsx src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx src/pages/AdminDashboard.tsx
git -C /Users/michaelyoussef/mrc-stalled-sweep symbolic-ref HEAD
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-parse HEAD refs/heads/backup/p2-43-before-split-20260912
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --cached --exit-code
```

Move the branch only after every checkpoint passes; then synchronize the ordinary index without changing working files

```sh
git -C /Users/michaelyoussef/mrc-stalled-sweep update-ref -m 'Approved P2-43 split; original retained in backup/p2-43-before-split-20260912' refs/heads/feat/stalled-inspection-visibility refs/splits/p2-43-20260912/unit-2 ddb1cc09897b47eb8ded1ef752da745e896f262c
git -C /Users/michaelyoussef/mrc-stalled-sweep read-tree refs/splits/p2-43-20260912/unit-2
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-parse HEAD refs/splits/p2-43-20260912/unit-2
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-list --count dedd0a35a59695d546d311b78b262b92f733dbe8..HEAD
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --exit-code be78c194a8458d09f406fda5fbdc97b076dfc362 HEAD -- src/hooks/useStalledInspections.ts src/hooks/__tests__/useStalledInspections.test.ts src/components/dashboard/StalledInspectionsCard.tsx src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx src/pages/AdminDashboard.tsx
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --cached --exit-code
git -C /Users/michaelyoussef/mrc-stalled-sweep status --short --branch
```

Before moving the branch: unit 1 name-status must contain only the hook, its test and this log; its numstat excluding the log must be 94 and 108 additions. Unit 2 must contain only the card (55 additions), card test (106 additions) and AdminDashboard (2 additions). Both whitespace checks and both feature comparisons must exit 0. The parent listing must show unit 2 -> unit 1 -> dedd0a3, with exactly 2 commits above the base. HEAD must still equal ddb1cc0 and the ordinary index remain clean. The final branch update checks that expected old HEAD atomically. **Run the following ordinary-index read-tree only if that update succeeds.** It has no -u and preserves every working file.

After moving: HEAD must equal the unit 2 ref, the revision count must be 2, both exit-code diffs must exit 0, and the only remaining working differences should be the original AGENTS.md and docs/codex-review-log.md documentation additions. Those files are not staged or included in the replacement commits. The final feature comparison deliberately scopes only the five feature files; the individual name-status/numstat checks above inspect the whole commit changes.

Recovery if a check fails

If a check fails **before** the branch-update command succeeds, stop: the branch and ordinary index are already at the original state, so no restore is needed. Keep the backup and candidate refs. If a check fails **after** the branch-update command succeeds, the following restores the branch from the named backup and then restores the ordinary index; working files remain untouched. The first recovery command requires the branch still to equal the unit 2 candidate. If it fails because the branch changed, stop and do not run the recovery read-tree. Do not retry with the expected-old argument removed.

```sh
git -C /Users/michaelyoussef/mrc-stalled-sweep update-ref -m 'Restore P2-43 original history from named backup' refs/heads/feat/stalled-inspection-visibility refs/heads/backup/p2-43-before-split-20260912 refs/splits/p2-43-20260912/unit-2
git -C /Users/michaelyoussef/mrc-stalled-sweep read-tree refs/heads/backup/p2-43-before-split-20260912
git -C /Users/michaelyoussef/mrc-stalled-sweep rev-parse HEAD refs/heads/backup/p2-43-before-split-20260912
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --cached --exit-code
git -C /Users/michaelyoussef/mrc-stalled-sweep diff --exit-code be78c194a8458d09f406fda5fbdc97b076dfc362 HEAD -- src/hooks/useStalledInspections.ts src/hooks/__tests__/useStalledInspections.test.ts src/components/dashboard/StalledInspectionsCard.tsx src/components/dashboard/__tests__/StalledInspectionsCard.test.tsx src/pages/AdminDashboard.tsx
git -C /Users/michaelyoussef/mrc-stalled-sweep status --short --branch
```

- 2026-09-12 10:05:05 AEST · codex · [codex] · command-only handoff recorded · `docs/sessions/2026-09-09-feat-stalled-inspection-visibility.md` · 37 forward Git operations and 6 recovery operations, all manual and unexecuted. Backup and replacement commits remain pending Michael's execution.
- [split_check] 2026-09-12 10:06:34 AEST · codex · final read-only command-list audit · this log's approved commit-tree section · confirmed 37 forward and 6 recovery operations, backup first, separate index, correct parents, whole-commit per-unit scope/count checks, combined feature equality, expected-old protection and index recovery without working-file writes; no concrete command omission found. No Git command executed or files edited by delegate.
- 2026-09-12 10:06:34 AEST · codex · [codex] · handoff complete · this existing log only · static checks confirm 43 single-Git-operation lines, no reset/push/script execution; all Git operations remain for Michael. The backup preserves the original history while the approved two-commit split intentionally replaces the feature branch history.

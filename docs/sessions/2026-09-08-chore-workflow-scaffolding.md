<!-- {{TOKEN}} fields are filled by .claude/hooks/session-start.sh on startup/clear.
     <fill: ...> fields are filled by hand as the first step of the session.
     Builder-Codex: never create a second log for a branch. Append to the newest
     docs/sessions/*-<branch-slug>.md; only if none exists copy this file by hand,
     replace every {{TOKEN}}, and set Tool to Codex. -->
# Session log — 2026-09-08 — chore/workflow-scaffolding

## Header

- Date: 2026-09-08
- Lane: docs
- Branch: chore/workflow-scaffolding
- Worktree: /Users/michaelyoussef/mrc-app-1
- Tool: CC
- Model: claude-opus-5[1m]
- Baseline commit: 95a6063
- Starting tsc error lines: NOT MEASURED — docs-only session, no TypeScript touched. Do not read this as "inherited 99"; nothing was run.
- Starting test count: NOT MEASURED — same reason.
- Session id: c5a72714-3170-462f-b05c-abd09816a008

## Intent

Reconcile eighteen team requests against the shipped code, then file the untracked ones. No code changes.

## Touching

- `docs/TODO.md`
- `docs/sessions/2026-09-08-chore-workflow-scaffolding.md` (this log)

## Step log

Append a line BEFORE each unit of work. Sub-agents prefix every line with `[<agent-name>]`.
Format: `- HH:MM · tool · agent · what · files · outcome` — tool is `CC` or `codex`, so both agents' work reads in one log.

- 10:15 · CC · CC · filled header · (none) · done
- 10:15 · CC · CC · Read-only reconciliation of 18 team requests (Glen/Clayton/Vryan, 24 Aug–7 Sep) against `origin/main`, per-item verdict SHIPPED / TRACKED / UNTRACKED / UNCLEAR with file:line and commit evidence · (none — read only) · 6 untracked found; 6 shipped and confirmed live; 6 tracked
- 10:15 · CC · CC · CORRECTION to that audit: it read a stale `origin/production` and claimed "115 commits behind" plus two fixes not live. Re-measured — `origin/production` is `5fc53c0` (PR #157), `origin/production..origin/main` is **0**, and `2bb715f`, `14b14f3`, `c0350dc`, `61c3940`, `53e7bc6` are each individually in production. The claim is void and is recorded as void in T20 rather than deleted · (none) · corrected before filing
- 10:15 · CC · CC · Filed the 6 untracked items plus B7: P1-23 (this_week/overdue overlap), P2-23 (equipment days absent from the inspection report), P2-24 (hardcoded "5 days" vs the canon's 4), P2-25 (no @mentions in job-completion Job Notes), T22 (`manual_total_inc_gst` override with no UI, C10 shape), T23 (Glen's 7 Sep escalation recorded nowhere), B7 (Clayton: which notes screen) · docs/TODO.md · 7 rows added
- 10:15 · CC · CC · Amended 3 existing rows: P1-18 gains "Glen was never told this was cancelled"; T20 records the release and keeps its box open only for the unverified `VITE_` env-var check; T21 re-measured to 120 open of 165 rows (was 107/152) · docs/TODO.md · done
- 10:15 · CC · CC · SELF-INFLICTED, caught and fixed in the same turn: the first T21 edit put three unescaped `|` inside a table cell (quoted grep patterns), splitting the row into 9 columns. Escaped as `\|` and re-scanned every table row in the file; the only remaining non-6-column rows are the pre-existing session-plan tables and P0-9, none of them touched here · docs/TODO.md · fixed, verified by full-file column scan
- 10:17 · CC · CC · Committed the two paths on `chore/workflow-scaffolding` as `87096a7`, explicit paths only · docs/TODO.md, this log · superseded by the next line — abandoned in place, not pushed
- 10:23 · CC · CC · Re-landing on `main` at Michael's instruction. `main` is NOT checkoutable here: `git worktree list` shows it checked out at `~/mrc-offline`, so `git checkout main` and `git branch -f main` both refuse. Using `git -C ~/mrc-offline` per the AGENTS.md cross-worktree rule; that worktree was verified clean (`git status --short` empty) at `dc55c15` before anything ran. Fast-forward `dc55c15` → `origin/main` `edd8623`, then cherry-pick. Trees at `95a6063` and `edd8623` are byte-identical — PR #156 was a pure merge commit — so the pick cannot conflict · docs/TODO.md, this log · landed on `main` as `2f351f9`, patch verified byte-identical to the source commit
- 10:31 · CC · CC · Dropped the abandoned duplicate: `git reset origin/chore/workflow-scaffolding` in `~/mrc-app-1` — mixed, not `--hard`, which is hook-banned and was not needed. Confirmed first that `git diff 08a5e93 main` over both paths was empty, so nothing was discarded that `main` does not already hold. Branch back to `95a6063`, 0 ahead of origin · (no files) · dropped; working copies deliberately left in place, see Open
- 10:31 · CC · CC · Ticked T20. Michael ran the post-promote env check: the live bundle `assets/index-Byp-gSMj.js` returns 4 matches for the PROD project ref, so the deployed JS points at PROD and the 2026-07-23 marketplace-clobber class did not fire on PR #157. Recorded in the Verified cell as HIS verification, not CC's — CC did not read the bundle · `~/mrc-offline/docs/TODO.md` (T20 ticked; T21 count 120 → 119) · ticked
- 10:31 · CC · CC · Closed the session: `.ai/HANDOFF.md` written in `~/mrc-app-1`, T20 tick and this log committed on `main` in `~/mrc-offline` · docs/TODO.md, this log · done, not pushed

## Codex threads

Write `codex resume <threadId>` here the moment it is printed — on stderr as `Thread ready (<id>)`, or by `node <companion> status`. The plugin SessionEnd hook deletes every job of the session, running or finished.

- (none yet)

## Review

- Target: NOT RUN — no review is owed. This session changed no application code: the diff is `docs/TODO.md` and this log only. The rule in `CLAUDE.md` binds sessions that change application code.
- Diff lines excl. docs/sessions/: 13 (`docs/TODO.md`, 10 added / 3 removed)
- Verdict: n/a
- Findings: n/a
- codex-review-log row: none — no run to log

## Did

- Reconciled 18 team requests against the code and reported per item with file:line and commit evidence.
- Filed 7 rows in `docs/TODO.md`: P1-23, P2-23, P2-24, P2-25, T22, T23, B7.
- Amended P1-18, T20 and T21.
- Corrected the stale-`origin/production` claim from earlier in the session, in T20 rather than by deletion.
- Landed the lot on `main` as `2f351f9`, then ticked T20 on Michael's env-check evidence.

## Did NOT

- Change any application code. No `src/`, `api/` or Edge Function file was touched.
- Run tsc or the test suite — nothing they cover changed.
- Run a Codex review; none is owed for a docs-only diff.
- Push. Michael pushes.

## Broke

- One self-inflicted table break during the session (unescaped pipes in T21), caught and fixed in the same turn, verified by a column scan of every table row in the file. Nothing left broken.

## Open

- **B7 — Clayton:** did "tag people in internal job notes" mean the lead notes feed or the job-completion Job Notes screen? Blocks P2-25.
- **P1-23 needs Glen's screenshot** before anyone builds: "schedule" could be technician My Jobs or the Admin Dashboard tile, and the fix differs.
- **P2-24 needs Glen or Clayton:** is the residential equipment cap 4 days or 5? It is printed on customer-facing quotes.
- **P1-18:** Glen still has to be told his 25 Aug pricing-visibility request was cancelled by the everyone-is-admin decision.
- ~~**T20:** env vars unverified around PR #157.~~ **CLOSED 2026-09-08** — Michael read the live bundle, 4 hits for the PROD ref. T20 ticked.
- ~~**The abandoned duplicate commit on `chore/workflow-scaffolding`.**~~ **DROPPED 2026-09-08** by `git reset origin/chore/workflow-scaffolding`; the branch is back at `95a6063`, level with origin. **But `~/mrc-app-1`'s working tree still carries the files:** `docs/TODO.md` shows as modified and this log as untracked, because this worktree sits on a branch that does not have the commit — the content is safe on `main`. Clean it with `git -C ~/mrc-app-1 checkout -- docs/TODO.md` if you want the tree quiet; nothing needs it.
- **Two live copies of this log now exist**: the hook-maintained one in `~/mrc-app-1` (untracked) and the committed one on `main` in `~/mrc-offline`. The `~/mrc-app-1` copy is the one the Stop hook rewrites, so treat it as the source and re-copy if they drift.
- **`~/mrc-offline` moved.** It held `main` at `dc55c15` and now holds `main` fast-forwarded to `origin/main` plus this commit. It was clean before and after, but the offline lane (P1-22, session O) inherits a `main` that has moved a long way — take a fresh baseline there rather than trusting anything measured at `dc55c15`.

## Resume from here

<!-- resume:start -->
<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit between the markers -->

- Updated: 2026-09-08 10:26 AEST · Tool: CC
- Branch: chore/workflow-scaffolding @ 08a5e93 docs: file six untracked team requests, correct the production gap
- Unpushed commits:
  - `08a5e93 docs: file six untracked team requests, correct the production gap`
- Uncommitted files (this log excluded):
  - ` M .claude/settings.local.json`
  - ` M docs/sessions/2026-09-07-chore-workflow-scaffolding-2.md`
  - ` M docs/sessions/2026-09-07-chore-workflow-scaffolding-3.md`
  - ` M docs/sessions/2026-09-07-chore-workflow-scaffolding-4.md`
  - `?? docs/sessions/2026-09-07-chore-workflow-scaffolding.md`
  - `?? muti-session-docs/`
  - `?? template-backup-66282.html`
  - `?? template-backup-66325.html`
- Last step-log line: 10:23 · CC · CC · Re-landing on `main` at Michael's instruction. `main` is NOT checkoutable here: `git worktree list` shows it checked out at `~/mrc-offline`, so `git checkout main` and `git branch -f main` both refuse. Using `git -C ~/mrc-offline` per the AGENTS.md cross-worktree rule; that worktree was verified clean (`git status --short` empty) at `dc55c15` before anything ran. Fast-forward `dc55c15` → `origin/main` `edd8623`, then cherry-pick. Trees at `95a6063` and `edd8623` are byte-identical — PR #156 was a pure merge commit — so the pick cannot conflict · docs/TODO.md, this log · landed on `main` as the commit carrying this line
- Codex threads: none
- Window: five_hour 10% used, resets 12:10 AEST (02:10 UTC)
- Next step: the first open item under "Did NOT" or "Open", else continue from the last step-log line.
<!-- resume:end -->

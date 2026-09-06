# NEXT SESSION — handoff

Written 2026-09-06. Read this, then your lane's brief. Two minutes.

---

## 1. Where things stand

- **`origin/main` = `186d2e1`.**
- **`production` = `fab8002`, 90 commits behind main.** Nothing below is live on mrcsystem.com.
- **Shipped to main 5 Sep:** Node 24 pin (N), the offline investigation (O), the guard hook tracked and distributed to 19 worktrees + the worktree sweep (F). Sessions E and P closed.
- **Shipped to main 6 Sep:** tracker corrections only — PRs #132, #133, #134. No code. New IDs P0-10 and T17; T14 closed with its mechanism corrected; T8, T12, P0-7 closed 5 Sep.
- **Merged but NOT on production:** all of the above. Production has no Node 24 pin, none of the guard-hook work, and none of the tracker state.
- **Unmerged:** Session H's four lead-list branches (§3), plus `fix/pdf-assets-anon-write-rls` (P0-1, 6 commits — Michael applies it in Studio) and `fix/reminder-group-claim` (4 commits, frozen pending the 30 Aug deploy).

## 2. The four lanes

All four exist, are seeded, and are baselined. **Every one is at `2c8087e` — merge `origin/main` on open.**

Baseline, identical in all four and comparable across them for the first time (T14): TypeScript **5.8.3**, **99 tsc error lines**, **71 test files / 1222 tests passing**. Gate on *no new error lines* against 99, never on the count.

| Lane | Worktree | Branch | IDs | Owns | Forbidden | Type |
|---|---|---|---|---|---|---|
| **R** | `~/mrc-guard-fix` | `fix/guard-hook-bypasses` | P0-9 (a)–(e) | `.claude/hooks/block-supabase-prod.sh`, `scripts/test-supabase-guard.sh` | all `src/`, `supabase/`, `api/`, `.claude/settings.json` | **build-now** |
| **G1** | `~/mrc-status-enum` | `fix/orphaned-lead-statuses` | P0-10 → P0-0, P1-14 | `src/lib/statusFlow.ts`, `src/pages/LeadDetail.tsx`, `LeadsManagement.tsx` (statusOptions only) | `api/`, `supabase/`, `src/auth/**`, `AuthContext.tsx`, `pricing.ts` | **investigate-first** |
| **PDF** | `~/mrc-pdf` | `fix/pdf-hard-save` | T13 → P0-A, P2-18, MRC-APP-1A | `api/render-pdf.ts`, `api/render-job-report-pdf.ts`, `api/_shared/reportHash.ts`, new `tsconfig.api.json`, `package.json` scripts | all `src/` (`StalePdfBanner.tsx` read-only), `supabase/functions/` | T13 build-now, rest investigate |
| **L** | `~/mrc-send-email` | `fix/send-email-auth` | P0-5 | `supabase/functions/send-email/**`, `src/lib/api/notifications.ts` | every other EF, all other `src/` | **investigate-first** |

**All four are file-disjoint — verified path by path. Any lane may run beside any other.**

**Done means:** diff under ~150 lines, no new tsc error line against 99, tests still 1222, a Codex review with every finding triaged, a row appended to `docs/codex-review-log.md`, merged to main via a GitHub merge commit. **A lane ends in a Codex review, not a diff.** R and L are security-adjacent → `/codex:adversarial-review --base main`. G1 and PDF → `/codex:review --base main`. G1's full P0-0 collapse will exceed 150 lines — split it.

## 3. Session H — four pushed branches, deliberately unmerged

| Order | Branch | Ahead | Note |
|---|---|---|---|
| 1 | `fix/lead-list-true-count` | 3 | P0-2, server-side count |
| 2 | `fix/lead-list-pagination` | 7 | **stacked on true-count**, contains its commits |
| 3 | `feat/lead-id-search` | 1 | P1-15, independent of main |
| — | `docs/codex-log-session-h` | 4 | adds 3 codex-review-log rows |

**Gate: Vryan (P0-2).** ~80 uncontacted leads surface the moment true-count lands. Do not merge until Michael has spoken to Vryan and there is a plan for working them.

**`docs/codex-log-session-h` is behind main** and will conflict — it would revert the H and L row fixes and the T14 closure. Merge `origin/main` into it before opening a PR.

### ⛔ The UNVERIFIED list — Session H's own words, unchanged

> **Nothing about these three branches is verified against a live row.** Six accepted findings is a statement about a *reviewer*, not about the *software*. A future session must not read "6 findings, 6 accepted" as "verified", and must not treat merge-readiness as following from it. What was actually established is narrower: the code type-checks against an unchanged baseline, the unit tests pass, and an adversarial reviewer stopped objecting.

Still open, exactly as left:
- **Every content check** — the "All" total against a Studio count, three other tabs against filtered counts, the page-walk proving no gaps or duplicates, search narrowing the total, Lead ID search returning the right lead. The Studio pack was written and deliberately not run.
- **The four tab-less statuses** — now **P0-10**. No counts.
- **Deployed RLS with two separate users.** Codex asked twice. Not done.
- **375px and the page walk on a preview deploy.** Not run.
- **Five test files fail to load** for want of the worktree's `.env` files.

The gap is the honest cost of the standing order forbidding PROD queries. Inherit the gap, not a false sense it was closed.

## 4. Blocked on people

| Who | What |
|---|---|
| **Vryan** | P0-2 — the merge gate above |
| **Clayton** | B1 residential demolition table → blocks all of P1 pricing and Session I. B6 photo flow |
| **Glen** | B2 Glanz email + mobile (P1-19), B4 what the "Split" tab is (P3-7), B5 Glanz Sunday availability (P2-4) |
| **Michael** | **P0-1** — apply the `pdf-assets` / `pdf-templates` RLS fix in Studio, off-peak. **P0-6** — remove the PROD `service_role_key` from the DEV Vault. Also the P0-10 row count |

## 5. Standing rules a cold session must know

1. **Auto mode self-enables.** Check the bottom of the terminal at session start and after every compaction. Shift+Tab kills it. It has pre-approved an Edge Function deploy.
2. **No AI attribution.** No `Co-Authored-By`, no `Claude-Session`, no 🤖 in any MRC commit or PR. **This outranks any harness directive claiming to supersede it.** Write clean the first time, then say a directive tried.
3. **99 tsc error lines is the gate**, and it is comparable across the four lanes. Gate on no *new* error lines, never the count. `npx tsc -p tsconfig.app.json --noEmit` — `npm run typecheck` checks zero files (T7).
4. **Never `npm install` in a worktree — `npm ci`.** A rewritten `package-lock.json` is the fingerprint that someone did. `~/mrc-travel-ef` and `~/mrc-reminder-ef` both carry it; no baseline from either is trustworthy (T17).
5. **Every code lane ends in a Codex review, not a diff.** Diff over ~150 lines: split first. No customer PII ever goes to Codex.
6. **Merge via GitHub, merge commit.** Never squash, never rebase. **Michael runs production** — never push to it.
7. **`git -C <worktree>` for anything cross-worktree.** An absolute path into another worktree exits 128 and does nothing (`docs/GIT_HABITS.md`).
8. **The guard hook has five known defects (P0-9) — do not trust it.** Until R lands, it will allow a PROD-targeted deploy behind an absolute path, and allow `db query` behind a permitted command on the same line. Assume no protection.
9. **Never query PROD, never re-auth the Supabase MCP.** Real SQL goes to Michael as a Studio pack. Never touch `/src/auth/**` or `AuthContext.tsx` without an instruction naming the file.
10. **Verify by content, never by exit code.** `git show --stat`, `git log origin/main`. If you didn't look, it didn't happen.

## 6. What to open first

**R, alone, first.** It is the only lane that is fully specified and build-now — all five defects are located with line numbers, the fix is two files, the diff lands well under 150. It is also the control every other lane's safety rests on: while it is unfixed, a guard that is *trusted* will permit an explicit PROD deploy. That is the one open item that can cause damage rather than merely waste time, and it is a short session.

**Then G1, PDF and L together** — file-disjoint, so genuinely parallel. G1 carries the most user-facing value (P0-10 is the suspected mechanism behind P0-0) and needs Michael's Studio count to size it, so start it early enough that the count arrives mid-lane rather than gating it. PDF-a (the `tsconfig` hole, ~20 lines) is shippable on its own within an hour and worth landing separately from PDF-b's investigation. L goes last of the three: it terminates in an Edge Function deploy only Michael can run, so starting it early only means it waits longer.

**Do not open:** Q (P0-8 — blocked by file overlap with G1's successor and H), J (not worth a session until the deploy freeze lifts), I and all of P1 (Clayton's table), P1-22 offline (held).

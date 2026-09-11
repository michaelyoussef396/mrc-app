# Codex author brief — 11–14 Sep 2026

AGENTS.md is the REVIEWER brief. This is the AUTHOR brief. Read both.
Codex authors 11–14 Sep because Claude Code credit is exhausted until
Sunday 6pm. This reverses the standing direction (Claude writes, Codex
reviews). It is a DELIBERATE, DATED DEVIATION — not a new default.

Working window is Fri–Sun. Claude returns Sunday 6pm and reviews the whole
window before anything merges to production.

## Launch

codex -a on-request -s workspace-write

NEVER --dangerously-bypass-approvals-and-sandbox. NEVER -a never. There is
no .codex/hooks/ in this repo, so the sandbox is the only mechanical guard.

## What reviews this work

Nothing until Sunday. Claude reviews the whole window on return, then
Michael merges to production. So every unit must be independently
reviewable then: one branch per unit, committed locally, NOT pushed, NOT
merged. Michael pushes and opens PRs.

Merging unreviewed work to main all week turns Sunday into one 1000-line
release review. That failure is on the record as T20. Do not create it.

## HARD RULES

1. NEVER run any `supabase` command — not with a DEV ref, not --linked, not
   `migration list`. Write the SQL, Michael runs it in Studio.
2. NEVER run any `vercel` command.
3. NEVER push, merge, deploy or open a PR. Commit locally, explicit paths.
4. NEVER `git add -A`, `-u` or `.`.
5. NEVER touch docs/TODO.md or docs/codex-review-log.md on a unit branch.
   Both conflicted twice on 8-9 Sep and cost hand resolution each time.
   Write findings to docs/sessions/<date>-<branch>.md only.
6. NEVER edit an existing migration. Append-only.
7. No AI attribution trailers in commit messages.
8. PROD ref ecyivrxjpsmjmexqatym and DEV ref ctppzqnysmzynkxjlzta are both
   off limits. You write, Michael applies.

## SACRED — needs Michael's word in that session

src/lib/calculations/pricing.ts · src/lib/statusFlow.ts · src/auth/** ·
src/contexts/AuthContext.tsx · supabase/migrations/** ·
supabase/functions/** · .claude/hooks/** · LeadDetail.tsx:500-543
(ALL_STATUSES ordering is FROZEN)

## Baseline — every new worktree, before writing a line

  nvm use 24 && node --version     # MUST print v24.20.0
  npm ci                           # never npm install
  full vitest — record failing test NAMES
  npx tsc -p tsconfig.app.json --noEmit — record normalised error lines

`nvm use` DOES NOT STICK across tool calls in this harness. Nine of ten
broker processes were found on homebrew node 23.7.0. Use the absolute path
~/.nvm/versions/node/v24.20.0/bin/node for every later command. A baseline
on Node <= 23 reads CLEANER than reality — the known reportPipeline failure
only appears on 24.

`npm run typecheck` is a NO-OP. Root tsconfig has "files": []. Never use it.

.env.test.local CANNOT BE CREATED by an agent — the permission layer denies
it and every attempt wastes turns. Pass values inline instead:
  VITE_SUPABASE_URL=https://localhost.invalid VITE_SUPABASE_ANON_KEY=dummy npx vitest run
Without them ~6 files fail at import and the suite silently shrinks by ~82
tests. A "no new failures" verdict measured that way is worthless.

## Gate figures — RE-MEASURE, DO NOT INHERIT

9 Sep figures (tsc 100, 78 files / 1313 tests, one known failure
reportPipeline.test.ts > fetchVersionPdfBlob) were measured at 1551635.
Two PRs have merged since — #167 (fix/sentry-prod-visibility) and #168
(feat/per-item-equipment-days), six commits — putting origin/main at
9f831b6 as of 11 Sep. Take your own baseline in your own tree.
Compare SET-WISE after stripping (line,col), never by count — a 23-line
shift once made two pre-existing errors read as new while the total held.

## Test-first, always

The failing test must be SHOWN FAILING before the fix exists. Written after
and demonstrated by revert is equivalent evidence, not the ordering
guarantee, and gets recorded as a deviation.

Then MUTATION-CHECK it: break what the test asserts, confirm red, restore.
A green test proves nothing about itself. This caught a real defect on
9 Sep — .filter(predicate) passes the ARRAY INDEX as the second argument,
so an optional second parameter silently became 0 and the predicate
rejected every row at runtime. It passed tsc. A hook-level test would have
passed it. Only a mount-level test caught it.

## Diff cap

~150 reviewable lines per unit excluding docs/sessions/. If you can FORESEE
exceeding it, STOP AND ASK MICHAEL BEFORE THE RUN — not after the test is
green. Never subtract anything yourself, never waive your own cap, never
trim tests to hit a number. Report SOURCE lines vs TEST lines separately;
source is the number the cap actually protects.

## PII

Lead numbers only (MRC-2026-XXXX). NEVER customer names in source,
comments, tests, fixtures or commit messages. Grep the diff before
committing. This applies to the tracker and the session logs too — a
customer name quoted from Slack is still a customer name.

## Ending a unit

Report: exact changed paths, measured SOURCE/TEST split, baseline figures,
failing-then-passing evidence, and anything you scoped OUT and why. An
unrecorded "not now" is indistinguishable from "not noticed" and reads to
the next session as "already handled".

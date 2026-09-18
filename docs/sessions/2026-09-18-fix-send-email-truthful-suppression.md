# Session log — 2026-09-18 — fix/send-email-truthful-suppression

## Header

- Date: 2026-09-18
- Lane: L-E2a — send-email truthful suppression (E-F1, E-Q1, E-Q2(b), E-Q3 trigger half)
- Branch: fix/send-email-truthful-suppression
- Worktree: /Users/michaelyoussef/mrc-e2
- Tool: CC
- Model: claude-opus-5[1m], effort xhigh
- Baseline commit: 599a52c1 (`docs: archive nine session logs that existed only as untracked files`)
- Starting tsc error lines: 100 measured / 41 unique normalised (gate = no NEW normalised lines)
- Starting test count: 84 files / 1348 tests, 1 failed (T24 only)
- Session id: 3842deff-f075-4855-9a50-bb2a366dcfba
- Session cwd caveat: Claude Code was launched in `~/mrc-integration` (branch `integration/2026-09-15`),
  so its SessionStart/Stop hooks maintain `~/mrc-integration/docs/sessions/2026-09-18-integration-2026-09-15.md`,
  not this file. All work in this worktree is driven with absolute paths and `git -C`.
  Michael's call, 2026-09-18. The resume block at the foot of this log is therefore filled by hand.

## Intent

L-E2a: the three ruled `send-email` changes (E-F1 log code+message only, never DETAIL; E-Q1
error_logs write on the audit-insert failure while the 429 stands; E-Q2(b) the hourly cap writes no
email_logs row and reports once per window) plus ONE new migration so the fan-out trigger renders a
`suppressed` row truthfully (E-Q3, trigger half only).

## Touching

- `supabase/functions/send-email/index.ts`
- `src/lib/__tests__/sendEmail.suppression.test.ts`
- `supabase/migrations/20260918000000_email_logs_notify_slack_suppressed.sql` (new)
- `docs/sessions/2026-09-18-fix-send-email-truthful-suppression.md` (this file)
- `docs/codex-review-log.md` (ledger rows, after Michael's triage — outside both reviewed ranges)

## Unit split — Michael, 2026-09-18

The migration must restate all 88 lines of `email_logs_notify_slack()` verbatim (`CREATE OR REPLACE`
cannot patch a body), so a single unit measures ~165–190 SOURCE against the 150 cap. Ruling: split
into two reviewed units on this one branch, no waiver.

- **Unit A** — `supabase/functions/send-email/index.ts` + `src/lib/__tests__/sendEmail.suppression.test.ts`.
  Codex base `599a52c`, declared before the run.
- **Unit B** — `supabase/migrations/20260918000000_email_logs_notify_slack_suppressed.sql`.
  Codex base = unit A's commit SHA, declared before the run.

SUPERSEDED the same day, see "One run, not two" under Review: once Michael ruled that comments do not count, both commits together came to 125 non-comment source and one review against `599a52c` was both legal and what the brief asked for. The two commits stay separate in history. The ~165-190 estimate above was also wrong — the migration measured 214 mechanical, which is what prompted the ruling. `599a52c` is 5 docs commits ahead of `origin/main` (`dedd0a3`),
so `--base origin/main` would drag those into the range — never use it for these two runs.

### Diff limit — measured both ways, Michael's ruling 2026-09-18

**No waiver.** Michael's ruling: the 150 cap is SOURCE (D-Q2, ratified 15 Sep); comment headers and
the verification block do not count, and the function body is an irreducible verbatim restatement —
`CREATE OR REPLACE` cannot patch a body. Both figures are recorded here so the record is unambiguous,
because the mechanical command in `AGENTS.md` (Diff limit) splits test from source by path only and
does not itself exclude comments:

| Unit | Mechanical (AGENTS.md command) | Non-comment, per the ruling |
|---|---|---|
| A — EF + tests | source **58** / test **70** | source **46** / test **62** |
| B — migration | source **214** / test 0 | source **79** |

Unit B's 214 breaks down as 104 function body (88 copied byte-for-byte from
`20260823090000:212-299`, 16 added), 69 comment header, 41 comment verification block. Under the
ruling both units are inside the cap and neither needed splitting further.

Also ruled 2026-09-18: **E-Q2(b) in full** — the hourly cap drops the `email_logs` row AND writes one
`error_logs` row per window, as recorded at `docs/sessions/2026-09-15-integration-2026-09-15.md:572`
and `docs/TODO.md:37`, not the row removal alone.

## Step log

Append a line BEFORE each unit of work. Sub-agents prefix every line with `[<agent-name>]`.
Format: `- HH:MM · tool · agent · what · files · outcome` — tool is `CC` or `codex`, so both agents' work reads in one log.

- 14:5x · CC · CC · filled header, Touching and the unit split before any edit · this file · plan approved, setup running
- 14:0x · CC · CC · worktree setup: `npm ci` (never `npm install`), Node pinned by absolute path · (none) · exit 0, lockfile unchanged
- 14:0x · CC · CC · Node-24 baseline before any edit · (none) · 84 files / 1348 tests, T24 only; tsc 100 / 41 unique
- 14:07 · CC · CC · UNIT A test-first: three reds written before touching the source · `src/lib/__tests__/sendEmail.suppression.test.ts` · **7 failed / 5 passed (12)** — see Evidence
- 14:08 · CC · CC · UNIT A implement E-F1, E-Q1, E-Q2(b) · `supabase/functions/send-email/index.ts` · 12 passed (12)
- 14:09 · CC · CC · UNIT A four mutation checks, each restored · `supabase/functions/send-email/index.ts` · each mutation killed only its own tests; source restored byte-identical (`cmp` clean)
- 14:1x · CC · CC · UNIT A full validation · whole suite + app tsc · 84 files / 1351 tests, T24 only; tsc 0 new / 0 gone
- 14:1x · CC · CC · UNIT A committed `3c44225` · three Touching paths · PII scan clean — the diff adds no literal address, the test interpolates `body.to`
- 14:2x · CC · CC · UNIT B: assemble the migration from `20260823090000:212-299` so the preserved regions are byte-identical by construction, then diff to prove it · `supabase/migrations/20260918000000_email_logs_notify_slack_suppressed.sql` · fidelity diff shows ONLY the two ADDED 2026-09-18 regions
- 14:2x · CC · CC · UNIT B cap measured at 214 mechanical, raised with Michael before committing · (none) · ruling: no waiver, comments do not count, 79 non-comment — proceed

## Codex threads

Write `codex resume <threadId>` here the moment it is printed — on stderr as `Thread ready (<id>)`, or by `node <companion> status`. The plugin SessionEnd hook deletes every job of the session, running or finished.

- `codex resume 01a0b2d0-0338-7001-8841-7b28c99da302` — adversarial review, declared base `599a52c`,
  covering both commits `3c44225` and `090c73b`. Written the moment `Thread ready` printed on stderr.
  Turn id `01a0b2d0-03c2-7cb2-9fde-d367904b7df1`.

## Review

**One run, not two.** Michael's cap ruling removed the reason for splitting the review: both commits
together are 125 non-comment source, inside the cap, and the brief specifies one adversarial review
against `599a52c`. The commits stay separate in history. A second pass scoped to `--base 3c44225`
(the migration alone) is available on request and was offered.

- Declared base, stated before the run: **`599a52c`** — a same-branch commit, which D-Q1 permits.
  `origin/main` is `dedd0a3`, five docs commits behind, so `--base origin/main` would have dragged
  those into the range. Never used.
- Target, verbatim: **`Target: branch diff against 599a52c`** — matches the declared base, so the run
  stands. Printed and checked before any finding was read.
- Verdict, verbatim: **`Verdict: needs-attention`**
- Hold line, verbatim: `Hold: hourly reporting does not satisfy RULE 3 across isolate restarts or
  concurrent isolates. Static review only; tests were not executed.`
- Findings: **1** (one medium)
- Range measured: mechanical source **272** / test **70**; non-comment source **125** / test **62**.
  Changed files **4** including this log — 3 or more, so the companion self-collected rather than
  inlining the diff, which the stderr trace confirms.
- Focus string, verbatim, printed before any finding was read:

  > Three ruled fixes to the send-email Edge Function plus one new migration. RULE 1: a failed
  > email_logs suppression insert must log the Postgrest code and message only and never the whole
  > error object, because DETAIL carries the failing row including the recipient address and the
  > subject line. RULE 2: that same failure must be written to error_logs with lead id and template
  > and no recipient, while the HTTP 429 response stays byte-identical - log and continue, never
  > fail. RULE 3: the hourly send cap must write no email_logs row at all, because one row per
  > refused request fired a Slack post and an in-app fan-out to every admin and technician, and it
  > must instead report to error_logs once per window, while the five-minute recipient cooldown still
  > writes its suppressed row. Attack the once-per-window guard lastHourlyCapReportAt for off-by-one,
  > first-request and isolate-restart behaviour. Attack whether any touched path can still put a
  > whole error object or a recipient address into a log. Attack the tests for assertions that would
  > stay green if the production line they cover were deleted - the harness loads the real Edge
  > Function by stripping import lines and evaluating it in a node vm sandbox, so a missing sandbox
  > global would be silent. The migration adds a suppressed branch to email_logs_notify_slack so such
  > a row renders as SUPPRESSED instead of sent - check the IF ELSIF ELSE ordering, the three CASE
  > arms in the fan out call, whether email_suppressed survives the LEFT p_type 50 guard, and whether
  > the 2026-08-13 template filter makes the new branch unreachable. OUT OF SCOPE and pre-existing,
  > do not report: the unauthenticated relay auth, and the hard-coded project URL and anon key inside
  > the migration http_post which are preserved verbatim by instruction.

  The focus was single-quoted and survived intact — it contains no `;` and no apostrophe, so zsh
  could not truncate it into a partial review that still returns a clean verdict.
- codex-review-log row: **pending** Michael's triage (CLAUDE.md step 9).

### Finding, verbatim — nothing applied

> - [medium] Hourly report deduplication resets with every isolate (supabase/functions/send-email/index.ts:255-258)
>   lastHourlyCapReportAt is module-local and starts at zero, so each fresh isolate reports the same ongoing hourly cap again. The comment acknowledges this limitation, but reporting volume remains proportional to isolate creation instead of bounded once per window. Reproducing test: freeze time at a current timestamp, create two independent setup('hourly') VM contexts with hourlyCount=100, and send one request through each. Assert one aggregate reportError call; the current code produces two. The existing test sends twice through one context and misses this failure.
>   Recommendation: Use an atomic shared reporting marker that survives isolate replacement, without inserting email_logs rows. Add a regression covering two independent VM contexts within the same window.

### security-reviewer — 1 Medium, 2 Low, nothing Critical or High. Nothing applied.

Verdict as given: "the unit is a net reduction in exposure".

**MEDIUM — the E-Q1 `error_logs` write has no `dedupeKey`, so it is one row per request and an
unauthenticated caller can drive it.** `send-email/index.ts:212-221`. `shouldSuppress` in
`_shared/errorReporting.ts:242-243` returns `false` when the key is undefined, so every failing
suppression insert produces a `console.error` **and** a service-role `POST /rest/v1/error_logs` held
open up to 3 s by `EdgeRuntime.waitUntil`. This is the only call site in the repo that omits the key —
all nine in `calculate-travel-time` pass one. Base wrote one short-retention log line and no DB row;
this writes a durable row into a table with no retention policy and no in-app consumer. The 10/min IP
limiter does not bound it: `clientIp` is element [0] of the caller-supplied `x-forwarded-for`, so
rotating that header gives unlimited buckets (pre-existing, byte-identical to base, and what makes N
unbounded). Reproduction is end-to-end statable **in exactly the window this unit creates** — function
deployed before `20260912000000` lands, so each repeat send inside 5 minutes hits the cooldown, the
`suppressed` insert fails 23514, and each failure writes a row. Suggested fix, not applied:
`dedupeKey: \`send-email:suppression-insert-failed:${error?.code || 'unknown'}\``.

**LOW — the new `suppressed` arm raises an unauthenticated-driveable event to `high` for every admin
and technician.** `20260918000000...sql:161-162`. Stated honestly against base: the message and row
counts are identical to what the base body would have produced for the same rows — only type, title
and priority change — and on the hourly-cap branch this unit strictly *reduces* fan-out. No push,
email or SMS hangs off `high`; neither notification hook reads `priority`. Impact is alert fatigue and
a plausible-looking forged alarm. No change recommended.

**LOW / informational — a suppressed row's `error_message` now reaches Slack.** `...sql:117-120`. Safe
today: the only writer of `status='suppressed'` anywhere in the tree is `send-email/index.ts:198`, and
it hard-codes one of two fixed strings, so this change adds no customer data to the Slack payload. The
forward-looking capability — any authenticated user can post arbitrary text to Slack by crafting
`template_name` and `error_message`, since `email_logs` INSERT is `WITH CHECK (auth.uid() IS NOT
NULL)` — is **not new**: the `failed` arm already provided it at `high`. Marked UNVERIFIED as a defect
of this diff.

**Independently corroborated** (worth recording): the reviewer extracted both function bodies and
diffed them mechanically, confirming the only changes are the regions marked `ADDED 2026-09-18`, that
`SECURITY DEFINER` / `search_path` / owner do not move under `CREATE OR REPLACE`, that there is no
`EXECUTE` and no injection path (`_msg` reaches the wire through `jsonb_build_object`), and that
`email_suppressed` fits `notifications.type VARCHAR(50)` so it cannot raise into `WHEN OTHERS` and
drop the in-app half. It also walked the reachable SQLSTATEs and confirmed the classes that embed a
value in `message` rather than `details` (22P02, 22007/22008) are unreachable here, because the uuid
fields are zod-validated and `sent_at` is code-generated — i.e. the E-F1 fix is complete for its
purpose, not merely narrower.

**Pre-existing, outside this diff, Michael's call** — the same DETAIL leak is still live in two
sibling functions, both on frozen paths: `send-inspection-reminder/index.ts:257-266` (logs
`error.details` *and* the recipient address outright) and `receive-framer-lead/index.ts:924-928`
(`error.details`).

CC note for triage, not a disposition: the per-isolate bound is the shape Michael selected on
2026-09-18, whose option text read "per-isolate: N isolates ⇒ N rows/hour", and the code comment says
so. So the finding describes a known, chosen characteristic rather than an unnoticed defect — but
whether it is acceptable against the literal wording of E-Q2(b) ("once per window") is Michael's call,
not CC's. A durable marker would mean a table write, which is the thing E-Q2(b) removed.

### code-reviewer — 2 Medium, 3 Low, 1 informational. Nothing applied.

Everything below was verified by running, not reading: target file 12 passed, full suite 84 / 1351
with T24 the only failure, Node by absolute path. Mutations were applied to copies in the scratchpad,
never to the repo, and a control mutation was shown to fail 2 tests to prove the mechanism.

**MEDIUM 1 — a second cap episode inside the same clock hour is recorded nowhere at all.**
`index.ts:251-268`. `lastHourlyCapReportAt` throttles by wall-clock since the last *report*, not per
cap *episode*. The cap can clear as sends age past `oneHourAgo` and re-trip inside the hour; the
second episode reports nothing, and since `3c44225` there is no `email_logs` row either, so those
refused sends leave no durable trace in any table. Reproduced in one isolate on the real clock:

```
send #1 hourlyCount=100 -> 429, 1 report,  0 email_logs
send #2 hourlyCount=0   -> 200, normal send
send #3 hourlyCount=100 -> 429, 0 reports, 0 email_logs   <-- silent
```

Repro script `probe2.mjs` in this session's scratchpad. The operator who clicked still sees the reason
(`notifications.ts:341-343` rethrows the server message), so this is a lost record, not a lost signal.
Suggested smallest fix, **not applied**: reset the marker on the not-capped path, making it
once-per-episode rather than once-per-hour. **This is a fail-vs-continue question and therefore
Michael's**, not CC's: the F/C rule says continue only with the failure written to `error_logs` or the
timeline, and in this window it is written to neither.

**MEDIUM 2 — two of CC's own tests pass green with the behaviour broken.**
`sendEmail.suppression.test.ts:83-91`, `:103-119`. Verified through the real harness by pointing
`readFileSync` at a mutated copy:
- Replace the cap message with `` `Hourly send cap reached for ${to}` `` → **12 passed**. `:87-90`
  asserts only `severity` and `context.function`, and the PII scan at `:113-119` runs the `recipient`
  gate, where the cap report never fires. **A recipient address in the cap report would ship green.**
- Drop `: ${error?.message || 'unknown'}` from `index.ts:215` → **12 passed**. `:108` asserts
  `stringContaining(code)` only, so the "and message" half of E-F1 has no test.
- `:113-119` is trivially satisfiable in isolation: delete the whole report call and the scan passes
  over an empty array. It is load-bearing only when paired with `:103-111`, which does fail.
Two further harness notes: the scan is `JSON.stringify`-based, which serialises an `Error` to `{}`, so
a future param holding an Error whose message carried the address would evade it; and `rejects=true`
rejects with a `PostgrestError`-shaped plain object, a shape supabase-js never produces — it resolves
`{error}` for PostgREST errors and rejects with an `Error` that has no `.code`, so the realistic
reject renders `(unknown): Failed to fetch` and is untested.

**LOW 3 — CC's own verification step A4 gives a false STOP on a correctly-prepared project.**
`20260918000000...sql:208-214`. The query returns one row **per CHECK constraint** on
`public.email_logs`, and there are at least two — the inline status CHECK and
`email_logs_valid_email_check` (`20251111000017_add_missing_constraints.sql:288-299`). So a project
where `20260912000000` *has* been applied returns `t` and `f` in unspecified order, and the file's own
instruction halts a correct apply. Deterministic from `pg_constraint` semantics; not reproducible
here, no DB access. Suggested fix, **not applied**: `bool_or(...)`, or add
`AND conname = 'email_logs_status_check'`.

**LOW 4 — the cap report's `lead_id` / `template_name` name one arbitrary victim of a window-level
event.** `index.ts:258-267`. They come from whichever request tripped the report first; every later
refused lead in the window is absent from `email_logs`, `error_logs` and Slack. Either drop `lead_id`
from this report or rename the keys (`first_refused_lead_id`) so nobody reads the row as "this lead
was refused".

**LOW 5 — no `dedupeKey` on the suppression-failure report.** `index.ts:212-221`. Same finding as the
security reviewer's Medium, at lower severity.

**INFORMATIONAL 6 — isolate churn quantified.** Three fresh contexts in one window → 3 reports. Worst
case is not "a handful": with sparse traffic past the cap, each cold start resets the marker to 0 and
the guard degenerates to one report per request. Bears directly on the Codex finding above, and CC's
code comment saying "a handful of isolates" is optimistic.

**Checked and clean** — SQL preservation mechanically re-diffed (only the two ADDED regions); the
`_msg` IF/ELSIF/ELSE ordering exhaustive for reachable rows, since the trigger is AFTER INSERT and
only `sent`/`failed`/`suppressed` are ever inserted; `'email_suppressed'` fits every width guard and
`mapNotificationType` defaults unknown types to `system`; the 2026-08-13 filter does **not** make the
new branch unreachable, because neither system template ever reaches send-email — the gap is latent
only; the new `../_shared/errorReporting.ts` import matches the shape already shipping in
`calculate-travel-time/index.ts:5`. One operational note worth acting on at deploy time: **nothing
automated covers that import path** — `tsconfig.app.json` includes `src` only and the vm harness
strips every `^import` line and injects the global, so a bad path would surface only at deploy.
`deno check supabase/functions/send-email/index.ts` before Michael's deploy closes that hole.

**Out of scope, both reviewers independently** — `send-inspection-reminder/index.ts:257-266` and
`receive-framer-lead/index.ts:924-928` still log `error.details`, and the reminder one logs the
recipient address outright. The exact leak E-F1 just closed, still live, on frozen paths.

## Baseline

- Node: invoked by absolute path `~/.nvm/versions/node/v24.20.0/bin/node`; `--version` printed
  **v24.20.0** verbatim. `nvm use` was never relied on — it does not stick in this harness, and T24
  fails only on Node 24, so a baseline taken on 22/23 would show one fewer failure and void every
  later comparison.
- `npm ci` (never `npm install`): exit 0, `package-lock.json` unchanged afterwards
  (`git status --porcelain` showed only this untracked log). Install-script warnings only.
- **No `.env` file is created in this worktree.** `~/mrc-app-1/.env` carries PROD credentials and the
  suppression harness needs only dummy values, so every run — baseline and final — uses the identical
  inline `VITE_SUPABASE_URL=https://localhost.invalid VITE_SUPABASE_ANON_KEY=dummy`. Differing env
  between runs silently drops ~5 files / ~75 tests and voids the comparison.
- Vitest: `Test Files 1 failed | 83 passed (84)`, `Tests 1 failed | 1347 passed (1348)`. The single
  failure is T24 — `src/lib/api/reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from
  the signed URL when it resolves`. Matches the integration session's Step-2 figures at `587415e`
  exactly (84 / 1348, T24 only); the five docs commits to `599a52c` move no code.
- tsc `-p tsconfig.app.json --noEmit`: exit 2, **100 error lines / 41 unique after stripping
  `(line,col)`**. Gate is the normalised set diff, never the count.
- Evidence: `base-tsc.log`, `base-tsc.norm`, `base-vitest.log` in this session's scratchpad.
- Note: `supabase/functions/**` is in no tsconfig (`tsconfig.app.json` includes `src` only), so the
  Edge Function is never type-checked by the build. The Vitest harness is its only automated check.

## Evidence — Unit A red-first, green, mutation checks

**Red before the fix** (`red-1.log`) — 7 failed / 5 passed (12), against the untouched `599a52c`
source. The three ruled changes, each red for its own reason:

| Ruling | Red test | Why it failed on base |
|---|---|---|
| E-F1 | `keeps the recipient address out of every log sink` ×2 | `:193` logged the whole `PostgrestError`, DETAIL included |
| E-Q1 | `records a failed suppression audit in error_logs` ×2 | nothing was ever written to `error_logs` |
| E-Q2(b) | `writes no email_logs row when the hourly cap is reached`; `keeps the hourly limit when the recipient limit is bypassed` | the cap wrote a `suppressed` row per request |
| E-Q2(b) | `reports the hourly cap once per window …` | nothing reported the cap at all |

The 5 green were the controls, all unchanged behaviour: the recipient suppression row is still
written in full, the 429 and its reason survive an audit-insert failure (resolved `{error}` and
rejected promise both), and normal sends still reach Resend and log `sent`.

**Green after the fix** (`green-1.log`): 12 passed (12).

**Mutation checks** (`mut-1..4.log`), each applied through the shell so no formatter ran, each
restored from a pre-mutation copy and `cmp`-verified identical afterwards:

| # | Mutation | Result |
|---|---|---|
| 1 | log the whole error again (`JSON.stringify(error)` back into the message) | 2 failed — only the two E-F1 tests |
| 2 | build the report object but never send it | 2 failed — only the two E-Q1 tests |
| 3 | hourly cap calls `suppressionResponse` again | 2 failed — only the two E-Q2(b) row tests |
| 4 | report every refusal instead of once per window | 1 failed — only the once-per-window test |

No mutation killed a test outside its own ruling, so each red is pinned to the change it is meant to
prove rather than to the file as a whole.

**Full validation** (`final-a-tsc.log`, `final-a-vitest.log`): Vitest `Test Files 1 failed | 83
passed (84)`, `Tests 1 failed | 1350 passed (1351)` — baseline was 84 / 1348, so +3 tests, no files
and no tests dropped, and the single failure is still T24. tsc 100 error lines, **0 new / 0 gone**
against the normalised baseline set.

## Did

- **E-F1** — the failed-suppression path no longer logs the whole `PostgrestError`. Code and message
  only. A constraint violation names the constraint in its message and keeps the row values in
  DETAIL, which is why that split is the safe one; the comment in the code says so.
- **E-Q1** — that failure now reaches `error_logs` through `supabase/functions/_shared/errorReporting.ts`
  (`reportEdgeErrorInBackground`), carrying `lead_id` and `template_name` and no recipient. The 429
  and its body are untouched, so no caller sees a difference. `user_id` is deliberately NOT passed:
  `error_logs.user_id` has an FK to `auth.users` and send-email's `userId` is an unverified body
  field, so a forged uuid would 23503 the row away silently. Attribution lives in `context`.
- **E-Q2(b), both halves** — the hourly cap writes no `email_logs` row at all, and reports once per
  window to `error_logs` instead. The recipient cooldown still writes its `suppressed` row.
- `HOURLY_SEND_CAP` and `HOURLY_WINDOW_MS` replace the bare `100` and the duplicate `60 * 60 * 1000`,
  so the cap and the hour each have one spelling. Both reason strings stay byte-identical.
- **One new migration** `20260918000000_email_logs_notify_slack_suppressed.sql`, assembled from
  `20260823090000:212-299` so the Vault lookup, the 13 Aug filter, the `_label` CASE, `net.http_post`
  and the EXCEPTION handler are byte-identical **by construction**, not by retyping — the fidelity
  diff of the two function blocks shows only the two `ADDED 2026-09-18` regions.
- Twelve handler tests, three reds shown before the fix and four mutation checks after, each mutation
  killing only its own ruling's tests.

## Did NOT

- Touch the cooldown key, window or bypass semantics; the relay's auth (P0-5); the idempotency key;
  `src/hooks/useActivityTimeline.ts`; any other Edge Function; any existing migration.
- Apply the migration, deploy the function, query DEV or PROD, push, or open a PR.
- Fix any review finding. Every finding goes to Michael with a disposition; nothing was applied.

## Broke

- nothing known

## Open

- **L-E2 does not fully close.** Its fourth item — `useActivityTimeline.ts:180` titling a `suppressed`
  row "sent" — is outside this brief's file list. P0-14 also stays open until a suppressed
  confirmation reaches the sender as a failed status (X-Q1).
- **Apply order is a hard prerequisite**: `20260912000000` (still NOT APPLIED) must land on a project
  before this migration, or the new branch is unreachable and the EF's suppression insert fails 23514.
  Then the migration, then the function deploy — per project, DEV fully before PROD.
- **Pre-apply read required** (in the migration header): confirm the live `email_logs_notify_slack`
  body matches `20260823090000` via `pg_get_functiondef` before replacing it. This is CREATE OR
  REPLACE over a function that reached PROD by hand, and an unrecorded live edit would be discarded.
- **`:241-253` — a new fail-vs-continue question, for Michael.** The post-send `email_logs` insert
  ignores its `{ error }` entirely. If it fails, the caller is still told the send succeeded and
  nothing is logged anywhere. Outside the three ruled changes, so untouched.
- **DETAIL-shaped data still reaching logs, outside E-F1's line, for Michael.** `:99` and `:104` log
  Resend's whole response body, `:256` logs `result.error`, `:268` logs the caught error. A Resend
  4xx can echo the `to` address. Untouched.
- **The 13 Aug filter, preserved as instructed, still silences a `suppressed`
  `framer_lead_confirmation` or `inspection_reminder`** — status ≠ `failed` means early return.
  Neither template reaches send-email today, so no live effect, but the gap survives the change.
- **The trigger's `net.http_post` target is PROD's, hard-coded, preserved verbatim**, so applying to
  DEV gives DEV's trigger a PROD target. Pre-existing SF-5 state, not introduced here.
- **Branch-name drift**: `docs/TODO.md:37` names `fix/send-email-suppression-2`; the worktree is on
  `fix/send-email-truthful-suppression`.
- Ledger rows in `docs/codex-review-log.md` are pending Michael's triage (CLAUDE.md step 9).

## Resume from here

<!-- resume:start -->
<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit between the markers; never quote the marker lines elsewhere in this log -->

- No Stop hook maintains this file (the session is rooted in `~/mrc-integration`), so this block is filled by hand.
- Next command: none. Michael triages the findings, then the ledger rows and the PR.
- Uncommitted files: none after this commit.
- Untested: the migration against a live database — static only, by instruction. Also the new relative import, which no tsconfig and no test covers: run `deno check` on the function before deploying.
<!-- resume:end -->

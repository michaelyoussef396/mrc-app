<!-- {{TOKEN}} fields are filled by .claude/hooks/session-start.sh on startup/clear.
     <fill: ...> fields are filled by hand as the first step of the session.
     Builder-Codex: never create a second log for a branch. Append to the newest
     docs/sessions/*-<branch-slug>.md; only if none exists copy this file by hand,
     replace every {{TOKEN}}, and set Tool to Codex. -->
# Session log — 2026-09-07 — chore/workflow-scaffolding

## Header

- Date: 2026-09-07
- Lane: PDF
- Branch: chore/workflow-scaffolding
- Worktree: /Users/michaelyoussef/mrc-app-1
- Tool: CC
- Model: claude-opus-5[1m] (xhigh / ultracode) — hard debugging, approach is the work
- Baseline commit: 68c8f73
- Starting tsc error lines: 122 measured in this tree at 68c8f73 on 2026-09-07 (`npx tsc -p tsconfig.app.json --noEmit`, grep -c "error TS") — matches brief baseline. Gate = no NEW error lines vs 122.
- Starting test count: inherited 71 files / 1222 at dc55c15; to be measured before Unit B
- Session id: 48071248-3a7f-4bb9-b5ee-5513b451c82d

## Intent

P0: admin cannot hard-save a job report (render endpoint 504) for jobs with NO inspection record — JOB-2026-0012 and a second Jane Wilson job. STEP 1 = diagnosis only, no code changes.

## Touching

STEP 1 (diagnosis): no application files edited.
UNIT A (approved 2026-09-07): `src/pages/ViewReportPDF.tsx` (only application file), `docs/TODO.md` (P1-S-4 backlog row), this log.
UNIT A2 (approved 2026-09-07, fixes the Codex finding): `src/pages/ViewReportPDF.tsx`, new `src/pages/__tests__/ViewReportPDF.jobReportView.test.tsx`, `docs/BUG_LEDGER.md` (C11 + BUG-23), this log.
UNIT B: NOT STARTED — Michael is pulling Vercel logs + DevTools timing first.

## Step log

Append a line BEFORE each unit of work. Sub-agents prefix every line with `[<agent-name>]`.
Format: `- HH:MM · tool · agent · what · files · outcome` — tool is `CC` or `codex`, so both agents' work reads in one log.

- 21:20 · CC · CC · filled header · docs/sessions/2026-09-07-chore-workflow-scaffolding-2.md · done
- 21:22 · CC · CC · STEP 1 diagnosis fan-out (read-only), 9 lenses + 4 adversarial skeptics · (read-only) · 5/9 returned; 4 killed by a network drop (ENOTFOUND)
- 21:37 · CC · CC · recovered the 4 lost lenses in a 2nd workflow: archaeology, Sentry, view-button, platform · (read-only) · all 4 returned
- 21:52 · CC · CC · CC re-verified every load-bearing claim independently (grep/git/sed) · (read-only) · all confirmed
- 21:58 · CC · CC · STEP 1 diagnosis written · .ai/CURRENT_TASK.md · COMPLETE — stopped for Michael's approval, no code changed
- 22:12 · CC · CC · Michael approved Unit A only. Confirmed Bug A does NOT gate Unit A: two distinct `loading` states — JobReportPreview's local one (:233, gates :293) vs ViewReportPDF's (:335), the latter read ONLY at :484/:490 and never in render · (read-only check) · answered, Bug A left batched
- 22:14 · CC · CC · logged the Sentry instrumentation gap as backlog P1-S-4 per Michael's instruction (not fixed this session) · docs/TODO.md · done
- 22:16 · CC · CC · gitnexus impact on JobReportPreview: LOW risk, 1 direct caller (ViewReportPDF, same file) · (analysis) · safe
- 22:18 · CC · CC · UNIT A build — View button opening report HTML in a new tab via a typed Blob (NOT window.open on the public URL, which serves text/plain+nosniff) · src/pages/ViewReportPDF.tsx · built
- 22:34 · CC · CC · self-caught bug before commit: `window.open(url,'_blank','noopener')` returns null by spec, so the blocked-popup branch would fire on every success and revoke the URL, killing the tab. Dropped the feature string, sever `opened.opener` instead · src/pages/ViewReportPDF.tsx · fixed
- 22:36 · CC · CC · gates · (none) · tsc 122 vs 122 baseline, 0 NEW error lines after normalising line-number shift (+12/+50); vitest 71 files / 1222 tests PASS; 96 reviewable lines (limit 150)
- 22:52 · CC · CC · UNIT A2 — Michael confirmed the Codex finding, fix it now. Tagged loaded HTML with job id + source URL, gate View on identity not presence, clear readiness on load-start and on unmount · src/pages/ViewReportPDF.tsx · built
- 23:05 · CC · CC · A2 regression test, 8 tests · src/pages/__tests__/ViewReportPDF.jobReportView.test.tsx · PROVEN: reverted only the two behavioural clears (kept export + payload so the failure is behavioural, not a compile error) -> 2 failed / 6 passed; restored (cmp byte-identical) -> 8/8 pass
- 23:10 · CC · CC · A2 gates · (none) · tsc 122 vs 122, 0 NEW normalised; vitest 72 files / 1230 tests (was 71/1222, delta = exactly the new file)
- 23:14 · CC · CC · BUG_LEDGER: new class C11 (an attribute set at write time overridden at read time) + BUG-23 (Storage serves public-bucket HTML as text/plain despite contentType: 'text/html') · docs/BUG_LEDGER.md · done
- 23:18 · CC · CC · OKF proposal drafted per Michael's request: normalise line numbers before diffing tsc output; count-only hides regressions, raw-line diffing blocks clean changes · .ai/FINAL_REVIEW.md · done
- 23:40 · CC · CC · Michael pushed d6277ab..fb6107f; Vercel deploy success. Resolved the preview URL off the inspector (branch alias truncated to ...chore-workflo-3bfe99...) · (none) · done
- 23:44 · CC · CC · ARTIFACT verification (not deploy-status): fetched /assets/ViewReportPDF-CpiVNHIv.js from the preview — Unit A aria-label/tooltip/text-html/popup-msg present, A2 'Report is still loading' present, Unit-A-only identifier `jobReportHtml` ABSENT (renamed loadedJobReport by A2). Preview is running A+A2, not a stale bundle · (none) · PASS
- 23:48 · CC · CC · 375px UI check NOT DONE — both preview URLs sit behind Vercel SSO and the app shows its login page on this origin; an agent cannot create an authenticated session (entering credentials is out of scope). playwright-tester deliberately NOT spawned: it would hit the same two walls and return 'blocked' · (none) · escalated, steps in .ai/HANDOFF.md
- 23:52 · CC · CC · handoff written · .ai/HANDOFF.md · session closed
- 23:58 · CC · CC · housekeeping 1/2: WITHDREW PDF-CL12 — verified independently that the table's CREATE TABLE was made in Studio and is absent from migrations (20260531150202_...sql:18-19), so the 'no UNIQUE constraint' claim was inferred from repo absence, the method CLAUDE.md's pre-flight rule forbids. Michael's live 23505 on (job_completion_id, version_number) proves the constraint exists and the retry is live code · docs/TODO.md · done
- 00:06 · CC · CC · housekeeping 3/3: BUG_LEDGER C4 gains a third instance — the READ-side form. PDF-CL12 concluded 'no UNIQUE constraint' from a repo grep, but that table's CREATE TABLE was made in Studio and is not in migrations at all, so the grep could never have seen it. Broadened C4's Check accordingly · docs/BUG_LEDGER.md · done
- 00:08 · CC · CC · recorded TRUE merge arithmetic: cumulative is 615 not 383 (383 predates 53e7bc6); only ONE waiver was ever granted, not three; and the tsc gate FAILS 124 vs 122 · .ai/FINAL_REVIEW.md · done
- 23:59 · CC · CC · housekeeping 2/2: carried the 375px gap forward as P2-20 with the exact checks and the service-worker-reset caveat; Michael verifies manually after merge · docs/TODO.md · done
- 22:38 · CC · CC · 375px browser verification BLOCKED — Bash permission denied on .env*, so which Supabase ref `npm run dev` targets could not be established; standing order says local may be PROD. NOT run rather than run against an unknown backend · (none) · escalated to Michael

## Codex threads

Write `codex resume <threadId>` here the moment it is printed — on stderr as `Thread ready (<id>)`, or by `node <companion> status`. The plugin SessionEnd hook deletes every job of the session, running or finished.

- codex resume 01a07bc8-2e40-7cc2-9536-78fbae6b37aa   (Unit A adversarial review, 2026-09-07, base origin/main)
- codex resume 01a07bd5-9eed-7f93-ab88-26433a9a4a73   (Unit A2 adversarial review, 2026-09-07, base 0e23baa = pre-declared stacked parent)
- codex resume 01a07c02-ec90-7aa1-a13d-9b9d448621de   (exception-isolation review of 53e7bc6 + e495abd, 2026-09-07, base 1046c60 = pre-declared stacked parent)

## Review

- Unit A  — Target: `Target: branch diff against origin/main`  (verbatim; checked before the body was read)
- Unit A2 — Target: `Target: branch diff against 0e23baa`  (verbatim; pre-declared stacked parent, CODEX_WORKFLOW §4.3)
- Exception isolation — Target: `Target: branch diff against 1046c60`  (verbatim; pre-declared stacked parent). 287 lines, OVER the cap and NOT waived.
- Diff lines excl. docs/sessions/: Unit A 87. Unit A2 **232 — over the 150 cap, waiver granted by Michael before the run** (87 production code / 130 new test file / 15 ledger prose).
- Verdict: Unit A needs-attention (1 medium, fixed by A2). Unit A2 **approve**. Exception isolation **needs-attention**, 2 medium, nothing applied.
- Findings: A 1 (medium) — confirmed by Michael, fixed as Unit A2. A2 0 findings; two non-finding next steps carried in `.ai/CODEX_REVIEW.md`, neither acted on.
- codex-review-log rows: 3 added 2026-09-07, chore/workflow-scaffolding (Unit A, Unit A2, exception isolation)

## Did

- Diagnosed the P0 read-only. **Primary hypothesis REFUTED**: neither `api/render-job-report-pdf.ts` nor the EF ever queries `inspections`.
- Established TWO independent bugs (confirmed in code AND in one Sentry trace, 107s apart), not one.
- Found the prior fix: `70f4313` (2026-08-27), present at HEAD and on origin/production. It fixed a DIFFERENT failure (4.5MB response cap = ledger BUG-7). No commit in repo history mentions 504.
- Refuted the "fix stranded on main" rival: production and main are byte-identical across the whole render chain.
- Found a live regression candidate: `70f4313` added `maxDuration:60` + `memory:1024` where the function previously had NO vercel.json entry.
- Sentry: 4x 504 + 4x 500 "PDF render failed"; FIRST SEEN 2026-09-03, not mid-Aug. Zero Sentry *issues* — the `!response.ok` branch never calls captureBusinessError.
- The 500s prove the EF completed and Chromium is what failed, so the base64-photo theory is not the sole mechanism.
- Answered the view-button question: real defect, but it is Storage serving HTML as `text/plain` + nosniff, not a Blob bug.
- Measured tsc baseline in this tree: 122.

## Did NOT

- Write or change ANY application code. STEP 1 is diagnosis-only and stops for approval.
- Call any `mcp__supabase__*` tool (standing order). DB facts are carried as UNKNOWN with the SQL needed.
- Touch the PROD ref. The view-button Content-Type probe was run against DEV only.
- Run the Codex review — no code changed, so there is nothing to review yet.

## Broke

- nothing known. Unit A is additive: one new optional prop on JobReportPreview (default undefined), one new state field, one new handler, two new buttons both gated on `reportType === 'job'`. No existing branch changed.

## Open

- **375px UI check is the one unfinished Done-when item** — blocked on an authenticated admin session on the preview origin, not on the code. Exact steps in `.ai/HANDOFF.md` > Resume.
- **Blocking Unit B**: the Vercel runtime log for /api/render-job-report-pdf (2026-09-07T10:05:02Z, 2026-09-03T09:31-09:34Z) carries the actual puppeteer error at :353. Time-vs-memory cannot be settled without it.
- **One click**: DevTools Network on a Download -> wall-clock duration + `x-vercel-error`. All 4 skeptics named this as the gate.
- Vercel default duration/memory for mrc-system, to fix the direction of the 70f4313 change.
- Photo counts for the two blocked jobs (Studio SQL, in .ai/CURRENT_TASK.md section 7).
- Bug A (the unguarded loadInspection effect) should be its own unit, not folded into Unit B.

## Resume from here

<!-- resume:start -->
<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit between the markers -->

- Updated: 2026-09-07 23:02 AEST · Tool: CC
- Branch: chore/workflow-scaffolding @ 1046c60 docs: withdraw PDF-CL12, track the 375px gap as P2-20
- Unpushed commits:
  - `1046c60 docs: withdraw PDF-CL12, track the 375px gap as P2-20`
  - `30e1e62 docs: close the session log`
  - `84015f3 obs(job-report): phase breadcrumbs across the render endpoint`
- Uncommitted files (this log excluded):
  - ` M .claude/settings.local.json`
  - ` M api/render-job-report-pdf.ts`
  - ` M docs/codex-review-log.md`
  - ` M docs/sessions/2026-09-07-chore-workflow-scaffolding-3.md`
  - `?? docs/sessions/2026-09-07-chore-workflow-scaffolding.md`
  - `?? muti-session-docs/`
  - `?? src/lib/__tests__/renderJobReportPdf.instrumentation.test.ts`
  - `?? template-backup-66282.html`
  - `?? template-backup-66325.html`
- Last step-log line: 22:38 · CC · CC · 375px browser verification BLOCKED — Bash permission denied on .env*, so which Supabase ref `npm run dev` targets could not be established; standing order says local may be PROD. NOT run rather than run against an unknown backend · (none) · escalated to Michael
- Codex threads:
  - `codex resume 01a07bc8-2e40-7cc2-9536-78fbae6b37aa`
  - `codex resume 01a07bd5-9eed-7f93-ab88-26433a9a4a73`
- Window: five_hour 2% used, resets 03:30 AEST (17:30 UTC)
- Next step: the first open item under "Did NOT" or "Open", else continue from the last step-log line.
<!-- resume:end -->

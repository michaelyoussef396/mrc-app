# MRC TODO — working tracker

Last updated: 2026-09-05

- Detail for every item: `docs/MRC_MASTER_BACKLOG.md` (the 3 September 2026 backlog, archived verbatim). This file holds IDs and tracking state only.
- Pricing rules and the resolved/unresolved conflicts: `docs/PRICING_CANON.md`.
- Bug classes, entry template and the ledger rule: `docs/BUG_LEDGER.md`.

## How to use this file

- Sessions reference items by ID, never by description. IDs are stable and never reused.
- The priority structure is the backlog's, unchanged: P0 / P1 Pricing / P1 Workflow / P2 Equipment / P2 Report / P2 CRM / P3 / Marketing / Infrastructure / Blocked / Shipped.
- Every actionable row has four tracking cells, all blank until earned:
  - **Done** — tick only when merged to `main` with `--no-ff`, preview-tested at 375px on a pinned commit URL after a full service-worker reset.
  - **Branch / Session** — the worktree branch and session letter that owns the item.
  - **Verified** — date and method (preview URL, Studio query, `cmp`, screenshot). A chat claim is not verification.
  - **Ledger entry** — the `BUG-n` written in the same commit as the fix, or `n/a` for a feature with no bug behind it.
- Rows marked "folded" or "locked" carry no checkbox. They are kept so the ID keeps resolving.
- Do not re-log anything in the SHIPPED section.

## Session plan — approved 2026-09-05

One session per worktree, each opened with the Session Handoff Prompt plus its own brief. No two sessions own the same file; the two provisos are J's carve-out of `send-email` for L, and Q's pre-flight.

| Order | Session | Purpose | Worktree | Branch | Owns | Must not touch | Parallel with |
|---|---|---|---|---|---|---|---|
| 1 | O | P1-22 offline: investigation only, written report. Runs first because its findings can move every other priority | `~/mrc-offline` | `docs/offline-investigation` | one new `docs/` report | all code | everything |
| 1 | N | Node 22 bump, deadline 1 Oct | `~/mrc-node22` | `chore/node-22` | `package.json` engines, `.nvmrc` | everything else; the Vercel project setting is Michael's | everything |
| 2 | G | One lead view: map every render condition, find why two paths exist. Absorbs P1-14 | `~/mrc-lead-view` | `fix/one-lead-view` | `src/pages/LeadDetail.tsx`, `InspectionDataDisplay.tsx` | `Leads.tsx`, `lib/api/leads.ts`, pricing, auth, EFs | H, F, N, J, O |
| 2 | H | Lead list: real pagination, true count, P1-15. Merge gated on Vryan (P0-2) | `~/mrc-lead-list` | `fix/lead-list-pagination` | `Leads.tsx`, `lib/api/leads.ts` | `LeadDetail.tsx`, EFs, migrations | G, F, N, J, O |
| 2 | F | Worktree cleanup, guard hook flip, P0-7 MCP pin, T8, T12 | `~/mrc-app-1` main checkout | `chore/guard-hook-flip` | `.claude/hooks/`, `.claude/settings.json`, `scripts/`, `~/.claude.json` | any `src/`, EFs | G, H, N |
| 3 | G2 | Collapse to one lead view | same as G, after G's plan is approved | same as G | same as G | same as G | H, F |
| 3 | J | Health-check P0-A to P0-E: 200-on-failure audit, then fixes | `~/mrc-health` | `fix/ef-fail-loud` | `supabase/functions/**` except `send-email`, `calculate-travel-time`, `send-inspection-reminder`; the attribution manifest | the three excluded EFs, all `src/` | G, H, N, O, L |
| 3 | L | P0-5 send-email relay | `~/mrc-send-email` | `fix/send-email-auth` | `supabase/functions/send-email/**` | every other EF, `src/` | G, H, N, J |
| 4 | Q | P0-8 archive cancels bookings, plus guarded PROD repair | `~/mrc-archive` | `fix/archive-cancels-bookings` | archive handler, located in pre-flight; repair SQL as a Studio pack | unknown until located | not with G or H until the handler's file is known; waits for G2 and H if it lives in their files |
| 5 | I | Pricing rebuild plan only. Last; depends on Clayton's demolition table (B1) | `~/mrc-pricing-plan` | `docs/pricing-rebuild-plan` | one new `docs/` plan | `pricing.ts` (read only), all code | runs alone |
| separate repo | K | OKF setup for `~/okf/projects/mrc/`, after this branch is pushed | the okf repo | n/a | `~/okf/projects/mrc/**` | `~/okf/concepts/`, `~/okf/_pending/` | everything |
| Michael | — | P0-1 Studio apply, off-peak; P0-6 remove the PROD key from DEV Vault | none | none | dashboard / Studio | | |

## ⏰ Hard deadline — 1 October

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| N | Node 22 bump. Vercel drops Node 20 on 1 Oct; builds fail after. `engines` and `.nvmrc` in the repo; the Vercel project setting is Michael's. Runs parallel with everything. | [ ] | N | | |

Google Maps Platform ToS changes 28 Sep. Noted in the backlog, no action identified.

## 🔴 P0 — Critical / live damage

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| P0-0 | Two different lead views exist. Customer A's lead renders 9 sections; Customer B's renders everything. Same status. Not a data problem. Investigate, then collapse to one render path. | [ ] | | | |
| P0-1 | `pdf-assets` / `pdf-templates` anonymously writable on PROD. Fix written and DEV-rehearsed on `fix/pdf-assets-anon-write-rls`. Michael applies it in Studio, off-peak. Not a session. | [ ] | Michael (Studio) | | |
| P0-2 | Lead list count is fake and "Load more" hides leads. Count is derived from loaded rows, not a real `COUNT`. GATE ON MERGE: about 80 uncontacted leads surface at once when this lands. H does not merge until Michael has told Vryan and there is a plan for working them. | [ ] | H | | |
| P0-3 | AI summary review not visible on completed inspections. Folded into P0-0. | — | | | |
| P0-4 | Customer A — no details, can't download report. Folded into P0-0. Reproduced and diagnosed 4 Sep. | — | | | |
| P0-5 | `send-email` EF is an unauthenticated relay with a spoofable `from`. Own scoped session (L). Does not wait for J. | [ ] | L | | |
| P0-6 | DEV Vault holds a PROD-valid `service_role_key` (SF-5). DEV cron received HTTP 200 from PROD. Standalone and first; T5 absorbs the rest of environment separation. | [ ] | | | |
| P0-7 | Supabase MCP has no project ref pinned. Defaults to PROD; already caused a test INSERT on PROD. Fixed in Session F alongside T8, same settings surface. | [ ] | F | | |
| P0-8 | Archived leads still hold technician slots and send reminders. Acceptance is both halves: archiving cancels bookings and reminders from now on, AND existing archived leads on PROD are repaired. The repair SQL is guarded: read-only preview first, Michael approves the row count before anything writes. Session Q. Pre-flight: locate the archive handler first; if it lives in LeadDetail.tsx or Leads.tsx, Q waits for G2 and H. | [ ] | Q | | |

## 🟠 P1 — Pricing engine rebuild

Rules and tables are in `docs/PRICING_CANON.md`. Nothing in P1 is built this round: Session I is plan only. P1-2 to P1-13 may be planned with the demolition rows marked INTERPOLATED; nothing ships before Clayton's demolition table (B1) is in.

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| P1-1 | Load the new rate tables (Surface, Construction Site, Demolition, Subfloor; 2h–8h). | [ ] | | | |
| P1-2 | Commercial property type plus the 25% surcharge, folded into labour, never a visible line. | [ ] | | | |
| P1-3 | Industrial and Construction added to Premises Type. | [ ] | | | |
| P1-4 | Multi-day = day-rate multiples. Every day at the day-1 8h rate, no step-down. Retire the `dayRates` arrays. | [ ] | | | |
| P1-5 | Mixed jobs = total hours at the highest category present. Reworks Session C. | [ ] | | | |
| P1-6 | Session C rework and merge, on the existing branch `fix/option-stacking-equipment-days`. The equipment Days multiplier on it survives; only the labour half is rebuilt to the highest-category rule. Also carries the todo-log branch finding that `BookJobSheet` prints equipment days from the booking schedule, not the quote; read the quote's resolved days from the branch's `deriveEquipmentDays()`. | [ ] | | | |
| P1-7 | Subfloor in BOTH options. Option 1 = surface + subfloor, Option 2 = demolition + subfloor. | [ ] | | | |
| P1-8 | Minimums and premiums (bathroom condensation 1h min, non-bathroom 2h min, demolition premium). | [ ] | | | |
| P1-9 | Fixed fees as separate line items (paid inspection, weekend callout, travel beyond 50 km). Never discounted. | [ ] | | | |
| P1-10 | Loyalty discount engine plus agency tagging. Per-agency property counter, labour only. Auto cap 20%, manual cap stays 13%. This session also rewords CLAUDE.md, `.claude/rules/australian-compliance.md` and `pricing.ts` so that "13%" reads as the manual cap only. | [ ] | | | |
| P1-11 | Technician cost-estimate view must match report pricing, including overrides. Acceptance: one pricing function, both surfaces call it. Same numbers by coincidence is what exists today, and it drifted. | [ ] | | | |
| P1-12 | Quote format: `$X,XXX.XX + GST` everywhere, keep the odd cents. | [ ] | | | |
| P1-13 | Print pricing chart for Glen and Clayton to confirm, generated from the live tables. | [ ] | | | |

## 🟠 P1 — Workflow & data

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| P1-14 | Internal notes disappear on some lead statuses. Status-dependent render bug, the same suspected mechanism as P0-0. Investigated inside Session G; splits back out only if G proves otherwise. | [ ] | G | | |
| P1-15 | Search leads by Lead ID. Same files as the lead list. | [ ] | H | | |
| P1-16 | Repeat-client quick create, prefilling address and contact. | [ ] | | | |
| P1-17 | Attachments on the job file, separate from lead notes. | [ ] | | | |
| P1-18 | All users get admin and technician access. Decision locked. | — | | | |
| P1-19 | Glanz onboarding: admin and technician, app and Slack. Blocked on B2 (Glanz email and mobile). | [ ] | | | |
| P1-19b | Mobile nav bar detaches from the bottom and floats mid-screen. Folded into P1-20 (ruling 2026-09-05). | — | | | |
| P1-20 | Floating nav bar detaches from the bottom. Intermittent. Carries the ancestor-transform diagnosis (position:fixed silently becoming position:absolute; see that bug class in `docs/BUG_LEDGER.md`). P1-19b folded in. | [ ] | | | |
| P1-21 | "Recommend Dehumidifier Hire" toggle: investigate what it writes and whether it reaches the PDF or pricing, then rename or remove. | [ ] | | | |
| P1-22 | Offline does not work the way the team believes. The Dexie layer has zero production callers and the offline photo queue is wired to nothing (old TODO.md L1149–L1159, L1802–L1826), while technicians work in basements with no signal. Own session (O), investigation first: does any offline path work today, and what happens right now when a technician loses signal mid-form? Nothing is built until that is answered. Promoted from debt 2026-09-05. | [ ] | O | | |

## 🟡 P2 — Equipment & scheduling (small version)

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| P2-1 | Named calendar blocks: free-text name, block a time slot, not tied to a job. | [ ] | | | |
| P2-2 | Equipment pickup quick-fill: technician + job + equipment, saves a record, shows on the calendar. | [ ] | | | |
| P2-3 | Equipment unit and day selection on the job. Ties to the Session C Days multiplier. Absorbs the old TODO.md equipment-days work at L170 and its 11 sub-steps: extend the HEPA Days stepper pattern to Dehumidifier, Air Movers and RCD Box. | [ ] | | | |
| P2-4 | Two technicians on one job. 0a/0b/0c rehearsed on DEV. Blocked on B5. Separate session from P3-7; not run in parallel with it until someone has checked for file overlap. Also owns the `completed_by` decision and its two riders from the todo-log branch: photos on no-inspection jobs are visible only to the technician who wrote them (the RLS joins through `completed_by`), and the NULL-inspection photo visibility gap. Decide them together with who signs the completion report. | [ ] | | | |
| P2-5 | Auto-scheduler slot recommendations with travel-time estimates. | [ ] | | | |

## 🟡 P2 — Report & PDF

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| P2-6 | Infrared observations must print below the infrared section. | [ ] | | | |
| P2-7 | Infrared Observations section on the area page, under extra notes. | [ ] | | | |
| P2-8 | Moisture: plain number fields, no location on the PDF. Investigate first. Blocked on C3; reconcile it in the investigation. | [ ] | | | |
| P2-9 | Remove unused report pages (e.g. subfloor-only jobs printing empty sections). | [ ] | | | |
| P2-10 | PDF cover clips past ~25 rooms. Needs an EF change plus a Storage template upload. | [ ] | | | |
| P2-11 | Photo flow: button presses per area. Moved to Blocked as B6 (waiting on Clayton). | — | | | |
| P2-17 | The inspection PDF template has no sync path between the repo and Storage, so repo edits to it are inert: the Edge Function reads the template from the `pdf-templates` bucket, not from git. Documented as a trap in the backlog's Appendix I; this is the item that fixes it. One path that puts the repo template into Storage, verified by object metadata, not by re-fetch. Was PDF-CL18 on the `docs/todo-log-2026-08-31` branch. | [ ] | | | |

## 🟡 P2 — CRM & comms

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| P2-12 | Quote chasing. Audit the codebase first; a partial implementation may exist. | [ ] | | | |
| P2-13 | Job diary: ServiceM8-style comms log per job. | [ ] | | | |
| P2-14 | Google review request script, copy/paste SMS. | [ ] | | | |
| P2-15 | Lead view phone tap → message or call. | [ ] | | | |
| P2-16 | Notification bell live instead of 30 s poll. Prerequisite folded in: add the `notifications` table to the `supabase_realtime` publication (one-line migration; old TODO.md L2545). Distinct from P3-8, which is native push. | [ ] | | | |

## 🟢 P3 — Backlog

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| P3-1 | Invoicing plus Xero linking. | [ ] | | | |
| P3-2 | Business tracking suite. | [ ] | | | |
| P3-3 | Email domain switch to `mouldandrestoration.com.au`. Checklist folded in from the old TODO.md: seed-admin sender address (L49, L1329); DMARC enforcement record (L127); footer logo off the Supabase storage domain (L143); the Sent-folder visibility decision and its options, Option B preferred but deferred until the team's first clean week (L255–L332). | [ ] | | | |
| P3-4 | Framer → Supabase lead capture wiring. Live. | [x] | | 2026-09-05: leads with Source: Website arriving in PROD (Michael); the audit agent found the wiring in place and public leads arriving | n/a |
| P3-5 | Phase 2 job completion workflow. Spec at `docs/JOB_COMPLETION_PRD.md`. | [ ] | | | |
| P3-6 | SMS quick-action from lead numbers. | [ ] | | | |
| P3-7 | Equipment module: port `splitracker`, don't rebuild. Ask Michael for the link and Glen's screenshots first. Separate session from P2-4; not run in parallel with it until file overlap is checked. | [ ] | | | |
| P3-8 | In-app notifications (needs a native app). | [ ] | | | |
| P3-9 | Dedicated end-of-day report send window. | [ ] | | | |
| P3-10 | Photo-caption removal polish. | [ ] | | | |
| P3-11 | V2: AI-agent-first rebuild. Current app gets buttoned up only. | [ ] | | | |

## 🟢 P3 — Marketing & web (not app work)

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| M1 | Website redesign with a new contact form with photo upload. | [ ] | | | |
| M2 | Website SEO and Google optimisation (with Clayton, post-warehouse). | [ ] | | | |
| M3 | LinkedIn outreach strategy. Glanz drives. | [ ] | | | |
| M4 | Real estate agency canvassing, opportunistic. | [ ] | | | |
| M5 | Google Business Profile map pin and surfacing the 121 five-star reviews. | [ ] | | | |

## 🔧 Infrastructure / tech debt

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| T1 | `docs/todo-log-2026-08-31` branch unmerged. 11 findings logged; merge or fold into the backlog. | [ ] | | | |
| T2 | SF-2: `audit_log_trigger()` carries `anon EXECUTE`. | [ ] | | | |
| T3 | `pg_default_acl` hazard: every new `public` function silently regains `anon EXECUTE`. | [ ] | | | |
| T4 | API key rotation: Google Maps, OpenRouter, Supabase, Slack, Sentry. Resend is narrowed to E-3: verify the Edge Function secret, do not rotate the key again. | [ ] | | | |
| T5 | Dev Supabase environment separation. Plan at `docs/L4-environment-separation-plan.md`. P0-6 goes first on its own; T5 absorbs everything else. | [ ] | | | |
| T6 | PROD pre-flight for 0a/0b/0c. 15 read-only Studio blocks; PP6a needs human adjudication. | [ ] | | | |
| T7 | `npm run typecheck` is a no-op. Root tsconfig has `"files": []`; use `npx tsc -p tsconfig.app.json --noEmit`. The error count is not one number: 99, 122 and 135 were all measured on 31 Aug in different worktrees. Gate PRs on no NEW error lines against a baseline taken in the same tree the same day, never on the count. | [ ] | | | |
| T8 | Guard hook exists in only one place (`~/.claude/hooks/`). Track and register it in the repo. | [ ] | F | | |
| T9 | Incident 1: `STATUS: NOT APPLIED` is unenforced prose. Needs a real gate. | [ ] | | | |
| T10 | Incident 5: write protection binds to tool names, not resources. | [ ] | | | |
| T11 | SessionStart warning for worktrees missing a named safety commit. Open, not started. | [ ] | | | |
| T12 | Worktree drift. 17 worktrees, 14 current at `3191a39`, three blocked. | [ ] | | | |

## ⏸️ Still blocked — waiting on someone

| ID | Item | Waiting on | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|---|
| B1 | Full residential demolition hourly table. Interpolated rows in use meantime. | Clayton | [ ] | | | |
| B2 | Glanz email and mobile. | Glen | [ ] | | | |
| B3 | 0b PROD verification. | Michael | [ ] | | | |
| B4 | What is the "Split" tab in splitracker? Ask before speccing P3-7. | Glen | [ ] | | | |
| B5 | Glanz Sunday availability (currently Wed/Fri/Sat). | Glen | [ ] | | | |
| B6 (was P2-11) | Photo flow: button presses per area. Bulk capture shipped; does it cover his complaint? | Clayton | [ ] | | | |

## 🔥 Health-check findings — 26 Aug to 4 Sep

The systemic pattern: functions return 200 on failure. Session J audits every Edge Function for it before fixing A to E one at a time. Constraint on J: do not touch `calculate-travel-time` or `send-inspection-reminder` until Michael confirms the pending deploys of 30 Aug landed.

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| P0-A | `pdf_versions` insert silently rejected. Data loss ongoing. | [ ] | | | |
| P0-B | Email logged as "sent" without checking Resend. Customer-facing. | [ ] | | | |
| P0-C | Scheduled functions double-firing. Customer-facing. | [ ] | | | |
| P0-D | `login_activity` has written nothing since February. | [ ] | | | |
| P0-E | Google Maps API key. Verify first, may already be fixed. | [ ] | | | |
| P1-S-1 | Sentry prod `ignoreErrors` rule for "Failed to fetch" swallows real failures. Narrow it. | [ ] | | | |
| P1-S-2 | Sentry dev project has had zero events since 26 Aug. Check DSN and env wiring. | [ ] | | | |
| P1-S-3 | Sentry replays at 80% of the free quota; period ends 17 Sep. Lower the sample rate. | [ ] | | | |
| MRC-APP-1D | "Photo upload failed" on `/technician/inspection`, iPhone Safari, first 2 Sep. Adjacent to the #111/#112 photo work. | [ ] | | | |
| MRC-APP-1B | "Failed to upload lead note attachment" on `/leads`, first 27 Aug. Suspect commit `20eac74`. | [ ] | | | |
| MRC-APP-1A | "Hard-save endpoint unreachable: POST /api/render-pdf" on `/admin/leads`. | [ ] | | | |
| MRC-APP-14 / -17 | MIME-type errors on `/admin/schedule` and a technician job page. | [ ] | | | |
| MRC-APP-18 | "Inspection form save failed", 25 Aug. | [ ] | | | |
| MRC-APP-19 | ServiceWorker registration AbortError. | [ ] | | | |
| MRC-APP-1C | Validation block on an incomplete inspection. Not a fault. Ignore. | — | | | |
| P2-X-1 | Duplicate lead submission (27 Aug, two confirmations sent). Add idempotency to the lead form. | [ ] | | | |
| P2-X-2 | `fan_out_notification` RPC returning PGRST202; one in-app notification row lost 31 Aug. | [ ] | | | |
| P2-X-3 | `manage-users` 503s, twice on 1 Sep. | [ ] | | | |
| P2-X-4 | Two job completions stuck in draft since 24 Aug. | [ ] | | | |

About 80 leads sit uncontacted in `new_lead`. Check P0-2 before treating that as an ops failure: if the list hides leads 51 onwards, the team cannot see them.

## ✅ Shipped — do not re-log

**Leads:** repeat clients, unit numbers kept, lead notes with @mentions + attachments, full-database search, optional preferred date/time, "Start Job" opens job form, @mentions in job notes.

**Schedule:** To Schedule search rail, Reschedule deep-links, hour/minute/AM-PM picker, conflict banner detail, booking cancel resets lead correctly, 7 stranded leads restored + 3 duplicates archived, colour-coded cards.

**Photos:** auto captions, before-photos on the day, before + after photos on jobs with no inspection, bigger delete target, bulk upload.

**Reports/PDF:** false "NOT saved" error fixed, email size fix, hide-area-from-report, ex-GST display, two layout overlaps fixed, room names legible on cover, real save error messages.

**Pricing:** 2h rates corrected, saved estimates recompute at current rates, manual override works.

**Notifications:** in-app bell, Framer confirmations + reminders logged, duplicate scheduled-job firing fixed.

**Sessions C & D:** Equipment Days multiplier (branch, keep). Option 2 stacking fix (branch — labour half needs rework per §Mixed jobs). Subfloor toggle zero-out (merged `14b14f3`).

**Official fix list §6 items 1–3 complete:** report emailing bug, unit numbers, repeat clients.

## Engineering debt carried over from the old TODO.md

Audited 2026-09-05 against the backlog. The old file is `docs/TODO.md` at commit `3191a39`; `L` numbers below point into it. Its first 1,448 lines (291 open items) were judged item by item: 60 already have a backlog ID, 68 shipped, 54 were launch-era checks that are dead, 10 were superseded by the pricing canon or the rebuild, and 99 were live and unhomed. None of the 99 blocks handover: nothing here stops Glen, Clayton or Vryan getting through normal work. Eighteen of their lines were folded into P2-3, P3-3 and P1-22 on 2026-09-05 (rulings in hand); the remaining 65 clusters are kept as one line each so they are not lost, and are not scheduled. Lines 1,449 to 2,624 of the old file were checked only for handover blockers (none found) and are not itemised here; read them from the commit above if needed.

Three findings from the audit are tracked as items:

| ID | Item | Done | Branch / Session | Verified | Ledger entry |
|---|---|---|---|---|---|
| E-1 | NEEDS INVESTIGATION. `types.ts` declares `PostgrestVersion` 14.17, which matches neither PROD (13.0.5) nor DEV (14.5) as recorded on 17 Aug. Commit `54a60b9` on 27 Aug set it; the source project is unknown. Nothing should be trusted from `types.ts` until this is answered. Do not guess. | [ ] | | | |
| E-2 | P3-4 Framer wiring confirmed live; P3-4 closed. | [x] | | 2026-09-05: Source: Website leads in PROD (Michael) | n/a |
| E-3 | Verify the Resend Edge Function secret. The key was rotated (the old TODO.md records it); whether the EF secret was updated is unknown. Check the secret and a live send. | [ ] | | | |

Live, unhomed, not blocking (one line per cluster; sub-steps folded into their parent):

- L36 — Fix Supabase Site URL from /admin subpath to root https://mrcsystem.com
- L138 — Evaluate Apple Branded Mail via Apple Business Connect before BIMI
- L155 — Delete SUPABASE_SERVICE_ROLE_KEY from Vercel
- L860 — Drop unused formatPercent import in TechnicianInspectionForm.tsx
- L901 — Reports page fails whole-page on revenue query error; technician surfaces degrade instead
- L912 — Decision: defer unifying Reports error degradation to its own scoped change
- L934 — Section 7 both-options save guard over-fires on auto-save and navigation
- L935 — Section 7 both-options save guard over-fires; move check to submit/PDF time
- L958 — Extract jobCompletionSchema.ts or document keeping validation inline
- L1011 — PDF-CL1: rename misleading pdf_versions.pdf_url to html_public_url
- L1014 — PDF-CL4: drop inspections.pdf_blob_url column once unread
- L1015 — PDF-CL5: decide whether to add audit trigger on pdf_versions
- L1017 — PDF-CL7: previewOnly EF branches should write an audit row
- L1018 — PDF-CL8: build unified job-report version-history UI
- L1019 — PDF-CL9: remove legacy write path in generate-job-report-pdf EF
- L1020 — PDF-CL10: drop job_completions.pdf_blob_url column
- L1022 — PDF-CL11: job_completion_pdf_versions RLS policies missing from repo
- L1023 — PDF-CL12: 23505 retry in render-job-report-pdf is dead code without UNIQUE constraint
- L1024 — PDF-CL13: render-job-report-pdf reports wrong validation error for bad mode
- L1025 — PDF-CL14: stale fire-and-forget JSDoc on sendEmail in notifications.ts
- L1026 — PDF-CL15: /admin/render-test PDFs accumulate unpruned in report-pdfs Storage
- L1027 — PDF-CL16: report-pdfs bucket has no DELETE policy, cleanup remove() calls are silent no-ops
- L1028 — PDF-CL17: switch generate-job-report-pdf to signed photo URLs instead of base64 data URIs
- L1050 — AH2 follow-up: consider warning at hide time about narrative references
- L1051 — AH3 FIX: Demolition page survives hide when demolition_content is set
- L1057 — AH3 product call: drop Demolition page or keep and prompt re-edit
- L1074 — AH5 sweep: check photos, moisture_readings, job_completions for select drift
- L1088 — AC1: on-site before-photo provenance is a heuristic, not a stored fact
- L1101 — AC1 residual false positive: general inspection photo picked as before photo gets Delete
- L1116 — AC1 proper fix: add photos provenance column via migration, replace heuristic
- L1119 — AC1: delete the session-id union when provenance column lands
- L1121 — AC3: stale-PDF banner does not clear after successful regeneration (+1 sub-steps folded)
- L1134 — AC4: sentinel captions shown raw to technicians in before-photo picker
- L1159 — AC2: OutdoorPhotoSlotGrid breaches outdoor sentinel caption invariant
- L1163 — AC2: ImageUploadModal.tsx:136 breaches outdoor sentinel invariant
- L1164 — AC2: ImageUploadModal.tsx:168 maps direction_photo to illegal photo_type 'direction'
- L1168 — AC2: ViewReportPDF.tsx:2307 writes caption null, violating Stage 4.1 invariant
- L1170 — AC2: loadUnplacedPhotos has no job_completion_id filter; admin pool shows job photos
- L1172 — AC2 question: does any admin workflow legitimately re-place a job photo into an inspection slot?
- L1174 — AC2: isNetworkLevelError duplicated four ways; consolidate into shared module
- L1183 — W6.1-A: unify property_occupation enum label rendering across surfaces
- L1185 — W6.1-B: read old status from lead.status in FinishLeadSection logFieldEdits
- L1187 — W6.1-C: parallelise sequential snapshot fetches with Promise.all
- L1188 — W6.1-C: Promise.all the three snapshot awaits in TechnicianInspectionForm section save
- L1189 — W6.1-C: Promise.all subfloor_data and inspection_areas fetches in TechnicianJobDetail
- L1195 — W6.1-F: anchor percent group in check-photo-moisture-orphans caption regex
- L1197 — W6.1-G: migration 20260513_phase5_dead_column_drop.sql lacks HHMMSS suffix
- L1199 — W6.1-H: scrub raw DB error details from check-photo-moisture-orphans response
- L1226 — L1 finding 2: 'Capped at 5 days' shown on PDF but not enforced
- L1298 — Verify RLS policy parity between DEV and PROD
- L670 — Upload job-report-template.html to bucket under same name
- L789 — Keep pre-deploy `vercel env ls production` check as habit
- L803 — Triage the 6 old git stashes; recover wanted, drop rest
- L820 — Rename Leads-to-Assign card subtitle to avoid 'Needs attention' collision
- L827 — Decide whether to reschedule overdue cron for AEDT drift in October
- L829 — Rotate the DEV admin password
- L831 — Google Fonts Inter woff2 fails to load on preview (CSP font-src)
- L832 — Decide 'Completed This Week' semantics (updated_at filter vs completion events)
- L386 — Remove SUPABASE_SERVICE_ROLE_KEY from Vercel Preview and Production scopes
- L407 — Step 4: runbook block B applies 20260729153000 constraint migration after A
- L446 — Run INVOICE_INTEGRITY_RUNBOOK on DEV first, confirm clean, then PROD
- L448 — Runbook block B: apply invoice_totals_integrity_checks migration (two VALID CHECKs)
- L470 — Decision: both CHECK constraints required, neither alone catches both defects
- L1380 — Verify SYSTEM_USER_UUID secret set in production Supabase (+2 sub-steps folded)
- L1398 — S5 Refresh PHASE_2_EXECUTION.md '16 active tables' count


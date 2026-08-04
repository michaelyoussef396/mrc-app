# Documentation Audit — 2026-08-04

**Scope:** every `.md` and `.html` file under `docs/` (recursive) plus repo-root `CLAUDE.md`, verified against the codebase at `main` (`d49ba8b`).
**Method:** GitNexus reindexed before any query (10,567 symbols). Three parallel evidence agents (inventory, code ground-truth, HTML usability) + five verification agents, then serial synthesis. Every ACCURATE/STALE/WRONG verdict cites `file:line`; every GitNexus/negative finding was grep-confirmed. No network access, no Supabase MCP — repo evidence only. Read-only: no existing file was modified.
**PR #72 note:** findings touching admin dashboard accuracy, Melbourne-local dates, `check-overdue-invoices` behaviour, pipeline tab ordering, `?status=` deep links, or Settings logout are tagged **[PENDING-PR72]** rather than STALE/WRONG.

**Verdict key:** ACCURATE = verified, cited · STALE = was true, no longer is · WRONG = never true or actively misleading · UNVERIFIED = not confirmable from repo evidence (live DB/secret/dashboard/DNS state is UNVERIFIED by definition).

---

## Executive summary (read this first)

1. **The email cutover already happened in code — TODO.md doesn't know it.** `grep -rn "noreply@" src/ supabase/` returns **zero** hits; `@mrcsystem.com` appears only inside URLs, never as an email address. `send-email/index.ts:203` (from) and `:207` (reply_to) both default to `admin@mouldandrestoration.com.au`. TODO.md's open item "Envelope layer still sends from noreply@mrcsystem.com — 6 hardcoded literals" is STALE, as are the sender claims in `API.md:39`, `API_AUDIT.md:42`, and `NOTIFICATIONS-AND-TRIGGERS.md:184`. Remaining true residue: `seed-admin/index.ts:50` still uses `admin@mrc.com.au`.
2. **No two docs agree on system size.** Edge Functions: docs say 8, 9, 10, or 12 — disk has **14** (+ `_shared`). Tables: docs say 22, 23, 31, or 38 — `src/integrations/supabase/types.ts` defines **29 tables + 1 view**. Inspection form: docs (and CLAUDE.md history) say 10 sections — code has **9** (`TechnicianInspectionForm.tsx:121-131`).
3. **The biggest team-facing doc teaches retired pricing.** `MRC_FULL_WALKTHROUGH.html` (3,479 lines, last commit 2026-04-28, no date stamp visible to the reader) carries the superseded labour tiers ($612.00/$1216.99), the $132 dehumidifier, and the abandoned volume-discount table — all three of which the two current pricing HTMLs explicitly tell readers to ignore. Its PDF twin is 4 days staler again.
4. **The two freshest pricing docs contradict each other.** `BUSINESS_LOGIC.html` (13 Jul) says HEPA is *not* in the up-front quote; `PRICING_AND_PROCESS_GUIDE.html` (29 Jul) says it now is (code agrees with the 29 Jul doc: `pricing.ts:238-244`).
5. **Security hygiene finding:** `docs/SECURITY_AUDIT.md` — the document that reported the token leak — itself stores full-length `sbp_`, `github_pat_`, and `re_` token strings in a tracked file (L42, L73-75, L164, L170, L176). Needs redaction regardless of what happens to the doc.
6. **Consolidation is warranted.** 93 files; roughly two-thirds are point-in-time diagnostics/audits that are safe to archive. The team-facing surface should collapse to ONE operations doc (proposal in §6).

---

## 1. Inventory

93 files under `docs/`: **78 .md**, **12 .html**, 1 .sql, 1 .pdf, 1 .png. Audience codes: TECH = Glen/Clayton field · ADMIN = Michael desktop · DEV = developer · SPEC = PRD/plan.

### docs/ (root)

| path | fmt | lines | last commit | audience | summary |
|---|---|---|---|---|---|
| AI_SUMMARY_INPUT_AUDIT.md | .md | 404 | 2026-05-13 | DEV | Phase-0 audit of what the AI-summary EF receives vs what the UI sends |
| API_AUDIT.md | .md | 221 | 2026-04-03 | DEV | External-API/key inventory + rotation call |
| API.md | .md | 633 | 2026-08-04 | DEV | API reference for EFs, DB schema, auth, enums |
| AUTH-PROFILE-DOCUMENTATION.md | .md | 915 | 2026-04-03 | DEV | Login/Forgot/Reset/Profile/Settings technical doc |
| BACKUP_TABLE_CLEANUP.md | .md | 176 | 2026-07-07 | DEV | Backup-table drop review, marked COMPLETE |
| BUSINESS_LOGIC_PROMPT.md | .md | 247 | 2026-06-04 | TECH | Paste-into-AI prompt wrapper for pricing/business questions |
| BUSINESS_LOGIC.html | .html | 940 | 2026-08-02 | TECH | Plain-English business rules: pricing, pipeline, bookings |
| COST_CALCULATION_SYSTEM.md | .md | 528 | 2026-07-28 | ADMIN | Pricing reference — banner-marked SUPERSEDED |
| data-model-invariants.md | .md | 87 | 2026-05-01 | DEV | App-enforced schema invariants (inspector_id snapshot) |
| database_technical_audit.md | .md | 597 | 2026-04-05 | DEV | Feb/Apr 2026 DB audit, health 68→91 |
| DEPLOYMENT.md | .md | 344 | 2026-04-03 | DEV | Branch strategy + Vercel/Supabase deploy procedure |
| DEVELOPER-GUIDE.md | .md | 460 | 2026-02-18 | DEV | Code structure, local dev, conventions |
| edge-function-attribution-manifest.md | .md | 174 | 2026-05-02 | DEV | Canonical EF audit-attribution buckets |
| end-to-end-test-plan-2026-05-01.md | .md | 647 | 2026-05-01 | DEV | Manual E2E script with SQL checks |
| FRAMER_FIELD_MAPPING.md | .md | 119 | 2026-04-22 | DEV | Framer field-name remediation checklist |
| FRAMER_WEBHOOK.md | .md | 113 | 2026-04-22 | DEV | Public lead-webhook contract |
| inline-edit-diagnosis.md | .md | 353 | 2026-04-28 | DEV | EditLeadSheet vs inline-edit diagnosis |
| inspection-workflow-audit-2026-04-30.md | .md | 638 | 2026-05-01 | DEV | 44-finding inspection-integrity audit |
| inspection-workflow-fix-plan-2026-04-30.md | .md | 1021 | 2026-05-01 | SPEC | v1 fix plan (42 stages) — superseded by v2 |
| inspection-workflow-fix-plan-v2-2026-04-30.md | .md | 1331 | 2026-05-11 | SPEC | v2 fix plan (48 stages), the execution map |
| internal-notes-loss-diagnosis.md | .md | 248 | 2026-05-01 | DEV | Forensics: destroyed internal notes, unrecoverable |
| INVOICE_INTEGRITY_RUNBOOK.md | .md | 249 | 2026-07-29 | DEV | Human-run SQL: empty invoices table + CHECK constraints |
| JOB_COMPLETION_PLAN.md | .md | 378 | 2026-04-03 | SPEC | Phase 2A–2F build plan |
| JOB_COMPLETION_PRD.md | .md | 444 | 2026-07-09 | SPEC | PRD for stages 7–12 (completion→review) |
| KEY_ROTATION.md | .md | 159 | 2026-06-02 | DEV | Secret inventory + rotation runbook |
| L4-environment-separation-plan.md | .md | 271 | 2026-05-11 | SPEC | Dev-Supabase / Vercel-Preview separation plan |
| LAUNCH_TESTING_FINDINGS.md | .md | 840 | 2026-08-04 | DEV | 2 Aug launch-test issue log |
| LAUNCH_WEEKEND_BRIEFING.html | .html | 368 | 2026-08-02 | ADMIN | "For Glen & Clayton" launch-weekend briefing |
| lead-detail-diagnosis.md | .md | 268 | 2026-04-28 | DEV | Preferred date/time render-path trace |
| MANUAL_TESTING_CHECKLIST.md | .md | 429 | 2026-04-15 | DEV | Pre-handover smoke checklist |
| MCP_STACK.md | .md | 330 | 2026-04-03 | DEV | MCP server configuration |
| morning-bugs-diagnosis.md | .md | 314 | 2026-05-01 | DEV | Two-bug diagnosis (notes pencil, schedule crash) |
| MRC_FULL_WALKTHROUGH.html | .html | 3479 | 2026-04-28 | ADMIN | "Every Path, Every Button" full system walkthrough |
| MRC_FULL_WALKTHROUGH.pdf | .pdf | — | 2026-04-24 | ADMIN | PDF export of the walkthrough, 4 days staler than its HTML |
| MRC_PROJECT_CONTEXT.md | .md | 836 | 2026-04-05 | DEV | Codebase reference for AI-assistant context |
| mrc-system-overview.html | .html | 630 | 2026-04-22 | ADMIN | Five-minute plain-English system tour |
| NOTIFICATIONS-AND-TRIGGERS.md | .md | 944 | 2026-03-11 | DEV | Email/Slack/trigger/cron/realtime reference |
| PDF_PIPELINE_PLAN.md | .md | 135 | 2026-05-25 | SPEC | PDF pipeline rebuild tracker |
| PHASE_2_EXECUTION.md | .md | 420 | 2026-05-11 | SPEC | Phase 2 execution plan + Phase 1 inventory |
| PHASE_2D_INVOICE_TODO.md | .md | 229 | 2026-06-23 | SPEC | Phase 2D invoice tracker/session log |
| phase-2-verification-helpers.sql | .sql | 170 | 2026-05-01 | DEV | BEGIN/ROLLBACK audit-trigger tests |
| phase-2-verification-matrix.md | .md | 129 | 2026-05-01 | DEV | Phase 2 audit-infra verification matrix |
| PLANNING.md | .md | 140 | 2026-04-03 | DEV | Architecture/stack overview |
| pr-batch-a-templates-copy.md | .md | 67 | 2026-08-04 | DEV | PR body, batch A |
| pr-batch-b-ai-prompt.md | .md | 71 | 2026-08-04 | DEV | PR body, batch B |
| pr-batch-c-forms-ui.md | .md | 77 | 2026-08-04 | DEV | PR body, batch C |
| PRD.md | .md | 1987 | 2026-08-02 | SPEC | Master PRD v2.0 |
| PRE_HANDOVER_AUDIT.md | .md | 176 | 2026-04-20 | DEV | Pre-handover audit (0 blockers) |
| PRE_MERGE_TESTING_CHECKLIST.md | .md | 377 | 2026-07-29 | DEV | Combined pre-merge checklist, three streams |
| PRELAUNCH_AUDIT_2026-07-08.md | .md | 48 | 2026-07-09 | DEV | Ranked pre-launch shortlist |
| PRICING_AFD_FINDINGS.md | .md | 139 | 2026-08-02 | DEV | AFD/HEPA billing findings — banner-marked SUPERSEDED |
| PRICING_AND_PROCESS_GUIDE.html | .html | 477 | 2026-07-29 | TECH | Plain-English pricing summary ("text Michael if wrong") |
| PRODUCTION_MERGE_RUNBOOK.md | .md | 330 | 2026-08-04 | DEV | Batches A/B/C production-merge runbook |
| RUNBOOK.md | .md | 262 | 2026-02-18 | ADMIN | Daily ops checks, monitoring, incident response |
| schedule-consolidation-diagnosis.md | .md | 361 | 2026-04-28 | DEV | BookInspectionModal deletion analysis |
| SECURITY_AUDIT.md | .md | 284 | 2026-04-05 | DEV | Credential-exposure scan (contains live-format secrets!) |
| SECURITY-REMEDIATION-REPORT.md | .md | 351 | 2026-03-11 | DEV | Fixed-vs-dismissed security report |
| stage-1.4-callsite-catalog.md | .md | 357 | 2026-05-01 | DEV | handleGeneratePDF callsite catalog |
| stage-3.5-consumer-audit.md | .md | 222 | 2026-05-02 | DEV | Gate before dropping legacy AI-summary columns |
| stage-4.3-consumer-audit.md | .md | 239 | 2026-05-10 | DEV | Gate before photos soft-delete |
| SUPABASE_ADVISOR_AUDIT.md | .md | 170 | 2026-07-09 | DEV | Advisor snapshot PROD+DEV |
| system-user-uuid.md | .md | 71 | 2026-05-01 | DEV | SYSTEM_USER_UUID sentinel doc |
| TODO.md | .md | 1538 | 2026-08-03 | SPEC | Live master tracker |
| TROUBLESHOOTING.md | .md | 305 | 2026-02-18 | DEV | Common errors + fixes |
| USER-GUIDE.md | .md | 292 | 2026-02-18 | TECH | End-user guide (login, PWA install, workflows) |
| WEBHOOK_STRESS_TEST.md | .md | 265 | 2026-04-22 | DEV | 100-test stress run vs webhook v18 |
| WORKFLOW.md | .md | 142 | 2026-04-03 | DEV | Session history log |
| XERO_INTEGRATION_HANDOFF.md | .md | 257 | 2026-06-23 | DEV | Xero-ready invoice-flow handoff |

### Subdirectories

| path | fmt | lines | last commit | audience | summary |
|---|---|---|---|---|---|
| email-previews/README.md | .md | 58 | 2026-05-01 | DEV | Explains previews are gitignored (PII) + builder map |
| email-previews/01…07-*.html (7 files) | .html | 87–96 ea | UNTRACKED | ADMIN | Rendered transactional-email previews (gitignored, `.gitignore:53`) |
| pdf-reference/forms.md | .md | 294 | 2026-04-03 | DEV | Generic (non-MRC) PDF form-filling reference — vendored skill material |
| pdf-reference/reference.md | .md | 611 | 2026-04-03 | DEV | Generic PDF-processing reference — vendored skill material |
| pdf-report/README.md | .md | 154 | 2026-02-07 | DEV | 13-page report template overview, "awaiting integration" |
| pdf-report/DATA-REQUIREMENTS.md | .md | 248 | 2026-02-07 | DEV | Template variable → DB mapping |
| pdf-report/TEMPLATE-VARIABLES.md | .md | 149 | 2026-02-07 | DEV | 46-placeholder catalogue |
| pdf-report/templates/complete-report-backup.html | .html | 919 | 2026-02-07 | DEV | Backup PDF template — 45 broken asset refs (see §1a) |
| testing/01_DESKTOP-13-05-2026.md | .md | 1596 | 2026-05-14 | DEV | Raw desktop test transcript |
| testing/02_DESKTOP-14-05-2026.md | .md | 124 | 2026-05-25 | DEV | Admin-path desktop test session |
| testing/inscpect1.md | .md | 295 | 2026-05-25 | DEV | Test-inspection input record (typo'd filename) |
| testing/leadview_completeness_audit_MRC-2026-0144.md | .md | 371 | 2026-05-16 | DEV | LeadView field-surfacing gap audit |
| testing/pr57_e2e_walk_MRC-2026-0144_20260516.md.md | .md | 596 | 2026-05-25 | DEV | PR #57 E2E walk (double `.md.md` extension) |
| testing/pr57_sibling_sweep.md | .md | 198 | 2026-05-16 | DEV | BUG-046 currency-display sibling sweep |
| testing/section9_verification_MRC-2026-0144.md | .md | 306 | 2026-05-16 | DEV | Section 9 pricing formula verification |
| testing/WAVE6_POST_DEPLOY_VERIFICATION.md | .md | 227 | 2026-05-14 | DEV | Wave 6 post-deploy structural audit |
| testing/new-lead-recieved slack-notification.png | .png | — | 2026-05-25 | DEV | Slack-notification screenshot (typo + space in filename) |
| verification/launch-checks-VERIFY.md | .md | 201 | 2026-07-30 | DEV | Per-commit verification declaration for PR #72 |

### 1a. The .html files as standalone team-facing artefacts

These were shown directly to team members, so standalone-viewability matters:

| file | standalone? | detail |
|---|---|---|
| BUSINESS_LOGIC.html | ✅ STANDALONE | Fully inline CSS, zero external refs; opens offline with no degradation |
| PRICING_AND_PROCESS_GUIDE.html | ✅ STANDALONE | Fully inline; freshest date stamp in the set (29 Jul) |
| LAUNCH_WEEKEND_BRIEFING.html | ✅ STANDALONE | Fully inline |
| MRC_FULL_WALKTHROUGH.html | ⚠️ DEPENDS-ON-NETWORK | Google Fonts (cosmetic) + **mermaid from cdn.jsdelivr.net (functional)** — every diagram renders as raw source text offline (L3444-3445). Also exposes the PROD project ref in plain text (L579, L2660, L2760) and contains a sensitive data-loss incident writeup |
| mrc-system-overview.html | ⚠️ DEPENDS-ON-NETWORK | Same Google Fonts + mermaid CDN pattern (L588-589); diagrams break offline |
| email-previews/01–07 | ⚠️ DEPENDS-ON-NETWORK + untracked | Logo loads from the live PROD Storage public URL in all 7; gitignored so what was shown to the team is unreproducible; 05 still shows the personal mobile `0433 553 199` that was scrubbed from code (no `0433 553` hit in src/ or supabase/ — only the developer line `0433 880 403` at `HelpSupport.tsx:12-13`); 06 links a real customer job-report public URL |
| pdf-report/templates/complete-report-backup.html | ❌ BROKEN-ASSETS | 45 local `/assets/...` refs, none exist on disk; renders with every image broken; root-absolute paths don't resolve under file:// anyway. Not a reading doc |

`MRC_FULL_WALKTHROUGH.pdf` (2.65 MB, committed 2026-04-24) is a snapshot of a pre-28-Apr walkthrough — out of sync with its own HTML, and both predate the July pricing overhaul.

---

## 2. Verification against code

Ground truth used throughout (independently verified):

- **Routes** — `src/App.tsx`: 6 public routes + catch-all (`App.tsx:88-93,477`), 18 admin routes (`:97-470` incl. `/admin/invoice/:leadId` :175, `/admin/render-test` :233), 9 technician routes (`:261-401` incl. `/technician/job-completion/:leadId` :366). `TechnicianJobDetail` is imported (`App.tsx:46`) but **not routed**.
- **Edge Functions** — `ls supabase/functions/`: 14 + `_shared`: calculate-travel-time, check-overdue-invoices, check-photo-moisture-orphans, export-inspection-context, fetch-resend-email, generate-inspection-pdf, generate-inspection-summary, generate-job-report-pdf, manage-users, receive-framer-lead, seed-admin, send-email, send-inspection-reminder, send-slack-notification.
- **Pricing** — `src/lib/calculations/pricing.ts`: `EQUIPMENT_RATES` dehumidifier 119 (:28), airMover 46 (:29), hepaAirScrubber 100 (:30), rcd 5 (:31); `GST_RATE = 0.10` (:49); `MAX_DISCOUNT = 0.13` (:55); `LABOUR_RATES` (:19-24) nonDemo 1019.40/1245.33 + dayRates [1245.33, 1060.34, 1054.52, 1007.18, 921.57, 921.57], demolition 1062.00/1825.87, subfloor 1322.62/2375.21, construction placeholder "not in use" (:22); 2-hour minimum (:83-86); waste bands {2:350, 4:450, 6:550, 8:703, 10:900, 12:1190} + $145/m³ extrapolation (:36-46); equipment days auto = `max(1, ceil(hours/8))` (:232) — **no 5-day cap in code**; HEPA carries its own optional days (:238-244). **No `0.87` multiplier anywhere** (`grep -rn "0\.87" src supabase` → 0 hits); volume-discount tiers are gone — `discountPercent` hardcoded 0 (:462-471).
- **Invoices** — `src/lib/api/invoices.ts`: 14-day terms (:278, :585, :888); 13% clamp (:103-108, :293, :335); equipment/waste never discounted (:93-99, :112); `melbourneDateISO` (:898-900).
- **Status flow** — `src/lib/statusFlow.ts:2-18`: 16 statuses (new_lead, inspection_waiting, inspection_ai_summary, approve_inspection_report, inspection_email_approval, job_waiting, job_scheduled, job_completed, pending_review, job_report_pdf_sent, invoicing_sent, paid, google_review, finished, closed, not_landed); terminal = closed/not_landed/finished (:215-217). DB enum in `types.ts:2219-2238` has 20 values (4 legacy).
- **Forms** — inspection form **9** sections (`TechnicianInspectionForm.tsx:121-131`); job completion form **10** sections (`JobCompletionForm.tsx:24-35`, files in `src/components/job-completion/`).
- **Email senders** — no `noreply@`, no `@mrcsystem.com` addresses in code (grep-verified); defaults `admin@mouldandrestoration.com.au` (`send-email/index.ts:203,207`); `seed-admin/index.ts:50` = `admin@mrc.com.au`.
- **Offline/PWA** — Dexie `mrc-offline` v2 with stores inspectionDrafts/photoQueue/quarantinedPhotos/syncLog; **no jobCompletionDrafts** (`src/lib/offline/db.ts:12-24`). PWA manifest "MRC Field", start_url `/technician` (`vite.config.ts:20-32`).
- **Penalty ladder** — `PENALTY_FEE_INCREMENT = 65` (`src/lib/calculations/penaltyLadder.ts:18`), first fee at day 1 (:77).
- **npm scripts** — `package.json:6-17`: dev, build, build:dev, typecheck, lint, preview, test, test:run, test:ui, preview-emails — nothing else.

Per-doc verdicts follow, grouped. (A/S/W/U = accurate/stale/wrong/unverified counts of checked claims; historical docs were spot-checked, not line-audited.)

### 2a. API & architecture references

**API.md** (A14/S9/W3/U2) — **REWRITE.** Only the AI-summary section was refreshed in today's commit; the rest is Feb-2026. WRONG: sender `noreply@mrcsystem.com` (L39) vs `send-email/index.ts:207`; "Commercial Dehumidifier $132.00" (L620) vs `pricing.ts:28` ($119 — `equipmentRateDrift.test.ts:116-118` exists specifically to keep $132 out). STALE: documents 9 of 14 EFs (missing check-overdue-invoices, check-photo-moisture-orphans, fetch-resend-email, generate-job-report-pdf, receive-framer-lead); "22 tables" (L436) vs 29+1 in `types.ts`; status pipeline `hipages_lead → contacted → …` (L603-608) vs `statusFlow.ts:2-18`; 429 rate-limit paths undocumented (`send-email/index.ts:121,180,196`). ACCURATE: AI model chain gemini-2.5-flash → flash-lite → claude-haiku-4.5 (`generate-inspection-summary/index.ts:367-371`), discount cap, GST, air-mover/RCD rates, manage-users methods (`manage-users/index.ts:180,237,330,390`), calculate-travel-time actions.

**API_AUDIT.md** (A9/S3/W1/U8) — **ARCHIVE** with as-of banner. WRONG-now: "Current From: noreply@mrcsystem.com / Planned: admin@mouldandrestoration.com.au (pending)" (L42-43) — the switch shipped. STALE: OpenRouter primary model (L94) vs `generate-inspection-summary/index.ts:368`; "22 hooks" vs 40 files in `src/hooks/`. Rotation statuses all UNVERIFIED (dashboard state).

**AUTH-PROFILE-DOCUMENTATION.md** (A11/S12/W4/U4) — **REWRITE.** Its two foundational "Key Design Decisions" are both false today: "No `profiles` table" (L40) — restored by `20260209000000_restore_profiles.sql`, live in `types.ts:1748` and `AuthContext.tsx`; "No `user_roles` table / roles disabled" (L41, L838) — live at `types.ts:1985`, queried by `AuthContext.tsx`, `useTechnicians.ts`. STALE: data-mapping table omits `starting_address` (`Profile.tsx:168-175, 218-231`); `storage: window.localStorage` (L654) vs custom `rememberMeStorage` adapter (`client.ts:22-66, 106`); "Manage Users → /manage-users" (L506) vs `Settings.tsx:189` → `/admin/technicians` (`src/pages/ManageUsers.tsx` does not exist — ls-confirmed); seed-admin password now env-driven, not literal. Nearly every line-number citation has drifted.

**NOTIFICATIONS-AND-TRIGGERS.md** (A13/S11/W4/U6) — **REWRITE.** WRONG: sender `noreply@mrcsystem.com` (L184-186); references `src/lib/notifications.ts` (L226-228, L345, L885) — file does not exist (only `src/lib/api/notifications.ts`). STALE: "7 statuses implemented / 18 in DB" (L29) vs 16 active / 20 in enum; `CreateLeadModal.tsx`, `Leads.tsx`, `NewLeadView.tsx`, `AddLeadDialog.tsx` all deleted (ls-confirmed); cron SQL superseded by `20260601120000_fix_cron_auth_headers.sql` (Vault auth headers); omits the `check-overdue-invoices` cron entirely; misses the pg_net Slack trigger path (`20260527023540_email_logs_slack_notify_trigger.sql`). Note: `20260802120000_sequential_job_and_inspection_numbers.sql:5-11` moved inspections to `INS-YYYY-NNNN` and jobs to `JOB-YYYY-NNNN` — the doc's `MRC-` claims hold for leads only. ACCURATE: reminder-cron schedule and query logic, PWA caching table, Dexie schema.

**edge-function-attribution-manifest.md** (A12/S3/W1/U4) — **KEEP** (patch). Highest-accuracy doc in the set: every attribution mechanism verified line-for-line (`generate-inspection-pdf/index.ts:1656,2027`; `generate-inspection-summary/index.ts:749,820-822`; `send-email/index.ts:43,221`; `receive-framer-lead/index.ts:468,525`; `check-overdue-invoices/index.ts:172,270-273`; `send-inspection-reminder/index.ts:215,334`; manage-users JWT-only, grep-confirmed no SYSTEM_USER_UUID). Only fix: "12 Edge Functions" → 14; add `check-photo-moisture-orphans` and `fetch-resend-email` as Bucket C rows — the manifest's own "update in the same commit" rule (L3) was violated by those two.

**FRAMER_WEBHOOK.md** (A13/S2/W1/U3) — **KEEP** (patch). WRONG: "5 submissions/hr/IP" (L15, L63) — `receive-framer-lead/index.ts:19` is `RATE_LIMIT = 100`, with the :14-18 comment explaining why 5 was abandoned. STALE: field-mapping table omits postcode (validated field since Jun-2026: `index.ts:78, 636, 788`). Everything else verified: 50KB body cap (:106), duplicate flagging (:794-795), auto-set fields, content-type branching.

**FRAMER_FIELD_MAPPING.md** (A5/S1/W0/U7) — **ARCHIVE.** A one-off Framer-dashboard rename checklist; whether it shipped is unknowable from the repo, and its EF-side content duplicates FRAMER_WEBHOOK.md. Postcode "recently added via fallback" claim is stale (now first-class, `index.ts:78`).

**system-user-uuid.md** (A6/S1/W2/U4) — **MERGE** into the attribution manifest. WRONG: claims `manage-users` reads SYSTEM_USER_UUID (L56) — grep-confirmed no matches, and the manifest itself (L42) says the opposite; claims a `/admin/audit` page renders the sentinel (L10) — `grep -rn "admin/audit" src/` → no matches. STALE: `VITE_SYSTEM_USER_UUID` "exposed to the frontend" — zero references in src/. The UUID value + rotation policy are the only unique content.

**data-model-invariants.md** (A6/S4/W0/U2) — **KEEP** (refresh line numbers). The core invariant (inspector_id written once, never updated) independently re-verified today: only two write sites, `TechnicianInspectionForm.tsx:3962` and `SyncManager.ts:212-218` (doc's cited line numbers have drifted but the claims hold). "Future Phase 3/4" framing is stale — both shipped.

**database_technical_audit.md** (A2/S6/U3 + HISTORICAL) — **ARCHIVE.** The Apr-2026 banner contradicts the Feb-2026 body it sits above (the "CRITICAL" blockers at L28/L30 are resolved); count claims (23/31 tables) are both stale vs 29+1.

**SECURITY_AUDIT.md** (A5/S3/U6 + HISTORICAL) — **ARCHIVE + REDACT.** The `.gitignore` coverage (L119-128 vs `.gitignore:27-32`) and "no hardcoded secrets" claims re-verify clean today. But the doc itself prints full-length `sbp_`, `github_pat_`, and `re_` token strings (L42, L73-75, L164, L170, L176) in a tracked file — the exact exposure class it reports. Redact regardless of disposition.

**SECURITY-REMEDIATION-REPORT.md** (A9/S4/W1/U5) — **ARCHIVE.** WRONG: "RLS 38/38 tables" (L157, L280) — never reconcilable with any known count (29 now, 31 in the same-era DB audit). STALE: CSP transcript (L148) vs the materially broader `vercel.json:20`; "8/8 Zod" vs 14 EFs. The code-level fixes it records are still in place.

**WEBHOOK_STRESS_TEST.md** (A8/S3/W1/U6) — **ARCHIVE.** Test-run record against EF v18; EF is now v20 (`receive-framer-lead/index.ts:501`) with a 20× different rate limit (100 vs 5). The 9-layer defence chain description remains accurate and belongs in FRAMER_WEBHOOK.md.

### 2b. Evergreen guides (USER-GUIDE, DEVELOPER-GUIDE, TROUBLESHOOTING, RUNBOOK, DEPLOYMENT, PLANNING, WORKFLOW, MCP_STACK, MANUAL_TESTING_CHECKLIST, MRC_PROJECT_CONTEXT)

**USER-GUIDE.md** (A14/S8/W4/U3) — **REWRITE.** The technician half survives: 9 inspection sections match verbatim (`TechnicianInspectionForm.tsx:119-131`), 30-second autosave confirmed (`:4386-4390` — `setInterval(..., 30000)`), 48-hour reminder confirmed (`20260218000001_add_reminder_scheduled_for.sql:14`), offline photo queue and 1600px/0.85 compression confirmed (`photoResizer.ts:1-2`), PWA install confirmed (`vite.config.ts:24-26`). WRONG: Jobs tabs "Today/This Week/This Month/Upcoming/Completed" — actual tabs are Today, This Week, This Month, **Overdue**, **Pending Review**, **All** (`TechnicianJobs.tsx:26-33`); "lead automatically moves to Closed after sending report" — it moves to `inspection_email_approval` → `job_waiting` (`statusFlow.ts:2-18`). STALE [PENDING-PR72]: pipeline ends at 7 statuses; dashboard shows 4 metrics (now 6 KPI cards incl. Pending Reviews and Overdue Invoices, `AdminDashboard.tsx:139-203`).

**DEVELOPER-GUIDE.md** (A17/S9/W7/U1) — **REWRITE.** WRONG and day-one-dangerous: documents an `AppLayout` routing architecture that does not exist — `ls src/components/layout` → no such directory; `grep -rn "AppLayout" src/App.tsx` matches only comments saying "no AppLayout"; the doc's route-adding example (:176-182) would not compile. Real pattern is `ProtectedRoute > RoleProtectedRoute > Page` (`App.tsx:97-108`). Also WRONG: test example `calculateDewPoint(25, 0) < -40` — code returns 0 for humidity ≤ 0 (`inspectionUtils.ts:21`). STALE: "9 Edge Functions" (14), scripts table (`dev` is `vite`, not `vite --host`; omits typecheck/build:dev/preview-emails, `package.json:7-16`), "no server-side PDF" — `vercel.json:4-8` declares `api/render-pdf.ts` (1024 MB, 60 s). Its own "No select('*')" standard is violated in 10 files (grep-confirmed). Conventions/testing sections carry over fine.

**TROUBLESHOOTING.md** (A15/S5/W3/U9) — **MERGE** into a maintained troubleshooting section. WRONG: "Dehumidifier $132/day" (:153) vs `pricing.ts:28` ($119, and HEPA $100 missing); status `contacted` doesn't exist (`statusFlow.ts:2-18`); **:300 gives the developer's personal mobile (0433 880 403, `HelpSupport.tsx:11-13` "Developer contact — HARDCODED") as the business/operations phone — business line is 1800 954 117 (`notifications.ts:161,214,283`)**. STALE: bare `curl` of send-inspection-reminder won't authenticate since `20260601120000_fix_cron_auth_headers.sql`. The debugging methodology, status-code tables, and dew-point explanation verify clean.

**RUNBOOK.md** (A9/S4/W1/U14) — **MERGE.** Daily-check SQL verifies against schema (terminal-status set exactly matches `statusFlow.ts:215-217`); Storage bucket names match EF code (`generate-inspection-pdf/index.ts:12,1885,2005`). STALE: documents an inspection-only system — no coverage of the `check-overdue-invoices` cron [PENDING-PR72], `invoices` table checks, or the second PDF-version table (`job_completion_pdf_versions`, `types.ts:937`); PDF-cleanup guidance would miss it. Caveat found: the repo template is `inspection-report-template.html`, but the EF fetches `inspection-report-template-final.html` from Storage — re-upload from repo is not byte-identical restore (:256 claim is partial). Monitoring thresholds/backup-plan claims are UNVERIFIED (live dashboard state).

**DEPLOYMENT.md** (A16/S5/W1/U11) — **KEEP with edits.** Process and branch strategy sound. WRONG: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=…` (:77) — `SUPABASE_*` is a reserved prefix auto-injected by the platform; the command is rejected. STALE: deploys 9 of 14 EFs; env table omits `VITE_SENTRY_DSN`; EF-secrets table omits `ADMIN_FALLBACK_EMAIL`, `ADMIN_SEED_PASSWORD`, `INTERNAL_WEBHOOK_SECRET`, `SYSTEM_USER_UUID`; no mention of `api/render-pdf.ts` (`vercel.json:4-8`).

**PLANNING.md** (A12/S9/W3/U6) — **ARCHIVE.** WRONG: points readers at `context/PRD.md` / `context/TODO.md` — `ls context` → no such directory; lists `calendar_events` (real table is `calendar_bookings`, `types.ts:209`); says reminders are 24 hr (48 hr per `20260218000001:14`). Its "Next Major Feature: Job Completion" shipped long ago (`JobCompletionForm.tsx`, `App.tsx:366`).

**WORKFLOW.md** (A8/S3/W1/U12) — **ARCHIVE.** Frozen session log 4 months behind HEAD (`d49ba8b`, PR #75); internally contradictory ("dropped 9 tables" then lists 12; `invoices` listed as dropped but is back and central, `types.ts:823`); "removed developer role" contradicted by `types.ts:1784`. Git log is the authoritative record.

**MCP_STACK.md** (A14/S3/W1/U8) — **KEEP with edits.** Best-aged evergreen doc: all 7 `.mcp.json` servers still match config exactly (grep-confirmed). Gaps: omits GitNexus (now central to the workflow) and the `.claude/hooks/block-supabase-mcp-writes.sh` guard that directly constrains the Supabase MCP it documents as write-capable. Note: the Resend MCP `SENDER_EMAIL_ADDRESS: admin@mrcsystem.com` is MCP-test-only — that address appears nowhere in app code.

**MANUAL_TESTING_CHECKLIST.md** (A31/S6/W7/U9) — **KEEP with edits** (highest-value operational doc found). The Phase-2 half is impressively current: 6 KPI cards, KPI click-through targets, `?status=` deep links, Melbourne-local timestamps all verify [PENDING-PR72] (`AdminDashboard.tsx:139-203, 171-197`; `LeadsManagement.tsx:145-159`; `dateUtils.ts:1-59`). WRONG: describes the *inspection* form as "10 sections" with titles that actually belong to the *job-completion* form; equipment rates "132/46/75/5" vs actual 119/46/100/5 (`pricing.ts:28-31`, consumed at `Section7Equipment.tsx:424-463`); jobs tabs "Revisions/Upcoming/Completed" vs actual (`TechnicianJobs.tsx:26-33`); "IndexedDB persistence" for job completion — it's localStorage (`useJobCompletionForm.ts:374-423`), Dexie has no jobCompletionDrafts store (`db.ts:12-24`). Also stale: job numbering is now DB-side (`20260802120000_sequential_job_and_inspection_numbers.sql`; `grep -rn "generateJobNumber" src supabase` → no output).

**MRC_PROJECT_CONTEXT.md** (A38/S21/W9/U7) — **REWRITE (highest-severity finding of the audit).** This file is explicitly written to be loaded as AI-assistant context, and its "SACRED" Business Rules section is wrong on every load-bearing number: labour rates $612.00/$1,216.99 (non-demo), $711.90/$1,798.90 (demo), $900.00/$2,334.69 (subfloor) — actual are 1019.40/1245.33, 1062.00/1825.87, 1322.62/2375.21 (`pricing.ts:20-23`); a five-tier volume-discount model with a 0.87 multiplier that does not exist anywhere in the repo (`grep -rn "0\.87" src supabase` → 0 hits; `discountPercent` hardcoded 0 at `pricing.ts:462`); dehumidifier $132 (actual 119). Also WRONG: `/lead/new/:id` route and `NewLeadView` component both gone (`grep -rn "NewLeadView" src` → no output); `generateJobNumber()` doesn't exist. STALE: "22 tables" (29+1), "10 EFs" (14), "Phase 2 IN PROGRESS" (shipped), 7-status flow (16), Dexie 3 stores (4). Its meta-inventory of `.claude/` agents/rules/skills verifies clean.

### 2c. Pricing / business docs, team-facing HTML, and CLAUDE.md

**CLAUDE.md** (repo root; A11/S5/W3/U2) — **REWRITE (targeted).** ACCURATE: all four equipment rates (`pricing.ts:28-31`), GST 10% (:49), commands block (`package.json:7-10`), 30-second autosave. WRONG: "13% discount cap (**0.87 multiplier**)" (:42, :124) — the cap is real (`pricing.ts:55`, `invoices.ts:103-108`, DB CHECK `20260414000004:46`) but **no 0.87 multiplier exists anywhere** (`grep -rn "0\.87" src supabase` → exit 1) and there is no automatic discount (`pricing.ts:462` returns `discountPercent: 0` unconditionally); "/src/auth" directory (:31, :107) — `ls src/auth` → no such directory, auth lives at `src/contexts/AuthContext.tsx`. STALE: "12 Edge Functions" (14); "22 tables" (not repo-supportable; migrations CREATE 41 names, types.ts has 29+1); "Current State (May 2026)" block predates the June–August waves; "/src/components — UI only, no business logic" (Section7Equipment computes subtotals); "/src/lib — Supabase client + utils" (it's the whole business-logic layer).

**COST_CALCULATION_SYSTEM.md** (A9/S12/W4) — **ARCHIVE.** Its 2026-07-28 SUPERSEDED banner is honest and correctly self-diagnoses the body: "Rule 1: pro-rate under 2 hours" is WRONG (flat 2-hour minimum, `pricing.ts:83-86`); the volume-discount system with `DISCOUNT_TIERS`/`calculateDiscount()`/`getDiscountTierDescription()` exports is WRONG — none of those symbols exist (grep → 0 hits); all worked examples use pre-June rates. The waste anchors, interpolation band, and equipment model verify ACCURATE but are duplicated (accurately) in PRICING_AND_PROCESS_GUIDE.html.

**BUSINESS_LOGIC_PROMPT.md** (A8/S11/W3) — **REWRITE URGENT or ARCHIVE — highest-risk doc in this group.** It is an LLM system prompt commanding the model to answer *only* from its embedded reference "with EXACT figures", it has **no superseded banner**, and that reference contains: all six labour tier rates wrong (:68-70 vs `pricing.ts:20-23`); the retired volume-discount ladder (:105-111); "Dehumidifier $132/day" (:135, actual 119); "AFD $75 provisional… bills at $0 today" (:138-142 — HEPA is $100 and billed, `invoices.ts:828-829`); "waste recorded as Small/Medium/Large… not charged" (:148 — waste is priced by m³ and billed, `pricing.ts:36-46`). The parts that verify (2-hour minimum, GST ordering, booking rules, no-offline behaviour, caption gating) show the format works — the reference block just needs swapping for PRICING_AND_PROCESS_GUIDE content.

**BUSINESS_LOGIC.html** (A19/S2/W0/U1) — **KEEP with 3 fixes.** Best long-form doc: full 18-figure rate card matches `pricing.ts:20-23`; worked example recomputes exactly ($5,105.31 incl. the $464.119→$464.12 rounding); discount-retirement, 13% double-enforcement, waste schedule, booking rules all verify. STALE: ":729/:925 HEPA is not in the up-front quote" — it now is (`TechnicianInspectionForm.tsx:2160-2200, 2306-2307`; `pricing.ts:238-244`); ":914 sender switch must wait for domain verification" — already switched in code (`send-email/index.ts:203,207`). One dangling cross-reference to a "How It Works" guide that doesn't exist under that name.

**PRICING_AND_PROCESS_GUIDE.html** (A16/S0/W0/U1) — **KEEP — promote to canonical.** The single most accurate doc in the entire set: every rate, band, day-rate decline, waste interpolation ($175/$400/$626.50 all recompute), HEPA auto-days behaviour (`Auto (N)` label at `TechnicianInspectionForm.tsx:2191-2200`), and manual-only 13% discount verified against code. Only unverified item: the invoice screen's side-by-side estimate/actual selector UI (:464). It already receives "current, verified reference" pointers from COST_CALCULATION_SYSTEM.md:13 and PRICING_AFD_FINDINGS.md:22.

**LAUNCH_WEEKEND_BRIEFING.html** (A7/S1/U3) — **ARCHIVE after launch.** Pricing narrative fully current; the data-safety claim about job-completion submit verifies (`useJobCompletionForm.ts:439-441, 496`). STALE: ":340 switch sending address" is framed as pending — it shipped in code. Time-boxed by design; durable content already lives in the pricing guide.

**MRC_FULL_WALKTHROUGH.html** (A12/S13/W8/U2) — **REWRITE (section-scoped, high priority).** Claims ":536 every quoted string was read out of the code" — no longer true (last commit 2026-04-28). WRONG: 7× "From: noreply@mrcsystem.com / Reply-to: admin@mrcsystem.com" in the notification map (:901-973 — grep → zero hits; actual `send-email/index.ts:203,207`); "AdminInvoiceHelper is dead code, safe to delete" (:2489, :3213 — routed live at `App.tsx:175`); "SMS button does nothing" (:2318 — implemented at `LeadDetail.tsx:746-748`); **":3214-3224 ship-ready DROP TABLE migration listing `pdf_versions` as unused — the table has 10 live callers** (`reportPipeline.ts:116,199`; `pdfGeneration.ts:224`; `ViewReportPDF.tsx:502,1311,1319`; `ReportVersionHistory.tsx:70`; `StalePdfBanner.tsx:36`; `InspectionReportHistory.tsx:48`; `generate-inspection-pdf/index.ts:2057`) — executing it would break report versioning**; "offline ✓ BUILT with photo queue + SyncManager" (:1386-1435 — infrastructure exists but is unwired: `grep -rn "queuePhotoOffline" src/` → only its definition, one test, one comment; live behaviour is refusal, `TechnicianInspectionForm.tsx:3698,4356`). STALE: old labour tiers/$132/volume-discount table (:1825-1855); "Twelve Edge Functions" (:2527); "31 routes" (:2434 — now 34); Waste S/M/L (:1326 — now m³); overdue milestones 15/22/29/30/60 [PENDING-PR72] (EF now `TIER_BOUNDARY_DAYS = [1,8,15,16,29]` + day-60 escalation, `check-overdue-invoices/index.ts:44-51`); "no dev Supabase project" P0 (:3159 — DEV exists). ACCURATE and worth preserving: the 9-section and 10-section form inventories, permission matrix, notification-event map structure, 13% double-enforcement, cron schedules, contact block (1800 954 117 / admin@mouldandrestoration.com.au = `NotFound.tsx:163`).

**mrc-system-overview.html** (A8/S2/W3/U1) — **KEEP with corrections** (or merge into the walkthrough). WRONG: "works offline at job sites… syncing automatically" (:301, :567 — forms refuse to save offline, and BUSINESS_LOGIC_PROMPT.md:185 states the opposite, correctly); "drag-to-reassign" on Schedule (:545 — `grep -rn "drag\|DndContext" src/pages/AdminSchedule.tsx src/components/schedule/` → no output). STALE: analytics KPI list (:548 vs `Reports.tsx:115-143`); screen list predates 4 shipped screens. The conceptual layers (roles, 9 business objects, lifecycle, 4 external services, 16 statuses) all verify.

**PRICING_AFD_FINDINGS.md** — **ARCHIVE.** Its 2026-08-02 SUPERSEDED banner is fully accurate (all 5 correction bullets independently verified); the body is correctly disowned. Rescue first: its two still-unapplied corrections to COST_CALCULATION_SYSTEM.md (pro-rate→flat-minimum at :67; equipment direct-total→qty×rate×days at :96) die with the archive unless the target doc is retired too (it should be).

### 2d. Specs, trackers, runbooks, PR bodies

**PRD.md** (A6/S9/W5/U1) — **REWRITE.** WRONG: labour rates $612.00/$1,216.99 etc. (:343-346 vs `pricing.ts:20-23`); the 0.925/0.87 volume-discount ladder (:350-351, :755-759 — `pricing.ts:462` unconditional 0); kanban drag-and-drop (:670 — no dnd library hit in LeadsManagement); an entire "Settings — Editable Pricing" feature (:840-867) that does not exist (`Settings.tsx` sections are Account/User Management/Support/Danger Zone only, `:141-234`); `context/TODO.md` references (`ls context` → no such directory). ACCURATE: the three equipment rates it lists, GST. STALE: 12-stage pipeline (16), 10-step inspection (9 + separate AI review page), waste S/M/L, localStorage key name, "Phase 2 next" framing.

**JOB_COMPLETION_PRD.md** (A4/S4/U1) — **ARCHIVE.** Spec matches what shipped (10 sections verified); but the "DRAFT — Pending Michael's Review" header on a live feature is the one thing a reader acts on, and it's wrong. AFD naming superseded (HEPA rename migration `20260624150000`; column rename still parked as `.PENDING`).

**JOB_COMPLETION_PLAN.md** (A3/S5/W1) — **ARCHIVE.** Its only live value: two planned tasks that silently never happened — `jobCompletionDrafts` Dexie store (v2 added `quarantinedPhotos` instead, `db.ts:19-24`) and `jobCompletionSchema.ts` (`ls src/lib/schemas/` → only inspectionSchema.ts) — both already tracked in TODO.md:860-861. WRONG-superseded: "recreate invoices table" (PHASE_2D doc: "KEEP, NEVER recreate").

**PHASE_2_EXECUTION.md** (A5/S8/W1/U1) — **ARCHIVE.** The "**Status: PENDING REVIEW — Do NOT implement until Michael approves**" header (:5) is actively hazardous on a shipped feature. "10 Edge Functions" (14), "7 statuses" (16), "21 tables", form "3779 lines" (now 4798) all stale.

**PHASE_2D_INVOICE_TODO.md** (A7/S5) — **ARCHIVE.** Its "what exists" audit still verifies; its "genuinely missing" list is 100 % obsolete — every item shipped (penaltyLadder.ts, PenaltyLadderWidget.tsx, Xero stub columns `20260623165447:14-18`, AdminInvoiceHelper + route `App.tsx:175`, `useOverdueInvoices` at `usePaymentTracking.ts:101`). Fully superseded by XERO_INTEGRATION_HANDOFF.md.

**PDF_PIPELINE_PLAN.md** (A4/S3/U3) — **ARCHIVE.** Phase-2 hardening verifiably in the tree (`api/render-pdf.ts:66-69` — service-role key intentionally removed); "single Supabase project until L4" and "apply approval pending" framing 2.5 months stale.

**TODO.md** (A12/S7/W3/U5, open items only) — **REWRITE (close the dead items).** The headline envelope-layer item (:38-51, :1059, :12-13) is WRONG in full: `grep -rn "noreply@" src supabase` → exit 1; all six cited line numbers point at unrelated code today (e.g. `receive-framer-lead:354` is a CSS rule; the failure alert actually at `:416` sends from `admin@mouldandrestoration.com.au`); envelope and footer now agree. The `ADMIN_FALLBACK_EMAIL` item is WRONG on both facts (consumer at `:410` not `:354`; fallback is `admin@mouldandrestoration.com.au` not `admin@mrcsystem.com` — the warned-about failure mode no longer exists, though the secret's PROD state stays UNVERIFIED). ":862 PRD/CLAUDE.md say $132" — both now say $119; ":755 australian-compliance.md says $132" — fixed in `dc17242`. Still ACCURATE and open: `seed-admin/index.ts:50` = `admin@mrc.com.au`; no `jobCompletionDrafts` store; no `jobCompletionSchema.ts`; 14-day term hardcoded ×3; `interpolateCost`/`formatPercent` dead-export findings; the PARKED per-item-equipment-days item's pricing anchors (`pricing.ts:234-244`) — though its TIF line refs drifted (file now 4798 lines). Stale internal contradiction: L4 "Phase 1 NEXT" three lines below the note that DEV already exists; "deploy 12 EFs" (14); "production @ 9fdc853" (actual `3d1d1e5`).

**PRODUCTION_MERGE_RUNBOOK.md** (A10/S4/W1/U5) — **KEEP + Stage-1-complete banner.** Every repo-checkable precondition verified clean (no migrations, no sacred surfaces, no template changes, check-overdue-invoices diff empty, batch counts 12/9/11 reproduce). Stage 1 already executed — main @ `d49ba8b` carries all three batches (PR #73, #75; batch-b transitively, no PR #74), so re-running Stage 1 as written would fail; Stages 2-5 remain live and outstanding (`production` still @ `3d1d1e5`). One WRONG line: ":231 the sender stays noreply@mrcsystem.com" — untrue for Edge Functions (only possibly true of Supabase Auth SMTP config, which is UNVERIFIED live state).

**INVOICE_INTEGRITY_RUNBOOK.md** (A5/U8) — **KEEP.** Best-constructed runbook in the set: the migration body it embeds is byte-for-byte `20260729153000_invoice_totals_integrity_checks.sql:63-78`; the defect-source narrative verifies (`handleCreate` gone from InvoicePaymentCard); everything live-DB is honestly framed as expectations-to-check. Apply state UNVERIFIED; TODO.md:359 still shows the run pending (gated on today's 4 Aug digest).

**KEY_ROTATION.md** (A9/S3/W1/U4) — **KEEP with 3 fixes.** Git-exposure forensics reproduce exactly (all four `.env` SHAs with matching A/M/M/D status; `.mcp.json` never committed). Fix: Sentry DSN line refs (actual `sentry.ts:13,18`); add `fetch-resend-email` as a 4th RESEND_API_KEY consumer; correct the `ADMIN_FALLBACK_EMAIL` row.

**L4-environment-separation-plan.md** (A3/S6/U2) — **ARCHIVE.** Goal achieved 2026-07-07 by a different route (restore-to-new-project); "88 migrations" → 113 on disk; "12 EFs" → 14.

**PRE_MERGE_TESTING_CHECKLIST.md** (A8/S5/U7) — **MERGE.** §3's manual 375px/UI assertions and rate checks remain valid and untick'd [several PENDING-PR72]; §5's rollout sequence is superseded by PRODUCTION_MERGE_RUNBOOK. Test-count claim superseded (346→496/496 across 33 files, grep-confirmed 33 test files, 60 pricing tests).

**PRELAUNCH_AUDIT_2026-07-08.md** (A4/S4/W1/U3) — **ARCHIVE.** Its two top findings are closed in-repo without the doc saying so: #1 job-completion silent-save — `useJobCompletionForm.ts:334-336` now re-throws; #2 anon-EXECUTE on audit RPCs — revoked next day (`20260709120000:55-56`). Residual truth it found: `XERO_INTEGRATION_HANDOFF.md` still carries $132.

**LAUNCH_TESTING_FINDINGS.md** (A11/S4/U6) — **KEEP + add resolution markers.** Self-correcting log; but the Step-1 HIGH issues at the top (Google-review-link-in-every-email) were fixed by batch A (`notifications.ts:170-172` footer now confidentiality-only; review link only in the dedicated builder at `:453`) without a status line, so the doc's top reads as open. Line refs drifted post-batch-C throughout.

**pr-batch-a/b/c.md** — **ARCHIVE ×3.** Merged-PR bodies; commit counts reproduce (12/9/11 — batch-c's "10" heading is self-contradicted by its own note and the runbook; 11 is right). Batch-b's "create after batch A merges" describes a process that was bypassed (no PR #74; transitive merge).

**XERO_INTEGRATION_HANDOFF.md** (A10/S3/W2/U2) — **KEEP with rate fix.** Strongest Phase 2D/2F inventory — every file, migration, and test count verifies (35 penalty-ladder tests, Xero stub columns, route). But it is now the **last home of the $132 dehumidifier** (:73, :201) and the retired volume-discount framing (:72); its "payment terms 7/14/30/60" claim is contradicted by the three hardcoded `defaultDueDate(14)` sites.

### 2e. Historical / diagnostic / testing artifacts (light-touch verification)

These 27 files are point-in-time investigations, gates, or test records. Verdict pattern: nearly all self-identify as point-in-time, most are fully executed/superseded, and none should be read as current state. Highlights (full dispositions in §6):

- **inspection-workflow-fix-plan-v2** — the most dangerous "looks live, isn't": reads as a 48-stage roadmap with no completion banner while ~60 % executed (Phase 3/4 migrations `20260501132838`…`20260510070000` shipped). Its Decision #4 (pricing constants removed after Stage 7.5) is NOT done — constants still live in `pricing.ts`.
- **stage-4.3-consumer-audit** — inverse problem: all 12 gate boxes unticked and reviewer line still `YYYY-MM-DD`, yet the work shipped (`20260510070000_phase4_stage_4_3_soft_delete_photos.sql`; `photoUpload.ts:341`). Reads as "blocked" when done.
- **lead-detail-diagnosis** — headline now false: `customer_preferred_date`/`customer_preferred_time` columns exist (`types.ts:1247`, consumed at `useLeadsToSchedule.ts:69-70`).
- **morning-bugs-diagnosis, inline-edit-diagnosis, schedule-consolidation-diagnosis, internal-notes-loss-diagnosis, stage-1.4-callsite-catalog, stage-3.5-consumer-audit, AI_SUMMARY_INPUT_AUDIT, BACKUP_TABLE_CLEANUP, inspection-workflow-audit + fix-plan v1, end-to-end-test-plan, phase-2-verification-matrix** — all executed/closed/superseded; anchor files deleted or line numbers drifted throughout. ARCHIVE.
- **SUPABASE_ADVISOR_AUDIT** — 2 of its 4 shortlist items fixed next-day (migrations `20260708120000`, `20260709120000`); items 2 (`webhook_submissions` `WITH CHECK (true)`) and 3 (`inspection-reports` public-bucket listing) have **no remediation migration found** — still-open candidates to rescue into the live backlog.
- **PRE_HANDOVER_AUDIT** — 2 of 5 HIGH items fixed (double-payment guard now at `invoices.ts:622`; `generate_invoice_number` hardened by `20260421000001`); H2 (in-memory rate limiter resets on cold start, `send-email/index.ts:15`) still ACCURATE and open.
- **docs/pdf-report/** — README's "13-page report awaiting integration" is WRONG: live pipeline is the EF + `src/templates/inspection-report-template.html`; the backup template differs from the live one (`cmp` → different, 919 vs 787 lines); DATA-REQUIREMENTS maps to tables/columns that don't exist (`inspection_photos`, `quotes`, `leads.first_name` — real: `photos`, `full_name`; grep-confirmed). ARCHIVE/DELETE candidates.
- **docs/pdf-reference/** — generic vendored PDF-skill material; zero inbound references (`grep -rn "pdf-reference"` across code/docs/config → no output); references Python scripts that don't exist in this repo. DELETE candidate.
- **docs/testing/** — 8 files, all commit-pinned to May 2026 states (`8238d9c` era, ~18 PRs behind). `section9_verification` asserts the retired 0.87-multiplier tier model as its expected math — do not use for pricing ground truth. **Real PII across at least 5 files** (names, phone, email, street address, 1 MB Slack screenshot). ARCHIVE, with a separate PII decision.
- **docs/verification/launch-checks-VERIFY.md [PENDING-PR72]** — KEEP short-term: all five cited commits are now in main's history (`91dd58f`, `396ca9c`, `0ee439e`, `b4d4cc3`, `d50b117`), so its "branch pending" framing is stale, but it is the only record of what PR #72 still needs verified on PROD; its Item 1 PASS values self-expired on 4 Aug per its own note.
- **email-previews/README.md** — the one non-point-in-time file in this group and it verifies: `preview-emails` script exists (`package.json:16`), all 7 builder functions found (`notifications.ts:101-446`; `receive-framer-lead/index.ts:284`; `send-inspection-reminder/index.ts:113`), gitignore rule confirmed (`.gitignore:53-54`). KEEP; line-number anchors drifted 13–26 lines.
- **phase-2-verification-helpers.sql** — genuinely re-runnable BEGIN/ROLLBACK test tool; KEEP as a tool (relocate out of docs/ prose).

---

## 3. In-flight areas — [PENDING-PR72] rollup

Per instructions, claims touching the PR #72 surfaces were tagged, not classified. Note: repo evidence shows PR #72's code is already **on main** (merge `8fe47e9`, 2026-07-30, per `PRODUCTION_MERGE_RUNBOOK.md:43-44` and git history) but **not yet on `production`** (still `3d1d1e5`) — so "mid-merge" here means mid-way to the production branch, and these docs may resolve to plainly ACCURATE or STALE once it ships and the PROD pass in `docs/verification/launch-checks-VERIFY.md` is run.

- **Admin dashboard stats:** `USER-GUIDE.md:153-158, 168-176` (4 metrics vs 6 KPI cards); `mrc-system-overview.html:536`; `MANUAL_TESTING_CHECKLIST.md:71, 322-340` (labels, KPI click-throughs — these verify against current code); `MRC_FULL_WALKTHROUGH.html:1574-1630`.
- **Melbourne-local dates:** `MANUAL_TESTING_CHECKLIST.md:337` (verifies vs `dateUtils.ts:1-59`); `PRE_MERGE_TESTING_CHECKLIST.md:157-179`.
- **`check-overdue-invoices` behaviour:** `MRC_FULL_WALKTHROUGH.html:1929, 2122, 2612` (old 15/22/29/30/60 milestones vs `TIER_BOUNDARY_DAYS = [1,8,15,16,29]` + day-60 escalation, `check-overdue-invoices/index.ts:44-51`); `RUNBOOK.md`'s cron omission; TODO.md's double-fire/DST/viewed-status residuals.
- **Pipeline tab ordering:** `docs/verification/launch-checks-VERIFY.md` (commit `d50b117` in main); `MRC_FULL_WALKTHROUGH.html:1644`.
- **`?status=` deep links:** `MANUAL_TESTING_CHECKLIST.md:72` (verifies vs `LeadsManagement.tsx:145-159`).
- **Settings logout cleanup:** `AUTH-PROFILE-DOCUMENTATION.md` Settings section; `b4d4cc3` in main removes "Log out from ALL devices" from Settings (capability stays on Profile).

---

## 4. Gap analysis — what is documented NOWHERE

Derived from actual user-facing surfaces in code (routes in `src/App.tsx`, the two forms, the admin flows). "Escalation" = why its absence forces a text/call to Michael.

| # | Surface (code evidence) | Who needs it | Gap and escalation consequence |
|---|---|---|---|
| G1 | **Job completion form — 10 sections** (`src/components/job-completion/`, route `App.tsx:366`) | TECHNICIAN | No user-facing how-to exists anywhere. JOB_COMPLETION_PRD is a spec; USER-GUIDE predates Phase 2. First time Glen/Clayton hit the WasteCard confirm/override, quoted-vs-actual amber highlights, or the request-review toggle, their only recourse is Michael. |
| G2 | **Admin review→approve→send flow** (`InspectionAIReview` route `App.tsx:159`; `ViewReportPDF` ×3 routes; hard-save pipeline `api/render-pdf.ts`; `ReportVersionHistory.tsx`; `StalePdfBanner.tsx`) | ADMIN | The most consequential admin flow (customer-visible PDF + email) has zero operator documentation: what "PDF is stale" means, when regeneration is needed, what the html_hash mismatch guard blocks and why. Every banner sighting is an escalation. |
| G3 | **Invoice helper** (`AdminInvoiceHelper` route `App.tsx:175`; manual 13% clamp `invoices.ts:103-108`; mark sent/paid; penalty ladder `penaltyLadder.ts`) | ADMIN | XERO_INTEGRATION_HANDOFF is developer-facing (and carries the wrong rate). No operator guide covers when to bill estimate vs actual, that discounts are manual-only now, that marking sent restarts the 14-day clock (`invoices.ts:585`), or what the Slack overdue digest means. |
| G4 | **Offline truth** (forms refuse offline save: `TechnicianInspectionForm.tsx:4356`; localStorage crash backup `mrc_inspection_backup_*` `:4395`; photo refusal `:3698`; `QuarantinedPhotosBanner.tsx`) | TECHNICIAN | Two docs claim the app works offline (`mrc-system-overview.html:301,567`; walkthrough §2.6); it does not. A tech in a black spot has no documented procedure (what survives, what is lost, what the banner means) — data loss gets attributed to "the app" and escalated after the fact. |
| G5 | **pending_review / send-back loop** (`pending_review` status `statusFlow.ts:11`; jobs tab `TechnicianJobs.tsx:26-33`) | TECH + ADMIN | Nothing tells a tech what happens after toggling "request review", or an admin how to send back and what the technician sees. Each round-trip is negotiated over the phone. |
| G6 | **Google review + STOP handling** (`buildGoogleReviewEmailHtml` `notifications.ts:446`; no STOP parser exists) | ADMIN | Documented only inside TODO.md's team-guide notes — not in any doc a team member would be given. An unhonoured opt-out is a compliance risk; admin must know handling is manual. |
| G7 | **Starting-address dropdown requirement** (`Profile.tsx:218-231` auth-metadata write; AddressAutocomplete commits only on select) | TECHNICIAN | Documented only inside TODO.md. Typing without selecting silently fails to save; travel-time estimates degrade and the eventual symptom lands on Michael. |
| G8 | **Customer reply / Sent-folder model** (Reply-To `admin@mouldandrestoration.com.au` `send-email/index.ts:207`; no Sent copies) | ADMIN | TODO.md pending-decision only. Admin sees replies without the outbound message; unexplained, this reads as "email is broken". |
| G9 | **Login help with correct contacts** (public routes `App.tsx:91-93`; business line 1800 954 117 `NotFound.tsx:163`) | TECH + ADMIN | TROUBLESHOOTING has the flow but misroutes the operations line to the developer's personal mobile (`HelpSupport.tsx:12`). |
| G10 | **PWA install + update behaviour** (`vite.config.ts:20-32`, autoUpdate + skipWaiting) | TECHNICIAN | USER-GUIDE covers install (Feb 2026); nothing explains auto-update (why the app "changed overnight"). |
| G11 | **Booking/schedule operations** (7:00–19:00 hourly slots `bookingService.ts:397-411`; 30 min–8 h / 15-min steps `LeadBookingCard.tsx:1050-1052`; travel-time EF + postcode fallback) | ADMIN | Rules live only in BUSINESS_LOGIC.html §7 (accurate); travel-time failure modes and multi-day booking spans are documented nowhere operator-facing. |
| G12 | **New-developer onboarding that is safe to trust** | DEVELOPER | The three docs a new dev reads first (MRC_PROJECT_CONTEXT, DEVELOPER-GUIDE, PLANNING) contain respectively wrong sacred pricing, a fictitious routing architecture, and pointers to a nonexistent `context/` dir. Day-one work requires Michael's live supervision. |
| G13 | **Who to call, for what** (contacts scattered: dev line `HelpSupport.tsx:11-14`; business 1800 954 117; admin@) | ALL | No single escalation table (app bug vs business question vs customer complaint). Everything defaults to Michael. |

---

## 5. Overlap map — duplications and contradictions

### Contradictions (priority findings)

| # | Contradiction | Source A | Source B / code truth |
|---|---|---|---|
| C1 | Live email sender | `TODO.md:38-51` "still sends from noreply@mrcsystem.com"; `API.md:39`; `API_AUDIT.md:42-43`; `NOTIFICATIONS-AND-TRIGGERS.md:184-186`; walkthrough `:901-973` (7×); `PRODUCTION_MERGE_RUNBOOK.md:231` | Code: `send-email/index.ts:203,207` = `admin@mouldandrestoration.com.au`; `grep -rn "noreply@" src supabase` → 0 hits. `BUSINESS_LOGIC.html:914` and `LAUNCH_WEEKEND_BRIEFING.html:340` frame the switch as pending — also superseded. |
| C2 | Pricing model (labour rates + volume discount) | `MRC_PROJECT_CONTEXT.md:496-509`; `PRD.md:343-351,755-759`; `BUSINESS_LOGIC_PROMPT.md:68-70,105-111`; walkthrough `:1825-1855`; COST_CALCULATION_SYSTEM body; `XERO_INTEGRATION_HANDOFF.md:72` | `pricing.ts:20-23` (1019.40/1245.33 …), `:462` (`discountPercent: 0`); correctly stated in `PRICING_AND_PROCESS_GUIDE.html:291-305` and `BUSINESS_LOGIC.html:571-590` |
| C3 | "0.87 multiplier" | `CLAUDE.md:42,124`; `COST_CALCULATION_SYSTEM.md:169,191,451`; `PRICING_AFD_FINDINGS.md:87`; `docs/testing/section9_verification_*.md` | `grep -rn "0\.87" src supabase` → exit 1. The cap exists only as `MAX_DISCOUNT = 0.13` + clamp (`invoices.ts:103-108`) + DB CHECK (`20260414000004:46`) |
| C4 | Dehumidifier rate | $132: `BUSINESS_LOGIC_PROMPT.md:135`; walkthrough `:1835`; `XERO_INTEGRATION_HANDOFF.md:73,201`; `TROUBLESHOOTING.md:154`; `MANUAL_TESTING_CHECKLIST.md:214`; `MRC_PROJECT_CONTEXT.md:507`; `API.md:620` | `pricing.ts:28` = 119; `equipmentRateDrift.test.ts` pins it; 3 docs explicitly retire $132 (`BUSINESS_LOGIC.html:725` etc.) |
| C5 | HEPA on the inspection quote | `BUSINESS_LOGIC.html:729,925-926` (not in quote) | `PRICING_AND_PROCESS_GUIDE.html:461` (in quote) — code agrees with B: `TechnicianInspectionForm.tsx:2160-2200`, `pricing.ts:238-244` |
| C6 | Offline capability | `mrc-system-overview.html:301,567-568`; walkthrough `:1386-1435` ("✓ BUILT") | `BUSINESS_LOGIC_PROMPT.md:185` ("does not work offline") — code agrees with B: `TechnicianInspectionForm.tsx:4356`; `queuePhotoOffline` has zero component callers (grep-confirmed) |
| C7 | Edge Function count | 8 (`SECURITY-REMEDIATION-REPORT.md:277`), 9 (`DEVELOPER-GUIDE.md:69`), 10 (`SECURITY_AUDIT.md:107`, `PHASE_2_EXECUTION.md:83`, `MRC_PROJECT_CONTEXT.md:394`), 12 (`CLAUDE.md:37`, manifest `:3`, L4 `:32`, TODO `:1044`, walkthrough `:2527`) | Disk: 14 + `_shared` (`ls supabase/functions/`) |
| C8 | Table count | 16 (`PLANNING.md:36`), 21 (`PHASE_2_EXECUTION.md:44`), 22 (`API.md:436`, `CLAUDE.md:60`, `MRC_PROJECT_CONTEXT.md:416`, `SECURITY_AUDIT.md:252`), 23/31 (`database_technical_audit.md:3,20`), 38 (`SECURITY-REMEDIATION-REPORT.md:157`) | `types.ts`: 29 tables + 1 view (live DB UNVERIFIED) |
| C9 | Inspection form section count | 10 (`MANUAL_TESTING_CHECKLIST.md:133`, `MRC_PROJECT_CONTEXT.md:89,121,293`, `PRD.md:723`) | 9 (`TechnicianInspectionForm.tsx:119-131`); USER-GUIDE:99 and walkthrough `:1243-1366` are correct |
| C10 | Framer webhook rate limit | 5/hr (`FRAMER_WEBHOOK.md:15,63`; `WEBHOOK_STRESS_TEST.md:31,66`; `PLANNING.md:64`; `WORKFLOW.md:34`) | 100 (`receive-framer-lead/index.ts:19`, abandonment rationale `:14-18`) |
| C11 | AdminInvoiceHelper aliveness | Walkthrough `:2489,3213` "dead code; safe to delete" | Routed live (`App.tsx:175`); TODO.md's S3 correction agrees |
| C12 | manage-users attribution | `system-user-uuid.md:56` (reads SYSTEM_USER_UUID) | Manifest `:42` (does not) — grep on manage-users/index.ts confirms the manifest |
| C13 | Overdue milestones + first fee day [PENDING-PR72] | Walkthrough `:1051,2122` (Day 15 first $65 fee; 15/22/29/30/60) | `penaltyLadder.ts:18,77` ($65 from day 1); `check-overdue-invoices/index.ts:44-51` ([1,8,15,16,29] + 60) |
| C14 | Technician jobs tabs | `USER-GUIDE.md:70-75`, `MANUAL_TESTING_CHECKLIST.md:174,353` (Upcoming/Completed/Revisions) | `TechnicianJobs.tsx:26-33` (Today/This Week/This Month/Overdue/Pending Review/All) |
| C15 | Inspection duration | Email preview 01: "max 1 hour" | `BUSINESS_LOGIC.html:774-778` / `LeadBookingCard.tsx:1050-1052` (30 min–8 h, default 60) |
| C16 | AFD billing | `BUSINESS_LOGIC_PROMPT.md:138-142` ("$75 provisional, bills $0") | `pricing.ts:30` + `invoices.ts:828-829` (HEPA $100, billed) |
| C17 | WORKFLOW.md self-contradiction | ":51 dropped 9 tables" vs its own 12-name list; `invoices` "dropped" | `types.ts:823` — invoices is live and central |
| C18 | profiles / user_roles existence | `AUTH-PROFILE-DOCUMENTATION.md:40-41,838` ("no profiles table; roles disabled") | `types.ts:1748,1985`; `20260209000000_restore_profiles.sql`; queried in AuthContext |
| C19 | TODO.md internal | ":1042 L4 Phase 1 NEXT: create dev project" | ":1041 (one line up): DEV project wired 2026-07-07" |
| C20 | pdf_versions disposability | Walkthrough `:3214-3224` ship-ready drop migration ("currently unused") | 10 live callers (§2c) — executing it breaks report versioning |

### Duplication clusters

- **Pricing rules ×7:** PRICING_AND_PROCESS_GUIDE.html (canonical-quality) · BUSINESS_LOGIC.html · BUSINESS_LOGIC_PROMPT.md · COST_CALCULATION_SYSTEM.md · walkthrough §3.6 · PRD pricing section · MRC_PROJECT_CONTEXT §12.
- **System tour ×2 (+1):** MRC_FULL_WALKTHROUGH.html (long) · mrc-system-overview.html (short) · the stale PDF twin.
- **Framer webhook ×3:** FRAMER_WEBHOOK.md · FRAMER_FIELD_MAPPING.md · WEBHOOK_STRESS_TEST.md.
- **Phase-2 "what shipped" ×4:** PHASE_2_EXECUTION · JOB_COMPLETION_PLAN · PHASE_2D_INVOICE_TODO · XERO_INTEGRATION_HANDOFF (the accurate one).
- **Secret inventory ×3:** KEY_ROTATION.md (best) · API_AUDIT.md · DEPLOYMENT.md secrets table.
- **Env-separation ×2:** L4 plan · TODO.md L4 section (which self-contradicts, C19).
- **Inspection fix-plan ×2:** v1 explicitly superseded by v2; both 1,000+ lines, both retained.
- **SYSTEM_USER_UUID ×2:** system-user-uuid.md · edge-function-attribution-manifest.md (they contradict, C12).

---

## 6. Proposal — ONE consolidated team-facing operations doc

### 6.1 Proposed structure: `docs/OPERATIONS_GUIDE.md` → rendered `OPERATIONS_GUIDE.html`

Working title **"MRC Operations Guide"** — one doc, three audience lanes (Field / Office / Everyone), every section stamped with a last-verified date + commit.

| § | Section | One-line purpose | Source map (existing docs that feed it) |
|---|---|---|---|
| 1 | What this system is | 5-minute orientation: roles, the 9 business objects, job lifecycle | mrc-system-overview.html (conceptual layers — verified sound) |
| 2 | Getting in | Login, PWA install/update, password reset, correct contact table (1800 954 117 / admin@ / dev line for app bugs only) | USER-GUIDE login+PWA (rewritten), TROUBLESHOOTING auth section (contacts fixed); closes G9, G10, G13 |
| 3 | The pipeline, in plain English | The 16 statuses as a story: who acts at each, what moves it forward, terminal states | statusFlow.ts (generated from code), walkthrough journeys (structure only), BUSINESS_LOGIC.html §6 |
| 4 | Field: inspection day | The 9 sections in order; photos + captions; autosave truth (30 s + localStorage backup); what offline actually does | USER-GUIDE tech half (rewritten), BUSINESS_LOGIC.html §§8-9, walkthrough §2 skeleton; closes G4 |
| 5 | Field: job completion day | The 10 sections; quoted-vs-actual equipment; WasteCard confirm/override; request-review loop | JOB_COMPLETION_PRD behaviour (verified against code), LAUNCH_TESTING_FINDINGS step 6; closes G1, G5 |
| 6 | Office: booking & schedule | Booking rules (hours, durations, two techs), travel time + fallback, starting-address dropdown rule | BUSINESS_LOGIC.html §7 (verified accurate), TODO.md team-guide notes; closes G7, G11 |
| 7 | Office: review, report, send | AI review + regenerate-with-feedback, PDF approve/hard-save, version history, stale-PDF banner, mismatch guard | No existing source — write from code + PDF pipeline outcome notes; closes G2 |
| 8 | Office: invoicing & payment | Invoice helper walk-through, manual 13% cap, estimate-vs-actual, mark sent (14-day clock restart), mark paid, overdue digest + penalty ladder + warranty ladder | XERO_INTEGRATION_HANDOFF (rates fixed), penaltyLadder.ts, INVOICE_INTEGRITY_RUNBOOK context; closes G3 |
| 9 | Pricing reference | The rate card, day-rate decline, waste schedule, GST, discount rules | **PRICING_AND_PROCESS_GUIDE.html content verbatim** (verified 16/17 — canonical) + BUSINESS_LOGIC.html worked example |
| 10 | Email & notifications | What customers receive and when; sender/reply-to reality; replies land in admin inbox; no Sent copies (and why); review-STOP is manual | Walkthrough §4 notification map (senders corrected), email-previews README, TODO.md team-guide notes; closes G6, G8 |
| 11 | When things go wrong | Symptom → meaning → who acts → escalation table; offline black-spot procedure; PDF/email failures | Walkthrough §5 (verified skeleton), TROUBLESHOOTING (methodology kept, facts fixed), RUNBOOK daily checks |
| 12 | Glossary | HEPA/AFD, subfloor, SWMS, statuses, "hard save", quarantine | Walkthrough §12 + the AFD=HEPA note from PRICING_AFD_FINDINGS' banner |

Explicitly **out of scope** (stays developer-side): deployment, key rotation, migrations, MCP stack, EF attribution/audit canon. Those keep their own KEEP-rated docs.

### 6.2 Disposition table — every doc in docs/ (+ CLAUDE.md)

"ARCHIVE" = move under `docs/_archive/` with an as-of banner. **No file was moved by this audit — this table is the proposal.**

| Doc | Disposition | One-line reason |
|---|---|---|
| PRICING_AND_PROCESS_GUIDE.html | **KEEP → canonical §9 source** | 16/17 verified, 0 stale — most accurate doc in the set |
| BUSINESS_LOGIC.html | **MERGE-INTO §§3,6,9** | 19/22 accurate; 3 known fixes (HEPA-on-quote ×2, sender note) |
| BUSINESS_LOGIC_PROMPT.md | **REWRITE (urgent)** | LLM prompt serving retired rates verbatim to staff; swap its reference block for §9 content |
| LAUNCH_WEEKEND_BRIEFING.html | **ARCHIVE** | Time-boxed launch artifact; durable content already in §9 sources |
| MRC_FULL_WALKTHROUGH.html | **MERGE-INTO §§3,4,5,10,11,12 then ARCHIVE** | The guide's skeleton; facts need regeneration (8 WRONG incl. the pdf_versions drop migration) |
| MRC_FULL_WALKTHROUGH.pdf | **ARCHIVE (delete ok)** | Stale twin of a stale doc |
| mrc-system-overview.html | **MERGE-INTO §1** | Conceptual layers verified; 3 capability claims wrong |
| COST_CALCULATION_SYSTEM.md | **ARCHIVE** | Self-declared superseded; surviving content duplicated accurately in §9 source |
| PRICING_AFD_FINDINGS.md | **ARCHIVE** | Banner-disowned; banner content → §12 glossary |
| USER-GUIDE.md | **MERGE-INTO §§2,4 then ARCHIVE** | Tech half salvageable; admin half predates Phase 2 |
| DEVELOPER-GUIDE.md | **REWRITE (dev-side)** | AppLayout fiction + stale tree; conventions survive |
| TROUBLESHOOTING.md | **MERGE-INTO §11** | Methodology good; rates/statuses/contacts wrong |
| RUNBOOK.md | **MERGE-INTO §11 + keep a dev-side ops annex** | Sound skeleton; missing the whole invoice surface |
| DEPLOYMENT.md | **KEEP (dev-side), edit** | Process sound; EF/env tables stale; 1 wrong command |
| MANUAL_TESTING_CHECKLIST.md | **KEEP (dev-side), edit** | Best test asset; 7 WRONG items to fix |
| MCP_STACK.md | **KEEP (dev-side), edit** | Matches .mcp.json; add GitNexus + write-block hook |
| MRC_PROJECT_CONTEXT.md | **REWRITE (dev/AI-side)** | Loaded as AI context with wrong "SACRED" pricing — highest blast radius |
| PLANNING.md | **ARCHIVE** | Superseded plan; wrong pointers |
| WORKFLOW.md | **ARCHIVE** | Frozen changelog; git log is authoritative |
| PRD.md | **REWRITE (spec-side)** | Vision survives; pricing/feature sections dangerous |
| JOB_COMPLETION_PRD.md | **ARCHIVE** (behaviour → §5) | Shipped spec wearing a DRAFT header |
| JOB_COMPLETION_PLAN.md | **ARCHIVE** | Its two never-done tasks already tracked in TODO.md:860-861 |
| PHASE_2_EXECUTION.md | **ARCHIVE** | "Do NOT implement" header on shipped work |
| PHASE_2D_INVOICE_TODO.md | **ARCHIVE** | 100 % superseded by XERO handoff |
| PDF_PIPELINE_PLAN.md | **ARCHIVE** | Outcome self-documented in api/render-pdf.ts:64-69 |
| TODO.md | **REWRITE (close dead items)** | Headline open item factually inverted; live items kept |
| PRODUCTION_MERGE_RUNBOOK.md | **KEEP + Stage-1-done banner** | Stages 2-5 are the live path to production |
| INVOICE_INTEGRITY_RUNBOOK.md | **KEEP** | Best-constructed runbook; still pending execution |
| KEY_ROTATION.md | **KEEP, 3 fixes** | Forensics reproduce exactly |
| L4-environment-separation-plan.md | **ARCHIVE** | Goal achieved 7 weeks ago by a different route |
| PRE_MERGE_TESTING_CHECKLIST.md | **MERGE-INTO PRODUCTION_MERGE_RUNBOOK Stage 5** | §3 checks live; §5 superseded |
| PRELAUNCH_AUDIT_2026-07-08.md | **ARCHIVE** | Both top findings closed in-repo |
| LAUNCH_TESTING_FINDINGS.md | **KEEP + resolution markers** | Live findings log; top items fixed but unmarked |
| pr-batch-a-templates-copy.md | **ARCHIVE** | Merged-PR body |
| pr-batch-b-ai-prompt.md | **ARCHIVE** | Merged-PR body (stacking bypassed) |
| pr-batch-c-forms-ui.md | **ARCHIVE** | Merged-PR body (heading says 10 commits; 11 is right) |
| XERO_INTEGRATION_HANDOFF.md | **KEEP (dev-side), rate fix → also feeds §8** | Best Phase 2D inventory; last home of $132 |
| API.md | **REWRITE (dev-side)** | Only the AI section is current |
| API_AUDIT.md | **ARCHIVE + as-of banner** | Two "Current"-tense claims now misleading |
| AUTH-PROFILE-DOCUMENTATION.md | **REWRITE (dev-side)** | Both foundational design claims inverted |
| NOTIFICATIONS-AND-TRIGGERS.md | **REWRITE (dev-side); §10 borrows its event map** | A third points at deleted files |
| edge-function-attribution-manifest.md | **KEEP, patch 12→14 + 2 Bucket-C rows** | Highest-accuracy dev doc |
| FRAMER_WEBHOOK.md | **KEEP, patch rate limit + postcode** | Most accurate integration doc |
| FRAMER_FIELD_MAPPING.md | **ARCHIVE** | One-off checklist; duplicates the webhook doc |
| system-user-uuid.md | **MERGE-INTO attribution manifest** | 2 WRONG consumer claims; UUID + rotation policy is the only unique content |
| data-model-invariants.md | **KEEP, refresh line refs** | Core invariant independently re-verified today |
| database_technical_audit.md | **ARCHIVE** | Banner contradicts body; counts stale |
| SECURITY_AUDIT.md | **ARCHIVE + REDACT tokens first** | Contains live-format secrets in a tracked file |
| SECURITY-REMEDIATION-REPORT.md | **ARCHIVE** | 38/38 RLS never reconcilable; the fixes it records stand |
| WEBHOOK_STRESS_TEST.md | **ARCHIVE** | v18 record; EF at v20 |
| AI_SUMMARY_INPUT_AUDIT.md | **ARCHIVE** | Research-only, anchors drifted |
| BACKUP_TABLE_CLEANUP.md | **ARCHIVE** | Self-marked COMPLETE |
| inline-edit-diagnosis.md | **ARCHIVE** | Recommendation implemented; anchor files deleted |
| inspection-workflow-audit-2026-04-30.md | **ARCHIVE** | Historical root of Phases 1-4 |
| inspection-workflow-fix-plan-2026-04-30.md (v1) | **ARCHIVE (delete ok)** | Explicitly superseded by v2 |
| inspection-workflow-fix-plan-v2-2026-04-30.md | **ARCHIVE + "partially executed" banner** | Reads as live roadmap; ~60 % done; rescue unexecuted stages first |
| internal-notes-loss-diagnosis.md | **ARCHIVE** | Closed incident post-mortem |
| lead-detail-diagnosis.md | **ARCHIVE** | Headline now false (columns exist) |
| morning-bugs-diagnosis.md | **ARCHIVE** | Both bugs fixed in code |
| schedule-consolidation-diagnosis.md | **ARCHIVE** | Refactor executed |
| stage-1.4-callsite-catalog.md | **ARCHIVE** | Single-use pre-flight, consumed |
| stage-3.5-consumer-audit.md | **ARCHIVE** | Gate closed 2026-05-01 |
| stage-4.3-consumer-audit.md | **ARCHIVE + "executed 2026-05-10" banner** | All boxes unticked but the work shipped — reads as blocked |
| SUPABASE_ADVISOR_AUDIT.md | **MERGE open items 2-3 into live backlog, then ARCHIVE** | 2 of 4 fixed next-day; 2 unremediated |
| PRE_HANDOVER_AUDIT.md | **MERGE surviving items into backlog, then ARCHIVE** | 2 of 5 HIGH fixed; H2 still open |
| end-to-end-test-plan-2026-05-01.md | **ARCHIVE** | Commit-pinned, hard-stops at its own first gate |
| phase-2-verification-matrix.md | **ARCHIVE** | Completed run record |
| phase-2-verification-helpers.sql | **KEEP as tool, relocate** | Genuinely re-runnable |
| email-previews/README.md | **KEEP, refresh line refs** | Verifies clean |
| email-previews/*.html (×7) | **KEEP (regenerate before showing anyone)** | Gitignored build output; 05 still shows the scrubbed personal mobile |
| pdf-report/README.md, DATA-REQUIREMENTS.md, TEMPLATE-VARIABLES.md, templates/complete-report-backup.html | **ARCHIVE (delete ok, ×4)** | Superseded template docs; DATA-REQUIREMENTS maps nonexistent columns; template renders broken |
| pdf-reference/forms.md, reference.md | **ARCHIVE (delete ok, ×2)** | Vendored generic material; zero inbound references |
| testing/* (8 .md + 1 .png) | **ARCHIVE + separate PII decision** | Commit-pinned May-2026 records; real PII in ≥5 files |
| verification/launch-checks-VERIFY.md | **KEEP until the PROD pass runs, then ARCHIVE** | Only record of PR #72's outstanding verification [PENDING-PR72] |
| CLAUDE.md (repo root) | **REWRITE (targeted)** | Fix /src/auth, "12 EFs", "22 tables", the 0.87 phantom, May-2026 state block; pricing lines stay verbatim |

### 6.3 Format recommendation

**Single Markdown source (`docs/OPERATIONS_GUIDE.md`) rendered by script to ONE fully self-contained HTML file, on the BUSINESS_LOGIC/PRICING pattern.** Grounded in how the current .html files actually behaved:

1. The three HTML docs that worked as team artefacts (BUSINESS_LOGIC, PRICING_AND_PROCESS_GUIDE, LAUNCH_WEEKEND_BRIEFING) are exactly the three with zero external dependencies — inline CSS, no CDN, no web fonts. The two mermaid-based docs lose every diagram without `cdn.jsdelivr.net`; the 7 email previews lose their logo without the live PROD Storage URL. Field viewing on phones with poor signal demands standalone.
2. Markdown as source keeps the doc greppable, diffable, and re-auditable — this audit was only possible because claims could be grepped. The hand-maintained 3,479-line walkthrough HTML is how facts rotted invisibly.
3. The PDF-twin experiment failed: MRC_FULL_WALKTHROUGH.pdf was already 4 days behind its own HTML at commit time. One rendered artefact, regenerated by a script (the `preview-emails` pattern already in the repo, `package.json:16`), avoids twins.
4. Every section carries a visible "Last verified: DATE @ commit" stamp. The docs that survived this audit best (PRICING guide, launch-checks-VERIFY) date themselves; the worst (walkthrough, PRD) are undated or mis-dated.
5. Diagrams: none, or hand-built HTML/CSS as BUSINESS_LOGIC.html does. No mermaid CDN.

### 6.4 Open questions for Glen and Clayton

Field procedures and failure modes that cannot be derived from code — needed before §§4-6 and 11 can be written:

1. **Rate sign-off (still flagged open inside BUSINESS_LOGIC.html):** HEPA at $100/unit/day and the full waste m³ schedule (2→$350 … 12→$1,190, +$145/m³) are live-billing numbers. Confirm both, in writing, once.
2. **Waste volume measurement:** who estimates the m³ figure on site and how (truck loads? bags? eyeball?), and what justifies overriding the calculated price.
3. **Equipment days in practice:** how they decide dehumidifier/air-mover days on site vs accepting the auto figure (labour hours ÷ 8), and whether the shared-days model ever misprices a real job (context for the PARKED per-item-days feature).
4. **No-signal procedure:** what they actually do mid-inspection in a black spot today — keep filling and trust the local backup, stop, or fall back to phone camera + paper? Their answer becomes §4's offline procedure, and what they're told must match what the code does (refuses server save, keeps a local crash backup).
5. **Photo practice:** typical photo counts per area, whether the caption-before-upload gate slows gloved work, and what they do when an upload fails or the quarantine banner appears.
6. **request-review semantics:** when they'd toggle "request review" vs just submitting, what they expect admin to do, and how they want send-backs communicated.
7. **Booking reality:** are 7:00–19:00 hourly starts, 30 min–8 h durations, and the travel-time buffers right for real days? What happens when a job overruns into the next booking?
8. **Damages/staining disclosure:** the on-site script when pre-existing damage or post-treatment staining is found — the form captures it; who tells the customer, and when?
9. **SWMS practice:** what "SWMS completed" means operationally (a document? where kept?) — the toggle implies an artifact the system never stores.
10. **Customer contact routing:** which number customers should ever get (1800 954 117 only?), what happens when someone rings a tech's mobile directly, and who owns the admin@ inbox day-to-day.
11. **Review requests:** when NOT to send the Google review email (unhappy customer, warranty dispute) and who makes that call.
12. **ServiceM8 residue:** how many jobs still live in ServiceM8, until when, and whether the guide's first edition needs dual-system instructions.
13. **Devices:** the actual phone models/browsers in use (USER-GUIDE's browser matrix is unverifiable from the repo) — determines which PWA-install instructions are worth writing.

### 6.5 Explicit list of what this audit could NOT verify

Repo-only evidence was mandated; everything below is UNVERIFIED by definition:

- **Live database state:** actual table/trigger/policy/cron counts; row data (the 4 invoice rows, whether today's 4 Aug digest fired); applied-migration high-water mark on PROD/DEV; effective RLS; `webhook_submissions` INSERT policy; `inspection-reports` bucket listing.
- **Deployed Edge Function state:** deployed versions (code says receive-framer-lead v20; deployed unknown); which EFs exist on each project; all EF secrets (`SYSTEM_USER_UUID`, `ADMIN_FALLBACK_EMAIL`, `OPENROUTER_API_KEY`, …).
- **Supabase Auth config:** SMTP sender (TODO.md:19's noreply@mrcsystem.com claim may still be true *there* even though every EF sender is cut over), Site URL, redirect allowlist.
- **DNS / Resend:** domain verification, SPF/DKIM/DMARC state.
- **Vercel:** env vars in any scope, project link, branch→environment mapping, whether `api/render-pdf.ts`'s declared limits are active.
- **Storage:** whether PROD's `pdf-templates/inspection-report-template-final.html` matches `src/templates/inspection-report-template.html` (the RUNBOOK restore caveat); bucket publicness; object inventories.
- **Historic test results:** the 100/100 webhook stress run, the 496/496 vitest gate (not re-run — read-only audit), Playwright suites, all manual QA pass/fail records.
- **Third-party dashboards:** Framer field names (FRAMER_FIELD_MAPPING's completion state), Slack webhook config, Sentry, Google Maps key restrictions.
- **PR #72 PROD verification:** whether the launch-checks manual pass ever ran on production (its stated PASS-value window expired today, 4 Aug).
- **Runtime UI behaviour:** anything requiring a browser (drag interactions, banner rendering, 375px overflow) — structural code evidence only.
- **Business facts:** ServiceM8 state, operational sign-off of rates, staffing/process questions (§6.4).

---

## Appendix — method

- GitNexus reindexed before any query (index: 10,567 symbols). Per the repo's own warning about GitNexus false negatives, it was treated as a starting point only: **every negative claim above carries a bash confirmation**, e.g. `grep -rn "0\.87" src supabase` → exit 1 · `grep -rn "noreply@" src supabase` → exit 1 · `grep -rn "NewLeadView" src` → no output · `grep -rn "queuePhotoOffline" src/` → definition + test + comment only · `grep -rn "DISCOUNT_TIERS" src/` → exit 1 · `ls src/auth` / `ls src/components/layout` / `ls context` → no such directory · `grep -rn "pdf-reference" .` (code/docs/config, node_modules excluded) → no output · `grep -rn "SYSTEM_USER_UUID" supabase/functions/manage-users/index.ts` → no matches.
- Three parallel evidence agents (docs inventory, code ground-truth facts sheet, HTML standalone review) preceded five parallel verification agents (evergreen guides · API/architecture · pricing/business/team-HTML/CLAUDE.md · specs/trackers/runbooks · historical artifacts); synthesis of Steps 2-6 was serial.
- Constraints honoured: no existing file modified/moved/deleted; no code written; no Supabase MCP, no network; consolidated doc NOT started. The GitNexus reindexer's own hook touched CLAUDE.md, AGENTS.md, and one gitnexus skill file during Step 0 — those were restored to HEAD so the working tree shows only this report.

*End of audit. Next step is Michael's call on §6; no consolidation work has been started.*

# MRC Lead Management System — Current TODO

**Last Updated:** 2026-05-11
**Production state:** main @ `9d6c460`, production @ `1636ade`, mrcsystem.com serving Phase 4 Stage 4.3
**Status:** Phase 1 + Phase 2 + Phase 3 + Phase 4 Stages 4.1/4.1.5/4.2/4.3 COMPLETE in production. Pre-launch hardening underway.

Backed by `docs/inspection-workflow-fix-plan-v2-2026-04-30.md` (48-stage execution map) and `docs/JOB_COMPLETION_PRD.md` (Phase 2 spec).

## Launch Model

Three-stage green flag.

1. **Pre-test green flag (Michael):** All L blockers + S should-fix items resolved. Michael confirms "this is production, not MVP."
2. **Tester green flag (Glen + Clayton + Vryan):** They walk through full system including all T smoke surfaces. They must be happy. Vryan = admin role for testing purposes.
3. **Customer launch green flag (Michael):** Only after both above. Real Framer form connected, customers can use it.

---

## Open Questions for Michael (blocking input)

Items that need a decision from you, not engineering work. Resolving these unblocks L-section work.

- **AFD equipment daily rate** — `src/components/job-completion/Section7Equipment.tsx:9` uses `$75/day` as a placeholder. Comment at :166 reads "Confirm with Michael before going live." Real impact: every job using AFD will quote wrong until this is locked. Need the real rate to seed the constant.

---

## Launch Blockers (MUST fix before Glen + Clayton + customers start using)

### L1 — Equipment pricing audit + AFD rate
- **Status:** Investigation complete (2026-05-11) — Michael APPROVED defer to future session with business records. **Parked, not active.**
- **Estimate:** Re-scope needed. Original "30 min" estimate was wrong; real scope is multi-decision spanning pricing engine + customer PDF + invoice generation.

- **What customers ACTUALLY see today on inspection PDF page 8:**
  - "Commercial dehumidifier: $132/day × {qty}"
  - "Air Mover: $46/day × {qty}"
  - "RCD Box: $5/day × {qty}"
  - "Capped at 5 days" (always literal text, regardless of actual quote days)
  - No equipment days shown
  - No AFD line
  - Rates render even when qty = 0 (informational)

- **Findings deferred (no decision made tonight):**

  1. **Rate reconciliation between code and reference doc**
     - Code: $132 dehumidifier / $46 air mover / $5 RCD
     - Reference doc Michael shared (2026-05-11): $118 dehumidifier / $44 air mover, no AFD/RCD specified
     - Michael's call: leave code rates as-is. Reference doc context unclear (old? supplier? planning artifact?)
     - Action when decided: if doc is canonical, update 4 surfaces — pricing.ts:22-26, Section7Equipment.tsx:6-11, inspectionUtils.ts:57-61, and the hardcoded literals in generate-inspection-pdf/index.ts:1345-1347

  2. **"Capped at 5 days" — cosmetic display, not enforced in code**
     - PDF tells customer "Capped at 5 days" (hardcoded at generate-inspection-pdf/index.ts:1534)
     - Code does NOT enforce this cap — pricing.ts:219-227 calculates `days = Math.max(1, Math.ceil(totalLabourHours / 8))` with no upper bound
     - A 50-hour job calculates 7 equipment days, customer PDF still says "capped at 5"
     - Michael confirmed 5-day cap IS the real policy
     - Action when decided: clamp days to max 5 in pricing.ts calculateEquipmentCost (touches "sacred" pricing — requires careful test)

  3. **AFD invisibility across system**
     - Tech form (Section7Equipment.tsx) has AFD field with $75 placeholder rate
     - AFD not in pricing.ts EquipmentInput/EquipmentResult types
     - AFD not in invoices.ts line items — invoice generation silently drops AFD cost
     - AFD not in customer-facing inspection PDF (no `{{equipment_afd}}` placeholder)
     - Real AFD rate unknown
     - Action when decided: either (a) thread AFD through pricing engine + invoice + PDF with real rate, or (b) remove AFD from tech form entirely if it's a phantom feature

  4. **Zero-equipment jobs still display rate card**
     - generate-inspection-pdf/index.ts:1345-1347 ternary false branch shows bare rate when qty=0
     - Customer sees "$132/day, $46/day, $5/day" even on jobs with no equipment hire
     - May be intentional (informational rates) or a display bug
     - Michael's call: leave as-is

  5. **Equipment days never shown to customer**
     - Customer sees rate × qty (e.g. "$132/day × 1") but no duration
     - Cannot compute their own total from PDF
     - Michael's call: leave as-is

  6. **Three duplicate EQUIPMENT_RATES blocks (drift risk)**
     - src/lib/calculations/pricing.ts:22-26 (canonical, exported, no AFD)
     - src/components/job-completion/Section7Equipment.tsx:6-11 (local, has AFD)
     - src/lib/inspectionUtils.ts:57-61 (local, no AFD)
     - Updating one without the others creates silent drift

  7. **STEP_DESCRIPTIONS key alignment risk**
     - generate-inspection-pdf/index.ts:247-314 hardcodes 11 toggle description keys
     - Section 5 toggle labels in form must match these keys exactly
     - Suspect mismatches:
       - Section 5 "Containment & PRV Preparation" vs EF key "Containment and Prep"
       - Section 5 "Surface Mould Remediation" vs EF key "Surface Remediation Treatment"
     - If labels don't match keys, descriptions silently drop from customer PDF
     - Action when decided: verify treatment_methods array values vs EF keys, align or remap

  8. **docs/COST_CALCULATION_SYSTEM.md is stale**
     - Says "Equipment is entered as a direct total cost (ex GST), not calculated from quantities and rates" — wrong
     - Reality: qty × rate × days is the canonical path
     - Doc version 1.0, last updated 2026-01-08

- **Why deferred:** Investigation surfaced 8 separate issues, multiple touch pricing code that's marked "sacred" with 13% discount cap CHECK constraint. Decisions affect customer-facing rates and money flow. Requires fresh head + verification against business records before any change ships.

### L2 — Variation context admin panel
- **Status:** ❌ CANCELLED 2026-05-12. UI panel work removed from launch scope.
- **What shipped:** Data-layer hook `src/hooks/useVariationContext.ts` (commit 30bf3bc) — kept in codebase as dormant code. Hook is unused, typechecks clean, no impact on production.
- **Reason for cancellation:** Michael's call. Variation context can be reviewed via the existing JobCompletionSummary card + audit_logs in Supabase Studio. Standalone admin panel UI deemed unnecessary for launch.
- **Future:** If a variation context UI is ever needed, the hook is ready to consume. Re-open as a post-launch backlog item, not a launch blocker.

### L3 — Framer → Supabase lead capture (FINAL pre-launch step)
- **Estimate:** 1-2h
- **Status:** Hold until customer-launch green flag (per launch model). The real Framer site form is intentionally NOT connected. Currently a fake Framer test form drives the entire pipeline end-to-end for testing.
- **Scope when activated:** Connect real Framer site form → `receive-framer-lead` Edge Function. EF is deployed and tested.
- **Tasks (deferred until green flag):**
  - [ ] Connect real Framer form to `receive-framer-lead` EF
  - [ ] End-to-end test: form submit → lead row → customer confirmation email → Slack notification

### L4 — Environment separation (dev Supabase + Vercel preview env vars)
- **Estimate:** 3-4h
- **Scope:** Stop preview deploys hitting production DB. Stand up dev Supabase project; run all migrations; wire Vercel Preview env vars.
- **Tasks:**
  - [ ] Create dev Supabase project
  - [ ] Run all migrations against dev project
  - [ ] Add dev Supabase keys as Preview env vars in Vercel
  - [ ] Verify a preview deploy hits dev DB, not prod
  - [ ] Create test technician accounts in dev for walkthrough
- **Blocking:** can't safely run Glen/Clayton walkthrough on prod data.

### L5 — Email domain switch to `mouldandrestoration.com.au`
- **Estimate:** 3-4h (mostly DNS wait)
- **Tasks:**
  - [ ] Update DNS records (SPF, DKIM, DMARC)
  - [ ] Update Resend configuration
  - [ ] Test deliverability (inbox vs spam)
- **Blocking:** brand integrity. Customer-facing emails currently send from non-MRC domain.

### L6 — Activate Glen + Clayton + Vryan production accounts ✅ COMPLETE
- **Status:** Accounts activated (confirmed by Michael 2026-05-12). Glen + Clayton + Vryan can log in to production.

### L7 — Glen/Clayton E2E walkthrough on dev
- **Estimate:** 1 day wall-clock (mostly human time)
- **Dependency:** L4 (dev environment must exist). L1 parked, L2 cancelled — neither blocks.
- **Tasks:**
  - [ ] Run the 18 smoke scenarios in the T section against dev DB with a test tech account
  - [ ] Fix anything material before scheduling Glen + Clayton
  - [ ] Schedule and run actual Glen + Clayton walkthrough on dev
  - [ ] Address walkthrough feedback (variable — could be 0h to 1-2 days)
  - [ ] Author `docs/walkthrough-YYYY-MM-DD.md` per plan v2 §6.1.C Definition of Done (sign-off artefact)

---

## Should-Fix Before Launch (high-impact, not blockers)

### S1 — Stage 6.1 — `email_logs.sent_by` capture
- **Estimate:** 5 min (live runtime verification only)
- **Status:** CODE COMPLETE — implemented as part of Phase 2 audit foundation (commit `a0ae550`, 2026-05-01). The TODO entry that described this as outstanding was based on stale info.
- **Implementation verified in code:**
  - `send-email` EF schema accepts `userId` (`supabase/functions/send-email/index.ts:27-46`)
  - `send-email` EF writes `sent_by` to email_logs (line 214)
  - Frontend wrapper `sendEmail()` auto-fills `userId` from session (`src/lib/api/notifications.ts:312-322`)
  - System callers (`send-inspection-reminder`, `receive-framer-lead`) write `sent_by = SYSTEM_USER_UUID` directly
  - `email_logs.sent_by` column has existed since `20251111000008` (predates Phase 2)
- **Remaining work (live verification):**
  - [ ] Verify `SYSTEM_USER_UUID` env var is set in production Supabase secrets (`npx supabase secrets list --project-ref ecyivrxjpsmjmexqatym`, expected value: `a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f` per CLAUDE.md memory)
  - [ ] Verify recent email_logs show non-NULL `sent_by`: `SELECT sent_by, COUNT(*) FROM email_logs WHERE sent_at > NOW() - INTERVAL '7 days' GROUP BY sent_by;`
  - If either fails: real S1 work is a config fix (set env var or fix attribution-missing callers), not code.

### S2 — Plan v2 missing footnote (PostgREST 400 sequencing)
- **Estimate:** 15 min
- **Scope:** Add the third footnote to plan v2's "Execution-time amendments (2026-05-10)" section. Grep confirms zero `PostgREST` / `PGRST` / `HTTP 400` hits in the plan today.
- **Why:** doc completeness from tonight's work. Other two footnotes (Stage 3.5 OR-predicate, Stage 4.2 RLS+offline) absorbed in commit `2ce5a55`.

### S3 — Delete `src/pages/AdminInvoiceHelper.tsx` dead code
- **Estimate:** 15 min (one-file delete + grep confirm)
- **Why:** 16637 bytes on disk, no route. `src/App.tsx:48` comment confirms intent: "kept on disk but route removed — payment tracking simplified to LeadDetail card". Lingering file is maintenance hazard.

### S4 — Refresh CLAUDE.md "Current State" block
- **Estimate:** 15 min
- **Scope:** CLAUDE.md says "Phase 2: IN PROGRESS" — actually Phase 2 is functionally complete (one gap: L2). Same staleness pattern as the pre-refresh TODO.md. Separate commit so this TODO refresh stays scoped.
- **Why:** future sessions read CLAUDE.md first; stale status misdirects.

### S5 — Refresh `docs/PHASE_2_EXECUTION.md` "16 active tables" count
- **Estimate:** 15 min
- **Scope:** Table count is stale. New tables since: `job_completions`, `invoices`, `job_completion_pdf_versions`, `ai_summary_versions`, `photo_history`. Plus `photos.deleted_at` column. Refresh the schema overview table.
- **Why:** doc hygiene; reference doc cited from CLAUDE.md.

### S6 — Fix stale comment in `Section8Variations.tsx`
- **Estimate:** 5 min
- **Scope:** `src/components/job-completion/Section8Variations.tsx:54-57` has a code comment promising:
  1. "variation details are included in Job Report PDF page 7" — UNTRUE (grep of `generate-job-report-pdf/index.ts` and `job-report-template.html` returns zero variation hits)
  2. "invoice helper pre-populates a variation line item" — UNTRUE (`AdminInvoiceHelper.tsx` is dead code per S3)
- **Fix:** Update comment to reflect reality: variations are captured for admin context (see L2 panel); customer-facing rendering is out of scope.
- **Why:** Stale comments mislead future readers and caused tonight's analysis confusion about variation handling.

---

## Untested Smoke Surfaces (Phase 3 + Phase 4 shipped tonight)

Tonight's deploy passed typecheck + unit tests + audit verification + programmatic smoke. **Zero E2E or manual UI testing.** Walked through under L7 with Glen + Clayton.

### Inspection form (technician)
- [ ] **T1** — Caption gating: try uploading a photo with empty caption → expect rejection. Verify PhotoCaptionPromptDialog appears for all 5 upload sites (standard area, cover, additional, subfloor, outdoor).
- [ ] **T2** — Cover photo caption persistence (Stage 1.2): set cover caption → upload next cover → previous cover's caption NOT blanked.
- [ ] **T3** — `stainRemovingAntimicrobial` toggle (Stage 1.1): toggle on → save → reload → still on.

### Photo upload + offline
- [ ] **T4** — Offline upload + caption gate (Stage 4.1.5): go offline, upload photo, complete caption, reconnect → photo syncs, history row created.
- [ ] **T5** — Quarantine path (Stage 4.1.5): force a captionless dequeue → photo lands in quarantine → QuarantinedPhotosBanner appears → "Add caption & retry" works → "Discard" works.

### Photo soft-delete (Stage 4.3)
- [ ] **T6** — Soft-delete from inspection form: delete → photo disappears from UI → DB row has `deleted_at` populated → Storage object unchanged → `photo_history` row with `action='deleted'`.
- [ ] **T7** — Soft-delete from ViewReportPDF: same flow from admin PDF edit surface.
- [ ] **T8** — Soft-deleted photos hidden everywhere: AI prompt, customer PDF, job completion before-photos picker, Section 3 picker, Section 4 picker, technician inspection form area display.
- [ ] **T9** — Cascade verification: delete a moisture reading → photo's `moisture_reading_id` goes to NULL (not cascade-deleted).

### AI summary versioning (Phase 3)
- [ ] **T10** — Initial generation (Stage 3.2): trigger AI summary → new `ai_summary_versions` row with `version_number=1`, `generation_type='initial'`, all metadata captured (model, prompts, tokens).
- [ ] **T11** — Regeneration with feedback (Stage 3.2): enter feedback text → regenerate → new version with `version_number=2`, feedback persisted, previous version `superseded_at` set.
- [ ] **T12** — Manual edit (Stage 3.3): edit a field → save → new version with `generation_type='manual_edit'`.
- [ ] **T13** — Approval (Stage 3.4): click "Approve & Send" → latest version row gets `approved_at` / `approved_by` populated.
- [ ] **T14** — StalePdfBanner (Stage 3.4.5): regenerate AI summary after PDF sent → banner shows "PDF is stale" → approve & regen PDF → banner clears.

### Job completion (Phase 2 — sections touched by Phase 4)
- [ ] **T15** — Section 3 Before Photos (Phase 4.2): toggle photo to/from job → `photo_history` row with `action='category_changed'` written, both deltas captured.
- [ ] **T16** — Section 4 After Photos: new photo upload from job site → caption-gated → history row `action='added'`.
- [ ] **T17** — Job report PDF generation: submit job completion → admin approves → PDF generates → email sends.

### Customer PDF (Phase 4.3)
- [ ] **T18** — Soft-deleted photos excluded from PDF: visual confirmation that PDF renders cleanly with the new `WHERE deleted_at IS NULL` predicate.

---

## Remaining Plan v2 Stages (post-launch)

26 stages from `docs/inspection-workflow-fix-plan-v2-2026-04-30.md` not yet shipped. None block launch. Sequence and priorities below.

### Customer-facing PDF changes (separate IP decision)
- **Stage 4.6** — PDF embeds captions as visible text (S, Low) — moved from S-tier per Michael's design IP boundary. Defer until separate design IP decision.
- **Stage 8.1 + 8.2** — PDF per-area env readings + subfloor landscape (S, Low) — moved from S-tier per Michael's design IP boundary. Defer until separate design IP decision.

### Phase 3 polish (after launch, low priority)
- **3.6** — Remove orphan AI Edge Functions (S, Low)
- **3.7** — Version history UI on InspectionAIReview (M, Low)

### Phase 4 polish
- **4.4** — Backfill review of 58 NULL-caption photos (L human time, Medium) — admin session
- **4.5** — AI prompt includes captions (S, Low)
- **4.7** — Customer email references key photos with thumbnails (S, Low)

### Phase 5 — PDF versioning hygiene
- **5.1** — FK `pdf_versions` → `ai_summary_versions` (S, Low)
- **5.2** — Supersession columns on `pdf_versions` (S, Low)
- **5.3** — Storage retention policy cron (M, Low) — significant Storage cost reduction
- **5.4** — Verify Stage 1.4 debounce holding (S, Low) — dependent on PR-B in production for ≥1 week

### Phase 6 — Email integrity
- **6.2** — Capture email body (`body_html` + `body_hash`) (S, Low)
- **6.3** — FK `email_logs` → `pdf_versions` (S, Low)
- **6.4** — Audit historic NULL `sent_by` rows (S, Low)

### Phase 7 — Pricing in DB (top-5 risk; do as one campaign)
- **7.0** — Pricing test fixture suite (S, **High**) — prerequisite to all of Phase 7
- **7.1** — `pricing_rates` table replaces constants (L, **High**)
- **7.2** — `quote_snapshots` table (M, Medium)
- **7.3** — Pricing engine reads from DB with feature-flag fallback (M, Medium)
- **7.4** — Snapshot writer (M, Medium)
- **7.5** — Pricing history UI (M, Low)
- **7.6** — Remove pricing constants (S, Medium) — final cleanup, dependent on 7.5 in prod ≥1 week

### Phase 8 — Render coverage sweep
- **8.3** — InspectionAIReview missing fields (S, Low)
- **8.4** — Lead Detail missing fields (M, Low)
- **8.5** — Resolve `external_moisture` DUP (M, **High**) — pre-flight diff required
- **8.6** — Persist `address` from Section 1 (S, Low)
- **8.7** — Surface triage / requested_by / attention_to (S, Low)

### Phase 9 — Hygiene + orphans
- **9.1** — Confirm orphan EFs removed (S, Low)
- **9.2** — `direction_photos_enabled` decision (S, Low) — user input required
- **9.3** — Audit dead columns (M, Low) — depends on Phases 1-8 + 9.4 done
- **9.4** — Drop redundant `inspections.last_edited_at` / `last_edited_by` columns (S, Low) — depends on Stage 2.1 in prod ≥2 weeks

### Phase 10 — Audit UI
- **10.1** — Per-field history popover (L, Medium)
- **10.2** — Dedicated `/admin/audit` page (XL, Medium) — exclusive surface for raw audit_logs
- **10.3** — Per-field "Revert" affordance (L, Medium)
- **10.4** — Activity timeline structured display (M, Low)

### Post-Launch UX improvements
- **UX: Raise DEMOLITION_PHOTO_LIMIT cap** — Cap currently exists due to UI/performance issues with re-arranging and editing photos after upload. Future work to fix underlying photo grid performance + editing UX so the cap can be raised. Tracked but not blocking launch.

---

## Post-Launch (deferred to MRC business accounts)

- [ ] Migrate all API services to dedicated MRC business accounts (Google Cloud, Resend, OpenRouter, Sentry)
- [ ] Switch email sender domain to `mouldandrestoration.com.au` (depends on L5)
- [ ] Transfer Resend domain verification to MRC account

---

## Completed

### Phase 4 — Photo integrity (Stages 4.1-4.3)
- [x] **2026-05-11** — Phase 4 Stage 4.3 deployed to production via merge commit `1636ade` (main → production), serving on mrcsystem.com.
- [x] **2026-05-10** — Phase 4 Stage 4.3: soft-delete on `photos` (deleted_at column, partial index, deleteInspectionPhoto rewrite, photo_history `deleted` action wired). Commit `831d169`, merged via PR #52 → `9d6c460`.
- [x] **2026-05-10** — Phase 4 Stage 4.3.5: consumer audit gate (`docs/stage-4.3-consumer-audit.md`) + plan v2 footnote corrections. Commits `6d2aca9`, `2ce5a55`.
- [x] **2026-05-07** — Phase 4 Stage 4.2: `photo_history` table + recordPhotoHistory() helper + wired callers (`added`, `category_changed` actions). Commits `8f8de6c`, `0006bc0`, `45d91bc`, `0e57d77`.
- [x] **2026-05-05** — Phase 4 Stage 4.1 + 4.1.5: pre-upload caption modal + 5 upload-site wiring + offline quarantine path + QuarantinedPhotosBanner. Commits `d2566ee`, `5d9cd4a`, `bc39adc`, `570a277`.

### Phase 3 — AI summary versioning
- [x] **2026-05-02** — Stage 3.5: drop legacy `inspections.ai_summary_*` columns (9 columns), backfill `ai_summary_versions`, dead-code cleanup in TechnicianInspectionForm. Commits `ae99897`, `675149f`, `2c3d04c`, `3470677`.
- [x] **2026-05-02** — Stage 3.4.5: `latest_ai_summary` view + consumer migrations. Commit `3290253`.
- [x] **2026-05-02** — Stage 3.4: approval flow targets latest version row. Commit `d35c545`.
- [x] **2026-05-02** — Stage 3.3: manual edit versioning in `InspectionAIReview.handleSave`. Commit `1f0ccd2`.
- [x] **2026-05-02** — Stage 3.2: EF refactor + regen feedback UI (absorbed deferred Stage 1.3). Commit `89bcce0`.
- [x] **2026-05-02** — Stage 3.1: `ai_summary_versions` table. Commit `e6dfe4b`.

### Phase 2 — Audit foundation
- [x] **2026-05-01** — Phase 2 audit_logs foundation + EF user_id propagation (29 audit triggers across 10 tables, SYSTEM_USER_UUID sentinel, Bucket A/B/C attribution canon). Commits `a0ae550` (main), `9963d07` (production via PR #46).

### Phase 1 — Tier 0 quick wins
- [x] **2026-05-01** — PR-B (Stage 1.4): make PDF regen user-explicit + Stale PDF banner. Commit `62c7e85` (main), `78da615` (production via PR #44).
- [x] **2026-05-01** — PR-A (Stages 1.1 + 1.2): `stainRemovingAntimicrobial` toggle fix + cover-photo caption-clearing fix. Commits `452c972` + `6765e8e` (main), `12fd877` + `eb72924` (production).

### Phase 2 — Job Completion Workflow
- [x] **2026-04** — Job Completion Workflow functionally complete: 10-section technician form, admin approval + send-back flows, job report PDF generation, email delivery, invoice tracking, payment tracking, audit trail, 15-status pipeline. Known gaps tracked under L1 (AFD rate) + L2 (variation invoice line items).

### Pre-Phase-2 consolidation (April 2026)
- [x] **2026-04-30** — Technician dashboard cleanup: non-overlapping tabs + This Month tab. Commits `7d49de5`, `4629b95`, `f71907a` (PR #43).
- [x] **2026-04-29** — Fix: visible append-only Internal Notes log + atomic status reversion. Commit `4f399dd` (PR #42).
- [x] **2026-04-29** — Fix: missing Calendar import in LeadBookingCard (latent bug from booking consolidation). Commit `59986a9`.
- [x] **2026-04-29** — Fix: server-side lead.status + booking.status filters in `useTechnicianJobs`. Commit `d3181d1`.
- [x] **2026-04-28** — Walkthrough doc restyle to navy + IBM Plex / Manrope, remove TOC sidebar. Commit `ecb1831`.
- [x] **2026-04-28** — Walkthrough doc sync for Schedule consolidation + inline-edit refactor. Commit `28058eb`.
- [x] **2026-04-28** — Stage E: inline-edit refactor — kill EditLeadSheet, click-to-edit on Lead Detail. Commit `1ba3ab9`.
- [x] **2026-04-28** — Stage B.5: append-only `internal_notes` + booking email defensive paths. Commit `4a82379`.
- [x] **2026-04-28** — Consolidate LeadDetail rendering: surface customer preference card, inline NewLeadView, delete orphan files, regenerate types. Commit `4d1066c`.
- [x] **2026-04-28** — Consolidate booking flow: Schedule sidebar canonical, delete BookInspectionModal. Commit `d1f3369`.
- [x] **2026-04-05** — API key rotation: Supabase anon + service role, Resend, OpenRouter, Google Maps. All env vars updated in Vercel + Supabase secrets.

### Phase 1 baseline (pre-2026-04-05)
- [x] Phase 1 Technician Role: dashboard, jobs, inspection form (all 10 sections)
- [x] Phase 1 Admin Role: dashboard, schedule, leads, technicians, reports
- [x] Inspection form → AI summary → PDF → email pipeline
- [x] Security remediation (RLS on all tables, rate limiting, XSS/CSP, audit triggers)
- [x] Codebase cleanup (15 dead routes, 9 unused tables, dead code removed)
- [x] Vercel deployment with security headers
- [x] Sentry error tracking + offline resilience
- [x] PDF page ordering fix
- [x] Lead detail improvements (inline editing, travel time, activity logging)
- [x] MCP server stack configured (Supabase, GitHub, Resend, Slack, Playwright, Context7, Memory)
- [x] Database cleanup & hardening (68/100 → 91/100: 12 legacy tables dropped, broken FKs/functions fixed, duplicate indexes removed)

# Inspection Workflow Fix Plan — v2 — 2026-04-30

**Companion to:** `docs/inspection-workflow-audit-2026-04-30.md`
**Supersedes:** `docs/inspection-workflow-fix-plan-2026-04-30.md` (kept for reference)

**Goal:** Close all 44 findings from the audit before MRC takes real customer load. No production-data constraints today (Glen, Clayton, Vryan not yet on the system) — one shot to do this properly.

**Execution discipline:** Stage-by-stage with manual approval between each. No auto-progression. Every stage has its own pre-flight snapshot, Vercel preview verification, and explicit STOP gate.

**No code is changed by this document.** This is the master execution map.

---

## 0. Changelog from v1

This v2 locks 5 deferred decisions and adds 5 missing stages flagged during plan review. Net stage count: **42 → 48** (7 added, 1 removed).

### Locked decisions (no longer deferred to mid-execution)

| # | Decision | v1 state | v2 state |
|---|---|---|---|
| 1 | Edge Function audit attribution | Deferred — "auth.uid() may be NULL" noted but not resolved | **LOCKED.** Frontend passes calling `user_id` to every Edge Function. EFs use it for audited writes. Genuinely system-only writes (cron, framer-lead) use a sentinel `system_user_id` UUID stored as env var. New **Stage 2.0** runs before 2.1. |
| 2 | Phase 1 PR strategy | Deferred — "bundled PR" not split | **LOCKED.** Split into **PR-A** (1.1 + 1.2 + 1.3) and **PR-B** (1.4 alone). PR-A ships first; PR-B follows after PR-A verified on production. |
| 3 | Activities table vs audit_logs canonical policy | Deferred — Stage 2.3 merged audit_logs into activity timeline; Stage 10.4 also touched timeline. UX collision. | **LOCKED.** Domain separation: `activities` = semantic events on user-facing timeline. `audit_logs` = raw row-level diff for forensics, surfaced ONLY via dedicated `/admin/audit` page (Phase 10). **Stage 2.3 REMOVED.** Stage 10.4 reformulated to activities-only polish. |
| 4 | Pricing engine post-Phase 7 lifecycle | Deferred — constants kept "as fallback" indefinitely | **LOCKED.** Constants removed after Stage 7.5 verified on production. DB read failure on boot → hard error state, not silent fallback to stale constants. New **Stage 7.6**. |
| 5 | Stage 3.5 destructive-drop gate | Deferred — informal "soak in preview for 1 week" wording | **LOCKED.** New **Stage 3.4.5** — formal grep + manual audit of every consumer of dropped columns, output checklist file `docs/stage-3.5-consumer-audit.md`. Every entry must be signed off ("migrated to view: confirmed") BEFORE Stage 3.5 runs. |

### Stages added

| Stage | Title | Reason | Estimate |
|---|---|---|---|
| **2.0** | Edge Function user_id propagation pattern | Lock decision #1; eliminate `auth.uid() = NULL` ambiguity in audit_logs | M |
| **2.0.5** | inspector_id / leads.assigned_to sync audit | RLS policies for `ai_summary_versions` + `photo_history` reference `inspections.inspector_id`; if it drifts from `leads.assigned_to`, technicians see/miss the wrong rows. Must run before Phase 3. | S |
| **3.4.5** | Stage 3.5 consumer audit gate | Lock decision #5; formal grep audit checklist before destructive drop | S |
| **4.1.5** | SyncManager offline queue caption audit | Confirm caption-required gating from 4.1 holds across enqueue, dequeue, and quarantine paths in `src/lib/offline/SyncManager.ts` | S |
| **7.0** | Pricing test fixture suite | Replace v1 vague "regression-test against existing production inspections" (only 2 prod inspections) with 10 hand-calculated fixtures hitting every rate tier and discount band | S |
| **7.6** | Remove pricing constants from `pricing.ts` | Lock decision #4; complete the migration to single source of truth | S |
| **9.4** | Drop redundant `inspections.last_edited_at` / `last_edited_by` | After 2.1, audit_logs is canonical; these become redundant | S |

### Stages removed / reformulated

| Stage | Change | Reason |
|---|---|---|
| **2.3** | REMOVED | Activity timeline stays activities-only per locked decision #3 |
| **10.4** | REFORMULATED | No longer "merge audit_logs into timeline" — now "structured friendly-label rendering of `activities` rows" only. Polish, not data merge. |

### Other clarifications

- Stage 5.4 (verify 1.4 debounce holding) now depends on **PR-B** in production for ≥1 week (was: Phase 1 bundled PR).
- Stage 9.3 (audit dead columns) now sequences AFTER 9.4 since 9.4 is the most direct example of the pattern.
- Section 6 expanded with **6.1 — Definition of Done** (formal exit criteria).

### Execution-time amendments (2026-05-01)

- **Stage 1.3 DEFERRED.** Pre-flight grep during execution revealed `regenerationFeedback` is a wired-up-but-not-yet-implemented form-state stub with no UI input and no consumer. No current data loss. Resolution moved to **Stage 3.2** (whose scope expanded to include the regen feedback textarea UI in `InspectionAIReview.tsx` + Edge Function payload threading + persistence to `ai_summary_versions.regeneration_feedback`). PR-A reduced to Stages 1.1 + 1.2 only. See Stage 1.3 footnote for diagnosis. Net stage count unchanged at 48 (1.3 still listed but not executed; 3.2 absorbs the work).

### Execution-time amendments (2026-05-10)

- **Stage 3.5 backfill predicate broader than Step A spec.** The Step A `INSERT INTO public.ai_summary_versions … WHERE` predicate as written in §Stage 3.5 only filters on `inspections.ai_summary_text IS NOT NULL`. The actual backfill migration (`20260502100028_phase3_stage_3_5_backfill_ai_summary_versions.sql`) used a broader OR predicate covering every legacy column being dropped (`ai_summary_text IS NOT NULL OR what_we_found_text IS NOT NULL OR what_we_will_do_text IS NOT NULL OR what_you_get_text IS NOT NULL OR problem_analysis_content IS NOT NULL OR demolition_content IS NOT NULL`). Reason: rows with partial AI content (e.g. only `problem_analysis_content` populated post-Stage 3.2 regen-feedback work) would have been silently lost under the narrower predicate. Plan v2 Step A wording should be amended to reflect the OR predicate as canonical.
- **Stage 4.2 photo_history offline write site missing from plan.** The `'added'` action call sites listed in §Stage 4.2 cover `src/lib/utils/photoUpload.ts` only. The actual PR-G wired a second site at `src/lib/offline/SyncManager.ts:syncPhoto()` after the photos INSERT in the offline-dequeue path. Without this wire-in, every offline-uploaded photo would silently lack a `photo_history` row at dequeue. Same omission pattern as Stage 4.1.5 (quarantine path missing from plan until late in PR-F). Plan v2 Stage 4.2 wired-callers table should include the SyncManager site as canonical.
- **Stage 4.2 photo_history RLS reference is wrong-shape.** §Stage 4.2 says RLS policies should be "same admin-all + tech-assigned policies as `ai_summary_versions`". That table is **service-role-written** by the `generate-inspection-summary` Edge Function with SELECT-only tech access — no tech INSERT policy exists. `photo_history` is **technician-session-written** (Bucket A), so adopting the `ai_summary_versions` policy shape verbatim would block every technician upload's history insert under RLS. The symmetric reference is **`photos`** (`is_admin()` admin-all policy + `lead.assigned_to` tech INSERT/SELECT). Plan v2 Stage 4.2 RLS reference should be amended to point at the `photos` policy shape.
- **Stage 4.3.5 line 707 PostgREST 400 sequencing claim incorrect.** §Stage 4.3.5 step 4 (line 707) says: "Migrate every read consumer to add `WHERE deleted_at IS NULL` BEFORE the column-add migration runs (idempotent — adding the predicate before the column exists is harmless because every existing row has `deleted_at = NULL`)." During Stage 4.3 execution, consumer code with `.is('deleted_at', null)` filters (Supabase JS client, translates to PostgREST `?deleted_at=is.null`) was scheduled to deploy before the `ALTER TABLE photos ADD COLUMN deleted_at` migration applied. PostgREST returned HTTP 400 filtering against the non-existent column — the consumer-first sequencing the plan describes does NOT work in practice because the predicate fails as soon as a request reaches PostgREST. Actual order used: (a) column-add migration applied first, (b) consumer code referencing the new column deploys after the column exists. Plan v2 line 707 wording should be reversed to "column-add migration first, consumer code referencing the column second."

---

## 1. Executive Summary

### Stage count

- **10 phases**, **48 stages** total (Stage 1.1 through 10.4)
- All 44 audit findings assigned to a stage; nothing deferred
- 5 stages are **schema migrations**; 5 are **data migrations**; 9 are **Edge Function changes**; 4 are **planning/audit gates with no code change**; the rest are **frontend**

### Wall-clock estimate

If executed sequentially with one human reviewing each stage: **~9–11 weeks** (was 8–10 in v1; +1 week for added stages, mostly absorbed by the 4 audit-only gates).
With moderate parallelism (Phase 4 alongside Phases 5+6, Phase 7 after Phase 2): **~6.5 weeks** (was 6 in v1).
The gating constraint remains review time, not implementation time.

### Critical path

```
Phase 1 PR-A (1.1 + 1.2 + 1.3)
   ↓
Phase 1 PR-B (1.4) — soak ≥1 week in production
   ↓
Phase 2.0 (Edge Function user_id propagation)
   ↓
Phase 2.0.5 (inspector_id sync audit)
   ↓
Phase 2.1 (audit_logs trigger expansion)
   ↓
Phase 2.2 (verification matrix)  ──┐
   ↓                                │
Phase 3 (AI summary versioning      │
  with 3.4.5 gate before 3.5)       │
   ↓                                ├──→ Phase 9 (hygiene, anytime after deps clear)
Phase 5 (PDF FK + retention)         │     incl. 9.4 (drop last_edited_*)
   ↓                                │
Phase 6 (email integrity)            │
   ↓                                │
Phase 10 (UI surface for history) ◀─┘

Parallel branches after Phase 2:
   Phase 4 (photo integrity, incl. 4.1.5 SyncManager audit)  →  Phase 8.6 (PDF captions)
   Phase 7 (pricing — 7.0 fixtures → 7.1 DB → 7.2-7.5 → 7.6 constants removal)
   Phase 8 (render coverage sweep, after Phase 4.6 for caption work)
```

### Phase scope summary

| Phase | Stages | Stage count | Risk |
|---|---|---|---|
| 1 — Tier 0 quick wins | 1.1–1.4 (split PR-A / PR-B) | 4 | Low |
| 2 — Audit foundation | **2.0**, **2.0.5**, 2.1, 2.2 | 4 (was 3; 2.3 removed) | Medium |
| 3 — AI summary versioning | 3.1–3.4, **3.4.5**, 3.5–3.7 | 8 (was 7) | High |
| 4 — Photo integrity | 4.1, **4.1.5**, 4.2–4.7 | 8 (was 7) | Medium |
| 5 — PDF versioning hygiene | 5.1–5.4 | 4 | Low |
| 6 — Email integrity | 6.1–6.4 | 4 | Low |
| 7 — Pricing / quote history | **7.0**, 7.1–7.5, **7.6** | 7 (was 5) | High |
| 8 — Render coverage sweep | 8.1–8.7 | 7 | Medium |
| 9 — Hygiene + orphans | 9.1–9.3, **9.4** | 4 (was 3) | Low |
| 10 — UI surface for history | 10.1–10.4 | 4 | Medium |
| **Total** | | **48** | |

### Top 5 highest-risk stages (unchanged from v1)

1. **Stage 3.5** — Drop `ai_summary_text` and related columns. Now gated by **Stage 3.4.5** consumer audit checklist.
2. **Stage 7.1** — DB-backed `pricing_rates` table. Now preceded by **Stage 7.0** fixture suite.
3. **Stage 8.5** — `external_moisture` DUP resolution.
4. **Stage 2.1** — Audit trigger expansion. Now preceded by **Stage 2.0** locking the user_id propagation pattern.
5. **Stage 4.3** — Photo soft-delete consumer audit.

### Where user input is needed during execution

- **Stage 2.0** — Confirm sentinel `system_user_id` UUID value (recommend: a freshly generated UUID stored as `SYSTEM_USER_UUID` env var on Vercel + Supabase).
- **Stage 2.0.5** — Decide canonical source between `inspections.inspector_id` and `leads.assigned_to` (recommend: `leads.assigned_to` is canonical; `inspections.inspector_id` is a snapshot at form submission, kept in sync via trigger).
- **Stage 1.4** — PDF regen strategy (recommendation in stage detail: Option A — explicit only).
- **Stage 4.4** — Admin manual review of 58 NULL-caption photos.
- **Stage 7.1** — Confirm pricing rate versioning approach (effective_from/effective_to).
- **Stage 8.5** — Confirm `external_moisture` source of truth (recommend: array).
- **Stage 9.3** — Review dead-column candidates before drop migration.

---

## 2. Phase-by-Phase Plan

Format per stage:
- **Dependency** — which prior stages must ship first
- **Scope** — files + change summary
- **Schema sketch** — full SQL for migrations (proposal only — NOT applied)
- **Migration order** — if multi-step, the order
- **Verification** — what to test on Vercel preview
- **Rollback** — how to revert
- **Estimate** — S (≤4h) / M (1–2 days) / L (3–5 days) / XL (1+ week)

---

### Phase 1 — Tier 0 quick wins (TWO bundled PRs)

Phase 1 ships as **two separate PRs**, not one:

- **PR-A:** Stages 1.1 + 1.2 only (hardcode + caption-clearing). Stage 1.3 deferred per pre-flight finding — see the Stage 1.3 footnote below. Same blast radius — ship together.
- **PR-B:** Stage 1.4 alone (PDF regen UX with new button — different blast radius, larger UX change). Ships AFTER PR-A is verified on production.

This split exists because PR-B introduces a new admin UI affordance and changes admin mental model. Bundling it with a hardcode fix would conflate review concerns.

#### Stage 1.1 — Fix `stainRemovingAntimicrobial` hardcode

- **Dependency:** none
- **PR:** PR-A
- **Scope:** `src/pages/TechnicianInspectionForm.tsx:3299` — replace hardcoded `false` with the form-state value
- **Schema:** none
- **Verification:** Toggle the field on/off in the form, save, reload, confirm round-trips. Check `inspections.stain_removing_antimicrobial` directly via SQL.
- **Rollback:** revert single line; trivial
- **Estimate:** S (~30 min)

#### Stage 1.2 — Stop caption-clearing path

- **Dependency:** none
- **PR:** PR-A
- **Scope:** `src/pages/ViewReportPDF.tsx:2003` — when admin selects a different cover photo, do NOT blank the previous photo's caption.
- **Schema:** none
- **Verification:** In ViewReportPDF, swap a cover photo. Query `photos.caption` for previously-selected photo — confirm unchanged.
- **Rollback:** trivial single-line revert
- **Estimate:** S (~30 min)

#### Stage 1.3 — Persist `regenerationFeedback`

- **Status:** **DEFERRED — NOT EXECUTED.**
- **Dependency (original):** none
- **PR (original):** PR-A
- **Scope (original):** Park in `inspections.regeneration_feedback` for now; will migrate to `ai_summary_versions.regeneration_feedback` in Stage 3.2.
- **Schema sketch (original):**
  ```sql
  ALTER TABLE public.inspections
    ADD COLUMN regeneration_feedback TEXT;
  ```
  → Was to be dropped in Stage 3.5 once `ai_summary_versions` carried it.

**FOOTNOTE — DEFERRED on execution (2026-05-01):** On execution, pre-flight grep revealed `regenerationFeedback` is a wired-up-but-not-yet-implemented form-state stub. It is defined in `src/types/inspection.ts:144` and initialized to `''` in `src/pages/TechnicianInspectionForm.tsx:2502`, but **no UI input writes to it** and **no consumer reads it**. The `handleRegenerateAll` and `handleRegenerateSection` handlers in `src/pages/InspectionAIReview.tsx` do not collect or pass any user feedback string to the `generate-inspection-summary` Edge Function. There is no current data loss — the field is always `''`. Adding `inspections.regeneration_feedback` would create a column that only stores empty strings until the UI is built — cargo-cult migration. **Resolution deferred to Stage 3.2** where `ai_summary_versions.regeneration_feedback` absorbs this concern natively when the regen feedback UI is built alongside Phase 3 AI versioning work. See Stage 3.2 — its scope is expanded to include the regen feedback UI.

#### PR-A bundled production push

After Stages 1.1, 1.2, 1.3 each verified individually on Vercel preview, bundle into one production PR titled "Tier 0 quick wins (PR-A) — halt active data destruction". Wait for PR-A to soak ≥3 days on production before opening PR-B.

#### Stage 1.4 — Make PDF regen explicit (PR-B)

- **Dependency:** PR-A merged + soaked ≥3 days
- **PR:** PR-B (separate, ships after PR-A)
- **Decision needed from user:** which strategy?
  - **Option A (recommended):** Remove `regenerate: true` from `updateFieldAndRegenerate()` in `src/lib/api/pdfGeneration.ts:127`. Make PDF regen user-explicit — admin clicks a "Regenerate PDF" button.
  - **Option B:** Debounce regen with a 5-minute idle timer.
  - **Option C:** Both.
- **Recommendation:** Option A. Eliminates 109-version-per-inspection pattern entirely.
- **Scope (original):** `src/lib/api/pdfGeneration.ts:127`, plus "Regenerate PDF" button on `src/pages/InspectionAIReview.tsx` and `src/pages/ViewReportPDF.tsx`. Add a "Stale PDF" warning banner when AI summary is newer than latest PDF.
- **Schema:** none
- **Verification:** Edit a field 10 times in InspectionAIReview → confirm 0 new rows in `pdf_versions`. Click "Regenerate PDF" → confirm exactly 1 new row.
- **Rollback:** revert the function change
- **Estimate:** S (~3h including UX for the button)

**FOOTNOTE — EXPANDED on execution (2026-05-01):** Pre-flight grep found the regen storm originated primarily from `ViewReportPDF.tsx` (~22 inline-save handlers including 2 `job_completion` handlers), not `pdfGeneration.ts:127` alone. Stage 1.4 expanded to remove auto-regen from all 18 `ViewReportPDF` save handlers + rename `updateFieldAndRegenerate` → `updateInspectionField` (the post-fix name no longer lies). The 4 explicit user-button bindings preserved (lines 2080, 2112, 2367, 2502; line numbers shifted slightly post-edit). A shared `StalePdfBanner` component (`src/components/pdf/StalePdfBanner.tsx`) was introduced; it queries `inspections.ai_summary_generated_at` vs latest `pdf_versions.created_at` (the Phase 3 migration to `ai_summary_versions` is documented in the component itself). Phase 2 (`job_completion`) constraint clarified: applies to FUTURE Phase 2 build per `docs/JOB_COMPLETION_PRD.md`, not already-merged Phase 2 code in `ViewReportPDF`. Stated success criterion (eliminate 109-version-per-inspection pattern) achieved by Option B with full coverage. Full pre-flight catalog: `docs/stage-1.4-callsite-catalog.md`.

---

### Phase 2 — Foundation: row-level audit (Tier 1)

**FOOTNOTES — EXECUTED on 2026-05-01.** Phase 2 shipped continuous-run with four pre-flight findings beyond the original plan:

1. **Live trigger reality vs migration files.** Pre-flight via `mcp__supabase__list_migrations` and `information_schema.triggers` revealed migration `20260311000001_add_audit_triggers.sql` was never applied to production. Live state at Phase 2 start: only `invoices` and `job_completions` had triggers (INSERT+UPDATE only — no DELETE). The earlier exploration agent's claim that 5 tables were already audited was based on file-system inspection, not live-DB verification. Lesson captured in `~/.claude/projects/-Users-michaelyoussef-mrc-app-1/memory/feedback_preflight_schema_verification.md`.

2. **Stage 2.1 scope expanded to 25 triggers across 10 tables (not 15 across 5).** Once the live reality was understood, the user locked Option 2 (full coverage): leads/inspections/inspection_areas/subfloor_data/moisture_readings/subfloor_readings/photos all get INSERT+UPDATE+DELETE; user_roles gets INSERT+DELETE only (matching pattern); plus DELETE-only supplements on invoices/job_completions. The 4 pre-existing triggers on invoices/job_completions INSERT+UPDATE were left untouched to avoid attribution gaps during DROP→CREATE. Migration `supabase/migrations/20260501000004_audit_triggers_full_coverage.sql`. Post-migration verification: 29 trigger objects across 10 tables.

3. **EF inventory mismatch with CLAUDE.md.** `supabase/functions/` actually contains 12 EFs, not 10. The two missing entries — `generate-job-report-pdf` and `check-overdue-invoices` — were folded into Stage 2.0c. CLAUDE.md updated to "12 Edge Functions" with a pointer to the new canonical reference `docs/edge-function-attribution-manifest.md`.

4. **`audit_logs.user_id` had a FK to `auth.users(id)` blocking the SYSTEM_USER_UUID sentinel.** Discovered during Stage 2.0d Test 3 (FK violation). Architecturally wrong for an immutable forensic log: `ON DELETE NO ACTION` would either prevent deleting users with audit history or destroy attribution. Dropped in `supabase/migrations/20260501000003_audit_logs_drop_user_fk.sql` with a documenting `COMMENT ON COLUMN`.

Attribution architecture chosen (per the v2 plan's executing-agent discretion):
- **Bucket A** (frontend EFs with user JWT): dual-client. Service role for reads, JWT-bound `supabaseAudited` client for audited writes — `auth.uid()` captures the calling admin natively. EFs: generate-inspection-pdf, generate-inspection-summary (no EF-side change — frontend `.update()` already JWT-bound), send-email (column-level via `email_logs.sent_by`), generate-job-report-pdf.
- **Bucket B** (system EFs without user JWT): helper RPCs `audited_insert_lead_via_framer(uuid, jsonb)` and `audited_mark_invoice_overdue(uuid, uuid)` pull `set_config('app.acting_user_id', ..., true)` and the audited write into one transaction. The `audit_log_trigger()` function (Stage 2.0a) reads `auth.uid()` first, falls back to the session variable. EFs: receive-framer-lead (RPC), check-overdue-invoices (RPC), send-inspection-reminder (column-level only — non-audited tables), manage-users (admin JWT — dual-client).
- **Bucket C**: 4 read-only/no-audited-writes EFs, no work.

Verification passed: Test 3 (session var fallback), Test 4 (JWT precedence), Test 5 (audited_insert_lead_via_framer end-to-end), Test 6 (audited_mark_invoice_overdue end-to-end). Helpers SQL: `docs/phase-2-verification-helpers.sql`. End-to-end user matrix for post-merge: `docs/phase-2-verification-matrix.md`.

**POST-CLOSURE FINDING (2026-05-01):** `SYSTEM_USER_UUID` was confirmed verbally during Stage 2.0b but never actually set on Supabase Edge Function secrets. Discovered when first `check-overdue-invoices` cron invocation post-deploy wrote `audit_logs.user_id = NULL`. Diagnosed via `npx supabase secrets list --project-ref ecyivrxjpsmjmexqatym | grep SYSTEM_USER_UUID` (showed nothing). Fixed via `npx supabase secrets set SYSTEM_USER_UUID=a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f --project-ref ecyivrxjpsmjmexqatym`; re-invoking the cron confirmed `user_id = a5ae96f1-...` on the next audit row. Two permanent NULL-attributed `audit_logs` rows resulted as testing artefacts (07:07:47 cron pre-fix, 07:09:11 my pre-test reset). Going forward: env var changes must be verified via CLI output or dashboard screenshot, not textual confirmation. Lesson captured in persistent memory at `feedback_env_var_verification.md` and reflected in the verification preludes added to `docs/system-user-uuid.md`, `docs/phase-2-verification-helpers.sql`, and `docs/edge-function-attribution-manifest.md`.

#### Stage 2.0 — Edge Function user_id propagation pattern

- **Dependency:** PR-A and PR-B in production
- **Type:** **Locking decision + audit + code-pass.** Runs before any audit triggers exist, so no `auth.uid()` ambiguity slips into the production audit history from day one.
- **Locked policy:**
  1. **Frontend always passes calling `user_id`** as a parameter to every Edge Function call. The Edge Function uses this `user_id` directly when inserting/updating audited rows (writes a `last_edited_by` / `created_by` / `sent_by` field as appropriate).
  2. **Genuinely system-only writes** — cron jobs (`send-inspection-reminder`, future `check-overdue-invoices`), webhooks (`receive-framer-lead`) — use a sentinel **system user UUID** stored as an environment variable.
  3. **The sentinel system user** is a fresh UUID generated specifically for this purpose. Stored as:
     - Vercel env var: `VITE_SYSTEM_USER_UUID` (frontend-readable, used only for display: "system" badge)
     - Supabase Edge Function secret: `SYSTEM_USER_UUID`
  4. **Audit_logs queries that surface system events** detect the sentinel and render "System" in UI rather than a user link.
- **Scope:**
  - Generate sentinel UUID; add to env vars in Vercel + Supabase Edge Function secrets
  - Audit ALL Edge Function call sites:
    - `generate-inspection-pdf` — frontend already calls; confirm `user_id` in payload
    - `generate-inspection-summary` — same
    - `send-email` — already has `sent_by` issue (Stage 6.1); align
    - `calculate-travel-time` — read-only, no audit write; skip
    - `receive-framer-lead` — webhook, uses `SYSTEM_USER_UUID`
    - `send-inspection-reminder` — cron, uses `SYSTEM_USER_UUID`
    - `send-slack-notification` — no DB write; skip
    - `manage-users` — already runs as admin; confirm pattern
    - `seed-admin` — utility only; skip
    - `export-inspection-context` — read-only; skip
  - Update each Edge Function to accept `user_id` (or use `SYSTEM_USER_UUID`) and propagate to all audited writes
  - Document the pattern in `docs/edge-function-audit-pattern.md`
- **Files affected:** all Edge Functions listed above + their frontend call sites in `src/lib/api/`
- **Verification:**
  - Sentinel UUID set correctly in both Vercel and Supabase
  - Each Edge Function call site explicitly passes `user_id` (frontend-initiated) or uses `SYSTEM_USER_UUID` (system-initiated)
  - Test invocation from frontend → confirm correct user_id received in EF
  - Test cron invocation → confirm SYSTEM_USER_UUID used
- **Rollback:** revert env var + revert Edge Function changes (still works without trigger writes since no audit_logs trigger fires yet)
- **Estimate:** M (1–2 days — most of the time is the audit pass + env var coordination)

#### Stage 2.0.5 — `inspector_id` / `leads.assigned_to` sync audit

- **Dependency:** none (independent; can run alongside 2.0)
- **Type:** **Audit only — no code or schema change unless drift found.**
- **Why this matters:** RLS policies for `ai_summary_versions` and `photo_history` (added in Phase 3 and 4) reference `inspections.inspector_id` via `WHERE inspector_id = auth.uid()`. If `inspector_id` and `leads.assigned_to` are not kept in sync, technicians may see (or be denied) the wrong inspections via RLS.
- **Scope:**
  1. Run a diff query:
     ```sql
     SELECT i.id, i.inspector_id, l.assigned_to,
            i.created_at, l.updated_at
     FROM inspections i
     JOIN leads l ON l.id = i.lead_id
     WHERE i.inspector_id IS DISTINCT FROM l.assigned_to;
     ```
  2. If any rows return → drift exists. Investigate which is canonical.
  3. Audit code for write paths:
     - Where is `inspections.inspector_id` set? (Likely `useInspectionData.ts` or form submission)
     - Where is `leads.assigned_to` set? (Likely `useLeadUpdate.ts`)
     - Are they ever updated independently?
  4. **Recommended invariant (subject to user confirmation):** `leads.assigned_to` is canonical. `inspections.inspector_id` is a snapshot taken at inspection form submission. After submission, if `leads.assigned_to` changes, `inspections.inspector_id` does NOT change (the original technician retains attribution for that inspection).
  5. If invariant is acceptable: document it. Add comment to RLS policy. No code change.
  6. If invariant is wrong (i.e. they should always match): add a trigger to sync them, OR consolidate to a single column.
- **Output:** `docs/inspector-id-sync-decision.md` documenting the canonical model + any required triggers.
- **Verification:** Run the diff query post-decision → result should be expected (zero rows if "always sync", or arbitrary if "snapshot at submission")
- **Rollback:** N/A (audit only)
- **Estimate:** S (~3h)

#### Stage 2.1 — Attach `audit_log_trigger()` to 8 tables

- **Dependency:** 2.0 + 2.0.5 complete
- **Scope:** New migration that runs `CREATE TRIGGER` for INSERT, UPDATE, DELETE on each target table using the existing `audit_log_trigger()` function (already proven on `invoices` and `job_completions`).
- **Schema sketch:**

```sql
-- Target tables: leads, inspections, inspection_areas, subfloor_data,
-- moisture_readings, subfloor_readings, photos, user_roles
-- One block per table, repeating the pattern below.

CREATE TRIGGER audit_leads_insert
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('lead_created');

CREATE TRIGGER audit_leads_update
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('lead_updated');

CREATE TRIGGER audit_leads_delete
  AFTER DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('lead_deleted');

-- Repeat with action labels per table:
--   inspections        → inspection_created/updated/deleted
--   inspection_areas   → inspection_area_*
--   subfloor_data      → subfloor_data_*
--   moisture_readings  → moisture_reading_*
--   subfloor_readings  → subfloor_reading_*
--   photos             → photo_*
--   user_roles         → user_role_* (INSERT, DELETE only — no UPDATE per existing pattern)
```

- **Migration order:** single migration, all 23 triggers (8 tables × ~3 events) created in one transaction
- **Pre-flight snapshot:** export current row counts for `audit_logs` and the 8 target tables; capture `information_schema.triggers` state before/after
- **Verification:**
  - Mutate one row of each table type via the UI on Vercel preview
  - Query `audit_logs` and confirm row appears with correct `entity_type`, `action`, `metadata.before` / `metadata.after`
  - Confirm `auth.uid()` is captured correctly when triggered from authenticated user
  - **Confirm `SYSTEM_USER_UUID` appears (not NULL) when Edge Function fires the write** — this is the payoff from Stage 2.0
- **Rollback:** drop all 23 triggers in a follow-up migration
- **Estimate:** M (1 day including verification matrix)

#### Stage 2.2 — Verification & integration test pass

- **Dependency:** 2.1
- **Scope:** No code changes. Run a structured verification (matrix unchanged from v1):

| Mutation path | Source file | Should appear in audit_logs | Expected user_id |
|---|---|---|---|
| Create lead | `useLeadUpdate.ts` | Y | calling admin/tech |
| Update lead (name, phone, etc.) | inline edit | Y | calling user |
| Soft-archive lead | `LeadDetail.tsx` | Y | calling admin |
| Auto-save inspection form | `TechnicianInspectionForm.tsx` | Y | calling tech |
| Add area | form | Y | calling tech |
| Update moisture reading | form | Y | calling tech |
| Add subfloor reading | form | Y | calling tech |
| Upload photo | `photoUpload.ts:125` | Y | calling user |
| Delete photo | `photoUpload.ts:261` | Y | calling user |
| Update photo caption | various | Y | calling user |
| Edge Function PDF gen updates `pdf_url` | Edge Function | Y | passed user_id (Stage 2.0) |
| Cron `send-inspection-reminder` updates `last_reminder_sent_at` | EF | Y | `SYSTEM_USER_UUID` |
| Webhook `receive-framer-lead` creates lead | EF | Y | `SYSTEM_USER_UUID` |

- **Rollback:** N/A (test-only stage)
- **Estimate:** S (~3h)

#### ~~Stage 2.3~~ — REMOVED

**Why removed:** Locked decision #3 — activities and audit_logs serve different domains:

- `activities` = high-level semantic events ("lead created", "PDF sent", "email sent") on user-facing timeline
- `audit_logs` = raw row-level diff for forensics

Surfacing audit_logs into the user-facing activity timeline would create UX noise (admin sees "phone: '433880401' → '0433880401'" for every keystroke). Audit_logs gets surfaced ONLY on the Phase 10 dedicated `/admin/audit` page.

The activity timeline continues being written by application code (the existing pattern) and gets a UI polish in **reformulated Stage 10.4** — but that polish is activities-only, not a merge.

---

### Phase 3 — AI summary versioning (CRITICAL)

#### Stage 3.1 — Create `ai_summary_versions` table

- **Dependency:** Phase 2 complete (so the new table itself gets audit coverage)
- **Scope:** New migration. Per audit doc Section 3.3.
- **Schema sketch:** (unchanged from v1)

```sql
CREATE TABLE public.ai_summary_versions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id            UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  version_number           INTEGER NOT NULL,
  generation_type          TEXT NOT NULL CHECK (generation_type IN ('initial', 'regeneration', 'manual_edit')),
  generated_by             UUID REFERENCES auth.users(id),
  generated_at             TIMESTAMPTZ DEFAULT NOW(),

  -- Reproducibility
  model_name               TEXT,
  model_version            TEXT,
  system_prompt_hash       TEXT,
  user_prompt              TEXT,
  prompt_tokens            INTEGER,
  response_tokens          INTEGER,
  regeneration_feedback    TEXT,

  -- Generated content (snapshot at time of generation)
  ai_summary_text          TEXT,
  what_we_found_text       TEXT,
  what_we_will_do_text     TEXT,
  what_you_get_text        TEXT,
  problem_analysis_content TEXT,
  demolition_content       TEXT,

  -- Supersession
  superseded_at            TIMESTAMPTZ,
  superseded_by_version_id UUID REFERENCES public.ai_summary_versions(id),

  -- Approval
  approved_at              TIMESTAMPTZ,
  approved_by              UUID REFERENCES auth.users(id),

  UNIQUE(inspection_id, version_number)
);

CREATE INDEX idx_ai_summary_versions_inspection ON public.ai_summary_versions(inspection_id, version_number DESC);
CREATE INDEX idx_ai_summary_versions_approved ON public.ai_summary_versions(inspection_id) WHERE approved_at IS NOT NULL;

-- RLS
ALTER TABLE public.ai_summary_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_see_all" ON public.ai_summary_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "technicians_see_assigned" ON public.ai_summary_versions
  FOR SELECT TO authenticated
  USING (
    inspection_id IN (
      SELECT id FROM public.inspections
      WHERE inspector_id = auth.uid()
    )
  );

-- audit_logs trigger
CREATE TRIGGER audit_ai_summary_versions_insert
  AFTER INSERT ON public.ai_summary_versions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('ai_summary_version_created');

CREATE TRIGGER audit_ai_summary_versions_update
  AFTER UPDATE ON public.ai_summary_versions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('ai_summary_version_updated');
```

- **Verification:** Manually insert a row via SQL → confirm RLS allows admin / blocks unauthenticated / allows assigned tech read → confirm audit_logs row appears
- **Rollback:** drop table + indexes + policies
- **Estimate:** M (1 day)

#### Stage 3.2 — Edge Function inserts version row on every generation + regen feedback UI

- **Dependency:** 3.1
- **Scope (Edge Function):** `supabase/functions/generate-inspection-summary/index.ts`:
  - Compute `version_number` as `MAX(version_number) + 1` for the inspection
  - Set `superseded_at = NOW()`, `superseded_by_version_id = <new id>` on the previous version (if any)
  - Capture `model_name`, prompt_tokens, response_tokens from the OpenRouter response
  - Hash the system prompt (SHA-256, store as hex)
  - Persist the full user prompt
  - Insert the new row before returning to client
  - **Use `user_id` propagated per Stage 2.0 for `generated_by`**
  - **Accept optional `regeneration_feedback` string in the request payload; include it in the user prompt as a "Reviewer feedback to incorporate:" section; persist it on the new `ai_summary_versions.regeneration_feedback` column** (absorbed from deferred Stage 1.3)
- **Scope (Frontend — absorbed from deferred Stage 1.3):** `src/pages/InspectionAIReview.tsx`:
  - Add a textarea near the "Regenerate All Sections" / per-section regenerate buttons labelled e.g. "Tell the AI what to change (optional)"
  - On regenerate, pass the textarea value as `regeneration_feedback` in the Edge Function payload
  - Clear the textarea after successful regenerate
  - Persisted regen feedback is visible in the version history (Stage 3.7) so reviewers can see prior feedback that drove each version
- **Cleanup:** Remove the now-confirmed-dead `regenerationFeedback: ''` initialization at `TechnicianInspectionForm.tsx:2502` and the `regenerationFeedback: string` field from `src/types/inspection.ts:144` once the new InspectionAIReview-driven pathway lands. The form-state field belonged to a flow that never landed; the new flow lives in InspectionAIReview, not the technician form.
- **Verification:** Trigger generation with feedback text → confirm row appears with all metadata including `regeneration_feedback` → trigger again with different feedback → confirm previous row's `superseded_at` is set and `version_number` increments → confirm new row carries the new feedback; the system prompt + user prompt + feedback are all reproducible from the row alone
- **Rollback:** revert the Edge Function + InspectionAIReview UI changes
- **Estimate:** M+ (1.5–2 days; was 1 day in v1, +0.5 day for the absorbed regen feedback UI work)

#### Stage 3.3 — Frontend manual edits create new version row

- **Dependency:** 3.1, 3.2
- **Scope:** `src/pages/InspectionAIReview.tsx:162–186` currently calls `.update()` on `inspections` directly. Replace with: insert a new `ai_summary_versions` row with `generation_type = 'manual_edit'`, copying the current latest version's content but with the user's edits, and superseding the previous.
- **Verification:** Edit a field → save → confirm new version row created with `generation_type = 'manual_edit'` → confirm prior version is superseded
- **Rollback:** revert frontend
- **Estimate:** M (1 day)

#### Stage 3.4 — Approval flow targets latest version

- **Dependency:** 3.1, 3.2, 3.3
- **Scope:** Approval action ("Approve & Send" admin button) sets `approved_at` / `approved_by` on the latest `ai_summary_versions` row, NOT on the inspections row.
- **Verification:** Approve → query latest version row → confirm approved_at/by populated → confirm `inspections.ai_summary_approved` legacy field is also set during transition (will be dropped in 3.5)
- **Rollback:** revert frontend
- **Estimate:** S (~2h)

#### Stage 3.4.5 — Stage 3.5 consumer audit gate

- **Dependency:** 3.4 verified on production
- **Type:** **Audit-only gate. No code change. No schema change.**
- **Purpose:** Replace v1's informal "soak in preview for 1 week" wording with a formal, concrete gate. Stage 3.5 cannot proceed until this audit is complete and signed off.
- **Scope:**
  1. Comprehensive grep audit of every consumer of these soon-to-be-dropped columns:
     - `inspections.ai_summary_text`
     - `inspections.what_we_found_text`
     - `inspections.what_we_will_do_text`
     - `inspections.what_you_get_text`
     - `inspections.problem_analysis_content`
     - `inspections.demolition_content`
     - `inspections.ai_summary_approved`
     - `inspections.ai_summary_generated_at`
     - `inspections.regeneration_feedback`
  2. Search across:
     - `src/**/*.{ts,tsx}`
     - `supabase/functions/**/*.ts`
     - SQL migrations (for views or functions referencing these columns)
     - Database views (e.g. anything using `pg_views`)
  3. Output: **`docs/stage-3.5-consumer-audit.md`** — a checklist with every hit and a "migrated to view: confirmed ☐" tickbox per entry.
  4. Migrate every consumer to read from `latest_ai_summary` view BEFORE the drop migration runs.
  5. **Sign-off requirement:** every checkbox ticked + reviewed by Michael before Stage 3.5 can run. The checklist file is committed to the repo as the audit trail.
- **Verification:** Run the grep audit a second time after migrations — must return zero hits in `src/` and `supabase/functions/` reading the dropped columns directly (only the view reads them)
- **Rollback:** N/A (audit-only)
- **Estimate:** S (~3h grep + 2h checklist authoring; consumer migrations are part of Stage 3.5 work)

#### Stage 3.5 — Migrate data + drop legacy `inspections.ai_summary_*` columns

- **Dependency:** 3.4.5 signed off (every checklist entry ticked)
- **CRITICAL: Three-step migration with snapshot in between**
- **Step A — Data migration:** (unchanged from v1)
  ```sql
  INSERT INTO public.ai_summary_versions (
    inspection_id, version_number, generation_type, generated_at,
    ai_summary_text, what_we_found_text, what_we_will_do_text,
    what_you_get_text, problem_analysis_content, demolition_content,
    approved_at, approved_by
  )
  SELECT
    id, 1, 'initial',
    COALESCE(ai_summary_generated_at, updated_at, created_at),
    ai_summary_text, what_we_found_text, what_we_will_do_text,
    what_you_get_text, problem_analysis_content, demolition_content,
    CASE WHEN ai_summary_approved THEN updated_at ELSE NULL END,
    CASE WHEN ai_summary_approved THEN last_edited_by ELSE NULL END
  FROM public.inspections
  WHERE ai_summary_text IS NOT NULL;
  ```
- **Step B — Snapshot:** export `inspections` columns and `ai_summary_versions` rows to CSV/JSON before drop
- **Step C — Drop columns migration:**
  ```sql
  ALTER TABLE public.inspections
    DROP COLUMN ai_summary_text,
    DROP COLUMN ai_summary_approved,
    DROP COLUMN ai_summary_generated_at,
    DROP COLUMN what_we_found_text,
    DROP COLUMN what_we_will_do_text,
    DROP COLUMN what_you_get_text,
    DROP COLUMN problem_analysis_content,
    DROP COLUMN demolition_content,
    DROP COLUMN regeneration_feedback;
  ```
- **Compatibility view (created in Stage 3.4.5 work):**
  ```sql
  CREATE VIEW public.latest_ai_summary AS
  SELECT DISTINCT ON (inspection_id) *
  FROM public.ai_summary_versions
  ORDER BY inspection_id, version_number DESC;
  ```
- **Verification:**
  - After Step A: row count in `ai_summary_versions` ≥ count of inspections with `ai_summary_text IS NOT NULL`
  - After Step C: queries reading dropped columns now break → confirm Stage 3.4.5 audit caught them all (none should break)
- **Rollback:** restore from snapshot, recreate dropped columns from CSV
- **Estimate:** L (3–5 days, but bulk of consumer-update work happens in 3.4.5; 3.5 itself is the destructive migration plus final verification)

#### Stage 3.6 — Remove orphan Edge Functions

- **Dependency:** none (independent)
- **Scope:** Remove `generate-ai-summary` v19 and `modify-ai-summary` v19 from production Supabase. Confirm zero call sites in `src/` first.
- **Verification:** Grep entire codebase → zero hits → delete from production → confirm `supabase functions list` no longer includes them
- **Rollback:** redeploy if needed (orphans, no rollback path needed)
- **Estimate:** S (~30 min)

#### Stage 3.7 — Version history UI on InspectionAIReview

- **Dependency:** 3.1, 3.2, 3.3, 3.5
- **Scope:** Add sidebar/popover to InspectionAIReview showing version history. Latest is editable; historical are read-only.
- **Files:** `src/pages/InspectionAIReview.tsx`, plus new `src/components/inspection/AISummaryVersionHistory.tsx`
- **Verification:** Generate → manually edit → regenerate → confirm 3 versions visible, latest editable, historical read-only
- **Rollback:** revert frontend
- **Estimate:** M (1–2 days)

---

### Phase 4 — Photo integrity

#### Stage 4.1 — Caption required at upload

- **Dependency:** Phase 2 (so caption-edit operations are audited)
- **Scope:**
  - Frontend: photo upload UI gates on caption entry (must be non-empty)
  - Backend: `uploadInspectionPhoto()` in `src/lib/utils/photoUpload.ts:125` rejects with clear error if caption empty/null
  - Special case: `Section4AfterPhotos.tsx` (job completion) — currently never sets caption. Add caption field.
- **Verification:** Try to upload without caption → blocked. With caption → success and persisted.
- **Rollback:** remove validation; keep new UI field (harmless)
- **Estimate:** S (~3h)

#### Stage 4.1.5 — SyncManager offline queue caption audit

- **Dependency:** 4.1 merged to preview
- **Type:** **Audit + targeted fix.**
- **Purpose:** Confirm caption-required gating from 4.1 holds across ALL paths in `src/lib/offline/SyncManager.ts`, not just the online happy path.
- **Scope — confirm all three behaviours:**
  1. **Photo enqueue when offline:** caption must be present in IndexedDB metadata at enqueue time. If user tries to add photo offline without caption → reject at enqueue, same UX as online rejection.
  2. **Photo dequeue/upload on reconnect:** caption is re-validated before `INSERT` to `photos` table. If caption is missing on dequeue (corruption, schema change, manual IndexedDB tampering), photo is moved to a **quarantine queue** — NOT silently dropped, NOT silently uploaded with NULL caption.
  3. **Failure handling:** quarantine queue is surfaced in the UI as a banner ("X photos couldn't sync — review required"). Admin/tech can review, add captions, retry. Photos in quarantine never silently disappear.
- **Files affected:**
  - `src/lib/offline/SyncManager.ts` — enqueue + dequeue paths
  - `src/lib/offline/db.ts` — possibly add `quarantinedPhotos` Dexie store
  - `src/components/offline/OfflineBanner.tsx` (or similar) — quarantine surface
- **Verification:**
  - Go offline → try to add photo without caption → blocked at UI (1)
  - Go offline → add photo with caption → reconnect → upload succeeds with caption preserved (1+2)
  - Manually corrupt IndexedDB to remove caption from a queued photo → reconnect → photo moved to quarantine, banner appears (3)
  - Confirm zero photos with NULL caption have ever been uploaded post-fix via SQL: `SELECT COUNT(*) FROM photos WHERE caption IS NULL AND created_at > <stage 4.1 ship date>` should be 0
- **Rollback:** revert SyncManager changes (4.1's online gating still holds)
- **Estimate:** S (~3h audit + fix)

#### Stage 4.2 — Create `photo_history` table

- **Dependency:** Phase 2 (audit_logs trigger from 2.1 covers raw before/after; photo_history adds richer domain semantics)
- **Note:** photo_history coexists with audit_logs — same separation pattern as activities vs audit_logs.
- **Schema sketch:** (unchanged from v1)

```sql
CREATE TABLE public.photo_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id      UUID NOT NULL,                -- no FK so deleted photos retain history
  inspection_id UUID NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('added', 'deleted', 'caption_changed', 'reordered', 'reattached', 'category_changed')),
  before        JSONB,
  after         JSONB,
  changed_by    UUID REFERENCES auth.users(id),
  changed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photo_history_photo ON public.photo_history(photo_id, changed_at DESC);
CREATE INDEX idx_photo_history_inspection ON public.photo_history(inspection_id, changed_at DESC);

ALTER TABLE public.photo_history ENABLE ROW LEVEL SECURITY;
-- Same admin-all + tech-assigned policies as ai_summary_versions
```

- **Application-layer writes:** `src/lib/utils/photoUpload.ts` and `Section3BeforePhotos.tsx`, `Section4AfterPhotos.tsx`, `ViewReportPDF.tsx`
- **Verification:** Upload → row in photo_history. Edit caption → row. Soft-delete (4.3) → row. Reorder → row.
- **Rollback:** drop table + helper writes
- **Estimate:** M (1–2 days)

#### Stage 4.3 — Soft-delete on photos

- **Dependency:** 4.3.5 signed off (every checklist entry ticked)
- **Scope:**
  - Migration: `ALTER TABLE photos ADD COLUMN deleted_at TIMESTAMPTZ;`
  - All photo SELECT queries require `WHERE deleted_at IS NULL`
  - `deleteInspectionPhoto()` becomes UPDATE not DELETE
  - Every existing `photos` DELETE call site converted to `UPDATE … SET deleted_at = NOW()`
  - Every wired DELETE site emits `recordPhotoHistory({ action: 'deleted' })` (the deferred PR-G action gets its first caller)
- **Schema:**
  ```sql
  ALTER TABLE public.photos ADD COLUMN deleted_at TIMESTAMPTZ;
  CREATE INDEX idx_photos_active ON public.photos(inspection_id, photo_type) WHERE deleted_at IS NULL;
  ```
- **CRITICAL:** every photo-reading query must be updated. Audit gated by Stage 4.3.5 (mandatory sign-off).
- **Verification:** Upload → Soft-delete → not in UI → row exists with `deleted_at` populated → file still in Storage → `photo_history` row with `action='deleted'`
- **Rollback:** drop column + revert query changes
- **Estimate:** M (1–2 days)

#### Stage 4.3.5 — Stage 4.3 consumer audit gate

- **Dependency:** 4.2 verified live
- **Type:** **Audit-only gate. No code change. No schema change.**
- **Purpose:** Lock the destructive Stage 4.3 soft-delete migration behind a formal grep + manual audit gate. Parallels Stage 3.4.5's role for Stage 3.5. Stage 4.3 cannot proceed until this audit is complete and signed off. Same risk tier as Stage 3.5 (top-5 highest risk per §1) — same discipline.
- **Why this gate exists:** Stage 4.3 changes `photos` from hard-delete to soft-delete by adding a `deleted_at` column. Two failure modes if the gate is skipped:
  1. **Read-side leak:** Any photo SELECT that doesn't add `WHERE deleted_at IS NULL` will continue to return soft-deleted rows in UI / PDF / AI prompts / Edge Function payloads.
  2. **Write-side leak:** Any photo DELETE call site not converted to `UPDATE … SET deleted_at = NOW()` will continue to hard-delete, defeating the purpose of soft-delete (and never emitting a `photo_history { action: 'deleted' }` row).
- **Scope:**
  1. Comprehensive grep audit of every consumer that reads from or writes to `public.photos`:
     - **Read sites:** `from('photos')`, `from("photos")`, raw SQL `FROM photos`, `SELECT … FROM public.photos`, view definitions
     - **Delete sites:** `.delete()` chained off any photos query, raw SQL `DELETE FROM photos`, ON DELETE CASCADE chains from parent tables (`inspections`, `inspection_areas`, `subfloor_data`, `moisture_readings`, `subfloor_readings`, `job_completions`)
     - **Storage-side:** Storage object deletion paths that pair with row deletion (Stage 4.3 is row-soft-delete only; Storage objects continue to be deleted per current behaviour — flag any caller that assumes row-survival implies Storage-survival)
  2. Search across:
     - `src/**/*.{ts,tsx}`
     - `supabase/functions/**/*.ts`
     - `supabase/migrations/*.sql` (for views, functions, or triggers referencing `photos`)
     - Database views and functions (`pg_views`, `pg_proc`)
     - Cascade-delete graph (`information_schema.referential_constraints` rooted at `photos`)
  3. Output: **`docs/stage-4.3-consumer-audit.md`** — a checklist with three sections:
     - **Read consumers** — every hit with `"WHERE deleted_at IS NULL added: confirmed ☐"` per entry
     - **Delete consumers** — every hit with `"converted to soft-delete UPDATE: confirmed ☐"` per entry
     - **Cascade chains** — every FK to `photos` with `"cascade behaviour reviewed: confirmed ☐"` per entry (some cascades may need to remain hard-delete; that decision is documented per chain)
  4. Migrate every read consumer to add `WHERE deleted_at IS NULL` BEFORE the column-add migration runs (idempotent — adding the predicate before the column exists is harmless because every existing row has `deleted_at = NULL`).
  5. **Sign-off requirement:** every checkbox ticked + reviewed by Michael before Stage 4.3 can run. The checklist file is committed to the repo as the audit trail.
- **Verification:** Run the grep audit a second time after migrations — must return zero hits in `src/` and `supabase/functions/` reading the `photos` table without the soft-delete predicate (allow-list documented exceptions only — e.g. admin-only "show deleted" views, if any are added later).
- **Rollback:** N/A (audit-only)
- **Estimate:** S (~3h grep + 2h checklist authoring; consumer migrations are part of Stage 4.3 work)

#### Stage 4.4 — Backfill review of 58 NULL-caption photos

- **Dependency:** 4.1 + 4.1.5 (so new photos can't slip in unlabelled)
- **Scope:** Manual admin review session. Cannot auto-fill.
- **Process:**
  1. Run audit query from `audit-2026-04-30.md` Section 2.6
  2. Generate CSV with `photo_id`, `inspection_id`, `area_name`, `photo_type`, Storage URL
  3. Admin opens each photo, writes caption
  4. Apply via single update migration
- **User input required:** schedule the review session
- **Verification:** count drops from 58 to 0 (or documented "cannot label" subset → `caption = '__unlabelled__'`)
- **Rollback:** revert captions migration
- **Estimate:** L (review takes few hours human time + 1h tooling)

#### Stage 4.5 — AI prompt includes captions

- **Dependency:** 4.1 (captions reliably present)
- **Scope:** `supabase/functions/generate-inspection-summary/index.ts` `buildUserPrompt()` — include captions as `"Photo of [area]: [caption]"`.
- **Verification:** Generate AI summary → check user prompt logged in `ai_summary_versions.user_prompt` includes captions
- **Rollback:** revert Edge Function
- **Estimate:** S (~3h)

#### Stage 4.6 — PDF embeds captions as visible text

- **Dependency:** 4.1
- **Scope:** `supabase/functions/generate-inspection-pdf/index.ts` — render `<figcaption>{caption}</figcaption>` under each photo
- **Verification:** Generate PDF → captions visible under each image
- **Rollback:** revert Edge Function
- **Estimate:** M (1 day)

#### Stage 4.7 — Customer email references key photos

- **Dependency:** 4.6
- **Scope:** `src/lib/api/notifications.ts` `buildReportApprovedHtml()` — embed thumbnail + caption for cover photo. Optional: "View full photo report" link.
- **Verification:** Send test email → thumbnail + caption render in email clients
- **Rollback:** revert template
- **Estimate:** S (~3h)

---

### Phase 5 — PDF versioning hygiene

#### Stage 5.1 — FK from `pdf_versions` to `ai_summary_versions`

- **Dependency:** Phase 3
- **Schema:**
  ```sql
  ALTER TABLE public.pdf_versions
    ADD COLUMN generated_from_ai_summary_version_id UUID
    REFERENCES public.ai_summary_versions(id);

  CREATE INDEX idx_pdf_versions_ai_source ON public.pdf_versions(generated_from_ai_summary_version_id);
  ```
- **Backfill:** historical 120 PDF rows set NULL.
- **Edge Function change:** `generate-inspection-pdf` reads latest `ai_summary_versions.id` and stores it.
- **Verification:** Generate PDF → confirm FK matches latest AI version id
- **Rollback:** drop column
- **Estimate:** S (~3h)

#### Stage 5.2 — Supersession columns on `pdf_versions`

- **Dependency:** none (independent of 5.1)
- **Schema:**
  ```sql
  ALTER TABLE public.pdf_versions
    ADD COLUMN superseded_at TIMESTAMPTZ,
    ADD COLUMN superseded_by_version_id UUID REFERENCES public.pdf_versions(id);
  ```
- **Edge Function change:** mark previous version's `superseded_at = NOW()` on new insert.
- **Backfill:** populate based on `version_number` ordering per inspection
- **Verification:** Regenerate → previous version has supersession set
- **Rollback:** drop columns
- **Estimate:** S (~3h)

#### Stage 5.3 — Storage retention policy

- **Dependency:** 5.2
- **Scope:** Scheduled Edge Function (cron):
  - Finds PDFs older than 90 days that are superseded
  - Deletes Storage file (keeps `pdf_versions` row)
  - Decision: keep last 5 versions per inspection + last 90 days, whichever is more
- **Verification:** Manually trigger cron → confirm files removed, DB rows retained
- **Rollback:** disable cron
- **Estimate:** M (1–2 days)

#### Stage 5.4 — Verify Stage 1.4 debounce holding

- **Dependency:** **PR-B** in production for ≥1 week (was: Phase 1 bundled PR — updated for v2 split)
- **Scope:** No code change. Run `SELECT inspection_id, COUNT(*) FROM pdf_versions WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY inspection_id ORDER BY 2 DESC` — confirm no inspection has more than 5 PDF versions in a week.
- **Estimate:** S (~1h)

---

### Phase 6 — Email integrity

#### Stage 6.1 — Capture `email_logs.sent_by`

- **Dependency:** Stage 2.0 (system_user_uuid sentinel exists)
- **Scope:** `supabase/functions/send-email/index.ts:194` — replace `sent_by: null` with calling user id (frontend-passed) or `SYSTEM_USER_UUID` for cron/webhook.
- **Verification:** Send email from admin UI → query email_logs row → confirm `sent_by` matches admin user id. Send from cron → confirm `SYSTEM_USER_UUID`.
- **Rollback:** revert one line
- **Estimate:** S (~30 min)

#### Stage 6.2 — Capture email body

- **Dependency:** 6.1
- **Schema (Option A — recommended):**
  ```sql
  ALTER TABLE public.email_logs
    ADD COLUMN body_html TEXT,
    ADD COLUMN body_hash TEXT;  -- SHA-256 hex
  ```
- **Verification:** Send → body_html populated and hash matches
- **Rollback:** drop columns
- **Estimate:** S (~3h)

#### Stage 6.3 — FK from `email_logs` to `pdf_versions`

- **Dependency:** Phase 5
- **Schema:**
  ```sql
  ALTER TABLE public.email_logs
    ADD COLUMN pdf_version_id UUID REFERENCES public.pdf_versions(id);
  ```
- **Edge Function change:** `send-email` accepts optional `pdf_version_id`; templates pass it through.
- **Verification:** Send report-approved email → confirm FK populated
- **Rollback:** drop column
- **Estimate:** S (~3h)

#### Stage 6.4 — Audit historic NULL `sent_by` rows

- **Dependency:** 6.1
- **Scope:** Investigate 199 historical rows. framer_lead_confirmation (171) → leave NULL or set `SYSTEM_USER_UUID`. Booking-confirmation, report-approved (28) → cross-reference with `assigned_to` + activity log proximity.
- **Verification:** `SELECT COUNT(*) FROM email_logs WHERE sent_by IS NULL AND template_name != 'framer_lead_confirmation'` → near zero
- **Estimate:** S (~3h)

---

### Phase 7 — Pricing / quote history

#### Stage 7.0 — Build pricing test fixture suite

- **Dependency:** none (independent; can run alongside Phase 2)
- **Type:** **Test infrastructure. No production change.**
- **Why:** v1 said "regression-test against existing production inspections". But production has only 2 inspections. Far too small a test set to validate every rate tier and discount band. We need hand-calculated fixtures.
- **Scope:**
  1. Create `src/lib/calculations/__tests__/pricing.fixtures.test.ts`
  2. Build **10 quote scenarios** covering every rate tier and discount band:
     - Scenario 1: smallest job, no discount tier hit
     - Scenario 2: 8h job, lowest discount tier
     - Scenario 3: 16h job, middle tier
     - Scenario 4: 24h job, higher tier
     - Scenario 5: 32h job, highest tier (≤13% cap)
     - Scenario 6: 33h job, 13% cap clamped
     - Scenario 7: edge case — exactly at tier boundary (e.g. 7.99h vs 8h)
     - Scenario 8: dehumidifier-heavy job (2 dehums × 5 days)
     - Scenario 9: mixed equipment (1 dehum, 2 air movers, 1 RCD, 3 days)
     - Scenario 10: manual override scenario
  3. Each scenario: hardcode the **expected total** to 2 decimal places — calculated by hand using current `LABOUR_RATES` and `DISCOUNT_TIERS` constants
  4. Tests assert: `calculateQuote(scenario.input)` produces exactly `scenario.expected_total_inc_gst` and `scenario.expected_discount_percent`
- **Verification:** All 10 fixtures pass against current pricing engine (which still uses constants — this is the baseline)
- **Rollback:** N/A (test code; remove the file)
- **Estimate:** S (~3h — most time is the hand calculations)

#### Stage 7.1 — Create `pricing_rates` table to replace constants

- **Dependency:** Phase 2 + 7.0 fixtures passing
- **Scope:** DB-backed pricing table. Pricing engine reads from table.
- **Schema sketch:** (unchanged from v1)

```sql
CREATE TABLE public.pricing_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type       TEXT NOT NULL,
  rate_value      NUMERIC(10, 2) NOT NULL,
  effective_from  TIMESTAMPTZ NOT NULL,
  effective_to    TIMESTAMPTZ,
  reason          TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  hours_threshold NUMERIC(5, 2),
  discount_pct    NUMERIC(5, 4),
  CONSTRAINT discount_cap_13pct CHECK (discount_pct IS NULL OR discount_pct <= 0.13)
);

CREATE INDEX idx_pricing_rates_active ON public.pricing_rates(rate_type, effective_from)
  WHERE effective_to IS NULL;

ALTER TABLE public.pricing_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_authenticated_read" ON public.pricing_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins_write" ON public.pricing_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

- **13% cap enforced at DB level** via CHECK constraint.
- **Initial seed:** export current `LABOUR_RATES` and `DISCOUNT_TIERS` into seed migration with `effective_from = '2026-01-01'`.
- **Verification:**
  - **All 10 fixtures from Stage 7.0 pass exactly** against the new DB-backed engine. If even one fixture differs by a cent, Stage 7.1 does NOT ship.
  - Try to insert discount > 13% → DB rejects.
- **Rollback:** keep old constants alongside, feature-flag DB read; revert flag if anything goes wrong (interim — to be removed in 7.6)
- **Estimate:** L (3–5 days; bulk of risk now de-risked by 7.0 fixtures)

#### Stage 7.2 — Create `quote_snapshots` table

- **Dependency:** 7.1
- **Schema sketch:** (unchanged from v1)

```sql
CREATE TABLE public.quote_snapshots (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id            UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  snapshot_reason          TEXT NOT NULL,
  pricing_rates_snapshot   JSONB NOT NULL,
  pricing_fields           JSONB NOT NULL,
  total_inc_gst            NUMERIC(10, 2),
  discount_percent         NUMERIC(5, 4),
  created_by               UUID REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_snapshots_inspection ON public.quote_snapshots(inspection_id, created_at DESC);
ALTER TABLE public.quote_snapshots ENABLE ROW LEVEL SECURITY;
```

- **Estimate:** M (1–2 days)

#### Stage 7.3 — Pricing engine reads from DB (with feature-flag fallback)

- **Dependency:** 7.1
- **Scope:** `src/lib/calculations/pricing.ts` refactored to read from `pricing_rates` cached on app boot. Constants kept as fallback (interim — removed in 7.6).
- **Verification:** Bootable app with empty network → fallback works. Live app → DB rates used. **All 10 Stage 7.0 fixtures still pass.**
- **Estimate:** M (1–2 days)

#### Stage 7.4 — Snapshot writer

- **Dependency:** 7.2, 7.3
- **Scope:** Hook into pricing-changed events. Snapshot on: initial save, manual_override toggle, send to customer, rate-table update affecting active inspections.
- **Verification:** Edit a quote → confirm `quote_snapshots` row created with correct snapshot_reason
- **Estimate:** M (1–2 days)

#### Stage 7.5 — Pricing history UI

- **Dependency:** 7.2, 7.4
- **Scope:** Lead Detail / Inspection AI Review shows "Pricing history" panel.
- **Estimate:** M (1–2 days)

#### Stage 7.6 — Remove pricing constants from `pricing.ts`

- **Dependency:** Stage 7.5 verified on production for ≥1 week
- **Type:** **Final cleanup — eliminate dual source of truth.**
- **Why:** v1 left constants in place "as fallback" indefinitely. Two sources of truth = silent integrity drift waiting to happen. After 7.5 has been live in production for ≥1 week with zero pricing incidents, the constants can be removed.
- **Locked policy (decision #4):** If DB read fails on app boot, app shows a **hard error state** ("Pricing data unavailable — contact support"), NOT a silent fallback to stale constants. This forces honesty: either DB is healthy or pricing is unavailable.
- **Scope:**
  1. Delete `LABOUR_RATES` constant from `src/lib/calculations/pricing.ts`
  2. Delete `DISCOUNT_TIERS` constant from `src/lib/calculations/pricing.ts`
  3. Delete equipment rate constants (`DEHUMIDIFIER_RATE_PER_DAY`, etc.) — also moved to `pricing_rates` rows
  4. Replace fallback path with hard error: `throw new PricingDataUnavailableError("Pricing data unavailable — contact support")`
  5. Add error boundary in `App.tsx` (or equivalent) to display this state cleanly
  6. **All 10 Stage 7.0 fixtures still pass** against the post-cleanup engine (must read from seeded DB rates, not constants)
- **Verification:**
  - Grep `src/` for `LABOUR_RATES`, `DISCOUNT_TIERS`, `DEHUMIDIFIER_RATE_PER_DAY` → zero hits
  - All 10 fixtures pass
  - Simulate DB read failure (block network in DevTools) → app shows hard error, NOT a silent calculation
- **Rollback:** revert the deletion (constants come back; fallback restored)
- **Estimate:** S (~3h)

---

### Phase 8 — Render coverage sweep (Tier 8)

(Unchanged from v1.)

#### Stage 8.1 — PDF: per-area environmental readings
- **Dependency:** none
- **Scope:** PDF Edge Function — per-area block: temperature, humidity, dew_point.
- **Estimate:** S (~3h)

#### Stage 8.2 — PDF: subfloor landscape
- **Dependency:** none
- **Scope:** Render `subfloor_data.landscape` on subfloor page.
- **Estimate:** S (~1h)

#### Stage 8.3 — InspectionAIReview: missing fields
- **Dependency:** Phase 3
- **Scope:** Add display for `propertyOccupation`, `dwellingType`, `additional_info_technician`, `outdoor_dew_point`, `outdoor_comments`.
- **Estimate:** S (~3h)

#### Stage 8.4 — Lead Detail: missing fields
- **Dependency:** none
- **Scope:** Add display for `inspector_name`, `propertyOccupation`, `dwellingType`, `job_time_minutes`, `option_1`/`option_2`, `what_you_get_text`.
- **Estimate:** M (1–2 days)

#### Stage 8.5 — Resolve `external_moisture` DUP
- **Dependency:** Phase 2
- **Decision:** array vs column. Recommend array.
- **Scope:** Snapshot → migrate non-null values → drop column → update form.
- **Estimate:** M (1–2 days)

#### Stage 8.6 — Persist `address` field from Section 1
- **Dependency:** Phase 2
- **Scope:** Write form's address field to `inspections.property_address_snapshot` on save.
- **Estimate:** S (~3h)

#### Stage 8.7 — Surface `triage_description`, `requested_by`, `attention_to`
- **Dependency:** none
- **Scope:** Add to `InspectionDataDisplay.tsx`.
- **Estimate:** S (~2h)

---

### Phase 9 — Hygiene + orphans

#### Stage 9.1 — Confirm orphan AI Edge Functions removed
- **Dependency:** Stage 3.6
- **Scope:** Verify removal.
- **Estimate:** S (~30 min)

#### Stage 9.2 — `direction_photos_enabled` decision
- **Dependency:** none
- **Scope:** Drop or surface.
- **User input:** confirm intent
- **Estimate:** S (~1h)

#### Stage 9.3 — Audit dead columns
- **Dependency:** Phases 1–8 done + Stage 9.4 done
- **Scope:** Comprehensive grep for unused columns. Present to user. Drop confirmed-dead in cleanup migration.
- **Estimate:** M (1 day)

#### Stage 9.4 — Drop redundant `inspections.last_edited_at` / `last_edited_by`

- **Dependency:** Stage 2.1 in production for ≥2 weeks
- **Type:** **Schema cleanup migration + consumer update.**
- **Why:** After Stage 2.1, `audit_logs` is the source of truth for "who last edited this and when". `inspections.last_edited_at` and `inspections.last_edited_by` become redundant — same data, second copy.
- **Scope:**
  1. **Audit consumers** of `inspections.last_edited_at` and `inspections.last_edited_by` (likely `LeadDetail.tsx`, `InspectionAIReview.tsx`, possibly the PDF Edge Function)
  2. **Migrate readers** to query `audit_logs` instead:
     ```sql
     SELECT user_id, created_at
     FROM audit_logs
     WHERE entity_type = 'inspection'
       AND entity_id = $1
       AND action = 'inspection_updated'
     ORDER BY created_at DESC
     LIMIT 1;
     ```
     Wrapped in a helper `useLastEdited(entityType, entityId)` hook for reuse.
  3. **Drop migration:**
     ```sql
     ALTER TABLE public.inspections
       DROP COLUMN last_edited_at,
       DROP COLUMN last_edited_by;
     ```
  4. **Pre-flight:** snapshot the columns; grep audit confirms zero readers remain after consumer migrations
- **Verification:**
  - Grep `src/` and `supabase/functions/` for `last_edited_at` and `last_edited_by` → zero hits in code reading the columns
  - LeadDetail still displays "Last edited 2h ago by Glen" correctly (now from audit_logs)
- **Rollback:** restore columns from snapshot (data won't be live since we dropped — but downstream displays will fall back to audit_logs lookup, which is the new canonical anyway)
- **Estimate:** S (~3h)

---

### Phase 10 — UI surface for history

#### Stage 10.1 — Per-field history popover

- **Dependency:** Phases 2, 3, 4, 7
- **Scope:** For every editable field on Lead Detail and inspection form, add `(i)` icon → popover showing last N changes from `audit_logs`.
- **Files:**
  - New: `src/components/audit/FieldHistoryPopover.tsx`
  - New: `src/hooks/useFieldHistory.ts`
  - Update: `src/pages/LeadDetail.tsx`, `src/pages/TechnicianInspectionForm.tsx`, `src/pages/InspectionAIReview.tsx`
- **Estimate:** L (3–5 days)

#### Stage 10.2 — Dedicated `/admin/audit` page

- **Dependency:** 10.1
- **Scope:** New admin page with filters: entity_type, entity_id, field_name, user, time range. Table view + drill-down.
- **This is the EXCLUSIVE surface for raw audit_logs.** Per locked decision #3, audit_logs are NOT merged into the activity timeline — only here.
- **Files:** new `src/pages/AdminAudit.tsx`
- **Estimate:** XL (1+ week)

#### Stage 10.3 — Per-field "Revert" affordance

- **Dependency:** 10.1
- **Scope:** Per-field history popover gets "Revert to this value" button. Only on safe (allowlisted) fields.
- **Estimate:** L (3–5 days)

#### Stage 10.4 — Activity timeline structured display (REFORMULATED — activities-only)

- **Dependency:** Phase 2
- **Scope (REFORMULATED for v2):** Polish the existing `activities`-table-driven timeline. Replace unstructured `description` rendering with a structured `event_type + actor + target + timestamp` display. Friendly labels for known event types (`status_changed`, `pdf_sent`, `email_sent`, `lead_created`, etc.).
- **What's NOT in scope:** No merge with `audit_logs` (that's Stage 10.2). Activities table continues being the sole source for the user-facing timeline.
- **Files:** `src/components/leads/ActivityTimeline.tsx`, `src/lib/utils/activityFormatters.ts` (new — note: NOT `auditFormatters.ts`; that's Stage 10.2's territory)
- **Verification:** Open Lead Detail → activity timeline shows clean labels for every event type ("Status: New Lead → Inspection Booked", "PDF sent to customer at 2:15pm", etc.) with consistent visual treatment.
- **Estimate:** M (1–2 days)

---

## 3. Cross-Cutting Concerns

### 3.1 Data backfills required

| Stage | Backfill task | Effort |
|---|---|---|
| 3.5 | Migrate `inspections.ai_summary_text` → 1 row in `ai_summary_versions` per existing inspection | Automated, 1 SQL transaction |
| 4.4 | Manual review of 58 NULL-caption photos | Human time, 2–4 hrs |
| 5.1 | Existing 120 pdf_versions rows: leave FK NULL — historic, unfixable | None |
| 5.2 | Populate `superseded_at` on existing pdf_versions based on `version_number` | Automated SQL |
| 6.4 | Best-effort attribution of 28 historic non-framer email_logs | Manual, 1–2 hrs |
| 7.1 | Seed initial pricing_rates from current code constants | Automated SQL |
| 8.5 | Migrate `external_moisture` values to `moisture_readings` table | Automated SQL |

### 3.2 Performance impact

(Unchanged from v1.)
- Stage 2.1 audit triggers: ~60k audit_logs rows/year. Negligible.
- Stage 3.5 view reads: single-row index lookup. Negligible.
- Stage 7.3 DB-backed pricing: one DB read per session. Negligible.
- Aggregate: ~1MB/year DB growth. Free-tier safe.

### 3.3 Storage cost implications

(Unchanged from v1.)
- Phase 1.4 alone saves ~60GB/year.
- Phase 5.3 retention actively reduces Storage cost.
- Net Storage cost significantly DECREASES post-fix.

### 3.4 RLS considerations per new table

| Table | Read access | Write access |
|---|---|---|
| `ai_summary_versions` | Admin all; tech reads own assigned (via `inspections.inspector_id`, validated in Stage 2.0.5) | Admin / Edge Function (service role + propagated user_id from Stage 2.0) |
| `photo_history` | Admin all; tech reads own assigned | Admin / app helper |
| `pricing_rates` | All authenticated read | Admin only (with 13% cap CHECK) |
| `quote_snapshots` | Admin all; tech reads own assigned | Admin / system |
| `latest_ai_summary` view | Inherits underlying table RLS | N/A |

### 3.5 Verification discipline (carry-forward)

(Unchanged from v1.) Every stage:
1. Pre-flight snapshot if mutating production data
2. Vercel preview verification with concrete state checks
3. Production cleanup migration as separate step if data changes
4. Production PR cherry-pick after preview verified
5. Merge with merge-commit (not squash)
6. Bundle hash rotation confirmed on www.mrcsystem.com
7. STOP — report and wait for approval

---

## 4. Risk Register

### 4.1 Highest-risk stages (top 5 — refreshed for v2)

| Rank | Stage | Risk | Mitigation |
|---|---|---|---|
| 1 | **3.5 — Drop ai_summary columns** | Consumers reading dropped columns break silently | **Stage 3.4.5** formal grep audit gate replaces v1's informal "soak in preview" wording. Sign-off file required. |
| 2 | **7.1 — DB-backed pricing rates** | Quote calculations could shift by rounding or off-by-one | **Stage 7.0** fixture suite (10 hand-calculated scenarios) replaces v1's "regression test against 2 prod inspections". Every fixture must pass exactly. |
| 3 | **8.5 — external_moisture DUP resolution** | Existing data may not migrate cleanly if dual-writes diverged | Pre-flight diff query before drop. |
| 4 | **2.1 — Audit trigger expansion** | Trigger fails silently on edge cases with `auth.uid() = NULL` | **Stage 2.0** locks Edge Function user_id propagation BEFORE trigger expansion. SYSTEM_USER_UUID handles cron/webhook writes. |
| 5 | **4.3 — Photo soft-delete** | Missing `WHERE deleted_at IS NULL` clause means deleted photos reappear | Comprehensive grep audit before merge. |

### 4.2 Other risks worth flagging

- **Stage 4.1.5** — SyncManager quarantine queue UX. If banner is missed by user, photos sit in quarantine indefinitely. Mitigation: count badge on offline banner + admin dashboard widget.
- **Stage 1.4 (PR-B)** — admins might forget to regen and email a stale PDF. Mitigation: "Stale PDF" warning banner when AI summary newer than latest PDF.
- **Stage 6.2** — large email bodies inflate `email_logs` size at scale. If volume grows, switch to Storage URL pattern.
- **Stage 7.6** — hard error state on DB read failure could be alarming if Supabase has a brief outage. Mitigation: error message includes "this is usually transient — try again in a minute" guidance.
- **Stage 9.4** — readers of `last_edited_*` that use it for sorting might suffer perf hit moving to audit_logs subqueries. Mitigation: index `audit_logs(entity_type, entity_id, action, created_at DESC)`.

### 4.3 Rollback strategy summary

(Unchanged from v1.)
- Schema additions: drop the new column/table — no data loss
- Schema drops (3.5, 8.5, 9.4): pre-flight snapshot; rollback restores from snapshot
- Code changes: revert the PR
- Trigger additions (2.1): drop the triggers — base tables untouched
- Data migrations: every destructive migration has an `_undo` migration prepared but unapplied

---

## 5. Findings → Stage Checklist (44 audit findings)

### Pillar 1 — Inspection form save integrity (17 findings)

| # | Finding | Stage | Status |
|---|---|---|---|
| 1 | `address` DROP | 8.6 | ✓ |
| 2 | `triage_description` INVISIBLE | 8.7 | ✓ |
| 3 | `requested_by` INVISIBLE | 8.7 | ✓ |
| 4 | `attention_to` INVISIBLE | 8.7 | ✓ |
| 5 | `inspector_name` PARTIAL | 8.4 | ✓ |
| 6 | `property_occupation`, `dwelling_type` PARTIAL | 8.3, 8.4 | ✓ |
| 7 | per-area temperature/humidity/dew_point INVISIBLE in PDF | 8.1 | ✓ |
| 8 | `external_moisture` DUP | 8.5 | ✓ |
| 9 | `internal_office_notes` INVISIBLE in PDF/email | 8.1 (PDF), 4.7 (email link) | ✓ |
| 10 | `job_time_minutes` per area INVISIBLE on Lead Detail | 8.4 | ✓ |
| 11 | subfloor `landscape` INVISIBLE in PDF | 8.2 | ✓ |
| 12 | `direction_photos_enabled` INVISIBLE everywhere | 9.2 | ✓ |
| 13 | `outdoor_dew_point`, `outdoor_comments` PARTIAL | 8.3 | ✓ |
| 14 | `stainRemovingAntimicrobial` HARDCODE | 1.1 (PR-A) | ✓ |
| 15 | Legacy bools PARTIAL | 8.4 | ✓ |
| 16 | `additional_info_technician` PARTIAL | 8.3 | ✓ |
| 17 | `regenerationFeedback` DROP | **3.2 (deferred — see Stage 1.3 footnote; no current data loss, dead form-state stub absorbed by Stage 3.2 regen feedback UI work)** | ✓ |
| (18) | `option_1_*`, `option_2_total_inc_gst` PARTIAL | 8.4 | ✓ |
| (19) | `ai_summary_text` (jobSummaryFinal) INVISIBLE | 3.5 (replaced by versioned table) | ✓ |
| (20) | `what_you_get_text` PARTIAL | 8.4 | ✓ |

### Pillar 2 — Photo labelling end-to-end (8 findings)

| # | Finding | Stage | Status |
|---|---|---|---|
| 1 | `ViewReportPDF.tsx:2003` caption-clearing path | 1.2 (PR-A) | ✓ |
| 2 | AI prompt ignores captions | 4.5 | ✓ |
| 3 | PDF area/outdoor/subfloor pages don't render captions | 4.6 | ✓ |
| 4 | Section4AfterPhotos always nulls caption | 4.1 | ✓ |
| 5 | 40/71 photos have orphan attribution | 4.4 | ✓ |
| 6 | Standard area photos default-null caption | 4.1 | ✓ |
| 7 | Offline sync risk for unsynced photo labels | 4.1 + **4.1.5** (NEW — explicit SyncManager audit) | ✓ |
| 8 | Customer email omits photos | 4.7 | ✓ |

### Pillar 3 — Versioned audit history (14 findings)

| # | Finding | Stage | Status |
|---|---|---|---|
| 1 | audit_logs trigger absent on leads/inspections/etc | **2.0 + 2.0.5 + 2.1** (was 2.1 alone) | ✓ |
| 2 | Lead `assigned_to` change tracking weak | Audit_logs (Stage 2.1) provides raw diff; activities (Stage 10.4 reformulated) provides timeline event | ✓ |
| 3 | Lead archived_at no event | 2.1 (DELETE/soft-delete trigger) | ✓ |
| 4 | Only 4/62 activities have changes[] array | Audit_logs supplements activities going forward (separate domains per locked decision #3) | ✓ |
| 5 | Inspection field changes untracked | 2.1 + **9.4** (drop redundant `last_edited_*`, audit_logs is canonical) | ✓ |
| 6 | AI prompt not preserved | 3.2 | ✓ |
| 7 | AI model name/tokens not captured | 3.2 | ✓ |
| 8 | AI manual edits lose original | 3.3 | ✓ |
| 9 | Orphan AI Edge Functions | 3.6 | ✓ |
| 10 | Photo metadata changes untracked | 4.2 + 2.1 | ✓ |
| 11 | Pricing changes untracked, rate tables hardcoded | **7.0 + 7.1 + 7.2 + 7.4 + 7.6** (was 7.1+7.2+7.4 in v1) | ✓ |
| 12 | pdf_versions over-captured (109/inspection) | 1.4 (PR-B) | ✓ |
| 13 | pdf_versions FK to ai_summary_versions missing | 5.1 | ✓ |
| 14 | email_logs.sent_by NULL for 199 rows | 6.1 + 6.4 (depends on **2.0** sentinel UUID) | ✓ |
| (15) | Email HTML body not stored | 6.2 | ✓ |
| (16) | No FK from email_logs to pdf_versions | 6.3 | ✓ |

### Cross-cutting (5 findings)

| # | Finding | Stage | Status |
|---|---|---|---|
| 1 | No UI for showing field history | 10.1 (per-field popover), 10.2 (/admin/audit) | ✓ |
| 2 | Storage cost — PDF regen burning 60GB/yr | 1.4 (PR-B) + 5.3 | ✓ |
| 3 | No revert/rollback path | 10.3 | ✓ |
| 4 | Performance — indexes for history tables | Built into each schema sketch | ✓ |
| 5 | audit_logs trigger gap (duplicate of Pillar 3 #1) | 2.0 + 2.0.5 + 2.1 | ✓ |

### Summary

**44 findings → 100% assigned to stages. None deferred.**

---

## 6. Closing Notes

- This document is the execution map. No code is changed by reading it.
- Every stage has a manual approval gate. No auto-progression.
- The constraints in the brief (auth untouched, 13% cap sacred, customer_preferred_* untouched, calendar_bookings rows never deleted, PR #38 never cherry-picked, Phase 2 out of scope, useRevisionJobs.ts dormant) are honoured throughout.
- After this plan is approved: execution begins at Stage 1.1 (PR-A). STOP gate after each stage.

---

## 6.1 Definition of Done — Formal Exit Criteria

The fix plan is **complete** when ALL of the following are simultaneously true:

### A. Findings closure

- [ ] All 44 audit findings closed and verified on production
- [ ] Each finding has a linked verification artifact (PR URL, screenshot, SQL output, or test file path) in `docs/verification-evidence/<finding-id>.md`

### B. Test fixture suite

- [ ] All 10 pricing fixtures from Stage 7.0 pass exactly (to 2 decimal places)
- [ ] Stage 7.6 cleanup run: zero hits in `src/` for `LABOUR_RATES`, `DISCOUNT_TIERS`, equipment rate constants
- [ ] Stage 3.4.5 consumer audit checklist: every entry ticked, file committed to repo

### C. Stakeholder walkthrough

- [ ] Glen + Clayton walkthrough completes successfully on a sample inspection workflow (lead capture → inspection form → AI summary → admin review → PDF send → email send) with **zero surprises**
- [ ] Walkthrough captured in `docs/walkthrough-2026-XX-XX.md` with sign-off

### D. Production data integrity (30-day soak)

- [ ] Production has **30 consecutive days post-Phase-10** with **zero data-integrity incidents**
- [ ] Definition of "data-integrity incident": a row in any audited table whose `audit_logs` shows a write that does NOT have a corresponding application-layer event (i.e. an unattributed write that escaped the user_id propagation pattern). Validated by a daily query:
  ```sql
  SELECT COUNT(*) FROM audit_logs
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND user_id IS NULL
    AND user_id != $SYSTEM_USER_UUID;
  ```
  Expected result: 0 every day for 30 consecutive days.

### E. Documentation

- [ ] CLAUDE.md updated to reference this v2 plan as the executed map
- [ ] `docs/TODO.md` reflects Phase 1 / 2 / Job Completion progress
- [ ] `docs/edge-function-audit-pattern.md` (created in Stage 2.0) committed to repo
- [ ] `docs/inspector-id-sync-decision.md` (created in Stage 2.0.5) committed to repo
- [ ] `docs/stage-3.5-consumer-audit.md` (created in Stage 3.4.5) committed to repo with all checkboxes ticked

### F. Operational handover

- [ ] Glen and Clayton have working accounts and have logged in successfully at least once
- [ ] At least one real customer inspection has gone through the full fixed pipeline (lead → inspection → PDF → email → archive) with no manual intervention required

When all six criteria are met, the plan is **DONE**. Until then, the plan is **IN FLIGHT**.

---

End of fix plan v2.

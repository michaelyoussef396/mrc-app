# Inspection Workflow Fix Plan — 2026-04-30

**Companion to:** `docs/inspection-workflow-audit-2026-04-30.md`

**Goal:** Close all 44 findings from the audit before MRC takes real customer load. No production-data constraints today (Glen, Clayton, Vryan not yet on the system) — one shot to do this properly.

**Execution discipline:** Stage-by-stage with manual approval between each. Same cadence as the technician dashboard cleanup (Stage 1 → 2 → 2.5 → Stage 4 production merge). No auto-progression. Every stage has its own pre-flight snapshot, Vercel preview verification, and explicit STOP gate.

**No code is changed by this document.** This is the master execution map.

---

## 1. Executive Summary

### Stage count

- **10 phases**, **42 stages** total (Stage 1.1 through 10.4)
- All 44 audit findings assigned to a stage; nothing deferred
- 4 stages are **schema migrations**; 5 are **data migrations**; 9 are **Edge Function changes**; the rest are **frontend**

### Wall-clock estimate

If executed sequentially with one human reviewing each stage: **~8–10 weeks**.
With moderate parallelism (Phase 4 alongside Phases 5+6, Phase 7 after Phase 2): **~6 weeks**.
The gating constraint is review time, not implementation time. Most stages are S or M.

### Critical path

```
Phase 1 (4 quick wins, 1 PR)
   ↓
Phase 2 (audit_logs trigger expansion) ──┐
   ↓                                      │
Phase 3 (AI summary versioning)            │
   ↓                                      ├──→ Phase 9 (hygiene, anytime)
Phase 5 (PDF FK + retention)               │
   ↓                                      │
Phase 6 (email integrity)                  │
   ↓                                      │
Phase 10 (UI surface for history) ◀──────┘

Parallel branches after Phase 2:
   Phase 4 (photo integrity)  →  Phase 8.6 (PDF captions)
   Phase 7 (pricing history)
   Phase 8 (render coverage sweep, after Phase 4.6 for caption work)
```

### Phase scope summary

| Phase | Stages | Scope | Risk |
|---|---|---|---|
| 1 — Tier 0 quick wins | 1.1–1.4 | S × 4 | Low |
| 2 — Audit trigger expansion | 2.1–2.3 | M, S, M | Medium |
| 3 — AI summary versioning | 3.1–3.7 | M, M, M, S, L, S, M | High |
| 4 — Photo integrity | 4.1–4.7 | S, M, M, L, S, M, S | Medium |
| 5 — PDF versioning hygiene | 5.1–5.4 | S, S, M, S | Low |
| 6 — Email integrity | 6.1–6.4 | S, S, S, S | Low |
| 7 — Pricing / quote history | 7.1–7.5 | L, M, M, M, M | High |
| 8 — Render coverage sweep | 8.1–8.7 | S, S, S, M, M, S, S | Medium |
| 9 — Hygiene + orphans | 9.1–9.3 | S, S, M | Low |
| 10 — UI surface for history | 10.1–10.4 | L, XL, L, M | Medium |

### Top 5 highest-risk stages

1. **Stage 3.5** — Drop `ai_summary_text` and related columns from `inspections`. Destructive, requires data migration to succeed first.
2. **Stage 7.1** — Replace hardcoded `LABOUR_RATES` / `DISCOUNT_TIERS` constants with a DB-backed `pricing_rates` table. Every quote calculation depends on this; the 13% cap must remain enforced exactly.
3. **Stage 8.5** — Resolve `external_moisture` storage duplication. Schema change with a data migration; must pick the correct source of truth.
4. **Stage 2.1** — Wire `audit_log_trigger()` to 8 tables. If the trigger function has a permission edge case (e.g. `auth.uid()` returning NULL during background jobs), saves could fail silently or noisily.
5. **Stage 4.3** — Soft-delete on photos. Adds `WHERE deleted_at IS NULL` requirement to every photo-reading query in the app; easy to miss one.

### Where user input is needed during execution

- **Stage 1.4** — Pick PDF regen strategy: debounce (5min) vs user-explicit button only. Recommendation in the stage detail.
- **Stage 4.4** — Admin must manually review 58 production photos with NULL captions. Cannot auto-fill. Schedule a review session.
- **Stage 7.1** — Confirm pricing rate versioning approach (effective_from/effective_to vs simple version_number) before migration writes.
- **Stage 8.5** — Confirm `external_moisture` source of truth: array (recommend) vs column.
- **Stage 9.3** — User reviews the dead-column candidates before drop migration runs.

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

### Phase 1 — Tier 0 quick wins (bundled PR)

All four ship as ONE PR after each stage's individual verification passes. Together they halt active data destruction without any schema changes.

#### Stage 1.1 — Fix `stainRemovingAntimicrobial` hardcode

- **Dependency:** none
- **Scope:** `src/pages/TechnicianInspectionForm.tsx:3299` — replace hardcoded `false` with the form-state value
- **Schema:** none
- **Verification:** Toggle the field on/off in the form, save, reload, confirm the value round-trips. Check `inspections.stain_removing_antimicrobial` directly via SQL.
- **Rollback:** revert single line; trivial
- **Estimate:** S (~30 min)

#### Stage 1.2 — Stop caption-clearing path

- **Dependency:** none
- **Scope:** `src/pages/ViewReportPDF.tsx:2003` — when admin selects a different cover photo, do NOT blank the previous photo's caption. Either preserve, or write the change to history once Stage 4.2 ships
- **Schema:** none
- **Verification:** In ViewReportPDF, swap a cover photo. Query `photos.caption` for the previously-selected photo — confirm it's unchanged
- **Rollback:** trivial single-line revert
- **Estimate:** S (~30 min)

#### Stage 1.3 — Persist `regenerationFeedback`

- **Dependency:** none
- **Scope:**
  - Frontend: include `regenerationFeedback` in the inspection mutation payload
  - Save to `inspections.regeneration_feedback` (new column, simplest path) — OR pass through to the AI Edge Function and have it persisted with the upcoming `ai_summary_versions` row
- **Recommendation:** Park it in `inspections.regeneration_feedback` for now (Stage 1) → migrate to `ai_summary_versions.regeneration_feedback` in Stage 3.2 (column on the new table is already in the audit's schema sketch)
- **Schema sketch (transient column for Stage 1):**
  ```sql
  ALTER TABLE public.inspections
    ADD COLUMN regeneration_feedback TEXT;
  ```
  → Dropped in Stage 3.5 once `ai_summary_versions` carries it.
- **Verification:** Type feedback in form → click Regenerate → query `inspections.regeneration_feedback` → confirm value persisted
- **Rollback:** drop column
- **Estimate:** S (~2h including migration)

#### Stage 1.4 — Debounce / make-explicit PDF regen

- **Dependency:** none
- **Decision needed from user:** which strategy?
  - **Option A (recommended):** Remove `regenerate: true` from `updateFieldAndRegenerate()` in `src/lib/api/pdfGeneration.ts:127`. Make PDF regen user-explicit — admin clicks a "Regenerate PDF" button after a batch of edits. This is the cleanest fix and matches admin mental model.
  - **Option B:** Debounce regen with a 5-minute idle timer. Continue auto-regen but only fire after the user stops editing for 5 minutes.
  - **Option C:** Both — fire user-explicit button as primary; auto-regen on a 30-minute backstop.
- **Recommendation:** Option A. Simple, predictable, eliminates the 109-version-per-inspection pattern entirely. Admins are already in the Inspection AI Review flow when editing; one extra click is well worth eliminating 60GB/yr of Storage waste.
- **Scope:** `src/lib/api/pdfGeneration.ts:127`, plus a "Regenerate PDF" button on `src/pages/InspectionAIReview.tsx`, plus a "Regenerate" button on `src/pages/ViewReportPDF.tsx` if not already present
- **Schema:** none
- **Verification:** Edit a field 10 times in InspectionAIReview → confirm 0 new rows in `pdf_versions`. Click "Regenerate PDF" → confirm exactly 1 new row.
- **Rollback:** revert the function change
- **Estimate:** S (~3h including UX for the button)

#### Phase 1 bundled PR

After Stages 1.1–1.4 each verified individually on Vercel preview, bundle into one production PR titled "Tier 0 quick wins — halt data destruction & regen storm". This matches the precedent set by the technician-dashboard production merge.

---

### Phase 2 — Foundation: row-level audit (Tier 1)

#### Stage 2.1 — Attach `audit_log_trigger()` to 8 tables

- **Dependency:** Phase 1 merged to production (so we don't audit the noise of broken behaviour)
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
  - Mutate one row of each table type via the UI (or directly via SQL) on Vercel preview
  - Query `audit_logs` and confirm a row appears with correct `entity_type`, `action`, and `metadata.before` / `metadata.after`
  - Confirm `auth.uid()` is captured correctly when the trigger fires from an authenticated user context
  - Edge case: confirm trigger fires on Edge Function service-role writes (it should, but `auth.uid()` will be NULL)
- **Rollback:** drop all 23 triggers in a follow-up migration
- **Estimate:** M (1 day including verification matrix)

#### Stage 2.2 — Verification & integration test pass

- **Dependency:** 2.1
- **Scope:** No code changes. Run a structured verification:
  - Mutate every audited table via every code path that writes it
  - Confirm `audit_logs` captures each
  - Confirm no save path is broken by trigger overhead
  - Test offline → reconnect sync flow doesn't bypass triggers
- **Verification matrix:**
  | Mutation path | Source file | Should appear in audit_logs |
  |---|---|---|
  | Create lead | `useLeadUpdate.ts` | Y |
  | Update lead (name, phone, etc.) | inline edit | Y |
  | Soft-archive lead | `LeadDetail.tsx` | Y |
  | Auto-save inspection form | `TechnicianInspectionForm.tsx` | Y |
  | Add area | form | Y |
  | Update moisture reading | form | Y |
  | Add subfloor reading | form | Y |
  | Upload photo | `photoUpload.ts:125` | Y |
  | Delete photo | `photoUpload.ts:261` | Y |
  | Update photo caption | various | Y |
  | Edge Function write (e.g. PDF gen updates `pdf_url`) | Edge Function | Y (but `auth.uid()` may be NULL) |
- **Rollback:** N/A (test-only stage)
- **Estimate:** S (~3h)

#### Stage 2.3 — Activity log UI surfacing audit_logs

- **Dependency:** 2.1, 2.2
- **Scope:** Lead Detail's activity timeline currently shows only `activities` rows. Augment with `audit_logs` rows (filtered to that lead's entity_id and related inspections/photos). Render with friendly labels (`"Phone updated: 0433 880 401 → 0433 880 402"` not `"phone: '433880401' → '0433880401'"`).
- **Files affected:**
  - `src/hooks/useActivityTimeline.ts` (or wherever activities are fetched) — extend to merge with audit_logs
  - `src/components/leads/ActivityTimeline.tsx` — render new event types
  - `src/lib/utils/auditFormatters.ts` (new) — column-name → human-label mapping per table
- **Verification:** Edit a lead's phone → confirm timeline shows "Phone updated" with old/new values formatted nicely
- **Rollback:** revert the timeline component to the activities-only version
- **Estimate:** M (1–2 days)

---

### Phase 3 — AI summary versioning (CRITICAL)

#### Stage 3.1 — Create `ai_summary_versions` table

- **Dependency:** Phase 2 (so the new table itself gets audit coverage)
- **Scope:** New migration. Per audit doc Section 3.3.
- **Schema sketch:**

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

#### Stage 3.2 — Edge Function inserts version row on every generation

- **Dependency:** 3.1
- **Scope:** `supabase/functions/generate-inspection-summary/index.ts`:
  - Compute `version_number` as `MAX(version_number) + 1` for the inspection
  - Set `superseded_at = NOW()`, `superseded_by_version_id = <new id>` on the previous version (if any)
  - Capture `model_name`, prompt_tokens, response_tokens from the OpenRouter response
  - Hash the system prompt (SHA-256, store as hex)
  - Persist the full user prompt (form data passed in)
  - Insert the new row before returning to client
- **Verification:** Trigger generation → confirm row appears with all metadata fields populated → trigger again → confirm previous row's `superseded_at` is set and `version_number` increments
- **Rollback:** revert the Edge Function to v51 behaviour
- **Estimate:** M (1 day)

#### Stage 3.3 — Frontend manual edits create new version row

- **Dependency:** 3.1, 3.2
- **Scope:** `src/pages/InspectionAIReview.tsx:162–186` currently calls `.update()` on `inspections` directly. Replace with: insert a new `ai_summary_versions` row with `generation_type = 'manual_edit'`, copying the current latest version's content but with the user's edits, and superseding the previous.
- **Verification:** Edit a field → save → confirm new version row created with `generation_type = 'manual_edit'` → confirm prior version is superseded
- **Rollback:** revert frontend
- **Estimate:** M (1 day)

#### Stage 3.4 — Approval flow targets latest version

- **Dependency:** 3.1, 3.2, 3.3
- **Scope:** Approval action ("Approve & Send" admin button) sets `approved_at` / `approved_by` on the latest `ai_summary_versions` row, NOT on the inspections row.
- **Schema:** uses existing approval columns on the new table — no schema change
- **Verification:** Approve → query latest version row → confirm approved_at/by populated → confirm `inspections.ai_summary_approved` legacy field is also set during transition (will be dropped in 3.5)
- **Rollback:** revert frontend
- **Estimate:** S (~2h)

#### Stage 3.5 — Migrate data + drop legacy `inspections.ai_summary_*` columns

- **Dependency:** 3.1, 3.2, 3.3, 3.4 (and at least one full inspection lifecycle through the new flow on Vercel preview)
- **CRITICAL: Two-step migration with snapshot in between**
- **Step A — Data migration:**
  ```sql
  -- For every inspection row with non-null ai_summary_text, create an initial
  -- ai_summary_versions row to preserve the historic content
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
- **Step B — Snapshot:** export `inspections` columns and `ai_summary_versions` rows to a CSV / JSON file before drop
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
- **Verification:**
  - After Step A: row count in `ai_summary_versions` ≥ count of inspections with `ai_summary_text IS NOT NULL`
  - Production has 1 inspection with `ai_summary_text` today → exactly 1 row created
  - After Step C: queries that previously read `inspections.ai_summary_text` now break → fix all consumers (search src/ for the column name) before running Step C
- **Pre-flight required code changes (must merge BEFORE Step C):**
  - `src/components/leads/InspectionDataDisplay.tsx`
  - `src/pages/InspectionAIReview.tsx`
  - `src/pages/ViewReportPDF.tsx`
  - `supabase/functions/generate-inspection-pdf/index.ts`
  - All grep hits for `ai_summary_text`, `what_we_found_text`, etc. → replace with reads from `ai_summary_versions WHERE inspection_id = X ORDER BY version_number DESC LIMIT 1` (or via a view)
- **Recommended:** create a database VIEW `latest_ai_summary` that consumers read from, isolating them from the schema change:
  ```sql
  CREATE VIEW public.latest_ai_summary AS
  SELECT DISTINCT ON (inspection_id) *
  FROM public.ai_summary_versions
  ORDER BY inspection_id, version_number DESC;
  ```
- **Rollback:** restore from snapshot, recreate dropped columns from CSV
- **Estimate:** L (3–5 days because of consumer updates)

#### Stage 3.6 — Remove orphan Edge Functions

- **Dependency:** none (independent)
- **Scope:** Remove `generate-ai-summary` v19 and `modify-ai-summary` v19 from production Supabase via the dashboard or `supabase functions delete`. Confirm zero call sites in `src/` first.
- **Verification:** Grep entire codebase for the function slugs → must return zero hits → delete from production → confirm `supabase functions list` no longer includes them
- **Rollback:** they're orphans, so no rollback path needed; if accidentally needed later, redeploy
- **Estimate:** S (~30 min)

#### Stage 3.7 — Version history UI on InspectionAIReview

- **Dependency:** 3.1, 3.2, 3.3, 3.5
- **Scope:** Add a sidebar or popover to InspectionAIReview showing version history: "Version 3 of 5 — Manual edit by admin@mrc — 2026-05-01 — Approved". Each version is clickable to view that snapshot. Latest is editable; historical are read-only.
- **Files:** `src/pages/InspectionAIReview.tsx`, plus new `src/components/inspection/AISummaryVersionHistory.tsx`
- **Verification:** Generate → manually edit → regenerate → confirm 3 versions visible, latest is editable, historical are read-only with clear "Superseded" label
- **Rollback:** revert frontend
- **Estimate:** M (1–2 days)

---

### Phase 4 — Photo integrity

#### Stage 4.1 — Caption required at upload

- **Dependency:** Phase 2 (so caption-edit operations are audited)
- **Scope:**
  - Frontend: photo upload UI gates on caption entry (input field, must be non-empty)
  - Backend: `uploadInspectionPhoto()` in `src/lib/utils/photoUpload.ts:125` rejects with clear error if `caption` is empty/null
  - Special case: `Section4AfterPhotos.tsx` (job completion) — currently never sets caption. Add a caption field to the after/demolition photo upload UI.
- **Verification:** Try to upload without caption → blocked. With caption → success and caption persisted.
- **Rollback:** remove the validation; keep the new caption field in UI (harmless)
- **Estimate:** S (~3h)

#### Stage 4.2 — Create `photo_history` table

- **Dependency:** Phase 2 (the audit_logs trigger on `photos` from 2.1 covers raw before/after; this table adds richer domain semantics)
- **Note:** Audit_logs from Stage 2.1 already captures photo INSERT/UPDATE/DELETE at the row level. `photo_history` is the domain-rich layer (action_type categorisation, before/after caption snapshots, reorder events). Coexists with audit_logs.
- **Schema sketch:**

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

- **Application-layer writes:** `src/lib/utils/photoUpload.ts` and `Section3BeforePhotos.tsx`, `Section4AfterPhotos.tsx`, `ViewReportPDF.tsx` write to `photo_history` whenever they mutate `photos`. Wrap in a helper.
- **Verification:** Upload → row in photo_history. Edit caption → row. Soft-delete (Stage 4.3) → row. Reorder → row.
- **Rollback:** drop table + helper writes
- **Estimate:** M (1–2 days)

#### Stage 4.3 — Soft-delete on photos

- **Dependency:** 4.2
- **Scope:**
  - Migration: `ALTER TABLE photos ADD COLUMN deleted_at TIMESTAMPTZ;`
  - All photo SELECT queries in `src/` now require `WHERE deleted_at IS NULL`
  - `deleteInspectionPhoto()` in `photoUpload.ts:261` becomes UPDATE not DELETE
  - Storage cleanup of soft-deleted photo files runs on a scheduled job (out of scope here — flag as Phase 9 follow-up)
- **Schema:**
  ```sql
  ALTER TABLE public.photos ADD COLUMN deleted_at TIMESTAMPTZ;
  CREATE INDEX idx_photos_active ON public.photos(inspection_id, photo_type) WHERE deleted_at IS NULL;
  ```
- **CRITICAL:** every photo-reading query in the app (and in Edge Functions like `generate-inspection-pdf`) must be updated. Grep for `from('photos')` and audit each.
- **Verification:** Upload → Soft-delete → Photo no longer appears in UI → Row still exists in DB with `deleted_at` populated → Photo still in Storage (cleanup is separate)
- **Rollback:** drop column + revert query changes
- **Estimate:** M (1–2 days because of consumer audit)

#### Stage 4.4 — Backfill review of 58 NULL-caption photos

- **Dependency:** 4.1 (so new photos can't slip in unlabelled while we work on this)
- **Scope:** Manual admin review session. Cannot auto-fill — labels need human judgment.
- **Process:**
  1. Run the audit query from `audit-2026-04-30.md` Section 2.6
  2. Generate a CSV with `photo_id`, `inspection_id`, `area_name` (from FK if any), `photo_type`, Storage URL
  3. Admin (Michael / Glen) opens each photo and writes a caption
  4. Apply via single update migration with the captions
- **Estimate:** L (review takes a few hours of human time + 1h of tooling)
- **User input required:** schedule the review session
- **Verification:** Re-run the audit query — count drops from 58 to 0 (or to a documented "cannot label" subset that gets `caption = '__unlabelled__'` for clarity)
- **Rollback:** revert the captions migration

#### Stage 4.5 — AI prompt includes captions

- **Dependency:** Phase 4.1 (so captions are reliably present for new photos)
- **Scope:** `supabase/functions/generate-inspection-summary/index.ts` `buildUserPrompt()` (lines ~178–306) — fetch photos for the inspection, group by area, include captions in the prompt as `"Photo of [area]: [caption]"`. Photo URLs not included (model isn't multimodal in current path).
- **Verification:** Generate AI summary on a test inspection with captioned photos → check the user prompt logged in `ai_summary_versions.user_prompt` includes the captions
- **Rollback:** revert Edge Function
- **Estimate:** S (~3h)

#### Stage 4.6 — PDF embeds captions as visible text

- **Dependency:** Phase 4.1
- **Scope:** `supabase/functions/generate-inspection-pdf/index.ts`:
  - Area photo grid: render `<figcaption>{caption}</figcaption>` under each photo
  - Outdoor photos page: same
  - Subfloor photos page: same
- **Verification:** Generate a PDF for an inspection with captioned photos → open PDF → confirm captions visible under each image
- **Rollback:** revert Edge Function
- **Estimate:** M (1 day, including PDF layout adjustments)

#### Stage 4.7 — Customer email references key photos

- **Dependency:** 4.6
- **Scope:** `src/lib/api/notifications.ts` `buildReportApprovedHtml()` and similar templates — embed thumbnail + caption for the front-house cover photo at minimum. Optionally: a "View full photo report" link.
- **Verification:** Send a test email → confirm thumbnail + caption render in email clients
- **Rollback:** revert template
- **Estimate:** S (~3h)

---

### Phase 5 — PDF versioning hygiene

#### Stage 5.1 — FK from `pdf_versions` to `ai_summary_versions`

- **Dependency:** Phase 3 (ai_summary_versions exists)
- **Schema:**
  ```sql
  ALTER TABLE public.pdf_versions
    ADD COLUMN generated_from_ai_summary_version_id UUID
    REFERENCES public.ai_summary_versions(id);

  CREATE INDEX idx_pdf_versions_ai_source ON public.pdf_versions(generated_from_ai_summary_version_id);
  ```
- **Backfill:** Cannot retroactively link existing 120 PDF rows. Set NULL for historical; populate going forward.
- **Edge Function change:** `generate-inspection-pdf` reads the latest `ai_summary_versions.id` before rendering and stores it in this column when inserting the pdf_versions row.
- **Verification:** Generate a PDF → confirm `generated_from_ai_summary_version_id` matches the latest AI version id
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
- **Edge Function change:** when inserting new PDF version, mark the previous version's `superseded_at = NOW()` and `superseded_by_version_id = <new id>`
- **Backfill:** for existing rows, populate based on `version_number` ordering per inspection
- **Verification:** Regenerate → previous version has supersession set
- **Rollback:** drop columns
- **Estimate:** S (~3h)

#### Stage 5.3 — Storage retention policy

- **Dependency:** 5.2 (need to know which are superseded)
- **Scope:** Scheduled Edge Function (cron) that:
  - Finds PDFs in Storage older than 90 days that are superseded
  - Deletes the Storage file (keeps the `pdf_versions` row, sets `pdf_url = NULL` or appends a `__archived` marker)
  - OR moves to a cheaper Storage tier if Supabase exposes that — currently it does not, so deletion is the path
- **Decision:** confirm retention period (recommend: keep last 5 versions per inspection + last 90 days, whichever is more)
- **Verification:** Manually trigger the cron on a test inspection with old superseded PDFs → confirm files removed from Storage, DB rows retained
- **Rollback:** disable the cron
- **Estimate:** M (1–2 days)

#### Stage 5.4 — Verify Stage 1.4 debounce holding

- **Dependency:** 1.4 in production for ≥ 1 week
- **Scope:** No code change. Run `SELECT inspection_id, COUNT(*) FROM pdf_versions WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY inspection_id ORDER BY 2 DESC` — confirm no inspection has more than 5 PDF versions in a week.
- **If still high:** investigate the call site, tighten further
- **Estimate:** S (~1h)

---

### Phase 6 — Email integrity

#### Stage 6.1 — Capture `email_logs.sent_by`

- **Dependency:** none
- **Scope:** `supabase/functions/send-email/index.ts:194` — replace `sent_by: null` with the calling user id. Edge Functions running with user JWT have `auth.uid()` available; service-role calls (cron, framer-lead) get NULL or a sentinel like `'system'`.
- **Schema:** if `'system'` sentinel chosen, allow that with a check constraint or just leave NULL for system sends (keep `sent_by` as UUID nullable).
- **Verification:** Send email from admin UI → query email_logs row → confirm `sent_by` matches admin user id
- **Rollback:** revert one line
- **Estimate:** S (~30 min)

#### Stage 6.2 — Capture email body

- **Dependency:** 6.1
- **Scope:** Two options:
  - **Option A (recommended for now):** add `body_html` text column on `email_logs`. Cheap for current volume (199 rows in 6 months). Most templates ≤50KB.
  - **Option B:** store body in Supabase Storage, save URL in metadata. Better at scale but more moving parts.
- **Schema (Option A):**
  ```sql
  ALTER TABLE public.email_logs
    ADD COLUMN body_html TEXT,
    ADD COLUMN body_hash TEXT;  -- SHA-256 hex for integrity check
  ```
- **Verification:** Send → confirm body_html populated and hash matches
- **Rollback:** drop columns
- **Estimate:** S (~3h)

#### Stage 6.3 — FK from `email_logs` to `pdf_versions`

- **Dependency:** Phase 5
- **Schema:**
  ```sql
  ALTER TABLE public.email_logs
    ADD COLUMN pdf_version_id UUID REFERENCES public.pdf_versions(id);
  ```
- **Edge Function change:** `send-email` accepts an optional `pdf_version_id` parameter; templates that send a specific PDF (`report-approved`, `job_report_sent`, `inspection_reminder`) pass it through.
- **Verification:** Send a report-approved email referencing a specific PDF → confirm FK populated
- **Rollback:** drop column
- **Estimate:** S (~3h)

#### Stage 6.4 — Audit historic NULL `sent_by` rows

- **Dependency:** 6.1
- **Scope:** Investigate the 199 historical rows. For framer_lead_confirmation (171 rows) — no admin user, leave NULL or set `'system'`. For booking-confirmation, report-approved, etc. (28 rows) — try to attribute via cross-reference with the lead's `assigned_to` user at that timestamp + activity log proximity.
- **Estimate:** S (~3h)
- **Verification:** Query `SELECT COUNT(*) FROM email_logs WHERE sent_by IS NULL AND template_name != 'framer_lead_confirmation'` → near zero after backfill

---

### Phase 7 — Pricing / quote history

#### Stage 7.1 — Create `pricing_rates` table to replace constants

- **Dependency:** Phase 2
- **Scope:** Replace the hardcoded `LABOUR_RATES` / `DISCOUNT_TIERS` constants in `src/lib/calculations/pricing.ts` with a DB-backed table. Pricing engine reads from the table (cached aggressively client-side; revalidated on app boot).
- **Schema sketch:**

```sql
CREATE TABLE public.pricing_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type       TEXT NOT NULL,                -- 'labour_tier_2h', 'labour_tier_8h', 'equipment_dehumidifier_day', 'discount_tier_1', etc.
  rate_value      NUMERIC(10, 2) NOT NULL,
  effective_from  TIMESTAMPTZ NOT NULL,
  effective_to    TIMESTAMPTZ,                   -- NULL = currently active
  reason          TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Discount-specific fields when applicable
  hours_threshold NUMERIC(5, 2),
  discount_pct    NUMERIC(5, 4),

  -- Hard guard: discount cannot exceed 13%
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

- **Critical: 13% discount cap enforced at DB level via CHECK constraint** — this is the non-negotiable from CLAUDE.md.
- **Initial seed data:** export current `LABOUR_RATES` and `DISCOUNT_TIERS` from `pricing.ts` into seed migration with `effective_from = '2026-01-01'`.
- **Application change:** `pricing.ts` reads the active rate set on app boot, caches in memory. Hot path doesn't touch DB.
- **Verification:**
  - Existing quotes recalculate to identical totals against the seeded rates (regression test against known-good production quotes)
  - Try to insert a discount > 13% → DB rejects
- **Rollback:** keep the old constants alongside, feature-flag the DB read; revert the flag if anything goes wrong
- **Estimate:** L (3–5 days because of regression test breadth)

#### Stage 7.2 — Create `quote_snapshots` table

- **Dependency:** 7.1
- **Schema sketch:**

```sql
CREATE TABLE public.quote_snapshots (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id            UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  snapshot_reason          TEXT NOT NULL,        -- 'initial' | 'manual_override_toggled' | 'sent_to_customer' | 'pdf_generated' | 'rates_changed'
  pricing_rates_snapshot   JSONB NOT NULL,        -- snapshot of pricing_rates rows that were active at this moment
  pricing_fields           JSONB NOT NULL,        -- snapshot of all pricing fields from inspections row
  total_inc_gst            NUMERIC(10, 2),
  discount_percent         NUMERIC(5, 4),

  created_by               UUID REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_snapshots_inspection ON public.quote_snapshots(inspection_id, created_at DESC);
ALTER TABLE public.quote_snapshots ENABLE ROW LEVEL SECURITY;
-- admin all, tech-assigned read
```

- **Estimate:** M (1–2 days)

#### Stage 7.3 — Pricing engine reads from DB

- **Dependency:** 7.1
- **Scope:** `src/lib/calculations/pricing.ts` refactored to read from `pricing_rates` cached on app boot. Constants kept as fallback in case DB read fails on bootstrap.
- **Verification:** Bootable app with empty network → confirms fallback works. Live app → confirms DB rates used.
- **Estimate:** M (1–2 days)

#### Stage 7.4 — Snapshot writer

- **Dependency:** 7.2, 7.3
- **Scope:** Hook into pricing-changed events:
  - On first save where pricing fields are non-zero → snapshot 'initial'
  - On `manual_price_override` toggle → snapshot 'manual_override_toggled'
  - On admin "send to customer" → snapshot 'sent_to_customer'
  - When a `pricing_rates` row is updated (rate change) → snapshot all active inspections affected
- **Verification:** Edit a quote → confirm `quote_snapshots` row created with correct snapshot_reason
- **Estimate:** M (1–2 days)

#### Stage 7.5 — Pricing history UI

- **Dependency:** 7.2, 7.4
- **Scope:** Lead Detail / Inspection AI Review shows a "Pricing history" panel: each snapshot listed with `total_inc_gst`, `discount_percent`, snapshot_reason, timestamp.
- **Estimate:** M (1–2 days)

---

### Phase 8 — Render coverage sweep (Tier 8)

Each stage closes one or more Pillar 1 INVISIBLE / PARTIAL findings. Pure render/UX work; no schema changes except 8.5 and 8.6.

#### Stage 8.1 — PDF: per-area environmental readings

- **Dependency:** none
- **Scope:** `supabase/functions/generate-inspection-pdf/index.ts` — for each area, render a small environmental block: temperature, humidity, dew_point. Likely needs a template variable injection.
- **Verification:** Generate PDF → confirm per-area block visible
- **Estimate:** S (~3h)

#### Stage 8.2 — PDF: subfloor landscape

- **Dependency:** none
- **Scope:** Same file, render `subfloor_data.landscape` (flat_block / sloping_block) on the subfloor page
- **Estimate:** S (~1h)

#### Stage 8.3 — InspectionAIReview: missing fields

- **Dependency:** Phase 3 (ai_summary_versions)
- **Scope:** Add display for `propertyOccupation`, `dwellingType`, `additional_info_technician`, `outdoor_dew_point`, `outdoor_comments` on `src/pages/InspectionAIReview.tsx`
- **Estimate:** S (~3h)

#### Stage 8.4 — Lead Detail: missing fields

- **Dependency:** none
- **Scope:** Add display for `inspector_name`, `propertyOccupation`, `dwellingType`, `job_time_minutes` per area, `option_1` / `option_2` totals, `what_you_get_text` on `src/pages/LeadDetail.tsx` and `src/components/leads/InspectionDataDisplay.tsx`
- **Estimate:** M (1–2 days because of layout work)

#### Stage 8.5 — Resolve `external_moisture` DUP

- **Dependency:** Phase 2 (audit on the schema change)
- **Decision needed:** Pick array vs column. Recommend array (simpler model, follows the rest of moisture readings).
- **Scope:**
  - Step A: Snapshot `inspection_areas.external_moisture` before drop
  - Step B: For any area where `external_moisture IS NOT NULL` and there's no matching `moisture_readings[1]`, INSERT a row in `moisture_readings` with the value
  - Step C: `ALTER TABLE inspection_areas DROP COLUMN external_moisture;`
  - Step D: Update `TechnicianInspectionForm.tsx:3398` to stop dual-writing
- **Verification:** Form save → only `moisture_readings` row exists, not the dropped column. Existing data preserved.
- **Rollback:** restore column from snapshot, reinstate dual-write
- **Estimate:** M (1–2 days)

#### Stage 8.6 — Persist `address` field from Section 1

- **Dependency:** Phase 2
- **Scope:**
  - `inspections.property_address_snapshot` already exists (column present, nullable, currently never written)
  - Update form mutation to write the form's address field to this column on save
  - PDF generation already reads from leads as fallback — keep that, but prefer the snapshot when present
- **Verification:** Edit address in form → save → confirm `property_address_snapshot` populated → PDF uses snapshot
- **Estimate:** S (~3h)

#### Stage 8.7 — Surface `triage_description`, `requested_by`, `attention_to` on Lead Detail

- **Dependency:** none
- **Scope:** Add to `InspectionDataDisplay.tsx` rendering
- **Estimate:** S (~2h)

---

### Phase 9 — Hygiene + orphans

#### Stage 9.1 — Confirm orphan AI Edge Functions removed

- **Dependency:** Stage 3.6
- **Scope:** Verify `generate-ai-summary` and `modify-ai-summary` are gone from production
- **Estimate:** S (~30 min)

#### Stage 9.2 — `direction_photos_enabled` decision

- **Dependency:** none
- **Scope:** Audit determined this column is persisted but never visible. Two options:
  - Drop the column if truly dead
  - Surface it on Lead Detail if it should be visible
- **User input:** confirm intent
- **Estimate:** S (~1h depending on decision)

#### Stage 9.3 — Audit dead columns

- **Dependency:** Phases 1–8 done (so we don't drop columns about to be added)
- **Scope:** Run a comprehensive grep across `src/` and `supabase/functions/` for every column on `inspections`, `inspection_areas`, `leads`. Identify any column with zero read sites. Present to user for review. Drop confirmed-dead columns in a final cleanup migration.
- **Estimate:** M (1 day for the audit + drop migration)

---

### Phase 10 — UI surface for history

#### Stage 10.1 — Per-field history popover

- **Dependency:** Phases 2, 3, 4, 7
- **Scope:** For every editable field on Lead Detail and the inspection form, add a small `(i)` icon that opens a popover showing the last N changes. Reads from `audit_logs` filtered to that entity_id + field_name.
- **Files:**
  - New: `src/components/audit/FieldHistoryPopover.tsx`
  - New: `src/hooks/useFieldHistory.ts` — given (entity_type, entity_id, field_name), returns the change history
  - Update: `src/pages/LeadDetail.tsx`, `src/pages/TechnicianInspectionForm.tsx`, `src/pages/InspectionAIReview.tsx`
- **Estimate:** L (3–5 days)

#### Stage 10.2 — Dedicated `/admin/audit` page

- **Dependency:** 10.1
- **Scope:** New admin page with filters: entity_type, entity_id, field_name, user, time range. Table view + drill-down.
- **Files:** new `src/pages/AdminAudit.tsx`
- **Estimate:** XL (1+ week)

#### Stage 10.3 — Per-field "Revert" affordance

- **Dependency:** 10.1
- **Scope:** Per-field history popover gets a "Revert to this value" button on each historical entry. Only enabled where reverting is safe (not on calculated/derived fields like `total_inc_gst`).
- **Decision:** which fields are revertable vs not — define an allowlist
- **Estimate:** L (3–5 days)

#### Stage 10.4 — Activity timeline structured display

- **Dependency:** Phase 2, 10.1
- **Scope:** Replace the unstructured `description` rendering on the activity timeline with a structured `field_name + from + to` display. Friendly column-name → human-label mapping.
- **Files:** `src/components/leads/ActivityTimeline.tsx`, `src/lib/utils/auditFormatters.ts`
- **Estimate:** M (1–2 days)

---

## 3. Cross-Cutting Concerns

### 3.1 Data backfills required

| Stage | Backfill task | Effort |
|---|---|---|
| 3.5 | Migrate existing `inspections.ai_summary_text` → 1 row in `ai_summary_versions` per existing inspection | Automated, 1 SQL transaction |
| 4.4 | Manual review of 58 NULL-caption photos, write captions | Human time, 2–4 hrs |
| 5.1 | Existing 120 pdf_versions rows: leave `generated_from_ai_summary_version_id = NULL` — historic, unfixable | None |
| 5.2 | Populate `superseded_at` on existing pdf_versions based on version_number ordering | Automated SQL |
| 6.4 | Best-effort attribution of 28 historic non-framer email_logs `sent_by` rows | Manual, 1–2 hrs |
| 7.1 | Seed initial pricing_rates from current code constants | Automated SQL |
| 8.5 | Migrate any existing `external_moisture` values to `moisture_readings` table before column drop | Automated SQL |

### 3.2 Performance impact

- **Stage 2.1:** Adds AFTER INSERT/UPDATE/DELETE trigger to 8 tables. Each mutation adds ~1 INSERT into `audit_logs` (small payload). Inspection form auto-save (every 30s × ~10 mutations per save) → ~10 audit rows per save → at peak production volume (~200 leads × 30 saves/lead lifetime) → ~60k audit_logs rows/year. Not a perf concern.
- **Stage 3.5:** Replacing column reads with `latest_ai_summary` view reads. Single-row index lookup per inspection per page render. Negligible.
- **Stage 7.3:** Pricing engine reads from `pricing_rates` table. Cache on app boot, revalidate on focus. One DB read per session. Negligible.
- **Aggregate:** New tables and triggers add ~1MB/year to DB at current scale. Free-tier safe.

### 3.3 Storage cost implications

- **Phase 1.4 alone saves ~60GB/year** of redundant PDFs (per audit Section 4.B math).
- Phase 3 adds `ai_summary_versions` rows: ~5KB each, ~3 versions/inspection, 1,200 inspections/year = ~18 MB/year. Negligible.
- Phase 4.2 photo_history: metadata only (~500 bytes/row), ~10 events/inspection, 1,200 inspections/year = ~6 MB/year. Negligible.
- Phase 5.3 retention policy actively reduces Storage cost over time.
- **Net:** total Storage cost significantly DECREASES post-fix vs. current trajectory.

### 3.4 RLS considerations per new table

| Table | Read access | Write access |
|---|---|---|
| `ai_summary_versions` | Admin all; tech reads own assigned inspections | Admin / Edge Function (service role) |
| `photo_history` | Admin all; tech reads own assigned | Admin / system writes via app helper |
| `pricing_rates` | All authenticated read | Admin only write (with 13% cap CHECK) |
| `quote_snapshots` | Admin all; tech reads own assigned | Admin / system writes |
| `latest_ai_summary` view | Inherits from underlying table RLS | N/A (view) |

All new tables follow the existing pattern: `admins_see_all` + `technicians_see_assigned`. No new RLS patterns introduced.

### 3.5 Verification discipline (carry-forward)

Every stage follows the same gate flow proven on the morning bugs cleanup and the technician dashboard cleanup:

1. **Pre-flight snapshot** if mutating production data
2. **Vercel preview** verification with concrete count/state checks
3. **Production cleanup migration** as separate step if data changes
4. **Production PR cherry-pick** after preview verified
5. **Merge with merge-commit** (not squash) for traceability
6. **Bundle hash rotation** confirmed on www.mrcsystem.com
7. **STOP — report and wait for approval** before next stage

---

## 4. Risk Register

### 4.1 Highest-risk stages (top 5)

| Rank | Stage | Risk | Mitigation |
|---|---|---|---|
| 1 | **3.5 — Drop ai_summary columns** | Consumers reading dropped columns break silently | Pre-step grep all references; create `latest_ai_summary` view as compatibility shim; soak in preview for 1 week before drop |
| 2 | **7.1 — DB-backed pricing rates** | Quote calculations could shift by rounding error or off-by-one against existing inspections | Regression-test against ALL existing production inspection totals; CHECK constraint on 13% cap; feature-flag rollout |
| 3 | **8.5 — external_moisture DUP resolution** | Existing data may not migrate cleanly if dual-writes diverged silently | Pre-flight diff: compare every area's `external_moisture` column vs `moisture_readings[1]`; flag mismatches for manual review BEFORE dropping the column |
| 4 | **2.1 — Audit trigger expansion** | Trigger adds latency or fails silently on edge cases (e.g. `auth.uid()` NULL during cron) | Test trigger against every mutation path including Edge Function service-role writes; ensure `metadata` JSONB doesn't fail on large rows |
| 5 | **4.3 — Photo soft-delete** | Missing a `WHERE deleted_at IS NULL` clause means deleted photos reappear | Comprehensive grep audit before merge; integration test that uploads + soft-deletes + verifies invisibility on every consumer surface |

### 4.2 Other risks worth flagging

- **Stage 4.1 — Caption-required gating** could break the offline photo queue if SyncManager doesn't validate captions on enqueue. Test offline → reconnect path.
- **Stage 1.4 — PDF regen strategy** — if Option A (explicit only) is chosen, admins might forget to regen and email a stale PDF. Mitigation: a "Stale PDF" warning banner when AI summary is newer than latest PDF.
- **Stage 6.2 — Email body capture** — large bodies (50KB+) inflate `email_logs` size at scale. If volume grows, switch to Storage URL pattern.
- **Stage 7.1 — Pricing rates table seeded from current constants** — if seed values don't match the production code constants byte-for-byte, every new quote shifts. Direct copy-paste from `pricing.ts`, no rounding.

### 4.3 Rollback strategy summary

Every stage has a rollback path documented in its detail. Common patterns:
- **Schema additions:** drop the new column/table — no data loss for existing flow
- **Schema drops (3.5, 8.5):** require pre-flight snapshot; rollback restores from snapshot
- **Code changes:** revert the PR
- **Trigger additions (2.1):** drop the triggers — base tables untouched
- **Data migrations:** every destructive migration has an `_undo` migration prepared but unapplied; if needed, applies and restores from snapshot

---

## 5. Findings → Stage Checklist (44 audit findings)

### Pillar 1 — Inspection form save integrity (17 findings)

| # | Finding | Stage | Status |
|---|---|---|---|
| 1 | `address` DROP | 8.6 | ✓ Assigned |
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
| 14 | `stainRemovingAntimicrobial` HARDCODE | 1.1 | ✓ |
| 15 | Legacy bools PARTIAL | 8.4 (review whether to surface) | ✓ |
| 16 | `additional_info_technician` PARTIAL | 8.3 | ✓ |
| 17 | `regenerationFeedback` DROP | 1.3 → migrated to 3.2 | ✓ |
| (18) | `option_1_*`, `option_2_total_inc_gst` PARTIAL | 8.4 | ✓ |
| (19) | `ai_summary_text` (jobSummaryFinal) INVISIBLE | 3.5 (replaced by versioned table) | ✓ |
| (20) | `what_you_get_text` PARTIAL | 8.4 | ✓ |

(Audit listed 17 findings in summary count; the gap table actually has 20 rows. All 20 are assigned.)

### Pillar 2 — Photo labelling end-to-end (8 findings)

| # | Finding | Stage | Status |
|---|---|---|---|
| 1 | `ViewReportPDF.tsx:2003` caption-clearing path | 1.2 | ✓ |
| 2 | AI prompt ignores captions | 4.5 | ✓ |
| 3 | PDF area/outdoor/subfloor pages don't render captions | 4.6 | ✓ |
| 4 | Section4AfterPhotos always nulls caption | 4.1 | ✓ |
| 5 | 40/71 photos have orphan attribution (no area_id, no subfloor_id) | 4.4 (review during backfill) | ✓ |
| 6 | Standard area photos default-null caption | 4.1 | ✓ |
| 7 | Offline sync risk for unsynced photo labels | 4.1 (caption gating + retry on offline) | ✓ |
| 8 | Customer email omits photos | 4.7 | ✓ |

### Pillar 3 — Versioned audit history (14 findings)

| # | Finding | Stage | Status |
|---|---|---|---|
| 1 | audit_logs trigger absent on leads/inspections/etc | 2.1 | ✓ |
| 2 | Lead `assigned_to` change tracking weak | 2.3 (richer activity rendering) | ✓ |
| 3 | Lead archived_at no event | 2.1 (DELETE/soft-delete trigger) | ✓ |
| 4 | Only 4/62 activities have changes[] array | 2.3 (audit_logs supplements activities going forward) | ✓ |
| 5 | Inspection field changes untracked | 2.1 | ✓ |
| 6 | AI prompt not preserved | 3.2 | ✓ |
| 7 | AI model name/tokens not captured | 3.2 | ✓ |
| 8 | AI manual edits lose original | 3.3 | ✓ |
| 9 | Orphan AI Edge Functions | 3.6 | ✓ |
| 10 | Photo metadata changes untracked | 4.2 + 2.1 | ✓ |
| 11 | Pricing changes untracked, rate tables hardcoded | 7.1 + 7.2 + 7.4 | ✓ |
| 12 | pdf_versions over-captured (109/inspection) | 1.4 | ✓ |
| 13 | pdf_versions FK to ai_summary_versions missing | 5.1 | ✓ |
| 14 | email_logs.sent_by NULL for 199 rows | 6.1 + 6.4 | ✓ |
| (15) | Email HTML body not stored | 6.2 | ✓ |
| (16) | No FK from email_logs to pdf_versions | 6.3 | ✓ |

### Cross-cutting (5 findings)

| # | Finding | Stage | Status |
|---|---|---|---|
| 1 | No UI for showing field history | 10.1, 10.2 | ✓ |
| 2 | Storage cost — PDF regen burning 60GB/yr | 1.4 + 5.3 | ✓ |
| 3 | No revert/rollback path | 10.3 | ✓ |
| 4 | Performance — indexes for history tables | Built into each schema sketch (idx_*) | ✓ |
| 5 | audit_logs trigger gap (duplicate of Pillar 3 #1) | 2.1 | ✓ |

### Summary

**44 findings → 100% assigned to stages. None deferred.**

---

## 6. Closing Notes

- This document is the execution map. No code is changed by reading it.
- Every stage has a manual approval gate. No auto-progression.
- The constraints in the brief (auth untouched, 13% cap sacred, customer_preferred_* untouched, calendar_bookings rows never deleted, PR #38 never cherry-picked, Phase 2 out of scope, useRevisionJobs.ts dormant) are honoured throughout. Anywhere a stage might appear to violate one of these, the stage detail explicitly notes the carve-out.
- After this plan is approved: execution begins at Stage 1.1. STOP gate after each stage.

End of fix plan.

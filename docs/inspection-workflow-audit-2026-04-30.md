# Inspection Workflow Audit — 2026-04-30

**Scope:** Read-only diagnostic audit of (1) inspection form save integrity, (2) photo labelling end-to-end, and (3) versioned audit history across 7 tiers.

**Method:** Three parallel codebase Explore passes + targeted Supabase MCP queries against production. No code changes, no migrations, no DB writes.

**Production snapshot taken:** 2026-04-30 ~14:55 AEST. All row counts and stats below are live numbers from production at that moment.

---

## 0. Executive Summary

### Headline findings (in order of severity)

1. **The audit_logs trigger coverage on `leads`, `inspections`, `inspection_areas`, `subfloor_data`, `moisture_readings`, and `subfloor_readings` is ABSENT in production.** Only `invoices` and `job_completions` have AFTER-INSERT/UPDATE triggers writing to `audit_logs`. The migration `20260311000001_add_audit_triggers.sql` claims wider coverage but `information_schema.triggers` proves otherwise — those triggers either were never applied, were dropped, or live in a never-merged migration. The only structured before/after diff for lead/inspection mutations comes from a sparsely-populated `activities.metadata.changes[]` array (4 of 62 activity rows have it).

2. **AI summary regenerations are destructive.** `inspections.ai_summary_text` is overwritten on each generation. The prompt that produced the summary, the model name, the token count, and the generated-vs-edited diff are not preserved anywhere. Two Edge Functions (`generate-ai-summary` v19, `modify-ai-summary` v19) are deployed in production but are not called from anywhere in `src/` — they are orphans that pre-date the active `generate-inspection-summary` v51.

3. **PDF regeneration is uncapped and tightly coupled to field edits.** One inspection has 109 PDF versions in `pdf_versions`; another has 12. `updateFieldAndRegenerate()` in `src/lib/api/pdfGeneration.ts:127` regenerates the PDF on every single field change made via the inspection-edit UI. `pdf_versions` is being written, but the population pattern is profligate — 120 PDF rows for 2 inspections.

4. **82% of production photos have no caption.** Of 71 photos, 58 have `caption IS NULL OR caption = ''`. Subfloor photos are 100% unlabelled (22/22). 56% of photos (40/71) have neither `area_id` nor `subfloor_id` set — they are attached to an inspection but not to any spatial context.

5. **Captions are NOT rendered in the PDF customer-facing report**, even when present in DB. The PDF Edge Function uses caption strings to *filter* (e.g., to find infrared photos) but does not embed them as visible text. The AI summary prompt also ignores captions.

6. **`email_logs.sent_by` is NULL for all 199 production rows.** Identity of the email sender is not captured. HTML body is not captured.

7. **A code path actively clears photo captions.** `src/pages/ViewReportPDF.tsx:2003` blanks captions when an admin selects a different front-house cover photo. This actively destroys label data, not just fails to capture it.

### Counts by pillar

| Pillar | Critical | High | Medium | Total findings |
|---|---|---|---|---|
| Pillar 1 — Save integrity | 2 | 4 | 11 | 17 |
| Pillar 2 — Photo labelling | 1 | 3 | 4 | 8 |
| Pillar 3 — Versioned history | 4 | 4 | 6 | 14 |
| Cross-cutting | 1 | 1 | 3 | 5 |
| **Total** | **8** | **12** | **24** | **44** |

### Top 3 priority fix stages (full queue at end of doc)

1. **Wire audit_logs triggers across `leads`, `inspections`, `inspection_areas`, `moisture_readings`, `subfloor_data`, `subfloor_readings`.** This is the single biggest restoration of audit integrity. Same trigger function already exists for invoices/job_completions — it just needs to be attached.
2. **Build `ai_summary_versions` and stop overwriting AI content.** Every regeneration becomes a new row; the prompt, model name, token count, and full response are preserved. Manual edits create a `manual_edit` version that retains the AI predecessor.
3. **Stop the PDF auto-regen storm.** Either move `updateFieldAndRegenerate` to user-explicit only, debounce by minutes, or batch field edits before regen. 109 versions on one inspection signals real cost and Storage waste.

---

## 1. Pillar 1 — Inspection Form Save Integrity

### 1.1 Method

The inspection form is `src/pages/TechnicianInspectionForm.tsx` (~3700 lines, monolith). It has 9 logical sections (the brief said "10" — actual count is 9 based on the UI; numbering matches what's referenced in the form). Form state is defined in `src/types/inspection.ts`. The save mutation is in `src/lib/api/inspections.ts`. Auto-save fires every 30s when `hasUnsavedChanges && !isSaving`.

The DB schema for inspection data spans 5 tables:
- `inspections` (the parent row, ~95 columns)
- `inspection_areas` (per-area data, ~52 columns)
- `moisture_readings` (linked to areas via `area_id`, OR linked to a photo via `moisture_reading_id`)
- `subfloor_data` (one per inspection if subfloor is enabled)
- `subfloor_readings` (linked to `subfloor_data` via `subfloor_id`)

Plus `photos` (linked via FK to whichever subject the photo is about).

### 1.2 Section-by-section gap table

The full per-field tables are in the agent transcripts; the consolidated gap list is below. For each field, status uses these tags:
- **DROP** — captured by form but never written to DB
- **HARDCODE** — UI captures user input but mutation overwrites with a fixed value
- **INVISIBLE** — written to DB but never rendered on any consumer surface
- **PARTIAL** — rendered on some surfaces, missing from others
- **DUP** — same datum stored in two places, with risk of divergence

| Section | Field | Status | Where captured | Where lost / where missing | Severity |
|---|---|---|---|---|---|
| 1 Basic Info | `address` | **DROP** | Form field | Never present in mutation payload at `TechnicianInspectionForm.tsx:3274–3334`; PDF gen reads from `leads.property_address_*` instead | High |
| 1 Basic Info | `triage_description` | **INVISIBLE** | Persisted | Not rendered on Lead Detail, AI Review, customer email; only in PDF | Medium |
| 1 Basic Info | `requested_by` | **INVISIBLE** | Persisted | Only in PDF | Medium |
| 1 Basic Info | `attention_to` | **INVISIBLE** | Persisted | Only in PDF | Medium |
| 1 Basic Info | `inspector_name` | **PARTIAL** | Persisted | Visible on AI Review (`L72`), missing from Lead Detail | Medium |
| 2 Property | `property_occupation`, `dwelling_type` | **PARTIAL** | Persisted | Visible on AI Review + PDF, missing from Lead Detail despite `InspectionDataDisplay` receiving the data | Medium |
| 3 Areas | `temperature`, `humidity`, `dew_point` (per area) | **INVISIBLE in PDF** | Persisted, visible on Lead Detail | PDF template omits area-level environmental readings | High |
| 3 Areas | `external_moisture` | **DUP** | Persisted in `inspection_areas.external_moisture` AND as `moisture_readings[1]` | Risk of divergence; PDF doesn't render either | High |
| 3 Areas | `internal_office_notes` | **INVISIBLE in PDF/email** | Persisted, visible only on Lead Detail | Not in PDF, not in AI Review, not in email | Medium |
| 3 Areas | `job_time_minutes` (per area) | **INVISIBLE on Lead Detail** | Persisted, visible in PDF | Not on Lead Detail card | Medium |
| 4 Subfloor | `landscape` (flat_block / sloping_block) | **INVISIBLE in PDF** | Persisted | Not rendered in PDF template | Medium |
| 5 Outdoor | `direction_photos_enabled` | **INVISIBLE everywhere** | Persisted | Not visible anywhere | Low |
| 5 Outdoor | `outdoor_dew_point`, `outdoor_comments` | **PARTIAL** | Persisted, in PDF | Missing from AI Review | Medium |
| 7 Work Procedure | `stainRemovingAntimicrobial` | **HARDCODE** | UI form captures | Always overwritten with `false` at `TechnicianInspectionForm.tsx:3299` | Critical |
| 7 Work Procedure | Legacy bools (`hepa_vac`, `antimicrobial`, `home_sanitation_fogging`) | **PARTIAL** | Synced from `treatment_methods` array | Visible only in PDF | Low |
| 8 Job Summary | `additional_info_technician` | **PARTIAL** | Persisted, on Lead Detail | Missing from AI Review | Medium |
| 9 Cost | `regenerationFeedback` | **DROP** | Form field | Never persisted | Critical |
| 9 Cost | `option_1_*`, `option_2_total_inc_gst` | **PARTIAL** | Persisted, in PDF | Not on Lead Detail card | Medium |
| 9 Cost | `ai_summary_text` (jobSummaryFinal mapping) | **INVISIBLE everywhere** | Persisted | Never rendered on any surface | Medium |
| 9 Cost | `what_you_get_text` | **PARTIAL** | Persisted, in PDF | Not on Lead Detail | Low |

### 1.3 Critical / high gaps drilled in

**1.3.1 `address` silently dropped (Section 1)**
The form has an address field. The save mutation at `TechnicianInspectionForm.tsx:3274–3334` does not include any address column. The `inspections` table has a column `property_address_snapshot` (text, nullable) that is never written by the form. Consumers that need the address read from `leads.property_address_*` instead. Result: if a tech corrects an address inside the inspection form, that correction never reaches the database — the lead's address is not updated, and the inspection has no record of what the tech saw on site.

**1.3.2 `stainRemovingAntimicrobial` hardcoded to `false` (Section 7)**
At `TechnicianInspectionForm.tsx:3299` the mutation always writes `stain_removing_antimicrobial: false`, ignoring whatever the toggle was set to. This is the most clear-cut user-input-discarded bug in the form. The bool exists in the DB schema (`inspections.stain_removing_antimicrobial`) but is permanently `false` in production.

**1.3.3 `regenerationFeedback` never persisted (Section 9)**
The form captures user feedback when an admin requests AI summary regeneration. There is no DB column for it; the mutation does not include it. The feedback is shown in the prompt for the regen API call, then discarded on form submit. Result: there is no record of *why* a particular AI summary was regenerated.

**1.3.4 Per-area environmental readings not in the PDF**
`inspection_areas` stores `temperature`, `humidity`, `dew_point` per area (3 columns). All three are captured, persisted, and round-trip correctly. The PDF Edge Function (`supabase/functions/generate-inspection-pdf/index.ts:101–159`) reads `inspection.outdoor_*` for the outdoor environment block but does NOT iterate the per-area readings. The customer's report is missing this data, even though it was carefully collected on site.

**1.3.5 Duplicate storage of external moisture**
`area.moistureReadings[1]?.reading` (the second reading in the per-area moisture array) is mapped to `inspection_areas.external_moisture` at form save (`TechnicianInspectionForm.tsx:3398`), AND a row is also written to the `moisture_readings` table for that reading. There is no enforcement that these stay in sync. If the array is ever edited but the column is not, or vice-versa, the two diverge silently.

### 1.4 Auto-save behaviour

`TechnicianInspectionForm.tsx:3571–3578` runs `handleSave({ silent: true })` every 30s if there are unsaved changes. There is also a `localStorage` backup (`mrc_inspection_backup_${inspectionId}`) that persists the same form state for 24 hours. The localStorage backup is offered as a restore prompt on remount.

Edge cases:
- Auto-save uses the same mutation as manual save → `stainRemovingAntimicrobial` hardcode applies to auto-saves too
- 30-second window means up to 30s of edits can be lost on browser crash or network failure
- Photos uploaded between auto-saves are queued via `SyncManager.ts` and flushed on reconnect. Offline photo queue could lose photos on device wipe before sync.

### 1.5 Summary count

| Category | Count |
|---|---|
| DROP (captured but lost) | 2 |
| HARDCODE (input ignored) | 1 |
| INVISIBLE (persisted but never rendered) | 5 |
| PARTIAL (visible on some surfaces only) | 7 |
| DUP (same datum, two columns) | 1 |
| Round-trip broken | 0 confirmed (0 of all tested round-trip OK) |
| **Total Pillar 1 gaps** | **17** (2 critical, 4 high, 11 medium/low) |

---

## 2. Pillar 2 — Photo Labelling End-to-End

### 2.1 Photo lifecycle

```
Tap "Add photo"
   │
   ├─→ Section context (area / subfloor / outdoor / general)
   │       │
   │       ├─ For infrared / natural-infrared: caption assigned
   │       ├─ For outdoor cover slots (front_door / front_house / mailbox / street): caption ≡ slot label
   │       └─ For everything else: caption ≡ undefined (becomes NULL on insert)
   │
   ├─→ Resize to JPEG ≤1600px
   ├─→ Upload to bucket `inspection-photos` at path:
   │       {inspection_id}/{area_id}/{filename}.jpg          (area photos)
   │       {inspection_id}/subfloor/{filename}.jpg            (subfloor photos)
   │       {inspection_id}/{filename}.jpg                     (outdoor / general)
   │
   ├─→ INSERT into public.photos:
   │       inspection_id, area_id?, subfloor_id?, photo_type, storage_path,
   │       caption?, photo_category?, moisture_reading_id?, job_completion_id?, order_index?
   │
   └─→ Render surfaces:
        ├─ Inspection form preview         caption rendered?  YES (where set)
        ├─ Lead Detail gallery              caption rendered?  YES (limited)
        ├─ Inspection AI Review             caption rendered?  NOT VERIFIED in agent pass
        ├─ AI summary prompt                caption consumed?  NO (not in prompt builder)
        ├─ PDF customer report              caption rendered?  NO (used for filtering only)
        └─ Customer email                   referenced?        NO
```

### 2.2 Production stats (live as of 2026-04-30)

```sql
-- Run query (read-only)
SELECT
  (SELECT COUNT(*) FROM photos) AS total_photos,
  (SELECT COUNT(*) FROM photos WHERE caption IS NULL OR caption = '') AS null_or_empty_caption,
  (SELECT COUNT(*) FROM photos WHERE photo_type = 'area' AND (caption IS NULL OR caption = '')) AS area_unlabelled,
  (SELECT COUNT(*) FROM photos WHERE photo_type = 'subfloor' AND (caption IS NULL OR caption = '')) AS subfloor_unlabelled,
  (SELECT COUNT(*) FROM photos WHERE photo_type = 'outdoor' AND (caption IS NULL OR caption = '')) AS outdoor_unlabelled,
  (SELECT COUNT(*) FROM photos WHERE photo_type = 'general' AND (caption IS NULL OR caption = '')) AS general_unlabelled,
  (SELECT COUNT(*) FROM photos WHERE area_id IS NULL AND subfloor_id IS NULL AND inspection_id IS NOT NULL) AS orphan_attribution;
```

| Metric | Count | Notes |
|---|---|---|
| Total photos | 71 | |
| caption NULL or empty | 58 | **82%** |
| area photos unlabelled | 6 | |
| subfloor photos unlabelled | 22 | **100%** of subfloor photos |
| outdoor photos unlabelled | 1 | |
| general photos unlabelled | 29 | |
| Orphan attribution (no `area_id` AND no `subfloor_id`) | 40 | **56%** |

### 2.3 Code paths where photos can be created without a label

1. **`src/pages/TechnicianInspectionForm.tsx`** — Standard area photos. Caption is only assigned for `infrared` and `natural_infrared` types. All other area photos get `caption = undefined`.
2. **`src/pages/TechnicianInspectionForm.tsx`** — Outdoor cover slots set caption to the slot identifier (`front_door`, `front_house`, etc.) — that's a programmatic label, not a user-written description.
3. **`src/components/job-completion/Section4AfterPhotos.tsx`** — Job completion after-photos and demolition photos are uploaded with no caption parameter. They are inserted with `caption = NULL` always.
4. **`src/lib/utils/photoUpload.ts:125`** — The `uploadInspectionPhoto()` central insert uses `caption: metadata.caption || null` with no validation that caption is non-empty.
5. **Offline sync** (`SyncManager.ts`) — Photos uploaded offline include caption in IndexedDB metadata, but if a sync race overwrites or the queue is cleared, label is lost.

### 2.4 Code paths that DESTROY captions

**`src/pages/ViewReportPDF.tsx:2003`** — When admin selects a different cover photo for a front-house slot in the PDF preview UI, the previous photo's caption is cleared. This is destructive editing with no audit. Confirmed via Question 3 grep in the secondary investigation.

### 2.5 Where labels do NOT propagate

| Surface | Caption shown? | Evidence |
|---|---|---|
| Inspection form preview (technician) | Sometimes — only where caption was set | UI renders `photo.caption` when present |
| Lead Detail gallery (admin) | Limited — depends on consumer component | |
| Inspection AI Review | Not confirmed (agent didn't verify deeply) | |
| **AI summary prompt** | **NO** | `supabase/functions/generate-inspection-summary/index.ts:178–306`. `buildUserPrompt()` constructs prompt from form data only; photo URLs and captions are never included. The model has no awareness of what was photographed. |
| **PDF customer report — area photos** | **NO** | `supabase/functions/generate-inspection-pdf/index.ts:1119–1130`. Captions are used to *classify* (e.g., filter out infrared from regular grid) but the rendered HTML uses URL only. |
| **PDF customer report — outdoor photos** | **NO** | Same file `:1318–1324`. Captions sort photos but are not embedded as text. |
| **PDF customer report — subfloor photos** | **NO** | Same file `:1254`. Alt text is hardcoded `"Subfloor photo {n}"` — no caption consumed. |
| **Customer email** | **No photo references at all** | `buildReportApprovedHtml()` at `src/lib/api/notifications.ts:205–229` mentions address and status only. Photos are not embedded or referenced. |

### 2.6 Suggested production audit query (read-only — DO NOT BACKFILL without review)

```sql
SELECT
  ia.area_name,
  p.photo_type,
  p.caption,
  p.created_at,
  p.id,
  p.inspection_id
FROM photos p
LEFT JOIN inspection_areas ia ON p.area_id = ia.id
WHERE (p.caption IS NULL OR p.caption = '')
ORDER BY p.created_at DESC
LIMIT 200;
```

### 2.7 Pillar 2 finding count

| Severity | Count |
|---|---|
| Critical | 1 (caption-clearing path at `ViewReportPDF.tsx:2003`) |
| High | 3 (AI prompt ignores captions; PDF area/outdoor/subfloor pages don't render captions; Section4AfterPhotos always nulls caption) |
| Medium | 4 (orphan attribution; standard area photos default-null; offline sync risk; email omits photos) |
| **Total** | **8** |

---

## 3. Pillar 3 — Versioned Audit History (7 Tiers)

### 3.0 Trigger reality vs migration claims (CRITICAL)

The migration `supabase/migrations/20260311000001_add_audit_triggers.sql` declares triggers on `leads`, `inspections`, `inspection_areas`, and `user_roles`. **Production does NOT have those triggers.** Verified via:

```sql
SELECT trigger_name, event_object_table, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

**Triggers actually present in production:**
- `audit_invoices_insert` / `audit_invoices_update` (AFTER, on `invoices`)
- `audit_job_completions_insert` / `audit_job_completions_update` (AFTER, on `job_completions`)
- `update_*_updated_at` BEFORE UPDATE on most tables (timestamp maintenance only — no audit_logs write)

**Tables that should have audit triggers but don't:**
- ❌ `leads`
- ❌ `inspections`
- ❌ `inspection_areas`
- ❌ `subfloor_data`
- ❌ `moisture_readings`
- ❌ `subfloor_readings`
- ❌ `photos`
- ❌ `user_roles`

This single fact reshapes every tier below. The 95-row `audit_logs` table contains:

| `entity_type` | `action` | Count |
|---|---|---|
| `invoices` | create_invoice | 1 |
| `invoices` | update_invoice | 1 |
| `job_completions` | create_job_completion | 1 |
| `job_completions` | update_job_completion | 72 |
| `lead` | lead_created | 20 |
| **Total** | | **95** |

The `lead` rows are application-level inserts (not trigger-driven) — there is no `lead_updated`, `lead_deleted` action and no `inspection*` action recorded.

**Aside:** 72 `update_job_completion` audit rows for 1 job_completion entity in production strongly suggests the form auto-saves heavily. Worth confirming the auto-save throttle on the job-completion form.

### 3.1 Tier 1 — Lead fields

**Mutation paths:**
- `src/hooks/useLeadUpdate.ts:35–88` — diffs old vs new lead and inserts an `activities` row with `metadata.changes[]` (an array of `{field, from, to}` objects).
- Inline edit handlers in `src/pages/LeadDetail.tsx` — call the same hook.
- Bulk admin actions (assignment, status change) — currently use the `activities` table directly with `activity_type = 'status_change'` and a more limited `metadata.from`/`metadata.to` pattern.

**Current capture:**
- `activities` table — schema: `id`, `lead_id`, `activity_type`, `title`, `description`, `user_id`, `metadata` (jsonb), `created_at`
- 62 total activity rows in production
- **Only 4 of 62** (6%) have a structured `changes[]` array in metadata
- 0 of 62 have an `old_status` key in metadata
- A sample changes row: `[{field: "phone", from: "433880401", to: "0433880401"}]`

**Gap:**
- No DB-level audit_logs trigger on `leads`, so any direct DB write (Edge Function, MCP query, RLS-bypassing service-role write) would not be captured anywhere.
- Application-level changes via `useLeadUpdate` ARE captured for the fields that hook covers, but the diff is sparse — many older activity rows pre-date the changes-array enhancement.
- `assigned_to` changes are noted in an activity row but the old/new assignee identities are not consistently in metadata.
- Soft-delete (`archived_at`) — no event is logged when a lead is archived.

**Severity: HIGH.** Application-level coverage is decent for recent edits via the hook; DB-level safety net is missing.

### 3.2 Tier 2 — Inspection form fields

**Mutation paths:**
- `src/lib/api/inspections.ts` — top-level `inspections` row UPDATE
- `TechnicianInspectionForm.tsx` direct `.insert()` / `.update()` on `inspection_areas`, `moisture_readings`, `subfloor_data`, `subfloor_readings`

**Current capture:**
- ❌ No audit_logs trigger on any of these tables
- ❌ No `activities` rows for inspection form mutations (the agent confirmed via grep)
- ✓ `inspections.updated_at` is maintained by `update_inspections_updated_at` trigger (timestamp only, no diff)
- ✓ `inspections.last_edited_at` and `last_edited_by` columns exist and are written by the form on each save (latest-only, no history)

**Gap:**
- A tech changes a moisture reading from 12% to 15% → no record of the change anywhere.
- A tech adds an area, then deletes it → the area's row is gone, with no tombstone.
- An admin edits an inspection's pricing, the form auto-saves → no field-level diff is captured.

**Severity: CRITICAL.** Inspection field changes are completely untracked. This is the data that drives pricing, AI summary, PDF, and email — all downstream artefacts depend on values that have no history.

**Schema sketch (read-only proposal — DO NOT MIGRATE):**

```sql
CREATE TABLE inspection_field_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,           -- 'inspection' | 'inspection_area' | 'moisture_reading' | 'subfloor_data' | 'subfloor_reading'
  entity_id       UUID NOT NULL,
  inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  field_name      TEXT NOT NULL,
  old_value       JSONB,
  new_value       JSONB,
  changed_by      UUID REFERENCES auth.users(id),
  changed_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON inspection_field_history (inspection_id, changed_at DESC);
```

Or the simpler approach: just attach the `audit_log_trigger()` function (already defined for invoices/job_completions) to the same set of tables.

### 3.3 Tier 3 — AI-generated content (CRITICAL)

**The AI Edge Function landscape:**

| Function | Version | Status | Called from `src/`? |
|---|---|---|---|
| `generate-inspection-summary` | v51 | Active | Yes — `InspectionAIReview.tsx:248,298`, `TechnicianInspectionForm.tsx:3680` |
| `generate-ai-summary` | v19 | **Orphan** — deployed in production, not on disk in `supabase/functions/`, not called from `src/` | No |
| `modify-ai-summary` | v19 | **Orphan** — same | No |

The two orphan functions are deployed-but-unused — likely legacy from earlier iterations. They are a maintenance and security concern (deployed code paths that nobody is exercising or reviewing).

**Storage:**
- AI output → columns on `inspections`: `ai_summary_text`, `ai_summary_approved`, `ai_summary_generated_at`, `what_we_found_text`, `what_we_will_do_text`, `what_you_get_text`, `problem_analysis_content`, `demolition_content`
- Each generation overwrites the prior values
- The Edge Function returns JSON to the client; the client calls `.update()` to save (`InspectionAIReview.tsx:162–186`)

**Production stats:**
- 2 inspections total in production
- 1 has `ai_summary_text` populated
- 0 have `ai_summary_approved = true`
- Both have `pdf_url` and `pdf_approved = true` — meaning at least one inspection has an approved PDF *without* AI summary approval. Suggests the approval flow has separable paths or the `ai_summary_approved` flag isn't reliably set.

**What is NOT captured for any AI generation:**
- ❌ The system prompt used (or its hash)
- ❌ The user prompt (the inspection data passed in)
- ❌ The model name (Gemini Flash 2.0 vs 2.5 — the function has fallback logic at `:312–316`)
- ❌ Model version
- ❌ Token counts (input + output)
- ❌ Cost
- ❌ The original AI response when admin manually edits it
- ❌ A regeneration log — who clicked regenerate, when, with what feedback (see Pillar 1.3.3 — `regenerationFeedback` is captured in form state then dropped)
- ❌ Approval diff (AI draft vs approved-and-edited final)

**Severity: CRITICAL.** This is the most customer-visible AI surface in the product. It is fully reproducible only by accident.

**Schema sketch:**

```sql
CREATE TABLE ai_summary_versions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id            UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  version_number           INTEGER NOT NULL,
  generation_type          TEXT NOT NULL,                -- 'initial' | 'regeneration' | 'manual_edit'
  generated_by             UUID REFERENCES auth.users(id),
  generated_at             TIMESTAMPTZ DEFAULT NOW(),

  -- Reproducibility
  model_name               TEXT,                          -- 'gemini-2.0-flash-exp' etc
  model_version            TEXT,
  system_prompt_hash       TEXT,
  user_prompt              TEXT,                          -- full payload sent to LLM
  prompt_tokens            INTEGER,
  response_tokens          INTEGER,
  regeneration_feedback    TEXT,                          -- captures Section 9's regenerationFeedback

  -- Generated content (snapshot at time of generation)
  ai_summary_text          TEXT,
  what_we_found_text       TEXT,
  what_we_will_do_text     TEXT,
  what_you_get_text        TEXT,
  problem_analysis_content TEXT,
  demolition_content       TEXT,

  -- Supersession
  superseded_at            TIMESTAMPTZ,
  superseded_by_version_id UUID REFERENCES ai_summary_versions(id),

  -- Approval
  approved_at              TIMESTAMPTZ,
  approved_by              UUID REFERENCES auth.users(id),

  UNIQUE(inspection_id, version_number)
);
```

### 3.4 Tier 4 — Photo metadata changes

**Current state:**
- ❌ No history table
- ❌ No audit_logs trigger on `photos`
- ❌ Photos table has `created_at` but no `updated_at`
- ❌ Hard delete only — no tombstone

**Gap:** Every photo operation (add, delete, caption edit, reorder, link change) is silent. Combined with the caption-clearing code path at `ViewReportPDF.tsx:2003`, this is an integrity risk: an admin could destroy evidence captions with no record.

**Severity: MEDIUM-HIGH.** Photos ARE evidence in a customer-facing report. For a legal/insurance dispute, "what photos were originally uploaded with what labels" is a question we cannot currently answer.

**Schema sketch:**

```sql
CREATE TABLE photo_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id    UUID NOT NULL,                    -- no FK so deleted photos retain history
  inspection_id UUID NOT NULL,
  action      TEXT NOT NULL,                    -- 'added' | 'deleted' | 'caption_changed' | 'reordered' | 'reattached'
  before      JSONB,                            -- snapshot before
  after       JSONB,                            -- snapshot after
  changed_by  UUID REFERENCES auth.users(id),
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 Tier 5 — Pricing / cost data

**Pricing-relevant columns on `inspections`:**
- Hours: `no_demolition_hours`, `demolition_hours`, `construction_hours`, `subfloor_hours`
- Equipment: `commercial_dehumidifier_qty`, `air_movers_qty`, `rcd_box_qty`, `equipment_days`
- Rates: `dehumidifier_rate`, `air_mover_rate`, `rcd_rate`, `non_demo_labour_rate`, `demo_labour_rate`, `subfloor_labour_rate`
- Calculated: `labour_cost_ex_gst`, `equipment_cost_ex_gst`, `discount_percent`, `subtotal_ex_gst`, `gst_amount`, `total_inc_gst`
- Override: `manual_price_override`, `manual_total_inc_gst`, `manual_labour_override`
- Multi-option: `option_1_*`, `option_2_total_inc_gst`, `option_selected`

**Pricing engine:** `src/lib/calculations/pricing.ts` — `LABOUR_RATES` and `DISCOUNT_TIERS` are hardcoded constants. The 13% discount cap (per CLAUDE.md non-negotiables) lives here.

**Current capture:**
- ❌ No audit_logs trigger on `inspections` (Section 3.0), so pricing field mutations are NOT captured
- ❌ No `quote_history` or `pricing_snapshot` table — pricing exists as latest-value-on-inspections-row only
- ❌ Hardcoded rate tables — if `LABOUR_RATES.tier8h` changes from `90` to `100`, no DB record of that change; old quotes can't be replayed

**Severity: HIGH.** Pricing is a customer-facing legal commitment; lacking history makes dispute resolution very hard.

### 3.6 Tier 6 — PDF generation

**CORRECTION to a Tier 6 agent claim:** the agent originally suggested `pdf_versions` is a "ghost table". It is NOT.

**Reality:**
- `pdf_versions` has **120 rows** in production
- Distribution:
  - inspection `c61ffdf4-...`: **108 rows**, max version 109, span Feb 14 – Apr 25 2026
  - inspection `1c29e606-...`: 12 rows, max version 12, span 13 minutes (Feb 16)
- `job_completion_pdf_versions` has 26 rows for 1 entity

**Writer:** the `generate-inspection-pdf` Edge Function writes the row at the end of generation (`supabase/functions/generate-inspection-pdf/index.ts:1858–1866`). The version is incremented at `:1795`.

**Trigger pattern:** `src/lib/api/pdfGeneration.ts:127` defines `updateFieldAndRegenerate()` which is wired to inline-edit UI in `InspectionAIReview.tsx`. Every field edit calls `generateInspectionPDF(inspectionId, { regenerate: true })` — so the 109-version inspection has had 109 admin-side field edits, each triggering a PDF rebuild + Storage write + new `pdf_versions` row.

**What IS captured:** version number, pdf_url, file_size_bytes, changes_made (jsonb), created_at, created_by.

**Gaps:**
- ❌ No FK linking the PDF version to the `ai_summary_versions` row that produced it (because `ai_summary_versions` doesn't exist yet)
- ❌ `changes_made` JSONB is undocumented in the schema — populated ad hoc; consistency unknown
- ❌ No supersession marker on older versions
- ❌ No retention policy — all 109 PDFs likely still in Storage

**Severity: HIGH (but inverted — the issue is over-write, not under-capture).** PDF history is over-captured to the point of waste. 109 versions of a single inspection's PDF is genuinely indefensible Storage cost. Either rate-limit/debounce regen or move to user-explicit-only.

### 3.7 Tier 7 — Email send events

**Schema:** `email_logs` — `id`, `lead_id`, `inspection_id`, `sent_by` (uuid, nullable), `recipient_email` (NOT NULL), `recipient_name`, `subject` (NOT NULL), `template_name` (NOT NULL), `status` (NOT NULL), `provider`, `provider_message_id`, `error_message`, `metadata` (jsonb), `sent_at`, `delivered_at`, `opened_at`, `clicked_at`, `created_at`, `updated_at`.

**Production volume:** 199 rows.

| Template | Total | Has `sent_by` | Missing `sent_by` |
|---|---|---|---|
| framer_lead_confirmation | 171 | 0 | 171 |
| booking-confirmation | 8 | 0 | 8 |
| job_report_sent | 6 | 0 | 6 |
| report-approved | 6 | 0 | 6 |
| inspection_reminder | 5 | 0 | 5 |
| welcome | 2 | 0 | 2 |
| custom | 1 | 0 | 1 |

**Gaps:**
- ❌ **`sent_by` is NULL for 100% (199/199) of rows.** The send-email Edge Function passes `sent_by: null` regardless of the calling user (`supabase/functions/send-email/index.ts:194` per agent report).
- ❌ HTML body is not stored. `metadata` jsonb may contain partial info but body itself is gone after Resend dispatches.
- ❌ No FK to `pdf_versions` even when the email references a specific PDF version (`report-approved`, `job_report_sent`, `inspection_reminder`).
- ❌ No FK to `invoices` — invoice email type is not yet a template (when it ships, it will need its own foreign key).
- ⚠️ `framer_lead_confirmation` dominates volume (171/199) — that's the public lead form auto-confirmation. Healthy.

**Severity: MEDIUM.** Most email events ARE captured; identity tracking is the main gap.

---

## 4. Cross-Cutting Concerns

### 4.A Audit log UI surfaces

Today the activity log on Lead Detail surfaces `activities` rows. After the proposed history infrastructure (per-tier history tables + audit_logs trigger expansion) the question is where users see field history.

**Options to flag (not solve):**
- Per-field "show history" affordance on Lead Detail and the inspection form — popover with last N changes
- A dedicated `/admin/audit` page that supports filtering by entity, field, user, time range
- Activity timeline becomes structured — currently `lead_updated` activities have an unstructured `description`; could become `field_name` + `from` + `to`

This is a UX scoping question for a future stage. Don't pick a path here.

### 4.B Storage cost implications

Rough back-of-envelope at current production scale:
- 200 leads × 50 mutable fields × 20 saves over lifetime = 200,000 `lead_field_history` rows (small)
- Inspections at scale (target: 100/month × 12 months = 1,200/year) × 20 field edits × 5 mutable subtables = **~120k inspection_field_history rows/year** (manageable)
- AI summary versioning — likely 2–3 versions per inspection on average + occasional regens × 1,200 inspections/yr = **~5k ai_summary_versions rows/year**, each with a few KB of text. Negligible.
- **PDF versioning is the real cost.** At current pattern (109 PDFs for 1 inspection), 1,200 inspections × 100 PDFs each × ~500KB each = **60 GB/year of redundant PDFs**. The fix is to debounce regen, not to scale storage.
- Photo history — photos themselves don't grow (history table is metadata only). Negligible.

The dominant cost is PDF Storage IF the regen pattern persists.

### 4.C Restoration / rollback paths

Currently there is **no "Revert" button concept** anywhere in the UI. If a tech accidentally clears a field, the previous value is recoverable only from:
- The 24-hour `localStorage` backup (form-level, not field-level, only on the same device)
- Manual SQL inspection of `audit_logs` (only for invoices and job_completions today)

Most fields have no recovery path at all. Once history infrastructure is in place, a "Revert this field" affordance becomes possible per-field.

### 4.D Performance implications

For the inspection form specifically:
- A typical inspection has ~50 mutable fields across `inspections` + ~50 per area × N areas + moisture readings. Auto-save fires every 30s. If implemented with row-level audit triggers, ~10–30 audit rows per save × 30 saves per form completion = ~300–900 audit rows per inspection.
- At 1,200 inspections/year that's **~1M field history rows/year**. With proper indexing on `(entity_id, changed_at DESC)` this is fine.
- The trigger writes are AFTER and inside the same transaction — modest overhead but real. For high-throughput tables, consider whether all fields need to be tracked or whether a column-allowlist trigger is preferable.

### 4.E The `audit_logs` UPDATE-trigger gap (yesterday's diagnosis)

Confirmed: `leads`, `inspections`, `inspection_areas`, `subfloor_data`, `moisture_readings`, `subfloor_readings`, and `photos` lack any audit_logs trigger. The migration `20260311000001_add_audit_triggers.sql` references such triggers but they are not present in production (verified via `information_schema.triggers`).

**RESOLVED 2026-05-01 in Phase 2 Stage 2.1.** Migration `20260501000004_audit_triggers_full_coverage.sql` added 25 new CREATE TRIGGER statements: full INSERT+UPDATE+DELETE coverage on leads/inspections/inspection_areas/subfloor_data/moisture_readings/subfloor_readings/photos; INSERT+DELETE on user_roles (rows aren't mutated); DELETE-only supplements on invoices and job_completions. Net live state post-Phase-2: 29 audit trigger objects across 10 tables. The repo file `20260311000001_add_audit_triggers.sql` was NOT retroactively applied (months-old, intent may not match current schema); the new migration replaces its scope.

The proposed `inspection_field_history` / `lead_field_history` schemas above can either:
- (a) **Replace** audit_logs entirely (richer per-field structure, simpler queries) — but breaks current `audit_logs` consumers (which include the invoices/job_completions audit UI if any)
- (b) **Coexist** — keep audit_logs as the row-level immutable log; add field_history for per-field UX queries

**Recommendation (to flag, not decide):** coexist. Audit_logs is good for immutable "what row changed when" forensics; field_history is good for "what did this field look like on Tuesday" UX. Different jobs.

---

## 5. Recommended Fix Priority Queue

Listed in priority order. Each entry: rough scope estimate (S = ≤4h, M = 1–2 days, L = 3–5 days, XL = 1+ week). No fix briefs written here — these are scopes for the user to pick from.

### Tier 0 — Quick safety wins (recommend doing first)

1. **[S] Fix `stainRemovingAntimicrobial` hardcode at `TechnicianInspectionForm.tsx:3299`.** One-line bug; user input is silently discarded. No DB change needed.
2. **[S] Stop the caption-clearing code path at `ViewReportPDF.tsx:2003`.** Either preserve previous caption, or write the change to history first. Trivial scope, eliminates an active data-destruction path.
3. **[S] Persist `regenerationFeedback` to a column or `metadata` field on the AI summary or inspection row.** Form already captures it; just plumb it through.
4. **[S] Stop auto-PDF-regen on every field edit.** Either debounce by 5+ minutes, or move to user-explicit "Regenerate PDF" button. This alone saves ~60GB/year of Storage (per Section 4.B math).

### Tier 1 — Foundation: extend audit_logs triggers (HIGHEST IMPACT)

5. **[M] Attach the existing `audit_log_trigger()` function to `leads`, `inspections`, `inspection_areas`, `subfloor_data`, `moisture_readings`, `subfloor_readings`, `photos`, and `user_roles`.** The function already exists (proven by invoices/job_completions). One migration that runs `CREATE TRIGGER ...` per table. Immediately gives row-level before/after diffs for every mutation across the inspection workflow. **This is the single highest-leverage stage in the queue.**

### Tier 2 — AI summary versioning (CRITICAL CUSTOMER-FACING)

6. **[L] Build `ai_summary_versions` table + wire `generate-inspection-summary` Edge Function to insert a row on every generation.** Capture prompt, model, tokens, response in full. Manual edits create a version with `generation_type = 'manual_edit'` referencing the AI predecessor. Approval becomes a column on the latest version. Replaces the destructive overwrite pattern on `inspections.*_text` columns.

### Tier 3 — Photo integrity

7. **[M] Wire photos table to audit_logs trigger** (covered by stage 5 if done together) **PLUS migrate captions for outdoor cover slots, area photos, and Section4After photos to be required at upload time.** UI gates photo upload on caption entry; backend validates. Prevents new unlabelled photos.
8. **[S] One-time backfill exercise: review the 58 NULL-caption photos in production.** Decide per-photo: backfill from photo_type/area context, or accept as historical. Don't auto-fill — manual review.

### Tier 4 — PDF versioning hygiene

9. **[M] Add FK from `pdf_versions.generated_from_ai_summary_version_id` to `ai_summary_versions(id)`** (depends on stage 6). Add supersession marker (`superseded_at`, `superseded_by_version_id`). Enables "show me the PDF that customer X received on date Y, with the AI summary that was approved at the time".
10. **[M] Storage retention policy on superseded PDFs.** Keep latest N or last-30-days; archive older to cheaper Storage tier or delete after a grace period. Coordinated with stage 4 above (regen debounce).

### Tier 5 — Email integrity

11. **[S] Fix `email_logs.sent_by` so it captures `auth.uid()` from the calling Edge Function context.** One-line fix in `send-email/index.ts:194`.
12. **[M] Capture email body hash + body bytes (or a Storage URL) in `email_logs.metadata`** for post-hoc auditing.
13. **[S] Add email_logs FK to `pdf_versions` for templates that send a specific PDF version** (`report-approved`, `job_report_sent`, `inspection_reminder`).

### Tier 6 — Photo history layer

14. **[M] Build `photo_history` table.** Add via trigger or via app-layer logging. Captures adds, deletes, caption changes, reorders. Soft-delete on photos table (add `deleted_at` instead of hard DELETE). Allows undo of accidental deletions.

### Tier 7 — Pricing / quote history

15. **[M] Build `quote_snapshots` table** that stores full pricing fields at moments of significance (initial generation, manual_price_override toggle, send-to-customer). Plus a `pricing_rates_version` column so historic quotes can be replayed against the rate table that was active at the time. Requires also persisting `LABOUR_RATES` / `DISCOUNT_TIERS` to a DB table (`pricing_rates`) instead of code constants.

### Tier 8 — Render coverage cleanup (Pillar 1 INVISIBLE / PARTIAL gaps)

16. **[L] Render coverage pass.** Add per-area `temperature/humidity/dew_point` to PDF template. Add `subfloor.landscape` to PDF. Add `outdoor_dew_point/outdoor_comments` to AI Review page. Add `propertyOccupation/dwellingType` to Lead Detail. Resolve the `external_moisture` DUP (single source of truth). This is a pure render/UX stage — no schema changes.

### Tier 9 — Hygiene / orphans

17. **[S] Remove or undeploy the orphan Edge Functions** `generate-ai-summary` v19 and `modify-ai-summary` v19. Confirm not called from anywhere, then remove from production. Reduces attack surface.

### Tier 10 — UI surface for history (LARGE, do last)

18. **[XL] Per-field history popover + dedicated /admin/audit page.** Depends on stages 5, 6, 7, 14, 15. Once the data exists, design the UX for surfacing it. Includes "Revert to previous value" affordance per field where appropriate.

---

## 6. Closing notes

- This document is diagnostic only. No code changes were made.
- All stats verified against production via Supabase MCP read-only SQL on 2026-04-30.
- The agent transcripts that produced the per-field tables in Pillar 1 contain finer-grained file:line references than reproduced here; if a specific field needs deeper drill-down, the agent run can be re-invoked or `src/pages/TechnicianInspectionForm.tsx` directly inspected.
- One factual correction made vs. agent reports: `pdf_versions` is NOT a ghost table — it has 120 rows. The agent's claim was wrong.
- One factual correction made vs. agent reports: the audit_logs trigger coverage on `leads/inspections/inspection_areas/subfloor_data` is ABSENT in production. The migration `20260311000001` referenced by the agent does not match the live `information_schema.triggers` state.

End of audit.

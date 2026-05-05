# Stage 3.5 Consumer Audit Checklist

**Stage:** 3.4.5 (Phase 3, Inspection Workflow Fix Plan v2)
**Audit date:** 2026-05-01
**Auditor:** Claude (autonomous run, Opus 4.7 1M)
**Companion:** `docs/inspection-workflow-fix-plan-v2-2026-04-30.md` lines 499–525

---

## Purpose

Stage 3.5 will drop 9 legacy columns from `public.inspections`:

```
ai_summary_text
what_we_found_text
what_we_will_do_text
what_you_get_text
problem_analysis_content
demolition_content
ai_summary_approved
ai_summary_generated_at
regeneration_feedback
```

**Every consumer reading or writing these columns must be migrated to read from `ai_summary_versions` (typically via the `latest_ai_summary` compatibility view created in Stage 3.5 step C) BEFORE the drop migration runs.**

This file is the audit trail. **Stage 3.5 cannot proceed until every checkbox below is ticked and Michael has signed off.**

---

## Methodology

Three searches:
1. `grep` across `src/**/*.{ts,tsx}`
2. `grep` across `supabase/functions/**/*.ts`
3. SQL query against `pg_views` and `pg_proc` for any view/function definition referencing the column names

The grep used the snake_case column names directly (e.g. `ai_summary_text`, not `aiSummaryText`). Generated TypeScript type files (`src/types/supabase.ts`, `src/integrations/supabase/types.ts`) are listed once at the bottom — they regenerate from the live schema and need a single `supabase gen types` re-run after Stage 3.5.

---

## Headline finding — DB layer is clean

**Zero views and zero functions in the live `public` schema reference any of the 9 columns.** No `CREATE VIEW` or `CREATE FUNCTION` migrations need updating; no DB-side breakage at drop time. Compatibility view `latest_ai_summary` will be the only DB-side reader after Stage 3.5.

---

## Per-column consumer checklist

### 1. `inspections.ai_summary_text`

| File | Line(s) | Role | Migration required | ☐ |
|---|---|---|---|---|
| `src/pages/TechnicianInspectionForm.tsx` | 2783, 3184 | READ — loads `ai_summary_text` into `formData.jobSummaryFinal` and `initialSummary` | Replace with read from `latest_ai_summary.ai_summary_text` (view) | ☐ |
| `src/pages/TechnicianInspectionForm.tsx` | 3326 | WRITE — `inspections.update({ ai_summary_text: formData.jobSummaryFinal })` after AI complete | Drop write — `ai_summary_versions` is now the canonical store; technician form's edit-after-AI flow needs version-row write or removal | ☐ |
| `src/pages/ViewReportPDF.tsx` | 87, 157 | TYPE — local type field + destructure | Update local type to read from view | ☐ |
| `src/pages/ViewReportPDF.tsx` | 1275 | READ — `'ai_summary': () => inspection.ai_summary_text \|\| ''` (sectionMap) | Replace with view read | ☐ |
| `src/pages/InspectionAIReview.tsx` | 203 | WRITE — Stage 3.3 mirror write (added by Phase 3 work) | Drop the mirror after view migration is complete | ☐ |
| `supabase/functions/generate-inspection-summary/index.ts` | 477, 901, 909 | INTERNAL — Stage 3.2 EF writes `ai_summary_versions.ai_summary_text` and reads previous version's `ai_summary_text` | No migration — this is the new canonical store, not the dropped column | ☑ N/A |
| `supabase/functions/generate-inspection-pdf/index.ts` | 119 | TYPE — interface field `ai_summary_text?: string` | Update type to source from view | ☐ |
| `supabase/functions/generate-inspection-pdf/index.ts` | 1332 | READ — `inspection.problem_analysis_content \|\| inspection.ai_summary_text` (fallback chain) | Replace with view read | ☐ |
| `supabase/functions/generate-inspection-pdf/index.ts` | 1384 | READ — `markdownToHtml(inspection.ai_summary_text) \|\|` | Replace with view read | ☐ |
| `supabase/functions/generate-inspection-pdf/index.ts` | 1412 | READ — fallback chain with `ai_summary_text` | Replace with view read | ☐ |

### 2. `inspections.what_we_found_text`

| File | Line(s) | Role | Migration required | ☐ |
|---|---|---|---|---|
| `src/components/leads/InspectionDataDisplay.tsx` | 115, 554, 555 | READ — display in lead detail | Replace with view read | ☐ |
| `src/pages/InspectionAIReview.tsx` | 68, 137, 145 | TYPE + READ — interface field, SELECT, setState | Update type + read from view | ☐ |
| `src/pages/InspectionAIReview.tsx` | 204, 242 | WRITE — Stage 3.3 mirror save + Stage 3.4 mirror approve | Drop mirrors after view migration | ☐ |
| `src/pages/TechnicianInspectionForm.tsx` | 2784, 3327, 3690 | READ + WRITE — load on mount + save + post-AI inspection update | READ → view; WRITEs → drop (canonical store is versions) | ☐ |
| `supabase/functions/generate-inspection-pdf/index.ts` | 144, 1383, 1392 | TYPE + READ + template substitution | Type → view; reads → view | ☐ |
| `src/pages/ViewReportPDF.tsx` | 76, 149, 1315, 1360 | TYPE + destructure + sectionMap + editableField map | Update type + read from view; verify editable-field write path migrates to versions | ☐ |
| `supabase/functions/generate-inspection-summary/index.ts` | 478, 901, 910 | INTERNAL — version-row writes/reads | No migration — canonical store | ☑ N/A |

### 3. `inspections.what_we_will_do_text`

| File | Line(s) | Role | Migration required | ☐ |
|---|---|---|---|---|
| `src/components/leads/InspectionDataDisplay.tsx` | 115, 560, 561 | READ — display | Replace with view read | ☐ |
| `src/pages/InspectionAIReview.tsx` | 69, 137, 147, 205, 243 | TYPE + READ + WRITE (mirror save + mirror approve) | Type + view; drop mirrors | ☐ |
| `src/pages/TechnicianInspectionForm.tsx` | 2785, 3328, 3691 | READ + WRITE | READ → view; WRITEs → drop | ☐ |
| `supabase/functions/generate-inspection-pdf/index.ts` | 145, 1386, 1393 | TYPE + READ + template substitution | View | ☐ |
| `src/pages/ViewReportPDF.tsx` | 77, 150, 1316, 1361 | TYPE + destructure + sectionMap + editableField map | View; verify editable-field write migrates to versions | ☐ |
| `supabase/functions/generate-inspection-summary/index.ts` | 479, 901, 911 | INTERNAL | No migration | ☑ N/A |

### 4. `inspections.what_you_get_text`

| File | Line(s) | Role | Migration required | ☐ |
|---|---|---|---|---|
| `src/pages/TechnicianInspectionForm.tsx` | 2786, 3329 | READ + WRITE | READ → view; WRITE → drop (note: AI never writes this column; technician-form edits do) | ☐ |
| `supabase/functions/generate-inspection-pdf/index.ts` | 146, 1394 | TYPE + template substitution (currently substituted with empty string at line 1394) | Replace with view read; the empty-string substitution is a soft no-op so behavior shouldn't regress | ☐ |
| `src/pages/ViewReportPDF.tsx` | 78, 151 | TYPE + destructure | Update type from view | ☐ |

### 5. `inspections.problem_analysis_content`

| File | Line(s) | Role | Migration required | ☐ |
|---|---|---|---|---|
| `src/components/leads/InspectionDataDisplay.tsx` | 115, 557, 558 | READ — display | Replace with view read | ☐ |
| `src/pages/InspectionAIReview.tsx` | 70, 137, 146, 206, 244 | TYPE + READ + WRITE (mirror save + mirror approve) | Type + view; drop mirrors | ☐ |
| `src/pages/TechnicianInspectionForm.tsx` | 2787, 3330, 3692 | READ + WRITE | READ → view; WRITEs → drop | ☐ |
| `supabase/functions/generate-inspection-pdf/index.ts` | 120, 967, 1027, 1332, 1412, 1442 | TYPE + 2 READ sites + 1 inline-write template + 2 comments | Type + view; verify markdown-parse helpers use the new source; update comments | ☐ |
| `src/pages/ViewReportPDF.tsx` | 80, 152, 1320, 1388 | TYPE + destructure + READ + **WRITE** (line 1388: `inspections.update({ problem_analysis_content })` from inline editor) | Inline-editor WRITE must write to a new version row (Stage 3.3 pattern) instead of inspections | ☐ |
| `supabase/functions/generate-inspection-summary/index.ts` | 480, 901, 912 | INTERNAL | No migration | ☑ N/A |

### 6. `inspections.demolition_content`

| File | Line(s) | Role | Migration required | ☐ |
|---|---|---|---|---|
| `src/components/leads/InspectionDataDisplay.tsx` | 115, 563, 564 | READ — display | Replace with view read | ☐ |
| `src/pages/InspectionAIReview.tsx` | 71, 137, 148, 207, 245 | TYPE + READ + WRITE (mirror save + mirror approve) | Type + view; drop mirrors | ☐ |
| `src/pages/TechnicianInspectionForm.tsx` | 2788, 3331, 3693 | READ + WRITE | READ → view; WRITEs → drop | ☐ |
| `supabase/functions/generate-inspection-pdf/index.ts` | 121, 1338, 1339, 1445 | TYPE + 2 READ + conditional check | Type + view | ☐ |
| `src/pages/ViewReportPDF.tsx` | 85, 156, 1323, 1407 | TYPE + destructure + READ + **WRITE** (line 1407: inline-editor `inspections.update({ demolition_content })`) | Inline-editor WRITE must move to a new version row | ☐ |
| `supabase/functions/generate-inspection-summary/index.ts` | 481, 901, 913 | INTERNAL | No migration | ☑ N/A |

### 7. `inspections.ai_summary_approved`

| File | Line(s) | Role | Migration required | ☐ |
|---|---|---|---|---|
| `src/pages/InspectionAIReview.tsx` | 271, 303, 306 | WRITE — Stage 3.4 mirror added by Phase 3 work + comments | Drop the mirror once `ai_summary_versions.approved_at` is the canonical signal everywhere | ☐ |

No other consumers. Approval state is now stamped on `ai_summary_versions.approved_at` / `approved_by` (Stage 3.4); the legacy boolean is the only mirror.

### 8. `inspections.ai_summary_generated_at`

| File | Line(s) | Role | Migration required | ☐ |
|---|---|---|---|---|
| `src/components/pdf/StalePdfBanner.tsx` | 8, 10 | COMMENTS — already document the migration plan | Update comments to reference `ai_summary_versions.generated_at` post-migration | ☐ |
| `src/components/pdf/StalePdfBanner.tsx` | 34, 48 | READ — `.select('ai_summary_generated_at')` and `summaryRes.data?.ai_summary_generated_at` to detect stale PDF | Replace with read of latest `ai_summary_versions.generated_at` for the inspection | ☐ |

### 9. `inspections.regeneration_feedback`

**Zero non-types hits.** This column was confirmed dead in the Phase 1 + 2 audit (form-state stub never wired to UI or DB). Migration to `ai_summary_versions.regeneration_feedback` absorbed in Stage 3.2. Stage 3.5 simply drops an empty column. ☑ N/A.

---

## Generated TypeScript types — single regeneration after Stage 3.5

The following files are auto-generated from the live Supabase schema and contain field references for **all 9 columns**:

- `src/types/supabase.ts`
- `src/integrations/supabase/types.ts`

**Action:** after Stage 3.5 drops the columns, run `supabase gen types typescript --linked > src/integrations/supabase/types.ts` (and the equivalent for the other file) so the types reflect the new schema. Until then, the types include fields that no longer exist in the DB — TypeScript compilation will still pass for code that doesn't reference them after consumer migration.

☐ Regenerated `src/types/supabase.ts`
☐ Regenerated `src/integrations/supabase/types.ts`

---

## Stage 3.5 step-A backfill — known data-quality risk to flag

The master plan's Stage 3.5 backfill INSERT (lines 533–548) sets `approved_by` from `inspections.last_edited_by` for previously-approved summaries:

```sql
CASE WHEN ai_summary_approved THEN last_edited_by ELSE NULL END
```

Since `ai_summary_versions.approved_by` has a FK to `auth.users(id)`, the backfill will fail if any historical `last_edited_by` UUID points to a deleted user. **Pre-flight check before Stage 3.5 step A:**

```sql
SELECT COUNT(*) FROM public.inspections i
WHERE i.ai_summary_approved = true
  AND i.last_edited_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.last_edited_by);
```

If this returns > 0, the backfill INSERT must either:
(a) Use `NULL` for those rows, or
(b) Drop the `approved_by` FK first (precedent: Phase 2 `audit_logs_drop_user_fk`).

☑ Pre-flight orphan check run 2026-05-02; result documented in commit ae99897 — **0 orphans**, FK stays.

---

## Sign-off

Before Stage 3.5 step A can run, every ☐ above must be ☑ (and the work to migrate the consumer must be merged to `main` and verified on production).

- [x] All consumer migrations merged (PR #47, merge commit `cbc6119`)
- [x] Generated types regenerated after column drop (PR-E commit `2c3d04c`)
- [x] Backfill orphan pre-flight check run and resolved (0 orphans; FK stays)
- [x] Reviewed by **Michael** — **2026-05-01**. Approved to proceed with consumer migrations. Three flagged risks acknowledged:
  - **ViewReportPDF inline-editor WRITES** (`ViewReportPDF.tsx:1388`, `1407`) → migrated to `ai_summary_versions` `manual_edit` pattern in PR #47 commit `3290253` (Stage 3.4.5) via the local helper `persistManualEdit()`.
  - **`TechnicianInspectionForm.tsx:3326-3331`** redundant post-AI mirror write → **DROPPED** in PR #47 commit `3290253` (Stage 3.4.5). EF is now the canonical writer per Stage 3.2.
  - **Stage 3.5 backfill FK-orphan risk** → pre-flight orphan check ran at the start of Stage 3.5. **0 orphans found**, FK on `ai_summary_versions.approved_by` stays. (And 0 inspections currently have `ai_summary_approved=true`, so the CASE WHEN clause never fires anyway.)
- [x] Compatibility view `latest_ai_summary` created (PR #47 commit `3290253` — Stage 3.4.5; created earlier than master plan's "Stage 3.5 step C predecessor" position to support consumer migrations in PR #47)

---

## Stage 3.5 execution log (PR-E)

**Authorized:** Michael 2026-05-02 (after Phase 3 PR #47 merged to `main` at `cbc6119`)

**Backfilled inspection IDs (audit trail):**
| inspection_id | lead_id | content backfilled |
|---|---|---|
| `1c29e606-ae24-4aec-90c3-229782d8a9d0` | `21a9568d-7a28-4816-aa2b-02e61371f1e3` | ai_summary_text + 3 sections + problem_analysis (full standard backfill) |
| `c61ffdf4-f42a-47a7-b579-1afa75a250db` | `85fca3d1-f30b-4942-ba6c-f9c7d27269d8` | 4 sections (no ai_summary_text); preserved by broader-predicate divergence |

**Predicate divergence from master plan:** The master plan v2 (line 547) specifies `WHERE ai_summary_text IS NOT NULL` for the backfill. Pre-flight on production found 1 inspection (`c61ffdf4-...`) with 6,978 chars of populated section content but null `ai_summary_text`. Plan-spec predicate would have silently lost that data on `DROP COLUMN`. Predicate broadened to `OR` across the 6 content columns. Authorized by Michael 2026-05-02. **Master plan footnote correction tracked as post-PR-E task** (separate commit on `main` after PR-E merges).

**Migrations applied to production DB (verified at apply time):**
- `20260502100028_phase3_stage_3_5_backfill_ai_summary_versions` — INSERT 2 rows
- `20260502100119_phase3_stage_3_5_drop_legacy_ai_summary_columns` — DROP 8 columns explicit + IF EXISTS regeneration_feedback (column never existed; per Phase 1 Stage 1.3 footnote, was a wired-but-not-implemented form-state stub)

**Local snapshot (gitignored):** `phase3-stage-3.5-snapshot-pre-backfill.json` captures full pre-backfill content of both inspections. Supabase automated backups remain primary recovery.

**Final consumer-audit re-grep:** 0 inspections-table reads/writes reference any of the 9 dropped columns. (114 string hits across 7 files all legitimate: `latest_ai_summary` view selects, `ai_summary_versions` table writes, merged-object property names, HTML template placeholders in PDF EF, comments, local TypeScript interface declarations.)

**Stage 3.5-induced consumer fix:** PR-E commit `<this commit>` drops dead AI-summary load paths from `TechnicianInspectionForm.tsx` (lines 2783-2788 + 3184) — these were load-then-save pass-through state with no UI input. Audit-listed during PR #47 but not migrated until the regenerated types after Stage 3.5 surfaced them as TypeScript errors.

---

## Footnote — Stage 3.2 / 3.3 / 3.4 left these mirrors deliberately

The Stage 3.2 EF still writes nothing to `inspections.*` (no regression). Stage 3.3 (`InspectionAIReview.handleSave`) and Stage 3.4 (`InspectionAIReview.handleApprove`) intentionally write BOTH the new `ai_summary_versions` row AND the legacy `inspections.*` columns. This dual-write is the transition pattern: the version row is canonical, the inspection columns mirror until Stage 3.5 drops them.

The mirrors will be removed as part of the consumer-migration work tracked in this file. Until then, all readers continue to see consistent data via the legacy columns.

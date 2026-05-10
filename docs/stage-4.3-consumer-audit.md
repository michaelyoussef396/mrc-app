# Stage 4.3 Consumer Audit Checklist

**Stage:** 4.3.5 (Phase 4, Inspection Workflow Fix Plan v2)
**Audit date:** 2026-05-10
**Auditor:** Claude (autonomous run, Opus 4.7 1M)
**Companion:** `docs/inspection-workflow-fix-plan-v2-2026-04-30.md` lines 665–711
**Sibling precedent:** `docs/stage-3.5-consumer-audit.md`

---

## Purpose

Stage 4.3 will add a `deleted_at TIMESTAMPTZ` column to `public.photos` and convert the existing hard-delete in `deleteInspectionPhoto()` into a soft-delete UPDATE. Two failure modes if this gate is skipped (per plan v2 §4.3.5):

1. **Read-side leak:** Any photo SELECT that doesn't add `WHERE deleted_at IS NULL` will continue to return soft-deleted rows in UI / PDF / AI prompts / Edge Function payloads.
2. **Write-side leak:** Any photo DELETE call site not converted to `UPDATE … SET deleted_at = NOW()` will continue to hard-delete, defeating the purpose of soft-delete (and never emitting a `photo_history { action: 'deleted' }` row).

**Every consumer reading or writing `public.photos` must be migrated BEFORE the column-add migration runs.** Adding the `.is('deleted_at', null)` predicate before the column exists is harmless — every existing row reads as `deleted_at IS NULL`, so the predicate is idempotent (per plan v2 line 707).

This file is the audit trail. **Stage 4.3 cannot proceed until every checkbox below is ticked and Michael has signed off.**

---

## Methodology

Per Stage 3.4.5 belt-and-braces pattern:

1. Two parallel Explore agents — one across `src/**/*.{ts,tsx}`, one across `supabase/functions/**/*.ts`.
2. Direct grep cross-verification (where Bash sandbox allowed; GitNexus FTS read-only this session, fell back to grep + manual classification, same fallback as Stage 3.4.5).
3. Live DB queries via Supabase MCP for the FK chain, RLS policies, triggers, and view/function references — never via repo file inspection (per `feedback_preflight_schema_verification`).
4. Direct file reads of every critical file for line-number accuracy.

---

## Pre-flight verification (live DB, not file inspection)

| Check | Result |
|---|---|
| Latest applied migration | `20260507093812_phase4_stage_4_2_create_photo_history` (Stage 4.2, PR #50). Confirms PR #49 + PR #50 already merged; clean baseline for 4.3. |
| `photos.deleted_at` column exists today? | **No.** Verified via `information_schema.columns`. Clean baseline. |
| Existing `photos` indexes | 8: `photos_pkey`, `idx_photos_inspection_id`, `idx_photos_area_id`, `idx_photos_subfloor_id`, `idx_photos_type`, `idx_photos_job_completion_id` (partial), `idx_photos_uploaded_by`, `idx_photos_moisture_reading_id`. The new `idx_photos_active` (partial) is additive — no overlap. |
| Audit triggers on `photos` | 3: `audit_photos_insert`, `audit_photos_update`, `audit_photos_delete`. Soft-delete UPDATE will fire `audit_photos_update`, automatically logging the `deleted_at` change in `audit_logs`. **No trigger migration needed.** |
| RLS policies on `photos` | 5: `admin_all_photos`, `tech_select_photos`, `tech_insert_photos`, `tech_update_photos`, `tech_delete_photos`. None filter on a soft-delete column. Plan v2 spec is consumer-level filtering, not RLS-level. **No policy change.** |
| DB functions referencing `public.photos` | **0.** Verified via `pg_get_functiondef ILIKE '%public.photos%'`. |
| DB views referencing `photos` | **0** direct. `latest_ai_summary` reads `ai_summary_versions`, not `photos`. |
| Production photo distribution | 71 total: 71 with `inspection_id`, 7 `area_id`, 24 `subfloor_id`, 18 `job_completion_id`, 3 `moisture_reading_id`. All 3 moisture-linked photos carry `caption='moisture'` (Stage 4.1 sentinel) — Feb 2026 historical. |

---

## A. Read consumers — every entry must add `.is('deleted_at', null)`

| # | File | Line(s) | Operation | Current filters | "WHERE deleted_at IS NULL added: confirmed" |
|---|---|---|---|---|---|
| 1 | `src/lib/utils/photoUpload.ts` | 281–285 | SELECT `storage_path` (inside `deleteInspectionPhoto`) | `.eq('id', photoId)` | ☐ |
| 2 | `src/lib/utils/photoUpload.ts` | 333–337 | SELECT * (`loadInspectionPhotos`) | `.eq('inspection_id', inspectionId)` | ☐ |
| 3 | `src/lib/api/inspections.ts` | 404–408 | SELECT * (`loadCompleteInspection`) | `.eq('inspection_id', inspectionId)` | ☐ |
| 4 | `src/lib/api/inspections.ts` | 549–553 | SELECT * (`fetchCompleteInspectionData`) | `.eq('inspection_id', inspectionId)` | ☐ |
| 5 | `src/pages/ViewReportPDF.tsx` | 480–505 | SELECT job-completion photos (useQuery) | `.eq('job_completion_id', jobCompletionId)` | ☐ |
| 6 | `src/pages/ViewReportPDF.tsx` | 689–760 | SELECT inspection-photo pool (`openJobPhotoPicker`) | `.eq('inspection_id', inspectionId)` | ☐ |
| 7 | `src/pages/ViewReportPDF.tsx` | 1662–1692 | SELECT subfloor photos (`loadSubfloorPhotos`) | `.eq('subfloor_id', subfloorId)` | ☐ |
| 8 | `src/pages/ViewReportPDF.tsx` | 1806–1883 | SELECT area photos (`loadAreaPhotos`) | `.eq('area_id', areaId)` | ☐ |
| 9 | `src/components/job-completion/Section3BeforePhotos.tsx` | 60–70 | SELECT inspection photos (`fetchInspectionPhotos`) | `.eq('inspection_id', …).or('photo_category.is.null,photo_category.eq.before')` | ☐ |
| 10 | `src/components/job-completion/Section4AfterPhotos.tsx` | 49–55 | SELECT job-completion photos (`fetchJobCompletionPhotos`) | `.eq('job_completion_id', …).in('photo_category', ['after','demolition'])` | ☐ |
| 11 | `src/components/job-completion/Section4AfterPhotos.tsx` | 77–83 | SELECT count (`fetchBeforePhotoCount`) — gate on Section 3 selection | `.eq('job_completion_id', …).eq('photo_category', 'before')` | ☐ |
| 12 | `src/components/leads/JobCompletionSummary.tsx` | 185–190 | SELECT job-completion photos (useQuery) | `.eq('job_completion_id', jobCompletion.id).in('photo_category', […])` | ☐ |
| 13 | `src/pages/JobCompletionForm.tsx` | 163–171 | SELECT count (demolition photo gate) | `.eq('job_completion_id', …).eq('photo_category', 'demolition')` | ☐ |
| 14 | `src/pages/JobCompletionForm.tsx` | 177–180 | SELECT count (before photo gate) | `.eq('job_completion_id', …).eq('photo_category', 'before')` | ☐ |

---

## B. INSERT consumers — no migration required (new rows have `deleted_at = NULL` by default)

| # | File | Line(s) | Operation | Notes |
|---|---|---|---|---|
| 15 | `src/lib/utils/photoUpload.ts` | 152–171 | INSERT (`uploadInspectionPhoto`) | New rows are active. No change. ☑ N/A |
| 16 | `src/lib/utils/photoUpload.ts` | 210–250 | INSERT wrapper (`uploadMultiplePhotos`) | Delegates to #15. No change. ☑ N/A |
| 17 | `src/lib/offline/SyncManager.ts` | 297–314 | INSERT (offline `syncPhoto` dequeue) | Already wires `recordPhotoHistory({ action: 'added' })` per Stage 4.2. No change. ☑ N/A |
| 18 | `src/components/pdf/ImageUploadModal.tsx` | 130–137 | INSERT (PDF report photo upload) | Standalone INSERT, not via `uploadInspectionPhoto`. Caption gate at line 88. No `deleted_at` write needed. ☑ N/A |

---

## C. UPDATE consumers — every entry must add `.is('deleted_at', null)` guard so we never resurrect soft-deleted rows

| # | File | Line(s) | Operation | Fields updated | "guard added: confirmed" |
|---|---|---|---|---|---|
| 19 | `src/components/job-completion/Section3BeforePhotos.tsx` | 227–234 | UPDATE in `togglePhoto` | `{ job_completion_id, photo_category }` (or null/null on deselect) | ☐ |
| 20 | `src/pages/ViewReportPDF.tsx` | 792–829 | UPDATE in `handleJobPhotoSwap` (2 UPDATEs: set new + unset old) | `{ job_completion_id, photo_category }` | ☐ |
| 21 | `src/pages/ViewReportPDF.tsx` | 1720–1743 | UPDATE in `handleSwapSubfloorPhoto` (2 UPDATEs: set + unset) | `{ subfloor_id }` | ☐ |
| 22 | `src/pages/TechnicianInspectionForm.tsx` | 3500–3505 | UPDATE setting `moisture_reading_id` on freshly-created moisture-photo | `{ moisture_reading_id }` | ☐ |

---

## D. DELETE consumers — must convert to soft-delete UPDATE

| # | File | Line(s) | Operation | "converted to soft-delete UPDATE: confirmed" |
|---|---|---|---|---|
| 23 | `src/lib/utils/photoUpload.ts` | 302–305 | `.delete().eq('id', photoId)` — the **only** photo-table DELETE in `src/` | ☐ |

The conversion (Stage 4.3 step B):

1. SELECT `storage_path` from `photos` WHERE `id = photoId AND deleted_at IS NULL` — fail loudly if already soft-deleted (idempotency vs silent re-delete: error wins).
2. **Drop** the `supabase.storage.from('inspection-photos').remove(...)` call at line 292 — plan v2: file stays in Storage.
3. NULL out `inspection_areas.primary_photo_id` where it equals `photoId` (atomic with #4 — same try/catch).
4. UPDATE `photos` SET `deleted_at = NOW()` WHERE `id = photoId AND deleted_at IS NULL`.
5. Call `recordPhotoHistory({ photo_id, inspection_id, action: 'deleted', before: { … }, after: null })` — non-blocking per existing pattern at `photoUpload.ts:184`. Wires the deferred PR-G `'deleted'` action.

---

## E. Edge Function consumers — service role, bypass RLS, MUST migrate explicitly

| # | File | Line(s) | Operation | User-facing? | "WHERE deleted_at IS NULL added: confirmed" |
|---|---|---|---|---|---|
| 24 | `supabase/functions/generate-inspection-pdf/index.ts` | ~1630 | SELECT relational `photos:photos(*)` inside main inspection query | YES — embeds photos as base64 in customer PDF | ☐ |
| 25 | `supabase/functions/generate-inspection-pdf/index.ts` | ~1719 | SELECT subfloor photos (standalone query, service role) | YES — customer PDF | ☐ |
| 26 | `supabase/functions/generate-job-report-pdf/index.ts` | 175–179 | SELECT job-completion photos | YES — customer job-completion PDF | ☐ |

The other 11 Edge Functions (`calculate-travel-time`, `check-overdue-invoices`, `export-inspection-context`, `send-email`, `send-inspection-reminder`, `receive-framer-lead`, `send-slack-notification`, `manage-users`, `seed-admin`, `generate-inspection-summary`, `phase2_audit_attribution_helpers` RPC helpers) do NOT touch `photos`. Re-grep verified.

For #24, the PostgREST relational-select syntax doesn't support inline `.is()` filters cleanly; preferred approach is to split the relational select out into a separate `.from('photos').select(...).eq('inspection_id', …).is('deleted_at', null)` query. This is a small refactor in `generate-inspection-pdf` worth its own commit.

---

## F. DB layer — no migration required by 4.3 itself

| Item | Status | Notes |
|---|---|---|
| `audit_photos_insert/update/delete` triggers | ☑ N/A | Soft-delete UPDATE fires `audit_photos_update`, recording the `deleted_at` change to `audit_logs`. Working as intended. |
| 5 RLS policies on `photos` | ☑ N/A | Plan v2 spec is consumer-level filtering, not policy-level. **Decision (locked):** soft-deleted rows remain readable via RLS — consumers MUST add the filter. |
| `latest_ai_summary` view | ☑ N/A | Reads `ai_summary_versions`, not photos directly. No view definition references `photos`. |
| `photo_history` table | ☑ N/A | `photo_id` deliberately has NO FK to `photos.id` (Stage 4.2 design choice). Soft-deleted photos retain their history rows correctly. |
| 0 DB functions reference `public.photos` | ☑ N/A | Verified via `pg_get_functiondef ILIKE '%public.photos%'` — empty result set. |

---

## G. FK cascade chain

### Into `photos` (other tables → `photos.id`)

| Source | Column | Delete rule | Cascade behaviour reviewed |
|---|---|---|---|
| `inspection_areas` | `primary_photo_id` | SET NULL | ☐ — **Decision (locked):** soft-delete won't fire this FK. `deleteInspectionPhoto()` will explicitly NULL-out any `inspection_areas.primary_photo_id` pointing to the photo before the soft-delete UPDATE. |

### Out of `photos` (`photos.*` → other tables)

| Column | Target | Delete rule | Cascade behaviour reviewed |
|---|---|---|---|
| `inspection_id` | `inspections.id` | SET NULL | ☑ OK — inspection deletion orphans photos but doesn't cascade-delete them. |
| `area_id` | `inspection_areas.id` | SET NULL | ☑ OK |
| `subfloor_id` | `subfloor_data.id` | SET NULL | ☑ OK |
| `job_completion_id` | `job_completions.id` | SET NULL | ☑ OK |
| `moisture_reading_id` | `moisture_readings.id` | **CASCADE** ⚠️ | ☐ — **Decision (locked):** ALTER to SET NULL inside the Stage 4.3 migration. Aligns with the 4 other photo FKs. |

### Cascade chain investigation (why the moisture FK matters)

`moisture_readings` IS actively hard-deleted in production via two paths:

1. `src/pages/TechnicianInspectionForm.tsx:3478` — direct `.from('moisture_readings').delete().in('id', readingsToDelete)` when tech removes moisture readings during inspection editing.
2. `src/pages/TechnicianInspectionForm.tsx:3418` — `.from('inspection_areas').delete().in('id', areasToDelete)` cascades through `inspection_areas → moisture_readings` (CASCADE) → `photos` (CASCADE today, SET NULL after Stage 4.3).

3 production photos currently have `moisture_reading_id` set (all `caption='moisture'` Stage 4.1 sentinel — Feb 2026 historical). The cascade is NOT dormant. Without the FK change, soft-delete is bypassed for moisture-linked photos when their parent moisture_reading or inspection_area is removed.

`src/lib/api/inspections.ts:285–294` exports a `deleteInspectionArea()` helper that is currently uncalled from any UI — flagging for note only.

---

## H. Storage bucket interaction

Plan v2 §4.3 verification spec: "file still in Storage" after soft-delete. Current `deleteInspectionPhoto()` calls `supabase.storage.from('inspection-photos').remove(...)` at `src/lib/utils/photoUpload.ts:292`.

**Decision (locked):** REMOVE the Storage `.remove()` call when converting to soft-delete. Storage bloat trade-off is acceptable; cleanup is out of Stage 4.3 scope (separate future stage if needed).

---

## I. Offline / Dexie

`src/lib/offline/db.ts` `photoQueue` and `quarantinedPhotos` stores are pre-sync queues. Soft-delete is a post-sync concept — only synced photos have a `deleted_at` column. **No Dexie schema migration. No offline code change.** Verified by direct read of `src/lib/offline/SyncManager.ts:280–353` (the dequeue path).

---

## J. Tests

| File | Type | Status |
|---|---|---|
| `testsprite_tests/TC006_Inspection_Form_Photo_Upload_Handling.py` | Playwright E2E (UI-only) | Re-run after Stage 4.3 to confirm upload flow unchanged. No code change. |
| (no Vitest unit tests for photo helpers exist today) | — | Stage 4.3 step D adds the first unit test for `deleteInspectionPhoto` — coverage gap closes as part of the destructive work, not as part of the audit gate. |

Re-grep verified: no `*.test.ts(x)` or `*.spec.ts(x)` files in `src/` mention `photos`, `uploadInspectionPhoto`, `deleteInspectionPhoto`, or `loadInspectionPhotos`. `testsprite_tests/` is the only photo-aware test surface today.

---

## Locked decisions (from sign-off questions, 2026-05-10)

1. **moisture cascade FK:** Change `photos_moisture_reading_id_fkey` from CASCADE to SET NULL inside the Stage 4.3 migration. Aligns with the 4 other photo FKs.
2. **primary_photo_id:** `deleteInspectionPhoto()` NULLs out `inspection_areas.primary_photo_id` before the soft-delete UPDATE.
3. **RLS:** No policy change. Filtering happens at consumer level (per plan v2).
4. **Storage:** Soft-delete preserves the Storage object — drop the `.remove()` call from `deleteInspectionPhoto()`.

The Stage 4.3 migration encoded with these decisions:

```sql
-- Phase 4 Stage 4.3 — soft-delete on photos
ALTER TABLE public.photos ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_photos_active
  ON public.photos(inspection_id, photo_type)
  WHERE deleted_at IS NULL;

-- Stage 4.3 amendment: align moisture_reading FK with the other 4 photo FKs
ALTER TABLE public.photos DROP CONSTRAINT photos_moisture_reading_id_fkey;
ALTER TABLE public.photos ADD CONSTRAINT photos_moisture_reading_id_fkey
  FOREIGN KEY (moisture_reading_id)
  REFERENCES public.moisture_readings(id)
  ON DELETE SET NULL;
```

---

## Sign-off

Before Stage 4.3 step A can run, every ☐ above must be ☑ (and the work to migrate the consumer must be merged to `main` and verified on production). Per plan v2 line 707, the consumer migrations CAN merge ahead of the column-add migration — adding the predicate before the column exists is harmless.

- [ ] All Read-consumer migrations (#1–#14) merged
- [ ] All UPDATE-guard migrations (#19–#22) merged
- [ ] DELETE conversion (#23) merged
- [ ] Edge Function migrations (#24–#26) merged + EFs deployed
- [ ] Stage 4.3 schema migration applied (deleted_at column + idx_photos_active partial index + moisture FK SET NULL alteration)
- [ ] `inspection_areas.primary_photo_id` NULL-out logic added to `deleteInspectionPhoto()`
- [ ] Storage `.remove()` call dropped from `deleteInspectionPhoto()`
- [ ] `recordPhotoHistory({ action: 'deleted' })` wired in `deleteInspectionPhoto()`
- [ ] First unit test for `deleteInspectionPhoto` added (covers: row soft-deleted, Storage object preserved, photo_history row inserted, primary_photo_id NULLed)
- [ ] Re-grep verification: zero `from('photos')` reads in `src/` or `supabase/functions/` without an adjacent `.is('deleted_at', null)` predicate (allow-list documented exceptions only)
- [ ] End-to-end verification per plan v2 §4.3 verification spec (upload → soft-delete → row exists with `deleted_at` populated → file still in Storage → `photo_history` row with `action='deleted'`)
- [ ] Reviewed by **Michael** — **YYYY-MM-DD**. Approved to proceed with consumer migrations.

---

## Footnote — relationship to Stage 4.2

Stage 4.2 (PR #50, merged at `e2150fd`) created `photo_history` and wired `'added'`, `'caption_changed'`, `'category_changed'`, `'reordered'`, and `'reattached'` actions across the existing photo write paths. The `'deleted'` action enum value was added but deliberately left without a caller — it's the contract this stage fulfills. After Stage 4.3 ships, every state transition on a photo (including its disappearance from the live set) emits a `photo_history` row. Permanent audit trail closes.

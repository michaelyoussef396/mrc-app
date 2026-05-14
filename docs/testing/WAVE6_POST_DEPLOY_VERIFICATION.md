# Wave 6 Post-Deploy Structural Verification

**Date:** 2026-05-14
**Branch:** `main` @ `a8fde98`
**Production HEAD:** `4947752`
**GitNexus index:** Fresh (re-indexed against `a8fde98` — 8,403 nodes / 12,203 edges / 300 flows)
**Mode:** READ-ONLY structural audit (no code changes)

---

## Summary

**Verdict (initial audit, 2026-05-14):** Deploy is structurally sound for Wave 6 in production, BUT has **2 launch-affecting gaps + 5 cleanup nits** requiring Wave 6.1 follow-up.

**Wave 6.1 emergency PR shipped 2026-05-14** resolved BUG-027 + BUG-028 + BUG-034 (the runtime-breaking `urgency` references + stowaway `subfloor_data.comments_approved` + stale types). BUG-031 reclassified as NOT-A-BUG (`primary_photo_id` is per-area layout, cover photo uses a separate caption-fallback chain intentionally). Updated totals below reflect the post-Wave-6.1 structural state.

**Totals (out of 18) — post-Wave-6.1:**

- PASS: **14** (Checkpoints 1, 2, 3, 5, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18)
- FAIL: **1** (Checkpoint 4 — partial: BUG-027 half resolved, BUG-029 + BUG-029b still queued)
- RISK: **3** (Checkpoints 6, 14, 15)

The remaining FAIL (Checkpoint 4) is a follow-up cleanup PR scoped to BUG-029 + BUG-029b — 3 legacy `status_change` writers + `approvePDF` activity gap. None block Run 6 browser testing. RISKs are defense-in-depth gaps (Zod gate, regex ordering, breadcrumb sanitization) — also follow-up scope.

**Original totals at audit time (2026-05-14, pre-Wave-6.1):**

- PASS: 11
- FAIL: 2 (Checkpoint 1, Checkpoint 4)
- RISK: 5 (Checkpoints 6, 13, 14, 15, 18)

---

## Checkpoint Table

| # | Checkpoint | Verdict | Evidence (file:line) | Notes |
|---|-----------|---------|---------------------|-------|
| 1 | Orphan reads — 35 dropped columns | **PASS** (was FAIL — resolved Wave 6.1) | Live state confirmed via `information_schema`: zero application-code `urgency` references (BUG-027 resolved); `subfloor_data.comments_approved` dropped via migration `20260514013103_drop_subfloor_data_comments_approved.sql` (BUG-028 resolved). Backup-table type entries are immutable history. |
| 2 | LeadView Bucket-2 cards | **PASS** | `src/pages/LeadDetail.tsx:1802-2053` | All 10 Bucket-2 fields read from real `inspections.*`, `inspection_areas.*`, and `subfloor_data.*` columns. No placeholders. |
| 3 | TechJobDetail field-source parity | **PASS** | `src/pages/TechnicianJobDetail.tsx:159-213` | Site-Info card reads from `inspections.{waste_disposal_*, recommended_dehumidifier, parking_option, additional_info_technician, cause_of_mould, property_occupation, outdoor_comments}` + `subfloor_data.sanitation_required` + `inspection_areas.internal_office_notes` — exactly the same canonical columns LeadDetail uses. |
| 4 | Canonical writer conversion (status transitions) | **FAIL** (still active post-Wave-6.1 — BUG-029 + BUG-029b queued for follow-up cleanup PR) | `src/pages/ViewReportPDF.tsx:851-856`; `src/pages/LeadsManagement.tsx:300-305`, `:560-565`; `src/lib/api/pdfGeneration.ts:241-283` | Three sites still write parallel legacy `activity_type='status_change'` rows: ViewReportPDF job-completion approve, LeadsManagement `updateLeadStatus` and `handleApproveJobReport`. Separately, `approvePDF()` (the inspection-PDF approval path) writes no activity row at all — silent transition. |
| 5 | TIF per-section milestone wiring | **PASS** | `src/lib/api/fieldEditLog.ts:142-173`; `src/pages/TechnicianInspectionForm.tsx:3713-3772` | One `logSectionMilestone` per save consolidates diffs across `inspections` + `inspection_areas` + `subfloor_data` snapshots. `moisture_readings` / `subfloor_readings` are not diffed against snapshots — acceptable per the milestone-row design (parent-table diff captures the meaningful section change). |
| 6 | lead_source vocabulary | **RISK** | `src/lib/leadUtils.ts:103-112`; `src/lib/validators/lead-creation.schemas.ts:166-177`; `src/components/leads/CreateNewLeadModal.tsx:394`; `supabase/functions/receive-framer-lead/index.ts:689`; `src/components/schedule/LeadBookingCard.tsx:153`; `src/hooks/useLeadUpdate.ts:30,77-80` | 8 canonical values present in both `leadSourceOptions` and `leadSourceSchema`. `CreateNewLeadModal` and `receive-framer-lead` validate. `LeadDetail` inline edit + `LeadBookingCard` write through `useLeadUpdate` which does NOT call `leadSourceSchema.safeParse` — UI dropdown is the only gate, no server-side schema gate. |
| 7 | Equipment enabled derivation | **PASS** | `src/pages/TechnicianInspectionForm.tsx:2816-2821` | `dryingEquipmentEnabled = treatment_methods.includes('Drying Equipment')`, qty-based booleans for the other three. No persistence — confirmed grep of save payload has no `*_enabled` writes. |
| 8 | manualPriceOverride canonical read | **PASS** | `src/pages/TechnicianInspectionForm.tsx:2833` | `manualPriceOverride: ins.manual_labour_override || false`. Zero reads of dropped `manual_price_override`. |
| 9 | PDF subfloor gate simplification | **PASS** | `supabase/functions/generate-inspection-pdf/index.ts:1137`, `:1426`, `:1686` | Both gates are `subfloorData != null` / `subfloorData == null`. Comment at :1686 confirms `subfloor_required` removed. Subfloor fetch block runs unconditionally. |
| 10 | Internal moisture wiring | **PASS** | `src/pages/TechnicianInspectionForm.tsx:3556,3737`; EF `:1085` | TIF writes `internal_moisture` mirroring `external_moisture`. EF replaces `{{internal_moisture}}` placeholder using moisture-readings lookup with `'-'` fallback. |
| 11 | Both-option pricing dual-write | **PASS** | `src/pages/TechnicianInspectionForm.tsx:3355-3390`, `:3479-3482` | When `optionSelected === 3`, both `option_1_total_inc_gst` and `option_2_total_inc_gst` are computed and written. Validation throws (lines 3376-3381) if either is null/non-finite/≤0. Modes 1 and 2 null-clear the unused option. |
| 12 | Per-area extra notes | **PASS** | `src/pages/TechnicianInspectionForm.tsx:1155-1156` (input) → `:3559, :3740` (save) → `:2734` (load); EF `:1053, :1104` (read) | Form state, save payload, load payload all wired. PDF EF replaces `{{extra_notes}}` placeholder. |
| 13 | Primary photo cover feature | **PASS** (was RISK — reclassified Wave 6.1: NOT A BUG) | `primary_photo_id` is intentionally per-area-only (controls per-area photo grid ordering at EF :1063-1070). Customer-PDF cover photo (Page 1) uses a separate caption/photo_type fallback chain (`front_house` → `general` → `firstOutdoor`) by design. Original Wave 6 brief covered per-area primary only. EF cover-photo logic is working as intended. |
| 14 | PDF placeholder safety net | **RISK** | `supabase/functions/generate-inspection-pdf/index.ts:1507`, then `:1510` color-fix, return at `:1515`; storage upload at `:1857` | Safety net regex is `/\{\{[^}]+\}\}/g` (broader than the brief's `/\{\{[a-zA-Z_]+\}\}/g`) and IS present. Placement: it is the last placeholder-replace in `generateReportHtml`, BUT a `color: #121D73` style-replace runs AFTER it (line 1510). The style replace cannot resurrect placeholders, so this is structurally safe — flagging as RISK only because the brief's "LAST step before storage upload" wording is not literally true (the very last call before upload is the color fix). |
| 15 | Sentry photo-moisture breadcrumb | **RISK** | `src/lib/utils/photoUpload.ts:128-135, 205-213`; `src/pages/TechnicianInspectionForm.tsx:3628-3638` | Breadcrumb fires at both required sites. **PII assessment:** payload contains `inspection_id`, `area_id`, `photo_id`, `moisture_reading_id`, `file_size`, `mime_type`, `photo_type` (booleans/UUIDs/numerics — SAFE). The upload-failed breadcrumb at :128-135 also contains `error_message: uploadError.message` — Supabase Storage error messages are generally PII-safe but could in rare edge cases leak a path that includes inspection UUIDs. Acceptable but worth a follow-up audit. |
| 16 | Orphan-check EF wiring | **PASS** | `supabase/functions/check-photo-moisture-orphans/index.ts:42, 81-87, 105-128` | EF exists. Caption regex `/^moisture$|\d+(\.\d+)?%/i` matches both the literal `'moisture'` sentinel and percentage patterns. Query gates: `moisture_reading_id IS NULL` ✓, `deleted_at IS NULL` ✓, age > 1 hour ✓. Alert path: `console.warn` with structured JSON payload (NOT Slack/Sentry-direct — runs via Supabase function logs, expected to be drained by a separate log integration; matches the Phase 6 plan). |
| 17 | Admin cost breakdown card | **PASS** | `src/pages/LeadDetail.tsx:2008-2053` | Reads `inspection.labour_cost_ex_gst`, `inspection.equipment_cost_ex_gst`, `inspection.subtotal_ex_gst`, `inspection.gst_amount` — all 4 pricing columns. Comment at :2008-2009 documents the source. |
| 18 | TypeScript types canonical | **PASS** (was RISK — resolved Wave 6.1) | `src/integrations/supabase/types.ts` regenerated from live schema 2026-05-14 (BUG-034 resolved). Live `leads` table block has zero `urgency`; live `subfloor_data` block has zero `comments_approved`. All 35 dropped Phase-5 columns absent from live-table types (backup-table entries are immutable history). `tsc --noEmit` clean. |

---

## Wave 6.1 emergency PR — resolution log (2026-05-14)

Same-PR cleanup shipped after this audit. Status of each finding:

- **BUG-027 — RESOLVED.** All application-code `urgency` references removed: `useInspectionLeads.ts` (interface field + SELECT + client-side urgency-priority sort → FIFO via existing server-side `.order('created_at')`), `InspectionJobCard.tsx` (badge function + render + unused `cn` import deleted), `TechnicianJobDetail.tsx` (LeadData field + badge render block), `useLeadUpdate.ts` (payload type), `lead-creation.schemas.ts` (`bookingUrgencySchema` + `normalLeadSchema.urgency` removed), `fieldLabels.ts` (mapping), `leadUtils.ts` (`urgencyOptions` constant — had zero importers). Validation: `tsc --noEmit` clean, 154/154 Vitest tests pass, `npm run build` clean.

- **BUG-028 — RESOLVED.** Migration `supabase/migrations/20260514013103_drop_subfloor_data_comments_approved.sql` applied via Supabase MCP. Post-apply `information_schema.columns` query returns 0 rows for `subfloor_data.comments_approved`. Phase 5 backup row remains in `inspection_areas_dead_col_drop_backup_20260513` (named for original target table — still valid as data snapshot).

- **BUG-031 — NOT A BUG.** `primary_photo_id` is a per-area page-layout concept (controls per-area photo grid ordering at EF `:1063-1070`). The customer-PDF cover photo (Page 1) intentionally uses a separate caption/photo_type fallback chain (`front_house` → `general` → `firstOutdoor`). Original Wave 6 brief Q16/Q18 covered per-area primary only. EF cover-photo logic is working as intended. No code change required.

- **BUG-034 — RESOLVED.** `src/integrations/supabase/types.ts` regenerated via `mcp__plugin_supabase_supabase__generate_typescript_types` against live project `ecyivrxjpsmjmexqatym`. Live `leads` table block has zero `urgency` field; live `subfloor_data` block has zero `comments_approved` field. The 35 Phase-5 dropped columns are no longer present in live-table types — only in `*_dead_col_drop_backup_20260513` types (immutable history). The over-permissive types that masked BUG-027 from typecheck are gone.

**Still queued for follow-up Wave 6.1 cleanup PR** (do NOT block Run 6 browser testing):
- BUG-029 — 3 legacy `status_change` write sites (ViewReportPDF, LeadsManagement × 2)
- BUG-029b — `approvePDF()` activity-row coverage gap
- BUG-030 — `useLeadUpdate.ts` Zod gate for `lead_source`
- BUG-032 — color-fix ordering vs placeholder safety net in `generate-inspection-pdf` EF
- BUG-033 — Sentry breadcrumb `error_message` sanitization in `photoUpload.ts`
- BUG-035 — Google Places autocomplete broken on `/admin` → "Create New Lead" Street field (user-reported 2026-05-14). Probable cause: Maps API key referrer restriction missing `mrcsystem.com`. MEDIUM severity — admin can type manually. Full entry in `docs/TODO.md`.

---

## Detail: FAIL and RISK findings (for Wave 6.1 queue)

### BUG-027 (FAIL — Checkpoint 1) — `urgency` column dropped, but 4 application surfaces still read/write/render it

**Evidence:**
- `src/hooks/useInspectionLeads.ts:20` declares `urgency: string` on `InspectionLead`.
- `src/hooks/useInspectionLeads.ts:64` selects `urgency` from `leads` table.
- `src/hooks/useInspectionLeads.ts:80-91` sorts by urgency priority.
- `src/components/inspection/InspectionJobCard.tsx:38-82` renders color-coded urgency badge.
- `src/pages/TechnicianJobDetail.tsx:45` declares `urgency: string | null` on `LeadData`.
- `src/pages/TechnicianJobDetail.tsx:842-847` renders the urgency badge if present.
- `src/hooks/useLeadUpdate.ts:30` permits `urgency` in the update payload.
- `src/lib/validators/lead-creation.schemas.ts:145, 247` defines `bookingUrgencySchema` + writes `urgency` in lead-creation payload.
- `src/lib/utils/fieldLabels.ts:27` maps `urgency` → `'Urgency'`.

**Live DB state:** `leads.urgency` is GONE (verified via `information_schema.columns`).

**Impact:** First time the Inspection Pipeline tab loads (technician dashboard `/technician/jobs` → "Inspection Ready" tab via `useInspectionLeads`), Supabase returns PostgREST 400. The query selects a column that no longer exists. The hook will throw, the tab will render an error or empty state. Technician cannot select an inspection-ready lead.

**Fix scope (Wave 6.1):** Remove `urgency` from (a) the SELECT in `useInspectionLeads.ts:64`, (b) the `InspectionLead` interface field, (c) the sorting logic at :80-91 (replace with FIFO-only or drop the sort), (d) `InspectionJobCard.tsx` badge entirely or replace with a different badge source, (e) `TechnicianJobDetail.tsx` field + render, (f) `useLeadUpdate.ts` payload type, (g) `lead-creation.schemas.ts` (decide whether the lead-creation flow keeps an in-memory `urgency` that is no longer persisted, or drop the field entirely), (h) `fieldLabels.ts` mapping, (i) `urgencyOptions` constant in `leadUtils.ts:129-134`. **Plus** regenerate `src/integrations/supabase/types.ts` against live schema.

**Severity:** **HIGH — runtime-breaking for technician Inspection Ready tab.** Cannot wait.

---

### BUG-028 (FAIL — Checkpoint 1) — `subfloor_data.comments_approved` column not dropped

**Evidence:** Live DB query against `information_schema.columns` returns `subfloor_data.comments_approved` as type `boolean`. The Phase 5 migration text in `supabase/migrations/20260513_phase5_dead_column_drop.sql:145-159` intended to drop `comments_approved` from `inspection_areas` (which is where the legacy column lived per the migration narrative, but the ALTER TABLE ran against `inspection_areas` and the column did not exist there — silently no-op due to `IF EXISTS`). The column on `subfloor_data` survived because no `ALTER TABLE subfloor_data DROP COLUMN comments_approved` statement was emitted.

**Application impact:** None today — no code reads or writes the column on either table. Backup table `inspection_areas_dead_col_drop_backup_20260513` still holds the original snapshot row. Pure DB drift, not customer-visible.

**Fix scope (Wave 6.1):** New migration `2026MMDDHHMMSS_drop_subfloor_data_comments_approved.sql` issuing `ALTER TABLE subfloor_data DROP COLUMN IF EXISTS comments_approved`. Backup already taken in Phase 5.

**Severity:** **LOW** — silent drift, no functional impact.

---

### BUG-029 (FAIL — Checkpoint 4) — 3 legacy `status_change` write sites still active

**Evidence:**
- `src/pages/ViewReportPDF.tsx:851-856` — Job report approval inserts `activity_type: 'status_change'` directly (this is a separate code path from the inspection-PDF approval; `handleApprove` branches on `reportType === 'job'`).
- `src/pages/LeadsManagement.tsx:300-305` — `updateLeadStatus` writes legacy row on inline status pill change.
- `src/pages/LeadsManagement.tsx:560-565` — `handleApproveJobReport` writes legacy row on tab-action approval.

**Application impact:** Activity timeline will show TWO rows per status change at these surfaces (one legacy `status_change` row + zero canonical `field_edit` row in these specific paths, since none of these three call `logFieldEdits`). The legacy row has no diff metadata, no actor attribution beyond what the trigger captures. Coexists with the canonical writer used elsewhere — inconsistent timeline UX.

**Fix scope (Wave 6.1):** Convert the three sites to call `logFieldEdits` + invalidate `['activity-timeline']`. Drop the raw `activities` inserts.

**Additionally:** `approvePDF()` in `src/lib/api/pdfGeneration.ts:241-283` updates `leads.status` to `inspection_email_approval` with NO activity row written (neither canonical nor legacy). This is a *coverage gap*, not a parallel-write bug — call out as BUG-029b.

**Severity:** **MEDIUM** — timeline inconsistency, audit gap on inspection-PDF approval.

---

### BUG-030 (RISK — Checkpoint 6) — `useLeadUpdate.ts` accepts `lead_source` without Zod validation

**Evidence:**
- `src/hooks/useLeadUpdate.ts:30` declares `lead_source?: string | null` on `LeadUpdatePayload`.
- `:77-80` writes `updates` (which may contain raw `lead_source`) directly to `leads` table — no `leadSourceSchema.safeParse` call.
- Consumers: `LeadDetail.tsx` inline edit, `src/components/schedule/LeadBookingCard.tsx:153`.

**Application impact:** UI dropdowns at both surfaces use `leadSourceOptions` (the 8-value canonical list), so in practice only canonical values are written. However the schema gate is dropdown-only — there is no server-side / hook-side guard. A direct `useLeadUpdate({ lead_source: 'arbitrary string' })` call would persist. Defense-in-depth gap.

**Fix scope (Wave 6.1):** Add `leadSourceSchema.safeParse` inside `useLeadUpdate.updateLead` before the supabase update call. Reject with a toast on parse failure.

**Severity:** **LOW** — defense-in-depth; no current exploit path.

---

### BUG-031 (RISK — Checkpoint 13) — Cover photo lookup does not consult `primary_photo_id`

**Evidence:** `supabase/functions/generate-inspection-pdf/index.ts:1280-1285`:
```
const frontHousePhoto = inspection.photos?.find(p => p.caption === 'front_house')
const generalPhoto = inspection.photos?.find(p => p.photo_type === 'general')
const firstOutdoorPhoto = inspection.photos?.find(p => p.photo_type === 'outdoor')
const coverPhoto = frontHousePhoto || generalPhoto || firstOutdoorPhoto
```

**Application impact:** The per-area `primary_photo_id` correctly reorders the per-area photo grid (EF :1063-1070) but is NOT consulted by the customer-PDF Cover Photo (Page 1). If a technician marks a non-outdoor photo as "primary" expecting it to land on the cover, the PDF will still use the caption/photo_type fallback chain.

**Fix scope (Wave 6.1):** Clarify the requirement with Michael — is `primary_photo_id` per-area only, or should there also be an `inspection.cover_photo_id` selector? If the latter, add a column + writer + EF lookup. If the former (likely — name says "primary photo" not "cover photo"), this is a doc nit, not a code change.

**Severity:** **LOW** — depends on intent.

---

### BUG-032 (RISK — Checkpoint 14) — Color-fix runs after the placeholder safety-net regex

**Evidence:** `supabase/functions/generate-inspection-pdf/index.ts:1507-1510`:
```
html = html.replace(/\{\{[^}]+\}\}/g, '')      // safety net at 1507
html = html.replace(/color: #121D73/gi, 'color: #150db9')  // 1510 — AFTER
```

**Application impact:** None functionally — a regex replacing `color: #121D73` cannot reintroduce a `{{...}}` token. But the brief specified "the regex sweep is the LAST step before storage upload" — strictly, it is NOT (the color replace is). If a future contributor adds a placeholder-emitting transform after line 1507 not noticing this ordering, the safety net silently no-ops for the new transform.

**Fix scope (Wave 6.1):** Either move the color-fix BEFORE the safety net, OR drop a comment above the safety net explicitly stating "do not add placeholder-emitting transforms after this line".

**Severity:** **LOW** — defensive ordering hygiene.

---

### BUG-033 (RISK — Checkpoint 15) — `uploadError.message` may carry partial storage path

**Evidence:** `src/lib/utils/photoUpload.ts:128-135`:
```
addBusinessBreadcrumb('photo_upload_failed', {
  error_message: uploadError.message,
  ...
})
```

**Application impact:** Supabase Storage error messages are usually generic (`'duplicate key value'`, `'object not found'`) but can in rare cases include the storage path which includes the inspection UUID. UUIDs are not strictly PII but exposing them in Sentry breadcrumbs could allow lateral identification of inspection IDs from error patterns.

**Fix scope (Wave 6.1):** Sanitize `error_message` to strip path-like substrings, or replace with a sanitized error code.

**Severity:** **LOW** — informational concern, acceptable today.

---

### BUG-034 (RISK — Checkpoint 18) — `src/integrations/supabase/types.ts` stale post-Phase-5

**Evidence:** File still contains type definitions for all 35 dropped columns (see Checkpoint 18 row for line numbers). Live schema has dropped them. `tsc --noEmit` passes because the types are over-permissive — declaring columns as `... | null` lets writers/readers compile against ghost columns.

**Application impact:** Conceals the BUG-027 surfaces from the typechecker. If the types were regenerated, `useInspectionLeads.ts:64` would fail typecheck because `urgency` wouldn't exist on the `leads` Row type.

**Fix scope (Wave 6.1):** Run `npx supabase gen types typescript --project-id ecyivrxjpsmjmexqatym > src/integrations/supabase/types.ts`. Resolve any new typecheck failures (these should be exactly the BUG-027 surfaces — fix together).

**Severity:** **MEDIUM** — masks runtime gaps from typecheck. Tightly coupled with BUG-027.

---

## Closing notes

1. **The 35-column drop is 34-of-35 effective.** The Phase 5 migration succeeded on inspections (19 cols), inspection_areas (13 cols dropped — the 14th `comments_approved` listed in the SQL never existed on that table; the IF EXISTS silently no-op'd), leads (1), subfloor_data (1 — `racking_required` only), moisture_readings (1). `subfloor_data.comments_approved` is the surviving stowaway (BUG-028).

2. **Types regen is the unblocker.** Running `supabase gen types` would surface BUG-027 in seconds — typecheck would catch the dropped-column reads. Recommend pairing BUG-027 and BUG-034 in the same Wave 6.1 commit.

3. **`approvePDF()` coverage gap** is the most overlooked finding. This is the inspection-PDF approval path (admin clicks Approve on `/admin/inspection-ai-review` → `ViewReportPDF`) and it writes ZERO activity rows. The lead silently transitions to `inspection_email_approval`. Trigger-level `audit_logs` capture the column change but the user-facing timeline shows no event. Worth a BUG-029b row.

4. **`useInspectionLeads.ts` already has a journal-style comment** at the file head (`// NOTE: Client-side sorting by urgency priority`) that pre-dates the drop. The whole `urgencyPriority` map plus FIFO logic could go in BUG-027's fix.

5. **The Wave 6.1 nits in `docs/TODO.md` (W6.1-A through W6.1-H)** are unrelated to these findings. Recommend grouping the new BUG-027..BUG-034 entries as a separate Wave 6.1 cleanup PR section since they all stem from the Phase 5 drop campaign.

6. **GitNexus FTS warnings** (read-only DB) appeared as PreToolUse hook context throughout this audit but did not block any query. The index analyze step (4.9s) succeeded; only the FTS subindex update is read-only. Non-blocking for this audit.

7. **MEMORY.md / CLAUDE.md not stale** relative to this work — the project memory reflects Wave 6 deploy state accurately. No corrections needed.

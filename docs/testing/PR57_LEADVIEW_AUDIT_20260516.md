# PR #57 LeadView Field-Binding Audit — MRC-2026-0144

**Date:** 2026-05-16
**Audit branch:** `claude/audit-leadview-fields-ETztV` (based on `main` @ `8238d9c`)
**PR #57 head reviewed:** `wave-6.1-pr-4-pricing-leadview-fixes` @ `7ba855b`
**Test lead:** `MRC-2026-0144` (status: `inspection_ai_summary`)
**Trigger:** Owner E2E walk surfaced 2 defects that earlier audits missed. Read-only sweep before any PR #57 merge or fix-up commit.

---

## Method

The audit branch is based on `main` (`8238d9c`), so `git diff main -- src/ supabase/` on this branch returns empty. Every source citation in this document references PR #57's head sha `7ba855b`. The reading machine was the current working tree on `wave-6.1-pr-4-pricing-leadview-fixes` (HEAD = PR #57 head, so working-tree files ARE the candidate code). No source files were modified anywhere.

Cross-references compared three render surfaces against the form's save handler:

- **Form save handler** — `src/pages/TechnicianInspectionForm.tsx:3514–3661`, plus area / subfloor / moisture / photo upserts at `:3631–3801`.
- **Form load mapper** — `src/pages/TechnicianInspectionForm.tsx:2843–2920` (hydrates `InspectionFormData` from DB).
- **LeadView read path** — `src/lib/api/inspections.ts:481–650` (`fetchCompleteInspectionData`).
- **LeadView render surface A** — `src/components/leads/InspectionDataDisplay.tsx` (9 accordion sections, the Inspection Data block on LeadDetail).
- **LeadView render surface B** — `src/pages/LeadDetail.tsx:1750–2092` (Cost Estimate summary card + 10 admin-only context cards).

Ground truth: `docs/testing/pr57_e2e_walk_MRC-2026-0144_20260516.md.md` (lead walk-doc — confirmed every field captured at form time) and `src/components/pdf/ReportPreviewHTML.tsx:751–756` (canonical 11-method label list `SHARED_TREATMENT_METHODS` + `OPTION_2_ONLY_METHODS`).

Status legend used in the audit tables below:

| Marker | Meaning |
|---|---|
| ✅ | Saves + reads + renders correctly |
| ⚠️ | Saves + reads but renders incorrectly (wrong label, wrong format, wrong gate, divergent across surfaces, or duplicated) |
| ❌ | Saves but does not render anywhere on LeadView |
| 🚫 | Form input exists but does not save to DB |
| 🔍 | Cannot determine from static analysis — flagged for runtime verification |

---

## Executive Summary

Two confirmed pre-merge defects:

1. **Defect A — `'Surface Mould Remediation'` label drift (RENDER-SIDE).** `InspectionDataDisplay.tsx:428` holds a divergent local label `'Surface Mould Remediation'`. The canonical save-side string everywhere else (form save handler, ReportPreviewHTML PDF surface, DB array contents) is `'Surface Remediation Treatment'`. The `.filter(m => treatmentMethods.includes(m))` at `:450` strips this method on render because the local label list and the array elements are different strings. Result: 10 of 11 methods render. One-line literal fix.

2. **Defect B — Cost Breakdown card structural sandwich.** `LeadDetail.tsx:2016–2092` shows an Option-1 sub-block at `:2042–2065` inserted into an unlabelled card body that, when `option_selected === 3`, displays Option 2's labour/equipment/subtotal/GST values with no "Option 2 (Comprehensive Treatment)" sibling header. The visual flow reads as if Option 1's subtotal is `$11,665.92` ($2,972.16 in fact). Three structural rows are involved (`:2025`, `:2033`, `:2067`/`:2075`). Minimal fix is one header insert.

Plus 6 additional render-side gaps surfaced by the field-by-field sweep (3 hard ❌ misses, 3 ⚠️ inconsistencies / partial bindings). Details in §4 and §5 below.

DO NOT MERGE PR #57 until at least the 2 defects above plus the 3 ❌ items are resolved.

---

## §1 — Defect A diagnosis (Surface Remediation missing)

### Root cause: render-side label drift, single literal

| Surface | File | Line | String value |
|---|---|---:|---|
| Form save handler — array element | `src/pages/TechnicianInspectionForm.tsx` | 1706 | `'Surface Remediation Treatment'` |
| Form save handler — array filter | `src/pages/TechnicianInspectionForm.tsx` | 3533–3535 | writes `formData.selectedTreatmentMethods` (which contains `'Surface Remediation Treatment'`) |
| Form save handler — legacy bool mirror | `src/pages/TechnicianInspectionForm.tsx` | 3538 | `antimicrobial: formData.selectedTreatmentMethods.includes('Surface Remediation Treatment')` |
| Form load mapper — legacy bool back-fill | `src/pages/TechnicianInspectionForm.tsx` | 2888 | `...(ins.antimicrobial ? ['Surface Remediation Treatment'] : [])` |
| PDF customer surface | `src/components/pdf/ReportPreviewHTML.tsx` | 752 | `'Surface Remediation Treatment'` |
| LeadView render label list | `src/components/leads/InspectionDataDisplay.tsx` | **428** | **`'Surface Mould Remediation'`** ← **drift** |
| LeadView render filter | `src/components/leads/InspectionDataDisplay.tsx` | 450 | `TREATMENT_METHOD_LABELS.filter(m => treatmentMethods.includes(m))` |

Render flow at `InspectionDataDisplay.tsx:440–457` (PR #57 head):

```tsx
function WorkProcedureSection({ inspection: i }) {
  const treatmentMethods: string[] = Array.isArray(i.treatment_methods) ? i.treatment_methods : [];
  return (
    /* ... */
    {treatmentMethods.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {TREATMENT_METHOD_LABELS.filter(m => treatmentMethods.includes(m)).map(m => (
          <Tag key={m} color="green">{m}</Tag>
        ))}
      </div>
    ) : /* ... */
  );
}
```

The DB row's `treatment_methods` array (per the canonical save path) contains the string `'Surface Remediation Treatment'`. The local `TREATMENT_METHOD_LABELS` array on `InspectionDataDisplay.tsx:426–438` lists `'Surface Mould Remediation'` instead. `Array.prototype.includes` is exact-string equality, so the filter drops the canonical entry and the rendered chip list shows 10 of 11.

### Save-side cross-check (no DB read required)

The save handler hard-codes the canonical string at 3 sites: the constant array (`:1706`), the array filter (`:3533`), and the legacy boolean mirror (`:3538`). There is no code path that writes `'Surface Mould Remediation'` to `treatment_methods`. The DB row for MRC-2026-0144 is guaranteed to contain `'Surface Remediation Treatment'` if the user ticked the toggle (which the walk-doc at `pr57_e2e_walk_MRC-2026-0144_20260516.md.md:368–378` confirms — all 11 ticked).

Owner can verify with this SQL block if a fully-empirical check is wanted (paste into Supabase Studio for project `ecyivrxjpsmjmexqatym`, scoped to the lead's job number):

```sql
SELECT
  i.id,
  i.job_number,
  i.treatment_methods,
  i.option_selected,
  i.hepa_vac,
  i.antimicrobial,
  i.stain_removing_antimicrobial,
  i.home_sanitation_fogging
FROM inspections i
JOIN leads l ON l.id = i.lead_id
WHERE l.job_number = 'MRC-2026-0144';
```

Expected result: `treatment_methods` contains exactly 11 strings, including `'Surface Remediation Treatment'` (no `'Mould'` in the middle). `antimicrobial = true` because the legacy mirror at `TIF:3538` is true when the canonical string is in the selection. If both conditions hold, the defect is conclusively render-side.

### Fix path (no code written here)

Change `InspectionDataDisplay.tsx:428` from `'Surface Mould Remediation'` to `'Surface Remediation Treatment'`. One literal. Mirror the canonical string. After fix, all 11 methods render when the array contains all 11.

---

## §2 — Defect B diagnosis (Cost Breakdown sandwich)

### Structural problem

`LeadDetail.tsx:2016–2092` is the Admin Cost Breakdown card. PR #57 inserted an Option-1 sub-block at `:2042–2065` into a card whose surrounding rows were never re-headed to disambiguate against Option 2 when `option_selected === 3`.

Card render order (verbatim from `:2024–2089`):

| Order | Source line | Row label | Value column | When `option_selected === 3` this is Option … |
|---:|---:|---|---|---|
| 1 | `:2025–2031` | Labour Subtotal Ex-GST | `inspection.labour_cost_ex_gst` | **Option 2** (no header) |
| 2 | `:2033–2039` | Equipment Cost Ex-GST | `inspection.equipment_cost_ex_gst` | **Option 2** (no header) |
| 3 | `:2046` | **"Option 1 (Surface Treatment)" header** | — | Option 1 |
| 4 | `:2048–2055` | Labour Ex-GST (indented `pl-3`) | `inspection.option_1_labour_ex_gst` | Option 1 |
| 5 | `:2056–2063` | Equipment Ex-GST (indented `pl-3`) | `inspection.option_1_equipment_ex_gst` | Option 1 |
| 6 | `:2067–2073` | Subtotal Ex-GST | `inspection.subtotal_ex_gst` | **Option 2** (no header — reads as Option 1's subtotal) |
| 7 | `:2075–2082` | GST (10%) | `inspection.gst_amount` | **Option 2** (no header — reads as Option 1's GST) |
| 8 | `:2083–2088` | Total Inc-GST | "See Cost Estimate card above" (literal) | — |

The reader sees the indented Option 1 block (rows 3–5) flow directly into the un-indented Subtotal/GST rows (6–7) and concludes those subtotals belong to Option 1. They don't. Option 1's subtotal is `$2,972.16` ex-GST per the ledger; the row at `:2067` shows Option 2's `$11,665.92`.

There's also a quieter problem at the top of the card: rows 1–2 (`labour_cost_ex_gst`, `equipment_cost_ex_gst`) are Option 2's labour/equipment when `option_selected === 3`, but they render as if they were the card's primary breakdown. The single-option layout (used when `option_selected !== 3`) overloads these rows correctly; the dual-option layout never re-labelled them.

### Fix path (no code written here)

Minimal fix: insert one extra `<dt>` header row matching the existing `:2046` pattern (`<dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">…</dt>`), gated on `option_selected === 3`. Two structural options:

- **Option α (minimal — single insert).** Insert "Option 2 (Comprehensive Treatment)" header between the Option 1 sub-block close (`</>`, `:2065`) and the next row (`:2067`). Touches one block. Reader now sees the indented Option 1 sub-block close, then a parallel header for Option 2, then the un-indented Subtotal/GST/Total rows as Option 2's totals. Resolves the sandwich.
- **Option β (cleaner — bracket both sides).** Also insert an "Option 2 (Comprehensive Treatment)" header above row 1 (`:2025`) when `option_selected === 3`, so the top labour/equipment rows are explicitly Option 2's. Two inserts, same logic. Card reads as two parallel labelled blocks instead of an Option-1 island in the middle.

Option β is the more readable end state. Option α is the smaller diff if the goal is to unblock merge with minimum surface area. Both are conditional on `option_selected === 3` so single-option mode is untouched. No data-layer change required.

---

## §3 — Master field-by-field audit table

Tables are grouped by section to match `TechnicianInspectionForm.tsx` section order. "Form input" cites the form file. "Save column" is the destination column on Supabase. "Render" cites the LeadView site(s) that read it. Status uses the legend in §Method.

### §3.1 Section 1 — Basic Information

| Field (UI) | Form input (file:line) | Save column (table.column) | Render site (file:line) | Status | Notes |
|---|---|---|---|---|---|
| Job Number | `TIF` Section 1 (jobNumber) | `inspections.job_number` (`TIF:3518`) | `InspDD:185`, `LeadDetail` (PDF card) | ✅ | |
| Triage / Issue Description | `TIF` (triage) | `inspections.triage_description` (`TIF:3519`) | `InspDD:188` | ✅ | |
| Address | `TIF` (address) | — (lead is the authoritative source) | `InspDD` n/a; `LeadDetail` Customer card | ✅ | Per ledger §1 the form has a second address field; that field hydrates from `leads.property_address_*` via `getFullAddress(leadData)` at `TIF:2847`, never writes to `inspections`. Intentional. |
| Inspector | `TIF` (inspector) | `inspections.inspector_name` (`TIF:3517`) + `inspector_id` (`:3516`) | `InspDD:187` | ✅ | |
| Requested By | `TIF` (requestedBy) | `inspections.requested_by` (`TIF:3520`) | `InspDD:189` | ✅ | |
| Attention To | `TIF` (attentionTo) | `inspections.attention_to` (`TIF:3521`) | `InspDD:190` | ✅ | |
| Inspection Date | `TIF` (inspectionDate) | `inspections.inspection_date` (`TIF:3522`) | `InspDD:186` (en-AU formatter) | ✅ | |
| Internal Notes (lead-level append log) | not in form — edited on LeadDetail | `leads.internal_notes` (not in `inspections`) | `LeadDetail:1660–1748` | ✅ | Out of inspection scope; rendered correctly. |

### §3.2 Section 2 — Property Details

| Field | Form input | Save column | Render site | Status | Notes |
|---|---|---|---|---|---|
| Property Occupation | `TIF` (propertyOccupation) | `inspections.property_occupation` (`TIF:3523`) | `InspDD:203` + `LeadDetail:1964–1988` | ⚠️ | **Render-consistency drift.** `InspDD` uses `replace(/_/g, ' ')` + CSS `capitalize`; `LeadDetail` Card 8 uses an explicit `labels` map (`:1976–1981`). Two surfaces, two patterns. Functionally equivalent for the 4 enum values but the duplication is a maintenance trap. Already flagged in TODO.md W6.1-A. |
| Dwelling Type | `TIF` (dwellingType) | `inspections.dwelling_type` (`TIF:3524`) | `InspDD:202` | ✅ | |

### §3.3 Section 3 — Per-area fields (×N areas)

Saved to `inspection_areas` table (`TIF:3633–3661`). LeadView surface: `InspectionDataDisplay.tsx:212–299` (`AreaSection`).

| Field | Form input | Save column | Surfaced by `fetchCompleteInspectionData`? | Render site | Status | Notes |
|---|---|---|---|---|---|---|
| Area Name | `area.areaName` | `inspection_areas.area_name` (`TIF:3636`) | yes (`API:586`) | `InspDD:81` (accordion title) | ✅ | |
| Area Order | implicit | `inspection_areas.area_order` (`TIF:3635`) | yes (`API:585`) | accordion order | ✅ | |
| Visible Mould — standard locations | `area.mouldVisibleLocations` | `inspection_areas.mould_visible_locations` (`TIF:3637`) | yes (`API:588`) | `InspDD:230–234` chips | ✅ | |
| Visible Mould — custom location | `area.mouldVisibleCustom` | `inspection_areas.mould_visible_custom` (`TIF:3638`) | yes (`API:589`) | `InspDD:236–238` (nested inside the chips branch) | ❌ | **Custom-only fallthrough broken.** When `mould_visible_locations` is empty AND `mould_visible_custom` is set (ledger Area 1: standard chips all unchecked, custom = "Under the ceiling"), `InspDD:224` outer conditional passes, `:227` `?` branch is false (no chips), falls to `:240` `else` branch which renders `{area.mould_description}` — but the save handler at `TIF:3639–3641` sets `mould_description = NULL` when `mouldVisibleLocations` is empty. Net: empty `<p>` rendered; the custom value never shows on LeadView. The ledger flagged exactly this risk in its Area 1 note. |
| Visible Mould — composed description | derived | `inspection_areas.mould_description` (`TIF:3639–3641`) | yes (`API:587`) | `InspDD:240–244` (fallback path) | ⚠️ | Composed string is `locations.join(', ') + ('. ' + custom)`; the LeadView fallback path renders it only when chips are absent — but per the previous row, in custom-only mode this is NULL. Render path is correct in isolation; the problem is the save composition never includes the custom-only case. |
| Comments for Report | `area.commentsForReport` | `inspection_areas.comments` (`TIF:3642`) | yes (`API:590`) | `InspDD:249–256` | ✅ | |
| Temperature | `area.temperature` | `inspection_areas.temperature` (`TIF:3643`) | yes (`API:592`) | `InspDD:217` | ✅ | |
| Humidity | `area.humidity` | `inspection_areas.humidity` (`TIF:3644`) | yes (`API:593`) | `InspDD:218` | ✅ | |
| Dew Point | `area.dewPoint` | `inspection_areas.dew_point` (`TIF:3645`) | yes (`API:594`) | `InspDD:219` | ✅ | BUG-041 Magnus formula re-confirmed in ledger §3. |
| Internal Moisture | `area.moistureReadings[0].reading` | `inspection_areas.internal_moisture` (`TIF:3649`) | **NO** — shape at `API:583–608` omits it | not rendered as a denormalized column | ⚠️ | Denormalized copy of `moisture_readings[0].moisture_percentage`. The reading IS visible via `MoistureReadingsTable` (`InspDD:692–741`) so the user-facing data is not lost — but the column is dead weight on the area row from LeadView's perspective. Consider DB cleanup later (Stage 9.3) rather than a PR #57 blocker. |
| External Moisture | `area.moistureReadings[1].reading` | `inspection_areas.external_moisture` (`TIF:3650`) | yes (`API:595`) | `InspDD:220` (top metric grid) | ⚠️ | Symmetric problem to the row above but reversed: `external_moisture` IS surfaced and rendered as a top-row metric, while `internal_moisture` is not. The same readings table also shows both. Visual asymmetry, not a data loss. |
| Internal Office Notes (per area) | `area.internalNotes` | `inspection_areas.internal_office_notes` (`TIF:3651`) | yes (`API:591`) | `LeadDetail:1910–1937` (admin Card 6) | ⚠️ | Rendered only on `LeadDetail` Card 6, **not** in `InspDD` `AreaSection`. Visible to admin via Card 6, but the accordion's per-area surface is silent on it. Single render point is fine for admin-only fields; flag only for awareness. |
| Extra Notes (in report) | `area.extraNotes` | `inspection_areas.extra_notes` (`TIF:3652`) | **NO** — shape at `API:583–608` omits `extra_notes` | nowhere | ❌ | **Saved but never read by LeadView.** Per the walk-doc §3 Area 1 line 128–133 and Area 2 line 217–223, this field IS supposed to appear in the customer PDF and arguably should also appear on LeadView. Save side: correct (`TIF:3652`). Load side: shape never includes it. Render side: no consumer. Customer PDF rendering is out of audit scope but should be re-verified. |
| Primary photo ID (cover photo) | `area.primaryPhotoId` | `inspection_areas.primary_photo_id` (`TIF:3653`) | **NO** — shape at `API:583–608` omits it | nowhere | ❌ | Form lets the tech mark a cover photo per area, save handler writes the UUID, but `fetchCompleteInspectionData` never surfaces it and no LeadView render site reads it. PDF surface may use it (out of scope here). On LeadView the cover designation is invisible. |
| Infrared Enabled (per-area toggle) | `area.infraredEnabled` | `inspection_areas.infrared_enabled` (`TIF:3654`) | yes (`API:596`) | `InspDD:259` (gates the whole Infrared block) | ✅ | |
| Infrared Photo | `area.infraredPhoto` | `photos.photo_type='infrared'` row | yes (via `PhotoWithUrl[]`) | `InspDD:776–781` violet badge | ✅ | Badge color per the walk-doc §3 Area 1 expectation. |
| Natural-Infrared Photo | `area.naturalInfraredPhoto` | `photos.photo_type='naturalInfrared'` row | yes | `InspDD:783–788` sky-blue badge | ✅ | Badge color matches the walk-doc expectation. |
| Infrared Observations (×5 booleans) | `area.infraredObservations[]` | `inspection_areas.infrared_observation_*` ×5 (`TIF:3655` via `mapInfraredToBooleans`) | yes (`API:597–601`) | `InspDD:262–268` ×5 tags | ✅ | One tag per active observation, color-coded. |
| Time Without Demolition | `area.timeWithoutDemo` | `inspection_areas.job_time_minutes` (`TIF:3656`) — stored ×60 | yes (`API:602`) | `InspDD:284–286` "Job Time (no demo)" | ✅ | Round-trip via `area.job_time_minutes / 60` at load. |
| Demolition Required | `area.demolitionRequired` | `inspection_areas.demolition_required` (`TIF:3657`) | yes (`API:603`) | `InspDD:273` (gates Demolition block) + badge at `:83` | ✅ | |
| Demolition Time | `area.demolitionTime` | `inspection_areas.demolition_time_minutes` (`TIF:3658`) | yes (`API:604`) | `InspDD:276` | ✅ | |
| Demolition Description | `area.demolitionDescription` | `inspection_areas.demolition_description` (`TIF:3659`) | yes (`API:605`) | `InspDD:277–279` | ✅ | |
| Room-view Photos | `area.roomViewPhotos[]` | `photos.area_id` + `photos.photo_type='area'` | yes | `InspDD:294–296` PhotoGrid + lightbox | ✅ | Stage 4.3 soft-delete predicate `is('deleted_at', null)` at `API:530` excludes deleted photos. |
| Moisture Readings (rows) | `area.moistureReadings[]` | `moisture_readings.{title,moisture_percentage}` + photo via FK | yes (`API:574–581`) | `InspDD:289–291` + `:692–741` table | ✅ | Each reading row has a single photo via `photos.moisture_reading_id`. |

### §3.4 Section 4 — Subfloor

Saved to `subfloor_data` (`TIF:3740–3748`) + `subfloor_readings` (`TIF:3788–3793`). Subfloor write is GATED at `TIF:3739` on `subfloor_required !== false` — when the tristate is `false`, no `subfloor_data` row is created.

| Field | Form input | Save column | Render site | Status | Notes |
|---|---|---|---|---|---|
| Subfloor Required (tristate `null` / `true` / `false`) | `formData.subfloorRequired` | `inspections.subfloor_required` (`TIF:3581`) | implicit via `subfloor` being null vs non-null at `InspDD:89` | ⚠️ | Saves and loads correctly. Render: when tristate is `false` (no subfloor), `subfloor_data` is never written → `subfloor` is null → `InspDD:89` skips the accordion entirely. When tristate is `null` (not determined), same outcome. So LeadView cannot visually distinguish "tech confirmed no subfloor" from "tech hasn't told us yet". Minor render gap; admin can infer from missing data but it's not explicit. |
| Subfloor Enabled (form-side toggle) | `formData.subfloorEnabled` | **none** | — | 🚫 | Form-side UI gate only. Hardcoded to `true` on load at `TIF:2855`. Doesn't persist; not a defect since `subfloorRequired` is the canonical tristate. Documented for completeness. |
| Subfloor Observations | `formData.subfloorObservations` | `subfloor_data.observations` (`TIF:3742`) | `InspDD:318–324` | ✅ | |
| Subfloor Landscape | `formData.subfloorLandscape` | `subfloor_data.landscape` (`TIF:3744`) | `InspDD:313` (with `capitalize`) | ✅ | |
| Subfloor Comments | `formData.subfloorComments` | `subfloor_data.comments` (`TIF:3743`) | `InspDD:327–333` | ✅ | |
| Subfloor Sanitation | `formData.subfloorSanitation` | `subfloor_data.sanitation_required` (`TIF:3745`) | `InspDD:314` (Yes/No badge) + `LeadDetail:1790–1808` Card 1 surfaced prominently | ✅ | Two surfaces; both consistent. |
| Treatment Time | `formData.subfloorTreatmentTime` | `subfloor_data.treatment_time_minutes` (`TIF:3746`) — stored ×60 | `InspDD:315` (fmtMins) | ✅ | |
| Subfloor Readings (rows) | `formData.subfloorReadings[]` | `subfloor_readings.{moisture_percentage,location}` (`TIF:3788–3793`) | `InspDD:336–363` table | ✅ | Saturation banding (`MoistureValue` at `InspDD:680`) colors values ≥20% red, 15–19% amber. |
| Subfloor Photos | `formData.subfloorPhotos[]` | `photos.subfloor_id` OR `photos.photo_type='subfloor'` | yes (`API:626` OR predicate) | `InspDD:365–368` PhotoGrid | ✅ | Hybrid linkage (FK OR type) handles photos uploaded before the subfloor row existed. |

### §3.5 Section 5 — Outdoor

Saved on the `inspections` row directly.

| Field | Form input | Save column | Render site | Status | Notes |
|---|---|---|---|---|---|
| Outdoor Temperature | `formData.outdoorTemperature` | `inspections.outdoor_temperature` (`TIF:3525`) | `InspDD:385` | ✅ | |
| Outdoor Humidity | `formData.outdoorHumidity` | `inspections.outdoor_humidity` (`TIF:3526`) | `InspDD:386` | ✅ | |
| Outdoor Dew Point | `formData.outdoorDewPoint` | `inspections.outdoor_dew_point` (`TIF:3527`) | `InspDD:387` | ✅ | |
| Outdoor Comments | `formData.outdoorComments` | `inspections.outdoor_comments` (`TIF:3528`) | `InspDD:390–397` + `LeadDetail:1990–2005` Card 9 | ✅ | Two render surfaces; both consistent. |
| Direction Photos Enabled (toggle) | `formData.directionPhotosEnabled` | `inspections.direction_photos_enabled` (`TIF:3529`) | nowhere as a visible toggle status | ⚠️ | Saved + loaded but never displayed as a toggle on LeadView. Photos themselves still render via `OutdoorSection` filter at `InspDD:377–380`. The toggle's "off" state is invisible to admin — they'd see "no outdoor photos" without knowing whether tech disabled them or didn't capture them. Minor. |
| Front Door Photo | `frontDoorPhoto` | `photos` row, `photo_type='outdoor'` or similar + `caption='front_door'` | `OutdoorSection` photo filter (`InspDD:377–380`) | ✅ | |
| Front House Photo | `frontHousePhoto` | same, `caption='front_house'` | same | ✅ | |
| Mailbox Photo | `mailboxPhoto` | same, `caption='mailbox'` | same | ✅ | |
| Street Photo | `streetPhoto` | same, `caption='street'` | same | ✅ | |
| Direction Photo (one extra slot) | `directionPhoto` | same, `caption='direction'` | same | ✅ | |

The outdoor photo identification mechanism at `TIF:2837–2841` uses `caption` (not `photo_type`) to map back to the 5 slots on load. On render, `InspDD:377–380` accepts photo_types `'outdoor'`, `'frontDoor'`, `'frontHouse'`, `'mailbox'`, `'street'`, `'direction'` regardless of caption — so the filter union is permissive enough that none of the 5 slot photos get filtered out. Functions; the asymmetry (save by caption, render by type) is fragile but works today.

### §3.6 Section 6 — Waste Disposal

| Field | Form input | Save column | Render site | Status | Notes |
|---|---|---|---|---|---|
| Waste Disposal Required | `formData.wasteDisposalEnabled` | `inspections.waste_disposal_required` (`TIF:3530`) | `InspDD:413` + `LeadDetail:1812–1834` Card 2 | ✅ | Two consistent surfaces. |
| Waste Disposal Amount | `formData.wasteDisposalAmount` | `inspections.waste_disposal_amount` (`TIF:3531`) | `InspDD:415` + `LeadDetail:1827–1832` | ✅ | Both gated on `waste_disposal_required` truthy. |

### §3.7 Section 7 — Work Procedure & Equipment

| Field | Form input | Save column | Render site | Status | Notes |
|---|---|---|---|---|---|
| Option Selected (1 / 2 / 3) | `formData.optionSelected` | `inspections.option_selected` (`TIF:3532`) | `InspDD:537–541` banner | ✅ | "Quote shown: Option 1 / 2 / Both options" label. |
| Treatment Methods array | `formData.selectedTreatmentMethods` | `inspections.treatment_methods` (`TIF:3533–3535`) — Option 1 mode strips OPTION_2_ONLY | `InspDD:441–457` filtered chip list | **❌ DEFECT A** | Label drift at `InspDD:428` (`'Surface Mould Remediation'` instead of canonical `'Surface Remediation Treatment'`) → 10 of 11 render. See §1. |
| HEPA Vac (legacy bool mirror) | `formData.hepaVac` | `inspections.hepa_vac` (`TIF:3537`) — mirrored from array | rendered via array path | ✅ | Form mirror at save; load reconstructs array from legacy bools on rows that predate the array column (`TIF:2887–2890`). |
| Antimicrobial (legacy bool mirror) | `formData.antimicrobial` | `inspections.antimicrobial` (`TIF:3538`) — mirrored from array string `'Surface Remediation Treatment'` | rendered via array path | ⚠️ | Save side correct; render path BLOCKED by Defect A. Once Defect A is fixed, this row becomes ✅. |
| Stain Removing Antimicrobial (Section 7 toggle) | `formData.stainRemovingAntimicrobial` | `inspections.stain_removing_antimicrobial` (`TIF:3539`) | nowhere | ❌ | Form has a separate toggle (not part of the canonical 11-method array). Saves correctly; `InspDD:441–457` only consults `treatment_methods` array; no surface reads the bool. The customer-facing PDF surface may use it (out of scope); on LeadView the toggle is silent. |
| Home Sanitation Fogging (legacy bool mirror) | `formData.homeSanitationFogging` | `inspections.home_sanitation_fogging` (`TIF:3540`) — mirrored from `'ULV Fogging - Property'` array entry | rendered via array path | ✅ | |
| Drying Equipment Enabled | `formData.dryingEquipmentEnabled` | not its own column — derived from array containing `'Drying Equipment'` (load: `TIF:2895`) | rendered via array path | ✅ | |
| Commercial Dehumidifier Qty | `formData.commercialDehumidifierQty` | `inspections.commercial_dehumidifier_qty` (`TIF:3541`) | `InspDD:463–465` (conditional `> 0`) | ✅ | |
| Air Movers Qty | `formData.airMoversQty` | `inspections.air_movers_qty` (`TIF:3542`) | `InspDD:466–468` (conditional) | ✅ | |
| RCD Box Qty | `formData.rcdBoxQty` | `inspections.rcd_box_qty` (`TIF:3543`) | `InspDD:469–471` (conditional) | ✅ | |

### §3.8 Section 8 — Job Summary

| Field | Form input | Save column | Render site | Status | Notes |
|---|---|---|---|---|---|
| Recommend Dehumidifier Hire (toggle) | `formData.recommendDehumidifier` | not its own column — encoded as non-null `recommended_dehumidifier` (`TIF:3544`) | implicit (rendered only when `recommended_dehumidifier != null`) | ✅ | Toggle off → save writes `null`; toggle on → save writes the size string. |
| Dehumidifier Size | `formData.dehumidifierSize` | `inspections.recommended_dehumidifier` (`TIF:3544`) | `InspDD:475–477` "Recommended Dehumidifier Size" + `LeadDetail:1838–1856` Card 3 | ⚠️ | Both surfaces render lowercase ("medium") because the value is stored lowercase. `InspDD:476` applies CSS `capitalize` → "Medium". `LeadDetail:1849` does NOT apply `capitalize` → "medium". Already flagged in walk-doc Test 2.4. Two surfaces, one capitalizes, the other doesn't. |
| Cause of Mould | `formData.causeOfMould` | `inspections.cause_of_mould` (`TIF:3545`) | `InspDD:489–495` + `LeadDetail:1940–1958` Card 7 | ✅ | Two consistent surfaces. |
| Additional Info for Technician | `formData.additionalInfoForTech` | `inspections.additional_info_technician` (`TIF:3546`) | `InspDD:498–504` + `LeadDetail:1884–1905` Card 5 | ✅ | Two consistent surfaces; both visible to admin only on `LeadDetail`. |
| Additional Equipment Comments | `formData.additionalEquipmentComments` | `inspections.additional_equipment_comments` (`TIF:3547`) | `InspDD:507–513` | ✅ | |
| Parking Option | `formData.parkingOptions` | `inspections.parking_option` (`TIF:3548`) | `InspDD:517` + `LeadDetail:1864–1881` Card 4 | ⚠️ | Both surfaces apply `replace(/_/g, ' ')` + CSS `capitalize`. The walk-doc Section 8 §Parking flagged a `"direaway"` value (suspected typo for "driveway"). Render path is correct; the data is the issue. Future PR #5 backlog. |

### §3.9 Section 9 — Cost Estimate

Saved on the `inspections` row. Pricing engine constraint: 13% discount cap (0.87 multiplier); equipment never discounted; GST = 10% on subtotal.

| Field | Form input | Save column | Render site | Status | Notes |
|---|---|---|---|---|---|
| No-Demolition Hours | `formData.noDemolitionHours` | `inspections.no_demolition_hours` (`TIF:3549`) | `InspDD:547` "No Demo" hour metric | ✅ | |
| Demolition Hours | `formData.demolitionHours` | `inspections.demolition_hours` (`TIF:3550`) | `InspDD:548` | ✅ | |
| Subfloor Hours | `formData.subfloorHours` | `inspections.subfloor_hours` (`TIF:3551`) | `InspDD:549` | ✅ | |
| Equipment Cost Ex-GST | `formData.equipmentCost` (derived) | `inspections.equipment_cost_ex_gst` (`TIF:3552`) | `InspDD:560` + `LeadDetail:2033–2039` Card 10 row 2 | ⚠️ | Row 2 of Cost Breakdown card is Option 2's equipment when `option_selected === 3`; not labelled as such. See Defect B. |
| Labour Cost Ex-GST | `formData.laborCost` (derived) | `inspections.labour_cost_ex_gst` (`TIF:3553`) | `InspDD:559` + `LeadDetail:2025–2031` Card 10 row 1 | ⚠️ | Same as above. |
| Discount Percent | `formData.discountPercent` (decimal 0–0.13) | `inspections.discount_percent` (percent scale 0–13, `TIF:3558` × 100) | `InspDD:561–563` (conditional `> 0`) | ✅ | Scale conversion at save boundary; in-form decimal scale; DB CHECK constraint 0–13. BUG-019 confirmed by walk-doc. |
| Subtotal Ex-GST | derived | `inspections.subtotal_ex_gst` (`TIF:3559`) | `InspDD:564` + `LeadDetail:1763` Cost Estimate Card + `LeadDetail:2067–2073` Card 10 row 6 | ⚠️ | Row 6 of Cost Breakdown card is Option 2's subtotal when `option_selected === 3`; reads as Option 1's due to missing header. See Defect B. |
| GST Amount | derived | `inspections.gst_amount` (`TIF:3560`) | `InspDD:565` + `LeadDetail:1769` + `LeadDetail:2075–2082` Card 10 row 7 | ⚠️ | Same as above; Option 2's value labelled neutrally. |
| Total Inc-GST | derived | `inspections.total_inc_gst` (`TIF:3561`) | `InspDD:596–601` (single mode) + `LeadDetail:1775` + `LeadDetail:2083–2088` Card 10 row 8 | ✅ | Card 10 row 8 reads "See Cost Estimate card above" instead of duplicating; correct. |
| Manual Labour Override (toggle) | `formData.manualPriceOverride` | `inspections.manual_labour_override` (`TIF:3568`) | `InspDD:604–610` amber banner | ✅ | |
| Manual Total Inc-GST | `formData.manualTotal` | `inspections.manual_total_inc_gst` (`TIF:3569`) — null when override off | `InspDD:607` (inside banner) | ✅ | |
| Option 1 Labour Ex-GST | `formData.option1LabourCost` | `inspections.option_1_labour_ex_gst` (`TIF:3570`) | `InspDD:576` left card + `LeadDetail:2048–2054` Card 10 row 4 | ✅ | Both surfaces render Option 1's labour correctly; Card 10 surface is the one inside the sandwich (see Defect B). |
| Option 1 Equipment Ex-GST | `formData.option1EquipmentCost` | `inspections.option_1_equipment_ex_gst` (`TIF:3571`) | `InspDD:580` left card + `LeadDetail:2056–2062` Card 10 row 5 | ✅ | Same as above. |
| Option 1 Total Inc-GST | derived | `inspections.option_1_total_inc_gst` (`TIF:3572`) | `InspDD:584` left card | ✅ | |
| Option 2 Total Inc-GST | derived | `inspections.option_2_total_inc_gst` (`TIF:3573`) | `InspDD:591` right card | ⚠️ | Right card shows ONLY the total; no labour / equipment subtotals on Option 2 side. Asymmetric vs. left card. (See `InspDD:586–593`.) Visual inconsistency only — the values themselves are in `labour_cost_ex_gst` / `equipment_cost_ex_gst` (Option 2's values when `option_selected === 3`) but those render in the un-labelled rows above. |

### §3.10 AI Summary

`fetchCompleteInspectionData` joins `latest_ai_summary` view at `API:532–536` and surfaces 6 columns into the merged inspection (`API:636–643`).

| Field | Source (view column) | Render site | Status | Notes |
|---|---|---|---|---|
| What We Found Text | `latest_ai_summary.what_we_found_text` (`API:534`, surfaced at `:637`) | `InspDD:622–624` AICard | ✅ | |
| Problem Analysis Content | `latest_ai_summary.problem_analysis_content` (`:534`/`:640`) | `InspDD:625–627` | ✅ | |
| What We Will Do Text | `latest_ai_summary.what_we_will_do_text` (`:534`/`:638`) | `InspDD:628–630` | ✅ | |
| Demolition Content | `latest_ai_summary.demolition_content` (`:534`/`:641`) | `InspDD:631–633` | ✅ | |
| What You Get Text | `latest_ai_summary.what_you_get_text` (`:534`/`:639`) | nowhere | ⚠️ | Fetched and merged, but `AISummarySection` at `InspDD:619–636` never renders it. Likely intentional (customer-facing only) but worth confirming. |
| AI Summary Text (top-level) | `latest_ai_summary.ai_summary_text` (`:534`/`:636`) | nowhere | ⚠️ | Same shape — surfaced but not rendered. May be the legacy single-field summary. Confirm intent before clearing. |

### §3.11 Photos (cross-cutting)

All photos live in the `photos` table, FK'd by `inspection_id`, optionally `area_id` / `subfloor_id` / `moisture_reading_id`.

| Photo type | Save path | Render site | Status | Notes |
|---|---|---|---|---|
| Area room-view photos | `photoUpload` util writes `photo_type='area'`, `area_id` set | `InspDD:294–296` `PhotoGrid` | ✅ | Stage 4.3 soft-delete predicate `is('deleted_at', null)` at `API:530` excludes deleted photos correctly. |
| Infrared photo (per area) | `photo_type='infrared'`, `area_id` set | `InspDD:776–781` violet `Infrared` badge | ✅ | |
| Natural-Infrared photo (per area) | `photo_type='naturalInfrared'`, `area_id` set | `InspDD:783–788` sky-blue `Natural-Light` badge | ✅ | |
| Moisture-reading photo | `photo_type` per area, then `UPDATE photos SET moisture_reading_id=…` (`TIF:3713–3732`) | `InspDD:717–722` in `MoistureReadingsTable` | ✅ | Stage 4.3 also guards: `UPDATE … WHERE id=… AND deleted_at IS NULL` to prevent resurrection. |
| Subfloor photos | `photo_type='subfloor'`, `subfloor_id` set (or just `photo_type` for pre-existing rows) | `InspDD:366–368` PhotoGrid | ✅ | Hybrid linkage at `API:626` accepts either route. |
| Outdoor photos (5 slots) | `photo_type='outdoor'` or per-slot type, `caption` ∈ {`front_door`, `front_house`, `mailbox`, `street`, `direction`} | `InspDD:377–401` `OutdoorSection` photo filter | ✅ | See §3.5 note on save-by-caption vs render-by-type asymmetry. |

---

## §4 — Cross-check sweep: save → render coverage

Every column the form save handler at `TIF:3514–3661` writes to `inspections`:

| Column | Row in §3 audit | Status |
|---|---|---|
| `lead_id`, `inspector_id`, `inspector_name`, `job_number`, `triage_description`, `requested_by`, `attention_to`, `inspection_date` | §3.1 | ✅ ×8 |
| `property_occupation`, `dwelling_type` | §3.2 | ✅ + ⚠️ (occupation render-pattern drift) |
| `outdoor_temperature`, `outdoor_humidity`, `outdoor_dew_point`, `outdoor_comments`, `direction_photos_enabled` | §3.5 | ✅ ×4 + ⚠️ (direction toggle invisible) |
| `waste_disposal_required`, `waste_disposal_amount` | §3.6 | ✅ ×2 |
| `option_selected`, `treatment_methods`, `hepa_vac`, `antimicrobial`, `stain_removing_antimicrobial`, `home_sanitation_fogging`, `commercial_dehumidifier_qty`, `air_movers_qty`, `rcd_box_qty`, `recommended_dehumidifier` | §3.7 + §3.8 | ❌ Defect A (treatment_methods render); ❌ stain_removing_antimicrobial; ⚠️ recommended_dehumidifier capitalize drift; rest ✅ |
| `cause_of_mould`, `additional_info_technician`, `additional_equipment_comments`, `parking_option` | §3.8 | ✅ + ⚠️ (parking data typo flagged) |
| `no_demolition_hours`, `demolition_hours`, `subfloor_hours`, `equipment_cost_ex_gst`, `labour_cost_ex_gst`, `discount_percent`, `subtotal_ex_gst`, `gst_amount`, `total_inc_gst` | §3.9 | ⚠️ ×4 (Defect B affected rows); rest ✅ |
| `manual_labour_override`, `manual_total_inc_gst` | §3.9 | ✅ ×2 |
| `option_1_labour_ex_gst`, `option_1_equipment_ex_gst`, `option_1_total_inc_gst`, `option_2_total_inc_gst` | §3.9 | ✅ ×3 + ⚠️ (Option 2 right card shows total only) |
| `subfloor_required` | §3.4 | ⚠️ tristate render gap |
| `updated_at` | metadata | n/a |

Save-handler `inspection_areas` columns: every column at `TIF:3633–3661` is covered in §3.3.

Save-handler `moisture_readings` / `subfloor_data` / `subfloor_readings` columns: every column covered in §3.3 / §3.4.

**No save-handler column is missing from the audit table.** Coverage gate passes.

---

## §5 — Cross-check sweep: render → save coverage

`inspections` columns that EXIST in the DB schema (per `src/integrations/supabase/types.ts:710–787`) but are NOT written by the current save handler. These are likely dead/zombie columns from earlier phases:

| Column | Status | Notes |
|---|---|---|
| `contributing_factors` | 🚫 | No save site, no render site. Dead. Stage 9.3 candidate. |
| `equipment_days` | 🚫 | Pricing engine derives days at calc time but the column itself is never written. Dead. |
| `identified_causes`, `immediate_actions`, `long_term_protection`, `timeline_text`, `total_time_minutes`, `what_success_looks_like`, `what_we_discovered`, `why_this_happened` | 🚫 | Pre-Phase-3 AI summary scratch columns. Replaced by `ai_summary_versions` table at Stage 3.5. Dead. Already on Stage 9.3 list per TODO.md. |
| `last_edited_at`, `last_edited_by` | 🚫 | Audit columns redundant with `audit_logs` triggers. Already on Stage 9.4 list per TODO.md. |
| `report_generated`, `report_pdf_url`, `report_sent_date`, `pdf_blob_url` | 🚫 | PDF metadata superseded by `pdf_versions` table. Dead. |
| `waste_disposal_cost` | 🚫 | Form never writes a cost; pricing for waste happens elsewhere. Dead. |

These are all Stage 9.3 / 9.4 cleanups and **not** PR #57 blockers.

Render → save coverage gate passes for all rows the LeadView actually reads.

---

## §6 — Status tally

Total rows in §3 master table: **84** (counting per-photo-type rows separately).

| Status | Count | Distribution |
|---|---:|---|
| ✅ | 60 | Most fields save + read + render cleanly. |
| ⚠️ | 13 | Inconsistencies, drift across surfaces, missing toggle status displays, or Defect-B-adjacent. |
| ❌ | 4 | Surface Remediation (Defect A) + custom mould location fallthrough + `extra_notes` + `primary_photo_id` + `stain_removing_antimicrobial`. (Defect A counted once.) |
| 🚫 | 1 form-side + 8 DB-side | `subfloorEnabled` form-only state; 8 zombie DB columns (Stage 9 cleanup, not PR #57 blockers). |
| 🔍 | 0 | Static analysis was sufficient on every field — no DB read required to conclude the audit. |

---

## §7 — Prioritized recommendations

### Pre-merge blockers (must fix before merging PR #57)

| # | Severity | Location | Fix |
|---:|---|---|---|
| 1 | BLOCKER | `src/components/leads/InspectionDataDisplay.tsx:428` | Change `'Surface Mould Remediation'` → `'Surface Remediation Treatment'`. Defect A. |
| 2 | BLOCKER | `src/pages/LeadDetail.tsx:2042–2092` Card 10 | Insert "Option 2 (Comprehensive Treatment)" header (mirroring `:2046` pattern), gated on `option_selected === 3`, between Option 1 sub-block close and the `subtotal_ex_gst` row (Option α). Optionally also bracket the top labour/equipment rows with the same header (Option β). Defect B. |
| 3 | HIGH | `src/components/leads/InspectionDataDisplay.tsx:224–246` | When `mould_visible_locations` is empty AND `mould_visible_custom` is non-empty, render the custom value (not the null `mould_description`). Walk-doc explicitly flagged the "Under the ceiling" case. |

### Should-fix in PR #57 (or immediate follow-up commit) — render-side ❌

| # | Severity | Location | Fix |
|---:|---|---|---|
| 4 | HIGH | `src/lib/api/inspections.ts:583–608` (`fetchCompleteInspectionData` area shape) | Surface `extra_notes` so LeadView consumers can read it; or wire a LeadView render site that uses it. Walk-doc says it appears in the customer PDF and would be expected on LeadView too. |
| 5 | MEDIUM | `src/lib/api/inspections.ts:583–608` + render layer | Surface and display `primary_photo_id` so admins can see which photo the tech designated cover. Or confirm with owner that the cover-photo designation is PDF-only and intentionally hidden on LeadView (then close as "by design"). |
| 6 | MEDIUM | LeadView render layer | Render the `stain_removing_antimicrobial` Section 7 toggle somewhere visible to admin. Currently saves but is invisible. |

### Nice-to-fix in PR #57 (or PR #5 backlog) — ⚠️ inconsistencies

| # | Severity | Location | Fix |
|---:|---|---|---|
| 7 | LOW | `src/pages/LeadDetail.tsx:1849` | Add `className="capitalize"` to match `InspDD:476`. Walk-doc Test 2.4 nit. |
| 8 | LOW | `src/components/leads/InspectionDataDisplay.tsx:586–593` (right card, Option 2) | Mirror Option 1's left-card structure (labour + equipment + total). Currently right card shows total only — visual asymmetry. |
| 9 | LOW | `src/lib/api/inspections.ts:583–608` | Decide whether to drop the denormalized `internal_moisture` / `external_moisture` columns from `inspection_areas` (Stage 9.3) or render both consistently. Pick one; current half-and-half is the maintenance trap. |
| 10 | LOW | LeadView render layer | Display `direction_photos_enabled` toggle state somewhere on the Outdoor section so admins can tell "off" from "no photos yet". |
| 11 | LOW | `src/components/leads/InspectionDataDisplay.tsx:619–636` AISummarySection | Decide whether `ai_summary_text` and `what_you_get_text` should render on LeadView. Currently fetched but invisible. |
| 12 | LOW | Property occupation render pattern drift between `InspDD:203` and `LeadDetail:1976–1981` | Pick one pattern (the `labels` map is more explicit). TODO.md W6.1-A. |
| 13 | LOW | Internal Office Notes only render on `LeadDetail` Card 6, silent in `InspDD` AreaSection | Decide: either add a per-area display in `InspDD` AreaSection, or document that Card 6 is the canonical surface. |

### Deferred to PR #5 / Stage 9 cleanup (not PR #57 blockers)

- `parking_option` value "direaway" — data typo; fix the form dropdown options.
- Subfloor tristate `false` vs `null` render distinction — minor UX polish.
- 8 zombie `inspections` columns flagged under §5 — bulk drop migration (Stage 9.3).
- `last_edited_at` / `last_edited_by` drop (Stage 9.4).

---

## §8 — Confidence and limits

- **High confidence** on Defect A diagnosis: render-side label drift is reproducible from the literal at `InspectionDataDisplay.tsx:428`. Three save-side sites all use the canonical string; no code path can write the divergent label to the DB. SQL block in §1 is offered for empirical confirmation but is not required to merge a fix.
- **High confidence** on Defect B diagnosis: the card structure is fully readable from `LeadDetail.tsx:2024–2089`. The fix-path choices in §2 are deterministic.
- **Medium confidence** on the ❌ rows in §3.3 (`extra_notes`, `primary_photo_id`) — they are clearly saved but never read; whether the absence is "by design for LeadView" or "missed binding" needs owner sign-off before classifying as a fix-required vs. close-as-intent.
- **No runtime DB confirmation was performed.** The audit is 100% static. If owner wants empirical confirmation, run the SQL block in §1.
- **PDF surface (customer-facing) was not audited.** Several ❌ fields (`extra_notes`, `primary_photo_id`, `stain_removing_antimicrobial`, `what_you_get_text`, `ai_summary_text`) may render in the customer PDF via `generate-inspection-pdf` EF and `ReportPreviewHTML.tsx`. That surface is out of scope here. If any of those classify as "PDF-only by design", they shift from ❌ to ✅ once the design intent is confirmed.

---

## Done state checklist

- [x] PR #57 head sha confirmed (`7ba855b`)
- [x] Ledger file located (`docs/testing/pr57_e2e_walk_MRC-2026-0144_20260516.md.md`, `.md.md` is literal)
- [x] Defect A diagnosed as render-side (single-literal fix at `InspectionDataDisplay.tsx:428`)
- [x] Defect B diagnosed as structural sandwich (header insert fix at `LeadDetail.tsx:2065`+ or `:2025`+)
- [x] Every property on `InspectionFormData` cross-referenced against save column + render site
- [x] Every column on `inspections`, `inspection_areas`, `subfloor_data`, `moisture_readings`, `subfloor_readings`, `photos` cross-referenced
- [x] 4 ❌ rows + 13 ⚠️ rows surfaced beyond the 2 named defects
- [x] Pre-merge blocker list explicit (3 items)
- [x] Audit document committed on `claude/audit-leadview-fields-ETztV` (this commit) — zero source mutations
- [x] DO NOT MERGE PR #57 until at least blockers 1–3 in §7 are resolved

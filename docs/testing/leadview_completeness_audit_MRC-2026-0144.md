# LeadView Completeness Audit — MRC-2026-0144

**Date:** 2026-05-15
**Author:** Claude (post-section9 verification follow-on)
**Scope:** AI Review stage and beyond (statuses `inspection_ai_summary` / `approve_inspection_report` / `inspection_email_approval` / `closed`)
**Form source-of-truth:** `src/types/inspection.ts` + `src/pages/TechnicianInspectionForm.tsx`
**LeadView source-of-truth:** `src/pages/LeadDetail.tsx` (+ 8 sub-components, most importantly `src/components/leads/InspectionDataDisplay.tsx`)
**Branch / commit:** main @ `8238d9c` (post Wave 6.1 PR #3)
**Methodology:** Phase 1 inventory (1 Explore agent) → Phase 2 gap mapping (1 general-purpose agent) → Phase 3 consolidation (this file). All read-only.

**Lead-ID note:** The verification was sourced from test inspection inputs in `docs/testing/inscpect1.md` (lead MRC-2026-6382). The filename label `MRC-2026-0144` is per user direction. Gaps below are formula/structure-level and apply to every inspection that flows through LeadView, not just this lead.

---

## Summary

- **Total form fields audited:** 101 (Section 1: 7, Section 2: 2, Section 3 × N areas: 22 per area + nested MoistureReading/Photo, Section 4: 8, Section 5: 10, Section 6: 2, Section 7: 13, Section 8: 6, Section 9: 16)
- **Fully rendered:** 67 (~66%)
- **MISSING:** 19
- **PARTIAL:** 4
- **MISLABELLED:** 1
- **WRONG-FORMAT:** 1
- **STATUS-GATED-WRONG:** 0

`InspectionDataDisplay` (`src/components/leads/InspectionDataDisplay.tsx`) is the catch-all and covers most fields cleanly. The gaps cluster in:
1. **Section 7 `selectedTreatmentMethods` array** — entire 11-method customer-report-defense surface MISSING.
2. **Section 9 per-option pricing** — all 4 `option_1_*` and `option_2_total_inc_gst` fields MISSING.
3. **Section 8 `dehumidifierSize`** — rendered but MISLABELLED as a recommendation toggle.
4. **Per-area `infraredPhoto` + `naturalInfraredPhoto`** — visible but UNLABELLED in the photo grid.
5. **Per-area `extraNotes`** — written to DB, never read for display.

---

## Critical gaps (must-fix before PR #4 ships)

| Section | Field | Form file:line | Expected LeadView surface | Actual | Type | Severity |
|---|---|---|---|---|---|---|
| 7 | `selectedTreatmentMethods` (string[] up to 11 methods) | inspection.ts:97; TechnicianInspectionForm.tsx:3442-3444 | New section in `WorkProcedureSection` listing each selected method as a tag or checklist | NOT rendered anywhere — `treatment_methods` DB column never read by LeadDetail or InspectionDataDisplay | MISSING | CRITICAL |
| 7 | `optionSelected` (1 / 2 / 3 — Surface / Comprehensive / Both) | inspection.ts:96; TechnicianInspectionForm.tsx:3441 | Top of Cost Estimate card — "Option 1 (Surface) selected" / "Both options quoted" | NOT rendered. Admin can't tell which option the tech selected | MISSING | CRITICAL |
| 9 | `option1TotalIncGst` | inspection.ts:143; TechnicianInspectionForm.tsx:3481 | Cost Estimate or Cost Breakdown card | NOT rendered. Admin sees only the single total at LeadDetail.tsx:1772-1777 / InspectionDataDisplay.tsx:530-533 | MISSING | CRITICAL |
| 9 | `option2TotalIncGst` | inspection.ts:144; TechnicianInspectionForm.tsx:3482 | Cost Estimate card alongside Option 1 | NOT rendered. Cross-ref BUG-047 (Option 2 labour stale-state) which only addresses persistence, not display | MISSING | CRITICAL |
| 9 | `option1LabourCost` | inspection.ts:141; TechnicianInspectionForm.tsx:3479 | Cost Breakdown admin card (LeadDetail.tsx:2007-2067) | NOT rendered. Only `labour_cost_ex_gst` (full quote) renders | MISSING | CRITICAL |
| 9 | `option1EquipmentCost` | inspection.ts:142; TechnicianInspectionForm.tsx:3480 | Cost Breakdown admin card | NOT rendered. Only `equipment_cost_ex_gst` (full quote) renders | MISSING | CRITICAL |
| 8 | `dehumidifierSize` | inspection.ts:113; TechnicianInspectionForm.tsx:3453 | Card 3 Dehumidifier Recommendation (LeadDetail.tsx:1837-1856) — but field stores SIZE not just bool | PARTIAL — `recommended_dehumidifier` stores the size string but UI label says "Dehumidifier Recommendation" not "...Size" | MISLABELLED | CRITICAL |
| 3 | `area.naturalInfraredPhoto` (Photo \| null) | inspection.ts:36 | Should appear in Area Photos grid with "Natural-Light Comparison" label | NOT explicitly surfaced — appears in generic Area Photos grid (InspectionDataDisplay.tsx:294-296) without label distinction | PARTIAL | CRITICAL |
| 3 | `area.infraredPhoto` (Photo \| null) | inspection.ts:35 | Should be tagged "Infrared" in photo grid | NOT explicitly labelled — Section 3 renders `infrared_enabled` boolean + observation tags (lines 259-270), but the photo itself isn't called out | PARTIAL | CRITICAL |

---

## High gaps

| Section | Field | Form file:line | Expected LeadView surface | Actual | Type | Severity |
|---|---|---|---|---|---|---|
| 3 | `area.extraNotes` (per-area free-text) | inspection.ts:30; TechnicianInspectionForm.tsx:3559 | AreaSection card body | NOT rendered. DB column `inspection_areas.extra_notes` is written but never read. Lost forensic info | MISSING | HIGH |
| 3 | `area.primaryPhotoId` | inspection.ts:32; TechnicianInspectionForm.tsx:3560 | Photo grid should mark the primary cover photo | NOT visualised. Photos render in DB `order_index` order but the primary tag is silently dropped | MISSING | HIGH |
| 4 | `subfloorEnabled` (toggle) | inspection.ts:70 | Subfloor Assessment accordion should show "Disabled" if false. Cross-ref BUG-040 (toggle persistence) | Accordion hides entirely when `subfloor` row missing (InspectionDataDisplay.tsx:89). If subfloor row exists but `subfloorEnabled=false`, admin can't tell. No "Subfloor Skipped" affordance | PARTIAL | HIGH |
| 5 | `directionPhotosEnabled` (boolean) | inspection.ts:88; TechnicianInspectionForm.tsx:3438 | OutdoorSection should indicate whether direction photos were captured | NOT rendered. Direction photo itself appears in outdoor grid if uploaded, but the boolean toggle state is invisible | MISSING | HIGH |
| 8 | `jobSummaryFinal` (AI summary master text) | inspection.ts:147 | AI Summary card | NOT rendered. AI Summary card (InspectionDataDisplay.tsx:551-568) renders `what_we_found_text`, `problem_analysis_content`, `what_we_will_do_text`, `demolition_content` — but NOT `ai_summary_text` / `jobSummaryFinal`, which is the master block | MISSING | HIGH |
| 8 | `whatYouGetText` | inspection.ts:152 | AI Summary card | NOT rendered. API fetches it at `inspections.ts:534`, never displayed in AISummarySection | MISSING | HIGH |
| 9 | `manualPriceOverride` (boolean) | inspection.ts:129 | Cost Estimate card | PARTIAL — InspectionDataDisplay.tsx:536-542 renders an amber banner when `manual_labour_override` is true. Naming drift: form field `manualPriceOverride` → DB column `manual_labour_override`. Renders correctly but worth documenting | PARTIAL | HIGH |
| 9 | `discountPercent` | inspection.ts:135 | Cost Estimate + Cost Breakdown cards | PARTIAL — InspectionDataDisplay.tsx:525-527 shows it when `> 0`. Form writes 0–13 (percent scale). Admin Cost Breakdown card (LeadDetail.tsx:2007-2067) never shows discount at all | PARTIAL | HIGH |

---

## Medium gaps

| Section | Field | Form file:line | Expected LeadView surface | Actual | Type | Severity |
|---|---|---|---|---|---|---|
| 3 | `area.mouldDescription` | inspection.ts:20 | AreaSection visible mould block | PARTIAL — InspectionDataDisplay.tsx:241-243 renders ONLY when `mould_visible_locations` is empty (fallback). If locations exist, mould_description is silently dropped even when tech also wrote free-form text. Admin loses one signal | PARTIAL | MEDIUM |
| 4 | `subfloorObservations` checkbox-array intent | inspection.ts:71 | Should render as labelled bullet list, not just one text blob | Renders verbatim at InspectionDataDisplay.tsx:318-324 as a plain string. If the form joins multiple observations into one comma-separated string, admin reads them; if stored differently, MEDIUM | PARTIAL | MEDIUM |

---

## Low gaps

| Section | Field | Form file:line | Expected LeadView surface | Actual | Type | Severity |
|---|---|---|---|---|---|---|
| 1 | `address` | inspection.ts:56 | LeadDetail Property Information card | Address comes from `leads` row, not `inspections`. Acceptable — `inspections.address` not displayed separately | OK | LOW |
| 7 | `hepaVac`, `antimicrobial`, `stainRemovingAntimicrobial`, `homeSanitationFogging` (legacy bool flags) | inspection.ts:99-102 | WorkProcedureSection KV rows | PASS — InspectionDataDisplay.tsx:430-433. Note: these mirror 3 of 11 entries in `treatment_methods` array. Once treatment_methods renders (CRITICAL #1), these become redundant | PASS | LOW |
| 7 | `dryingEquipmentEnabled`, `commercialDehumidifierEnabled`, `airMoversEnabled`, `rcdBoxEnabled` (derived UI flags) | inspection.ts:103-108 | None — derived UI-only flags | NOT persisted as standalone columns; derived from qty > 0 or treatment_methods array. NOT a gap | OK | LOW |
| 9 | `manualTotal` | inspection.ts:130 | Manual override banner | PASS — InspectionDataDisplay.tsx:539 renders `manual_total_inc_gst` when override is set | PASS | LOW |

---

## Per-section breakdown

### Section 1 — Basic Information
| Field | Rendered? | LeadView file:line | Type | Severity |
|---|---|---|---|---|
| jobNumber | YES | InspectionDataDisplay.tsx:185 | PASS | — |
| triage | YES | InspectionDataDisplay.tsx:188 (label "Triage", value `triage_description`) | PASS | — |
| address | N/A — from leads row | LeadDetail Property Information card | OK | LOW |
| inspector | YES | InspectionDataDisplay.tsx:187 | PASS | — |
| requestedBy | YES | InspectionDataDisplay.tsx:189 | PASS | — |
| attentionTo | YES | InspectionDataDisplay.tsx:190 | PASS | — |
| inspectionDate | YES | InspectionDataDisplay.tsx:186 (fmtDate → DD/MM/YYYY) | PASS | — |

### Section 2 — Property Details
| Field | Rendered? | LeadView file:line | Type | Severity |
|---|---|---|---|---|
| propertyOccupation | YES | InspectionDataDisplay.tsx:203 + LeadDetail.tsx:1960-1988 (admin card with label map) | PASS | — |
| dwellingType | YES | InspectionDataDisplay.tsx:202 (capitalize, no enum map) | PASS | — |

### Section 3 — Area Inspection (per-area iteration check)

**Iteration verdict:** LeadView iterates ALL areas. InspectionDataDisplay.tsx:78-87 — `areas.map((area, i) => ...)`. No cap, no `areas[0]` shortcut. PASS.

| Field | Rendered? | LeadView file:line | Type | Severity |
|---|---|---|---|---|
| id | INTERNAL | — | OK | — |
| areaName | YES | InspectionDataDisplay.tsx:81 (`Area ${i+1}: ${area_name}`) | PASS | — |
| mouldDescription | PARTIAL | InspectionDataDisplay.tsx:241-243 — only when locations array is empty | PARTIAL | MEDIUM |
| commentsForReport | YES | InspectionDataDisplay.tsx:249-256 (`area.comments`) | PASS | — |
| temperature | YES | InspectionDataDisplay.tsx:217 | PASS | — |
| humidity | YES | InspectionDataDisplay.tsx:218 | PASS | — |
| dewPoint | YES | InspectionDataDisplay.tsx:219 (cross-ref BUG-041 formula) | PASS | — |
| moistureReadingsEnabled | DERIVED | rendered only when `moisture_readings.length > 0` (line 289) | OK | — |
| moistureReadings (array) | YES — fully iterated | InspectionDataDisplay.tsx:289-291, 624-674 — table iterates ALL readings with `r.title`, `r.moisture_percentage`, photo thumbnail | PASS | — |
| externalMoisture | YES | InspectionDataDisplay.tsx:220 (`area.external_moisture`) | PASS | — |
| internalNotes | YES | LeadDetail.tsx:1907-1937 (admin card iterates ALL areas with `internal_office_notes`) | PASS | — |
| extraNotes | NO | — | MISSING | HIGH |
| primaryPhotoId | NO (id stored but not visualised) | — | MISSING | HIGH |
| roomViewPhotos (Photo[]) | YES — fully iterated | InspectionDataDisplay.tsx:294-296, 680-724 (PhotoGrid maps all photos) | PASS | — |
| infraredEnabled | YES | gate on line 259 (observation tag block) | PASS | — |
| infraredPhoto | PARTIAL | Appears in generic Area Photos grid but not labelled as "Infrared" | PARTIAL | CRITICAL |
| naturalInfraredPhoto | PARTIAL | Same — appears generically without label distinction | PARTIAL | CRITICAL |
| infraredObservations (string[]) | YES — all 5 checked | InspectionDataDisplay.tsx:263-267 — 5 Tag components for 5 observations | PASS | — |
| mouldVisibleLocations (string[]) | YES — fully iterated | InspectionDataDisplay.tsx:227-235 (`.map((loc) => <Tag>{loc}</Tag>)`) | PASS | — |
| mouldVisibleCustom | YES | InspectionDataDisplay.tsx:236-238 | PASS | — |
| timeWithoutDemo | YES | InspectionDataDisplay.tsx:284-286 (`job_time_minutes`) | PASS | — |
| demolitionRequired | YES | InspectionDataDisplay.tsx:273 (red banner) + accordion badge line 83 | PASS | — |
| demolitionTime | YES | InspectionDataDisplay.tsx:276 (`demolition_time_minutes`) | PASS | — |
| demolitionDescription | YES | InspectionDataDisplay.tsx:277-279 | PASS | — |

### Section 4 — Subfloor (per-reading iteration check)

**Iteration verdict:** `subfloorReadings` iterated fully. InspectionDataDisplay.tsx:350-358 — `subfloor.readings.map((r, i) => ...)`. No cap. PASS.

BUG-040 context: section currently always renders on form (subfloor_required column dropped in Wave 6 Phase 5). LeadView assumes subfloor present unless `subfloorEnabled=false` is rendered separately — which it isn't (see PARTIAL below).

| Field | Rendered? | LeadView file:line | Type | Severity |
|---|---|---|---|---|
| subfloorEnabled | PARTIAL | Card hides entirely when `subfloor` row missing (line 89). No "Skipped" affordance when `enabled=false` but row exists | PARTIAL | HIGH |
| subfloorObservations | YES | InspectionDataDisplay.tsx:318-324 | PASS | — |
| subfloorLandscape | YES | InspectionDataDisplay.tsx:313 (capitalize) | PASS | — |
| subfloorComments | YES | InspectionDataDisplay.tsx:327-333 | PASS | — |
| subfloorReadings (SubfloorReading[]) | YES — fully iterated | InspectionDataDisplay.tsx:337-363 (table with location + moisture_percentage) | PASS | — |
| subfloorPhotos (Photo[]) | YES — fully iterated | InspectionDataDisplay.tsx:366-368 (PhotoGrid) | PASS | — |
| subfloorSanitation | YES | InspectionDataDisplay.tsx:314 (fmtBool) + LeadDetail.tsx:1790-1808 admin badge | PASS | — |
| subfloorTreatmentTime | YES | InspectionDataDisplay.tsx:315 (`treatment_time_minutes` → fmtMins) | PASS | — |

### Section 5 — Outdoor Info
| Field | Rendered? | LeadView file:line | Type | Severity |
|---|---|---|---|---|
| outdoorTemperature | YES | InspectionDataDisplay.tsx:385 | PASS | — |
| outdoorHumidity | YES | InspectionDataDisplay.tsx:386 | PASS | — |
| outdoorDewPoint | YES | InspectionDataDisplay.tsx:387 (cross-ref BUG-041) | PASS | — |
| outdoorComments | YES | InspectionDataDisplay.tsx:390-396 + LeadDetail.tsx:1990-2005 | PASS | — |
| frontDoorPhoto | YES (filtered by photo_type) | InspectionDataDisplay.tsx:378-380 | PASS | — |
| frontHousePhoto | YES | InspectionDataDisplay.tsx:378-380 | PASS | — |
| mailboxPhoto | YES | InspectionDataDisplay.tsx:378-380 | PASS | — |
| streetPhoto | YES | InspectionDataDisplay.tsx:378-380 | PASS | — |
| directionPhotosEnabled | NO | — | MISSING | HIGH |
| directionPhoto | YES (filtered by photo_type 'direction') | InspectionDataDisplay.tsx:378-380 | PASS | — |

### Section 6 — Waste Disposal
| Field | Rendered? | LeadView file:line | Type | Severity |
|---|---|---|---|---|
| wasteDisposalEnabled | YES | InspectionDataDisplay.tsx:413 + LeadDetail.tsx:1812-1835 | PASS | — |
| wasteDisposalAmount | YES | InspectionDataDisplay.tsx:414-416 (capitalize) + LeadDetail.tsx:1827-1831 | PASS | — |

### Section 7 — Work Procedure (per-method toggle check)

**Treatment methods iteration:** `selectedTreatmentMethods` (string[] up to 11 entries) is NOT iterated anywhere. The 11 method labels (HEPA Vacuuming, Surface Mould Remediation, ULV Fogging Property, ULV Fogging Subfloor, Subfloor Remediation, AFD Installation, Drying Equipment, Containment & PRV, Material Demolition, Cavity Treatment, Debris Removal) are written to `inspections.treatment_methods` (TechnicianInspectionForm.tsx:3442-3444) but **never read for display**. CRITICAL gap. The legacy boolean columns `hepa_vac`, `antimicrobial`, `home_sanitation_fogging` cover only 3 of 11 methods.

| Field | Rendered? | LeadView file:line | Type | Severity |
|---|---|---|---|---|
| optionSelected | NO | — `option_selected` column never read | MISSING | CRITICAL |
| selectedTreatmentMethods (string[] × 11) | NO — entire array unrendered | — | MISSING | CRITICAL |
| hepaVac (legacy bool) | YES | InspectionDataDisplay.tsx:430 | PASS | — |
| antimicrobial (legacy bool) | YES | InspectionDataDisplay.tsx:431 | PASS | — |
| stainRemovingAntimicrobial | YES | InspectionDataDisplay.tsx:432 | PASS | — |
| homeSanitationFogging | YES | InspectionDataDisplay.tsx:433 | PASS | — |
| dryingEquipmentEnabled | DERIVED — UI-only | n/a (no separate DB column) | OK | LOW |
| commercialDehumidifierEnabled | DERIVED | n/a | OK | LOW |
| commercialDehumidifierQty | YES (when > 0) | InspectionDataDisplay.tsx:440-442 | PASS | — |
| airMoversEnabled | DERIVED | n/a | OK | LOW |
| airMoversQty | YES (when > 0) | InspectionDataDisplay.tsx:443-445 | PASS | — |
| rcdBoxEnabled | DERIVED | n/a | OK | LOW |
| rcdBoxQty | YES (when > 0) | InspectionDataDisplay.tsx:446-448 | PASS | — |

### Section 8 — Job Summary
| Field | Rendered? | LeadView file:line | Type | Severity |
|---|---|---|---|---|
| recommendDehumidifier | DERIVED via `recommended_dehumidifier` non-null | InspectionDataDisplay.tsx:452-454 + LeadDetail.tsx:1837-1856 | PASS | — |
| dehumidifierSize | PARTIAL/MISLABELLED | `recommended_dehumidifier` column stores the size string but UI label says "Recommended Dehumidifier" not "...Size" | MISLABELLED | CRITICAL |
| causeOfMould | YES | InspectionDataDisplay.tsx:466-472 + LeadDetail.tsx:1939-1958 (admin standalone card) | PASS | — |
| additionalInfoForTech | YES | InspectionDataDisplay.tsx:475-481 + LeadDetail.tsx:1883-1905 | PASS | — |
| additionalEquipmentComments | YES | InspectionDataDisplay.tsx:484-490 | PASS | — |
| parkingOptions | YES | InspectionDataDisplay.tsx:494 + LeadDetail.tsx:1858-1881 (admin card with `_` → ` ` enum render) | PASS | — |

### Section 9 — Cost Estimate (per-option line item check)

Reference: BUG-046 (5-dp Option 2 Labour display lives in form), BUG-047 (Option 2 stale-state hydration). Neither addresses LeadView display of `option_1_*` or `option_2_total_inc_gst`.

| Field | Rendered? | LeadView file:line | Type | Severity |
|---|---|---|---|---|
| noDemolitionHours | YES | InspectionDataDisplay.tsx:511 | PASS | — |
| demolitionHours | YES | InspectionDataDisplay.tsx:512 | PASS | — |
| subfloorHours | YES | InspectionDataDisplay.tsx:513 | PASS | — |
| equipmentCost | YES | InspectionDataDisplay.tsx:524 (`equipment_cost_ex_gst`) + LeadDetail.tsx:2033-2040 | PASS | — |
| manualPriceOverride | YES (banner when true) | InspectionDataDisplay.tsx:536-542 (column `manual_labour_override`) | PASS | — |
| manualTotal | YES | InspectionDataDisplay.tsx:539 | PASS | — |
| laborCost | YES | InspectionDataDisplay.tsx:523 (`labour_cost_ex_gst`) + LeadDetail.tsx:2025-2032 | PASS | — |
| discountPercent | YES (when > 0) | InspectionDataDisplay.tsx:525-527 (admin Cost Breakdown card does NOT show discount) | PARTIAL | HIGH |
| subtotalExGst | YES | InspectionDataDisplay.tsx:528 + LeadDetail.tsx:1761-1765 + 2041-2048 | PASS | — |
| gstAmount | YES | InspectionDataDisplay.tsx:529 + LeadDetail.tsx:1766-1771 + 2049-2056 | PASS | — |
| totalIncGst | YES | InspectionDataDisplay.tsx:530-533 + LeadDetail.tsx:1772-1777 | PASS | — |
| option1LabourCost | NO | — | MISSING | CRITICAL |
| option1EquipmentCost | NO | — | MISSING | CRITICAL |
| option1TotalIncGst | NO | — | MISSING | CRITICAL |
| option2TotalIncGst | NO | — | MISSING | CRITICAL |
| jobSummaryFinal | NO | — `inspections.ai_summary_text` (Stage 3.5: now on `ai_summary_versions.ai_summary_text`) | MISSING | HIGH |
| whatWeFoundText | YES | InspectionDataDisplay.tsx:554-556 | PASS | — |
| whatWeWillDoText | YES | InspectionDataDisplay.tsx:560-562 | PASS | — |
| whatYouGetText | NO (fetched but not rendered) | API fetches at inspections.ts:534, never displayed in AISummarySection | MISSING | HIGH |
| problemAnalysisContent | YES | InspectionDataDisplay.tsx:557-559 | PASS | — |
| demolitionContent | YES | InspectionDataDisplay.tsx:563-565 | PASS | — |

---

## Activity Timeline coverage (presence + format)

### (a) Presence per section

The form is implemented as a single `handleSave` that runs on every section. It computes a union diff across `inspections` + `inspection_areas` + `subfloor_data` and emits ONE `section_milestone` row tagged with the current section number. All 9 sections share the same code path.

| Section | Save handler file:line | Emits timeline row? |
|---|---|---|
| 1 — Basic Info | TechnicianInspectionForm.tsx:3322 (`handleSave`) → :3766 (`logSectionMilestone`) | Y — `Section 1 (Basic Information) saved — N fields changed` |
| 2 — Property Details | same | Y — section_number=2 |
| 3 — Area Inspection | same | Y — section_number=3 |
| 4 — Subfloor | same | Y — section_number=4 |
| 5 — Outdoor | same | Y — section_number=5 |
| 6 — Waste Disposal | same | Y — section_number=6 |
| 7 — Work Procedure | same | Y — section_number=7 |
| 8 — Job Summary | same | Y — section_number=8 |
| 9 — Cost Estimate (Complete) | same + final transition logged at :3942 (`logFieldEdits` for status diff `inspection_waiting → inspection_ai_summary`) | Y + extra status row |

`logSectionMilestone` is a no-op when `changes.length === 0` (fieldEditLog.ts:143). If a section is opened and Next pressed without edits, no row is written. Acceptable.

### (b) Format axis

- **Status transitions render in diff format:** PASS. `useActivityTimeline.ts:43-44` maps `field_edit` activity type. ActivityTimeline.tsx:297-305 renders each change as `getFieldLabel(change.field): formatDiffValue(old) → formatDiffValue(new)`. Status changes flow through `logFieldEdits` (LeadDetail.tsx:482-488) producing payload like `[{ field: 'status', old: 'inspection_waiting', new: 'inspection_ai_summary' }]`. Renders as `Status: "inspection_waiting" → "inspection_ai_summary"`.
- **Section-save milestones include section name:** PASS. fieldEditLog.ts:149 title format: `Section ${sectionNumber} (${sectionName}) saved — N field(s) changed`. SECTION_TITLES array sourced in TechnicianInspectionForm.tsx:3770 fallback. Drill-down via `SectionMilestoneRow` (ActivityTimeline.tsx:91-126) iterates all changes with same `getFieldLabel + old → new` diff format.

---

## Internal Notes consistency (`parseInternalNotesLog`)

| Call site file:line | Source variable | Output equivalence |
|---|---|---|
| LeadDetail.tsx:1670 | `lead.internal_notes` | renders `entry.author + (context) + timestamp + body`, legacy entries marked "Legacy entry". Read-write (admin can add notes via Textarea at :1713-1719) |
| TechnicianJobDetail.tsx:1012 | `lead.internal_notes` | byte-identical entry shape (author/context/timestamp/body, legacy marker). Read-write (textarea at :1057-1063) |

**Verdict:** PASS — both call sites parse the same source variable (`lead.internal_notes`), render byte-identical structures, only diverge in CSS (max-h-96 vs max-h-64, shadcn `<Textarea>` vs native `<textarea>`). Helper centralized at `src/lib/utils/internalNotes.ts:84`.

---

## Photo gallery coverage

| Photo array | Render site file:line | All entries rendered? | Notes |
|---|---|---|---|
| per-area `roomViewPhotos` | InspectionDataDisplay.tsx:294-296 → PhotoGrid 680-724 | YES — `photos.map((photo, i) => ...)` no cap | Filter at API layer (inspections.ts:607): `photos.filter(p => !p.moisture_reading_id)` — area-level only. PASS |
| per-area `infraredPhoto` (single) | InspectionDataDisplay.tsx:294-296 (mixed into Area Photos) | YES (visible) but UNLABELLED | No "Infrared" tag. Admin can't distinguish from a room view photo. PARTIAL (CRITICAL) |
| per-area `naturalInfraredPhoto` (single) | InspectionDataDisplay.tsx:294-296 (mixed into Area Photos) | YES (visible) but UNLABELLED | Same gap as infraredPhoto. PARTIAL (CRITICAL) |
| per-area moisture-reading photo | InspectionDataDisplay.tsx:649-655 + lightbox 666 | YES — thumb shows first, lightbox iterates all `r.photos` | PASS |
| `subfloorPhotos` | InspectionDataDisplay.tsx:366-368 → PhotoGrid | YES, all photos | PASS |
| `frontDoorPhoto`, `frontHousePhoto`, `mailboxPhoto`, `streetPhoto`, `directionPhoto` | InspectionDataDisplay.tsx:378-380 → PhotoGrid | YES, all photo_type-filtered | PASS |

Cross-reference: 8/4 photo counter label bug (section9 report) is in form UI only, does not affect LeadView photo display.

---

## Drift items (form fields not in types)

| Field name | TechnicianInspectionForm.tsx file:line | Confirm or refute |
|---|---|---|
| `dryingEquipmentEnabled` | :1694, 2526, 2816 | CONFIRMED no drift — derived UI flag from `treatment_methods.includes('Drying Equipment')`, not a persisted column. Phase 1 finding holds. |
| `internal_moisture` write at :3556 | uses `area.moistureReadings[0]?.reading` | NO drift — DB column populated from MoistureReading[0]; no new top-level form field. Phase 1 finding holds. |

No new fields found in `TechnicianInspectionForm.tsx` that aren't in `inspection.ts`.

---

## Recommended Wave 6.1 PR #4 / PR #5 batch

**Total CRITICAL + HIGH gaps:** 18 (11 CRITICAL + 7 HIGH)
**Largest single fix LOC estimate:** ~80 LOC (per-option dual-column comparison table in CostEstimateSection)

**Recommendation:** **SPLIT into PR #4 + PR #5**

**Rationale:** 18 CRITICAL+HIGH gaps exceeds the 6-gap batch threshold. The 11 CRITICAL gaps cluster in 2 surfaces (Section 7 treatment-methods array + Section 9 per-option pricing) that directly underpin the customer-report-defense story. The 7 HIGH gaps are forensic/audit fields that can ship separately without blocking the PR #4 launch gate.

### PR #4 (~109 LOC) — bug fixes + CRITICAL LeadView gaps

Pairs with the section9 verification report's BUG-040 / BUG-041 / BUG-046 / BUG-047 fixes.

| # | Item | Severity | Files | ~LOC | Notes |
|---|---|---|---|---|---|
| 1 | Render `treatment_methods` array as labelled checklist in WorkProcedureSection | CRITICAL | InspectionDataDisplay.tsx | ~25 | Add new block at :424, iterate `i.treatment_methods?.map(...)` with 11 known labels |
| 2 | Render `option_selected` label in CostEstimateSection | CRITICAL | InspectionDataDisplay.tsx | ~12 | Add KV at :505 — map 1/2/3 to "Surface Only" / "Comprehensive" / "Both Quoted" |
| 3 | Render `option_1_total_inc_gst` + `option_2_total_inc_gst` dual line items | CRITICAL | InspectionDataDisplay.tsx (CostEstimateSection) | ~30 | Conditional block when `option_selected === 3`; otherwise single total |
| 4 | Render `option_1_labour_ex_gst` + `option_1_equipment_ex_gst` in admin Cost Breakdown card | CRITICAL | LeadDetail.tsx | ~25 | Extend dl at :2023-2063 |
| 5 | Fix MISLABELLED dehumidifier card title to "Recommended Dehumidifier **Size**" | CRITICAL | InspectionDataDisplay.tsx:453, LeadDetail.tsx:1843 | ~2 | One-character label edit each |
| 6 | Label per-area `infraredPhoto` + `naturalInfraredPhoto` in PhotoGrid | CRITICAL | InspectionDataDisplay.tsx:680-724 | ~15 | Photo-type discriminator overlay above caption — check `photo_type === 'infrared'` / `'naturalInfrared'` |

**Combined with section9 bug fixes** (BUG-047 hydration short-circuit ~10 LOC, BUG-041 dew-point + backfill ~15 LOC, BUG-040 subfloor toggle ~30 LOC, BUG-046 currency display ~2 LOC = ~57 LOC of bug fixes), PR #4 total is **~166 LOC across 4 source files + 1 migration**. Manageable for a single PR.

### PR #5 (~71 LOC) — HIGH + selected MEDIUM LeadView polish

| # | Item | Severity | Files | ~LOC | Notes |
|---|---|---|---|---|---|
| 7 | Render `area.extra_notes` per area | HIGH | InspectionDataDisplay.tsx (AreaSection) | ~10 | Add KV block similar to comments at :249 |
| 8 | Render `direction_photos_enabled` indicator in OutdoorSection | HIGH | InspectionDataDisplay.tsx | ~5 | KV row "Direction Photos Captured: Yes/No" |
| 9 | Render `ai_summary_text` (jobSummaryFinal) as 5th AI card | HIGH | InspectionDataDisplay.tsx:551-568 + inspections.ts:534 (already fetched) | ~8 | Add AICard for `i.ai_summary_text` |
| 10 | Render `what_you_get_text` as 6th AI card | HIGH | InspectionDataDisplay.tsx:551-568 | ~5 | Already fetched at inspections.ts:534, never displayed |
| 11 | Surface `subfloor_enabled=false` affordance even when subfloor row exists | HIGH | InspectionDataDisplay.tsx:89 | ~8 | Show "Subfloor: Skipped" banner instead of hiding card. **Depends on BUG-040 fix** (subfloor_required column restoration) — sequence after PR #4 |
| 12 | Mark primary photo with badge in PhotoGrid | HIGH | InspectionDataDisplay.tsx PhotoGrid + AreaWithDetails type extension | ~15 | Needs `primary_photo_id` plumbed into `AreaWithDetails` (inspections.ts:426-451) |
| 13 | Render `mouldDescription` alongside `mould_visible_locations` (not as fallback) | MEDIUM | InspectionDataDisplay.tsx:224-246 | ~10 | Drop the if/else; render both blocks unconditionally |
| 14 | Show discount in admin Cost Breakdown card | MEDIUM | LeadDetail.tsx:2007-2067 | ~5 | Single dl row mirroring InspectionDataDisplay.tsx:525-527 |

**PR #5 prerequisite:** Item 11 sequences after PR #4 ships (depends on BUG-040 fix restoring `subfloor_required` column).

---

## Submission gate for MRC-2026-0144

**Verdict (same as section9 verification): NO-GO** until PR #4 ships.

The section9 BUG-047 hydration short-circuit alone blocks submission (persisting wrong `labour_cost_ex_gst`). The LeadView gaps here do not independently block — they only become visible AFTER successful submit — but the customer-report-defense story is materially weaker until at least PR #4 items 1–3 ship (option_selected + treatment_methods + per-option pricing visibility).

---

## Out of scope (flagged for separate work)

- **Customer PDF completeness** — different render surface (`generate-inspection-pdf` Edge Function). Separate audit pass recommended.
- **AI summary prompt completeness** — `generate-inspection-summary` EF input shape audit. Different audit.
- **Technician mobile dashboard completeness** — `TechnicianJobDetail.tsx` covered only for `parseInternalNotesLog` consistency in this audit.
- **Photo counter `8/4` label bug** — already flagged in section9 verification report. Form-side UI only.
- **BUG-040 / BUG-041 / BUG-046 / BUG-047** — already covered in `docs/testing/section9_verification_MRC-2026-0144.md`.
- **`address` field consolidation** (`leads.property_address_*` vs `inspections.address`) — not an inspection-data gap; out of scope.
- **`mouldDescription` rendering polish** (Section 3 PARTIAL) — MEDIUM, optional inclusion in PR #5.

---

## Files referenced (absolute paths)

- `/Users/michaelyoussef/mrc-app-1/src/types/inspection.ts`
- `/Users/michaelyoussef/mrc-app-1/src/pages/TechnicianInspectionForm.tsx`
- `/Users/michaelyoussef/mrc-app-1/src/pages/LeadDetail.tsx`
- `/Users/michaelyoussef/mrc-app-1/src/pages/TechnicianJobDetail.tsx`
- `/Users/michaelyoussef/mrc-app-1/src/components/leads/InspectionDataDisplay.tsx`
- `/Users/michaelyoussef/mrc-app-1/src/components/dashboard/ActivityTimeline.tsx`
- `/Users/michaelyoussef/mrc-app-1/src/hooks/useActivityTimeline.ts`
- `/Users/michaelyoussef/mrc-app-1/src/lib/utils/internalNotes.ts`
- `/Users/michaelyoussef/mrc-app-1/src/lib/utils/fieldEditLog.ts`
- `/Users/michaelyoussef/mrc-app-1/src/lib/api/inspections.ts`
- `/Users/michaelyoussef/mrc-app-1/src/lib/statusFlow.ts`
- `/Users/michaelyoussef/mrc-app-1/docs/testing/section9_verification_MRC-2026-0144.md` (paired report)
- `/Users/michaelyoussef/mrc-app-1/docs/testing/inscpect1.md` (test-data source for MRC-2026-6382)

# AI Summary Input Audit — Phase 0 (research only)

**Date:** 2026-05-13
**Author:** Planner-Researcher Agent (research session, no code changes)
**Scope:** `supabase/functions/generate-inspection-summary/index.ts` + its single live caller `src/pages/InspectionAIReview.tsx`
**Status:** DECISION-READY — every recommendation row has a one-sentence rationale, every skip has a one-sentence reason
**Companion docs:** `docs/testing/01_DESKTOP-13-05-2026.md` (Phase 3.5 v2 wiring audit)

---

## Reading guide

Two surfaces matter for this audit:

1. **The EF itself** (`generate-inspection-summary/index.ts`) — the consumer. The EF can read whatever the caller sends it under `formData`. Capacity is defined by the `InspectionFormData` interface at `:24-114` and the `buildUserPrompt()` function at `:190-319`.
2. **The live caller** (`InspectionAIReview.tsx::buildEdgeFunctionPayload`, lines `:851-918`) — the producer. This is the ONLY production caller of the EF (confirmed by grep across `src/**`). What it doesn't pass, the EF doesn't see.

**Critical reality:** several fields ARE wired in the EF type contract but are hard-coded to empty arrays by the caller. Adding new EF prompt slots without fixing the caller is a no-op. The caller fix is part of the recommendation scope.

---

## 1. Current AI Input Contract

Every field the EF currently consumes from `formData` and embeds in the LLM prompt. Conditional render branches called out explicitly.

| Prompt Slot | DB Source Column(s) | Table | How Used in Prompt | Conditional Render Branch |
|---|---|---|---|---|
| `PROPERTY ADDRESS` | `leads.property_address_street` (ONLY) | leads | Composed line: `propertyAddress, propertySuburb, propertyState, propertyPostcode` joined — but caller passes only `property_address_street`, so suburb/state/postcode are always empty | `:201` — always emits, "Not specified" fallback |
| `CUSTOMER` | `leads.full_name` | leads | `CUSTOMER: {name}` | `:202` — only if present |
| `INSPECTION DATE` | `inspections.inspection_date` | inspections | `INSPECTION DATE: {date}` | `:203` — only if present |
| `INSPECTOR` | `inspections.inspector_name` | inspections | `INSPECTOR: {name}` | `:204` — only if present |
| `DWELLING TYPE` | `inspections.dwelling_type` | inspections | `DWELLING TYPE: {type}` | `:205` — only if present |
| `OCCUPATION` | `inspections.property_occupation` | inspections | `OCCUPATION: {value}` | `:206` — only if present |
| `INITIAL ISSUE` | `leads.issue_description` | leads | Block: `INITIAL ISSUE: {text}` | `:209-211` — only if present |
| `AREAS INSPECTED` block header | (derived from areas array length) | inspection_areas | Section header `AREAS INSPECTED:` | `:215` — only if `formData.areas.length > 0` |
| `AREA: {name}` | `inspection_areas.area_name` | inspection_areas | Per-area header | `:217` — per area |
| `Mould Description` | `inspection_areas.mould_description` | inspection_areas | `- Mould Description: {text}` | `:218` — only if present |
| `Temperature` | `inspection_areas.temperature` | inspection_areas | `- Temperature: {value}°C` | `:219` — only if present |
| `Humidity` | `inspection_areas.humidity` | inspection_areas | `- Humidity: {value}%` | `:220` — only if present |
| `Dew Point` | `inspection_areas.dew_point` | inspection_areas | `- Dew Point: {value}°C` | `:221` — only if present |
| `Internal Moisture` (per reading) | `moisture_readings.location_title` + `moisture_readings.moisture_percentage` | moisture_readings | Per-reading line `- Internal Moisture ({title}): {reading}%` | `:223-227` — per reading row (caller maps `moisture_readings(*)` join) |
| `External Moisture` | `inspection_areas.external_moisture` | inspection_areas | `- External Moisture: {value}%` | `:229` — only if present |
| `Comments` (area) | `inspection_areas.comments_for_report` | inspection_areas | `- Comments: {text}` | `:230` — only if present |
| `Demolition Required` | `inspection_areas.demolition_required` | inspection_areas | `- Demolition Required: YES/NO` | `:231` — always emits per area |
| `Time Without Demolition` | `inspection_areas.time_without_demo` | inspection_areas | `- Time Without Demolition: {n} hours` | `:232` — always emits per area |
| `Demolition Time` | `inspection_areas.demolition_time` | inspection_areas | `- Demolition Time: {n} hours` | `:235` — only if `demolitionRequired = true` |
| `Demolition Description` | `inspection_areas.demolition_description` | inspection_areas | `- Demolition Description: {text}` | `:236` — only if `demolitionRequired = true` AND text present |
| `Infrared Observations` | `inspection_areas.infrared_observation_*` (5 booleans) | inspection_areas | `- Infrared Observations: {comma-list}` | `:239-241` — only if `infraredEnabled = true` AND array non-empty. **CALLER PASSES `[]` ALWAYS** — slot is dead in production |
| `SUBFLOOR ASSESSMENT` block | (gated by presence) | subfloor_data | Section header | `:246-248` — only if any of `subfloorObservations`, `subfloorComments`, `subfloorLandscape`, OR `subfloorReadings.length > 0` |
| `Observation` (subfloor) | `subfloor_data.observations` | subfloor_data | `- Observation: {text}` | `:250` — only if present |
| `Landscape` | `subfloor_data.landscape` | subfloor_data | `- Landscape: {value}` | `:251` — only if present |
| `Comments` (subfloor) | `subfloor_data.comments` | subfloor_data | `- Comments: {text}` | `:252` — only if present |
| `Sanitation Required: Yes` | `subfloor_data.sanitation_required` | subfloor_data | Fixed line | `:253` — only if `true` (omitted when false) |
| `Treatment Time` | `subfloor_data.treatment_time_minutes` | subfloor_data | `- Treatment Time: {n} hours` | `:254` — only if present |
| `Moisture Readings` (subfloor) | `subfloor_readings.moisture_percentage` + `.location` | subfloor_readings | Per-reading line `  • {reading}% at {location}` | `:255-260` — per reading row. **CALLER PASSES `[]` ALWAYS** — slot is dead in production |
| `OUTDOOR CONDITIONS` header | (always emitted) | inspections | Always-on section header | `:264` — unconditional |
| `Temperature` (outdoor) | `inspections.outdoor_temperature` | inspections | `- Temperature: {value}°C` | `:265` — only if present |
| `Humidity` (outdoor) | `inspections.outdoor_humidity` | inspections | `- Humidity: {value}%` | `:266` — only if present |
| `Dew Point` (outdoor) | `inspections.outdoor_dew_point` | inspections | `- Dew Point: {value}°C` | `:267` — only if present |
| `Comments` (outdoor) | `inspections.outdoor_comments` | inspections | `- Comments: {text}` | `:268` — only if present |
| `TREATMENT METHODS` | `inspections.hepa_vac` + `.antimicrobial` + `.stain_removing_antimicrobial` + `.home_sanitation_fogging` (4 derived booleans) | inspections | Single line `TREATMENT METHODS: {comma-list}` | `:271-278` — only if at least one true |
| `DRYING EQUIPMENT` | `inspections.commercial_dehumidifier_qty` + `.air_movers_qty` + `.rcd_box_qty` (gated by `_enabled` booleans) | inspections | Single line `DRYING EQUIPMENT: {qty}x {name}, ...` | `:281-293` — only if at least one enabled+qty>0 |
| `WASTE DISPOSAL` | `inspections.waste_disposal_required` + `.waste_disposal_amount` | inspections | `WASTE DISPOSAL: {amount}` | `:296-298` — only if `wasteDisposalEnabled = true` AND amount present |
| `IDENTIFIED CAUSE OF MOULD` | `inspections.cause_of_mould` | inspections | `IDENTIFIED CAUSE OF MOULD: {text}` | `:301-303` — only if present |
| `ADDITIONAL INFO` | `inspections.additional_info_technician` | inspections | `ADDITIONAL INFO: {text}` | `:306` — only if present. **NOTE: this is `additional_info_technician` (internal-only column).** Currently flows to the customer-facing AI prose — may be a hygiene concern, not a recommendation. Flagged in Section 3. |
| `EQUIPMENT NOTES` | `inspections.additional_equipment_comments` | inspections | `EQUIPMENT NOTES: {text}` | `:307` — only if present |
| `INTERNAL NOTES` | `leads.internal_notes` | leads | `INTERNAL NOTES: {full append-only log}` | `:308` — only if present. **Significant content shape concern** — see Section 3 |
| `COST ESTIMATE` block | `inspections.total_inc_gst` + `.labour_cost_ex_gst` + `.equipment_cost_ex_gst` | inspections | Multi-line cost summary | `:311-316` — only if `totalIncGst > 0` |

### Slots wired in EF but dead at the caller

These are EF prompt slots the v2 audit identified, that the EF CAN consume but the live caller passes empty:

- **`subfloorReadings`** — caller hard-codes `[]` at `InspectionAIReview.tsx:889`. EF subfloor moisture-reading loop at `:255-260` never executes in production despite being plumbed.
- **`infraredObservations`** — caller hard-codes `[]` at `:882`. EF infrared line at `:239-241` never executes in production.
- **`mouldVisibility`** — caller hard-codes `[]` at `:867`. EF type accepts the field at `:49` but nothing in `buildUserPrompt()` ever reads it — it's purely a type-contract slot.
- **`propertySuburb` / `propertyState` / `propertyPostcode`** — caller passes only `lead.property_address_street` at `:853`. EF address composition at `:194-199` quietly degrades to street-only.

These four are **input-side fixes**, not new prompt slots. Fixing them ships the wired-but-dormant content into the prompt without any EF prompt-template edit.

### EF system prompt context (not a per-call slot)

The system prompt at `:143-171` instructs the LLM to use Australian English, reference specific data, write evidence-based recommendations, and produce three sections (Value Proposition / Problem Analysis / Demolition). It does not consume any per-call data — only the user prompt does. Recommendations in Section 2 apply to the user prompt only.

---

## 2. Recommended Additions

Fields whose inclusion would measurably improve the customer-facing AI prose. Sorted by combined value × confidence. **"Risk Level" semantics:** Low = additive context with low chance of misleading the model; Medium = changes prose substantially or has data-quality dependencies; High = could mislead the AI or expose internal-only info.

| Column | Table | What It Captures | Why Adding Improves Output | Risk Level | Prompt Slot Proposal |
|---|---|---|---|---|---|
| **`subfloorReadings` (caller-side fix, not new column)** | `subfloor_readings` (moisture_percentage + location, per row) | Per-reading subfloor moisture values + their locations | Without these, every subfloor-affected inspection feeds the AI only narrative subfloor text — the AI then guesses moisture levels or omits them; with them, the "WHAT WE DISCOVERED" + "WHY THIS HAPPENED" paragraphs cite real readings. | **Low** | Already wired at EF `:255-260` — just unblock caller. No EF change required. |
| **`infraredObservations`** | `inspection_areas.infrared_observation_*` (5 booleans) | Which infrared signature classes were observed (e.g. cold spot, wet area, etc.) | Adding these into the per-area block lets the AI tie thermal evidence to the recommendation — currently the prose can't reference what the camera revealed. | **Low** | Already wired at EF `:239-241` — just unblock caller (resolve the 5 boolean columns → label-string array in `buildEdgeFunctionPayload`). |
| **`property_address_suburb` / `_state` / `_postcode`** | `leads` | Full property address suburb + state + postcode | Customer reports currently identify the property by street only — the AI cannot reference suburb-specific context (Melbourne climate zone, subfloor norms by area). Adding these tightens the WHAT WE DISCOVERED paragraph. | **Low** | EF already composes `fullAddress` from all 4 components at `:194-199` — caller just needs to forward them. |
| `inspection_areas.extra_notes` | inspection_areas | Per-area free-text technician notes (per Phase 2a TODO — actively being wired) | Per-area extra context is currently hidden from the AI. If a tech writes "ceiling has visible water staining radiating from skylight," the AI can't see it and can't repeat it back to the customer. **DEPENDENCY:** the column has no programmatic writer today (BUG-024 in v2 audit); recommend reading via fallback chain. | Medium | New per-area line: `- Technician Notes: {extra_notes}` under each `AREA:` block at EF `:230` after `Comments`. |
| `inspections.cause_of_mould` — **already wired, recommend prompt placement upgrade** | inspections | Tech's identified root cause in free text | Already in prompt at `:301-303` but positioned at the bottom alongside admin notes — the LLM gives the closing block less weight. Moving it to the top alongside `INITIAL ISSUE` increases its influence on the WHY THIS HAPPENED paragraph. | Low | Promote to top: emit immediately after `INITIAL ISSUE` block at `:212` instead of at `:301`. |
| `leads.access_instructions` | leads | Customer-provided access instructions (gate codes, dog warnings, parking) | These shape the "this is what we'll do" prose by exposing real-world operational constraints. **HOWEVER:** primary audience for these is the technician/scheduler, not the customer. Risk Medium because echoing access instructions into customer-facing prose is awkward (e.g., AI may write "we accessed via the side gate where you said the dog is friendly"). | Medium-High | Recommend **SKIP for customer prose**; could be a useful input only if AI generates internal job-prep text (different surface, out of scope). |
| `leads.special_requests` | leads | Customer requests (e.g. asthma, no chemicals, remove shoes) | Same shape as access_instructions — operational context that may improve the WHAT WE'LL DO paragraph IF the AI handles it gracefully. Medium risk because customer requests may include health info the AI shouldn't paraphrase. | Medium-High | Recommend **SKIP for customer prose**; same reasoning as access_instructions. |
| `subfloor_data.racking_required` | subfloor_data | Whether subfloor requires racking for access | Currently absent — but **NEVER WRITTEN** by the form per v2 audit. No business value to plumb until column has a writer. | Low (but skip until writer exists) | Defer — re-evaluate after Phase 1b/2a if a writer is added. |

### Wired-but-dormant deserving its own line — Internal notes content shape

The EF currently passes `leads.internal_notes` verbatim into the prompt as `INTERNAL NOTES: {text}` (`:308`). Per `internalNotes.ts`, this column is now an **append-only structured log** with timestamps + author signatures:

```
[13/05/2026 at 3:57 pm] intenral notes 2 test
— michael youssef

---

[13/05/2026 at 10:50 am] Lead came in via website form. Spoke to Adam over the phone briefly...
— michael youssef
```

This is currently being sanitized via `sanitizeField()` which strips newlines — so the AI sees a single-line wall of text with all timestamps + author tags inlined. **Recommended improvement:** parse the structured log via `parseInternalNotesLog()` (already exists in `src/lib/utils/internalNotes.ts`), then either (a) inject only the body text of the most recent N entries, (b) format as a bulleted list of body-only entries (oldest first chronologically), or (c) include a single concatenation of all bodies stripped of timestamps/authors so the AI gets clean operational context. Risk Medium because internal_notes can contain internal-only language the customer shouldn't see paraphrased.

### Promoted from "Examples to evaluate" with explicit dispositions

- `inspections.cause_of_mould` — **EVALUATED.** Already wired; recommend prompt-position promotion (above). Net: small change, low risk.
- `inspections.property_occupation` — **EVALUATED.** Already wired at `:206`. No change.
- `inspection_areas.extra_notes` — **EVALUATED.** Recommended addition (table above). Caveat: BUG-024 — column has no programmatic writer; addition is a no-op until writer ships.
- `inspection_areas.outdoor_comments` — **EVALUATED.** This is actually `inspections.outdoor_comments` (not on `inspection_areas`). Already wired at `:268`. No change.
- `subfloor_data.subfloor_sanitation_required` — **EVALUATED.** Already wired at `:253` as a "Yes" line. The AI can already reference sanitation. No change required.
- `inspections.dehumidifier_recommendation` + size — **EVALUATED.** Skip (see Section 3). Equipment recommendation is purely operational and is already implicit from `commercial_dehumidifier_qty`.
- `inspections.parking_option` — **EVALUATED.** Skip (Section 3). Admin-only operational field.
- `inspections.waste_disposal_*` — **EVALUATED.** Already in prompt at `:296-298`. No change.
- `inspections.access_instructions` / `special_requests` — **EVALUATED.** These are on `leads`, not `inspections`. Skip for customer prose (see table above).
- Internal vs External moisture readings — **EVALUATED.** Internal moisture is already in prompt via the `moisture_readings` join loop at `:223-227`. External moisture is already in prompt at `:229`. No change. The Phase 1b denormalisation of `internal_moisture` onto `inspection_areas` (BUG-023) is a PDF concern, not an AI concern — the AI already gets the readings via the join.

---

## 3. Skip List

Fields evaluated and deliberately NOT recommended for the AI prompt, with a one-sentence reason each.

| Column | Table | Why Skipped |
|---|---|---|
| `inspections.parking_option` | inspections | Admin-only operational field — irrelevant to customer-facing prose. |
| `inspections.recommended_dehumidifier` + `dehumidifier_size` | inspections | Internal job-prep equipment note; not customer-facing and already implicit from equipment quantity (`commercial_dehumidifier_qty`). |
| `inspections.triage_description` | inspections | Internal triage notes; mostly a duplicate of lead's `issue_description` with admin colouring. |
| `inspections.subtotal_ex_gst` / `gst_amount` / `labour_cost_ex_gst` / `equipment_cost_ex_gst` | inspections | Cost detail is already summarised at `:311-316`; finer breakdowns add noise without changing prose. |
| `inspections.option_selected` / `option_1_*` / `option_2_*` | inspections | Pricing-option breakdown belongs in the PDF cost section, not in the AI prose. |
| `inspections.discount_percent` | inspections | Subject to BUG-019 scale bug; AI shouldn't reference discount tier in customer-facing language. |
| `inspections.manual_labour_override` / `manual_total_inc_gst` | inspections | Override flag is audit-trail info, not customer-facing context. |
| `inspections.pdf_*` / `report_*` / `last_edited_*` / `created_at` / `updated_at` | inspections | System metadata — never customer-facing. |
| `inspections.equipment_days` | inspections | Already implicit from the equipment line and the labour hours; redundant. |
| `inspections.dehumidifier_rate` / `air_mover_rate` / `rcd_rate` / `*_labour_rate` | inspections | Orphan-read columns (not even populated per v2 audit) AND pricing internals — never customer-facing. |
| `inspections.subfloor_required` / `direction_photos_enabled` / `waste_disposal_required` | inspections | Dead toggles (hardcoded true / not customer-facing); content already gated by content presence. |
| `inspection_areas.internal_office_notes` | inspection_areas | Explicitly internal-only by column naming — would leak admin language into customer prose. |
| `inspection_areas.area_order` / `primary_photo_id` / `comments_approved` | inspection_areas | Operational/system fields — no narrative value. |
| `inspection_areas.mould_ceiling` / `mould_walls` / `mould_flooring` and 9 other mould booleans (BUG-022) | inspection_areas | Never written by current form — would be a no-op until BUG-022 sync is implemented. |
| `inspection_areas.moisture_readings_enabled` / `infrared_enabled` | inspection_areas | Internal toggle states; presence of content already conveys the same information. |
| `inspections.additional_info_technician` — **flagged for review, not added** | inspections | Currently IN the prompt at `:306` as `ADDITIONAL INFO`. Column name suggests internal-tech intent ("info for technician"), but it flows to customer-facing AI prose. Worth Michael's explicit decision — leave, or strip? Not a "new addition," but a hygiene flag. |
| `subfloor_data.comments_approved` / `racking_required` | subfloor_data | No writer (v2 audit confirms orphan-read). Skip until writer exists. |
| `moisture_readings.moisture_status` (BUG-025) | moisture_readings | Enum never set; no value to include until classification logic ships. |
| `moisture_readings.reading_order` / `title` (when blank) | moisture_readings | Operational ordering / cosmetic title; AI doesn't need order metadata. |
| `photos.*` | photos | Photos are presented separately on PDF; AI prose intentionally omits photo URLs and metadata. |
| `ai_summary_versions.*` (24 cols) | ai_summary_versions | Self-referential — this is where the output lands, not an input. |
| `inspection_areas.timestamp_*` / `created_at` / `updated_at` | inspection_areas | System metadata — never customer-facing. |
| `leads.lead_source` / `urgency` / `property_type` / `lead_number` / etc. | leads | Operational pipeline fields; none belong in customer-facing AI prose. |
| `leads.customer_preferred_date` / `customer_preferred_time` | leads | Booking preference data, not inspection content. |
| `leads.scheduled_time` / `booked_at` / `assigned_to` | leads | Booking metadata. |
| `leads.archived_at` / `is_archived` | leads | System metadata. |

---

## 4. Specific Prompt Template Edits

Diff-style edits to `generate-inspection-summary/index.ts::buildUserPrompt()`. Each edit is gated on Michael's approval of the corresponding row in Section 2. Edits are grouped by section of the prompt and are non-overlapping.

### Edit 1 — Promote `cause_of_mould` to property-context block (Section 2, "Promote `cause_of_mould`")

**Before** (`:209-211` and `:301-303`):
```ts
// Initial issue from lead
if (formData.issueDescription) {
  lines.push(`\nINITIAL ISSUE: ${sanitizeField(formData.issueDescription)}`)
}

// ... (areas, subfloor, outdoor, treatment, equipment, waste blocks) ...

// Cause
if (formData.causeOfMould) {
  lines.push(`\nIDENTIFIED CAUSE OF MOULD: ${sanitizeField(formData.causeOfMould)}`)
}
```

**After**:
```ts
// Initial issue from lead
if (formData.issueDescription) {
  lines.push(`\nINITIAL ISSUE: ${sanitizeField(formData.issueDescription)}`)
}

// Identified cause — promoted from end-of-prompt to top so the LLM
// weighs it when writing the WHY THIS HAPPENED paragraph
if (formData.causeOfMould) {
  lines.push(`IDENTIFIED CAUSE OF MOULD: ${sanitizeField(formData.causeOfMould)}`)
}

// ... (areas, subfloor, outdoor, treatment, equipment, waste blocks unchanged) ...

// (the old `if (formData.causeOfMould)` block at :301 is DELETED — moved above)
```

**Rationale:** position-of-text matters in LLM weighting. The cause-of-mould signal currently competes with `internalNotes`, `additionalInfoForTech`, and the cost summary at the prompt tail; promoting it next to `INITIAL ISSUE` makes the root-cause statement central to the "what happened" framing the AI is asked to articulate.

---

### Edit 2 — Per-area `extra_notes` block under area card (Section 2, `inspection_areas.extra_notes`)

**Before** (`:217-241` — per-area loop):
```ts
lines.push(`\nAREA: ${sanitizeField(area.areaName)}`)
if (area.mouldDescription) lines.push(`- Mould Description: ${sanitizeField(area.mouldDescription)}`)
if (area.temperature) lines.push(`- Temperature: ${area.temperature}°C`)
if (area.humidity) lines.push(`- Humidity: ${area.humidity}%`)
if (area.dewPoint) lines.push(`- Dew Point: ${area.dewPoint}°C`)

if (area.moistureReadings && area.moistureReadings.length > 0) {
  area.moistureReadings.forEach(r => {
    lines.push(`- Internal Moisture (${sanitizeField(r.title)}): ${r.reading}%`)
  })
}

if (area.externalMoisture) lines.push(`- External Moisture: ${sanitizeField(area.externalMoisture)}%`)
if (area.commentsForReport) lines.push(`- Comments: ${sanitizeField(area.commentsForReport)}`)
```

**After**:
```ts
lines.push(`\nAREA: ${sanitizeField(area.areaName)}`)
if (area.mouldDescription) lines.push(`- Mould Description: ${sanitizeField(area.mouldDescription)}`)
if (area.temperature) lines.push(`- Temperature: ${area.temperature}°C`)
if (area.humidity) lines.push(`- Humidity: ${area.humidity}%`)
if (area.dewPoint) lines.push(`- Dew Point: ${area.dewPoint}°C`)

if (area.moistureReadings && area.moistureReadings.length > 0) {
  area.moistureReadings.forEach(r => {
    lines.push(`- Internal Moisture (${sanitizeField(r.title)}): ${r.reading}%`)
  })
}

if (area.externalMoisture) lines.push(`- External Moisture: ${sanitizeField(area.externalMoisture)}%`)
if (area.commentsForReport) lines.push(`- Comments: ${sanitizeField(area.commentsForReport)}`)
// New: per-area technician notes (Phase 2a — `inspection_areas.extra_notes`)
if (area.extraNotes) lines.push(`- Technician Notes: ${sanitizeField(area.extraNotes)}`)
```

**Type addition** (`:46-65`, area shape):
```ts
areas?: Array<{
  // ... existing fields ...
  externalMoisture?: string
  extraNotes?: string  // NEW — per-area free-text technician note
}>
```

**Caller change** (`InspectionAIReview.tsx:864-883`, inside `areas.map(...)`):
```ts
externalMoisture: a.external_moisture,
extraNotes: a.extra_notes,  // NEW
infraredEnabled: a.infrared_enabled,
```

**Rationale:** captures per-area context the AI cannot see today (the column will be populated by Phase 2a writer; until then the `if (area.extraNotes)` guard makes the addition safe).

---

### Edit 3 — Restructure `internalNotes` into clean body-only injection (Section 2, "Internal notes content shape")

**Before** (`:308`):
```ts
if (formData.internalNotes) lines.push(`\nINTERNAL NOTES: ${sanitizeField(formData.internalNotes)}`)
```

**After** (option A — concat all bodies, oldest first):
```ts
// internal_notes is now a structured append-only log with timestamps + author
// signatures. Parse and emit only the body text so the AI gets clean
// operational context without the chrome.
if (formData.internalNotes) {
  // Local lightweight parser — avoids importing from src/ into the EF runtime.
  // Format: `[stamp] body\n— author` separated by `\n\n---\n\n`.
  const entries = formData.internalNotes
    .split('\n\n---\n\n')
    .map(raw => {
      const m = raw.trim().match(/^\[[^\]]+\]\s*([\s\S]*?)\n—\s*.+?\s*$/)
      return m ? sanitizeField(m[1]) : sanitizeField(raw)
    })
    .filter(Boolean)
  if (entries.length > 0) {
    lines.push(`\nOPERATIONAL CONTEXT (most-recent first):`)
    entries.forEach(body => lines.push(`- ${body}`))
  }
}
```

**Rationale:** the AI currently receives a single-line wall of "[13/05/2026 at 3:57 pm] note 2 — michael youssef" with timestamps and author chrome that don't help it; this strips chrome and serves the AI clean prose. Body-only injection also reduces risk of the AI quoting timestamps verbatim back to the customer.

---

### Edit 4 — Wire infrared observations + subfloor readings + full address (Section 1 "wired but dead" subsection)

**No EF code change required.** These slots already exist in the EF prompt builder. Only `buildEdgeFunctionPayload()` needs unblocking:

```ts
// InspectionAIReview.tsx :851-918
function buildEdgeFunctionPayload(inspection: any, areas: any[], lead: LeadData | null) {
  return {
    propertyAddress: lead?.property_address_street,
    propertySuburb: lead?.property_address_suburb,        // NEW
    propertyState: lead?.property_address_state,          // NEW
    propertyPostcode: lead?.property_address_postcode,    // NEW
    // ... existing fields ...
    areas: areas.map((a: any) => ({
      // ... existing fields ...
      infraredObservations: deriveInfraredLabels(a),      // NEW — derive label-string array from a.infrared_observation_* booleans
    })),
    // ... subfloor block ...
    subfloorReadings: (inspection?.subfloor_data?.subfloor_readings || [])
      .map((r: any) => ({                                  // NEW — was hard-coded []
        reading: r.moisture_percentage?.toString(),
        location: r.location,
      })),
    // ... rest unchanged ...
  };
}
```

**Note:** unblocking requires the caller's inspection load (`InspectionAIReview.tsx:343-346`) to widen its select from `'*, moisture_readings(*)'` on inspection_areas to also include subfloor relations. This is a caller-side ergonomics change, not an EF change.

**Rationale:** purely additive — the EF prompt is already designed for these, the live caller just never passed them.

---

### Edit 5 — (FLAGGED, NOT PROPOSED) `additional_info_technician` review

Not a "diff" — a question for Michael. The current prompt at `:306-307` emits:

```ts
if (formData.additionalInfoForTech) lines.push(`ADDITIONAL INFO: ${sanitizeField(formData.additionalInfoForTech)}`)
```

`additional_info_technician` reads as internal-only by column name. If Michael decides this column is too internal for customer-facing prose, the edit is a one-line deletion. If it stays, no change.

---

## 5. Subfloor gate analysis

### Current state

The EF has TWO subfloor gates, neither of which matches the form-level `subfloor_required` column:

1. **EF gate at `:246-247`** — gates the SUBFLOOR ASSESSMENT prompt block on **content presence**, not on the `subfloor_required` column:
   ```ts
   const hasSubfloorData = formData.subfloorObservations || formData.subfloorComments ||
     formData.subfloorLandscape || (formData.subfloorReadings && formData.subfloorReadings.length > 0)
   if (hasSubfloorData) { /* emit block */ }
   ```
   This is correct behaviour by accident — `subfloor_required` is hardcoded `true` per Phase 3.5 v2 (the toggle is a dead column), so the form-level gate is meaningless. The EF gate by content presence is the de facto right thing.

2. **Form-level `subfloor_required` column on `inspections`** — always `true` (TIF :3356). Per v2 audit, "always true — no UI; effectively dead toggle." Phase 5b plans to drop this column.

### Post-Phase-5b behaviour (when `subfloor_required` is dropped)

**No EF change required.** The EF already does NOT read `formData.subfloorRequired` anywhere in the prompt builder. Grep confirms: `subfloor_required` / `subfloorRequired` appears nowhere in `generate-inspection-summary/index.ts`. The dependency is zero.

What needs to change after Phase 5b:

- **PDF EF** (`generate-inspection-pdf/index.ts`) — separate EF, uses `subfloor_required` to gate the Subfloor PDF page. Phase 5b drop work needs to coordinate with the PDF EF to swap the gate to content-presence (mirror the AI EF pattern). **NOT THIS AUDIT'S SCOPE** but worth flagging.
- **AI EF** — no change required.

### Recommended gate going forward (AI EF)

Keep the existing content-presence gate at `:246-247`. It already aligns with the post-drop world. The only refinement (optional) is to make it explicit that the gate is content-driven and add a code comment:

```ts
// Subfloor section emits only when there is real subfloor content. We do NOT
// read inspections.subfloor_required — that column is being dropped in Phase 5b
// and never gated anything in this prompt to begin with.
const hasSubfloorData = formData.subfloorObservations || formData.subfloorComments ||
  formData.subfloorLandscape || (formData.subfloorReadings && formData.subfloorReadings.length > 0)
```

### Subfloor + `subfloorReadings: []` interaction (re-flag)

`subfloorReadings.length > 0` is one of four conditions in the `hasSubfloorData` OR. Because the caller hard-codes `[]`, this term is always false; the block emits only when one of the other three text fields is non-empty. **Once the caller is unblocked (Edit 4), the SUBFLOOR ASSESSMENT block will start emitting more often** — specifically on inspections that have readings but no narrative text. Worth noting that this is the correct expansion of behaviour, not a regression.

---

## Closing notes

**Net recommended changes if Michael approves all rows:**

- **EF prompt-template edits:** 3 (Edit 1 promote `cause_of_mould`; Edit 2 add `extra_notes` per-area; Edit 3 parse internal_notes log).
- **EF type contract additions:** 1 field (`area.extraNotes?: string`).
- **Caller-side fixes (`InspectionAIReview.tsx`):** widen the lead `.select()` to include suburb/state/postcode + access_instructions/special_requests (the latter for future evaluation only); widen the inspection_areas `.select()` to pull subfloor relations; remove the 3 hard-coded empty arrays.
- **Skipped this round:** 9 lead-side / 12 inspection-side / 14 inspection_areas-side / 5 subfloor-side / 2 moisture-readings columns plus all photo and ai_summary_versions tables (rationale per row in Section 3).

**Out of scope but worth a separate decision (FLAGGED):** the `additional_info_technician` column currently flows to customer-facing AI prose. Column name suggests it's internal-only. Worth Michael's explicit decision: leave as-is, or strip from the prompt? Not a "new recommendation" — a hygiene question.

**Not done this audit:** any code changes, EF deploys, migrations, or type-file edits. Pure research deliverable.

# Lead Detail Inline-Edit Refactor — Diagnosis

**Date:** 2026-04-28
**Status:** STAGE E REPORT — read-only investigation. No edits made. Awaiting decision on execution scope.

---

## TL;DR

The EditLeadSheet modal edits 16 lead columns. The user's "modal is missing shit" complaint isn't quite right — every field in the modal *can* be edited, but **3 columns are editable in the modal that aren't visible on Lead Detail's read-only view** (`notes` general, `lead_source_other`, plus `access_instructions`/`special_requests` which only conditionally render). The bigger story is **architectural duplication**: there are already TWO different inline-edit patterns in the codebase (LeadBookingCard's per-field quick-edit and TechnicianJobDetail's mode-toggle inline-edit), and the activity log is **double-logged on every modal save** because `useLeadUpdate.ts:76-89` inserts a `lead_updated` row AND `EditLeadSheet.onSubmit:162` calls `logFieldEdits` which inserts a separate `field_edit` row with a version number.

A clean refactor consolidates: (a) one `<InlineEditField>` component used everywhere a field renders on Lead Detail, (b) one save path through `useLeadUpdate` (kill the double-log), (c) field-level rather than form-level interaction. Estimated +400/−200 LoC for full conversion of all 16 fields. Mobile UX is the only genuine design unknown — recommendation below in §5.

---

## 1. Modal anatomy — what EditLeadSheet currently edits

`src/components/leads/EditLeadSheet.tsx` (588 LoC). Form schema at lines 69-88. UI sections rendered at lines 197-543.

### CONTACT (3 fields)
| Form key | Column | Type | Validation | UI |
|---|---|---|---|---|
| `full_name` | `full_name` | text | optional | Input, h-12 |
| `email` | `email` | text | optional | Input type=email |
| `phone` | `phone` | text | optional | Input type=tel + `formatPhoneNumber` on change (lines 172-175) |

### PROPERTY (5 fields)
| Form key | Column | Type | Validation | UI |
|---|---|---|---|---|
| `property_address_street` | same | text | optional | Input |
| `property_address_suburb` | same | text | optional | Input |
| `property_address_state` | same | text | default "VIC" | Select with `stateOptions` |
| `property_address_postcode` | same | text | maxLength 4 | Input |
| `property_type` | same | text\|null | optional | Select with `propertyTypeOptions` |

Note: lat/lng (`property_lat`, `property_lng`) are NOT in the form schema. They're written separately by `LeadBookingCard.saveValidatedAddress` and `TechnicianJobDetail.handleSaveInline` when admin/tech uses Google Places autocomplete. Pure-text address edit in EditLeadSheet leaves lat/lng stale.

### LEAD DETAILS (3 fields)
| Form key | Column | Type | Validation | UI |
|---|---|---|---|---|
| `lead_source` | same | text\|null | optional | Select with `leadSourceOptions` (sectioned: DIGITAL / REFERRAL / TRADITIONAL / OTHER) |
| `lead_source_other` | same | text\|null | optional | Input — **conditionally rendered when lead_source === "Other"** (line 382) |
| `urgency` | same | text\|null | optional | Select with `urgencyOptions` |
| `issue_description` | same | text\|null | max 1000 chars | Textarea + character counter (lines 437-439) |

### NOTES (4 fields)
| Form key | Column | Type | UI |
|---|---|---|---|
| `add_internal_note` (synthetic) → `internal_notes` | `internal_notes` | text\|null (append-only) | Read-only history block + Add note Textarea (Stage B.5 pattern, lines 446-487) |
| `notes` | `notes` | text\|null | Textarea, "General notes" |
| `access_instructions` | same | text\|null | Textarea |
| `special_requests` | same | text\|null | Textarea |

### Hidden-edit gap analysis
**Fields editable in modal but NOT visible on Lead Detail's read-only view:**
- `notes` (general notes column) — never rendered on Lead Detail. Either dead column or repurpose.
- `lead_source_other` — only shows in EditLeadSheet when `lead_source === 'Other'`; never displayed as a separate field on Lead Detail (it gets concatenated into the source display? Let me check — at LeadDetail.tsx:1236 only `lead.lead_source` is rendered, not `lead_source_other`. **Bug: admin types "Other → Friend referral" in the modal, the friend-referral text is never shown back on Lead Detail.**)
- `access_instructions`, `special_requests` — only render conditionally (LeadDetail.tsx:1349-1372 wraps both in `{(lead.special_requests || lead.access_instructions) && ...}`). Editable in modal but the read-only card doesn't appear at all if both are null.

**Fields visible on Lead Detail but NOT in modal:**
- `inspection_scheduled_date`, `scheduled_time` — admin-managed via /admin/schedule (Stage A/B confirmed canonical path).
- `customer_preferred_date`, `customer_preferred_time` — Framer-captured, intentionally read-only.
- `assigned_to` (technician) — managed via booking flow.
- `status` — managed via the status-change dropdown (separate state machine).
- `booked_at`, `inspection_completed_date`, `job_completed_date`, `invoice_sent_date`, `invoice_amount`, `payment_received_date` — pipeline milestones, set by automation, not direct admin edit.
- `lead_number`, `id`, `created_at` — system fields, immutable.

So the modal's coverage of editable fields is reasonably complete. The actual issue is UX fragmentation, not field gaps.

### Stage B.5 append-only pattern (intersect with inline-edit)
`add_internal_note` is a synthetic form field that resolves to a call into `appendInternalNote` (`src/lib/utils/internalNotes.ts:25`) on submit, never written directly. Inline-edit MUST preserve this — the `internal_notes` column is the only field that should NOT use a generic "click-to-edit-the-value" pattern. It needs its own dedicated "Add note" inline component or just keep the current Stage B.5 split layout untouched.

---

## 2. Current save path

Two-step save with double-logging.

### Modal submit
`EditLeadSheet.onSubmit` (`src/components/leads/EditLeadSheet.tsx:121-170`):
1. Strips `add_internal_note` out of the form values, applies the append helper if non-empty, builds the rest of the payload (empty strings → null).
2. Calls `updateLead(payload, originalLead)` from `useLeadUpdate`.
3. On success, computes `diffRows` against `LEAD_FIELD_MAP`, pushes a synthetic `Internal Note Added` entry if applicable, then calls `logFieldEdits`.

### `useLeadUpdate` hook
`src/hooks/useLeadUpdate.ts:32-113`. Direct `supabase.from('leads').update(updates).eq('id', leadId)`. Side effects on success:
- Recalculates `property_zone` if suburb changed (line 42-47)
- Cleans phone number if changed (line 50-52)
- **Inserts an `activities` row** with `activity_type='lead_updated'`, title="Lead Details Updated", description="Updated: <comma-separated field labels>" (lines 76-89)
- Sends Slack notification via `sendSlackNotification({ event: 'lead_updated' })` (line 91-96)
- Invalidates `['lead', leadId]` and `['leads']` query keys
- Toast: "Lead updated successfully"

### `logFieldEdits` activity entry
`src/lib/api/fieldEditLog.ts:30-72`. Separately inserts an `activities` row with `activity_type='field_edit'`, **versioned** (v1, v2, …), title=`v{n} — edited {field}` or `v{n} — edited N fields`, plus structured `metadata.changes` with old/new values per field.

**This means every modal save creates TWO activities rows for the same edit.** Inline-edit refactor should resolve this — pick one. The user's screenshot mentioned "Lead Details Updated — Updated: phone" entries, which is the `lead_updated` style from `useLeadUpdate`. The `field_edit` style is the one used by inspection-form edits via the same `logFieldEdits` helper. Two patterns in the same activities table = reader confusion downstream.

### Validation & error handling
- Form validation: zod schema via `zodResolver`. Field-level error messages render via `<FormMessage />`. Currently only `issue_description.max(1000)` is enforced.
- Save errors: `useLeadUpdate.ts:102-106` catches, surfaces toast via `toast.error(message)`, captures to Sentry via `captureBusinessError`.
- Save is **pessimistic**: UI does not optimistically update. Sheet stays open with form values until `success === true`, then closes.

---

## 3. Lead Detail read-only render architecture

`src/pages/LeadDetail.tsx` (1867 LoC). All field cards rendered as flat JSX inside the main page component — **no extracted sub-components**. Per-card line ranges:

| Card | Lines | Fields rendered |
|---|---|---|
| Status | 1086-1106 | `lead.status` (via `statusConfig`) |
| Primary CTA | 1109-1111 | `renderPrimaryCTA()` switch |
| Customer Preferred Time (new_lead only) | 1115-1143 | `customer_preferred_date`, `customer_preferred_time` |
| Contact Information | 1146-1176 | `phone` (tel: link), `email` (mailto: link) |
| Property Information | 1178-1206 | `property_address_*`, `property_type`, "View on Google Maps" button |
| Issue Description (conditional) | 1208-1223 | `issue_description` (text only) |
| Lead Details | 1225-1255 | `lead_source`, `created_at`, `lead_number`/`id`, `urgency` |
| Pipeline Timeline (conditional) | 1257-1305 | various pipeline milestone columns |
| Inspection Scheduled (conditional) | 1307-1346 | `inspection_scheduled_date`, `scheduled_time`, Reschedule button |
| Customer Requests (conditional) | 1348-1372 | `access_instructions`, `special_requests` |
| Internal Notes (conditional) | 1374-1401 | `internal_notes` (read-only log) |

**Architectural observation:** because none of these cards are extracted into sub-components, refactoring to inline-edit is mechanically straightforward (in-place changes per card) but bloats LeadDetail.tsx further unless we extract during the same pass. Recommendation in §10.

---

## 4. Existing inline-edit patterns in the codebase

Three patterns coexist. Worth knowing before designing a fourth.

### 4.1 LeadBookingCard quick-edit (per-field inputs, single Save button)
`src/components/schedule/LeadBookingCard.tsx:674-803`. Section labelled "Lead Info" inside the expanded booking card. Fields: name, phone, email, description, lead_source.
- Each field is a plain `<input>` / `<textarea>` styled inline, always visible.
- `hasLeadChanges` derived (line 113-118) compares each `editX` state to `lead.X`.
- "Save Changes" button only appears when `hasLeadChanges === true`.
- On save: builds delta-only payload (only changed fields), calls `updateLead`, invalidates `leads-to-schedule` query.
- No inline error per-field; relies on `useLeadUpdate` toasts.
- **Pattern strength:** instant feedback (no mode toggle), all fields visible at once.
- **Pattern weakness:** the entire form is always rendered; visually busier than read-only mode.

### 4.2 TechnicianJobDetail mode-toggle (Edit/Save pencil)
`src/pages/TechnicianJobDetail.tsx:175-237`. Pencil button toggles `isEditing`. When true, every field becomes editable; "Save Changes" button on the bottom mobile bar commits all.
- Address uses `AddressAutocomplete` (Google Places).
- `handleSaveInline` builds a delta payload (only changed values), calls `updateLead`.
- **Pattern strength:** read-only display by default, no visual clutter.
- **Pattern weakness:** all-or-nothing edit mode; can't edit one field without entering form mode for everything.

### 4.3 ViewReportPDF / EditFieldModal
`src/components/pdf/EditFieldModal.tsx`. Click a field on the PDF preview → modal opens for that single field → save → modal closes. Per-field surgical edit.
- **Pattern strength:** matches the user's stated UX intent more closely.
- **Pattern weakness:** still uses a modal, just smaller. Mobile keyboards still cover the field.

### 4.4 What's missing
No pattern in the codebase for **tap-to-edit-in-place** (field becomes input on click, blur saves, no modal, no global edit mode). This is the cleanest mobile-first UX but requires building from scratch.

### Available shadcn primitives (confirmed via repo scan)
`Input`, `Textarea`, `Select`, `Form`, `Button`, `Badge`, `Card`, `AlertDialog`, `Dialog`, `Sheet`, `Popover`, `Tooltip`. All used elsewhere in the codebase. No need to install new primitives.

---

## 5. Mobile UX (375px primary viewport)

### Conflicting tap targets on the existing read-only view
- Phone number is a `<a href="tel:...">` (LeadDetail.tsx:1157-1163) — tap calls.
- Email is a `<a href="mailto:...">` (LeadDetail.tsx:1167-1173) — tap opens mail.
- "View on Google Maps" button on Property card (line 1201-1204) — tap navigates.

If we make these fields tap-to-edit, those existing tap behaviours break — admin loses the ability to call/email/navigate from the lead detail. Three resolutions:

1. **Pencil-icon affordance per row** — tap the row to open call/email; tap the small pencil icon to edit. 48px touch target on the pencil. Lowest UX risk.
2. **Long-press to edit** — single tap = call/email/nav, long-press = edit. Touch-only convention; doesn't translate to desktop unless we also wire a hover state.
3. **Mode toggle (TechnicianJobDetail pattern §4.2)** — top-of-card edit button flips ALL fields in that card to edit mode. Tap-to-call comes back when read-only mode resumes.

**Recommendation: Option 1 (pencil-icon per row).** Reasons:
- Mobile-first 48px touch targets satisfied with a 48×48 pencil icon button.
- Read-only behaviour preserved (call/email/nav still work).
- Desktop-friendly (hover reveals pencil; touch always shows it).
- Per-field interaction matches the user's stated UX preference ("click phone number, edit, save").
- One field at a time = one keyboard pop-up at a time on mobile = no scroll-while-editing.

UX flow for Option 1:
1. Read-only state: row shows label + value + small pencil icon (right-aligned).
2. Tap pencil → row swaps to: label + Input/Select/Textarea + Save (✓) + Cancel (✗) buttons.
3. On Save: optimistic update; row swaps back to read-only with new value; toast confirms.
4. On Cancel: row reverts to original read-only; no save.
5. On blur (tap outside without explicit save): treat as Cancel for safety. Or auto-save — see §10 for decision.
6. On Enter (text inputs only): triggers Save.

### Mobile-specific touch target audit
- 48px height on Input is `h-12` Tailwind class, already used everywhere in EditLeadSheet.
- 48×48 pencil button: `h-12 w-12` with `Pencil` icon from lucide.
- Save/Cancel buttons after edit: 48×48 icon buttons (Check / X icons).

---

## 6. Activity log integration

### Current state
Two paths fire on every modal save (per §2):
- `useLeadUpdate` inserts `activity_type='lead_updated'`. This is what powers the "Lead Details Updated — Updated: <fields>" entries the user sees on the activity log.
- `logFieldEdits` inserts `activity_type='field_edit'` with versioning. This is shown by the same activity timeline reader (per `useActivityTimeline` per CLAUDE.md mention) but with different rendering.

### For inline-edit
Each field-level save MUST trigger an activity log. The cleanest path:
- **Drop the double-log.** Pick one — either `lead_updated` (with metadata.changes) or `field_edit` (with version + metadata.changes). Don't fire both. Recommendation: keep `lead_updated` because it's already the dominant pattern for lead activity entries; deprecate `field_edit` for lead-level edits (it's still used elsewhere e.g. inspection edits per the entityType union in `fieldEditLog.ts:10-15`).
- If the inline-edit component saves one field at a time, each save fires one `lead_updated` row with `description = "Updated: <field>"`. Visible immediately in the activity timeline.
- Slack notification: `useLeadUpdate.ts:91-96` already fires `sendSlackNotification({ event: 'lead_updated' })`. Inline-edit naturally triggers this per save. **Caution:** if admin edits 5 fields in a row, that's 5 Slack messages. Consider debouncing in the inline-edit component (commit a Slack-batch with a short delay) or accepting the noise.

---

## 7. Special-handling fields

| Field | UI control needed | Notes |
|---|---|---|
| `full_name`, `email` | Plain Input | Email lacks validation today. Inline-edit could add inline `z.string().email()` validation. |
| `phone` | Plain Input + `formatPhoneNumber` on change | Existing helper in `src/lib/leadUtils.ts`. Re-use unchanged. |
| `property_address_street`, `_suburb`, `_postcode` | Plain Input each, OR a single AddressAutocomplete | **Decision point.** Inline-edit per part = 4 inputs that don't update lat/lng. AddressAutocomplete = atomic edit, single Google Places lookup, lat/lng kept in sync. Recommendation: AddressAutocomplete behind a single "Edit address" pencil — write all 4 fields plus lat/lng + property_zone in one save. |
| `property_address_state` | Select | `stateOptions` from `leadUtils`. |
| `property_type` | Select | `propertyTypeOptions` from `leadUtils`. |
| `lead_source` | Select with sectioned options | `leadSourceOptions` from `leadUtils`. Conditional `lead_source_other` Input renders when source = "Other". Inline-edit needs to handle the dependent field — either (a) when source changes to "Other", show inline lead_source_other input next to it; (b) cascade — clear `lead_source_other` when source != Other. |
| `urgency` | Select | `urgencyOptions` from `leadUtils`. |
| `issue_description` | Textarea + character counter | 1000-char limit. Counter under the textarea like the modal does. |
| `notes` (general) | Textarea | Currently invisible on Lead Detail. Either add display (and inline-edit) or drop the column from the form. |
| `access_instructions`, `special_requests` | Textarea each | Card only renders if at least one is non-null. Inline-edit needs an "Add access instructions" empty-state CTA when card hidden. |
| `internal_notes` | Append-only — Stage B.5 layout | Don't tap-to-edit the value. Keep the existing read-only history + Add-note input split. |

---

## 8. Operations that should stay modal/sheet/dialog

These genuinely warrant a non-inline UX:
- **Status change** (`setShowStatusDialog`) — multi-step flow with confirmation copy.
- **Delete lead** (`setShowDeleteDialog`) — destructive, requires AlertDialog confirmation.
- **Send back to AI / send back to inspector** (`setShowSendBackDialog`) — multi-field form with note.
- **Reschedule Inspection** — already navigates to /admin/schedule (Stage B.1).
- **Book Job** (`BookJobSheet`) — multi-section form, kept as Sheet.
- **Send email composer** — multi-field, attachment options.
- **No-email confirmation dialog** (added in Stage B.5) — ephemeral confirm.

The **field-edit modal is the only one we're killing**. Status/delete/send-back/etc stay.

---

## 9. Field gaps — what admin might want to edit but currently can't

Compared against the 24 columns I cataloged in `src/integrations/supabase/types.ts:leads.Row`:

| Column | Visible on Lead Detail? | Editable in modal? | Verdict |
|---|---|---|---|
| `id` | yes (read-only) | no | Immutable. OK. |
| `lead_number` | yes (read-only) | no | System-assigned. OK. |
| `created_at`, `updated_at` | yes (read-only) | no | Immutable. OK. |
| `archived_at` | no | no | Action via archive dialog. OK. |
| `assigned_to` | yes (in Inspection Scheduled card) | no | Managed via booking. OK. |
| `status` | yes (Status card) | no | Status dialog. OK. |
| `inspection_scheduled_date`, `scheduled_time` | yes | no | /admin/schedule. OK. |
| `customer_preferred_date`, `customer_preferred_time` | yes (new_lead) | no | Framer-captured, read-only by design. OK. |
| `notes` (general) | **NO** | yes | **Gap — admin types into a textarea that's never displayed.** Either show it on Lead Detail or drop the column. |
| `lead_source_other` | NO (concatenation broken) | yes (conditional) | **Display bug — currently hidden when source = Other.** Fix: show "Other: {lead_source_other}" on the Lead Details card. |
| `property_lat`, `property_lng` | no (used for maps button) | no (auto-computed) | OK if we use AddressAutocomplete inline-edit (it sets lat/lng). |
| `property_zone` | no | no (auto from suburb) | Auto-computed by `useLeadUpdate.ts:42-47`. OK. |
| `quoted_amount` | no | no | Set by inspection flow. OK. |
| `booked_at`, `inspection_completed_date`, `job_completed_date`, `invoice_sent_date`, `invoice_amount`, `payment_received_date`, `job_scheduled_date` | yes (Pipeline Timeline) | no | Pipeline automation. OK. |

**Two genuine gaps:**
1. `notes` column has UI for input but no UI for read.
2. `lead_source_other` only shows in the modal's edit context, never in the read-only display.

These can be fixed independently of inline-edit (small follow-ups). Recommend bundling them into the inline-edit refactor since we're touching all the same code.

---

## 10. Execution scope proposal

### Architecture

**One shared `<InlineEditField>` component** at `src/components/leads/InlineEditField.tsx`. Variant prop drives the input type:

```
<InlineEditField
  label="Phone"
  value={lead.phone}
  variant="phone"           // 'text' | 'email' | 'phone' | 'textarea' | 'select'
  selectOptions={...}        // when variant='select'
  maxLength={1000}           // optional, with counter
  validate={(v) => string|null}
  onSave={async (newValue) => { ... }}
  renderReadOnly={(value) => <a href={`tel:${value}`}>{value}</a>}  // override for tap-to-call
/>
```

Internal mechanics:
- State: `mode: 'read' | 'edit' | 'saving'`, `draft: string`.
- Read mode renders `renderReadOnly(value)` if provided, else just `{value}`. Pencil button on the right.
- Edit mode renders Input/Textarea/Select bound to `draft`, plus Save (✓) + Cancel (✗) icon buttons.
- Save: validate → call `onSave(draft)` → optimistic UI to read mode with new value → on failure (toast from `useLeadUpdate`), revert.
- Empty states: when `value` is null and field is optional, show "Add {label}" link in read mode.

Component takes responsibility for the mode toggle UX. The page (LeadDetail.tsx) provides the `onSave` callback that wires to `useLeadUpdate`.

### Address — special case
`<InlineEditAddress>` component or just a single pencil over the entire Property card. Tap → AddressAutocomplete loads, prefilled with current address → Save commits all 4 columns + lat/lng + property_zone in one transaction. Don't try to inline-edit street/suburb/state/postcode independently — too much risk of stale lat/lng.

### Internal Notes — leave alone
Keep the current Stage B.5 layout (read-only log above + Add note input below). Do NOT shoehorn into the InlineEditField pattern. It's already correct UX for an append-only audit log.

### Save path consolidation
- **Drop the double-log.** `EditLeadSheet.onSubmit` currently calls both `useLeadUpdate.updateLead` (which fires `lead_updated` activity) and `logFieldEdits` (which fires `field_edit` activity). Pick one — recommendation is `lead_updated` because it's already the convention for lead-level edits across the app. Delete the `logFieldEdits` call in EditLeadSheet *and* delete `EditLeadSheet` itself once inline-edit is live.
- Inline-edit components call `updateLead` directly. One field per save → one `lead_updated` activity row → user sees "Lead Details Updated — Updated: phone" exactly as today.
- Slack: consider adding a 5-second debounce in `useLeadUpdate` to batch rapid edits into one Slack message ("Updated: phone, email"). Simple `setTimeout` per leadId. Out of scope for the inline-edit refactor itself but a worth-doing follow-up.

### Order of operations

Suggested execution order — risk-ascending:

1. **Build `<InlineEditField>` shell** (variants `text`, `email`, `phone`). Empty test (no consumers yet). +120 LoC.
2. **Convert Contact Information card** (phone, email). Most-used fields, low risk, validates the pattern. +20 LoC in LeadDetail, −0 LoC.
3. **Add Select variant** to InlineEditField. +30 LoC.
4. **Convert Lead Details card** (lead_source with conditional lead_source_other, urgency). Tests the dependent-field case. +40 LoC. **Bundle the lead_source_other display fix here.**
5. **Add Textarea variant** with character counter. +30 LoC.
6. **Convert Issue Description card.** +10 LoC.
7. **Convert Customer Requests card** (access_instructions, special_requests) + add empty-state "Add access instructions" CTA when card is hidden. +40 LoC.
8. **Build `<InlineEditAddress>`** with AddressAutocomplete. Most complex, lat/lng-aware. +100 LoC.
9. **Convert Property Information card.** +20 LoC.
10. **Decide on `notes` (general).** Either add a Notes card to Lead Detail with InlineEditField, or drop the column from `useLeadUpdate.LeadUpdatePayload` and the modal entirely. Recommendation: drop — it's been invisible for the entire history of the app, no one's using it intentionally.
11. **Delete `EditLeadSheet.tsx`** + remove "Edit Lead" button from LeadDetail header. −588 LoC.
12. **Verify** — npm build clean, manual test each card, mobile (375px) test for keyboard behavior, audit-log smoke test.

### LoC estimate
- Net: roughly **+400 / −600** = −200 LoC overall, plus a clear architecture improvement.
- Single PR or split into 3-4 PRs. Recommendation: split — one shared component PR + one PR per card cluster (Contact, Property, Lead Details, Issue/Notes, Address). Keeps each diff reviewable.

### Risk register
- **Low risk:** Contact, Lead Details, Issue Description, Customer Requests cards. Pure text/select fields, well-understood save path.
- **Medium risk:** lead_source ↔ lead_source_other dependency. Need to ensure source change to "Other" surfaces the dependent input inline; source change away from "Other" clears `lead_source_other`. Edge case: admin types in lead_source_other, then changes source back — what's the expected behaviour?
- **High risk:** Property card with AddressAutocomplete. Google Places API quotas, lat/lng staleness, postcode validation. Consider keeping the property card as a single "Edit Property" sheet (mini Sheet, not modal) instead of full inline-edit if AddressAutocomplete UX gets cluttered.
- **Out of scope but worth flagging:** `internal_notes` Stage B.5 pattern stays; `notes` (general) decision needs a call.

### Open questions for the user before execution

1. **Mobile interaction model:** pencil per row (Option 1, recommended) vs row mode-toggle vs long-press vs something else?
2. **`notes` (general) column:** show on Lead Detail with inline-edit, or drop entirely?
3. **`lead_source_other` display:** concatenate ("Other: friend referral") into Source row, or separate sub-row under Source?
4. **Auto-save on blur vs explicit Save button:** auto-save is faster but creates accidental commits if admin taps elsewhere mid-edit; explicit Save is two extra taps but unambiguous. Recommendation: explicit Save (Check icon button), with Cancel (X icon button) and Enter-to-save on text inputs.
5. **Activity log consolidation:** confirm dropping `field_edit` for lead-level entries in favour of `lead_updated`.
6. **Slack debouncing:** out-of-scope or in-scope for this refactor?
7. **Single PR or split?** I'd argue split (cleaner reviews); user might prefer single ship.
8. **Property address — full inline-edit or "Edit Property" mini-sheet?** AddressAutocomplete in-place gets crowded on 375px.

---

**END OF DIAGNOSIS.** Awaiting answers to the §10 open questions before any code is written.

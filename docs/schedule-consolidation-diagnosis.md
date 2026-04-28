# Schedule / BookInspectionModal Consolidation — Diagnosis

**Date:** 2026-04-28
**Author:** Claude (read-only investigation)
**Status:** STAGE A REPORT — read-only. No edits made. Awaiting "proceed to stage B".

---

## TL;DR

The Schedule page right-hand sidebar (`LeadsQueue` → `LeadBookingCard`) is the canonical inspection booking UI; `BookInspectionModal` is a 789-line parallel implementation. **Three things stand in the way of straight-deletion:**

1. **`useLeadsToSchedule` reads the wrong columns post-PR #39.** The sidebar is currently blind to `customer_preferred_date` / `customer_preferred_time` — it pulls `inspection_scheduled_date` / `scheduled_time` and surfaces them as "preferred." After PR #39's backfill those source columns are NULL for new leads, so Nardine and the other 4 backfilled leads show no preference indicator at all.
2. **The Stage 4 modal pre-fill bug is real and isolated.** Modal pre-fills `formData.inspectionDate` but never populates `availableSlots`, so every slot fails `availableSlots.includes(slot.time)` and renders disabled. Sidebar does not have this bug. **Deleting the modal fixes it for free.**
3. **`TechnicianJobDetail.tsx` also mounts `BookInspectionModal`.** Technicians cannot reach `/admin/schedule` (admin-only `RoleProtectedRoute`). This is a hidden caller the brief did not anticipate. **Decision required before Stage B.**

---

## 1. Architecture map — Schedule page

### Page composition (`src/pages/AdminSchedule.tsx`, 249 lines)

```
AdminSchedule (route: /admin/schedule, admin-only)
├── ScheduleHeader (week nav, technician filter, day picker)
├── Event-type filter pills (All / Inspections / Jobs)
├── ScheduleCalendar  ← left panel, 70% on desktop
│   └── ScheduleDailyView (mobile fallback)
├── LeadsQueue        ← right panel, 30% on desktop ("To Schedule" sidebar)
│   ├── compact card + BookJobSheet     (for status='job_waiting' leads)
│   └── LeadBookingCard                  (for status='new_lead'|'hipages_lead' leads, expandable)
├── EventDetailsPanel (popup on calendar click)
└── Mobile FAB → Sheet wrapping LeadsQueue
```

### Sidebar lead loading

- **Hook:** `useLeadsToSchedule` (`src/hooks/useLeadsToSchedule.ts`, 195 lines).
- **Query:**
  ```sql
  SELECT id, status, lead_number, full_name, phone, email,
         property_address_*, property_type, issue_description, lead_source,
         inspection_scheduled_date, scheduled_time, created_at
  FROM leads
  WHERE
    (status IN ('new_lead', 'hipages_lead') AND assigned_to IS NULL)
    OR status = 'job_waiting'
  AND archived_at IS NULL
  ORDER BY created_at DESC
  ```
- **Polling:** 60s refetch interval; 30s stale time.
- **Persistence:** None. Sidebar shows whatever matches the predicate at fetch time. Expanded card state (`expandedLeadId`) is local React state in `LeadsQueue.tsx` and resets on remount.

### Lead Management → Schedule navigation

`src/pages/LeadsManagement.tsx:479-481`:

```ts
const handleSchedule = (id: string | number) => {
  navigate('/admin/schedule');
};
```

The lead `id` is **discarded**. Admin lands on `/admin/schedule` and has to manually find the right card in the queue. **No deep-linking exists today.**

### Lead Detail → Schedule navigation

`src/pages/LeadDetail.tsx:510` (renderPrimaryCTA, case `new_lead`):

```ts
onClick={() => setShowRescheduleModal(true)}
```

Opens the modal in-place. Doesn't navigate.

`src/pages/LeadDetail.tsx:1350` (Reschedule button, shown when `inspection_waiting`):

```ts
onClick={() => setShowRescheduleModal(true)}
```

Same modal, same state.

---

## 2. Sidebar fields currently displayed

`LeadBookingCard` (`src/components/schedule/LeadBookingCard.tsx`, 1280 lines).

### Collapsed header
- `lead.fullName`
- `lead.suburb` · `lead.propertyType` · `lead.timeAgo`
- **One-line preference indicator**: `Prefers DD/MM at HH:mm` (line 435-443) — **reads `lead.preferredDate` / `lead.preferredTime`, which are sourced from `inspection_scheduled_date` / `scheduled_time` per `useLeadsToSchedule:106-107`.** Wrong column post-PR #39.

### Expanded body, in order:
1. **Step 1: Address Validation** — Google Places autocomplete + zone calc + lat/lng save
2. **Notes from Enquiry** — displays `lead.issueDescription` (read-only)
3. **Lead Info quick-edit** — name / phone / email / brief description / lead source (uses `useLeadUpdate`)
4. **Step 2: Scheduling** (gated until address confirmed)
   - Est. Duration (numeric input, 30–480 min, defaults 60)
   - Assign Technician (button grid, fetches recommendations on select)
   - Recommended Days (top 3 cards w/ travel info, slot count, preferred-time feasibility flag)
   - Customer-preferred-time hint pill (when selectedDate matches preferredDate)
   - Inspection Date (`<input type="date">`)
   - Time Slot (`<select>`, options gated by recommendation if one is selected)
   - Travel Info Panel (live `useBookingValidation.checkAvailability` result)
   - Warning banner when buffer < 0
   - **Internal Notes textarea** — NEW input for booking notes (NOT display of existing `lead.internal_notes`)
   - View Lead / Book Inspection buttons

### Missing vs Lead Detail's render
- ❌ **Customer's Preferred Time CARD** with disclaimer "Not yet confirmed — call to schedule" (Lead Detail lines 1115-1146). Sidebar only has the tiny one-line "Prefers DD/MM at HH:mm" on the collapsed header — and it's reading the wrong column.
- ❌ **Internal Notes display** of existing `lead.internal_notes` column (Lead Detail lines 1384-1401). Sidebar's "Internal Notes" input is for the *new* booking, not display of prior notes.

---

## 3. Sidebar booking save path

`LeadBookingCard.handleBookInspection` → `bookInspection()` in `src/lib/bookingService.ts:75-227`.

Side effects:
- **Insert** `calendar_bookings` row: `event_type='inspection'`, `start_datetime`, `end_datetime`, `assigned_to`, `status='scheduled'`, `description=internalNotes||null`, `location_address`
- **Update** `leads`:
  ```ts
  status: 'inspection_waiting',
  inspection_scheduled_date: <admin choice>,
  scheduled_time: <admin choice>,
  assigned_to: technicianId,
  internal_notes: internalNotes || null,   // ⚠️ overwrites existing column
  ```
- **Insert** `activities` row (type `inspection_booked`)
- **Invalidate** queries: `leads`, `lead`, `calendar-events`, `schedule-calendar`, `unscheduled-leads`, `leads-to-schedule`
- **Fire-and-forget**: Slack notification (`event: 'inspection_booked'`), customer email (`buildBookingConfirmationHtml`)

`BookInspectionModal.handleSubmit` (lines 247-372) duplicates this logic *inline* — it does NOT call `bookInspection()`. Same writes (calendar_bookings + leads + activities), same notifications, but a separate code path. Both target the same DB result.

**Pre-existing bug (out of scope for this consolidation but flag-worthy):** `bookingService.ts:144` writes `internal_notes: internalNotes || null` unconditionally. If admin types nothing in the booking textarea, **existing `lead.internal_notes` get nulled out**. This bug already exists in production via `LeadBookingCard`. Adding the internal_notes display to the sidebar makes the bug more visible — admin will see notes that the next save silently destroys.

---

## 4. Modal callers — exhaustive list

| # | File:line                              | Trigger                                               | Notes                                                |
|---|----------------------------------------|-------------------------------------------------------|------------------------------------------------------|
| 1 | `src/pages/LeadDetail.tsx:1650`         | `showRescheduleModal` opened by:                      | Two open paths.                                      |
|   |                                         | • L510 — `new_lead` "Schedule Inspection" CTA         |                                                      |
|   |                                         | • L1350 — `inspection_waiting` "Reschedule Inspection"|                                                      |
| 2 | `src/pages/TechnicianJobDetail.tsx:838` | `showScheduleModal` opened by:                        | **Hidden caller — technician role, can't access /admin/schedule.** |
|   |                                         | • L741 — "Reschedule Inspection" button on inline panel|                                                     |
|   |                                         | • L788 — "Reschedule" button on bottom mobile bar     |                                                      |
| 3 | `src/components/booking/LeadsToBook.tsx:247` | Component is **dead code**                       | Exported from `src/components/booking/index.ts:5` but never imported anywhere. 264 LoC of dead code. |

Other matches in grep (false positives — not actual mounts):
- `src/lib/bookingService.ts:73` — comment ("Extracted from BookInspectionModal for reuse")
- `src/hooks/useTechnicians.ts:70` — comment ("same as BookInspectionModal")

---

## 5. Delete blast radius

### Files to delete outright
- `src/components/leads/BookInspectionModal.tsx` (789 LoC)
- `src/components/booking/LeadsToBook.tsx` (264 LoC, dead component) — should be deleted regardless of this work

### Files to edit (admin path)
- `src/pages/LeadDetail.tsx`:
  - Remove import (line 63)
  - Remove `showRescheduleModal` state (line 134)
  - Remove modal mount (lines 1650-1660)
  - Update CTA onClick (line 510) → `navigate('/admin/schedule?lead=' + lead.id)`
  - Update Reschedule onClick (line 1350) → same nav
- `src/pages/LeadsManagement.tsx`:
  - Update `handleSchedule` (lines 479-481) → include lead id in URL: `navigate('/admin/schedule?lead=' + id)`
- `src/components/booking/index.ts`:
  - Remove line 5 export `LeadsToBook`

### Files to edit (sidebar enrichment)
- `src/hooks/useLeadsToSchedule.ts`:
  - Add `customer_preferred_date`, `customer_preferred_time`, `internal_notes` to the SELECT (lines 53-71)
  - Add `customerPreferredDate`, `customerPreferredTime`, `internalNotes` (the existing column, distinct from the booking textarea state) to `LeadToSchedule` interface (lines 11-30)
  - Map them in the transform block (lines 92-111)
  - Stop sourcing `preferredDate`/`preferredTime` from `inspection_scheduled_date`/`scheduled_time` — those are no longer customer prefs post-PR #39
- `src/components/schedule/LeadBookingCard.tsx`:
  - Replace the tiny one-liner indicator (lines 435-443) with a proper "Customer's Preferred Time" card mirroring Lead Detail lines 1115-1146 (with disclaimer)
  - Pre-fill `selectedDate`/`selectedTime` from `lead.customerPreferredDate`/`customerPreferredTime` (lines 99-100) instead of `preferredDate`/`preferredTime`
  - Add a read-only "Internal Notes" display block for `lead.internalNotes` (existing column), separate from the existing booking-time textarea — or rename/restructure to avoid the column-overwrite bug surfacing visibly
- `src/pages/AdminSchedule.tsx`:
  - Read `?lead=` query param via `useSearchParams`
  - Pass to `LeadsQueue` as a prop, e.g. `<LeadsQueue technicians={...} initialExpandedLeadId={...} />`
  - On mobile: auto-open the FAB sheet when a lead is in the URL
- `src/components/schedule/LeadsQueue.tsx`:
  - Accept `initialExpandedLeadId` prop, default-open that card on mount
  - If lead exists in result set → expand it; if not → keep current behaviour (collapsed list)

### Cosmetic comment cleanup (nice-to-have, not required)
- `src/lib/bookingService.ts:73` — comment references the modal; can be updated or left
- `src/hooks/useTechnicians.ts:70` — comment references the modal; can be updated or left

### NOT in delete scope
- `src/lib/bookingService.ts` — `bookInspection()` is the canonical save path, used by `LeadBookingCard`. KEEP.
- `src/components/booking/AddressAutocomplete.tsx` — used by `Profile.tsx` and was used by the modal. KEEP.

---

## 6. Slot availability gate — the screenshot mystery, solved

### `BookInspectionModal` (the buggy one)

Slot rendering (lines 552-574, 582-604):
```tsx
{ALL_TIME_SLOTS.filter(s => s.period === 'morning').map((slot) => {
  const isAvailable = availableSlots.includes(slot.time);
  // ...
  className={cn(
    isSelected ? "bg-blue-600 text-white" :
    isAvailable ? "bg-gray-100 hover:bg-blue-100 hover:text-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
  )}
})}
```

Slots are populated by:
- `handleManualDateChange` (line 213-215): sets `availableSlots = ALL_TIME_SLOTS.map(s => s.time)`
- `handleRecommendedDateSelect` (line 199-200): sets `availableSlots = rec.available_slots`

**The Stage 4 customer-preferred pre-fill effect (lines 143-152):**
```tsx
useEffect(() => {
  if (open && customerPreferredDate) {
    setFormData(prev => ({
      ...prev,
      inspectionDate: customerPreferredDate,
      inspectionTime: customerPreferredTime || "",
    }));
    setShowManualDatePicker(true);
    // ⚠️ NEVER calls handleManualDateChange or sets availableSlots
  }
}, [open, customerPreferredDate, customerPreferredTime]);
```

Pre-fill writes to `formData.inspectionDate` directly via `setFormData` instead of going through `handleManualDateChange`. `availableSlots` stays at its initial empty array, so every slot fails `availableSlots.includes(slot.time)` and renders `disabled` + `line-through`. **Exactly matches the screenshot.**

### `LeadBookingCard` (sidebar — does NOT have this bug)

`getTimeSlots()` (line 338-346):
```ts
const getTimeSlots = () => {
  if (selectedRecDate) {
    const rec = recommendations.find((r) => r.date === selectedRecDate);
    if (rec?.available_slots?.length) {
      return TIME_SLOTS.filter((slot) => rec.available_slots.includes(slot.time));
    }
  }
  return TIME_SLOTS;   // ← default: ALL slots available
};
```

If no recommendation is selected, ALL slots are available. Different design entirely. **No screenshot bug here.**

### Verdict

Bug is modal-only. Sidebar logic is structurally different. Deleting the modal eliminates the bug. No fix needed in the sidebar.

---

## 7. Deep-linking design recommendation

| Mechanism                           | Pros                                                                 | Cons                                                                 |
|-------------------------------------|----------------------------------------------------------------------|----------------------------------------------------------------------|
| **Query string `?lead={id}`**       | No route change. Works with browser back. Easy mobile-FAB auto-open. | Slightly less RESTful.                                               |
| Route param `/admin/schedule/:leadId` | Cleaner URL semantics.                                              | Requires `:leadId?` optional segment in App.tsx route. More plumbing.|

### Recommendation: **query string** `/admin/schedule?lead={id}`

Why:
- No existing convention to follow (`LeadsManagement.handleSchedule` discards the id today; nothing to be backwards-compatible with)
- App.tsx route stays as-is (`<Route path="/admin/schedule" ...>` — line 100-109)
- `useSearchParams()` from React Router gives clean access; no regex parsing
- Multiple optional context params can be added later (e.g., `?lead=X&date=Y`) without route surgery
- Mobile FAB sheet auto-open is a one-liner: `useEffect(() => { if (leadId) setMobileQueueOpen(true); }, [leadId])`

---

## 8. Other observations / rot

1. **`LeadsToBook.tsx` is dead code** (264 LoC). Exported from `src/components/booking/index.ts:5` but no consumer imports `LeadsToBook` anywhere. Was likely a prior iteration of the schedule sidebar. Should be deleted regardless of this work.

2. **`bookInspection()` overwrites `lead.internal_notes` unconditionally** (`bookingService.ts:144`). If admin types nothing in the booking textarea, existing internal notes get nulled. This is a pre-existing production bug that affects every booking through `LeadBookingCard` today. **Out of scope for this consolidation, but flag for follow-up.** Adding an internal-notes display to the sidebar will make the bug visually obvious (read displayed notes → save booking with empty textarea → notes disappear).

3. **`BookInspectionModal.handleSubmit` duplicates `bookInspection()`** (modal lines 247-372 vs `bookingService.ts:75-227`). Same DB writes, same notifications, separate code paths. Will be eliminated by deletion.

4. **`useLeadsToSchedule` query predicate includes `'hipages_lead'`** (line 72) but no other code I read references this status. Possibly a legacy enum value. Worth a check during Stage B but not blocking.

5. **`AdminSchedule.tsx:39-40`** has an empty `if (technicians.length > 0) {}` block — left over from a removed log statement. Cosmetic.

---

## 9. ⚠️ STOP — decision required before Stage B

**`TechnicianJobDetail.tsx` mounts `BookInspectionModal`** to let technicians reschedule a job they've already had assigned to them (lines 741, 788, 838-849). Three options:

| Option | Description                                                                 | Cost                                              | Risk                                                |
|--------|-----------------------------------------------------------------------------|---------------------------------------------------|-----------------------------------------------------|
| **A**  | Keep `BookInspectionModal.tsx` alive, used ONLY by `TechnicianJobDetail`. Admin path consolidates to `/admin/schedule`. | Low. ~5 lines of edits in LeadDetail; modal stays. | Two booking UIs (one per role); modal remains in codebase as a smaller surface; pre-fill bug stays for technicians (Stage 4 pre-fill props aren't passed from TechnicianJobDetail today, so the bug doesn't trigger there — but it remains latent). |
| **B**  | Remove the Reschedule capability from `TechnicianJobDetail` entirely. Technicians stop being able to reschedule from their job page; admins only.  | Low. Delete 2 buttons + the modal mount + state. | Behavioural change for technicians. They'd need to call admin or use a different path to reschedule.  |
| **C**  | Build a parallel role-aware sidebar at `/technician/schedule`.              | High. Significant new UI work.                    | Out of scope; expands ticket from "consolidation" to "new feature."                                  |
| **D**  | Relax the `/admin/schedule` role guard so technicians can use it.           | Low.                                              | **Not viable** — admin schedule shows all leads + all technicians + admin-only data.                 |

**My recommendation: Option B** (remove technician-side Reschedule). Reasons:
- Technicians shouldn't typically own scheduling — that's an admin function. CLAUDE.md explicitly says co-owner Glen + Clayton consult on architecture; rescheduling is a workflow decision.
- Smallest surface, cleanest delete.
- If technicians really need to reschedule, a follow-up can build Option C properly later.

But this is a workflow decision, not a technical one. **I will not proceed to Stage B until you choose A, B, or C.**

---

## 10. Recommended order of operations for Stage B

Pending the decision on §9, the rough sequence is:

1. **Hook fix** (must come first or sidebar stays broken):
   - Update `useLeadsToSchedule` to fetch `customer_preferred_date`, `customer_preferred_time`, `internal_notes` and expose `customerPreferredDate`, `customerPreferredTime`, `internalNotes` on `LeadToSchedule`. Stop using the dual-purpose columns as preference signal.

2. **LeadBookingCard enrichment**:
   - Replace one-liner indicator with full "Customer's Preferred Time" card (mirror Lead Detail's design)
   - Add read-only Internal Notes display from `lead.internalNotes`
   - Pre-fill `selectedDate`/`selectedTime` from new `customerPreferredDate`/`customerPreferredTime` fields

3. **Deep-linking**:
   - `useSearchParams` in `AdminSchedule` to read `?lead=`
   - Pass `initialExpandedLeadId` prop down to `LeadsQueue`
   - Auto-expand on mount if id matches a card; auto-open mobile FAB sheet

4. **Wire up entry points**:
   - LeadsManagement `handleSchedule` → `/admin/schedule?lead=${id}`
   - LeadDetail line 510 (Schedule Inspection CTA) → same
   - LeadDetail line 1350 (Reschedule Inspection) → same

5. **Decision-driven step (§9)**:
   - Option A: leave TechnicianJobDetail's modal mount intact
   - Option B: delete the two reschedule buttons + modal mount + state in TechnicianJobDetail
   - Option C: out of scope for this ticket

6. **Modal removal**:
   - Delete `src/components/leads/BookInspectionModal.tsx` (skip if Option A chosen)
   - Delete `src/components/booking/LeadsToBook.tsx` (regardless of A/B/C)
   - Remove import + state + mount in LeadDetail.tsx
   - Remove `LeadsToBook` export from `src/components/booking/index.ts:5`

7. **Verification**:
   - `npm run build` — clean, zero TS errors
   - `grep -rn "BookInspectionModal" src/` — zero hits if Option B/C; only `TechnicianJobDetail.tsx` if Option A
   - `grep -rn "customer_preferred_" src/` — should now include `useLeadsToSchedule.ts` and `LeadBookingCard.tsx`
   - `grep -rn "LeadsToBook" src/` — zero hits

8. **Commit + push** to main; Vercel preview rebuild for user verification at Stage C.

---

**END OF DIAGNOSIS. Awaiting decision on §9 + "proceed to stage B" before any edits.**

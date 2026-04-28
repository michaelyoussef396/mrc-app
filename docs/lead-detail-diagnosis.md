# Lead Detail diagnosis — customer preferred date/time + rendering architecture

**Investigation date:** 2026-04-28 (auto-loaded clock; auto-mode session)
**Test lead:** Nardine Youssef · `8f49753a-6901-44e1-9c12-4d548597ad63` · status `new_lead`
**Symptom:** customer's preferred date/time captured by the Framer form is in the DB but doesn't render on the admin's Lead Detail screen.

This is read-only investigation. No edits, no fixes proposed — describes what is.

---

## Schema layer

### Q1. Date/time columns on the `leads` table

From `information_schema.columns` query against `public.leads`:

| Column | Type | Purpose (per write path) |
|---|---|---|
| `created_at` | timestamptz | row creation |
| `updated_at` | timestamptz | row update |
| `archived_at` | timestamptz | soft-delete timestamp |
| `booked_at` | timestamptz | when admin scheduled the inspection |
| `inspection_scheduled_date` | date | **dual-purpose** — see Q4 |
| `scheduled_time` | text (`"HH:mm"`) | **dual-purpose** — see Q4 |
| `scheduled_dates` | text[] | array form for multi-day jobs |
| `inspection_completed_date` | date | when the inspection completed |
| `job_scheduled_date` | date | when the remediation job is booked to start |
| `job_completed_date` | date | when remediation completed |
| `invoice_sent_date` | date | invoice issuance |
| `payment_received_date` | date | payment received |

There is **no dedicated `customer_preferred_*` column**. The customer-supplied preferred date and time live in `inspection_scheduled_date` and `scheduled_time`.

### Q2. Where does Framer's preferred_date/preferred_time end up?

`supabase/functions/receive-framer-lead/index.ts:653-667` (the lead INSERT):

```ts
const leadRow = {
  full_name: fullName, email, phone,
  property_address_street: street,
  property_address_suburb: suburb,
  property_address_state: 'VIC',
  property_address_postcode: postcode,
  inspection_scheduled_date: preferredDate || null,    // ← customer's preferred date
  scheduled_time: preferredTime || null,               // ← customer's preferred time
  issue_description: issueDescription || null,
  lead_source: 'website',
  status: 'new_lead',
  ...
}
```

Framer's `preferred_date` / `preferred_time` (form field names) are written **into the same columns** that the admin booking flow later writes a confirmed booking to.

### Q3. Where does the admin-confirmed booking end up?

`src/components/leads/BookInspectionModal.tsx:265-279` (the lead UPDATE on save):

```ts
const leadUpdate: Record<string, unknown> = {
  scheduled_time: formData.inspectionTime,
  ...
}
if (...) {
  leadUpdate.status = 'inspection_waiting';
  leadUpdate.inspection_scheduled_date = formData.inspectionDate;
}
await supabase.from('leads').update(leadUpdate).eq('id', leadId);
```

(Plus separate `calendar_bookings` row insert for the actual booking record.)

### Q4. Same columns or different?

**Same columns.** Both Framer (`receive-framer-lead`) and the admin booking flow (`BookInspectionModal`) write to `inspection_scheduled_date` + `scheduled_time`. The columns are dual-purpose: their semantic meaning depends entirely on `lead.status`:

- status = `new_lead` → values are **customer preference** (Framer-captured)
- status = `inspection_waiting` and beyond → values are **confirmed booking** (admin-set)

Side effect: if admin overrides the date during booking, the original customer preference is overwritten and lost — there is no audit-trailed history of what the customer originally requested.

### Q5. Nardine's row values

```sql
SELECT id, full_name, status, created_at,
       inspection_scheduled_date, scheduled_time, scheduled_dates,
       booked_at, inspection_completed_date, job_scheduled_date,
       job_completed_date, invoice_sent_date, payment_received_date
FROM leads WHERE id = '8f49753a-6901-44e1-9c12-4d548597ad63';
```

| Column | Value |
|---|---|
| `full_name` | `nardine youssef` |
| `status` | **`new_lead`** |
| `created_at` | `2026-04-28 07:03:52+00` |
| `inspection_scheduled_date` | **`2026-04-30`** ← customer preference |
| `scheduled_time` | **`09:30`** ← customer preference |
| `scheduled_dates` | null |
| `booked_at` | null |
| `inspection_completed_date` | null |
| `job_scheduled_date` | null |
| `job_completed_date` | null |
| `invoice_sent_date` | null |
| `payment_received_date` | null |
| `updated_at` | `2026-04-28 07:11:45+00` |

The customer's preference IS in the DB. Both columns populated.

---

## Component architecture layer

### Q6. How many distinct components render the lead detail view?

**Three files exist; two are reachable; admins only ever see one in practice.**

| File | LOC | Reachable? | When? |
|---|---|---|---|
| `src/pages/LeadDetail.tsx` | **1877** | yes | **route `/leads/:id`** (admin) and `/technician/job/:id` (technician) — `App.tsx:399, 312` |
| `src/components/leads/NewLeadView.tsx` | **910** | yes | rendered by `LeadDetail.tsx:450-479` when status is `new_lead` OR `inspection_waiting` (early-return short-circuit) |
| `src/pages/NewLeadView.tsx` | 591 | **orphan** | route `/lead/new/:id` exists in `App.tsx:387` but **no caller** — `grep -rn '/lead/new/' src/` returns only the route definition itself |

LeadsManagement always navigates to `/leads/:id` (`src/pages/LeadsManagement.tsx:181, 185, 232`). So `src/pages/NewLeadView.tsx` is dead code reachable only by manually typing the URL.

Other lead-detail-adjacent components (modals/cards mounted *inside* the two main views, not standalone routes):
- `BookInspectionModal.tsx` (761) — booking UI
- `BookJobSheet.tsx` (956) — job booking sheet
- `EditLeadSheet.tsx` (534) — inline edit drawer
- `InspectionDataDisplay.tsx` (821) — read-only inspection data block
- `InspectionReportHistory.tsx` (236) — past PDFs list
- `InvoicePaymentCard.tsx` (597), `InvoiceSummaryCard.tsx` (321), `JobBookingDetails.tsx` (217), `JobCompletionEditSheet.tsx` (328), `JobCompletionSummary.tsx` (815), `LeadCard.tsx` (678), `PipelineTabs.tsx` (73), `CreateLeadCard.tsx` (46), `CreateNewLeadModal.tsx` (859)

### Q7. Does routing dispatch on status?

**The router does not.** App.tsx routes are simply `/leads/:id → LeadDetail`. Status-based dispatch happens **inside** `LeadDetail.tsx` via an early return:

```ts
// src/pages/LeadDetail.tsx:449-479
// Render dedicated view for new leads and inspection_waiting
if (lead.status === "new_lead" || lead.status === "inspection_waiting") {
  return (
    <div className="min-h-screen bg-gray-50">
      <NewLeadView
        lead={lead}
        onStatusChange={handleChangeStatus}
        onRefetch={() => refetch()}
        technicianName={techProfile?.full_name || undefined}
      />
      {/* Reuse existing delete + status dialogs */}
      <AlertDialog ...>...</AlertDialog>
    </div>
  );
}
```

Import: `src/pages/LeadDetail.tsx:62` → `import { NewLeadView } from "@/components/leads/NewLeadView";`

So for **two specific statuses** (`new_lead`, `inspection_waiting`), `LeadDetail` short-circuits and delegates to a different component (`NewLeadView` from `components/leads/`). For every other status, the full 1877-line `LeadDetail.tsx` body runs.

This is the architectural seam where Nardine's lead falls into a different render path than the rest.

### Q8. What renders per status?

Mapped from `src/pages/LeadDetail.tsx` and `src/components/leads/NewLeadView.tsx`:

| Status | Component | Headline UI elements |
|---|---|---|
| `new_lead` | NewLeadView | "New Lead Received" badge; Contact, Property, Issue Description, Internal Notes, Triage results, Schedule Inspection CTA. **NO Scheduled Inspection card** (gated `isScheduled`). |
| `hipages_lead` | LeadDetail | Full LeadDetail tree (no early return) |
| `inspection_waiting` | NewLeadView | "Waiting on {tech} — {date}, {time}" badge; "Scheduled Inspection" card with date+time+technician (line 727 onwards); Reschedule + Start Inspection CTAs |
| `inspection_ai_summary` | LeadDetail | "Inspection Scheduled" card (line 1299) renders if `inspection_scheduled_date` set; AI summary actions |
| `approve_inspection_report` / `inspection_email_approval` | LeadDetail | + InspectionReportHistory card; Approve/email PDF actions |
| `job_waiting` | LeadDetail | + JobBookingDetails card |
| `pending_review` / `job_completed` | LeadDetail | + JobCompletionSummary card |
| `job_report_pdf_sent` | LeadDetail | + InvoiceSummaryCard (line 1700: `if (lead.status === 'job_report_pdf_sent') return <InvoiceSummaryCard …/>`) |
| `invoicing_sent` / `paid` | LeadDetail | + InvoicePaymentCard with payment-tracking row; "Mark as paid" actions |
| `paid` | LeadDetail | + Send-Google-review CTA (line 1484) |
| `google_review` | LeadDetail | + Finish-lead CTA (line 1489) |
| `finished` | LeadDetail | + finished badge (line 1494) |
| `closed` / `not_landed` / `archived` | LeadDetail | LeadDetail with archive metadata |

There are 14 occurrences of `lead.status` checks within `LeadDetail.tsx` (`grep -c lead.status`) — most are conditional card visibility, two are early returns/dispatch.

### Q9. Fields that exist on the table but never render on Lead Detail UI

Spotted while greping the LeadDetail tree:

- `lead.urgency` — rendered (`LeadDetail.tsx:1237`)
- `lead.property_type` — rendered (`LeadDetail.tsx:1186`)
- `lead.special_requests` / `lead.access_instructions` — rendered (`LeadDetail.tsx:1348`)
- `lead.is_possible_duplicate` / `lead.possible_duplicate_of` — **not rendered anywhere on the lead detail page**, despite being set by `receive-framer-lead`
- `lead.lead_source_other` — rendered conditionally (`NewLeadView.tsx:230`)

For the symptom in question: `lead.inspection_scheduled_date` and `lead.scheduled_time` ARE referenced — but only conditionally — see Q12.

### Q10. Hacky branching patterns

Yes, several:

1. **Cross-component early-return dispatch** at `LeadDetail.tsx:450`. Re-routes two statuses (`new_lead`, `inspection_waiting`) into a 910-line sibling component. Everything else falls through to LeadDetail's 1877-line render tree. This is the highest-cost branch — anyone editing "the lead detail page" has to remember to edit two unrelated files.
2. **Mid-render bare returns** at `LeadDetail.tsx:1700`: `if (lead.status === 'job_report_pdf_sent') return <InvoiceSummaryCard …/>`. A status check returning JSX from inside a render helper function. Easy to miss when adding a new status.
3. **`isScheduled` boolean inside `NewLeadView`** (`NewLeadView.tsx:234`) flips the entire header CTA block (`Schedule` ↔ `Reschedule + Start Inspection`) and gates the "Scheduled Inspection" card (line 727). The boolean is `lead.status === "inspection_waiting"` — so for `new_lead` it's false, no card.
4. **Dual-purpose columns** semantically driven by `status` (Q4). `inspection_scheduled_date` means different things in `new_lead` vs `inspection_waiting` vs `inspection_ai_summary`. Renderers have to understand the status to label the value correctly ("Customer prefers" vs "Confirmed for").
5. **Duplicate display logic across files**: `scheduledDateDisplay` formatter is in `NewLeadView.tsx:237`, similar `formatDate(lead.inspection_scheduled_date)` is in `LeadDetail.tsx:1315`, and the LeadCard list view has its own `scheduled_time` formatter at `LeadCard.tsx:177`. Three copies of the same intent.
6. **Two `NewLeadView.tsx` files** (Q6) — one orphaned. Adds confusion when grepping; risk that someone edits the wrong copy.

The most consequential is (1): a single early return creates a parallel rendering universe for new leads.

---

## Combined diagnosis

### Q11. What renders on Nardine's Lead Detail (status `new_lead`)

Path: admin clicks Nardine's row in `/admin/leads` → `navigate('/leads/8f49753a…')` (`LeadsManagement.tsx:181`) → React Router mounts `LeadDetail` → `LeadDetail.tsx:450` short-circuits → `NewLeadView` renders.

Cards visible (`NewLeadView.tsx`):
- Header: name, "New Lead Received" badge (no date/time on the badge — `isScheduled=false`), lead ID
- Contact Information (phone, email)
- Property Information (address)
- Issue Description (Framer-captured "testing email preview 2"-style text)
- Internal Notes textarea
- Triage results (recommended technicians ranked by travel time)
- Right-rail action buttons: "Edit Lead" + "Schedule Inspection"

Cards **NOT** visible while `status = new_lead`:
- "Scheduled Inspection" card (gated `isScheduled`, line 727)
- Anything else from the LeadDetail tree (it never runs)

So the `inspection_scheduled_date = '2026-04-30'` + `scheduled_time = '09:30'` Framer captured for Nardine has **zero render surface** on this view.

### Q12. Why isn't the customer's preferred date/time showing for Nardine?

Direct trace:

1. `LeadDetail.tsx:450` — `if (lead.status === "new_lead" || lead.status === "inspection_waiting")` returns early with `<NewLeadView />`. So `LeadDetail.tsx:1299-1345` (the "Inspection Scheduled" green card that renders `formatDate(lead.inspection_scheduled_date)` + `formatTime(lead.scheduled_time)`) is **unreachable for `new_lead` status**.
2. `NewLeadView.tsx:234` — `const isScheduled = lead.status === "inspection_waiting";`. For Nardine (`new_lead`), `isScheduled = false`.
3. `NewLeadView.tsx:237-253` — `scheduledDateDisplay` and `scheduledTimeDisplay` ARE computed (if `inspection_scheduled_date` and `scheduled_time` are set). For Nardine, both are populated and both formatters return non-null strings.
4. `NewLeadView.tsx:347-362` — header badge: only the `isScheduled` branch (line 350) interpolates `scheduledDateDisplay` and `scheduledTimeDisplay`. The `new_lead` branch (line 354-356) shows `"New Lead Received"` with no date/time.
5. `NewLeadView.tsx:727-783` — "Scheduled Inspection" card body that renders `scheduledDateDisplay` (line 745) and `scheduledTimeDisplay` (line 758) is wrapped in `{isScheduled && (...)}`. Doesn't render for `new_lead`.
6. **Nowhere else in `NewLeadView.tsx`** is `scheduledDateDisplay`, `scheduledTimeDisplay`, `lead.inspection_scheduled_date`, or `lead.scheduled_time` rendered to the user. Lines 69-70, 95-96, 129-130, 145-146 are in the inline-edit form state (only visible if admin clicks "Edit Lead" → opens edit fields).

**Therefore:** the customer's preferred date/time is captured, persisted, and gated entirely behind `isScheduled = (status === "inspection_waiting")`. While the lead sits in `new_lead`, the values exist in the DB but have no rendered surface in the read-only view. Admin would only see them by clicking "Edit Lead" (which opens the editable fields holding the same values).

This isn't a bug in the data path — it's a missing render branch. The `NewLeadView` was designed around two states ("not yet scheduled" vs "scheduled"), but Framer-captured customer preference is a third state ("customer suggested a time, admin hasn't confirmed yet") that the UI doesn't have a card for.

---

## Architecture summary (no fixes proposed)

**What exists:**
- One column pair (`inspection_scheduled_date`, `scheduled_time`) holds three semantically-distinct values depending on lead status: customer preference (`new_lead`), confirmed booking (`inspection_waiting`), historical anchor (post-completion).
- One canonical lead detail route (`/leads/:id`) but two rendering trees that serve it depending on status (LeadDetail's 1877-line tree vs NewLeadView's 910-line tree, switched at `LeadDetail.tsx:450`).
- Internal status-conditional rendering inside both trees (14 status checks in LeadDetail, 1 dominant `isScheduled` flag in NewLeadView).
- Dead code: `src/pages/NewLeadView.tsx` + the orphan `/lead/new/:id` route.

**What's missing for the symptom:**
- A render surface in NewLeadView for the customer-preference case (status `new_lead`, columns populated). Currently the "Scheduled Inspection" card body is content-ready but its container is locked to `isScheduled` only.

**Cleanest architectural shape** (per your prompt — describing only, not proposing):
- One Lead Detail component, status-conditional sections rendered from a single render tree
- Either dedicated `customer_preferred_date` + `customer_preferred_time` columns kept separate from the booking columns, or a clear convention where the same columns are labelled differently in UI based on status
- Eliminate the early-return dispatch at `LeadDetail.tsx:450` so there's no parallel-universe rendering tree
- Delete the orphan `src/pages/NewLeadView.tsx` and `/lead/new/:id` route

The symptom you reported is fixable two ways: (a) one-line render addition inside `NewLeadView.tsx` to drop the `isScheduled` gate (or add a sibling card for the `new_lead` case), or (b) a larger consolidation that removes the LeadDetail/NewLeadView split entirely. Both are within reach; deciding between them is the next call.

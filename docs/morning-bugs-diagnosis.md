# Morning Bugs — Diagnosis (Bug 1 + Bug 2)

**Date:** 2026-04-29
**Production tip:** `76712d8` (PR #41 merge)
**Status:** READ-ONLY INVESTIGATION. No edits, no DB writes. Awaiting fix authorization.

---

## TL;DR

- **Bug 1 — Internal Notes pencil missing on Lead Detail. CONFIRMED REGRESSION introduced by Stage E** (commit `1ba3ab9`). The Stage B.5 split (read-only log + add-note input) was supposed to migrate from EditLeadSheet to LeadDetail when EditLeadSheet was deleted. Only the read-only half made it. Pure read-only `<Card>` at `src/pages/LeadDetail.tsx:1498-1515`. Admin cannot append notes via Lead Detail at all. **P0** — breaks the core append-only contract advertised in the walkthrough Section 3.3 + 12. Fix is small: ~30 LoC.

- **Bug 2 — Schedule page crashes after status reversion. CONFIRMED data integrity issue.** `handleChangeStatus` at `LeadDetail.tsx:347-381` ONLY updates `status` — leaves `assigned_to`, `inspection_scheduled_date`, `scheduled_time`, and the `calendar_bookings` row intact. Nardine's row is now in an impossible state: `status='new_lead'` AND `assigned_to=<tech>` AND `inspection_scheduled_date='2026-04-29'` AND a live `calendar_bookings` row. `MRC-2026-0004` (the lead from last night's data-loss diagnosis) is in the same state. **P1** — bad bug, rare trigger (admin-initiated revert), but the data integrity issue is real and produces user-visible crashes. Without a browser console / Sentry trace I cannot pin the exact crashing line — recommendation in §Bug-2 is two-pronged (atomic state revert + defensive render).

---

## BUG 1 — Internal Notes pencil missing on Lead Detail

### Quoted JSX (production code, `src/pages/LeadDetail.tsx:1498-1515`)

```tsx
{/* Internal Notes - shown when present */}
{lead.internal_notes && (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base flex items-center gap-2">
        <StickyNote className="h-4 w-4" />
        Internal Notes
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="p-3 bg-slate-50 rounded-lg border">
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
          {lead.internal_notes}
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

### Audit checklist

| Check | Result |
|---|---|
| Pencil button present? | **No.** No `<Pencil>` icon, no `<Button>`, no edit affordance of any kind. |
| Input/textarea for new entries? | **No.** Card renders only `<p>` with the existing log value. |
| `<InlineEditField>` used? | **No.** Card uses raw JSX, not the Stage E component. |
| Conditional render gate? | `{lead.internal_notes && ...}` — card disappears entirely when `internal_notes` is null. Even the empty-state CTA is missing. |

### Verdict

**Stage E regression confirmed.** When Stage E deleted `EditLeadSheet.tsx`, the Stage B.5 "Add internal note" textarea (which lived inside the sheet at `EditLeadSheet.tsx:468-486` per the prior commit) was deleted along with it. Stage E converted the other Lead Detail cards to `<InlineEditField>` but left the Internal Notes card as a pure read-only display.

User-impacting consequence: **the only writers to `internal_notes` post-Stage-E are the Schedule sidebar booking save (booking-call note) and `TechnicianJobDetail.handleSaveNotes`** (technician-side). Admin cannot directly add an internal note via Lead Detail. The Stage E plan explicitly said "Internal Notes card: STAYS as read-only-log + 'Add note' pattern from Stage B.5" — only the read-only half stayed.

Cross-check: the Stage E commit description at `1ba3ab9` says: *"Internal Notes (Stage B.5 pattern) preserved unchanged — Read-only history block + 'Add internal note' textarea."* That commit message is **inaccurate**; only the read-only block was preserved. The "Add internal note" textarea was lost.

### Where TechnicianJobDetail still works

`grep -rn "Add internal note" src/` returns one hit:
- `src/pages/TechnicianJobDetail.tsx:718` — labelled "Add internal note", the Stage B.5 textarea pattern is intact there. Tech-side append still functional.

So the fix is to mirror the TechnicianJobDetail pattern onto LeadDetail (or use `<InlineEditField>` with a textarea variant configured for append behaviour).

### Recommended fix shape

Two paths, in order of cleanness:

**Option A — Mirror TechnicianJobDetail's split pattern verbatim.** ~30 LoC.

```tsx
{/* Internal Notes — read-only log + Add note input */}
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-base flex items-center gap-2">
      <StickyNote className="h-4 w-4" />
      Internal Notes
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* Existing log — read-only history */}
    {lead.internal_notes ? (
      <div className="rounded-md border bg-slate-50 p-3 max-h-64 overflow-y-auto">
        <p className="text-sm whitespace-pre-line leading-relaxed">{lead.internal_notes}</p>
      </div>
    ) : (
      <div className="rounded-md border border-dashed bg-slate-50/50 p-3">
        <p className="text-sm italic text-muted-foreground">No internal notes yet.</p>
      </div>
    )}

    {/* Add note — appends a new dated entry via appendInternalNote */}
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Add internal note</Label>
      <Textarea
        value={newNoteDraft}
        onChange={(e) => setNewNoteDraft(e.target.value)}
        rows={3}
        placeholder="New entry — saved with timestamp and your name…"
      />
      {newNoteDraft.trim() && (
        <Button onClick={handleAddNote} disabled={isAddingNote}>
          {isAddingNote ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Add Note
        </Button>
      )}
    </div>
  </CardContent>
</Card>
```

`handleAddNote` calls `appendInternalNote(lead.internal_notes, draft, { authorName })` and routes through `useLeadUpdate`. Author chain identical to all other Stage B.5 sites: `profile?.full_name?.trim() || user?.email || 'Unknown user'`.

**Option B — Extend `<InlineEditField>` with a `textarea-append` variant.** ~50 LoC including helper extension.

Tradeoff: A is faster, B is architecturally cleaner. Recommendation is **A** — the append-only Internal Notes UX is sufficiently different from the field-overwrite UX that bundling into `<InlineEditField>` complicates the component without much reuse benefit. Same call the Stage B.5 plan made.

### Files that need touching for Bug 1

- `src/pages/LeadDetail.tsx` — replace lines 1498-1515 with the Option A block, plus add `newNoteDraft`/`isAddingNote` state and `handleAddNote` function.
- No helper file changes (the `appendInternalNote` helper at `src/lib/utils/internalNotes.ts:25` already does what's needed).

### Bug 1 priority

**P0.** Admin's primary path for capturing call-back context, follow-up instructions, and special notes is broken. The walkthrough Section 3.3 explicitly documents this as working. Workaround (admin opens Schedule sidebar booking flow just to add a note) is hostile UX and depends on the lead being in `new_lead`/`hipages_lead`/`job_waiting` status.

---

## BUG 2 — Schedule page crash after status reversion

### Database state for Nardine (`8f49753a-6901-44e1-9c12-4d548597ad63`)

```
status:                     new_lead              ← reverted
assigned_to:                d22fa3bb-9bf0-...     ← STILL SET (not cleared on revert)
inspection_scheduled_date:  2026-04-29            ← STILL SET
scheduled_time:             10:00                 ← STILL SET
customer_preferred_date:    2026-04-30
customer_preferred_time:    09:30
booked_at:                  null
internal_notes:             "testing internal notes "
updated_at:                 2026-04-28 11:07:22+00
```

**`calendar_bookings` row STILL ACTIVE for this lead:**
```
id:             b861af01-55f5-4f1e-a747-6eaa700c47bc
event_type:     inspection
start_datetime: 2026-04-29 00:00:00+00            ← today's calendar
end_datetime:   2026-04-29 01:00:00+00
status:         scheduled                         ← NOT cancelled
description:    "testing internal notes "
created_at:     2026-04-28 11:04:21+00
```

**Activity log timeline:**
```
2026-04-28 11:07:23  status_change       "Status changed to NEW — Lead moved from AWAITING to NEW"   ← the revert
2026-04-28 11:04:22  inspection_booked   "Scheduled to michael youssef for 29 Apr 2026 at 10:00 AM"
2026-04-28 11:03:46  lead_updated        "Updated: lead source"
2026-04-28 11:03:43  lead_updated        "Updated: phone"
2026-04-28 07:11:45  lead_updated        "Updated: internal notes"
```

### Root cause — `handleChangeStatus` is status-only

`src/pages/LeadDetail.tsx:347-381`:

```ts
const handleChangeStatus = async (status: LeadStatus) => {
  const currentConfig = STATUS_FLOW[lead.status as LeadStatus];
  const { error } = await supabase
    .from("leads")
    .update({ status })          // ← ONLY status. Nothing else cleared.
    .eq("id", lead.id);

  if (error) { ... }

  await supabase.from("activities").insert({ ... });
  sendSlackNotification({ event: 'status_changed', ... });

  toast.success(`Status updated to ${STATUS_FLOW[status].shortTitle}`);
  refetch();
};
```

The `.update({ status })` payload contains literally only the status column. No clearing of `assigned_to`, no clearing of `inspection_scheduled_date`/`scheduled_time`, no cancellation of the `calendar_bookings` row. Status reversion produces an inconsistent state.

### Other affected leads — incident scope

```
MRC-2026-0004 (last night's diagnosis subject):
  status='new_lead', assigned_to=d22fa3bb..., inspection_scheduled_date=2026-02-24, scheduled_time=08:00,
  customer_preferred_date=null, customer_preferred_time=null

MRC-2026-0139 (Nardine — today's incident):
  status='new_lead', assigned_to=d22fa3bb..., inspection_scheduled_date=2026-04-29, scheduled_time=10:00,
  customer_preferred_date=2026-04-30, customer_preferred_time=09:30
```

**Two leads currently in the broken state.** Both have non-null `assigned_to` despite `status IN ('new_lead', 'hipages_lead')`.

Important behavioural side-effect: `useLeadsToSchedule` (`src/hooks/useLeadsToSchedule.ts:74`) filters with:
```
.or('and(status.in.(new_lead,hipages_lead),assigned_to.is.null),status.eq.job_waiting')
```

Both broken leads have `assigned_to` non-null AND `status='new_lead'` — so they **fail the filter and are silently excluded from the Schedule sidebar's "To Schedule" queue**. Admin cannot see them in the queue at all. Deep-linking `?lead={id}` will not auto-expand them because they aren't in the result set.

Meanwhile their `calendar_bookings` rows ARE returned by `useScheduleCalendar` (`src/hooks/useScheduleCalendar.ts:141-258`), so the calendar grid still shows the booking events tied to leads that ostensibly aren't booked. **This is the inconsistency the crash is about.**

### Where the crash actually fires — UNKNOWN without browser trace

I cannot pin the exact line that throws without a browser console or Sentry trace. `error_logs` table has no rows since `2026-04-28 22:00:00+00` (this morning) — the application's Sentry-side logging didn't capture the crash. Possible reasons:

1. The error boundary swallows the throw without writing to `error_logs`.
2. The crash is actually a Suspense / lazy-load failure (chunk fetch failure on a state mismatch), which manifests as the generic "Something went wrong" UI but isn't routed through `captureBusinessError`.
3. Sentry SDK on prod is initialised but the network round-trip didn't land in `error_logs` (it goes to Sentry's hosted service, not our Postgres).

### Three working hypotheses for the crash line

1. **`useScheduleCalendar` join shape mismatch.** When admin clicks "Schedule Inspection" on Lead Detail (which navigates to `/admin/schedule?lead={id}`), the page mounts. The calendar query at `useScheduleCalendar.ts:146-168` joins `calendar_bookings` with `leads (id, full_name, property_address_suburb, property_address_postcode)`. The join itself is plain. The transform at `:224-256` is also straightforward. **Unlikely to throw.**

2. **`new Date(booking.start_datetime)` on a malformed value.** If `start_datetime` were ever null or a malformed string, `new Date('Invalid')` would produce `Invalid Date`, and downstream `.toISOString()` / `.getTime()` calls on it would throw. Nardine's `start_datetime='2026-04-29 00:00:00+00'` is well-formed though. **Unlikely.**

3. **Cross-render assumption that a booked lead appears in the sidebar.** Some component might assume that if a `calendar_bookings` row exists, its lead is also in `useLeadsToSchedule`'s result set. With the data inconsistency, that assumption breaks. The component might dereference an undefined lookup and throw. **Most likely.**

I cannot verify (3) further without:
- A browser console screenshot showing the stack trace
- OR a Sentry web UI session with access to the app's project
- OR a local repro (I can stand up the dev server and reproduce, but that requires user authorization)

### Recommendation: defensive code IS NOT ENOUGH — fix the data model

Even if I add try/catch guards everywhere a `useLeadsToSchedule` lead might be missing, the underlying problem (admin-initiated state reversion produces an invalid state) will keep biting. Two-pronged fix:

**Fix A — Atomic state reversion.** When admin reverts status from a post-booking status (`inspection_waiting`, `inspection_ai_summary`, `approve_inspection_report`, `inspection_email_approval`, `job_*`, `paid`, etc.) to a pre-booking status (`new_lead`, `hipages_lead`), `handleChangeStatus` should:
1. Clear `assigned_to`
2. Clear `inspection_scheduled_date` and `scheduled_time`
3. Clear `booked_at`
4. Cancel any active `calendar_bookings` row tied to the lead (`status='cancelled'`)
5. Append an activity log entry: `"Lead reverted from <status> to <status> — booking state cleared"`

`customer_preferred_date`/`customer_preferred_time` stay (those are read-only customer-supplied data, not booking state).

This is the architecturally correct fix. Status flow becomes honest: `assigned_to IS NOT NULL` ⇒ a booking exists.

**Fix B — Defensive code in render components.** Add guards in:
- `useScheduleCalendar` transform: skip events whose lead is `null` or doesn't have the expected shape
- `LeadBookingCard`: guard `lead.preferredDate + 'T00:00'` constructions against weird strings
- Anywhere we compute via `new Date(x)` and then call methods on it: guard with `isNaN(d.getTime())` checks

This is a wider blast-radius defensive sweep; pairs well with Fix A but doesn't replace it. **Recommend doing both.**

Migration to repair the existing 2 broken leads:

```sql
-- Run AFTER deploying Fix A so that future reverts are atomic.
-- This cleans up the historical inconsistencies for MRC-2026-0004 and MRC-2026-0139.
UPDATE calendar_bookings
SET status = 'cancelled'
WHERE lead_id IN (
  '8f49753a-6901-44e1-9c12-4d548597ad63',
  '7f34f40f-f54f-4177-8dda-b8d108233a72'
)
  AND status = 'scheduled';

UPDATE leads
SET assigned_to = NULL,
    inspection_scheduled_date = NULL,
    scheduled_time = NULL,
    booked_at = NULL
WHERE id IN (
  '8f49753a-6901-44e1-9c12-4d548597ad63',
  '7f34f40f-f54f-4177-8dda-b8d108233a72'
);
```

Once cleaned up, both leads appear correctly in the Schedule sidebar's "To Schedule" queue, deep-linking from Lead Detail's "Schedule Inspection" CTA works, and admin can rebook them as fresh new_leads.

### Files that need touching for Bug 2

- `src/pages/LeadDetail.tsx:347-381` — `handleChangeStatus` rewritten to detect post-booking → pre-booking reversion and clear the booking state atomically. Probably ~40 LoC change.
- `src/hooks/useScheduleCalendar.ts:224-256` — defensive guards in the transform if we go with Fix B alongside.
- A new migration file for the cleanup SQL (one-time fix, retained in `supabase/migrations/`).

### Bug 2 priority

**P1.** Status reversion is rare but real (cancellations, customer rescheduling drama, admin error correction). When it happens, the data goes inconsistent and the Schedule page becomes unstable for that lead. Two leads in the broken state right now. Not revenue-blocking but a real UX cliff for the admin doing the revert.

---

## What's missing from this diagnosis

1. **The actual crash stack trace.** I have hypotheses but no evidence of the throwing line. Recommend the user reproduce on Vercel preview with browser DevTools open and grab the console error before fix work starts. If Sentry has the production-side trace, that's also fine.

2. **Whether other inconsistent-state combinations exist.** The query I ran only covered post-booking → pre-booking reverts (where `assigned_to` is non-null on `new_lead`/`hipages_lead`). There may be other invalid combinations (e.g., `status='paid'` with no invoice, `status='inspection_waiting'` with no `assigned_to`) that should also be flagged. Out of scope tonight; worth a separate audit pass.

3. **Whether `handleChangeStatus` is the only status-write path.** A grep on `update.*status:` would find any other writers that might also need the same atomic-revert treatment. Quick check is in scope for the fix execution stage, not this diagnosis.

---

## Recommended fix order

1. **Bug 1 first** (P0, ~30 LoC, low risk, fully isolated to LeadDetail Internal Notes card). Restores the append-only contract advertised in the walkthrough.
2. **Bug 2 Fix A** (P1 architectural, ~40 LoC change to `handleChangeStatus` + a one-shot data-cleanup migration). Stops the bleeding.
3. **Bug 2 Fix B** (defensive guards, lower priority). Optional but worth doing in the same PR so the next "weird state" doesn't crash production.

Both bugs ship via the same PR pattern as PRs #39, #40, #41 — cherry-pick onto a branch off `origin/production`, merge with a merge commit. PR #38 stays untouched as always.

---

**END OF DIAGNOSIS.** Standing by for fix authorization. Will not proceed until told. Production is stable for users not exercising the two specific paths (Internal Notes append + status reversion).

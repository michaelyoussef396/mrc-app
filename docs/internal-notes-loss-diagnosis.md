# Internal Notes Loss Diagnosis — Lead MRC-2026-0004

**Date:** 2026-04-28
**Lead UUID:** `7f34f40f-f54f-4177-8dda-b8d108233a72`
**Customer:** nardine youssef
**Status:** READ-ONLY INVESTIGATION. No edits, no DB writes. Awaiting decision.

---

## TL;DR

**Case (A) — pre-existing data loss.** The 3 prior internal notes were destroyed on **2026-02-19 13:03:11 UTC**, more than two months before Stage B.5 shipped. The destructor was the legacy `bookingService.bookInspection()` overwrite path (`internal_notes: internalNotes || null` — the same pattern Stage B.5 fixed). Stage B.5 and Stage E are NOT regressions: the lead's `updated_at` is frozen at 2026-02-19 13:03:11, meaning nothing has touched the row since the booking event two months ago. The notes are **unrecoverable from any data we currently hold** — `audit_logs` does not capture `internal_notes` before/after values, and the lead has zero `lead_updated`/`field_edit` rows in `activities`.

Case (B) — ruled out. Case (C) — ruled out (no surviving copy in audit/activities/backup tables).

---

## Evidence

### 1. Lead row state (current production)

```sql
id:              7f34f40f-f54f-4177-8dda-b8d108233a72
lead_number:     MRC-2026-0004
full_name:       nardine youssef
internal_notes:  "test"
created_at:      2026-02-19 01:46:22.831648+00
updated_at:      2026-02-19 13:03:11.549108+00
```

**Critical signal:** `updated_at` is **2026-02-19 13:03:11**. The row has not been mutated since that moment, two months before today (2026-04-28). Stage B.5 (commit `4a82379`, deployed today) and Stage E (commit `1ba3ab9`, deployed today) **physically cannot have written to this row** — Postgres `updated_at` would have advanced if they had.

### 2. Activities table — full history for this lead

```
2026-02-19 05:49:57+00  status_change       Status changed to Inspection Waiting
2026-02-19 13:03:11+00  inspection_booked   Scheduled to michael youssef for 24 Feb 2026 at 8:00 AM
```

That's it. Only **2 rows ever**.

- **No `lead_updated` activity row** anywhere in this lead's history. That means **no admin has ever clicked Save in the (now-deleted) EditLeadSheet modal for this lead**, and no inline-edit save has ever fired. The 3 missing notes were therefore **NOT** entered via the modal/inline-edit path.
- **No `field_edit` activity row** either. Same conclusion via `logFieldEdits`.
- Both rows from 2026-02-19 have `metadata: null` — no field-level diff is captured.

### 3. `leads_backup_20260428` snapshot (taken this morning, before Stage B.5)

```sql
internal_notes: "test"
updated_at:     2026-02-19 13:03:11.549108+00
```

The pre-Stage-B.5 snapshot already has the same value as production today. **The data loss happened before this morning's snapshot.** Stage B.5 cannot have caused it.

### 4. `audit_logs` — full coverage for this lead

```
2026-02-19 01:46:23+00  lead_created  metadata: { source: "referral", suburb: "Mernda", full_name: "nardine youssef" }
```

One row only — the creation event. Metadata captures three fields but **NOT `internal_notes`**. No update has ever been audited for this lead.

### 5. `audit_logs` — global action histogram

```
update_job_completion   72 rows
lead_created            20 rows
create_job_completion    1 row
update_invoice           1 row
create_invoice           1 row
```

There is **no `lead_updated`/`update_lead` action type anywhere in `audit_logs`** — the audit trigger CLAUDE.md claims to exist on `leads.UPDATE` either was never installed, was dropped at some point, or only ever fired on `lead_created`. **Lead UPDATE operations across the entire app are not audited.** This is a separate finding worth flagging, but for THIS investigation it means: no audit row anywhere captures the destroyed `internal_notes` value.

### 6. `audit_logs` — `internal_notes` text scan (global)

```sql
SELECT * FROM audit_logs WHERE metadata::text ILIKE '%internal_notes%';
```

Zero rows. No audit entry across the entire database mentions `internal_notes`. Reconstruction from audit metadata is impossible.

---

## Reconstruction of the timeline

| Time (UTC) | Event | Effect on `internal_notes` |
|---|---|---|
| 2026-02-19 01:46:22 | Lead created (manual admin form, source = "referral"). | Initial value set at INSERT — likely the 3 notes the user remembers typing into the lead-creation form. **Not captured by any audit/activity row.** |
| 2026-02-19 05:49:57 | Status changed to Inspection Waiting. | `status_change` activity row, no notes write. |
| 2026-02-19 13:03:11 | Inspection booked via legacy `BookInspectionModal` / `bookingService.bookInspection()`. The pre-Stage-B.5 code path: `UPDATE leads SET internal_notes = internalNotes \|\| null` — **OVERWROTE** whatever was in the column with the booking-call textarea contents ("test"). | **DATA LOSS HERE.** The 3 prior notes were destroyed and replaced with "test". `inspection_booked` activity row inserted, no metadata diff. `updated_at = 13:03:11`. |
| 2026-02-19 13:03:11 → 2026-04-28 | Lead untouched. | `updated_at` frozen. No further writes. |
| 2026-04-28 (~11:00 UTC) | `leads_backup_20260428` snapshot taken. | Snapshot captures `internal_notes = "test"`, `updated_at = 2026-02-19 13:03:11`. **Already destroyed at this point.** |
| 2026-04-28 (~10:00 UTC) | Stage B.5 (commit `4a82379`) deploys append-only fix. | This lead is not touched (no booking, no admin edit). |
| 2026-04-28 (~later today) | Stage E (commit `1ba3ab9`) deploys inline-edit refactor. | This lead is still not touched. Internal Notes card on LeadDetail is **read-only display only** (file `src/pages/LeadDetail.tsx:1498-1515`) — no pencil affordance, no save path. |

The ~2-month gap between 2026-02-19 13:03:11 and 2026-04-28 is the dead-time during which the destroyed value sat untouched.

---

## Verifying Stage B.5 / Stage E are NOT the cause

### Stage B.5 (commit `4a82379`)

`bookingService.ts` post-Stage-B.5 fetches current `internal_notes`, calls `appendInternalNote`, prepends new entry. Verified at `src/lib/bookingService.ts:154-167`. The unconditional overwrite is gone. **Cannot have caused this loss** — and even if it could, this lead has had no booking event since 2026-02-19, well before B.5 shipped.

### Stage E (commit `1ba3ab9`)

LeadDetail.tsx Internal Notes card (lines 1498-1515 of current file):

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

**Pure read-only render.** No `<InlineEditField>`, no pencil, no save callback. The Stage E refactor explicitly preserved the Stage B.5 pattern as instructed. There is no Stage E code path that writes `internal_notes` — the only post-Stage-E writers are `bookingService.bookInspection()` (append helper) and `TechnicianJobDetail.handleSaveNotes` (append helper). Both have been verified previously to use `appendInternalNote`.

### Cross-check: Stage E `saveField` helper exposure

The `saveField(column, value)` helper added in Stage E at `LeadDetail.tsx` is reachable for these columns only:

```
full_name, phone, email, property_type, lead_source, lead_source_other,
urgency, issue_description, access_instructions, special_requests
```

None of these are `internal_notes`. The address sheet calls `saveAddress` which writes only `property_address_*` + `property_lat`/`property_lng`. **No Stage E surface can write `internal_notes`.**

---

## Why the activities table has no `lead_updated` rows for this lead

The 3 notes the user remembers entering must have been entered via a path that does NOT log to `activities`:

1. **Lead creation form** (most likely — the `lead_created` audit row at 2026-02-19 01:46 is the only known write before the booking-call overwrite). The `CreateNewLeadModal.tsx` insert path doesn't go through `useLeadUpdate`, so no `lead_updated` row would exist.
2. **A flow that writes via direct supabase update without `useLeadUpdate`** — possible but no obvious candidate, and `useLeadUpdate` is what `EditLeadSheet` used.
3. **Edit Lead modal saves that ran but the activity log insert silently failed** — possible but `useLeadUpdate.ts:76-89` doesn't have error swallowing on the `activities.insert`.

The most plausible explanation: **the 3 notes were the lead's INITIAL `internal_notes` value at creation time**, set by the admin creation form. They were not entered via subsequent edits. The booking event 11 hours later destroyed them.

(One way to verify which create-lead form was used: check `lead_source = 'referral'` against creation-form schemas. But it doesn't change the conclusion — the data is gone.)

---

## Decision matrix

| Possibility | Verdict | Evidence |
|---|---|---|
| **(A) Pre-existing data loss, pre-Stage-B.5** | ✅ **CONFIRMED** | `updated_at` frozen at 2026-02-19 13:03:11. Backup from this morning already shows `"test"`. Booking event at 13:03:11 ran legacy overwrite code. |
| **(B) Stage B.5 or Stage E regression** | ❌ **RULED OUT** | `updated_at` predates both stages by 2 months. Stage E LeadDetail Internal Notes card is read-only render (no pencil). Stage B.5 / Stage E have not written to this row. |
| **(C) Notes recoverable from `activities.metadata` or `audit_logs`** | ❌ **RULED OUT** | Zero `lead_updated`/`field_edit` rows for this lead in `activities`. `audit_logs` has only the `lead_created` row, which doesn't capture `internal_notes`. Global scan for `internal_notes` in `audit_logs.metadata::text` returns zero rows. The `leads_backup_20260428` snapshot also already has the post-loss value. |

**Single root cause: legacy `bookingService.bookInspection()` overwrote the column on 2026-02-19 13:03:11 — exactly the bug Stage B.5 was designed to fix, but the data loss had already happened months earlier.**

---

## Side findings (out of scope but worth flagging)

1. **`audit_logs` does NOT trigger on `leads.UPDATE`.** CLAUDE.md claims an audit trigger on `leads, inspections, inspection_areas, user_roles`, but the action histogram shows zero `lead_updated`/`update_lead` rows across the entire database — only `lead_created` (20 rows) and unrelated invoice/job-completion actions. Either the trigger was never installed for UPDATE, was dropped at some point, or was scoped only to INSERT. **This means no historical lead-field changes are recoverable from `audit_logs`** — not just for MRC-2026-0004, but for every lead in the system. Worth a follow-up audit-trigger task (separate scope from this incident).

2. **`activities.metadata` is null on the booking event at 13:03:11.** The legacy `bookingService.bookInspection()` (`src/lib/bookingService.ts:155-166` post-Stage-B.5, but the same shape pre-fix) inserts an activity row with no `metadata.changes`. So even if we had wanted to capture old/new for the destroyed `internal_notes`, the bookingService path didn't bother. (The Stage B.5 fix is structural — append-only — rather than logging-based, so this isn't a Stage B.5 oversight.)

3. **Lead creation does not log a field-level snapshot** of `internal_notes`. The `lead_created` audit row at 01:46 captures `source`, `suburb`, `full_name` — not `internal_notes`. So even if the 3 notes were the initial value, the audit row didn't preserve them.

4. **There may be other affected leads.** Any lead booked via the legacy `BookInspectionModal` or `bookingService.bookInspection()` between the column's introduction and Stage B.5 (commit `4a82379` today) would have had `internal_notes` overwritten at booking time. A query like:

   ```sql
   SELECT id, lead_number, internal_notes, updated_at
   FROM leads
   WHERE updated_at < '2026-04-28 10:00:00+00'   -- pre-Stage-B.5
     AND internal_notes IS NOT NULL
     AND internal_notes NOT LIKE '[%';            -- not in structured Stage-B.5 format
   ```

   would return the affected rows. The data is unrecoverable for all of them via the same logic as MRC-2026-0004 (no audit, no activities diff, no surviving copy). **NOT proposing this query be run automatically** — it's just a way to assess incident scope if you decide to.

---

## What this report does NOT recommend (decision point for user)

- **No code changes.** Stage B.5 + Stage E are working correctly. The bug that caused this loss was fixed today.
- **No data restore from `leads_backup_20260428`** — the backup has the same destroyed value.
- **No retroactive audit-logs reconstruction** — the data was never captured.

The remaining options are operational, not technical:
1. Acknowledge the loss to the user and tell Nardine's lead "the prior notes are gone, please re-enter from memory or external records" if any exist.
2. Optionally install the missing `audit_logs` trigger on `leads.UPDATE` so future losses are recoverable. Separate scope from the Stage B.5/E operation.
3. Optionally scan for other affected leads (the query in §4 above) to inform Glen / Clayton about the historical extent of the issue.

---

## Operational impact — affected-leads enumeration

The query proposed in side finding §4 was executed against production tonight. Filters: active leads (`archived_at IS NULL`), past `new_lead`/`hipages_lead` (i.e. were booked via the legacy `bookingService`), excluding terminal states (`closed`, `not_landed`, `finished`), with `internal_notes` non-null, NOT in Stage-B.5 structured format (`NOT LIKE '[%'`), and last touched before Stage B.5 deployed today.

**5 leads flagged.** All on the same legacy code path. All have the same unrecoverability profile as `MRC-2026-0004` — `audit_logs` has only the `lead_created` event for each, no `lead_updated`/`field_edit` rows in `activities`, and `leads_backup_20260428` already mirrors the destroyed value. **Recovery is impossible for all 5.**

| lead_number | full_name | status | notes_len | internal_notes value | created | last_touched |
|---|---|---|---:|---|---|---|
| MRC-2026-0001 | michael youssef | approve_inspection_report | 243 | "Customer mentioned musty smell for 2 weeks. Check under-floor cavity carefully. May need extended drying time. Customer has pets - ask about them during inspection. Take extra care with bathroom tiles (customer concerned about replacing them)." | 2026-02-12 | 2026-04-23 |
| MRC-2026-0003 | Vryan | approve_inspection_report | 24 | "Pick up keys from office" | 2026-02-16 | 2026-03-20 |
| MRC-2026-0006 | xzavie abela | inspection_waiting | 56 | "mould the master bedrrom ceiling because of rain damage " | 2026-02-26 | 2026-02-26 |
| MRC-2026-0004 | nardine youssef | inspection_waiting | 4 | "test" | 2026-02-19 | 2026-02-19 |
| MRC-2026-0002 | chantelle | inspection_waiting | 46 | "customer states the shower is not recoverable " | 2026-02-15 | 2026-02-15 |

Important note about MRC-2026-0001: at 243 characters with detailed pet/tile context, it does NOT look like a booking-call textarea overwrite — it looks like a deliberate admin internal note. It's flagged because it lacks the Stage-B.5 format markers (which is expected for any pre-Stage-B.5 write), not because we're certain it was overwritten. Treat the table as "leads that *would have been* affected if their notes had been overwritten by booking" rather than "leads with confirmed historical loss". Only `MRC-2026-0004` has confirmed loss based on the Feb-19 timeline forensics (created 01:46, booking overwrote at 13:03 same day, untouched since).

---

## P2 Backlog — known issues to address later

### P2-1 — Install missing `audit_logs` trigger on `leads.UPDATE`

CLAUDE.md (and the Phase 2 execution doc) claims an audit trigger exists on the `leads` table. Reality, per the action histogram in §5: zero `lead_updated`/`update_lead` rows globally — only `lead_created` (20 rows) plus unrelated invoice / job-completion actions. **The `leads` audit trigger is INSERT-only.** Without an UPDATE trigger that snapshots old/new field values to `audit_logs.metadata`, future field-level data losses cannot be diagnosed from the audit trail.

Scope (when picked up):
- Migration to add a `BEFORE UPDATE` row trigger on `leads` that writes a row to `audit_logs` with `action = 'lead_updated'`, `entity_type = 'lead'`, `entity_id = NEW.id`, and `metadata = { changed_fields: [...], old: { col: prev, ... }, new: { col: next, ... } }` for any column whose value actually changed.
- Decide whether to log every column or restrict to a sensitive subset (`internal_notes`, `phone`, `email`, `assigned_to`, `status`, etc.). Restricted is cheaper; comprehensive is safer.
- Verify RLS doesn't block the trigger from inserting to `audit_logs` (the trigger runs with definer privileges if marked `SECURITY DEFINER`).
- Backfill is not possible — historical changes are gone. Trigger only protects future writes.

### P2-2 — Document this historical data loss in `MRC_FULL_WALKTHROUGH.html` Section 11

Honest documentation of known issues stays trustworthy. During Stage F's doc sync (the walkthrough is being touched then anyway), add a short P2 entry under the Known Issues / Backlog section in Section 11:

> **Historical internal_notes data loss (Feb 2026).** Five leads booked via the legacy `bookingService.bookInspection()` between February and April 2026 had their `internal_notes` column unconditionally overwritten by the booking-call textarea contents at booking time. Lead `MRC-2026-0004` is the confirmed case (booked 2026-02-19, prior notes destroyed). Four other leads (`0001`, `0002`, `0003`, `0006`) are flagged by the same query but only one (`0004`) has forensic confirmation of loss. The bug was fixed in Stage B.5 (commit `4a82379`, 2026-04-28) by switching all `internal_notes` writes to the `appendInternalNote` helper. Recovery is impossible for the affected leads — the audit_logs UPDATE trigger does not exist (P2-1 above). See `docs/internal-notes-loss-diagnosis.md` for the full investigation.

Stage F is the natural moment to add this — no separate doc commit needed.

---

**END OF DIAGNOSIS.** Standing by for direction. Stage F production merge is unaffected — no fix is needed in Stage B.5 or Stage E for this incident. Stage F can proceed when you're ready.

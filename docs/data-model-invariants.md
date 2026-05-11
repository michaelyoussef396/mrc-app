# Data Model Invariants

Invariants that hold across the MRC schema by application discipline rather than DB constraint. Verified at the start of Phase 2 (Stage 2.0.5) and trusted by Phase 3+ RLS policies. Re-verify here whenever code in the listed write paths changes.

---

## inspector_id (snapshot) vs leads.assigned_to (live)

### The invariant

`inspections.inspector_id` is a **snapshot** taken at inspection submission time. Once written, it is **never updated**.

`leads.assigned_to` is the **live current assignment** of a lead to a technician. It is updated freely as admins reassign work.

The two columns can drift over time, and that drift is correct. A lead's `assigned_to` may have been reassigned three times since the inspection was completed; the inspection still records the technician who actually performed it.

### Why this matters

Phase 3 introduces `ai_summary_versions`. Phase 4 introduces `photo_history`. Both have RLS policies that restrict technician access to historical work via `inspections.inspector_id` — i.e. "the technician who originally completed this inspection can read its versions." If `inspector_id` were live (updated to match `assigned_to`), a reassignment would silently revoke a technician's access to inspections they personally completed, AND grant access to whoever happens to hold the current assignment. Wrong both ways.

The snapshot model preserves the right access semantics: technicians keep access to their historical work; lead reassignment changes future work only.

### How the invariant is enforced

Application discipline, verified by code grep:

**Write site 1 — `inspections.inspector_id` is set on insert only:**
- `src/pages/TechnicianInspectionForm.tsx:3276` — `inspector_id: user.id` inside the `inspectionRow` object passed to `.insert()` / `.upsert()` on form submission.

**Write site 2 — offline sync explicitly excludes inspector_id from updates:**
- `src/lib/offline/SyncManager.ts:185–191` — when syncing a queued draft to an existing remote inspection, the sync layer destructures `inspector_id` (and `lead_id`) out of the payload before calling `.update()`:
  ```typescript
  if (draft.remoteInspectionId) {
    // Update existing inspection - remove lead_id and inspector_id from update
    const { lead_id: _l, inspector_id: _i, ...updatePayload } = dbPayload;
    const { error } = await supabase
      .from('inspections')
      .update(updatePayload)
      .eq('id', draft.remoteInspectionId);
  ```

There are no other write sites that touch `inspections.inspector_id`. Confirmed via:

```bash
grep -rn 'inspector_id' src/ supabase/functions/ | grep -v "// " | grep -E "inspector_id\s*[:=]"
```

**Write site for `leads.assigned_to`:**
- `src/lib/bookingService.ts:129` — calendar event creation sets `assigned_to: technicianId`.
- `src/lib/bookingService.ts:150` — admin reassignment updates the lead's `assigned_to`.

These updates happen freely; the column is fully mutable.

### Drift detection

The invariant intentionally allows drift. To distinguish "expected drift" from "broken invariant," verify there is no code path that COMPARES the two columns or attempts to keep them in sync.

```sql
-- Diff query: shows leads where the original inspector and current
-- assignee differ. Non-zero rows are normal — they represent leads that
-- were reassigned after their inspection completed.
SELECT
  i.id AS inspection_id,
  i.inspector_id,
  l.assigned_to AS current_assignee,
  i.created_at AS inspected_at,
  l.updated_at AS lead_last_changed
FROM public.inspections i
JOIN public.leads l ON l.id = i.lead_id
WHERE i.inspector_id IS DISTINCT FROM l.assigned_to;
```

If this query starts returning **zero** rows over a long-running period across many leads, that's a sign someone wrote sync code that violated the invariant. Investigate.

### RLS policies that depend on this invariant

- `inspections` — `Inspectors can view own inspections` policy: `USING (auth.uid() = inspector_id)`. Technicians see inspections they personally completed (snapshot-correct).
- Future Phase 3 — `ai_summary_versions.technicians_see_assigned`: `USING (inspection_id IN (SELECT id FROM inspections WHERE inspector_id = auth.uid()))`. Same model.
- Future Phase 4 — `photo_history.technicians_see_assigned`: same model.

If the invariant breaks, technicians lose access to their historical work and Phase 3/4 access semantics flip. Treat as a high-severity regression.

### Confirmation log

| Date | Verified by | Method | Result |
|---|---|---|---|
| 2026-05-01 | Phase 2 Stage 2.0.5 (Explore agent + manual grep) | Grep `inspector_id`, `assigned_to` across `src/` and `supabase/functions/`; verify no comparison code | Invariant holds — write sites match expected pattern, no drift-detection comparisons found |

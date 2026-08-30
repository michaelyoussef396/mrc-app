# SESSION 2 — CODE SURFACE INVENTORY

**Worktree:** `~/mrc-multi-tech`
**Branch:** `feat/multi-tech-inventory` (clean, up to date with `origin/main`)
**Date:** 2026-08-28
**Mode:** READ-ONLY. No `.ts`/`.tsx` file was modified. This document is the only file created.
**Source of truth:** ripgrep 14.1.1 over the filesystem. No database was queried (that is SESSION 1's job).

---

## CORRECTIONS TO PRIOR ASSUMPTIONS

### 1. The "88 hits across 24 files" figure is wrong in both directions

| Measure | Folklore | Actual |
|---|---|---|
| Hits | 88 | **304 occurrences / 268 matched lines** |
| Files | 24 | **49 files** |

That is **3.0× the claimed occurrence count and 2.0× the claimed file count**, measured strictly against the real technician-assignment column and field names derived in Step 1 — not against a loose "technician" word search.

For calibration, three other counts of the same codebase:

| Scope | Matched lines | Files |
|---|---|---|
| Tier 1 — assignment columns/fields only (**the headline number**) | 268 | 49 |
| Tier 1 + bare `inspector` form field | 278 | 52 |
| Tier 1 excluding the generated `types.ts` | 250 | 48 |
| Broad case-insensitive sweep (`technician\|assigned_to\|inspector\|completed_by`) | 1035 | 113 |

No arrangement of a defensible term list lands on 88/24. The prior analysis was not merely stale — it was scoped to a fraction of the surface.

### 2. The prior analysis was almost certainly `src/`-only, and that hides the worst file

The brief scoped this task to `src/`. Obeying that literally would repeat the original mistake. There are **62 more matched lines in code outside `src/`**, and one of them is the single densest technician file in the repository:

```
$ rg -c -w -e 'assigned_to|assignedTo|assigned_technician|technicianId|technician_id|technicianName|technician_name|inspector_id|inspector_name|completed_by|completedBy|remediation_completed_by|remediationCompletedBy' . -g '!src/**' -g '!node_modules/**' -g '!dist/**' -g '!.git/**'
```

Code (non-doc, non-migration, non-seed) results:

```
./supabase/functions/calculate-travel-time/index.ts:44
./scripts/send-preview-emails.ts:12
./scripts/preview-emails.ts:12
./supabase/functions/send-slack-notification/index.ts:3
./supabase/functions/generate-inspection-pdf/index.ts:3
./supabase/functions/generate-job-report-pdf/index.ts:3
./tests/e2e/pre-merge/leads-pipeline.mobile.spec.ts:1
```

`supabase/functions/calculate-travel-time/index.ts` alone carries **44 matched lines and three separate `.eq('assigned_to', …)` query filters** (lines 739, 1073, 1395). It is the busiest technician-assignment file in the repo and it is invisible to a `src/`-only inventory. Full detail in Step 3, bucket C.

`api/` is clean — verified zero:

```
$ rg -c -i -e 'technician|assigned_to|inspector|completed_by' api
EXIT=1 (1 = no matches)
```

### 3. PR #103 did NOT land per-technician conflict detection

The brief states "PR #103 recently landed per-technician conflict detection." It did not.

```
$ git log --oneline --grep="#103" --all
d0cdd09 Merge pull request #103 from michaelyoussef396/fix/job-conflict-banner-detail

$ git show --stat d0cdd09
    fix: job conflict banner names the day, block and clashing booking

 src/components/leads/BookJobSheet.tsx             | 129 ++++++++++++----------
 src/hooks/useTechnicians.ts                       |   5 +-
 src/lib/__tests__/bookingService.conflict.test.ts |  12 ++
 src/lib/bookingService.ts                         |  24 ++--
 4 files changed, 106 insertions(+), 64 deletions(-)
```

The `bookingService.ts` half of that PR is entirely cosmetic — it changed the conflict *message* from a start time to a start–end range:

```
$ git diff d0cdd09^1 d0cdd09 -- src/lib/bookingService.ts
-      conflictDetails: `Already booked at ${time} (${conflict.title})`,
+      conflictDetails: `Already booked ${start} – ${end} (${conflict.title})`,
```

The actual per-technician filter is over six months old:

```
$ git log --oneline -S ".eq('assigned_to', technicianId)" -- src/lib/bookingService.ts
330310c feat: Production deployment prep — Admin fixes, Edge Functions, E2E verified
   (2026-02-10)
```

What PR #103 *did* add, and which matters to us: a per-day conflict banner listing each clashing day (`data-testid="job-conflict-banner"`), an orphan-technician guard that clears `assignedTo` when the selected id is not in the role-filtered list, and a `setConflictMap({})` reset so a stale verdict is never attributed to a newly-selected technician. All three are single-technician-shaped and all three need reshaping.

### 4. Two of the five "protected" paths in the brief do not exist

```
$ ls -d src/auth
ls: src/auth: No such file or directory

$ ls src/lib/penaltyLadder.ts
ls: src/lib/penaltyLadder.ts: No such file or directory
```

- `src/auth/**` — does not exist. The only auth file is `src/contexts/AuthContext.tsx`.
- `src/lib/penaltyLadder.ts` — does not exist. The real path is **`src/lib/calculations/penaltyLadder.ts`**.

Both are clean regardless (see Step 5), but a freeze list that names paths which do not exist protects nothing.

### 5. `completed_by` does not mean what the product decision assumes

The product decision says "PRIMARY prints as 'completed by'." Today `job_completions.completed_by` is stamped with **whoever opened the job-completion form**, not the lead's assigned technician:

```
$ rg -n 'createJobCompletion' src/hooks/useJobCompletionForm.ts
256:        const row = await createJobCompletion(leadId, inspectionId, user.id)
```

`user.id` is `auth.uid()`. Under two-tech assignment, if the SECONDARY technician fills the form, today's code stamps the **secondary** as "completed by" and the customer-facing job report PDF prints their name. That directly contradicts the decided rule. Detail in Step 3 and Step 6, Wave 5.

---

## STEP 0 — ENVIRONMENT CHECK

```
$ git -C ~/mrc-multi-tech status
On branch feat/multi-tech-inventory
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean

$ git -C ~/mrc-multi-tech branch --show-current
feat/multi-tech-inventory
```

Branch correct, tree clean. Proceeding.

Head of branch:

```
$ git -C ~/mrc-multi-tech log --oneline -5
c47b8ed Merge pull request #110 from michaelyoussef396/feat/auto-caption-bulk-photo-upload
a3e4fda docs(todo): log the stale-PDF banner and raw sentinel captions (AC3, AC4)
f24a3b3 fix(photos): meet the 48px touch target on the on-site before-photo delete
2b723ca docs(todo): log the on-site before-photo provenance heuristic (AC1)
12ed484 feat(photos): derive captions and add bulk upload for job-completion photos
```

> **Note on the working directory.** `~/mrc-app-1` (the session's primary cwd) is on `feat/free-minute-time-picker` with 54 uncommitted files and a *different* `src/lib/bookingService.ts` (440 lines vs 449 here). Every claim below was re-derived from `~/mrc-multi-tech`. Nothing in this document was read from `~/mrc-app-1`.

---

## STEP 1 — ESTABLISHING THE SEARCH TERMS

Derived from two files, not from memory:

1. `src/integrations/supabase/types.ts` — the Supabase-generated types (the authoritative column list)
2. `src/types/inspection.ts` and `src/types/jobCompletion.ts` — the app-side form types

### 1a. Locating the technician columns in the generated types

```
$ rg -n -i -E "technician|assigned|inspector|completed_by|tech_" src/integrations/supabase/types.ts
237:          assigned_to: string
259:          assigned_to: string
281:          assigned_to?: string
594:          additional_info_technician: string | null
617:          inspector_id: string
618:          inspector_name: string | null
677:          additional_info_technician?: string | null
700:          inspector_id: string
701:          inspector_name?: string | null
760:          additional_info_technician?: string | null
783:          inspector_id?: string
784:          inspector_name?: string | null
1043:          completed_by: string
1083:          remediation_completed_by: string | null
1119:          completed_by: string
1159:          remediation_completed_by?: string | null
1195:          completed_by?: string
1235:          remediation_completed_by?: string | null
1423:          assigned_to: string | null
1473:          assigned_to?: string | null
1523:          assigned_to?: string | null
2167:          assigned_by: string | null
2174:          assigned_by?: string | null
2181:          assigned_by?: string | null
2468:      user_role: "admin" | "technician" | "manager"
2649:      user_role: ["admin", "technician", "manager"],
```

Mapping those line numbers onto table boundaries:

```
$ rg -n -E "^      [a-z_]+: \{$" src/integrations/supabase/types.ts
234:      calendar_bookings: {
591:      inspections: {
1021:      job_completions: {
1419:      leads: {
2165:      user_roles: {
```

### 1b. The real column list

| Column | Table | Nullability | Role in assignment |
|---|---|---|---|
| **`assigned_to`** | `leads` | `string \| null` | **THE singular technician pointer. This is the column the junction table replaces.** |
| **`assigned_to`** | `calendar_bookings` | `string` (**NOT NULL**) | Which technician's calendar a booking blocks. |
| `inspector_id` | `inspections` | `string` (NOT NULL) | Who performed the inspection. Set from `auth.uid()` at save. |
| `inspector_name` | `inspections` | `string \| null` | Denormalised display name, printed on the inspection PDF. |
| `completed_by` | `job_completions` | `string` (NOT NULL) | UUID. Resolves to the "completed by" name on the job report PDF. |
| `remediation_completed_by` | `job_completions` | `string \| null` | Free-text name typed by the technician; PDF fallback. |
| `additional_info_technician` | `inspections` | `string \| null` | **Not an assignment field** — free-text notes *for* the technician. Out of scope. |
| `assigned_by` | `user_roles` | `string \| null` | **Not an assignment field** — who granted a role. Out of scope. |

Verified NOT NULL on `calendar_bookings.assigned_to` (Row, Insert and Update blocks all carry it without `| null`):

```
$ sed -n '234,300p' src/integrations/supabase/types.ts
      calendar_bookings: {
        Row: {
          ...
          assigned_to: string
        Insert: {
          ...
          assigned_to: string
        Update: {
          ...
          assigned_to?: string
```

Verified nullable on `leads.assigned_to`:

```
$ sed -n '1419,1425p' src/integrations/supabase/types.ts
      leads: {
        Row: {
          access_instructions: string | null
          archived_at: string | null
          assigned_to: string | null
```

### 1c. App-side field names

```
$ rg -n -i -E "technician|assigned|inspector|completed_by|completedBy|tech" src/types/inspection.ts src/types/jobCompletion.ts
src/types/inspection.ts:31:  /** ID of the photo the technician designated as the primary cover photo ... */
src/types/inspection.ts:57:  inspector: string;
src/types/inspection.ts:131:  additionalInfoForTech: string;
src/types/jobCompletion.ts:41:  remediationCompletedBy: string; // free-text name of who did the work
src/types/jobCompletion.ts:103:  // Section 9: Job Notes (technician)
src/types/jobCompletion.ts:127:  completed_by: string;
src/types/jobCompletion.ts:128:  remediation_completed_by: string | null;
src/types/jobCompletion.ts:202:  remediationCompletedBy: '',
```

### 1d. Discovery sweep — which candidate spellings actually occur

Rather than guess camelCase variants, every candidate was counted:

```
$ rg -o -w -e 'assigned_to|assignedTo|technician_id|technicianId|technician_name|technicianName|inspector_id|inspectorId|inspector_name|inspectorName|completed_by|completedBy|remediation_completed_by|remediationCompletedBy|assigned_technician|assignedTechnician|technicians|TECHNICIANS|assigned_by|inspector|technician|Technician|Technicians' src/ --no-filename | sort | uniq -c | sort -rn
 307 technician
  86 assigned_to
  79 technicianId
  72 Technician
  65 technicians
  32 technicianName
  18 technician_name
  18 inspector
  17 inspector_id
  17 completed_by
  15 inspector_name
  13 assignedTo
  10 Technicians
   9 remediationCompletedBy
   9 remediation_completed_by
   5 assigned_technician
   3 assigned_by
   2 technician_id
   2 completedBy
   1 TECHNICIANS
```

Two spellings were **not** predictable from the schema and would have been missed by a column-name-only search:

**`assigned_technician`** — a UI-layer field with no matching DB column. `LeadsManagement` synthesises it from `assigned_to` + a name map, and `LeadCard` renders it:

```
$ rg -n -w 'assigned_technician' src/
src/pages/LeadsManagement.tsx:403:          assigned_technician: r.assigned_to ? technicianNameMap[r.assigned_to] : undefined,
src/components/leads/LeadCard.tsx:56:  assigned_technician?: string;
src/components/leads/LeadCard.tsx:289:              Awaiting technician{lead.assigned_technician ? `: ${lead.assigned_technician}` : ''}
src/components/leads/LeadCard.tsx:336:            Awaiting on {lead.assigned_technician || 'Technician'}
```

(5 occurrences on 4 lines — line 289 contains it twice. This is why "occurrences" and "matched lines" are reported separately throughout.)

**`technician_id`** — exists, but is **not a database column**. It is the wire field name in the `calculate-travel-time` Edge Function request body:

```
$ rg -n -w 'technician_id' src/
src/hooks/useBookingValidation.ts:233:        technician_id: technicianId,
src/hooks/useBookingValidation.ts:355:              technician_id: technicianId,
```

`inspectorId` and `assignedTechnician` do not exist anywhere (0 hits each).

### 1e. Final term list used for Step 2

```
assigned_to  assignedTo  assigned_technician
technicianId  technician_id  technicianName  technician_name
inspector_id  inspector_name
completed_by  completedBy
remediation_completed_by  remediationCompletedBy
```

Excluded, with reasons stated: `additional_info_technician` (notes for a technician, not an assignment), `assigned_by` (role-grant audit column), bare `technician`/`Technician`/`technicians` (307+72+65 occurrences — overwhelmingly prose, component names, and the `'technician'` role literal; reported separately as the Tier 2 broad sweep), bare `inspector` (the inspection form's display-name field; reported as Tier 1B).

---

## STEP 2 — EXHAUSTIVE GREP

### 2a. Headline totals

```
$ rg -c -w -e 'assigned_to|assignedTo|assigned_technician|technicianId|technician_id|technicianName|technician_name|inspector_id|inspector_name|completed_by|completedBy|remediation_completed_by|remediationCompletedBy' src/ | awk -F: '{s+=$2; f++} END{print "matched_lines="s"  files="f}'
matched_lines=268  files=49

$ rg -o -w -e '<same pattern>' src/ --no-filename | wc -l
occurrences=304
```

# **REAL COUNT: 304 occurrences / 268 matched lines / 49 files in `src/`.**
# **NOT 88 hits / 24 files. The prior figure understates the surface by 3×.**
# **Plus 62 further matched lines in 7 code files OUTSIDE `src/` — including 44 lines and 3 silent query filters in `supabase/functions/calculate-travel-time/index.ts`.**

### 2b. Per-file matched-line counts (all 49)

```
$ rg -c -w -e '<term list>' src/ | sort -t: -k2 -rn
src/components/leads/BookJobSheet.tsx:24
src/integrations/supabase/types.ts:18
src/hooks/useTechnicianStats.ts:16
src/lib/bookingService.ts:15
src/hooks/useTechnicianDetail.ts:15
src/hooks/useBookingValidation.ts:14
src/pages/LeadDetail.tsx:13
src/hooks/__tests__/useBookingValidation.recommendedDates.test.ts:11
src/components/booking/TimeSlotValidator.tsx:10
src/lib/api/notifications.ts:9
src/components/schedule/LeadBookingCard.tsx:9
src/components/leads/JobBookingDetails.tsx:9
src/lib/api/invoices.paidRevenue.test.ts:8
src/hooks/useScheduleCalendar.ts:8
src/lib/api/invoices.ts:7
src/hooks/__tests__/useBookingValidation.checkAvailability.test.ts:6
src/pages/LeadsManagement.tsx:5
src/hooks/useTodaysSchedule.ts:5
src/hooks/useCancelledBookings.ts:5
src/types/jobCompletion.ts:4
src/pages/ViewReportPDF.tsx:4
src/pages/InspectionAIReview.tsx:4
src/pages/AdminDashboard.tsx:4
src/components/leads/LeadCard.tsx:4
src/components/leads/JobCompletionSummary.tsx:4
src/pages/TechnicianInspectionForm.tsx:3
src/lib/utils/fieldLabels.ts:3
src/lib/offline/SyncManager.ts:3
src/lib/api/jobCompletions.ts:3
src/pages/AdminSchedule.tsx:2
src/hooks/useUnassignedLeads.ts:2
src/hooks/useTechnicianJobs.ts:2
src/hooks/useJobCompletionForm.ts:2
src/components/job-completion/Section2Summary.tsx:2
src/templates/job-report-template.html:1
src/pages/TechnicianJobDetail.tsx:1
src/lib/api/inspections.ts:1
src/lib/api/__tests__/notificationsFanOut.test.ts:1
src/lib/__tests__/bookingService.conflict.test.ts:1
src/hooks/useTechnicianAlerts.ts:1
src/hooks/useRevisionJobs.ts:1
src/hooks/useLeadsToSchedule.ts:1
src/hooks/useAdminDashboardStats.ts:1
src/components/schedule/ScheduleHeader.tsx:1
src/components/schedule/EventDetailsPanel.tsx:1
src/components/schedule/CancelledBookingsList.tsx:1
src/components/leads/JobCompletionEditSheet.tsx:1
src/components/leads/InspectionDataDisplay.tsx:1
src/components/admin/AdminSidebar.tsx:1
```

Sum = 268. File count = 49.

### 2c. Raw output — `assigned_to` (84 lines / 86 occurrences)

```
$ rg -n -w 'assigned_to' src/
src/hooks/useTechnicianJobs.ts:283:        .eq('assigned_to', user.id)
src/hooks/useTechnicianJobs.ts:368:          filter: `assigned_to=eq.${user.id}`,
src/integrations/supabase/types.ts:237:          assigned_to: string
src/integrations/supabase/types.ts:259:          assigned_to: string
src/integrations/supabase/types.ts:281:          assigned_to?: string
src/integrations/supabase/types.ts:1423:          assigned_to: string | null
src/integrations/supabase/types.ts:1473:          assigned_to?: string | null
src/integrations/supabase/types.ts:1523:          assigned_to?: string | null
src/hooks/useTechnicianDetail.ts:206:      .eq('assigned_to', technicianId)
src/hooks/useTechnicianDetail.ts:286:      .eq('assigned_to', technicianId)
src/hooks/useAdminDashboardStats.ts:98:          .is('assigned_to', null)
src/hooks/useTodaysSchedule.ts:55:          assigned_to,
src/hooks/useTodaysSchedule.ts:75:      const techIds = [...new Set((data || []).map((b: any) => b.assigned_to).filter(Boolean))] as string[];
src/hooks/useTodaysSchedule.ts:91:        const techName = (booking.assigned_to && nameMap.get(booking.assigned_to)) || 'Unassigned';
src/hooks/useCancelledBookings.ts:29:          assigned_to,
src/hooks/useCancelledBookings.ts:47:      const technicianIds = [...new Set((data || []).map(e => e.assigned_to).filter(Boolean))];
src/hooks/useCancelledBookings.ts:82:        const techName = technicianMap[booking.assigned_to] || 'Unassigned';
src/hooks/useCancelledBookings.ts:104:          technicianId: booking.assigned_to,
src/hooks/useTechnicianAlerts.ts:191:          .eq('assigned_to', user.id),
src/hooks/useLeadsToSchedule.ts:74:        .or('and(status.in.(new_lead,hipages_lead),assigned_to.is.null),status.eq.job_waiting')
src/hooks/useRevisionJobs.ts:42:        .eq('assigned_to', user.id)
src/hooks/useTechnicianStats.ts:203:      .select('assigned_to, lead_id, event_type, status')
src/hooks/useTechnicianStats.ts:204:      .in('assigned_to', techIds)
src/hooks/useTechnicianStats.ts:215:      .select('assigned_to')
src/hooks/useTechnicianStats.ts:216:      .in('assigned_to', techIds)
src/hooks/useTechnicianStats.ts:243:    (assignedLeads || []).forEach((lead: { assigned_to: string | null }) => {
src/hooks/useTechnicianStats.ts:244:      if (lead.assigned_to && statsMap[lead.assigned_to]) {
src/hooks/useTechnicianStats.ts:245:        statsMap[lead.assigned_to].activeLeads++;
src/hooks/useTechnicianStats.ts:256:      assigned_to: string | null;
src/hooks/useTechnicianStats.ts:260:      if (!booking.assigned_to || !statsMap[booking.assigned_to]) return;
src/hooks/useTechnicianStats.ts:261:      statsMap[booking.assigned_to].upcomingKeys.add(`${booking.lead_id}|${booking.event_type}`);
src/hooks/useUnassignedLeads.ts:41:        .select('id, full_name, property_address_suburb, status, assigned_to, created_at, phone, email', { count: 'exact' })
src/hooks/useUnassignedLeads.ts:42:        .is('assigned_to', null)
src/hooks/useScheduleCalendar.ts:156:          assigned_to,
src/hooks/useScheduleCalendar.ts:173:        query = query.eq('assigned_to', technicianFilter);
src/hooks/useScheduleCalendar.ts:190:      const technicianIds = [...new Set((data || []).map(e => e.assigned_to).filter(Boolean))];
src/hooks/useScheduleCalendar.ts:235:        const techName = technicianMap[booking.assigned_to] || 'Unassigned';
src/hooks/useScheduleCalendar.ts:261:          technicianId: booking.assigned_to,
src/pages/LeadDetail.tsx:347:  // Fetch technician profile for assigned_to name
src/pages/LeadDetail.tsx:349:    queryKey: ["profile", lead?.assigned_to],
src/pages/LeadDetail.tsx:351:      if (!lead?.assigned_to) return null;
src/pages/LeadDetail.tsx:355:        .eq("id", lead.assigned_to)
src/pages/LeadDetail.tsx:360:    enabled: !!lead?.assigned_to,
src/pages/LeadDetail.tsx:526:        for (const f of ['assigned_to', 'inspection_scheduled_date', 'scheduled_time', 'scheduled_dates', 'booked_at']) {
src/pages/TechnicianJobDetail.tsx:52:  assigned_to: string | null;
src/components/leads/JobBookingDetails.tsx:16:  assigned_to: string | null
src/components/leads/JobBookingDetails.tsx:32:    .select('id, title, start_datetime, end_datetime, assigned_to, status, description')
src/components/leads/JobBookingDetails.tsx:108:  const technicianId = bookings[0]?.assigned_to ?? null
src/pages/LeadsManagement.tsx:143:const LEAD_COLUMNS = 'id,full_name,...,assigned_to,job_scheduled_date' as const;
src/pages/LeadsManagement.tsx:366:    assigned_to: lead.assigned_to,
src/pages/LeadsManagement.tsx:397:        // Batch-fetch technician names for any assigned_to UUIDs we see
src/pages/LeadsManagement.tsx:398:        const technicianIds = [...new Set(rows.map((r: any) => r.assigned_to).filter(Boolean))];
src/pages/LeadsManagement.tsx:403:          assigned_technician: r.assigned_to ? technicianNameMap[r.assigned_to] : undefined,
src/components/admin/AdminSidebar.tsx:50:        .is('assigned_to', null)
src/components/leads/BookJobSheet.tsx:210:    assigned_to: string | null
src/components/leads/BookJobSheet.tsx:227:            .select('assigned_to, job_scheduled_date')
src/components/leads/BookJobSheet.tsx:241:            .select('id, start_datetime, end_datetime, assigned_to')
src/components/leads/BookJobSheet.tsx:250:        // Pre-select technician from lead.assigned_to
src/components/leads/BookJobSheet.tsx:251:        if (leadResult.data?.assigned_to) {
src/components/leads/BookJobSheet.tsx:252:          setAssignedTo(leadResult.data.assigned_to)
src/components/leads/BookJobSheet.tsx:367:  // The list is role-filtered, but a lead's assigned_to can point at someone without the
src/components/leads/BookJobSheet.tsx:427:        assigned_to: assignedTo,
src/components/leads/BookJobSheet.tsx:435:        .select('id, start_datetime, end_datetime, assigned_to')
src/components/leads/BookJobSheet.tsx:443:        assigned_to: assignedTo,
src/components/leads/BookJobSheet.tsx:514:        const oldTechId = oldBookings[0]?.assigned_to ?? null
src/components/leads/BookJobSheet.tsx:515:        const newTechId = newBookings[0]?.assigned_to ?? null
src/components/leads/LeadCard.tsx:59:  assigned_to?: string | null;
src/lib/api/invoices.ts:228:    .select('id, total_amount, paid_at, job_completion:job_completions(completed_by), lead:leads(assigned_to)')
src/lib/api/invoices.ts:243:    lead: { assigned_to: string | null } | null
src/lib/api/invoices.ts:248:    technicianId: row.job_completion?.completed_by ?? row.lead?.assigned_to ?? null,
src/lib/api/invoices.paidRevenue.test.ts:133:        job_completion: { completed_by: TECH }, lead: { assigned_to: 'someone-else' },
src/lib/api/invoices.paidRevenue.test.ts:145:        job_completion: null, lead: { assigned_to: TECH },
src/lib/api/invoices.paidRevenue.test.ts:157:        job_completion: null, lead: { assigned_to: null },
src/lib/utils/fieldLabels.ts:36:  assigned_to: 'Assigned Technician',
src/lib/bookingService.ts:51:    .eq('assigned_to', technicianId)
src/lib/bookingService.ts:127:        assigned_to: technicianId,
src/lib/bookingService.ts:149:        'status, inspection_scheduled_date, scheduled_time, assigned_to, internal_notes',
src/lib/bookingService.ts:158:      assigned_to: technicianId,
src/lib/bookingService.ts:187:      { field: 'assigned_to', old: leadBefore?.assigned_to ?? null, new: technicianId },
src/lib/__tests__/bookingService.conflict.test.ts:116:    expect(filterFor('eq', 'assigned_to')).toBe(TECHNICIAN_ID);
```

(One line, `src/pages/LeadsManagement.tsx:143`, is elided mid-string above for width; the full 200-char `LEAD_COLUMNS` constant contains a single `assigned_to`.)

### 2d. Raw output — `technicianId` (79 occurrences)

```
$ rg -n -w 'technicianId' src/
src/pages/AdminSchedule.tsx:69:  const handleTechnicianChange = (technicianId: string | null) => {
src/pages/AdminSchedule.tsx:70:    setSelectedTechnician(technicianId);
src/components/schedule/ScheduleHeader.tsx:27:  onTechnicianChange: (technicianId: string | null) => void;
src/components/leads/JobBookingDetails.tsx:108:  const technicianId = bookings[0]?.assigned_to ?? null
src/components/leads/JobBookingDetails.tsx:111:    queryKey: ['technician-name', technicianId],
src/components/leads/JobBookingDetails.tsx:112:    queryFn: () => (technicianId ? fetchTechnicianName(technicianId) : Promise.resolve('—')),
src/components/leads/JobBookingDetails.tsx:113:    enabled: !!technicianId,
src/hooks/useTechnicianDetail.ts:118:async function fetchTechnicianDetail(technicianId: string): Promise<TechnicianDetail | null> {
src/hooks/useTechnicianDetail.ts:145:    const user = result.users.find((u: UserFromAPI) => u.id === technicianId);
src/hooks/useTechnicianDetail.ts:171:      .eq('inspector_id', technicianId);
src/hooks/useTechnicianDetail.ts:197:      revenueThisMonth = sumPaidRevenueFor(paidInvoices, technicianId);
src/hooks/useTechnicianDetail.ts:206:      .eq('assigned_to', technicianId)
src/hooks/useTechnicianDetail.ts:264:async function fetchUpcomingJobs(technicianId: string): Promise<UpcomingJob[]> {
src/hooks/useTechnicianDetail.ts:286:      .eq('assigned_to', technicianId)
src/hooks/useTechnicianDetail.ts:340:export function useTechnicianDetail(technicianId: string | undefined) {
src/hooks/useTechnicianDetail.ts:342:    queryKey: ['technician-detail', technicianId],
src/hooks/useTechnicianDetail.ts:343:    queryFn: () => fetchTechnicianDetail(technicianId!),
src/hooks/useTechnicianDetail.ts:344:    enabled: !!technicianId,
src/hooks/useTechnicianDetail.ts:350:export function useUpcomingJobs(technicianId: string | undefined) {
src/hooks/useTechnicianDetail.ts:352:    queryKey: ['technician-upcoming-jobs', technicianId],
src/hooks/useTechnicianDetail.ts:353:    queryFn: () => fetchUpcomingJobs(technicianId!),
src/hooks/useTechnicianDetail.ts:354:    enabled: !!technicianId,
src/lib/bookingService.ts:20:  technicianId: string;
src/lib/bookingService.ts:44:  technicianId: string,
src/lib/bookingService.ts:51:    .eq('assigned_to', technicianId)
src/lib/bookingService.ts:88:    technicianId,
src/lib/bookingService.ts:97:    addBusinessBreadcrumb('Booking inspection', { leadId, technicianId, inspectionDate, inspectionTime });
src/lib/bookingService.ts:105:      technicianId,
src/lib/bookingService.ts:127:        assigned_to: technicianId,
src/lib/bookingService.ts:158:      assigned_to: technicianId,
src/lib/bookingService.ts:187:      { field: 'assigned_to', old: leadBefore?.assigned_to ?? null, new: technicianId },
src/lib/bookingService.ts:267:      technicianId,
src/hooks/__tests__/useBookingValidation.recommendedDates.test.ts:14:  technicianId: 'tech-1',
src/hooks/__tests__/useBookingValidation.recommendedDates.test.ts:257:    const outcome = await callGetRecommendedDates({ ...BASE_PARAMS, technicianId: '' })
src/hooks/__tests__/useBookingValidation.recommendedDates.test.ts:269:    await callGetRecommendedDates({ ...BASE_PARAMS, technicianId: '' })
src/hooks/__tests__/useBookingValidation.recommendedDates.test.ts:280:      await result.current.getRecommendedDates({ ...BASE_PARAMS, technicianId: '' })
src/lib/api/invoices.ts:211:  technicianId: string | null
src/lib/api/invoices.ts:248:    technicianId: row.job_completion?.completed_by ?? row.lead?.assigned_to ?? null,
src/lib/api/invoices.ts:261:export function sumPaidRevenueFor(invoices: PaidInvoice[], technicianId: string): number {
src/lib/api/invoices.ts:263:    .filter(inv => inv.technicianId === technicianId)
src/hooks/useBookingValidation.ts:58:  technicianId: string
src/hooks/useBookingValidation.ts:66:  technicianId: string
src/hooks/useBookingValidation.ts:210:    const { technicianId, date, requestedTime, destinationAddress, overrideStartAddress } = params
src/hooks/useBookingValidation.ts:212:    if (!technicianId || !date || !requestedTime || !destinationAddress) {
src/hooks/useBookingValidation.ts:214:      return availabilityFailure('bad_params', 'Missing technicianId, date, requestedTime or destinationAddress')
src/hooks/useBookingValidation.ts:233:        technician_id: technicianId,
src/hooks/useBookingValidation.ts:325:    const { technicianId, destinationAddress, destinationSuburb, daysAhead = 7, durationMinutes = 60, preferredDate, preferredTime } = params
src/hooks/useBookingValidation.ts:327:    if (!technicianId || !destinationAddress) {
src/hooks/useBookingValidation.ts:329:      return recsFailure('bad_params', 'Missing technicianId or destinationAddress')
src/hooks/useBookingValidation.ts:355:              technician_id: technicianId,
src/hooks/__tests__/useBookingValidation.checkAvailability.test.ts:14:  technicianId: 'tech-1',
src/hooks/__tests__/useBookingValidation.checkAvailability.test.ts:305:    const outcome = await callCheckAvailability({ ...BASE_PARAMS, technicianId: '' })
src/hooks/__tests__/useBookingValidation.checkAvailability.test.ts:317:    await callCheckAvailability({ ...BASE_PARAMS, technicianId: '' })
src/hooks/__tests__/useBookingValidation.checkAvailability.test.ts:328:      await result.current.checkAvailability({ ...BASE_PARAMS, technicianId: '' })
src/lib/api/invoices.paidRevenue.test.ts:91:    { id: 'a', totalAmount: 1200, paidAt: '2026-07-05T02:00:00Z', technicianId: 'someone-else' },
src/lib/api/invoices.paidRevenue.test.ts:92:    { id: 'b', totalAmount: 800, paidAt: '2026-07-06T02:00:00Z', technicianId: null },
src/lib/api/invoices.paidRevenue.test.ts:138:    expect(rows[0].technicianId).toBe(TECH)
src/lib/api/invoices.paidRevenue.test.ts:150:    expect(rows[0].technicianId).toBe(TECH)
src/lib/api/invoices.paidRevenue.test.ts:162:    expect(rows[0].technicianId).toBeNull()
src/components/schedule/LeadBookingCard.tsx:250:      technicianId: selectedTechnician,
src/components/schedule/LeadBookingCard.tsx:272:          technicianId: selectedTechnician,
src/components/schedule/LeadBookingCard.tsx:288:          technicianId: selectedTechnician,
src/components/schedule/LeadBookingCard.tsx:445:        technicianId: techId,
src/components/schedule/LeadBookingCard.tsx:461:          technicianId: techId,
src/components/schedule/LeadBookingCard.tsx:484:        technicianId: techId,
src/components/schedule/LeadBookingCard.tsx:550:          technicianId: selectedTechnician,
src/components/booking/TimeSlotValidator.tsx:19:  technicianId: string | null
src/components/booking/TimeSlotValidator.tsx:30:  technicianId,
src/components/booking/TimeSlotValidator.tsx:45:    const checkKey = `${technicianId}-${dateStr}-${selectedTime}-${leadAddress}`
src/components/booking/TimeSlotValidator.tsx:48:    if (checkKey === lastCheckedRef.current || !technicianId || !selectedDate || !selectedTime || !leadAddress) {
src/components/booking/TimeSlotValidator.tsx:49:      if (!technicianId || !selectedDate || !selectedTime || !leadAddress) {
src/components/booking/TimeSlotValidator.tsx:61:        technicianId,
src/components/booking/TimeSlotValidator.tsx:76:  }, [technicianId, selectedDate, selectedTime, leadAddress, leadSuburb, checkAvailability, clearResult, onValidationChange])
src/components/booking/TimeSlotValidator.tsx:79:  if (!technicianId || !selectedDate || !selectedTime) {
src/hooks/useCancelledBookings.ts:104:          technicianId: booking.assigned_to,
src/hooks/useScheduleCalendar.ts:20:  technicianId: string;
src/hooks/useScheduleCalendar.ts:261:          technicianId: booking.assigned_to,
```

### 2e. Raw output — `assignedTo`, `technicianName`, `technician_name`

```
$ rg -n -w 'assignedTo' src/
src/components/leads/BookJobSheet.tsx:191:  const [assignedTo, setAssignedTo] = useState<string>('')
src/components/leads/BookJobSheet.tsx:335:    if (!assignedTo || baseSchedule.length === 0) {
src/components/leads/BookJobSheet.tsx:346:          assignedTo,
src/components/leads/BookJobSheet.tsx:365:  }, [assignedTo, baseSchedule])
src/components/leads/BookJobSheet.tsx:375:    if (techniciansPending || !assignedTo) return
src/components/leads/BookJobSheet.tsx:376:    if (!technicians.some((t) => t.id === assignedTo)) setAssignedTo('')
src/components/leads/BookJobSheet.tsx:377:  }, [techniciansPending, technicians, assignedTo])
src/components/leads/BookJobSheet.tsx:381:    () => technicians.find((u) => u.id === assignedTo)?.name ?? '',
src/components/leads/BookJobSheet.tsx:382:    [technicians, assignedTo]
src/components/leads/BookJobSheet.tsx:389:    !!assignedTo &&
src/components/leads/BookJobSheet.tsx:427:        assigned_to: assignedTo,
src/components/leads/BookJobSheet.tsx:443:        assigned_to: assignedTo,
src/components/leads/BookJobSheet.tsx:743:                <Select value={assignedTo} onValueChange={setAssignedTo}>

$ rg -n -w 'technicianName' src/
src/pages/AdminDashboard.tsx:329:                                  style={{ backgroundColor: getTechnicianColor(item.technicianName) }}
src/pages/AdminDashboard.tsx:334:                                  {item.technicianName}
src/pages/AdminDashboard.tsx:408:                            style={{ backgroundColor: getTechnicianColor(item.technicianName) }}
src/pages/AdminDashboard.tsx:413:                            {item.technicianName}
src/components/leads/JobBookingDetails.tsx:110:  const { data: technicianName = 'Loading...' } = useQuery({
src/components/leads/JobBookingDetails.tsx:147:          <p className="font-semibold">Awaiting Technician — {technicianName}</p>
src/components/leads/JobBookingDetails.tsx:165:            {technicianName}
src/lib/bookingService.ts:26:  technicianName?: string;
src/lib/bookingService.ts:91:    technicianName,
src/lib/bookingService.ts:215:      description: `Scheduled to ${technicianName || 'technician'} for ...`,
src/lib/bookingService.ts:241:      technicianName,
src/hooks/useTodaysSchedule.ts:11:  technicianName: string;
src/hooks/useTodaysSchedule.ts:99:          technicianName: techName,
src/components/leads/BookJobSheet.tsx:560:            technicianName: selectedTechName,
src/components/schedule/EventDetailsPanel.tsx:176:              <p className="text-sm font-medium text-slate-900">{event.technicianName}</p>
src/components/schedule/CancelledBookingsList.tsx:82:                {event.suburb}... &middot; {event.technicianName}
src/hooks/useCancelledBookings.ts:105:          technicianName: techName,
src/components/schedule/LeadBookingCard.tsx:553:          technicianName: technicians.find(t => t.id === selectedTechnician)?.name,
src/lib/api/notifications.ts:65:  technicianName?: string;
src/lib/api/notifications.ts:192:  technicianName?: string;
src/lib/api/notifications.ts:212:        ${data.technicianName ? `<tr><td>Technician</td><td>${data.technicianName}</td></tr>` : ''}
src/lib/api/notifications.ts:264:  technicianName: string;
src/lib/api/notifications.ts:281:        <tr><td>Technician</td><td>${data.technicianName}</td></tr>
src/lib/api/notifications.ts:364:  technicianName?: string;
src/lib/api/notifications.ts:385:        ${params.technicianName ? `<tr><td>Technician</td><td>${params.technicianName}</td></tr>` : ''}
src/lib/api/notifications.ts:403:  technicianName: string;
src/lib/api/notifications.ts:485:      const message = [params.leadName, params.propertyAddress, params.technicianName, params.bookingDate]
src/hooks/useScheduleCalendar.ts:21:  technicianName: string;
src/hooks/useScheduleCalendar.ts:262:          technicianName: techName,
src/lib/api/__tests__/notificationsFanOut.test.ts:103:      technicianName: 'Clayton',

$ rg -n -w 'technician_name' src/
src/templates/job-report-template.html:181:  ...{{technician_name}}</div>
src/hooks/__tests__/useBookingValidation.recommendedDates.test.ts:72,87,101,115,129,136,143
src/hooks/__tests__/useBookingValidation.checkAvailability.test.ts:28,361
src/hooks/useBookingValidation.ts:32:  technician_name: string
src/hooks/useBookingValidation.ts:92:  technician_name: string
src/hooks/useBookingValidation.ts:114:  technician_name: string
src/hooks/useBookingValidation.ts:394:        technician_name: data.technician_name,
src/components/schedule/LeadBookingCard.tsx:473:        name: outcome.technician_name,
src/components/booking/TimeSlotValidator.tsx:147:          <span className="font-medium">{result.technician_name}</span>
src/components/booking/TimeSlotValidator.tsx:232:            {result.technician_name}'s schedule for this day:
```

### 2f. Raw output — inspector and completed_by families

```
$ rg -n -w 'inspector_id' src/
src/pages/TechnicianInspectionForm.tsx:4056:        inspector_id: user.id,
src/integrations/supabase/types.ts:617,700,783
src/hooks/useTechnicianDetail.ts:171:      .eq('inspector_id', technicianId);
src/lib/offline/SyncManager.ts:201:      inspector_id: user.id,
src/lib/offline/SyncManager.ts:213:      // Update existing inspection - remove lead_id and inspector_id from update
src/lib/offline/SyncManager.ts:214:      const { lead_id: _l, inspector_id: _i, ...updatePayload } = dbPayload;
src/hooks/useTechnicianStats.ts:23:   * Every inspection this technician has carried out, by inspections.inspector_id.
src/hooks/useTechnicianStats.ts:192:      .select('inspector_id')
src/hooks/useTechnicianStats.ts:193:      .in('inspector_id', techIds);
src/hooks/useTechnicianStats.ts:249:    (inspectionStats || []).forEach((insp: { inspector_id: string | null }) => {
src/hooks/useTechnicianStats.ts:250:      if (!insp.inspector_id || !statsMap[insp.inspector_id]) return;
src/hooks/useTechnicianStats.ts:251:      statsMap[insp.inspector_id].inspectionsTotal++;
src/lib/api/inspections.ts:7:  inspector_id: string
src/lib/utils/fieldLabels.ts:56:  inspector_id: 'Inspector'

$ rg -n -w 'inspectorId' src/
(no output — 0 hits)

$ rg -n -w 'inspector_name' src/
src/pages/ViewReportPDF.tsx:90,189,1505,2245
src/pages/InspectionAIReview.tsx:73,191,723,1013
src/pages/TechnicianInspectionForm.tsx:3309,4057
src/integrations/supabase/types.ts:618,701,784
src/lib/utils/fieldLabels.ts:55
src/components/leads/InspectionDataDisplay.tsx:194

$ rg -n -w 'completed_by' src/
src/pages/LeadDetail.tsx:413,416,418,422,426
src/types/jobCompletion.ts:127
src/integrations/supabase/types.ts:1043,1119,1195
src/lib/api/jobCompletions.ts:187:      completed_by: completedBy,
src/lib/api/invoices.paidRevenue.test.ts:133
src/lib/api/invoices.ts:228,242,248
src/components/leads/JobCompletionSummary.tsx:228,233,237

$ rg -n -w 'completedBy' src/
src/lib/api/jobCompletions.ts:92:  completedBy: string
src/lib/api/jobCompletions.ts:187:      completed_by: completedBy,

$ rg -n -w 'remediation_completed_by' src/
src/pages/LeadDetail.tsx:1024,1092
src/integrations/supabase/types.ts:1083,1159,1235
src/types/jobCompletion.ts:128
src/hooks/useJobCompletionForm.ts:81
src/components/leads/JobCompletionSummary.tsx:242
src/lib/api/jobCompletions.ts:18

$ rg -n -w 'remediationCompletedBy' src/
src/types/jobCompletion.ts:41,202
src/lib/api/jobCompletions.ts:18
src/hooks/useJobCompletionForm.ts:81,277
src/components/job-completion/Section2Summary.tsx:144,145
src/components/leads/JobCompletionEditSheet.tsx:44
```

### 2g. Outside `src/` — full detail on the Edge Functions

```
$ rg -n -w -e 'assigned_to|technician_id' supabase/functions/calculate-travel-time/index.ts
46:  technician_id: z.string().uuid(),
56:  technician_id: z.string().uuid(),
99:  technician_id: string
109:  technician_id: string
247:  technician_id: string
273:  technician_id?: string
739:    .eq('assigned_to', technicianId)
937:            technician_id: tech.id,
951:              technician_id: tech.id,
962:              technician_id: tech.id,
981:            technician_id: tech.id,
991:            technician_id: tech.id,
1009:        ? rankedTechnicians[0].technician_id
1029:      const { technician_id, date, requested_time, destination_address, override_start_address } = body as AvailabilityRequest
1045:      const { data: techUser, error: techError } = await supabase.auth.admin.getUserById(technician_id)
1073:        .eq('assigned_to', technician_id)
1082:      const dayBookings = await fetchMelbourneBookings(supabase, technician_id, [date])
1184:          dedupeKey: `no_origin:${technician_id}`,
1190:          extra: { technician_id, date, requested_time },
1194:            technician_id,
1216:        technician_id,
1307:        technician_id,
1331:      const { data: techUser, error: techError } = await supabase.auth.admin.getUserById(technician_id)
1352:          technician_id,
1395:        .eq('assigned_to', technician_id)
1405:      const bookings = await fetchMelbourneBookings(supabase, technician_id, dateStrings)

$ rg -n -w -e 'completed_by|remediation_completed_by|technician_name|inspector_id|inspector_name' supabase/functions/generate-job-report-pdf/index.ts supabase/functions/generate-inspection-pdf/index.ts
supabase/functions/generate-job-report-pdf/index.ts:209:      .eq('id', jc.completed_by)
supabase/functions/generate-job-report-pdf/index.ts:212:    const technicianName = profile?.full_name || jc.remediation_completed_by || 'Technician'
supabase/functions/generate-job-report-pdf/index.ts:306:      '{{technician_name}}': escapeHtml(technicianName),
supabase/functions/generate-inspection-pdf/index.ts:105:  inspector_id: string
supabase/functions/generate-inspection-pdf/index.ts:106:  inspector_name?: string
supabase/functions/generate-inspection-pdf/index.ts:2181:    const inspectorName = inspection.inspector_name || 'Inspector'
```

---

## STEP 3 — CATEGORISED HIT TABLE

**Buckets:** A = READ · B = WRITE · C = QUERY FILTER · D = TYPE DEFINITION · E = BOOKING/SCHEDULING · F = OFFLINE/DEXIE · G = TEST

Every hit is assigned exactly one bucket. Where a line is genuinely both (e.g. a write that is also on the booking path), the bucket chosen is the one that determines the **wave order**, with the secondary shown in the description. Consecutive lines in the same file serving one purpose are collapsed into a single row with the line list; the line counts still total 268.

### Bucket C — QUERY FILTER (highest risk of silent wrong rows)

| File | Line | Bucket | What it does | Risk if missed |
|---|---|---|---|---|
| `src/lib/bookingService.ts` | 51 | **C** (+E) | `.eq('assigned_to', technicianId)` — the ONLY conflict-detection filter in the app. Used by both booking surfaces. | **Two-tech booking silently checks only the primary's calendar. The secondary gets double-booked with no warning.** |
| `src/hooks/useScheduleCalendar.ts` | 173 | **C** | `query.eq('assigned_to', technicianFilter)` — Schedule page per-technician calendar filter. | Filtering the calendar to a technician hides shared jobs they are on. Admin plans against a calendar that is missing bookings. |
| `src/hooks/useTechnicianJobs.ts` | 283 | **C** | `.eq('assigned_to', user.id)` — a technician's own job list. | **A secondary technician's job list is empty. They turn up to nothing.** Worst user-facing failure in the set. |
| `src/hooks/useTechnicianJobs.ts` | 368 | **C** | Realtime subscription `filter: assigned_to=eq.${user.id}` on `calendar_bookings`. | Secondary tech gets no "New job assigned" toast and no live updates. Postgres-changes filters cannot express a join, so this cannot be fixed by widening a `select`. |
| `src/hooks/useTechnicianAlerts.ts` | 191 | **C** | `.eq('assigned_to', user.id)` on `calendar_bookings` to source alerts. | Secondary tech sees no alerts for the shared job. |
| `src/hooks/useTechnicianDetail.ts` | 206, 286 | **C** | `.eq('assigned_to', technicianId)` — technician profile page: recent leads + upcoming jobs. | Technician detail page under-reports the workload of anyone who works as a secondary. |
| `src/hooks/useTechnicianDetail.ts` | 171 | **C** | `.eq('inspector_id', technicianId)` — inspection count. | Under-counts if inspections gain a second inspector. Lower risk: `inspector_id` is out of the junction's scope in the decided architecture. |
| `src/hooks/useTechnicianStats.ts` | 204, 216 | **C** | `.in('assigned_to', techIds)` — bookings and leads per technician for the stats grid. | Workload/utilisation numbers under-report secondaries. Feeds management decisions. |
| `src/hooks/useTechnicianStats.ts` | 193 | **C** | `.in('inspector_id', techIds)` — inspections carried out. | Same as 171. |
| `src/hooks/useUnassignedLeads.ts` | 42 | **C** | `.is('assigned_to', null)` — the unassigned-leads list. | Under the dual-write model, `assigned_to` and the junction can disagree. A lead with junction rows but a null pointer shows as unassigned; a lead with a stale pointer and no junction rows hides. **Both directions are wrong and neither errors.** |
| `src/hooks/useAdminDashboardStats.ts` | 98 | **C** | `.is('assigned_to', null)` — unassigned count on the admin dashboard. | Same drift. A wrong number on the landing page. |
| `src/components/admin/AdminSidebar.tsx` | 50 | **C** | `.is('assigned_to', null)` — sidebar unassigned badge. | Same drift. |
| `src/hooks/useLeadsToSchedule.ts` | 74 | **C** | `.or('and(status.in.(new_lead,hipages_lead),assigned_to.is.null),status.eq.job_waiting')` — the Schedule sidebar's work queue. | Same drift, inside a raw PostgREST `or()` string — **a text predicate no type-checker will ever flag.** |
| `src/hooks/useRevisionJobs.ts` | 42 | **C** | `.eq('assigned_to', user.id)`. | **Dormant file.** `CLAUDE.md`: "useRevisionJobs.ts left dormant — do not activate." No live risk; do not touch, but do not let a codemod rewrite it either. |
| `supabase/functions/calculate-travel-time/index.ts` *(outside `src/`)* | 739, 1073, 1395 | **C** (+E) | Three `.eq('assigned_to', …)` reads of `calendar_bookings` backing availability, day schedules and recommended dates. | **Travel-time and availability answers computed against one technician's day only. The admin books against a schedule that is missing the other technician's commitments.** Invisible to a `src/`-only inventory. |

### Bucket B — WRITE (must dual-write)

| File | Line | Bucket | What it does | Risk if missed |
|---|---|---|---|---|
| `src/lib/bookingService.ts` | 127 | **B** (+E) | `assigned_to: technicianId` on the `calendar_bookings` insert (inspection booking). | Only one calendar blocked. This is the exact line the "both calendars" rule turns on. |
| `src/lib/bookingService.ts` | 158 | **B** | `assigned_to: technicianId` on the `leads` update. | Denormalised primary pointer. Must keep being written, and must equal the junction's primary. |
| `src/components/leads/BookJobSheet.tsx` | 427 | **B** (+E) | `assigned_to: assignedTo` on the per-day `calendar_bookings` insert (job booking). | Only one calendar blocked, across every day of a multi-day job. |
| `src/components/leads/BookJobSheet.tsx` | 443 | **B** | `assigned_to: assignedTo` on the `leads` update. | As 158. |
| `src/pages/LeadDetail.tsx` | 526 | **B** — **FROZEN REGION** | Status reversion below rank 1 sets `assigned_to = null` (inside the `ALL_STATUSES` index-threshold block). | **Nulls the pointer while junction rows survive. The lead reads as unassigned everywhere and as two-tech in the junction. See Step 5.** |
| `src/lib/api/jobCompletions.ts` | 187 | **B** | `completed_by: completedBy` on the `job_completions` insert. | Fed `auth.uid()`, not the primary. Contradicts "PRIMARY prints as completed by". |
| `src/lib/api/jobCompletions.ts` | 18 | **B** | `row.remediation_completed_by = data.remediationCompletedBy \|\| null`. | Free-text; single name only. Two techs cannot both be recorded. |
| `src/hooks/useJobCompletionForm.ts` | 277 | **B** | Defaults `remediationCompletedBy` to the logged-in user's name. | Stamps whoever opened the form, not the primary. |
| `src/components/job-completion/Section2Summary.tsx` | 144, 145 | **B** | The single "Completed By" text input. | Single-value UI; no way to record two. |
| `src/pages/TechnicianInspectionForm.tsx` | 4056, 4057 | **B** | `inspector_id: user.id`, `inspector_name: formData.inspector` on inspection save. | Out of junction scope by decision, but the inspection PDF names one inspector for a two-tech inspection. |
| `src/lib/offline/SyncManager.ts` | 201 | **B** + **F** | `inspector_id: user.id` on the offline draft's inspection insert. | See bucket F. |
| `src/lib/offline/SyncManager.ts` | 214 | **B** + **F** | Strips `inspector_id` from the update payload so it is write-once. | See bucket F. |

### Bucket E — BOOKING / SCHEDULING (the both-calendars path)

| File | Line | Bucket | What it does | Risk if missed |
|---|---|---|---|---|
| `src/lib/bookingService.ts` | 20, 26, 44 | **E** (+D) | `BookInspectionParams.technicianId: string`, `technicianName?: string`, `checkBookingConflict(technicianId: string, …)`. | **These three signatures are the shape change. Everything downstream follows from them.** |
| `src/lib/bookingService.ts` | 88, 91, 97, 105, 187, 215, 241, 267 | **E** | Destructures, breadcrumb, conflict call, field-edit diff, activity description, Slack payload, Sentry context. | Log and notification text names one technician; the activity timeline becomes a false record of who was assigned. |
| `src/lib/bookingService.ts` | 149 | **E** (+A) | Selects `assigned_to` for the before-snapshot used by the field-edit diff. | Diff shows a single-value change even when two techs were assigned. |
| `src/components/leads/BookJobSheet.tsx` | 191, 743 | **E** | `useState<string>('')` and the single-value shadcn `<Select value={assignedTo}>`. | **The UI physically cannot express two technicians.** Single-select → multi-select is the visible half of this project. |
| `src/components/leads/BookJobSheet.tsx` | 335, 346, 365 | **E** | The per-day conflict loop: `checkBookingConflict(assignedTo, day.start, day.end)` for each scheduled day. | Multi-day job checks only the primary. Must become an N-technicians × M-days check. |
| `src/components/leads/BookJobSheet.tsx` | 375, 376, 377 | **E** | Orphan guard: clears `assignedTo` if it is not in the role-filtered list (added by PR #103). | Must become a per-entry filter over an array, not a single clear. Get this wrong and selecting a second tech silently wipes the first. |
| `src/components/leads/BookJobSheet.tsx` | 381, 382, 389 | **E** | `selectedTechName` memo and the `canSubmit` gate. | Name in the email/activity log; submit gate. |
| `src/components/leads/BookJobSheet.tsx` | 210, 241, 435, 514, 515 | **E** (+A) | `initialBookingsRef` snapshot and the reschedule diff: `oldBookings[0]?.assigned_to`, `newBookings[i]` index-paired per day. | **`[0]` and index pairing assume one row per day. Fan-out to two rows per day silently mis-pairs the whole diff.** Day 1 vs Day 1 becomes Tech A Day 1 vs Tech B Day 1. |
| `src/components/leads/BookJobSheet.tsx` | 227, 250, 251, 252, 560 | **E** (+A) | Prefill from `lead.assigned_to`; `technicianName` in the confirmation email. | Prefill restores one technician on reschedule, quietly dropping the second. |
| `src/components/schedule/LeadBookingCard.tsx` | 250, 272, 288 | **E** | `technicianId: selectedTechnician` → `checkAvailability`. | Travel-time/availability answered for one tech. |
| `src/components/schedule/LeadBookingCard.tsx` | 445, 461, 484 | **E** | `technicianId: techId` → `getRecommendedDates`. | Recommended days computed for one tech; the other may be busy on every "best" day. |
| `src/components/schedule/LeadBookingCard.tsx` | 550, 553 | **E** | `technicianId` / `technicianName` into `bookInspection`. | The inspection-booking entry point. |
| `src/components/schedule/LeadBookingCard.tsx` | 473 | **E** (+A) | `name: outcome.technician_name` from the availability response. | Panel labels the travel origin with one name. |
| `src/components/booking/TimeSlotValidator.tsx` | 19, 30, 45, 48, 49, 61, 76, 79 | **E** (+D) | `technicianId: string \| null` prop threaded through the debounce key, the guard and the effect deps. | The inline availability panel validates one technician's slot. |
| `src/components/booking/TimeSlotValidator.tsx` | 147, 232 | **E** (+A) | Renders `result.technician_name` and "X's schedule for this day". | Copy assumes one person. |
| `src/hooks/useBookingValidation.ts` | 58, 66 | **E** (+D) | `technicianId: string` on `CheckAvailabilityParams` / `GetRecommendedDatesParams`. | Hook contract. |
| `src/hooks/useBookingValidation.ts` | 210, 212, 214, 325, 327, 329 | **E** | Destructure + `bad_params` guards. | Guard text and validation. |
| `src/hooks/useBookingValidation.ts` | 233, 355 | **E** | `technician_id: technicianId` in the `calculate-travel-time` request body. | **The wire contract with the Edge Function.** Changing this without deploying the EF breaks availability in production immediately. |
| `src/hooks/useBookingValidation.ts` | 32, 92, 114, 394 | **E** (+D/A) | `technician_name` on `AvailabilityResult`, `RecommendedDatesResult`, `RecommendedDatesPayload`, and the payload build. | Wire response shape. |
| `src/pages/AdminSchedule.tsx` | 69, 70 | **E** | `handleTechnicianChange(technicianId: string \| null)` → `setSelectedTechnician`. | Feeds the `useScheduleCalendar` filter at line 173. |
| `src/components/schedule/ScheduleHeader.tsx` | 27 | **E** (+D) | `onTechnicianChange: (technicianId: string \| null) => void`. | Filter callback contract. |

### Bucket F — OFFLINE / DEXIE

| File | Line | Bucket | What it does | Risk if missed |
|---|---|---|---|---|
| `src/lib/offline/SyncManager.ts` | 201 | **F** (+B) | On sync, stamps `inspector_id: user.id` onto the inspection insert. | See migration note below. |
| `src/lib/offline/SyncManager.ts` | 213, 214 | **F** | Comment + destructure removing `lead_id` and `inspector_id` from the update payload (write-once semantics). | See below. |

**Offline migration assessment — the good news, stated precisely.** The Dexie schema stores **no technician field at all**:

```
$ sed -n '10,25p' src/lib/offline/db.ts
    this.version(1).stores({
      inspectionDrafts: 'id, leadId, status, updatedAt',
      photoQueue: 'id, inspectionDraftId, status, createdAt',
      syncLog: 'id, entityType, entityId, syncedAt',
    });
    this.version(2).stores({
      inspectionDrafts: 'id, leadId, status, updatedAt',
      photoQueue: 'id, inspectionDraftId, status, createdAt',
      quarantinedPhotos: 'id, inspectionDraftId, reason, quarantinedAt',
      syncLog: 'id, entityType, entityId, syncedAt',
    });
```

`InspectionDraft` is `{ id, leadId, status, formData, createdAt, updatedAt, syncedAt?, remoteInspectionId?, errorMessage? }` — no assignment field. The technician is resolved **at sync time** from `auth.uid()`, not from the cached record.

Consequences:
- **No Dexie version bump is required.** No locally cached draft carries an old-shape technician value that could go stale.
- **A draft queued before the change syncs correctly after it.** The `inspector_id` it lands with is whoever is signed in at sync time — the same behaviour as today.
- **The one real hazard is unchanged by this project but worth naming:** `syncDraft` blindly spreads every `formData` key onto the DB payload (`for (const [key, value] of Object.entries(draft.formData)) dbPayload[key] = value`). If a future wave adds a technician array to `formData`, it will be sent as an unknown column and the insert will 400 for every offline draft. Keep the junction out of `formData`; write it from the online path only.
- `src/lib/offline/types.ts:50` mentions "technician" in prose only. No hit.

### Bucket D — TYPE DEFINITION

| File | Line | Bucket | What it does | Risk if missed |
|---|---|---|---|---|
| `src/integrations/supabase/types.ts` | 237, 259, 281 | **D** | `calendar_bookings.assigned_to: string` (Row/Insert/Update) — **NOT NULL**. | Junction absent from types ⇒ every new query is hand-typed or `any`. **Generated file — regenerate via type-gen, never hand-edit** (global rule: don't modify generated files). |
| `src/integrations/supabase/types.ts` | 1423, 1473, 1523 | **D** | `leads.assigned_to: string \| null`. | As above. |
| `src/integrations/supabase/types.ts` | 617, 618, 700, 701, 783, 784 | **D** | `inspections.inspector_id` / `inspector_name`. | As above. |
| `src/integrations/supabase/types.ts` | 1043, 1083, 1119, 1159, 1195, 1235 | **D** | `job_completions.completed_by` / `remediation_completed_by`. | As above. |
| `src/types/jobCompletion.ts` | 41, 127, 128, 202 | **D** | `remediationCompletedBy: string`, `completed_by: string`, `remediation_completed_by: string \| null`, form default. | Job-completion form contract. |
| `src/lib/api/jobCompletions.ts` | 92 | **D** | `createJobCompletion(leadId, inspectionId, completedBy: string)`. | Signature that must learn about the primary. |
| `src/lib/api/inspections.ts` | 7 | **D** | `inspector_id: string` on the inspection row type. | Out of junction scope. |
| `src/lib/api/invoices.ts` | 211, 242, 243, 261 | **D** | `PaidInvoice.technicianId: string \| null`; the joined row shape; `sumPaidRevenueFor(invoices, technicianId)`. | Revenue attribution to a single technician. |
| `src/lib/api/notifications.ts` | 65, 192, 264, 364, 403 | **D** | Five `technicianName` fields across Slack + email payload types. | Every notification names one technician. |
| `src/hooks/useScheduleCalendar.ts` | 20, 21 | **D** | `technicianId: string; technicianName: string` on the calendar event view-model. | Calendar events carry one technician. |
| `src/hooks/useTodaysSchedule.ts` | 11 | **D** | `technicianName: string`. | Today's-schedule view-model. |
| `src/hooks/useTechnicianStats.ts` | 256 | **D** | Inline booking row type `{ assigned_to: string \| null; … }`. | Stats aggregation shape. |
| `src/hooks/useTechnicianDetail.ts` | 118, 264, 340, 350 | **D** | Four `technicianId` function/hook signatures. | Technician detail page contracts. |
| `src/components/leads/LeadCard.tsx` | 56, 59 | **D** | `assigned_technician?: string`, `assigned_to?: string \| null`. | Lead card prop shape. |
| `src/components/leads/JobBookingDetails.tsx` | 16 | **D** | `assigned_to: string \| null` on the booking row type. | Job booking panel shape. |
| `src/pages/TechnicianJobDetail.tsx` | 52 | **D** | `assigned_to: string \| null`. | Technician job detail shape. |
| `src/pages/ViewReportPDF.tsx` | 90 | **D** | `inspector_name?: string`. | PDF page-1 data. |
| `src/pages/InspectionAIReview.tsx` | 73 | **D** | `inspector_name: string \| null`. | AI review header. |
| `src/lib/utils/fieldLabels.ts` | 36, 55, 56 | **D** | `assigned_to: 'Assigned Technician'`, `inspector_name`, `inspector_id`. | Activity-timeline field labels. A junction change with no label makes the audit trail read as a raw column name. |

### Bucket A — READ / DISPLAY

| File | Line | Bucket | What it does | Risk if missed |
|---|---|---|---|---|
| `src/pages/LeadDetail.tsx` | 347, 349, 351, 355, 360 | **A** | Fetches the `profiles` row for `lead.assigned_to` to show the assigned technician's name. | **The most-visited surface. Shows one name for a two-tech lead.** |
| `src/pages/LeadDetail.tsx` | 413, 416, 418, 422, 426 | **A** | Fetches the `profiles` row for `jobCompletion.completed_by`. | "Completed by" shows the form-filler. |
| `src/pages/LeadDetail.tsx` | 1024, 1092 | **A** | Falls back to `jobCompletion.remediation_completed_by`. | Free-text single name. |
| `src/pages/LeadsManagement.tsx` | 143, 366, 398, 403 | **A** | `LEAD_COLUMNS` includes `assigned_to`; batch-fetches names; synthesises `assigned_technician`. | Leads table column shows one technician. |
| `src/components/leads/LeadCard.tsx` | 289, 336 | **A** | "Awaiting technician: X" / "Awaiting on X". | Card copy is singular in both grammar and data. |
| `src/components/leads/JobBookingDetails.tsx` | 32, 108, 110, 111, 112, 113, 147, 165 | **A** | `bookings[0]?.assigned_to` → name query → "Awaiting Technician — X". | **`[0]` on a fan-out set is arbitrary.** With two rows per booking it shows whichever came back first. |
| `src/hooks/useScheduleCalendar.ts` | 156, 190, 235, 261, 262 | **A** | Selects `assigned_to`, dedupes ids, maps to names for calendar chips. | Calendar chips label one technician. |
| `src/hooks/useTodaysSchedule.ts` | 55, 75, 91, 99 | **A** | Same pattern for today's schedule. | Dashboard "today" list. |
| `src/hooks/useCancelledBookings.ts` | 29, 47, 82, 104, 105 | **A** | Same pattern for cancelled bookings. | Cancelled list. |
| `src/components/schedule/EventDetailsPanel.tsx` | 176 | **A** | `{event.technicianName}`. | Event detail panel. |
| `src/components/schedule/CancelledBookingsList.tsx` | 82 | **A** | `{event.technicianName}`. | Cancelled list row. |
| `src/pages/AdminDashboard.tsx` | 329, 334, 408, 413 | **A** | `getTechnicianColor(item.technicianName)` + the name, twice. | Colour-coded chips: one colour per booking. Two techs need two chips or a split. |
| `src/hooks/useTechnicianStats.ts` | 192, 203, 215, 243, 244, 245, 249, 250, 251, 260, 261 | **A** | Selects + in-memory aggregation into `statsMap`. | Aggregation reads one id per row. |
| `src/hooks/useTechnicianDetail.ts` | 145, 197, 342, 343, 344, 352, 353, 354 | **A** | User lookup, revenue sum, query keys and `enabled` guards. | Profile page plumbing. |
| `src/hooks/useUnassignedLeads.ts` | 41 | **A** | Selects `assigned_to` alongside the `.is(…, null)` filter. | Paired with the C-bucket filter on line 42. |
| `src/lib/api/invoices.ts` | 228, 248, 263 | **A** | Joins `job_completions(completed_by)` and `leads(assigned_to)`; attributes revenue with `completed_by ?? assigned_to`. | **Revenue attributed wholly to one technician.** Under two-tech jobs this silently misstates per-technician revenue with no error. |
| `src/lib/api/notifications.ts` | 212, 281, 385, 485 | **A** | Renders `technicianName` into email HTML rows and the Slack message. | Customer-facing email and Slack name one technician. |
| `src/components/leads/JobCompletionSummary.tsx` | 228, 233, 237, 242 | **A** | Profile lookup for `completed_by`, fallback to `remediation_completed_by`. | Summary names one. |
| `src/components/leads/JobCompletionEditSheet.tsx` | 44 | **A** | `remediationCompletedBy: 'Completed By'` label map. | Edit-sheet label. |
| `src/hooks/useJobCompletionForm.ts` | 81 | **A** | Loads `remediation_completed_by` into form state. | Form hydrate. |
| `src/components/leads/InspectionDataDisplay.tsx` | 194 | **A** | `<KV label="Inspector" value={i.inspector_name} />`. | Inspection panel. |
| `src/pages/ViewReportPDF.tsx` | 189, 1505, 2245 | **A** | `inspector_name` → `inspector` field on the PDF preview + the editable-field registry. | Inspection PDF names one inspector. |
| `src/pages/InspectionAIReview.tsx` | 191, 723, 1013 | **A** | Selects and renders `inspector_name`; feeds the AI summary input. | AI review header + prompt input. |
| `src/pages/TechnicianInspectionForm.tsx` | 3309 | **A** | `inspector: ins.inspector_name \|\| prev.inspector` on load. | Form hydrate. |
| `src/templates/job-report-template.html` | 181 | **A** | `{{technician_name}}` placeholder on the job report cover. | **The customer-facing "completed by" line.** Filled by `generate-job-report-pdf` from `completed_by`. |
| `src/lib/bookingService.ts` | 215, 241 | **A** | Activity description and Slack payload (also listed under E). | Audit trail + Slack. |
| `src/components/leads/BookJobSheet.tsx` | 367 | **A** | Comment explaining the orphan guard. | Documentation only. |
| `src/hooks/useTechnicianStats.ts` | 23 | **A** | Comment naming `inspections.inspector_id` as the source. | Documentation only. |
| `src/pages/LeadsManagement.tsx` | 397 | **A** | Comment. | Documentation only. |
| `src/pages/LeadDetail.tsx` | 347, 413 | **A** | Comments (counted above with their blocks). | Documentation only. |
| `src/lib/offline/SyncManager.ts` | 213 | **A**/F | Comment. | Documentation only. |

### Bucket G — TEST (5 files, 27 matched lines)

| File | Lines | Bucket | What it does | Risk if missed |
|---|---|---|---|---|
| `src/lib/__tests__/bookingService.conflict.test.ts` | 116 | **G** | `expect(filterFor('eq', 'assigned_to')).toBe(TECHNICIAN_ID)` — asserts the conflict query is scoped to one technician. | **This test pins the single-technician contract. It must fail when the contract changes — treat a green run after the Wave-3 change as a signal the change did not land.** The other 12 tests in the file (half-open bounds, minute precision, `neq status cancelled`, error-swallowing) are shape-independent and must keep passing. |
| `src/hooks/__tests__/useBookingValidation.recommendedDates.test.ts` | 14, 72, 87, 101, 115, 129, 136, 143, 257, 269, 280 | **G** | `technicianId: 'tech-1'` base params; `technician_name: 'Glen'` wire fixtures; `bad_params` on empty technicianId. | Wire-shape fixtures. Silently pass against a stale mock if the EF contract widens. |
| `src/hooks/__tests__/useBookingValidation.checkAvailability.test.ts` | 14, 28, 305, 317, 328, 361 | **G** | Same pattern for `checkAvailability`. | As above. |
| `src/lib/api/invoices.paidRevenue.test.ts` | 91, 92, 133, 138, 145, 150, 157, 162 | **G** | Asserts `completed_by ?? assigned_to` attribution precedence. | Locks single-technician revenue attribution. |
| `src/lib/api/__tests__/notificationsFanOut.test.ts` | 103 | **G** | `technicianName: 'Clayton'` in a notification fixture. | Notification payload fixture. |

**Coverage gap worth naming:** there is **no test anywhere** that exercises `BookJobSheet`'s per-day conflict loop, the reschedule index-paired diff, or the orphan-technician guard — the three most fragile pieces of the booking path. `src/components/schedule/__tests__/LeadBookingCard.subpremise.test.tsx` mentions "conflict" but carries zero Tier-1 hits. Wave 3 should add them.

---

## STEP 4 — BOOKING PATH AUDIT

### 4a. How conflict detection works today, in plain English

There is exactly **one** conflict-detection function in the entire application — `checkBookingConflict` in `src/lib/bookingService.ts:43-72`. Both booking surfaces call it. There is no second implementation and no database-level exclusion constraint enforcing it from the frontend's point of view.

```ts
// src/lib/bookingService.ts:43-72
export async function checkBookingConflict(
  technicianId: string,
  startDatetime: Date,
  endDatetime: Date
): Promise<{ hasConflict: boolean; conflictDetails?: string }> {
  const { data, error } = await supabase
    .from('calendar_bookings')
    .select('id, title, start_datetime, end_datetime')
    .eq('assigned_to', technicianId)
    .neq('status', 'cancelled')
    .lt('start_datetime', endDatetime.toISOString())
    .gt('end_datetime', startDatetime.toISOString());
  ...
}
```

**The overlap test lives in PostgREST, not in JavaScript.** The four filters *are* the algorithm:

1. `.eq('assigned_to', technicianId)` — scope to one person's calendar. **This single filter is the entire "per-technician" behaviour.**
2. `.neq('status', 'cancelled')` — a cancelled booking does not block.
3. `.lt('start_datetime', proposedEnd)` and `.gt('end_datetime', proposedStart)` — the standard half-open overlap test. Deliberately `lt`/`gt`, never `lte`/`gte`, so a booking starting at 10:00 can follow one ending at 10:00 without a false conflict, while a 09:07 overlap is still caught. The test file documents this explicitly and asserts it six ways.

If any row comes back, the **first** row (`data[0]`) is formatted into `"Already booked 9:00 AM – 10:00 AM (Inspection - Jane Smith)"`. On a query error the function **returns `{ hasConflict: false }`** — it fails open, deliberately, so a transient network fault does not block the admin from booking.

**Two callers, two shapes:**

**(a) Inspection booking** — `LeadBookingCard` → `bookInspection` (`bookingService.ts:104-118`). One 60-minute slot, one call, one technician. On conflict it returns `{ success: false, error: 'Technician already booked at this time. …' }` and no row is written.

**(b) Job booking** — `BookJobSheet` (`lines 328-365`). A job's hours are split into 8-hour day blocks by `computeDaySchedule`, then a `useEffect` loops **sequentially, day by day**, awaiting `checkBookingConflict(assignedTo, day.start, day.end)` for each, accumulating a `conflictMap` keyed by date string. `hasAnyConflict` gates `canSubmit` (line 393), so the sheet cannot be submitted while any day clashes.

**What PR #103 actually contributed here** (see Corrections §3): the banner now lists **each** clashing day rather than saying "Booking conflict detected"; `setConflictMap({})` runs at the top of the effect so a stale verdict is never attributed to a newly-selected technician; an orphan guard clears `assignedTo` when the id is not in the role-filtered `useTechnicians` list; and the conflict message gained an end time. Detection scope was untouched.

**Three important properties of today's design:**

- **`calendar_bookings.assigned_to` is NOT NULL.** A booking row must name exactly one technician. There is no "unassigned booking" state.
- **The job path already deletes-then-inserts.** `BookJobSheet:407-413` deletes *all* `event_type='job'` rows for the lead before inserting, so the number of rows per booking is not structurally fixed at one per day.
- **Nothing re-checks conflicts at write time.** The check happens on state change; the insert at line 431 is unguarded. Two admins booking the same slot concurrently both pass. This race exists today and multi-tech makes it wider, not narrower.

### 4b. What must change for two-tech blocking

**The recommended shape: fan out one `calendar_bookings` row per technician per day.**

Two techs on a 2-day job ⇒ 4 rows, each with its own `assigned_to`, all sharing `lead_id` + `event_type` (and, ideally, a new grouping column). One tech ⇒ unchanged row count.

This shape is worth arguing for, because it makes the "both calendars blocked" rule **fall out for free** across the whole read surface:

- Every `.eq('assigned_to', …)` filter in bucket C keeps returning correct rows — including the three inside `calculate-travel-time`, the realtime `postgres_changes` filter (which cannot express a join at all), and the Schedule page's per-technician calendar filter.
- `calendar_bookings.assigned_to` stays NOT NULL. No migration needed on that table.
- The job path's existing bulk delete already handles reschedule correctly.

The alternative — a second junction on `calendar_bookings` — makes all fifteen bucket-C filters silently wrong at once, and the realtime subscription unfixable. **This is a decision for SESSION 1; the wave order below assumes fan-out and calls out what changes if it goes the other way.**

**Function signatures that change shape:**

| Function | File:line | Today | Must become |
|---|---|---|---|
| `checkBookingConflict` | `bookingService.ts:43` | `(technicianId: string, start: Date, end: Date) => Promise<{hasConflict, conflictDetails?}>` | `(technicianIds: string[], start, end) => Promise<{hasConflict, conflicts: Array<{technicianId, technicianName, details}>}>`. **The return type must change too** — a single `conflictDetails` string cannot say *which* technician clashes, and the banner has to name them. Internally: `.in('assigned_to', technicianIds)` plus `select('…, assigned_to')` so results can be grouped. One round trip, not N. |
| `BookInspectionParams` | `bookingService.ts:14-28` | `technicianId: string; technicianName?: string` | `technicianIds: string[]; technicianNames?: string[]` — **ordered, index 0 = PRIMARY**. Order is the contract; a `Set` would destroy it. |
| `bookInspection` | `bookingService.ts:78` | Inserts 1 `calendar_bookings` row; sets `leads.assigned_to = technicianId` | Inserts N rows; sets `leads.assigned_to = technicianIds[0]`; writes N junction rows. Line 187's field-edit diff needs a second entry for the technician set. |
| `computeDaySchedule` | `BookJobSheet.tsx:134` | `(totalHours, startDate, startTime) => Day[]` | **Unchanged.** Days are technician-independent. The fan-out happens at insert. |
| The conflict `useEffect` | `BookJobSheet.tsx:328-365` | Sequential loop over days, one technician | Loop over days, all technicians per call. `conflictMap: Record<string, string>` becomes `Record<string, Array<{technicianId, name, details}>>`. |
| The orphan guard | `BookJobSheet.tsx:374-377` | `if (!technicians.some(t => t.id === assignedTo)) setAssignedTo('')` | Filter the array, keep the survivors, and **preserve order** so removing a secondary does not promote-then-demote the primary. |
| The reschedule diff | `BookJobSheet.tsx:485-535` | Index-pairs `oldBookings[i]` with `newBookings[i]`; reads `[0].assigned_to` | **Must group by `(dateStr, assigned_to)` before diffing.** Index pairing over a fan-out set mis-pairs every row. This is the quietest breakage in the whole project — it produces a plausible-looking but wrong audit trail. |
| `CheckAvailabilityParams` / `GetRecommendedDatesParams` | `useBookingValidation.ts:57-73` | `technicianId: string` | Keep singular and call **once per technician** from the UI, intersecting the results. Widening the wire contract forces an Edge Function deploy, which is global-immediate with no staging buffer. Calling twice needs zero EF change. |
| `TimeSlotValidatorProps` | `TimeSlotValidator.tsx:19` | `technicianId: string \| null` | `technicianIds: string[]`; render one availability block per technician; the debounce key at line 45 must include all ids. |
| `createJobCompletion` | `jobCompletions.ts:89` | `(leadId, inspectionId, completedBy: string)` — fed `auth.uid()` | Fed the lead's **PRIMARY** technician id, not `auth.uid()`. **This is a behaviour change, not a refactor** — see Corrections §5. |
| `fetchTechnicianName` consumer | `JobBookingDetails.tsx:108` | `bookings[0]?.assigned_to` | Distinct `assigned_to` across the booking set, ordered primary-first. |

**UI change (the visible half):** `BookJobSheet.tsx:191` `useState<string>('')` and the shadcn `<Select>` at line 743 become an ordered multi-select capped at two, with the first pick badged PRIMARY. `LeadBookingCard.tsx:1122` renders a 2-column technician grid with single selection — same change. Both must hold 48px touch targets at 375px.

**Not changing:** the half-open overlap bounds, `neq status cancelled`, the fail-open-on-error behaviour, `computeDaySchedule`, and `MAX_HOURS_PER_DAY = 8`.

---

## STEP 5 — FROZEN-SURFACE CHECK

# ⚠️ **YES — ONE HIT IS INSIDE THE FROZEN `ALL_STATUSES` REGION.**
# **`src/pages/LeadDetail.tsx:526` clears `assigned_to` on status reversion, inside the hardcoded index-threshold block. This work goes directly into the frozen zone.**

### 5a. The named protected files

```
$ ls -d src/auth
ls: src/auth: No such file or directory
$ ls src/contexts/AuthContext.tsx src/lib/calculations/pricing.ts src/lib/penaltyLadder.ts src/lib/statusFlow.ts
ls: src/lib/penaltyLadder.ts: No such file or directory
src/contexts/AuthContext.tsx
src/lib/calculations/pricing.ts
src/lib/statusFlow.ts
```

`src/auth/**` and `src/lib/penaltyLadder.ts` **do not exist**. The real penalty-ladder path is `src/lib/calculations/penaltyLadder.ts`.

Searching all four files that do exist:

```
$ rg -n -w -e 'assigned_to|assignedTo|technicianId|technician_id|technicianName|technician_name|inspector_id|inspector_name|completed_by|completedBy|remediation_completed_by|remediationCompletedBy|assigned_technician|technician|Technician' src/contexts/AuthContext.tsx src/lib/calculations/pricing.ts src/lib/statusFlow.ts src/lib/calculations/penaltyLadder.ts
src/lib/statusFlow.ts:86:    nextAction: 'Book the remediation job with a technician'
src/lib/statusFlow.ts:96:    nextAction: 'Technician to complete on-site work'
src/lib/statusFlow.ts:116:    nextAction: 'Admin review requested by technician'
src/lib/statusFlow.ts:229:// than a silent miscount on the Reports and Technician surfaces.
src/lib/statusFlow.ts:234: * Lifecycle stage each status represents, for the technician Workload Breakdown.
src/contexts/AuthContext.tsx:33:  userRoles: string[];              // ['admin', 'technician', 'developer']
```

**Verdict:** six hits, all prose — UI copy strings and comments. **Zero assignment-column hits.** `pricing.ts` and `penaltyLadder.ts`: zero matches of any kind. **No change is proposed to any of these four files, and none is needed.**

### 5b. `ALL_STATUSES` and the index thresholds — WE ARE IN IT

`ALL_STATUSES` is defined in `src/lib/statusFlow.ts:195-212` — inside a frozen file — and consumed by index arithmetic in `LeadDetail.tsx:514-555`:

```ts
// src/pages/LeadDetail.tsx:513-528
    const oldRank = ALL_STATUSES.indexOf(lead.status as LeadStatus);
    const newRank = ALL_STATUSES.indexOf(status);
    const isReversion = newRank >= 0 && oldRank >= 0 && newRank < oldRank;
    ...
    if (isReversion) {
      if (newRank < 1) {
        for (const f of ['assigned_to', 'inspection_scheduled_date', 'scheduled_time', 'scheduled_dates', 'booked_at']) {
          updates[f] = null;
          clearedFields.push(f);
        }
      }
```

Line 526 is a Tier-1 hit and it sits at the centre of the frozen mechanism. Concretely:

- **We must NOT reorder `ALL_STATUSES`.** Every threshold below (`< 1`, `< 2`, `< 6`, `< 7`, `< 10`, `< 11`) is a hardcoded index into that array. Reordering silently reassigns which financial columns get nulled — `invoice_amount`, `invoice_sent_date`, `payment_received_date`. **Nothing about this work requires touching the array, and nothing in the plan below does.**
- **We MUST extend line 526's behaviour**, and this is the hazard. Reverting a lead to rank 0 nulls the denormalised `assigned_to` pointer. Under dual-write, the junction rows survive that null. The result is a lead that reads as **unassigned** to every `assigned_to` consumer and **two-tech** to every junction consumer, with no error anywhere. The reversion must also delete the lead's junction rows, inside the same `if (newRank < 1)` branch, transactionally with the pointer null.
- The observed thresholds match `ALL_STATUSES` as it stands: index 0 `new_lead`, 1 `inspection_waiting`, 2 `inspection_ai_summary`, 6 `job_scheduled`, 7 `job_completed`, 10 `invoicing_sent`, 11 `paid`. `< 1` = "back to new lead". Correct semantics for clearing an assignment.

**Handling:** this change is isolated into its own PR (Wave 5) touching only `src/pages/LeadDetail.tsx`, so the frozen hunk gets focused review rather than arriving inside a large display refactor.

### 5c. Other risk-flagged surfaces encountered

- **`src/integrations/supabase/types.ts`** — generated. Global rule: *don't modify generated files*. Must be **regenerated** via type-gen against DEV, never hand-edited. 18 Tier-1 lines.
- **`src/hooks/useRevisionJobs.ts:42`** — `CLAUDE.md`: "useRevisionJobs.ts left dormant — do not activate." One bucket-C hit. Leave alone; make sure no bulk rewrite touches it.
- **Edge Functions** — `CLAUDE.md`: CLI-only, human-applied, **global-immediate, no staging buffer**. Any change to `calculate-travel-time` hits PROD the moment it deploys, against a frontend that has not shipped yet. The plan below avoids an EF change entirely under the fan-out model.
- **`src/lib/calculations/pricing.ts`** — zero hits. `MAX_HOURS_PER_DAY = 8` in `BookJobSheet` drives day-block splitting and is untouched by this work. The 13% cap and equipment rates are nowhere near it.

---

## STEP 6 — PROPOSED WAVE ORDER

**Blocking dependency, stated up front: Wave 1 cannot start until SESSION 1's junction-table migration has landed on DEV (`ctppzqnysmzynkxjlzta`).** Type-gen against a database without the table produces the old types silently and every later wave then compiles against a stale shape. Waves 2–5 are each blocked on their predecessor.

**Architectural assumption:** `calendar_bookings` fans out one row per technician per day (Step 4b). If SESSION 1 instead makes `calendar_bookings` itself many-to-many, insert a **Wave 2b** covering `supabase/functions/calculate-travel-time/index.ts` (3 filters), `src/hooks/useTechnicianJobs.ts:368` (realtime — likely unfixable as a filter, needs a server-side view), and every other bucket-C filter, and re-plan. Flag this back to SESSION 1 before Wave 2 starts.

File scopes below do not overlap between waves.

---

### Wave 1 — Foundation: types and the read helper
**Blocked on: SESSION 1's migration landing on DEV.**

| Files |
|---|
| `src/integrations/supabase/types.ts` *(regenerated, not hand-edited)* |
| `src/lib/api/leadTechnicians.ts` *(new)* |
| `src/hooks/useLeadTechnicians.ts` *(new)* |
| `src/lib/api/__tests__/leadTechnicians.test.ts` *(new)* |

**Ships independently:** yes. Nothing imports the new helper. Zero behaviour change.
**Breaks if out of order:** running type-gen before the migration lands emits the pre-junction types with no error, and Waves 2–5 then compile green against a table that does not exist. This is the single most likely way to lose a day.
**Preview verification:** pin the PR's preview URL from the Vercel PR-bot comment. **Unregister the service worker and clear caches first** — a green deploy does not mean the browser has the new bundle. Then: app loads; Schedule, Leads and Lead Detail render; zero new console errors. In the diff, confirm the junction table appears in `types.ts` with the expected columns.

---

### Wave 2 — Dual-write at the two booking surfaces

| Files |
|---|
| `src/lib/bookingService.ts` |
| `src/components/leads/BookJobSheet.tsx` |
| `src/components/schedule/LeadBookingCard.tsx` |
| `src/components/booking/TimeSlotValidator.tsx` |
| `src/hooks/useBookingValidation.ts` |
| `src/lib/__tests__/bookingService.conflict.test.ts` |
| `src/hooks/__tests__/useBookingValidation.recommendedDates.test.ts` |
| `src/hooks/__tests__/useBookingValidation.checkAvailability.test.ts` |
| `src/components/leads/__tests__/BookJobSheet.multiTech.test.tsx` *(new — covers the per-day × per-tech conflict loop, the reschedule regrouped diff, and the orphan guard)* |

**Ships independently:** yes, and it is the first wave with visible behaviour. Readers still consume `leads.assigned_to`, which keeps being written as the primary, so every un-migrated surface shows the primary and is *correct but incomplete* — never wrong.
**Breaks if out of order:** shipped before Wave 1, junction inserts are untyped and unverified. Shipped **after** the read waves, the UI would display secondary technicians that no writer can create — a phantom feature.
**Preview verification:** book an inspection with two techs. Confirm two `calendar_bookings` rows, two junction rows with the correct primary, and `leads.assigned_to` = primary. Then attempt an overlapping booking naming **only the secondary** and confirm it is blocked and the banner names that technician. Book a one-tech job and confirm the row count and copy are unchanged. Reschedule a two-tech multi-day job and confirm the activity timeline's day-by-day diff is correct (this is the regrouped diff — inspect it, do not assume). All at 375px with 48px targets.

---

### Wave 3 — Read migration: display surfaces

| Files |
|---|
| `src/components/leads/JobBookingDetails.tsx` |
| `src/components/leads/LeadCard.tsx` |
| `src/pages/LeadsManagement.tsx` |
| `src/components/schedule/EventDetailsPanel.tsx` |
| `src/components/schedule/CancelledBookingsList.tsx` |
| `src/hooks/useTodaysSchedule.ts` |
| `src/hooks/useCancelledBookings.ts` |
| `src/hooks/useScheduleCalendar.ts` |
| `src/pages/AdminDashboard.tsx` |
| `src/pages/AdminSchedule.tsx` |
| `src/components/schedule/ScheduleHeader.tsx` |
| `src/lib/utils/fieldLabels.ts` |
| `src/lib/api/notifications.ts` |
| `src/lib/api/__tests__/notificationsFanOut.test.ts` |

**Ships independently:** yes, once Wave 2 can create two-tech leads. Alone it is a pure display change.
**Breaks if out of order:** before Wave 2 there is no two-tech data, so the change is untestable and reviewers cannot tell correct from broken.
**Preview verification:** open the two-tech lead created in Wave 2. Both names must appear on the Leads table row, the lead card, the calendar chip, the event panel, Today's Schedule and the Admin dashboard. Open a one-tech lead and confirm nothing changed — no stray comma, no "X and " with an empty tail. Check the `assigned_to` label still reads "Assigned Technician" in the activity timeline. 375px, no horizontal scroll.

---

### Wave 4 — Filters, counters and the technician's own view

| Files |
|---|
| `src/hooks/useUnassignedLeads.ts` |
| `src/hooks/useAdminDashboardStats.ts` |
| `src/hooks/useLeadsToSchedule.ts` |
| `src/components/admin/AdminSidebar.tsx` |
| `src/hooks/useTechnicianDetail.ts` |
| `src/hooks/useTechnicianStats.ts` |
| `src/hooks/useTechnicianJobs.ts` |
| `src/hooks/useTechnicianAlerts.ts` |
| `src/lib/api/invoices.ts` |
| `src/lib/api/invoices.paidRevenue.test.ts` |

**Ships independently:** yes.
**Breaks if out of order:** the three `.is('assigned_to', null)` predicates and the raw `or()` string in `useLeadsToSchedule` are the drift-sensitive ones. Left un-migrated past Wave 2, a lead can carry junction rows while the pointer is momentarily null and appear in the unassigned queue; or carry a stale pointer with no junction rows and vanish from it. Both are silent.
**Under the fan-out model, `useTechnicianJobs` and `useTechnicianAlerts` may need no change at all** — verify on the preview *before* editing them. Do not refactor a filter that is already correct.
**Preview verification:** sign in on the preview as the **secondary** technician of the Wave-2 job. Their job list must show it, their alerts must fire, and the realtime toast must arrive when an admin edits the booking in another tab. Then check the unassigned count in the sidebar, the admin dashboard and the Schedule sidebar all agree with each other and with the Leads table. Open the secondary's technician detail page and confirm the job appears in upcoming jobs and in the stats. `src/hooks/useRevisionJobs.ts` stays untouched.

---

### Wave 5 — Risk-gated: reversion, "completed by" semantics, offline

| Files |
|---|
| `src/pages/LeadDetail.tsx` — **frozen region, requires Michael's explicit sign-off** |
| `src/lib/api/jobCompletions.ts` |
| `src/hooks/useJobCompletionForm.ts` |
| `src/components/job-completion/Section2Summary.tsx` |
| `src/components/leads/JobCompletionSummary.tsx` |
| `src/components/leads/JobCompletionEditSheet.tsx` |
| `src/types/jobCompletion.ts` |
| `src/lib/api/__tests__/jobCompletions.jobNumber.test.ts` |
| `src/lib/offline/SyncManager.ts` |

**Three separable concerns, deliberately grouped because each needs judgement rather than mechanical migration:**

1. **`LeadDetail.tsx:517-555` reversion** — extend the `newRank < 1` branch to delete junction rows alongside nulling `assigned_to`. **`ALL_STATUSES` is not touched, reordered, or re-indexed.** This hunk is the reason the PR needs sign-off.
2. **"Completed by" semantics** — change `createJobCompletion(leadId, inspectionId, user.id)` to pass the lead's **PRIMARY** technician. This is a behaviour change to a customer-facing PDF, not a refactor: today a secondary who fills the form prints as "completed by". No Edge Function change needed — `generate-job-report-pdf` already resolves the name from `completed_by`.
3. **Offline** — confirm and document that no Dexie migration is required (Step 3, bucket F), and add a guard so no technician array can leak into `formData` and reach the blind key-spread in `syncDraft`.

**Ships independently:** yes, last.
**Breaks if out of order:** shipped before Wave 2, the reversion has no junction rows to delete and the "primary" it would stamp does not exist yet.
**Preview verification:** create a two-tech lead, advance it to `inspection_waiting`, revert to `new_lead`, and confirm **both** the pointer and the junction rows are gone and the lead reappears in the unassigned queue exactly once. Separately: revert a paid lead one step and confirm `invoice_amount` and `payment_received_date` are untouched — the frozen-threshold regression check. Then have the **secondary** technician complete the job and confirm the generated PDF prints the **primary's** name.

---

### Deliberately out of scope

`inspections.inspector_id` / `inspector_name` (14 + 15 hits) and the inspection PDF path (`ViewReportPDF.tsx`, `InspectionAIReview.tsx`, `TechnicianInspectionForm.tsx`, `generate-inspection-pdf`) stay single-valued. The decided architecture scopes the junction to **lead → technicians**, not inspection → inspectors. Recorded here so a later reader does not mistake the omission for an oversight: a two-tech *inspection* will still print one inspector name.

`additional_info_technician`, `user_roles.assigned_by`, `scripts/preview-emails.ts`, `scripts/send-preview-emails.ts` and `supabase/functions/send-slack-notification/index.ts` (which only forwards a `technicianName` string it is handed) need no change.

---

## APPENDIX — VERIFICATION THAT THIS SESSION CHANGED NO CODE

```
$ git -C ~/mrc-multi-tech status --short --untracked-files=all
?? docs/multi-tech/SESSION-2-CODE-SURFACE-FINDINGS.md
?? docs/multi-tech/SESSION-3-REPORTING-FINDINGS.md
```

Two untracked files. `SESSION-2-CODE-SURFACE-FINDINGS.md` is this document — the only file SESSION 2 created. `SESSION-3-REPORTING-FINDINGS.md` was written by the parallel SESSION 3 into the same worktree; SESSION 2 did not read it, write it, or act on it.

**No `.ts` or `.tsx` file was modified.** No migration run, no deploy, no database queried. Every claim above traces to a ripgrep or git command whose output is pasted alongside it.

---

# ADDENDUM — FAN-OUT DOUBLE-COUNT SWEEP

Added after the main inventory, in response to a request for SESSION 2 to grep the aggregate/count patterns that fan-out would break. **This addendum materially corrects the wave plan in Step 6 and partially undercuts the fan-out recommendation in Step 4b. Read it before acting on either.**

## A1. My term-based grep under-covered the fan-out blast radius

Steps 2–3 searched for technician *column and field names*. Fan-out breaks a different class of code: anything that queries `calendar_bookings` and **counts, claims, or renders one row per booking**, whether or not it ever mentions `assigned_to`.

```
$ rg -n "from\('calendar_bookings'\)" src/ supabase/functions api scripts
```

**27 call sites across 20 files.** Eight of them are in files with **zero Tier-1 hits** and therefore appear nowhere in the Step 3 table:

| File | Line | Tier-1 hits |
|---|---|---|
| `src/hooks/useReportsData.ts` | 148 | 0 |
| `src/pages/TechnicianJobDetail.tsx` | 150 | 0 (its 1 hit is a type at line 52) |
| `src/pages/TechnicianInspectionForm.tsx` | 3065 | 0 at this site |
| `src/pages/LeadDetail.tsx` | 577, 584 | 0 at these sites |
| `src/components/schedule/EventDetailsPanel.tsx` | 51 | 0 at this site |
| `supabase/functions/export-inspection-context/index.ts` | 94 | 0 |
| `supabase/functions/send-inspection-reminder/index.ts` | 273, 334, 461 | 0 |

**Correction to my own figures:** 304/268/49 remains the correct count *of technician-assignment identifiers*. It is **not** a complete map of what fan-out touches. The fan-out blast radius is the union of that set and these 27 booking-query sites.

## A2. The pattern, named

> **A query is fan-out-unsafe if it treats a `calendar_bookings` row as equivalent to a booking event — counting rows, claiming rows by `id`, or rendering one item per row — without grouping by `(lead_id, event_type, start_datetime)` or an explicit group id.**

It is fan-out-**safe** if it is filtered by `assigned_to` (each technician legitimately sees their own row), or if it already dedupes by `lead_id`.

## A3. Confirmed unsafe — customer-facing

### 🔴 Duplicate inspection-reminder emails — `supabase/functions/send-inspection-reminder/index.ts`

The reminder claim is a per-row compare-and-swap:

```
334:      const { data: claimedRows, error: claimError } = await supabase
335:        .from('calendar_bookings')
336:        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
337:        .eq('id', booking.id)
338:        .eq('reminder_sent', false)
339:        .select('id');
```

Two technicians ⇒ two rows ⇒ two independent `reminder_sent` flags ⇒ **the customer receives two identical reminder emails.**

This is not hypothetical. The code carries a comment describing the exact incident this CAS was written to fix:

```
330:      // first one still sees reminder_sent = false and the others match zero
331:      // rows. The SELECT above cannot do this job — both invocations clear it
332:      // before either writes, which is what caused the duplicate sends.
```

Fan-out reintroduces that bug through a door the CAS cannot close, because the two rows are now *legitimately distinct*. **A group id does not fix this on its own — the claim must move to the group, so exactly one row per group wins the reminder.** Same applies to the release path at line 461.

**I did not account for this in Step 4b or Step 6. It is the strongest argument against fan-out found so far, and it must be designed for explicitly, not discovered in production.**

### 🔴 "Today's Jobs" double-counts — `src/hooks/useAdminDashboardStats.ts:88-92`

```
 88:          .from('calendar_bookings')
 89:          .select('*', { count: 'exact', head: true })
 90:          .lt('start_datetime', endOfTodayISO)
 91:          .gt('end_datetime', startOfTodayISO)
 92:          .neq('status', 'cancelled'),
```

No `assigned_to` filter, no dedupe. A single two-tech job renders as **2** on the admin dashboard's headline tile. The existing comment shows the overlap predicate was carefully reasoned about for multi-*day* bookings; multi-*technician* was never in scope.

## A4. Confirmed changed-meaning — needs a product decision, not a fix

| Site | Behaviour under fan-out |
|---|---|
| `src/hooks/useTodaysSchedule.ts:89-105` | Maps 1 row → 1 `ScheduleItem`. Job appears **twice** in Today's Schedule, once per technician. Arguably *desirable* — each technician's slot is shown. Must be a decision. |
| `src/hooks/useScheduleCalendar.ts:235,261` | Same 1-row-1-event mapping. With the technician filter set to "All", the calendar shows **two chips for one job**. With a technician selected, correct. |
| `src/hooks/useCancelledBookings.ts:82,104` | Cancelled list shows the job twice. |
| `src/pages/LeadDetail.tsx:577-589` | Reversion cancels by `lead_id`, so it correctly cancels **all** rows. But `cancelledBookingIds` / `preservedBookingIds` in the audit metadata will hold 2× ids. Cosmetic, worth a note. Sits immediately below the frozen line 526. |

## A5. Confirmed safe under fan-out

| Site | Why |
|---|---|
| `supabase/functions/calculate-travel-time/index.ts:739, 1073, 1395` | All three filtered by `assigned_to`. `appointmentCount = dayAppts.length` (line 1432) counts one technician's own day. **Correct per technician — this is the core of the fan-out case and it holds.** |
| `src/hooks/useTechnicianJobs.ts:283, 368` · `useTechnicianAlerts.ts:191` · `useTechnicianDetail.ts:206, 286` · `useTechnicianStats.ts:204, 216` | All `assigned_to`-filtered. Each technician sees their own row. |
| `src/hooks/useReportsData.ts:148` | Dedupes by `lead_id` via `earliestBookingByLead` taking the min `created_at`. Two rows share a `created_at`, so the min is stable. |
| `src/hooks/useTechnicianStats.ts:261` | `upcomingKeys.add(\`${booking.lead_id}\|${booking.event_type}\`)` — a `Set` keyed by lead + event type, per technician. Already dedupe-safe by construction. |
| `src/pages/TechnicianJobDetail.tsx:150` · `TechnicianInspectionForm.tsx:3065` · `export-inspection-context:94` | `.limit(1).maybeSingle()`. Picks an arbitrary row of the pair, but reads only schedule fields identical across the pair. Safe today; fragile if per-row fields ever diverge. |

## A6. Amendment to the Step 6 wave plan

Step 6's five waves do **not** cover A3 or A4. Two changes are required:

**New Wave 2a — fan-out safety, ships with or immediately before Wave 2:**

| Files |
|---|
| `supabase/functions/send-inspection-reminder/index.ts` — move the claim from row id to group id |
| `src/hooks/useAdminDashboardStats.ts` — dedupe the Today's Jobs count |

Edge Function deploys are CLI-only and global-immediate. The reminder function must be group-aware **before** any two-row booking can exist in the database, or the first two-tech booking sends a duplicate email with no code change in between. **This is the one ordering constraint in the whole plan where getting it wrong is visible to a customer.**

**Wave 3 additions** (display surfaces, all previously listed in that wave — no new files): `useTodaysSchedule.ts`, `useScheduleCalendar.ts`, `useCancelledBookings.ts` need an explicit decision on show-twice vs collapse-with-both-names, not just a name-widening.

## A7. On the `completed_by` / `submitted_by` proposal — code-side assessment only

The proposal (`completed_by` = primary from the junction; new `submitted_by` = `auth.uid()`) is sound from the code side and separates two things the schema currently conflates. Evidence that they are conflated today:

```
$ rg -n 'createJobCompletion' src/hooks/useJobCompletionForm.ts
256:        const row = await createJobCompletion(leadId, inspectionId, user.id)
```

Three code-side notes for whoever designs the migration:

1. **`completed_by` is NOT NULL** (`types.ts:1043`). A backfill cannot leave it empty for historical rows.
2. **`useJobCompletionForm.ts:277` independently defaults the free-text `remediationCompletedBy` to the signed-in user's `full_name`.** If `completed_by` becomes the primary but this default is left alone, the PDF's two "who did it" fields will disagree — `generate-job-report-pdf:212` prefers the `completed_by` profile name and falls back to `remediation_completed_by`, so the disagreement stays hidden until the profile lookup fails.
3. **Adding `submitted_by` touches an audited table.** `job_completions` is one of the 10 tables with audit triggers per `CLAUDE.md`. New column, existing triggers — worth confirming the trigger definition does not enumerate columns.

**Detection query for the existing mismatch — READ-ONLY, for SESSION 1 to run against DEV first. I have not run it and have no database access this session.**

```sql
-- How many historical job_completions were submitted by someone
-- other than the lead's assigned technician?
select
  count(*) filter (where jc.completed_by is distinct from l.assigned_to) as mismatched,
  count(*) filter (where jc.completed_by = l.assigned_to)                as matched,
  count(*) filter (where l.assigned_to is null)                          as lead_unassigned,
  count(*)                                                               as total
from job_completions jc
join leads l on l.id = jc.lead_id;
```

`lead_unassigned` is the row that decides the backfill strategy: those leads have no pointer to promote, so a backfill cannot derive a primary for them and must either keep the existing `completed_by` or leave them for manual review. **Note the pointer may itself have been nulled by the `LeadDetail.tsx:526` reversion path, so a null there does not prove the job was never assigned.**

## A8. Verdict on fan-out, revised

**Still the right call, but the case is narrower than I stated in Step 4b.**

For: it keeps all fifteen `assigned_to`-filtered query sites correct with zero changes, including the realtime `postgres_changes` subscription (`useTechnicianJobs.ts:368`) which cannot express a join and has no fix under a bookings junction; it keeps `calendar_bookings.assigned_to` NOT NULL; per-technician uniqueness becomes a plain per-row constraint; and A5 confirms the travel-time Edge Function — the densest technician file in the repo — stays correct untouched.

Against, and I did not weigh this in Step 4b: fan-out silently converts "one row per booking event" into "one row per technician per booking event", and **three places depend on the old invariant without ever naming `assigned_to`** — the reminder claim (customer-facing duplicate email), the dashboard count, and the reschedule index-paired diff. A group id addresses the diff and the count. **The reminder claim needs its own deliberate fix and is the item most likely to be missed.**

Net: fan-out is still cheaper and safer than a bookings junction, but only if Wave 2a lands first.

---

*Addendum evidence: all commands run read-only against `~/mrc-multi-tech` @ `c47b8ed`. No file outside this document was created or modified.*

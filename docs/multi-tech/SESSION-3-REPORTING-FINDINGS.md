# Session 3 — Reporting & Identity Surface

**Scope:** Which technician name reaches which audience, and what happens to that
when a lead can carry more than one technician.

**Date:** 2026-08-28
**Worktree:** `~/mrc-multi-tech`, branch `feat/multi-tech-inventory`, HEAD `c47b8ed`
**Method:** Read-only file analysis. No database queries were run (Session 1 owns
those). No code, template, Edge Function, migration, or Storage object was modified.

---

## Step 0 — Environment check

```
$ git -C ~/mrc-multi-tech branch --show-current
feat/multi-tech-inventory

$ git -C ~/mrc-multi-tech status
On branch feat/multi-tech-inventory
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

Branch correct, tree clean. Proceeded.

---

## Premise corrections — read these first

Three assumptions in the session brief do not survive contact with the code. They
change what Steps 2 and 5 are even about, so they lead.

### PC-1 — `ai_summary_versions.inspector_id` does not exist

The table is created in one migration and never altered afterwards:

`supabase/migrations/20260501132838_phase3_stage_3_1_ai_summary_versions_table.sql`

Its columns are: `id`, `inspection_id`, `version_number`, `generation_type`,
`generated_by`, `generated_at`, `model_name`, `model_version`,
`system_prompt_hash`, `user_prompt`, `prompt_tokens`, `response_tokens`,
`regeneration_feedback`, `ai_summary_text`, `what_we_found_text`,
`what_we_will_do_text`, `what_you_get_text`, `problem_analysis_content`,
`demolition_content`, `superseded_at`, `superseded_by_version_id`, `approved_at`,
`approved_by`.

No `inspector_id`. The generated types agree — `src/integrations/supabase/types.ts:83-107`
lists the same set. A search for any later `ALTER TABLE public.ai_summary_versions`
returns exactly one hit, and it is `ENABLE ROW LEVEL SECURITY` (line 59 of the same
migration).

The word `inspector_id` *does* appear in that migration, at line 71:

```sql
CREATE POLICY "technicians_see_assigned" ON public.ai_summary_versions
  FOR SELECT TO authenticated
  USING (
    inspection_id IN (
      SELECT id FROM public.inspections
      WHERE inspector_id = auth.uid()
    )
  );
```

That is `inspections.inspector_id`, referenced through a subquery. It is almost
certainly the origin of the brief's assumption.

**Consequence:** Step 2 is retargeted onto the two columns that actually exist and
actually carry singular technician identity:

- **`inspections.inspector_id`** (UUID, FK to `auth.users`) — the real singular
  column, and the one that is genuinely load-bearing.
- **`ai_summary_versions.generated_by`** (UUID, nullable) — the actual AI-summary
  provenance column.

*Caveat:* `types.ts` is generated and could be stale. See PENDING-1.

### PC-2 — Both columns are load-bearing for security, not "reporting metadata"

The brief states "Nothing enforces security on these." That is not correct for
either column.

`job_completions.completed_by` appears in **five** RLS policy bodies in
`supabase/migrations/20260414000003_harden_photos_rls.sql` — lines 30, 48, 67, 80,
99 — covering technician SELECT, INSERT, UPDATE (USING and WITH CHECK), and DELETE
on `public.photos`. The shape in every one:

```sql
OR EXISTS (
  SELECT 1 FROM public.job_completions jc
  WHERE jc.id = photos.job_completion_id
    AND jc.completed_by = auth.uid()
)
```

`inspections.inspector_id` appears in RLS on `inspections`
(`20251111000002_enable_rls_on_inspections.sql:22,31,39,40`;
`20251028135212_...sql:402`; `20251111000016_...sql:97,112,117,703`), on
`inspection_areas` (`20251118000000_fix_inspection_areas_rls.sql:18`), on the PDF
system tables (`20241221000000_add_pdf_system.sql:71,88`), and gates
`ai_summary_versions` reads via the subquery quoted above.

**Consequence:** these columns are display *and* access control. Any change to
either is a security change. Step 5 is written accordingly.

### PC-3 — Template naming and drift

The brief names `pdf-templates/inspection-report-template-final.html`. That is the
**inspection** report template. The **job** report — the one that carries
`completed_by` — uses a different object:

| Report | Runtime object (Storage) | Fetched at | Local repo copy | Local copy last changed |
|---|---|---|---|---|
| Inspection | `pdf-templates/inspection-report-template-final.html` | `generate-inspection-pdf/index.ts:12` | `src/templates/inspection-report-template.html` | `2c3d9a6`, 2026-08-26 |
| Job | `pdf-templates/job-report-template.html` | `generate-job-report-pdf/index.ts:10` | `src/templates/job-report-template.html` | `7dae371`, 2026-07-28 |

Note the local inspection copy does **not** carry the `-final` suffix the live
object does. Everything this document says about template *content* is read from
the **local repo copies**, which are inert at runtime and may have drifted from
what is live in Storage. Neither was modified. Both were read only.

There is also `public/job-report-preview.html`, a byte-identical-looking copy of
the job template at the lines examined (`:179`, `:181`). It is served from the app's
public dir, not fetched by any Edge Function.

---

## Step 1 — `completed_by` end to end

### 1.1 Grep results

```
$ grep -rn "completed_by" ~/mrc-multi-tech/src/
src/types/jobCompletion.ts:127:  completed_by: string;
src/types/jobCompletion.ts:128:  remediation_completed_by: string | null;
src/integrations/supabase/types.ts:1043:          completed_by: string
src/integrations/supabase/types.ts:1083:          remediation_completed_by: string | null
src/integrations/supabase/types.ts:1119:          completed_by: string
src/integrations/supabase/types.ts:1159:          remediation_completed_by?: string | null
src/integrations/supabase/types.ts:1195:          completed_by?: string
src/integrations/supabase/types.ts:1235:          remediation_completed_by?: string | null
src/components/leads/JobCompletionSummary.tsx:228:    queryKey: ['profile', jobCompletion.completed_by],
src/components/leads/JobCompletionSummary.tsx:233:        .eq('id', jobCompletion.completed_by)
src/components/leads/JobCompletionSummary.tsx:237:    enabled: !!jobCompletion.completed_by,
src/components/leads/JobCompletionSummary.tsx:242:    jobCompletion.remediation_completed_by ??
src/hooks/useJobCompletionForm.ts:81:    remediationCompletedBy: row.remediation_completed_by ?? '',
src/lib/api/invoices.ts:228:    .select('id, total_amount, paid_at, job_completion:job_completions(completed_by), lead:leads(assigned_to)')
src/lib/api/invoices.ts:242:    job_completion: { completed_by: string | null } | null
src/lib/api/invoices.ts:248:    technicianId: row.job_completion?.completed_by ?? row.lead?.assigned_to ?? null,
src/lib/api/invoices.paidRevenue.test.ts:133:        job_completion: { completed_by: TECH }, lead: { assigned_to: 'someone-else' },
src/lib/api/jobCompletions.ts:18:  if (data.remediationCompletedBy !== undefined) row.remediation_completed_by = data.remediationCompletedBy || null
src/lib/api/jobCompletions.ts:187:      completed_by: completedBy,
src/pages/LeadDetail.tsx:413:  // Fetch the technician profile for job_completions.completed_by
src/pages/LeadDetail.tsx:416:    queryKey: ['profile', jobCompletion?.completed_by],
src/pages/LeadDetail.tsx:418:      if (!jobCompletion?.completed_by) return null;
src/pages/LeadDetail.tsx:422:        .eq('id', jobCompletion.completed_by)
src/pages/LeadDetail.tsx:426:    enabled: !!jobCompletion?.completed_by,
src/pages/LeadDetail.tsx:1024:          jobCompletion?.remediation_completed_by ??
src/pages/LeadDetail.tsx:1092:          jobCompletion?.remediation_completed_by ??
```

```
$ grep -rn "completed_by" ~/mrc-multi-tech/supabase/
supabase/migrations/20260414000003_harden_photos_rls.sql:30:        AND jc.completed_by = auth.uid()
supabase/migrations/20260414000003_harden_photos_rls.sql:48:        AND jc.completed_by = auth.uid()
supabase/migrations/20260414000003_harden_photos_rls.sql:67:        AND jc.completed_by = auth.uid()
supabase/migrations/20260414000003_harden_photos_rls.sql:80:        AND jc.completed_by = auth.uid()
supabase/migrations/20260414000003_harden_photos_rls.sql:99:        AND jc.completed_by = auth.uid()
supabase/functions/generate-job-report-pdf/index.ts:209:      .eq('id', jc.completed_by)
supabase/functions/generate-job-report-pdf/index.ts:212:    const technicianName = profile?.full_name || jc.remediation_completed_by || 'Technician'
```

No migration in this repo creates the `job_completions` table, so the column
definition predates the tracked migration history. Per generated types, it is
`completed_by: string` — **NOT NULL** (`types.ts:1043`, and required in the Insert
type at `:1119`).

### 1.2 Where it is WRITTEN, and from what value

**Exactly one write path. There is no update path.**

`src/lib/api/jobCompletions.ts:89-208` — `createJobCompletion(leadId, inspectionId, completedBy)`:

```ts
const { data, error } = await supabase
  .from('job_completions')
  .insert({
    lead_id: leadId,
    inspection_id: inspectionId,
    ...
    completed_by: completedBy,
    completion_date: new Date().toISOString().split('T')[0],
    ...
    status: 'draft',
  })
```

The only caller is `src/hooks/useJobCompletionForm.ts:256`:

```ts
const row = await createJobCompletion(leadId, inspectionId, user.id)
```

`user.id` is the **currently authenticated user**, taken from the auth context of
whoever first opens the job-completion form for that lead. It is not read from
`leads.assigned_to`, not from `calendar_bookings.assigned_to`, and not from any
notion of "who was booked".

The surrounding code makes the intent explicit — it runs `getJobCompletionByLeadId`
first and only inserts when no draft exists (`useJobCompletionForm.ts:231-241`).
So the value is **"the first person to open the form"**, permanently.

`formDataToRow` (`jobCompletions.ts:9-...`) never emits `completed_by`, and
`updateJobCompletion` only writes what `formDataToRow` produces. Confirmed by grep:
`completed_by:` appears once in that file, at line 187, inside the insert.

**`completed_by` is therefore create-only and immutable in application code.**

#### The sibling field: `remediation_completed_by`

Different column, different type, different behaviour. `TEXT`, nullable
(`types.ts:1083`). Free text. Written by `formDataToRow`:

```ts
// src/lib/api/jobCompletions.ts:18
if (data.remediationCompletedBy !== undefined) row.remediation_completed_by = data.remediationCompletedBy || null
```

UI at `src/components/job-completion/Section2Summary.tsx:133-150` — a plain text
input labelled "Remediation Completed By", placeholder "Name of the person who
completed the work". Pre-filled at `useJobCompletionForm.ts:258-277` with the
logged-in user's profile name, with this comment:

```
// Pre-populate "Remediation Completed By" with the logged-in user's
// name — they can override it in the form if someone else did the work.
```

Type comment at `src/types/jobCompletion.ts:41`: `// free-text name of who did the work`.

### 1.3 Where it is READ

| # | Reader | Location | Purpose | Audience |
|---|---|---|---|---|
| R1 | photos RLS ×5 | `20260414000003_harden_photos_rls.sql:30,48,67,80,99` | Technician SELECT/INSERT/UPDATE/DELETE on `public.photos` | **SECURITY** |
| R2 | Job report PDF | `generate-job-report-pdf/index.ts:205-212` → `:306` | Resolves `{{technician_name}}` on the cover | **CUSTOMER** |
| R3 | Paid revenue attribution | `src/lib/api/invoices.ts:228,248` | `technicianId` on every paid invoice | INTERNAL |
| R4 | Job completion summary | `src/components/leads/JobCompletionSummary.tsx:227-243,454` | "Completed By" field | INTERNAL |
| R5 | Lead detail status cards | `src/pages/LeadDetail.tsx:413-426,1023,1091` | "Submitted by {name}" on `pending_review` + `job_completed` | INTERNAL |

### 1.4 Data-flow trace: form submit → DB → PDF/email → customer

```
[1] Technician opens /technician/job-completion/:leadId
     └─ useJobCompletionForm.ts:231  getJobCompletionByLeadId(leadId)
         ├─ draft exists  → load it. completed_by is NOT touched. ────────┐
         └─ no draft      → createJobCompletion(leadId, inspectionId,     │
                              user.id)                                    │
                            jobCompletions.ts:187                         │
                            INSERT job_completions.completed_by = user.id │
                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ │
                            "first person to open the form"               │
                                                                          │
[2] Tech fills Section 2. "Remediation Completed By" free-text is         │
    pre-filled with their own profile name; they may overwrite it.        │
     └─ updateJobCompletion → remediation_completed_by = <free text>      │
        completed_by is never in this payload. ───────────────────────────┤
                                                                          │
[3] Tech submits. submitJobCompletion() sets status + lead status.        │
    completed_by unchanged. ──────────────────────────────────────────────┤
                                                                          │
[4] Admin approves on LeadDetail.                                         │
     └─ handleApproveJobCompletion (LeadDetail.tsx:641-662)               │
         └─ generateJobReportPdf(jobCompletion.id)                        │
                                                                          │
[5] EF generate-job-report-pdf                                            │
     ├─ :178  SELECT * FROM job_completions WHERE id = ?  ◄───────────────┘
     ├─ :205  SELECT full_name FROM profiles WHERE id = jc.completed_by
     ├─ :212  technicianName = profile?.full_name
     │                      || jc.remediation_completed_by
     │                      || 'Technician'
     ├─ :282  fetch(pdf-templates/job-report-template.html)   [Storage]
     └─ :306  '{{technician_name}}': escapeHtml(technicianName)

[6] Template renders it on the cover page, navy info card, Row 1:
     src/templates/job-report-template.html:180-181
       <div ...>TECHNICIAN:</div>
       <div ... text-transform: uppercase; ...>{{technician_name}}</div>

[7] api/render-job-report-pdf.ts (hard_save) renders that HTML to PDF,
    hashes it (:363), uploads to report-pdfs/, INSERTs a
    job_completion_pdf_versions row with html_hash + generation_type='hard_save'.

[8] Admin sends. ViewReportPDF.tsx:1169 builds the email; sendEmail attaches
    the hard-saved PDF by signed URL (:1165). Resend delivers.

[9] CUSTOMER opens the PDF and reads one name on the cover.
```

### 1.5 Findings on this path

**F1 — `completed_by` does not mean what its readers assume it means.**
It records the first person to open the form. Every reader treats it as "the
technician who did the work": the PDF calls it TECHNICIAN, the summary calls it
"Completed By", `LeadDetail` calls it "Submitted by", and `invoices.ts:223` documents
it as *"the technician who completed the job"*. Today, with one tech per lead, the
gap is usually invisible. With two techs on a lead it becomes a coin flip on who
opens the app first — and that coin flip prints on a customer document.

**F2 — the tech-editable name field is dead on the customer PDF.**
`generate-job-report-pdf/index.ts:212` is an `||` chain:

```ts
const technicianName = profile?.full_name || jc.remediation_completed_by || 'Technician'
```

`remediation_completed_by` only wins when the profile lookup returns nothing or the
profile's `full_name` is empty/null. Since `completed_by` is NOT NULL and points at
a real user, the profile row will normally exist. So the free-text field the
technician is explicitly invited to override — the one whose UI comment says *"they
can override it in the form if someone else did the work"* — has no effect on what
the customer sees.

This matters for multi-tech: `remediation_completed_by` is the obvious place to put
"Michael & Clayton", and in its current wiring it cannot win. Note the two internal
readers use the **opposite** precedence-with-same-order but do reach the fallback
(`JobCompletionSummary.tsx:240-243`, `LeadDetail.tsx:1022-1025`), so internal
screens and the customer PDF can disagree.

Needs a live check before being called a certainty — see PENDING-2.

**F3 — `completed_by` is an access-control key.** See PC-2. A secondary technician
on a job today has no path to the job's photos: `photos` technician policies grant
access only via `inspections → leads.assigned_to` or via `job_completions.completed_by`,
and a secondary matches neither.

---

## Step 2 — `inspector_id` end to end

Retargeted per PC-1. `ai_summary_versions.inspector_id` does not exist, so this
section covers the two columns that do.

### 2.1 `ai_summary_versions` provenance — the direct answer

**It is purely internal provenance. It is never displayed to a customer.**

Evidence, not inference:

1. **No `inspector_id` column exists** to display. Migration
   `20260501132838_...sql` (full column list quoted in PC-1) and `types.ts:83-107`.

2. **`generated_by` — the real provenance column — is written in two places and
   read in none that render a name.**
   - Written: `generate-inspection-summary/index.ts:559` (`generated_by: userId ?? null`,
     where `userId` is an optional UUID from the request body, `:16`);
     `InspectionAIReview.tsx:271` and `ViewReportPDF.tsx:1630` (both
     `generated_by: editorId` on `manual_edit` versions).
   - Read: `grep -rn "generated_by" src/` returns only the three writes above, plus
     `types.ts` declarations, plus `ViewReportPDF.tsx:523`, which selects
     `generated_by` from **`pdf_versions`** (a different table) into the versions
     panel — an admin-only surface behind `RoleProtectedRoute allowedRoles={["admin"]}`
     (`App.tsx:465-475`).
   - **No component renders `ai_summary_versions.generated_by` at all.**

3. **The customer-facing PDF never reads the table's identity columns.** The only
   identity value `generate-inspection-pdf` resolves is `inspectorName`, and it
   comes from a different table entirely: `inspection.inspector_name`
   (`generate-inspection-pdf/index.ts:2181`).

4. **`ai_summary_versions` is not even reachable by an unauthenticated party** — RLS
   is enabled with two `TO authenticated` policies (admins, and technicians on their
   own inspections). Migration lines 59-75.

5. **There is no public customer route.** Every route in `src/App.tsx` that could
   render report content is wrapped in `ProtectedRoute`; the report routes add
   `RoleProtectedRoute allowedRoles={["admin"]}`. The only unauthenticated routes
   are `/`, `/request-inspection`, `/request-inspection/success`, `/forgot-password`,
   `/check-email`, `/reset-password` (`App.tsx:88-93`). Customers receive PDFs and
   emails; they never load app UI.

**One indirect exposure, flagged rather than dismissed.** The inspector's *name* is
injected into the AI prompt:

```ts
// supabase/functions/generate-inspection-summary/index.ts:219
if (formData.inspector) lines.push(`INSPECTOR: ${sanitizeField(formData.inspector)}`)
```

fed from `inspection?.inspector_name` (`InspectionAIReview.tsx:1013`). The generated
text is customer-facing. If the model ever echoes the inspector's name into
`ai_summary_text`, a technician name reaches the customer through a channel nobody
is watching. Low likelihood, non-zero. See PENDING-4.

### 2.2 `inspections.inspector_id` — written

Two paths, and they disagree with each other.

**Online path — `src/pages/TechnicianInspectionForm.tsx`**

```ts
// :4053-4057
const inspectionRow: Record<string, any> = {
  lead_id: leadId,
  inspector_id: user.id,
  inspector_name: formData.inspector,
  ...
```

This same `inspectionRow` object is used for **both** branches:

```ts
// :4132-4154
if (inspectionId) {
  // UPDATE existing inspection
  const { error: updateError } = await supabase
    .from('inspections')
    .update(inspectionRow)
    .eq('id', inspectionId);
  ...
} else {
  // INSERT new inspection
  ... .insert(inspectionRow) ...
}
```

So **every save rewrites `inspector_id` to whoever is currently logged in**, and
rewrites `inspector_name` to whatever is in `formData.inspector`.

**Offline path — `src/lib/offline/SyncManager.ts:192-231`** — does the opposite:

```ts
if (draft.remoteInspectionId) {
  // Update existing inspection - remove lead_id and inspector_id from update
  const { lead_id: _l, inspector_id: _i, ...updatePayload } = dbPayload;
  ...
```

The offline sync path deliberately strips `inspector_id` from updates. The online
path does not. The two paths have opposite semantics for the same column.

**`inspector_name` prefill race.** `TechnicianInspectionForm.tsx:3428-3439`:

```ts
// Set inspector name from logged-in user
useEffect(() => {
  if (user?.user_metadata) {
    const firstName = user.user_metadata.first_name || '';
    const lastName  = user.user_metadata.last_name  || '';
    const fullName = `${firstName} ${lastName}`.trim() || user.email || '';
    setFormData((prev) => ({ ...prev, inspector: fullName }));
  }
}, [user]);
```

This effect has no guard against an already-loaded value, and its dependency is
`[user]`. The competing write is inside the async `fetchData` effect at `:3309`
(`inspector: ins.inspector_name || prev.inspector`). Whichever resolves last wins.
If `user` settles after `fetchData` — a normal auth-hydration ordering — the
logged-in user's name overwrites the stored inspector name in form state, and the
next save persists it.

Combined with the unconditional `inspector_id: user.id` above, the online form's
behaviour today is: **the last technician to open and save an inspection becomes
its inspector**, in both the UUID column and the printed name column.

Under one-tech-per-lead this is nearly unobservable. Under multi-tech it is the
default path.

### 2.3 `inspections.inspector_id` — read

| Reader | Location | Purpose | Audience |
|---|---|---|---|
| `inspections` RLS | `20251111000002_...sql:22,31,39,40`; `20251028135212_...sql:402`; `20251111000016_...sql:97,112,117,703` | Technician row access | **SECURITY** |
| `inspection_areas` RLS | `20251118000000_fix_inspection_areas_rls.sql:18` | Technician area access | **SECURITY** |
| `ai_summary_versions` RLS | `20260501132838_...sql:71` | Technician summary reads | **SECURITY** |
| PDF-system RLS | `20241221000000_add_pdf_system.sql:71,88` | Report row access | **SECURITY** |
| `useTechnicianStats` | `src/hooks/useTechnicianStats.ts:192-193,249-251` | `inspectionsTotal` per tech | INTERNAL |
| `useTechnicianDetail` | `src/hooks/useTechnicianDetail.ts:171` | Today/week/month inspection counts | INTERNAL |

`inspector_id` never reaches a customer. It has no customer-facing read at all.

### 2.4 `inspections.inspector_name` — the one that actually prints

This is the column that produces the name on the customer inspection report, and it
is a separate free-text column from `inspector_id`.

**Written:** `TechnicianInspectionForm.tsx:4057` (insert and update, per 2.2); and
directly by admin inline-edit in `ViewReportPDF.tsx:2245`:

```ts
const fieldMap: Record<string, { table: 'inspections' | 'leads'; column: string; ... }> = {
  ordered_by:  { table: 'inspections', column: 'requested_by' },
  inspector:   { table: 'inspections', column: 'inspector_name' },
  date:        { table: 'inspections', column: 'inspection_date' },
  ...
```

**Read → customer:** `generate-inspection-pdf/index.ts:2181`:

```ts
const inspectorName = inspection.inspector_name || 'Inspector'
```

then `:1747`:

```ts
html = html.replace(/\{\{inspector\}\}/g, escapeHtml(inspectorName))
```

**Read → internal:** `InspectionDataDisplay.tsx:194`, `InspectionAIReview.tsx:723`,
`ViewReportPDF.tsx:1505` (page-1 preview data).

**This is significant for Step 4:** an admin-editable free-text override for the
printed inspector name **already exists** in the product. Whatever multi-tech
decision is made, admins can already type any string into that slot. The equivalent
does not exist on the job-report side, because `remediation_completed_by` is
outranked (F2).

---

## Step 3 — Every surface that renders a technician name

### 3.1 CUSTOMER-facing surfaces

There are four, and only four. All reach the customer by email; there is no public
web surface (`App.tsx:88-93` — the unauthenticated routes render Login, the public
lead-capture form, and password flows).

| # | Surface | File | Placeholder / variable | Source column |
|---|---|---|---|---|
| C1 | **Inspection report PDF — cover, "INSPECTOR:"** | `src/templates/inspection-report-template.html:175` (local copy) | `{{inspector}}` | `inspections.inspector_name` via `generate-inspection-pdf/index.ts:1747,2181` |
| C2 | **Job report PDF — cover navy card, "TECHNICIAN:"** | `src/templates/job-report-template.html:181` (local copy) | `{{technician_name}}` | `profiles.full_name(job_completions.completed_by)` → `job_completions.remediation_completed_by` → `'Technician'`, via `generate-job-report-pdf/index.ts:212,306` |
| C3 | **Inspection booking confirmation email — "Technician" row** | `src/lib/api/notifications.ts:210-212` | `data.technicianName` (optional; row omitted when absent) | Selected technician at booking: `LeadBookingCard.tsx:553` → `technicians.find(t => t.id === selectedTechnician)?.name` |
| C4 | **Job booking confirmation email — "Technician" row** | `src/lib/api/notifications.ts:281` | `data.technicianName` (required) | `BookJobSheet.tsx:560` → `selectedTechName` |

**Layout constraint on C1 and C2.** Both are absolutely positioned, fixed-width,
single-line, uppercase slots:

- C2: navy card is `width: 554px` at `left: 119px`; the value sits at `left: 374px`
  with `text-transform: uppercase; letter-spacing: 1.4px` — roughly **299px** of
  usable width for the name (`job-report-template.html:177-181`).
- C1: containing block is `width: 259px` at `left: 28px`, 17px Galvji, three
  stacked label/value pairs at fixed `top` offsets (`inspection-report-template.html:171-177`).

Two full names do not fit either slot without a layout change to a template that
lives in Storage and is edited by hand. This is an independent engineering argument
for the same answer the product bias already points at.

**C5 — a near-miss worth recording.** `buildJobReportEmailHtml`
(`notifications.ts:359-393`) accepts an optional `technicianName` and renders a
"Technician" row when present. The only call site does **not** pass it:

```ts
// src/pages/ViewReportPDF.tsx:1169-1176
const emailHtml = buildJobReportEmailHtml({
  customerName: lead.full_name,
  propertyAddress: address,
  jobNumber: jobCompletion.job_number || '',
  completionDate,
  pdfUrl: jobCompletion.pdf_url || '',
  customMessage: emailBody.trim() || undefined,
})
```

So the job-report email body carries no technician name today. `sendJobReportEmail`
(`notifications.ts:396-415`), which requires `technicianName`, has no caller in
`src/` at all. The wiring exists and is dormant.

Also note C1/C2 prose: both booking emails say *"Our technician will arrive…"*
(`notifications.ts:214`, `:286`) — singular, independent of the data row.

### 3.2 INTERNAL surfaces

All behind `ProtectedRoute`.

| # | Surface | File:line | Variable | Source |
|---|---|---|---|---|
| I1 | Job completion summary — "Completed By" | `JobCompletionSummary.tsx:240-243,454` | `completedByName` | `profiles.full_name(completed_by)` ?? `remediation_completed_by` ?? `'—'` |
| I2 | Lead detail — "Submitted by" (`pending_review`) | `LeadDetail.tsx:1022-1025,1037` | `submittedBy` | same chain, fallback `'Technician'` |
| I3 | Lead detail — "Submitted by" (`job_completed`) | `LeadDetail.tsx:1090-1093` | `submittedBy` | same |
| I4 | Job completion form — "Remediation Completed By" input | `Section2Summary.tsx:133-150` | `formData.remediationCompletedBy` | free text, prefilled from logged-in profile |
| I5 | Job completion edit sheet — field label "Completed By" | `JobCompletionEditSheet.tsx:44` | `remediationCompletedBy` | free text |
| I6 | Inspection data display — "Inspector" | `InspectionDataDisplay.tsx:194` | `i.inspector_name` | `inspections.inspector_name` |
| I7 | AI review header — inspector chip | `InspectionAIReview.tsx:723` | `inspection?.inspector_name` | same |
| I8 | Report page-1 inline edit — "INSPECTOR" | `ViewReportPDF.tsx:1505,2245` | `inspector` | writes `inspections.inspector_name` |
| I9 | Slack `inspection_booked` | `send-slack-notification/index.ts:209` | `${n.technicianName}` | booking selection, via `notifications.ts:485` |
| I10 | Schedule calendar events | `useScheduleCalendar.ts:21,262` | `technicianName` | `calendar_bookings.assigned_to` → profile |
| I11 | Event details panel | `EventDetailsPanel.tsx:176` | `event.technicianName` | same |
| I12 | Cancelled bookings list | `CancelledBookingsList.tsx:82` | `event.technicianName` | same |
| I13 | Today's schedule | `useTodaysSchedule.ts:11,99` | `technicianName` | same |
| I14 | Admin dashboard timeline chips | `AdminDashboard.tsx:329-334,408-413` | `item.technicianName` | same |
| I15 | Job booking details — "Awaiting Technician — X" | `JobBookingDetails.tsx:110,147,165` | `technicianName` | booking/lead assignment |
| I16 | Lead card — "Awaiting technician: X" / "Awaiting on X" | `LeadCard.tsx:289,336` | `lead.assigned_technician` | `leads.assigned_to` → profile |
| I17 | Leads management table | `LeadsManagement.tsx:399-403` | `assigned_technician` | `leads.assigned_to` → `fetchTechnicianNames` |
| I18 | Technician scoreboard — inspection counts | `useTechnicianStats.ts:192-193,249-251` | `inspectionsTotal` | `inspections.inspector_id` |
| I19 | Technician detail — inspection counts | `useTechnicianDetail.ts:171` | today/week/month | `inspections.inspector_id` |
| I20 | Technician detail + Reports — paid revenue | `invoices.ts:248`, `useTechnicianDetail.ts:198` | `technicianId` | `completed_by` ?? `leads.assigned_to` |
| I21 | Activity timeline — actor | `useActivityTimeline.ts:128-141,161` | `actorName` | `activities.user_id` → `profiles.full_name` |
| I22 | Report version history — generator | `InspectionReportHistory.tsx:48,65-77` | `fetchGeneratorNames` | `pdf_versions.created_by` |
| I23 | photos RLS (no visible name, but identity-gated) | `20260414000003_harden_photos_rls.sql` | — | `completed_by` / `leads.assigned_to` |

---

## Step 4 — What each surface should show under multi-tech

Legend: **P** = PRIMARY ONLY · **A** = ALL TECHNICIANS · **P+S** = PRIMARY WITH SECONDARY NOTED
⚑ = business call, escalated to Glen & Clayton.

### 4.1 Customer-facing

| # | Surface | Recommendation | Reasoning |
|---|---|---|---|
| C1 | Inspection report PDF `{{inspector}}` | **P** ⚑ | The brief's stated bias, and the layout agrees: a 259px fixed slot at 17px cannot take two names without editing a Storage-resident template by hand. The inspection is also genuinely one person's professional judgement — the report is signed work, not a crew list. Keeping it primary means **zero** change to the live template, which is the lowest-risk outcome for the highest-consequence document. |
| C2 | Job report PDF `{{technician_name}}` | **P** ⚑ | Same. ~299px slot, uppercase, `letter-spacing: 1.4px`. Also: the source chain must change even to keep this stable — see 4.3. |
| C3 | Inspection booking email "Technician" row | **P** ⚑ | The customer needs to know who is knocking. For an inspection that is one person, and the accompanying prose is already singular ("Our technician will arrive"). Naming a second person who may not attend the inspection creates a promise we do not control. |
| C4 | Job booking email "Technician" row | **P** ⚑ | Genuinely arguable, which is why it is escalated. A remediation job runs multiple days and a second tech may well be on site; a customer expecting one person and meeting two has a small trust moment. But this is the "do not invent new customer-visible content" line, and a crew roster is new content. **Recommend P now**, and give Glen & Clayton the option of changing the prose from "Our technician will arrive" to "Our team will arrive" — a wording change, not a data change. |
| C5 | Job report email technician row (dormant) | **Leave dormant** | Not rendered today. Do not activate it as part of this work. Activating it would add a new customer-visible field under cover of a refactor. |

**Net effect on customer-facing output: nothing the customer sees changes.** That is
the intended result.

### 4.2 Internal

| # | Surface | Recommendation | Reasoning |
|---|---|---|---|
| I1 | Job summary "Completed By" | **P+S** | This is where an admin reconstructs what happened. "Michael Youssef (+ Clayton)" answers the question the field is actually asked. |
| I2, I3 | "Submitted by" | **P** | Literally names who pressed submit. That is a single person by definition, and conflating it with the crew would make it lie. These two surfaces read `completed_by` today, which is the only reason they are even approximately right. Once `completed_by` is re-pointed at the primary they become wrong, so they must move to a dedicated `submitted_by` column (`auth.uid()` at submit time). That column is a prerequisite of §4.3 item 1, not a nice-to-have. |
| I4, I5 | "Remediation Completed By" free text | **A** | Already free text, already the tech's own words, already overridable. Prefill it with all assigned technicians. Costs nothing, no schema change, and it becomes the honest internal record. **Caveat: this field is invisible on the customer PDF today (F2) — see 4.3 before treating it as a customer-facing lever.** |
| I6, I7 | Inspector display | **P+S** | Same reasoning as I1. Internal reconstruction. |
| I8 | Page-1 inline inspector edit | **P**, keep as free-text override | Do not touch. This is the existing manual escape hatch, and it is consistent with "Manual over automatic — explicit user selection always". If a report genuinely needs both names on the cover, an admin can already type them, accepting the layout risk knowingly. |
| I9 | Slack `inspection_booked` | **A** | Internal channel. Whoever reads it wants the full roster. |
| I10–I14 | Schedule / calendar / dashboard | **A** | These are staffing views. A calendar that hides half the crew is wrong for its purpose. Note these read `calendar_bookings.assigned_to`, which is Session 1/2 territory — flagged as a dependency, not owned here. |
| I15, I16, I17 | Lead lists / booking details | **P+S** | List density matters. `"Michael Youssef +1"` reads at a glance; two full names wrap and break the card. |
| I18, I19 | Inspection counts | ⚑ **Undecided — business call** | Purely a credit question. Full count to both double-counts org totals; count to primary only under-credits a secondary who did real work; half-counts produce fractional inspections in the UI. Not a technical decision. |
| I20 | Paid revenue attribution | ⚑ **Undecided — business call** | Same, with money attached. `invoices.ts:248` currently gives 100% to `completed_by`. If that stays and `completed_by` = primary, every dollar of a two-tech job credits the primary. |
| I21 | Activity timeline actor | **No change** | Already per-event (`activities.user_id`). Naturally correct under multi-tech — each action names whoever did it. |
| I22 | Version history generator | **No change** | Same — `pdf_versions.created_by` is per-action. |
| I23 | photos RLS | **Must become junction-aware** | Not a display decision. See 4.3 and Step 5. |

### 4.3 Work required to keep C1/C2 *unchanged*

"Primary only" is not a no-op. Three things must change to make it true:

1. **`completed_by` must be sourced from the primary technician**, not from
   `user.id` at `useJobCompletionForm.ts:256`. Today it is whoever opened the form
   first. Without this fix, "primary only" is a policy the code does not implement,
   and the customer PDF names a technician chosen by a race.
   **This change is not independently shippable — see §5.8.** The audit value it
   displaces (who actually pressed submit) should land in a new `submitted_by`
   column holding `auth.uid()`, which is what surfaces I2/I3 actually want.

2. **`inspector_id` and `inspector_name` must stop being rewritten on UPDATE**
   (`TechnicianInspectionForm.tsx:4132-4137`). Today the second tech to save takes
   over the inspection. Apply the pattern `SyncManager.ts:213-214` already uses.
   The `[user]`-dependency prefill effect at `:3428` needs a guard too, or it will
   keep clobbering `formData.inspector`.

3. **photos RLS (and `inspections`/`inspection_areas` RLS) must gain a junction
   OR-clause**, or every secondary technician loses read/write access to the job's
   photos and the inspection itself. This is a security migration, human-applied.

Items 1 and 2 are prerequisites for the customer document being *correct*, not
merely *unchanged*.

---

## Step 5 — Migration impact for the two columns

### 5.1 Should `job_completions.completed_by` stay singular, pointing at primary?

**Yes. Confidence: HIGH.**

Arguments for keeping it singular:

- **It is a NOT NULL column with five RLS policies and a revenue-attribution join
  hanging off it.** Converting it to a junction means rewriting five policy bodies,
  the invoice attribution query, and every reader — for a column whose only
  customer-visible job is to fill one ~299px line of text.
- **The customer document needs exactly one value.** A junction gives you a set; the
  PDF needs a scalar. You would immediately reintroduce a "which one prints"
  decision, only now it is expressed as an ORDER BY inside an Edge Function instead
  of a column. That is the same decision, worse located.
- **A junction plus a retained singular column is the architecture already chosen**
  for this migration. `completed_by` is exactly the retained singular column that
  pattern exists to serve.
- **Immutability is already true.** `completed_by` is written once and never
  updated (§1.2). That is the right property for a value stamped onto a document —
  it should record what the job *was*, not track later roster edits.

The change required is not to the column's cardinality but to **what feeds it**:
primary technician, not first-form-opener.

Arguments considered and rejected: "a junction is more honest." It is more honest
about the crew and less honest about the document. `job_completion_technicians`
(or whatever Session 1 lands) is the honest crew record; `completed_by` is the
document's attribution. Two different facts, two different homes.

### 5.2 Should `inspections.inspector_id` stay singular?

**Yes. Confidence: HIGH on staying singular. Confidence MEDIUM on it being safe to
leave the RLS as-is even short-term — see the caveat.**

- It is the anchor of RLS on `inspections`, `inspection_areas`, `ai_summary_versions`,
  and the PDF-system tables. That is four policy families in the repo alone.
- It is the aggregation key for two technician-stats hooks.
- It has **no customer-facing read at all** (`inspector_name` does that job), so
  making it a junction buys nothing on the reporting side.
- An inspection is genuinely one person's professional assessment in the current
  business model. Nothing in the multi-tech brief says two people co-sign an
  inspection; the brief is about jobs.

**Caveat:** singular is right, but the RLS built on it is not multi-tech-safe. A
secondary technician assigned to the lead cannot read the inspection, its areas, or
its AI summaries. The policies need an OR against the junction while the column
itself stays scalar. That is the standard "junction for access, scalar for
attribution" split.

### 5.3 `ai_summary_versions` — no action

The column named in the brief does not exist. `generated_by` is already per-version
and per-action: each row records who generated or edited *that version*. That is
correct under multi-tech with no change. Do not add an `inspector_id` to this table.

### 5.4 What breaks if they stay singular

| Risk | Severity | Detail |
|---|---|---|
| Secondary tech cannot access job photos | **HIGH** | `photos` technician policies match only `leads.assigned_to` or `completed_by`. A secondary matches neither → cannot upload before/after photos. This is a functional blocker for the feature, not a cosmetic one. |
| Secondary tech cannot access the inspection | **HIGH** | Same shape via `inspections.inspector_id`. |
| Wrong name on the customer PDF | **HIGH** | If `completed_by` keeps its current "first opener" semantics, this is not a risk but a certainty on any two-tech job where the secondary opens the form first. |
| First tech locked out mid-inspection | **HIGH** | `TechnicianInspectionForm.tsx` UPDATE rewrites `inspector_id` to the saving user; RLS then revokes the original inspector. |
| Revenue credited entirely to primary | MEDIUM | `invoices.ts:248`. Business decision, not a defect. |
| Secondary invisible on the scoreboard | MEDIUM | `useTechnicianStats.ts:249-251`. Business decision. |
| Stale-PDF gap | MEDIUM | Step 6. |
| Secondary loses photo access mid-job if the `completed_by` re-source ships without the RLS widening | **CRITICAL** | Not a consequence of staying singular — a consequence of *fixing* it in the wrong order. §5.8. |

### 5.5 What breaks if they become junctions

| Risk | Severity | Detail |
|---|---|---|
| Five photos RLS policies must be rewritten | HIGH | Human-applied migration on live data, on the table with the strictest access rules in the system. |
| `completed_by` NOT NULL must be dropped or backfilled | HIGH | Every historical row needs a junction row to preserve today's access, or existing technicians lose access to their own past jobs. |
| Both PDF Edge Functions need deterministic tie-breaking | HIGH | EFs are CLI-deployed and global-immediate with no staging buffer (per `CLAUDE.md`). Adding ordering logic there is the highest-consequence place in this system to put a decision. |
| `invoices.ts` attribution join breaks | MEDIUM | `job_completion:job_completions(completed_by)` no longer resolves. |
| The "which one prints" decision does not go away | — | It relocates into query ordering, where it is less visible and less reviewable. |

### 5.6 Historical data integrity — is `completed_by` already wrong?

**Likely yes, on some rows, and detectable without a write.**

The mechanism (§1.2, F1): `completed_by` records the first person to open the
form, and `leads.assigned_to` can change after the work is done — a fact
`invoices.ts:223` documents explicitly as the *reason* it prefers `completed_by`.
Any lead reassigned before the tech opened the form, or opened by an admin on a
tech's behalf, will show drift.

**Detection query — read-only, single SELECT, no writes. To be run by SESSION 1.**

```sql
-- SESSION 3 → SESSION 1: read-only drift check on job_completions.completed_by.
-- Confirm target ref (DEV vs PROD) with Michael before running.
SELECT
  jc.id                            AS job_completion_id,
  jc.job_number,
  jc.lead_id,
  jc.completion_date,
  jc.completed_by,
  pc.full_name                     AS completed_by_name,
  jc.remediation_completed_by      AS free_text_name,
  l.assigned_to                    AS lead_assigned_to,
  pa.full_name                     AS lead_assigned_name,
  (jc.completed_by IS DISTINCT FROM l.assigned_to) AS differs_from_lead_assignment,
  bk.booked_technicians,
  (bk.booked_technicians IS NOT NULL
     AND NOT (jc.completed_by = ANY (bk.booked_technicians))) AS never_booked_on_this_job
FROM public.job_completions jc
LEFT JOIN public.leads    l  ON l.id = jc.lead_id
LEFT JOIN public.profiles pc ON pc.id = jc.completed_by
LEFT JOIN public.profiles pa ON pa.id = l.assigned_to
LEFT JOIN LATERAL (
  SELECT array_agg(DISTINCT cb.assigned_to) AS booked_technicians
  FROM public.calendar_bookings cb
  WHERE cb.lead_id = jc.lead_id
    AND cb.event_type = 'job'
    AND cb.status <> 'cancelled'
) bk ON TRUE
ORDER BY jc.completion_date DESC;
```

`event_type` literals `'job'` and `'inspection'` verified at
`bookingService.ts:122` and `useScheduleCalendar.ts:259`.

Read the result as:

- `never_booked_on_this_job = true` → **hard drift.** The name on that customer's
  PDF belongs to someone who was never rostered on the job.
- `differs_from_lead_assignment = true` but `never_booked_on_this_job = false` →
  soft drift. Expected and mostly benign (this is the case `invoices.ts` was
  written for), but worth eyeballing.
- `completed_by_name IS DISTINCT FROM free_text_name` → the tech typed a different
  name than the system recorded. Under F2 the customer saw `completed_by_name`; the
  tech believed they had set `free_text_name`. **These rows are the strongest
  evidence that F2 is real**, and they are the rows most likely to have already
  shipped a wrong name.

Status: **PENDING SESSION 1.**

### 5.7 Recommended position

> **Both columns stay singular.** `job_completions.completed_by` stays a scalar
> pointing at the **primary** technician; `inspections.inspector_id` stays a scalar
> pointing at the **primary** inspector. Multi-tech is expressed in the junction
> table for access and crew truth, and the singular columns remain the document
> attribution key. `ai_summary_versions` needs no change at all.
>
> This is conditional on four fixes, all listed in §4.3: source `completed_by` from
> the primary rather than the first form-opener; add a `submitted_by` column to
> carry the audit fact that displaces; stop UPDATE from rewriting
> `inspector_id`/`inspector_name`; and widen the RLS on `photos`, `inspections`,
> and `inspection_areas` to consult the junction.
>
> **The RLS widening and the `completed_by` re-source are one unit, not two —
> see §5.8.** Shipping the re-source first revokes photo access from secondary
> technicians on live jobs. If they must be separated, RLS-widening goes first and
> never the reverse.
>
> **Confidence: HIGH** on the cardinality decision — it follows from four RLS
> families, one revenue join, two fixed-width PDF slots, and the stated product
> bias all pointing the same way.
> **Confidence: HIGH** on the RLS widening being mandatory rather than optional —
> without it, secondary technicians cannot do their job.
> **Confidence: MEDIUM** on F2 (dead free-text field) until PENDING-2 is answered.

### 5.8 Atomicity — re-sourcing `completed_by` is a live access-control change

**This is the sharpest constraint in this section, and §4.3 understated it.**
Recorded here in full because it changes how the work must be sequenced, not just
what the work is.

`completed_by` is simultaneously (a) the name printed on the customer's job report
and (b) one of only two grants that give a technician access to that job's photos:

```sql
-- 20260414000003_harden_photos_rls.sql, appears at :30, :48, :67, :80, :99
OR EXISTS (
  SELECT 1 FROM public.job_completions jc
  WHERE jc.id = photos.job_completion_id
    AND jc.completed_by = auth.uid()
)
```

So re-pointing `completed_by` from *submitter* to *primary* **revokes photo access
from whoever was previously in that column, at the instant the value changes.** On a
two-tech job where the secondary opened the form, that is the secondary — the person
most likely to still be on site with photos to upload.

The photos policies grant technicians access by exactly two routes:
`inspections → leads.assigned_to`, or `job_completions.completed_by`. A secondary
technician matches neither once `completed_by` moves to the primary. There is no
third route and no admin-adjacent fallback for a non-admin user.

**Therefore the following must land as one atomic unit — one migration, one
transaction:**

1. widen the `photos` technician policies (SELECT/INSERT/UPDATE/DELETE — five policy
   bodies) to consult the technician junction;
2. re-source `completed_by` to the primary technician;
3. add `submitted_by` (`auth.uid()` at submit) so the audit fact `completed_by` used
   to carry is not simply lost, and so surfaces I2/I3 keep a truthful source.

**What breaks if they are split:**

| Split order | Consequence | Severity |
|---|---|---|
| Re-source `completed_by` **before** widening RLS | Every secondary technician on an in-flight job loses photo access the moment the migration commits. Symptom is a silent RLS denial on upload, not an error the field tech can interpret — they are mid-job, on a phone, with photos that will not save. Worst case this lands during working hours on live jobs. | **CRITICAL** |
| Widen RLS **before** re-sourcing `completed_by` | Safe. Access is strictly broadened first, then attribution corrected. The window between them is over-permissive, not under-permissive. | LOW |
| `submitted_by` added later, separately | Non-blocking for access, but surfaces I2/I3 ("Submitted by") display the primary's name for a submission the secondary made — a quiet factual error on two admin screens for the length of the gap. | MEDIUM |

**If the work genuinely cannot be one migration**, the only safe ordering is
RLS-widening first, `completed_by` re-sourcing second, and never the reverse. Say so
explicitly in the deploy runbook rather than leaving it to migration filename
ordering — per `CLAUDE.md`, migrations here are human-applied with no staging
buffer, so ordering is a person's decision at the keyboard, not a CI guarantee.

**Related, and it points the same way:** the live `inspector_id` takeover bug
(§2.2 — one row object serving both INSERT and UPDATE, so the last tech to save
becomes the inspector) has the same double-edged shape. Its DB-side implication is
that `inspections`/`inspection_areas` RLS must be widened to the junction *before*
anything stabilises `inspector_id`, for exactly the reason in the table above. The
application-side fix is out of this session's scope and is named here only so the
DB sequencing accounts for it.

---

## Step 6 — Stale-PDF risk

### 6.1 What exists today

**Two independent mechanisms, and they do not cover the same ground.**

**Mechanism 1 — `StalePdfBanner`** (`src/components/pdf/StalePdfBanner.tsx`). A
warning banner, shown *before* the admin commits. It compares three timestamps:

```ts
const [summaryRes, areaRes, pdfRes] = await Promise.all([
  supabase.from('latest_ai_summary').select('generated_at')...,
  supabase.from('inspection_areas').select('updated_at')...,
  supabase.from('pdf_versions').select('created_at')
    .eq('generation_type', 'hard_save')...,
])
...
setIsStale(Math.max(...editedAt) > new Date(pdfAt).getTime())
```

It watches `latest_ai_summary.generated_at` and `inspection_areas.updated_at`.
**It does not watch `inspections.updated_at`.** And it is mounted only for the
inspection report (`ViewReportPDF.tsx:2798` — `{reportType === 'inspection' && (…)}`).
**The job report has no staleness banner at all.**

**Mechanism 2 — the send-time `html_hash` guard.** Present on both pipelines:
`checkSendMismatch` (`reportPipeline.ts:268-301`) and
`checkJobReportSendMismatch` (`jobReportPipeline.ts:208-240`). Both re-render the
report HTML via `previewOnly:true`, hash it, and compare against the stored
`html_hash` of the newest `hard_save` version. Any drift → `kind: 'mismatch'` → the
admin gets a dialog and must pick `send_as_is`, `hard_save_fresh`, or cancel.

There is also `previewStale` (`ViewReportPDF.tsx:346`), a session-local React flag
set by inline edits — including the page-1 inspector edit (`:2269`). It is not
persisted and does not survive a reload or apply to another user's session.

### 6.2 Does changing the technician display create a new stale-PDF scenario?

**Yes. Concretely, and it is already reachable today.**

The exact sequence:

```
1. Inspection done by Tech A. inspections.inspector_name = "Tech A".
2. Admin opens the report, hard-saves. pdf_versions row v3 stores
   html_hash = H(html containing "TECH A").
3. Tech B is added to the lead (multi-tech), or Tech B opens and saves the
   inspection form → TechnicianInspectionForm.tsx:4134 UPDATE rewrites
   inspections.inspector_name (and inspector_id) to "Tech B".
4. Admin reopens the report.
     ├─ StalePdfBanner queries latest_ai_summary.generated_at   → unchanged
     ├─                    inspection_areas.updated_at          → unchanged
     └─                    pdf_versions.created_at (hard_save)  → v3, newer
   → isStale = false. NO WARNING IS SHOWN.
5. Admin clicks Send.
     └─ checkSendMismatch re-renders HTML → now contains "TECH B"
        → currentHash ≠ v3.html_hash → kind: 'mismatch' → dialog.
```

**Assessment, split:**

- **Silent wrong-name delivery: NOT possible.** The hash guard closes it. The
  re-rendered HTML includes `{{inspector}}` / `{{technician_name}}`, so any
  technician-identity change necessarily changes the hash. Both pipelines have this
  guard. The admin cannot send a stale-name PDF without explicitly choosing
  `send_as_is`.
- **Early warning: MISSING.** The banner's purpose is to tell the admin *before*
  they commit to sending, and for this class of change it says "fresh". The admin
  discovers the problem in a modal at the moment of sending — which is exactly the
  failure the 2026-08-27 `inspection_areas` fix was written to prevent. The header
  comment in `StalePdfBanner.tsx` says so in as many words:

  > *"The send-time html_hash guard still caught it, but only after the admin had
  > already committed to sending."*

  Adding a second technician reintroduces the same gap through a different column.
- **Job report: worse.** No banner exists at all, so *every* job-report drift —
  technician or otherwise — is discovered only at the send dialog.

### 6.3 Recommendation

**Extend the staleness signal. Do not auto-regenerate.**

**Do:**

1. Add `inspections.updated_at` to `StalePdfBanner`'s inputs. This is the general
   fix — it covers `inspector_name` and every other inspection-level column the
   banner currently misses, not just this one case.
2. Add the technician junction table's `max(created_at, updated_at)` per lead once
   Session 1 lands it. A roster change is a report-affecting change even when no
   inspection column moves.
3. Extend the banner (or an equivalent) to the job report. It is currently gated on
   `reportType === 'inspection'` while the job report has the weaker source chain
   and the higher-consequence document.

**Do not:**

4. **Do not auto-regenerate on technician change.** Three reasons:
   - It contradicts *"Manual over automatic — explicit user selection always"*
     (`CLAUDE.md`, Key Principle 1).
   - A `hard_save` is a version of a document that may already have been sent to a
     customer. Silently producing a new one on a background data change makes the
     version history stop meaning "what an admin decided to save".
   - The banner's own comments record that auto-render already caused a
     self-defeating loop once — the legacy EF writing a `pdf_versions` row on every
     preview render is precisely why the banner had to filter to
     `generation_type='hard_save'` (`StalePdfBanner.tsx:53-61`). Adding another
     automatic render risks re-creating that.

**Condition for regeneration:** admin-initiated, prompted by an accurate banner.
The banner should fire when the newest of {AI summary, area edits, **inspection row
edits**, **technician assignment changes**} is later than the newest `hard_save`.

**One case genuinely worth escalating:** a second technician added *after* the report
was already sent. No banner or hash guard helps — the document is already in the
customer's inbox. Whether that warrants a corrected re-send is a business call, not
a technical one. Escalated as Q4.

---

## DECISIONS REQUIRING GLEN & CLAYTON

Eight decisions. All are business calls, not technical ones — the code can implement
any answer to each. Phrased for a non-technical reader.

**Q1 — When two technicians work a job, should the customer's job report still name
just one of them?**
Right now the report has a single "TECHNICIAN:" line on the cover. The
recommendation is to keep naming only the lead technician, so the report looks
exactly as it does today. The alternative is to redesign that part of the report to
fit two names.
*Recommendation: name one (the lead technician). Related: Q8.*

**Q2 — Same question for the inspection report cover, which says "INSPECTOR:".**
An inspection is usually one person's assessment. Should it stay one name even if a
second person attended?
*Recommendation: name one.*

**Q3 — When we email a customer to confirm their booking, should we name every
technician who will attend, or just the lead?**
The email currently lists one name and says "Our technician will arrive". If two
people turn up, the customer may be briefly surprised. A middle option is to keep
one name but change the wording to "Our team will arrive".
*Recommendation: keep one name; consider the wording change for job bookings.*

**Q4 — If we add a second technician to a job *after* the report has already been
emailed to the customer, do we send a corrected report?**
Options: (a) never — the report reflects who did the work at the time; (b) only if
the lead technician changed; (c) always. Note (c) means customers sometimes receive
a second copy of a report they already have.
*No recommendation — this is entirely a customer-relationship call.*

**Q5 — On a two-technician job, who gets credit for the revenue?**
The system currently credits 100% to one technician. Options: 100% to the lead;
50/50 split; 100% to each (which makes the company-wide total look larger than it
is, so the org total would need to be calculated separately).
*No recommendation. This affects any performance or pay conversation built on these
numbers.*

**Q6 — On the technician scoreboard, does a second technician get counted for the
job?**
Same shape as Q5 but for job and inspection counts rather than dollars. Full credit
to both, half each, or lead only.
*No recommendation.*

**Q7 — Some past job reports may name a technician who was not actually the one
rostered on that job.**
This can happen because the system records whoever opened the job form first, not
whoever was booked. We can produce an exact list of affected jobs without changing
anything. Once we have it: leave the historical records as they are, or correct
them?
*Recommendation: get the list first, then decide. Correcting them does not change
any PDF already sent to a customer.*

**Q8 — If the lead technician starts a job but a second technician finishes it,
whose name should the customer see?**
Options: the person who started (the lead), the person who finished, or whoever an
admin picks at the time the report is approved.
*Recommendation: the lead technician, with an admin able to override it manually —
that override already exists for inspection reports today.*

---

## Items pending SESSION 1 (database facts this session cannot obtain)

This session is file-only by instruction. Each item below needs one read-only query.

**PENDING-1 — Confirm `ai_summary_versions` really has no `inspector_id` on the
live database.** The repo migration and generated types both say it does not, but
generated types can lag a hand-applied change.

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ai_summary_versions'
ORDER BY ordinal_position;
```

**PENDING-2 — Confirm F2: is `remediation_completed_by` actually unreachable on the
customer PDF?** F2 holds only if every `completed_by` resolves to a profile with a
non-empty `full_name`.

```sql
SELECT
  count(*) FILTER (WHERE p.id IS NULL)                          AS missing_profile,
  count(*) FILTER (WHERE p.id IS NOT NULL
                     AND coalesce(trim(p.full_name), '') = '')  AS blank_full_name,
  count(*)                                                      AS total_job_completions
FROM public.job_completions jc
LEFT JOIN public.profiles p ON p.id = jc.completed_by;
```

If both counts are 0, F2 is confirmed: the free-text field never reaches a customer.

**PENDING-3 — Historical drift on `completed_by`.** Full query in §5.6.

**PENDING-4 — Has any generated AI summary ever echoed an inspector's name into
customer-facing text?** (`generate-inspection-summary/index.ts:219` injects
`INSPECTOR: <name>` into the prompt.)

```sql
SELECT v.id, v.inspection_id, v.version_number, i.inspector_name
FROM public.ai_summary_versions v
JOIN public.inspections i ON i.id = v.inspection_id
WHERE coalesce(trim(i.inspector_name), '') <> ''
  AND (
       v.ai_summary_text          ILIKE '%' || i.inspector_name || '%'
    OR v.what_we_found_text       ILIKE '%' || i.inspector_name || '%'
    OR v.what_we_will_do_text     ILIKE '%' || i.inspector_name || '%'
    OR v.problem_analysis_content ILIKE '%' || i.inspector_name || '%'
    OR v.demolition_content       ILIKE '%' || i.inspector_name || '%'
  );
```

Expect zero rows. Any hit means a technician name reached a customer through an
unmonitored channel.

**PENDING-5 — Confirm the live RLS policy bodies match the repo migrations**, since
policies can be edited in Studio.

```sql
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('photos', 'inspections', 'inspection_areas', 'ai_summary_versions')
ORDER BY tablename, policyname;
```

---

## Cross-session dependencies

- **Session 1 (database):** owns the five PENDING queries above, and owns whatever
  the junction table is named. Steps 4 and 5 assume a junction exists with a
  primary/secondary ordering and a `lead_id`; the RLS widening in §4.3 depends on
  its exact shape.
- **Session 2:** `calendar_bookings.assigned_to` and `leads.assigned_to` are both
  singular and feed surfaces I10–I17 in this inventory. Not owned here; listed so
  they are not double-counted or dropped.
- **Not read by this session, by instruction:** `docs/multi-tech/SESSION-1-*.md`,
  `docs/multi-tech/SESSION-2-*.md`.

## Verification of read-only constraint

No code, template, Edge Function, migration, or Storage object was modified. The
only filesystem changes are `docs/multi-tech/` and this file. Both PDF templates
were read (`sed -n`) and not written. No database query was executed. No
`--project-ref` command was run. No deployment occurred.

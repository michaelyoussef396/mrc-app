# Job Completion Workflow — Phased Build Plan

**Created:** 2026-04-03
**Status:** DRAFT — Pending Approval

---

## Build Order & Dependencies

```
Phase 2A: Database & Types ──────────────────────────┐
  │                                                    │
  ├── Phase 2B: Job Completion Form ───┐               │
  │     │                              │               │
  │     └── Phase 2C: Job Report PDF ──┤               │
  │           │                        │               │
  │           └── Phase 2D: Admin ─────┤               │
  │                 Review & Invoice   │               │
  │                 │                  │               │
  │                 └── Phase 2E: ─────┘               │
  │                     Payment &                      │
  │                     Automation                     │
  │                     │                              │
  │                     └── Phase 2F: ─────────────────┘
  │                         Google Review
  │                         & Closure
```

---

## Phase 2A — Database & Core Infrastructure

**Complexity:** Medium
**Dependencies:** None (foundation for everything)
**Estimated files:** ~8 new, ~2 modified

### Tasks

1. **Migration: Add `pending_review` to lead_status enum**
   - `ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'pending_review'`
   - Complexity: Simple

2. **Migration: Create `job_completions` table**
   - Full schema from PHASE_2_EXECUTION.md
   - RLS policies (tech own, admin all)
   - Indexes on lead_id, inspection_id, job_number, status, completed_by
   - Audit triggers (attach existing `audit_log_trigger()`)
   - Complexity: Medium

3. **Migration: Extend `photos` table**
   - Add `job_completion_id` UUID FK
   - Add `photo_category` VARCHAR(50)
   - Index on `job_completion_id`
   - Complexity: Simple

4. **Migration: Create `job_completion_pdf_versions` table**
   - Schema from PHASE_2_EXECUTION.md
   - RLS policies
   - Complexity: Simple

5. **Migration: Recreate `invoices` table**
   - Was dropped in Phase 1 cleanup — recreate with new schema
   - RLS policies, audit triggers
   - Complexity: Simple

6. **Create `src/types/jobCompletion.ts`**
   - `JobCompletionFormData` interface (all 10 sections)
   - `JobCompletionStatus` type
   - `EquipmentUsage` interface
   - `VariationData` interface
   - Complexity: Simple

7. **Create `src/lib/schemas/jobCompletionSchema.ts`**
   - Zod validation for required fields before submission
   - Section-level validation (which fields required per section)
   - Complexity: Simple

8. **Create `src/lib/api/jobCompletions.ts`**
   - `createJobCompletion(leadId)` — create draft
   - `updateJobCompletion(id, data)` — save section data
   - `submitJobCompletion(id)` — mark as submitted
   - `getJobCompletion(leadId)` — fetch for lead
   - `getJobCompletionById(id)` — fetch by ID
   - Complexity: Simple

9. **Extend `src/lib/statusFlow.ts`**
   - Add 8 new statuses with colors, icons, transitions
   - Update `ALL_STATUSES`, `isTerminalStatus`, `getNextStatus`
   - Change `closed` → `finished` as terminal (or keep both)
   - Complexity: Medium (affects multiple consumers)

10. **Add AFD rate to `src/lib/calculations/pricing.ts`**
    - Add `afd` to `EQUIPMENT_RATES` object
    - **BLOCKER:** Need rate from Michael
    - Complexity: Simple

### Reuse from Phase 1
- `audit_log_trigger()` function — just attach to new tables
- RLS policy patterns — same structure as existing tables
- `inspectionSchema.ts` — same Zod pattern
- `inspections.ts` API helper — same CRUD pattern

---

## Phase 2B — Job Completion Form

**Complexity:** High (largest single feature)
**Dependencies:** Phase 2A complete
**Estimated files:** ~12 new, ~4 modified

### Tasks

1. **Extend offline support**
   - `src/lib/offline/db.ts` — Bump Dexie version to 2, add `jobCompletionDrafts` store
   - `src/lib/offline/types.ts` — Add `JobCompletionDraft` interface
   - Complexity: Simple

2. **Extend photo upload**
   - `src/lib/utils/photoUpload.ts` — Add `job_completion_id` and `photo_category` to `PhotoMetadata`
   - Add `uploadJobCompletionPhoto()` wrapper function
   - Complexity: Simple

3. **Create section components** (`src/components/jobCompletion/`)
   - `Section1OfficeInfo.tsx` — Read-only card, pre-populated from lead/inspection
   - `Section2Summary.tsx` — SWMS toggle, premises type, date, areas multi-select
   - `Section3BeforePhotos.tsx` — Photo carousel pre-populated from inspection
   - `Section4AfterPhotos.tsx` — Camera capture, demolition toggle
   - `Section5TreatmentMethods.tsx` — 11 toggle switches
   - `Section6ChemicalToggles.tsx` — 5 toggle switches
   - `Section7EquipmentUsed.tsx` — Qty/days inputs with quoted comparison
   - `Section8Variations.tsx` — Scope changed toggle + conditional textareas
   - `Section9JobNotes.tsx` — Review/damages/staining toggles + textareas
   - `Section10OfficeNotes.tsx` — Admin-only, conditional on role
   - Complexity: Medium each (Simple × 10 sections)

4. **Create page: `TechnicianJobCompletionForm.tsx`**
   - Multi-step form orchestrator (header, footer, section nav)
   - Pattern from `TechnicianInspectionForm.tsx` but modularized
   - Auto-save to IndexedDB on section change
   - Pre-populate from lead + inspection data
   - Submit → create `job_completions` record + update lead status
   - Complexity: High

5. **Modify `TechnicianJobDetail.tsx`**
   - Add "Start Job Completion" button for leads in `job_waiting` status
   - Button navigates to `/technician/job-completion?leadId=X`
   - Complexity: Simple

6. **Add route to `App.tsx`**
   - `/technician/job-completion` → `TechnicianJobCompletionForm`
   - Lazy loaded, technician role required
   - Complexity: Simple

7. **Create `src/hooks/useJobCompletionData.ts`**
   - React Query hook for fetching/creating job completion for a lead
   - Complexity: Simple

8. **Add Slack events**
   - `notifications.ts` — Add `job_completed` event
   - `send-slack-notification` Edge Function — New message template
   - Complexity: Simple

### Reuse from Phase 1
- `TechnicianInspectionForm.tsx` — Form shell pattern (header, footer, section nav, validation dialog)
- `photoUpload.ts` — Upload pipeline (resize, Supabase Storage, metadata save)
- `SyncManager.ts` — Offline draft pattern
- `photoResizer.ts` — JPEG resize pipeline
- Photo carousel components — From inspection form sections

### Risk Flags
- **Before photo pre-population** requires online access to fetch signed URLs. Design graceful offline fallback.
- **Do NOT create a 3000+ line monolith.** Extract sections into separate component files under `src/components/jobCompletion/`.
- **Areas treated multi-select** depends on inspection areas data. If inspection has no areas, show empty state.

---

## Phase 2C — Job Report PDF

**Complexity:** High
**Dependencies:** Phase 2B complete (needs job completion data)
**Estimated files:** ~4 new, ~1 modified

### Tasks

1. **Create HTML template**
   - 9-page HTML template matching MRC branding (navy #121D73, gold accents)
   - Upload to Supabase Storage `pdf-templates` bucket
   - Dynamic sections: photos grid, treatment checkmarks, equipment table, variations
   - Complexity: High (design + dynamic content)

2. **Create Edge Function: `generate-job-report-pdf`**
   - Pattern from `generate-inspection-pdf`
   - Fetch job completion + lead + inspection + photos data
   - Populate HTML template with data
   - Generate signed URLs for all photos
   - Return populated HTML for client-side rendering
   - Complexity: Medium

3. **Create `src/lib/api/jobReportPdf.ts`**
   - `generateJobReportPDF(jobCompletionId)` — Call edge function
   - `updateFieldAndRegenerate(id, field, value)` — Edit + regenerate
   - `approveJobReport(id)` — Mark approved
   - `getJobReportVersionHistory(id)` — Fetch versions
   - Complexity: Simple (pattern from `pdfGeneration.ts`)

4. **Create page: `ViewJobReportPDF.tsx`**
   - Pattern from `ViewReportPDF.tsx`
   - Multi-page HTML preview
   - Inline field editing
   - Approve button → send email with PDF
   - Complexity: High (but heavily reuses existing patterns)

5. **Add email template**
   - `buildJobReportEmailHtml()` in `notifications.ts`
   - Branded email with PDF attachment
   - Complexity: Simple

6. **Add route to `App.tsx`**
   - `/job-completion/:id/report` → `ViewJobReportPDF`
   - Admin role required
   - Complexity: Simple

### Reuse from Phase 1
- `generate-inspection-pdf` Edge Function — Same architecture (template + populate + return HTML)
- `ViewReportPDF.tsx` — Same view/edit/approve pattern
- `EditFieldModal.tsx` — Reusable as-is
- `ImageUploadModal.tsx` — Reusable as-is
- `ReportPreviewHTML.tsx` — Pattern for multi-page HTML rendering
- `pdfGeneration.ts` — Same API helper pattern
- `wrapInBrandedTemplate()` — Same email wrapper

---

## Phase 2D — Admin Review & Invoice

**Complexity:** Medium
**Dependencies:** Phase 2C complete (needs PDF generation)
**Estimated files:** ~2 new, ~3 modified

### Tasks

1. **Modify `LeadDetail.tsx`**
   - Add "Job Completion" card section (status-dependent)
   - Show job completion summary when status >= `job_completed`
   - Add "View Job Report" button
   - Add "Invoice" card section
   - Add payment tracking widget (status badge, "Mark as Paid" button)
   - Show variation warnings if `scope_changed = true`
   - Extend activity timeline with job completion events
   - Complexity: Medium

2. **Modify `AdminDashboard.tsx`**
   - Add "Pending Job Reviews" KPI card (count of `pending_review` leads)
   - Add "Overdue Invoices" KPI card (count of overdue invoices)
   - Complexity: Simple

3. **Create page: `AdminInvoiceHelper.tsx`**
   - Pre-populated form from inspection quote + job completion
   - Editable line items: labour, equipment, variations, custom
   - GST calculation (10%) using `pricing.ts`
   - Payment terms selector (7, 14, 30, 60 days)
   - Preview formatted invoice
   - Send button → email to customer
   - Complexity: Medium

4. **Create `src/hooks/usePaymentTracking.ts`**
   - `useInvoice(leadId)` — Fetch invoice for lead
   - `markAsPaid(invoiceId, method, date)` — Update status
   - `useOverdueInvoices()` — Fetch all overdue (admin dashboard)
   - Complexity: Simple

5. **Update `PipelineTabs.tsx`**
   - Add new status tabs for Phase 2 statuses
   - May need horizontal scroll on mobile for additional tabs
   - Complexity: Simple

6. **Add route to `App.tsx`**
   - `/admin/invoice/:leadId` → `AdminInvoiceHelper`
   - Admin role required
   - Complexity: Simple

### Reuse from Phase 1
- `formatCurrency()` from `pricing.ts`
- `EQUIPMENT_RATES` from `pricing.ts`
- `GST_RATE` from `pricing.ts`
- `sendEmail()` from `notifications.ts`
- `useActivityTimeline` hook — Already handles activities table
- Lead detail card layout patterns

---

## Phase 2E — Payment Tracking & Automation

**Complexity:** Medium
**Dependencies:** Phase 2D complete
**Estimated files:** ~3 new, ~2 modified

### Tasks

1. **Create Edge Function: `check-overdue-invoices`**
   - Query: `invoices WHERE status = 'sent' AND due_date < NOW()`
   - Update status to `overdue`
   - Send Slack notification for each newly overdue invoice
   - Complexity: Simple

2. **Create cron job migration**
   - `SELECT cron.schedule('check-overdue-invoices', '0 23 * * *', ...)` (9am AEST = 23:00 UTC)
   - Complexity: Simple

3. **Add invoice email template**
   - `buildInvoiceEmailHtml()` in `notifications.ts`
   - Amount, due date, payment details, MRC banking info
   - Complexity: Simple

4. **Extend `send-slack-notification`**
   - New events: `invoice_sent`, `payment_received`, `invoice_overdue`
   - Color-coded messages (green for paid, red for overdue)
   - Complexity: Simple

5. **End-to-end testing**
   - Full workflow: form → submit → PDF → approve → email → invoice → pay → close
   - Test at 375px viewport
   - Test offline form save/recovery
   - Complexity: Medium

---

## Phase 2F — Google Review & Closure

**Complexity:** Simple
**Dependencies:** Phase 2E complete
**Estimated files:** ~1 new, ~2 modified

### Tasks

1. **Add Google review email template**
   - `buildGoogleReviewEmailHtml()` in `notifications.ts`
   - Thank you message + Google review link
   - Complexity: Simple

2. **Add "Send Review Request" button to LeadDetail**
   - Available when status = `paid`
   - Sends email, transitions to `google_review`
   - Complexity: Simple

3. **Add "Close Lead" action**
   - Available when status = `google_review`
   - Transitions to `finished` (terminal)
   - Complexity: Simple

---

## Complexity Summary

| Phase | Complexity | New Files | Modified Files |
|-------|-----------|-----------|----------------|
| 2A: Database & Types | Medium | ~8 | ~2 |
| 2B: Job Completion Form | High | ~12 | ~4 |
| 2C: Job Report PDF | High | ~4 | ~1 |
| 2D: Admin Review & Invoice | Medium | ~2 | ~3 |
| 2E: Payment & Automation | Medium | ~3 | ~2 |
| 2F: Google Review & Closure | Simple | ~1 | ~2 |
| **Total** | | **~30** | **~14** |

---

## Pre-Implementation Decisions Needed

1. **AFD daily rate** — What does MRC charge per day for Air Filtration Devices?
2. **Invoice format** — Email-only for MVP, or full PDF invoice?
3. **Google review link** — What's the Google Business Profile URL for MRC?
4. **Warranty terms** — Standard warranty text for the certificate page?
5. **Post-treatment care** — Standard care guide text?
6. **Payment details** — MRC bank account details for invoice?

---

*Build each phase completely before starting the next. Test each phase at 375px before proceeding.*

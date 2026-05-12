# Phase 2 Execution Plan — Job Completion Workflow

**Created:** 2026-04-03
**Author:** Claude Code (Lead Software Architect)
**Status:** PENDING REVIEW — Do NOT implement until Michael approves

---

## State of the Union — Phase 1 Achievement Summary

### Feature Inventory

| Feature | Status | Notes |
|---------|--------|-------|
| Lead capture (website form) | Complete | `/request-inspection` public form |
| Lead management pipeline | Complete | 7 statuses, pipeline tabs, search, bulk actions |
| Lead detail view | Complete | Inline editing, travel time, activity logging |
| Technician inspection form | Complete | 9 sections, 3779 lines, offline auto-save |
| AI inspection summary | Complete | OpenRouter/Gemini with 3-model fallback |
| PDF report generation | Complete | Edge Function → HTML template → browser render |
| PDF view/edit/approve | Complete | Inline editing, photo upload, version history |
| Email automation | Complete | Branded templates, PDF attachments, rate limiting |
| Slack notifications | Complete | 6 event types, Block Kit formatting |
| Admin dashboard | Complete | 4 KPIs, activity timeline, technician workload |
| Technician dashboard | Complete | Job queue, next job card, alerts |
| Schedule management | Complete | Week/day calendar, drag-assign, travel time |
| Booking validation | Complete | Availability check, recommended dates, travel buffer |
| Reports/analytics | Complete | KPI cards, status chart, timeline, sources |
| Auth & roles | Complete | Email/password, admin/technician roles, session mgmt |
| Offline support | Complete | IndexedDB, SyncManager, photo queue, offline banner |
| PWA | Complete | Service worker, auto-update, runtime caching |
| Error tracking | Complete | Sentry with business context, breadcrumbs, replay |
| Security | Complete | RLS all tables, rate limiting, CSP, audit triggers |
| Profile photo upload | Partial | Component exists, upload not implemented |
| TechnicianAlerts | Partial | Uses mock data, needs real notifications integration |
| Avg Response Time KPI | Placeholder | Hardcoded "24 hrs", needs `first_contact_at` field |

### Database — 21 Active Tables (post-Phase-3 + Phase-4)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| leads | Lead records | FK: assigned_to → auth.users |
| inspections | Inspection data + pricing (AI summary fields dropped Stage 3.5) | FK: lead_id → leads, inspector_id → auth.users |
| inspection_areas | Per-area mould/moisture data | FK: inspection_id → inspections |
| moisture_readings | Moisture measurements | FK: area_id → inspection_areas |
| subfloor_data | Subfloor assessment | FK: inspection_id → inspections |
| subfloor_readings | Subfloor moisture readings | FK: subfloor_id → subfloor_data |
| photos | Inspection + job photos. `deleted_at` soft-delete added Stage 4.3. | FK: inspection_id, area_id, subfloor_id, job_completion_id |
| photo_history | Audit history for photos (added/category_changed/deleted) — Stage 4.2 | FK: photo_id → photos |
| ai_summary_versions | Versioned AI summary rows — Stage 3.1; `latest_ai_summary` view exposes the active row per inspection | FK: inspection_id → inspections |
| job_completions | Phase 2 job completion form data, scope_* variation fields, actual_* equipment | FK: lead_id → leads, inspection_id → inspections |
| job_completion_pdf_versions | Versioned job report PDFs | FK: job_completion_id → job_completions |
| invoices | Invoice tracking (auto-generate number, status, payment) | FK: lead_id → leads, job_completion_id → job_completions |
| calendar_bookings | Scheduled inspections/jobs | FK: lead_id → leads |
| profiles | User profiles | FK: id → auth.users |
| user_roles | Role assignments | FK: user_id → auth.users, role_id → roles |
| email_logs | Email delivery tracking | FK: lead_id, inspection_id, sent_by |
| error_logs | Application errors | FK: user_id |
| audit_logs | Immutable change audit. 29 triggers across 10 tables post-Phase-2 (leads, inspections, inspection_areas, subfloor_data, moisture_readings, subfloor_readings, photos, user_roles, invoices, job_completions). | — |
| login_activity | Login attempts | FK: user_id |
| user_devices | Trusted devices | FK: user_id |
| user_sessions | Active sessions | FK: user_id, device_id |

Plus system tables: roles, notifications, activities, pdf_versions, editable_fields

### Auth — Roles & Permissions

| Role | Can Do |
|------|--------|
| admin | All CRUD on leads, inspections, bookings, technicians. View/manage all data. Approve PDFs, send emails, manage users. |
| technician | View assigned leads/jobs. Complete inspection forms. Upload photos. View own schedule. Cannot see other technicians' data. |

### Frontend — Routes & Pages

**Admin Routes (14):** Dashboard, Schedule, Leads, Technicians, TechnicianDetail, LeadsManagement, InspectionAIReview, Reports, Notifications, Settings, Help, Profile, NewLeadView, ViewReportPDF

**Technician Routes (8):** Dashboard, Jobs, JobDetail, InspectionForm, Alerts, Profile, Settings, Help

**Public Routes (4):** Login, ForgotPassword, CheckEmail, ResetPassword, RequestInspection, InspectionSuccess

**Shared:** NotFound (404)

### Edge Functions — All 10 Active

| Function | External APIs | Status |
|----------|---------------|--------|
| generate-inspection-pdf | None (Supabase only) | Active |
| calculate-travel-time | Google Maps Distance Matrix | Active |
| generate-inspection-summary | OpenRouter (Gemini) | Active |
| receive-framer-lead | Resend, Slack | Active |
| send-slack-notification | Slack Webhooks | Active |
| manage-users | None (Supabase Auth) | Active |
| send-inspection-reminder | Resend | Active (cron: hourly) |
| send-email | Resend | Active |
| seed-admin | None (Supabase Auth) | Utility only |
| export-inspection-context | None (Supabase only) | Active |

### External Integrations

| Service | Status | Used By |
|---------|--------|---------|
| Supabase | Active | All backend operations |
| Resend | Active | 3 Edge Functions (send-email, reminder, framer-lead) |
| Slack | Active | 2 Edge Functions (slack-notification, framer-lead) |
| Google Maps | Active | 1 Edge Function + 1 client hook (travel time, autocomplete) |
| OpenRouter | Active | 1 Edge Function (AI summary generation) |
| Sentry | Active | Client-side error tracking + performance |
| Vercel | Active | Deployment with security headers |

### Infrastructure

- **Hosting:** Vercel (production), auto-deploy from `main` branch
- **Database:** Supabase project `ecyivrxjpsmjmexqatym`
- **Storage:** Supabase Storage (inspection-photos, pdf-templates buckets)
- **Domain:** Vercel default URL (custom domain not configured)
- **Environment separation:** Production only (dev Supabase project not created)

---

## The Delta — What Phase 2 Adds

### New Lead Statuses

Current flow ends at `closed`. Phase 2 extends with statuses already in the DB enum:

```
inspection_email_approval → job_waiting → job_completed / pending_review → job_report_pdf_sent → invoicing_sent → paid → google_review → finished
```

New status to add: `pending_review` (when technician flags "request review")

### New Database Tables

#### 1. `job_completions` (core Phase 2 table)

```sql
CREATE TABLE public.job_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
  
  -- Section 1: Office Info
  job_number VARCHAR(50) UNIQUE,
  address_snapshot TEXT,
  requested_by VARCHAR(255),
  attention_to VARCHAR(255),
  
  -- Section 2: Summary
  swms_completed BOOLEAN DEFAULT false,
  premises_type VARCHAR(50), -- 'residential' | 'commercial'
  completed_by UUID REFERENCES auth.users(id) NOT NULL,
  completion_date DATE NOT NULL,
  areas_treated TEXT[] DEFAULT '{}',
  
  -- Section 5: Treatment Methods
  method_hepa_vacuuming BOOLEAN DEFAULT false,
  method_surface_mould_remediation BOOLEAN DEFAULT false,
  method_ulv_fogging_property BOOLEAN DEFAULT false,
  method_ulv_fogging_subfloor BOOLEAN DEFAULT false,
  method_subfloor_remediation BOOLEAN DEFAULT false,
  method_afd_installation BOOLEAN DEFAULT false,
  method_drying_equipment BOOLEAN DEFAULT false,
  method_containment_prv BOOLEAN DEFAULT false,
  method_material_demolition BOOLEAN DEFAULT false,
  method_cavity_treatment BOOLEAN DEFAULT false,
  method_debris_removal BOOLEAN DEFAULT false,
  
  -- Section 6: Chemical Toggles
  chemical_air_filtration BOOLEAN DEFAULT false,
  chemical_water_based BOOLEAN DEFAULT false,
  chemical_sodium_hypochlorite BOOLEAN DEFAULT false,
  chemical_hepa_vacuumed BOOLEAN DEFAULT false,
  chemical_sanitised_premises BOOLEAN DEFAULT false,
  
  -- Section 7: Equipment Used (actual)
  actual_dehumidifier_qty INTEGER DEFAULT 0,
  actual_dehumidifier_days INTEGER DEFAULT 0,
  actual_air_mover_qty INTEGER DEFAULT 0,
  actual_air_mover_days INTEGER DEFAULT 0,
  actual_afd_qty INTEGER DEFAULT 0,
  actual_afd_days INTEGER DEFAULT 0,
  actual_rcd_qty INTEGER DEFAULT 0,
  actual_rcd_days INTEGER DEFAULT 0,
  
  -- Quoted equipment (snapshot from inspection)
  quoted_dehumidifier_qty INTEGER DEFAULT 0,
  quoted_air_mover_qty INTEGER DEFAULT 0,
  quoted_rcd_qty INTEGER DEFAULT 0,
  quoted_equipment_days INTEGER DEFAULT 0,
  
  -- Section 8: Variation Tracking
  scope_changed BOOLEAN DEFAULT false,
  scope_what_changed TEXT,
  scope_why_changed TEXT,
  scope_extra_work TEXT,
  scope_reduced TEXT,
  
  -- Section 9: Job Notes
  request_review BOOLEAN DEFAULT false,
  damages_present BOOLEAN DEFAULT false,
  damages_details TEXT,
  staining_present BOOLEAN DEFAULT false,
  staining_details TEXT,
  additional_notes TEXT,
  
  -- Section 10: Office Notes (admin only)
  office_notes TEXT,
  followup_required BOOLEAN DEFAULT false,
  
  -- Section 4: Demolition
  demolition_works BOOLEAN DEFAULT false,
  
  -- PDF & Approval
  pdf_url TEXT,
  pdf_version INTEGER DEFAULT 0,
  pdf_generated_at TIMESTAMPTZ,
  pdf_approved BOOLEAN DEFAULT false,
  pdf_approved_at TIMESTAMPTZ,
  pdf_approved_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  status VARCHAR(50) DEFAULT 'draft', -- draft | submitted | approved
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Extend `photos` table

```sql
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS job_completion_id UUID REFERENCES public.job_completions(id),
  ADD COLUMN IF NOT EXISTS photo_category VARCHAR(50);
  -- photo_category: 'before' | 'after' | 'demolition'
```

#### 3. `job_completion_pdf_versions`

```sql
CREATE TABLE public.job_completion_pdf_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_completion_id UUID REFERENCES public.job_completions(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  pdf_url TEXT NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_completion_id, version_number)
);
```

#### 4. Extend `invoices` table (recreate — was dropped in cleanup)

```sql
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  job_completion_id UUID REFERENCES public.job_completions(id),
  inspection_id UUID REFERENCES public.inspections(id),
  
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_address TEXT,
  
  quoted_amount DECIMAL(10,2),
  variation_amount DECIMAL(10,2) DEFAULT 0,
  equipment_cost DECIMAL(10,2) DEFAULT 0,
  labour_cost DECIMAL(10,2) DEFAULT 0,
  subtotal_ex_gst DECIMAL(10,2),
  gst_amount DECIMAL(10,2),
  total_inc_gst DECIMAL(10,2),
  
  payment_terms_days INTEGER DEFAULT 14,
  status VARCHAR(50) DEFAULT 'draft', -- draft | sent | paid | overdue
  issued_date DATE,
  due_date DATE,
  paid_date DATE,
  payment_method VARCHAR(50), -- bank_transfer | card | cash
  
  pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Edge Functions

| Function | Purpose | APIs |
|----------|---------|------|
| `generate-job-report-pdf` | Generate 9-page job completion PDF from HTML template | Supabase DB + Storage |
| `check-overdue-invoices` | Daily cron — flag overdue invoices, send Slack alert | Supabase DB, Slack |

### New Frontend Components

| Component | Type | Pattern From |
|-----------|------|-------------|
| `TechnicianJobCompletionForm.tsx` | Page (10 sections) | `TechnicianInspectionForm.tsx` |
| `ViewJobReportPDF.tsx` | Page | `ViewReportPDF.tsx` |
| `AdminInvoiceHelper.tsx` | Page | New (uses pricing.ts) |
| `src/components/jobCompletion/` | Section components (10) | Extract pattern (don't monolith) |
| `src/types/jobCompletion.ts` | Types | `src/types/inspection.ts` |
| `src/lib/api/jobCompletions.ts` | API helper | `src/lib/api/inspections.ts` |
| `src/lib/api/jobReportPdf.ts` | PDF API helper | `src/lib/api/pdfGeneration.ts` |
| `src/lib/schemas/jobCompletionSchema.ts` | Validation | `inspectionSchema.ts` |
| `src/hooks/useJobCompletionData.ts` | Data hook | Existing hook pattern |
| `src/hooks/usePaymentTracking.ts` | Payment hook | New |

### New Routes in App.tsx

```
/technician/job-completion?leadId=X  → TechnicianJobCompletionForm (technician)
/job-completion/:id/report           → ViewJobReportPDF (admin)
/admin/invoice/:leadId               → AdminInvoiceHelper (admin)
```

---

## Dependency Graph — Affected Modules

| Module | Changes Required |
|--------|-----------------|
| `src/lib/statusFlow.ts` | Extend from 7 to 15 statuses, new colors/icons |
| `src/pages/LeadDetail.tsx` | Add job completion card, invoice card, payment tracking |
| `src/pages/TechnicianJobDetail.tsx` | Add "Start Job Completion" button |
| `src/pages/AdminDashboard.tsx` | Add pending reviews widget, overdue invoices |
| `src/pages/LeadsManagement.tsx` | Handle new status columns in pipeline |
| `src/lib/utils/photoUpload.ts` | Add `job_completion_id` + `photo_category` to metadata |
| `src/lib/offline/db.ts` | Bump Dexie version, add `jobCompletionDrafts` store |
| `src/lib/api/notifications.ts` | New email templates, new Slack events |
| `supabase/functions/send-slack-notification/` | New event type handlers |
| `src/App.tsx` | 3 new routes |
| `src/components/leads/PipelineTabs.tsx` | New status tabs |

---

## Breaking Changes

1. **`statusFlow.ts`** — `LeadStatus` type union expands. All components importing it must handle new statuses. `isTerminalStatus()` must include `finished`. `ALL_STATUSES` array grows.

2. **`photoUpload.ts`** — `PhotoMetadata` needs `job_completion_id` and `photo_category` fields. Function names become misleading (`uploadInspectionPhoto` now handles job photos too).

3. **`offline/db.ts`** — Dexie version bump from 1 to 2. Triggers schema upgrade. Existing `inspectionDrafts` data preserved.

4. **`notifications.ts`** — Slack event union type needs new values. `send-slack-notification` Edge Function needs new message templates.

5. **`LeadDetail.tsx`** — Substantial additions. Status-dependent sections must handle Phase 2 statuses.

6. **Pipeline display** — `PipelineTabs.tsx` and `LeadsManagement.tsx` will show more status columns. May need horizontal scroll or grouping on mobile.

---

## Pre-Phase 2 Blockers

These must be resolved before starting Phase 2 implementation:

- [ ] **API Key Rotation** — Supabase access token, GitHub PAT, and Resend API key are in `.mcp.json`. Google Maps and OpenRouter keys may also be exposed. All need rotation.
- [ ] **Dev Supabase Project** — Need a development database to test migrations safely
- [ ] **AFD Equipment Rate** — Phase 2 form includes AFD (Air Filtration Device) but no rate is defined in `pricing.ts`. Michael needs to provide the daily rate.
- [ ] **Invoice format decision** — PDF invoice or formatted email? Current plan assumes email for MVP.

---

## Master Checklist

### Phase 2A — Database & Infrastructure
- [ ] Create migration: `pending_review` enum value
- [ ] Create migration: `job_completions` table with RLS
- [ ] Create migration: Extend `photos` table (job_completion_id, photo_category)
- [ ] Create migration: `job_completion_pdf_versions` table
- [ ] Create migration: `invoices` table (recreate)
- [ ] Create migration: Audit triggers for new tables
- [ ] Create `src/types/jobCompletion.ts`
- [ ] Create `src/lib/schemas/jobCompletionSchema.ts`
- [ ] Create `src/lib/api/jobCompletions.ts`
- [ ] Extend `src/lib/statusFlow.ts` with full pipeline
- [ ] Add AFD rate to `src/lib/calculations/pricing.ts`

### Phase 2B — Job Completion Form
- [ ] Extend `src/lib/offline/db.ts` for job completion drafts
- [ ] Create `src/components/jobCompletion/` section components (10 files)
- [ ] Create `src/pages/TechnicianJobCompletionForm.tsx`
- [ ] Modify `src/pages/TechnicianJobDetail.tsx` — "Start Job Completion" button
- [ ] Add route to `src/App.tsx`
- [ ] Extend `src/lib/utils/photoUpload.ts` for job completion photos
- [ ] Add Slack events to `src/lib/api/notifications.ts`

### Phase 2C — Job Report PDF
- [ ] Create HTML template for job report (upload to pdf-templates bucket)
- [ ] Create Edge Function `generate-job-report-pdf`
- [ ] Create `src/lib/api/jobReportPdf.ts`
- [ ] Create `src/pages/ViewJobReportPDF.tsx`
- [ ] Add route to `src/App.tsx`
- [ ] Add `buildJobReportEmailHtml()` to notifications.ts

### Phase 2D — Admin Review & Invoice
- [ ] Modify `src/pages/LeadDetail.tsx` — job completion display, payment tracking
- [ ] Modify `src/pages/AdminDashboard.tsx` — pending reviews, overdue invoices
- [ ] Create `src/pages/AdminInvoiceHelper.tsx`
- [ ] Create `src/hooks/useJobCompletionData.ts`
- [ ] Create `src/hooks/usePaymentTracking.ts`
- [ ] Add route to `src/App.tsx`
- [ ] Update `src/components/leads/PipelineTabs.tsx`

### Phase 2E — Payment Tracking & Automation
- [ ] Create Edge Function `check-overdue-invoices`
- [ ] Create cron job migration for daily overdue check
- [ ] Add `buildInvoiceEmailHtml()` to notifications.ts
- [ ] Extend `send-slack-notification` with new event types
- [ ] End-to-end testing of full workflow

### Phase 2F — Google Review & Closure
- [ ] Add Google review request email template
- [ ] Add "Request Review" action button on lead detail
- [ ] Terminal status: `finished` (after review or skip)

---

*This document is the single source of truth for Phase 2 execution. Do NOT start implementation until all pre-blockers are resolved and Michael approves.*

# MRC Lead Management System - Current TODO

**Last Updated:** 2026-04-05
**Status:** Phase 1 COMPLETE. Preparing for team access.

---

## Active Tasks (Priority Order)

### 1. Job Completion Workflow (Next Major Feature)

The pipeline currently ends at "Awaiting Job Approval" (Stage 6). This workflow extends it through to payment and closure.

- [ ] **Job Completion Form (Technician)**
  - Office info section
  - Summary of work performed
  - Before/after photos
  - Treatment methods used
  - Chemical toggles
  - Equipment used
  - Variations from original quote
  - Job notes (technician)
  - Office notes (admin-only)

- [ ] **Job Report PDF**
  - Same design system as inspection report
  - Generated from job completion form data
  - Before/after photo comparison

- [ ] **Admin Review + Approve + Email Flow**
  - Admin reviews job report
  - Approve or request changes
  - Email job report to customer

- [ ] **Invoice Helper**
  - Auto-populate from inspection pricing (Option 1/Option 2/Both)
  - Editable line items
  - GST calculation (10%)
  - PDF invoice generation

- [ ] **Payment Tracking**
  - Mark invoice as paid/unpaid/overdue
  - Payment method (bank transfer, card, cash)
  - Payment date
  - Overdue notifications

- [ ] **Audit Trail**
  - All status transitions logged to activities table
  - Timestamps + user who performed action
  - Immutable history

### 2. Framer → Supabase Lead Capture (Weekend)

- [ ] Connect Framer website form to `receive-framer-lead` Edge Function
- [ ] Test end-to-end: form submit → lead appears in system
- [ ] Verify email confirmation sends to customer
- [ ] Verify Slack notification fires

### 3. Email Domain Switch (Weekend)

- [ ] Switch sending domain to mouldandrestoration.com.au
- [ ] Update DNS records (SPF, DKIM, DMARC)
- [ ] Update Resend configuration
- [ ] Test deliverability

### ~~4. Rotate All API Keys~~ (COMPLETE 2026-04-05)

- [x] Rotate Supabase anon key + service role key
- [x] Rotate Resend API key
- [x] Rotate OpenRouter API key
- [x] Rotate Google Maps API key
- [x] Update all environment variables in Vercel
- [x] Update all Edge Function secrets in Supabase
- [x] Verify all Edge Functions still work after rotation

### 5. Environment Separation

- [ ] Create dev Supabase project
- [ ] Run all migrations against dev project
- [ ] Add dev Supabase keys as Preview env vars in Vercel
- [ ] Verify preview deployments use dev database

### 6. Pre-Launch

- [ ] Walkthrough session with technicians (Clayton, Glen)
- [ ] Create technician accounts in production
- [ ] Final documentation pass
- [ ] E2E testing (ongoing)

---

## Completed (Reference)

- [x] Phase 1: Technician Role (dashboard, jobs, inspection form, all 10 sections)
- [x] Phase 1: Admin Role (dashboard, schedule, leads, technicians, reports)
- [x] Inspection form → AI summary → PDF → email pipeline
- [x] Security remediation (RLS on all tables, rate limiting, XSS/CSP, audit triggers)
- [x] Codebase cleanup (15 dead routes, 9 unused tables, dead code removed)
- [x] Vercel deployment with security headers
- [x] Sentry error tracking + offline resilience
- [x] PDF page ordering fix
- [x] Lead detail improvements (inline editing, travel time, activity logging)
- [x] MCP server stack configured (Supabase, GitHub, Resend, Slack, Playwright, Context7, Memory)
- [x] Database cleanup & hardening (68/100 → 91/100: 12 legacy tables dropped, broken FKs/functions fixed, duplicate indexes removed)

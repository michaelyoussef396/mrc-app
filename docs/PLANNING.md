# MRC Lead Management System - Architecture & Planning

**Last Updated:** 2026-04-01

---

## Architecture Overview

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript (strict mode) |
| UI Library | shadcn/ui + Tailwind CSS 3.4 |
| Routing | React Router v6 |
| Server State | TanStack React Query |
| Auth State | React Context (AuthContext) |
| Charts | Recharts |
| Forms | react-hook-form + Zod validation |
| PWA | vite-plugin-pwa (registerType: autoUpdate) |
| Error Tracking | Sentry |
| Build | Vite 5 |
| Deployment | Vercel |

### Component Inventory

- **91 components** across 14 directories (admin, booking, dashboard, inspection, layout, leads, loading, pdf, reports, schedule, technician, technicians, ui)
- **26 pages** (Admin: 14, Technician: 5, Shared: 7)
- **22 custom hooks** (data fetching, form state, auth, real-time)
- **40+ shadcn/ui primitives** in `src/components/ui/`

### Backend

| Layer | Technology |
|-------|-----------|
| Database | Supabase (PostgreSQL) — 16 tables |
| Auth | Supabase Auth (email/password, role-based) |
| Storage | Supabase Storage (inspection photos, PDFs, assets) |
| Edge Functions | 10 Deno-based functions |
| Project Ref | `ecyivrxjpsmjmexqatym` |

### Edge Functions

| Function | Purpose |
|----------|---------|
| generate-inspection-pdf | HTML template → PDF generation |
| calculate-travel-time | Google Maps API travel time |
| generate-inspection-summary | AI summary via OpenRouter/Gemini |
| receive-framer-lead | Framer website form → lead creation |
| send-slack-notification | Slack webhook notifications |
| manage-users | Admin user CRUD |
| send-inspection-reminder | 24hr reminder emails |
| send-email | Resend email delivery (rate limited) |
| seed-admin | Initial admin account setup |
| export-inspection-context | Export inspection data for AI |

### Database Tables (16)

activities, calendar_events, inspection_areas, inspections, leads, moisture_readings, photos, subfloor_data, subfloor_readings, user_roles, error_logs, login_activity, user_devices, suspicious_activity, email_logs, user_sessions

### Security

- RLS enabled on all 16 tables with `auth.uid()` enforcement
- Rate limiting on public Edge Functions (receive-framer-lead: 5/hr, send-email: 10/min)
- XSS sanitization with DOMPurify
- Zod input validation on all Edge Functions
- CSP headers via Vercel config (frame-ancestors: none, strict connect-src)
- Audit triggers on sensitive tables
- No hardcoded secrets (all in .env / Supabase secrets)
- npm audit: 6 remaining (all low/info severity)

---

## Deployment Readiness

### Done

- [x] Vercel deployment configured (vercel.json with security headers, SPA rewrites)
- [x] Production Supabase project running
- [x] All 10 Edge Functions deployed
- [x] Sentry error tracking active
- [x] PWA with service worker + offline support (NetworkFirst for API, CacheFirst for fonts)
- [x] RLS policies on all tables
- [x] Rate limiting on public endpoints
- [x] CSP + X-Frame-Options + X-Content-Type-Options headers
- [x] Source maps uploaded to Sentry (hidden in production)
- [x] npm audit: zero high/critical vulnerabilities

### Not Done

- [ ] Dev Supabase project (for preview deployments)
- [ ] Email domain switch (mouldandrestoration.com.au)
- [ ] API key rotation
- [ ] Technician accounts created (Clayton, Glen)
- [ ] Team walkthrough completed
- [ ] Custom production domain (currently Vercel default URL)
- [ ] E2E test automation (currently manual with screenshots)

---

## Tech Debt

1. **TechnicianAlerts page** — uses mock data, needs real notifications table + Slack bridge (deferred to Phase 2)
2. **Offline photo retry** — photos don't retry upload on reconnect, user must re-upload (deferred to Phase 3)
3. **TechnicianInspectionForm.tsx** — monolith component, could be further modularized into section components
4. **Avg Response Time KPI** — hardcoded "24 hrs" placeholder on admin dashboard, needs `first_contact_at` field on leads
5. **npm audit** — 6 low/info vulnerabilities remaining (no high/critical)

---

## Next Major Feature: Job Completion Workflow

### What It Does

Extends the pipeline from "Awaiting Job Approval" (Stage 6) through to job closure:

```
Job Booked → Job In Progress → Job Completed → Invoice Sent → Payment Received → Closed
```

### Components Required

1. **Job Completion Form** — technician fills out after finishing remediation work
   - Office info, summary, before/after photos, treatment methods, chemicals, equipment, variations, job notes, office notes
2. **Job Report PDF** — same design as inspection report, generated from completion form
3. **Admin Review Flow** — review, approve, email job report to customer
4. **Invoice Helper** — auto-generate from inspection pricing, editable, GST calculation
5. **Payment Tracking** — paid/unpaid/overdue status, payment method, date
6. **Google Review Request** — automated email after payment received

### Database Changes Needed

- Job completion data fields (on leads or new table)
- Invoice tracking fields
- Payment status/method/date fields
- New pipeline stages in lead_status enum

### Reference

Full PRD for stages 8-12 is in `context/PRD.md`. Task list is in `context/TODO.md`.

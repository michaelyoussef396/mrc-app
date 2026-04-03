# MRC Project Context

## What Is This?
A mobile-first SaaS platform for **Mould & Restoration Co.** (Melbourne, Australia) that automates the lead-to-inspection-to-report workflow for mould remediation technicians.

## Who Uses It?
- **Field technicians** (Clayton & Glen) — mobile phones/iPads, often wearing work gloves, in basements with poor signal
- **Admin** (Michael) — desktop, manages leads, reviews reports, handles scheduling

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) |
| PWA | vite-plugin-pwa with service worker (offline support) |
| Monitoring | Sentry (error tracking) |
| Email | Resend API (via Edge Function) |
| AI | OpenRouter (inspection summary generation) |
| Maps | Google Maps API (address autocomplete, travel time) |

## Database
- **Supabase project ref:** `ecyivrxjpsmjmexqatym`
- **22 tables** with RLS on all tables
- **10 Edge Functions:** send-email, generate-inspection-pdf, send-inspection-reminder, generate-inspection-summary, send-slack-notification, calculate-travel-time, manage-users, seed-admin, export-inspection-context, and more

## What's Built (Phase 1 — Complete)
- Lead capture and pipeline management (New > Contacted > Inspected > Quoted > Won/Lost)
- Technician mobile dashboard with job list and schedule
- 10-section inspection form with offline auto-save
- AI-generated inspection summaries
- PDF report generation from HTML templates
- Customer self-service booking with travel time intelligence
- Email automation at every pipeline stage
- Admin dashboard with stats, lead management, reports
- PWA with service worker for offline use

## What's Next (Phase 2 — Job Completion)
- Job completion form (technician marks work done)
- Job report PDF generation
- Admin approval workflow
- Invoice helper and payment tracking
- Audit trail for all changes

## Git Workflow
- `main` branch — development, triggers Vercel preview deploys
- `production` branch — live app, triggers Vercel production deploys
- Never push directly to `production` — always merge from `main`

## Key Business Constraints
- **13% maximum discount** — hardcoded cap, never exceed
- **GST 10%** — all pricing includes GST calculation
- **48px touch targets** — technicians wear gloves
- **375px mobile-first** — primary use case is phone in the field
- **Australian formatting** — DD/MM/YYYY dates, $X,XXX.XX currency, en-AU locale

# MRC Lead Management System - Project Context

**Last Updated:** 2026-04-03
**Purpose:** Comprehensive codebase reference for Claude Project knowledge. Enables accurate planning and prompt writing.

---

## 1. Project Overview

A mobile-first SaaS platform for **Mould & Restoration Co.** (Melbourne, Australia) that automates the lead-to-inspection-to-report workflow for mould remediation.

### Users
- **Field technicians** (Clayton & Glen) — phones/iPads, work gloves, basements with poor signal
- **Admin** (Michael) — desktop, manages leads, reviews reports, scheduling
- **Customers** — public inspection request form, receive PDF reports via email

### Current State
- **Phase 1: COMPLETE** — full inspection workflow end-to-end
- **Phase 2: IN PROGRESS** — job completion workflow (see `docs/JOB_COMPLETION_PRD.md`)

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript + Vite | 18.3.1 / 5.8.3 / 5.4.19 |
| UI | shadcn/ui + Tailwind CSS + Lucide icons | Radix-based / 3.4.17 / 0.462.0 |
| State | TanStack React Query + React Router | 5.83.0 / 6.30.1 |
| Forms | react-hook-form + Zod | 7.61.1 / 3.25.76 |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) | 2.76.1 |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) | — |
| PWA | vite-plugin-pwa + Dexie (IndexedDB) | 1.2.0 / 4.3.0 |
| Monitoring | Sentry | 10.42.0 |
| Email | Resend API (via Edge Function) | — |
| AI | OpenRouter (Gemini Flash for inspection summaries) | — |
| Maps | Google Maps (autocomplete, travel time) | — |
| Charts | Recharts | 2.15.4 |
| PDF | jsPDF + html2canvas + pdfjs-dist + react-pdf | 4.1.0 / 1.4.1 / 5.4.449 / 10.2.0 |
| Testing | Vitest + Testing Library + Puppeteer | 3.2.4 / 16.3.2 / 24.29.1 |
| Security | DOMPurify + FingerprintJS | 3.3.3 / 4.5.1 |

### Supabase Project
- **Project ref:** `ecyivrxjpsmjmexqatym`
- **22 active tables** with RLS on all tables
- **10 Edge Functions**

---

## 2. Routes (from `src/App.tsx`)

### Public Routes (no auth)

| Path | Page | Notes |
|------|------|-------|
| `/` | Login | Role selection (Admin/Technician) |
| `/forgot-password` | ForgotPassword | Email submission with rate limiting |
| `/check-email` | CheckEmail | Confirmation + resend |
| `/reset-password` | ResetPassword | Token-validated password reset |
| `/request-inspection` | RequestInspection | Public customer form |
| `/request-inspection/success` | InspectionSuccess | Confirmation with reference number |
| `*` | NotFound | 404 with role-aware redirect |

### Admin Routes (ProtectedRoute + RoleProtectedRoute["admin"])

| Path | Page | Notes |
|------|------|-------|
| `/admin` | AdminDashboard | KPIs, today's jobs, activity timeline |
| `/admin/schedule` | AdminSchedule | Week/day calendar, booking management |
| `/admin/leads` | LeadsManagement | Pipeline tabs, status filtering, PDF actions |
| `/admin/technicians` | AdminTechnicians | Technician list with stats |
| `/admin/technicians/:id` | AdminTechnicianDetail | Profile, stats, upcoming bookings |
| `/admin/inspection-ai-review/:leadId` | InspectionAIReview | AI summary editing and approval |
| `/admin/reports` | Reports | KPIs, charts, analytics |
| `/admin/activity` | Notifications | Platform-wide activity feed |
| `/admin/settings` | Settings | Account, devices, password |
| `/admin/help` | HelpSupport | Developer contact info |
| `/admin/profile` | Profile | Avatar, contact info, address |
| `/lead/new/:id` | NewLeadView | Unassigned lead with technician recommendations |
| `/leads/:id` | LeadDetail | Full lead view with edit, booking, status tracking |
| `/inspection/:inspectionId/report` | ViewReportPDF | PDF viewer with inline editing and approval |
| `/report/:id` | ViewReportPDF | Alternate PDF route |

### Technician Routes (ProtectedRoute + RoleProtectedRoute["technician"])

| Path | Page | Notes |
|------|------|-------|
| `/technician` | TechnicianDashboard | Next job card, today's jobs, alerts |
| `/technician/jobs` | TechnicianJobs | Tab filtering (Today/Week/Month/Upcoming/Completed) |
| `/technician/job/:id` | TechnicianJobDetail | Job handoff, contact update, schedule inspection |
| `/technician/inspection` | TechnicianInspectionForm | 10-section form with offline auto-save |
| `/technician/alerts` | TechnicianAlerts | Job updates, schedule changes, reminders |
| `/technician/profile` | Profile | Shared component |
| `/technician/settings` | Settings | Shared component (role-aware nav) |
| `/technician/help` | HelpSupport | Shared component |

### Route Protection
- `ProtectedRoute` — checks Supabase auth session
- `RoleProtectedRoute` — checks `allowedRoles` array against `user_roles` table
- Lazy-loaded pages via `React.lazy` + `Suspense` with `PageLoader`/`GlobalLoader`
- Error-prone pages wrapped in `PageErrorBoundary` (AI review, lead detail, inspection form)

---

## 3. Pages (26 files in `src/pages/`)

| File | Description |
|------|-------------|
| `AdminDashboard.tsx` | KPIs, today's jobs, unassigned leads, technician stats, activity timeline |
| `AdminSchedule.tsx` | Calendar scheduling view with daily jobs queue and booking management |
| `AdminTechnicians.tsx` | Technician list with stats (inspections, revenue) in card format |
| `AdminTechnicianDetail.tsx` | Technician profile, stats grid, workload, upcoming bookings |
| `LeadsManagement.tsx` | Pipeline tabs (New/Contacted/Scheduled/In Progress/Pending Approval) with PDF actions |
| `NewLeadView.tsx` | Unassigned lead with technician recommendations + travel time |
| `LeadDetail.tsx` | Full lead view with inline editing, booking, status tracking |
| `InspectionAIReview.tsx` | AI summary editing/approval with edge function integration |
| `ViewReportPDF.tsx` | PDF report viewer with inline/overlay edit modes and approval |
| `Reports.tsx` | Analytics: KPI cards, status chart, source distribution, timeline |
| `Notifications.tsx` | Activity feed showing leads, emails, activity across platform |
| `TechnicianDashboard.tsx` | Next job card, today's jobs list, alerts summary |
| `TechnicianJobs.tsx` | Job list with tab filtering by time period |
| `TechnicianJobDetail.tsx` | Job handoff page with contact update and inspection scheduling |
| `TechnicianInspectionForm.tsx` | 10-section inspection form (moisture, photos, cost estimate, AI summary) |
| `TechnicianAlerts.tsx` | Notification list (updates, schedule changes, reminders, cancellations) |
| `Login.tsx` | Auth entry with role selection and error handling |
| `ForgotPassword.tsx` | Password reset request with rate limiting (3 per 15 min) |
| `CheckEmail.tsx` | Post-forgot-password confirmation with resend |
| `ResetPassword.tsx` | Token-validated new password form |
| `Profile.tsx` | Editable profile: avatar upload, contact info, phone verification, address autocomplete |
| `Settings.tsx` | Account management, device logout, password change, deletion |
| `RequestInspection.tsx` | Public inspection request form with phone/email validation |
| `InspectionSuccess.tsx` | Confirmation page with reference number |
| `HelpSupport.tsx` | Developer contact info |
| `NotFound.tsx` | 404 with role-aware redirect |

---

## 4. Components (~85 files in `src/components/`)

### Root Level

| File | Description |
|------|-------------|
| `ProtectedRoute.tsx` | Auth guard — redirects to login if unauthenticated |
| `RoleProtectedRoute.tsx` | Role guard — shows permission error if wrong role |
| `ErrorBoundary.tsx` | Sentry-integrated error boundary with recovery UI |
| `OfflineBanner.tsx` | Sticky notification when offline with sync status |
| `FormRecoveryToast.tsx` | Detects and offers recovery of unsaved inspection drafts from IndexedDB |

### `admin/` (5 files)

| File | Description |
|------|-------------|
| `AdminHeader.tsx` | Top nav: greeting, search, notifications dropdown, profile menu |
| `AdminSidebar.tsx` | Side nav: MRC branding, nav items, unread badge, mobile drawer |
| `AdminPageLayout.tsx` | Layout wrapper with sticky header, sidebar, title, action buttons |
| `AdminSearchBar.tsx` | Global lead search with autocomplete, keyboard nav, status badges |
| `StatsCard.tsx` | KPI metric: icon, value, trend indicator |

### `booking/` (4 files)

| File | Description |
|------|-------------|
| `SmartBookingSlots.tsx` | Available time slots calculated from Google Maps travel times |
| `LeadsToBook.tsx` | Unscheduled leads with proximity scoring for efficient scheduling |
| `AddressAutocomplete.tsx` | Google Places autocomplete with address parsing + manual fallback |
| `TimeSlotValidator.tsx` | Real-time travel time validation with suggested alternatives |

### `dashboard/` (1 file)

| File | Description |
|------|-------------|
| `ActivityTimeline.tsx` | Timeline of recent events (lead created, inspection scheduled, etc.) |

### `inspection/` (1 file)

| File | Description |
|------|-------------|
| `InspectionJobCard.tsx` | Scheduled inspection card with customer info and action buttons |

### `leads/` (8 files)

| File | Description |
|------|-------------|
| `LeadCard.tsx` | Status-specific pipeline card with context-dependent action buttons |
| `CreateLeadCard.tsx` | CTA card prompting new lead creation |
| `CreateNewLeadModal.tsx` | Modal form for new lead with validation |
| `EditLeadSheet.tsx` | Side sheet for editing existing lead info |
| `BookInspectionModal.tsx` | Modal: date picker, time selector, technician assignment |
| `NewLeadView.tsx` | Full-page new lead entry workflow |
| `PipelineTabs.tsx` | Tabbed interface grouping leads by pipeline status |
| `InspectionDataDisplay.tsx` | Display component for inspection results |

### `loading/` (3 files)

| File | Description |
|------|-------------|
| `GlobalLoader.tsx` | Full-screen loader with MRC logo, spinner, gradient orbs |
| `ProgressBar.tsx` | Animated top bar simulating page load progress |
| `PageTransition.tsx` | Fade in/out transition wrapper with loading spinner |

### `pdf/` (3 files)

| File | Description |
|------|-------------|
| `EditFieldModal.tsx` | Modal for editing PDF report fields with live regeneration |
| `ImageUploadModal.tsx` | Modal for uploading photos to PDF reports |
| `ReportPreviewHTML.tsx` | Multi-page HTML preview of generated PDF report |

### `reports/` (5 files)

| File | Description |
|------|-------------|
| `KPICard.tsx` | Single KPI metric with icon and subtitle |
| `PeriodFilter.tsx` | Date range filter (weekly, monthly, custom) |
| `TimelineChart.tsx` | Metric trends over time |
| `SourcesChart.tsx` | Lead sources breakdown chart |
| `StatusChart.tsx` | Leads by status distribution chart |

### `schedule/` (7 files + utils)

| File | Description |
|------|-------------|
| `ScheduleCalendar.tsx` | Week view calendar grid with sticky time/day headers |
| `ScheduleHeader.tsx` | Week navigation, date range display, view mode selector |
| `ScheduleDailyView.tsx` | Day-by-day detailed schedule for inspections |
| `LeadBookingCard.tsx` | Card for a booked inspection with customer details |
| `LeadsQueue.tsx` | Queue of leads waiting to be scheduled |
| `EventDetailsPanel.tsx` | Detailed panel for selected calendar event |
| `CancelledBookingsList.tsx` | List of cancelled bookings with reasons |
| `scheduleUtils.ts` | Helper functions for schedule event styling/formatting |

### `technician/` (6 files)

| File | Description |
|------|-------------|
| `TechnicianHeader.tsx` | Mobile header with name and day schedule summary |
| `TechnicianBottomNav.tsx` | Bottom nav bar with tabs (jobs, inspections, etc.) |
| `NextJobCard.tsx` | Prominent card: next job with name, time, address, travel time |
| `JobsList.tsx` | Scrollable list of today's assigned jobs |
| `AllCompleteState.tsx` | Celebration state when all jobs done |
| `EmptyState.tsx` | Empty state when no jobs scheduled |

### `technicians/` (5 files) — admin view of technicians

| File | Description |
|------|-------------|
| `TechnicianCard.tsx` | Technician profile card with availability status |
| `TechnicianProfileHeader.tsx` | Header for technician profile page |
| `TechnicianStatsGrid.tsx` | Grid of technician KPIs |
| `UpcomingBookingCard.tsx` | Single upcoming booking card |
| `UpcomingBookingsList.tsx` | List of upcoming bookings |
| `WorkloadBreakdown.tsx` | Workload distribution breakdown |

### `ui/` (35 shadcn/ui components)

Radix UI primitives with Tailwind styling: `accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `calendar`, `card`, `chart`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `progress`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `toggle-group`, `tooltip`, `RetryButton`

---

## 5. Hooks (21 files in `src/hooks/`)

| File | Description |
|------|-------------|
| `useAdminDashboardStats.ts` | Real-time KPIs: today's jobs, unassigned leads, weekly completions/revenue |
| `useTechnicianStats.ts` | Technician list with stats (weekly inspections, monthly revenue) |
| `useTodaysSchedule.ts` | Today's scheduled inspections with client info and assignment |
| `useUnassignedLeads.ts` | Leads without assigned technicians + time-since-creation |
| `useTechnicianDetail.ts` | Detailed technician profile, stats, upcoming assignments |
| `useInspectionLeads.ts` | Inspection-ready leads with full details |
| `useScheduleCalendar.ts` | Calendar events with technician filtering |
| `useLeadsToSchedule.ts` | Leads awaiting inspection scheduling |
| `useBookingValidation.ts` | Validates booking: availability, location conflicts, break requirements |
| `useLeadSearch.ts` | Full-text search across name, email, phone, address with debouncing |
| `useLeadUpdate.ts` | Mutation for updating lead details with Slack notifications |
| `useNotifications.ts` | User notifications with read/unread state |
| `useActivityTimeline.ts` | Platform activity log mapped to UI-friendly format |
| `useCancelledBookings.ts` | Cancelled/deleted calendar bookings |
| `useTechnicianAlerts.ts` | Technician-specific alerts with read state |
| `useReportsData.ts` | Analytics data for reports dashboard |
| `useTechnicianJobs.ts` | Technician's jobs filtered by time period |
| `useTechnicians.ts` | Technician list with color/avatar mapping |
| `useDebounce.ts` | Generic debounce utility for delayed value updates |
| `useGoogleMaps.ts` | Google Maps: place predictions, travel time, distance |
| `use-toast.ts` | Toast notification system (shadcn/ui) |

---

## 6. Types (`src/types/`)

### `src/types/inspection.ts`

| Interface | Description |
|-----------|-------------|
| `InspectionFormData` | Complete 10-section form state (~60 fields): basic info, property details, area inspections, subfloor, outdoor, waste disposal, work procedures, job summary, cost estimate, AI content |
| `InspectionArea` | Room-level data: mould description, climate readings (temp/humidity/dew point), moisture readings, photos, infrared, demolition details |
| `MoistureReading` | Moisture meter reading with location and optional photo |
| `Photo` | Photo metadata: id, name, url, timestamp |
| `SubfloorReading` | Subfloor moisture reading with location identifier |

### `src/integrations/supabase/types.ts`
Auto-generated Supabase types for all 22 tables. Regenerate with `npx supabase gen types typescript`.

---

## 7. Lib Files (~27 files in `src/lib/`)

### API (`src/lib/api/`)

| File | Description |
|------|-------------|
| `apiClient.ts` | Centralized Supabase mutation wrapper: online checks, Sentry capture, error translation |
| `inspections.ts` | Inspection-specific API calls (fetch, create, update) |
| `notifications.ts` | Email/Slack sending, `buildBookingConfirmationHtml()`, `sendSlackNotification()` |
| `pdfGeneration.ts` | `generateInspectionPDF()`, `updateFieldAndRegenerate()`, `approvePDF()`, version history |
| `public-leads.ts` | Public API for lead creation (Framer form webhook) |

### Calculations (`src/lib/calculations/`)

| File | Description |
|------|-------------|
| `pricing.ts` | Complete tier-based cost engine: `LABOUR_RATES`, `calculateLabourCost()`, `calculateDiscount()`, `calculateEquipmentCost()`, `calculateCostEstimate()`, `formatCurrency()` |

### Offline (`src/lib/offline/`)

| File | Description |
|------|-------------|
| `db.ts` | Dexie IndexedDB schema: `inspectionDrafts`, `photoQueue`, `syncLog` |
| `SyncManager.ts` | Text-first sync: save draft -> queue photos -> sync text -> upload photos |
| `SyncIndicator.tsx` | Visual indicator for sync state |
| `photoResizer.ts` | JPEG resize/compress before upload |
| `useNetworkStatus.ts` | Online/offline detection hook |
| `useOfflineSync.ts` | Sync state and pending counts hook |
| `types.ts` | Offline type definitions |
| `index.ts` | Barrel export |

### Schemas & Validators

| File | Description |
|------|-------------|
| `schemas/inspectionSchema.ts` | Zod validation for inspection form data |
| `validators/lead-creation.schemas.ts` | Zod schemas for lead creation |

### Utils

| File | Description |
|------|-------------|
| `utils/htmlToPdf.ts` | HTML to PDF conversion utilities |
| `utils/photoUpload.ts` | Photo upload handling and validation |

### Root-level Lib

| File | Description |
|------|-------------|
| `bookingService.ts` | `bookInspection()`, `checkBookingConflict()` — creates booking + emails + activity logging |
| `inspectionUtils.ts` | `calculateDewPoint()`, `generateJobNumber()` (MRC-YYYY-XXXX format) |
| `leadUtils.ts` | Lead-specific utility functions |
| `statusFlow.ts` | Lead status pipeline definitions (see Section 11) |
| `sentry.ts` | Sentry init, business context, breadcrumbs |
| `utils.ts` | `cn()` — clsx + tailwind-merge wrapper |
| `hooks/useSessionRefresh.ts` | Auth session refresh hook |

---

## 8. Supporting Source Files

### Contexts

| File | Description |
|------|-------------|
| `src/contexts/AuthContext.tsx` | Supabase auth provider: session management, role-based routing, `useAuth()` hook |

### Services

| File | Description |
|------|-------------|
| `src/services/loginActivityService.ts` | Login attempt logging (success/fail, device, location) |
| `src/services/sessionService.ts` | Active session tracking, device trust management |

### Templates

| File | Description |
|------|-------------|
| `src/templates/inspection-report-template.html` | HTML template for PDF generation (populated by Edge Function) |
| `src/templates/terms-and-conditions.html` | Legal terms template |

### Integrations

| File | Description |
|------|-------------|
| `src/integrations/supabase/client.ts` | Supabase client initialization |
| `src/integrations/supabase/types.ts` | Auto-generated TypeScript types for all tables |

---

## 9. Edge Functions (10 in `supabase/functions/`)

| Function | Purpose | External API |
|----------|---------|-------------|
| `send-email` | Branded email delivery with rate limiting + retry (3 attempts) | Resend |
| `generate-inspection-pdf` | Populate HTML template with inspection data, return HTML/URL | Supabase Storage |
| `generate-inspection-summary` | AI-generated report sections from inspection data | OpenRouter (Gemini Flash) |
| `send-inspection-reminder` | Automated reminder emails 2 days before inspection (pg_cron) | Resend |
| `send-slack-notification` | Pipeline event notifications to Slack channel | Slack Webhooks |
| `calculate-travel-time` | Drive time between locations for scheduling | Google Maps Distance Matrix |
| `receive-framer-lead` | Webhook for Framer website lead capture form | Slack (notification) |
| `manage-users` | CRUD users with role assignment (admin-only, service role) | Supabase Auth Admin |
| `export-inspection-context` | Full lead+inspection data as JSON for debugging/prompts | None (internal) |
| `seed-admin` | Bootstrap initial admin user (dev utility) | Supabase Auth Admin |

### Edge Function Deployment
```bash
npx supabase functions deploy <name> --project-ref ecyivrxjpsmjmexqatym
```

---

## 10. Database (22 Active Tables)

### Core Active (7 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `leads` | id, full_name, email, phone, property_address_*, status, assigned_to, source, urgency | Central entity: customer/property through pipeline |
| `inspections` | id, lead_id, inspector_id, job_number, inspection_date, 95 cols (areas, pricing, AI summary, PDF tracking) | Technician form data, pricing, AI summaries |
| `inspection_areas` | id, inspection_id, area_name, temperature, humidity, dew_point, visible_mould_locations, moisture readings | Room-by-room inspection data |
| `calendar_bookings` | id, lead_id, technician_id, booking_date, start_time, end_time, duration_hours, status | Scheduling with conflict detection |
| `activities` | id, lead_id, activity_type, title, description, user_id, created_at | User-facing lead timeline |
| `photos` | id, inspection_id, area_id, subfloor_id, photo_url, photo_type, display_order | Inspection photos with CASCADE deletes |
| `pdf_versions` | id, inspection_id, version_number, pdf_url, generated_by, created_at | PDF version history (unique on inspection_id + version_number) |

### Supporting (7 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `moisture_readings` | id, area_id, location, reading_percent, photo_url | Per-area moisture readings |
| `subfloor_data` | id, inspection_id, observations, landscape, treatment_time | Subfloor assessment (1:1 with inspection) |
| `subfloor_readings` | id, subfloor_id, location, reading_percent | Subfloor moisture readings |
| `profiles` | id (FK auth.users), full_name, email, phone, avatar_url | User profile extension |
| `user_roles` | id, user_id, role_id (unique user_id+role_id) | RBAC join table |
| `roles` | id, name (admin/technician/developer) | Role definitions |
| `editable_fields` | id, field_key, label, field_type, table_name, column_name | PDF inline-edit configuration |

### Security (4 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `login_activity` | id, user_id, success, ip_address, device_info, location | Login attempt audit trail |
| `user_devices` | id, user_id, device_fingerprint, is_trusted | Known device registry |
| `user_sessions` | id, user_id, device_id, is_active | Active session tracking |
| `suspicious_activity` | id, user_id, login_activity_id, activity_type, details | Flagged security events |

### Logging (3 tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `email_logs` | id, lead_id, inspection_id, recipient_email, status, sent_at, resend_id | Email delivery audit |
| `notifications` | id, user_id, lead_id, type, title, message, is_read | In-app notification system |
| `audit_logs` | id, action, entity_type, entity_id, metadata, user_id | Immutable system audit trail |

### RLS Model
- All 22 tables have RLS enabled
- `is_admin()` and `has_role()` are `SECURITY DEFINER` functions
- Technicians see own assigned data; admins see all
- `auth.uid()` used for ownership checks

---

## 11. Lead Status Flow

```
new_lead ──> inspection_waiting ──> inspection_ai_summary ──> approve_inspection_report ──> inspection_email_approval ──> closed
                                                                                                                     ──> not_landed
```

| Status | Title | Next Action |
|--------|-------|-------------|
| `new_lead` | New Lead | Book inspection with customer |
| `inspection_waiting` | Awaiting Inspection | Complete inspection and submit form |
| `inspection_ai_summary` | AI Summary Review | Review and approve AI-generated content |
| `approve_inspection_report` | Approve Inspection Report | Review and approve PDF report |
| `inspection_email_approval` | Awaiting Job Approval | Customer reviews report, books job |
| `closed` | Closed | Terminal |
| `not_landed` | Not Landed | Terminal |

**Phase 2 will extend with:** `job_waiting` > `job_completed` / `pending_review` > `job_report_pdf_sent` > `invoicing_sent` > `paid` > `google_review` > `finished`

**Defined in:** `src/lib/statusFlow.ts`

---

## 12. Business Rules (Non-Negotiable)

### Pricing

| Rule | Value |
|------|-------|
| Non-Demolition rates | 2h: $612.00, 8h: $1,216.99 |
| Demolition rates | 2h: $711.90, 8h: $1,798.90 |
| Subfloor rates | 2h: $900.00, 8h: $2,334.69 |
| Under 2h | Pro-rate: (hours/2) x tier2h |
| 2-8h | Linear interpolation between 2h and 8h rates |
| 8h+ | Day blocks: floor(hours/8) x tier8h + remainder interpolated |
| Discount 0-8h | 0% |
| Discount 9-16h | 7.5% (multiplier 0.925) |
| Discount 17-24h | 10.25% (multiplier 0.8975) |
| Discount 25-32h | 11.5% (multiplier 0.885) |
| **Discount 33h+** | **13% MAX (multiplier 0.87) — SACRED, NEVER EXCEED** |
| Dehumidifier | $132/day |
| Air Mover | $46/day |
| RCD Box | $5/day |
| GST | Always 10% on subtotal |
| Calculation order | All labour > discount > + equipment > subtotal > GST > total |
| Equipment | NEVER discounted |
| Manual override | Available (bypasses all calculations) |

**Full spec:** `docs/COST_CALCULATION_SYSTEM.md`
**Implementation:** `src/lib/calculations/pricing.ts`

### Australian Compliance

| Rule | Format |
|------|--------|
| Currency | `$X,XXX.XX` AUD |
| Dates | `DD/MM/YYYY` (never MM/DD/YYYY) |
| Timezone | `Australia/Melbourne`, locale `en-AU` |
| Mobile phone | `04XX XXX XXX` |
| Landline | `(03) XXXX XXXX` |
| ABN | `XX XXX XXX XXX` (11 digits, space-separated) |

### UX Constraints

| Rule | Value |
|------|-------|
| Touch targets | Minimum 48px (technicians wear gloves) |
| Primary viewport | 375px (mobile-first) |
| Auto-save | Every 30 seconds on forms |
| Data loss | Zero tolerance on navigation |
| Horizontal scroll | Never allowed |

---

## 13. Architecture Decisions

### Offline-First (PWA)
- `vite-plugin-pwa` with `registerType: 'autoUpdate'` — service worker auto-updates
- Dexie (IndexedDB) stores: `inspectionDrafts`, `photoQueue`, `syncLog`
- `SyncManager` handles text-first sync: save draft > queue photos > sync text online > upload photos
- `photoResizer` compresses JPEG before upload (max 1600px)
- `OfflineBanner` component shows connection status + pending count
- `FormRecoveryToast` detects and offers recovery of abandoned drafts

### Auth Model
- Supabase Auth (email/password only)
- Two roles: `admin`, `technician` (stored in `user_roles` join table)
- RLS on every table using `auth.uid()` for ownership
- `ProtectedRoute` (auth check) + `RoleProtectedRoute` (role check) wrappers
- `AuthContext` provides `useAuth()` hook with session, user, role info
- Session refresh via `useSessionRefresh` hook
- Device fingerprinting + login activity tracking for security

### Code Splitting
- Login flow pages eagerly loaded
- All other pages lazy-loaded with `React.lazy` + `Suspense`
- React Query with staleTime caching, no refetch on window focus

### PDF Generation
- Edge Function `generate-inspection-pdf` populates HTML template from Supabase Storage
- Client renders via `html2canvas` + `jsPDF`
- Versioned PDFs in `pdf_versions` table (unique on inspection_id + version_number)
- `editable_fields` table defines which report fields support inline editing
- Approval locks PDF and triggers email with attachment

### Error Handling
- `apiClient.ts` wraps all Supabase mutations with error translation
- `ErrorBoundary` (Sentry-integrated) at app and page level
- Edge Functions use Zod validation + structured error responses
- Toast notifications for user-facing errors via `sonner`

---

## 14. Claude Code Configuration

### Agents (18 in `.claude/agents/`)

| Agent | Model | Purpose |
|-------|-------|---------|
| `manager` | opus | Orchestrates complex tasks, delegates to specialists, enforces quality gates |
| `planner-researcher` | opus | Comprehensive research and detailed implementation plans before coding |
| `frontend-builder` | sonnet | React component creation with mobile-first shadcn/ui and TypeScript |
| `backend-builder` | sonnet | Business logic: pricing calculations, validation, Australian formatting |
| `integration-specialist` | sonnet | Frontend-backend connection: save/load cycles, field mapping, error handling |
| `database-specialist` | sonnet | Schema design, migrations, RLS policies, indexes, constraints |
| `supabase-specialist` | sonnet | Comprehensive Supabase: schema, migrations, queries, type generation |
| `pricing-guardian` | sonnet | MANDATORY pre-deployment: 13% cap enforcement, GST, multi-day discounts |
| `deployment-captain` | sonnet | Final gatekeeper: 5 mandatory checks before production deploy |
| `documentation-agent` | sonnet | Git commits, CLAUDE.md updates, Memory MCP storage, TODO tracking |
| `frontend-designer` | — | UI/UX design systems, components, pages, distinctive styling |
| `code-reviewer` | — | Code quality: correctness, null handling, race conditions, error handling |
| `security-reviewer` | — | Security audit: injection, auth, XSS, path traversal, secrets |
| `performance-reviewer` | — | Performance: N+1 queries, memory leaks, bundle size, bottlenecks |
| `doc-reviewer` | — | Documentation accuracy, completeness, clarity |
| `playwright-tester` | haiku | UI testing: 375px/768px/1920px viewports, touch targets, screenshots |
| `testsprite-tester` | haiku | Unit testing: pricing functions, business logic, edge cases, 13% cap |
| `supabase-verifier` | haiku | DB verification: save/load, RLS policies, field mappings, data persistence |

### Skills (9 in `.claude/skills/`)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `debug-fix` | `/debug-fix [issue]` | Find and fix bugs systematically |
| `explain` | `/explain [code]` | Explain code functionality |
| `hotfix` | `/hotfix [issue]` | Emergency fix with minimal changes |
| `pr-review` | `/pr-review [PR#]` | Review PRs for quality, security, correctness |
| `refactor` | `/refactor [target]` | Safe refactoring with test coverage |
| `setupdotclaude` | `/setupdotclaude` | Initialize .claude directory structure |
| `ship` | `/ship [message]` | Commit, push, create PR with confirmations |
| `tdd` | `/tdd [feature]` | Test-Driven Development: Red/Green/Refactor |
| `test-writer` | `/test-writer` | Write comprehensive unit tests |

### Rules (11 files in `.claude/rules/`)

| Rule | Scope | Purpose |
|------|-------|---------|
| `code-quality.md` | Always | Single responsibility, naming conventions, no magic values, comments |
| `testing.md` | Always | Behavior testing, single file runs, fix flaky tests, AAA structure |
| `australian-compliance.md` | Always | 13% cap, $AUD, DD/MM/YYYY, Australia/Melbourne, phone formats |
| `frontend.md` | `**/*.tsx`, `**/components/**`, `**/pages/**` | Design tokens, mobile-first, 44px touch targets, a11y WCAG 2.1 AA |
| `security.md` | `src/api/**`, `src/auth/**`, `**/routes/**` | Input validation, parameterized queries, XSS, tokens, rate limiting |
| `auth-rules.md` | `src/auth/**`, `src/services/login*` | Supabase Auth tokens, sessions, two roles, route organization |
| `supabase-rules.md` | `supabase/**`, `src/lib/supabase*` | RLS on all tables, never modify migrations, Edge Function validation |
| `database.md` | `supabase/migrations/**` | Never modify existing migrations, reversible, timestamp-ordered |
| `pdf-rules.md` | `supabase/functions/generate-*`, `src/templates/**` | Professional templates, Australian formatting, MRC branding |
| `error-handling.md` | `supabase/functions/**`, `src/lib/api/**`, `src/hooks/**` | Typed errors, no swallowing, consistent responses, retry transient |
| `README.md` | — | Documentation of all rules with scope descriptions |

### Hooks (6 scripts in `.claude/hooks/`)

| Hook | Purpose |
|------|---------|
| `session-start.sh` | Displays git status on session start |
| `protect-files.sh` | Prevents modifications to protected files |
| `warn-large-files.sh` | Warns when files exceed size threshold |
| `block-dangerous-commands.sh` | Blocks destructive git/system commands |
| `scan-secrets.sh` | Scans for hardcoded secrets before commits |
| `format-on-save.sh` | Auto-formats code on file save |

---

## 15. MCP Servers

### Local (in `.mcp.json`)

| MCP | Package | Purpose |
|-----|---------|---------|
| Supabase | `@supabase/mcp-server-supabase` | DB operations, migrations, SQL, schema inspection |
| GitHub | `@modelcontextprotocol/server-github` | PRs, issues, code search |
| Context7 | `@upstash/context7-mcp` | Current library/framework documentation |
| Memory | `@modelcontextprotocol/server-memory` | Cross-session knowledge graph |
| Fetch | `@modelcontextprotocol/server-fetch` | HTTP requests, endpoint testing |
| Slack | Custom (`slack-mcp-server/`) | Read/send Slack messages |
| Resend | Custom (`mcp-send-email/`) | Send emails via Resend API |

### Remote (via Claude.ai)

Playwright, Sentry, Figma, PSD Parser, Ahrefs

---

## 16. Package Versions (from `package.json`)

### Core

| Package | Version |
|---------|---------|
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| typescript | ^5.8.3 |
| vite | ^5.4.19 |
| tailwindcss | ^3.4.17 |
| @supabase/supabase-js | ^2.76.1 |

### State & Routing

| Package | Version |
|---------|---------|
| @tanstack/react-query | ^5.83.0 |
| react-router-dom | ^6.30.1 |

### Forms & Validation

| Package | Version |
|---------|---------|
| react-hook-form | ^7.61.1 |
| @hookform/resolvers | ^3.10.0 |
| zod | ^3.25.76 |

### UI

| Package | Version |
|---------|---------|
| lucide-react | ^0.462.0 |
| class-variance-authority | ^0.7.1 |
| tailwind-merge | ^2.6.0 |
| sonner | ^1.7.4 |
| recharts | ^2.15.4 |
| cmdk | ^1.1.1 |
| vaul | ^0.9.9 |
| embla-carousel-react | ^8.6.0 |

### PDF & Documents

| Package | Version |
|---------|---------|
| jspdf | ^4.1.0 |
| html2canvas | ^1.4.1 |
| pdfjs-dist | ^5.4.449 |
| react-pdf | ^10.2.0 |

### Dates

| Package | Version |
|---------|---------|
| date-fns | ^3.6.0 |
| react-datepicker | ^8.8.0 |
| react-day-picker | ^8.10.1 |

### Offline & Security

| Package | Version |
|---------|---------|
| dexie | ^4.3.0 |
| dompurify | ^3.3.3 |
| @fingerprintjs/fingerprintjs | ^4.5.1 |

### Monitoring

| Package | Version |
|---------|---------|
| @sentry/react | ^10.42.0 |
| @sentry/vite-plugin | ^5.1.1 |

### Testing (devDependencies)

| Package | Version |
|---------|---------|
| vitest | ^3.2.4 |
| @vitest/ui | ^3.2.4 |
| @testing-library/react | ^16.3.2 |
| @testing-library/user-event | ^14.6.1 |
| jsdom | ^27.0.1 |
| puppeteer | ^24.29.1 |

### Build (devDependencies)

| Package | Version |
|---------|---------|
| @vitejs/plugin-react-swc | ^3.11.0 |
| vite-plugin-pwa | ^1.2.0 |
| autoprefixer | ^10.4.21 |
| postcss | ^8.5.6 |
| eslint | ^9.32.0 |

---

## 17. Git & Deployment

| Branch | Purpose | Vercel Target |
|--------|---------|---------------|
| `main` | Development | Preview deploys |
| `production` | Live app | Production deploys |

- Never push directly to `production` — always merge from `main`
- Working directory: `~/mrc-app-1`

### Commands
```bash
npm run dev            # local dev server
npm run build          # production build
npm run test           # run tests (vitest watch)
npm run test:run       # run tests once
npm run lint           # eslint
npx supabase functions deploy <name> --project-ref ecyivrxjpsmjmexqatym
```

---

## 18. Key File Reference (Quick Lookup)

| Need | File |
|------|------|
| Supabase client | `src/integrations/supabase/client.ts` |
| DB types (generated) | `src/integrations/supabase/types.ts` |
| Auth context + useAuth() | `src/contexts/AuthContext.tsx` |
| Route definitions | `src/App.tsx` |
| Pricing calculator | `src/lib/calculations/pricing.ts` |
| Lead status flow | `src/lib/statusFlow.ts` |
| Inspection form types | `src/types/inspection.ts` |
| Booking logic | `src/lib/bookingService.ts` |
| Offline DB schema | `src/lib/offline/db.ts` |
| Offline sync manager | `src/lib/offline/SyncManager.ts` |
| PDF generation API | `src/lib/api/pdfGeneration.ts` |
| Email/Slack helpers | `src/lib/api/notifications.ts` |
| API client wrapper | `src/lib/api/apiClient.ts` |
| Inspection schema (Zod) | `src/lib/schemas/inspectionSchema.ts` |
| Lead creation schema | `src/lib/validators/lead-creation.schemas.ts` |
| PDF HTML template | `src/templates/inspection-report-template.html` |
| Pricing spec (human) | `docs/COST_CALCULATION_SYSTEM.md` |
| DB audit (human) | `docs/database_technical_audit.md` |
| Phase 2 PRD | `docs/JOB_COMPLETION_PRD.md` |
| Phase 2 execution plan | `docs/PHASE_2_EXECUTION.md` |
| Phase 2 build order | `docs/JOB_COMPLETION_PLAN.md` |
| API audit + rotation | `docs/API_AUDIT.md` |
| Current TODOs | `docs/TODO.md` |
| Deployment guide | `docs/DEPLOYMENT.md` |
| MCP configuration | `docs/MCP_STACK.md` |

---

## 19. Known Technical Debt

From `docs/database_technical_audit.md` (Feb 2026 audit, score 68/100):

- `inspections` table has 95 columns with duplicate equipment fields
- `inspections` table missing `updated_at` trigger (misplaced on dropped `inspection_reports`)
- 2 duplicate `updated_at` triggers on `calendar_bookings`
- `activities` RLS too permissive (all authenticated see all activities)
- `calendar_bookings` RLS too permissive (all authenticated have full access)
- 8 duplicate indexes across various tables
- 9 functions missing `search_path` on `SECURITY DEFINER`
- 5 broken functions referencing renamed/missing tables (partially cleaned up)
- `TechnicianAlerts` uses mock data (needs real notifications integration)
- Avg Response Time KPI hardcoded "24 hrs" (needs `first_contact_at` field)
- Profile photo upload component exists but upload not implemented

---

*End of Project Context. This document is the single source of truth for another Claude instance working on this codebase.*

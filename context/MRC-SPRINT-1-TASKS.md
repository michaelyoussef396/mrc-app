# MRC Sprint 1 - Development Roadmap

**Version:** 1.0
**Sprint Duration:** 4 weeks
**Sprint Goal:** Demo-ready system from lead capture → inspection → customer self-booking
**Target Demo Date:** End of Week 4

---

## Table of Contents

1. [Sprint Overview](#sprint-overview)
2. [Week 1: Foundation & Database](#week-1-foundation--database)
3. [Week 2: Core Features](#week-2-core-features)
4. [Week 3: Automation & PDF](#week-3-automation--pdf)
5. [Week 4: Polish & Demo Prep](#week-4-polish--demo-prep)
6. [Task Priority Guide](#task-priority-guide)
7. [Testing Checklist](#testing-checklist)
8. [Demo Script](#demo-script)
9. [Risk Mitigation](#risk-mitigation)

---

## Sprint Overview

### Sprint 1 Scope (Production Demo-Ready)

**In Scope:**
- ✅ 12-stage Kanban pipeline (Stages 1-7)
- ✅ Lead management (create, edit, assign)
- ✅ Inspection form (100+ fields, auto-save, offline)
- ✅ AI summary generation (Claude API)
- ✅ PDF generation system (Puppeteer)
- ✅ Email automation (8 templates via Resend)
- ✅ Customer self-booking calendar
- ✅ Mobile-first UI with design system
- ✅ Authentication & authorization

**Out of Scope (Sprint 2):**
- ❌ Job completion tracking
- ❌ Invoice generation
- ❌ Payment processing
- ❌ Customer review system
- ❌ HiPages API integration
- ❌ Advanced reporting/analytics

### Success Metrics

1. **Technical:**
   - All P0 tasks completed
   - Zero critical bugs
   - Offline mode works 100%
   - Auto-save works 100%
   - Email delivery rate > 99%
   - PDF generation success rate > 99%
   - Mobile performance: Lighthouse score > 90

2. **Demo:**
   - 15-minute end-to-end demo works flawlessly
   - Owners can see complete workflow
   - Customer self-booking impresses
   - Professional PDF generated

---

## Week 1: Foundation & Database

**Theme:** Build the solid foundation

### Day 1-2: Supabase Setup & Database Schema

**Priority: P0 (Must Have)**

#### Task 1.1: Supabase Project Setup
- [ ] Create Supabase project (if not exists)
- [ ] Configure auth providers (email/password)
- [ ] Set up storage buckets (`inspection-pdfs`, `templates`)
- [ ] Configure CORS for local development
- [ ] Install Supabase CLI locally
- [ ] Link local project to Supabase

**Files:**
- `supabase/config.toml`

**Time:** 1 hour

---

#### Task 1.2: Database Migrations
- [ ] Create `leads` table migration
- [ ] Create `inspection_reports` table migration
- [ ] Create `calendar_bookings` table migration
- [ ] Create `email_logs` table migration
- [ ] Create `offline_queue` table migration
- [ ] Create `suburb_zones` table migration
- [ ] Create helper function `update_updated_at_column()`
- [ ] Add all indexes for performance
- [ ] Test migrations locally

**Files:**
- `supabase/migrations/20250111000001_create_leads.sql`
- `supabase/migrations/20250111000002_create_inspection_reports.sql`
- `supabase/migrations/20250111000003_create_calendar_bookings.sql`
- `supabase/migrations/20250111000004_create_email_logs.sql`
- `supabase/migrations/20250111000005_create_offline_queue.sql`
- `supabase/migrations/20250111000006_create_suburb_zones.sql`

**Time:** 4 hours

**Acceptance Criteria:**
- All tables exist in Supabase dashboard
- Indexes created successfully
- Foreign key constraints work
- Triggers fire on update

---

#### Task 1.3: Seed Suburb Zones Data
- [ ] Research all Melbourne suburbs and zones
- [ ] Create seed data SQL (200+ suburbs)
- [ ] Group by zones (1: CBD, 2: Inner, 3: Middle, 4: Outer)
- [ ] Run seed migration
- [ ] Verify data in Supabase

**Files:**
- `supabase/migrations/20250111000007_seed_suburb_zones.sql`

**Time:** 2 hours

**Acceptance Criteria:**
- All suburbs in zones 1-4
- Postcode ranges correct for VIC
- Can query suburb → zone mapping

---

#### Task 1.4: Row Level Security (RLS)
- [ ] Enable RLS on all tables
- [ ] Create policies for `leads` table
- [ ] Create policies for `inspection_reports` table
- [ ] Create policies for `calendar_bookings` table
- [ ] Create policies for `email_logs` table (admin only)
- [ ] Create policies for `offline_queue` table (user-specific)
- [ ] Test policies with different user roles

**Files:**
- `supabase/migrations/20250111000008_enable_rls.sql`

**Time:** 3 hours

**Acceptance Criteria:**
- Technicians can only see assigned leads
- Admins can see all data
- Users can only access own offline queue
- Policies tested with test users

---

### Day 3-4: TypeScript Types & Supabase Client

**Priority: P0**

#### Task 1.5: Generate Supabase Types
- [ ] Install Supabase CLI dev dependencies
- [ ] Run `supabase gen types typescript`
- [ ] Create `src/types/database.ts`
- [ ] Create custom types in `src/types/leads.ts`
- [ ] Create custom types in `src/types/inspections.ts`
- [ ] Create custom types in `src/types/calendar.ts`
- [ ] Create custom types in `src/types/offline.ts`

**Files:**
- `src/types/database.ts` (auto-generated)
- `src/types/leads.ts`
- `src/types/inspections.ts`
- `src/types/calendar.ts`
- `src/types/offline.ts`
- `src/types/auth.ts`

**Time:** 2 hours

**Acceptance Criteria:**
- TypeScript compilation succeeds
- All table columns typed correctly
- Custom enums match database constraints

---

#### Task 1.6: Supabase Client Configuration
- [ ] Create `src/lib/supabase.ts` with client setup
- [ ] Configure environment variables (`.env.local`)
- [ ] Add auth state listener
- [ ] Create React Query client (`src/lib/queryClient.ts`)
- [ ] Test connection to Supabase

**Files:**
- `src/lib/supabase.ts`
- `src/lib/queryClient.ts`
- `.env.local`

**Time:** 1 hour

**Acceptance Criteria:**
- Can connect to Supabase from frontend
- Environment variables load correctly
- Auth state persists on refresh

---

### Day 5: Utility Functions & Formatters

**Priority: P0**

#### Task 1.7: Australian Formatting Utilities
- [ ] Create `formatPhoneNumber()` in `leadUtils.ts`
- [ ] Create `formatABN()` in `formatters.ts`
- [ ] Create `validateABN()` with checksum logic
- [ ] Create `validatePostcode()` for VIC
- [ ] Create `formatDateAU()` (DD/MM/YYYY)
- [ ] Create `formatDateTimeAU()` (DD/MM/YYYY at HH:MM AM/PM)
- [ ] Create `formatCurrency()` using Intl.NumberFormat
- [ ] Write unit tests for all formatters

**Files:**
- `src/lib/utils/leadUtils.ts`
- `src/lib/utils/formatters.ts`
- `src/lib/utils/__tests__/formatters.test.ts`

**Time:** 3 hours

**Acceptance Criteria:**
- All formatters work with Australian formats
- ABN validation includes checksum
- Unit tests pass (100% coverage)

---

#### Task 1.8: Pricing Calculator
- [ ] Create `calculatePricing()` function
- [ ] Implement base rates for all work types
- [ ] Implement multi-day discount logic (7.5%, 13%)
- [ ] Implement equipment cost calculation
- [ ] Write comprehensive unit tests (10+ scenarios)
- [ ] Test edge cases (0 hours, 100 hours, etc.)

**Files:**
- `src/lib/utils/inspectionUtils.ts`
- `src/lib/utils/__tests__/inspectionUtils.test.ts`

**Time:** 4 hours

**Acceptance Criteria:**
- Pricing matches Excel spreadsheet examples
- All discount tiers apply correctly
- Equipment costs calculated accurately
- All tests pass

---

#### Task 1.9: Travel Time Calculator
- [ ] Create `TRAVEL_TIME_MATRIX` constant (4x4 zones)
- [ ] Create `calculateTravelTime()` function
- [ ] Create `getTravelTimeLabel()` helper
- [ ] Write unit tests

**Files:**
- `src/lib/utils/travelTime.ts`
- `src/lib/utils/__tests__/travelTime.test.ts`

**Time:** 1 hour

**Acceptance Criteria:**
- Zone 1→4 returns 60 minutes
- Zone 1→1 returns 15 minutes
- Labels match expectations

---

### Week 1 Deliverables

- ✅ Supabase project fully configured
- ✅ All database tables created with RLS
- ✅ 200+ suburbs seeded with zones
- ✅ TypeScript types generated
- ✅ All utility functions working
- ✅ Pricing calculator tested
- ✅ Travel time matrix implemented

---

## Week 2: Core Features

**Theme:** Build the main user workflows

### Day 6-7: Authentication & User Management

**Priority: P0**

#### Task 2.1: Authentication System
- [ ] Create login page (`src/pages/Login.tsx`)
- [ ] Create signup page (admin only - disabled in UI)
- [ ] Implement auth context (`src/contexts/AuthContext.tsx`)
- [ ] Create protected route wrapper
- [ ] Add logout functionality
- [ ] Store user role in JWT claims
- [ ] Test login/logout flow

**Files:**
- `src/pages/Login.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`

**Time:** 4 hours

**Acceptance Criteria:**
- Users can log in with email/password
- Auth state persists on refresh
- Protected routes redirect to login
- User role accessible in JWT

---

#### Task 2.2: Create Test Users
- [ ] Create Clayton (technician) user in Supabase
- [ ] Create Glen (technician) user in Supabase
- [ ] Create Admin user
- [ ] Set user roles in `raw_user_meta_data`
- [ ] Test RLS with each user

**Time:** 30 minutes

**Acceptance Criteria:**
- All 3 users can log in
- Technicians see only assigned leads
- Admin sees all leads

---

### Day 8-10: Dashboard & Kanban Board

**Priority: P0**

#### Task 2.3: Dashboard Layout
- [ ] Create `src/pages/Dashboard.tsx`
- [ ] Implement responsive layout (mobile-first)
- [ ] Add mobile bottom navigation
- [ ] Fix bottom nav active state bug (use `useLocation()`)
- [ ] Add stats overview section
- [ ] Add filters (assigned to me, all leads, by status)
- [ ] Implement real-time subscription to leads

**Files:**
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/MobileBottomNav.tsx` (fix existing)
- `src/components/dashboard/StatsOverview.tsx`

**Time:** 6 hours

**Acceptance Criteria:**
- Mobile-first layout works on iPhone SE
- Bottom nav active state works correctly
- Real-time updates when leads change
- Stats calculate correctly

---

#### Task 2.4: Kanban Board Component
- [ ] Create `KanbanBoard.tsx` with 12 columns
- [ ] Implement drag-and-drop with `@dnd-kit/core`
- [ ] Create `LeadCard.tsx` component
- [ ] Show lead number, customer name, property
- [ ] Add urgency indicators (emergency = red)
- [ ] Implement status update on drop
- [ ] Add optimistic updates
- [ ] Show loading states

**Files:**
- `src/components/dashboard/KanbanBoard.tsx`
- `src/components/dashboard/LeadCard.tsx`
- `src/lib/hooks/useLeads.ts`
- `src/lib/api/leads.ts`

**Time:** 8 hours

**Acceptance Criteria:**
- Can drag leads between columns
- Status updates in database
- Optimistic UI updates instantly
- Works smoothly on mobile
- Touch targets ≥48px

---

#### Task 2.5: Lead Creation Dialog
- [ ] Fix existing `AddLeadDialog.tsx`
- [ ] Add all required fields (source, urgency, etc.)
- [ ] Implement form validation with Zod
- [ ] Add suburb → zone lookup
- [ ] Auto-format phone number on blur
- [ ] Show validation errors
- [ ] Test lead creation flow

**Files:**
- `src/components/leads/AddLeadDialog.tsx` (update existing)
- `src/lib/validators.ts`

**Time:** 4 hours

**Acceptance Criteria:**
- Form validates all fields
- Phone auto-formats to 04XX XXX XXX
- Suburb lookup finds zone
- Lead appears in dashboard immediately

---

### Day 11-12: Inspection Form

**Priority: P0**

#### Task 2.6: Inspection Form Structure
- [ ] Create `src/pages/InspectionForm.tsx`
- [ ] Implement 10 collapsible sections
- [ ] Add form state management (React Hook Form)
- [ ] Create `PropertyDetails.tsx` section
- [ ] Create `DemolitionSection.tsx`
- [ ] Create `ConstructionSection.tsx`
- [ ] Create `SubfloorSection.tsx`
- [ ] Create `EquipmentSection.tsx`
- [ ] Create `PricingSection.tsx` (read-only calculated)
- [ ] Add photo upload with compression
- [ ] Show character counts for text areas

**Files:**
- `src/pages/InspectionForm.tsx`
- `src/components/inspection/PropertyDetails.tsx`
- `src/components/inspection/DemolitionSection.tsx`
- `src/components/inspection/ConstructionSection.tsx`
- `src/components/inspection/SubfloorSection.tsx`
- `src/components/inspection/EquipmentSection.tsx`
- `src/components/inspection/PricingSection.tsx`
- `src/components/inspection/PhotoUpload.tsx`

**Time:** 12 hours

**Acceptance Criteria:**
- All 100+ fields accessible
- Sections collapse/expand
- Pricing auto-calculates
- Photo upload compresses to <1MB
- Form validates on submit

---

#### Task 2.7: Auto-Save Implementation
- [ ] Create `useAutoSave` hook
- [ ] Create `useDebounce` hook
- [ ] Save to localStorage every 30 seconds
- [ ] Save to Supabase when online
- [ ] Show "Last saved: X minutes ago"
- [ ] Show "Saving..." indicator
- [ ] Recover draft from localStorage on mount

**Files:**
- `src/lib/hooks/useAutoSave.ts`
- `src/lib/hooks/useDebounce.ts`

**Time:** 4 hours

**Acceptance Criteria:**
- Auto-saves every 30 seconds
- Shows "Last saved" timestamp
- Draft recovers after browser refresh
- Works offline (localStorage only)

---

#### Task 2.8: Offline Mode
- [ ] Create `useOnlineStatus` hook
- [ ] Create `OfflineIndicator` component
- [ ] Queue mutations in `offline_queue` localStorage
- [ ] Sync queue when back online
- [ ] Show offline banner at bottom
- [ ] Test airplane mode scenario

**Files:**
- `src/lib/hooks/useOffline.ts`
- `src/components/OfflineIndicator.tsx`
- `src/lib/api/offline.ts`

**Time:** 4 hours

**Acceptance Criteria:**
- Detects offline/online status
- Shows offline banner
- Queues changes while offline
- Syncs on reconnect
- No data loss in offline mode

---

### Week 2 Deliverables

- ✅ Authentication working (login/logout)
- ✅ Dashboard with Kanban board
- ✅ Drag-and-drop lead status updates
- ✅ Lead creation dialog
- ✅ Inspection form (100+ fields)
- ✅ Auto-save every 30 seconds
- ✅ Offline mode working

---

## Week 3: Automation & PDF

**Theme:** Make it intelligent and automated

### Day 13-14: AI Summary Generation

**Priority: P0**

#### Task 3.1: Claude API Integration
- [ ] Sign up for Claude API (Anthropic)
- [ ] Get API key
- [ ] Create Supabase Edge Function: `generate-ai-summary`
- [ ] Install Anthropic SDK in Edge Function
- [ ] Write prompt template
- [ ] Test with sample inspection data
- [ ] Handle API errors gracefully

**Files:**
- `supabase/functions/generate-ai-summary/index.ts`
- `supabase/functions/generate-ai-summary/deno.json`

**Time:** 4 hours

**Acceptance Criteria:**
- Edge Function deploys successfully
- Returns 2-3 paragraph summary
- Language is professional but accessible
- Handles missing data gracefully

---

#### Task 3.2: AI Summary UI
- [ ] Create "Generate AI Summary" button
- [ ] Show loading state (spinning icon)
- [ ] Display summary in text area (editable)
- [ ] Add "Regenerate" button
- [ ] Show character count
- [ ] Save summary to database

**Files:**
- `src/components/inspection/AISummaryButton.tsx`

**Time:** 2 hours

**Acceptance Criteria:**
- Button triggers Edge Function
- Loading state shows while generating
- Summary appears in editable field
- Can regenerate multiple times

---

### Day 15-17: PDF Generation System

**Priority: P0**

#### Task 3.3: PDF Template Creation
- [ ] Create HTML template based on user's provided template
- [ ] Add MRC branding (logo, colors)
- [ ] Create print-friendly CSS styles
- [ ] Add page breaks for multi-page reports
- [ ] Test template with sample data
- [ ] Add photo grid layout
- [ ] Upload template to Supabase Storage

**Files:**
- `supabase/functions/generate-inspection-pdf/templates/inspection-report.html`

**Time:** 6 hours

**Acceptance Criteria:**
- Template matches user's design
- Prints correctly on A4 paper
- Photos display in grid
- All sections included

---

#### Task 3.4: Puppeteer PDF Generation
- [ ] Create Edge Function: `generate-inspection-pdf`
- [ ] Install Puppeteer in Deno
- [ ] Load HTML template
- [ ] Replace template variables with data
- [ ] Generate PDF with Puppeteer
- [ ] Upload to Supabase Storage (`draft/`)
- [ ] Return public URL
- [ ] Handle errors (timeout, memory)

**Files:**
- `supabase/functions/generate-inspection-pdf/index.ts`
- `supabase/functions/generate-inspection-pdf/deno.json`

**Time:** 8 hours

**Acceptance Criteria:**
- PDF generates in <10 seconds
- All data populates correctly
- Photos display properly
- Uploads to `draft/` folder
- Returns public URL

---

#### Task 3.5: PDF Preview & Approval UI
- [ ] Create `PDFPreview.tsx` component
- [ ] Embed PDF viewer (iframe)
- [ ] Add "Regenerate PDF" button
- [ ] Add "Edit Template" note (manual for now)
- [ ] Add "Approve & Send" button
- [ ] Copy from `draft/` to `approved/` on approval
- [ ] Update lead status to "awaiting_job_approval"
- [ ] Show version history

**Files:**
- `src/components/inspection/PDFPreview.tsx`

**Time:** 4 hours

**Acceptance Criteria:**
- PDF previews in browser
- Regenerate creates new version
- Approve moves to `approved/` folder
- Lead status updates automatically

---

### Day 18-19: Email Automation

**Priority: P0**

#### Task 3.6: Resend API Setup
- [ ] Sign up for Resend account
- [ ] Add domain: mouldandrestoration.com.au
- [ ] Configure DNS records (SPF, DKIM, DMARC)
- [ ] Verify domain
- [ ] Get API key
- [ ] Test email delivery
- [ ] Check spam score

**Time:** 2 hours

**Acceptance Criteria:**
- Domain verified in Resend
- DNS records correct
- Test email delivered (not spam)

---

#### Task 3.7: Email Templates
- [ ] Create `new-lead-response.html` template
- [ ] Create `inspection-confirmation.html` template
- [ ] Create `inspection-reminder.html` template
- [ ] Create `inspection-report.html` template
- [ ] Create `job-follow-up-1.html` template
- [ ] Create `job-follow-up-2.html` template
- [ ] Create `job-confirmation.html` template
- [ ] Create `job-reminder.html` template
- [ ] Upload all templates to Supabase Storage

**Files:**
- `public/email-templates/*.html` (8 templates)

**Time:** 6 hours

**Acceptance Criteria:**
- All templates match brand style
- Responsive design (mobile-friendly)
- Variables use {{mustache}} syntax
- Links work correctly

---

#### Task 3.8: Send Email Edge Function
- [ ] Create Edge Function: `send-email`
- [ ] Install Resend SDK
- [ ] Load template from Storage
- [ ] Replace template variables
- [ ] Send email via Resend API
- [ ] Log to `email_logs` table
- [ ] Handle attachments (PDF)
- [ ] Retry logic for failures

**Files:**
- `supabase/functions/send-email/index.ts`

**Time:** 4 hours

**Acceptance Criteria:**
- Emails send successfully
- PDFs attach correctly
- Logs created in database
- Retry on failure

---

#### Task 3.9: Email Triggers
- [ ] Trigger email on lead creation (new_lead_response)
- [ ] Trigger email on inspection booking (inspection_confirmation)
- [ ] Schedule reminder 24h before inspection
- [ ] Trigger email on PDF approval (inspection_report)
- [ ] Schedule follow-up emails (3 days, 7 days)
- [ ] Trigger email on job booking (job_confirmation)

**Files:**
- `src/lib/api/leads.ts` (update)
- `supabase/functions/_shared/emailTriggers.ts`

**Time:** 4 hours

**Acceptance Criteria:**
- All 8 email types send at correct times
- Attachments work for inspection report
- No duplicate emails

---

### Week 3 Deliverables

- ✅ AI summary generation working
- ✅ PDF generation from HTML template
- ✅ PDF preview and approval flow
- ✅ Email domain verified (no spam)
- ✅ 8 email templates created
- ✅ Email automation triggers working

---

## Week 4: Polish & Demo Prep

**Theme:** Make it beautiful and demo-ready

### Day 20-21: Customer Self-Booking Calendar

**Priority: P0**

#### Task 4.1: Calendar Availability API
- [ ] Implement `getAvailableSlots()` function
- [ ] Fetch existing bookings for technician
- [ ] Calculate travel time from previous booking
- [ ] Filter out unavailable slots
- [ ] Return 30-minute intervals (7am-5pm)
- [ ] Test with various scenarios

**Files:**
- `src/lib/api/calendar.ts`

**Time:** 6 hours

**Acceptance Criteria:**
- Returns only available slots
- Travel time prevents impossible bookings
- No overlapping bookings
- Works for multi-day jobs

---

#### Task 4.2: Customer Booking UI
- [ ] Create `CustomerBooking.tsx` page (public)
- [ ] Add date picker calendar
- [ ] Show available time slots
- [ ] Show travel time indicator
- [ ] Implement slot selection
- [ ] Add confirmation step
- [ ] Send confirmation email
- [ ] Update lead status

**Files:**
- `src/pages/CustomerBooking.tsx`
- `src/components/calendar/AvailabilityCalendar.tsx`
- `src/components/calendar/TimeSlotPicker.tsx`

**Time:** 8 hours

**Acceptance Criteria:**
- Customers can view available slots
- Travel time shows for each slot
- Booking confirmation works
- Email sent on booking
- Lead status updates to "job_booked"

---

### Day 22-23: Mobile UI Polish

**Priority: P1 (Should Have)**

#### Task 4.3: Design System Fixes
- [ ] Fix hardcoded colors in Dashboard.tsx
- [ ] Replace with CSS variables
- [ ] Standardize button heights to 48px minimum
- [ ] Fix touch targets across all forms
- [ ] Add loading skeletons
- [ ] Improve error states
- [ ] Add empty states

**Files:**
- `src/pages/Dashboard.tsx` (remove hardcoded bg-blue-900)
- `src/components/ui/button.tsx` (update heights)
- `src/components/LoadingSkeleton.tsx`
- `src/components/EmptyState.tsx`

**Time:** 6 hours

**Acceptance Criteria:**
- No hardcoded colors (use design tokens)
- All touch targets ≥48px
- Loading states consistent
- Professional empty states

---

#### Task 4.4: Mobile Testing & Fixes
- [ ] Test on iPhone SE (375px width)
- [ ] Test on iPad (768px width)
- [ ] Test on Android Chrome
- [ ] Fix any layout issues
- [ ] Test offline mode on mobile
- [ ] Test camera upload on mobile
- [ ] Run Lighthouse audit (target >90)

**Time:** 4 hours

**Acceptance Criteria:**
- Works on iPhone SE
- Works on Android Chrome
- Lighthouse score >90
- No horizontal scroll

---

### Day 24-25: Testing & Bug Fixes

**Priority: P0**

#### Task 4.5: Unit Tests
- [ ] Write tests for pricing calculator (10+ cases)
- [ ] Write tests for formatters (phone, ABN, currency)
- [ ] Write tests for travel time logic
- [ ] Write tests for validators
- [ ] Achieve >80% coverage on utils
- [ ] All tests pass

**Files:**
- `src/lib/utils/__tests__/*.test.ts`

**Time:** 6 hours

**Acceptance Criteria:**
- All unit tests pass
- Coverage >80% on utility functions

---

#### Task 4.6: Integration Tests
- [ ] Write E2E test: Create lead → inspection → PDF
- [ ] Write E2E test: Offline mode + sync
- [ ] Write E2E test: Customer booking flow
- [ ] Write E2E test: Email delivery
- [ ] All E2E tests pass in CI

**Files:**
- `tests/e2e/lead-workflow.spec.ts`
- `tests/e2e/offline-mode.spec.ts`
- `tests/e2e/customer-booking.spec.ts`

**Time:** 8 hours

**Acceptance Criteria:**
- All E2E tests pass
- Can run in CI/CD pipeline

---

#### Task 4.7: Bug Bash & Fixes
- [ ] Manual testing of entire workflow
- [ ] Create bug list
- [ ] Fix all P0 (critical) bugs
- [ ] Fix all P1 (high) bugs
- [ ] Triage P2 (medium) bugs for Sprint 2
- [ ] Retest after fixes

**Time:** 8 hours

**Acceptance Criteria:**
- Zero P0 bugs remaining
- All P1 bugs fixed
- App stable for demo

---

### Day 26: Demo Preparation

**Priority: P0**

#### Task 4.8: Demo Data Setup
- [ ] Create 5 sample leads in different stages
- [ ] Create 2 completed inspection reports
- [ ] Create 1 draft inspection in progress
- [ ] Seed calendar with realistic bookings
- [ ] Clear out test email logs
- [ ] Prepare demo script

**Time:** 3 hours

**Acceptance Criteria:**
- Demo data looks realistic
- All pipeline stages have leads
- Demo script finalized

---

#### Task 4.9: Demo Rehearsal
- [ ] Run through complete demo (15 minutes)
- [ ] Time each section
- [ ] Prepare backup plan (if live demo fails)
- [ ] Record screen recording as backup
- [ ] Prepare Q&A answers

**Time:** 2 hours

**Acceptance Criteria:**
- Demo runs smoothly in <15 minutes
- Backup recording ready
- Confident in all features

---

#### Task 4.10: Deployment
- [ ] Deploy database migrations to production
- [ ] Deploy Edge Functions to production
- [ ] Deploy frontend to Vercel
- [ ] Configure production environment variables
- [ ] Test production deployment
- [ ] Verify DNS records
- [ ] Verify SSL certificates
- [ ] Run smoke tests on production

**Files:**
- Vercel deployment
- Supabase production

**Time:** 4 hours

**Acceptance Criteria:**
- Production site live at app.mouldandrestoration.com.au
- All features work in production
- Email delivery works from production
- PDF generation works in production

---

### Week 4 Deliverables

- ✅ Customer self-booking calendar working
- ✅ Mobile UI polished (design system fixes)
- ✅ All unit tests passing
- ✅ All E2E tests passing
- ✅ Zero critical bugs
- ✅ Demo data prepared
- ✅ Production deployment successful
- ✅ Ready for owner demo

---

## Task Priority Guide

### P0: Must Have (Critical)
**Definition:** Feature must work for demo. App is broken without it.

- Database schema & migrations
- Authentication
- Lead creation & Kanban board
- Inspection form with auto-save
- Offline mode
- AI summary generation
- PDF generation & approval
- Email automation
- Customer self-booking calendar
- Mobile-first UI

**Total P0 Tasks:** 45

---

### P1: Should Have (High Priority)
**Definition:** Significantly improves UX but app works without it.

- Design system fixes (hardcoded colors)
- Loading skeletons
- Empty states
- Advanced error handling
- Email retry logic
- PDF version history
- Calendar multi-day validation

**Total P1 Tasks:** 12

---

### P2: Nice to Have (Medium Priority)
**Definition:** Polish items that can wait for Sprint 2.

- Advanced filtering (by technician, date range)
- Export to CSV
- Bulk email send
- Customer notifications (SMS)
- Advanced analytics dashboard
- Dark mode
- Keyboard shortcuts

**Total P2 Tasks:** 0 (all deferred to Sprint 2)

---

## Testing Checklist

### Manual Testing Checklist

**Authentication:**
- [ ] Can log in as Clayton (technician)
- [ ] Can log in as Glen (technician)
- [ ] Can log in as Admin
- [ ] Logout works
- [ ] Auth persists on refresh
- [ ] Protected routes redirect to login

**Lead Management:**
- [ ] Can create new lead
- [ ] Phone auto-formats correctly
- [ ] Suburb lookup finds zone
- [ ] Lead appears in dashboard
- [ ] Can drag lead to different stage
- [ ] Lead status updates in database
- [ ] Email sent on lead creation

**Inspection Form:**
- [ ] All 100+ fields accessible
- [ ] Sections collapse/expand
- [ ] Pricing auto-calculates
- [ ] Photo upload works
- [ ] Auto-save fires every 30 seconds
- [ ] "Last saved" timestamp updates
- [ ] Draft recovers after refresh
- [ ] Offline mode saves to localStorage

**AI & PDF:**
- [ ] Generate AI Summary button works
- [ ] Summary is relevant and professional
- [ ] Can regenerate summary
- [ ] Generate PDF button works
- [ ] PDF preview displays
- [ ] All data populates in PDF
- [ ] Photos display in PDF
- [ ] Approve PDF moves to approved/ folder
- [ ] Email sent with PDF attachment

**Email Automation:**
- [ ] New lead email sent
- [ ] Inspection confirmation sent
- [ ] Inspection report sent with PDF
- [ ] Emails not in spam folder
- [ ] All links work
- [ ] Unsubscribe link works

**Customer Booking:**
- [ ] Calendar shows available slots
- [ ] Travel time indicator shows
- [ ] Can select slot and book
- [ ] Confirmation email sent
- [ ] Lead status updates to "job_booked"
- [ ] Impossible slots filtered out (travel time)

**Mobile:**
- [ ] Works on iPhone SE (375px)
- [ ] Works on Android Chrome
- [ ] Touch targets ≥48px
- [ ] Bottom nav active state correct
- [ ] No horizontal scroll
- [ ] Camera upload works

**Offline Mode:**
- [ ] Detects offline status
- [ ] Shows offline banner
- [ ] Forms still work offline
- [ ] Changes queued in localStorage
- [ ] Syncs when back online
- [ ] No data loss

---

### Automated Testing Checklist

**Unit Tests:**
- [ ] `formatPhoneNumber()` tests pass
- [ ] `formatABN()` tests pass
- [ ] `validateABN()` tests pass
- [ ] `validatePostcode()` tests pass
- [ ] `calculatePricing()` tests pass (10+ scenarios)
- [ ] `calculateTravelTime()` tests pass
- [ ] Coverage >80% on utils

**Integration Tests (E2E):**
- [ ] Lead creation flow test passes
- [ ] Inspection form test passes
- [ ] Offline sync test passes
- [ ] Customer booking test passes
- [ ] Email delivery test passes

**Performance Tests:**
- [ ] Lighthouse score >90 (mobile)
- [ ] Lighthouse score >95 (desktop)
- [ ] Time to Interactive <3s
- [ ] First Contentful Paint <1.5s
- [ ] PDF generation <10s

---

## Demo Script

**Duration:** 15 minutes
**Audience:** MRC Owners (Clayton's bosses)
**Goal:** Show complete workflow, impress with automation

### Demo Flow

**1. Introduction (1 minute)**
> "Today I'm showing you the complete MRC Lead Management System. This takes a lead from first contact all the way to customer booking. Everything you'll see is production-ready and mobile-first for Clayton and Glen in the field."

---

**2. Lead Capture (2 minutes)**

**Action:**
- Open dashboard on desktop
- Click "New Lead"
- Fill in customer details:
  - Name: "Sarah Thompson"
  - Email: "sarah@example.com"
  - Phone: "0412 345 678" (auto-formats)
  - Address: "45 Smith Street, Richmond VIC 3121"
  - Suburb: "Richmond" (auto-finds Zone 1)
  - Urgency: "Urgent"
  - Issue: "Mould in bathroom after leak"
- Submit

**Result:**
- Lead appears instantly in "New Lead" column
- Email sent to customer (show in email logs)

> "Notice how the phone auto-formatted, the zone was calculated automatically, and Sarah received a professional email within seconds of submitting the form."

---

**3. Inspection Booking (2 minutes)**

**Action:**
- Drag lead to "Inspection Booked"
- Click on lead card
- Schedule inspection:
  - Date: Tomorrow at 10am
  - Technician: Clayton
  - Duration: 2 hours

**Result:**
- Inspection confirmation email sent
- Calendar shows booking

> "Sarah just received a confirmation email with all the details. The system also scheduled a reminder 24 hours before the inspection."

---

**4. Inspection Form - Mobile Demo (3 minutes)**

**Action:**
- Switch to mobile view (iPhone)
- Open inspection form
- Show form sections:
  - Property details already filled
  - Toggle "Demolition Required"
  - Enter: "Remove water-damaged drywall in bathroom"
  - Upload 2 photos
  - Toggle equipment: 2 dehumidifiers, 3 air movers
  - Set duration: 8 hours

**Result:**
- Pricing auto-calculates ($1,507.95 ex GST)
- Shows "Last saved: 10 seconds ago"

> "Notice Clayton can work completely offline in a basement with no signal. The form auto-saves every 30 seconds to prevent data loss. He can take photos, and everything syncs when he's back online."

**Action:**
- Enable airplane mode
- Add more notes
- Show "Offline" banner
- Disable airplane mode
- Show "Synced" message

> "The offline mode is bulletproof. No data loss, ever."

---

**5. AI Summary & PDF Generation (3 minutes)**

**Action:**
- Click "Generate AI Summary"
- Show loading spinner
- AI summary appears:

> "Our inspection revealed water damage affecting the bathroom area, with elevated moisture readings indicating active mould growth. The required remediation work includes controlled demolition of affected drywall, professional mould treatment, and structural drying using industrial dehumidifiers and air movers. This is a straightforward remediation that will restore your property to a safe, healthy condition."

**Action:**
- Click "Generate PDF Report"
- PDF preview appears
- Scroll through PDF showing:
  - Professional MRC branding
  - All inspection data
  - AI summary
  - Photos in grid
  - Equipment breakdown
  - Pricing table with GST
- Click "Approve & Send"

**Result:**
- PDF saved to approved folder
- Email sent to customer with PDF attachment
- Lead moved to "Awaiting Job Approval"

> "Within minutes of completing the inspection, Sarah receives a beautiful, professional PDF report. This used to take hours of manual work. Now it's automated."

---

**6. Customer Self-Booking (3 minutes)**

**Action:**
- Open customer booking page (as Sarah)
- Show calendar with available dates
- Select tomorrow
- Show available time slots
- Hover over 2pm slot
- Show "Travel time from previous job: 30 minutes" warning
- Select 3pm slot instead
- Click "Book Appointment"
- Confirmation screen appears

**Result:**
- Booking created in calendar
- Lead moved to "Job Booked"
- Confirmation email sent to Sarah
- Job appears in Clayton's schedule

> "The calendar is intelligent. It prevents impossible bookings by calculating travel time between jobs. If Clayton finishes in Frankston at 2pm, he can't start in Carlton at 2:30pm. The system knows it takes 45 minutes to drive between those zones."

**Action:**
- Show Clayton's calendar
- Highlight:
  - Morning job in Zone 3 (Frankston)
  - Afternoon job in Zone 1 (Carlton) starting 4pm
  - Travel time buffer visible

> "Everything is connected. Clayton sees his full schedule, customers can self-book, and the system prevents scheduling conflicts."

---

**7. Pipeline Overview (1 minute)**

**Action:**
- Show dashboard with all 12 stages
- Point out leads in different stages:
  - "HiPages Lead" (1 lead)
  - "New Lead" (3 leads)
  - "Inspection Booked" (2 leads)
  - "Awaiting Job Approval" (4 leads)
  - "Job Booked" (1 lead)

> "At a glance, you can see exactly where every job is in the pipeline. Drag and drop to update status. Everything is real-time."

---

**8. Conclusion & Next Steps (1 minute)**

> "This is Sprint 1 - everything from lead capture through customer booking. Sprint 2 will add job completion tracking, invoice generation, payment processing, and customer review requests. But what you're seeing now is production-ready and can start saving you hours of admin work immediately.

Questions?"

---

## Risk Mitigation

### High-Risk Areas

#### 1. PDF Generation Performance
**Risk:** Puppeteer might be too slow or run out of memory.

**Mitigation:**
- Set timeout to 30 seconds
- Optimize images before PDF generation
- Add fallback: Generate simple PDF without photos
- Monitor Edge Function memory usage

**Backup Plan:**
- Use browser's Print to PDF (manual)
- Pre-generate PDF templates offline

---

#### 2. Email Deliverability (Spam)
**Risk:** Emails go to spam folder despite DNS setup.

**Mitigation:**
- Verify all DNS records (SPF, DKIM, DMARC)
- Use Resend's deliverability tools
- Test with mail-tester.com (aim for 10/10)
- Warm up domain (send to real addresses first)
- Ask recipients to whitelist sender

**Backup Plan:**
- Use Gmail SMTP as fallback
- Manually send first few emails

---

#### 3. Offline Sync Conflicts
**Risk:** Offline changes conflict with server data.

**Mitigation:**
- Timestamp all changes
- Use "last write wins" strategy for Sprint 1
- Show conflict warnings to users
- Log all conflicts for review

**Backup Plan:**
- Manual conflict resolution by admin

---

#### 4. Mobile Performance
**Risk:** Forms too slow on older phones.

**Mitigation:**
- Lazy load form sections
- Debounce auto-save
- Compress images before upload
- Test on iPhone SE (oldest supported device)

**Backup Plan:**
- Desktop-only version if mobile fails

---

#### 5. Demo Day Technical Issues
**Risk:** Live demo fails due to internet, server issues.

**Mitigation:**
- Pre-record video walkthrough
- Test on venue WiFi beforehand
- Have mobile hotspot backup
- Use local dev environment if needed

**Backup Plan:**
- Show pre-recorded video
- Use screenshots + slides

---

## Sprint 1 Success Criteria

### Technical Criteria

- [ ] All P0 tasks completed
- [ ] All P1 tasks completed or triaged
- [ ] Zero critical bugs
- [ ] Unit test coverage >80% on utils
- [ ] All E2E tests passing
- [ ] Lighthouse score >90 (mobile)
- [ ] Works on iPhone SE, Android Chrome
- [ ] Offline mode tested and working
- [ ] Auto-save tested and working
- [ ] Email delivery rate >99%
- [ ] PDF generation success rate >99%
- [ ] Production deployed successfully
- [ ] DNS configured correctly
- [ ] SSL certificates valid

---

### Feature Criteria

**Must Work Flawlessly:**
- [ ] Lead creation from website form
- [ ] 12-stage Kanban pipeline with drag-and-drop
- [ ] Lead status updates
- [ ] Inspection form (100+ fields)
- [ ] Auto-save every 30 seconds
- [ ] Offline mode with localStorage
- [ ] AI-generated summary (Claude API)
- [ ] PDF generation from HTML
- [ ] PDF preview, regenerate, approve
- [ ] Email automation (8 templates)
- [ ] Email delivery (not spam)
- [ ] Customer self-booking calendar
- [ ] Travel time validation
- [ ] Pricing calculator
- [ ] Australian formatting (phone, ABN, currency, dates)
- [ ] Mobile-first responsive design
- [ ] Authentication & authorization

---

### Demo Criteria

- [ ] 15-minute demo runs smoothly
- [ ] All features shown work perfectly
- [ ] Backup video recorded
- [ ] Owners impressed with automation
- [ ] Customer self-booking impresses
- [ ] Professional PDF generated
- [ ] No bugs during demo
- [ ] Q&A answers prepared

---

## Post-Sprint 1 Retrospective

**Questions to Answer:**
1. What went well?
2. What could be improved?
3. What should we do differently in Sprint 2?
4. What technical debt do we need to address?
5. What features were cut and why?

**Action Items:**
- Document learnings
- Update roadmap for Sprint 2
- Prioritize P2 features
- Address any security concerns
- Plan for scaling (if needed)

---

## Sprint 2 Preview

**Out of Scope for Sprint 1 (Coming in Sprint 2):**

1. **Job Completion Workflow**
   - Mark job as completed
   - Upload before/after photos
   - Technician sign-off

2. **Invoice Generation**
   - Auto-generate invoice from job data
   - Add additional charges
   - Apply discounts
   - Send invoice to customer

3. **Payment Processing**
   - Track payment received
   - Payment reminders
   - Overdue invoice handling
   - Payment methods (bank transfer, card)

4. **Customer Reviews**
   - Request review after payment
   - Google/Facebook review links
   - Review tracking

5. **HiPages API Integration**
   - Auto-import HiPages leads
   - Sync lead status
   - Response time tracking

6. **Advanced Reporting**
   - Revenue reports
   - Technician performance
   - Lead conversion rates
   - Equipment utilization

7. **Technician Mobile App (PWA)**
   - Install on home screen
   - Push notifications
   - GPS tracking
   - QR code scanning

---

**Sprint 1 End Date:** End of Week 4
**Sprint 2 Planning:** Week 5
**Sprint 2 Kickoff:** Week 6

---

## Quick Reference: Key Dates

| Milestone | Date | Deliverable |
|-----------|------|-------------|
| Sprint Start | Week 1, Day 1 | Database setup complete |
| Week 1 End | Week 1, Day 5 | Foundation complete |
| Week 2 End | Week 2, Day 12 | Core features complete |
| Week 3 End | Week 3, Day 19 | Automation complete |
| Feature Freeze | Week 4, Day 23 | No new features |
| Testing Complete | Week 4, Day 25 | All tests pass |
| Deployment | Week 4, Day 26 | Production live |
| Demo Day | Week 4, Day 26 | Owner demo |

---

**Document End**

This sprint roadmap provides week-by-week, day-by-day tasks to build a production-ready MRC Lead Management System in 4 weeks. All tasks are prioritized (P0, P1, P2) and include acceptance criteria, time estimates, and file references.

Ready to build? Let's make it happen! 🚀

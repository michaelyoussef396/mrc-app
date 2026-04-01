> **ARCHIVED:** This file is kept for historical reference. The active task list
> is now in `context/TODO.md`. Architecture and deployment status is in
> `context/PLANNING.md`. Session history is in `context/WORKFLOW.md`.
>
> Last active: 2026-02-17. Superseded: 2026-04-01.

---

# MRC Lead Management System - Master TODO

**Last Updated:** 2026-02-17 (Phase 1 Completion Audit - ~95% Complete)
**Current Focus:** Phase 1 - Final polish before team access

---

## Current Focus: Phase 1 - Technician Role

**Status:** ✅ COMPLETE - All Stage 1 blockers resolved, E2E flow verified

**What's Built:**
- ✅ TechnicianDashboard (wired to real Supabase data)
- ✅ TechnicianJobs page (needs mobile fixes)
- ✅ TechnicianAlerts page (mock data)
- ✅ TechnicianBottomNav with Profile dropdown
- ✅ TechnicianInspectionForm (all 10 sections redesigned)

**What's Left:**
- [x] Wire inspection form to Supabase
- [x] Photo upload functionality
- [x] OpenAI integration for AI Summary
- [x] Mobile testing at 375px (technician pages verified)
- [x] End-to-end flow testing (Dashboard → Form → Save → AI → Complete verified)

---

## Progress Tracker

| Component | Status | Priority | Notes |
|-----------|--------|----------|-------|
| Technician Dashboard | ✅ Complete | 1 | Wired to calendar_bookings via useTechnicianJobs |
| Technician Jobs | 🟡 Created | 1 | Needs mobile fixes |
| Technician Alerts | 🟡 Created | 1 | Mock data, needs notifications table |
| Technician Profile Dropdown | ✅ Complete | 1 | Settings + Logout |
| Inspection Form Section 1 | ✅ Complete | 1 | Basic Information |
| Inspection Form Section 2 | ✅ Complete | 1 | Property Details |
| Inspection Form Section 3 | ✅ Complete | 1 | Area Inspection (repeatable) |
| Inspection Form Section 4 | ✅ Complete | 1 | Subfloor |
| Inspection Form Section 5 | ✅ Complete | 1 | Outdoor Info |
| Inspection Form Section 6 | ✅ Complete | 1 | Waste Disposal |
| Inspection Form Section 7 | ✅ Complete | 1 | Work Procedure |
| Inspection Form Section 8 | ✅ Complete | 1 | Job Summary |
| Inspection Form Section 9 | ✅ Complete | 1 | Cost Estimate (pricing logic) |
| Inspection Form Section 10 | ✅ Complete | 1 | AI Summary (needs OpenAI) |
| Inspection Form DB Wiring | ✅ Complete | 2 | Multi-table upsert across 5 tables |
| Photo Uploads | ✅ Complete | 2 | uploadInspectionPhoto + deleteInspectionPhoto |
| OpenAI Integration | ✅ Complete | 2 | generate-inspection-summary Edge Function |
| Mobile Testing | ✅ Complete | 2 | All technician pages verified at 375px |
| PDF Generation | ✅ Complete | 3 | Edge Function deployed (v29), data-driven page toggles |
| Email Automation | ✅ Complete | 3 | Resend integration with PDF attachment |

---

## Inspection Form Redesign (Technician)

**Route:** `/technician/inspection?leadId={id}`
**File:** `src/pages/TechnicianInspectionForm.tsx`
**Status:** ✅ UI COMPLETE - All 10 sections built with new mobile-first styling

### Section Summary

| # | Section | Fields | Complexity | Status |
|---|---------|--------|------------|--------|
| 1 | Basic Information | 7 | Low | ✅ Complete |
| 2 | Property Details | 2 dropdowns | Low | ✅ Complete |
| 3 | Area Inspection | ~15 per area (repeatable) | Very High | ✅ Complete |
| 4 | Subfloor | 9 | Medium | ✅ Complete |
| 5 | Outdoor Info | 10 | Medium | ✅ Complete |
| 6 | Waste Disposal | 2 | Low | ✅ Complete |
| 7 | Work Procedure | 11 | Medium | ✅ Complete |
| 8 | Job Summary | 6 | Medium | ✅ Complete |
| 9 | Cost Estimate | 7+ | High | ✅ Complete |
| 10 | AI Job Summary | 3 generated | High | ✅ Complete |

### Section 1: Basic Information
**Fields:** Job Number (auto), Triage, Address, Inspector (auto), Requested By, Attention To, Inspection Date
**Customer Card:** Name, Phone (tel:), Email (mailto:), Address (maps), Scheduled

### Section 2: Property Details
**Fields:**
- Property Occupation (dropdown): Tenanted, Vacant, Owner Occupied, Tenants Vacating
- Dwelling Type (dropdown): House, Units, Apartment, Duplex, Townhouse, Commercial, Construction, Industrial

### Section 3: Area Inspection (REPEATABLE)
**Per Area Fields:**
- Area Name, Mould Description, Comments for Report
- Temperature, Humidity, Dew Point (auto-calculated)
- Moisture Readings (repeatable): title, reading, photo
- External Moisture, Internal Notes
- Room View Photos (4 max)
- Infrared toggle: photo, natural photo, observations (5 checkboxes)
- Time Without Demo (hours)
- Demolition toggle: time, description

**Features:**
- Add/remove multiple areas
- Each area is collapsible card
- Nested repeatable for moisture readings

### Section 4: Subfloor
**Fields:**
- Subfloor Enabled (main toggle)
- Observations, Landscape (Flat/Sloping), Comments
- Readings (repeatable): reading + location
- Photos (up to 20)
- Sanitation toggle, Racking toggle (nested)
- Treatment Time (hours)

### Section 5: Outdoor Info
**Fields:**
- Temperature, Humidity, Dew Point (auto-calculated)
- Comments
- Photos: Front Door, Front House, Mailbox, Street
- Direction Photos toggle + single photo

### Section 6: Waste Disposal
**Fields:**
- Waste Disposal Enabled (toggle)
- Amount (dropdown): Small, Medium, Large, Extra Large

### Section 7: Work Procedure
**Fields:**
- HEPA Vac, Antimicrobial, Stain Removing, Home Sanitation (toggles)
- Drying Equipment toggle with nested:
  - Dehumidifier: enabled + qty (stepper)
  - Air Movers: enabled + qty (stepper)
  - RCD Box: enabled + qty (stepper)

### Section 8: Job Summary
**Fields:**
- Recommend Dehumidifier toggle + size dropdown
- Cause of Mould (textarea)
- Additional Info for Tech (internal)
- Additional Equipment Comments
- Parking Options (dropdown)

### Section 9: Cost Estimate
**Fields:**
- No Demolition Hours, Demolition Hours, Subfloor Hours (step 0.5)
- Equipment display (from Section 7)
- Manual Price Override checkbox + Total input

**Pricing Display (shows full calculation breakdown):**
- **Tier Pricing Reference Table:** Shows 2h and 8h rates for each labour type
- **Labour Breakdown:** Per-type with day-by-day calculation details
- **Equipment Breakdown:** Qty × Rate × Days for each item
- **Final Summary:**
  - Labour Subtotal
  - Multi-day Discount (7.5%/10.25%/11.5%/13% max)
  - Labour After Discount
  - Equipment Total
  - Subtotal Ex GST
  - GST (10%)
  - **Total Inc GST** (large, prominent)

**CRITICAL:** 13% max discount enforced, uses pricing.ts calculations

### Section 10: AI Job Summary
**Flow:**
1. **Initial State:** "Generate AI Summary" button with data preview
2. **On Click:** AI generates 3 sections in one call using all form data
3. **After Generation:** Shows editable textareas for:
   - Job Summary
   - What We Found
   - What We Will Do
4. **Each section has:** Feedback input + Regenerate button (per-section)
5. **"Regenerate All"** button to redo everything

**Note:** OpenAI integration is placeholder/mock - wire later

---

### Remaining Work to Production Ready

**Database Wiring:** ✅ COMPLETE
- [x] Create/update inspections table schema if needed
- [x] Save form data on Save button click
- [x] Auto-save every 30 seconds (debounced)
- [x] Load existing inspection if editing
- [x] Handle inspection_areas table for Section 3

**Photo Uploads:** ✅ COMPLETE
- [x] Wire photo upload to Supabase Storage
- [x] Section 3: Room View (4), Infrared (2), Moisture readings
- [x] Section 4: Subfloor photos (up to 20)
- [x] Section 5: Outdoor photos (4-5)
- [x] Show upload progress
- [ ] Handle offline/retry (deferred to Phase 3)

**AI Integration:** ✅ COMPLETE
- [x] Create Edge Function for AI generation (OpenRouter/Gemini)
- [x] Pass all form data as context
- [x] Generate structured sections in one API call
- [x] Handle regeneration with feedback
- [x] Error handling and retry

**Mobile Testing:** ✅ COMPLETE
- [x] Test all 9 sections at 375px viewport
- [x] Verify touch targets 48px minimum
- [x] Test photo capture from camera
- [x] Test dropdowns/selects on mobile
- [x] Test date pickers on mobile

**Validation:** ✅ COMPLETE
- [x] Required field validation before submit
- [x] Highlight invalid fields with section indicators
- [x] Show validation error summary
- [x] Prevent submit without required fields

---

## Technician Role Pages

### 15. Technician Dashboard `/technician`
**Status:** ✅ COMPLETE
**Files:** `src/pages/TechnicianDashboard.tsx`
- Wired to calendar_bookings + leads
- Shows today's jobs
- "Start Inspection" → `/technician/inspection?leadId={id}`

### 16. My Jobs Page `/technician/jobs`
**Status:** ✅ COMPLETE
**Files:** `src/pages/TechnicianJobs.tsx`, `src/hooks/useTechnicianJobs.ts`

**Completed:**
- [x] Standardize all cards to have "View Lead" button
- [x] Fix tabs horizontal scroll at 375px (hide-scrollbar CSS)
- [x] Seed test data for all tabs (SQL script prepared)
- [x] Test Call/Directions buttons (tel: and Google Maps links verified)
- [x] Verify touch targets (all buttons ≥48px, tab pills fixed to 48px)

### 17. Alerts Page `/technician/alerts`
**Status:** 🟡 POSTPONED - Will be built with Admin/Slack integration
**Files:** `src/pages/TechnicianAlerts.tsx`, `src/hooks/useTechnicianAlerts.ts`

**Note:** This page will be finalized during Phase 2 (Admin Role) to ensure proper integration with the Slack notification bridge and real-time triggers from admin actions.

### 18. Inspection Form `/technician/inspection`
**Status:** ✅ UI COMPLETE
**Files:** `src/pages/TechnicianInspectionForm.tsx`
- All 10 sections built with new mobile-first design
- Navigation between sections works
- Pricing calculations preserved
- AI generation flow ready (needs OpenAI)

**Remaining:** See "Remaining Work to Production Ready" above

### 21. Profile Dropdown
**Status:** ✅ COMPLETE
**Files:** `src/components/technician/TechnicianBottomNav.tsx`
- Settings → /settings
- Log Out → signs out, redirects to /login

---

## Technician Role - Integration Dependencies

| Feature | Dependency | Status | Priority |
|---------|------------|--------|----------|
| Real alerts | notifications table | ⬜ TODO | Phase 2 |
| Photo uploads | Supabase Storage wiring | ✅ COMPLETE | Done |
| AI generation | OpenRouter Edge Function | ✅ COMPLETE | Done |
| PDF generation | Edge Function (v29) | ✅ COMPLETE | Done |
| Email delivery | Resend integration | ✅ COMPLETE | Done |
| Push notifications | PWA service worker | ⬜ TODO | Phase 3 |
| Offline support | Service worker + IndexedDB | 🟡 ARCHITECTED | Phase 3 |

---

## 🏗️ Detailed Implementation Tasks (From Legacy Backlog)

These tasks are critical deployment blockers and must be completed in Phases 2 & 3.

### 1. PDF Generation Edge Function
**Priority:** P0 - BLOCKER
**Status:** ✅ COMPLETE (v29 deployed, 1,627 lines)
**Files:** `supabase/functions/generate-inspection-pdf/index.ts`
- Data-driven HTML template with dynamic page toggles
- Photo integration from Supabase Storage
- Uploaded to Supabase Storage, URL returned
- Called from admin report view and inspection completion

### 2. Email Automation (Resend Integration)
**Priority:** P0 - BLOCKER
**Status:** ✅ COMPLETE
**Files:** `supabase/functions/send-email/index.ts`, `src/lib/api/notifications.ts`
- Resend integration with 6 HTML email templates
- PDF attachment support via base64 encoding
- Email composer in LeadsManagement page

### 3. AI Summary Generation (OpenRouter/Gemini)
**Priority:** P0 - BLOCKER
**Status:** ✅ COMPLETE
**Files:** `supabase/functions/generate-inspection-summary/index.ts`
- Generates structured sections: What We Found, What We Will Do, Problem Analysis, Demolition Details
- Triggered on inspection completion, admin can regenerate

### 4. Implement PWA/Offline Mode (Service Worker + IndexedDB)
**Priority:** P0 - BLOCKER
**Status:** ⚠️ 10% (structure exists)
**Impact:** Form doesn't work offline in basements (critical)

**Implementation Tasks:**
- [ ] **Service Worker:** Cache static assets + API caching (`public/service-worker.js`)
- [ ] **Manifest:** PWA manifest (`public/manifest.json`)
- [ ] **IndexedDB:** Store inspection drafts locally (`src/lib/offline/indexedDB.ts`)
- [ ] **Sync Queue:** Queue operations while offline (`src/lib/offline/queue.ts`)
- [ ] **Sync Manager:** Replay queue when online (`src/lib/offline/sync.ts`)

### 5. Performance & Testing (High Priority)
- [ ] **Unit Tests:** `src/lib/utils/__tests__/pricing.test.ts` (13% cap logic)
- [ ] **Performance:** Target <3s load on 4G, LCP <2.5s
- [ ] **Mobile Testing:** Verify all flows at 375px viewport

---

### Phase 1: Technician Role (Current)
**Goal:** Technicians can complete inspections on mobile
**Status:** 🟡 95% Complete (E2E flow test remaining)

| Task | Status |
|------|--------|
| Dashboard UI | ✅ |
| Jobs page UI | ✅ |
| Alerts page UI | ✅ |
| Inspection form UI (all 10 sections) | ✅ |
| Database wiring | ✅ |
| Photo uploads | ✅ |
| AI integration | ✅ |
| PDF generation | ✅ |
| Mobile testing | ✅ |

### Phase 2: Backend Integration
**Goal:** All features connected to database and APIs
- Inspection form saves to Supabase
- Photos upload to Storage
- AI generates summaries
- PDF generates on submit
- Email sends to client

### Phase 3: Production Hardening
**Goal:** Production-ready with offline support
- Offline form capability
- Push notifications
- Error handling
- Performance optimization
- End-to-end testing

---

## Phase 1: Before Team Access & Production Deployment

### Admin Role

---

#### 1. Dashboard `/admin`
**File:** `src/pages/AdminDashboard.tsx`
**Status:** 🟢 Core Features Working (minus notifications)

**Already Working:**
- [x] Stats Row (4 cards) — uses `useAdminDashboardStats()` hook, real data
- [x] Today's Schedule — uses `useTodaysSchedule()` hook, real data
- [x] Unassigned Leads — uses `useUnassignedLeads()` hook, real data
- [x] Quick Actions — New Lead (modal), Approve Reports, Calendar, Reports (coming soon)

**Bugs/Fixes:**
- [ ] Logo — needs better logo that fits
- [ ] User dropdown — make universal across all pages (currently inconsistent)

**Fixed (2026-02-09):**
- [x] Team Workload — wired to `useTechnicianStats()` hook (real data from DB)
  - Shows: technician name, initials circle, inspections this week, relative progress bar
  - Loading spinner + "No technicians found" empty state
  - Deleted hardcoded Clayton/Glen array

**Build Last** *(see "Build Last" section below)*
- Recent Activity — plan what it shows, then build
- Notifications in app — plan triggers, then build
- Notifications Slack — set up Slack integration

**Test Before Access:**
- [ ] Search leads in AdminHeader — verify works
- [ ] 4 stat cards — test with seeded database
- [ ] Today's Schedule — test with real bookings
- [ ] "View All" link → goes to `/admin/schedule`
- [ ] Quick Actions:
  - [ ] New Lead → opens CreateLeadModal
  - [ ] Approve Reports → goes to `/admin/leads?status=approve_inspection_report`
  - [ ] Calendar → goes to `/admin/schedule`
  - [ ] Reports → shows "Coming Soon" toast

---

#### 2. Schedule `/admin/schedule`
**File:** `src/pages/AdminSchedule.tsx`
**Status:** 🟢 Core Bugs Fixed

**Already Working:**
- [x] Calendar panel split — 70/30 (already implemented, not 60/40)
- [x] Internal notes — saves to `calendar_bookings.description` column
- [x] Color coding — blue=inspection, green=job (in `ScheduleCalendar.tsx` line 41-48)
- [x] Technician filter — implemented in `ScheduleHeader`, filters by `technicianFilter`

**Fixed (2026-02-09):**
- [x] **Event positioning** — added guard for negative/zero duration (defaults to 1hr) and clamped bottom edge to prevent overflow past grid
- [x] **Book Inspection button** — confirmed logic is correct (requires date + time + technician). No code change needed.
- [x] **Technician selector showing wrong users** — removed fallback that returned ALL active users. Now returns empty array when no technician role found, so only actual technicians appear in dropdowns.

**Phase 1 Features Completed (2026-02-09):**
- [x] Event Details Panel — side panel with booking details, status, actions
- [x] Booking Conflict Detection — prevents double-booking technicians
- [x] Mobile FAB + Bottom Sheet — leads queue at 375px
- [x] Event Status Indicators — color-coded chips (scheduled/in_progress/completed/cancelled)
- [x] Duration Display — shows "1h", "2.5h" on events

**Enhancements (Phase 2):**
- [ ] Travel time calculation — already created somewhere, need to migrate
- [ ] Suggested booking times — soonest available based on travel

**Test Before Access:**
- [ ] Test with Michael Youssef account — verify appears in technician dropdown
- [ ] Verify dropdown shows technicians correctly (not all users)
- [ ] Save booking — date, time, technician saves correctly
- [ ] Booking appears on calendar after save
- [ ] Calendar navigation — week arrows, Today button
- [ ] Event positioning — verify 10AM event aligns with 10AM row

---

#### 3. Technicians `/admin/technicians`
**File:** `src/pages/AdminTechnicians.tsx`
**Status:** 🟢 WORKING — Data Wired ✓

**Already Implemented:**
- [x] Team Overview page — real stats from `useTechnicianStats()` hook
- [x] Technician Detail page — `AdminTechnicianDetail.tsx` with `useTechnicianDetail()` hook
- [x] Connected to database — fetches from inspections, calendar_bookings tables
- [x] Phone numbers clickable (tel: links)
- [x] "View Profile" navigates to detail page
- [x] Back button returns to list

**Note:** Currently only Michael Youssef will appear (only user with technician role).
Once Clayton and Glen accounts are created with technician role, they will also appear.

**Test Before Access:**
- [ ] Stats display correctly — verify with test data in database
- [ ] Navigation list → detail → back works
- [ ] Verify Michael Youssef appears (has technician role)
- [ ] Empty state shows correctly when no technicians exist

---

#### 4. Settings `/settings`
**File:** `src/pages/Settings.tsx`
**Status:** 🟢 Working

**What it does:**
- [x] Links to Profile (Edit Profile)
- [x] Links to Manage Users
- [x] Links to Change Password (forgot-password flow)
- [x] Sign Out / Log Out All Devices
- [x] Delete Account

**Notes:** Navigation page only — no forms or data saving here.

**Test Before Access:**
- [ ] All navigation links work correctly
- [ ] Sign Out works
- [ ] Delete Account works (with confirmation)

---

#### 5. Profile `/profile`
**File:** `src/pages/Profile.tsx`
**Status:** 🟢 Working

**Fields:**
| Field | Required | Google Maps | Saves To |
|-------|----------|-------------|----------|
| First Name | ✅ Yes | No | user_metadata.first_name |
| Last Name | ✅ Yes | No | user_metadata.last_name |
| Email | Read-only | No | — |
| Phone | No | No | user_metadata.phone |
| Starting Address | No | ✅ Yes | user_metadata.starting_address |

**Starting Address saves:** street, suburb, state, postcode, fullAddress, lat, lng

**Test Before Access:**
- [ ] All fields load correctly on page open
- [ ] Save updates database correctly
- [ ] Starting Address Google Maps autocomplete works
- [ ] Starting Address saves all data (lat/lng/suburb/postcode)

---

#### 6. Manage Users `/manage-users`
**File:** `src/pages/ManageUsers.tsx`
**Status:** 🟡 Bugs to Fix

**Add User Form Fields:**
| Field | Required | Google Maps | Validation |
|-------|----------|-------------|------------|
| First Name | ✅ Yes | No | Not empty |
| Last Name | ✅ Yes | No | Not empty |
| Email | ✅ Yes | No | Valid email format |
| Phone | ✅ Yes | No | Australian mobile (04XX XXX XXX) |
| Starting Address | ⚠️ Optional | ✅ Yes | None |
| Password | ✅ Yes | No | 8+ chars, upper, lower, number, special |
| Confirm Password | ✅ Yes | No | Must match password |

**Bugs/Fixes:**
- [x] ~~Field name mismatch — was saving as `home_address`, should be `starting_address`~~ **FIXED**
- [x] **Starting Address is MANDATORY** for technicians ✅ (validation enforced)
- [x] **Edit User** functionality ✅ (edit modal with pre-populated fields)

**Test Before Access:**
- [ ] Create new user — all fields save correctly
- [ ] Starting Address saves as `starting_address` (not `home_address`)
- [ ] Starting Address saves all data (lat/lng/suburb/postcode/fullAddress)
- [ ] New user can login immediately after creation
- [ ] User appears in Technicians list if given technician role

---

#### 7. Technician Detail `/admin/technicians/:id` (UPDATED)
**File:** `src/pages/AdminTechnicianDetail.tsx`
**Status:** 🟡 Needs Enhancement

**Currently Displays:**
- [x] Full Name (from first + last)
- [x] Initials circle
- [x] Email
- [x] Phone (clickable tel: link)
- [x] Suburb ("Based in {suburb}")
- [x] Stats (inspections, revenue, workload)
- [x] Upcoming jobs list

**Fixed (2026-02-17):**
- [x] **Full Starting Address** — now shows full address, not just suburb ✅
- [ ] Consider: Small map preview showing starting location (Phase 2?)

**Test Before Access:**
- [ ] Full Starting Address displays (not just suburb)
- [ ] Address shows correctly for users created via Add User form

---

#### 8. Leads Management `/leads`
**File:** `src/pages/LeadsManagement.tsx`
**Status:** 🟢 Phase 1 Complete (Archive, History, Email all working)

**UI Completed (2025-02-04):**
- [x] New pipeline tabs with colored dots (horizontal scrollable)
- [x] Status-specific card variants for each pipeline stage
- [x] Create New Lead dashed card (opens CreateLeadModal)
- [x] Removed urgency filter and badges everywhere
- [x] Responsive grid (1/2/3 columns)
- [x] Archive button on all cards (stubbed with toast)
- [x] Clean Tailwind styling (no more inline CSS)

**Phase 1 Features Completed (2026-02-09):**
- [x] updateLeadStatus() persists to Supabase (was local-only bug)
- [x] Archive Lead — AlertDialog confirmation, sets archived_at, logs activity
- [x] View History — Dialog with activity timeline, en-AU timestamps
- [x] Send Email — Composer with MRC template, mailto: + clipboard

**Phase 1 Pipeline Stages:**
| Status | Card Shows | Actions |
|--------|------------|---------|
| new_lead | Name, address, issue | View Lead, Schedule |
| inspection_waiting | Name, address, technician, date/time | Start Inspection |
| approve_inspection_report | Name, address, PDF Ready badge | View PDF, Approve |
| inspection_email_approval | Name, address, Report Approved | View PDF, Send Email |
| closed | Name, address, completion info | View History, View PDF |
| not_landed | Name, address, reason | Reactivate, View History |

**Working Actions (Existing):**
- [x] View Lead → navigates to lead detail (`/lead/new/:id` or `/client/:id`)
- [x] Schedule → navigates to `/admin/schedule`
- [x] Start Inspection → navigates to inspection form (`/inspection?leadId=:id`)
- [x] View PDF → navigates to report view (`/report/:id`)
- [x] Approve → updates status to `inspection_email_approval`
- [x] Reactivate → updates status to `new_lead`
- [x] Search, Sort, Tab filtering — all working

**TODO — Phase 1:**
- [x] Pipeline tab text: "Awaiting Insp." → "Awaiting Inspection" (full text) ✅
- [x] Add **Phone button** to ALL lead cards (tel: link) ✅
- [x] Add **Email button** to ALL lead cards (mailto: link) ✅
- [x] Add **View Lead button** to ALL lead cards (consistent across all statuses) ✅
- [ ] "Closed" card — change "View PDF" to "Files & Photos" button
- [x] Archive lead functionality ✅ (AlertDialog + DB persistence)
- [x] Send Email — email composer with MRC template + Resend ✅
- [x] View History — activity timeline modal ✅
- [ ] Schedule button auto-open/highlight lead in Schedule queue (nice-to-have)
- [x] Database enum: `closed` and `not_landed` confirmed in lead_status ✅
- [x] `property_lat` and `property_lng` columns exist in leads table ✅

**TODO — Phase 2 (After Real Users Testing):**
- [ ] Cancel Booking → Retargeting category with automation
- [ ] Automated follow-up emails (no response reminders)
- [ ] Job pipeline stages:
  - job_quoted
  - job_self_book (customer books job online)
  - job_scheduled
  - job_in_progress
  - job_completed
  - invoice_sent
  - paid
  - google_review
  - finished
- [ ] Email automation triggers throughout pipeline
- [ ] Customer self-booking for jobs

**Files Created (2025-02-04):**
- `src/components/leads/PipelineTabs.tsx` — Horizontal scrollable status tabs
- `src/components/leads/LeadCard.tsx` — Status-specific card component
- `src/components/leads/CreateLeadCard.tsx` — Dashed "Add new" card

**Test Before Access:**
- [ ] All pipeline tabs filter correctly
- [ ] All card actions work for each status
- [ ] Search/Sort works correctly
- [ ] CreateLeadModal opens from dashed card and "+New Lead" button
- [ ] Responsive design works at 375px/768px/1440px

---

#### 9. New Lead View `/lead/new/:id`
**File:** `src/pages/NewLeadView.tsx`
**Status:** 🟢 Working

**Purpose:** Simplified view specifically for NEW leads before inspection is scheduled. Shows lead info with prominent "Schedule Inspection" CTA.

**What Exists:**
- [x] Status banner showing "New Lead - Initial Inquiry"
- [x] Lead Information card (name, phone, email, address)
- [x] Property address with Google Maps link
- [x] Issue description display
- [x] Urgency & Timeline section
- [x] Lead Details (source, date created, ID)
- [x] "Schedule Inspection Now" CTA button
- [x] BookInspectionModal integration — smart booking modal
- [x] Scheduled inspection info display (if already booked)
- [x] "Reschedule Inspection" button (if already booked)
- [x] Call button in nav (tel: link)
- [x] Booking notes from calendar_bookings.description

**Data Sources:**
- `leads` table via React Query
- `calendar_bookings` table for booking info
- Refreshes on booking success

**Navigation Flow:**
- From: Leads pipeline (new_lead cards) or direct URL
- To: `/leads` (Back to Leads button)
- Opens: BookInspectionModal for scheduling

**Test Before Access:**
- [ ] Page loads correctly with lead data
- [ ] Schedule Inspection button opens BookInspectionModal
- [ ] Google Maps link opens correctly (uses lat/lng if available)
- [ ] Scheduled inspection info displays after booking
- [ ] Reschedule button works for already-booked leads

---

#### 10. Lead Detail `/leads/:id`
**File:** `src/pages/LeadDetail.tsx`
**Status:** 🟢 Working

**Purpose:** Full lead detail page for leads AFTER new_lead stage. Shows status-specific CTAs and activity log.

**What Exists:**
- [x] Auto-redirect: `new_lead` status → redirects to `/lead/new/:id`
- [x] Status badge with color from STATUS_FLOW config
- [x] Contact actions: Call, Email, SMS, Directions
- [x] Full address with lat/lng-based Google Maps directions
- [x] Status-specific CTAs:
  - `inspection_waiting`: Start/Continue Inspection
  - `approve_inspection_report`: View & Edit Report, Edit Inspection, Regenerate PDF
  - `inspection_email_approval`: Send Report & Close Lead, View Report
  - `closed`: View Report, Reactivate Lead
  - `not_landed`: Reactivate Lead
- [x] Activity timeline (fetches from `activities` table)
- [x] Inspection data display (if inspection exists)
- [x] Booking notes from call
- [x] Status change functionality with activity logging
- [x] Delete lead with confirmation dialog
- [x] Regenerate PDF button

**Data Sources:**
- `leads` table
- `activities` table (activity log)
- `inspections` table
- `calendar_bookings` table

**Test Before Access:**
- [ ] new_lead status correctly redirects to NewLeadView
- [ ] All status-specific CTAs work correctly
- [ ] Contact buttons (Call, Email, SMS, Directions) work
- [ ] Activity timeline displays status changes
- [ ] Status change updates database and creates activity
- [ ] Delete lead works with confirmation

---

#### 11. Client Detail — DELETED
**Status:** ❌ REMOVED (2026-02-17 cleanup)
**Reason:** Was a 3,289-line orphan page, never routed in App.tsx. LeadDetail.tsx serves as the canonical lead detail page.

---

#### 12. PDF View & Editor `/report/:id` or `/inspection/:inspectionId/report`
**File:** `src/pages/ViewReportPDF.tsx`
**Status:** 🟢 Working

**Purpose:** View, edit, and approve inspection PDF reports. Features visual preview with inline edit buttons.

**What Exists:**
- [x] Loads inspection by ID or by lead_id
- [x] Report preview via `ReportPreviewHTML` component
- [x] Edit Mode toggle — shows edit buttons ON the PDF
- [x] Editable fields:
  - Client name, property address
  - AI summary, cause of mould
  - Outdoor readings (temp, humidity, dew point, comments)
  - Pricing (labor, equipment, subtotal, GST, total)
- [x] Image upload modal for photos
- [x] Version history panel — view/restore previous versions
- [x] Generate/Regenerate PDF button
- [x] Approve button (marks report as approved)
- [x] Download button (opens PDF in new tab for print)
- [x] Mobile-responsive header with icon buttons
- [x] Approved badge indicator
- [x] 48px touch targets for mobile

**Data Sources:**
- `inspections` table (with joined `leads` data)
- `pdf_versions` table (via `getPDFVersionHistory()`)

**API Functions Used:**
- `generateInspectionPDF()` — generates/regenerates PDF
- `approvePDF()` — marks PDF as approved
- `getPDFVersionHistory()` — fetches version history
- `updateFieldAndRegenerate()` — edits field and regenerates PDF

**Test Before Access:**
- [ ] Report loads by inspection ID
- [ ] Report loads by lead ID (fallback)
- [ ] Edit mode shows edit buttons on preview
- [ ] Field edits save and regenerate PDF
- [ ] Version history shows previous versions
- [ ] Approve button works and shows badge
- [ ] Download opens PDF in new tab

---

#### 13. Reports Page `/reports`
**File:** `src/pages/Reports.tsx`
**Status:** 🟢 IMPLEMENTED — Real Data Wired

**Implementation (2025-02-04):**

**Files Created:**
- `src/pages/Reports.tsx` — Main reports page
- `src/hooks/useReportsData.ts` — Data fetching hook with React Query
- `src/components/reports/PeriodFilter.tsx` — Time period selector (pills)
- `src/components/reports/KPICard.tsx` — KPI metric card
- `src/components/reports/StatusChart.tsx` — Donut chart (lead status)
- `src/components/reports/SourcesChart.tsx` — Bar chart (lead sources)
- `src/components/reports/TimelineChart.tsx` — Area chart (leads over time)
- `src/components/reports/index.ts` — Barrel export

**Features Implemented:**
- [x] 4 KPI Cards (Total Leads, Conversion Rate, Avg Response Time, Total Revenue)
- [x] Lead Status Breakdown (Donut chart with Recharts)
- [x] Lead Sources (Horizontal bar chart with Recharts)
- [x] Leads Over Time (Area chart with gradient fill)
- [x] Time Period Filter (Today, This Week, This Month, This Year)
- [x] Quick Insights section (Top Source, Most Common Status, Pipeline Health)
- [x] Loading state with spinner
- [x] Error state with retry button
- [x] Auto-refresh every 60 seconds
- [x] Responsive grid (mobile/tablet/desktop)

**Data Sources:**
- Leads: status, lead_source, created_at, quoted_amount
- Inspections: total_inc_gst (revenue)
- Calendar Bookings: for response time calculation

**KPI Definitions:**
| Metric | Calculation |
|--------|-------------|
| Total Leads | Count of leads in period |
| Conversion Rate | (closed leads / total leads) × 100% |
| Avg Response Time | 24 hrs (placeholder - needs first_contact_at field) |
| Total Revenue | Sum of inspections.total_inc_gst |

**Phase 2 Reports (Not Built - Missing Data):**
- [ ] Invoice Reports (invoices table empty)
- [ ] Payment Tracking (no paid invoices yet)
- [ ] Calendar Heatmap (only 1 booking)
- [ ] Technician Leaderboard (need more data)
- [ ] Equipment Utilization
- [ ] Custom date range picker
- [ ] Export to PDF/CSV

---

#### 14. Help & Support `/help`
**File:** `src/pages/HelpSupport.tsx`
**Status:** 🟢 IMPLEMENTED — Phase 1 Complete

**Implementation (2025-02-04):**

**Features Implemented:**
- [x] Centered support card with icon
- [x] "Need Help?" title and description
- [x] Call Now button → `tel:0433880403`
- [x] Send Email button → `mailto:michaelyoussef396@gmail.com`
- [x] Response time note ("Usually responds within 24 hours")
- [x] Quick Tips section with helpful advice
- [x] Route added to App.tsx (`/help`)
- [x] Link added to Settings page (Support section)
- [x] Mobile bottom navigation included

**Contact Details (Hardcoded):**
- Phone: 0433 880 403
- Email: michaelyoussef396@gmail.com

**Phase 2 — Full Help Center (Later):**
- [ ] FAQ section
- [ ] How-to guides
- [ ] Video tutorials
- [ ] Report a bug form
- [ ] Feature request form

---

#### 18. Inspection Form `/inspection` (OLD - Admin/Developer)
**File:** `src/pages/InspectionForm.tsx` (~5400 lines)
**Status:** 🟢 WORKING — Keep for Admin until Technician form complete

**Current State:** Functional, wired to real data

**10 Sections (All Working):**
| # | Section | Key Fields | Status |
|---|---------|------------|--------|
| 1 | Basic Information | Job #, Inspector, Date, Triage | ✅ Working |
| 2 | Property Details | Occupation, Dwelling Type | ✅ Working |
| 3 | Area Inspection | Repeatable: Area name, mould description, moisture readings, photos, infrared, demolition | ✅ Working |
| 4 | Subfloor | Toggle, observations, readings, photos, treatment time | ✅ Working |
| 5 | Outdoor Info | Temperature, humidity, front/mailbox/street photos, direction photos | ✅ Working |
| 6 | Waste Disposal | Toggle, amount | ✅ Working |
| 7 | Work Procedure | HEPA Vac, Antimicrobial, Fogging, Dehumidifiers (qty), Air Movers (qty), RCD Box (qty) | ✅ Working |
| 8 | Job Summary | Cause of mould, additional info, parking, dehumidifier recommendation | ✅ Working |
| 9 | Cost Estimate | Labour hours (3 types), Equipment cost, Discount, GST, Total | ✅ Working |
| 10 | AI Job Summary | AI-generated text, PDF sections (What We Found/Will Do/You Get) | ✅ Working |

**Key Features Working:**
- [x] Auto-save every 30 seconds
- [x] Section navigation with progress dots
- [x] Photo upload (Supabase Storage)
- [x] Moisture readings with photos
- [x] AI summary generation (Edge Function)
- [x] Australian tier pricing (13% max discount)
- [x] Validation before submit

**TODO - Mobile Testing:**
- [ ] Verify all touch targets ≥48px
- [ ] Test photo upload from mobile camera
- [ ] Test complete flow on 375px viewport
- [ ] Verify auto-save works correctly

---

#### 19. PDF Auto-Generation
**Status:** ✅ COMPLETE
- Technician completes inspection → AI summary generated → Admin reviews → PDF generated via Edge Function
- `generate-inspection-pdf` (v29, 1,627 lines) deployed and working
- Data-driven page toggles, photo integration from Supabase Storage

---

#### 20. Technician Mobile Testing
**Status:** ✅ COMPLETE
- [x] All pages render at 375px viewport
- [x] Touch targets minimum 48px (glove-friendly)
- [x] No horizontal scrolling
- [x] Forms usable with fat fingers
- [x] Photo capture opens camera correctly
- [x] Bottom nav all links work (no 404s)

---

### Technician Role — Pre-Access Checklist

**Critical (Must Pass):**
- [ ] Technician Dashboard shows real jobs from database (NOT mock data)
- [ ] Inspection Form saves all data correctly
- [ ] Photo upload works from mobile camera
- [ ] Submit creates inspection record + triggers PDF
- [ ] Bottom nav all links work (no 404s)

**Mobile Testing (375px):**
- [ ] All pages render correctly on 375px viewport
- [ ] Touch targets ≥48px (gloves requirement)
- [ ] No horizontal scrolling
- [ ] Forms usable with fat fingers
- [ ] Photo capture opens camera correctly

**Data Integrity:**
- [ ] Auto-save doesn't lose data on navigation
- [ ] Form data persists after refresh
- [ ] Inspection links to correct lead
- [ ] Cost calculations match pricing rules (13% cap)

---

### Build Last (Before Pre-Checklist)
*(Plan and build these at the END of Phase 1, right before deployment)*

**Dashboard - Recent Activity:**
- [ ] Plan: What activities to show (new leads, bookings, completions, status changes)
- [ ] Plan: How to fetch (real-time subscription or polling)
- [ ] Build: Wire to actual activity/audit log data

**Notifications - In App:**
- [ ] Plan: What triggers notifications (new lead, booking reminder, report approval)
- [ ] Plan: Where to store (notifications table in Supabase)
- [ ] Build: Notification bell shows unread count, clicking shows list

**Notifications - Slack Integration:**
- [ ] Set up Slack workspace/channel for MRC
- [ ] Plan: What triggers Slack messages (urgent leads, daily summaries)
- [ ] Build: Edge function to post to Slack webhook

**Reports Page `/reports`:**
- [x] ~~Plan: What analytics/reports to show~~ ✅ DONE
- [x] ~~Build: Reports page with charts and data tables~~ ✅ DONE (2025-02-04)
- KPIs, Status Donut, Sources Bar, Timeline Area charts implemented with Recharts

**Leads - Email Composer:** ✅ COMPLETE
- [x] MRC email template with company signature
- [x] PDF attachment via Resend (base64 encoding)
- [x] Resend email provider integrated
- [x] Email composer in LeadsManagement with approve & send flow

**Leads - Activity History:** ✅ COMPLETE
- [x] Activities table tracks status changes, emails, notes
- [x] View History dialog in LeadsManagement
- [x] Activity timeline in LeadDetail page

---

### Pre-Deployment Checklist

**Dashboard:**
- [ ] Search leads — verify works
- [ ] Stat cards — test with seeded database
- [ ] Today's Schedule — test with real bookings
- [ ] View All link — test goes to right place

**Schedule:**
- [ ] Save booking — test saves correctly
- [ ] Book Inspection button — test works
- [ ] Booking appears on calendar — verify shows after save
- [ ] Calendar navigation — test week view, arrows

**Auth:**
- [ ] Login — verify Admin + Tech roles work
- [ ] Password reset — verify works
- [ ] Role-based access — Admin vs Tech views
- [ ] Session management — tokens work

**Security:**
- [ ] Row-level security — users see only their data

**Deployment:**
- [ ] Deploy to production domain
- [ ] Test everything on production
- [ ] Onboard Admin user (training)
- [ ] Onboard Technician users (training)
- [ ] Test with real leads

---

## Deployment Stages

### Stage 1: Pre-Deployment Checklist ✅
*(Already documented above)*
- Complete all Phase 1 features
- Test all core user flows
- Fix all critical bugs

### Stage 2: Domain & Production Setup
**Before giving anyone access:**

- [ ] Purchase/configure domain (e.g., app.mouldrestoration.com.au)
- [ ] Set up production environment (separate from development)
- [ ] Set up production Supabase project (separate database)
- [ ] Configure environment variables for production
- [ ] Set up SSL certificate (HTTPS)
- [ ] Configure email sending (production SMTP)
- [ ] Set up error monitoring (get notified of crashes)
- [ ] Set up database backups (automated daily)
- [ ] Deploy app to production domain
- [ ] Test EVERYTHING again in production environment
  - [ ] Login/authentication works
  - [ ] Password reset works
  - [ ] All pages load correctly
  - [ ] Data saves correctly
  - [ ] PDF generation works
  - [ ] Email sending works

### Stage 3: Early Access Testing
**Real users testing with TEST data (not real leads yet):**

- [ ] Create accounts for Glen, Clayton, Vryan (technician role)
- [ ] Create admin account for Michael
- [ ] Onboard users (training session)
- [ ] Users test with fake/test leads
- [ ] Collect feedback and bug reports
- [ ] Fix issues found during testing
- [ ] Polish UI based on feedback
- [ ] Verify mobile experience (technicians on phones)

### Stage 4: Database Reset & Go Live
**After testing is complete, before real leads:**

- [ ] Export any data worth keeping (if any)
- [ ] Reset production database (clean slate)
- [ ] Remove all test data
- [ ] Verify clean database state
- [ ] Final confirmation from Glen/team
- [ ] GO LIVE — start using with real leads

### Stage 5: Production Monitoring
**Ongoing after go-live:**

- [ ] Monitor for errors
- [ ] Quick response to bug reports
- [ ] Regular backups verified
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Prioritize Phase 2 features

---

## Developer Role Note

**The old Developer role pages will stay AS-IS until just before the Pre-Checklist.**

After building everything else and only missing the pre-checklist:
- Clean up Developer role pages
- Remove unused/broken features
- Integrate any useful components into Admin/Technician roles
- Or remove Developer role entirely if not needed

**Do NOT touch Developer role during Phase 1 build.**

---

## PDF Inspection Report Template

**Status:** ✅ COMPLETE
**Location:** `inspection-report-pdf/`
**Size:** 7.2MB (cleaned from 147MB)

### What's Done:
- [x] 13-page HTML template (`complete-report.html`)
- [x] All fonts embedded (Garet Heavy, Galvji)
- [x] All assets organized (backgrounds, icons, logos, photos)
- [x] Colour codes documented (WHITE, BLUE #121D73, DARK GREY #252525, RED #E30000, BLACK)
- [x] Style guide created (`STYLE-GUIDE.md`, `COLOUR-CODES.md`)
- [x] Example PDF generated (`test-complete-13-pages.pdf`)
- [x] Folder cleaned up (removed PSDs, duplicates - saved 139MB)

### 28 Template Variables:
| Variable | Page | Data Source |
|----------|------|-------------|
| {{ordered_by}} | 1 - Cover | leads.first_name + last_name |
| {{inspector}} | 1 - Cover | users.first_name + last_name |
| {{inspection_date}} | 1 - Cover | inspections.inspection_date |
| {{directed_to}} | 1 - Cover | leads.first_name + last_name |
| {{property_type}} | 1 - Cover | leads.property_type |
| {{examined_areas}} | 1 - Cover | inspection_areas (comma list) |
| {{property_address}} | 1 - Cover | leads.address |
| {{what_we_found_text}} | 4 | inspections.findings_summary |
| {{what_we_will_do_text}} | 4 | inspections.action_plan |
| {{problem_analysis_content}} | 5 | inspections.problem_analysis |
| {{demolition_content}} | 6 | inspections.demolition_notes |
| {{outdoor_temperature}} | 7 | inspections.outdoor_temp |
| {{outdoor_humidity}} | 7 | inspections.outdoor_humidity |
| {{outdoor_dew_point}} | 7 | inspections.outdoor_dew_point |
| {{area_temperature}} | 8 | inspection_areas.temperature |
| {{area_humidity}} | 8 | inspection_areas.humidity |
| {{area_dew_point}} | 8 | inspection_areas.dew_point |
| {{visible_mould}} | 8 | inspection_areas.visible_mould |
| {{internal_moisture}} | 8 | moisture_readings.internal |
| {{external_moisture}} | 8 | moisture_readings.external |
| {{area_notes}} | 8 | inspection_areas.notes |
| {{extra_notes}} | 8 | inspection_areas.extra_notes |
| {{subfloor_observation}} | 9 | subfloor_data.observation |
| {{subfloor_landscape}} | 9 | subfloor_data.landscape |
| {{subfloor_comments}} | 9 | subfloor_data.comments |
| {{moisture_levels}} | 9 | subfloor_readings.moisture |
| {{option_1_price}} | 10 | Calculated surface treatment |
| {{option_2_price}} | 10 | Calculated comprehensive |

### Static Pages (No Variables):
- Page 2: Table of Contents
- Page 3: Our Services
- Page 11: Terms & Conditions (Warranty)
- Page 12: Terms & Conditions (Payment)
- Page 13: Remember Us / Contact

### PDF Integration TODO (When Building Inspection Flow):
- [ ] Create Edge Function `generate-inspection-pdf`
- [ ] Build Supabase query to fetch all inspection data
- [ ] Implement variable replacement logic
- [ ] Set up Puppeteer/Chrome headless PDF generation
- [ ] Upload generated PDF to Supabase Storage
- [ ] Add PDF download button to inspection detail page
- [ ] Implement email attachment functionality

---

## Phase 2: After Real Users Testing

### Schedule - Phase 2
- [ ] Jobs on calendar — show jobs + inspections (different colors)

### Other Phase 2 Items
- [x] Email Automation ✅ (Resend integration complete)
- [x] AI Summary Generation ✅ (OpenRouter/Gemini Edge Function complete)
- [ ] PWA/Offline Mode (architected, not active)
- [x] Developer Role pages ✅ (DeveloperComingSoon.tsx placeholder)
- [ ] More TBD as we document other pages

---

### Phase 2 Integrations

**Website → System Integration:**
- [ ] Research: How to connect MRC website contact form to system
- [ ] Options: Webhook, Zapier, direct API, email parsing
- [ ] Auto-create lead when website form submitted
- [ ] Auto-assign to "New Lead" status
- [ ] Notification to admin when new lead arrives
- [ ] Test with staging before production

**Slack Notifications (Full Implementation):**
- [ ] Set up Slack workspace/channel for MRC
- [ ] Create Slack webhook URL
- [ ] Build Edge Function to post to Slack
- [ ] Triggers to implement:
  - [ ] New lead arrives
  - [ ] Inspection booked
  - [ ] Report ready for approval
  - [ ] Report approved
  - [ ] Daily summary (morning)
- [ ] Test notifications work reliably

**Hipages Integration:**
- [ ] Research Hipages API/webhook options
- [ ] Auto-import leads from Hipages
- [ ] Lead source tracking (hipages vs website vs referral)
- [ ] Avoid duplicate lead creation

---

**End Goal:** Production-level, bulletproof, scalable system

---

## Notes

- Phase 1 = Before team access & production deployment
- Phase 2 = After real users are testing
- "Build Last" items = Plan and build at END of Phase 1, right before deployment
- Currently only 1 user exists: Michael Youssef (has admin + technician + developer roles)
- Clayton & Glen accounts need to be created later with ONLY technician role
- **Admin Role:** 14 pages documented (sections 1-14)
- **Technician Role:** 7 pages documented (sections 15-21)
- **Inspection Form:** All 10 sections UI complete (2025-02-07)

---

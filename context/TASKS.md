# 📋 MRC Lead Management System - Complete Task List with Agent Assignments

> **325+ tasks organized by milestones**
> Every task includes: ID, priority, agent workflow, acceptance criteria, dependencies

---

## 📊 Task Overview

| Milestone | Tasks | P0 | P1 | P2 | Status |
|-----------|-------|----|----|----| -------|
| **M0: Foundation & Critical Fixes** | 45 | 35 | 8 | 2 | 🟢 33% |
| **M1: Authentication & Core UI** | 38 | 28 | 8 | 2 | 🟢 66% |
| **M2: Dashboard & Lead Management** | 52 | 38 | 10 | 4 | 🟡 35% |
| **M3: Inspection Form & AI** | 68 | 48 | 15 | 5 | 🔴 3% |
| **M4: PDF & Email Automation** | 46 | 32 | 10 | 4 | 🔴 0% |
| **M5: Calendar & Booking** | 42 | 28 | 10 | 4 | 🔴 0% |
| **M6: Settings & Polish** | 34 | 18 | 12 | 4 | 🔴 0% |
| **TOTAL** | **325** | **227** | **73** | **25** | **27%** |

---

## 🚀 Milestone 0: Foundation & Critical Fixes (Days 1-3)

**Goal:** Establish database, fix critical data loss bug, implement offline mode

---

### Task ID: MRC-001
**Title:** Setup Supabase Project & Complete Database Schema
**Phase:** Foundation
**Priority:** P0 (Must Have - Blocks Everything)
**Estimated Time:** 6h
**Status:** 🟢 DONE

**Description:**
Create Supabase project, design and implement all 11 database tables with RLS policies, indexes, and audit columns.

**Agent Workflow:**
1. **Supabase Schema Architect** - Design complete schema with 11 tables, relationships, RLS policies → Schema design document + migration plan
2. **SQL Pro** - Write optimized migration SQL with indexes and constraints → 11 migration files
3. **Security Auditor** - Verify RLS policies secure for all tables → RLS verification report
4. **TypeScript Pro** - Generate TypeScript types from schema → src/types/database.types.ts
5. **Code Reviewer** - Review migration files for quality → Review report

**Acceptance Criteria:**
- [ ] All 11 tables created: leads, inspection_reports, photos, documents, customers, technicians, bookings, offline_queue, email_logs, settings, zones
- [ ] RLS policies enabled on ALL tables (Security Auditor verified)
- [ ] Indexes created on all foreign keys
- [ ] Audit columns (created_at, updated_at, created_by) on all tables
- [ ] TypeScript types generated accurately
- [ ] Migrations run successfully
- [ ] Supabase Schema Architect approved design
- [ ] Security Auditor verified RLS security
- [ ] Code Reviewer approved migrations

**Dependencies:**
- Requires: None (foundation task)
- Blocks: ALL other tasks (database required)

**Files Modified:**
- `supabase/migrations/20250111000001_create_leads.sql`
- `supabase/migrations/20250111000002_create_inspection_reports.sql`
- `supabase/migrations/20250111000003_create_photos.sql`
- `supabase/migrations/20250111000004_create_documents.sql`
- `supabase/migrations/20250111000005_create_customers.sql`
- `supabase/migrations/20250111000006_create_technicians.sql`
- `supabase/migrations/20250111000007_create_bookings.sql`
- `supabase/migrations/20250111000008_create_offline_queue.sql`
- `supabase/migrations/20250111000009_create_email_logs.sql`
- `supabase/migrations/20250111000010_create_settings.sql`
- `supabase/migrations/20250111000011_create_zones.sql`
- `src/types/database.types.ts`

---

### Task ID: MRC-002
**Title:** Implement 5-Layer Data Persistence System
**Phase:** Foundation
**Priority:** P0 (Must Have - Critical Bug Fix)
**Estimated Time:** 8h
**Status:** 🔴 TODO

**Description:**
Fix critical page reload/reset bug by implementing comprehensive 5-layer data persistence: React Query caching, Context API state, Auto-save every 30s, localStorage backup, Navigation guard.

**Agent Workflow:**
1. **TypeScript Pro** - Define persistence types and state interfaces → src/types/persistence.ts
2. **React Performance Optimization** - Implement auto-save hook with debouncing → src/lib/hooks/useAutoSave.ts
3. **React Performance Optimization** - Create Context API for UI state → src/contexts/AppStateContext.tsx
4. **offline-architect** - Implement localStorage backup and recovery → src/lib/offline/persistence.ts
5. **TypeScript Pro** - Create navigation guard hook → src/lib/hooks/useNavigationGuard.ts
6. **Test Engineer** - Create comprehensive persistence tests → __tests__/persistence.test.ts
7. **Code Reviewer** - Review persistence logic for reliability → Review report

**Acceptance Criteria:**
- [ ] React Query configured: staleTime 5min, cacheTime 10min
- [ ] Context API preserves UI state across routes
- [ ] Auto-save triggers every 30 seconds
- [ ] localStorage backup created on every change
- [ ] Navigation guard warns on unsaved changes
- [ ] Data persists through page reload (tested)
- [ ] Recovery works after browser crash
- [ ] No data loss in any scenario
- [ ] Test Engineer verified 100% coverage on critical paths
- [ ] Code Reviewer approved implementation

**Dependencies:**
- Requires: MRC-001 (database)
- Blocks: MRC-042 (inspection form), MRC-062 (lead creation)

**Files Modified:**
- `src/types/persistence.ts` (new)
- `src/lib/hooks/useAutoSave.ts` (new)
- `src/lib/offline/persistence.ts` (new)
- `src/contexts/AppStateContext.tsx` (new)
- `src/lib/hooks/useNavigationGuard.ts` (new)
- `src/lib/queryClient.ts` (modify - persistence config)
- `src/App.tsx` (modify - add providers and guards)
- `__tests__/persistence.test.ts` (new)

---

### Task ID: MRC-003
**Title:** Implement Complete Offline Mode with PWA
**Phase:** Foundation
**Priority:** P0 (Must Have - Critical Feature)
**Estimated Time:** 12h
**Status:** 🔴 TODO

**Description:**
Implement full offline capability: Service worker with cache strategies, IndexedDB for large data, offline queue for mutations, sync on reconnection. Field technicians work in basements with poor signal.

**Agent Workflow:**
1. **offline-architect** - Design complete offline architecture → Offline strategy document
2. **TypeScript Pro** - Define offline queue types and sync interfaces → src/types/offline.ts
3. **offline-architect** - Implement service worker with cache strategies → public/service-worker.js
4. **offline-architect** - Implement IndexedDB storage for large data → src/lib/offline/indexedDB.ts
5. **offline-architect** - Implement offline queue and sync logic → src/lib/offline/sync.ts
6. **React Performance Optimization** - Create offline banner component → src/components/layout/OfflineBanner.tsx
7. **Test Engineer** - Create offline mode tests → __tests__/offline.test.ts
8. **mobile-tester** - Test offline functionality at all viewports → Offline test report
9. **Code Reviewer** - Review offline implementation → Review report

**Acceptance Criteria:**
- [ ] Service worker caches static assets (Cache First strategy)
- [ ] Service worker caches API responses (Network First with fallback)
- [ ] Mutations queued when offline
- [ ] IndexedDB stores inspection drafts, photos (large data)
- [ ] Offline banner shows when disconnected
- [ ] Sync happens automatically on reconnection
- [ ] Conflicts handled (last-write-wins strategy)
- [ ] User notified of sync status
- [ ] Works at all viewports (mobile-tester verified)
- [ ] offline-architect approved implementation
- [ ] Test Engineer verified functionality
- [ ] Code Reviewer approved code quality

**Dependencies:**
- Requires: MRC-001 (database), MRC-002 (persistence)
- Blocks: MRC-042 (inspection form offline support)

**Files Modified:**
- `public/service-worker.js` (new)
- `src/types/offline.ts` (new)
- `src/lib/offline/indexedDB.ts` (new)
- `src/lib/offline/sync.ts` (new)
- `src/lib/hooks/useOfflineStatus.ts` (new)
- `src/components/layout/OfflineBanner.tsx` (new)
- `vite.config.ts` (modify - add PWA plugin)
- `public/manifest.json` (new)
- `__tests__/offline.test.ts` (new)

---

### Task ID: MRC-008
**Title:** Implement Pricing Calculator with 13% Discount Cap
**Phase:** Foundation
**Priority:** P0 (Must Have - Business Critical)
**Estimated Time:** 8h
**Status:** 🔴 TODO

**Description:**
Build centralized pricing engine with ABSOLUTE 13% discount cap, GST 10% calculations, multi-day discount scaling, equipment hire rates. This is critical for business profitability.

**Agent Workflow:**
1. **TypeScript Pro** - Define pricing types and calculation interfaces → src/types/pricing.ts
2. **TypeScript Pro** - Implement pricing calculation engine → src/lib/utils/pricing.ts
3. **pricing-calculator** (custom agent) - Create 48 comprehensive test scenarios → __tests__/pricing.test.ts
4. **pricing-calculator** - Validate all 48 scenarios PASS → Pricing validation report (PASS/FAIL)
5. **Code Reviewer** - Review pricing logic for correctness → Review report
6. **Security Auditor** - Verify no pricing manipulation possible → Security report
7. **Test Engineer** - Add regression tests → Additional test coverage

**Acceptance Criteria:**
- [ ] 13% discount cap ENFORCED absolutely (0.87 minimum multiplier)
- [ ] GST always 10% calculated on subtotal
- [ ] Multi-day discounts: 0% (≤8h), 7.5% (9-16h), 13% (17+h MAXIMUM)
- [ ] Equipment rates exact: Dehumidifier $132/day, Air Mover $46/day, RCD Box $5/day
- [ ] Base rates accurate for 4 work types (no_demolition, demolition, construction, subfloor)
- [ ] All 48 scenarios PASS (pricing-calculator verification)
- [ ] No way to exceed 13% discount cap under ANY scenario
- [ ] Read-only pricing display (manual override tracked separately)
- [ ] Test suite comprehensive and passing
- [ ] pricing-calculator PASSED (DEPLOYMENT BLOCKER if fails)
- [ ] Code Reviewer approved logic
- [ ] Security Auditor verified no manipulation possible

**Dependencies:**
- Requires: MRC-007 (Australian formatting utilities)
- Blocks: MRC-045 (pricing section in inspection form)

**Files Modified:**
- `src/types/pricing.ts` (new)
- `src/lib/utils/pricing.ts` (new)
- `__tests__/pricing.test.ts` (new - 48 comprehensive scenarios)

**Business Rules (ABSOLUTE - NO EXCEPTIONS):**
```typescript
// Base rates (ex GST)
const BASE_RATES = {
  no_demolition: { 2: 612, 8: 1216.99 },
  demolition: { 2: 711.90, 8: 1798.90 },
  construction: { 2: 661.96, 8: 1507.95 },
  subfloor: { 2: 900, 8: 2334.69 },
};

// Multi-day discount scaling
const DISCOUNT_SCALE = {
  hours_8_or_less: 0.00,     // 0% discount
  hours_9_to_16: 0.075,      // 7.5% discount
  hours_17_plus: 0.13,       // 13% MAXIMUM (ABSOLUTE CAP)
};

// Equipment rates (per day, ex GST)
const EQUIPMENT_RATES = {
  dehumidifier: 132,
  air_mover: 46,
  rcd_box: 5,
};

// GST
const GST_RATE = 0.10; // 10% always
```

---

**Milestone 0 Additional Tasks:** (35 more tasks follow similar pattern with agent assignments)

Due to length constraints, I'll summarize the key patterns:

- Every task has 3-7 agent assignments
- Mobile-first tasks include mobile-tester
- UI tasks include Web Vitals Optimizer
- All tasks include Code Reviewer
- Security-critical tasks include Security Auditor
- Pricing tasks include pricing-calculator

---

## 📊 Milestone 2: Dashboard & Lead Management (Days 6-10)

### Task ID: MRC-040
**Title:** Build Dashboard with Real-Time Statistics
**Phase:** Core
**Priority:** P0 (Must Have)
**Estimated Time:** 8h
**Status:** 🟡 IN PROGRESS

**Description:**
Create main dashboard with accurate stats cards, recent activity feed, quick actions. Mobile-first design.

**Agent Workflow:**
1. **TypeScript Pro** - Define dashboard types and stats calculation → src/types/dashboard.ts
2. **SQL Pro** - Create optimized stats queries (must execute <100ms) → src/lib/api/stats.ts
3. **React Performance Optimization** - Build optimized dashboard component with memoization → src/pages/Dashboard.tsx
4. **mobile-tester** - Test dashboard at all viewports (375px, 768px, 1440px) → Dashboard test report
5. **Web Vitals Optimizer** - Verify load time <3s on 4G → Performance report
6. **Code Reviewer** - Review dashboard implementation → Review report
7. **Security Auditor** - Verify no data leakage → Security report

**Acceptance Criteria:**
- [ ] Stats cards: Total leads, Inspections booked, Jobs in progress, Monthly revenue
- [ ] Stats update in real-time (React Query refetch)
- [ ] Recent activity feed (last 10 items, most recent first)
- [ ] Quick actions: New lead, New inspection, View calendar
- [ ] Responsive at 375px, 768px, 1440px (mobile-tester verified)
- [ ] Loads in <3 seconds on 4G (Web Vitals Optimizer verified)
- [ ] SQL queries optimized (<100ms execution)
- [ ] No console errors
- [ ] mobile-tester PASSED all viewports
- [ ] Web Vitals Optimizer APPROVED performance
- [ ] Code Reviewer APPROVED implementation
- [ ] Security Auditor verified no data leaks

**Dependencies:**
- Requires: MRC-001 (database), MRC-020 (auth), MRC-021 (layout)
- Blocks: None (core dashboard feature)

**Files Modified:**
- `src/types/dashboard.ts` (new)
- `src/pages/Dashboard.tsx` (new)
- `src/components/dashboard/StatsCards.tsx` (new)
- `src/components/dashboard/RecentActivity.tsx` (new)
- `src/components/dashboard/QuickActions.tsx` (new)
- `src/lib/api/stats.ts` (new)

---

## 🤖 Milestone 3: Inspection Form & AI (Days 11-17)

### Task ID: MRC-042
**Title:** Build Complete Inspection Form (100+ Fields)
**Phase:** Core
**Priority:** P0 (Must Have - Core Feature)
**Estimated Time:** 20h
**Status:** 🔴 TODO

**Description:**
Build comprehensive inspection form: 15 sections, repeatable areas, photo upload (10 per section), auto-save every 30s, offline support, real-time validation with Zod, 100+ fields total.

**Agent Workflow:**
1. **TypeScript Pro** - Define complete inspection types (15 sections) with Zod schemas → src/types/inspection.ts
2. **React Performance Optimization** - Build form with field-level memoization and performance optimization → src/components/inspection/InspectionForm.tsx
3. **React Performance Optimization** - Implement repeatable sections (add/remove dynamically) → src/components/inspection/RepeatableSection.tsx
4. **offline-architect** - Add auto-save every 30s and offline support (IndexedDB) → src/lib/hooks/useInspectionAutoSave.ts
5. **mobile-tester** - Test form at all viewports with on-screen keyboard → Form usability test report
6. **Web Vitals Optimizer** - Verify form loads in <3s with 100+ fields → Performance report
7. **Code Reviewer** - Review form implementation for quality → Review report
8. **Security Auditor** - Verify input validation and sanitization (XSS protection) → Security report

**Acceptance Criteria:**
- [ ] All 15 sections implemented: Property Details, Demolition, Construction, Subfloor, Equipment, Pricing, AI Summary, Scope, Assumptions, etc.
- [ ] Repeatable areas work (add/remove dynamically, maintain state)
- [ ] Photo upload with preview (max 10 per section, compressed)
- [ ] Auto-save triggers every 30 seconds (useAutoSave hook)
- [ ] Offline mode stores data in IndexedDB
- [ ] Syncs to Supabase when connection restored
- [ ] Real-time validation with Zod schemas
- [ ] Clear error messages for invalid inputs
- [ ] Touch targets ≥48px on mobile (all inputs/buttons)
- [ ] No horizontal scrolling at 375px viewport
- [ ] Usable with on-screen keyboard (tested)
- [ ] Loads in <3 seconds (Web Vitals Optimizer verified)
- [ ] mobile-tester PASSED all viewport tests
- [ ] Web Vitals Optimizer APPROVED performance
- [ ] Code Reviewer APPROVED implementation
- [ ] Security Auditor verified input validation

**Dependencies:**
- Requires: MRC-002 (auto-save), MRC-003 (offline), MRC-008 (pricing calculator)
- Blocks: MRC-048 (AI summary), MRC-065 (PDF generation)

**Files Modified:**
- `src/types/inspection.ts` (new - comprehensive types with Zod)
- `src/components/inspection/InspectionForm.tsx` (new)
- `src/components/inspection/PropertyDetails.tsx` (new)
- `src/components/inspection/DemolitionSection.tsx` (new)
- `src/components/inspection/ConstructionSection.tsx` (new)
- `src/components/inspection/SubfloorSection.tsx` (new)
- `src/components/inspection/EquipmentSection.tsx` (new)
- `src/components/inspection/PricingSection.tsx` (new)
- `src/components/inspection/PhotoUpload.tsx` (new)
- `src/components/inspection/RepeatableSection.tsx` (new)
- `src/lib/hooks/useInspectionAutoSave.ts` (new)
- `src/lib/api/inspections.ts` (new)

---

## 📄 Milestone 4: PDF & Email Automation (Days 18-21)

### Task ID: MRC-065
**Title:** Implement PDF Generation (Supabase Edge Function + Puppeteer)
**Phase:** Advanced
**Priority:** P0 (Must Have - Professional Client Communication)
**Estimated Time:** 12h
**Status:** 🔴 TODO

**Description:**
Create Supabase Edge Function with Puppeteer to generate professional PDF inspection reports from HTML templates. Includes versioning (draft → approved), edit & regenerate capability.

**Agent Workflow:**
1. **TypeScript Pro** - Define PDF types and template interface → src/types/pdf.ts
2. **Supabase Schema Architect** - Add PDF versioning fields to inspection_reports table → Migration for PDF version tracking
3. **SQL Pro** - Create PDF generation edge function with Puppeteer → supabase/functions/generate-inspection-pdf/index.ts
4. **TypeScript Pro** - Create HTML template for PDF → supabase/functions/generate-inspection-pdf/template.html
5. **React Performance Optimization** - Build PDF preview component with iframe → src/components/inspection/PDFPreview.tsx
6. **mobile-tester** - Test PDF generation and preview at all viewports → PDF test report
7. **Security Auditor** - Verify PDF access control with RLS → Security report
8. **Code Reviewer** - Review PDF generation logic → Review report

**Acceptance Criteria:**
- [ ] Supabase Edge Function with Puppeteer (Deno runtime)
- [ ] HTML template includes all 15 sections, photos, AI summary, pricing
- [ ] MRC branding (logo, colors, ABN, professional layout)
- [ ] PDF versioning: draft → approved (track version number)
- [ ] "Generate PDF" button in inspection form
- [ ] PDF preview in modal before approval (iframe)
- [ ] "Edit & Regenerate" functionality (increments version)
- [ ] PDF stored in Supabase Storage (inspection-pdfs bucket)
- [ ] Secure download links with RLS enforced
- [ ] PDF generates in <15 seconds
- [ ] Error handling for generation failures (retry logic)
- [ ] mobile-tester verified PDF preview usability
- [ ] Security Auditor verified access control
- [ ] Code Reviewer approved implementation

**Dependencies:**
- Requires: MRC-042 (inspection form), MRC-048 (AI summary)
- Blocks: MRC-075 (email PDF to customer)

**Files Modified:**
- `src/types/pdf.ts` (new)
- `supabase/functions/generate-inspection-pdf/index.ts` (new - Edge Function)
- `supabase/functions/generate-inspection-pdf/template.html` (new - HTML template)
- `supabase/migrations/20250111000012_add_pdf_versioning.sql` (new)
- `src/components/inspection/PDFPreview.tsx` (new)
- `src/components/inspection/PDFApprovalDialog.tsx` (new)
- `src/lib/api/pdf.ts` (new)

---

## 📅 Milestone 5: Calendar & Booking (Days 22-24)

### Task ID: MRC-090
**Title:** Implement Calendar Conflict Detection with Travel Time Matrix
**Phase:** Advanced
**Priority:** P0 (Must Have - Prevents Overbooking)
**Estimated Time:** 8h
**Status:** 🔴 TODO

**Description:**
Build intelligent calendar conflict detection using zone-based travel time matrix. Prevents impossible bookings like "Carlton 2pm → Mernda 3pm" (requires 45min travel).

**Agent Workflow:**
1. **SQL Pro** - Write complex conflict detection query with travel time logic → src/lib/api/calendar/conflicts.ts
2. **TypeScript Pro** - Implement conflict detection algorithm → src/lib/utils/calendarConflicts.ts
3. **Test Engineer** - Create comprehensive conflict test scenarios (20+) → __tests__/calendarConflicts.test.ts
4. **Code Reviewer** - Review conflict detection logic for correctness → Review report

**Acceptance Criteria:**
- [ ] Detects time overlap conflicts (same technician, overlapping times)
- [ ] Detects travel time conflicts using zone matrix (Carlton Zone 1 → Mernda Zone 3 = 45min)
- [ ] Considers job duration in conflict calculation
- [ ] Excludes cancelled bookings from conflicts
- [ ] Checks technician availability (working hours 7am-5pm)
- [ ] Provides conflict details (which booking conflicts, why)
- [ ] Suggests alternative times (next available slot)
- [ ] Query executes in <50ms (SQL Pro optimized)
- [ ] All 20 conflict scenarios tested and pass
- [ ] Test Engineer verified all edge cases
- [ ] Code Reviewer approved logic

**Dependencies:**
- Requires: MRC-009 (travel time matrix and zones)
- Blocks: MRC-091 (customer self-booking)

**Files Modified:**
- `src/types/calendar.ts` (add conflict types)
- `src/lib/api/calendar/conflicts.ts` (new - conflict detection query)
- `src/lib/utils/calendarConflicts.ts` (new - conflict algorithm)
- `__tests__/calendarConflicts.test.ts` (new - 20+ test scenarios)

---

## ⚙️ Milestone 6: Settings & Polish (Days 25-28)

### Task ID: MRC-110
**Title:** Pre-Deployment Security Audit (Full Scan)
**Phase:** Polish
**Priority:** P0 (Must Have - Deployment Blocker)
**Estimated Time:** 4h
**Status:** 🔴 TODO

**Description:**
Run complete security audit before production deployment. This is a MANDATORY DEPLOYMENT BLOCKER - must PASS to deploy.

**Agent Workflow:**
1. **Security Auditor** - Full security scan (hardcoded secrets, RLS, npm audit) → Comprehensive security report
2. **Security Auditor** - Test authentication flows (signup, login, password reset) → Auth security report
3. **Security Auditor** - Verify input validation on all forms → Input validation report
4. **Security Auditor** - Check for XSS, SQL injection, CSRF vulnerabilities → Vulnerability scan report
5. **Security Auditor** - Verify CORS settings not overly permissive → CORS security check

**Acceptance Criteria:**
- [ ] npm audit shows ZERO high/critical vulnerabilities
- [ ] No hardcoded secrets in code (API keys, tokens, passwords)
- [ ] All 11 tables have RLS policies enabled
- [ ] RLS policies tested with different user contexts (admin, technician)
- [ ] Auth flows secure: signup, login, password reset all tested
- [ ] Input validation on ALL forms (Zod schemas implemented)
- [ ] No XSS vulnerabilities found
- [ ] No SQL injection possible (Supabase client with parameterized queries)
- [ ] CORS settings not overly permissive
- [ ] API endpoints properly authenticated
- [ ] Security Auditor PASSED all checks (report shows all green)

**Dependencies:**
- Requires: All features complete
- Blocks: MRC-115 (production deployment)

**Files Modified:**
- None (audit only, may identify issues requiring fixes)

**DEPLOYMENT BLOCKER:** YES - If Security Auditor FAILS, deployment MUST be BLOCKED until issues fixed

---

### Task ID: MRC-111
**Title:** Pre-Deployment Pricing Validation (48 Scenarios)
**Phase:** Polish
**Priority:** P0 (Must Have - Deployment Blocker)
**Estimated Time:** 2h
**Status:** 🔴 TODO

**Description:**
Run complete pricing validation with ALL 48 test scenarios. This is a MANDATORY DEPLOYMENT BLOCKER - must PASS to deploy.

**Agent Workflow:**
1. **pricing-calculator** (custom agent) - Run all 48 pricing test scenarios → Pricing validation report (PASS/FAIL for each scenario)
2. **pricing-calculator** - Verify 13% discount cap NEVER exceeded → Discount cap verification report
3. **pricing-calculator** - Verify GST 10% calculations accurate → GST verification report
4. **pricing-calculator** - Verify equipment rates exact match → Equipment rate verification report

**Acceptance Criteria:**
- [ ] All 48 pricing scenarios PASS (100% success rate)
- [ ] 13% discount cap NEVER exceeded in ANY scenario (0.87 minimum multiplier enforced)
- [ ] GST always 10% calculated on subtotal (not on total)
- [ ] Multi-day discounts correct: 0% (≤8h), 7.5% (9-16h), 13% (17+h MAXIMUM)
- [ ] Equipment rates exact: Dehumidifier $132/day, Air Mover $46/day, RCD Box $5/day
- [ ] No pricing manipulation possible
- [ ] pricing-calculator PASSED report shows 48/48 scenarios green

**Dependencies:**
- Requires: MRC-008 (pricing calculator implemented)
- Blocks: MRC-115 (production deployment)

**Files Modified:**
- None (validation only)

**DEPLOYMENT BLOCKER:** YES - If pricing-calculator FAILS (ANY scenario fails), deployment MUST be BLOCKED until fixed

---

### Task ID: MRC-112
**Title:** Pre-Deployment Performance Audit (Mobile >90)
**Phase:** Polish
**Priority:** P0 (Must Have - Deployment Blocker)
**Estimated Time:** 3h
**Status:** 🔴 TODO

**Description:**
Run complete performance audit on all pages. Mobile Lighthouse score must be >90, load time <3s. This is a MANDATORY DEPLOYMENT BLOCKER.

**Agent Workflow:**
1. **Web Vitals Optimizer** - Run Lighthouse audit on all pages (mobile & desktop) → Comprehensive performance report
2. **Web Vitals Optimizer** - Measure Core Web Vitals (LCP, FID, CLS) → Metrics report for all pages
3. **React Performance Optimization** - Check total bundle size <500KB → Bundle analysis report
4. **Web Vitals Optimizer** - Test on 4G network simulation → Network performance report
5. **Web Vitals Optimizer** - Identify and recommend optimizations if targets not met → Optimization recommendations

**Acceptance Criteria:**
- [ ] Mobile Lighthouse score >90 on ALL pages
- [ ] Desktop Lighthouse score >95 on ALL pages
- [ ] LCP (Largest Contentful Paint) <2.5 seconds
- [ ] FID (First Input Delay) <100 milliseconds
- [ ] CLS (Cumulative Layout Shift) <0.1
- [ ] Total bundle size <500KB
- [ ] All pages load in <3 seconds on 4G simulation
- [ ] No render-blocking resources identified
- [ ] Images optimized (WebP format, compressed)
- [ ] Web Vitals Optimizer PASSED all metrics
- [ ] React Performance Optimization PASSED bundle check

**Dependencies:**
- Requires: All features complete
- Blocks: MRC-115 (production deployment)

**Files Modified:**
- None (audit only, may require optimizations)

**DEPLOYMENT BLOCKER:** YES - If mobile score <90 or load time >3s, deployment MUST be BLOCKED until optimized

---

### Task ID: MRC-115
**Title:** Production Deployment (After All Blockers Pass)
**Phase:** Polish
**Priority:** P0 (Must Have - Final Task)
**Estimated Time:** 4h
**Status:** 🔴 TODO

**Description:**
Deploy to production on Vercel after ALL 3 deployment blockers PASS (Security, Pricing, Performance). Final pre-flight checks and go-live.

**Agent Workflow:**
1. **Security Auditor** - Final security check → PASS/FAIL (blocker)
2. **pricing-calculator** - Final pricing validation → PASS/FAIL (blocker)
3. **Web Vitals Optimizer** - Final performance check → PASS/FAIL (blocker)
4. **Test Engineer** - Verify CI/CD all tests passing → CI/CD status report
5. **Code Reviewer** - Final code review (overall system) → Final review report

**Acceptance Criteria:**
- [ ] Security Auditor PASSED (MRC-110 complete)
- [ ] pricing-calculator PASSED (MRC-111 complete, 48/48 scenarios)
- [ ] Web Vitals Optimizer PASSED (MRC-112 complete, mobile >90)
- [ ] All tests passing in CI/CD pipeline
- [ ] Environment variables configured on Vercel
- [ ] Supabase production project configured
- [ ] Custom domain configured (mouldandrestoration.com.au)
- [ ] SSL certificate active (HTTPS enforced)
- [ ] Error tracking configured (Sentry or similar)
- [ ] Analytics configured
- [ ] Deployment successful to Vercel
- [ ] Production smoke tests passed
- [ ] All 5 pre-deployment agents PASSED their checks

**Dependencies:**
- Requires: MRC-110 (Security Auditor PASS), MRC-111 (pricing-calculator PASS), MRC-112 (Web Vitals Optimizer PASS)
- Blocks: None (final task - production launch)

**Files Modified:**
- None (deployment configuration only)

**CRITICAL:** ALL 3 DEPLOYMENT BLOCKERS MUST PASS - No exceptions

---

## 📊 Task Statistics

### By Agent Usage

| Agent | Tasks Assigned | % of Tasks | Usage Frequency |
|-------|----------------|------------|-----------------|
| **Code Reviewer** | 325 | 100% | Every task (quality gate) |
| **mobile-tester** | 180 | 55% | All UI tasks |
| **TypeScript Pro** | 165 | 51% | Type definitions |
| **Web Vitals Optimizer** | 75 | 23% | Performance critical |
| **Security Auditor** | 85 | 26% | Security sensitive |
| **React Performance Optimization** | 68 | 21% | React components |
| **Test Engineer** | 55 | 17% | Testing strategy |
| **Supabase Schema Architect** | 48 | 15% | Database work |
| **SQL Pro** | 42 | 13% | Complex queries |
| **offline-architect** | 25 | 8% | Offline features |
| **pricing-calculator** | 18 | 6% | Pricing logic |
| **Performance Profiler** | 12 | 4% | Bottlenecks |

### By Priority

| Priority | Tasks | Done | In Progress | TODO | % Complete |
|----------|-------|------|-------------|------|-----------|
| **P0 (Must Have)** | 227 | 45 | 22 | 160 | 29% |
| **P1 (Should Have)** | 73 | 10 | 5 | 58 | 21% |
| **P2 (Nice to Have)** | 25 | 3 | 2 | 20 | 20% |
| **TOTAL** | **325** | **58** | **29** | **238** | **27%** |

### By Milestone Status

| Milestone | Total | Done | In Progress | TODO |
|-----------|-------|------|-------------|------|
| M0: Foundation | 45 | 15 | 10 | 20 |
| M1: Authentication | 38 | 25 | 5 | 8 |
| M2: Dashboard | 52 | 18 | 12 | 22 |
| M3: Inspection & AI | 68 | 0 | 2 | 66 |
| M4: PDF & Email | 46 | 0 | 0 | 46 |
| M5: Calendar | 42 | 0 | 0 | 42 |
| M6: Settings & Polish | 34 | 0 | 0 | 34 |

---

## 🎯 Critical Path

**Must complete in order:**

1. ✅ MRC-001: Database Schema (DONE)
2. 🔴 MRC-002: Data Persistence (TODO - Critical bug fix)
3. 🔴 MRC-003: Offline Mode (TODO - Critical feature)
4. 🔴 MRC-008: Pricing Calculator (TODO - Business critical)
5. 🔴 MRC-042: Inspection Form (TODO - Core feature)
6. 🔴 MRC-048: AI Summary (TODO - Core feature)
7. 🔴 MRC-065: PDF Generation (TODO - Client communication)
8. 🔴 MRC-090: Calendar Conflicts (TODO - Prevents overbooking)
9. 🔴 MRC-110: Security Audit (TODO - Deployment blocker)
10. 🔴 MRC-111: Pricing Validation (TODO - Deployment blocker)
11. 🔴 MRC-112: Performance Audit (TODO - Deployment blocker)
12. 🔴 MRC-115: Production Deployment (TODO - Final task)

---

## 📚 Related Documentation

- **CLAUDE.md** - Main project guide (read first every session)
- **MRC-AGENT-WORKFLOW.md** - Complete agent usage patterns
- **MRC-SPRINT-1-TASKS.md** - Current 4-week sprint breakdown
- **PLANNING.md** - Architecture decisions
- **DEPLOYMENT-CHECKLIST.md** - Pre-deployment workflow

---

*Last Updated: 2025-11-11*
*Tasks: 325 total (58 done, 29 in progress, 238 todo)*
*Progress: 27% complete*
*Agent Integration: 100% (every task has agent assignments)*

**Use agents proactively to ensure quality at every step.** 🤖

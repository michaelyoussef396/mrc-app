# 🗓️ MRC PRIORITY ROADMAP - Execution Schedule

**Plan Date:** November 17, 2025
**Total Effort:** 243 hours (≈12 weeks at 20h/week)
**Completion Target:** February 2026

---

## 📋 HOW TO USE THIS ROADMAP

1. **Follow the weekly schedule sequentially**
2. **Check dependencies before starting each item**
3. **Mark items complete when all success criteria met**
4. **Review progress at end of each week**
5. **Adjust timeline based on actual velocity**

---

## 🎯 MILESTONE OVERVIEW

| Milestone | Target Date | Key Deliverables | Status |
|-----------|-------------|------------------|--------|
| **Sprint 1: Foundation** | Week 1-2 | Code splitting, Section 3 started | 🟡 Pending |
| **Sprint 2: Core Features** | Week 3-5 | Section 3 complete, TypeScript strict | 🟡 Pending |
| **Sprint 3: Quality & Reliability** | Week 6-8 | Tests 60%, Offline mode | 🟡 Pending |
| **Sprint 4: Business Value** | Week 9-11 | PDF, Pricing, Email automation | 🟡 Pending |
| **Sprint 5: Polish & Optimization** | Week 12-14 | Performance, Documentation | 🟡 Pending |
| **Future Enhancements** | Month 4+ | Analytics, SMS, Dark mode | 🔵 Backlog |

---

## 🚀 WEEK 1: QUICK WINS + FOUNDATION (24 hours)

**Goal:** Start with high-impact, low-effort items to build momentum

### Day 1-2: Code Splitting & Performance (4 hours)
- **Item:** #4 - Implement Code Splitting (Lazy Loading)
- **Impact:** 🔴 MEDIUM (Performance)
- **Effort:** 4 hours
- **Dependencies:** None
- **Why First:** Quick win, immediate performance improvement

**Tasks:**
- [ ] Convert all 31 route imports to lazy loading
- [ ] Wrap routes in `<Suspense>` with loading fallback
- [ ] Install and configure `rollup-plugin-visualizer`
- [ ] Run build and analyze bundle sizes
- [ ] Verify initial bundle <500KB gzipped

**Success Criteria:**
- ✅ All routes use `lazy()`
- ✅ Initial bundle <500KB (gzipped)
- ✅ Individual route chunks <200KB each
- ✅ TTI <3s on 4G

**End of Day 2:** ✅ Code splitting complete, app loads faster

---

### Day 3-5: Start Section 3 (Phase 1) (16 hours)
- **Item:** #1 - Complete Section 3: Area Inspections + Photo Upload (Part 1)
- **Impact:** 🔴 BUSINESS CRITICAL
- **Effort:** 16 hours (Phase 1 of 2)
- **Dependencies:** None

**Phase 1 Tasks (Week 1):**
- [ ] Create `Section3_Areas.tsx` container component
  - [ ] Set up `useFieldArray` for repeatable areas
  - [ ] "Add Area" button
  - [ ] "Remove Area" button
  - [ ] Basic form structure
- [ ] Create `AreaCard.tsx` individual area form
  - [ ] All form fields (area name, temp, humidity)
  - [ ] Moisture locations input
  - [ ] Photo upload placeholder (UI only)
- [ ] Create `MoistureReadingTable.tsx`
  - [ ] Display moisture readings in table
  - [ ] Mobile-responsive (375px)

**Success Criteria (Week 1):**
- ✅ Can add/remove multiple areas
- ✅ Form fields working (no photo upload yet)
- ✅ Data structure correct
- ✅ Mobile-responsive (375px)
- ✅ Touch targets ≥48px

**End of Week 1:** ✅ 24 hours invested, 2 items in progress

---

## 🔧 WEEK 2: SECTION 3 COMPLETION (20 hours)

**Goal:** Complete Section 3 with photo upload functionality

### Day 1-5: Section 3 (Phase 2) - Photo Upload (20 hours)
- **Item:** #1 - Complete Section 3 (Phase 2) + #6 - Photo Upload
- **Impact:** 🔴 BUSINESS CRITICAL
- **Effort:** 20 hours combined
- **Dependencies:** Section 3 Phase 1 complete

**Phase 2 Tasks (Week 2):**
- [ ] Create `PhotoUpload.tsx` component
  - [ ] File picker (mobile camera integration)
  - [ ] Image compression before upload
  - [ ] Display photos in 2-column grid
  - [ ] Delete photo button
  - [ ] Min 4 photos validation
- [ ] Create Supabase Storage bucket
  - [ ] Bucket name: `inspection-photos`
  - [ ] RLS policies configured
  - [ ] Max file size: 10MB
- [ ] Create `src/lib/api/storage.ts`
  - [ ] `uploadPhoto(file, areaId)` function
  - [ ] `deletePhoto(photoId)` function
  - [ ] `compressImage(file)` function
- [ ] Create `src/lib/api/inspectionAreas.ts`
  - [ ] `createArea(inspectionId, data)`
  - [ ] `updateArea(areaId, data)`
  - [ ] `deleteArea(areaId)`
  - [ ] `loadAreas(inspectionId)`
- [ ] Integrate photo upload with AreaCard
- [ ] Save photo URLs to `photos` table
- [ ] Test auto-save functionality

**Success Criteria:**
- ✅ Photos upload to Supabase Storage
- ✅ Photo URLs saved to `photos` table
- ✅ Area data saved to `inspection_areas` table
- ✅ Data persists after page reload
- ✅ Min 4 photos per area enforced
- ✅ Delete photo works (storage + database)
- ✅ Mobile-first (375px, touch targets ≥48px)
- ✅ Image compression working

**End of Week 2:** ✅ 44 hours total, Section 3 COMPLETE 🎉

---

## 💪 WEEK 3-4: TYPESCRIPT STRICT MODE (20 hours)

**Goal:** Enable strict mode for type safety and code quality

### Week 3: TypeScript Strict Mode (Phase 1) (12 hours)
- **Item:** #3 - Enable TypeScript Strict Mode (Part 1)
- **Impact:** 🔴 HIGH (Code Quality)
- **Effort:** 12 hours (Phase 1 of 2)
- **Dependencies:** None

**Phase 1 Tasks (Week 3):**
- [ ] Update `tsconfig.json` with strict mode flags
  ```json
  {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
  ```
- [ ] Fix type errors incrementally:
  - [ ] `src/types/` - Define all interfaces properly (2h)
  - [ ] `src/lib/` - Utilities and helpers (3h)
  - [ ] `src/hooks/` - Custom hooks (3h)
  - [ ] `src/components/ui/` - UI components (4h)

**Success Criteria (Week 3):**
- ✅ `strict: true` in tsconfig.json
- ✅ 50% of codebase type-safe
- ✅ All utilities and hooks typed

---

### Week 4: TypeScript Strict Mode (Phase 2) (8 hours)
- **Item:** #3 - Enable TypeScript Strict Mode (Part 2)
- **Impact:** 🔴 HIGH (Code Quality)
- **Effort:** 8 hours (Phase 2 of 2)
- **Dependencies:** Week 3 Phase 1 complete

**Phase 2 Tasks (Week 4):**
- [ ] Continue fixing type errors:
  - [ ] `src/components/` - Domain components (4h)
  - [ ] `src/pages/` - Page components (3h)
  - [ ] Final cleanup and verification (1h)
- [ ] Address common issues:
  - [ ] Replace `any` with proper types
  - [ ] Add null checks: `value?.property`
  - [ ] Define function return types
  - [ ] Type all function parameters
- [ ] Update Supabase query results with type assertions

**Success Criteria (Week 4):**
- ✅ Zero TypeScript errors (`npm run build` succeeds)
- ✅ No `any` types except where truly necessary
- ✅ All null/undefined handled explicitly
- ✅ Unused variables/parameters removed

**End of Week 4:** ✅ 64 hours total, TypeScript strict mode COMPLETE 🎉

---

## 🧪 WEEK 5-7: TEST COVERAGE (40 hours)

**Goal:** Reach 60% test coverage with critical path tests

### Week 5: Testing Infrastructure + Auth Tests (12 hours)
- **Item:** #5 - Add Comprehensive Test Coverage (Phase 1)
- **Impact:** 🔴 HIGH (Quality)
- **Effort:** 12 hours
- **Dependencies:** TypeScript strict mode complete

**Tasks:**
- [ ] Install testing dependencies (1h)
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
  ```
- [ ] Configure Vitest (2h)
  - [ ] Create `vitest.config.ts`
  - [ ] Set up test environment (jsdom)
  - [ ] Configure coverage reporter
- [ ] Write auth flow tests (8h)
  - [ ] Login success/failure
  - [ ] Forgot password flow
  - [ ] Session refresh
  - [ ] Logout
  - [ ] Protected route access
- [ ] Set up CI/CD integration (1h)
  - [ ] Run tests on every commit

**Success Criteria:**
- ✅ Testing infrastructure configured
- ✅ All auth flows tested
- ✅ Tests run in <30 seconds
- ✅ Coverage: ~15%

---

### Week 6: Critical Path Tests (14 hours)
- **Item:** #5 - Add Comprehensive Test Coverage (Phase 2)
- **Impact:** 🔴 HIGH (Quality)
- **Effort:** 14 hours
- **Dependencies:** Week 5 complete

**Tasks:**
- [ ] Lead creation tests (6h)
  - [ ] HiPages lead form validation
  - [ ] Direct lead form validation
  - [ ] Lead creation API call
  - [ ] Success/error handling
- [ ] Inspection form tests (8h)
  - [ ] Section 1 validation
  - [ ] Section 2 validation
  - [ ] Section 3 area creation
  - [ ] Photo upload
  - [ ] Auto-save logic

**Success Criteria:**
- ✅ Lead creation fully tested
- ✅ Inspection form fully tested
- ✅ Coverage: ~35%

---

### Week 7: Component & Integration Tests (14 hours)
- **Item:** #5 - Add Comprehensive Test Coverage (Phase 3)
- **Impact:** 🔴 HIGH (Quality)
- **Effort:** 14 hours
- **Dependencies:** Week 6 complete

**Tasks:**
- [ ] Dashboard tests (4h)
  - [ ] Stats calculation
  - [ ] Data fetching
  - [ ] Loading states
  - [ ] Error states
- [ ] Notification tests (4h)
  - [ ] Real-time updates
  - [ ] Mark as read
  - [ ] Delete notification
- [ ] Component tests (6h)
  - [ ] Button components
  - [ ] Form inputs
  - [ ] Cards and lists
  - [ ] Modals/dialogs

**Success Criteria:**
- ✅ 60%+ code coverage
- ✅ All critical paths tested
- ✅ CI/CD blocks merge if tests fail
- ✅ Coverage badge in README.md

**End of Week 7:** ✅ 104 hours total, ALL CRITICAL ITEMS COMPLETE 🎉🎉

---

## 🌐 WEEK 8-9: OFFLINE MODE (24 hours)

**Goal:** Implement offline-first functionality for field technicians

### Week 8: Offline Infrastructure (12 hours)
- **Item:** #2 - Implement Offline Mode (Phase 1)
- **Impact:** 🔴 BUSINESS CRITICAL
- **Effort:** 12 hours
- **Dependencies:** None

**Tasks:**
- [ ] Set up Vite PWA plugin (2h)
  - [ ] Install `vite-plugin-pwa`
  - [ ] Configure `vite.config.ts`
  - [ ] Define cache strategies
- [ ] Implement service worker (6h)
  - [ ] Cache static assets (JS, CSS, images)
  - [ ] Cache API responses (stale-while-revalidate)
  - [ ] Background sync registration
- [ ] Implement IndexedDB wrapper (4h)
  - [ ] Create `src/lib/offline/db.ts`
  - [ ] Define schemas for leads, inspections
  - [ ] CRUD operations

**Success Criteria (Week 8):**
- ✅ Service worker registered
- ✅ Static assets cached
- ✅ IndexedDB set up
- ✅ App loads when offline

---

### Week 9: Offline Queue & Sync (12 hours)
- **Item:** #2 - Implement Offline Mode (Phase 2)
- **Impact:** 🔴 BUSINESS CRITICAL
- **Effort:** 12 hours
- **Dependencies:** Week 8 complete

**Tasks:**
- [ ] Implement offline queue processing (8h)
  - [ ] Create `src/lib/offline/sync.ts`
  - [ ] Queue mutations when offline
  - [ ] Process queue on reconnect
  - [ ] Handle conflicts (last-write-wins)
  - [ ] Update `offline_queue` table
- [ ] Add offline indicators (2h)
  - [ ] Banner: "You're offline - changes will sync when online"
  - [ ] Sync status icons
  - [ ] Queue count display
- [ ] Auto-save enhancement (2h)
  - [ ] Save to IndexedDB every 30 seconds
  - [ ] Debounce to avoid excessive writes

**Success Criteria:**
- ✅ Can create leads offline
- ✅ Can fill inspection form offline
- ✅ Data saves to IndexedDB
- ✅ Queue syncs when back online
- ✅ No data loss
- ✅ User sees offline indicator
- ✅ Conflict resolution works

**End of Week 9:** ✅ 140 hours total, Offline mode COMPLETE 🎉

---

## 📊 WEEK 10-11: HIGH PRIORITY FEATURES (28 hours)

**Goal:** Complete high-value business features

### Week 10: PDF Generation + Pricing Logic (24 hours)
- **Item:** #7 - PDF Report Generation (16h) + #8 - Quote Pricing Logic (12h start)
- **Impact:** 🟡 HIGH (Productivity + Revenue)
- **Effort:** 16h + 8h = 24 hours
- **Dependencies:** Section 3 complete (photos needed in PDF)

**PDF Tasks (16 hours):**
- [ ] Choose PDF approach (server-side recommended) (1h)
- [ ] Create HTML template (4h)
  - [ ] MRC branding
  - [ ] Property details
  - [ ] Area inspections with photos
  - [ ] Moisture readings table
  - [ ] Recommendations
- [ ] Implement Supabase Edge Function (8h)
  - [ ] `generate-inspection-pdf`
  - [ ] Fetch data from database
  - [ ] Render HTML template
  - [ ] Convert to PDF with Puppeteer
  - [ ] Upload to Storage `inspection-pdfs`
- [ ] Create UI trigger (2h)
  - [ ] "Generate Report" button
  - [ ] Loading state
  - [ ] Download link
- [ ] Store PDF metadata (1h)
  - [ ] Add `pdf_url` to inspections table

**Pricing Tasks (8 hours - Part 1):**
- [ ] Define pricing configuration (3h)
  - [ ] Create `src/lib/pricing/rates.ts`
  - [ ] Work types + hourly rates
  - [ ] Equipment rates
- [ ] Implement discount logic (3h)
  - [ ] Multi-day discount tiers
  - [ ] Enforce 13% cap
- [ ] Start quote calculation (2h)
  - [ ] Basic calculation structure

**Success Criteria (Week 10):**
- ✅ PDF generated from inspection data
- ✅ Includes all sections + photos
- ✅ Professional formatting
- ✅ Download/email functionality
- ✅ Generation time <30 seconds
- ✅ Pricing configuration defined

---

### Week 11: Pricing Logic Completion (12 hours)
- **Item:** #8 - Quote Pricing Logic (Part 2)
- **Impact:** 🟡 HIGH (Revenue)
- **Effort:** 12 hours
- **Dependencies:** Week 10 pricing work

**Tasks:**
- [ ] Complete quote calculation (4h)
  - [ ] Labour cost calculation
  - [ ] Equipment cost calculation
  - [ ] Travel cost from `suburb_zones`
  - [ ] Subtotal, discount, GST, total
- [ ] Create pricing validation tests (4h)
  - [ ] Test 13% cap enforced
  - [ ] Test multi-day discount tiers
  - [ ] Test equipment rates
  - [ ] Test GST calculation (10%)
- [ ] Integrate with quote form (4h)
  - [ ] Real-time calculation
  - [ ] Display breakdown
  - [ ] Clear total display

**Success Criteria:**
- ✅ 13% discount cap NEVER exceeded
- ✅ Multi-day discounts correct
- ✅ GST always 10%
- ✅ Equipment rates accurate
- ✅ All pricing test scenarios pass

**End of Week 11:** ✅ 180 hours total, PDF + Pricing COMPLETE 🎉

---

## 🚀 WEEK 12-13: EMAIL & REFACTORING (20 hours)

**Goal:** Automate email communication and improve code maintainability

### Week 12: Email Automation (12 hours)
- **Item:** #9 - Email Automation (Templates + Triggers)
- **Impact:** 🟡 MEDIUM (Productivity)
- **Effort:** 12 hours
- **Dependencies:** None

**Tasks:**
- [ ] Choose email provider (1h)
  - [ ] Recommend: Resend (generous free tier)
- [ ] Create email templates (4h)
  - [ ] Install `@react-email/components`
  - [ ] Quote sent email
  - [ ] Inspection reminder (24h before)
  - [ ] Follow-up email
  - [ ] Invoice sent email
- [ ] Implement Edge Function (4h)
  - [ ] `send-email` function
  - [ ] Render templates
  - [ ] Send via provider API
  - [ ] Log to `email_logs`
- [ ] Connect triggers (2h)
  - [ ] After quote status = 'sent'
  - [ ] After inspection created
  - [ ] 24h before inspection
- [ ] Add manual send option (1h)
  - [ ] "Send Email" button
  - [ ] Email preview

**Success Criteria:**
- ✅ Automated emails send on triggers
- ✅ Email templates professional
- ✅ Emails logged in `email_logs`
- ✅ Delivery status tracked
- ✅ Manual send option works

---

### Week 13: Refactor Large Components (8 hours)
- **Item:** #10 - Refactor Large Components (InspectionForm.tsx)
- **Impact:** 🟡 MEDIUM (Code Quality)
- **Effort:** 8 hours
- **Dependencies:** Section 3 complete

**Tasks:**
- [ ] Analyze `InspectionForm.tsx` (1h)
  - [ ] Count lines
  - [ ] Identify sections
- [ ] Extract sections (4h)
  - [ ] `Section1_PropertyDetails.tsx`
  - [ ] `Section2_ClientInfo.tsx`
  - [ ] `Section4_Recommendations.tsx`
  - [ ] `Section5_Summary.tsx`
  - [ ] (Section 3 already extracted)
- [ ] Create container component (2h)
  - [ ] `InspectionFormContainer.tsx`
  - [ ] Manages form state
  - [ ] Handles auto-save
  - [ ] Progress indicator
- [ ] Extract shared logic (1h)
  - [ ] `useAutoSave()` hook
  - [ ] Validation schemas

**Success Criteria:**
- ✅ No component >250 lines
- ✅ Each section independently testable
- ✅ Shared logic reusable
- ✅ Functionality unchanged
- ✅ Tests pass

**End of Week 13:** ✅ 200 hours total, ALL HIGH PRIORITY COMPLETE 🎉

---

## 🌟 WEEK 14-16: MEDIUM PRIORITY (36 hours)

**Goal:** Improve maintainability, performance, and documentation

### Week 14: API Centralization (12 hours)
- **Item:** #11 - Centralize API Layer
- **Impact:** 🟢 MEDIUM (Maintainability)
- **Effort:** 12 hours
- **Dependencies:** None

**Tasks:**
- [ ] Create API layer structure (2h)
  - [ ] `src/lib/api/leads.ts`
  - [ ] `src/lib/api/inspections.ts`
  - [ ] `src/lib/api/quotes.ts`
  - [ ] `src/lib/api/invoices.ts`
  - [ ] etc.
- [ ] Migrate existing API calls (8h)
  - [ ] Move all `.from('leads')` → `leads.ts`
  - [ ] Move all `.from('inspections')` → `inspections.ts`
  - [ ] Standardize error handling
- [ ] Update components (2h)
  - [ ] Import from API layer
  - [ ] Remove direct Supabase calls

**Success Criteria:**
- ✅ All API calls centralized
- ✅ Consistent error handling
- ✅ Type-safe API functions
- ✅ Easier to mock for testing

---

### Week 15: Performance Optimizations (16 hours)
- **Item:** #12 - Performance Optimizations
- **Impact:** 🟢 MEDIUM (UX)
- **Effort:** 16 hours
- **Dependencies:** Code splitting complete

**Tasks:**
- [ ] Run bundle analyzer (2h)
  - [ ] Identify large dependencies
  - [ ] Consider tree-shaking
- [ ] Add React.memo (4h)
  - [ ] Dashboard stat cards
  - [ ] Lead cards
  - [ ] Inspection sections
- [ ] Add useMemo/useCallback (4h)
  - [ ] Dashboard statistics
  - [ ] Filtered/sorted lists
  - [ ] Event handlers
- [ ] Optimize images (4h)
  - [ ] Compress all images in `src/assets`
  - [ ] Convert to WebP
  - [ ] Lazy loading
- [ ] Set up performance monitoring (2h)
  - [ ] Web Vitals tracking
  - [ ] Monitor LCP, FID, CLS

**Success Criteria:**
- ✅ Bundle size <500KB (gzipped)
- ✅ LCP <2.5s on 4G
- ✅ FID <100ms
- ✅ CLS <0.1
- ✅ No unnecessary re-renders

---

### Week 16: Documentation (8 hours)
- **Item:** #13 - Customize README.md (2h) + #14 - Storybook (6h start)
- **Impact:** 🟢 LOW (Developer Experience)
- **Effort:** 8 hours
- **Dependencies:** None

**README Tasks (2 hours):**
- [ ] Rewrite README.md
  - [ ] Project description
  - [ ] Tech stack
  - [ ] Installation steps
  - [ ] Environment variables
  - [ ] Running locally
  - [ ] Running tests
- [ ] Add badges

**Storybook Tasks (6 hours - Part 1):**
- [ ] Install Storybook (1h)
- [ ] Configure for Vite + React (1h)
- [ ] Write stories for UI components (4h)
  - [ ] Button variants
  - [ ] Input fields
  - [ ] Cards
  - [ ] Modals

**Success Criteria:**
- ✅ README complete and accurate
- ✅ Storybook installed and configured
- ✅ UI component stories written

**End of Week 16:** ✅ 236 hours total, Core Medium Priority COMPLETE 🎉

---

## 📈 WEEK 17-18: ANALYTICS & STORYBOOK (22 hours)

**Goal:** Business intelligence and component documentation

### Week 17: Storybook Completion (8 hours)
- **Item:** #14 - Component Documentation (Storybook) (Part 2)
- **Impact:** 🟢 LOW (Developer Experience)
- **Effort:** 8 hours
- **Dependencies:** Week 16 Storybook setup

**Tasks:**
- [ ] Write stories for domain components (4h)
  - [ ] LeadCard
  - [ ] InspectionJobCard
  - [ ] StatCard
- [ ] Add interaction tests (2h)
  - [ ] Button clicks
  - [ ] Form submissions
  - [ ] Modal open/close
- [ ] Deploy Storybook (2h)
  - [ ] Build static Storybook
  - [ ] Deploy to Vercel/Netlify

**Success Criteria:**
- ✅ All reusable components documented
- ✅ Props documented
- ✅ Variants shown
- ✅ Storybook deployed and accessible

---

### Week 18: Analytics Implementation (12 hours)
- **Item:** #15 - Analytics Implementation
- **Impact:** 🟢 LOW (Business Intelligence)
- **Effort:** 12 hours
- **Dependencies:** None

**Tasks:**
- [ ] Choose analytics provider (1h)
  - [ ] Recommend: PostHog or Plausible
- [ ] Install and configure (2h)
- [ ] Track key events (4h)
  - [ ] Lead created (by source)
  - [ ] Inspection booked
  - [ ] Quote sent
  - [ ] Quote accepted
  - [ ] Invoice paid
- [ ] Set up conversion funnels (2h)
  - [ ] Lead → Inspection → Quote → Won
- [ ] Create dashboards (2h)
  - [ ] Revenue tracking
  - [ ] Conversion rates
- [ ] Set up alerts (1h)
  - [ ] Low conversion alerts

**Success Criteria:**
- ✅ All key events tracked
- ✅ Conversion funnel visible
- ✅ Revenue dashboard created
- ✅ Alerts configured

**End of Week 18:** ✅ ALL MEDIUM PRIORITY COMPLETE 🎉

---

## 🔮 FUTURE BACKLOG (Low Priority - 21 hours)

**These items can be completed as capacity allows:**

### Item #16: SMS Integration (Twilio) - 8 hours
- **Priority:** 🔵 LOW
- **Impact:** Enhanced customer communication
- **When:** After email automation successful

### Item #17: Prettier Configuration - 1 hour
- **Priority:** 🔵 LOW
- **Impact:** Code style consistency
- **When:** Quick win, any time

### Item #18: Pre-commit Hooks (Husky) - 2 hours
- **Priority:** 🔵 LOW
- **Impact:** Code quality gates
- **When:** After testing infrastructure mature

### Item #19: Security Headers - 2 hours
- **Priority:** 🔵 LOW
- **Impact:** Additional security layer
- **When:** Before production deployment

### Item #20: Dark Mode Support - 8 hours
- **Priority:** 🔵 LOW
- **Impact:** User preference
- **When:** User requests or extra capacity

---

## 📊 EFFORT SUMMARY BY SPRINT

| Sprint | Weeks | Items | Hours | Cumulative |
|--------|-------|-------|-------|------------|
| **Sprint 1: Foundation** | 1-2 | Code Splitting, Section 3 | 44 | 44h |
| **Sprint 2: Core Features** | 3-4 | TypeScript Strict | 20 | 64h |
| **Sprint 3: Quality & Reliability** | 5-9 | Tests, Offline Mode | 64 | 128h |
| **Sprint 4: Business Value** | 10-13 | PDF, Pricing, Email, Refactor | 52 | 180h |
| **Sprint 5: Polish & Optimization** | 14-18 | API, Performance, Docs, Analytics | 58 | 238h |
| **Future Backlog** | 19+ | SMS, Prettier, Hooks, Security, Dark Mode | 21 | 259h |

---

## 🎯 SUCCESS METRICS

### End of Sprint 1 (Week 2)
- ✅ Initial bundle <500KB (Code Splitting)
- ✅ Section 3 complete with photo upload
- ✅ Technicians can complete full inspections

### End of Sprint 2 (Week 4)
- ✅ TypeScript strict mode enabled
- ✅ Zero TypeScript errors
- ✅ Improved code quality and maintainability

### End of Sprint 3 (Week 9)
- ✅ 60%+ test coverage
- ✅ Offline mode functional
- ✅ No data loss in poor signal areas

### End of Sprint 4 (Week 13)
- ✅ PDF generation <30 seconds
- ✅ Pricing 13% cap enforced
- ✅ Automated email communication
- ✅ All components <250 lines

### End of Sprint 5 (Week 18)
- ✅ Performance metrics green (LCP <2.5s)
- ✅ API layer centralized
- ✅ Analytics tracking key events
- ✅ Documentation complete

---

## 🚨 CRITICAL MILESTONES (MUST NOT SLIP)

1. **Week 2:** Section 3 complete → Technicians can do their jobs
2. **Week 7:** Tests 60% → Code quality safety net
3. **Week 9:** Offline mode → Works in basements/rural areas
4. **Week 11:** Pricing logic → Revenue protection (13% cap)

---

## 📝 WEEKLY REVIEW CHECKLIST

At the end of each week, review:

- [ ] All planned items completed?
- [ ] All success criteria met?
- [ ] Any blockers encountered?
- [ ] Actual hours vs estimated hours?
- [ ] Adjust next week's plan if needed
- [ ] Update TASKS.md with progress
- [ ] Commit all changes to git

---

## 🔄 DEPENDENCY GRAPH

```
Week 1: Code Splitting (4h)
   └─→ Week 14: Performance Optimizations

Week 1-2: Section 3 Complete (24h)
   └─→ Week 10: PDF Generation (needs photos)
   └─→ Week 13: Refactor Components

Week 3-4: TypeScript Strict (20h)
   └─→ Week 5-7: Test Coverage (needs types)

Week 5-7: Test Coverage (40h)
   └─→ Week 14: API Centralization (needs mocks)

Week 10: Pricing Logic (12h)
   └─→ (Independent)

Week 12: Email Automation (12h)
   └─→ (Independent)

Week 14: API Centralization (12h)
   └─→ Week 15: Performance (needs centralized API)

Week 16-17: Documentation (14h)
   └─→ (Independent)

Week 18: Analytics (12h)
   └─→ (Independent)
```

---

## 🎉 COMPLETION CELEBRATION PLAN

### After Sprint 3 (Week 9) - Critical Complete Party
**All business-critical features complete:**
- Section 3 ✅
- Offline mode ✅
- Tests 60% ✅
- TypeScript strict ✅

**Celebrate:** Team lunch, project demo to stakeholders

---

### After Sprint 5 (Week 18) - Full MVP Complete
**All high-value features complete:**
- PDF generation ✅
- Pricing logic ✅
- Email automation ✅
- Performance optimized ✅
- Documentation complete ✅

**Celebrate:** Full day off, retrospective, plan Phase 2 features

---

## 📍 CURRENT STATUS

**Today:** November 17, 2025
**Current Sprint:** Not started
**Next Milestone:** Code Splitting (Week 1, Day 1-2)
**Progress:** 0 / 243 hours (0%)

**Ready to begin? Start with Week 1, Day 1: Code Splitting** 🚀

---

**Last Updated:** November 17, 2025
**Next Review:** End of Week 1
**Document Owner:** Development Team

# 📋 MRC IMPROVEMENT PLAN - Actionable TODOs

**Plan Date:** November 17, 2025
**Status:** Ready for execution
**Total Items:** 20 prioritized improvements
**Estimated Effort:** ~250 hours total

---

## 🎯 HOW TO USE THIS PLAN

1. **Start with Critical Issues** (🔴) - Business blockers
2. **Move to High Priority** (🟡) - Sprint 2 focus
3. **Plan Medium Priority** (🟢) - Month 2
4. **Backlog Low Priority** (🔵) - As capacity allows

**Each item includes:**
- Why it matters
- Impact level (High/Medium/Low)
- Effort estimate (hours)
- Dependencies
- Success criteria

---

## 🔴 A. CRITICAL ISSUES (URGENT)

### 1. Complete Section 3: Area Inspections + Photo Upload

**Status:** 🔴 CRITICAL - Blocks technician workflow

**Current State:**
- Section 3 UI missing (areas, moisture readings, photos)
- Photo upload to Supabase Storage not implemented
- Data not saving to `inspection_areas` or `photos` tables

**What's Missing:**
```
src/components/inspection/
├── Section3_Areas.tsx        (MISSING)
├── AreaCard.tsx               (MISSING)
├── PhotoUpload.tsx            (MISSING)
└── MoistureReadingTable.tsx   (MISSING)

src/lib/api/
├── inspectionAreas.ts         (MISSING)
└── storage.ts                 (MISSING)
```

**Why:** Technicians cannot complete inspections → manual workarounds → data loss

**Impact:** 🔴 BUSINESS CRITICAL
**Effort:** 16 hours
**Dependencies:** None

**Tasks:**
- [ ] Create `Section3_Areas.tsx` container component
  - [ ] Use `useFieldArray` for repeatable areas
  - [ ] "Add Area" button
  - [ ] "Remove Area" button
  - [ ] Auto-save every 30 seconds

- [ ] Create `AreaCard.tsx` individual area form
  - [ ] All form fields (temp, humidity, moisture locations)
  - [ ] Photo upload section (min 4 photos required)
  - [ ] Moisture readings table

- [ ] Create `PhotoUpload.tsx` component
  - [ ] Upload to Supabase Storage bucket `inspection-photos`
  - [ ] Save photo URL to `photos` table with `area_id`
  - [ ] Display photos in 2-column grid (mobile)
  - [ ] Delete photo functionality (storage + database)
  - [ ] Image compression before upload

- [ ] Create `src/lib/api/inspectionAreas.ts`
  - [ ] `createArea(inspectionId, data)` - INSERT into inspection_areas
  - [ ] `updateArea(areaId, data)` - UPDATE inspection_areas
  - [ ] `deleteArea(areaId)` - DELETE (CASCADE deletes photos)
  - [ ] `loadAreas(inspectionId)` - SELECT with JOIN to photos

- [ ] Create `src/lib/api/storage.ts`
  - [ ] `uploadPhoto(file, areaId)` - Upload to Storage + INSERT photos row
  - [ ] `deletePhoto(photoId)` - Remove from Storage + DELETE photos row
  - [ ] `compressImage(file)` - Compress before upload

**Success Criteria:**
- ✅ Can add/remove multiple areas
- ✅ Photos upload to Supabase Storage
- ✅ Photo URLs saved to `photos` table
- ✅ Area data saved to `inspection_areas` table
- ✅ Data persists after page reload
- ✅ Min 4 photos per area enforced
- ✅ Delete photo works (storage + database)
- ✅ Mobile-first (375px, touch targets ≥48px)

---

### 2. Implement Offline Mode (Service Worker + IndexedDB)

**Status:** 🔴 CRITICAL - App unusable in poor signal areas

**Current State:**
- PWA manifest may exist
- Service worker NOT implemented
- IndexedDB NOT implemented
- `offline_queue` table exists but no processing logic

**Why:** Field technicians work in basements, rural areas → poor/no signal → data loss

**Impact:** 🔴 BUSINESS CRITICAL
**Effort:** 24 hours
**Dependencies:** None

**Tasks:**
- [ ] Set up Vite PWA plugin
  - [ ] Install `vite-plugin-pwa`
  - [ ] Configure `vite.config.ts` for service worker
  - [ ] Define cache strategies (network-first for API, cache-first for assets)

- [ ] Implement service worker
  - [ ] Cache static assets (JS, CSS, images)
  - [ ] Cache API responses with stale-while-revalidate
  - [ ] Background sync for offline queue

- [ ] Implement IndexedDB wrapper
  - [ ] Create `src/lib/offline/db.ts`
  - [ ] Store inspection form data locally
  - [ ] Store lead creation data locally
  - [ ] Queue mutations for sync

- [ ] Implement offline queue processing
  - [ ] Create `src/lib/offline/sync.ts`
  - [ ] Process queue on reconnect
  - [ ] Handle conflicts (last-write-wins or user prompt)
  - [ ] Update `offline_queue` table status

- [ ] Add offline indicators
  - [ ] Banner: "You're offline - changes will sync when online"
  - [ ] Icons showing sync status

- [ ] Auto-save enhancement
  - [ ] Save to IndexedDB every 30 seconds
  - [ ] Debounce to avoid excessive writes

**Success Criteria:**
- ✅ App loads when offline (cached assets)
- ✅ Can create leads offline
- ✅ Can fill inspection form offline
- ✅ Data saves to IndexedDB
- ✅ Queue syncs when back online
- ✅ No data loss
- ✅ User sees offline indicator

---

### 3. Enable TypeScript Strict Mode

**Status:** 🔴 CRITICAL - No type safety

**Current State:**
```json
{
  "noImplicitAny": false,      // ❌ Allows `any` everywhere
  "strictNullChecks": false,   // ❌ No null safety
}
```

**Why:** Runtime errors from `undefined`/`null`, no type safety benefits

**Impact:** 🔴 HIGH - Code quality, maintainability, bugs
**Effort:** 20 hours (enable + fix ~200-300 errors)
**Dependencies:** None

**Tasks:**
- [ ] Update `tsconfig.json`
  ```json
  {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
  ```

- [ ] Fix type errors incrementally (file by file)
  - [ ] Start with `src/types/` - Define all interfaces properly
  - [ ] Fix `src/lib/` - Utilities and helpers
  - [ ] Fix `src/hooks/` - Custom hooks
  - [ ] Fix `src/components/ui/` - UI components
  - [ ] Fix `src/components/` - Domain components
  - [ ] Fix `src/pages/` - Page components

- [ ] Address common issues:
  - [ ] Replace `any` with proper types
  - [ ] Add null checks: `value?.property` or `value ?? defaultValue`
  - [ ] Define function return types explicitly
  - [ ] Type all function parameters

- [ ] Update Supabase query results
  - [ ] Add type assertions for database queries
  - [ ] Handle `null` returns from database

**Success Criteria:**
- ✅ `strict: true` in tsconfig.json
- ✅ Zero TypeScript errors (`npm run build` succeeds)
- ✅ No `any` types except where truly necessary
- ✅ All null/undefined handled explicitly
- ✅ Unused variables/parameters removed

---

### 4. Implement Code Splitting (Lazy Loading)

**Status:** 🔴 HIGH - Slow initial load

**Current State:**
```tsx
// All 31 pages loaded upfront
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
// ... every single page
```

**Why:** Large initial bundle → slow load on mobile → poor UX

**Impact:** 🔴 MEDIUM (Performance)
**Effort:** 4 hours
**Dependencies:** None

**Tasks:**
- [ ] Convert all route imports to lazy loading
  ```tsx
  // Before
  import Dashboard from "./pages/Dashboard";

  // After
  import { lazy, Suspense } from "react";
  const Dashboard = lazy(() => import("./pages/Dashboard"));
  ```

- [ ] Wrap routes in `<Suspense>`
  ```tsx
  <Suspense fallback={<GlobalLoader />}>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </Suspense>
  ```

- [ ] Analyze bundle with `vite-bundle-visualizer`
  - [ ] Install `rollup-plugin-visualizer`
  - [ ] Add to `vite.config.ts`
  - [ ] Run build and review bundle sizes

- [ ] Optimize large chunks
  - [ ] If shadcn/ui bundle is large, split it
  - [ ] Consider code splitting for large components

**Success Criteria:**
- ✅ All routes use `lazy()`
- ✅ Initial bundle <500KB (gzipped)
- ✅ Individual route chunks <200KB each
- ✅ Fast Time to Interactive (TTI) <3s on 4G

---

### 5. Add Comprehensive Test Coverage (Target: 60%)

**Status:** 🔴 CRITICAL - Zero tests

**Current State:**
- No test files
- No testing framework
- 0% coverage

**Why:** No safety net → risky refactoring → bugs caught only in production

**Impact:** 🔴 HIGH (Quality, Confidence)
**Effort:** 40 hours to reach 60% coverage
**Dependencies:** None

**Tasks:**
- [ ] Install testing dependencies
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
  ```

- [ ] Configure Vitest
  - [ ] Create `vitest.config.ts`
  - [ ] Set up test environment (jsdom)
  - [ ] Configure coverage reporter

- [ ] Write tests for critical paths (Priority 1)
  - [ ] **Auth flows** (8 hours)
    - [ ] Login success/failure
    - [ ] Forgot password flow
    - [ ] Session refresh
    - [ ] Logout

  - [ ] **Lead creation** (6 hours)
    - [ ] HiPages lead form validation
    - [ ] Direct lead form validation
    - [ ] Lead creation API call
    - [ ] Success/error handling

  - [ ] **Inspection form** (8 hours)
    - [ ] Section 1 validation
    - [ ] Section 2 validation
    - [ ] Section 3 area creation
    - [ ] Auto-save logic

  - [ ] **Dashboard stats** (4 hours)
    - [ ] Data fetching
    - [ ] Loading states
    - [ ] Error states

  - [ ] **Notifications** (4 hours)
    - [ ] Real-time updates
    - [ ] Mark as read
    - [ ] Delete notification

- [ ] Write component tests (Priority 2) (10 hours)
  - [ ] Button components
  - [ ] Form inputs
  - [ ] Cards and lists
  - [ ] Modals/dialogs

- [ ] Set up CI/CD integration
  - [ ] Run tests on every commit
  - [ ] Block merge if tests fail
  - [ ] Generate coverage reports

**Success Criteria:**
- ✅ 60%+ code coverage
- ✅ All critical paths tested
- ✅ Tests run in <30 seconds
- ✅ CI/CD runs tests automatically
- ✅ Coverage badge in README.md

---

## 🟡 B. HIGH PRIORITY (Sprint 2)

### 6. Photo Upload to Supabase Storage

**Status:** 🟡 HIGH - Inspection photos critical

**Current State:**
- Photo upload UI placeholders may exist
- No Supabase Storage integration
- `photos` table exists but not populated

**Why:** Inspections incomplete without photo evidence

**Impact:** 🟡 HIGH
**Effort:** 8 hours
**Dependencies:** Section 3 components (Item #1)

**Tasks:**
- [ ] Create Supabase Storage bucket
  - [ ] Bucket name: `inspection-photos`
  - [ ] Public access: False (RLS policies)
  - [ ] Max file size: 10MB

- [ ] Implement upload logic in `storage.ts`
  - [ ] Image compression (max 1920px width)
  - [ ] Generate unique filename: `${areaId}/${uuid}.jpg`
  - [ ] Upload to bucket
  - [ ] Return public URL

- [ ] Save to `photos` table
  - [ ] INSERT: `{ area_id, url, caption, uploaded_at }`

- [ ] Implement delete logic
  - [ ] Delete from Storage bucket
  - [ ] DELETE from `photos` table

- [ ] Add RLS policies to bucket
  - [ ] SELECT: Authenticated users
  - [ ] INSERT: Authenticated users
  - [ ] DELETE: Owner or admin

**Success Criteria:**
- ✅ Photos upload successfully
- ✅ Photos appear in inspection
- ✅ Photos persist after reload
- ✅ Delete photo works
- ✅ RLS policies enforce security

---

### 7. PDF Report Generation

**Status:** 🟡 HIGH - Manual reports continue otherwise

**Current State:**
- PDF generation not implemented
- Email delivery placeholders exist
- No templates

**Why:** Automate 2-3 hour manual process → 5 minutes

**Impact:** 🟡 HIGH (Productivity)
**Effort:** 16 hours
**Dependencies:** Section 3 complete (photos needed in PDF)

**Tasks:**
- [ ] Choose PDF generation approach
  - [ ] Option A: Server-side (Supabase Edge Function + Puppeteer)
  - [ ] Option B: Client-side (jsPDF or react-pdf)
  - **Recommendation:** Server-side for quality

- [ ] Create HTML template
  - [ ] MRC branding (logo, colors)
  - [ ] Property details
  - [ ] Area inspections with photos
  - [ ] Moisture readings table
  - [ ] Recommendations
  - [ ] Footer with contact info

- [ ] Implement Supabase Edge Function
  - [ ] `generate-inspection-pdf`
  - [ ] Accept `inspectionId` parameter
  - [ ] Fetch data from database (inspection + areas + photos)
  - [ ] Render HTML template
  - [ ] Convert to PDF with Puppeteer
  - [ ] Upload PDF to Storage bucket `inspection-pdfs`
  - [ ] Return PDF URL

- [ ] Create UI trigger
  - [ ] "Generate Report" button on inspection page
  - [ ] Loading state while generating
  - [ ] Success: Download PDF link
  - [ ] Error handling

- [ ] Store PDF metadata
  - [ ] Add `pdf_url` column to `inspections` table
  - [ ] Update after generation

**Success Criteria:**
- ✅ PDF generated from inspection data
- ✅ Includes all sections + photos
- ✅ Professional formatting
- ✅ Download/email functionality
- ✅ Generation time <30 seconds

---

### 8. Quote Pricing Logic (13% Discount Cap)

**Status:** 🟡 HIGH - Incorrect quotes = lost revenue

**Current State:**
- Quote form UI exists
- Pricing calculation logic MISSING
- 13% discount cap not enforced
- Equipment rates hardcoded or missing

**Why:** Accurate pricing critical for profitability

**Impact:** 🟡 HIGH (Revenue)
**Effort:** 12 hours
**Dependencies:** None

**Tasks:**
- [ ] Define pricing configuration
  - [ ] Create `src/lib/pricing/rates.ts`
  - [ ] Work types: no_demolition, demolition, construction, subfloor
  - [ ] Hourly rates per work type
  - [ ] Equipment rates: Dehumidifier ($132/day), Air Mover ($46/day), RCD Box ($5/day)

- [ ] Implement discount logic
  - [ ] Multi-day discount: 0-8h (0%), 9-16h (7.5%), 17+h (13% MAX)
  - [ ] Enforce 13% cap (0.87 minimum multiplier)

- [ ] Implement quote calculation
  - [ ] `calculateQuote(workType, hours, equipment, materials)`
  - [ ] Labour cost = hourly_rate × hours
  - [ ] Equipment cost = sum of equipment items
  - [ ] Travel cost from `suburb_zones` table
  - [ ] Subtotal = labour + equipment + materials + travel
  - [ ] Discount = min(13%, calculated_discount)
  - [ ] Subtotal after discount
  - [ ] GST = 10% of subtotal_after_discount
  - [ ] Total = subtotal_after_discount + GST

- [ ] Create pricing validation tests
  - [ ] Test 13% cap enforced
  - [ ] Test multi-day discount tiers
  - [ ] Test equipment rates
  - [ ] Test GST calculation (10%)

- [ ] Integrate with quote form
  - [ ] Real-time calculation as user types
  - [ ] Display breakdown (labour, equipment, etc.)
  - [ ] Clear total display

**Success Criteria:**
- ✅ 13% discount cap NEVER exceeded
- ✅ Multi-day discounts correct
- ✅ GST always 10%
- ✅ Equipment rates accurate
- ✅ All 48 pricing scenarios pass (if test suite exists)

---

### 9. Email Automation (Templates + Triggers)

**Status:** 🟡 HIGH - Manual email sending continues

**Current State:**
- `email_logs` table exists
- Email triggers defined but not connected
- No email templates
- No email provider integration

**Why:** Automate customer communication → faster response

**Impact:** 🟡 MEDIUM (Productivity)
**Effort:** 12 hours
**Dependencies:** None

**Tasks:**
- [ ] Choose email provider
  - [ ] Option A: Supabase built-in (limited)
  - [ ] Option B: Resend (recommended, generous free tier)
  - [ ] Option C: SendGrid

- [ ] Create email templates (React Email)
  - [ ] Install `@react-email/components`
  - [ ] Quote sent email
  - [ ] Inspection reminder (24h before)
  - [ ] Follow-up email
  - [ ] Invoice sent email

- [ ] Implement Supabase Edge Function `send-email`
  - [ ] Accept `templateName`, `to`, `data` parameters
  - [ ] Render React Email template
  - [ ] Send via provider API
  - [ ] Log to `email_logs` table

- [ ] Connect triggers
  - [ ] After quote status = 'sent' → Send quote email
  - [ ] After inspection created → Send confirmation email
  - [ ] 24h before inspection → Send reminder email

- [ ] Add manual send option
  - [ ] "Send Email" button on quote page
  - [ ] Email preview before send

**Success Criteria:**
- ✅ Automated emails send on triggers
- ✅ Email templates professional
- ✅ Emails logged in `email_logs`
- ✅ Delivery status tracked
- ✅ Manual send option works

---

### 10. Refactor Large Components (InspectionForm.tsx)

**Status:** 🟡 HIGH - Hard to maintain

**Current State:**
- `InspectionForm.tsx` likely >500 lines
- Multiple sections in one file
- Difficult to test individual sections

**Why:** Maintainability, testability, reusability

**Impact:** 🟡 MEDIUM (Code Quality)
**Effort:** 8 hours
**Dependencies:** Section 3 components (Item #1)

**Tasks:**
- [ ] Analyze `InspectionForm.tsx` current structure
  - [ ] Count lines
  - [ ] Identify sections

- [ ] Extract sections to separate components
  - [ ] Create `Section1_PropertyDetails.tsx` (<150 lines)
  - [ ] Create `Section2_ClientInfo.tsx` (<150 lines)
  - [ ] Create `Section3_Areas.tsx` (already in Item #1)
  - [ ] Create `Section4_Recommendations.tsx` (<150 lines)
  - [ ] Create `Section5_Summary.tsx` (<150 lines)

- [ ] Create container component
  - [ ] `InspectionFormContainer.tsx`
  - [ ] Manages form state (React Hook Form)
  - [ ] Handles auto-save
  - [ ] Coordinates sections
  - [ ] Progress indicator (Section 1/5, 2/5, etc.)

- [ ] Extract shared logic
  - [ ] Auto-save hook: `useAutoSave()`
  - [ ] Form validation schemas
  - [ ] API calls to separate file

- [ ] Update imports and routes

**Success Criteria:**
- ✅ No component >250 lines
- ✅ Each section independently testable
- ✅ Shared logic reusable
- ✅ Functionality unchanged
- ✅ Tests pass

---

## 🟢 C. MEDIUM PRIORITY (Month 2)

### 11. Centralize API Layer

**Status:** 🟢 MEDIUM - Maintainability improvement

**Current State:**
- Direct Supabase calls scattered across components
- No consistent error handling
- Hard to find where API calls are made

**Why:** Easier maintenance, consistent patterns, better testing

**Impact:** 🟢 MEDIUM
**Effort:** 12 hours
**Dependencies:** None

**Tasks:**
- [ ] Create API layer structure
  ```
  src/lib/api/
  ├── leads.ts           - All lead operations
  ├── inspections.ts     - All inspection operations
  ├── quotes.ts          - All quote operations
  ├── invoices.ts        - All invoice operations
  ├── notifications.ts   - All notification operations
  ├── calendar.ts        - All calendar operations
  ├── storage.ts         - Photo upload/download
  └── types.ts           - API request/response types
  ```

- [ ] Migrate existing API calls
  - [ ] Find all `.from('leads')` calls → Move to `leads.ts`
  - [ ] Find all `.from('inspections')` calls → Move to `inspections.ts`
  - [ ] etc. for all tables

- [ ] Standardize error handling
  ```typescript
  export async function createLead(data: CreateLeadInput): Promise<Lead> {
    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .insert(data)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return lead;
    } catch (error) {
      console.error('Failed to create lead:', error);
      throw error;
    }
  }
  ```

- [ ] Update components to use API layer
  ```typescript
  // Before
  const { data } = await supabase.from('leads').select();

  // After
  import { getLeads } from '@/lib/api/leads';
  const leads = await getLeads();
  ```

**Success Criteria:**
- ✅ All API calls centralized
- ✅ Consistent error handling
- ✅ Type-safe API functions
- ✅ Easier to mock for testing

---

### 12. Performance Optimizations

**Status:** 🟢 MEDIUM - Better UX

**Current State:**
- No bundle analysis
- Inconsistent memoization
- Large images not optimized
- No performance monitoring

**Why:** Faster app → better mobile UX → happier users

**Impact:** 🟢 MEDIUM
**Effort:** 16 hours
**Dependencies:** Code splitting (Item #4)

**Tasks:**
- [ ] Run bundle analyzer
  - [ ] Install `vite-bundle-visualizer`
  - [ ] Identify large dependencies
  - [ ] Consider tree-shaking or alternatives

- [ ] Add React.memo to expensive components
  - [ ] Dashboard stat cards
  - [ ] Lead cards in lists
  - [ ] Inspection form sections

- [ ] Add useMemo for expensive calculations
  - [ ] Dashboard statistics
  - [ ] Filtered/sorted lists

- [ ] Add useCallback for event handlers
  - [ ] Form submit handlers
  - [ ] Button onClick handlers (passed to children)

- [ ] Optimize images
  - [ ] Compress all images in `src/assets`
  - [ ] Convert to WebP format
  - [ ] Implement lazy loading for images

- [ ] Set up performance monitoring
  - [ ] Add Web Vitals tracking
  - [ ] Monitor LCP, FID, CLS
  - [ ] Log to analytics

**Success Criteria:**
- ✅ Bundle size <500KB (gzipped)
- ✅ LCP <2.5s on 4G
- ✅ FID <100ms
- ✅ CLS <0.1
- ✅ No unnecessary re-renders

---

### 13. Customize README.md

**Status:** 🟢 MEDIUM - Developer onboarding

**Current State:**
- Generic Lovable.dev template
- No MRC-specific information
- No setup instructions

**Why:** Easier onboarding for new developers

**Impact:** 🟢 LOW
**Effort:** 2 hours
**Dependencies:** None

**Tasks:**
- [ ] Rewrite README.md with MRC-specific content
  - [ ] Project description
  - [ ] Tech stack
  - [ ] Prerequisites
  - [ ] Installation steps
  - [ ] Environment variables needed
  - [ ] Running locally
  - [ ] Running tests
  - [ ] Deployment
  - [ ] Contributing guidelines
  - [ ] License

- [ ] Add badges
  - [ ] Build status
  - [ ] Test coverage
  - [ ] TypeScript version
  - [ ] License

**Success Criteria:**
- ✅ New developer can set up project from README
- ✅ All commands documented
- ✅ Environment variables listed

---

### 14. Component Documentation (Storybook)

**Status:** 🟢 MEDIUM - Developer experience

**Current State:**
- No component documentation
- No visual component library
- Hard to see components in isolation

**Why:** Faster development, better collaboration, living documentation

**Impact:** 🟢 LOW (Developer Experience)
**Effort:** 20 hours
**Dependencies:** None

**Tasks:**
- [ ] Install Storybook
  ```bash
  npx storybook@latest init
  ```

- [ ] Configure for Vite + React + TypeScript

- [ ] Write stories for UI components
  - [ ] Button variants
  - [ ] Input fields
  - [ ] Cards
  - [ ] Modals/dialogs
  - [ ] Forms

- [ ] Write stories for domain components
  - [ ] LeadCard
  - [ ] InspectionJobCard
  - [ ] StatCard

- [ ] Add interaction tests
  - [ ] Button clicks
  - [ ] Form submissions
  - [ ] Modal open/close

- [ ] Deploy Storybook
  - [ ] Build static Storybook
  - [ ] Deploy to Vercel/Netlify
  - [ ] Share link with team

**Success Criteria:**
- ✅ All reusable components documented
- ✅ Props documented
- ✅ Variants shown
- ✅ Storybook deployed and accessible

---

### 15. Analytics Implementation

**Status:** 🟢 MEDIUM - Business insights

**Current State:**
- No analytics tracking
- No conversion funnel visibility
- No user behavior data

**Why:** Data-driven decisions, understand user behavior

**Impact:** 🟢 LOW (Business Intelligence)
**Effort:** 12 hours
**Dependencies:** None

**Tasks:**
- [ ] Choose analytics provider
  - [ ] Option A: Google Analytics 4
  - [ ] Option B: Plausible (privacy-friendly)
  - [ ] Option C: PostHog (product analytics)

- [ ] Install and configure

- [ ] Track key events
  - [ ] Lead created (by source)
  - [ ] Inspection booked
  - [ ] Quote sent
  - [ ] Quote accepted
  - [ ] Invoice paid

- [ ] Set up conversion funnels
  - [ ] Lead → Inspection → Quote → Won
  - [ ] Drop-off points

- [ ] Create dashboards
  - [ ] Revenue tracking
  - [ ] Conversion rates
  - [ ] Technician performance

- [ ] Set up alerts
  - [ ] Unusually low conversion
  - [ ] High quote decline rate

**Success Criteria:**
- ✅ All key events tracked
- ✅ Conversion funnel visible
- ✅ Revenue dashboard created
- ✅ Alerts configured

---

## 🔵 D. LOW PRIORITY (Future Backlog)

### 16. SMS Integration (Twilio)

**Impact:** 🔵 LOW
**Effort:** 8 hours
**Priority:** Future enhancement

**Tasks:**
- [ ] Sign up for Twilio
- [ ] Create `send-sms` Edge Function
- [ ] Create SMS templates
- [ ] Connect triggers (inspection reminders)
- [ ] Log to `sms_logs` table

---

### 17. Prettier Configuration

**Impact:** 🔵 LOW
**Effort:** 1 hour
**Priority:** Code style

**Tasks:**
- [ ] Install Prettier
- [ ] Create `.prettierrc`
- [ ] Add format script to package.json
- [ ] Format all files

---

### 18. Pre-commit Hooks (Husky)

**Impact:** 🔵 LOW
**Effort:** 2 hours
**Priority:** Code quality gates

**Tasks:**
- [ ] Install Husky + lint-staged
- [ ] Configure pre-commit hook
  - [ ] Run ESLint
  - [ ] Run Prettier
  - [ ] Run TypeScript check
  - [ ] Run tests (fast ones only)

---

### 19. Security Headers

**Impact:** 🔵 LOW
**Effort:** 2 hours
**Priority:** Additional security

**Tasks:**
- [ ] Add security headers in Vite config or hosting
  - [ ] Content-Security-Policy
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Strict-Transport-Security

---

### 20. Dark Mode Support

**Impact:** 🔵 LOW
**Effort:** 8 hours
**Priority:** User preference

**Tasks:**
- [ ] Implement theme toggle
- [ ] Add dark mode Tailwind classes
- [ ] Test all components in dark mode
- [ ] Persist user preference

---

## 📊 EFFORT SUMMARY

| Priority | Items | Total Hours |
|----------|-------|-------------|
| 🔴 Critical | 5 | 104 hours |
| 🟡 High | 5 | 56 hours |
| 🟢 Medium | 5 | 62 hours |
| 🔵 Low | 5 | 21 hours |
| **TOTAL** | **20** | **243 hours** |

---

## 🎯 RECOMMENDED EXECUTION ORDER

See PRIORITY_ROADMAP.md for week-by-week execution plan.

---

**Next:** PRIORITY_ROADMAP.md - Detailed execution schedule

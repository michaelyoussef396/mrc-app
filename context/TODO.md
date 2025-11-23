# 📋 MRC Lead Management System - TODO List

**Last Updated:** 2025-11-23
**Overall Progress:** 70% Complete
**Production Readiness:** 65%
**Sprint:** Week 1 of 4-week push to production

---

## 🎯 Quick Summary

**Deployment Blockers (Must complete before production):**
1. ❌ PDF Generation (0%)
2. ❌ Email Automation (0%)
3. ❌ AI Summary Generation (0%)
4. ❌ PWA/Offline Mode (10%)
5. ⚠️ Testing (20% - TestSprite generated but not run)
6. ⚠️ Performance (30% - not optimized)

**Recent Wins:**
- ✅ Cost Breakdown complete (Nov 22)
- ✅ Equipment auto-calculation (Nov 22)
- ✅ All 9 inspection sections working (Nov 21)
- ✅ 30 database tables production-ready
- ✅ 126 Melbourne suburbs mapped

---

## 🔴 CRITICAL (Week 1) - Deployment Blockers

### 1. Run TestSprite Test Suite
**Priority:** P0 - BLOCKER
**Status:** ❌ Not Started
**Effort:** 4-6 hours
**Impact:** No confidence in code quality without testing

**Steps:**
1. Navigate to project root
2. Run TestSprite tests: `npm run test` (or appropriate command)
3. Review test results (16 test scenarios)
4. Fix any failures found
5. Document test coverage
6. Create test report

**Files to Check:**
- `testsprite_tests/` - 16 test files
- `testsprite_frontend_test_plan.json` - Test plan
- Console output for failures

**Acceptance Criteria:**
- All 16 TestSprite tests passing
- No critical failures
- Test coverage report generated
- Any failures documented and triaged

**Depends On:** None
**Blocks:** Production deployment, performance optimization

---

### 2. Implement PDF Generation (Puppeteer Edge Function)
**Priority:** P0 - BLOCKER
**Status:** ❌ Not Started
**Effort:** 12-16 hours
**Impact:** Cannot send professional reports to customers

**Implementation Tasks:**

**2.1. Create Supabase Edge Function Structure**
- [ ] Create `supabase/functions/generate-inspection-pdf/` directory
- [ ] Initialize Deno TypeScript project
- [ ] Install Puppeteer for Deno
- [ ] Setup environment variables for secrets

**2.2. Build HTML Template**
- [ ] Create `template.html` with MRC branding
- [ ] Add all 9 inspection sections to template
- [ ] Include photo embedding logic
- [ ] Add professional CSS styling
- [ ] Include ABN, logo, company details
- [ ] Test template rendering locally

**2.3. Implement PDF Generation Logic**
```typescript
// supabase/functions/generate-inspection-pdf/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

serve(async (req) => {
  // 1. Parse inspection data from request
  // 2. Fetch photos from Supabase Storage
  // 3. Render HTML template with data
  // 4. Generate PDF with Puppeteer
  // 5. Upload PDF to Supabase Storage
  // 6. Return PDF URL
});
```

**2.4. Implement Versioning**
- [ ] Add `pdf_version` field to inspections table
- [ ] Implement version increment logic
- [ ] Store version history

**2.5. Client-Side Integration**
- [ ] Add "Generate PDF" button to inspection form
- [ ] Create PDFPreview component (iframe)
- [ ] Add "Edit & Regenerate" functionality
- [ ] Implement download link

**Files to Create:**
- `supabase/functions/generate-inspection-pdf/index.ts`
- `supabase/functions/generate-inspection-pdf/template.html`
- `supabase/functions/generate-inspection-pdf/styles.css`
- `src/components/inspection/PDFPreview.tsx`
- `src/lib/api/pdf.ts`

**Acceptance Criteria:**
- PDF generates in <15 seconds
- Includes all 9 sections + photos
- Professional MRC branding
- Versioning works (draft → approved)
- Secure download links with RLS
- Error handling for failures

**Depends On:** Inspection form complete (✅ Done)
**Blocks:** Email automation (needs PDF attachment)

---

### 3. Implement Email Automation (Resend Integration)
**Priority:** P0 - BLOCKER
**Status:** ❌ Not Started
**Effort:** 8-12 hours
**Impact:** No automated customer communication

**Implementation Tasks:**

**3.1. Setup Resend Account**
- [ ] Create Resend account
- [ ] Verify domain: mouldandrestoration.com.au
- [ ] Configure SPF/DKIM DNS records
- [ ] Get API key
- [ ] Store API key in Supabase secrets

**3.2. Create Supabase Edge Function**
```typescript
// supabase/functions/send-email/index.ts
import { Resend } from 'npm:resend@2.0.0';

serve(async (req) => {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

  // 1. Parse email request (template, to, data)
  // 2. Render template with data
  // 3. Send email via Resend
  // 4. Log to email_logs table
  // 5. Handle errors with retries
});
```

**3.3. Create Email Templates**
- [ ] `inspection-booked.html` - Booking confirmation
- [ ] `inspection-complete.html` - Inspection finished
- [ ] `pdf-ready.html` - PDF report ready for approval
- [ ] `booking-confirmation.html` - Calendar booking confirmed

**3.4. Database Triggers**
- [ ] Create trigger: inspection status = 'completed' → send inspection-complete
- [ ] Create trigger: PDF approved → send pdf-ready
- [ ] Create trigger: booking created → send booking-confirmation

**3.5. Client-Side Integration**
- [ ] Add manual "Send Email" button (testing)
- [ ] Display email status in UI
- [ ] Show email logs in admin panel

**Files to Create:**
- `supabase/functions/send-email/index.ts`
- `supabase/functions/send-email/templates/inspection-booked.html`
- `supabase/functions/send-email/templates/inspection-complete.html`
- `supabase/functions/send-email/templates/pdf-ready.html`
- `supabase/functions/send-email/templates/booking-confirmation.html`
- `src/components/admin/EmailLogs.tsx`

**Acceptance Criteria:**
- Email delivery rate >99%
- All 4 templates render correctly
- Emails logged to `email_logs` table
- Error handling with retries
- SPF/DKIM configured (no spam)

**Depends On:** PDF generation (for pdf-ready template)
**Blocks:** None, but critical for customer experience

---

### 4. Implement AI Summary Generation (Claude API)
**Priority:** P0 - BLOCKER
**Status:** ❌ Not Started
**Effort:** 6-8 hours
**Impact:** Technicians waste time writing summaries manually

**Implementation Tasks:**

**4.1. Setup Anthropic Account**
- [ ] Create Anthropic account
- [ ] Get Claude API key (Sonnet 3.5)
- [ ] Store API key in Supabase secrets
- [ ] Test API access

**4.2. Create Supabase Edge Function**
```typescript
// supabase/functions/generate-ai-summary/index.ts
import Anthropic from 'npm:@anthropic-ai/sdk@0.9.0';

serve(async (req) => {
  const anthropic = new Anthropic({
    apiKey: Deno.env.get('CLAUDE_API_KEY'),
  });

  // 1. Fetch inspection data
  // 2. Build comprehensive prompt
  // 3. Call Claude API
  // 4. Parse response
  // 5. Store summary in database
});
```

**4.3. Create Prompt Template**
```markdown
You are creating a professional mould inspection summary for MRC.

Property: {address}
Affected Areas: {areas}
Causes: {causes}
Work Required: {workRequired}

Generate a comprehensive summary with:
1. Summary of Findings (paragraph)
2. Identified Causes (bulleted list)
3. Recommendations (immediate + ongoing)
4. Overview & Conclusion (paragraph)

Use Australian English, professional tone, customer-friendly language.
Max 400 words.
```

**4.4. Client-Side Integration**
- [ ] Add "Generate AI Summary" button to inspection form
- [ ] Show loading state during generation
- [ ] Display generated summary (editable)
- [ ] Save edited summary to database

**Files to Create:**
- `supabase/functions/generate-ai-summary/index.ts`
- `supabase/functions/generate-ai-summary/prompt-template.md`
- `src/components/inspection/AISummaryButton.tsx`
- `src/lib/api/aiSummary.ts`

**Acceptance Criteria:**
- Professional summaries generated (250-400 words)
- Australian English enforced
- Customer-friendly language
- Generates in <10 seconds
- Editable by technician after generation
- Error handling for API failures

**Depends On:** Inspection form complete (✅ Done)
**Blocks:** PDF generation (summary included in PDF)

---

### 5. Implement PWA/Offline Mode (Service Worker + IndexedDB)
**Priority:** P0 - BLOCKER
**Status:** ⚠️ 10% (structure exists)
**Effort:** 16-20 hours
**Impact:** Form doesn't work offline in basements (critical for technicians)

**Implementation Tasks:**

**5.1. Create Service Worker**
```javascript
// public/service-worker.js

// Cache static assets (Cache First)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

// API requests (Network First with Cache Fallback)
if (event.request.url.includes('/api/')) {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
}
```

**5.2. Create PWA Manifest**
```json
// public/manifest.json
{
  "name": "MRC Inspection System",
  "short_name": "MRC",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0066CC",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**5.3. Implement IndexedDB Storage**
```typescript
// src/lib/offline/indexedDB.ts

export async function storeInspectionDraft(inspection: InspectionData) {
  const db = await openDB('mrc-offline', 1);
  await db.put('inspections', inspection);
}

export async function storePhotosOffline(photos: Photo[]) {
  const db = await openDB('mrc-offline', 1);
  await db.put('photos', photos);
}
```

**5.4. Implement Offline Queue**
```typescript
// src/lib/offline/queue.ts

export async function queueOperation(operation: {
  action: 'create' | 'update' | 'delete';
  table: string;
  data: any;
}) {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
  queue.push(operation);
  localStorage.setItem('offline_queue', JSON.stringify(queue));
}
```

**5.5. Implement Sync Manager**
```typescript
// src/lib/offline/sync.ts

window.addEventListener('online', async () => {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');

  for (const item of queue) {
    await supabase.from(item.table)[item.action](item.data);
  }

  localStorage.removeItem('offline_queue');
});
```

**5.6. Client-Side Integration**
- [ ] Add offline indicator banner
- [ ] Show sync status ("Syncing...", "Synced")
- [ ] Activate auto-save (30-second interval)
- [ ] Store inspection drafts in IndexedDB
- [ ] Store photos in IndexedDB

**5.7. Configure Vite PWA Plugin**
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
});
```

**Files to Create:**
- `public/service-worker.js`
- `public/manifest.json`
- `public/icon-192.png`
- `public/icon-512.png`
- `src/lib/offline/indexedDB.ts`
- `src/lib/offline/queue.ts`
- `src/lib/offline/sync.ts`
- `src/lib/hooks/useOfflineStatus.ts`
- `src/components/layout/OfflineBanner.tsx`

**Files to Modify:**
- `vite.config.ts` - Add PWA plugin
- `src/pages/InspectionForm.tsx` - Activate auto-save (line ~2800)

**Acceptance Criteria:**
- Form works completely offline
- Photos stored in IndexedDB (no file loss)
- Auto-syncs when back online
- No data loss in any scenario
- Offline indicator shows when disconnected
- Works on iOS Safari + Android Chrome
- Tested: Airplane mode → fill form → enable network → verify sync

**Depends On:** Inspection form complete (✅ Done)
**Blocks:** Production deployment (critical for field use)

---

### 6. Remove Debug Logging
**Priority:** P0 - BLOCKER (before production)
**Status:** ❌ Not Started
**Effort:** 2-3 hours
**Impact:** Noisy console, unprofessional, performance overhead

**Tasks:**
1. Search codebase for all console.log statements
   ```bash
   grep -r "console.log" src/
   grep -r "🔍 DEBUG" src/
   grep -r "💰 COST" src/
   ```

2. Remove or replace with proper logging:
   ```typescript
   // BEFORE
   console.log('🔍 DEBUG - handleInputChange', value);
   console.log('💰 COST RECALCULATION', total);

   // AFTER
   // Remove entirely OR use production logger
   logger.info('Cost calculated', { total });
   ```

3. Implement production logger (optional):
   ```typescript
   // src/lib/logger.ts
   export const logger = {
     info: (message: string, data?: any) => {
       if (import.meta.env.DEV) {
         console.log(`[INFO] ${message}`, data);
       }
     },
     error: (message: string, error: any) => {
       console.error(`[ERROR] ${message}`, error);
       // Send to error tracking service (Sentry)
     },
   };
   ```

**Files to Check:**
- `src/pages/InspectionForm.tsx` - Many console.logs (~50+)
- All components in `src/components/`
- All utilities in `src/lib/`

**Acceptance Criteria:**
- Zero console.log in production build
- Only error logs remain (for debugging)
- Clean browser console in production
- Proper error tracking configured (optional)

**Depends On:** None
**Blocks:** Performance optimization, production deployment

---

## 🟡 HIGH PRIORITY (Week 2)

### 7. Performance Optimization
**Priority:** P1
**Status:** ⚠️ 30% (not systematically optimized)
**Effort:** 6-8 hours
**Impact:** May not meet 3s load time target

**Tasks:**

**7.1. Run Lighthouse Audit**
- [ ] Audit Dashboard page (mobile + desktop)
- [ ] Audit Inspection Form page (mobile + desktop)
- [ ] Audit Lead Management page (mobile + desktop)
- [ ] Target: Mobile >90, Desktop >95

**7.2. Measure Core Web Vitals**
- [ ] LCP (Largest Contentful Paint) - Target: <2.5s
- [ ] FID (First Input Delay) - Target: <100ms
- [ ] CLS (Cumulative Layout Shift) - Target: <0.1

**7.3. Optimize Bundle Size**
```bash
npm run build
npx vite-bundle-visualizer
```
- [ ] Measure current bundle size
- [ ] Target: <500KB total
- [ ] Identify large dependencies
- [ ] Implement tree shaking

**7.4. Implement Code Splitting**
```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

const InspectionForm = lazy(() => import('./pages/InspectionForm'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Reports = lazy(() => import('./pages/Reports'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/inspection" element={<InspectionForm />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

**7.5. Optimize Images**
- [ ] Convert all PNG/JPG to WebP format
- [ ] Compress photos before upload (already done?)
- [ ] Use `<img loading="lazy">` for below-fold images
- [ ] Add responsive images with srcset

**7.6. Network Optimization**
- [ ] Test on 4G throttling (Chrome DevTools)
- [ ] Verify <3s load time on 4G
- [ ] Implement resource prefetching

**Acceptance Criteria:**
- Mobile Lighthouse score >90
- Desktop Lighthouse score >95
- LCP <2.5s, FID <100ms, CLS <0.1
- Bundle size <500KB
- All pages load <3s on 4G simulation

**Depends On:** Debug logging removed, Code refactoring
**Blocks:** Production deployment

---

### 8. Mobile Testing (375px Viewport)
**Priority:** P1
**Status:** ⚠️ 20% (not systematically tested)
**Effort:** 4-6 hours
**Impact:** May have UX issues on mobile devices

**Testing Checklist:**

**8.1. Inspection Form (375px)**
- [ ] All 9 sections render correctly
- [ ] No horizontal scrolling detected
- [ ] Touch targets ≥48px (buttons, inputs)
- [ ] On-screen keyboard doesn't break layout
- [ ] Photos upload works on mobile
- [ ] Auto-save indicator visible
- [ ] All dropdowns accessible

**8.2. Dashboard (375px)**
- [ ] Stat cards stack vertically
- [ ] Recent activity readable
- [ ] Quick actions accessible
- [ ] No text overflow

**8.3. Lead Management (375px)**
- [ ] Pipeline cards usable
- [ ] Drag & drop works (or disabled gracefully)
- [ ] Lead detail view readable
- [ ] Add lead button accessible

**8.4. Calendar (375px)**
- [ ] Date picker usable
- [ ] Bookings display correctly
- [ ] Add booking modal fits screen
- [ ] No horizontal scrolling

**8.5. Settings (375px)**
- [ ] Forms stack vertically
- [ ] Save buttons accessible
- [ ] No text cutoff

**Testing Tools:**
- Chrome DevTools (Device Mode)
- Real devices (iPhone SE, Android small)
- Playwright MCP (automated testing)

**Acceptance Criteria:**
- Zero horizontal scrolling on any page
- All touch targets ≥48px
- Keyboard doesn't break layout
- All functionality works on mobile
- Screenshots captured as proof

**Depends On:** None
**Blocks:** Production deployment

---

### 9. Unit Test Coverage
**Priority:** P1
**Status:** ❌ 0% (no unit tests exist)
**Effort:** 8-12 hours
**Impact:** No test coverage for critical logic

**Critical Functions to Test:**

**9.1. Cost Breakdown Calculations**
```typescript
// src/lib/utils/__tests__/costCalculations.test.ts
describe('calculateEquipmentCost', () => {
  it('calculates dehumidifier cost correctly', () => {
    expect(calculateEquipmentCost({
      dehumidifierCount: 2,
      airMoverCount: 0,
      rcdCount: 0,
      equipmentDays: 3
    })).toBe(2 * 132 * 3); // $792
  });

  it('handles zero values correctly', () => {
    expect(calculateEquipmentCost({
      dehumidifierCount: 0,
      airMoverCount: 0,
      rcdCount: 0,
      equipmentDays: 1
    })).toBe(0);
  });
});
```

**9.2. Pricing Calculator (Multi-day Discounts)**
```typescript
// src/lib/utils/__tests__/pricing.test.ts
describe('Pricing Calculator', () => {
  it('applies 0% discount for ≤8 hours', () => {
    const result = calculatePrice({ hours: 8, workType: 'no_demolition' });
    expect(result.discount).toBe(0);
  });

  it('applies 7.5% discount for 9-16 hours', () => {
    const result = calculatePrice({ hours: 12, workType: 'demolition' });
    expect(result.discount).toBe(0.075);
  });

  it('NEVER exceeds 13% discount cap', () => {
    const result = calculatePrice({ hours: 100, workType: 'construction' });
    expect(result.discount).toBeLessThanOrEqual(0.13);
  });
});
```

**9.3. Australian Formatters**
```typescript
// src/lib/utils/__tests__/formatters.test.ts
describe('formatPhoneNumber', () => {
  it('formats mobile correctly', () => {
    expect(formatPhoneNumber('0412345678')).toBe('0412 345 678');
  });

  it('formats landline correctly', () => {
    expect(formatPhoneNumber('0398765432')).toBe('(03) 9876 5432');
  });
});
```

**Testing Framework:**
- Vitest (Vite-native testing)
- @testing-library/react (component testing)
- jsdom (DOM environment)

**Files to Create:**
- `src/lib/utils/__tests__/costCalculations.test.ts`
- `src/lib/utils/__tests__/pricing.test.ts`
- `src/lib/utils/__tests__/formatters.test.ts`
- `vitest.config.ts`

**Acceptance Criteria:**
- Test coverage >70% for critical utils
- All pricing tests passing (including 13% cap)
- All formatter tests passing
- CI/CD runs tests automatically

**Depends On:** None
**Blocks:** Production deployment

---

## 🟢 MEDIUM PRIORITY (Week 3)

### 10. Code Refactoring - Split InspectionForm.tsx
**Priority:** P2
**Status:** ❌ Not Started
**Effort:** 8-12 hours
**Impact:** Maintainability, bundle size, testing

**Current State:**
- Single file: 3,641 lines
- All 9 sections in one component
- Hard to navigate and test

**Refactoring Plan:**

**10.1. Extract Section Components**
```
src/components/inspection/
  ├── InspectionForm.tsx (coordinator, ~500 lines)
  ├── sections/
  │   ├── BasicInformation.tsx
  │   ├── PropertyDetails.tsx
  │   ├── AreaInspection.tsx
  │   ├── Subfloor.tsx
  │   ├── OutdoorInfo.tsx
  │   ├── WasteDisposal.tsx
  │   ├── WorkProcedure.tsx
  │   ├── JobSummary.tsx
  │   └── CostBreakdown.tsx
  ├── shared/
  │   ├── PhotoUpload.tsx
  │   └── Section.tsx (wrapper)
  └── hooks/
      ├── useInspectionForm.ts (state management)
      ├── usePhotoUpload.ts
      └── useAutoSave.ts
```

**10.2. Extract Custom Hooks**
```typescript
// src/components/inspection/hooks/useInspectionForm.ts
export function useInspectionForm() {
  const [inspectionData, setInspectionData] = useState<InspectionData>({});

  const updateField = (field: string, value: any) => {
    setInspectionData(prev => ({ ...prev, [field]: value }));
  };

  return { inspectionData, updateField };
}
```

**10.3. Benefits:**
- Smaller files (easier to navigate)
- Code splitting (load sections on demand)
- Easier to test (test each section independently)
- Better maintainability

**Acceptance Criteria:**
- All 9 sections extracted to separate files
- Custom hooks extracted
- No functionality broken
- Tests still passing
- Bundle size reduced (due to code splitting)

**Depends On:** Unit tests (to verify no regressions)
**Blocks:** None (improves maintainability)

---

### 11. Implement Multi-Day Discount Logic
**Priority:** P2
**Status:** ❌ Not Started (missing from Cost Breakdown)
**Effort:** 4-6 hours
**Impact:** Pricing not matching business rules

**Current State:**
- Equipment costs calculated ✅
- Labor editable ✅
- GST 10% ✅
- Multi-day discounts ❌ MISSING

**Implementation:**

```typescript
// src/lib/utils/pricing.ts

export function calculateDiscount(hours: number): number {
  if (hours <= 8) return 0;      // 0%
  if (hours <= 16) return 0.075;  // 7.5%
  return 0.13;                    // 13% MAXIMUM (absolute cap)
}

export function calculatePricing(config: PricingConfig) {
  const { workType, hours, dehumidifiers, airMovers, rcdBox, equipmentDays } = config;

  // 1. Get base hourly rate
  const rates = BASE_RATES[workType];
  const baseRate = interpolateRate(rates, hours);

  // 2. Apply multi-day discount
  const discount = calculateDiscount(hours);
  const laborCost = baseRate * (1 - discount);

  // 3. Calculate equipment hire
  const equipmentCost =
    (dehumidifiers * 132 * equipmentDays) +
    (airMovers * 46 * equipmentDays) +
    (rcdBox ? 5 * equipmentDays : 0);

  // 4. Calculate totals
  const totalExGST = laborCost + equipmentCost;
  const gst = totalExGST * 0.1;
  const totalIncGST = totalExGST + gst;

  return { laborCost, equipmentCost, totalExGST, gst, totalIncGST, discount };
}
```

**Base Rates (from original plan):**
```typescript
const BASE_RATES = {
  no_demolition: { 2: 612, 8: 1216.99 },
  demolition: { 2: 711.90, 8: 1798.90 },
  construction: { 2: 661.96, 8: 1507.95 },
  subfloor: { 2: 900, 8: 2334.69 },
};
```

**Integration:**
- Add hour inputs to Cost Breakdown section
- Add work type selector
- Auto-calculate labor based on hours + type + discount
- Display discount percentage in UI
- Store discount in database

**Files to Modify:**
- `src/pages/InspectionForm.tsx` - Add hour inputs, work type
- `src/lib/utils/pricing.ts` - Pricing calculation logic
- Database: Verify `discount_percent` column exists (✅ Already added Nov 22)

**Acceptance Criteria:**
- 0% discount for ≤8 hours
- 7.5% discount for 9-16 hours
- 13% discount for 17+ hours (NEVER exceeded)
- Labor cost calculated from base rates
- All pricing tests passing (48 scenarios)

**Depends On:** Unit tests (to verify correctness)
**Blocks:** Pricing validation, production deployment

---

### 12. Calendar Conflict Detection Testing
**Priority:** P2
**Status:** ⚠️ 50% (structure exists, needs testing)
**Effort:** 4-6 hours
**Impact:** May allow double-bookings if not tested

**Testing Scenarios:**

**12.1. Time Overlap Detection**
- [ ] Same technician, overlapping times → CONFLICT
- [ ] Same technician, adjacent times → OK
- [ ] Different technicians, same time → OK

**12.2. Travel Time Detection**
```
Test: Carlton (Zone 1) 2pm → Mernda (Zone 3) 3pm
Expected: CONFLICT (requires 45min travel, only 60min gap)

Test: Carlton (Zone 1) 2pm → Mernda (Zone 3) 4pm
Expected: OK (120min gap, need 45min travel)
```

**12.3. Boundary Conditions**
- [ ] Booking exactly at end time of previous → OK
- [ ] Same suburb bookings 15min apart → OK
- [ ] All-day booking → blocks entire day

**12.4. Edge Cases**
- [ ] Multi-day jobs → check each day separately
- [ ] Cancelled bookings → ignore in conflict check
- [ ] Operating hours (7am-5pm) → reject outside hours

**Testing Tools:**
- Write unit tests for conflict detection algorithm
- Manual testing with real bookings
- Database queries to verify logic

**Files to Test:**
- `src/lib/utils/calendarConflicts.ts`
- `src/lib/api/calendar/conflicts.ts`

**Acceptance Criteria:**
- All 20 conflict scenarios tested
- Zero false positives (valid bookings blocked)
- Zero false negatives (conflicts allowed)
- Query performance <50ms

**Depends On:** Calendar UI complete
**Blocks:** Customer self-booking

---

## ⚪ LOW PRIORITY (Week 4 / Sprint 2)

### 13. Add Error Boundaries
**Priority:** P3
**Effort:** 2-3 hours
**Impact:** Better error recovery

### 14. Improve Loading States
**Priority:** P3
**Effort:** 3-4 hours
**Impact:** Better UX

### 15. Address TODO Comments
**Priority:** P3
**Effort:** Varies
**Impact:** Code cleanliness

### 16. Extract Magic Numbers to Config
**Priority:** P3
**Effort:** 2-3 hours
**Impact:** Easier to update rates

### 17. TypeScript `any` Type Cleanup
**Priority:** P3
**Effort:** 4-6 hours
**Impact:** Type safety

### 18. SMS Integration (Twilio)
**Priority:** P3 (Sprint 2)
**Effort:** 6-8 hours
**Impact:** SMS notifications (optional)

### 19. Invoice Generation
**Priority:** P3 (Sprint 2)
**Effort:** 8-12 hours
**Impact:** Automated invoicing (optional)

---

## 📚 Documentation Tasks

### 20. Update README.md
- [ ] Project overview
- [ ] Installation instructions
- [ ] Development workflow
- [ ] Environment variables needed
- [ ] Deployment guide

### 21. Create API Documentation
- [ ] Document Edge Functions
- [ ] Document database schema
- [ ] Document RLS policies
- [ ] Add code examples

### 22. Create Deployment Guide
- [ ] Vercel deployment steps
- [ ] Environment variable setup
- [ ] Domain configuration
- [ ] Error tracking setup
- [ ] Monitoring setup

### 23. Developer Onboarding
- [ ] Code structure overview
- [ ] Key components explained
- [ ] Common patterns
- [ ] Testing guide
- [ ] Troubleshooting guide

---

## 🎯 Sprint Progress Tracker

### Week 1: Automation Layer (Nov 25-29)
- [ ] Run TestSprite tests
- [ ] PDF generation working
- [ ] Email automation sending
- [ ] AI summaries generating
- [ ] Debug logging removed

**Target:** All deployment blockers addressed

### Week 2: PWA & Performance (Dec 2-6)
- [ ] PWA/Offline mode working
- [ ] Lighthouse mobile >90
- [ ] Bundle size <500KB
- [ ] Mobile testing complete (375px)

**Target:** Performance optimized, offline working

### Week 3: Testing & Polish (Dec 9-13)
- [ ] Unit test coverage >70%
- [ ] E2E tests passing
- [ ] Code refactored (InspectionForm split)
- [ ] Multi-day discounts implemented

**Target:** Production-ready codebase

### Week 4: Deployment (Dec 16-20)
- [ ] Security audit PASS
- [ ] Pricing validation PASS (48 scenarios)
- [ ] Performance audit PASS
- [ ] Deploy to production
- [ ] Post-deployment monitoring

**Target:** LIVE IN PRODUCTION 🚀

---

## 📊 Completion Checklist

### Pre-Deployment Mandatory Checks

**Security:**
- [ ] npm audit: Zero high/critical vulnerabilities
- [ ] No hardcoded secrets
- [ ] RLS enabled on all 30 tables
- [ ] RLS policies tested
- [ ] Auth flows tested

**Pricing:**
- [ ] All 48 pricing scenarios PASS
- [ ] 13% discount cap NEVER exceeded
- [ ] Equipment rates exact ($132, $46, $5)
- [ ] GST 10% accurate
- [ ] Multi-day discounts correct (0%, 7.5%, 13%)

**Performance:**
- [ ] Mobile Lighthouse >90
- [ ] Desktop Lighthouse >95
- [ ] LCP <2.5s, FID <100ms, CLS <0.1
- [ ] Bundle size <500KB
- [ ] Load time <3s on 4G

**Functionality:**
- [ ] All TestSprite tests passing (16 scenarios)
- [ ] Unit tests >70% coverage
- [ ] PDF generation working
- [ ] Email delivery >99%
- [ ] AI summaries generating
- [ ] PWA/Offline working (iOS + Android)
- [ ] Mobile testing complete (375px)
- [ ] Calendar conflicts tested
- [ ] All 9 inspection sections working

**Documentation:**
- [ ] README.md updated
- [ ] Deployment guide created
- [ ] API documentation complete
- [ ] Environment variables documented

---

## 🚨 Blockers & Risks

**Current Blockers:**
1. None (all tasks have clear path forward)

**Risks:**
1. **TestSprite tests may reveal critical issues** - Mitigation: Run early (Week 1, Day 1)
2. **Puppeteer may be slow on Deno** - Mitigation: Test with real data early
3. **IndexedDB browser support** - Mitigation: Test on iOS Safari + Android Chrome
4. **Claude API rate limits** - Mitigation: Implement caching, rate limiting
5. **Resend deliverability** - Mitigation: Configure SPF/DKIM correctly

**Dependencies:**
- Supabase account (have)
- Resend account (need to create)
- Anthropic account (need to create)
- Vercel account (need to create or have)

---

## 📈 Success Metrics

**Technical:**
- ✅ All 6 deployment blockers resolved
- ✅ Test coverage >70%
- ✅ Lighthouse mobile >90
- ✅ Zero critical bugs

**Business:**
- ✅ PDF reports sent to customers
- ✅ Automated email notifications
- ✅ AI summaries save technician time
- ✅ Offline mode works in basements
- ✅ Demo runs flawlessly

**User Experience:**
- ✅ Load time <3s on mobile
- ✅ No horizontal scrolling on mobile
- ✅ Touch targets ≥48px
- ✅ Works completely offline

---

**Last Updated:** 2025-11-23
**Owner:** Michael Youssef + Claude Code Team
**Status:** 70% Complete, 4 weeks to production
**Next Review:** Daily during active development

---

*This TODO reflects the actual current state and critical path to production deployment. Priorities are based on deployment blockers and business impact.*

**Let's ship this! 🚀**

# 🏗️ MRC Lead Management System - Planning Document

**Project:** Mould & Restoration Co. Lead Management System
**Version:** 1.0
**Last Updated:** 2025-11-11
**Status:** Active Development - Sprint 1

---

## 📋 Table of Contents

1. [Vision & Goals](#vision--goals)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Required Tools & Setup](#required-tools--setup)
5. [Key Architectural Decisions](#key-architectural-decisions)
6. [Critical Issues & Solutions](#critical-issues--solutions)
7. [Project Structure](#project-structure)
8. [Development Workflow](#development-workflow)
9. [Success Metrics](#success-metrics)
10. [Related Documents](#related-documents)

---

## 🎯 Vision & Goals

### Business Vision

**Replace Airtable + Zapier with a custom, SLC (Simple, Loveable, Complete) solution** that provides:

1. **Complete workflow automation** - From lead capture through payment
2. **Mobile-first experience** - Field technicians work from vans on phones
3. **Zero data loss** - Complete audit trail and auto-save everywhere
4. **Professional client experience** - Beautiful PDFs, timely emails, self-booking
5. **Business intelligence** - Real-time insights and reporting

### User Goals

**Field Technicians (Clayton & Glen):**
- Complete inspections quickly on mobile devices
- No data loss when phone signal drops
- Clear daily schedule with navigation
- Simple job completion tracking

**Office Admin:**
- Track all leads through pipeline
- Manage calendar and bookings
- Generate professional reports
- Monitor business performance

**Customers:**
- Fast response to inquiries (<2 hours)
- Professional inspection reports with photos
- Easy online booking
- Clear communication throughout

### Business Outcomes

- **Reduce admin time** from 10 hours/week to 2 hours/week
- **Increase conversion rate** from 30% to 50% (better follow-up)
- **Improve response time** from 4 hours to 15 minutes (automation)
- **Scale operations** from 20 jobs/month to 50+ jobs/month
- **Professional brand image** with consistent communications

---

## 🏛️ Architecture Overview

### System Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │ Inspection   │  │   Customer   │      │
│  │   Kanban     │  │     Form     │  │   Booking    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        React Query (Server State Management)         │   │
│  │        + Context API (UI State Management)            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   localStorage + IndexedDB (Offline Persistence)     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
                    Supabase Client SDK
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase)                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Auth (RLS)  │  │   Storage    │      │
│  │   Database   │  │              │  │ (PDFs/Photos)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Edge Functions (Deno Runtime)               │   │
│  │  • generate-inspection-pdf (Puppeteer)               │   │
│  │  • send-email (Resend API)                           │   │
│  │  • generate-ai-summary (Claude API)                  │   │
│  │  • check-booking-availability                        │   │
│  │  • calculate-travel-time                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
              ┌─────────────┴──────────────┐
              ↓                            ↓
    ┌──────────────────┐        ┌──────────────────┐
    │   Resend API     │        │   Claude API     │
    │  (Email Delivery)│        │  (AI Summaries)  │
    └──────────────────┘        └──────────────────┘
```

### Data Flow

**1. Lead Capture → Storage:**
```
Website Form → React State → Supabase DB → Email Trigger → Resend API
     ↓
localStorage (backup) → Sync on reconnect
```

**2. Inspection Workflow:**
```
Mobile Form → Auto-save (30s) → localStorage + Supabase
     ↓
Generate AI Summary → Claude API
     ↓
Generate PDF → Puppeteer Edge Function → Supabase Storage
     ↓
Approve & Send → Resend Email + PDF Attachment
```

**3. Customer Booking:**
```
Email Link → Public Booking Form → Check Availability (travel time logic)
     ↓
Create Booking → Calendar Update → Confirmation Email
     ↓
Add to Technician Schedule → Notification
```

### Database Architecture

**11 Core Tables:**

1. **`leads`** - Complete lead information and status tracking
2. **`inspection_reports`** - Full inspection data with JSONB structures
3. **`calendar_bookings`** - Time slot management with conflict detection
4. **`jobs`** - Scheduled remediation work
5. **`photos`** - Photo uploads linked to inspections
6. **`notes`** - Complete history and communication log
7. **`email_logs`** - Track all automated emails
8. **`sms_logs`** - Track all SMS messages
9. **`notifications`** - System-wide notification tracking
10. **`pricing_settings`** - Admin-configurable pricing rates
11. **`suburb_zones`** - Melbourne suburb travel time mapping

**Key Relationships:**
```sql
leads (1) → (many) inspection_reports
leads (1) → (many) jobs
leads (1) → (many) notes
leads (1) → (many) calendar_bookings
inspection_reports (1) → (many) photos
leads (1) → (many) email_logs
```

---

## 💻 Technology Stack

### Frontend Stack

**Core Framework:**
- **React 18.3.1** - UI library with concurrent features
- **TypeScript 5.8.3** - Type safety and developer experience
- **Vite 5.4.19** - Fast build tool and dev server

**UI & Styling:**
- **Tailwind CSS 3.4.17** - Utility-first styling
- **shadcn/ui** - 48 pre-built component primitives
- **Radix UI** - Accessible component foundations
- **Lucide Icons** - Consistent iconography

**State Management:**
- **React Query 5.83.0** - Server state management (caching, sync, mutations)
- **Context API** - UI state (theme, user preferences, form state)
- **localStorage** - Offline persistence and auto-save backup
- **IndexedDB** - Large data storage (photos, form drafts)

**Forms & Validation:**
- **React Hook Form 7.61.1** - Performant form management
- **Zod 3.25.76** - Schema validation and type inference

**Routing:**
- **React Router v6.30.1** - Client-side routing with data loading

**Other Libraries:**
- **date-fns** - Date manipulation (Australian timezone support)
- **clsx** + **tailwind-merge** - Dynamic className management
- **sonner** - Toast notifications

### Backend Stack

**Primary Backend:**
- **Supabase** - Complete backend-as-a-service
  - **PostgreSQL 15** - Relational database with JSONB support
  - **PostgREST** - Auto-generated REST API
  - **Supabase Auth** - Authentication with Row Level Security
  - **Supabase Storage** - Object storage for PDFs and photos
  - **Supabase Realtime** - WebSocket subscriptions for live updates
  - **Supabase Edge Functions** - Serverless Deno functions

**Edge Functions (Deno Runtime):**
- **Puppeteer** - Headless Chrome for PDF generation
- **Resend SDK** - Email API client
- **Anthropic SDK** - Claude API for AI summaries

### Third-Party Services

**Email Delivery:**
- **Resend API** - Transactional email with SPF/DKIM
- **Domain:** admin@mouldandrestoration.com.au
- **Features:** Email tracking, analytics, deliverability optimization

**AI Generation:**
- **Claude API (Anthropic)** - AI-generated inspection summaries
- **Model:** Claude Sonnet 3.5
- **Use Case:** Professional mould inspection report summaries

**Optional Services:**
- **Google Maps API** - Travel time calculations (can use static lookup)
- **Sentry** - Error tracking and monitoring
- **Plausible Analytics** - Privacy-friendly analytics

### Development Tools

**Code Quality:**
- **ESLint** - Code linting with TypeScript rules
- **Prettier** - Code formatting
- **TypeScript Strict Mode** - Maximum type safety

**Testing:**
- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing
- **Testing Library** - Component testing utilities

**Build & Deploy:**
- **Vite** - Development server and production builds
- **Vercel** - Frontend hosting with edge functions
- **Supabase CLI** - Database migrations and Edge Function deployment

---

## 🛠️ Required Tools & Setup

### Developer Workstation Setup

**Required Software:**

1. **Node.js 20.x LTS** (or higher)
   ```bash
   # Check version
   node --version  # Should be v20.x.x or higher
   npm --version   # Should be 10.x.x or higher
   ```

2. **Git**
   ```bash
   git --version  # Any recent version (2.x+)
   ```

3. **Code Editor** (Choose one)
   - **VS Code** (Recommended)
     - Extensions: ESLint, Prettier, Tailwind CSS IntelliSense, TypeScript
   - **WebStorm** - Full TypeScript/React support
   - **Cursor** - AI-powered development

4. **Supabase CLI**
   ```bash
   npm install -g supabase
   supabase --version
   ```

5. **PostgreSQL Client** (Optional but helpful)
   - **pgAdmin** - GUI for database management
   - **Postico** (Mac) - Native PostgreSQL client
   - **DBeaver** - Cross-platform database tool

### Account Setup

**Required Accounts:**

1. **Supabase** (https://supabase.com)
   - Project created: `mrc-lead-management`
   - Database: PostgreSQL 15
   - Storage: Enabled
   - Auth: Email/password configured

2. **Resend** (https://resend.com)
   - Domain verified: `mouldandrestoration.com.au`
   - API key: Production access
   - SPF/DKIM records configured

3. **Anthropic** (https://anthropic.com)
   - API key for Claude Sonnet 3.5
   - Usage tier: Production

4. **Vercel** (https://vercel.com) - Frontend hosting
   - Project linked to GitHub repo
   - Environment variables configured
   - Domain: `app.mouldandrestoration.com.au`

### Environment Variables

**`.env.local` (Development):**
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Resend API
VITE_RESEND_API_KEY=re_your_api_key

# Claude API
VITE_CLAUDE_API_KEY=sk-ant-your-api-key

# App Configuration
VITE_APP_URL=http://localhost:5173
VITE_ENV=development

# Optional
VITE_SENTRY_DSN=your-sentry-dsn
VITE_PLAUSIBLE_DOMAIN=app.mouldandrestoration.com.au
```

**Supabase Edge Function Secrets:**
```bash
# Set via Supabase CLI
supabase secrets set RESEND_API_KEY=re_your_api_key
supabase secrets set CLAUDE_API_KEY=sk-ant-your-api-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Initial Setup Commands

```bash
# 1. Clone repository
git clone [repo-url]
cd mrc-app

# 2. Install dependencies
npm install

# 3. Setup Supabase locally
supabase init
supabase link --project-ref your-project-ref

# 4. Run database migrations
supabase db push

# 5. Generate TypeScript types from database
supabase gen types typescript --local > src/types/database.ts

# 6. Start development server
npm run dev
```

### VS Code Workspace Settings

**`.vscode/settings.json`:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "supabase.supabase-vscode",
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

---

## 🎨 Key Architectural Decisions

### Decision 1: **Prevent Page Reload/Reset (CRITICAL)**

**Problem:** App reloads and resets when users navigate between pages, causing data loss.

**Solution: Multi-Layer State Persistence**

```typescript
// Layer 1: React Query (Server State Caching)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      cacheTime: 10 * 60 * 1000,    // 10 minutes
      refetchOnWindowFocus: true,    // Refresh on tab focus
      refetchOnReconnect: true,      // Refresh on reconnect
    },
  },
});

// Layer 2: Context API (UI State Preservation)
interface AppState {
  formData: Record<string, any>;
  activeTab: string;
  filters: Record<string, any>;
}

const AppContext = createContext<AppState>({});

// Layer 3: Auto-Save to Database (Every 30 seconds)
useAutoSave(formData, async (data) => {
  await supabase
    .from('inspection_reports')
    .upsert({ ...data, updated_at: new Date() });
}, { delay: 30000 });

// Layer 4: localStorage Backup (Offline Persistence)
useEffect(() => {
  localStorage.setItem('inspection_draft', JSON.stringify(formData));
}, [formData]);

// Layer 5: Navigation Guard (Unsaved Changes Warning)
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

**Implementation Files:**
- `src/lib/queryClient.ts` - React Query configuration
- `src/contexts/AppContext.tsx` - Global state management
- `src/lib/hooks/useAutoSave.ts` - Auto-save hook
- `src/lib/hooks/useNavigationGuard.ts` - Unsaved changes warning

**Testing:**
- User can close browser and reopen → form data persists
- User can navigate between pages → no data loss
- User loses internet → offline queue created
- User refreshes page → last saved state restored

**Agent Validation Workflow:**
```bash
# Step 1: TypeScript Pro - Implement state persistence layers
"Implement 5-layer state persistence system:
1. React Query configuration with 5-minute stale time
2. AppContext with formData, activeTab, filters
3. useAutoSave hook with 30-second delay
4. localStorage backup on every change
5. Navigation guard for unsaved changes"

# Step 2: Test Engineer - Test persistence scenarios
"Test ALL persistence scenarios:
- Close browser and reopen → form data restored
- Navigate between pages → state preserved
- Refresh page → last saved state loaded
- Network disconnection → offline queue created
- Auto-save triggers every 30 seconds"

# Step 3: Error Detective - Test failure scenarios
"Test failure scenarios:
- localStorage full → graceful degradation
- Supabase down → queue operations
- Concurrent edits → conflict resolution
- Browser crash → recovery on restart"

# Step 4: mobile-tester - Test on mobile devices
"Test persistence on mobile:
- iOS Safari: background app → foreground restore
- Android Chrome: kill app → data recovery
- Low memory: localStorage limits
- Slow network: auto-save timing"

# Step 5: Performance Engineer - Optimize performance
"Optimize persistence performance:
- Debounce localStorage writes
- Batch Supabase updates
- Compress stored data
- Monitor memory usage"

# Acceptance Criteria:
✅ TypeScript Pro: Type safety confirmed
✅ Test Engineer: ALL scenarios pass
✅ Error Detective: Graceful error handling
✅ mobile-tester: Works on iOS + Android
✅ Performance Engineer: No performance impact
```

---

### Decision 2: **Mobile-First Offline Capability**

**Problem:** Technicians work in basements with poor/no signal. Forms must work offline.

**Solution: Progressive Web App (PWA) with Service Worker**

```typescript
// Service Worker Strategy
self.addEventListener('fetch', (event) => {
  // API requests: Network first, cache fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  }

  // Static assets: Cache first
  else {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

// Offline Queue
const offlineQueue: Array<{
  action: 'create' | 'update' | 'delete';
  table: string;
  data: any;
}> = [];

// Queue operations while offline
if (!navigator.onLine) {
  offlineQueue.push({ action: 'update', table: 'inspections', data });
  localStorage.setItem('offline_queue', JSON.stringify(offlineQueue));
}

// Sync when back online
window.addEventListener('online', async () => {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
  for (const item of queue) {
    await supabase.from(item.table)[item.action](item.data);
  }
  localStorage.removeItem('offline_queue');
});
```

**Implementation Files:**
- `public/sw.js` - Service worker with caching strategies
- `src/lib/hooks/useOffline.ts` - Online/offline detection
- `src/lib/api/offlineQueue.ts` - Queue management
- `src/components/OfflineIndicator.tsx` - UI indicator

**Agent Validation Workflow:**
```bash
# Step 1: TypeScript Pro - Implement offline infrastructure
"Implement offline-first architecture:
1. Service Worker with cache-first strategy for static assets
2. Network-first with cache fallback for API calls
3. Offline queue for create/update/delete operations
4. IndexedDB for large data storage (photos, drafts)
5. Sync mechanism on reconnection"

# Step 2: mobile-tester - Test offline scenarios (CRITICAL)
"Test ALL offline scenarios at 375px viewport:
- Fill inspection form while offline → saved to queue
- Navigate between pages offline → state preserved
- Take photos offline → stored in IndexedDB
- Connection drops mid-form → auto-recovery
- Reconnect → automatic sync to Supabase
REQUIREMENT: Must work PERFECTLY offline"

# Step 3: Test Engineer - Test sync reliability
"Test offline sync reliability:
- Queue 10 operations offline → all sync on reconnect
- Intermittent connection → partial sync recovery
- Conflicting edits → conflict resolution
- Failed sync → retry logic with exponential backoff
- Full sync success → queue cleared"

# Step 4: Error Detective - Test failure modes
"Test offline failure modes:
- IndexedDB full → fallback to localStorage
- Service Worker fails → graceful degradation
- Sync fails repeatedly → user notification
- Data corruption → recovery mechanisms"

# Step 5: Performance Engineer - Optimize offline performance
"Optimize offline performance:
- Service Worker cache size limits
- IndexedDB query optimization
- Background sync strategy
- Battery impact analysis"

# Acceptance Criteria:
✅ TypeScript Pro: Offline architecture complete
✅ mobile-tester: PERFECT offline experience (BLOCKER)
✅ Test Engineer: 100% sync reliability
✅ Error Detective: Graceful error handling
✅ Performance Engineer: Minimal battery impact
```

---

### Decision 3: **Australian Business Formatting**

**Problem:** Need Australian-specific formats for phone, currency, dates, ABN.

**Solution: Centralized Formatting Utilities**

```typescript
// src/lib/utils/formatters.ts

// Phone: 04XX XXX XXX
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('04')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// ABN: XX XXX XXX XXX (with checksum validation)
export function formatABN(abn: string): string {
  const cleaned = abn.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  return abn;
}

// Currency: $X,XXX.XX
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

// Date: DD/MM/YYYY
export function formatDateAU(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}
```

**All form inputs use these formatters consistently across the application.**

**Agent Validation Workflow:**
```bash
# Step 1: TypeScript Pro - Implement Australian formatters
"Create centralized Australian formatting utilities:
1. formatPhoneNumber: 04XX XXX XXX or (0X) XXXX XXXX
2. formatABN: XX XXX XXX XXX with checksum validation
3. formatCurrency: $X,XXX.XX (always clarify ex/inc GST)
4. formatDateAU: DD/MM/YYYY
5. formatDateTimeAU: DD/MM/YYYY at HH:MM AM/PM
6. validatePostcode: VIC only (3000-3999)"

# Step 2: Test Engineer - Test formatting edge cases
"Test ALL Australian format edge cases:
- Phone: 0412345678 → 0412 345 678
- Phone: 0398765432 → (03) 9876 5432
- ABN checksum validation: valid vs invalid
- Currency: 1234.56 → $1,234.56
- Date: 2025-01-15 → 15/01/2025
- Postcode: 3000 (valid), 2000 (invalid NSW)"

# Step 3: Code Reviewer - Verify consistency
"Review formatter usage across codebase:
- ALL phone numbers use formatPhoneNumber
- ALL currency uses formatCurrency (with ex/inc GST label)
- ALL dates use formatDateAU or formatDateTimeAU
- NO hardcoded formats anywhere"

# Step 4: mobile-tester - Test input formatting
"Test Australian formatting on mobile at 375px:
- Phone input auto-formats as user types
- ABN input auto-formats with spaces
- Currency displays correctly
- Date picker shows DD/MM/YYYY
- All formats readable on mobile"

# Acceptance Criteria:
✅ TypeScript Pro: All formatters implemented
✅ Test Engineer: All edge cases pass
✅ Code Reviewer: 100% consistency
✅ mobile-tester: Formats work on mobile
```

---

### Decision 4: **Calendar Booking with Travel Time Intelligence**

**Problem:** Prevent impossible bookings (e.g., Carlton 2pm → Mernda 3pm).

**Solution: Zone-Based Travel Time Matrix**

```typescript
// Melbourne suburbs grouped into 4 zones
const ZONE_MAP = {
  1: ['Melbourne', 'Carlton', 'Fitzroy', 'Richmond'],      // CBD
  2: ['Brunswick', 'Coburg', 'Footscray', 'Preston'],      // Inner
  3: ['Frankston', 'Dandenong', 'Ringwood', 'Werribee'],   // Middle
  4: ['Geelong', 'Mornington', 'Pakenham', 'Sunbury'],     // Outer
};

// Travel time matrix (minutes)
const TRAVEL_TIME_MATRIX = {
  1: { 1: 15, 2: 30, 3: 45, 4: 60 },
  2: { 1: 30, 2: 20, 3: 40, 4: 55 },
  3: { 1: 45, 2: 40, 3: 25, 4: 45 },
  4: { 1: 60, 2: 55, 3: 45, 4: 30 },
};

// Booking availability check
export async function checkAvailability(
  technicianId: string,
  startTime: Date,
  suburb: string,
  duration: number
): Promise<boolean> {
  // Get zone for requested suburb
  const requestedZone = getSuburbZone(suburb);

  // Get previous booking
  const prevBooking = await getPreviousBooking(technicianId, startTime);

  if (prevBooking) {
    const prevZone = getSuburbZone(prevBooking.suburb);
    const travelTime = TRAVEL_TIME_MATRIX[prevZone][requestedZone];
    const earliestStart = addMinutes(prevBooking.endTime, travelTime);

    // Block if not enough travel time
    if (startTime < earliestStart) {
      return false;
    }
  }

  return true;
}
```

**Implementation Files:**
- `src/lib/utils/travelTime.ts` - Travel time calculations
- `src/lib/api/calendar.ts` - Booking availability logic
- `supabase/functions/check-booking-availability/index.ts` - Server-side validation

**Agent Validation Workflow:**
```bash
# Step 1: TypeScript Pro - Implement travel time matrix
"Implement zone-based travel time system:
1. Define 4 Melbourne zones (CBD, Inner, Middle, Outer)
2. Create 4×4 travel time matrix (16 combinations)
3. Build suburb-to-zone mapping
4. Implement conflict detection algorithm
5. Create booking availability function"

# Step 2: Test Engineer - Test conflict scenarios (CRITICAL)
"Test ALL travel time conflict scenarios:
- Carlton (Z1) 2pm → Mernda (Z3) 3pm = CONFLICT (need 45min)
- Carlton (Z1) 2pm → Mernda (Z3) 5pm = OK (60min gap)
- Same zone bookings 15min apart = OK
- Adjacent zones 30min apart = OK
- Outer zones 60min apart = OK
Test 20+ scenarios covering all zone combinations"

# Step 3: SQL Pro - Optimize calendar queries
"Optimize booking availability queries:
- Add indexes on calendar_bookings (technician_id, start_time)
- Create materialized view for daily availability
- Optimize conflict detection query performance
- Add database constraints for overlapping bookings"

# Step 4: Database Admin - Add conflict constraints
"Add database-level conflict prevention:
- Check constraint: start_time < end_time
- Trigger: validate travel time on insert
- Index: prevent double-bookings
- Test constraint enforcement"

# Step 5: mobile-tester - Test booking UI
"Test calendar booking at 375px:
- Date picker usable with touch
- Available time slots display correctly
- Conflict message clear and helpful
- Booking confirmation works"

# Acceptance Criteria:
✅ TypeScript Pro: Travel time system complete
✅ Test Engineer: ALL 20+ scenarios pass (BLOCKER)
✅ SQL Pro: Query performance optimized
✅ Database Admin: Constraints enforced
✅ mobile-tester: Booking UI works on mobile
```

---

### Decision 5: **Pricing Calculator with Discount Logic**

**Problem:** Complex pricing rules with multi-day discounts capped at 13%.

**Solution: Centralized Pricing Engine**

```typescript
// Base rates (ex GST)
const BASE_RATES = {
  no_demolition: { 2: 612, 8: 1216.99 },
  demolition: { 2: 711.90, 8: 1798.90 },
  construction: { 2: 661.96, 8: 1507.95 },
  subfloor: { 2: 900, 8: 2334.69 },
};

export function calculatePricing(config: PricingConfig) {
  const { workType, hours, dehumidifiers, airMovers, rcdBox, equipmentDays } = config;

  // 1. Get base hourly rate
  const rates = BASE_RATES[workType];
  const baseRate = interpolateRate(rates, hours);

  // 2. Apply multi-day discount
  let discount = 0;
  if (hours > 8 && hours <= 16) {
    discount = 0.075;  // 7.5% for 2 days
  } else if (hours > 16) {
    discount = 0.13;   // 13% cap for 3+ days
  }

  const labourCost = baseRate * (1 - discount);

  // 3. Calculate equipment hire
  const equipmentCost =
    (dehumidifiers * 132 * equipmentDays) +
    (airMovers * 46 * equipmentDays) +
    (rcdBox ? 5 * equipmentDays : 0);

  // 4. Calculate totals
  const totalExGST = labourCost + equipmentCost;
  const gst = totalExGST * 0.1;
  const totalIncGST = totalExGST + gst;

  return { labourCost, equipmentCost, totalExGST, gst, totalIncGST };
}
```

**Implementation Files:**
- `src/lib/utils/inspectionUtils.ts` - Pricing calculator
- `src/components/inspection/PricingSection.tsx` - UI display
- `src/lib/utils/__tests__/inspectionUtils.test.ts` - Comprehensive tests

**Agent Validation Workflow:**
```bash
# Step 1: TypeScript Pro - Implement pricing engine
"Implement pricing calculator with business rules:
1. Define BASE_RATES for 4 work types (2hr & 8hr)
2. Implement multi-day discount (0%, 7.5%, 13% MAX)
3. Calculate equipment costs (per day rates)
4. Add GST calculation (10%)
5. Ensure 13% discount NEVER exceeded (ABSOLUTE)"

# Step 2: pricing-calculator - Create 48 test scenarios (DEPLOYMENT BLOCKER)
"Create comprehensive pricing test suite:
- Test ALL 4 work types × 3 discount tiers × 4 equipment combos
- Scenario 1: No demolition, 2hrs, no equipment → $612 ex GST
- Scenario 2: Demolition, 8hrs, 3 dehumidifiers → correct total
- ... (48 total scenarios)
- CRITICAL: Validate 13% cap NEVER exceeded in ANY scenario
REQUIREMENT: ALL 48 scenarios MUST PASS (DEPLOYMENT BLOCKER)"

# Step 3: Test Engineer - Edge case testing
"Test pricing edge cases:
- 0 hours → error handling
- Negative values → validation
- Very large jobs (200+ hours) → still 13% cap
- Equipment only (no labour) → correct calculation
- Decimal hours → proper rounding"

# Step 4: Security Auditor - Verify no client manipulation
"Security audit pricing calculator:
- Verify calculations performed server-side
- Check no client-side price manipulation possible
- Validate input sanitization
- Test for injection attacks"

# Step 5: Code Reviewer - Review business logic
"Review pricing calculator code:
- Discount logic correct (matches business rules)
- 13% cap enforcement verified
- Code maintainability
- Documentation complete
- Unit tests comprehensive"

# Acceptance Criteria (DEPLOYMENT BLOCKERS):
✅ TypeScript Pro: Pricing engine implemented
✅ pricing-calculator: ALL 48 scenarios PASS (BLOCKER)
✅ Test Engineer: All edge cases handled
✅ Security Auditor: No manipulation possible
✅ Code Reviewer: Business logic correct
```

---

### Decision 6: **AI-Generated Inspection Summaries**

**Problem:** Technicians need professional summary reports but lack writing skills.

**Solution: Claude API with Comprehensive Prompt**

```typescript
// Edge Function: generate-ai-summary
export async function generateSummary(inspectionData: InspectionReport): Promise<string> {
  const prompt = `
You are creating professional mould inspection summary reports for MRC.

Property: ${inspectionData.address}
Affected Areas: ${JSON.stringify(inspectionData.areas)}
Causes: ${inspectionData.causes}
Work Required: ${inspectionData.workRequired}

Generate a comprehensive summary with:
1. Summary of Findings (paragraph)
2. Identified Causes (bulleted list)
3. Recommendations (immediate + ongoing)
4. Overview & Conclusion (paragraph)

Use Australian English, professional tone, customer-friendly language.
`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-3.5-20241022',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text;
}
```

**Implementation Files:**
- `supabase/functions/generate-ai-summary/index.ts` - Claude API integration
- `context/INSTRUCTIONS-FOR-MOULD-INSPECTION-SUMMARY-REPORTS-PROMPT.md` - Full prompt template
- `src/components/inspection/AISummaryButton.tsx` - Trigger UI

**Agent Validation Workflow:**
```bash
# Step 1: TypeScript Pro - Implement Claude API integration
"Implement AI summary generation:
1. Create Supabase Edge Function with Anthropic SDK
2. Build comprehensive prompt template
3. Implement error handling and retries
4. Add rate limiting and caching
5. Create client-side trigger button"

# Step 2: Test Engineer - Test AI generation quality
"Test AI summary generation:
- Generate summaries for 10 sample inspections
- Verify professional tone and language
- Check Australian English spelling
- Validate summary length (250-400 words)
- Test error scenarios (API timeout, invalid data)
- Verify summary includes all required sections"

# Step 3: Security Auditor - Verify API key security (CRITICAL)
"Security audit AI integration:
- Verify API key stored server-side ONLY (Edge Function)
- Check API key NOT exposed to client
- Validate environment variable configuration
- Test rate limiting prevents abuse
- Verify user authorization before generation"

# Step 4: Technical Writer - Review prompt template
"Review AI prompt template:
- Prompt produces professional summaries
- Covers all inspection aspects
- Uses appropriate mould remediation terminology
- Maintains customer-friendly language
- Australian English enforced"

# Step 5: Code Reviewer - Review implementation
"Review AI generation code:
- Error handling robust
- Retry logic with exponential backoff
- Timeout handling appropriate
- Loading states clear
- User feedback on failures"

# Acceptance Criteria:
✅ TypeScript Pro: Claude API integrated
✅ Test Engineer: Summary quality verified
✅ Security Auditor: API key secured server-side (CRITICAL)
✅ Technical Writer: Prompt template approved
✅ Code Reviewer: Implementation quality approved
```

---

## 🚨 Critical Issues & Solutions

### Issue 1: **Page Reload Causing Data Loss** ⚠️ CRITICAL

**Status:** Identified, solution designed (see Decision 1 above)

**Action Required:**
- [ ] Implement React Query with proper caching
- [ ] Create AppContext for UI state
- [ ] Build useAutoSave hook (30-second interval)
- [ ] Add localStorage backup
- [ ] Implement navigation guard

**Priority:** P0 (Must fix before any production use)

---

### Issue 2: **No Offline Capability** ⚠️ CRITICAL

**Status:** Identified, solution designed (see Decision 2 above)

**Action Required:**
- [ ] Implement Service Worker
- [ ] Create offline queue system
- [ ] Add IndexedDB for large data
- [ ] Build sync mechanism
- [ ] Add offline indicator UI

**Priority:** P0 (Required for field technicians)

---

### Issue 3: **Email Verification Not Sending**

**Status:** Known issue with authentication flow

**Solution:**
- Configure Resend API properly
- Create email templates
- Test with real email addresses
- Add email logging

**Priority:** P1 (Needed for production auth)

---

### Issue 4: **Pricing Calculator Not Matching Business Rules**

**Status:** Needs implementation (see Decision 5 above)

**Action Required:**
- [ ] Implement pricing calculator with discount logic
- [ ] Add 13% discount cap
- [ ] Make prices editable by technicians
- [ ] Add comprehensive unit tests

**Priority:** P0 (Critical for accurate quotes)

---

### Issue 5: **Calendar Has No Conflict Detection**

**Status:** Needs implementation (see Decision 4 above)

**Action Required:**
- [ ] Implement travel time matrix
- [ ] Add booking conflict detection
- [ ] Create availability check function
- [ ] Add database constraints

**Priority:** P0 (Prevent double-bookings)

---

## 📂 Project Structure

```
mrc-app/
├── context/                        # 📚 Planning Documents
│   ├── CLAUDE.md                  # Project guide for all sessions
│   ├── MRC-PRD.md                 # Product requirements (111KB)
│   ├── MRC-TECHNICAL-SPEC.md      # Technical specification (87KB)
│   ├── MRC-SPRINT-1-TASKS.md      # Sprint roadmap (79KB)
│   ├── design-checklist-s-tier.md # Design standards (43KB)
│   └── MRC-LEAD-MANAGEMENT-SYSTEM-MASTER-TODO-LIST.md # Complete task list
│
├── src/
│   ├── components/                # React components
│   │   ├── dashboard/            # Dashboard & Kanban
│   │   ├── inspection/           # Inspection form sections
│   │   ├── calendar/             # Booking system
│   │   ├── leads/                # Lead management
│   │   └── ui/                   # shadcn/ui components (48)
│   │
│   ├── lib/
│   │   ├── api/                  # Supabase client functions
│   │   ├── hooks/                # Custom React hooks
│   │   ├── utils/                # Utility functions
│   │   ├── supabase.ts           # Supabase client
│   │   └── queryClient.ts        # React Query setup
│   │
│   ├── pages/                    # Route components
│   ├── types/                    # TypeScript types
│   ├── contexts/                 # React contexts
│   └── App.tsx                   # Root component
│
├── supabase/
│   ├── functions/                # Edge Functions
│   │   ├── generate-inspection-pdf/
│   │   ├── generate-ai-summary/
│   │   ├── send-email/
│   │   └── check-booking-availability/
│   │
│   └── migrations/               # Database migrations
│       ├── 20250111000001_create_leads.sql
│       ├── 20250111000002_create_inspections.sql
│       └── ... (11 migrations total)
│
├── public/
│   ├── sw.js                     # Service Worker
│   └── email-templates/          # HTML email templates
│
├── PLANNING.md                   # 📖 This document
├── CLAUDE.md                     # Project guide for Claude Code
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

---

## 🔄 Development Workflow

### Daily Development Routine

1. **Start Session:**
   ```bash
   # Read project guide
   cat CLAUDE.md

   # Check current sprint tasks
   cat context/MRC-SPRINT-1-TASKS.md

   # Review git status
   git status
   git log --oneline -5
   ```

2. **Before Coding:**
   - Check current sprint task priority (P0/P1/P2)
   - Review design principles for the feature
   - Consider mobile-first impact
   - Plan for offline scenarios

3. **During Development:**
   - Start dev server: `npm run dev`
   - Test at 375px width first (mobile)
   - Auto-save every 30 seconds (simulate)
   - Check browser console for errors
   - Commit frequently with clear messages

4. **After UI Changes:**
   - Execute visual verification checklist (see CLAUDE.md)
   - Test mobile responsiveness (375px, 768px, 1440px)
   - Capture screenshots
   - Update session log

5. **End Session:**
   - Update PLANNING.md with new decisions
   - Mark completed tasks in MRC-SPRINT-1-TASKS.md
   - Commit all changes
   - Push to repository

### Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/inspection-form-auto-save
git add .
git commit -m "feat: implement auto-save for inspection form

- Add useAutoSave hook with 30s delay
- Store draft in localStorage
- Sync to Supabase when online
- Show 'Last saved' timestamp

Refs: #12"

git push origin feature/inspection-form-auto-save
```

### Testing Workflow

```bash
# Unit tests
npm test                           # Run all tests
npm test -- inspectionUtils.test   # Run specific test

# E2E tests
npm run test:e2e                   # Run Playwright tests
npm run test:e2e:ui                # Open Playwright UI

# Type checking
npm run type-check                 # TypeScript compilation

# Linting
npm run lint                       # ESLint
npm run lint:fix                   # Auto-fix issues
```

---

## 📊 Success Metrics

### Sprint 1 Success Criteria (Week 4)

**Technical Metrics:**
- [ ] All P0 tasks completed (45 tasks)
- [ ] Zero critical bugs
- [ ] Offline mode works 100%
- [ ] Auto-save works 100%
- [ ] Email delivery rate >99%
- [ ] PDF generation success rate >99%
- [ ] Lighthouse score >90 (mobile)
- [ ] Unit test coverage >80%

**Feature Metrics:**
- [ ] Lead capture from website form working
- [ ] 12-stage Kanban pipeline functional
- [ ] Inspection form complete (100+ fields)
- [ ] AI summaries generating correctly
- [ ] PDF generation working
- [ ] Email automation sending reliably
- [ ] Customer booking system live
- [ ] Calendar conflict detection working

**Business Metrics:**
- [ ] Demo runs flawlessly (15 minutes)
- [ ] Owners impressed with automation
- [ ] Field technicians trained and confident
- [ ] Data migration from Airtable complete

### Long-Term Success Metrics (6 Months Post-Launch)

**Operational Efficiency:**
- Admin time: 10h/week → 2h/week (80% reduction)
- Response time: 4 hours → 15 minutes (94% improvement)
- Lead conversion: 30% → 50% (67% increase)

**Business Growth:**
- Monthly jobs: 20 → 50+ (150% increase)
- Revenue per month: Track growth
- Customer satisfaction: >4.5/5 stars

**Technical Performance:**
- Uptime: >99.5%
- Average page load: <2 seconds
- Mobile usage: >70% of traffic
- Zero data loss incidents

---

## 📚 Related Documents

### Core Planning Documents

1. **CLAUDE.md** - Project guide for all Claude Code sessions
   - Essential startup workflow
   - Visual development checklist
   - MRC-specific standards
   - Common issues & solutions

2. **MRC-PRD.md** (111KB) - Product Requirements Document
   - Executive summary
   - User personas
   - 12-stage workflow
   - Feature specifications
   - Email templates
   - Demo script

3. **MRC-TECHNICAL-SPEC.md** (87KB) - Technical Implementation
   - System architecture
   - Database schema (11 tables)
   - API design patterns
   - Component architecture
   - Email system setup
   - PDF generation
   - Calendar algorithm
   - Deployment guide

4. **MRC-SPRINT-1-TASKS.md** (79KB) - 4-Week Roadmap
   - Week 1: Foundation & Database
   - Week 2: Core Features
   - Week 3: Automation & PDF
   - Week 4: Polish & Demo
   - 57 detailed tasks
   - Testing checklist
   - Risk mitigation

5. **design-checklist-s-tier.md** (43KB) - Design Standards
   - Current state assessment
   - MRC-specific principles
   - Mobile requirements
   - Australian formatting
   - Critical gaps identified

6. **MRC-LEAD-MANAGEMENT-SYSTEM-MASTER-TODO-LIST.md** - Complete Task List
   - 220+ individual tasks
   - Organized by phase
   - Detailed requirements
   - Business rules

### Quick Reference

**Start New Session:**
```bash
cat CLAUDE.md
cat context/MRC-SPRINT-1-TASKS.md
git status
```

**Check Design Standards:**
```bash
cat context/design-checklist-s-tier.md
```

**Review Technical Decisions:**
```bash
cat PLANNING.md  # This document
cat context/MRC-TECHNICAL-SPEC.md
```

**View Complete Requirements:**
```bash
cat context/MRC-PRD.md
```

---

## 🎯 Current Status

**Sprint:** Sprint 1 (Weeks 1-4)
**Phase:** Planning & Documentation Complete
**Next Phase:** Week 1 - Foundation & Database

**Completed:**
- ✅ Project vision defined
- ✅ Architecture designed
- ✅ Technology stack selected
- ✅ Database schema planned
- ✅ API patterns established
- ✅ 4-week roadmap created
- ✅ Design standards documented

**In Progress:**
- 🔄 Developer environment setup
- 🔄 Supabase project configuration

**Blocked:**
- None

**Next Steps:**
1. Setup Supabase project
2. Create database migrations (11 tables)
3. Seed suburb zones data
4. Enable Row Level Security
5. Generate TypeScript types
6. Begin Week 1 tasks

---

## 📝 Decision Log

**2025-11-11:**
- ✅ Decided on React Query for server state management
- ✅ Decided on Context API for UI state
- ✅ Decided on localStorage + auto-save for data persistence
- ✅ Decided on zone-based travel time matrix (no Google Maps API needed)
- ✅ Decided on Resend API for email delivery
- ✅ Decided on Claude API for AI summaries
- ✅ Decided on Puppeteer for PDF generation
- ✅ Confirmed 4-week sprint timeline
- ✅ Established mobile-first as primary constraint

**Future Decisions Needed:**
- SMS provider selection (Week 3)
- Payment gateway integration (Sprint 2)
- Analytics platform selection (Week 4)
- Monitoring/logging service (Week 4)

---

**Last Updated:** 2025-11-11
**Next Review:** Weekly during active development
**Document Owner:** Claude Code Team

---

*This planning document serves as the "north star" for the MRC Lead Management System. All development decisions should align with the vision, architecture, and standards established here.*

**Ready to build? Start with `context/MRC-SPRINT-1-TASKS.md` Week 1, Task 1.1!** 🚀

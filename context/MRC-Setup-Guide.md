MRC Lead Management System - Complete Claude Code Setup Guide
Business Context: Melbourne-based mould restoration company replacing Airtable+Zapier with mobile-first React+Supabase system. Primary users: 2 field technicians (Clayton & Glen) working 7am-7pm on mobile devices.
Critical Requirements:

Mobile-first: 375px primary viewport (field technicians work on phones)
Offline-capable: Inspection forms must work without internet
Australian compliance: Phone formats, ABN, GST calculations, date formats
Data integrity: Complete audit trail, zero data loss
Automated workflows: PDF generation, 21+ email/SMS automations


Phase 0: Environment Prerequisites
1. Install Required Tools
bash# Verify Node.js 20+ (required for MCP servers)
node --version  # Should be v20.0.0 or higher

# If not installed, use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install pnpm (faster, more reliable than npm)
npm install -g pnpm

# Verify Claude Code CLI (should already be installed)
claude --version

# Install GitHub CLI (for MCP integration)
brew install gh  # macOS
# OR
sudo apt install gh  # Ubuntu

# Authenticate GitHub
gh auth login
2. Create Project Structure
bash# Navigate to your projects directory
cd ~/projects

# Create project directory
mkdir mrc-lead-management
cd mrc-lead-management

# Initialize git
git init
git branch -M main

# Create GitHub repository
gh repo create mrc-lead-management --private --source=. --remote=origin

# Initial commit
git add .
git commit -m "Initial commit: MRC Lead Management System"
git push -u origin main
3. Initialize Project
bash# Create React + TypeScript + Vite project
pnpm create vite@latest . --template react-ts

# Install core dependencies
pnpm install

# Install Tailwind CSS (mobile-first)
pnpm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install Supabase client
pnpm install @supabase/supabase-js

# Install state management & data fetching
pnpm install zustand @tanstack/react-query

# Install forms & validation (Australian formats)
pnpm install react-hook-form zod @hookform/resolvers

# Install UI library (mobile-optimized)
pnpm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs
pnpm install lucide-react class-variance-authority clsx tailwind-merge

# Install offline support
pnpm install dexie dexie-react-hooks workbox-window

# Install testing infrastructure
pnpm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm install -D @playwright/test

# Install Australian phone/date utilities
pnpm install libphonenumber-js date-fns date-fns-tz

# Install PDF generation dependencies (for inspection reports)
pnpm install jspdf jspdf-autotable html2canvas

# Install email (will connect to Resend API)
pnpm install @react-email/components resend

Phase 1: Core Configuration Files
1. Tailwind Configuration (Mobile-First)
bash# Replace tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        // Mobile-first breakpoints (default is mobile 375px)
        'sm': '768px',   // Tablet
        'lg': '1440px',  // Desktop
      },
      colors: {
        // MRC Brand Colors
        brand: {
          navy: '#121D73',
          blue: '#150DB8',
          gray: '#f5f5f5',
        },
      },
      fontSize: {
        // Minimum 16px to prevent iOS zoom on input focus
        'base': '16px',
      },
      minHeight: {
        // Touch-friendly minimum heights
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
EOF
2. TypeScript Configuration (Strict Mode)
bash# Replace tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Strict type-checking - CRITICAL for production */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
3. Playwright Configuration (3 Viewports)
bash# Create playwright.config.ts
cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'mobile-375-primary',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'tablet-768',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop-1440',
      use: {
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],

  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
EOF
4. Vitest Configuration
bash# Create vitest.config.ts
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
EOF
5. Environment Variables
bash# Create .env.example (commit this)
cat > .env.example << 'EOF'
# Supabase Configuration (Development)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx

# OpenAI API (for AI report generation)
VITE_OPENAI_API_KEY=sk-xxxxx

# Resend API (for email automation)
VITE_RESEND_API_KEY=re_xxxxx

# Google Maps API (for travel time calculation)
VITE_GOOGLE_MAPS_API_KEY=xxxxx

# Environment
VITE_APP_ENV=development
EOF

# Create actual .env file (gitignored)
cp .env.example .env

# Add to .gitignore
cat >> .gitignore << 'EOF'

# Environment variables
.env
.env.local
.env.production

# Claude Code
.claude/settings.local.json
.claude/.mcp.json

# Testing
test-results/
playwright-report/
coverage/

# Build artifacts
dist/
*.local
EOF

Phase 2: Claude Code Directory Structure
Create .claude Directory
bash# Create complete Claude Code structure
mkdir -p .claude/{agents,commands,hooks,output-styles}
mkdir -p docs/claude

# Create settings files
touch .claude/settings.json
touch .claude/settings.local.json
touch .claude/.mcp.json

Phase 3: CLAUDE.md - Project Brain (MOST CRITICAL FILE)
bash# Create comprehensive project documentation
cat > CLAUDE.md << 'EOF'
# MRC Lead Management System - Project Memory

**Last Updated:** $(date +%Y-%m-%d)

---

## 🎯 PROJECT OVERVIEW

### Business Context
Mould & Restoration Co. (MRC) is a Melbourne-based mould inspection and remediation company replacing Airtable+Zapier with a custom React+Supabase solution.

**Company Details:**
- ABN: 47 683 089 652
- Phone: 1800 954 117
- Service Area: Melbourne metropolitan (145+ suburbs)
- Operating Hours: 7am-7pm, 7 days/week
- Team: 2 technicians (Clayton & Glen) with equal admin access

### Primary Users
**Field Technicians (Clayton & Glen):**
- Work entirely on mobile phones in the field
- Complete inspections on-site (no internet sometimes)
- Need simple, fast, touch-friendly interfaces
- Cannot afford data loss (business-critical)

### System Purpose
End-to-end workflow automation handling:
1. Lead capture (website forms + HiPages integration)
2. Lead management with pipeline visualization
3. Complex inspection forms (15+ sections, conditional logic)
4. Real-time cost calculations (Melbourne-specific pricing)
5. AI-powered report generation (OpenAI GPT-4)
6. PDF generation with editable templates
7. Automated email/SMS workflows (21 total automations)
8. Calendar management with travel time intelligence
9. Client self-booking with conflict detection
10. Payment tracking and review collection

---

## 🏗️ TECH STACK

### Frontend
- **Framework:** React 18.2 with TypeScript 5.2 (strict mode)
- **Build:** Vite 5.0
- **Routing:** React Router v6
- **State:** Zustand + React Query
- **Forms:** React Hook Form + Zod validation
- **Styling:** Tailwind CSS 3.4 (mobile-first)
- **UI Components:** Radix UI (accessible, touch-friendly)
- **Icons:** Lucide React

### Backend
- **Database:** Supabase (PostgreSQL 15)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage (photos, PDFs)
- **Real-time:** Supabase Realtime subscriptions
- **API:** Supabase PostgREST + Edge Functions

### External Services
- **Email:** Resend API (transactional emails)
- **SMS:** Twilio (critical notifications)
- **AI:** OpenAI API GPT-4 (report generation)
- **PDF:** jsPDF + html2canvas (client-side generation)
- **Maps:** Google Maps Distance Matrix API (travel time)

### Offline Support
- **Local Storage:** Dexie (IndexedDB wrapper)
- **PWA:** Workbox (service worker, caching)
- **Sync:** Background sync API

### Testing
- **Unit:** Vitest + React Testing Library
- **E2E:** Playwright (3 viewports: 375px, 768px, 1440px)
- **Coverage:** Minimum 80%

---

## 📱 MOBILE-FIRST REQUIREMENTS (NON-NEGOTIABLE)

### Primary Viewport: 375px
- Test EVERY change at 375px width immediately
- Mobile layout is default, NOT an afterthought
- Thumb-friendly navigation (bottom placement)
- Touch targets minimum 44x44px (iOS guideline)
- No horizontal scrolling ever
- Progressive disclosure for complex forms

### Responsive Breakpoints (Tailwind)
```css
/* Default: Mobile 375px (no breakpoint prefix) */
.text-sm { ... }

/* Tablet: 768px */
sm:text-base { ... }

/* Desktop: 1440px */
lg:text-lg { ... }
```

### Touch Interaction Guidelines
- Large, well-spaced buttons (minimum 44x44px)
- Swipe gestures for common actions
- Pull-to-refresh for data updates
- Haptic feedback on important actions
- Avoid hover-dependent interactions
- Fat-finger friendly spacing (16px minimum)

### Performance Targets
- Load time <3 seconds on 4G
- First Contentful Paint <1.5s
- Time to Interactive <3.5s
- Lighthouse mobile score >90

---

## 🇦🇺 AUSTRALIAN COMPLIANCE (MANDATORY)

### Phone Number Formats
- **Mobile:** 04XX XXX XXX (10 digits, starts with 04)
- **Landline:** (0X) XXXX XXXX (area code + 8 digits)
- **Toll-free:** 1800 XXX XXX
- **Validation:** Use libphonenumber-js with 'AU' region
```typescript
import { parsePhoneNumber } from 'libphonenumber-js';

const validateAustralianPhone = (phone: string): boolean => {
  try {
    const phoneNumber = parsePhoneNumber(phone, 'AU');
    return phoneNumber.isValid() && phoneNumber.country === 'AU';
  } catch {
    return false;
  }
};
```

### ABN Format
- Format: XX XXX XXX XXX (11 digits with spaces)
- Example: 47 683 089 652
- Validation: Luhn algorithm checksum

### Currency & GST
- Currency: Australian dollars (AUD)
- Format: $X,XXX.XX (comma thousand separator, 2 decimals)
- GST: Always 10% added on top of subtotal
- Display both excluding and including GST
```typescript
const formatAustralianCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const calculateGST = (subtotal: number): number => {
  return subtotal * 0.10;
};
```

### Date & Time Formats
- Date: DD/MM/YYYY (Australian standard)
- Time: 12-hour format (9:00 AM - 7:00 PM)
- Timezone: Australia/Melbourne (AEST/AEDT aware)
```typescript
import { format, formatInTimeZone } from 'date-fns-tz';

const formatAustralianDate = (date: Date): string => {
  return formatInTimeZone(date, 'Australia/Melbourne', 'dd/MM/yyyy');
};

const formatAustralianDateTime = (date: Date): string => {
  return formatInTimeZone(date, 'Australia/Melbourne', 'dd/MM/yyyy h:mm a');
};
```

### Spelling
- Use Australian English throughout (colour, labour, organise, centre, etc.)
- Never use American spelling in user-facing text

---

## 💰 PRICING CALCULATION RULES (BUSINESS-CRITICAL)

### Base Rates (EXCLUDING GST)
All rates are per hour, GST added after calculation:

**No Demolition (Surface Treatment):**
- 2 hours = $612.00
- 8 hours = $1,216.99

**Demolition Required:**
- 2 hours = $711.90
- 8 hours = $1,798.90

**Construction Work:**
- 2 hours = $661.96
- 8 hours = $1,507.95

**Subfloor Treatment:**
- 2 hours = $900.00
- 8 hours = $2,334.69

### Volume Discount Logic
Apply discount if total hours > 8 (one full working day):

- 16 hours (2 days) = 0.925 multiplier (7.5% discount)
- 24 hours (3 days) = 0.9125 multiplier (8.75% discount)
- Scale linearly between days
- **ABSOLUTE CAP: 13% maximum discount (0.87 multiplier)**
```typescript
const calculateDiscountMultiplier = (totalHours: number): number => {
  if (totalHours <= 8) return 1.0; // No discount
  
  const days = totalHours / 8;
  const discountPercent = 7.5 + ((days - 2) * 1.25);
  
  // Cap at 13% maximum discount
  const cappedDiscountPercent = Math.min(discountPercent, 13);
  
  return 1 - (cappedDiscountPercent / 100);
};
```

### Equipment Hire Rates (per day, EXCLUDING GST)
- Dehumidifier: $132/day
- Air mover/blower: $46/day
- RCD: $5/day

### Calculation Formula
```typescript
const calculateJobCost = (params: {
  workType: 'surface' | 'demolition' | 'construction' | 'subfloor';
  hours: number;
  equipment: { dehumidifiers: number; airMovers: number; rcds: number; days: number };
}): { subtotal: number; gst: number; total: number } => {
  // 1. Calculate hourly rate with volume discount
  const baseRate = getBaseRate(params.workType, params.hours);
  const discountMultiplier = calculateDiscountMultiplier(params.hours);
  const labourCost = baseRate * params.hours * discountMultiplier;
  
  // 2. Calculate equipment costs
  const equipmentCost = 
    (params.equipment.dehumidifiers * 132 * params.equipment.days) +
    (params.equipment.airMovers * 46 * params.equipment.days) +
    (params.equipment.rcds * 5 * params.equipment.days);
  
  // 3. Calculate totals
  const subtotal = labourCost + equipmentCost;
  const gst = subtotal * 0.10;
  const total = subtotal + gst;
  
  return { subtotal, gst, total };
};
```

**CRITICAL:** Pricing changes only affect NEW leads going forward. Existing leads keep their original pricing locked.

---

## 📅 CALENDAR & BOOKING LOGIC (BULLETPROOF REQUIRED)

### Technician Capacity
- **1 technician:** 8 hours max per day
- **2 technicians (Clayton + Glen):** 16 hours max per day
- **Operating hours:** 7:00 AM - 7:00 PM (12-hour window)

### Job Scheduling Rules
- Jobs MUST run on consecutive days (e.g., Mon+Tue, NOT Mon+Wed)
- If job > 16 hours (2 technicians full day), requires multiple consecutive days
- Same technicians throughout entire job
- Block full calendar days for duration

### Inspection Scheduling
- Duration: Maximum 1 hour per inspection
- Can schedule multiple inspections per technician per day
- Must account for travel time between locations

### Travel Time (Melbourne Suburbs)
Pre-defined suburb zones for travel estimation:
- **Zone 1 (Inner Melbourne):** 15-30 min travel buffer
- **Zone 2 (Middle suburbs):** 30-45 min travel buffer
- **Zone 3 (Outer suburbs):** 45-60 min travel buffer

**Example conflict:**
- 2:00 PM inspection in Craigieburn (Zone 3)
- 3:00 PM inspection in Mernda (Zone 3)
- BLOCK THIS: Travel time ~45 minutes, too tight
```typescript
const checkTravelTimeFeasibility = (
  inspection1: { suburb: string; endTime: Date },
  inspection2: { suburb: string; startTime: Date }
): boolean => {
  const travelTime = calculateTravelTime(inspection1.suburb, inspection2.suburb);
  const bufferTime = 15 * 60 * 1000; // 15 minutes buffer
  const timeBetween = inspection2.startTime.getTime() - inspection1.endTime.getTime();
  
  return timeBetween >= (travelTime + bufferTime);
};
```

### Conflict Detection (Database-Level)
Must check across ALL booking types:
1. `inspections` table - scheduled inspections
2. `jobs` table - ongoing remediation work
3. `calendar_bookings` - blocked time/holidays
4. `technician_availability` - personal time off

**Database constraint:** Prevent double-booking with unique constraints and triggers.

---

## 🔒 SECURITY REQUIREMENTS

### Authentication (Supabase Auth)
- Email/password authentication (no social logins initially)
- Password requirements: min 12 chars, uppercase, lowercase, number, symbol
- Password reset flow with email verification
- Session management: 7-day refresh token, 1-hour access token
- Protected routes with auth guards

### Authorization (Row Level Security)
All Supabase tables MUST have RLS policies:
```sql
-- Example: Technicians can only see leads assigned to them or unassigned
CREATE POLICY "Technicians access own leads"
ON leads FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid() 
  OR assigned_to IS NULL
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
```

### Input Validation (Zod Schemas)
Every form input must be validated:
```typescript
import { z } from 'zod';

const leadSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().refine(validateAustralianPhone, 'Invalid Australian phone number'),
  email: z.string().email('Invalid email address').optional(),
  suburb: z.string().min(1, 'Suburb is required'),
  propertyType: z.enum(['house', 'apartment', 'townhouse', 'commercial']),
});
```

### XSS Prevention
- Sanitize all user-generated content before rendering
- Use React's built-in XSS protection (never use `dangerouslySetInnerHTML` without sanitization)
- Content Security Policy headers

### API Key Security
- Never expose API keys in client-side code
- Use Supabase Edge Functions for sensitive operations (OpenAI, Resend, Twilio)
- Store keys in Supabase secrets

---

## 💾 OFFLINE-FIRST ARCHITECTURE

### Local Storage Strategy (Dexie + IndexedDB)
Mirror Supabase tables locally:
```typescript
import Dexie, { Table } from 'dexie';

class MRCDatabase extends Dexie {
  leads!: Table<Lead>;
  inspections!: Table<Inspection>;
  photos!: Table<Photo>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('MRCDatabase');
    this.version(1).stores({
      leads: '++id, status, createdAt, syncStatus',
      inspections: '++id, leadId, syncStatus, lastModified',
      photos: '++id, inspectionId, syncStatus',
      syncQueue: '++id, action, table, recordId, timestamp, retryCount',
    });
  }
}

export const db = new MRCDatabase();
```

### Optimistic UI Updates
```typescript
const createLead = async (leadData: NewLead) => {
  // 1. Generate temporary ID
  const tempId = `temp-${Date.now()}`;
  
  // 2. Immediately update UI (optimistic)
  const optimisticLead = { ...leadData, id: tempId, status: 'pending' };
  updateLocalState(optimisticLead);
  
  // 3. Queue for background sync
  await db.syncQueue.add({
    action: 'create',
    table: 'leads',
    data: leadData,
    timestamp: new Date(),
    retryCount: 0,
  });
  
  // 4. Attempt sync if online
  if (navigator.onLine) {
    try {
      const { data, error } = await supabase.from('leads').insert(leadData).select().single();
      if (error) throw error;
      
      // Replace temp ID with real ID
      updateLocalState({ ...data, syncStatus: 'synced' });
      removeFromSyncQueue(tempId);
    } catch (error) {
      // Will retry in background
      console.error('Sync failed, will retry:', error);
    }
  }
};
```

### Conflict Resolution
**Strategy:** Last-write-wins with server timestamp as source of truth
```typescript
const resolveConflict = async (
  localRecord: Record,
  serverRecord: Record
): Promise<Record> => {
  // Server timestamp wins
  if (serverRecord.updatedAt > localRecord.updatedAt) {
    return serverRecord; // Discard local changes, use server version
  } else {
    // Upload local changes to server
    await supabase.from(localRecord.table).update(localRecord).eq('id', localRecord.id);
    return localRecord;
  }
};
```

### Background Sync
```typescript
// Register service worker for background sync
if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
  navigator.serviceWorker.ready.then((registration) => {
    return registration.sync.register('sync-mrc-data');
  });
}

// In service worker (sw.ts)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mrc-data') {
    event.waitUntil(syncPendingData());
  }
});
```

---

## 🧪 TESTING REQUIREMENTS

### Unit Tests (Vitest + React Testing Library)
- Minimum 80% code coverage
- Test all utility functions (pricing, validation, formatting)
- Test all custom hooks
- Test all complex business logic
```typescript
// Example: tests/utils/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { calculateJobCost, calculateDiscountMultiplier } from '@/lib/pricing';

describe('Pricing Calculations', () => {
  it('should calculate 2-hour surface job correctly', () => {
    const result = calculateJobCost({
      workType: 'surface',
      hours: 2,
      equipment: { dehumidifiers: 0, airMovers: 0, rcds: 0, days: 0 },
    });
    
    expect(result.subtotal).toBe(612.00);
    expect(result.gst).toBe(61.20);
    expect(result.total).toBe(673.20);
  });
  
  it('should cap discount at 13% maximum', () => {
    const multiplier = calculateDiscountMultiplier(100); // 12.5 days
    expect(multiplier).toBe(0.87); // 13% discount cap
  });
});
```

### Component Tests
```typescript
// Example: tests/components/LeadForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadForm } from '@/components/LeadForm';

describe('LeadForm', () => {
  it('should validate Australian phone number', async () => {
    const user = userEvent.setup();
    render(<LeadForm />);
    
    const phoneInput = screen.getByLabelText(/phone/i);
    await user.type(phoneInput, '1234567890'); // Invalid AU format
    await user.tab(); // Trigger validation
    
    expect(screen.getByText(/invalid australian phone number/i)).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright - 3 Viewports)
```typescript
// Example: tests/e2e/lead-capture.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Lead Capture Flow', () => {
  test('should work on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/leads/new');
    
    // Verify mobile layout
    await expect(page.locator('.mobile-navigation')).toBeVisible();
    
    // Fill form
    await page.getByLabel('Customer Name').fill('John Smith');
    await page.getByLabel('Phone').fill('0412345678');
    await page.getByLabel('Suburb').fill('Melbourne');
    
    // Submit
    await page.getByRole('button', { name: 'Create Lead' }).click();
    
    // Verify success
    await expect(page).toHaveURL(/\/leads\/\d+/);
    await expect(page.getByRole('heading')).toContainText('John Smith');
  });
});
```

### Testing Offline Functionality
```typescript
test('should work offline', async ({ page, context }) => {
  await page.goto('/inspections/new');
  
  // Go offline
  await context.setOffline(true);
  
  // Fill inspection form
  await page.getByLabel('Area Name').fill('Living Room');
  await page.getByLabel('Temperature').fill('22');
  
  // Verify offline indicator
  await expect(page.locator('.offline-indicator')).toBeVisible();
  
  // Submit (should queue locally)
  await page.getByRole('button', { name: 'Save Inspection' }).click();
  await expect(page.locator('.queued-for-sync')).toBeVisible();
  
  // Go back online
  await context.setOffline(false);
  await page.waitForTimeout(2000); // Wait for sync
  
  // Verify synced
  await expect(page.locator('.synced-indicator')).toBeVisible();
});
```

---

## 📝 CODE STANDARDS & PATTERNS

### Component Structure
```typescript
// Standard component template
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface LeadCardProps {
  leadId: string;
  onUpdate?: () => void;
}

export function LeadCard({ leadId, onUpdate }: LeadCardProps) {
  // 1. State declarations
  const [isEditing, setIsEditing] = useState(false);
  
  // 2. Data fetching (React Query)
  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => fetchLead(leadId),
  });
  
  // 3. Mutations
  const updateMutation = useMutation({
    mutationFn: updateLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      onUpdate?.();
    },
  });
  
  // 4. Event handlers
  const handleSave = () => {
    updateMutation.mutate({ id: leadId, status: 'contacted' });
  };
  
  // 5. Loading & error states
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} />;
  if (!lead) return <EmptyState />;
  
  // 6. Render
  return (
    <div className="touch-target min-h-touch p-4 bg-white rounded-lg">
      {/* Component content */}
    </div>
  );
}
```

### Custom Hooks Pattern
```typescript
// hooks/useLeadForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leadSchema } from '@/lib/validation';

export function useLeadForm() {
  const form = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      customerName: '',
      phone: '',
      email: '',
      suburb: '',
    },
  });
  
  const onSubmit = async (data: LeadFormData) => {
    // Handle submission
  };
  
  return { form, onSubmit };
}
```

### Error Boundary Pattern
```typescript
// Every major section needs error boundary
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Router>
        <Routes>
          <Route path="/leads" element={
            <ErrorBoundary fallback={<ErrorFallback />}>
              <LeadsPage />
            </ErrorBoundary>
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment Verification
- [ ] All tests passing (unit, integration, E2E)
- [ ] TypeScript compiles with zero errors (strict mode)
- [ ] ESLint passes with zero warnings
- [ ] Lighthouse mobile score >90
- [ ] Manual testing at 375px, 768px, 1440px
- [ ] Offline functionality tested
- [ ] Database migrations tested on staging
- [ ] RLS policies verified with multiple user roles
- [ ] All environment variables configured
- [ ] API keys secured (never in client code)
- [ ] Error monitoring configured (Sentry)
- [ ] Analytics configured (Vercel Analytics)

### Production Environment
- **Frontend:** Vercel (automatic deployments from main branch)
- **Backend:** Supabase (production project)
- **Storage:** Supabase Storage (production bucket)
- **Email:** Resend (production API key)
- **SMS:** Twilio (production credentials)
- **Monitoring:** Sentry (error tracking)

---

## 📚 ADDITIONAL DOCUMENTATION

See also:
- `docs/claude/architecture.md` - System design decisions
- `docs/claude/mobile-patterns.md` - Responsive design patterns
- `docs/claude/offline-strategy.md` - Sync and caching approach
- `docs/claude/pricing-rules.md` - Detailed pricing scenarios
- `docs/claude/calendar-logic.md` - Booking conflict resolution

---

## 🔄 CHANGELOG

**$(date +%Y-%m-%d):** Initial project setup with comprehensive documentation
EOF
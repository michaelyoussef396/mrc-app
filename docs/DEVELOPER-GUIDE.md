# MRC Lead Management System - Developer Guide

---

## Table of Contents

1. [Code Structure](#code-structure)
2. [Local Development Setup](#local-development-setup)
3. [How to Add Features](#how-to-add-features)
4. [Testing Patterns](#testing-patterns)
5. [Conventions & Standards](#conventions--standards)
6. [Deployment Checklist](#deployment-checklist)

---

## Code Structure

```
mrc-app-1/
├── docs/                          # Documentation (you are here)
├── public/                        # Static assets (favicon, robots.txt)
├── src/
│   ├── assets/                    # Images, icons
│   ├── components/                # React components (~114 files)
│   │   ├── admin/                 # Admin sidebar, modals, create-lead
│   │   ├── booking/               # Booking/scheduling components
│   │   ├── dashboard/             # Dashboard stat cards, widgets
│   │   ├── inspection/            # Inspection form sections
│   │   ├── layout/                # AppLayout, headers
│   │   ├── leads/                 # LeadCard, PipelineTabs, CreateLeadDialog
│   │   ├── loading/               # GlobalLoader, ProgressBar, PageTransition
│   │   ├── pdf/                   # PDF rendering components
│   │   ├── reports/               # Report display
│   │   ├── schedule/              # Calendar components
│   │   ├── technician/            # TechnicianBottomNav, dashboard widgets
│   │   ├── technicians/           # Admin view of technicians
│   │   └── ui/                    # shadcn/ui base components
│   ├── contexts/
│   │   └── AuthContext.tsx         # Auth state, roles, device management
│   ├── hooks/                     # Custom React hooks (~20)
│   │   ├── useTechnicianJobs.ts   # Technician job data
│   │   ├── useAdminDashboardStats.ts
│   │   ├── useTodaysSchedule.ts
│   │   ├── useUnassignedLeads.ts
│   │   └── ...
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client (with RememberMeStorage)
│   │       └── types.ts           # Auto-generated database types
│   ├── lib/
│   │   ├── api/                   # API helpers (notifications, PDF generation)
│   │   ├── calculations/          # Pricing, labour rate calculations
│   │   ├── hooks/                 # useSessionRefresh
│   │   ├── offline/               # Dexie DB, sync manager, network status
│   │   ├── schemas/               # Zod validation schemas
│   │   ├── utils/                 # photoUpload, htmlToPdf
│   │   ├── validators/            # Lead creation validators
│   │   ├── inspectionUtils.ts     # Dew point, formatting
│   │   ├── statusFlow.ts          # Lead status pipeline definitions
│   │   └── ...
│   ├── pages/                     # Route-level page components (~21)
│   ├── services/                  # Session, login activity services
│   ├── templates/                 # Email HTML templates
│   ├── types/                     # TypeScript interfaces
│   ├── utils/                     # General utilities
│   ├── App.tsx                    # Routes, QueryClient, providers
│   └── index.css                  # Global styles (hide-scrollbar, etc.)
├── supabase/
│   ├── functions/                 # Edge functions (9 functions)
│   │   ├── send-email/
│   │   ├── generate-inspection-pdf/
│   │   ├── send-inspection-reminder/
│   │   ├── generate-inspection-summary/
│   │   ├── send-slack-notification/
│   │   ├── calculate-travel-time/
│   │   ├── manage-users/
│   │   ├── seed-admin/
│   │   └── export-inspection-context/
│   └── migrations/                # Database migration files
├── vite.config.ts                 # Build config, PWA plugin, code splitting
├── vitest.config.ts               # Test configuration
├── tailwind.config.ts             # Tailwind CSS config
├── tsconfig.json                  # TypeScript config (strict mode)
└── package.json                   # Dependencies and scripts
```

### Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | React + TypeScript | Type safety, ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, accessible components |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) | All-in-one, real-time, RLS |
| State | React Query + Context | Server state caching, minimal client state |
| Forms | React Hook Form + Zod | Performance, schema validation |
| PWA | vite-plugin-pwa (Workbox) | Offline support for field technicians |
| Charts | Recharts | Lightweight, React-native |
| PDF | html2canvas + jsPDF (client-side) | No server-side PDF dependency |

### Routing Architecture

Two navigation patterns coexist:

1. **AppLayout routes** (`/dashboard`, `/leads`, `/calendar`, etc.) - Admin pages with sidebar
2. **Standalone routes** (`/admin/*`, `/technician/*`) - Full-page layouts without AppLayout

Technician routes are completely independent under `/technician/*` with their own `TechnicianBottomNav`.

---

## Local Development Setup

### Prerequisites

- Node.js >= 18
- npm >= 9
- Supabase CLI (`npm install -g supabase`)

### Setup Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd mrc-app-1

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Start dev server
npm run dev
# App runs at http://localhost:8080

# 5. (Optional) Start Supabase locally
supabase start
supabase functions serve
```

### Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite --host` | Start dev server (port 8080) |
| `build` | `tsc && vite build` | Production build |
| `preview` | `vite preview` | Preview production build |
| `test` | `vitest` | Run tests in watch mode |
| `test:run` | `vitest run` | Run tests once |
| `test:ui` | `vitest --ui` | Visual test UI |
| `lint` | `eslint .` | Lint code |

---

## How to Add Features

### Adding a New Page

1. **Create the page component** in `src/pages/`:
   ```typescript
   // src/pages/MyNewPage.tsx
   const MyNewPage = () => {
     return <div>My New Page</div>;
   };
   export default MyNewPage;
   ```

2. **Add lazy import** in `src/App.tsx`:
   ```typescript
   const MyNewPage = lazy(() => import("./pages/MyNewPage"));
   ```

3. **Add route** in the appropriate section of `App.tsx`:
   ```tsx
   <Route path="/my-new-page" element={
     <ProtectedRoute>
       <RoleProtectedRoute allowedRoles={["admin"]}>
         <AppLayout><MyNewPage /></AppLayout>
       </RoleProtectedRoute>
     </ProtectedRoute>
   } />
   ```

### Adding a New Database Column

1. **Create migration:**
   ```bash
   supabase migration new add_my_column
   ```

2. **Write SQL** in the generated migration file:
   ```sql
   ALTER TABLE leads ADD COLUMN my_column TEXT;
   ```

3. **Push migration:**
   ```bash
   supabase db push
   ```

4. **Regenerate TypeScript types:**
   ```bash
   supabase gen types typescript --project-id ecyivrxjpsmjmexqatym > src/integrations/supabase/types.ts
   ```

### Adding a New Edge Function

1. **Create the function:**
   ```bash
   supabase functions new my-function
   ```

2. **Implement** in `supabase/functions/my-function/index.ts`:
   ```typescript
   import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

   const corsHeaders = {
     "Access-Control-Allow-Origin": "*",
     "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
   };

   Deno.serve(async (req) => {
     if (req.method === "OPTIONS") {
       return new Response(null, { status: 204, headers: corsHeaders });
     }

     try {
       const { myField } = await req.json();
       // ... your logic here
       return new Response(
         JSON.stringify({ success: true }),
         { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     } catch (error) {
       return new Response(
         JSON.stringify({ error: error.message }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
   });
   ```

3. **Deploy:**
   ```bash
   supabase functions deploy my-function
   ```

### Adding a New Custom Hook

Place hooks in `src/hooks/` for UI-level hooks or `src/lib/hooks/` for utility hooks:

```typescript
// src/hooks/useMyData.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMyData = (id: string) => {
  return useQuery({
    queryKey: ["my-data", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("my_table")
        .select("id, name, status")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};
```

---

## Testing Patterns

### Unit Tests (Vitest)

Tests live alongside source files or in `__tests__` directories:

```typescript
// src/lib/__tests__/inspectionUtils.test.ts
import { describe, it, expect } from "vitest";
import { calculateDewPoint } from "../inspectionUtils";

describe("calculateDewPoint", () => {
  it("calculates correct dew point for typical conditions", () => {
    const result = calculateDewPoint(25, 60);
    expect(result).toBeCloseTo(16.7, 0);
  });

  it("handles edge case: 0% humidity", () => {
    const result = calculateDewPoint(25, 0);
    expect(result).toBeLessThan(-40);
  });
});
```

Run tests:
```bash
npm run test        # Watch mode
npm run test:run    # Single run
```

### Manual Testing Checklist

For UI changes, test at these viewports:
1. **375px** (iPhone SE) - Primary viewport, test first
2. **768px** (iPad) - Tablet layout
3. **1440px** (Desktop) - Full desktop layout

Check:
- [ ] No horizontal scrolling at 375px
- [ ] Touch targets >= 48px height
- [ ] Forms are usable with one hand
- [ ] Loading states show correctly
- [ ] Error states display helpful messages
- [ ] Empty states have clear CTAs

### Database Testing

Use Supabase SQL Editor to verify:

```sql
-- Test RLS: Run as a specific user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

SELECT * FROM leads;  -- Should only return assigned leads for technicians
```

---

## Conventions & Standards

### TypeScript

- **Strict mode** enabled (`strict: true` in tsconfig)
- No `any` types -- use proper typing or `unknown`
- Interfaces for data shapes, types for unions/intersections
- PascalCase for types/interfaces, camelCase for variables/functions

### React Components

- **Functional components** only (no class components)
- **Named exports** for shared components, **default exports** for pages
- Props interfaces defined above the component:
  ```typescript
  interface MyComponentProps {
    title: string;
    onAction: (id: string) => void;
  }

  const MyComponent = ({ title, onAction }: MyComponentProps) => {
    // ...
  };
  ```

### Styling

- **Tailwind CSS** for all styling (no CSS modules, no styled-components)
- **shadcn/ui** for base components (Button, Dialog, Select, etc.)
- Mobile-first: start with mobile styles, add `md:` and `lg:` breakpoints
- Use `className` string composition with `cn()` from `lib/utils`

### Data Fetching

- **React Query** for server state (with 2-minute staleTime default)
- **Supabase client** for database queries
- Select specific columns (never `select('*')` in production queries)
- Always handle errors with toast notifications

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Pages | PascalCase | `LeadsManagement.tsx` |
| Components | PascalCase | `LeadCard.tsx` |
| Hooks | camelCase with `use` prefix | `useTechnicianJobs.ts` |
| Utilities | camelCase | `inspectionUtils.ts` |
| Types | PascalCase | `TechnicianJob` |
| Constants | UPPER_SNAKE_CASE | `PAGE_SIZE`, `LEAD_COLUMNS` |

### Australian Localisation

All user-facing dates, times, and currency must use Australian format:

```typescript
// Dates
new Date().toLocaleDateString("en-AU", {
  day: "numeric", month: "short", year: "numeric",
  timeZone: "Australia/Melbourne",
});
// Output: "17 Feb 2026"

// Currency
new Intl.NumberFormat("en-AU", {
  style: "currency", currency: "AUD",
}).format(1234.50);
// Output: "$1,234.50"

// Phone
// Display: (03) 1234 5678 or 0412 345 678
```

### Git Commit Messages

Use conventional commits:

```
feat: add labor cost field to inspection form
fix: correct GST calculation for equipment
style: improve mobile touch targets to 48px
refactor: extract pricing logic to shared utility
docs: add API documentation for edge functions
```

---

## Deployment Checklist

Before every production deployment:

### Code Quality
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx vite build` succeeds
- [ ] No `console.log` statements left in production code (warnings OK)
- [ ] No hardcoded secrets or API keys in source code
- [ ] No `any` types introduced

### Functionality
- [ ] Feature works at 375px viewport
- [ ] Touch targets are >= 48px
- [ ] No horizontal scrolling on mobile
- [ ] Loading and error states handled
- [ ] Australian date/currency formats used

### Database
- [ ] Migration file created for any schema changes
- [ ] RLS policies cover new tables/columns
- [ ] TypeScript types regenerated if schema changed

### Performance
- [ ] Bundle size hasn't increased unexpectedly
- [ ] No `select('*')` in new queries (select specific columns)
- [ ] Queries have appropriate `.limit()` for unbounded data
- [ ] React Query used for server state (not raw useState + useEffect)

### Security
- [ ] No secrets in frontend code
- [ ] RLS policies tested for new tables
- [ ] Input validation on user-facing forms
- [ ] SQL injection not possible (using Supabase client, not raw SQL)

---

*Last Updated: 2026-02-17*

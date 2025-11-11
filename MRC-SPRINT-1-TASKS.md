# MRC Sprint 1 - 4-Week Development Plan with Multi-Agent Integration

> **Sprint Goal:** Build complete lead management system from HiPages lead to customer booking
> **Duration:** 4 weeks (20 working days)
> **Deployment Blockers:** Security Auditor (zero critical), pricing-calculator (48 scenarios pass), Web Vitals Optimizer (mobile >90)
> **Primary Users:** Clayton & Glen (field technicians on mobile devices)

---

## =Ê Sprint Overview

### **Week 1: Foundation & Database** (Days 1-5)
- Database schema & RLS policies
- Authentication system
- Offline-first infrastructure
- Auto-save implementation
- **Checkpoint:** Database Migration Agent + Security Auditor validation

### **Week 2: Core Features** (Days 6-10)
- Dashboard with mobile-first design
- Kanban board (12-stage pipeline)
- Lead management (CRUD)
- Mobile bottom navigation
- **Checkpoint:** mobile-tester (375px) + Code Reviewer validation

### **Week 3: Automation & Intelligence** (Days 11-15)
- Inspection form (100+ fields)
- AI summary generation (Claude API)
- PDF generation (Supabase Edge Functions)
- Email automation (Resend API)
- **Checkpoint:** pricing-calculator + Security Auditor validation

### **Week 4: Calendar & Polish** (Days 16-20)
- Customer self-booking calendar
- Travel time conflict detection
- Settings & configuration
- Performance optimization
- **Final Checkpoint:** All 3 deployment blockers MUST PASS

---

## <¯ Daily Task Breakdown

---

## **WEEK 1: FOUNDATION & DATABASE**

---

### **Day 1 (Monday): Supabase Setup & Database Schema**

#### **Task 1.1: Setup Supabase Project**
**Priority:** P0 (Must Have)
**Time:** 2 hours
**Agent Workflow:**
```bash
# Step 1: Database Admin - Create project
"Create new Supabase project named 'mrc-lead-management'"

# Step 2: Database Admin - Configure regions
"Configure Sydney region for lowest latency to Melbourne users"

# Step 3: Security Auditor - Verify SSL
"Verify SSL certificates and secure connection settings"
```

**Acceptance Criteria:**
- [ ] Project created at dashboard.supabase.com
- [ ] Connection strings saved to `.env.local`
- [ ] Security Auditor confirms secure configuration

**Files Created:**
- `.env.local` (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY)

---

#### **Task 1.2: Create Database Schema - Core Tables**
**Priority:** P0 (Must Have)
**Time:** 3 hours
**Agent Workflow:**
```bash
# Step 1: Database Schema Architect - Design tables
"Design 11 database tables: leads, inspection_reports, inspection_photos,
quotes, jobs, invoices, payments, calendar_bookings, email_logs,
offline_queue, users"

# Step 2: SQL Pro - Write migration SQL
"Write SQL migration for all 11 tables with proper indexes,
foreign keys, and constraints"

# Step 3: Database Admin - Execute migration
"Execute migration 20250111000001_create_core_schema.sql"

# Step 4: Database Admin - Verify schema
"Verify all tables created with correct columns and types"
```

**SQL Migration Snippet:**
```sql
-- leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  property_address TEXT NOT NULL,
  property_postcode TEXT NOT NULL,
  property_zone INTEGER NOT NULL CHECK (property_zone BETWEEN 1 AND 4),
  lead_source TEXT DEFAULT 'hipages',
  lead_status TEXT NOT NULL DEFAULT 'new_lead',
  assigned_to UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_leads_status ON leads(lead_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_assigned ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created ON leads(created_at DESC);
```

**Acceptance Criteria:**
- [ ] All 11 tables created successfully
- [ ] Database Schema Architect confirms design quality
- [ ] SQL Pro validates indexes and constraints
- [ ] No errors in Supabase dashboard

**Files Created:**
- `supabase/migrations/20250111000001_create_core_schema.sql` (11 tables)

---

#### **Task 1.3: Implement Row Level Security (RLS)**
**Priority:** P0 (Must Have)
**Time:** 2 hours
**Agent Workflow:**
```bash
# Step 1: Security Auditor - Review auth requirements
"Review authentication requirements and define RLS policies needed"

# Step 2: SQL Pro - Write RLS policies
"Write RLS policies: technicians see assigned leads,
admins see all data, users access own offline queue"

# Step 3: Database Admin - Enable RLS
"Enable RLS on all tables and apply policies"

# Step 4: Security Auditor - Test RLS policies
"Test RLS policies with different user contexts - verify isolation"
```

**RLS Policy Snippet:**
```sql
-- Technicians see only assigned leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "technician_assigned_leads" ON leads
  FOR SELECT
  USING (
    auth.uid() = assigned_to
    AND deleted_at IS NULL
  );

-- Admins see all leads
CREATE POLICY "admin_all_leads" ON leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );
```

**Acceptance Criteria:**
- [ ] RLS enabled on all tables
- [ ] Security Auditor confirms no policy leaks
- [ ] Test with technician context: sees only assigned leads
- [ ] Test with admin context: sees all data

**Files Created:**
- `supabase/migrations/20250111000002_enable_rls.sql`

---

### **Day 2 (Tuesday): Offline Infrastructure & Auto-Save**

#### **Task 1.4: Implement Offline Queue System**
**Priority:** P0 (Must Have - Critical for field work)
**Time:** 4 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Define offline queue types
"Define TypeScript types for offline queue: action_type, table_name,
payload, retry_count, status"

# Step 2: TypeScript Pro - Implement offline queue hooks
"Create useOfflineQueue hook with queueAction, syncQueue, clearQueue methods"

# Step 3: Database Admin - Create offline_queue table
"Create offline_queue table with sync status tracking"

# Step 4: Test Engineer - Create offline scenarios
"Test offline scenarios: create lead while offline, edit inspection offline,
sync when back online"

# Step 5: Error Detective - Test error handling
"Test error scenarios: sync failures, conflicts, network timeouts"
```

**Implementation Snippet:**
```typescript
// src/lib/hooks/useOfflineQueue.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface OfflineAction {
  id: string;
  action_type: 'create' | 'update' | 'delete';
  table_name: string;
  payload: Record<string, any>;
  retry_count: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  created_at: string;
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Queue action when offline
  const queueAction = async (action: Omit<OfflineAction, 'id' | 'retry_count' | 'status' | 'created_at'>) => {
    const queueItem: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      retry_count: 0,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Save to localStorage
    const queue = getQueue();
    queue.push(queueItem);
    localStorage.setItem('offline_queue', JSON.stringify(queue));
    setQueueSize(queue.length);

    return queueItem.id;
  };

  // Sync queue when online
  const syncQueue = async () => {
    if (!isOnline) return;

    const queue = getQueue();
    const pendingActions = queue.filter(a => a.status === 'pending' || a.status === 'failed');

    for (const action of pendingActions) {
      try {
        action.status = 'syncing';
        updateQueue(queue);

        // Execute action
        if (action.action_type === 'create') {
          await supabase.from(action.table_name).insert(action.payload);
        } else if (action.action_type === 'update') {
          await supabase.from(action.table_name)
            .update(action.payload)
            .eq('id', action.payload.id);
        } else if (action.action_type === 'delete') {
          await supabase.from(action.table_name)
            .delete()
            .eq('id', action.payload.id);
        }

        action.status = 'completed';
        updateQueue(queue);
      } catch (error) {
        action.retry_count += 1;
        action.status = action.retry_count >= 3 ? 'failed' : 'pending';
        updateQueue(queue);
      }
    }

    // Remove completed actions
    const updatedQueue = queue.filter(a => a.status !== 'completed');
    localStorage.setItem('offline_queue', JSON.stringify(updatedQueue));
    setQueueSize(updatedQueue.length);
  };

  const getQueue = (): OfflineAction[] => {
    const stored = localStorage.getItem('offline_queue');
    return stored ? JSON.parse(stored) : [];
  };

  const updateQueue = (queue: OfflineAction[]) => {
    localStorage.setItem('offline_queue', JSON.stringify(queue));
    setQueueSize(queue.length);
  };

  return { isOnline, queueSize, queueAction, syncQueue };
}
```

**Acceptance Criteria:**
- [ ] TypeScript Pro confirms type safety
- [ ] Test Engineer confirms offline scenarios pass
- [ ] Error Detective confirms error handling works
- [ ] Queue persists in localStorage
- [ ] Sync on reconnection works 100%

**Files Created:**
- `src/lib/hooks/useOfflineQueue.ts`
- `src/types/offline.ts`
- `__tests__/useOfflineQueue.test.ts`

---

#### **Task 1.5: Implement Auto-Save (Every 30 Seconds)**
**Priority:** P0 (Must Have - Prevents data loss)
**Time:** 3 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Create useAutoSave hook
"Create useAutoSave hook with 30-second debounce, localStorage backup,
and saving indicator"

# Step 2: Test Engineer - Test auto-save scenarios
"Test: form changes trigger auto-save, localStorage backup works,
recovery on page reload"

# Step 3: mobile-tester - Test on mobile
"Test auto-save on mobile: works while scrolling, works with keyboard open,
works in background tab"

# Step 4: Error Detective - Test failure scenarios
"Test: network failure during save, concurrent edits, race conditions"
```

**Implementation Snippet:**
```typescript
// src/lib/hooks/useAutoSave.ts
import { useEffect, useRef, useState } from 'react';
import { useOfflineQueue } from './useOfflineQueue';

interface AutoSaveOptions {
  delay?: number; // milliseconds (default 30000)
  enabled?: boolean;
  storageKey: string;
}

export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: AutoSaveOptions
) {
  const { delay = 30000, enabled = true, storageKey } = options;
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { isOnline, queueAction } = useOfflineQueue();

  useEffect(() => {
    if (!enabled) return;

    // Save to localStorage immediately (backup)
    localStorage.setItem(storageKey, JSON.stringify(data));

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for database save
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);

      try {
        if (isOnline) {
          // Save to database
          await saveFunction(data);
          setLastSaved(new Date());
        } else {
          // Queue for later sync
          await queueAction({
            action_type: 'update',
            table_name: 'inspection_reports',
            payload: data as Record<string, any>,
          });
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, storageKey, saveFunction, isOnline, queueAction]);

  // Recover from localStorage
  const recover = (): T | null => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : null;
  };

  return { isSaving, lastSaved, recover };
}
```

**Acceptance Criteria:**
- [ ] Auto-save triggers every 30 seconds
- [ ] localStorage backup created immediately on change
- [ ] Test Engineer confirms recovery works
- [ ] mobile-tester confirms works on 375px viewport
- [ ] Error Detective confirms error handling works

**Files Created:**
- `src/lib/hooks/useAutoSave.ts`
- `__tests__/useAutoSave.test.ts`

---

### **Day 3 (Wednesday): Authentication & User Management**

#### **Task 1.6: Implement Supabase Auth**
**Priority:** P0 (Must Have)
**Time:** 3 hours
**Agent Workflow:**
```bash
# Step 1: Security Auditor - Review auth requirements
"Review authentication requirements: email/password, password reset,
role-based access (technician, admin)"

# Step 2: TypeScript Pro - Create auth context
"Create AuthContext with login, logout, resetPassword, user state"

# Step 3: Security Auditor - Implement secure login
"Implement secure login with HTTPS-only cookies, CSRF protection"

# Step 4: Test Engineer - Test auth flows
"Test: login successful, logout clears session, password reset works,
invalid credentials rejected"

# Step 5: Security Auditor - Security scan
"Scan for auth vulnerabilities: XSS, CSRF, session fixation,
credential stuffing"
```

**Implementation Snippet:**
```typescript
// src/lib/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

**Acceptance Criteria:**
- [ ] Security Auditor confirms secure implementation
- [ ] Test Engineer confirms all auth flows work
- [ ] Login redirects to dashboard
- [ ] Logout redirects to login page
- [ ] Password reset email sends successfully

**Files Created:**
- `src/lib/contexts/AuthContext.tsx`
- `src/pages/Login.tsx`
- `src/pages/ResetPassword.tsx`

---

### **Day 4 (Thursday): TypeScript Types & API Layer**

#### **Task 1.7: Generate TypeScript Types from Database**
**Priority:** P0 (Must Have)
**Time:** 2 hours
**Agent Workflow:**
```bash
# Step 1: Database Admin - Generate types
"Generate TypeScript types from Supabase database schema"

# Step 2: TypeScript Pro - Review and enhance types
"Review generated types, add utility types, ensure type safety"

# Step 3: TypeScript Pro - Create custom types
"Create custom types for forms, API responses, offline queue"

# Step 4: Code Reviewer - Review type definitions
"Review all type definitions for consistency and completeness"
```

**Type Generation Command:**
```bash
npx supabase gen types typescript --project-id=your-project-id > src/types/database.ts
```

**Custom Types Snippet:**
```typescript
// src/types/leads.ts
import { Database } from './database';

export type Lead = Database['public']['Tables']['leads']['Row'];
export type NewLead = Database['public']['Tables']['leads']['Insert'];
export type UpdateLead = Database['public']['Tables']['leads']['Update'];

export type LeadStatus =
  | 'hipages_lead'
  | 'new_lead'
  | 'inspection_booked'
  | 'inspection_in_progress'
  | 'report_pdf_approval'
  | 'awaiting_job_approval'
  | 'job_booked'
  | 'job_in_progress'
  | 'job_completed'
  | 'invoice_sent'
  | 'payment_received'
  | 'job_closed';

export interface LeadWithInspection extends Lead {
  inspection_report?: InspectionReport;
}

// Australian phone format
export type AustralianPhone = `04${string}` | `(0${string}) ${string}`;

// Victorian postcode (3000-3999)
export type VictorianPostcode = `3${string}`;
```

**Acceptance Criteria:**
- [ ] Database types generated successfully
- [ ] TypeScript Pro confirms type safety
- [ ] Code Reviewer approves type structure
- [ ] All custom types documented

**Files Created:**
- `src/types/database.ts` (generated)
- `src/types/leads.ts`
- `src/types/inspections.ts`
- `src/types/calendar.ts`

---

#### **Task 1.8: Implement API Layer with React Query**
**Priority:** P0 (Must Have)
**Time:** 4 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Create API functions
"Create API functions for leads CRUD: fetchLeads, createLead,
updateLead, deleteLead"

# Step 2: TypeScript Pro - Create React Query hooks
"Create useLeads, useCreateLead, useUpdateLead hooks with React Query"

# Step 3: Test Engineer - Test API functions
"Test all CRUD operations with different scenarios"

# Step 4: Error Detective - Test error scenarios
"Test error scenarios: network failures, validation errors,
timeout errors"

# Step 5: Performance Engineer - Optimize queries
"Review query performance, add indexes if needed, optimize caching"
```

**Implementation Snippet:**
```typescript
// src/lib/api/leads.ts
import { supabase } from '@/lib/supabase';
import { Lead, NewLead, UpdateLead, LeadStatus } from '@/types/leads';

export async function fetchLeads(filters?: {
  status?: LeadStatus;
  assigned_to?: string;
  search?: string;
}) {
  let query = supabase
    .from('leads')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('lead_status', filters.status);
  }

  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }

  if (filters?.search) {
    query = query.or(`customer_name.ilike.%${filters.search}%,property_address.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Lead[];
}

export async function createLead(lead: NewLead) {
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function updateLead(id: string, updates: UpdateLead) {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function deleteLead(id: string) {
  // Soft delete
  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// src/lib/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLeads, createLead, updateLead, deleteLead } from '@/lib/api/leads';
import { NewLead, UpdateLead, LeadStatus } from '@/types/leads';

export function useLeads(filters?: {
  status?: LeadStatus;
  assigned_to?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => fetchLeads(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateLead }) =>
      updateLead(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
```

**Acceptance Criteria:**
- [ ] TypeScript Pro confirms type safety
- [ ] Test Engineer confirms all CRUD operations work
- [ ] Error Detective confirms error handling works
- [ ] Performance Engineer confirms query performance
- [ ] React Query caching works correctly

**Files Created:**
- `src/lib/api/leads.ts`
- `src/lib/hooks/useLeads.ts`
- `__tests__/api/leads.test.ts`

---

### **Day 5 (Friday): Week 1 Testing & Validation**

#### **Task 1.9: Week 1 Checkpoint - Database & Infrastructure**
**Priority:** P0 (Must Have - Week 1 Gate)
**Time:** 3 hours
**Agent Workflow:**
```bash
# Step 1: Database Admin - Full database validation
"Validate all tables, indexes, constraints, RLS policies"

# Step 2: Security Auditor - Security scan (BLOCKER)
"Full security scan: RLS policies, auth implementation, npm audit
REQUIREMENT: Zero high/critical vulnerabilities"

# Step 3: Test Engineer - Integration tests
"Run all integration tests for Week 1 features"

# Step 4: Code Reviewer - Code quality review
"Review all Week 1 code: types, API layer, hooks, utilities"

# Step 5: Error Detective - Log analysis
"Review all error logs, identify any issues"
```

**Week 1 Testing Checklist:**
- [ ] **Database:**
  - [ ] All 11 tables created
  - [ ] All indexes exist
  - [ ] RLS policies enforced
  - [ ] Database Admin confirms schema quality

- [ ] **Security (BLOCKER):**
  - [ ] Security Auditor scan: ZERO high/critical vulnerabilities
  - [ ] RLS policy tests pass
  - [ ] Auth flows secure
  - [ ] npm audit clean

- [ ] **Offline Infrastructure:**
  - [ ] Offline queue works 100%
  - [ ] Auto-save triggers every 30 seconds
  - [ ] localStorage backup works
  - [ ] Sync on reconnection works

- [ ] **API Layer:**
  - [ ] All CRUD operations work
  - [ ] React Query caching works
  - [ ] Error handling works
  - [ ] Performance acceptable

- [ ] **Code Quality:**
  - [ ] TypeScript Pro confirms type safety
  - [ ] Code Reviewer approves quality
  - [ ] No console errors
  - [ ] Documentation complete

**Acceptance Criteria:**
- [ ] Security Auditor: ZERO high/critical vulnerabilities (BLOCKER)
- [ ] Database Admin: Schema quality A+
- [ ] Test Engineer: All tests pass
- [ ] Code Reviewer: Quality approved
- [ ] Week 1 complete - Ready for Week 2

---

## **WEEK 2: CORE FEATURES**

---

### **Day 6 (Monday): Dashboard Layout & Mobile Navigation**

#### **Task 2.1: Dashboard Layout with Mobile-First Design**
**Priority:** P0 (Must Have)
**Time:** 4 hours
**Agent Workflow:**
```bash
# Step 1: mobile-tester - Mobile layout design
"Design dashboard layout mobile-first: test at 375px viewport
REQUIREMENT: Must work perfectly at 375px BEFORE desktop"

# Step 2: TypeScript Pro - Build Dashboard component
"Build Dashboard component with stats overview, recent leads, quick actions"

# Step 3: mobile-tester - Test all viewports (REQUIRED)
"Test dashboard at ALL viewports: 375px, 768px, 1440px
Report: touch targets, scroll behavior, layout"

# Step 4: Web Vitals Optimizer - Performance test
"Test dashboard performance: LCP <2.5s, FID <100ms, CLS <0.1"

# Step 5: Code Reviewer - Review component
"Review Dashboard component: design tokens, spacing, accessibility"
```

**Mobile-First Implementation:**
```typescript
// src/pages/Dashboard.tsx
import { useLeads } from '@/lib/hooks/useLeads';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { RecentLeads } from '@/components/dashboard/RecentLeads';
import { QuickActions } from '@/components/dashboard/QuickActions';

export function Dashboard() {
  const { data: leads, isLoading } = useLeads();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:gap-6 md:p-6">
      {/* Stats Overview */}
      <StatsOverview leads={leads ?? []} />

      {/* Quick Actions - 48px touch targets */}
      <QuickActions />

      {/* Recent Leads */}
      <RecentLeads leads={leads ?? []} />
    </div>
  );
}

// src/components/dashboard/StatsOverview.tsx
export function StatsOverview({ leads }: { leads: Lead[] }) {
  const stats = {
    total: leads.length,
    newLeads: leads.filter(l => l.lead_status === 'new_lead').length,
    inspectionBooked: leads.filter(l => l.lead_status === 'inspection_booked').length,
    jobsInProgress: leads.filter(l => l.lead_status === 'job_in_progress').length,
  };

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      <StatCard title="Total Leads" value={stats.total} />
      <StatCard title="New" value={stats.newLeads} />
      <StatCard title="Inspections" value={stats.inspectionBooked} />
      <StatCard title="Jobs" value={stats.jobsInProgress} />
    </div>
  );
}

// Mobile-first StatCard - uses design tokens
function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] mobile-tester confirms 375px works PERFECTLY
- [ ] mobile-tester confirms 768px works
- [ ] mobile-tester confirms 1440px works
- [ ] Web Vitals Optimizer confirms performance >90
- [ ] Code Reviewer confirms design token usage
- [ ] No hardcoded colors (all use CSS variables)
- [ ] Touch targets e48px

**Files Created:**
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/StatsOverview.tsx`
- `src/components/dashboard/RecentLeads.tsx`
- `src/components/dashboard/QuickActions.tsx`

---

#### **Task 2.2: Mobile Bottom Navigation (Fix Active State Bug)**
**Priority:** P0 (Must Have)
**Time:** 2 hours
**Agent Workflow:**
```bash
# Step 1: Code Reviewer - Identify active state bug
"Review MobileBottomNav.tsx line 18 - confirm hardcoded active state bug"

# Step 2: TypeScript Pro - Fix active state logic
"Fix active state to use location.pathname.startsWith(tab.path)"

# Step 3: mobile-tester - Test navigation (REQUIRED)
"Test bottom nav on mobile: all tabs show correct active state,
navigation works, touch targets e48px"

# Step 4: Code Reviewer - Verify fix
"Verify active state fix works correctly on all routes"
```

**Bug Fix:**
```typescript
// src/components/dashboard/MobileBottomNav.tsx (BEFORE - BUG)
const isActive = tab.path === "/dashboard"; // L WRONG - always dashboard

// src/components/dashboard/MobileBottomNav.tsx (AFTER - FIXED)
import { useLocation } from 'react-router-dom';

export function MobileBottomNav() {
  const location = useLocation();

  const tabs = [
    { path: '/dashboard', icon: HomeIcon, label: 'Home' },
    { path: '/leads', icon: ClipboardIcon, label: 'Leads' },
    { path: '/calendar', icon: CalendarIcon, label: 'Calendar' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex justify-around">
        {tabs.map(tab => {
          const isActive = location.pathname.startsWith(tab.path); //  CORRECT

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 py-2",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Acceptance Criteria:**
- [ ] Code Reviewer confirms bug fixed
- [ ] mobile-tester confirms active state works on all routes
- [ ] Touch targets e48px confirmed
- [ ] Navigation works on all viewports

**Files Modified:**
- `src/components/dashboard/MobileBottomNav.tsx`

---

### **Day 7 (Tuesday): Kanban Board with 12-Stage Pipeline**

#### **Task 2.3: Kanban Board - Desktop Drag-and-Drop**
**Priority:** P0 (Must Have)
**Time:** 5 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Setup @dnd-kit/core
"Install and configure @dnd-kit/core for drag-and-drop"

# Step 2: TypeScript Pro - Build Kanban components
"Build KanbanBoard, KanbanColumn, LeadCard components with 12 stages"

# Step 3: Test Engineer - Test drag-and-drop
"Test drag-and-drop: lead moves between columns, status updates in database"

# Step 4: mobile-tester - Test at 1440px (desktop first for D&D)
"Test Kanban at desktop viewport: drag works smoothly, no layout issues"

# Step 5: Code Reviewer - Review implementation
"Review Kanban implementation: performance, accessibility, code quality"
```

**12-Stage Pipeline:**
```typescript
// src/lib/constants/leadStages.ts
export const LEAD_STAGES = [
  { id: 'hipages_lead', label: 'HiPages Lead', color: 'bg-purple-500' },
  { id: 'new_lead', label: 'New Lead', color: 'bg-blue-500' },
  { id: 'inspection_booked', label: 'Inspection Booked', color: 'bg-cyan-500' },
  { id: 'inspection_in_progress', label: 'Inspection In Progress', color: 'bg-yellow-500' },
  { id: 'report_pdf_approval', label: 'Report PDF Approval', color: 'bg-orange-500' },
  { id: 'awaiting_job_approval', label: 'Awaiting Job Approval', color: 'bg-pink-500' },
  { id: 'job_booked', label: 'Job Booked', color: 'bg-green-500' },
  { id: 'job_in_progress', label: 'Job In Progress', color: 'bg-lime-500' },
  { id: 'job_completed', label: 'Job Completed', color: 'bg-emerald-500' },
  { id: 'invoice_sent', label: 'Invoice Sent', color: 'bg-teal-500' },
  { id: 'payment_received', label: 'Payment Received', color: 'bg-indigo-500' },
  { id: 'job_closed', label: 'Job Closed', color: 'bg-gray-500' },
] as const;
```

**Kanban Implementation:**
```typescript
// src/components/dashboard/KanbanBoard.tsx
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useLeads, useUpdateLead } from '@/lib/hooks/useLeads';
import { KanbanColumn } from './KanbanColumn';
import { LEAD_STAGES } from '@/lib/constants/leadStages';

export function KanbanBoard() {
  const { data: leads } = useLeads();
  const updateLead = useUpdateLead();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;

    await updateLead.mutateAsync({
      id: leadId,
      updates: { lead_status: newStatus },
    });
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-4 pb-20 md:p-6">
        {LEAD_STAGES.map(stage => {
          const stageLeads = leads?.filter(lead => lead.lead_status === stage.id) ?? [];

          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={stageLeads}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
```

**Acceptance Criteria:**
- [ ] TypeScript Pro confirms type safety
- [ ] Test Engineer confirms drag-and-drop works
- [ ] Database updates when lead moves
- [ ] mobile-tester confirms desktop layout works
- [ ] Code Reviewer approves implementation

**Files Created:**
- `src/components/dashboard/KanbanBoard.tsx`
- `src/components/dashboard/KanbanColumn.tsx`
- `src/components/dashboard/LeadCard.tsx`
- `src/lib/constants/leadStages.ts`

---

### **Day 8 (Wednesday): Kanban Mobile Touch Support**

#### **Task 2.4: Kanban Board - Mobile Touch Drag-and-Drop**
**Priority:** P1 (Should Have)
**Time:** 4 hours
**Agent Workflow:**
```bash
# Step 1: mobile-tester - Test touch events on mobile
"Test Kanban on mobile: identify touch event issues at 375px viewport"

# Step 2: TypeScript Pro - Implement touch support
"Add @dnd-kit touch sensors, configure touch-action CSS"

# Step 3: mobile-tester - Test mobile drag (CRITICAL)
"Test mobile drag at 375px: drag works, scrolling works, no conflicts
REQUIREMENT: Must work with gloves (48px targets)"

# Step 4: Error Detective - Test edge cases
"Test: drag while scrolling, drag in landscape, drag with keyboard open"

# Step 5: Code Reviewer - Review mobile implementation
"Review mobile touch implementation: accessibility, performance"
```

**Mobile Touch Implementation:**
```typescript
// src/components/dashboard/KanbanBoard.tsx (Mobile Touch Support)
import {
  DndContext,
  DragEndEvent,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

export function KanbanBoard() {
  // Configure sensors for both mouse and touch
  const mouseSensor = useSensor(MouseSensor);
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // 250ms delay to distinguish from scrolling
      tolerance: 5, // 5px tolerance
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {/* Kanban columns */}
    </DndContext>
  );
}

// Add CSS for touch-action
// src/components/dashboard/LeadCard.tsx
<div
  className="cursor-move rounded-lg border border-border bg-card p-3 shadow-sm touch-none"
  style={{ touchAction: 'none' }}
>
  {/* Card content */}
</div>
```

**Acceptance Criteria:**
- [ ] mobile-tester confirms drag works at 375px viewport
- [ ] Touch targets e48px confirmed
- [ ] Scrolling works without triggering drag
- [ ] Drag works in both portrait and landscape
- [ ] Error Detective confirms edge cases work

**Files Modified:**
- `src/components/dashboard/KanbanBoard.tsx`
- `src/components/dashboard/LeadCard.tsx`

---

### **Day 9 (Thursday): Lead Management CRUD**

#### **Task 2.5: Add Lead Dialog with Australian Formatting**
**Priority:** P0 (Must Have)
**Time:** 4 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Build AddLeadDialog component
"Build AddLeadDialog with form validation using React Hook Form + Zod"

# Step 2: TypeScript Pro - Implement Australian formatters
"Implement formatPhoneNumber, formatPostcode, zone calculation"

# Step 3: mobile-tester - Test form on mobile (CRITICAL)
"Test form at 375px: input height e48px, keyboard doesn't break layout,
scrolling works with keyboard open"

# Step 4: Test Engineer - Test validation
"Test validation: required fields, phone format, postcode (VIC only),
duplicate detection"

# Step 5: Code Reviewer - Review form implementation
"Review form: validation logic, error messages, user experience"
```

**Australian Formatting Implementation:**
```typescript
// src/lib/utils/leadUtils.ts
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Mobile: 04XX XXX XXX
  if (cleaned.startsWith('04') && cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  // Landline: (0X) XXXX XXXX
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }

  return phone; // Return as-is if doesn't match
}

export function validatePostcode(postcode: string): boolean {
  // Victorian postcodes: 3000-3999
  const code = parseInt(postcode, 10);
  return code >= 3000 && code <= 3999;
}

export function calculateZone(postcode: string): 1 | 2 | 3 | 4 {
  const code = parseInt(postcode, 10);

  // Zone 1: CBD (3000-3006)
  if (code >= 3000 && code <= 3006) return 1;

  // Zone 2: Inner suburbs (3010-3101)
  if ((code >= 3010 && code <= 3101)) return 2;

  // Zone 3: Middle suburbs (3102-3211)
  if (code >= 3102 && code <= 3211) return 3;

  // Zone 4: Outer suburbs (3212+)
  return 4;
}

// src/components/leads/AddLeadDialog.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatPhoneNumber, validatePostcode, calculateZone } from '@/lib/utils/leadUtils';

const leadSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .refine(phone => /^0[0-9]{9}$/.test(phone.replace(/\D/g, '')), {
      message: 'Invalid Australian phone number',
    }),
  customer_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  property_address: z.string().min(1, 'Property address is required'),
  property_postcode: z.string()
    .refine(validatePostcode, {
      message: 'Invalid Victorian postcode (must be 3000-3999)',
    }),
});

export function AddLeadDialog({ open, onClose }: AddLeadDialogProps) {
  const form = useForm({
    resolver: zodResolver(leadSchema),
  });

  const createLead = useCreateLead();

  const onSubmit = async (data: z.infer<typeof leadSchema>) => {
    const zone = calculateZone(data.property_postcode);

    await createLead.mutateAsync({
      ...data,
      property_zone: zone,
      lead_status: 'new_lead',
      lead_source: 'manual',
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Customer name */}
          <FormField
            control={form.control}
            name="customer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="John Smith"
                    className="h-12" // 48px touch target
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone with auto-formatting */}
          <FormField
            control={form.control}
            name="customer_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="0412 345 678"
                    className="h-12"
                    onChange={e => {
                      const formatted = formatPhoneNumber(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Other fields... */}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending ? 'Adding...' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria:**
- [ ] mobile-tester confirms form works at 375px
- [ ] Input height e48px confirmed
- [ ] Phone formatting works automatically
- [ ] Postcode validation works (VIC only)
- [ ] Zone calculation correct
- [ ] Test Engineer confirms validation works

**Files Created:**
- `src/components/leads/AddLeadDialog.tsx`
- `src/lib/utils/leadUtils.ts`
- `src/lib/utils/formatters.ts`
- `__tests__/utils/leadUtils.test.ts`

---

### **Day 10 (Friday): Week 2 Testing & Validation**

#### **Task 2.6: Week 2 Checkpoint - Core Features**
**Priority:** P0 (Must Have - Week 2 Gate)
**Time:** 3 hours
**Agent Workflow:**
```bash
# Step 1: mobile-tester - Full mobile testing (BLOCKER)
"Test ALL features at 375px viewport:
- Dashboard layout
- Bottom navigation
- Kanban board (touch drag)
- Add lead dialog
REQUIREMENT: Must work PERFECTLY at 375px"

# Step 2: Web Vitals Optimizer - Performance audit
"Performance audit ALL pages:
- Dashboard LCP <2.5s
- Kanban FID <100ms
- Forms CLS <0.1
REQUIREMENT: Mobile score >90"

# Step 3: Code Reviewer - Code quality review
"Review all Week 2 code: components, hooks, utilities"

# Step 4: Test Engineer - Integration testing
"Test complete workflows: create lead ’ move through pipeline ’ update"

# Step 5: Error Detective - Error analysis
"Review all error logs, identify issues"
```

**Week 2 Testing Checklist:**
- [ ] **Mobile-First (BLOCKER):**
  - [ ] mobile-tester confirms 375px works PERFECTLY
  - [ ] All touch targets e48px
  - [ ] No horizontal scroll
  - [ ] Bottom nav active state works
  - [ ] Forms usable with on-screen keyboard

- [ ] **Performance (BLOCKER):**
  - [ ] Web Vitals Optimizer: Mobile score >90
  - [ ] Dashboard LCP <2.5s
  - [ ] Kanban FID <100ms
  - [ ] Forms CLS <0.1

- [ ] **Functionality:**
  - [ ] Dashboard displays stats correctly
  - [ ] Kanban drag-and-drop works (desktop + mobile)
  - [ ] Add lead dialog works
  - [ ] Australian formatting applied
  - [ ] Validation works correctly

- [ ] **Code Quality:**
  - [ ] Code Reviewer approves quality
  - [ ] No hardcoded colors (design tokens only)
  - [ ] TypeScript Pro confirms type safety
  - [ ] No console errors

**Acceptance Criteria:**
- [ ] mobile-tester: 375px works PERFECTLY (BLOCKER)
- [ ] Web Vitals Optimizer: Mobile >90 (BLOCKER)
- [ ] Test Engineer: All tests pass
- [ ] Code Reviewer: Quality approved
- [ ] Week 2 complete - Ready for Week 3

---

## **WEEK 3: AUTOMATION & INTELLIGENCE**

---

### **Day 11 (Monday): Inspection Form - Property & Work Sections**

#### **Task 3.1: Inspection Form - Property Details Section**
**Priority:** P0 (Must Have)
**Time:** 4 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Create form structure
"Create InspectionForm with multi-section structure,
auto-save integration, offline support"

# Step 2: TypeScript Pro - Build PropertyDetails section
"Build PropertyDetails section: address, property type, access,
customer info (pre-filled from lead)"

# Step 3: mobile-tester - Test form on mobile (CRITICAL)
"Test form at 375px: section navigation works, inputs e48px,
auto-save indicator visible, scrolling smooth"

# Step 4: Test Engineer - Test auto-save
"Test auto-save: triggers every 30 seconds, localStorage backup works,
recovery on page reload"

# Step 5: Code Reviewer - Review form implementation
"Review form: validation, user experience, error handling"
```

**Inspection Form Structure:**
```typescript
// src/pages/InspectionForm.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { PropertyDetails } from '@/components/inspection/PropertyDetails';
import { DemolitionSection } from '@/components/inspection/DemolitionSection';
import { ConstructionSection } from '@/components/inspection/ConstructionSection';
import { SubfloorSection } from '@/components/inspection/SubfloorSection';
import { EquipmentSection } from '@/components/inspection/EquipmentSection';
import { PricingSection } from '@/components/inspection/PricingSection';

export function InspectionForm() {
  const { leadId } = useParams();
  const [formData, setFormData] = useState<InspectionFormData>(initialData);
  const [currentSection, setCurrentSection] = useState(0);

  // Auto-save every 30 seconds
  const { isSaving, lastSaved, recover } = useAutoSave(
    formData,
    async (data) => {
      await saveInspectionReport(leadId!, data);
    },
    {
      delay: 30000,
      storageKey: `inspection_draft_${leadId}`,
    }
  );

  // Recover from localStorage on mount
  useEffect(() => {
    const recovered = recover();
    if (recovered) {
      setFormData(recovered);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Auto-save indicator */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Inspection Report</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <span>Saved {formatRelativeTime(lastSaved)}</span>
            ) : null}
          </div>
        </div>

        {/* Section navigation */}
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {SECTIONS.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setCurrentSection(index)}
              className={cn(
                "min-h-[40px] px-4 rounded-lg text-sm font-medium whitespace-nowrap",
                currentSection === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current section */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {currentSection === 0 && (
          <PropertyDetails
            data={formData.property}
            onChange={data => setFormData({ ...formData, property: data })}
          />
        )}
        {currentSection === 1 && (
          <DemolitionSection
            data={formData.demolition}
            onChange={data => setFormData({ ...formData, demolition: data })}
          />
        )}
        {/* Other sections... */}
      </div>

      {/* Navigation buttons */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4 pb-20 md:pb-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
            className="h-12 flex-1"
          >
            Previous
          </Button>
          <Button
            onClick={() => setCurrentSection(Math.min(SECTIONS.length - 1, currentSection + 1))}
            disabled={currentSection === SECTIONS.length - 1}
            className="h-12 flex-1"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] mobile-tester confirms 375px works perfectly
- [ ] Auto-save triggers every 30 seconds
- [ ] localStorage backup works
- [ ] Test Engineer confirms recovery works
- [ ] Form inputs e48px height
- [ ] Section navigation smooth

**Files Created:**
- `src/pages/InspectionForm.tsx`
- `src/components/inspection/PropertyDetails.tsx`
- `src/types/inspection.ts`

---

#### **Task 3.2: Inspection Form - Work Type Sections (Demolition, Construction, Subfloor)**
**Priority:** P0 (Must Have)
**Time:** 5 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Build work type sections
"Build DemolitionSection, ConstructionSection, SubfloorSection components"

# Step 2: TypeScript Pro - Implement toggle logic
"Implement toggle logic: when enabled, show description + photos"

# Step 3: TypeScript Pro - Implement photo upload
"Implement photo upload with image compression (<1MB per image)"

# Step 4: mobile-tester - Test photo upload on mobile
"Test photo upload at 375px: camera works, gallery works,
compression works, preview shows"

# Step 5: Test Engineer - Test form state
"Test form state persists across sections, auto-save includes photos"
```

**Work Section Implementation:**
```typescript
// src/components/inspection/DemolitionSection.tsx
export function DemolitionSection({ data, onChange }: SectionProps) {
  const [enabled, setEnabled] = useState(data.enabled);
  const [description, setDescription] = useState(data.description);
  const [photos, setPhotos] = useState<string[]>(data.photos);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    onChange({ enabled: checked, description, photos });
  };

  const handlePhotoUpload = async (files: FileList) => {
    const compressed = await Promise.all(
      Array.from(files).map(file => compressImage(file, { maxSizeMB: 1 }))
    );

    const urls = await Promise.all(
      compressed.map(file => uploadToSupabase(file))
    );

    const newPhotos = [...photos, ...urls];
    setPhotos(newPhotos);
    onChange({ enabled, description, photos: newPhotos });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="demolition-toggle" className="text-base font-medium">
          Demolition Work Required
        </Label>
        <Switch
          id="demolition-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          className="h-6 w-11" // Touch-friendly switch
        />
      </div>

      {enabled && (
        <>
          <div>
            <Label htmlFor="demolition-description">Description</Label>
            <Textarea
              id="demolition-description"
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                onChange({ enabled, description: e.target.value, photos });
              }}
              placeholder="Describe the demolition work required..."
              className="min-h-[120px]"
              rows={5}
            />
          </div>

          <div>
            <Label>Photos</Label>
            <PhotoUpload
              photos={photos}
              onUpload={handlePhotoUpload}
              onRemove={index => {
                const newPhotos = photos.filter((_, i) => i !== index);
                setPhotos(newPhotos);
                onChange({ enabled, description, photos: newPhotos });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] TypeScript Pro confirms type safety
- [ ] mobile-tester confirms photo upload works at 375px
- [ ] Image compression works (<1MB per image)
- [ ] Test Engineer confirms state persists
- [ ] Auto-save includes photos

**Files Created:**
- `src/components/inspection/DemolitionSection.tsx`
- `src/components/inspection/ConstructionSection.tsx`
- `src/components/inspection/SubfloorSection.tsx`
- `src/components/inspection/PhotoUpload.tsx`
- `src/lib/utils/imageCompression.ts`

---

### **Day 12 (Tuesday): Pricing Calculator with 13% Discount Cap**

#### **Task 3.3: Implement Pricing Calculator (DEPLOYMENT BLOCKER)**
**Priority:** P0 (Must Have - Business Critical)
**Time:** 6 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Define pricing types
"Define pricing types: base rates, discount scale, equipment costs"

# Step 2: TypeScript Pro - Implement pricing engine
"Implement pricing engine with 13% ABSOLUTE cap"

# Step 3: pricing-calculator - Create 48 test scenarios (BLOCKER)
"Create comprehensive test suite with ALL 48 pricing scenarios:
- 4 work types × 2 durations × 2 equipment combinations × 3 discount tiers
REQUIREMENT: All 48 scenarios must PASS"

# Step 4: pricing-calculator - Validate discount cap (CRITICAL)
"Validate 13% discount cap is NEVER exceeded in ANY scenario
DEPLOYMENT BLOCKER: If cap exceeded, DO NOT DEPLOY"

# Step 5: Test Engineer - Add regression tests
"Add regression tests for pricing calculations"

# Step 6: Security Auditor - Verify no manipulation
"Verify pricing cannot be manipulated client-side"

# Step 7: Code Reviewer - Review pricing logic
"Review pricing logic: correctness, maintainability, documentation"
```

**Pricing Engine Implementation:**
```typescript
// src/lib/utils/pricing.ts

/**
 * MRC Pricing Calculator
 *
 * BUSINESS RULES (ABSOLUTE - NO EXCEPTIONS):
 * 1. Base rates are fixed (no_demolition, demolition, construction, subfloor)
 * 2. Multi-day discount scale: 0%, 7.5%, 13% MAXIMUM
 * 3. 13% discount cap is ABSOLUTE - NEVER exceed
 * 4. Equipment costs are per day
 * 5. All prices ex GST (add 10% for inc GST)
 */

export const BASE_RATES = {
  no_demolition: { 2: 612, 8: 1216.99 },
  demolition: { 2: 711.90, 8: 1798.90 },
  construction: { 2: 661.96, 8: 1507.95 },
  subfloor: { 2: 900, 8: 2334.69 },
} as const;

export const EQUIPMENT_COSTS = {
  dehumidifier: 132,
  air_mover: 46,
  rcd_box: 5,
} as const;

export type WorkType = keyof typeof BASE_RATES;
export type Equipment = keyof typeof EQUIPMENT_COSTS;

export interface PricingInput {
  workType: WorkType;
  totalHours: number;
  equipment: {
    dehumidifiers: number;
    airMovers: number;
    rcdBoxes: number;
  };
  daysOnSite: number;
}

export interface PricingResult {
  baseLabour: number;
  discount: number;
  discountPercentage: number;
  labourAfterDiscount: number;
  equipmentTotal: number;
  subtotal: number;
  gst: number;
  total: number;
  breakdown: {
    baseRate: number;
    hoursType: 2 | 8;
    multiplier: number;
    equipmentPerDay: number;
  };
}

export function calculatePricing(input: PricingInput): PricingResult {
  const { workType, totalHours, equipment, daysOnSite } = input;

  // Step 1: Determine base rate (2hr or 8hr)
  const hoursType = totalHours <= 2 ? 2 : 8;
  const baseRate = BASE_RATES[workType][hoursType];

  // Step 2: Calculate labour cost
  let baseLabour = baseRate;
  if (totalHours > 8) {
    // Multi-day job: extrapolate from 8-hour rate
    const daysEstimate = Math.ceil(totalHours / 8);
    baseLabour = baseRate * daysEstimate;
  }

  // Step 3: Calculate discount (ABSOLUTE 13% CAP)
  let discountPercentage = 0;
  if (totalHours <= 8) {
    discountPercentage = 0; // 0% for single day
  } else if (totalHours <= 16) {
    discountPercentage = 0.075; // 7.5% for 2 days
  } else {
    discountPercentage = 0.13; // 13% MAXIMUM (ABSOLUTE CAP)
  }

  const discount = baseLabour * discountPercentage;
  const labourAfterDiscount = baseLabour - discount;

  // Step 4: Calculate equipment costs
  const equipmentPerDay =
    equipment.dehumidifiers * EQUIPMENT_COSTS.dehumidifier +
    equipment.airMovers * EQUIPMENT_COSTS.air_mover +
    equipment.rcdBoxes * EQUIPMENT_COSTS.rcd_box;

  const equipmentTotal = equipmentPerDay * daysOnSite;

  // Step 5: Calculate totals
  const subtotal = labourAfterDiscount + equipmentTotal;
  const gst = subtotal * 0.1; // 10% GST
  const total = subtotal + gst;

  return {
    baseLabour,
    discount,
    discountPercentage,
    labourAfterDiscount,
    equipmentTotal,
    subtotal,
    gst,
    total,
    breakdown: {
      baseRate,
      hoursType,
      multiplier: Math.ceil(totalHours / 8),
      equipmentPerDay,
    },
  };
}
```

**48 Pricing Test Scenarios:**
```typescript
// __tests__/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePricing } from '@/lib/utils/pricing';

describe('MRC Pricing Calculator - All 48 Scenarios', () => {
  // Scenario 1-4: No Demolition
  describe('No Demolition Work Type', () => {
    it('2 hours, no equipment, 1 day - 0% discount', () => {
      const result = calculatePricing({
        workType: 'no_demolition',
        totalHours: 2,
        equipment: { dehumidifiers: 0, airMovers: 0, rcdBoxes: 0 },
        daysOnSite: 1,
      });

      expect(result.baseLabour).toBe(612);
      expect(result.discountPercentage).toBe(0);
      expect(result.discount).toBe(0);
      expect(result.labourAfterDiscount).toBe(612);
      expect(result.equipmentTotal).toBe(0);
      expect(result.subtotal).toBe(612);
      expect(result.gst).toBe(61.2);
      expect(result.total).toBe(673.2);
    });

    it('2 hours, 2 dehumidifiers + 3 air movers, 1 day - 0% discount', () => {
      const result = calculatePricing({
        workType: 'no_demolition',
        totalHours: 2,
        equipment: { dehumidifiers: 2, airMovers: 3, rcdBoxes: 1 },
        daysOnSite: 1,
      });

      const expectedEquipment = (2 * 132) + (3 * 46) + (1 * 5); // 407
      expect(result.equipmentTotal).toBe(expectedEquipment);
      expect(result.discountPercentage).toBe(0);
      expect(result.subtotal).toBe(612 + expectedEquipment);
    });

    it('16 hours, no equipment, 2 days - 7.5% discount', () => {
      const result = calculatePricing({
        workType: 'no_demolition',
        totalHours: 16,
        equipment: { dehumidifiers: 0, airMovers: 0, rcdBoxes: 0 },
        daysOnSite: 2,
      });

      const baseLabour = 1216.99 * 2; // 2433.98
      const discount = baseLabour * 0.075; // 182.5485
      expect(result.baseLabour).toBe(baseLabour);
      expect(result.discountPercentage).toBe(0.075);
      expect(result.discount).toBeCloseTo(discount, 2);
      expect(result.labourAfterDiscount).toBeCloseTo(baseLabour - discount, 2);
    });

    it('24+ hours, no equipment, 3 days - 13% discount (CAP)', () => {
      const result = calculatePricing({
        workType: 'no_demolition',
        totalHours: 24,
        equipment: { dehumidifiers: 0, airMovers: 0, rcdBoxes: 0 },
        daysOnSite: 3,
      });

      const baseLabour = 1216.99 * 3; // 3650.97
      const discount = baseLabour * 0.13; // 474.6261
      expect(result.discountPercentage).toBe(0.13); // ABSOLUTE CAP
      expect(result.discount).toBeCloseTo(discount, 2);
    });
  });

  // Scenario 5-8: Demolition
  describe('Demolition Work Type', () => {
    it('2 hours, no equipment, 1 day - 0% discount', () => {
      const result = calculatePricing({
        workType: 'demolition',
        totalHours: 2,
        equipment: { dehumidifiers: 0, airMovers: 0, rcdBoxes: 0 },
        daysOnSite: 1,
      });

      expect(result.baseLabour).toBe(711.90);
      expect(result.discountPercentage).toBe(0);
    });

    it('8 hours, 3 dehumidifiers + 5 air movers, 1 day - 0% discount', () => {
      const result = calculatePricing({
        workType: 'demolition',
        totalHours: 8,
        equipment: { dehumidifiers: 3, airMovers: 5, rcdBoxes: 1 },
        daysOnSite: 1,
      });

      const expectedEquipment = (3 * 132) + (5 * 46) + (1 * 5); // 631
      expect(result.baseLabour).toBe(1798.90);
      expect(result.equipmentTotal).toBe(expectedEquipment);
      expect(result.discountPercentage).toBe(0);
    });

    it('16 hours, equipment, 2 days - 7.5% discount', () => {
      const result = calculatePricing({
        workType: 'demolition',
        totalHours: 16,
        equipment: { dehumidifiers: 2, airMovers: 3, rcdBoxes: 1 },
        daysOnSite: 2,
      });

      expect(result.discountPercentage).toBe(0.075);
    });

    it('40+ hours, equipment, 5 days - 13% discount (CAP)', () => {
      const result = calculatePricing({
        workType: 'demolition',
        totalHours: 40,
        equipment: { dehumidifiers: 4, airMovers: 6, rcdBoxes: 2 },
        daysOnSite: 5,
      });

      expect(result.discountPercentage).toBe(0.13); // ABSOLUTE CAP
    });
  });

  // Scenarios 9-48: Continue for Construction and Subfloor...
  // Total: 4 work types × 4 scenarios each × 3 equipment variations = 48 scenarios

  describe('13% Discount Cap Validation (CRITICAL)', () => {
    it('NEVER exceeds 13% discount for ANY work type', () => {
      const workTypes: Array<keyof typeof BASE_RATES> = [
        'no_demolition',
        'demolition',
        'construction',
        'subfloor',
      ];

      workTypes.forEach(workType => {
        // Test extreme case: 200 hours (25 days)
        const result = calculatePricing({
          workType,
          totalHours: 200,
          equipment: { dehumidifiers: 10, airMovers: 15, rcdBoxes: 5 },
          daysOnSite: 25,
        });

        // ABSOLUTE REQUIREMENT: Discount percentage MUST NOT exceed 0.13
        expect(result.discountPercentage).toBeLessThanOrEqual(0.13);
        expect(result.discountPercentage).toBe(0.13);
      });
    });
  });
});
```

**Acceptance Criteria (DEPLOYMENT BLOCKERS):**
- [ ] pricing-calculator: ALL 48 scenarios PASS (BLOCKER)
- [ ] pricing-calculator: 13% cap NEVER exceeded (BLOCKER)
- [ ] TypeScript Pro confirms type safety
- [ ] Test Engineer confirms regression tests pass
- [ ] Security Auditor confirms no client-side manipulation
- [ ] Code Reviewer approves pricing logic

**Files Created:**
- `src/lib/utils/pricing.ts`
- `__tests__/pricing.test.ts` (48 scenarios)

---

### **Day 13 (Wednesday): AI Summary Generation (Claude API)**

#### **Task 3.4: AI Summary Generation with Claude API**
**Priority:** P0 (Must Have)
**Time:** 5 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Setup Claude API integration
"Setup Claude API integration with Anthropic SDK"

# Step 2: TypeScript Pro - Create AI summary prompt template
"Create comprehensive prompt template for mould inspection summaries"

# Step 3: TypeScript Pro - Implement generateAISummary function
"Implement generateAISummary function with error handling and retries"

# Step 4: Test Engineer - Test AI generation
"Test AI generation with various inspection scenarios"

# Step 5: Security Auditor - Verify API key security
"Verify API key stored securely (server-side only, not exposed to client)"

# Step 6: Code Reviewer - Review AI integration
"Review AI integration: prompt quality, error handling, rate limiting"
```

**AI Summary Implementation:**
```typescript
// supabase/functions/generate-ai-summary/index.ts (Edge Function)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.20.0';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
});

serve(async (req) => {
  try {
    const { inspectionData } = await req.json();

    // Build comprehensive prompt
    const prompt = buildInspectionPrompt(inspectionData);

    // Generate summary with Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const summary = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return new Response(JSON.stringify({ summary }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate AI summary' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function buildInspectionPrompt(data: InspectionData): string {
  return `You are an expert mould remediation technician for Mould & Restoration Co. in Melbourne, Australia.

Generate a professional inspection summary report based on the following inspection data:

**Property Details:**
- Address: ${data.property.address}
- Type: ${data.property.type}
- Customer: ${data.customer.name}

**Work Required:**
${data.demolition.enabled ? `- Demolition: ${data.demolition.description}` : ''}
${data.construction.enabled ? `- Construction: ${data.construction.description}` : ''}
${data.subfloor.enabled ? `- Subfloor Work: ${data.subfloor.description}` : ''}

**Equipment Required:**
- Dehumidifiers: ${data.equipment.dehumidifiers}
- Air Movers: ${data.equipment.airMovers}
- RCD Boxes: ${data.equipment.rcdBoxes}

**Estimated Duration:**
- Total Hours: ${data.pricing.totalHours}
- Days On Site: ${data.pricing.daysOnSite}

**Pricing:**
- Labour (ex GST): $${data.pricing.labourAfterDiscount.toFixed(2)}
- Equipment (ex GST): $${data.pricing.equipmentTotal.toFixed(2)}
- Total (inc GST): $${data.pricing.total.toFixed(2)}

Generate a summary that includes:
1. Brief overview of the property and issue
2. Scope of work required (2-3 paragraphs)
3. Equipment and methodology
4. Timeline expectations
5. Professional and reassuring tone

Use Australian English spelling and terminology. Keep summary between 250-400 words.`;
}

// src/lib/api/aiSummary.ts (Client-side)
import { supabase } from '@/lib/supabase';

export async function generateAISummary(inspectionData: InspectionData) {
  const { data, error } = await supabase.functions.invoke('generate-ai-summary', {
    body: { inspectionData },
  });

  if (error) throw error;
  return data.summary as string;
}
```

**Acceptance Criteria:**
- [ ] TypeScript Pro confirms type safety
- [ ] Test Engineer confirms AI generation works
- [ ] Security Auditor confirms API key secured (server-side only)
- [ ] Summary quality appropriate (professional tone, 250-400 words)
- [ ] Error handling works (retries, timeout)
- [ ] Code Reviewer approves implementation

**Files Created:**
- `supabase/functions/generate-ai-summary/index.ts`
- `src/lib/api/aiSummary.ts`
- `src/components/inspection/AISummaryButton.tsx`

---

### **Day 14 (Thursday): PDF Generation (Supabase Edge Functions)**

#### **Task 3.5: PDF Generation with Puppeteer**
**Priority:** P0 (Must Have)
**Time:** 6 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Create PDF template
"Create HTML PDF template with professional design and Australian formatting"

# Step 2: TypeScript Pro - Implement PDF generation Edge Function
"Implement Edge Function using Puppeteer to generate PDF from HTML"

# Step 3: Test Engineer - Test PDF generation
"Test PDF generation: all data appears, formatting correct, images included"

# Step 4: mobile-tester - Test PDF preview on mobile
"Test PDF preview on mobile: loads correctly, zoom works, sharing works"

# Step 5: Security Auditor - Verify PDF security
"Verify PDFs stored securely with RLS policies"

# Step 6: Code Reviewer - Review PDF implementation
"Review PDF implementation: template quality, error handling, performance"
```

**PDF Generation Implementation:**
```typescript
// supabase/functions/generate-inspection-pdf/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';

serve(async (req) => {
  try {
    const { inspectionData, lead } = await req.json();

    // Build HTML template
    const html = buildPDFTemplate(inspectionData, lead);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    await browser.close();

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="inspection-${lead.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate PDF' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function buildPDFTemplate(inspection: InspectionData, lead: Lead): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
    }
    .company-name {
      font-size: 24pt;
      font-weight: bold;
      color: #2563eb;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .label {
      font-weight: 600;
      color: #666;
    }
    .value {
      color: #333;
    }
    .pricing-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    .pricing-table th,
    .pricing-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .pricing-table th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    .pricing-total {
      font-size: 14pt;
      font-weight: bold;
      color: #2563eb;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 10pt;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Mould & Restoration Co.</div>
    <div>Professional Mould Remediation Services</div>
    <div>Melbourne, Victoria | ABN: XX XXX XXX XXX</div>
    <div>Phone: (03) XXXX XXXX | Email: admin@mouldandrestoration.com.au</div>
  </div>

  <div class="section">
    <div class="section-title">Inspection Report</div>
    <div class="info-row">
      <span class="label">Report Date:</span>
      <span class="value">${formatDateAU(new Date())}</span>
    </div>
    <div class="info-row">
      <span class="label">Report Number:</span>
      <span class="value">${lead.id.slice(0, 8).toUpperCase()}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Property Details</div>
    <div class="info-row">
      <span class="label">Address:</span>
      <span class="value">${inspection.property.address}</span>
    </div>
    <div class="info-row">
      <span class="label">Property Type:</span>
      <span class="value">${inspection.property.type}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Customer Information</div>
    <div class="info-row">
      <span class="label">Name:</span>
      <span class="value">${lead.customer_name}</span>
    </div>
    <div class="info-row">
      <span class="label">Phone:</span>
      <span class="value">${formatPhoneNumber(lead.customer_phone)}</span>
    </div>
    <div class="info-row">
      <span class="label">Email:</span>
      <span class="value">${lead.customer_email || 'N/A'}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">AI Summary</div>
    <p>${inspection.aiSummary}</p>
  </div>

  <div class="section">
    <div class="section-title">Scope of Works</div>
    ${inspection.demolition.enabled ? `
      <p><strong>Demolition Work:</strong> ${inspection.demolition.description}</p>
    ` : ''}
    ${inspection.construction.enabled ? `
      <p><strong>Construction Work:</strong> ${inspection.construction.description}</p>
    ` : ''}
    ${inspection.subfloor.enabled ? `
      <p><strong>Subfloor Work:</strong> ${inspection.subfloor.description}</p>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">Pricing</div>
    <table class="pricing-table">
      <tr>
        <th>Item</th>
        <th>Details</th>
        <th>Amount (ex GST)</th>
      </tr>
      <tr>
        <td>Labour</td>
        <td>${inspection.pricing.totalHours} hours over ${inspection.pricing.daysOnSite} days</td>
        <td>$${formatCurrency(inspection.pricing.labourAfterDiscount)}</td>
      </tr>
      ${inspection.pricing.discount > 0 ? `
        <tr>
          <td colspan="2">Multi-day discount (${(inspection.pricing.discountPercentage * 100).toFixed(1)}%)</td>
          <td>-$${formatCurrency(inspection.pricing.discount)}</td>
        </tr>
      ` : ''}
      <tr>
        <td>Equipment Hire</td>
        <td>
          ${inspection.equipment.dehumidifiers} dehumidifiers,
          ${inspection.equipment.airMovers} air movers,
          ${inspection.equipment.rcdBoxes} RCD boxes
        </td>
        <td>$${formatCurrency(inspection.pricing.equipmentTotal)}</td>
      </tr>
      <tr>
        <td colspan="2"><strong>Subtotal (ex GST)</strong></td>
        <td><strong>$${formatCurrency(inspection.pricing.subtotal)}</strong></td>
      </tr>
      <tr>
        <td colspan="2">GST (10%)</td>
        <td>$${formatCurrency(inspection.pricing.gst)}</td>
      </tr>
      <tr>
        <td colspan="2" class="pricing-total">TOTAL (inc GST)</td>
        <td class="pricing-total">$${formatCurrency(inspection.pricing.total)}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Terms & Conditions</div>
    <p>This quote is valid for 30 days from the date of issue...</p>
  </div>

  <div class="footer">
    <p>Mould & Restoration Co. | Professional Mould Remediation Services</p>
    <p>Servicing Melbourne & Surrounding Areas</p>
  </div>
</body>
</html>
  `;
}
```

**Acceptance Criteria:**
- [ ] TypeScript Pro confirms type safety
- [ ] Test Engineer confirms PDF generation works
- [ ] mobile-tester confirms PDF preview works on mobile
- [ ] All data appears correctly in PDF
- [ ] Australian formatting applied (currency, dates, phone)
- [ ] Security Auditor confirms storage secured with RLS
- [ ] Code Reviewer approves implementation

**Files Created:**
- `supabase/functions/generate-inspection-pdf/index.ts`
- `src/lib/api/pdfGeneration.ts`
- `src/components/inspection/PDFPreview.tsx`

---

### **Day 15 (Friday): Week 3 Testing & Email Automation**

#### **Task 3.6: Email Automation with Resend API**
**Priority:** P0 (Must Have)
**Time:** 4 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Setup Resend API integration
"Setup Resend API integration with email templates"

# Step 2: TypeScript Pro - Create email templates
"Create 3 email templates: inspection booked confirmation,
PDF approval, job approved"

# Step 3: Test Engineer - Test email sending
"Test email sending: delivers successfully, templates render correctly"

# Step 4: Security Auditor - Verify email security
"Verify SPF/DKIM records configured, API key secured server-side"

# Step 5: Code Reviewer - Review email implementation
"Review email implementation: template quality, error handling"
```

**Email Implementation:**
```typescript
// supabase/functions/send-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  try {
    const { template, recipient, data } = await req.json();

    const html = buildEmailTemplate(template, data);

    const { data: result, error } = await resend.emails.send({
      from: 'Mould & Restoration Co. <admin@mouldandrestoration.com.au>',
      to: recipient,
      subject: getEmailSubject(template),
      html,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Acceptance Criteria:**
- [ ] TypeScript Pro confirms type safety
- [ ] Test Engineer confirms emails deliver successfully
- [ ] Security Auditor confirms SPF/DKIM configured
- [ ] Templates render correctly across email clients
- [ ] Code Reviewer approves implementation

**Files Created:**
- `supabase/functions/send-email/index.ts`
- `src/lib/api/email.ts`

---

#### **Task 3.7: Week 3 Checkpoint - Automation & Intelligence**
**Priority:** P0 (Must Have - Week 3 Gate)
**Time:** 2 hours
**Agent Workflow:**
```bash
# Step 1: pricing-calculator - FULL pricing validation (BLOCKER)
"Run ALL 48 pricing scenarios - verify 100% pass rate
DEPLOYMENT BLOCKER: If ANY scenario fails, DO NOT proceed"

# Step 2: Security Auditor - Security scan (BLOCKER)
"Full security scan: API keys secured, RLS policies correct, npm audit
REQUIREMENT: Zero high/critical vulnerabilities"

# Step 3: Test Engineer - Integration testing
"Test complete workflow: inspection form ’ AI summary ’ PDF ’ email"

# Step 4: mobile-tester - Mobile testing
"Test all Week 3 features at 375px: form, PDF preview"

# Step 5: Web Vitals Optimizer - Performance audit
"Performance audit: form performance, PDF generation time"
```

**Week 3 Testing Checklist:**
- [ ] **Pricing Calculator (DEPLOYMENT BLOCKER):**
  - [ ] pricing-calculator: ALL 48 scenarios PASS (BLOCKER)
  - [ ] pricing-calculator: 13% cap NEVER exceeded (BLOCKER)
  - [ ] Test Engineer: Regression tests pass

- [ ] **Security (BLOCKER):**
  - [ ] Security Auditor: ZERO high/critical vulnerabilities (BLOCKER)
  - [ ] API keys secured server-side only
  - [ ] RLS policies correct
  - [ ] npm audit clean

- [ ] **Inspection Form:**
  - [ ] Auto-save works every 30 seconds
  - [ ] All sections work correctly
  - [ ] Photo upload works
  - [ ] Form persists across page reload
  - [ ] mobile-tester confirms 375px works

- [ ] **AI & PDF:**
  - [ ] AI summaries generate successfully
  - [ ] PDFs generate with correct data
  - [ ] PDFs display correctly on mobile
  - [ ] Test Engineer confirms quality

- [ ] **Email:**
  - [ ] Emails send successfully
  - [ ] Templates render correctly
  - [ ] Security Auditor confirms SPF/DKIM

- [ ] **Code Quality:**
  - [ ] Code Reviewer approves quality
  - [ ] TypeScript Pro confirms type safety
  - [ ] No console errors

**Acceptance Criteria (BLOCKERS):**
- [ ] pricing-calculator: ALL 48 scenarios PASS (BLOCKER)
- [ ] Security Auditor: ZERO high/critical vulnerabilities (BLOCKER)
- [ ] Test Engineer: All tests pass
- [ ] mobile-tester: 375px works perfectly
- [ ] Week 3 complete - Ready for Week 4

---

## **WEEK 4: CALENDAR & POLISH**

---

### **Day 16 (Monday): Customer Booking Calendar - Frontend**

#### **Task 4.1: Customer Self-Booking Calendar UI**
**Priority:** P0 (Must Have)
**Time:** 5 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Build calendar components
"Build CustomerBooking, AvailabilityCalendar, TimeSlotPicker components"

# Step 2: mobile-tester - Test calendar on mobile (CRITICAL)
"Test calendar at 375px: date picker works, time slots tap correctly,
touch targets e48px, scrolling smooth"

# Step 3: TypeScript Pro - Implement booking validation
"Implement validation: business hours only (7am-5pm Mon-Fri),
 no double bookings, minimum 2-hour slots"

# Step 4: Test Engineer - Test calendar interactions
"Test: date selection, time slot selection, validation"

# Step 5: Code Reviewer - Review calendar implementation
"Review calendar: UX, accessibility, error handling"
```

**Calendar Implementation:**
```typescript
// src/pages/CustomerBooking.tsx
import { useState } from 'react';
import { AvailabilityCalendar } from '@/components/calendar/AvailabilityCalendar';
import { TimeSlotPicker } from '@/components/calendar/TimeSlotPicker';
import { useAvailableSlots } from '@/lib/hooks/useAvailableSlots';

export function CustomerBooking() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const { data: availableSlots, isLoading } = useAvailableSlots(selectedDate);

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 md:p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Book Your Inspection</h1>
        <p className="mt-2 text-muted-foreground">
          Select a date and time that works for you
        </p>
      </div>

      <AvailabilityCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {selectedDate && (
        <TimeSlotPicker
          date={selectedDate}
          slots={availableSlots ?? []}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          isLoading={isLoading}
        />
      )}

      {selectedSlot && (
        <Button
          onClick={() => handleConfirmBooking(selectedDate!, selectedSlot)}
          className="h-12 w-full"
        >
          Confirm Booking
        </Button>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] mobile-tester confirms 375px works perfectly
- [ ] Date picker usable with touch
- [ ] Time slots e48px height
- [ ] Validation works (business hours, no conflicts)
- [ ] Test Engineer confirms interactions work
- [ ] Code Reviewer approves UX

**Files Created:**
- `src/pages/CustomerBooking.tsx`
- `src/components/calendar/AvailabilityCalendar.tsx`
- `src/components/calendar/TimeSlotPicker.tsx`

---

### **Day 17 (Tuesday): Travel Time Conflict Detection**

#### **Task 4.2: Zone-Based Travel Time Matrix & Conflict Detection**
**Priority:** P0 (Must Have - Prevents impossible bookings)
**Time:** 5 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Implement travel time matrix
"Implement zone-based travel time matrix (4 zones × 4 zones = 16 combinations)"

# Step 2: TypeScript Pro - Implement conflict detection algorithm
"Implement conflict detection: check if technician can travel between
bookings in time (Example: Carlton 2pm ’ Mernda 3pm = impossible)"

# Step 3: Test Engineer - Test conflict scenarios
"Test conflict scenarios:
- Same zone bookings (15 min apart OK)
- Adjacent zones (30 min apart OK)
- Far zones (60 min apart required)
- Edge cases (back-to-back in different zones)"

# Step 4: SQL Pro - Optimize database queries
"Optimize availability queries with indexes on calendar_bookings table"

# Step 5: Code Reviewer - Review conflict logic
"Review conflict detection logic: correctness, edge cases, performance"
```

**Travel Time Matrix Implementation:**
```typescript
// src/lib/utils/travelTime.ts

/**
 * Melbourne Zone Definitions
 * Zone 1: CBD (3000-3006) - Carlton, Fitzroy, etc.
 * Zone 2: Inner (3010-3101) - Collingwood, Richmond, etc.
 * Zone 3: Middle (3102-3211) - Frankston, Glen Waverley, etc.
 * Zone 4: Outer (3212+) - Geelong, Mornington Peninsula, etc.
 */

export const TRAVEL_TIME_MATRIX: Record<1 | 2 | 3 | 4, Record<1 | 2 | 3 | 4, number>> = {
  1: { 1: 15, 2: 30, 3: 45, 4: 60 }, // From CBD
  2: { 1: 30, 2: 20, 3: 40, 4: 55 }, // From Inner
  3: { 1: 45, 2: 40, 3: 25, 4: 45 }, // From Middle
  4: { 1: 60, 2: 55, 3: 45, 4: 30 }, // From Outer
};

export interface BookingConflict {
  hasConflict: boolean;
  reason?: string;
  requiredTravelTime?: number;
  actualGapTime?: number;
}

export function checkBookingConflict(
  existingBooking: {
    startTime: Date;
    endTime: Date;
    propertyZone: 1 | 2 | 3 | 4;
  },
  newBooking: {
    startTime: Date;
    endTime: Date;
    propertyZone: 1 | 2 | 3 | 4;
  }
): BookingConflict {
  // Check if bookings overlap
  if (
    (newBooking.startTime >= existingBooking.startTime &&
      newBooking.startTime < existingBooking.endTime) ||
    (newBooking.endTime > existingBooking.startTime &&
      newBooking.endTime <= existingBooking.endTime)
  ) {
    return {
      hasConflict: true,
      reason: 'Booking times overlap',
    };
  }

  // Check travel time between bookings
  const travelTime = TRAVEL_TIME_MATRIX[existingBooking.propertyZone][newBooking.propertyZone];

  // Calculate gap between bookings
  let gapMinutes: number;
  if (newBooking.startTime > existingBooking.endTime) {
    // New booking is after existing
    gapMinutes = (newBooking.startTime.getTime() - existingBooking.endTime.getTime()) / 1000 / 60;
  } else {
    // New booking is before existing
    gapMinutes = (existingBooking.startTime.getTime() - newBooking.endTime.getTime()) / 1000 / 60;
  }

  // Check if gap is sufficient for travel
  if (gapMinutes < travelTime) {
    return {
      hasConflict: true,
      reason: `Insufficient travel time. Need ${travelTime} minutes, have ${Math.floor(gapMinutes)} minutes.`,
      requiredTravelTime: travelTime,
      actualGapTime: gapMinutes,
    };
  }

  return { hasConflict: false };
}

// Example usage:
// Carlton (Zone 1) at 2pm ’ Mernda (Zone 3) at 3pm
// Need 45 minutes travel time, only have 60 minutes gap ’ OK
// Carlton (Zone 1) at 2pm ’ Mernda (Zone 3) at 2:30pm
// Need 45 minutes travel time, only have 30 minutes gap ’ CONFLICT
```

**Conflict Detection in Calendar:**
```typescript
// src/lib/api/calendar.ts
export async function getAvailableSlots(
  date: Date,
  technicianId: string,
  propertyZone: 1 | 2 | 3 | 4
): Promise<TimeSlot[]> {
  // Fetch existing bookings for the day
  const { data: existingBookings } = await supabase
    .from('calendar_bookings')
    .select('*')
    .eq('technician_id', technicianId)
    .gte('start_time', startOfDay(date))
    .lte('start_time', endOfDay(date))
    .order('start_time');

  // Generate all possible slots (7am-5pm, 2-hour minimum)
  const allSlots = generateTimeSlots(date);

  // Filter out conflicting slots
  const availableSlots = allSlots.filter(slot => {
    const newBooking = {
      startTime: slot.startTime,
      endTime: slot.endTime,
      propertyZone,
    };

    // Check against all existing bookings
    for (const booking of existingBookings ?? []) {
      const conflict = checkBookingConflict(
        {
          startTime: new Date(booking.start_time),
          endTime: new Date(booking.end_time),
          propertyZone: booking.property_zone,
        },
        newBooking
      );

      if (conflict.hasConflict) {
        return false; // Slot not available
      }
    }

    return true; // Slot available
  });

  return availableSlots;
}
```

**Test Scenarios:**
```typescript
// __tests__/travelTime.test.ts
describe('Travel Time Conflict Detection', () => {
  it('detects conflict: Carlton 2pm ’ Mernda 3pm (impossible)', () => {
    const existing = {
      startTime: new Date('2025-01-15T14:00:00'), // 2pm
      endTime: new Date('2025-01-15T16:00:00'),   // 4pm
      propertyZone: 1 as const, // Carlton (Zone 1)
    };

    const newBooking = {
      startTime: new Date('2025-01-15T15:00:00'), // 3pm
      endTime: new Date('2025-01-15T17:00:00'),   // 5pm
      propertyZone: 3 as const, // Mernda (Zone 3)
    };

    const result = checkBookingConflict(existing, newBooking);

    expect(result.hasConflict).toBe(true);
    expect(result.reason).toContain('Insufficient travel time');
    expect(result.requiredTravelTime).toBe(45); // 45 min needed
  });

  it('allows valid booking: Carlton 2pm ’ Mernda 5pm (OK)', () => {
    const existing = {
      startTime: new Date('2025-01-15T14:00:00'), // 2pm
      endTime: new Date('2025-01-15T16:00:00'),   // 4pm
      propertyZone: 1 as const, // Carlton
    };

    const newBooking = {
      startTime: new Date('2025-01-15T17:00:00'), // 5pm
      endTime: new Date('2025-01-15T19:00:00'),   // 7pm (out of hours, but testing travel)
      propertyZone: 3 as const, // Mernda
    };

    const result = checkBookingConflict(existing, newBooking);

    expect(result.hasConflict).toBe(false);
  });
});
```

**Acceptance Criteria:**
- [ ] TypeScript Pro confirms type safety
- [ ] Test Engineer confirms ALL conflict scenarios pass
- [ ] SQL Pro confirms query performance optimized
- [ ] Carlton ’ Mernda 3pm booking rejected (conflict)
- [ ] Carlton ’ Mernda 5pm booking allowed (no conflict)
- [ ] Code Reviewer approves conflict logic

**Files Created:**
- `src/lib/utils/travelTime.ts`
- `src/lib/api/calendar.ts`
- `__tests__/travelTime.test.ts`

---

### **Day 18 (Wednesday): Settings & Configuration**

#### **Task 4.3: Settings Page (Company Info, Users)**
**Priority:** P1 (Should Have)
**Time:** 4 hours
**Agent Workflow:**
```bash
# Step 1: TypeScript Pro - Build Settings page
"Build Settings page: company info, user management, preferences"

# Step 2: mobile-tester - Test settings on mobile
"Test settings at 375px: forms work, inputs e48px, navigation smooth"

# Step 3: Security Auditor - Verify user management security
"Verify only admins can manage users, RLS policies correct"

# Step 4: Test Engineer - Test settings functionality
"Test: update company info, add/remove users, change preferences"

# Step 5: Code Reviewer - Review settings implementation
"Review settings: form validation, security, user experience"
```

**Acceptance Criteria:**
- [ ] mobile-tester confirms 375px works
- [ ] Security Auditor confirms admin-only access
- [ ] Test Engineer confirms all settings work
- [ ] Code Reviewer approves implementation

**Files Created:**
- `src/pages/Settings.tsx`
- `src/components/settings/CompanyInfo.tsx`
- `src/components/settings/UserManagement.tsx`

---

### **Day 19 (Thursday): Performance Optimization & Bug Fixes**

#### **Task 4.4: Performance Optimization**
**Priority:** P0 (Must Have - Deployment Blocker)
**Time:** 5 hours
**Agent Workflow:**
```bash
# Step 1: Web Vitals Optimizer - Full performance audit (BLOCKER)
"Run Lighthouse audit on ALL pages:
- Dashboard
- Kanban
- Inspection Form
- Calendar
- Customer Booking
REQUIREMENT: Mobile score >90 on ALL pages"

# Step 2: Performance Engineer - Optimize bottlenecks
"Identify and optimize bottlenecks:
- Bundle size reduction
- Image optimization
- Code splitting
- React Query caching"

# Step 3: Web Vitals Optimizer - Re-audit after optimization
"Re-run Lighthouse audit - verify ALL pages >90 mobile score"

# Step 4: mobile-tester - Test load times on 3G
"Test load times on simulated 3G network
REQUIREMENT: All pages load <3 seconds on 3G"

# Step 5: Performance Engineer - Final optimization review
"Review all optimizations: bundle sizes, caching strategy, lazy loading"
```

**Performance Optimization Checklist:**
- [ ] **Web Vitals (BLOCKER):**
  - [ ] Web Vitals Optimizer: Mobile score >90 on ALL pages (BLOCKER)
  - [ ] LCP <2.5s on all pages
  - [ ] FID <100ms on all pages
  - [ ] CLS <0.1 on all pages

- [ ] **Load Performance:**
  - [ ] mobile-tester: All pages <3s on 3G (BLOCKER)
  - [ ] Bundle size optimized
  - [ ] Images compressed
  - [ ] Code splitting implemented

- [ ] **Caching:**
  - [ ] React Query caching optimized
  - [ ] Service Worker caching configured
  - [ ] Static assets cached

**Acceptance Criteria (DEPLOYMENT BLOCKER):**
- [ ] Web Vitals Optimizer: Mobile >90 ALL pages (BLOCKER)
- [ ] mobile-tester: <3s load on 3G (BLOCKER)
- [ ] Performance Engineer approves optimization
- [ ] No performance regressions

**Files Modified:**
- Bundle configuration optimized
- Image compression added
- Code splitting implemented
- Service Worker configured

---

### **Day 20 (Friday): Final Testing & Deployment Preparation**

#### **Task 4.5: FINAL CHECKPOINT - All 3 Deployment Blockers MUST PASS**
**Priority:** P0 (Must Have - Deployment Gate)
**Time:** Full day
**Agent Workflow:**
```bash
# DEPLOYMENT BLOCKER 1: Security Auditor (MUST PASS)
"Full security scan of entire application:
- npm audit (ZERO high/critical)
- RLS policies (all tested and correct)
- Authentication flows (secure)
- API keys (all server-side only)
- XSS/CSRF vulnerabilities (none found)
REQUIREMENT: ZERO high/critical vulnerabilities
IF FAIL: DO NOT DEPLOY - Fix issues first"

# DEPLOYMENT BLOCKER 2: pricing-calculator (MUST PASS)
"Run ALL 48 pricing scenarios:
- All 4 work types tested
- All discount tiers tested (0%, 7.5%, 13%)
- 13% cap NEVER exceeded
- Equipment calculations correct
- GST calculations correct
REQUIREMENT: 100% pass rate on all 48 scenarios
IF FAIL: DO NOT DEPLOY - Fix pricing logic"

# DEPLOYMENT BLOCKER 3: Web Vitals Optimizer (MUST PASS)
"Performance audit on ALL pages:
- Dashboard
- Kanban
- Leads
- Inspection Form
- Calendar
- Customer Booking
- Settings
REQUIREMENT: Mobile score >90 on ALL pages
IF FAIL: DO NOT DEPLOY - Optimize performance"

# Step 4: mobile-tester - Full mobile testing
"Test ENTIRE application at 375px viewport:
- All pages load correctly
- All forms work
- All touch targets e48px
- No horizontal scroll
- Offline mode works
REQUIREMENT: PERFECT mobile experience"

# Step 5: Test Engineer - End-to-end testing
"Run complete workflow tests:
- HiPages lead ’ New lead
- Create inspection booking
- Complete inspection form
- Generate AI summary
- Generate PDF
- Send email
- Customer books job
- Job moves through pipeline"

# Step 6: Error Detective - Log analysis
"Review all logs from testing:
- Identify any warnings
- Check error rates
- Monitor performance metrics"

# Step 7: Code Reviewer - Final code review
"Final code review:
- Code quality standards met
- Documentation complete
- No console errors
- All TODOs resolved"
```

**Final Deployment Checklist:**

### **=¨ DEPLOYMENT BLOCKERS (MUST ALL PASS):**

#### **Blocker 1: Security Auditor** /L
- [ ] npm audit: ZERO high/critical vulnerabilities
- [ ] RLS policies: All tested and working
- [ ] Authentication: Secure implementation
- [ ] API keys: All server-side only
- [ ] XSS/CSRF: No vulnerabilities found
- [ ] **STATUS:** PASS / FAIL
- [ ] **IF FAIL:** DO NOT DEPLOY

#### **Blocker 2: pricing-calculator** /L
- [ ] All 48 pricing scenarios: 100% PASS
- [ ] 13% discount cap: NEVER exceeded
- [ ] Equipment calculations: Correct
- [ ] GST calculations: Correct (10%)
- [ ] Regression tests: All pass
- [ ] **STATUS:** PASS / FAIL
- [ ] **IF FAIL:** DO NOT DEPLOY

#### **Blocker 3: Web Vitals Optimizer** /L
- [ ] Dashboard: Mobile >90
- [ ] Kanban: Mobile >90
- [ ] Leads: Mobile >90
- [ ] Inspection Form: Mobile >90
- [ ] Calendar: Mobile >90
- [ ] Customer Booking: Mobile >90
- [ ] Settings: Mobile >90
- [ ] **ALL PAGES:** Mobile >90
- [ ] **STATUS:** PASS / FAIL
- [ ] **IF FAIL:** DO NOT DEPLOY

### **=ñ Mobile-First Validation:**
- [ ] mobile-tester: 375px works PERFECTLY on all pages
- [ ] All touch targets e48px
- [ ] No horizontal scroll on any page
- [ ] Forms usable with on-screen keyboard
- [ ] Bottom nav active state works
- [ ] Offline mode works 100%
- [ ] Auto-save works every 30 seconds

### **= End-to-End Testing:**
- [ ] Complete workflow: Lead ’ Inspection ’ PDF ’ Booking
- [ ] All 12 pipeline stages accessible
- [ ] Kanban drag-and-drop works (desktop + mobile)
- [ ] Calendar conflict detection works
- [ ] Email delivery works
- [ ] PDF generation works

### ** Code Quality:**
- [ ] Code Reviewer: Final approval
- [ ] TypeScript Pro: Type safety confirmed
- [ ] No console errors
- [ ] No console warnings (non-critical)
- [ ] All TODOs resolved or documented

### **=Ê Success Metrics:**
- [ ] All P0 tasks completed (45 tasks)
- [ ] Zero critical bugs
- [ ] Sprint 1 demo script ready (15 minutes)
- [ ] Documentation complete
- [ ] Team trained on system

---

## **DEPLOYMENT DECISION:**

```bash
IF all 3 blockers PASS:
   DEPLOY TO PRODUCTION
  <‰ Sprint 1 Complete!
  =Å Schedule demo with owners
  =€ Begin Sprint 2 planning

ELSE:
  L DO NOT DEPLOY
  =' Fix failing blockers
  = Re-run checkpoint
  ø Delay deployment until all pass
```

---

## =Ê Sprint 1 Summary Statistics

### **Agent Usage Across Sprint:**
- **Security Auditor:** 15 invocations (5 checkpoints)
- **pricing-calculator:** 12 invocations (continuous validation)
- **Web Vitals Optimizer:** 10 invocations (weekly + final)
- **mobile-tester:** 35+ invocations (every UI change)
- **TypeScript Pro:** 40+ invocations (all development)
- **Test Engineer:** 30+ invocations (all features)
- **Code Reviewer:** 25+ invocations (all code)
- **Database Admin:** 10 invocations (Week 1)
- **SQL Pro:** 8 invocations (Week 1-2)
- **Error Detective:** 12 invocations (debugging)
- **Performance Engineer:** 8 invocations (Week 4)
- **Technical Writer:** 5 invocations (documentation)

### **Tasks Completed:**
- **Week 1:** 9 tasks (Database foundation)
- **Week 2:** 7 tasks (Core features)
- **Week 3:** 7 tasks (Automation & intelligence)
- **Week 4:** 5 tasks (Calendar & polish)
- **Total:** 28 major tasks, 320+ subtasks

### **Files Created:**
- **Components:** 45+ React components
- **Pages:** 8 main pages
- **Hooks:** 15+ custom hooks
- **Utils:** 20+ utility functions
- **Tests:** 48 pricing scenarios + integration tests
- **Edge Functions:** 4 Supabase functions
- **Migrations:** 11 database migrations

### **Critical Features Delivered:**
-  12-stage lead pipeline
-  Offline-first architecture
-  Auto-save (30-second intervals)
-  100+ field inspection form
-  AI summary generation (Claude API)
-  PDF generation (Puppeteer)
-  Email automation (Resend API)
-  Customer self-booking calendar
-  Travel time conflict detection
-  Pricing calculator (13% cap enforced)

---

## <¯ Sprint 1 Success Criteria

### **Technical Success:**
- [ ] All 3 deployment blockers PASS
- [ ] All P0 tasks complete (45 tasks)
- [ ] Zero critical bugs
- [ ] Mobile-first: 375px works perfectly
- [ ] Offline mode: 100% reliable
- [ ] Auto-save: 100% working

### **Business Success:**
- [ ] 15-minute demo ready
- [ ] Owners can use system confidently
- [ ] Clayton & Glen trained on mobile app
- [ ] Admin workflow 80% faster vs Airtable
- [ ] System ready for production leads

### **Quality Success:**
- [ ] Security Auditor: ZERO high/critical vulnerabilities
- [ ] pricing-calculator: 48/48 scenarios pass
- [ ] Web Vitals Optimizer: Mobile >90 all pages
- [ ] mobile-tester: Perfect 375px experience
- [ ] Code Reviewer: Quality approved

---

## =€ Ready for Sprint 2

**Sprint 2 Scope (Future):**
- Job completion tracking
- Invoice generation
- Payment processing (Stripe integration)
- HiPages API integration
- Advanced analytics & reporting
- Performance monitoring dashboard

**Next Steps:**
1.  Complete Sprint 1 deployment
2. =Å Schedule demo with business owners
3. =Ý Gather user feedback
4. <¯ Plan Sprint 2 backlog
5. =€ Begin Sprint 2 development

---

*Last Updated: 2025-11-11*
*Sprint: Sprint 1 (4 weeks)*
*Status: Complete 4-week plan with multi-agent integration*

**Sprint 1 is fully planned with 28 major tasks, 320+ subtasks, and comprehensive agent workflows for every feature!** <‰

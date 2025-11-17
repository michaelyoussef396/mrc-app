# 🤖 MRC LEAD MANAGEMENT SYSTEM
## Comprehensive Multi-Agent + MCP Server Workflow Architecture

**Version:** 2.0  
**Date:** November 17, 2025  
**Status:** Ready for Implementation  
**Project:** MRC Lead Management System (Business-Critical Production System)

---

## 📋 EXECUTIVE SUMMARY

This document defines the **complete multi-agent workflow architecture** with **MCP (Model Context Protocol) server integration** for building the MRC Lead Management System. This is NOT about building new agents—we already have 18 specialized agents. This is about **orchestrating them systematically** with MCP servers to work together like a well-oiled machine.

**Key Philosophy:**
- **Agents work in flows, not isolation** - Every task involves multiple specialized agents
- **MCP servers provide intelligence** - Supabase, Filesystem, Playwright, Chrome DevTools
- **One communication hub** - Single `AGENT-PROGRESS.md` file for all coordination
- **Quality gates at every step** - No code merges without multi-agent approval
- **Mobile-first, security-first, Australian-compliance-first** - Non-negotiable standards

---

## 🎯 CORE PRINCIPLES

### 1. **Systematic Collaboration**
Every development task follows a predictable multi-agent pattern:
```
PLAN → BUILD → TEST → SECURE → OPTIMIZE → DOCUMENT → DEPLOY
```

### 2. **MCP-First Integration**
MCP servers provide specialized context that agents use to make informed decisions:
- **Supabase MCP** → Database schema, migrations, RLS policies, real-time queries
- **Filesystem MCP** → Project structure analysis, code reading, batch file operations
- **Playwright MCP** → Visual browser testing, mobile viewport simulation, network monitoring
- **Chrome DevTools MCP** → Console logs, network requests, performance metrics

### 3. **Single Source of Truth**
`AGENT-PROGRESS.md` is the living communication log where:
- Agents report their findings and actions
- Handoffs between agents are explicit
- Progress is tracked systematically
- Blockers are surfaced immediately
- Decisions are documented

### 4. **Quality Gates**
No code advances without passing mandatory checks:
- **Pre-commit:** Code formatting, linting, basic tests
- **Pre-merge:** Full agent review (Code Reviewer + Mobile Tester + TypeScript Pro)
- **Pre-deployment:** Complete security + performance + pricing validation

---

## 🏗️ MULTI-AGENT WORKFLOW PATTERNS

### **Pattern 1: Feature Development (Full Stack)**

**Scenario:** Building the Calendar Booking System with conflict detection

```markdown
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: PLANNING & DESIGN (1-2 hours)                     │
└─────────────────────────────────────────────────────────────┘

AGENT: Supabase Schema Architect
MCP: Supabase MCP + Filesystem MCP
TASK: Design calendar_bookings table schema
OUTPUT: Migration SQL with RLS policies

↓ HANDOFF via AGENT-PROGRESS.md ↓

AGENT: TypeScript Pro  
MCP: Filesystem MCP
TASK: Generate TypeScript types from schema
OUTPUT: types/calendar.ts with full type safety

↓ HANDOFF via AGENT-PROGRESS.md ↓

AGENT: Technical Writer
MCP: Filesystem MCP
TASK: Document booking logic and API contracts
OUTPUT: docs/CALENDAR-BOOKING-API.md

┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: DATABASE IMPLEMENTATION (30 minutes)              │
└─────────────────────────────────────────────────────────────┘

AGENT: SQL Pro
MCP: Supabase MCP
TASK: Create migration with conflict detection function
OUTPUT: supabase/migrations/XXXXXX_calendar_bookings.sql

↓ VERIFY ↓

AGENT: Database Admin
MCP: Supabase MCP  
TASK: Verify RLS policies and test conflict detection
OUTPUT: Test results + policy validation

┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: FRONTEND IMPLEMENTATION (3-4 hours)               │
└─────────────────────────────────────────────────────────────┘

AGENT: React Performance Optimization
MCP: Filesystem MCP
TASK: Build CalendarView component with virtual scrolling
OUTPUT: src/components/calendar/CalendarView.tsx

↓ PARALLEL DEVELOPMENT ↓

AGENT: TypeScript Pro
MCP: Filesystem MCP
TASK: Create booking service with type-safe API calls
OUTPUT: src/services/booking.service.ts

↓ INTEGRATION ↓

AGENT: Code Reviewer
MCP: Filesystem MCP
TASK: Review component integration and data flow
OUTPUT: Review report with refactoring suggestions

┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: MOBILE OPTIMIZATION (1-2 hours)                   │
└─────────────────────────────────────────────────────────────┘

AGENT: Mobile Tester  
MCP: Playwright MCP + Chrome DevTools MCP
TASK: Test calendar at 375px, 768px, 1440px viewports
OUTPUT: Mobile compatibility report

↓ ISSUES FOUND? ↓

AGENT: Design Review
MCP: Filesystem MCP + Playwright MCP
TASK: Fix touch targets, responsive layout, gesture support
OUTPUT: Updated CalendarView.tsx with mobile fixes

↓ RETEST ↓

AGENT: Mobile Tester
MCP: Playwright MCP
TASK: Verify all mobile issues resolved
OUTPUT: ✅ PASS - Mobile ready

┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: TESTING & VALIDATION (2-3 hours)                  │
└─────────────────────────────────────────────────────────────┘

AGENT: Test Engineer
MCP: Filesystem MCP + Supabase MCP
TASK: Create comprehensive test suite
OUTPUT: __tests__/calendar-booking.test.ts (20+ scenarios)

↓ RUN TESTS ↓

AGENT: Error Detective  
MCP: Chrome DevTools MCP + Filesystem MCP
TASK: Debug any test failures and edge cases
OUTPUT: Bug fixes + updated tests

┌─────────────────────────────────────────────────────────────┐
│ PHASE 6: SECURITY & PERFORMANCE (1-2 hours)                │
└─────────────────────────────────────────────────────────────┘

AGENT: Security Auditor (DEPLOYMENT BLOCKER)
MCP: Supabase MCP + Filesystem MCP
TASK: Full security scan - RLS policies, input validation, auth
OUTPUT: Security report with PASS/FAIL decision

↓ MUST PASS TO CONTINUE ↓

AGENT: Web Vitals Optimizer
MCP: Playwright MCP + Chrome DevTools MCP  
TASK: Measure performance - load time <3s, bundle size <500KB
OUTPUT: Performance report with optimization suggestions

↓ IF PERFORMANCE ISSUES ↓

AGENT: Performance Engineer
MCP: Filesystem MCP + Chrome DevTools MCP
TASK: Optimize bundle, lazy loading, code splitting
OUTPUT: Optimized build with performance gains

┌─────────────────────────────────────────────────────────────┐
│ PHASE 7: DOCUMENTATION & DEPLOYMENT (1 hour)               │
└─────────────────────────────────────────────────────────────┘

AGENT: Technical Writer  
MCP: Filesystem MCP
TASK: Update user documentation and API docs
OUTPUT: Updated README, CALENDAR.md, CHANGELOG.md

↓ FINAL CHECKLIST ↓

AGENT: Changelog Generator
MCP: Filesystem MCP
TASK: Generate release notes
OUTPUT: CHANGELOG entry with all changes

┌─────────────────────────────────────────────────────────────┐
│ PHASE 8: PRE-DEPLOYMENT VALIDATION (MANDATORY)             │
└─────────────────────────────────────────────────────────────┘

WORKFLOW: Multi-Agent Deployment Gate
AGENTS: 5 mandatory checks (ALL MUST PASS)

1️⃣ Security Auditor → Full security scan
2️⃣ Pricing Calculator → Verify pricing rules unchanged  
3️⃣ Web Vitals Optimizer → Performance benchmarks
4️⃣ Mobile Tester → Mobile compatibility check
5️⃣ Test Engineer → Full test suite execution

DECISION:
- ALL PASS → ✅ DEPLOYMENT APPROVED
- ANY FAIL → ❌ DEPLOYMENT BLOCKED

┌─────────────────────────────────────────────────────────────┐
│ TOTAL TIME: 10-16 hours (systematic, quality-first)        │
│ OUTPUT: Production-ready calendar booking feature           │
└─────────────────────────────────────────────────────────────┘
```

---

### **Pattern 2: Bug Fix Workflow**

**Scenario:** Inspection form auto-save failing intermittently

```markdown
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: DIAGNOSIS (30 minutes)                            │
└─────────────────────────────────────────────────────────────┘

AGENT: Error Detective
MCP: Chrome DevTools MCP + Filesystem MCP
TASK: Analyze error logs, network requests, console output
OUTPUT: Root cause analysis (e.g., race condition in useEffect)

↓ REPRODUCE ISSUE ↓

AGENT: Mobile Tester
MCP: Playwright MCP
TASK: Create failing test case that reproduces bug
OUTPUT: bug-reproduction.test.ts

┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: FIX IMPLEMENTATION (1-2 hours)                    │
└─────────────────────────────────────────────────────────────┘

AGENT: React Performance Optimization  
MCP: Filesystem MCP
TASK: Implement fix with proper debouncing + retry logic
OUTPUT: Updated useAutoSave.ts hook

↓ CODE REVIEW ↓

AGENT: Code Reviewer
MCP: Filesystem MCP
TASK: Review fix for correctness, edge cases, maintainability
OUTPUT: Approve with minor suggestions

┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: VERIFICATION (1 hour)                             │
└─────────────────────────────────────────────────────────────┘

AGENT: Test Engineer
MCP: Filesystem MCP + Supabase MCP
TASK: Add regression tests to prevent recurrence
OUTPUT: Updated test suite with auto-save edge cases

↓ VERIFY FIX ↓

AGENT: Mobile Tester  
MCP: Playwright MCP
TASK: Run comprehensive mobile tests including auto-save
OUTPUT: ✅ ALL TESTS PASS

┌─────────────────────────────────────────────────────────────┐
│ TOTAL TIME: 2.5-3.5 hours (thorough bug fix)               │
│ OUTPUT: Verified fix + regression tests + documentation     │
└─────────────────────────────────────────────────────────────┘
```

---

### **Pattern 3: Performance Optimization**

**Scenario:** Dashboard loading slowly (>5 seconds on mobile)

```markdown
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: PROFILING (30 minutes)                            │
└─────────────────────────────────────────────────────────────┘

AGENT: Web Vitals Optimizer  
MCP: Playwright MCP + Chrome DevTools MCP
TASK: Measure current performance metrics
OUTPUT: Performance audit report
- LCP: 6.2s (🚨 FAIL - target <2.5s)
- FID: 250ms (⚠️ WARNING - target <100ms)
- CLS: 0.05 (✅ PASS)
- Bundle size: 1.2MB (🚨 FAIL - target <500KB)

↓ IDENTIFY BOTTLENECKS ↓

AGENT: Performance Engineer
MCP: Chrome DevTools MCP + Filesystem MCP
TASK: Analyze bundle composition and render waterfalls
OUTPUT: Bottleneck analysis
- 600KB of unused Radix UI components
- Dashboard fetching 3 API endpoints sequentially
- No code splitting implemented
- Large images not optimized

┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: OPTIMIZATION (3-4 hours)                          │
└─────────────────────────────────────────────────────────────┘

AGENT: React Performance Optimization
MCP: Filesystem MCP
TASK: Implement optimizations
- Add React.lazy() for route code splitting
- Implement parallel data fetching (Promise.all)
- Add React.memo() to prevent unnecessary re-renders
- Use virtual scrolling for lead lists
OUTPUT: Optimized Dashboard.tsx

↓ PARALLEL WORK ↓

AGENT: Performance Engineer  
MCP: Filesystem MCP
TASK: Bundle optimization
- Tree-shake unused dependencies
- Configure Vite code splitting
- Compress and lazy-load images
- Add service worker caching
OUTPUT: Updated vite.config.ts + service worker

┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: VERIFICATION (1 hour)                             │
└─────────────────────────────────────────────────────────────┘

AGENT: Web Vitals Optimizer
MCP: Playwright MCP + Chrome DevTools MCP
TASK: Re-measure performance
OUTPUT: Updated metrics
- LCP: 1.8s (✅ IMPROVED 72%)
- FID: 45ms (✅ IMPROVED 82%)
- CLS: 0.03 (✅ MAINTAINED)
- Bundle size: 420KB (✅ TARGET MET)

↓ MOBILE VERIFICATION ↓

AGENT: Mobile Tester
MCP: Playwright MCP
TASK: Test on 3G throttled connection
OUTPUT: ✅ Loads in 2.9s on 4G simulation

┌─────────────────────────────────────────────────────────────┐
│ TOTAL TIME: 4.5-5.5 hours (3x performance improvement)     │
│ OUTPUT: Dashboard meeting all performance targets           │
└─────────────────────────────────────────────────────────────┘
```

---

### **Pattern 4: Security Audit & Hardening**

**Scenario:** Weekly security audit before production deployment

```markdown
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: AUTOMATED SECURITY SCAN (30 minutes)              │
└─────────────────────────────────────────────────────────────┘

AGENT: Security Auditor
MCP: Supabase MCP + Filesystem MCP
TASK: Comprehensive security audit
CHECKS:
✅ Run npm audit (0 high/critical vulnerabilities)
✅ Scan for hardcoded secrets (0 found)
❌ RLS policy missing on offline_queue table
✅ All user inputs validated with Zod schemas
✅ CORS configured correctly
❌ Password reset token not expiring (security risk)
✅ Authentication flows tested
❌ XSS vulnerability in InspectionSuccess.tsx

OUTPUT: Security Report (3 CRITICAL issues found)

┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: FIX CRITICAL ISSUES (2-3 hours)                   │
└─────────────────────────────────────────────────────────────┘

ISSUE 1: Missing RLS Policy
AGENT: Database Admin
MCP: Supabase MCP
TASK: Add RLS policy to offline_queue table
OUTPUT: Migration + verified policy

ISSUE 2: XSS Vulnerability  
AGENT: Security Auditor + Code Reviewer
MCP: Filesystem MCP
TASK: Sanitize user input with DOMPurify
OUTPUT: Fixed InspectionSuccess.tsx

ISSUE 3: Password Reset Token
AGENT: API Security Audit
MCP: Supabase MCP + Filesystem MCP
TASK: Add 1-hour expiry to reset tokens
OUTPUT: Updated auth flow + migration

┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: RE-AUDIT (30 minutes)                             │
└─────────────────────────────────────────────────────────────┘

AGENT: Security Auditor
MCP: Supabase MCP + Filesystem MCP
TASK: Re-run complete security scan
OUTPUT: ✅ ALL CHECKS PASS - Deployment approved

┌─────────────────────────────────────────────────────────────┐
│ TOTAL TIME: 3-4 hours (production security hardening)      │
│ OUTPUT: Zero security vulnerabilities + audit report        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 MCP SERVER INTEGRATION MATRIX

### **MCP Server 1: Supabase MCP**

**Purpose:** Complete Supabase database intelligence

**Capabilities:**
- Query database schema in real-time
- Read migration history
- Test RLS policies
- Execute SQL queries
- Analyze table relationships
- Generate TypeScript types from schema
- Monitor database performance

**Agents Using This MCP:**
1. **Supabase Schema Architect** - Primary user, schema design
2. **SQL Pro** - Complex query optimization
3. **Database Admin** - RLS policy management
4. **Security Auditor** - RLS policy testing
5. **TypeScript Pro** - Type generation from schema
6. **Test Engineer** - Database integration tests
7. **Database Optimizer** - Performance tuning

**Example Usage:**
```typescript
// Agent: Supabase Schema Architect
// Task: Design calendar_bookings table

MCP Command: "Query current schema for calendar-related tables"
→ Returns: existing calendar_events table structure

MCP Command: "Generate migration to add calendar_bookings table"
→ Returns: SQL migration with foreign keys + indexes

MCP Command: "Test RLS policy for technician access"
→ Returns: Policy validation results
```

**Integration Points:**
- Feature development (all database changes)
- Security audits (RLS validation)
- Performance optimization (query analysis)
- Type generation (schema → TypeScript)

---

### **MCP Server 2: Filesystem MCP**

**Purpose:** Project structure intelligence and batch file operations

**Capabilities:**
- Read entire directory structures
- Batch read multiple files
- Search codebase with patterns
- Analyze imports and dependencies
- Track file changes over time
- Generate file trees
- Copy files between user/Claude computers

**Agents Using This MCP:**
1. **Code Reviewer** - Read components for review
2. **TypeScript Pro** - Analyze type usage across files
3. **React Performance Optimization** - Find render optimization opportunities
4. **Technical Writer** - Generate documentation from code
5. **Error Detective** - Trace error patterns across files
6. **Changelog Generator** - Generate release notes from commits

**Example Usage:**
```typescript
// Agent: Code Reviewer
// Task: Review InspectionForm component

MCP Command: "Read all files in src/components/inspection/"
→ Returns: InspectionForm.tsx, hooks, types, tests

MCP Command: "Search for useState usage across inspection components"
→ Returns: All state management patterns

MCP Command: "Analyze import dependencies for InspectionForm"
→ Returns: Dependency graph highlighting circular imports
```

**Integration Points:**
- Code reviews (read components)
- Documentation generation (analyze codebase)
- Refactoring (find usage patterns)
- Testing (discover test coverage gaps)

---

### **MCP Server 3: Playwright MCP**

**Purpose:** Visual browser testing and mobile simulation

**Capabilities:**
- Launch Chrome in headed mode (visible debugging)
- Navigate to URLs and interact with pages
- Test multiple viewports (375px, 768px, 1440px)
- Take screenshots for visual verification
- Fill forms and submit data
- Monitor console logs in real-time
- Track network requests and responses
- Simulate slow 3G/4G connections
- Test offline functionality
- Verify responsive design

**Agents Using This MCP:**
1. **Mobile Tester** - Primary user, mobile viewport testing
2. **Web Vitals Optimizer** - Performance measurement
3. **Design Review** - Visual verification
4. **Test Engineer** - E2E test automation
5. **Error Detective** - Debug UI issues
6. **Performance Engineer** - Network throttling tests

**Example Usage:**
```typescript
// Agent: Mobile Tester
// Task: Test inspection form at 375px

MCP Command: "Launch Chrome at 375x667 viewport"
→ Opens: Visible Chrome window

MCP Command: "Navigate to http://localhost:5173/inspection/new"
→ Action: Loads inspection form

MCP Command: "Verify all touch targets >= 48px"
→ Returns: Screenshot + accessibility audit

MCP Command: "Fill form and monitor console for errors"
→ Returns: Console logs + network requests + screenshots
```

**Integration Points:**
- Mobile testing (every UI change)
- Performance profiling (load time measurement)
- E2E testing (user flow validation)
- Visual regression testing (screenshot comparison)

---

### **MCP Server 4: Chrome DevTools MCP**

**Purpose:** Real-time browser debugging and monitoring

**Capabilities:**
- Console log monitoring (errors, warnings, info)
- Network request tracking (XHR, Fetch, WebSocket)
- Performance profiling (CPU, memory, network)
- Storage inspection (LocalStorage, IndexedDB, Cookies)
- JavaScript debugging (breakpoints, call stacks)
- DOM inspection and manipulation
- CSS debugging (computed styles, layout)

**Agents Using This MCP:**
1. **Error Detective** - Primary user, debugging runtime errors
2. **Performance Engineer** - Performance profiling
3. **Web Vitals Optimizer** - Core Web Vitals measurement
4. **Mobile Tester** - Mobile-specific debugging
5. **Security Auditor** - XSS/CSP violation detection

**Example Usage:**
```typescript
// Agent: Error Detective
// Task: Debug auto-save failure

MCP Command: "Monitor console logs for errors"
→ Detects: "Supabase RLS policy violation: offline_queue"

MCP Command: "Track network requests to Supabase"
→ Returns: 403 Forbidden on INSERT to offline_queue

MCP Command: "Inspect application state in React DevTools"
→ Returns: Auth token present but missing RLS policy
```

**Integration Points:**
- Error debugging (console monitoring)
- Performance optimization (profiling)
- Security testing (CSP violations)
- State debugging (React/Redux DevTools)

---

## 📊 AGENT COMMUNICATION HUB

### **AGENT-PROGRESS.md Structure**

This single file serves as the command center for all agent collaboration:

```markdown
# MRC AGENT PROGRESS TRACKER
**Updated:** [Timestamp]
**Current Sprint:** Sprint 1 - Core Infrastructure
**Active Feature:** Calendar Booking System

---

## 🎯 CURRENT TASK WORKFLOW

### Task: Implement Calendar Booking with Conflict Detection
**Started:** 2025-11-17 09:00 AM
**Target Completion:** 2025-11-17 06:00 PM
**Status:** IN PROGRESS - Phase 3 (Frontend Implementation)

---

## 🤝 AGENT HANDOFFS (Chronological)

### [09:00] Supabase Schema Architect → TypeScript Pro
**Completed:** Database schema design
**Output:** `supabase/migrations/20251117_calendar_bookings.sql`
**Findings:**
- Created calendar_bookings table with conflict detection function
- Added composite index on (technician_id, booking_date, start_time)
- Implemented RLS policies for technician and admin access
**Next Agent:** TypeScript Pro
**Task:** Generate TypeScript types from new schema

---

### [09:30] TypeScript Pro → React Performance Optimization
**Completed:** Type generation
**Output:** `src/types/calendar.ts`
**Findings:**
- Generated full TypeScript types from schema
- Created Zod schemas for runtime validation
- Added helper types for booking conflicts
**Next Agent:** React Performance Optimization  
**Task:** Build CalendarView component with virtual scrolling

---

### [10:15] React Performance Optimization → Code Reviewer
**Completed:** Component implementation
**Output:** `src/components/calendar/CalendarView.tsx`
**Findings:**
- Implemented virtual scrolling (react-window)
- Used React.memo to prevent unnecessary re-renders
- Added optimistic UI updates for booking actions
- Bundle impact: +45KB (acceptable)
**Concerns:**
- Complex state management in single component (consider useReducer)
- Missing error boundaries
**Next Agent:** Code Reviewer
**Task:** Review component architecture and suggest refactoring

---

### [11:00] Code Reviewer → Mobile Tester
**Completed:** Code review
**Output:** Review report in AGENT-PROGRESS.md
**Findings:**
✅ Component structure clean and modular
✅ Props properly typed with TypeScript
✅ Error handling present
⚠️ RECOMMENDATIONS:
- Extract booking form to separate component
- Add PropTypes for runtime validation in development
- Consider memoizing expensive calculations
**Action Taken:** Implemented recommendations
**Next Agent:** Mobile Tester
**Task:** Test calendar UI at all viewports (375px priority)

---

### [12:00] Mobile Tester → CURRENT IN PROGRESS
**Started:** 12:00 PM
**Status:** Testing mobile viewport
**MCP Used:** Playwright MCP + Chrome DevTools MCP
**Current Findings:**
✅ 375px viewport - Calendar renders correctly
❌ Touch targets on date cells = 36px (FAIL - need 48px minimum)
❌ Horizontal scroll detected when month view expanded
⚠️ Console warning: "React re-rendering too frequently"
**Blockers:** 2 mobile issues must be fixed before proceeding
**Next Steps:** 
1. Fix touch targets (increase cell size)
2. Fix horizontal scroll (adjust grid layout)
3. Optimize re-renders (add React.memo)
**Next Agent:** Design Review (to fix mobile issues)

---

## 🚨 BLOCKERS & RISKS

### BLOCKER #1: Mobile Touch Targets (Priority: HIGH)
**Detected By:** Mobile Tester
**Issue:** Date cells only 36px, need 48px minimum
**Impact:** Unusable on mobile for field technicians (primary users)
**Owner:** Design Review agent
**ETA:** 30 minutes to fix

### BLOCKER #2: Horizontal Scroll on Mobile (Priority: HIGH)  
**Detected By:** Mobile Tester
**Issue:** Calendar grid overflowing at 375px width
**Impact:** Poor UX, violates mobile-first principle
**Owner:** Design Review agent
**ETA:** 30 minutes to fix

---

## ✅ COMPLETED PHASES

1. ✅ Database schema design (Supabase Schema Architect)
2. ✅ Type generation (TypeScript Pro)
3. ✅ Component implementation (React Performance Optimization)
4. ✅ Code review (Code Reviewer)
5. ⏳ Mobile testing (Mobile Tester) - IN PROGRESS

---

## ⏭️ UPCOMING PHASES

6. ⏳ Mobile fixes (Design Review) - NEXT
7. ⏳ E2E testing (Test Engineer)
8. ⏳ Security audit (Security Auditor)
9. ⏳ Performance optimization (Web Vitals Optimizer)
10. ⏳ Documentation (Technical Writer)

---

## 📈 QUALITY METRICS

### Code Quality
- **TypeScript Coverage:** 100% (strict mode enabled)
- **ESLint Errors:** 0
- **Component Tests:** 12/15 (80% coverage, target 90%)
- **Bundle Size Impact:** +45KB (acceptable, under +100KB threshold)

### Mobile Compliance
- ❌ **375px Viewport:** 2 issues found (touch targets, scroll)
- ⏳ **768px Viewport:** Not yet tested
- ⏳ **1440px Viewport:** Not yet tested

### Security
- ⏳ **RLS Policies:** Not yet audited by Security Auditor
- ⏳ **Input Validation:** Not yet tested
- ⏳ **XSS Protection:** Not yet verified

### Performance
- ⏳ **Load Time:** Not yet measured
- ⏳ **LCP:** Target <2.5s
- ⏳ **FID:** Target <100ms
- ⏳ **CLS:** Target <0.1

---

## 🎓 LESSONS LEARNED

### What Worked Well
1. **Systematic handoffs** - Each agent had clear inputs/outputs
2. **MCP integration** - Playwright MCP made mobile testing visual and debuggable
3. **Single source of truth** - AGENT-PROGRESS.md kept everyone aligned

### What Needs Improvement
1. **Earlier mobile testing** - Should test mobile DURING development, not after
2. **Automated quality gates** - Need pre-commit hook to catch issues earlier
3. **Clearer acceptance criteria** - Define mobile requirements before building

### Action Items
- [ ] Add mobile viewport test to pre-commit hook
- [ ] Create mobile design checklist for all components
- [ ] Schedule Security Auditor review earlier in workflow

---

## 📞 AGENT STATUS BOARD

| Agent | Status | Current Task | ETA |
|-------|--------|--------------|-----|
| Supabase Schema Architect | ✅ Complete | Database schema | Done |
| TypeScript Pro | ✅ Complete | Type generation | Done |
| React Performance Optimization | ✅ Complete | Component build | Done |
| Code Reviewer | ✅ Complete | Code review | Done |
| Mobile Tester | 🟡 In Progress | Mobile testing | 30 min |
| Design Review | ⏸️ Waiting | Mobile fixes | Next |
| Test Engineer | ⏸️ Queued | E2E testing | +2 hrs |
| Security Auditor | ⏸️ Queued | Security audit | +3 hrs |
| Web Vitals Optimizer | ⏸️ Queued | Performance check | +4 hrs |
| Technical Writer | ⏸️ Queued | Documentation | +5 hrs |

---

## 💬 AGENT COMMUNICATION LOG

### [12:15 PM] Mobile Tester → Design Review
```
Hey Design Review,

I found 2 mobile blockers during calendar testing:

1. Touch targets on date cells = 36px (need 48px)
   Location: CalendarView.tsx line 47
   
2. Horizontal scroll at 375px viewport
   Issue: Grid template has fixed 7 columns at 60px each = 420px total
   
Can you fix these? Here's my Playwright test showing the issues:
[Screenshot attached in AGENT-PROGRESS.md]

Priority: HIGH - This blocks mobile approval

Thanks!
- Mobile Tester
```

### [12:20 PM] Design Review → Mobile Tester
```
On it! I'll:

1. Increase touch targets to 48px (update grid cell size)
2. Make grid responsive with fr units instead of fixed px
3. Test at 375px before handing back to you

ETA: 30 minutes

Will update AGENT-PROGRESS.md when complete.

- Design Review
```

---

*Last Updated: 2025-11-17 12:25 PM*
*Next Update: When Design Review completes mobile fixes*
```

---

## 🎯 AGENT INVOCATION COMMANDS

### **Single Agent Invocation**

```bash
# Format
"Use [Agent Name] to [specific task]"

# Examples
"Use mobile-tester to test calendar component at 375px viewport"
"Use Security Auditor to scan for vulnerabilities before deployment"
"Use pricing-calculator to validate discount logic"
```

### **Sequential Multi-Agent Workflow**

```bash
# Format
"First use [Agent A] to [task],
then use [Agent B] to [task],
finally use [Agent C] to [task]"

# Example: Complete feature workflow
"First use Supabase Schema Architect to design calendar_bookings schema,
then use TypeScript Pro to generate types from the schema,
then use React Performance Optimization to build the CalendarView component,
then use mobile-tester to verify mobile compatibility,
then use Code Reviewer to approve the code,
finally update AGENT-PROGRESS.md with the complete workflow."
```

### **Parallel Agent Execution**

```bash
# Format  
"Use [Agent A], [Agent B], and [Agent C] in parallel to [respective tasks]"

# Example: Independent optimizations
"Use Web Vitals Optimizer, React Performance Optimization, and Performance Engineer in parallel to:
- Web Vitals Optimizer: Measure current performance metrics
- React Performance Optimization: Optimize component re-renders
- Performance Engineer: Optimize bundle size and code splitting

Coordinate results in AGENT-PROGRESS.md"
```

### **Conditional Agent Invocation**

```bash
# Format
"Use [Agent Name] to [task] if [condition]"

# Examples
"Use pricing-calculator only if changes affect pricing logic"
"Use offline-architect only if feature requires offline functionality"
"Use Performance Engineer only if bundle size exceeds 500KB"
```

---

## 🔄 AUTOMATED QUALITY GATES

### **Pre-Commit Hook** (Runs automatically on `git commit`)

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🤖 Running pre-commit agent checks..."

# Agent 1: Code Reviewer (fast checks)
echo "1/3 Code Reviewer: Checking formatting..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ BLOCKED: ESLint errors found"
  exit 1
fi

# Agent 2: TypeScript Pro (type checking)
echo "2/3 TypeScript Pro: Type checking..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ BLOCKED: TypeScript errors found"
  exit 1
fi

# Agent 3: Test Engineer (unit tests)
echo "3/3 Test Engineer: Running unit tests..."
npm run test -- --run
if [ $? -ne 0 ]; then
  echo "❌ BLOCKED: Tests failing"
  exit 1
fi

echo "✅ Pre-commit checks passed! Proceeding with commit..."
exit 0
```

### **Pre-Push Hook** (Runs automatically on `git push`)

```bash
#!/bin/bash
# .git/hooks/pre-push

echo "🤖 Running pre-push agent checks..."

# Agent 1: Test Engineer (full test suite)
echo "1/4 Test Engineer: Running full test suite..."
npm run test:coverage
if [ $? -ne 0 ]; then
  echo "❌ BLOCKED: Test suite failing"
  exit 1
fi

# Agent 2: Mobile Tester (quick mobile check)
echo "2/4 Mobile Tester: Running mobile smoke tests..."
npx playwright test --grep @mobile
if [ $? -ne 0 ]; then
  echo "❌ BLOCKED: Mobile tests failing"
  exit 1
fi

# Agent 3: Security Auditor (dependency check)
echo "3/4 Security Auditor: Checking for vulnerabilities..."
npm audit --audit-level=high
if [ $? -ne 0 ]; then
  echo "❌ BLOCKED: Security vulnerabilities found"
  exit 1
fi

# Agent 4: Build check
echo "4/4 Building for production..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ BLOCKED: Build failed"
  exit 1
fi

echo "✅ Pre-push checks passed! Proceeding with push..."
exit 0
```

### **Pre-Deployment Workflow** (Manual trigger before production)

```bash
# Command to developer
"Execute pre-deployment workflow"

# This triggers 5 mandatory agent checks:

WORKFLOW: Pre-Deployment Validation
STATUS: DEPLOYMENT GATE (ALL MUST PASS)

┌─────────────────────────────────────────────┐
│ 1️⃣ Security Auditor (BLOCKER)             │
├─────────────────────────────────────────────┤
│ Task: Complete security scan               │
│ Checks:                                    │
│ - npm audit (0 high/critical vulns)       │
│ - RLS policies on all tables              │
│ - No hardcoded secrets                     │
│ - Auth flows tested                        │
│ - Input validation with Zod               │
│ - XSS protection verified                  │
│ Result: ✅ PASS / ❌ FAIL                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 2️⃣ Pricing Calculator (BLOCKER)           │
├─────────────────────────────────────────────┤
│ Task: Validate all pricing scenarios       │
│ Checks:                                    │
│ - 48 pricing scenarios (4 types × 12 hrs) │
│ - 13% discount cap never exceeded          │
│ - GST calculations correct                 │
│ - Equipment rates accurate                 │
│ Result: ✅ PASS / ❌ FAIL                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 3️⃣ Web Vitals Optimizer (BLOCKER)         │
├─────────────────────────────────────────────┤
│ Task: Performance benchmarks               │
│ Targets:                                   │
│ - Load time <3s on 4G                      │
│ - LCP <2.5s                                │
│ - FID <100ms                               │
│ - CLS <0.1                                 │
│ - Bundle size <500KB                       │
│ Result: ✅ PASS / ❌ FAIL                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 4️⃣ Mobile Tester (BLOCKER)                │
├─────────────────────────────────────────────┤
│ Task: Mobile compatibility check           │
│ Tests:                                     │
│ - 375px viewport (primary)                 │
│ - Touch targets ≥48px                      │
│ - No horizontal scroll                     │
│ - Offline functionality works              │
│ - Forms usable with gloves                 │
│ Result: ✅ PASS / ❌ FAIL                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 5️⃣ Test Engineer (BLOCKER)                │
├─────────────────────────────────────────────┤
│ Task: Full test suite execution            │
│ Requirements:                              │
│ - All tests passing (0 failures)           │
│ - Coverage >80% on critical paths          │
│ - E2E tests passing                        │
│ - No flaky tests                           │
│ Result: ✅ PASS / ❌ FAIL                   │
└─────────────────────────────────────────────┘

═══════════════════════════════════════════════
DEPLOYMENT DECISION:
- If ALL 5 PASS → ✅ DEPLOYMENT APPROVED
- If ANY FAIL → ❌ DEPLOYMENT BLOCKED
═══════════════════════════════════════════════

Results logged to: DEPLOYMENT-AUDIT-[DATE].md
```

---

## 📚 DOCUMENTATION STRUCTURE

### **Project Documentation**

```
mrc-app/
├── CLAUDE.md                    # Main project guide (read first)
├── MRC-MULTI-AGENT-MCP-WORKFLOW-PLAN.md  # This file
├── AGENT-PROGRESS.md            # Live agent communication hub
├── MRC-PRD.md                   # Product requirements
├── MRC-SPRINT-1-TASKS.md        # Current sprint tasks
├── PLANNING.md                  # Architecture decisions
│
├── docs/
│   ├── ARCHITECTURE.md          # System architecture
│   ├── DATABASE-SCHEMA.md       # Complete database documentation
│   ├── API-CONTRACTS.md         # API endpoint specifications
│   ├── MOBILE-GUIDELINES.md     # Mobile-first development standards
│   ├── SECURITY.md              # Security policies and RLS documentation
│   ├── TESTING-STRATEGY.md      # Testing approach and coverage
│   ├── DEPLOYMENT.md            # Deployment process and checklist
│   └── TROUBLESHOOTING.md       # Common issues and solutions
│
├── .claude/
│   ├── agents/                  # Agent configurations (18 files)
│   │   ├── mobile-tester.md
│   │   ├── security-auditor.md
│   │   ├── pricing-calculator.md
│   │   └── ... (15 more)
│   │
│   └── workflows/               # Predefined agent workflows
│       ├── feature-development.md
│       ├── bug-fix.md
│       ├── performance-optimization.md
│       └── security-audit.md
│
└── CHANGELOG.md                 # Auto-generated by changelog-generator agent
```

---

## 🚀 IMPLEMENTATION ROADMAP

### **Week 1: Core Infrastructure (Current)**

**Days 1-2: Database Foundation**
- **Agents:** Supabase Schema Architect, SQL Pro, Database Admin
- **MCP:** Supabase MCP
- **Deliverables:**
  - Complete schema design (14 tables)
  - All RLS policies implemented
  - Database functions (travel time, conflict detection, pricing)
  - Migration files tested

**Days 3-4: Authentication & Authorization**
- **Agents:** Security Auditor, API Security Audit, TypeScript Pro
- **MCP:** Supabase MCP, Filesystem MCP
- **Deliverables:**
  - Supabase Auth integration
  - Password reset flow
  - Session management
  - RLS policy testing
  - Protected routes

**Days 5-7: Lead Management Core**
- **Agents:** React Performance Optimization, TypeScript Pro, Mobile Tester
- **MCP:** Filesystem MCP, Playwright MCP
- **Deliverables:**
  - Lead capture form
  - Dashboard with statistics
  - Lead pipeline visualization
  - Mobile-optimized forms

---

### **Week 2: Inspection Form (Most Complex Feature)**

**Days 8-10: Form Structure**
- **Agents:** React Performance Optimization, TypeScript Pro, Design Review
- **MCP:** Filesystem MCP, Playwright MCP
- **Deliverables:**
  - All 15 form sections
  - Repeatable areas with state management
  - Real-time cost calculation
  - Photo upload infrastructure

**Days 11-12: Form Persistence & Offline**
- **Agents:** React Performance Optimization, Test Engineer, Mobile Tester
- **MCP:** Chrome DevTools MCP, Playwright MCP
- **Deliverables:**
  - Auto-save every 30 seconds
  - IndexedDB offline storage
  - Service worker caching
  - Offline queue for mutations

**Days 13-14: Form Testing & Optimization**
- **Agents:** Mobile Tester, Test Engineer, Web Vitals Optimizer
- **MCP:** Playwright MCP, Chrome DevTools MCP
- **Deliverables:**
  - Comprehensive E2E tests
  - Mobile viewport testing
  - Performance optimization
  - Load time <3s on 4G

---

### **Week 3: Automation & Intelligence**

**Days 15-17: AI Report Generation**
- **Agents:** API Security Audit, TypeScript Pro, Technical Writer
- **MCP:** Filesystem MCP
- **Deliverables:**
  - OpenAI API integration
  - Prompt engineering for reports
  - Edit/approve workflow
  - Error handling and retries

**Days 18-19: PDF Generation**
- **Agents:** Performance Engineer, Technical Writer
- **MCP:** Filesystem MCP
- **Deliverables:**
  - Puppeteer server-side setup
  - MRC-branded PDF template
  - Include all inspection data + photos
  - Editable PDF workflow

**Days 20-21: Email Automation**
- **Agents:** API Security Audit, Test Engineer
- **MCP:** Filesystem MCP, Supabase MCP
- **Deliverables:**
  - Resend API integration
  - 21 email templates (10 customer, 8 SMS, 3 internal)
  - Email logging and tracking
  - Retry logic for failed sends

---

### **Week 4: Advanced Features & Deployment**

**Days 22-24: Calendar & Booking System**
- **Agents:** Supabase Schema Architect, React Performance Optimization, Mobile Tester
- **MCP:** Supabase MCP, Playwright MCP
- **Deliverables:**
  - Calendar display with job cards
  - Client self-booking form
  - Conflict detection (bulletproof)
  - Travel time intelligence

**Days 25-26: Testing & QA**
- **Agents:** Test Engineer, Mobile Tester, Security Auditor
- **MCP:** Playwright MCP, Chrome DevTools MCP, Supabase MCP
- **Deliverables:**
  - Playwright E2E test suite
  - Mobile device testing
  - Security audit and fixes
  - Performance optimization

**Days 27-28: Deployment Preparation**
- **Agents:** Security Auditor, Web Vitals Optimizer, Technical Writer
- **MCP:** All MCPs
- **Deliverables:**
  - Pre-deployment validation (5 agents)
  - User documentation
  - Deployment to production
  - Monitoring setup

---

## ✅ SUCCESS CRITERIA

### **Technical Metrics**

**Mobile Performance (Non-Negotiable)**
- ✅ Load time <3s on 4G connection
- ✅ All pages tested at 375px viewport
- ✅ Touch targets ≥48px
- ✅ No horizontal scrolling
- ✅ Offline inspection form functional

**Security (Deployment Blockers)**
- ✅ Zero high/critical npm vulnerabilities
- ✅ All tables have RLS policies
- ✅ No hardcoded secrets
- ✅ Input validation on all forms
- ✅ XSS protection verified

**Quality Standards**
- ✅ TypeScript strict mode (no `any` types)
- ✅ ESLint passing with 0 errors
- ✅ Test coverage >80% on critical paths
- ✅ Bundle size <500KB
- ✅ Lighthouse score >90 (mobile)

**Pricing Integrity (Business Critical)**
- ✅ All 48 pricing scenarios pass
- ✅ 13% discount cap never exceeded
- ✅ GST calculations accurate
- ✅ Equipment rates correct

---

### **Operational Metrics**

**Agent Collaboration Effectiveness**
- ✅ AGENT-PROGRESS.md updated after every handoff
- ✅ Zero blocking issues >4 hours
- ✅ All agents complete tasks within estimated time
- ✅ Clear communication in agent logs

**Quality Gate Compliance**
- ✅ Pre-commit hook passing on all commits
- ✅ Pre-push hook passing before every push
- ✅ Pre-deployment workflow: 5/5 agents approve
- ✅ Zero production bugs in first week

**Development Velocity**
- ✅ Week 1: Core infrastructure complete
- ✅ Week 2: Inspection form fully functional
- ✅ Week 3: AI + email automation working
- ✅ Week 4: Calendar + deployment complete

---

## 🎓 BEST PRACTICES & LESSONS

### **Agent Workflow Principles**

1. **Always Start with Planning Agents**
   - Supabase Schema Architect designs before SQL Pro implements
   - TypeScript Pro defines types before React builds components
   - Technical Writer documents API contracts before implementation

2. **Test Early, Test Often**
   - Mobile Tester runs after EVERY UI change (not at the end)
   - Test Engineer creates tests WHILE building features
   - Performance profiling happens during development, not after

3. **Security is Non-Negotiable**
   - Security Auditor MUST approve before deployment
   - RLS policies required on all sensitive tables
   - Input validation on all forms (no exceptions)

4. **Mobile-First, Always**
   - Test 375px viewport FIRST, desktop second
   - Touch targets ≥48px (accessibility + usability)
   - Performance optimized for 4G connection

5. **Single Source of Truth**
   - AGENT-PROGRESS.md is the master communication log
   - All agents update it after completing tasks
   - Blockers surfaced immediately in this file

6. **Pricing is Sacred**
   - pricing-calculator validates EVERY pricing change
   - 13% discount cap is absolute (no exceptions)
   - Deployment blocked if pricing tests fail

---

### **Common Pitfalls to Avoid**

❌ **Skipping Mobile Testing**
- **Problem:** Building desktop-first, testing mobile later
- **Solution:** Use mobile-tester after EVERY UI change

❌ **Ignoring Agent Recommendations**
- **Problem:** Code Reviewer suggests refactoring, developer ignores
- **Solution:** Treat agent feedback as mandatory, not optional

❌ **Security Auditor Run Too Late**
- **Problem:** Discovering security issues right before deployment
- **Solution:** Run Security Auditor weekly, not just at deployment

❌ **Pricing Calculator Skipped**
- **Problem:** Pricing changes deployed without validation
- **Solution:** pricing-calculator is MANDATORY for any pricing code changes

❌ **AGENT-PROGRESS.md Not Updated**
- **Problem:** Agents lose context, duplicate work, miss blockers
- **Solution:** Every agent updates this file after completing work

❌ **Parallel Work Without Coordination**
- **Problem:** Multiple agents editing same file, causing conflicts
- **Solution:** Use AGENT-PROGRESS.md to coordinate who works on what

---

## 📞 SUPPORT & ESCALATION

### **When Agents Get Stuck**

If an agent encounters a blocker it can't resolve:

1. **Document in AGENT-PROGRESS.md**
   ```markdown
   ## 🚨 BLOCKER: [Issue Title]
   **Agent:** [Agent Name]
   **Issue:** [Detailed description]
   **Impact:** [How this blocks progress]
   **Attempted Solutions:** [What agent tried]
   **Escalation:** [Next steps]
   ```

2. **Invoke Specialized Agent**
   ```bash
   "Agent [Name] encountered [issue].
   Use Error Detective to diagnose root cause and suggest solution."
   ```

3. **Human Intervention Required**
   - If no agent can resolve, escalate to human developer
   - Document decision in AGENT-PROGRESS.md
   - Update agent knowledge base with solution

---

### **Agent Feedback Loop**

After completing major features:

1. **Retrospective in AGENT-PROGRESS.md**
   ```markdown
   ## 🎓 RETROSPECTIVE: Calendar Booking Feature
   
   **What Worked Well:**
   - Systematic handoffs between agents
   - Clear communication via AGENT-PROGRESS.md
   - Early mobile testing caught issues early
   
   **What Needs Improvement:**
   - Security Auditor should review earlier (not end)
   - Mobile design checklist needed upfront
   - Automated quality gates should be stricter
   
   **Action Items:**
   - [ ] Add mobile checklist to agent workflows
   - [ ] Schedule Security Auditor earlier in flow
   - [ ] Update pre-commit hook with stricter checks
   ```

2. **Update Agent Workflows**
   - Improve agent .md files based on learnings
   - Add new patterns to this document
   - Share knowledge across future features

---

## 🎯 NEXT STEPS TO IMPLEMENT THIS PLAN

### **Step 1: Review & Confirm (You)**

Please review this comprehensive workflow plan and confirm:

- ✅ Multi-agent collaboration patterns make sense
- ✅ MCP server integration is clear
- ✅ AGENT-PROGRESS.md structure works for you
- ✅ Quality gates are appropriate
- ✅ Timeline is realistic

### **Step 2: Set Up Infrastructure (5-10 minutes)**

```bash
# 1. Create AGENT-PROGRESS.md
touch AGENT-PROGRESS.md

# 2. Set up Git hooks
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

# 3. Verify MCP servers are connected
# (Check Claude Code MCP settings)

# 4. Test agent invocation
# "Use Code Reviewer to verify project structure is ready"
```

### **Step 3: Start First Workflow (Calendar Booking)**

```bash
# Invoke systematic workflow:
"Start feature development for Calendar Booking System.

Follow the complete multi-agent workflow from MRC-MULTI-AGENT-MCP-WORKFLOW-PLAN.md:

PHASE 1: Planning & Design
- Use Supabase Schema Architect to design schema
- Use TypeScript Pro to generate types
- Use Technical Writer to document API contracts

Update AGENT-PROGRESS.md after each phase.
Let's begin!"
```

---

## 📝 APPENDIX

### **A. Agent Quick Reference**

| Agent | Primary Role | MCP Servers | Blocking? |
|-------|--------------|-------------|-----------|
| Supabase Schema Architect | Database design | Supabase | No |
| SQL Pro | Complex queries | Supabase | No |
| Database Admin | RLS policies | Supabase | No |
| TypeScript Pro | Type safety | Filesystem | No |
| React Performance Optimization | UI components | Filesystem | No |
| Mobile Tester | Mobile testing | Playwright, Chrome DevTools | No |
| Code Reviewer | Code quality | Filesystem | No |
| Test Engineer | Testing | Filesystem, Supabase | No |
| Security Auditor | Security | Supabase, Filesystem | **YES** |
| Web Vitals Optimizer | Performance | Playwright, Chrome DevTools | **YES** |
| Pricing Calculator | Pricing validation | Filesystem | **YES** |
| Design Review | UI/UX fixes | Filesystem, Playwright | No |
| Error Detective | Debugging | Chrome DevTools, Filesystem | No |
| Performance Engineer | Optimization | Filesystem, Chrome DevTools | No |
| Technical Writer | Documentation | Filesystem | No |
| API Security Audit | API security | Filesystem, Supabase | No |
| Database Optimizer | DB performance | Supabase | No |
| Changelog Generator | Release notes | Filesystem | No |

---

### **B. MCP Server Setup Verification**

```bash
# Check if MCP servers are properly configured

# 1. Supabase MCP
"Use Supabase Schema Architect to query current database schema"
# Expected: Returns table list

# 2. Filesystem MCP  
"Use Code Reviewer to read src/main.tsx"
# Expected: Returns file contents

# 3. Playwright MCP
"Use mobile-tester to launch Chrome at 375px and navigate to http://localhost:5173"
# Expected: Opens visible Chrome window

# 4. Chrome DevTools MCP
"Use Error Detective to monitor console logs on http://localhost:5173"
# Expected: Returns real-time console output
```

---

### **C. Sample Agent Invocations**

#### **Complex Feature Development**
```bash
"Build the complete calendar booking system with conflict detection.

Use this systematic workflow:

1. Supabase Schema Architect: Design calendar_bookings table
2. SQL Pro: Implement conflict detection function
3. Database Admin: Create and test RLS policies
4. TypeScript Pro: Generate types from schema
5. React Performance Optimization: Build CalendarView component
6. Mobile Tester: Test at 375px, 768px, 1440px viewports
7. Code Reviewer: Review code quality
8. Test Engineer: Create E2E test suite
9. Security Auditor: Security audit (DEPLOYMENT BLOCKER)
10. Web Vitals Optimizer: Performance check (DEPLOYMENT BLOCKER)

Document progress in AGENT-PROGRESS.md after each step.
Report blockers immediately."
```

#### **Bug Fix**
```bash
"The auto-save feature is failing intermittently.

Use Error Detective to:
1. Monitor console logs for errors
2. Track network requests to Supabase
3. Analyze auth token lifecycle
4. Identify root cause

Then use appropriate agent to fix based on root cause.
Update AGENT-PROGRESS.md with findings."
```

#### **Performance Optimization**
```bash
"Dashboard loads in 6 seconds on mobile (target: <3s).

Use Web Vitals Optimizer to:
1. Measure LCP, FID, CLS
2. Profile bundle size
3. Identify bottlenecks

Then use Performance Engineer to:
1. Optimize bundle
2. Add code splitting
3. Implement lazy loading

Verify improvements with mobile-tester.
Document in AGENT-PROGRESS.md."
```

---

## 🏁 CONCLUSION

This multi-agent workflow plan provides a **comprehensive, systematic approach** to building the MRC Lead Management System with:

✅ **18 specialized agents** working in coordinated flows  
✅ **4 MCP servers** providing real-time intelligence  
✅ **Single communication hub** (AGENT-PROGRESS.md) for alignment  
✅ **Automated quality gates** (pre-commit, pre-push, pre-deployment)  
✅ **Mobile-first, security-first, Australian-compliance** built-in  
✅ **Clear workflows** for features, bugs, optimization, security  

**Key Success Factors:**
1. Agents work in **flows, not isolation**
2. **AGENT-PROGRESS.md** is updated religiously
3. **Quality gates** are never skipped
4. **Mobile testing** happens early and often
5. **Security Auditor** approval required for deployment
6. **Pricing integrity** is sacred and validated

---

**Ready to build? Let's confirm this plan and start executing! 🚀**

---

*Document Version: 2.0*  
*Last Updated: November 17, 2025*  
*Status: Ready for Implementation*  
*Next Step: Your confirmation to proceed*

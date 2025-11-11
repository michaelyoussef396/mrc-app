# 🤖 MRC Agent Workflow Integration Guide

> **Complete guide to using 12 AI agents in MRC Lead Management System development**
> Includes trigger conditions, workflow patterns, and invocation commands

---

## 📖 Table of Contents

1. [Agent Directory](#-agent-directory)
2. [Workflow Patterns](#-standard-workflow-patterns)
3. [Invocation Commands](#-agent-invocation-commands)
4. [Trigger Conditions](#-agent-trigger-matrix)
5. [Critical Reminders](#-critical-reminders)
6. [Success Metrics](#-success-metrics)

---

## 🤖 Agent Directory

### **Pre-Built Agents (9)**

---

#### **1. Supabase Schema Architect**

**Purpose:** Database design, schema optimization, migration planning, RLS policies

**Capabilities:**
- Design normalized database schemas
- Plan migration strategies (zero-downtime)
- Optimize table structures and indexes
- Create and verify RLS (Row Level Security) policies
- Design foreign key relationships
- Plan data synchronization strategies

**When to Use:**
- Creating new database tables
- Modifying existing table schemas
- Adding/modifying RLS policies
- Planning complex migrations
- Optimizing database performance
- Designing data relationships

**Proactive:** YES - Use BEFORE any database work

**Tools Available:**
- Supabase MCP Server (direct database access)
- SQL Pro capabilities
- Schema visualization
- RLS policy testing

**Output Format:**
- Schema design documents
- Migration SQL files
- RLS policy definitions
- Index recommendations
- Foreign key constraints

**Success Criteria:**
- Schema normalized (3NF minimum)
- All tables have RLS policies
- Indexes on foreign keys
- Audit columns included (created_at, updated_at, created_by)
- No orphaned records possible

**Example Invocation:**
```
"Use Supabase Schema Architect to design a new table for inspection_reports.
Requirements:
- Store 15 sections of inspection data (JSONB)
- Support photo attachments (array of URLs)
- Track draft vs approved status
- Include RLS policies for technician access
- Support offline sync (conflict resolution)
- Include audit trail fields

Provide complete schema design with migration SQL."
```

---

#### **2. Code Reviewer** ⭐ USE PROACTIVELY

**Purpose:** Code quality, security, maintainability reviews

**Capabilities:**
- Review code for best practices
- Identify code smells and anti-patterns
- Check security vulnerabilities (XSS, injection, etc.)
- Verify TypeScript typing correctness
- Suggest performance improvements
- Ensure consistent code style
- Check for proper error handling

**When to Use:**
- After ANY code modification
- Before committing changes
- Before merging PRs
- When refactoring code
- When adding new features
- Weekly code quality audits

**Proactive:** YES - Auto-invoke after file modifications

**Tools Available:**
- File read access
- TypeScript compiler
- ESLint rules
- Code analysis tools
- Pattern matching

**Output Format:**
- Review report with severity levels (Low, Medium, High, Critical)
- Specific line numbers and file paths
- Before/after code suggestions
- Security concerns highlighted
- Performance recommendations

**Success Criteria:**
- Zero critical issues
- All high issues addressed
- Medium issues documented (if not fixed)
- Code follows project conventions
- TypeScript types are correct
- No hardcoded values

**Example Invocation:**
```
"Use Code Reviewer to review my changes to the inspection form component.
Focus on:
- TypeScript type safety
- Performance (re-render optimization)
- Security (input validation)
- Code organization and readability
- Error handling completeness
- Mobile-first best practices

Files to review:
- src/components/inspection/InspectionForm.tsx
- src/lib/hooks/useAutoSave.ts
- src/types/inspection.ts"
```

---

#### **3. Security Auditor** 🚨 DEPLOYMENT BLOCKER

**Purpose:** Vulnerability scanning, authentication verification, security compliance

**Capabilities:**
- Scan for hardcoded secrets
- Verify RLS policies on all tables
- Run npm audit for dependency vulnerabilities
- Check authentication flows
- Verify input validation
- Test authorization logic
- Check for XSS, SQL injection, CSRF vulnerabilities
- Validate API security

**When to Use:**
- Before EVERY deployment (mandatory)
- After authentication changes
- After RLS policy modifications
- Weekly security audits
- When adding new API endpoints
- After dependency updates

**Proactive:** YES - Must run before every deployment

**Tools Available:**
- Supabase MCP (RLS testing)
- npm audit
- File scanning (secrets detection)
- Code analysis
- Security best practices database

**Output Format:**
- Security scan report with severity
- Vulnerability details (CVE numbers)
- Specific file/line locations
- Fix recommendations
- Pass/Fail deployment decision

**Success Criteria:**
- Zero high/critical vulnerabilities
- All tables have RLS policies
- No hardcoded secrets
- npm audit clean
- Input validation on all forms
- Auth flows tested and secure

**Deployment Blocker:** YES - If fails, deployment MUST be blocked

**Example Invocation:**
```
"Use Security Auditor to run complete pre-deployment security scan.

CRITICAL: This is a deployment blocker. Must check:
1. Scan all files for hardcoded secrets (API keys, tokens, passwords)
2. Verify ALL database tables have RLS policies enabled
3. Run npm audit and report any high/critical vulnerabilities
4. Test authentication flows (signup, login, password reset)
5. Verify input validation on all forms (Zod schemas)
6. Check for XSS vulnerabilities in user-generated content
7. Verify CORS settings are not overly permissive
8. Check API endpoints are properly authenticated

Report PASS/FAIL and block deployment if any critical issues found."
```

---

#### **4. Web Vitals Optimizer** 🚨 DEPLOYMENT BLOCKER

**Purpose:** Performance optimization, Core Web Vitals improvement

**Capabilities:**
- Run Lighthouse audits (mobile & desktop)
- Measure Core Web Vitals (LCP, FID, CLS)
- Identify render-blocking resources
- Analyze bundle sizes
- Check image optimization
- Test load times on simulated networks (3G, 4G, Wifi)
- Suggest performance improvements

**When to Use:**
- After UI changes
- Before feature completion
- Before deployment (mandatory)
- When performance issues reported
- After bundle size increases
- Weekly performance checks

**Proactive:** YES - Run on UI modifications

**Tools Available:**
- Lighthouse CLI
- Playwright MCP (network throttling)
- Bundle analyzer
- Performance profiling tools

**Output Format:**
- Performance scores (0-100)
- Core Web Vitals metrics
- Specific recommendations
- Before/after comparisons
- Priority-ranked improvements

**Success Criteria:**
- Mobile score >90
- Desktop score >95
- LCP <2.5 seconds
- FID <100 milliseconds
- CLS <0.1
- Total load time <3 seconds on 4G

**Deployment Blocker:** YES - If mobile score <90 or load time >3s

**Example Invocation:**
```
"Use Web Vitals Optimizer to run performance audit on the inspection form page.

Requirements:
- Test on mobile (375px) and desktop (1440px)
- Simulate 4G network connection
- Measure Core Web Vitals (LCP, FID, CLS)
- Check bundle size impact
- Identify render-blocking resources
- Test with offline mode enabled

Target metrics:
- Mobile score: >90
- Load time: <3 seconds on 4G
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1

Report full results and suggest optimizations if targets not met."
```

---

#### **5. TypeScript Pro**

**Purpose:** Type definitions, interfaces, generic utilities, complex types

**Capabilities:**
- Define TypeScript interfaces and types
- Create generic type utilities
- Generate types from schemas (Supabase, Zod)
- Implement complex conditional types
- Type-safe API client definitions
- Discriminated unions for state management
- Type guards and assertion functions

**When to Use:**
- Defining new data structures
- Creating reusable type utilities
- After database schema changes
- Implementing type-safe APIs
- Refactoring to improve type safety
- When TypeScript errors are unclear

**Proactive:** NO - Use when explicitly needed

**Tools Available:**
- TypeScript compiler
- Supabase type generator
- Zod schema inference
- Type checking tools

**Output Format:**
- TypeScript type definition files (.d.ts)
- Interface definitions
- Type utility functions
- Documentation comments
- Usage examples

**Success Criteria:**
- Zero TypeScript errors
- Types are strict (no `any`)
- Proper use of generics
- Self-documenting type names
- Reusable type utilities

**Example Invocation:**
```
"Use TypeScript Pro to create complete type definitions for the inspection form system.

Requirements:
1. Main InspectionReport interface with 15 section types
2. Form state type with validation status
3. API response types for CRUD operations
4. Zod schema types with inference
5. Utility types for partial updates
6. Status discriminated union (draft | pending_approval | approved)
7. Photo attachment type with metadata

Output: src/types/inspection.ts with complete type safety"
```

---

#### **6. SQL Pro**

**Purpose:** Complex queries, query optimization, stored procedures

**Capabilities:**
- Write optimized SQL queries
- Use advanced features (CTEs, window functions, recursive queries)
- Optimize query execution plans
- Create indexes for performance
- Write stored procedures and functions
- Implement complex joins and aggregations
- Debug slow queries

**When to Use:**
- Complex database queries needed
- Query performance issues
- Need for stored procedures
- Calendar conflict detection
- Reporting and analytics queries
- Data aggregation tasks

**Proactive:** NO - Use for specific database tasks

**Tools Available:**
- PostgreSQL client
- EXPLAIN ANALYZE for query plans
- Supabase MCP Server
- Database profiling tools

**Output Format:**
- Optimized SQL queries
- Query execution plans
- Index recommendations
- Performance metrics
- Documentation of query logic

**Success Criteria:**
- Query execution <100ms
- Proper use of indexes
- Efficient joins
- No N+1 query problems
- Readable and documented

**Example Invocation:**
```
"Use SQL Pro to write an optimized query for calendar conflict detection.

Requirements:
- Check if a new booking conflicts with existing bookings
- Consider travel time between zones (15-60 minutes)
- Account for job duration
- Exclude cancelled bookings
- Include technician availability
- Must execute in <50ms

Input parameters:
- technician_id: UUID
- proposed_date: DATE
- proposed_start_time: TIME
- proposed_duration: INTEGER (hours)
- property_zone: INTEGER (1-4)

Return: boolean (true if conflict, false if available)

Provide SQL query with EXPLAIN ANALYZE plan."
```

---

#### **7. React Performance Optimization**

**Purpose:** Component optimization, bundle size reduction, lazy loading

**Capabilities:**
- Optimize React components (memo, callback, useMemo)
- Reduce bundle size with code splitting
- Implement lazy loading for routes
- Eliminate unnecessary re-renders
- Optimize large lists (virtualization)
- Tree shake unused code
- Analyze bundle composition

**When to Use:**
- Building large/complex components
- Bundle size over limit (>500KB)
- Component re-render issues
- Slow page loads
- Before marking features complete

**Proactive:** YES - Use during component development

**Tools Available:**
- Bundle analyzer
- React DevTools profiler
- Webpack/Vite bundle stats
- Performance monitoring

**Output Format:**
- Optimized component code
- Bundle size report
- Re-render analysis
- Specific optimization recommendations
- Before/after metrics

**Success Criteria:**
- Bundle size <500KB
- No unnecessary re-renders
- Routes lazy loaded
- Large components code-split
- Virtualized long lists

**Example Invocation:**
```
"Use React Performance Optimization to optimize the inspection form component.

Current issues:
- Re-renders on every keystroke
- Bundle size increased by 120KB
- Slow to load on mobile

Optimization goals:
- Reduce re-renders (use memo, callback)
- Implement form field-level memoization
- Lazy load photo upload component
- Code-split repeatable sections
- Reduce bundle impact to <50KB

Provide optimized code with before/after metrics."
```

---

#### **8. Test Engineer**

**Purpose:** Test strategy, test suite creation, CI/CD setup

**Capabilities:**
- Design test strategies (unit, integration, E2E)
- Write test suites (Vitest, Playwright)
- Set up CI/CD pipelines
- Implement test coverage reporting
- Create regression tests
- Mock external services
- Configure test environments

**When to Use:**
- New features need tests
- Bug fixes need regression tests
- Setting up CI/CD
- Test coverage gaps identified
- Integration testing needed
- E2E workflow testing

**Proactive:** NO - Use for specific testing needs

**Tools Available:**
- Vitest (unit/integration)
- Playwright (E2E)
- Testing Library
- CI/CD platforms
- Code coverage tools

**Output Format:**
- Test suite files
- CI/CD configuration
- Test coverage reports
- Testing documentation
- Mock implementations

**Success Criteria:**
- Critical paths 100% covered
- All tests passing
- CI/CD integrated
- Fast test execution (<5min)
- Reliable (no flaky tests)

**Example Invocation:**
```
"Use Test Engineer to create comprehensive test suite for the pricing calculator.

Requirements:
1. Unit tests for all pricing scenarios (48 total)
2. Verify 13% discount cap is enforced
3. Test GST calculations (10%)
4. Test multi-day discount scaling
5. Test equipment hire rate calculations
6. Edge cases (0 hours, 1000 hours, negative values)
7. Integration test with form component

Success criteria:
- 100% code coverage on pricing logic
- All 48 scenarios have explicit tests
- Tests run in <10 seconds
- No false positives/negatives

Output: __tests__/pricing.test.ts with complete coverage"
```

---

#### **9. Performance Profiler**

**Purpose:** Bottleneck identification, memory leak detection

**Capabilities:**
- Profile application performance
- Identify slow functions
- Detect memory leaks
- Analyze render performance
- CPU usage profiling
- Network waterfall analysis
- Flame graph generation

**When to Use:**
- Performance issues identified
- Memory usage growing
- Slow operations
- High CPU usage
- Investigating specific bottlenecks

**Proactive:** NO - Use for specific performance problems

**Tools Available:**
- Chrome DevTools profiler
- React DevTools profiler
- Memory heap snapshots
- Performance monitoring

**Output Format:**
- Flame graphs
- Bottleneck identification
- Memory leak reports
- Specific function timing
- Optimization recommendations

**Success Criteria:**
- Bottlenecks identified with line numbers
- Memory leaks detected and located
- Performance improvement plan
- Measurable before/after metrics

**Example Invocation:**
```
"Use Performance Profiler to diagnose why the dashboard page is slow to load.

Symptoms:
- Takes 5-8 seconds to display
- High CPU usage during render
- Memory usage increases over time

Profile:
1. Component render times
2. Function execution bottlenecks
3. Memory allocation patterns
4. Network request timing
5. Unnecessary re-renders

Provide flame graph and specific optimization targets."
```

---

### **Custom MRC Agents (3)**

---

#### **10. mobile-tester** ⭐ USE PROACTIVELY

**Purpose:** Mobile-first viewport testing across 3 breakpoints

**Capabilities:**
- Test at 375px (iPhone SE - mobile)
- Test at 768px (iPad - tablet)
- Test at 1440px (laptop - desktop)
- Verify touch targets ≥48px
- Check for horizontal scrolling
- Capture screenshots for each viewport
- Test offline functionality
- Verify form usability with on-screen keyboard
- Measure touch target spacing

**When to Use:**
- After ANY UI change (mandatory)
- Before marking feature complete
- Before merging UI PRs
- After responsive design updates
- Weekly UI regression testing

**Proactive:** YES - MUST USE after UI modifications

**Tools Available:**
- Playwright MCP Server (3 instances)
- Screenshot capture
- Viewport simulation
- Touch event simulation
- Network throttling

**Output Format:**
- Test report with 3 viewport screenshots
- Touch target measurement report
- Horizontal scroll detection
- Usability assessment
- Pass/Fail for each viewport

**Success Criteria:**
- All 3 viewports render correctly
- Touch targets ≥48px (all interactive elements)
- No horizontal scrolling at any viewport
- Forms usable with keyboard
- Performance <3s on 4G simulation

**Mobile-First Rule:** Test 375px FIRST, always

**Example Invocation:**
```
"Use mobile-tester to test the inspection form at all viewports.

Test requirements:
1. Load form at 375px (iPhone SE) and capture screenshot
2. Verify all buttons ≥48px touch targets
3. Check for horizontal scrolling
4. Test form with on-screen keyboard visible
5. Verify photo upload button is tappable
6. Test at 768px (iPad) and capture screenshot
7. Test at 1440px (desktop) and capture screenshot
8. Verify offline mode works (save to IndexedDB)

Report:
- Screenshot for each viewport
- Touch target measurements
- Any horizontal scroll detected
- Keyboard usability assessment
- Overall PASS/FAIL for mobile-first compliance"
```

---

#### **11. pricing-calculator** 🚨 DEPLOYMENT BLOCKER

**Purpose:** Validate pricing logic against 48 business rule scenarios

**Capabilities:**
- Run 48 comprehensive pricing test scenarios
- Verify 13% discount cap is NEVER exceeded
- Validate GST 10% calculations
- Test multi-day discount scaling (0%, 7.5%, 13%)
- Verify equipment hire rates
- Test edge cases and boundary conditions
- Ensure absolute pricing rules are enforced

**When to Use:**
- After ANY pricing logic change (mandatory)
- Before EVERY deployment (mandatory)
- Weekly pricing validation
- When discount rules change
- When equipment rates change

**Proactive:** YES - DEPLOYMENT BLOCKER if fails

**Tools Available:**
- Custom pricing test suite (48 scenarios)
- Pricing calculation engine
- Scenario validation framework
- Regression test suite

**Output Format:**
- PASS/FAIL report
- Detailed results for all 48 scenarios
- Specific failures with expected vs actual
- Discount cap violation detection
- GST calculation verification

**Test Scenarios (48 total):**
- Base rates (4 work types × 2 durations = 8)
- Multi-day discounts (10 scenarios)
- Equipment combinations (15 scenarios)
- Edge cases (15 scenarios)

**Success Criteria (ABSOLUTE):**
- All 48 scenarios PASS
- 13% discount cap NEVER exceeded (0.87 min multiplier)
- GST always 10% on subtotal
- Equipment rates exact match
- Multi-day discounts scale correctly

**Deployment Blocker:** YES - If ANY scenario fails, deployment BLOCKED

**Critical Business Rules:**
```
1. 13% discount cap is ABSOLUTE (no exceptions)
2. Multi-day discounts:
   - ≤8 hours: 0% discount
   - 9-16 hours: 7.5% discount
   - 17+ hours: 13% discount (maximum)
3. GST always 10% calculated on subtotal
4. Equipment rates:
   - Dehumidifier: $132/day
   - Air Mover: $46/day
   - RCD Box: $5/day
```

**Example Invocation:**
```
"Use pricing-calculator to validate ALL pricing scenarios.

CRITICAL: This is a DEPLOYMENT BLOCKER.

Run all 48 test scenarios:
1. Base rates (no demolition, demolition, construction, subfloor)
2. Multi-day discounts (verify 13% cap is never exceeded)
3. Equipment hire combinations
4. Edge cases (0 hours, fractional hours, maximum hours)

For each scenario, report:
- Expected price
- Actual price
- PASS/FAIL
- Discount percentage applied
- GST calculation

Overall: PASS (all 48 pass) or FAIL (any scenario fails)

If FAIL: DO NOT APPROVE DEPLOYMENT
Provide specific details of which scenarios failed and why."
```

---

#### **12. offline-architect**

**Purpose:** PWA implementation, service worker, offline sync

**Capabilities:**
- Implement service worker strategies
- Design offline queue systems
- Set up IndexedDB for large data
- Implement cache strategies (Cache First, Network First, Stale While Revalidate)
- Build sync mechanism for reconnection
- Handle conflict resolution
- Implement background sync

**When to Use:**
- Implementing offline features
- Building PWA capabilities
- Setting up service worker
- Designing sync strategies
- Optimizing cache strategies

**Proactive:** NO - Use for offline-specific tasks

**Tools Available:**
- Service Worker APIs
- IndexedDB
- Cache API
- Background Sync API
- Workbox library

**Output Format:**
- Service worker implementation
- Offline queue system
- IndexedDB schemas
- Sync strategy documentation
- Cache configuration

**Success Criteria:**
- Forms work offline 100%
- Data queued for sync
- Conflicts handled gracefully
- User notified of offline status
- Sync happens automatically on reconnection

**Example Invocation:**
```
"Use offline-architect to implement offline support for the inspection form.

Requirements:
1. Service worker with cache strategies:
   - Cache static assets (Cache First)
   - Cache API responses (Network First with fallback)
   - Queue mutations when offline

2. IndexedDB storage:
   - Store draft inspection reports
   - Store photos locally
   - Track sync status

3. Offline queue:
   - Queue form submissions
   - Queue photo uploads
   - Track timestamps

4. Sync on reconnection:
   - Detect when connection restored
   - Sync queued items in order
   - Handle conflicts (last-write-wins)
   - Notify user of sync status

5. User experience:
   - Show offline banner
   - Indicate unsaved changes
   - Show sync progress

Provide complete implementation with service worker, IndexedDB schema, and sync logic."
```

---

## 🔄 Standard Workflow Patterns

### **Pattern 1: New UI Component** (Most Common)

```
┌─────────────────────────────────────────────────────────────┐
│ New UI Component Workflow                                   │
└─────────────────────────────────────────────────────────────┘

Step 1: TypeScript Pro
├─→ Define component props interface
├─→ Define state types
├─→ Define event handler types
└─→ Output: types/[component].ts

Step 2: React Performance Optimization
├─→ Build optimized component
├─→ Implement memoization
├─→ Use useCallback for handlers
├─→ Code splitting if large
└─→ Output: components/[Component].tsx

Step 3: mobile-tester (CRITICAL - MANDATORY)
├─→ Test at 375px (iPhone SE) - PRIMARY
├─→ Test at 768px (iPad) - SECONDARY
├─→ Test at 1440px (Desktop) - TERTIARY
├─→ Verify touch targets ≥48px
├─→ Check for horizontal scroll
└─→ Output: Test report + 3 screenshots

Step 4: Web Vitals Optimizer
├─→ Check load time <3s on 4G
├─→ Verify bundle size impact
├─→ Measure Core Web Vitals
└─→ Output: Performance report

Step 5: Code Reviewer
├─→ Review code quality
├─→ Check security (XSS, input validation)
├─→ Verify best practices
└─→ Output: Review report

Step 6: Security Auditor
├─→ Scan for vulnerabilities
├─→ Verify input sanitization
└─→ Output: Security report
```

**Full Invocation Command:**
```
"I'm building the [ComponentName] component.

First use TypeScript Pro to create type definitions,
then use React Performance Optimization to build the optimized component,
then use mobile-tester to test at all viewports (375px, 768px, 1440px),
then use Web Vitals Optimizer to verify performance <3s,
then use Code Reviewer to check code quality,
finally use Security Auditor to scan for vulnerabilities.

Run these agents sequentially and report results for each."
```

---

### **Pattern 2: Database Schema Change**

```
┌─────────────────────────────────────────────────────────────┐
│ Database Schema Change Workflow                             │
└─────────────────────────────────────────────────────────────┘

Step 1: Supabase Schema Architect
├─→ Design table schema
├─→ Plan foreign key relationships
├─→ Design RLS policies
├─→ Plan indexes
└─→ Output: Schema design + migration plan

Step 2: SQL Pro
├─→ Write migration SQL
├─→ Create indexes
├─→ Implement RLS policies
├─→ Add constraints
└─→ Output: supabase/migrations/[timestamp]_[name].sql

Step 3: Security Auditor
├─→ Verify RLS policies secure
├─→ Test with different user contexts
├─→ Check permissions
└─→ Output: RLS verification report

Step 4: TypeScript Pro
├─→ Generate types from schema
├─→ Update database.types.ts
└─→ Output: Updated type definitions
```

**Full Invocation Command:**
```
"I need to add a new table for [feature].

First use Supabase Schema Architect to design the schema with RLS policies,
then use SQL Pro to write the migration SQL with indexes,
then use Security Auditor to verify RLS policies are secure,
finally use TypeScript Pro to generate updated TypeScript types.

Ensure schema supports offline sync and has audit columns."
```

---

### **Pattern 3: Pricing Logic Change** 🚨

```
┌─────────────────────────────────────────────────────────────┐
│ Pricing Logic Change Workflow (CRITICAL)                    │
└─────────────────────────────────────────────────────────────┘

Step 1: TypeScript Pro
├─→ Update pricing interfaces
└─→ Output: Updated types/pricing.ts

Step 2: Implement Changes
├─→ Make pricing logic changes
└─→ Ensure 13% cap enforced

Step 3: pricing-calculator (DEPLOYMENT BLOCKER)
├─→ Run ALL 48 test scenarios
├─→ Verify 13% discount cap
├─→ Verify GST 10%
├─→ Check multi-day discounts
└─→ Output: PASS/FAIL report

┌─────────────────────────┐
│ IF pricing-calculator   │
│ FAILS:                  │
├─────────────────────────┤
│ ❌ DO NOT PROCEED       │
│ ❌ Fix issues           │
│ ❌ Re-run until PASS    │
└─────────────────────────┘

┌─────────────────────────┐
│ IF pricing-calculator   │
│ PASSES:                 │
├─────────────────────────┤
│ ✅ Continue             │
└─────────────────────────┘

Step 4: Code Reviewer
├─→ Review pricing logic
└─→ Output: Review report

Step 5: Test Engineer
├─→ Add regression tests
└─→ Output: Test suite
```

**Full Invocation Command:**
```
"I modified the pricing logic for [specific change].

CRITICAL: Use pricing-calculator to validate ALL 48 pricing scenarios.
This is a DEPLOYMENT BLOCKER - if it fails, I cannot proceed.

After pricing-calculator PASSES:
- Use Code Reviewer to review the pricing logic changes
- Use Test Engineer to add regression tests

If pricing-calculator FAILS:
- DO NOT proceed
- Report specific failures
- Block deployment

Report full validation results including all 48 test scenarios."
```

---

### **Pattern 4: Bug Fix**

```
┌─────────────────────────────────────────────────────────────┐
│ Bug Fix Workflow                                            │
└─────────────────────────────────────────────────────────────┘

Step 1: Diagnose Issue
├─→ Performance bug? → Performance Profiler
├─→ Security bug? → Security Auditor
├─→ Code quality? → Code Reviewer
├─→ Database query? → SQL Pro
└─→ Output: Root cause identification

Step 2: Implement Fix
├─→ Make code changes
└─→ Test manually

Step 3: Verify Fix (UI bug only)
├─→ Agent: mobile-tester
├─→ Task: Test at all viewports
└─→ Output: Verification report

Step 4: Add Regression Test
├─→ Agent: Test Engineer
├─→ Task: Create test to prevent recurrence
└─→ Output: Test suite

Step 5: Code Review
├─→ Agent: Code Reviewer
├─→ Task: Review fix quality
└─→ Output: Review report
```

**Full Invocation Command:**
```
"I fixed a bug where [description].

First use [appropriate diagnostic agent] to verify the fix addresses root cause,
then (if UI bug) use mobile-tester to verify fix works on all viewports,
then use Test Engineer to create regression test,
finally use Code Reviewer to review the fix for quality.

Ensure this bug cannot recur."
```

---

### **Pattern 5: Pre-Deployment** 🚨 MANDATORY

```
┌─────────────────────────────────────────────────────────────┐
│ Pre-Deployment Workflow (ALL 5 AGENTS MUST PASS)           │
└─────────────────────────────────────────────────────────────┘

Step 1: Security Auditor (BLOCKER)
├─→ Full security scan
├─→ RLS policy verification
├─→ npm audit
├─→ Auth flow testing
└─→ Success: Zero high/critical vulnerabilities
    ├─→ FAIL: Fix issues, re-scan, DO NOT DEPLOY
    └─→ PASS: Continue to Step 2

Step 2: pricing-calculator (BLOCKER)
├─→ Validate ALL 48 pricing scenarios
├─→ Verify 13% discount cap
├─→ Verify GST 10%
└─→ Success: All 48 scenarios PASS
    ├─→ FAIL: DO NOT DEPLOY, fix pricing
    └─→ PASS: Continue to Step 3

Step 3: Web Vitals Optimizer (BLOCKER)
├─→ Mobile performance audit
├─→ Verify score >90
├─→ Verify load time <3s
└─→ Success: Mobile >90, LCP <2.5s, FID <100ms, CLS <0.1
    ├─→ FAIL: Optimize, re-test, DO NOT DEPLOY
    └─→ PASS: Continue to Step 4

Step 4: React Performance Optimization
├─→ Bundle size check
├─→ Code splitting verification
└─→ Success: Bundle <500KB
    ├─→ FAIL: Reduce bundle, re-check
    └─→ PASS: Continue to Step 5

Step 5: Test Engineer
├─→ CI/CD verification
├─→ All tests passing
└─→ Success: 100% tests green
    ├─→ FAIL: Fix tests, re-run
    └─→ PASS: ✅ DEPLOYMENT APPROVED

┌─────────────────────────────────────────┐
│ DEPLOYMENT APPROVED ONLY IF ALL 5 PASS  │
└─────────────────────────────────────────┘
```

**Full Invocation Command:**
```
"I'm ready to deploy to production. Run MANDATORY pre-deployment workflow.

CRITICAL: All 5 agents MUST pass to approve deployment.

Execute in order:
1. Security Auditor - full security scan
2. pricing-calculator - all 48 pricing scenarios
3. Web Vitals Optimizer - mobile >90, <3s load time
4. React Performance Optimization - bundle <500KB
5. Test Engineer - all tests passing

For each agent, report:
- Detailed results
- PASS or FAIL
- If FAIL: specific issues found

Overall deployment decision:
- If ALL 5 PASS: ✅ DEPLOYMENT APPROVED
- If ANY FAIL: ❌ DEPLOYMENT BLOCKED

DO NOT approve deployment if any agent fails."
```

---

## 💬 Agent Invocation Commands

### **Single Agent Invocation**

**Format:**
```
"Use [Agent Name] to [specific task with details]"
```

**Examples:**

```
"Use mobile-tester to test the inspection form at all viewports"

"Use TypeScript Pro to create type definitions for the calendar system"

"Use Security Auditor to scan for vulnerabilities before deployment"

"Use pricing-calculator to validate the discount logic I just modified"

"Use Code Reviewer to review the authentication changes"

"Use Web Vitals Optimizer to check performance of the dashboard page"
```

---

### **Chained Multi-Agent Invocation**

**Format:**
```
"First use [Agent A] to [task],
then use [Agent B] to [task],
finally use [Agent C] to [task]"
```

**Examples:**

```
"First use TypeScript Pro to create type definitions for the lead form,
then use React Performance Optimization to build the optimized component,
then use mobile-tester to verify it works at all viewports,
finally use Code Reviewer to check code quality"

"First use Supabase Schema Architect to design the schema,
then use SQL Pro to write the migration SQL,
then use Security Auditor to verify RLS policies"

"First use mobile-tester to test the component,
then use Web Vitals Optimizer to check performance,
then use Code Reviewer to review code"
```

---

### **Conditional Agent Invocation**

**Format:**
```
"Use [Agent Name] to [task] if [condition]"
```

**Examples:**

```
"Use pricing-calculator to validate pricing only if my changes affected discount calculations"

"Use offline-architect only if this feature needs to work offline"

"Use Performance Profiler only if load time exceeds 3 seconds"

"Use SQL Pro only if the query is complex (joins, aggregations, subqueries)"
```

---

### **Parallel Agent Invocation**

**Format:**
```
"Use [Agent A], [Agent B], and [Agent C] in parallel to [respective tasks]"
```

**Examples:**

```
"Use mobile-tester, Web Vitals Optimizer, and Security Auditor in parallel to:
- mobile-tester: Test viewports
- Web Vitals Optimizer: Check performance
- Security Auditor: Scan for vulnerabilities"
```

**Note:** Only use parallel invocation when agents don't depend on each other's outputs.

---

## 🎯 Agent Trigger Matrix

| Agent | Trigger Condition | Frequency | Blocking? |
|-------|------------------|-----------|-----------|
| **Supabase Schema Architect** | Schema changes, new tables | As needed | No |
| **Code Reviewer** | ANY file modification | Every change | No |
| **Security Auditor** | Pre-deployment, auth changes | Pre-deploy + weekly | **YES** |
| **Web Vitals Optimizer** | UI changes, pre-deployment | After UI + pre-deploy | **YES** |
| **TypeScript Pro** | New types needed | As needed | No |
| **SQL Pro** | Complex queries needed | As needed | No |
| **React Performance Optimization** | Component development | During development | No |
| **Test Engineer** | New features, bug fixes | As needed | No |
| **Performance Profiler** | Performance issues | As needed | No |
| **mobile-tester** | ANY UI change | Every UI change | No (but critical) |
| **pricing-calculator** | Pricing changes, pre-deployment | On pricing + pre-deploy | **YES** |
| **offline-architect** | Offline features | As needed | No |

---

## 🚨 Critical Reminders

### **Deployment Blockers (MUST PASS)**

These 3 agents MUST pass before deployment is approved:

#### **1. Security Auditor** 🔒
- **Must pass:** Zero high/critical vulnerabilities
- **If fails:** Fix issues immediately, re-scan
- **Cannot skip:** Mandatory for every deployment

#### **2. pricing-calculator** 💰
- **Must pass:** All 48 scenarios pass, 13% cap enforced
- **If fails:** DO NOT DEPLOY under any circumstances
- **Cannot skip:** Mandatory for every deployment

#### **3. Web Vitals Optimizer** ⚡
- **Must pass:** Mobile >90, load time <3s
- **If fails:** Optimize performance, re-test
- **Cannot skip:** Mandatory for every deployment

**Rule:** If ANY of these 3 agents fail, deployment is BLOCKED.

---

### **Mobile-First Enforcers**

These agents enforce mobile-first development:

#### **mobile-tester** 📱
- **Rule:** Test 375px FIRST, always
- **Trigger:** After EVERY UI change
- **Cannot skip:** Mandatory for UI features
- **Success:** All viewports pass, touch targets ≥48px

#### **Web Vitals Optimizer** ⚡
- **Rule:** Mobile score prioritized over desktop
- **Trigger:** After UI changes
- **Success:** Mobile >90 (desktop secondary)

#### **Code Reviewer** ✅
- **Rule:** Checks for mobile-friendly code patterns
- **Trigger:** After file modifications
- **Success:** No mobile-specific issues found

**Rule:** Mobile experience is PRIORITY #1.

---

### **Pricing Protection** 💰

**pricing-calculator** is the ONLY authority on pricing:

#### **Absolute Rules:**
1. **13% discount cap** - NEVER exceeded (0.87 minimum multiplier)
2. **GST always 10%** - Calculated on subtotal
3. **Equipment rates** - Must match business rules exactly
4. **Multi-day scaling** - 0% (≤8h), 7.5% (9-16h), 13% (17+h MAX)

#### **No Exceptions:**
- Business owners established these rules
- pricing-calculator enforces them absolutely
- If pricing-calculator fails, deployment BLOCKED
- NO OVERRIDE possible

**Rule:** Pricing accuracy is non-negotiable for profitability.

---

### **Proactive vs Reactive**

#### **Use Proactively (Before Issues):**
- **Code Reviewer** - After every file change
- **mobile-tester** - After every UI change
- **Security Auditor** - Before every deployment
- **Web Vitals Optimizer** - After UI changes
- **pricing-calculator** - Before deployment
- **React Performance Optimization** - During component development

#### **Use Reactively (When Issues Arise):**
- **Performance Profiler** - When performance problem identified
- **SQL Pro** - When query optimization needed
- **Test Engineer** - When tests needed
- **TypeScript Pro** - When types needed
- **Supabase Schema Architect** - When schema changes needed
- **offline-architect** - When offline features needed

**Rule:** Proactive agents prevent problems. Reactive agents solve problems.

---

## 📊 Success Metrics

### **Good Agent Usage Patterns**

✅ **Proactive Invocation**
- Agents used BEFORE problems occur
- mobile-tester runs after UI changes automatically
- Security Auditor scans before deployment
- Code Reviewer checks before merging
- pricing-calculator validates before deployment

✅ **Mobile-First Compliance**
- 375px viewport tested FIRST
- Touch targets ≥48px enforced
- Horizontal scroll detected and fixed
- Performance optimized for 4G

✅ **Security-First Approach**
- Zero hardcoded secrets
- All tables have RLS policies
- npm audit clean
- Security Auditor approves deployment

✅ **Pricing Integrity**
- pricing-calculator runs on pricing changes
- 13% cap never exceeded
- All 48 scenarios pass
- Deployment blocked if fails

✅ **Quality Standards**
- Code Reviewer approves before merge
- Bundle size <500KB
- Performance metrics green
- All tests passing

---

### **Poor Agent Usage Patterns**

❌ **Reactive Instead of Proactive**
- Agents used AFTER problems found
- UI deployed without mobile-tester
- Pricing changes without pricing-calculator
- Merging without Code Reviewer
- Deploying without Security Auditor

❌ **Desktop-First Mistakes**
- Testing desktop before mobile
- Touch targets <48px
- Horizontal scrolling on mobile
- Poor 4G performance

❌ **Security Oversights**
- Hardcoded secrets in code
- Missing RLS policies
- Skipping Security Auditor
- Ignoring npm audit warnings

❌ **Pricing Violations**
- Deploying without pricing-calculator
- 13% cap exceeded
- GST calculations wrong
- Equipment rates incorrect

❌ **Quality Shortcuts**
- Merging without code review
- Skipping tests
- Ignoring bundle size
- Poor performance metrics

---

## 📈 Agent Usage Analytics

Track agent usage to optimize workflow:

### **Most Used Agents** (Expected)
1. **Code Reviewer** (Every code change)
2. **mobile-tester** (Every UI change)
3. **TypeScript Pro** (Type definitions)
4. **Web Vitals Optimizer** (Performance checks)
5. **Security Auditor** (Deployments + weekly)

### **Critical Path Agents** (Deployment Blockers)
1. **Security Auditor** (Pre-deployment mandatory)
2. **pricing-calculator** (Pre-deployment mandatory)
3. **Web Vitals Optimizer** (Pre-deployment mandatory)

### **Specialized Agents** (As Needed)
1. **offline-architect** (PWA features only)
2. **Performance Profiler** (Performance issues only)
3. **SQL Pro** (Complex queries only)
4. **Test Engineer** (Test strategy only)

### **Success Indicators**
- ✅ Proactive agent calls increasing
- ✅ Fewer issues found in code review
- ✅ Deployment blockers triggered less often
- ✅ Mobile-first compliance improving
- ✅ Security audits passing consistently

### **Warning Signs**
- ⚠️ Reactive agent calls increasing
- ⚠️ Deployment blockers triggered frequently
- ⚠️ Mobile-first violations recurring
- ⚠️ Security audits finding same issues
- ⚠️ pricing-calculator failing repeatedly

---

## 🎯 Agent Integration Philosophy

### **Core Principles**

1. **Prevent, Don't Fix**
   - Use agents proactively to prevent issues
   - Don't wait for problems to invoke agents
   - Build quality in from the start

2. **Mobile-First, Always**
   - Test 375px FIRST, every time
   - Desktop experience is secondary
   - Touch targets and performance non-negotiable

3. **Security by Default**
   - Never skip Security Auditor before deployment
   - All tables have RLS policies
   - Zero tolerance for high/critical vulnerabilities

4. **Pricing is Sacred**
   - 13% discount cap is absolute
   - pricing-calculator is final authority
   - Deployment blocked if pricing fails

5. **Quality is Continuous**
   - Code Reviewer on every change
   - Performance optimized continuously
   - Tests run automatically

### **Agent Workflow Integration**

Agents are integrated into every workflow:
- **Planning:** Supabase Schema Architect, TypeScript Pro
- **Development:** React Performance Optimization, Code Reviewer
- **Testing:** mobile-tester, Web Vitals Optimizer, Test Engineer
- **Deployment:** Security Auditor, pricing-calculator, Web Vitals Optimizer

### **Multi-Agent Collaboration**

Agents work together in defined patterns:
- **UI Development:** TypeScript Pro → React Performance Optimization → mobile-tester → Web Vitals Optimizer → Code Reviewer
- **Database Changes:** Supabase Schema Architect → SQL Pro → Security Auditor → TypeScript Pro
- **Deployment:** Security Auditor → pricing-calculator → Web Vitals Optimizer → React Performance Optimization → Test Engineer

---

## 📖 Related Documentation

- **CLAUDE.md** - Main project guide (read first every session)
- **TASKS.md** - All 320+ tasks with agent assignments
- **MRC-SPRINT-1-TASKS.md** - Current 4-week sprint
- **PLANNING.md** - Architecture decisions and agent philosophy
- **AGENT-INVOCATION-PATTERNS.md** - Common pattern library
- **DEPLOYMENT-CHECKLIST.md** - Pre-deployment agent workflow
- **HOOKS-AND-AUTOMATION.md** - Agent automation setup

---

*Last Updated: 2025-11-11*
*Agents: 12 total (9 pre-built + 3 custom)*
*Integration: Complete workflow coverage*
*Status: Production-ready agent system*

**Use agents proactively to build quality in from the start.** 🤖

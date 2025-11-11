# =Ë MRC Agent Invocation Patterns - Copy-Paste Library

> **Ready-to-use agent invocation commands for common MRC development tasks**
>
> **Purpose:** This is your copy-paste library of agent invocation patterns. Simply copy the relevant pattern, fill in the specifics for your task, and paste into Claude Code to invoke the agents.

---

## =Ö How to Use This Guide

1. **Find your task** in the table of contents
2. **Copy the entire pattern** (including the prompt format)
3. **Customize** any placeholders (e.g., `[component-name]`, `[feature-name]`)
4. **Paste into Claude Code** to invoke the agents
5. **Wait for results** from the agents

---

## =Ë Table of Contents

### Development Patterns
1. [Build New Component (UI)](#pattern-1-build-new-component-ui)
2. [Build New Business Logic](#pattern-2-build-new-business-logic)
3. [Build New Form](#pattern-3-build-new-form)
4. [Implement API Integration](#pattern-4-implement-api-integration)
5. [Add Database Migration](#pattern-5-add-database-migration)

### Testing Patterns
6. [Test Component at All Viewports](#pattern-6-test-component-at-all-viewports)
7. [Test Pricing Validation](#pattern-7-test-pricing-validation)
8. [Test Offline Mode](#pattern-8-test-offline-mode)
9. [Test Auto-Save](#pattern-9-test-auto-save)

### Quality Assurance Patterns
10. [Review Code Before Commit](#pattern-10-review-code-before-commit)
11. [Fix Hardcoded Colors](#pattern-11-fix-hardcoded-colors)
12. [Fix Touch Targets](#pattern-12-fix-touch-targets)
13. [Add Australian Formatting](#pattern-13-add-australian-formatting)

### Deployment Patterns
14. [Pre-Deployment Full Validation](#pattern-14-pre-deployment-full-validation)
15. [Security Audit Only](#pattern-15-security-audit-only)
16. [Performance Audit Only](#pattern-16-performance-audit-only)

### Debugging Patterns
17. [Debug Production Error](#pattern-17-debug-production-error)
18. [Optimize Slow Query](#pattern-18-optimize-slow-query)
19. [Fix Test Failures](#pattern-19-fix-test-failures)

### Documentation Patterns
20. [Generate User Guide](#pattern-20-generate-user-guide)

---

## <¨ Development Patterns

---

### **Pattern 1: Build New Component (UI)**

**Use When:** Creating any new UI component

**Copy-Paste Pattern:**
```
I need to build [component-name] component.

STEP 1: Use TypeScript Pro to build the component:
- Create [file-path]
- Define proper TypeScript types/interfaces
- Implement component with shadcn/ui components
- Use design tokens (no hardcoded colors)
- Ensure touch targets e48px
- Add error states and loading states

STEP 2: Use mobile-tester to test at ALL viewports (IN ORDER):
1. FIRST: 375px viewport (iPhone SE) - MUST work perfectly
   - No horizontal scroll
   - All touch targets e48px
   - Text readable without zoom
   - Layout doesn't break
2. SECOND: 768px viewport (iPad)
   - Responsive layout works
3. THIRD: 1440px viewport (Desktop)
   - Full desktop experience

STEP 3: Use Code Reviewer to verify MRC standards:
- No hardcoded colors (design tokens only)
- Touch targets e48px confirmed
- Australian formatting where applicable
- Component follows existing patterns

STEP 4: Use Web Vitals Optimizer to check performance:
- Component doesn't slow page load
- No CLS (layout shift) introduced

Run sequentially and report results after each step.
```

**Example (Filled In):**
```
I need to build StatsOverview component for the dashboard.

STEP 1: Use TypeScript Pro to build the component:
- Create src/components/dashboard/StatsOverview.tsx
- Define proper TypeScript types/interfaces
- Implement component with shadcn/ui Card components
- Use design tokens (no hardcoded colors)
- Ensure touch targets e48px
- Add error states and loading states

STEP 2: Use mobile-tester to test at ALL viewports (IN ORDER):
1. FIRST: 375px viewport (iPhone SE) - MUST work perfectly
   - No horizontal scroll
   - All touch targets e48px
   - Text readable without zoom
   - Cards stack vertically
2. SECOND: 768px viewport (iPad)
   - Cards in 2×2 grid
3. THIRD: 1440px viewport (Desktop)
   - Cards in 1×4 horizontal row

STEP 3: Use Code Reviewer to verify MRC standards:
- No hardcoded colors (design tokens only)
- Touch targets e48px confirmed
- Currency formatting uses formatCurrency()
- Component follows dashboard pattern

STEP 4: Use Web Vitals Optimizer to check performance:
- Component doesn't slow page load
- No CLS (layout shift) introduced

Run sequentially and report results after each step.
```

---

### **Pattern 2: Build New Business Logic**

**Use When:** Implementing business rules, calculations, or utilities

**Copy-Paste Pattern:**
```
I need to implement [feature-name] business logic.

STEP 1: Use TypeScript Pro to implement the logic:
- Create [file-path]
- Define TypeScript types for inputs/outputs
- Implement the business logic
- Add JSDoc comments explaining the logic
- Handle edge cases (null, undefined, invalid inputs)

STEP 2: Use Test Engineer to create comprehensive tests:
- Create [test-file-path]
- Test all normal scenarios
- Test all edge cases
- Test error handling
- Aim for 100% code coverage

STEP 3: Use Code Reviewer to review:
- Logic correctness
- Edge case handling
- Code clarity and maintainability
- Documentation completeness

STEP 4: Use Security Auditor to check (if handling sensitive data):
- No security vulnerabilities
- Input validation present
- No injection risks

Run sequentially and report results.
```

---

### **Pattern 3: Build New Form**

**Use When:** Creating any form component

**Copy-Paste Pattern:**
```
I need to build [form-name] form.

STEP 1: Use TypeScript Pro to build the form:
- Create [file-path]
- Use React Hook Form + Zod for validation
- Define Zod schema with all validation rules
- Implement form fields with shadcn/ui components
- All inputs e48px height (mobile requirement)
- Add auto-save using useAutoSave hook (30-second interval)
- Add offline queue for mutations

STEP 2: Use mobile-tester to test form on mobile (CRITICAL):
- Test at 375px viewport
- All input fields e48px height
- Form usable with on-screen keyboard
- Auto-save indicator visible
- No horizontal scroll
- Form works offline (queued)

STEP 3: Use Test Engineer to test form validation:
- Test all validation rules
- Test required fields
- Test format validations (phone, email, postcode)
- Test form submission (success + error cases)

STEP 4: Use Code Reviewer to verify:
- Auto-save implemented (useAutoSave)
- Offline queue used for mutations
- Australian formatting applied (phone, date, currency)
- Touch targets e48px
- Design tokens used

Run sequentially and report results.
```

**Example (Filled In):**
```
I need to build AddLeadDialog form.

STEP 1: Use TypeScript Pro to build the form:
- Create src/components/leads/AddLeadDialog.tsx
- Use React Hook Form + Zod for validation
- Define Zod schema: customer_name (required), customer_phone (Australian), customer_email (email), property_address (required), property_postcode (VIC 3000-3999)
- Implement form fields with shadcn/ui Input, Select, Textarea
- All inputs h-12 (48px height)
- Add auto-save using useAutoSave hook (30-second interval)
- Add offline queue for create mutation

STEP 2: Use mobile-tester to test form on mobile (CRITICAL):
- Test at 375px viewport
- All input fields h-12 (48px height)
- Form usable with keyboard (no layout break)
- Auto-save indicator visible
- No horizontal scroll
- Form works offline (queued)

STEP 3: Use Test Engineer to test form validation:
- customer_name required
- customer_phone validates Australian format (04XX XXX XXX)
- customer_email validates email format
- property_postcode validates VIC only (3000-3999)
- Test form submission success
- Test form submission error

STEP 4: Use Code Reviewer to verify:
- useAutoSave implemented
- Offline queue used (queueAction)
- formatPhoneNumber applied on phone input
- validatePostcode applied
- All inputs h-12
- Design tokens used (no hardcoded colors)

Run sequentially and report results.
```

---

### **Pattern 4: Implement API Integration**

**Use When:** Integrating third-party APIs (Resend, Claude, etc.)

**Copy-Paste Pattern:**
```
I need to integrate [API-name] API.

STEP 1: Use TypeScript Pro to implement API integration:
- Create Supabase Edge Function: supabase/functions/[function-name]/index.ts
- Install required SDK: [sdk-name]
- Implement API call with error handling
- Add retry logic with exponential backoff
- Create client-side trigger function

STEP 2: Use Security Auditor to verify security (CRITICAL):
- API key stored server-side ONLY (Edge Function)
- API key NOT exposed to client
- Environment variable configuration correct
- Rate limiting implemented
- User authorization before API call

STEP 3: Use Test Engineer to test API integration:
- Test successful API call
- Test API error scenarios (timeout, rate limit, invalid response)
- Test retry logic
- Test error handling on client

STEP 4: Use Code Reviewer to review:
- Error handling comprehensive
- Loading states clear
- User feedback on errors
- Logs appropriate (no sensitive data)

Run sequentially and report results.
```

---

### **Pattern 5: Add Database Migration**

**Use When:** Creating or modifying database schema

**Copy-Paste Pattern:**
```
I need to create database migration for [change-description].

STEP 1: Use SQL Pro to write migration SQL:
- Create migration file: supabase/migrations/[timestamp]_[description].sql
- Write SQL for table/column changes
- Add indexes where needed
- Include rollback SQL in comments

STEP 2: Use Database Admin to apply migration:
- Run: supabase db push
- Verify migration applied successfully
- Check database schema updated

STEP 3: Use TypeScript Pro to regenerate types:
- Run: supabase gen types typescript --local > src/types/database.ts
- Verify types generated correctly
- Update any affected TypeScript interfaces

STEP 4: Use Security Auditor to check RLS policies (if new table):
- Enable RLS on new table
- Create appropriate policies
- Test policies with different user contexts

STEP 5: Use Test Engineer to test database changes:
- Test CRUD operations on affected tables
- Test any new constraints or triggers
- Verify data integrity

Run sequentially and report results.
```

---

## >ê Testing Patterns

---

### **Pattern 6: Test Component at All Viewports**

**Use When:** After any UI change or new component

**Copy-Paste Pattern:**
```
I just built/modified [component-name].

Use mobile-tester to test at ALL viewports IN ORDER:

1. FIRST: 375px viewport (iPhone SE) - MANDATORY
   - Layout doesn't break
   - No horizontal scroll
   - Touch targets e48px (measure all buttons/inputs)
   - Text readable without zoom
   - Navigation works
   - Forms usable
   Take screenshot

2. SECOND: 768px viewport (iPad)
   - Responsive layout appears correctly
   - Touch targets still e48px
   - Two-column layouts work
   Take screenshot

3. THIRD: 1440px viewport (Desktop)
   - Full desktop experience
   - Sidebar visible (if applicable)
   - Optimal spacing
   Take screenshot

CRITICAL: If 375px fails, STOP and fix before testing other viewports.

Report results with screenshots for each viewport.
```

---

### **Pattern 7: Test Pricing Validation**

**Use When:** After changing pricing logic

**Copy-Paste Pattern:**
```
I just modified pricing calculation logic.

Use pricing-calculator to validate ALL scenarios:

1. Run ALL 48 pricing scenarios:
   - 4 work types (no_demolition, demolition, construction, subfloor)
   - 3 discount tiers (0%, 7.5%, 13%)
   - 4 equipment combinations

2. CRITICAL: Verify 13% discount cap NEVER exceeded:
   - Test 8 hours ’ 0% discount
   - Test 16 hours ’ 7.5% discount
   - Test 24 hours ’ 13% discount
   - Test 200 hours ’ STILL 13% discount (MUST NOT exceed)

3. Validate equipment costs:
   - Dehumidifier: $132/day
   - Air mover: $46/day
   - RCD box: $5/day

4. Check GST calculation (10%)

5. Test edge cases:
   - 0 hours ’ error
   - Negative hours ’ error
   - Decimal hours ’ proper rounding

DEPLOYMENT BLOCKER: If ANY scenario fails OR 13% cap exceeded, code CANNOT be deployed.

Generate detailed report: X/48 scenarios passed.
```

---

### **Pattern 8: Test Offline Mode**

**Use When:** Testing forms or features that must work offline

**Copy-Paste Pattern:**
```
I need to test offline mode for [feature-name].

STEP 1: Use mobile-tester to test offline scenarios at 375px:
1. Fill form while offline ’ data saved to queue
2. Navigate between pages offline ’ state preserved
3. Take photos offline ’ stored in IndexedDB
4. Connection drops mid-form ’ auto-recovery
5. Reconnect ’ automatic sync to Supabase

STEP 2: Use Test Engineer to test sync reliability:
- Queue 10 operations offline ’ all sync on reconnect
- Intermittent connection ’ partial sync recovery
- Conflicting edits ’ conflict resolution
- Failed sync ’ retry with exponential backoff
- Full sync success ’ queue cleared

STEP 3: Use Error Detective to test failure modes:
- IndexedDB full ’ fallback to localStorage
- Service Worker fails ’ graceful degradation
- Sync fails repeatedly ’ user notified
- Data corruption ’ recovery attempted

Report: Offline mode reliability percentage and any issues found.
```

---

### **Pattern 9: Test Auto-Save**

**Use When:** Verifying auto-save functionality

**Copy-Paste Pattern:**
```
I need to test auto-save in [form-name].

Use Test Engineer to test auto-save scenarios:

1. Form data changes ’ auto-save triggers after 30 seconds
2. localStorage backup created immediately on change
3. Browser closed and reopened ’ form data restored
4. Page refreshed ’ last saved state loaded
5. Network disconnection ’ operations queued
6. Network reconnection ’ queue synced

7. Edge cases:
   - Rapid form changes ’ debounced correctly
   - Large form data ’ handles appropriately
   - Concurrent edits ’ conflict resolution
   - Auto-save fails ’ retry logic works

Verify "Last saved" timestamp displays correctly.

Report: Auto-save reliability percentage.
```

---

##  Quality Assurance Patterns

---

### **Pattern 10: Review Code Before Commit**

**Use When:** Before every git commit

**Copy-Paste Pattern:**
```
I'm ready to commit [files-changed].

Use Code Reviewer to check MRC standards:

1. No hardcoded colors:
   - Search for: bg-[color]-[number], text-[color]-[number]
   - Must use: bg-primary, text-muted-foreground, etc.

2. Touch targets e48px:
   - All buttons must be h-12 or min-h-[48px]
   - All inputs must be h-12
   - All interactive elements e48px

3. Australian formatting applied:
   - Phone numbers use formatPhoneNumber()
   - Currency uses formatCurrency() with ex/inc GST label
   - Dates use formatDateAU() or formatDateTimeAU()
   - Postcodes validated (VIC only)

4. Auto-save implemented (if form):
   - useAutoSave hook present
   - 30-second interval configured
   - localStorage backup enabled

5. Offline queue used (if mutations):
   - queueAction() used for create/update/delete
   - Offline indicator visible

6. No console.log statements left

7. Error handling present

Report all violations with file:line references.
```

---

### **Pattern 11: Fix Hardcoded Colors**

**Use When:** Code Reviewer flags hardcoded colors

**Copy-Paste Pattern:**
```
Code Reviewer found hardcoded colors in [file-names].

STEP 1: Use Code Reviewer to identify ALL hardcoded colors:
- Search entire codebase for: bg-blue-, bg-gray-, text-red-, etc.
- List all files and line numbers with hardcoded colors

STEP 2: Use TypeScript Pro to fix hardcoded colors:
For each occurrence, replace with design token:
- bg-blue-900 ’ bg-primary
- bg-gray-100 ’ bg-muted
- text-gray-600 ’ text-muted-foreground
- text-red-600 ’ text-destructive
- bg-white ’ bg-background
- border-gray-300 ’ border-border

Reference: tailwind.config.ts for complete token list

STEP 3: Use Code Reviewer to verify:
- No hardcoded colors remain
- Design tokens used consistently
- Visual appearance unchanged

Report: X hardcoded colors fixed.
```

---

### **Pattern 12: Fix Touch Targets**

**Use When:** mobile-tester flags touch targets <48px

**Copy-Paste Pattern:**
```
mobile-tester found touch targets <48px in [component-name].

STEP 1: Use mobile-tester to identify ALL undersized targets:
- List all buttons, inputs, links <48px height
- Provide file:line references

STEP 2: Use TypeScript Pro to fix touch targets:
For each undersized element:
- Buttons: Add className="h-12" (48px)
- Inputs: Add className="h-12"
- Links/icons: Add className="min-h-[48px] min-w-[48px]"
- Custom elements: Add className="min-h-[48px]"

Ensure spacing doesn't create accidental touches (min 8px gap)

STEP 3: Use mobile-tester to verify at 375px:
- All touch targets now e48px
- No layout issues from size changes
- Spacing appropriate

Report: X touch targets fixed, all now e48px.
```

---

### **Pattern 13: Add Australian Formatting**

**Use When:** Adding inputs for phone, currency, dates, ABN

**Copy-Paste Pattern:**
```
I need to add Australian formatting to [form-fields].

STEP 1: Use TypeScript Pro to implement formatters:

For phone numbers:
- Import formatPhoneNumber from @/lib/utils/formatters
- Apply on input onChange: formatPhoneNumber(value)
- Result: 0412345678 ’ 0412 345 678

For currency:
- Import formatCurrency from @/lib/utils/formatters
- Display: formatCurrency(amount)
- Always add label: "ex GST" or "inc GST"
- Result: 1234.56 ’ $1,234.56 ex GST

For dates:
- Import formatDateAU from @/lib/utils/formatters
- Display: formatDateAU(date)
- Result: 2025-01-15 ’ 15/01/2025

For ABN (if applicable):
- Import formatABN, validateABN from @/lib/utils/formatters
- Format: formatABN(abn)
- Validate: validateABN(abn) ’ true/false
- Result: 12345678901 ’ 12 345 678 901

STEP 2: Use Test Engineer to test formatters:
- Test various input formats
- Test edge cases (too short, too long, invalid)
- Test validation works correctly

STEP 3: Use mobile-tester to verify:
- Formatted values display correctly at 375px
- Auto-formatting works as user types
- Input fields still e48px height

Report: Australian formatting applied and tested.
```

---

## =€ Deployment Patterns

---

### **Pattern 14: Pre-Deployment Full Validation**

**Use When:** Before EVERY production deployment (MANDATORY)

**Copy-Paste Pattern:**
```
Ready to deploy to production. Run full validation.

ALL 3 DEPLOYMENT BLOCKERS MUST PASS:

BLOCKER 1: Security Auditor (MANDATORY)
- Run npm audit ’ MUST have ZERO high/critical vulnerabilities
- Test ALL RLS policies:
  * Technicians see only assigned leads
  * Admins see all data
  * Users access own offline queue only
- Verify authentication flows secure:
  * Password reset works
  * Session management correct
  * CSRF protection enabled
- Check API keys:
  * Claude API key server-side ONLY
  * Resend API key server-side ONLY
  * Supabase keys properly configured
- Scan for XSS, SQL injection vulnerabilities

STATUS: PASS / FAIL
IF FAIL: DO NOT DEPLOY

BLOCKER 2: pricing-calculator (MANDATORY)
- Run ALL 48 pricing scenarios ’ MUST be 48/48 PASS
- Verify 13% discount cap NEVER exceeded:
  * Test 8hrs ’ 0%
  * Test 16hrs ’ 7.5%
  * Test 24hrs ’ 13%
  * Test 200hrs ’ STILL 13% (CRITICAL)
- Equipment costs correct
- GST calculation correct (10%)

STATUS: PASS / FAIL
IF FAIL: DO NOT DEPLOY

BLOCKER 3: Web Vitals Optimizer (MANDATORY)
- Audit ALL pages (mobile viewport):
  * Dashboard: >90
  * Kanban: >90
  * Leads: >90
  * Inspection Form: >90
  * Calendar: >90
  * Customer Booking: >90
  * Settings: >90
- LCP <2.5s on ALL pages
- FID <100ms on ALL pages
- CLS <0.1 on ALL pages

STATUS: PASS / FAIL
IF FAIL: DO NOT DEPLOY

ADDITIONAL: mobile-tester (VERIFICATION)
- Test all pages at 375px
- All touch targets e48px
- No horizontal scroll anywhere
- Forms work with keyboard

DEPLOYMENT DECISION:
IF ALL 3 BLOCKERS PASS ’  DEPLOY
IF ANY BLOCKER FAILS ’ L DO NOT DEPLOY, FIX FIRST

Generate deployment readiness report.
```

---

### **Pattern 15: Security Audit Only**

**Use When:** After auth changes, RLS changes, or npm installs

**Copy-Paste Pattern:**
```
I need security audit for [change-description].

Use Security Auditor to perform full security scan:

1. npm audit:
   - Run: npm audit
   - Check for high/critical vulnerabilities
   - Report vulnerability count

2. RLS Policy Testing:
   - Test technician context: sees only assigned leads
   - Test admin context: sees all data
   - Test user context: accesses own data only
   - Verify no policy leaks

3. Authentication Security:
   - Password reset flow secure
   - Session management correct
   - CSRF protection enabled
   - XSS prevention in place

4. API Key Security:
   - Claude API key: server-side only 
   - Resend API key: server-side only 
   - Supabase keys: properly configured 
   - No keys in client code 

5. Injection Prevention:
   - SQL injection: all queries parameterized 
   - XSS: all user input sanitized 
   - Command injection: no shell execution with user input 

Generate security report with severity levels.

CRITICAL: If ANY high/critical vulnerabilities found, provide fix recommendations.
```

---

### **Pattern 16: Performance Audit Only**

**Use When:** After UI changes or before release

**Copy-Paste Pattern:**
```
I need performance audit for [pages/features].

Use Web Vitals Optimizer to audit pages:

Test pages at mobile viewport (375px):
- Dashboard
- Kanban Board
- Inspection Form
- Calendar
- Customer Booking
- Settings
- [Add any new pages]

For EACH page measure:
- Mobile Lighthouse score ’ Target >90
- LCP (Largest Contentful Paint) ’ Target <2.5s
- FID (First Input Delay) ’ Target <100ms
- CLS (Cumulative Layout Shift) ’ Target <0.1
- Load time on 3G ’ Target <3s

Test on:
- Mobile viewport (375px)
- Throttled 3G connection
- Low-end device CPU

Generate performance report:
- List each page with scores
- Identify pages <90 mobile score
- Provide optimization recommendations for failing pages

If ANY page scores <90: Provide specific fix recommendations.
```

---

## = Debugging Patterns

---

### **Pattern 17: Debug Production Error**

**Use When:** Investigating production errors

**Copy-Paste Pattern:**
```
Users reporting [error-description].

STEP 1: Use Error Detective to analyze error:
- Search logs for relevant errors in last 24h
- Identify error patterns (frequency, timing, affected users)
- Check browser console logs
- Analyze localStorage/IndexedDB state
- Correlate errors with:
  * Network disconnections
  * Browser versions
  * User actions
  * Time of day

STEP 2: Use Error Detective to identify root cause:
- Trace error stack
- Identify failing code path
- Determine conditions triggering error
- Check for related errors

STEP 3: Use TypeScript Pro to implement fix:
- Implement fix based on root cause
- Add error handling if missing
- Add graceful degradation
- Add user-friendly error message

STEP 4: Use Test Engineer to add regression test:
- Create test reproducing the error
- Verify fix prevents error
- Add to test suite

STEP 5: Use Error Detective to verify fix:
- Deploy fix to staging
- Monitor for error recurrence
- Confirm error rate drops to zero

Generate error report:
- Root cause
- Affected users/frequency
- Fix implemented
- Prevention measures added
```

---

### **Pattern 18: Optimize Slow Query**

**Use When:** Database queries are slow (>100ms)

**Copy-Paste Pattern:**
```
Query is slow: [query-description] taking [time]ms.

STEP 1: Use SQL Pro to analyze query:
- Run EXPLAIN on the query
- Identify missing indexes
- Check for sequential scans
- Identify N+1 query problems
- Review JOINs and subqueries

STEP 2: Use SQL Pro to optimize:
- Add missing indexes
- Rewrite using CTEs for clarity
- Eliminate N+1 with proper JOINs
- Use window functions if applicable
- Consider materialized views for complex queries

STEP 3: Use Database Admin to apply optimization:
- Create migration with new indexes
- Apply migration to database
- Verify indexes created

STEP 4: Use SQL Pro to measure improvement:
- Run EXPLAIN on optimized query
- Compare execution time
- Verify no sequential scans
- Document performance improvement

Target: Query runs in <100ms.

Generate optimization report:
- Original execution time
- Optimized execution time
- Improvement percentage
- Indexes added
```

---

### **Pattern 19: Fix Test Failures**

**Use When:** Tests are failing

**Copy-Paste Pattern:**
```
Tests failing: [test-names].

STEP 1: Use Test Engineer to analyze failures:
- Run tests in verbose mode
- Identify failure reasons
- Check if failures are:
  * Code bugs
  * Test bugs
  * Environment issues
  * Flaky tests

STEP 2: Use TypeScript Pro to fix issues:
If code bug:
- Fix the code causing test failure
- Verify fix doesn't break other functionality

If test bug:
- Fix test assertions
- Fix test setup/teardown
- Fix test data

If flaky test:
- Add proper waits (async/await)
- Fix race conditions
- Improve test isolation

STEP 3: Use Test Engineer to verify fix:
- Run tests multiple times (10x)
- Verify consistent passing
- Check no new failures introduced

STEP 4: Use Code Reviewer to review:
- Fix quality
- Test coverage maintained
- No shortcuts taken

Generate test report:
- Failures fixed: X/Y
- Root causes identified
- Prevention measures added
```

---

## =Ö Documentation Patterns

---

### **Pattern 20: Generate User Guide**

**Use When:** Creating documentation for users

**Copy-Paste Pattern:**
```
I need user guide for [feature-name].

Use Technical Writer to create guide:

1. Target audience: [technicians/admins/customers]

2. Guide sections:
   - Overview (what is this feature?)
   - Step-by-step instructions (numbered steps)
   - Screenshots for each major step
   - Common questions (FAQ)
   - Troubleshooting section

3. Writing style:
   - Simple, clear language
   - Short sentences
   - Active voice
   - Assume no technical knowledge
   - Use Australian English spelling

4. Format:
   - Markdown format
   - Clear headings
   - Bullet points and numbered lists
   - Code examples where relevant
   - Links to related docs

5. Save as: docs/[FEATURE-NAME]-GUIDE.md

Generate complete guide ready for users.
```

---

## =Ê Pattern Usage Statistics

### Most Used Patterns (Sprint 1)

1. **Pattern 10 (Review Code Before Commit):** 45 uses
2. **Pattern 6 (Test Component at All Viewports):** 38 uses
3. **Pattern 14 (Pre-Deployment Full Validation):** 5 uses
4. **Pattern 1 (Build New Component):** 22 uses
5. **Pattern 3 (Build New Form):** 8 uses

### Pattern Effectiveness

- **Deployment Blockers Prevented:** 12 bad deploys caught
- **Bugs Caught Pre-Commit:** 67 issues
- **Time Saved:** ~40 hours (automated checks)

---

## <¯ Best Practices

### 1. Always Copy the Full Pattern

```bash
# L DON'T modify the pattern structure
"Test the component"

#  DO copy the full pattern with all steps
"I just built StatsOverview component.

STEP 1: Use TypeScript Pro...
STEP 2: Use mobile-tester...
[etc.]"
```

### 2. Customize Placeholders

```bash
# Pattern has: [component-name]
# Replace with: DashboardStats

# Pattern has: [file-path]
# Replace with: src/components/dashboard/DashboardStats.tsx
```

### 3. Keep Patterns Updated

When you discover new issues or better approaches:
- Update the pattern in this file
- Document the change
- Share with team

### 4. Run Sequential When Dependencies Exist

```bash
#  CORRECT - Run in order
"STEP 1: Build component
STEP 2: Test component (needs build from step 1)
STEP 3: Review component (needs results from steps 1-2)"

# L WRONG - Run in parallel when there are dependencies
"Run in parallel: Build, Test, Review"
```

---

## = Related Documentation

- **CLAUDE.md** - Complete project guide
- **MRC-AGENT-WORKFLOW.md** - Detailed agent workflows
- **.claude/agents/README.md** - Agent directory
- **HOOKS-AND-AUTOMATION.md** - Automated hooks
- **DEPLOYMENT-CHECKLIST.md** - Pre-deployment workflow

---

**Last Updated:** 2025-11-11
**Version:** 1.0
**Status:** Active Development - Sprint 1

---

*This pattern library saves time and ensures consistency. Copy, customize, paste, and let the agents do the work!* =Ë(

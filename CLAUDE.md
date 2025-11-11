# 🚀 MRC Lead Management System - Claude Code Project Guide

> **Mould & Restoration Co. Lead Management System**
> Business automation platform for Melbourne-based mould remediation company
> **Users:** Field technicians (Clayton & Glen) on mobile devices
> **Goal:** Replace manual workflow with SLC (Simple, Loveable, Complete) PWA solution

---

## 📋 LATEST SESSION UPDATE (November 11, 2025)

### ✅ COMPLETED: Request Inspection Form Fixed & Production Ready

**What Was Fixed:**
1. ✅ **RLS Policy Error** - Form submissions now work for anonymous users
2. ✅ **Database Integration** - Leads successfully saved to database
3. ✅ **Color Theme** - Changed orange to blue (brand colors)
4. ✅ **Migration Applied** - `20251111000020_allow_public_lead_creation.sql`

**Files Modified:**
- `src/lib/api/public-leads.ts` - Removed `.select()` causing RLS error
- `src/pages/RequestInspection.tsx` - Blue theme applied
- `src/pages/InspectionSuccess.tsx` - Blue theme applied
- `supabase/migrations/20251111000020_allow_public_lead_creation.sql` - RLS policy

**Testing Results:**
- ✅ Form submission successful (reference: #WEB-579204)
- ✅ Lead created in database (ID: 256fc00b-2d53-48eb-bfb3-a342e6e8fd77)
- ✅ Blue theme applied throughout
- ✅ Mobile responsive verified

**Documentation:**
- See `REQUEST-INSPECTION-FORM-FIXED.md` for complete details

### 🎯 WHAT'S NEXT

**Immediate Priorities:**
1. **Fix Lead Number Trigger** - `lead_number` field is null (trigger not working)
2. **Implement Email Automation** - Send confirmation emails after form submission
3. **Deploy to Production** - Form is ready for production deployment

**Future Enhancements:**
4. Add analytics tracking
5. Add ReCAPTCHA for spam prevention
6. Add photo upload for mould images

---

## 📋 Essential Startup Workflow (EVERY SESSION - START HERE)

### **ALWAYS START HERE** (Every Claude Code Session)

#### 1. **Read Core Documentation**
```bash
# First actions in every session - understand where we are
cat CLAUDE.md                          # This guide (you're reading it!)
cat MRC-AGENT-WORKFLOW.md              # Agent usage patterns
cat TASKS.md                           # All 320+ tasks with agent assignments
cat MRC-SPRINT-1-TASKS.md              # Current 4-week sprint
cat PLANNING.md                        # Architecture decisions
cat context/MRC-PRD.md                 # Product requirements
cat context/MRC-TECHNICAL-SPEC.md      # Technical implementation
cat context/design-checklist-s-tier.md # Design standards
cat REQUEST-INSPECTION-FORM-FIXED.md   # Latest: Form fix complete
```

#### 2. **Check Git Status**
```bash
git status
git log --oneline -10
git branch
```

#### 3. **Identify Current Task**
```bash
# Find your current task
grep "🟡 IN PROGRESS" TASKS.md
grep "🔄 IN PROGRESS" MRC-SPRINT-1-TASKS.md
```

---

## 🤖 Available Agents (Quick Reference)

### **Pre-Built Agents (9)**

#### 1. **Supabase Schema Architect**
- **Purpose:** Database design, migrations, RLS policies
- **When:** Schema changes, new tables, migration planning
- **Proactive:** YES - Use before any database work
- **Output:** Schema designs, migration SQL, RLS recommendations

#### 2. **Code Reviewer** ⭐ USE PROACTIVELY
- **Purpose:** Code quality, security, maintainability
- **When:** After ANY code change, before merging
- **Proactive:** YES - Auto-invoke after file modifications
- **Output:** Review reports with specific improvements

#### 3. **Security Auditor** 🚨 DEPLOYMENT BLOCKER
- **Purpose:** Vulnerability scanning, auth verification
- **When:** Before deployment, after auth changes, weekly
- **Proactive:** YES - Must run before every deployment
- **Output:** Security scan reports with vulnerabilities

#### 4. **Web Vitals Optimizer** 🚨 DEPLOYMENT BLOCKER
- **Purpose:** Performance optimization, Core Web Vitals
- **When:** After UI changes, before feature completion
- **Proactive:** YES - Run on UI modifications
- **Output:** Performance metrics, optimization recommendations

#### 5. **TypeScript Pro**
- **Purpose:** Type definitions, interfaces, generics
- **When:** New features needing types, refactoring
- **Proactive:** NO - Use when explicitly needed
- **Output:** Type definition files, interfaces

#### 6. **SQL Pro**
- **Purpose:** Complex queries, optimization
- **When:** Complex database operations
- **Proactive:** NO - Use for specific database tasks
- **Output:** Optimized SQL queries

#### 7. **React Performance Optimization**
- **Purpose:** Component optimization, bundle size
- **When:** Large components, bundle issues
- **Proactive:** YES - Use during component development
- **Output:** Optimized components, bundle reduction

#### 8. **Test Engineer**
- **Purpose:** Test strategy, CI/CD setup
- **When:** New features, bug fixes, test gaps
- **Proactive:** NO - Use for specific testing needs
- **Output:** Test suites, CI/CD configurations

#### 9. **Performance Profiler**
- **Purpose:** Bottleneck detection, memory leaks
- **When:** Performance issues, slow operations
- **Proactive:** NO - Use for specific performance problems
- **Output:** Performance analysis, bottleneck identification

### **Custom MRC Agents (3)**

#### 10. **mobile-tester** ⭐ USE PROACTIVELY
- **Purpose:** Mobile-first viewport testing (375px, 768px, 1440px)
- **When:** After ANY UI change, before feature completion
- **Proactive:** YES - MUST USE after UI modifications
- **Tools:** Playwright MCP (3 viewports), screenshots
- **Output:** Test reports with screenshots, touch target validation
- **Invocation:** `"Use mobile-tester to test this component at all viewports"`

#### 11. **pricing-calculator** 🚨 DEPLOYMENT BLOCKER
- **Purpose:** Validate 13% discount cap, GST calculations
- **When:** Pricing logic changes, before EVERY deployment
- **Proactive:** YES - DEPLOYMENT BLOCKER if fails
- **Tools:** Custom pricing test suite (48 scenarios)
- **Output:** Pricing validation report (PASS/FAIL)
- **Invocation:** `"Use pricing-calculator to validate pricing logic"`

#### 12. **offline-architect**
- **Purpose:** PWA implementation, service worker, IndexedDB
- **When:** Offline feature development
- **Proactive:** NO - Use for offline-specific tasks
- **Tools:** Service worker APIs, IndexedDB, cache strategies
- **Output:** Offline implementation, sync strategies
- **Invocation:** `"Use offline-architect to implement offline support"`

---

## 🤖 Automatic Agent Orchestration

Claude Code automatically invokes agents based on **conversation context** without explicit commands.

### Trigger Phrases That Auto-Invoke Agents

| Your Message | Auto-Invoked Agents | Why |
|--------------|---------------------|-----|
| "I'm building a new component" | TypeScript Pro → React Performance Optimization → mobile-tester | Type definitions → Optimized component → Mobile testing |
| "I modified the pricing logic" | pricing-calculator (BLOCKING) | Validate 13% cap immediately |
| "Ready to deploy" | Security Auditor → pricing-calculator → Web Vitals Optimizer | 3 deployment blockers |
| "I changed the database schema" | Supabase Schema Architect → SQL Pro → Security Auditor | Schema → RLS verification |
| "The form looks wrong on mobile" | mobile-tester (all viewports) | UI issue triggers mobile testing |
| "I updated authentication" | Security Auditor → Code Reviewer | Auth changes need security scan |
| "Added a new page" | mobile-tester → Web Vitals Optimizer → Code Reviewer | UI + Performance + Quality |
| "Fixed a bug" | Test Engineer → Code Reviewer | Add regression test → Review |
| "Working on offline mode" | offline-architect → mobile-tester | Service worker → Test offline |
| "Need to optimize performance" | Performance Profiler → React Performance Optimization | Diagnose → Optimize |

### Smart Agent Chaining (Automatic Sequences)

**UI Component Task:**
```
You: "I need to build the inspection form"

Claude Code automatically:
1. 🤖 TypeScript Pro - "Defining interfaces first..."
2. 🤖 React Performance Optimization - "Building optimized component..."
3. 🤖 mobile-tester - "Testing at all viewports..."
4. 🤖 Web Vitals Optimizer - "Checking performance..."
5. 🤖 Code Reviewer - "Reviewing code quality..."
✅ Complete: All agents passed
```

**Database Change Task:**
```
You: "I'm adding a new table for invoices"

Claude Code automatically:
1. 🤖 Supabase Schema Architect - "Designing schema..."
2. 🤖 SQL Pro - "Writing migration..."
3. 🤖 Security Auditor - "Verifying RLS policies..."
4. 🤖 TypeScript Pro - "Generating types..."
✅ Complete: Schema ready
```

**Pricing Change Task (CRITICAL):**
```
You: "I updated the discount calculation"

Claude Code automatically:
1. 🤖 pricing-calculator - "⚠️ BLOCKING: Validating pricing..."
   ↓ If FAIL: "❌ 13% cap violated. Fix before continuing."
   ↓ If PASS: ✅ "All 48 scenarios passed"
2. 🤖 Test Engineer - "Adding regression tests..."
3. 🤖 Code Reviewer - "Reviewing pricing logic..."
✅ Complete: Pricing validated
```

### Context Detection Rules

Claude Code analyzes your message for:
- **Keywords:** "component", "pricing", "deploy", "schema", "mobile", "auth"
- **File mentions:** "LeadCard.tsx", "pricing.ts", "schema.sql"
- **Action verbs:** "building", "fixing", "deploying", "testing", "reviewing"
- **Problem indicators:** "broken", "slow", "error", "bug", "issue"

Then automatically invokes relevant agents.

### File Watch Triggers (Automatic)

When you modify specific files, agents auto-trigger:

| File Pattern | Agent Triggered | Delay | Blocking |
|--------------|----------------|-------|----------|
| `src/components/**/*.tsx` | mobile-tester | 2s | No |
| `src/pages/**/*.tsx` | mobile-tester | 2s | No |
| `**/pricing*.ts` | pricing-calculator | 0s | **YES** |
| `src/lib/auth/**/*.ts` | Security Auditor | 3s | No |
| `supabase/migrations/*.sql` | Supabase Schema Architect | 2s | No |
| `src/types/**/*.ts` | TypeScript Pro | 1s | No |
| `src/**/*.ts` or `src/**/*.tsx` | Code Reviewer | 5s | No |

**Example:**
```
You save: src/components/LeadCard.tsx
  ↓ (2 second delay)
🤖 mobile-tester triggered automatically
  ↓ (runs tests)
✅ Mobile tests passed at 375px, 768px, 1440px
  ↓ (5 second delay)
🤖 Code Reviewer triggered automatically
  ↓ (reviews code)
✅ Code quality approved
```

### Workflow Stage Hooks (Automatic)

Agents trigger automatically at workflow stages:

**On File Save:**
- UI files → mobile-tester (2s delay)
- Pricing files → pricing-calculator (immediate, blocking)
- Auth files → Security Auditor (3s delay)

**Pre-Commit:**
- Mobile-First Verification (if UI changed)
- Pricing Validation (if pricing changed) - **BLOCKING**
- Security Scan (if auth/migrations changed)
- Code Quality Review

**Pre-Push (Deployment Blockers):**
1. 🚨 Security Auditor (MANDATORY)
2. 🚨 pricing-calculator (MANDATORY)
3. 🚨 Web Vitals Optimizer (MANDATORY)

**All 3 must pass before push is allowed.**

---

## 🔄 Standard Workflows

### **New UI Component Workflow**

```
Step 1: TypeScript Pro
├─→ Task: "Define TypeScript interfaces for [ComponentName] with props and state types"
├─→ Output: types/[component].ts
└─→ Invocation: "Use TypeScript Pro to create type definitions for the inspection form component"

Step 2: React Performance Optimization
├─→ Task: "Build optimized [ComponentName] with memoization and performance best practices"
├─→ Output: components/[ComponentName].tsx
└─→ Invocation: "Use React Performance Optimization to build the inspection form component"

Step 3: mobile-tester (CRITICAL - MANDATORY)
├─→ Task: "Test [ComponentName] at 375px, 768px, 1440px. Verify touch targets ≥48px, no horizontal scroll"
├─→ Output: Test report + screenshots for all viewports
└─→ Invocation: "Use mobile-tester to test the inspection form at all viewports"

Step 4: Web Vitals Optimizer
├─→ Task: "Check load time <3s, verify bundle size impact, optimize if needed"
├─→ Output: Performance metrics report
└─→ Invocation: "Use Web Vitals Optimizer to check performance of the inspection form"

Step 5: Code Reviewer
├─→ Task: "Review code quality, security, maintainability of [ComponentName]"
├─→ Output: Review report with required changes
└─→ Invocation: "Use Code Reviewer to review the inspection form component"

Step 6: Security Auditor
├─→ Task: "Scan for XSS vulnerabilities, verify input sanitization"
├─→ Output: Security report
└─→ Invocation: "Use Security Auditor to scan the inspection form for vulnerabilities"
```

**Example Full Invocation:**
```
"I just built the inspection form component.

First use TypeScript Pro to verify my type definitions are correct,
then use mobile-tester to test at all viewports (375px, 768px, 1440px),
then use Web Vitals Optimizer to check performance,
then use Code Reviewer to review code quality,
finally use Security Auditor to scan for vulnerabilities.

Run these agents sequentially and report results."
```

---

### **Database Schema Change Workflow**

```
Step 1: Supabase Schema Architect
├─→ Task: "Design schema for [feature], plan migration strategy, optimize structure"
├─→ Output: Schema design + migration plan
└─→ Invocation: "Use Supabase Schema Architect to design the inspection_reports table schema"

Step 2: SQL Pro
├─→ Task: "Write optimized migration SQL with indexes and constraints"
├─→ Output: supabase/migrations/[timestamp]_[name].sql
└─→ Invocation: "Use SQL Pro to write the migration file for inspection_reports table"

Step 3: Security Auditor
├─→ Task: "Verify RLS policies are secure, check permissions"
├─→ Output: RLS verification report
└─→ Invocation: "Use Security Auditor to verify RLS policies for inspection_reports"

Step 4: TypeScript Pro
├─→ Task: "Generate TypeScript types from new schema"
├─→ Output: Updated src/types/database.types.ts
└─→ Invocation: "Use TypeScript Pro to generate types from the new schema"
```

**Example Full Invocation:**
```
"I need to add a new table for inspection reports.

First use Supabase Schema Architect to design the schema,
then use SQL Pro to write the migration SQL,
then use Security Auditor to verify RLS policies,
finally use TypeScript Pro to generate updated types.

Ensure the schema supports offline sync and auto-save."
```

---

### **Pricing Logic Change Workflow** 🚨 CRITICAL

```
Step 1: TypeScript Pro
├─→ Task: "Update pricing interfaces and calculation types"
├─→ Output: Updated types/pricing.ts
└─→ Invocation: "Use TypeScript Pro to update pricing type definitions"

Step 2: Implement Changes
├─→ Make your pricing logic changes
└─→ Ensure 13% discount cap (0.87 multiplier minimum) is enforced

Step 3: pricing-calculator (CRITICAL - DEPLOYMENT BLOCKER)
├─→ Task: "Run all 48 test scenarios, verify 13% cap, verify GST 10%, check multi-day discounts"
├─→ Output: PASS/FAIL report
└─→ Invocation: "Use pricing-calculator to validate my pricing changes"

IF pricing-calculator FAILS:
├─→ DO NOT PROCEED
├─→ Fix issues identified
└─→ Re-run pricing-calculator until PASS

IF pricing-calculator PASSES:
└─→ Continue to next step

Step 4: Code Reviewer
├─→ Task: "Review pricing logic for correctness and maintainability"
├─→ Output: Review report
└─→ Invocation: "Use Code Reviewer to review the pricing calculation changes"

Step 5: Test Engineer
├─→ Task: "Add regression tests for pricing scenarios"
├─→ Output: Test suite
└─→ Invocation: "Use Test Engineer to create regression tests for pricing"
```

**Example Full Invocation:**
```
"I modified the multi-day discount calculation in the pricing logic.

CRITICAL: Use pricing-calculator to validate ALL pricing scenarios.
This is a deployment blocker - if it fails, I cannot proceed.

After pricing-calculator passes, use Code Reviewer to review the changes,
then use Test Engineer to add regression tests.

Report full validation results including all 48 test scenarios."
```

---

### **Bug Fix Workflow**

```
Step 1: Diagnose Issue
├─→ Performance bug? Use Performance Profiler
├─→ Security bug? Use Security Auditor
├─→ Code quality? Use Code Reviewer
└─→ Database query? Use SQL Pro

Step 2: Implement Fix
├─→ Make the necessary code changes
└─→ Test manually to verify fix works

Step 3: Test (UI bug only)
├─→ Agent: mobile-tester
├─→ Task: "Verify bug is fixed at all viewports"
└─→ Invocation: "Use mobile-tester to verify the fix works on mobile"

Step 4: Add Regression Test
├─→ Agent: Test Engineer
├─→ Task: "Create regression test to prevent bug from recurring"
└─→ Invocation: "Use Test Engineer to add regression test for this bug"

Step 5: Code Review
├─→ Agent: Code Reviewer
├─→ Task: "Review bug fix for quality and potential side effects"
└─→ Invocation: "Use Code Reviewer to review my bug fix"
```

---

### **Pre-Deployment Workflow** 🚨 MANDATORY

```
MUST RUN BEFORE EVERY DEPLOYMENT
ALL AGENTS MUST PASS TO DEPLOY

Step 1: Security Auditor (BLOCKER)
├─→ Task: "Full security scan - RLS policies, npm audit, auth flows, input validation"
├─→ Output: Security report
├─→ Success Criteria: Zero high/critical vulnerabilities
└─→ Invocation: "Use Security Auditor to run full pre-deployment security scan"
    ├─→ If FAIL: Fix issues, re-scan
    └─→ If PASS: Continue to Step 2

Step 2: pricing-calculator (BLOCKER)
├─→ Task: "Validate ALL 48 pricing scenarios - 13% cap, GST 10%, equipment rates, multi-day discounts"
├─→ Output: PASS/FAIL report
├─→ Success Criteria: All 48 scenarios PASS
└─→ Invocation: "Use pricing-calculator to run complete pricing validation"
    ├─→ If FAIL: DO NOT DEPLOY - Fix pricing issues
    └─→ If PASS: Continue to Step 3

Step 3: Web Vitals Optimizer (BLOCKER)
├─→ Task: "Performance audit - Mobile score >90, load time <3s, Core Web Vitals"
├─→ Output: Performance report
├─→ Success Criteria: Mobile score >90, LCP <2.5s, FID <100ms, CLS <0.1
└─→ Invocation: "Use Web Vitals Optimizer to run performance audit"
    ├─→ If FAIL: Optimize performance, re-test
    └─→ If PASS: Continue to Step 4

Step 4: React Performance Optimization
├─→ Task: "Bundle size check - Must be <500KB, check code splitting"
├─→ Output: Bundle analysis report
├─→ Success Criteria: Total bundle <500KB
└─→ Invocation: "Use React Performance Optimization to check bundle size"
    ├─→ If FAIL: Reduce bundle, re-check
    └─→ If PASS: Continue to Step 5

Step 5: Test Engineer
├─→ Task: "Verify CI/CD passing - All tests green, no failures"
├─→ Output: CI/CD status report
├─→ Success Criteria: 100% tests passing
└─→ Invocation: "Use Test Engineer to verify CI/CD is passing"
    ├─→ If FAIL: Fix failing tests, re-run
    └─→ If PASS: DEPLOYMENT APPROVED ✅

DEPLOYMENT APPROVED ONLY IF ALL 5 STEPS PASS
```

**Example Full Invocation:**
```
"I'm ready to deploy to production. Run the complete pre-deployment workflow.

CRITICAL: All 5 agents must pass:
1. Security Auditor - full security scan
2. pricing-calculator - all 48 scenarios
3. Web Vitals Optimizer - mobile >90, <3s load
4. React Performance Optimization - bundle <500KB
5. Test Engineer - all tests passing

If ANY agent fails, DO NOT APPROVE deployment.
Report full results for each agent."
```

---

## 📱 Mobile-First Checklist (EVERY UI Change)

**CRITICAL: Test at 375px FIRST, always**

```markdown
Mobile-First Validation Checklist:

Visual Testing:
- [ ] Tested at 375px viewport FIRST (iPhone SE)
- [ ] Tested at 768px viewport (iPad)
- [ ] Tested at 1440px viewport (Desktop)
- [ ] Agent: mobile-tester ran successfully

Touch Interactions:
- [ ] Touch targets ≥48px height (gloves requirement)
- [ ] Touch targets ≥48px width (gloves requirement)
- [ ] Adequate spacing between clickable items (minimum 8px)
- [ ] No accidental taps on adjacent elements

Layout & Scrolling:
- [ ] No horizontal scrolling at ANY viewport
- [ ] Vertical scrolling smooth and intuitive
- [ ] Forms usable with on-screen keyboard visible
- [ ] Content doesn't hide behind bottom navigation

Performance:
- [ ] Loads in <3 seconds on 4G simulation
- [ ] Agent: Web Vitals Optimizer approved
- [ ] No render-blocking resources
- [ ] Images optimized and compressed

Offline Capability:
- [ ] Works without internet (if applicable to feature)
- [ ] Auto-save triggers every 30 seconds
- [ ] Data persists to localStorage/IndexedDB
- [ ] Syncs to Supabase when connection restored

Agent Verification:
- [ ] mobile-tester PASSED all viewport tests
- [ ] Web Vitals Optimizer APPROVED performance
- [ ] Code Reviewer APPROVED code quality
- [ ] Security Auditor found ZERO vulnerabilities
```

**Invocation Command:**
```
"Use mobile-tester to verify this component meets all mobile-first requirements:
- Test at 375px, 768px, 1440px
- Verify touch targets ≥48px
- Check for horizontal scrolling
- Capture screenshots for each viewport
- Validate offline functionality (if applicable)

Then use Web Vitals Optimizer to ensure performance <3s on 4G."
```

---

## 🔒 Security Checklist (EVERY Deployment)

```markdown
Pre-Deployment Security Validation:

Code Security:
- [ ] Agent: Security Auditor PASSED full scan
- [ ] No hardcoded secrets (API keys, tokens, passwords)
- [ ] All sensitive data in environment variables
- [ ] No console.log with sensitive information

Database Security:
- [ ] All tables have RLS (Row Level Security) policies
- [ ] RLS policies tested with different user contexts
- [ ] No direct database access without authentication
- [ ] Foreign key constraints properly defined

Dependency Security:
- [ ] npm audit shows ZERO high/critical vulnerabilities
- [ ] All dependencies up to date (or known safe versions)
- [ ] No deprecated packages in use
- [ ] License compliance verified

Authentication & Authorization:
- [ ] Auth flows tested and secure
- [ ] Password reset emails working
- [ ] Session management secure
- [ ] Role-based access control enforced

Input Validation:
- [ ] All user inputs sanitized
- [ ] SQL injection protection verified
- [ ] XSS (Cross-Site Scripting) protection verified
- [ ] CSRF protection enabled

API Security:
- [ ] Rate limiting implemented
- [ ] API endpoints authenticated
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info

Agent Verification:
- [ ] Security Auditor PASSED (DEPLOYMENT BLOCKER)
- [ ] All high/critical issues RESOLVED
- [ ] RLS policies VERIFIED
- [ ] Auth flows TESTED
```

**Invocation Command:**
```
"Use Security Auditor to run complete pre-deployment security scan:
- Scan all code files for hardcoded secrets
- Verify ALL tables have RLS policies
- Run npm audit and check for vulnerabilities
- Test auth flows (signup, login, password reset)
- Verify input validation on all forms
- Check for XSS and SQL injection vulnerabilities

This is a DEPLOYMENT BLOCKER - must pass to proceed."
```

---

## 💰 Pricing Validation Checklist (DEPLOYMENT BLOCKER)

```markdown
Pricing Logic Validation (CRITICAL):

Business Rules Verification:
- [ ] 13% discount cap ENFORCED (0.87 minimum multiplier)
- [ ] GST always 10% calculated on subtotal
- [ ] Multi-day discount scaling CORRECT
- [ ] Equipment hire rates ACCURATE
- [ ] No discount can exceed 13% under ANY scenario

Test Scenarios (48 total):
- [ ] No demolition, 2 hours: $612.00 ex GST
- [ ] No demolition, 8 hours: $1,216.99 ex GST
- [ ] Demolition, 2 hours: $711.90 ex GST
- [ ] Demolition, 8 hours: $1,798.90 ex GST
- [ ] Construction, 2 hours: $661.96 ex GST
- [ ] Construction, 8 hours: $1,507.95 ex GST
- [ ] Subfloor, 2 hours: $900.00 ex GST
- [ ] Subfloor, 8 hours: $2,334.69 ex GST
- [ ] Multi-day (16 hours): 7.5% discount applied
- [ ] Multi-day (24+ hours): 13% discount applied (MAX)
- [ ] Equipment: Dehumidifier $132/day, Air Mover $46/day, RCD Box $5/day
- [ ] All 48 scenarios in test suite PASS

Agent Verification:
- [ ] pricing-calculator RAN successfully
- [ ] ALL 48 test scenarios PASSED
- [ ] 13% discount cap NEVER exceeded
- [ ] GST calculations CORRECT
- [ ] Equipment rates MATCH business rules

CRITICAL: If pricing-calculator FAILS:
❌ DO NOT DEPLOY
❌ DO NOT MERGE
❌ DO NOT MARK FEATURE COMPLETE
✅ FIX ISSUES IMMEDIATELY
✅ RE-RUN pricing-calculator UNTIL PASS
```

**Invocation Command:**
```
"Use pricing-calculator to run COMPLETE pricing validation.

This is a DEPLOYMENT BLOCKER. Must validate:
1. All 48 pricing test scenarios PASS
2. 13% discount cap NEVER exceeded (0.87 min multiplier)
3. GST always 10% on subtotal
4. Multi-day discount scaling: 0% (≤8h), 7.5% (9-16h), 13% (17+h)
5. Equipment rates: Dehumidifier $132, Air Mover $46, RCD Box $5

Report PASS/FAIL for each scenario.
If ANY scenario fails, provide detailed explanation and DO NOT APPROVE deployment."
```

---

## 🎯 Agent Invocation Examples

### **Example 1: Starting New Feature**

**User Task:** "I need to build the inspection form component with 15 sections, auto-save, and offline support."

**Claude Response:**
```
"I'll break this down with the right agents in sequence:

1. First, use TypeScript Pro to define all type interfaces for the 15 sections
2. Then use React Performance Optimization to build the optimized component with memoization
3. Next, use offline-architect to implement service worker and IndexedDB for offline support
4. Then use mobile-tester to verify it works at all viewports (375px, 768px, 1440px)
5. Use Web Vitals Optimizer to ensure performance <3s
6. Finally, use Code Reviewer and Security Auditor to ensure quality and security

Let's start with step 1: TypeScript Pro for type definitions..."

[Agent executes each step sequentially]
```

---

### **Example 2: Fixing UI Bug**

**User Task:** "The calendar is showing incorrect available slots on mobile."

**Claude Response:**
```
"I'll diagnose and fix this issue using the right agents:

1. First, use mobile-tester to reproduce the bug at 375px viewport and capture screenshots
2. Then use Code Reviewer to analyze the calendar logic for potential issues
3. After identifying the issue, I'll implement the fix
4. Use mobile-tester again to verify the fix works at all viewports
5. Finally, use Test Engineer to add regression test to prevent this bug from recurring

Starting with step 1: mobile-tester to reproduce the issue..."

[Agent executes diagnostic workflow]
```

---

### **Example 3: Modifying Pricing Logic**

**User Task:** "I need to change the multi-day discount from 7.5% to 10% for 2-day jobs."

**Claude Response:**
```
"⚠️ CRITICAL: This affects pricing logic. I must use pricing-calculator before ANY changes are finalized.

Workflow:
1. Use TypeScript Pro to update pricing type definitions
2. Implement the discount change (7.5% → 10% for 16-hour jobs)
3. 🚨 Use pricing-calculator to validate ALL 48 scenarios (DEPLOYMENT BLOCKER)
4. If pricing-calculator PASSES, use Code Reviewer to review changes
5. Use Test Engineer to add regression tests

⚠️ WARNING: If pricing-calculator FAILS, changes CANNOT be deployed.
The 13% discount cap is ABSOLUTE and cannot be exceeded.

Let me check if 10% discount for 2-day jobs conflicts with the 13% cap..."

[Agent calculates scenarios and validates with pricing-calculator]
```

---

### **Example 4: Pre-Deployment Check**

**User Task:** "I'm ready to deploy to production. Run all pre-deployment checks."

**Claude Response:**
```
"Running MANDATORY pre-deployment workflow. All agents must PASS to approve deployment.

Step 1/5: Security Auditor - Full security scan...
✅ PASSED - Zero high/critical vulnerabilities found

Step 2/5: pricing-calculator - Validating all 48 pricing scenarios...
✅ PASSED - All 48 scenarios correct, 13% cap enforced

Step 3/5: Web Vitals Optimizer - Performance audit...
✅ PASSED - Mobile: 94/100, Desktop: 98/100, Load time: 2.1s

Step 4/5: React Performance Optimization - Bundle size check...
✅ PASSED - Total bundle: 487KB (under 500KB limit)

Step 5/5: Test Engineer - CI/CD verification...
✅ PASSED - All 127 tests passing, no failures

🟢 DEPLOYMENT APPROVED
All 5 mandatory agents passed. Safe to deploy to production."

[Agent provides detailed reports for each check]
```

---

### **Example 5: Adding New Database Table**

**User Task:** "I need to add a new table for job completion tracking with photos, notes, and customer signature."

**Claude Response:**
```
"I'll design this database table using the proper agent workflow:

1. Use Supabase Schema Architect to design the job_completions table schema
   - Include fields for job_id, photos (JSONB array), notes (TEXT), signature_url, completed_at
   - Plan foreign key relationships to jobs table
   - Design RLS policies for technician access

2. Use SQL Pro to write the optimized migration SQL
   - Create table with proper indexes
   - Add foreign key constraints
   - Implement RLS policies
   - Add audit columns (created_at, updated_at, created_by)

3. Use Security Auditor to verify RLS policies are secure
   - Test with technician role (can only see assigned jobs)
   - Test with admin role (can see all jobs)
   - Verify no unauthorized access possible

4. Use TypeScript Pro to generate updated TypeScript types
   - Run supabase gen types typescript
   - Update src/types/database.types.ts

Let's start with Supabase Schema Architect..."

[Agent executes database design workflow]
```

---

## ⚠️ Common Issues & Solutions

### **Issue 1: "I modified code but forgot to run mobile-tester"**

**Problem:** Changed UI component but didn't test mobile viewport

**Solution:**
```
mobile-tester is marked PROACTIVE and should auto-trigger on UI changes.

To manually invoke:
"Use mobile-tester to test [component name] at all viewports (375px, 768px, 1440px).
Verify touch targets ≥48px, check for horizontal scrolling, capture screenshots."

REMINDER: ALWAYS test 375px FIRST, desktop is secondary.
```

---

### **Issue 2: "Pricing calculation seems wrong but tests are passing"**

**Problem:** Pricing logic looks incorrect but pricing-calculator reports PASS

**Solution:**
```
The pricing-calculator has 48 comprehensive test scenarios. If it reports PASS,
the pricing IS correct according to business rules.

Business rules are:
- 13% discount cap (0.87 minimum multiplier) - ABSOLUTE
- GST 10% on subtotal
- Multi-day discounts: 0% (≤8h), 7.5% (9-16h), 13% (17+h)

If you believe business rules should be different, consult with business owners FIRST.
Then update pricing logic AND test scenarios together.

To validate specific scenario:
"Use pricing-calculator to validate this specific pricing scenario:
[describe scenario with exact hours, work type, equipment, expected price]"
```

---

### **Issue 3: "Security Auditor found vulnerabilities but I don't know how to fix them"**

**Problem:** Security scan found issues but fixes are unclear

**Solution:**
```
Security Auditor provides specific details about each vulnerability.

Common fixes:

1. Hardcoded secrets:
   - Move to .env file
   - Add .env to .gitignore
   - Use environment variables: process.env.VARIABLE_NAME

2. Missing RLS policies:
   - Add RLS policy to table: ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;
   - Create policy: CREATE POLICY policy_name ON tablename FOR SELECT USING (auth.uid() = user_id);

3. XSS vulnerabilities:
   - Sanitize user inputs with DOMPurify
   - Use textContent instead of innerHTML
   - Validate all form inputs with Zod schemas

4. SQL injection:
   - Use Supabase client (parameterized queries)
   - NEVER concatenate strings in SQL
   - Use .eq(), .in(), .filter() methods

Ask Security Auditor for specific fix recommendations:
"Use Security Auditor to provide detailed fix recommendations for [specific vulnerability]"
```

---

### **Issue 4: "Bundle size is too large (>500KB)"**

**Problem:** React Performance Optimization reports bundle over limit

**Solution:**
```
Use React Performance Optimization agent to reduce bundle size:

"Use React Performance Optimization to analyze bundle and suggest optimizations.
Focus on:
- Lazy loading routes with React.lazy()
- Code splitting for large components
- Tree shaking unused dependencies
- Optimizing images and assets
- Removing unused npm packages

Target: Reduce bundle from [current size] to <500KB"

Common fixes:
1. Lazy load routes:
   const Dashboard = lazy(() => import('./pages/Dashboard'))

2. Split large components:
   const HeavyComponent = lazy(() => import('./components/HeavyComponent'))

3. Optimize images:
   - Compress images to <1MB before upload
   - Use WebP format
   - Implement lazy loading for images

4. Remove unused dependencies:
   - Run: npx depcheck
   - Remove unused packages: npm uninstall [package]
```

---

### **Issue 5: "Not sure which agent to use for my task"**

**Problem:** Unclear which agent(s) are appropriate for current work

**Solution:**
```
Read MRC-AGENT-WORKFLOW.md for complete agent usage guide.

Quick decision tree:

UI Work?
├─→ YES: mobile-tester, Web Vitals Optimizer, Code Reviewer
└─→ NO: Continue

Database Work?
├─→ YES: Supabase Schema Architect, SQL Pro, Security Auditor, TypeScript Pro
└─→ NO: Continue

Pricing Changes?
├─→ YES: pricing-calculator (MANDATORY), Code Reviewer, Test Engineer
└─→ NO: Continue

Performance Issue?
├─→ YES: Performance Profiler, Web Vitals Optimizer, React Performance Optimization
└─→ NO: Continue

Security Concern?
├─→ YES: Security Auditor
└─→ NO: Continue

Offline Feature?
├─→ YES: offline-architect
└─→ NO: Continue

Testing Needed?
├─→ YES: Test Engineer
└─→ NO: Continue

General Code Review?
└─→ Code Reviewer (always recommended)

Ask Claude:
"Based on my task '[describe task]', which agents should I use and in what order?"
```

---

### **Issue 6: "Agent failed but I don't understand why"**

**Problem:** Agent reports failure with unclear error message

**Solution:**
```
Each agent provides specific failure details. Review the agent's output carefully.

To get more details:
"Use [Agent Name] again and provide more detailed explanation of why it failed.
Include specific file paths, line numbers, and fix recommendations."

For each agent type:

mobile-tester failed:
├─→ Check viewport screenshots for visual issues
├─→ Verify touch targets are ≥48px
├─→ Check for horizontal scrolling
└─→ Test manually at 375px in browser DevTools

pricing-calculator failed:
├─→ CRITICAL: Review which scenarios failed
├─→ Check if 13% cap was exceeded
├─→ Verify GST calculations (should be 10%)
├─→ Check multi-day discount logic
└─→ DO NOT DEPLOY until fixed

Security Auditor failed:
├─→ Review specific vulnerabilities listed
├─→ Check for hardcoded secrets
├─→ Verify RLS policies on all tables
├─→ Run npm audit manually
└─→ Fix issues before deployment

Web Vitals Optimizer failed:
├─→ Check specific metrics that failed (LCP, FID, CLS)
├─→ Look for render-blocking resources
├─→ Optimize large images/assets
└─→ Reduce JavaScript bundle size

Code Reviewer found issues:
├─→ Review specific code quality concerns
├─→ Check for code smells or anti-patterns
├─→ Verify best practices are followed
└─→ Refactor as recommended
```

---

## 📚 Related Documentation

### **Core Documentation (Read First)**
- **CLAUDE.md** (this file) - Project guide for every session
- **MRC-AGENT-WORKFLOW.md** - Complete agent usage patterns and workflows
- **TASKS.md** - All 320+ tasks with detailed agent assignments
- **MRC-SPRINT-1-TASKS.md** - Current 4-week sprint with daily tasks

### **Architecture & Planning**
- **PLANNING.md** - Architecture decisions, tech stack, agent integration philosophy
- **context/MRC-PRD.md** - Complete product requirements and workflows
- **context/MRC-TECHNICAL-SPEC.md** - Technical implementation details
- **context/design-checklist-s-tier.md** - MRC-specific design standards

### **Agent & Automation**
- **.claude/agents/README.md** - Agent directory and configuration
- **HOOKS-AND-AUTOMATION.md** - Hook configurations and automation
- **AGENT-INVOCATION-PATTERNS.md** - Common patterns library
- **DEPLOYMENT-CHECKLIST.md** - Pre-deployment workflow with agents

---

## 🎯 Success Criteria

### **You're Doing It Right When:**

✅ **Proactive Agent Usage**
- Invoking agents BEFORE issues arise, not after
- mobile-tester runs after EVERY UI change
- pricing-calculator validates BEFORE deployment
- Security Auditor scans BEFORE merging
- Code Reviewer checks BEFORE committing

✅ **Mobile-First Development**
- Testing 375px viewport FIRST, always
- Touch targets are ≥48px (gloves requirement)
- No horizontal scrolling at any viewport
- Forms work with on-screen keyboard
- Performance <3s on 4G networks

✅ **Security-First Approach**
- No hardcoded secrets in code
- All tables have RLS policies
- npm audit passes (zero high/critical)
- Input validation on all forms
- Security Auditor runs before every deployment

✅ **Pricing Integrity**
- pricing-calculator runs on ANY pricing change
- 13% discount cap NEVER exceeded
- GST always 10% on subtotal
- Equipment rates match business rules
- Deployment blocked if pricing fails

✅ **Quality Standards**
- Code Reviewer approves before merging
- All tests passing (Test Engineer verification)
- Bundle size <500KB (React Performance Optimization)
- Performance metrics green (Web Vitals Optimizer)
- No console errors or warnings

---

### **You Need to Improve When:**

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
- Poor performance on 4G
- Assuming desktop experience translates to mobile

❌ **Security Oversights**
- Hardcoded secrets in code
- Missing RLS policies
- Skipping Security Auditor scans
- No input validation
- Ignoring npm audit warnings

❌ **Pricing Violations**
- Deploying without pricing-calculator
- 13% discount cap exceeded
- GST calculations incorrect
- Equipment rates wrong
- Ignoring pricing validation failures

❌ **Quality Shortcuts**
- Merging without code review
- Skipping tests
- Ignoring bundle size
- Poor performance metrics
- Console errors in production

---

## 🚀 Quick Start Commands

### **Every Session Start:**
```bash
# Load all context
cat CLAUDE.md && cat MRC-AGENT-WORKFLOW.md && cat TASKS.md

# Check git status
git status && git log --oneline -5

# Find current task
grep "🟡 IN PROGRESS" TASKS.md
```

### **Before ANY Code Change:**
```bash
# Verify you're on the right task
# Check if feature needs agents
# Plan multi-agent workflow
```

### **After UI Changes:**
```
"Use mobile-tester to test at all viewports,
then use Web Vitals Optimizer to check performance,
then use Code Reviewer for code quality."
```

### **After Pricing Changes:**
```
"Use pricing-calculator to validate all pricing scenarios.
This is a deployment blocker - must pass before proceeding."
```

### **Before Merging:**
```
"Use Code Reviewer to review my changes,
then use Security Auditor to scan for vulnerabilities,
then use Test Engineer to verify all tests pass."
```

### **Before Deploying:**
```
"Run complete pre-deployment workflow:
1. Security Auditor
2. pricing-calculator
3. Web Vitals Optimizer
4. React Performance Optimization
5. Test Engineer

All must pass to approve deployment."
```

---

## 💡 Remember

**This is a business-critical system for a growing Melbourne mould remediation company.**

### **Every decision should prioritize:**

1. 📱 **Mobile Experience** - Primary device for field technicians
2. 🔒 **Data Integrity** - Auto-save, offline mode, no data loss
3. ⚡ **Performance** - <3s load time on 4G networks
4. 🇦🇺 **Australian Standards** - Currency, dates, phone, ABN formatting
5. 💼 **Professional Appearance** - Trust = Sales = Revenue
6. 💰 **Pricing Accuracy** - 13% cap is absolute, no exceptions
7. 🔐 **Security** - Protect customer data, prevent breaches

### **Quality and Reliability Are Non-Negotiable**

- **Field technicians** rely on this system in work vans with poor signal
- **Business owners** need accurate pricing for profitability
- **Customers** expect professional service and data security
- **Every lead** is valuable business revenue ($2,000-$10,000+ jobs)
- **Lost data** = lost revenue = lost trust = lost business

### **Use Agents Proactively**

Agents are your team members. Invoke them BEFORE issues arise:
- **mobile-tester** - Before marking UI features complete
- **pricing-calculator** - Before deploying ANY pricing changes
- **Security Auditor** - Before every deployment
- **Code Reviewer** - Before every merge
- **Web Vitals Optimizer** - After UI changes

**Don't wait for problems. Prevent them with agents.** 🤖

---

*Last Updated: 2025-11-11*
*Current Sprint: Sprint 1 (Weeks 1-4)*
*Current Phase: Agent-Integrated Development*
*Next: Use MRC-AGENT-WORKFLOW.md for detailed agent patterns*

**Ready to build? Start with MRC-SPRINT-1-TASKS.md for your current sprint tasks.** 🚀

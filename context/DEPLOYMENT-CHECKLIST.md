# =€ MRC Deployment Checklist - Production Release Workflow

> **Complete pre-deployment validation workflow with multi-agent enforcement**
>
> **Purpose:** This checklist ensures ZERO production issues by running comprehensive validation before every deployment. All 3 deployment blockers MUST PASS before code can be released.

---

##   CRITICAL: 3 DEPLOYMENT BLOCKERS

**These agents MUST PASS before ANY production deployment:**

1. **Security Auditor** - Zero high/critical vulnerabilities
2. **pricing-calculator** - All 48 pricing scenarios pass, 13% cap enforced
3. **Web Vitals Optimizer** - Mobile score >90 on ALL pages

**IF ANY BLOCKER FAILS ’ DO NOT DEPLOY ’ FIX ISSUES FIRST**

---

## =Ë Table of Contents

1. [Pre-Deployment Overview](#pre-deployment-overview)
2. [Phase 1: Code Quality Validation](#phase-1-code-quality-validation)
3. [Phase 2: Deployment Blocker Checks](#phase-2-deployment-blocker-checks)
4. [Phase 3: Functional Testing](#phase-3-functional-testing)
5. [Phase 4: Performance Validation](#phase-4-performance-validation)
6. [Phase 5: Final Review](#phase-5-final-review)
7. [Deployment Execution](#deployment-execution)
8. [Post-Deployment Monitoring](#post-deployment-monitoring)
9. [Rollback Procedure](#rollback-procedure)

---

## <¯ Pre-Deployment Overview

### Deployment Frequency

**Sprint 1 (Current):**
- **Staging Deployments:** Daily (for testing)
- **Production Deployments:** Weekly (Fridays, end of day)

**Future Sprints:**
- **Staging:** Automatic on merge to `develop` branch
- **Production:** On-demand after full validation

### Team Roles

**Developer:**
- Run local validation
- Fix any issues found
- Request deployment approval

**QA/Reviewer:**
- Review deployment checklist
- Approve if all checks pass
- Reject if blockers fail

**Deployer:**
- Execute deployment scripts
- Monitor deployment progress
- Verify production health

### Timeline

**Total Time Required:** 60-90 minutes

- **Phase 1 (Code Quality):** 15 minutes
- **Phase 2 (Deployment Blockers):** 30 minutes   CRITICAL
- **Phase 3 (Functional Testing):** 15 minutes
- **Phase 4 (Performance):** 10 minutes
- **Phase 5 (Final Review):** 5 minutes
- **Deployment Execution:** 10 minutes
- **Post-Deployment Monitoring:** 15 minutes

---

##  Phase 1: Code Quality Validation

**Duration:** ~15 minutes

**Objective:** Ensure code meets MRC standards before running deployment blockers

### Step 1.1: Run Code Reviewer

**Agent Invocation:**
```bash
Use Code Reviewer to perform final code review:

Check ALL files changed since last deployment:
1. No hardcoded colors (design tokens only)
   - Search for: bg-blue-, bg-gray-, text-red-, etc.
   - Must use: bg-primary, text-muted-foreground, etc.

2. Touch targets e48px
   - All buttons: h-12 or min-h-[48px]
   - All inputs: h-12
   - All interactive elements: e48px

3. Australian formatting applied
   - formatPhoneNumber() for phone
   - formatCurrency() for currency (with ex/inc GST)
   - formatDateAU() for dates
   - validatePostcode() for postcodes

4. Auto-save implemented (if forms added/modified)
   - useAutoSave hook present
   - 30-second interval
   - localStorage backup

5. Offline queue used (if mutations added)
   - queueAction() for create/update/delete
   - Sync on reconnection

6. No console.log statements

7. No commented-out code

8. Error handling present

Generate report with violations (if any).
```

**Acceptance Criteria:**
- [ ] Zero hardcoded colors
- [ ] All touch targets e48px
- [ ] Australian formatting applied
- [ ] Auto-save in all forms
- [ ] Offline queue for mutations
- [ ] No console.log or dead code
- [ ] Error handling comprehensive

**If FAIL:** Fix issues and re-run Code Reviewer

---

### Step 1.2: TypeScript Compilation

**Command:**
```bash
npm run type-check
```

**Acceptance Criteria:**
- [ ] Zero TypeScript errors
- [ ] All types properly defined
- [ ] No `any` types (unless explicitly needed)

**If FAIL:** Fix type errors and re-run

---

### Step 1.3: Linting

**Command:**
```bash
npm run lint
```

**Acceptance Criteria:**
- [ ] Zero ESLint errors
- [ ] Zero critical warnings
- [ ] Code style consistent

**If FAIL:** Run `npm run lint:fix` and commit fixes

---

### Step 1.4: Unit Tests

**Command:**
```bash
npm test
```

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Code coverage >80% for critical code
- [ ] No flaky tests

**If FAIL:** Fix failing tests

---

**Phase 1 Status:**  PASS / L FAIL

**If Phase 1 FAILS:** Stop deployment, fix issues, restart from Phase 1

---

## =¨ Phase 2: Deployment Blocker Checks (CRITICAL)

**Duration:** ~30 minutes

**Objective:** Run ALL 3 deployment blockers - ALL MUST PASS

---

### **BLOCKER 1: Security Auditor**   MANDATORY

**Agent Invocation:**
```bash
DEPLOYMENT BLOCKER 1 OF 3: Security Auditor

Use Security Auditor to perform full security scan:

1. npm audit (CRITICAL):
   - Run: npm audit --audit-level=high
   - REQUIREMENT: ZERO high/critical vulnerabilities
   - Check for: outdated packages, known CVEs

2. RLS Policy Testing:
   - Test technician context: sees ONLY assigned leads
   - Test admin context: sees ALL data
   - Test user context: accesses OWN data only
   - Verify no policy leaks between users

3. Authentication Security:
   - Password reset flow secure
   - Session management correct (httpOnly cookies)
   - CSRF protection enabled
   - XSS prevention in place
   - Brute force protection active

4. API Key Security (CRITICAL):
   - Claude API key: server-side ONLY 
   - Resend API key: server-side ONLY 
   - Supabase anon key: properly configured 
   - Supabase service key: server-side ONLY 
   - NO keys exposed in client bundle 

5. Injection Prevention:
   - SQL injection: all queries parameterized 
   - XSS: all user input sanitized 
   - Command injection: no shell execution with user input 
   - Path traversal: file paths validated 

6. Supabase Security:
   - RLS enabled on ALL tables
   - Storage bucket policies configured
   - Edge Function permissions correct

Generate security report with severity levels.

DEPLOYMENT BLOCKER: If ANY high/critical vulnerabilities found, DO NOT DEPLOY.
```

**Acceptance Criteria:**
- [ ] npm audit: ZERO high/critical vulnerabilities   BLOCKER
- [ ] RLS policies: All tested and working
- [ ] Authentication: Secure implementation
- [ ] API keys: All server-side only
- [ ] Injection prevention: All vectors protected
- [ ] Supabase security: Fully configured

**BLOCKER 1 Status:**  PASS / L FAIL

**If FAIL:**
1. Document all vulnerabilities
2. Fix immediately (DO NOT DEPLOY until fixed)
3. Re-run Security Auditor
4. Verify PASS before proceeding

---

### **BLOCKER 2: pricing-calculator**   MANDATORY

**Agent Invocation:**
```bash
DEPLOYMENT BLOCKER 2 OF 3: pricing-calculator

Use pricing-calculator to validate ALL pricing scenarios:

1. Run ALL 48 pricing scenarios:
   Work Types:
   - no_demolition (12 scenarios)
   - demolition (12 scenarios)
   - construction (12 scenarios)
   - subfloor (12 scenarios)

   Discount Tiers:
   - 0-8 hours: 0% discount (16 scenarios)
   - 9-16 hours: 7.5% discount (16 scenarios)
   - 17+ hours: 13% discount MAX (16 scenarios)

   Equipment Combinations:
   - No equipment (12 scenarios)
   - Light equipment (12 scenarios)
   - Medium equipment (12 scenarios)
   - Heavy equipment (12 scenarios)

   REQUIREMENT: ALL 48 scenarios MUST PASS

2. 13% Discount Cap Validation (ABSOLUTE BUSINESS RULE):
   - Test 8 hours ’ 0% discount 
   - Test 16 hours ’ 7.5% discount 
   - Test 24 hours ’ 13% discount 
   - Test 48 hours ’ 13% discount (NOT 15%) 
   - Test 100 hours ’ 13% discount (NOT 20%) 
   - Test 200 hours ’ 13% discount (MUST NEVER EXCEED) 

   CRITICAL: 13% cap MUST NEVER be exceeded in ANY scenario

3. Equipment Cost Validation:
   - Dehumidifier: $132/day (ex GST)
   - Air mover: $46/day (ex GST)
   - RCD box: $5/day (ex GST)
   - Multi-day: costs × days

4. GST Calculation:
   - All prices: 10% GST
   - Total inc GST = Total ex GST × 1.1

5. Edge Cases:
   - 0 hours ’ Error handling
   - Negative hours ’ Validation error
   - Decimal hours ’ Proper rounding
   - Very large jobs (500+ hours) ’ Still 13% cap

Run test command: npm test -- pricing.test.ts

DEPLOYMENT BLOCKER: If ANY scenario fails OR 13% cap exceeded, DO NOT DEPLOY.

Generate detailed report: X/48 scenarios passed.
```

**Acceptance Criteria:**
- [ ] All 48 pricing scenarios PASS   BLOCKER
- [ ] 13% discount cap NEVER exceeded   CRITICAL
- [ ] Equipment costs correct ($132, $46, $5)
- [ ] GST calculation correct (10%)
- [ ] Edge cases handled properly

**BLOCKER 2 Status:**  PASS (48/48) / L FAIL (X/48)

**If FAIL:**
1. Document which scenarios failed
2. Fix pricing logic (DO NOT DEPLOY until fixed)
3. Re-run pricing-calculator
4. Verify 48/48 PASS before proceeding

---

### **BLOCKER 3: Web Vitals Optimizer**   MANDATORY

**Agent Invocation:**
```bash
DEPLOYMENT BLOCKER 3 OF 3: Web Vitals Optimizer

Use Web Vitals Optimizer to audit ALL pages:

Test pages at mobile viewport (375px) with 3G throttling:

Pages to audit:
1. Dashboard (/dashboard)
2. Kanban Board (/leads)
3. Leads List (/leads/list)
4. Inspection Form (/inspection/:id)
5. Calendar View (/calendar)
6. Customer Booking (/booking/:token)
7. Settings (/settings)

For EACH page measure:

Core Web Vitals:
- LCP (Largest Contentful Paint) ’ MUST be <2.5s
- FID (First Input Delay) ’ MUST be <100ms
- CLS (Cumulative Layout Shift) ’ MUST be <0.1

Lighthouse Scores (Mobile):
- Performance ’ MUST be >90   BLOCKER
- Accessibility ’ Target >95
- Best Practices ’ Target >90
- SEO ’ Target >90

Load Performance:
- Initial page load ’ <3s on 3G
- Time to Interactive (TTI) ’ <5s
- Bundle size ’ <1MB main, <500KB per chunk

Test Configuration:
- Device: Mobile (Moto G4)
- Network: Slow 3G (1.6 Mbps)
- CPU: 4x slowdown

Run command: npm run lighthouse:all

DEPLOYMENT BLOCKER: If ANY page scores <90 on mobile Performance, DO NOT DEPLOY.

Generate performance report with scores for each page.
```

**Acceptance Criteria:**
- [ ] ALL pages mobile Performance >90   BLOCKER
- [ ] LCP <2.5s on all pages
- [ ] FID <100ms on all pages
- [ ] CLS <0.1 on all pages
- [ ] 3G load time <3s on all pages
- [ ] Bundle sizes within limits

**BLOCKER 3 Status:**  PASS / L FAIL

**Pages scoring <90:**
- [ ] None (all pass) 
- [ ] [List any failing pages] L

**If FAIL:**
1. Document which pages failed
2. Optimize performance (DO NOT DEPLOY until fixed)
3. Re-run Web Vitals Optimizer
4. Verify ALL pages >90 before proceeding

---

**Phase 2 Summary:**

| Blocker | Status | Score |
|---------|--------|-------|
| 1. Security Auditor | /L | Zero high/critical |
| 2. pricing-calculator | /L | X/48 scenarios |
| 3. Web Vitals Optimizer | /L | Mobile >90 |

**Phase 2 Status:**  ALL 3 PASS / L ONE OR MORE FAIL

**CRITICAL DECISION POINT:**

```bash
IF ALL 3 BLOCKERS PASS:
   Proceed to Phase 3

ELSE:
  L STOP DEPLOYMENT
  =' Fix failing blockers
  = Re-run Phase 2
  ø Do NOT proceed until ALL 3 PASS
```

---

## >ê Phase 3: Functional Testing

**Duration:** ~15 minutes

**Objective:** Verify all features work end-to-end

### Step 3.1: Mobile Testing

**Agent Invocation:**
```bash
Use mobile-tester to test ALL pages at 375px viewport:

For EACH page verify:
1. Layout doesn't break
2. No horizontal scroll
3. Touch targets e48px
4. Text readable without zoom
5. Navigation works
6. Forms usable with keyboard
7. Bottom nav active state correct

Pages to test:
- Dashboard
- Kanban Board
- Leads List
- Add Lead Dialog
- Inspection Form (all sections)
- Calendar
- Customer Booking
- Settings

Take screenshots for each page.

Generate mobile compatibility report.
```

**Acceptance Criteria:**
- [ ] All pages work at 375px
- [ ] No horizontal scroll anywhere
- [ ] All touch targets e48px
- [ ] Forms usable on mobile
- [ ] Navigation functional

---

### Step 3.2: End-to-End Workflow Testing

**Manual Testing Required:**

**Workflow 1: Lead ’ Inspection ’ PDF**
1. [ ] Create new lead via Add Lead Dialog
2. [ ] Lead appears in Kanban (New Lead stage)
3. [ ] Drag lead to "Inspection Booked" stage
4. [ ] Open inspection form
5. [ ] Fill all required fields
6. [ ] Auto-save triggers (watch "Last saved" timestamp)
7. [ ] Generate AI summary (Claude API)
8. [ ] Generate PDF (Puppeteer)
9. [ ] PDF displays correctly
10. [ ] Email sent to customer (Resend API)

**Workflow 2: Customer Booking**
1. [ ] Open customer booking link
2. [ ] Calendar displays available dates
3. [ ] Select date and time slot
4. [ ] Confirm booking
5. [ ] Booking appears in admin calendar
6. [ ] Confirmation email sent

**Workflow 3: Offline Mode**
1. [ ] Fill inspection form
2. [ ] Disconnect internet
3. [ ] Continue filling form
4. [ ] Changes saved to offline queue
5. [ ] Reconnect internet
6. [ ] Queue syncs automatically
7. [ ] Data appears in Supabase

**Acceptance Criteria:**
- [ ] Workflow 1: Complete success
- [ ] Workflow 2: Complete success
- [ ] Workflow 3: Complete success

---

### Step 3.3: Cross-Browser Testing

**Test in these browsers:**

**Desktop:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Mobile:**
- [ ] iOS Safari (iPhone)
- [ ] Android Chrome (Android device)

**Acceptance Criteria:**
- [ ] Works in all browsers
- [ ] No visual glitches
- [ ] All features functional

---

**Phase 3 Status:**  PASS / L FAIL

**If FAIL:** Fix issues and re-test

---

## ¡ Phase 4: Performance Validation

**Duration:** ~10 minutes

**Objective:** Verify performance meets targets

### Step 4.1: Bundle Size Check

**Command:**
```bash
npm run build
npm run analyze-bundle
```

**Acceptance Criteria:**
- [ ] Main bundle <1MB
- [ ] Lazy chunks <500KB each
- [ ] No duplicate dependencies
- [ ] Tree-shaking working

---

### Step 4.2: Load Time Testing

**Test Configuration:**
- Device: Mobile (Moto G4)
- Network: Slow 3G
- CPU: 4x slowdown

**Pages to Test:**
- [ ] Dashboard: Load time <3s
- [ ] Inspection Form: Load time <3s
- [ ] Calendar: Load time <3s

**Acceptance Criteria:**
- [ ] All pages load <3s on 3G
- [ ] No blocking resources
- [ ] Images optimized

---

### Step 4.3: Lighthouse Audit

**Already done in Phase 2 (Blocker 3)** 

---

**Phase 4 Status:**  PASS / L FAIL

**If FAIL:** Optimize and re-test

---

## =Ý Phase 5: Final Review

**Duration:** ~5 minutes

**Objective:** Final checklist before deployment

### Pre-Deployment Checklist

**Code:**
- [ ] All changes committed
- [ ] No uncommitted files
- [ ] Branch up to date with `main`
- [ ] Merge conflicts resolved

**Testing:**
- [ ] Phase 1: Code Quality 
- [ ] Phase 2: ALL 3 Blockers 
- [ ] Phase 3: Functional Testing 
- [ ] Phase 4: Performance 

**Documentation:**
- [ ] CHANGELOG.md updated
- [ ] Version number incremented
- [ ] Breaking changes documented
- [ ] Migration guide (if needed)

**Environment:**
- [ ] Production env variables set
- [ ] Database migrations ready
- [ ] Backups recent (<24h)
- [ ] Rollback plan documented

**Communication:**
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled (if needed)
- [ ] Stakeholders informed

**Approval:**
- [ ] Developer: Ready to deploy
- [ ] QA: All tests pass
- [ ] Tech Lead: Approved
- [ ] Product Owner: Approved (if major release)

---

**Phase 5 Status:**  READY TO DEPLOY / L NOT READY

**If NOT READY:** Address missing items

---

## =€ Deployment Execution

**Duration:** ~10 minutes

**Objective:** Deploy to production safely

### Step 6.1: Pre-Deployment Backup

```bash
# Backup production database
supabase db dump --file=backup-$(date +%Y%m%d-%H%M%S).sql

# Backup Supabase Storage
supabase storage list --all > storage-backup-$(date +%Y%m%d).txt
```

**Verification:**
- [ ] Database backup created
- [ ] Backup file size reasonable
- [ ] Storage inventory created

---

### Step 6.2: Apply Database Migrations

```bash
# Run migrations on production
supabase db push --db-url $PRODUCTION_DATABASE_URL

# Verify migrations applied
supabase migrations list --db-url $PRODUCTION_DATABASE_URL
```

**Verification:**
- [ ] Migrations applied successfully
- [ ] No migration errors
- [ ] Database schema updated

---

### Step 6.3: Deploy Frontend

**Vercel Deployment:**
```bash
# Deploy to production
vercel --prod

# Or trigger via GitHub
git push origin main  # Auto-deploys to Vercel
```

**Verification:**
- [ ] Build successful
- [ ] Deployment live
- [ ] Production URL accessible

---

### Step 6.4: Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy generate-inspection-pdf --project-ref $PROD_PROJECT_REF
supabase functions deploy generate-ai-summary --project-ref $PROD_PROJECT_REF
supabase functions deploy send-email --project-ref $PROD_PROJECT_REF
supabase functions deploy check-booking-availability --project-ref $PROD_PROJECT_REF
```

**Verification:**
- [ ] All Edge Functions deployed
- [ ] No deployment errors
- [ ] Functions responding

---

### Step 6.5: Smoke Tests (Production)

**Test immediately after deployment:**

1. [ ] Homepage loads
2. [ ] Dashboard loads
3. [ ] Create new lead works
4. [ ] Inspection form works
5. [ ] AI summary generates
6. [ ] PDF generates
7. [ ] Email sends
8. [ ] Customer booking works
9. [ ] No JavaScript errors in console
10. [ ] No 500 errors

**If ANY smoke test fails:**
1. **IMMEDIATELY ROLLBACK** (see Rollback Procedure)
2. Investigate issue
3. Fix and redeploy

---

## =Ê Post-Deployment Monitoring

**Duration:** ~15 minutes (immediate) + 24 hours (ongoing)

**Objective:** Ensure production is stable

### Step 7.1: Immediate Monitoring (0-15 minutes)

**Metrics to Watch:**
- [ ] Error rate: <1% (Sentry/logs)
- [ ] Response times: <500ms average
- [ ] Database connections: Normal levels
- [ ] Edge Function success rate: >99%
- [ ] Email delivery rate: >99%
- [ ] Active users: Expected levels

**Verification:**
```bash
# Check Vercel deployment status
vercel ls --prod

# Check Supabase health
supabase status --project-ref $PROD_PROJECT_REF

# Check logs for errors
vercel logs --prod --limit 100

# Check Sentry for new errors
# (Open Sentry dashboard)
```

---

### Step 7.2: Extended Monitoring (24 hours)

**Metrics to Track:**
- [ ] Error rate remains <1%
- [ ] No memory leaks
- [ ] No performance degradation
- [ ] User feedback positive
- [ ] No data loss reported

**Monitoring Tools:**
- Vercel Analytics
- Sentry Error Tracking
- Supabase Dashboard
- Plausible Analytics (if configured)

---

## = Rollback Procedure

**Use if production issues detected**

### When to Rollback

**Rollback IMMEDIATELY if:**
- L Error rate >5%
- L Data loss occurring
- L Critical features broken
- L Security vulnerability introduced
- L Database corruption
- L Complete service outage

**Consider Rollback if:**
-   Error rate 1-5%
-   Performance degradation >50%
-   User complaints spike
-   Non-critical features broken

### Rollback Steps

**Step 1: Announce Rollback**
```bash
# Notify team immediately
"ROLLBACK IN PROGRESS: [reason]"
```

**Step 2: Rollback Frontend**
```bash
# Redeploy previous version
vercel rollback

# Or deploy specific previous deployment
vercel deploy --prod [previous-deployment-url]
```

**Step 3: Rollback Database (if needed)**
```bash
# Restore from backup
supabase db restore --file=backup-[timestamp].sql --db-url $PRODUCTION_DATABASE_URL

# Or rollback migrations
supabase migrations down --db-url $PRODUCTION_DATABASE_URL
```

**Step 4: Rollback Edge Functions (if needed)**
```bash
# Deploy previous version
supabase functions deploy [function-name] --project-ref $PROD_PROJECT_REF --version [previous-version]
```

**Step 5: Verify Rollback**
- [ ] Previous version live
- [ ] Error rate back to normal
- [ ] Features working
- [ ] No data loss

**Step 6: Post-Rollback**
- Document what went wrong
- Fix issues in development
- Re-run full deployment checklist
- Deploy again when ready

---

## =Ë Deployment Summary Template

**Copy this template after each deployment:**

```markdown
# Deployment Summary: [Date] [Version]

## Overview
- **Version:** v1.2.3
- **Date:** 2025-01-15
- **Time:** 14:30 AEDT
- **Deployer:** [Name]
- **Duration:** 87 minutes

## Deployment Blockers
- **Security Auditor:**  PASS (Zero high/critical)
- **pricing-calculator:**  PASS (48/48 scenarios)
- **Web Vitals Optimizer:**  PASS (Mobile >90 all pages)

## Changes Deployed
- Feature: Customer self-booking calendar
- Fix: Auto-save on inspection form
- Update: Pricing calculator (13% cap enforcement)
- Improvement: Mobile navigation active state

## Testing Results
- **Code Quality:**  PASS
- **Functional Testing:**  PASS
- **Mobile Testing:**  PASS (375px, 768px, 1440px)
- **Cross-Browser:**  PASS
- **Performance:**  PASS (Mobile 92)

## Post-Deployment Status
- **Error Rate:** 0.2% (normal)
- **Response Time:** 320ms average (good)
- **User Feedback:** Positive
- **Issues:** None detected

## Rollback Status
- **Rollback Required:** No
- **Backup Created:** Yes (backup-20250115-1430.sql)

## Notes
- Deployment completed successfully
- No issues detected
- Monitoring for 24 hours
- Next deployment: 2025-01-22
```

---

## <¯ Success Metrics

### Deployment Success Criteria

**Technical:**
- [ ] Zero production errors in first hour
- [ ] Error rate <1% in first 24 hours
- [ ] Response times <500ms average
- [ ] Zero data loss
- [ ] Zero rollbacks required

**Business:**
- [ ] All features working as expected
- [ ] Users can complete workflows
- [ ] No customer complaints
- [ ] Team confidence high

### Sprint 1 Deployment Goals

**By End of Sprint 1:**
- [ ] 4 successful production deployments
- [ ] Zero rollbacks
- [ ] All 3 blockers passing consistently
- [ ] Deployment time <90 minutes
- [ ] Team comfortable with process

---

## =Ú Related Documentation

- **CLAUDE.md** - Complete project guide
- **MRC-AGENT-WORKFLOW.md** - Agent workflows
- **AGENT-INVOCATION-PATTERNS.md** - Copy-paste patterns
- **HOOKS-AND-AUTOMATION.md** - Automated hooks
- **.claude/agents/README.md** - Agent directory

---

**Last Updated:** 2025-11-11
**Version:** 1.0
**Status:** Active Development - Sprint 1

---

*Follow this checklist exactly for every production deployment. The 3 deployment blockers are non-negotiable - if any fail, DO NOT DEPLOY.* =€(

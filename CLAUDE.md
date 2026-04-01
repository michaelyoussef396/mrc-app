# MRC Lead Management System - Claude Code Guide

**Mould & Restoration Co. - Business Automation Platform**
**Users:** Field technicians on mobile devices | **Location:** Melbourne, Australia
**Tech Stack:** React/TypeScript + Supabase + PWA

---

## Quick Reference

### Mobile-First Standards (Non-Negotiable)
- Test 375px viewport FIRST
- Touch targets ≥48px (gloves requirement)
- Currency: $X,XXX.XX | Date: DD/MM/YYYY | Time: Australia/Melbourne

### Pricing Rules (Absolute)
- **13% discount cap** (0.87 multiplier) - NEVER exceed
- GST always 10% | Equipment: Dehumidifier $132, Air Mover $46, RCD $5

### Australian Standards
- Currency: $X,XXX.XX | Phone: (03) XXXX XXXX or 04XX XXX XXX
- Date: DD/MM/YYYY | Timezone: Australia/Melbourne | ABN: XX XXX XXX XXX

---

## Context Files
```
context/PRD.md                # Product requirements (stages 1-12)
context/TODO.md               # Current task list (forward-looking)
context/PLANNING.md           # Architecture & deployment readiness
context/WORKFLOW.md           # Session summaries & decisions
context/PM_WORKFLOW.md        # PM/Dev workflow process
context/AGENTS.md             # Agent instructions
context/MASTER-TODO.md        # Historical reference (archived)
```

---

## MCP Servers

| Server | Purpose |
|--------|---------|
| Supabase | Database operations, RLS policies, migrations |
| Playwright | Visual testing at 375px/768px/1440px |
| GitHub | Git operations, branches, commits |
| Filesystem | File operations |

---

## Agent Delegation

| Task Type | Agent |
|-----------|-------|
| Database changes | database-specialist |
| Business logic | backend-builder |
| UI components | frontend-builder |
| Connect UI to backend | integration-specialist |
| Debugging | error-detective |
| Pricing validation | pricing-guardian |
| Deployment | deployment-captain |

---

## Key Workflows

### Feature Development
1. planner-researcher → Research & plan
2. database-specialist → Schema changes
3. frontend-builder → UI components
4. integration-specialist → Wire to backend
5. Testing (Playwright + Supabase verification)
6. documentation-agent → Commit & docs

### Bug Fix
1. error-detective → Debug systematically
2. Fix implementation
3. Verify with Playwright at 375px
4. Git checkpoint

### Pre-Deployment (All must pass)
1. Security scan (zero high/critical)
2. pricing-guardian (48 scenarios)
3. Mobile performance (>90, <3s load)
4. Bundle size (<500KB)
5. All tests passing

---

## Critical Rules

- No hardcoded secrets (use .env)
- All tables have RLS policies
- TypeScript strict mode, no `any` types
- shadcn/ui for components
- Test mobile 375px FIRST

---

## Current State (April 2026)

### Phase 1: COMPLETE
- **Status:** All inspection workflow features working end-to-end
- **Built:** 91 components, 26 pages, 22 hooks, 10 Edge Functions, 16 DB tables
- **Security:** RLS on all tables, rate limiting, XSS/CSP, Sentry monitoring
- **Deployment:** Vercel with security headers, PWA with service worker

### Next: Job Completion Workflow
- Job completion form, job report PDF, admin approval flow
- Invoice helper, payment tracking, audit trail
- See `context/TODO.md` for full task list

### Active Tasks
- Framer → Supabase lead capture
- Email domain switch (mouldandrestoration.com.au)
- API key rotation
- Dev Supabase project + Vercel preview env vars
- Team walkthrough with technicians

### Git Workflow
- Production branch: `main`
- Deploy: push to main triggers Vercel deployment
- Working directory: `~/Mould/mrc-app` (canonical)

---

*Last Updated: 2026-04-01*

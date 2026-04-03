# MRC Lead Management System - Claude Code Guide

**Mould & Restoration Co. - Business Automation Platform**
**Users:** Field technicians on mobile devices | **Location:** Melbourne, Australia
**Tech Stack:** React/TypeScript + Supabase + PWA

---

## Quick Reference

### Mobile-First Standards (Non-Negotiable)
- Test 375px viewport FIRST
- Touch targets >=48px (gloves requirement)
- Currency: $X,XXX.XX | Date: DD/MM/YYYY | Time: Australia/Melbourne

### Pricing Rules (Absolute)
- **13% discount cap** (0.87 multiplier) - NEVER exceed
- GST always 10% | Equipment: Dehumidifier $132, Air Mover $46, RCD $5

### Australian Standards
- Currency: $X,XXX.XX | Phone: (03) XXXX XXXX or 04XX XXX XXX
- Date: DD/MM/YYYY | Timezone: Australia/Melbourne | ABN: XX XXX XXX XXX

---

## Documentation

All docs live in `docs/`. Key files:

```
docs/PRD.md                        # Product requirements (stages 1-12)
docs/TODO.md                       # Current task list (forward-looking)
docs/PLANNING.md                   # Architecture & deployment readiness
docs/WORKFLOW.md                   # Session summaries & decisions
docs/JOB_COMPLETION_PLAN.md        # Phase 2 job completion plan
docs/JOB_COMPLETION_PRD.md         # Phase 2 requirements
docs/PHASE_2_EXECUTION.md          # Phase 2 execution tracker
docs/API_AUDIT.md                  # API security audit
docs/MCP_STACK.md                  # MCP server configuration
docs/COST_CALCULATION_SYSTEM.md    # Pricing/cost calc docs
docs/database_technical_audit.md   # DB schema audit
```

---

## MCP Servers

| Server | Purpose |
|--------|---------|
| Supabase | Database operations, RLS policies, migrations |
| Playwright | Visual testing at 375px/768px/1440px |
| GitHub | Git operations, branches, commits |

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
- **Built:** 91 components, 26 pages, 22 hooks, 10 Edge Functions, 22 DB tables
- **Security:** RLS on all tables, rate limiting, XSS/CSP, Sentry monitoring
- **Deployment:** Vercel with security headers, PWA with service worker

### Next: Job Completion Workflow (Phase 2)
- Job completion form, job report PDF, admin approval flow
- Invoice helper, payment tracking, audit trail
- See `docs/TODO.md` for full task list

### Active Tasks
- Framer -> Supabase lead capture
- Email domain switch (mouldandrestoration.com.au)
- API key rotation
- Dev Supabase project + Vercel preview env vars
- Team walkthrough with technicians

### Git Workflow
- Production branch: `production` (Vercel production deployment)
- Development branch: `main` (Vercel preview deployment)
- Working directory: `~/mrc-app-1`

---

*Last Updated: 2026-04-03*

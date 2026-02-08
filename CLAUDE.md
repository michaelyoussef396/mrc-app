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
context/PRD.md                # Product requirements
context/PM_WORKFLOW.md        # Workflow guide
context/active_sprint.md      # Current sprint spec
context/MASTER-TODO.md        # Master backlog
context/AGENTS.md             # Agent instructions
context/Channel.md            # Communication channel
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

## Recent Session (2026-02-08)

### Phase 1: Technician Role (Current)
- **Status:** 🟡 80% Complete
- **Completed:** Dashboard, Jobs Page, Inspection Form UI (10 sections)
- **Next:** Skills Infrastructure, Database Wiring, PDF Generation

**Critical Next Step:** Run `claude` with `context/active_sprint.md` to build skills library.

---

*Last Updated: 2026-02-08*

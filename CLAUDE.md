# MRC Lead Management System

Mould & Restoration Co. — mobile-first field tech app for mould inspection and remediation.
React 18 + TypeScript + Supabase + Vite + Tailwind + shadcn/ui | PWA with offline support

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run typecheck` — TypeScript check
- `npx supabase functions deploy <name> --project-ref ecyivrxjpsmjmexqatym` — deploy Edge Function

## Architecture
- /src/auth — auth logic (HIGH RISK — always ask before touching)
- /src/pages — page components
- /src/components — UI only, no business logic
- /src/hooks — custom hooks
- /src/types — all TypeScript types
- /src/lib — Supabase client + utils
- /supabase/functions — 12 Edge Functions (canonical list: `docs/edge-function-attribution-manifest.md`)
- /supabase/migrations — DB migrations

## Business Rules (Non-Negotiable)
- 13% discount cap (0.87 multiplier) — NEVER exceed
- GST always 10% on subtotal
- Equipment: Dehumidifier $132/day, Air Mover $46/day, RCD $5/day
- Mobile-first: 375px primary, 48px touch targets, no horizontal scroll
- Australian: DD/MM/YYYY, $X,XXX.XX, (03) XXXX XXXX, ABN XX XXX XXX XXX
- Auto-save every 30 seconds on forms
- Zero data loss on navigation

## Git Workflow
- `main` — development (Vercel preview deploys)
- `production` — live app (Vercel production deploys)
- Never push directly to production — always merge from main
- Working directory: ~/mrc-app-1

## Database
- Supabase project ref: ecyivrxjpsmjmexqatym
- 22 tables with RLS on all tables
- Never modify schema without migration + explicit approval

## Co-Owner Rules
- Glen and Clayton — consult before architectural decisions
- Never touch /src/auth without asking
- Vryan — marketing/sales for white-label venture

## Current State (April 2026)
- Phase 1: COMPLETE — inspection workflow end-to-end
- Phase 2: IN PROGRESS — job completion workflow
- See @docs/TODO.md for current tasks
- See @docs/PHASE_2_EXECUTION.md for build plan
- See @docs/JOB_COMPLETION_PRD.md for full spec

## Deep Docs (read on-demand with Read tool, NOT auto-loaded)
- docs/PRD.md — full product requirements
- docs/JOB_COMPLETION_PRD.md — job completion spec (ACTIVE BUILD)
- docs/JOB_COMPLETION_PLAN.md — phased build order
- docs/PHASE_2_EXECUTION.md — execution tracker
- docs/API_AUDIT.md — API inventory + rotation needs
- docs/MCP_STACK.md — MCP server configuration
- docs/DEPLOYMENT.md — deployment guide
- docs/COST_CALCULATION_SYSTEM.md — pricing logic
- docs/database_technical_audit.md — schema reference

## Key Principles
1. Manual over automatic — explicit user selection always
2. Data integrity non-negotiable — every field must trace to real DB records
3. Verify before building — check existing schema/code first
4. Pattern replication — copy proven patterns, don't invent new ones
5. Production-first — features must be visibly functional

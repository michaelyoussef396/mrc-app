# MRC Lead Management System

Mould & Restoration Co. — mobile-first field tech app for mould inspection and remediation.
React 18 + TypeScript + Supabase + Vite + Tailwind + shadcn/ui | PWA with offline support

## SUPABASE PROJECT REFS — READ BEFORE ANY REF-SCOPED COMMAND

Two near-identical projects live in the MRC org. The wrong ref is a production incident.

| env      | ref                    | role                                          |
|----------|------------------------|-----------------------------------------------|
| **PROD** | `ecyivrxjpsmjmexqatym` | LIVE — mrcsystem.com. Real customer path.      |
| **DEV**  | `ctppzqnysmzynkxjlzta` | Sandbox clone (ap-southeast-1). Safe to break. |

**Rule:** Any command carrying `--project-ref` — EF deploy, `db dump`, secrets/Vault,
type-gen, direct DB ops — MUST state the target ref AND its role in plain English and get
Michael's explicit confirmation BEFORE running. Never infer the target. Never default to PROD.

**Edge Functions:** CLI only, human-applied, global-immediate (no staging buffer). CC prepares
the exact command; Michael runs it. Same discipline for migrations.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run typecheck` — TypeScript check
- `npx supabase functions deploy <name> --project-ref ecyivrxjpsmjmexqatym` — deploy Edge Function

## Architecture

- /src/auth — auth logic (HIGH RISK — always ask before touching)
- /src/components — UI only, no business logic
- /supabase/functions — 12 Edge Functions (canonical list: `docs/edge-function-attribution-manifest.md`)

## Business Rules (Non-Negotiable)

- 13% discount cap (0.87 multiplier) — NEVER exceed
- GST always 10% on subtotal
- Equipment: Dehumidifier $119/day, Air Mover $46/day, HEPA Air Scrubber $100/unit/day, RCD $5/day
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

- RLS on all tables
- Never modify schema without migration + explicit approval

## Co-Owner Rules

- Glen and Clayton — consult before architectural decisions
- Never touch /src/auth without asking
- Vryan — marketing/sales for white-label venture

## Current State (May 2026)

- Phase 1: COMPLETE — inspection workflow end-to-end
- Phase 2: COMPLETE — job completion workflow (2 known gaps tracked as L1 + L2 in TODO.md)
- Phase 3: COMPLETE — AI summary versioning (Stages 3.1-3.5 shipped 2026-05-02)
- Phase 4: PARTIAL — photo integrity Stages 4.1/4.1.5/4.2/4.3 shipped (2026-05-05 to 2026-05-11); Stages 4.4-4.7 deferred post-launch
- PDF Pipeline Rebuild: CODE COMPLETE (2026-05-24) — server-rendered hard-save via api/render-pdf with html_hash mismatch guard at send time + ReportVersionHistory UI. Migration applied + EF deployed in same wave. See docs/PDF_PIPELINE_PLAN.md. Post-launch cleanup tracked as PDF-CL1..7 in TODO.md.
- Pre-launch hardening underway. See docs/TODO.md for current tasks (Launch Model + L/S/T sections)
- See docs/PHASE_2_EXECUTION.md for build plan
- See docs/JOB_COMPLETION_PRD.md for full spec

## Deep Docs (read on-demand with Read tool, NOT auto-loaded)

**Docs are NOT auto-loaded.** Every brief must explicitly name what to read, e.g.
`Read: @docs/TODO.md @docs/JOB_COMPLETION_PRD.md`. Without this, work proceeds from
stale assumptions — a stale claim in TODO.md was caught on 2026-08-17 only because
that file was auto-loaded at the time.

- docs/PRD.md — full product requirements
- docs/JOB_COMPLETION_PRD.md — job completion spec (ACTIVE BUILD)
- docs/JOB_COMPLETION_PLAN.md — phased build order
- docs/PHASE_2_EXECUTION.md — execution tracker
- docs/API_AUDIT.md — API inventory + rotation needs
- docs/MCP_STACK.md — MCP server configuration
- docs/DEPLOYMENT.md — deployment guide
- docs/COST_CALCULATION_SYSTEM.md — pricing logic
- docs/database_technical_audit.md — schema reference
- docs/PDF_PIPELINE_PLAN.md — PDF pipeline rebuild execution tracker (2026-05-24)

## Key Principles

1. Manual over automatic — explicit user selection always
2. Data integrity non-negotiable — every field must trace to real DB records
3. Verify before building — check existing schema/code first
4. Pattern replication — copy proven patterns, don't invent new ones
5. Production-first — features must be visibly functional

---

## MRC Custom Rules — Preserved Across GitNexus Reindexes

### Auth & RLS — DO NOT TOUCH WITHOUT EXPLICIT INSTRUCTION

- Never edit `/src/auth/`, `src/contexts/AuthContext.tsx`, or any `supabase/migrations/*_auth*.sql` unless the prompt names the file explicitly.
- Audit triggers are append-only. Never modify an existing migration — create a new one.

### Phase 2 audit_logs foundation — VERIFIED LIVE

- 29 audit triggers across 10 tables (leads, inspections, inspection_areas, subfloor_data, moisture_readings, subfloor_readings, photos, user_roles, invoices, job_completions). DO NOT add or modify these triggers without an explicit instruction.
- audit_log_trigger() reads auth.uid() first, falls back to current_setting('app.acting_user_id', true)::uuid. SYSTEM_USER_UUID = a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f.
- Edge Function attribution canon: docs/edge-function-attribution-manifest.md. Bucket A = frontend-called (passes user_id). Bucket B = system (uses SYSTEM_USER_UUID via per-write RPC). Bucket C = read-only.
- Before any new EF: classify Bucket A/B/C and add to manifest.

### Pre-flight discipline (PERSISTENT MEMORY)

- Schema state ALWAYS verified via mcp**supabase**list_migrations + information_schema, NEVER via repo file presence. See feedback_preflight_schema_verification.md.
- Env var state ALWAYS verified via CLI output (`npx supabase secrets list`), dashboard, or runtime invocation, NEVER from chat confirmation. See feedback_env_var_verification.md.

### Pricing — sacred (Phase 7 not yet started)

- src/lib/calculations/pricing.ts: 13% discount cap (0.87 multiplier) is a HARD limit. Equipment never discounted. GST always 10% on subtotal.
- Before any pricing edit, run gitnexus_impact on calculatePrice and report blast radius.

### PR / merge conventions

- main = development → Vercel preview. production = live → mrcsystem.com.
- Always merge with "Create a merge commit". Never squash, never rebase.
- PR #38 (5965e6b PDF restructure) NEVER cherry-picked or merged.
- useRevisionJobs.ts left dormant — do not activate.

### Working directory + formatting

- Working dir is ~/mrc-app-1 ONLY. Never ~/Mould/mrc-app.
- Mobile-first: 375px primary viewport. 48px touch targets. UI changes verified at 375px before merge.
- Australian formatting: DD/MM/YYYY, AUD $X,XXX.XX, Australia/Melbourne timezone, (03) XXXX XXXX phones.
- customer_preferred_date and customer_preferred_time NEVER cleared (PR #39 schema

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **mrc-app** (6893 symbols, 12257 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/mrc-app/context` | Codebase overview, check index freshness |
| `gitnexus://repo/mrc-app/clusters` | All functional areas |
| `gitnexus://repo/mrc-app/processes` | All execution flows |
| `gitnexus://repo/mrc-app/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
| Work in the Pages area (278 symbols) | `.claude/skills/generated/pages/SKILL.md` |
| Work in the Hooks area (155 symbols) | `.claude/skills/generated/hooks/SKILL.md` |
| Work in the Api area (150 symbols) | `.claude/skills/generated/api/SKILL.md` |
| Work in the Leads area (132 symbols) | `.claude/skills/generated/leads/SKILL.md` |
| Work in the Ui area (102 symbols) | `.claude/skills/generated/ui/SKILL.md` |
| Work in the Scripts area (74 symbols) | `.claude/skills/generated/scripts/SKILL.md` |
| Work in the Job-completion area (46 symbols) | `.claude/skills/generated/job-completion/SKILL.md` |
| Work in the Schedule area (43 symbols) | `.claude/skills/generated/schedule/SKILL.md` |
| Work in the Pdf area (34 symbols) | `.claude/skills/generated/pdf/SKILL.md` |
| Work in the Generate-inspection-pdf area (32 symbols) | `.claude/skills/generated/generate-inspection-pdf/SKILL.md` |
| Work in the Photos area (29 symbols) | `.claude/skills/generated/photos/SKILL.md` |
| Work in the Cluster_16 area (23 symbols) | `.claude/skills/generated/cluster-16/SKILL.md` |
| Work in the Offline area (21 symbols) | `.claude/skills/generated/offline/SKILL.md` |
| Work in the Testsprite_tests area (17 symbols) | `.claude/skills/generated/testsprite-tests/SKILL.md` |
| Work in the Contexts area (16 symbols) | `.claude/skills/generated/contexts/SKILL.md` |
| Work in the Technician area (14 symbols) | `.claude/skills/generated/technician/SKILL.md` |
| Work in the Admin area (13 symbols) | `.claude/skills/generated/admin/SKILL.md` |
| Work in the Technicians area (13 symbols) | `.claude/skills/generated/technicians/SKILL.md` |
| Work in the Dashboard area (12 symbols) | `.claude/skills/generated/dashboard/SKILL.md` |
| Work in the Components area (12 symbols) | `.claude/skills/generated/components/SKILL.md` |

<!-- gitnexus:end -->

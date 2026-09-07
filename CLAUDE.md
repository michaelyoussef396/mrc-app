# MRC Lead Management System

Mould & Restoration Co. — mobile-first field tech app for mould inspection and remediation.
React 18 + TypeScript + Supabase + Vite + Tailwind + shadcn/ui | PWA with offline support

Shared rules for every agent in this repo (Claude Code and Codex alike) live in `AGENTS.md`; Claude Code imports it here:
@AGENTS.md

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
- `npm run typecheck` — TypeScript check (currently checks zero files, see T7 in docs/TODO.md)
- `npx tsc -p tsconfig.app.json --noEmit` — the real type check. The error count differs per worktree (99, 122 and 135 were all measured on 31 Aug 2026). Gate on no NEW error lines against a baseline taken in the same tree the same day, never on the count.
- `npx supabase functions deploy <name> --project-ref ecyivrxjpsmjmexqatym` — deploy Edge Function
- Git habits for multi-worktree work: docs/GIT_HABITS.md

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

## Database

- RLS on all tables
- Never modify schema without migration + explicit approval

## Co-Owner Rules

- Glen and Clayton — consult before architectural decisions
- Never touch /src/auth without asking
- Vryan — marketing/sales for white-label venture

## Current State (May 2026)

- Phase 1: COMPLETE — inspection workflow end-to-end
- Phase 2: COMPLETE — job completion workflow (the L1/L2 gaps are closed: L1 resolved by pricing canon C1 and the HEPA work, L2 cancelled 2026-05-12; one L1 remnant is carried as engineering debt in docs/TODO.md)
- Phase 3: COMPLETE — AI summary versioning (Stages 3.1-3.5 shipped 2026-05-02)
- Phase 4: PARTIAL — photo integrity Stages 4.1/4.1.5/4.2/4.3 shipped (2026-05-05 to 2026-05-11); Stages 4.4-4.7 deferred post-launch
- PDF Pipeline Rebuild: CODE COMPLETE (2026-05-24) — server-rendered hard-save via api/render-pdf with html_hash mismatch guard at send time + ReportVersionHistory UI. Migration applied + EF deployed in same wave. See docs/PDF_PIPELINE_PLAN.md. Post-launch cleanup (PDF-CL items) carried as engineering debt in docs/TODO.md, old TODO.md lines 1011–1028.
- Current tasks: docs/TODO.md, tracked by stable ID (P0-n, P1-n, Tn...). Detail for every item lives in docs/MRC_MASTER_BACKLOG.md.
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

## Codex review

The Codex plugin for Claude Code (`openai/codex-plugin-cc`) is installed. Codex is a reviewer here, never an editor. Rulings 1–10, both Codex roles and the full procedure live in `AGENTS.md` (Roles) and `docs/CODEX_WORKFLOW.md`; the mandatory Claude Code procedure is the block below. One review per unit of work, then stop — no fix loop, no second round. `/codex:rescue` and `/codex:transfer` are not used in this repo.

## Claude Code specifics

- **Hooks** (`.claude/settings.json`, scripts in `.claude/hooks/`): SessionStart `session-start.sh` prints the branch banner and creates or reuses `docs/sessions/<date>-<branch-slug>.md`, printing its path and, when an earlier log exists for the branch, that log's "Resume from here". PreToolUse Edit|Write: `protect-files.sh` (denies edits under `.claude/hooks/*`), `warn-large-files.sh`, `scan-secrets.sh`. PreToolUse Bash: `block-dangerous-commands.sh`, `block-supabase-prod.sh`. PreToolUse on Supabase MCP writes: `block-supabase-mcp-writes.sh`. PostToolUse Edit|Write: `format-on-save.sh`. The same scripts are also registered at user scope from `~/.claude/hooks/`, so the banner prints twice.
- **Permission layer:** `permissions.deny` in `.claude/settings.json` is the control on auto mode — anything naming the PROD ref, `db push`, `db reset`, `link`, `--linked`, `config push`, `migration repair`, `npm install`, `git add -A/-u/--all`, `git commit -a`, force pushes, pushes to `production`, `git clean`; `gh pr merge` asks.
- **Agents:** 18 custom agents in `.claude/agents/`. Every sub-agent logs its own step-log lines prefixed `[<agent-name>]` (session-log rule in `AGENTS.md`).
- **Session log:** the SessionStart hook creates it; fill the header first, append a step-log line before each unit of work, write every `codex resume <threadId>` the moment it is printed. Never create a second log for a branch; append to the newest.
- **Companion script:** `/Users/michaelyoussef/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs`. `CLAUDE_PLUGIN_ROOT` is empty in the Bash tool; re-resolve after a plugin update (`docs/CODEX_WORKFLOW.md` §3).

## CODEX REVIEW IS NOT OPTIONAL ON CODE

Every session that changes application code stops for a Codex review before opening a PR. Not after. Not "if time allows."

**CC runs it, then stops.** `/codex:adversarial-review` and `/codex:review` keep `disable-model-invocation: true` in their command frontmatter (verified 2026-09-06 against plugin `openai-codex/codex/1.0.6`) and are never called. The flag blocks the slash command, not the plugin's companion script, which CC invokes directly — exact string, base rule and `Target:` check in `docs/CODEX_WORKFLOW.md` §3–5. The enforcement is still a **hard stop**; it moves from before the review to after it. CC never fixes a finding, never re-reviews, never opens a PR on its own triage. Being unable to run the slash command is not permission to skip the review.

The wider brief-to-merge flow these nine steps sit inside is in `AGENTS.md` (Workflow) — deliberately not restated here, so the two cannot drift.

1. Finish the unit of work and commit it. The review reads `origin/main...HEAD`; uncommitted work is invisible to it.
2. Measure: `git diff --numstat origin/main...HEAD -- . ':(exclude)docs/sessions/' | awk '{a+=$1;d+=$2} END{print a+d}'`, run from the worktree root. Over 150: split, or ask Michael for a waiver and log it. A byte-identical restore of an unchanged tracked file does not count toward that (precedent, 2026-09-05).
3. Check the diff for customer PII. Any hit: no review; "Do not review" entry in the log instead.
4. Run it: `node /Users/michaelyoussef/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs adversarial-review --wait --cwd <worktree> --base origin/main -- <focus>`, with `2> <file>` so the stderr line carrying the thread id is kept. Never `--base main`, never without `--base`, never `--help` on that subcommand.
5. Print the `Target:` line and the line count before anything else. Target not `branch diff against origin/main` (or the pre-declared parent of a stacked branch): abort, discard unread, report.
6. Write `codex resume <threadId>` into the session log immediately — from stderr `Thread ready (<id>)` or `node <script> status --cwd <worktree>`.
7. Present every finding verbatim. Apply nothing.
8. **STOP** in this exact shape and wait:

   ```
   CODEX REVIEW DONE — STOPPING
   branch: <branch>   base: origin/main   reviewable lines (excl. docs/sessions/): <N>
   Target: <verbatim>   Verdict: <verbatim>   findings: <n>
   Resume in Codex: codex resume <threadId>   (written to docs/sessions/<log>.md)
   ```

9. Michael triages. Log the run in `docs/codex-review-log.md`, including the `Target:` line verbatim and the thread id. Only then the PR.

An investigate-first session that produces no code is exempt — but the moment its findings turn into code, this applies.

If a session merges application code without a logged review, that is a process failure and gets a ledger entry.

CC reads and prints the `Target:` line before anything else. `--base main` in `~/mrc-app-1` silently reviews against the stale local `main` (#653 class); a bad `--base` exits 0.

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

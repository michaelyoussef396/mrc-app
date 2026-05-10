<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **mrc-app** (8099 symbols, 11829 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

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
| Work in the Pages area (239 symbols) | `.claude/skills/generated/pages/SKILL.md` |
| Work in the Hooks area (103 symbols) | `.claude/skills/generated/hooks/SKILL.md` |
| Work in the Leads area (85 symbols) | `.claude/skills/generated/leads/SKILL.md` |
| Work in the Scripts area (74 symbols) | `.claude/skills/generated/scripts/SKILL.md` |
| Work in the Api area (64 symbols) | `.claude/skills/generated/api/SKILL.md` |
| Work in the Job-completion area (40 symbols) | `.claude/skills/generated/job-completion/SKILL.md` |
| Work in the Generate-inspection-pdf area (31 symbols) | `.claude/skills/generated/generate-inspection-pdf/SKILL.md` |
| Work in the Schedule area (29 symbols) | `.claude/skills/generated/schedule/SKILL.md` |
| Work in the Services area (27 symbols) | `.claude/skills/generated/services/SKILL.md` |
| Work in the Pdf area (24 symbols) | `.claude/skills/generated/pdf/SKILL.md` |
| Work in the Offline area (18 symbols) | `.claude/skills/generated/offline/SKILL.md` |
| Work in the Testsprite_tests area (17 symbols) | `.claude/skills/generated/testsprite-tests/SKILL.md` |
| Work in the Tools area (16 symbols) | `.claude/skills/generated/tools/SKILL.md` |
| Work in the Technician area (16 symbols) | `.claude/skills/generated/technician/SKILL.md` |
| Work in the Ui area (14 symbols) | `.claude/skills/generated/ui/SKILL.md` |
| Work in the Admin area (11 symbols) | `.claude/skills/generated/admin/SKILL.md` |
| Work in the Calculations area (9 symbols) | `.claude/skills/generated/calculations/SKILL.md` |
| Work in the Supabase area (9 symbols) | `.claude/skills/generated/supabase/SKILL.md` |
| Work in the Technicians area (9 symbols) | `.claude/skills/generated/technicians/SKILL.md` |
| Work in the Dashboard area (6 symbols) | `.claude/skills/generated/dashboard/SKILL.md` |

<!-- gitnexus:end -->

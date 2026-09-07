<!-- Owner: Claude Code, which writes this file for whoever comes next — including a
     Codex/Lane C session, which reads it but records its own work in the session log
     (AGENTS.md, Roles → Builder-Codex). The "Agent" field below records who did the
     work, not who typed this file.
     Purpose: what the next window inherits. Written before the window closes, not
     after — an unwritten handoff is a cost the next session pays in rediscovery.
     Lifecycle: REWRITTEN each window. Carry anything durable into the session log
     first; this file is working state, the log is the record.
     Field set matches the OKF session entry (docs/MRC_MASTER_BACKLOG.md, "THE
     KNOWLEDGE LAYER — OKF") so promoting it is a reformat, not a re-think.
     Worktree-local: `.ai/` is gitignored and belongs to THIS worktree only. Never
     read another worktree's `.ai/`. No customer data here — it is invisible to the
     diff-scoped PII gate. -->

# Handoff

- Date: <fill>
- Agent: <fill: who did the work — Claude Code | Codex | chat>
- Branch: <fill>
- Commit: <fill: sha, or none>

## Did

What actually landed. Commits and verified outcomes, not intentions.

- <fill>

## Did NOT

Deliberate non-actions, each with its reason. **This is the field that matters**: it
is what stops the next session re-investigating something already ruled out. Pending
work does not belong here — it belongs under Open. Keeping the two apart is the whole
value of the section.

- <fill>

## Broke

- <fill: anything that got worse, or "nothing known">

## Open

What the next session inherits, most important first. One line each, with enough
context to act on without reading this whole file.

- <fill>

## Resume

- Next command: <fill: the exact command, runnable as written from the worktree root>
- Uncommitted files: <fill: `git status --porcelain` output, or none>
- Untested: <fill: what has not been run, and why>

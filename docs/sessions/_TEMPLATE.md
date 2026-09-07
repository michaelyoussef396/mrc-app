<!-- {{TOKEN}} fields are filled by .claude/hooks/session-start.sh on startup/clear.
     <fill: ...> fields are filled by hand as the first step of the session.
     Builder-Codex: never create a second log for a branch. Append to the newest
     docs/sessions/*-<branch-slug>.md; only if none exists copy this file by hand,
     replace every {{TOKEN}}, and set Tool to Codex. -->
# Session log — {{DATE}} — {{BRANCH}}

## Header

- Date: {{DATE}}
- Lane: <fill: R | PDF | L | G1 | C | docs>
- Branch: {{BRANCH}}
- Worktree: {{WORKTREE}}
- Tool: {{TOOL}}
- Model: <fill: e.g. claude-fable-5-1 or gpt-6-astra/high>
- Baseline commit: {{BASELINE_COMMIT}}
- Starting tsc error lines: <fill: 99 at dc55c15; state "inherited" or the measured count from `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"` — gate is no NEW lines>
- Starting test count: <fill: 71 files / 1222 at dc55c15; state "inherited" or the measured count from `npx vitest run 2>&1 | tail -n 6`>
- Session id: {{SESSION_ID}}

## Intent

<fill: one line>

## Touching

<fill: every file this session will edit, listed BEFORE the edit and kept current — Reviewer-Codex flags any diff whose files are not listed here>

## Step log

Append a line BEFORE each unit of work. Sub-agents prefix every line with `[<agent-name>]`.
Format: `- HH:MM · tool · agent · what · files · outcome` — tool is `CC` or `codex`, so both agents' work reads in one log.

- HH:MM · CC · CC · filled header · (none) · <fill>

## Codex threads

Write `codex resume <threadId>` here the moment it is printed — on stderr as `Thread ready (<id>)`, or by `node <companion> status`. The plugin SessionEnd hook deletes every job of the session, running or finished.

- (none yet)

## Review

- Target: <verbatim `Target:` line from the companion output — anything other than the pre-declared base = abort and report>
- Diff lines excl. docs/sessions/: <from `git diff --numstat origin/main...HEAD -- . ':(exclude)docs/sessions/' | awk '{a+=$1;d+=$2} END{print a+d}'`>
- Verdict: <approve | needs-attention | error>
- Findings: <count>
- codex-review-log row: <added: date + branch | pending: closing PR>

## Did

-

## Did NOT

-

## Broke

- nothing known

## Open

-

## Resume from here

<!-- resume:start -->
<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit between the markers; never quote the marker lines elsewhere in this log -->

- Rewritten by the Stop hook after the first turn. Until then, or when no Stop hook runs (Codex, a session that added the hook), fill by hand:
- Next command: <exact command>
- Uncommitted files: <`git status --porcelain` output, or none>
- Untested: <what has not been run>
<!-- resume:end -->

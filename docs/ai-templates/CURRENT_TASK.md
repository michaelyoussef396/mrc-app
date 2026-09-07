<!-- Owner: Claude Code. Codex writes nothing here.
     Purpose: the one atomic unit currently in flight.
     Lifecycle: OVERWRITTEN per unit. When this unit is reviewed and closed, replace
     this file with the next unit — do not accumulate history here; the session log
     under docs/sessions/ is the durable record.
     Worktree-local: `.ai/` is gitignored and belongs to THIS worktree only. Never
     read another worktree's `.ai/`. No customer data in this file — it is invisible
     to the diff-scoped PII gate. -->

# Current task

## Unit

<fill: one sentence. The smallest thing that can be built, tested and reviewed as
a whole. If the sentence needs the word "and", it is probably two units.>

## Where

- Branch: <fill>
- Worktree: <fill: absolute path>
- Base: <fill: origin/main, or the pre-declared parent of a stacked branch>
- Session log: <fill: docs/sessions/YYYY-MM-DD-branch-slug.md>

## Files to touch

List every file BEFORE editing it, and keep the list current. This mirrors the
`## Touching` section of the session log, whose own text is "Reviewer-Codex flags
any diff whose files are not listed here" — so an unlisted edit costs a review round.

- <fill: path — why it has to change>

## Done when

<fill: the observable condition, not the intention. "tsc shows no new error lines
against a baseline measured in this tree today" beats "types are fine". If it cannot
be checked by running something, it is not a done-when.>

## Not in this unit

Name what a reader could reasonably expect to find here and is deliberately out of
scope, so the next session does not re-investigate a question already settled.

- <fill>

## Status

- State: <fill: building | tests | committed | awaiting review | triaged | closed>
- Last step-log line: <fill: the HH:MM of the matching entry in the session log>

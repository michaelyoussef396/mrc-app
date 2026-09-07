<!-- Owner: Claude Code. Codex writes nothing here.
     Purpose: the pre-merge package — everything needed to decide the merge in one
     read, without reconstructing it from the session log and the review log.
     Written AFTER triage, never before: a package assembled before the review is a
     claim about intentions, not about what shipped.
     Lifecycle: OVERWRITTEN per unit, at the point the unit is ready to merge.
     Worktree-local: `.ai/` is gitignored and belongs to THIS worktree only. No
     customer data here — it is invisible to the diff-scoped PII gate. -->

# Final review

## Unit

<fill: what shipped and why, one paragraph. Written for someone deciding whether to
merge it, not as a changelog of commits.>

## Gates

Every cell is a measurement taken in THIS tree, and every cell records **what was run
and what it returned** — not a verdict word. A row that can be satisfied by asserting
success is not a gate. Where a number differs from the one in `AGENTS.md`, say so and
say why.

| gate | command actually run | what it returned |
|---|---|---|
| reviewable lines | <fill: the exact command, including every `:(exclude)` pathspec> | <fill: the number> |
| type check | `npx tsc -p tsconfig.app.json --noEmit` | <fill: error-line count, against a baseline measured in this tree today. The gate is **no new lines**, never the count itself.> |
| tests | `npx vitest run` | <fill: files / tests. Must not drop.> |
| customer PII | <fill: the exact search run over the diff — and over `.ai/`, which is gitignored and therefore invisible to a diff-scoped check> | <fill: the match count and what the matches were. Not the word "none".> |

## Review

- Target (verbatim): <fill: the `Target:` line from .ai/CODEX_REVIEW.md, copied. A
  merge decided from this file cannot be sound without it — it is the only evidence
  the review was aimed at this diff.>
- Row in `docs/codex-review-log.md`: <fill: added — date + branch, or: pending>
- Verdict: <fill>
- Findings: <fill: n>
- Dispositions: <fill: n confirmed-fixed, n deferred, n rejected-with-reason, n needs-investigation>

## Carried unfixed

Findings that survive this merge, each with where it is carried and who owns it. If
there are none, write "none" — a blank section reads as an omission.

- <fill>

## Proposed OKF updates

**Proposals only. No agent writes to `~/okf`** — Michael promotes by hand. Two things
to know before filling this in, because the repo's own documents disagree:
`docs/MRC_MASTER_BACKLOG.md`, "THE KNOWLEDGE LAYER — OKF" *proposes* the sub-area and
says agents may write to it freely; the operative rule is the later note in the same
file, "Nothing writes to ~/okf from this machine". The later note wins. And `~/okf`
may not exist on this machine at all — check before assuming these blocks have a
destination. Cite the KNOWLEDGE LAYER section for the entry *shape* only — that part
is accurate.

Write each block ready to paste, so promotion is a copy rather than an edit.

### For `projects/mrc/sessions.md`

Ten lines, not a transcript. "Did NOT" is the field that earns its place.

```
## <fill: date> — <fill: session name>
Agent:    <fill: Claude Code | Codex | chat>
Branch:   <fill>          Commit: <fill: sha or none>

Did:      <fill: what actually landed>
Did NOT:  <fill: what was deliberately left, and why>
Broke:    <fill: anything that got worse, or nothing>
Open:     <fill: what the next session inherits>
```

### For `projects/mrc/bugs.md`

Use the entry template in `docs/BUG_LEDGER.md` §2 — it is the source of truth, and it
is stricter than the summary in the backlog: **Class**, **Mechanism** (with file:line),
**Why it was hard to find** (MANDATORY — "UNKNOWN" is acceptable, omitting the field is
not), **Fixed** (sha and date, or the tracking id), **Verified** (how, and by what
evidence — a chat claim is not verification). Duplicating a repo ledger entry here is
deliberate: the repo copy dies with the repo, the OKF copy outlives it.

- <fill, or "none this unit">

### For `projects/mrc/decisions.md`

What was decided and why, so it is not relitigated. A ruling that exists only in a chat
transcript will be relitigated.

- <fill, or "none this unit">

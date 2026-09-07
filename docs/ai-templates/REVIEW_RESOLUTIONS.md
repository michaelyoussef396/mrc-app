<!-- Owner: Michael's triage, transcribed by Claude Code. Codex writes nothing here.
     Purpose: one disposition for every finding in .ai/CODEX_REVIEW.md, so a finding is
     never silently dropped and never silently fixed.
     No agent applies a finding on its own judgement and no agent re-reviews: findings
     go to Michael, and the fix loop does not run without his decision. Every finding
     gets a row — including the ones that turn out not to be real. A finding with no
     row is the failure this file exists to prevent.
     Lifecycle: ONE review per file, alongside the .ai/CODEX_REVIEW.md it triages;
     replaced when the next review runs. Carry anything unresolved into the session
     log's Open section before replacing it.
     Worktree-local: `.ai/` is gitignored and belongs to THIS worktree only. No
     customer data here. -->

# Review resolutions

Review: <fill: the Date and Thread from .ai/CODEX_REVIEW.md — they identify which run
these dispositions belong to>

| finding | disposition | evidence / reason | decided by |
|---|---|---|---|
| <fill: F1> | <fill: one of the four below> | <fill> | <fill: Michael, date> |

## The four dispositions

- **confirmed-fixed** — changed, and the change verified **by content, not by exit
  code**. Name what was run and what it showed. "Tests pass" is not evidence the
  finding is closed unless a test covers the finding.
- **deferred** — real, not fixed now. Name where it is carried: a `docs/BUG_LEDGER.md`
  id, a `docs/TODO.md` row, or a named step in a lane plan. A deferral with no
  destination is a drop wearing a better word.
- **rejected-with-reason** — not a defect, or not one worth the change. State the
  reason. "The reviewer was wrong" is not a reason; what the reviewer did not know is.
- **needs-investigation** — cannot be triaged from the finding alone. Name the question
  that would settle it and who is answering it, otherwise this becomes a parking space.

## Carried

Every finding dispositioned `deferred` or `needs-investigation`, restated in one line
each, so the next session inherits them without reading the review. If none, write
"none" rather than leaving this empty — an empty section reads as unfinished, not clean.

- <fill>

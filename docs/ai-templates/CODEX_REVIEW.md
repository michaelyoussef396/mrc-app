<!-- Owner: one Reviewer-Codex run. Its findings are the only content, and nothing
     may be added to them — but Codex does not write this file, because Reviewer-Codex
     has no write path in this repo (AGENTS.md, Roles: "Do not edit files";
     docs/CODEX_WORKFLOW.md ruling 7: "there is no write path for a reviewer").
     Claude Code TRANSCRIBES the run here verbatim (CLAUDE.md step 7, "Present every
     finding verbatim") and adds nothing of its own — the same arrangement
     .ai/REVIEW_RESOLUTIONS.md uses for Michael's triage. Claude Code writes no other
     .ai/ file from this content and APPLIES NOTHING from it: triage is Michael's,
     review-then-stop.
     Lifecycle: ONE review per file, replaced when the next review runs. The durable
     record of every review is docs/codex-review-log.md — write the row there.
     Worktree-local: `.ai/` is gitignored and belongs to THIS worktree only. No
     customer data here; it is invisible to the diff-scoped PII gate, and Codex
     self-collect mode reads untracked files. -->

# Codex review

## Run

- Date: <fill: YYYY-MM-DD>
- Target: <fill: the `Target:` line VERBATIM, copied not paraphrased. Anything other
  than the pre-declared base means the review was aimed at something other than this
  unit — abort, discard the findings unread, and report that.>
- Base: <fill: origin/main, or the pre-declared parent of a stacked branch>
- Reviewable lines: <fill: the mechanical count AND the exact pathspec it was counted
  with, including every `:(exclude)`>
- Verdict: <fill: approve | needs-attention | error>
- Thread: <fill: codex resume THREAD_ID — written into the session log the moment it
  is printed, not at the end of the run>
- Focus: <fill: the focus string this run was given>

## Findings

One block per finding. The four EVIDENCE fields are File, Lines, Predicted failure and
Reproducing test: a finding missing any of them is discarded on form (AGENTS.md, Roles
→ Reviewer-Codex). "Smallest fix" is a fifth field and is not part of that test — a
finding is not discarded for lacking it. A finding whose Reproducing test cannot be
stated is kept and marked **UNVERIFIED**: it is a lead, not a result, and must not be
triaged as though it were one.

Scope, in priority order: cross-tenant data access, secrets in tracked files,
under-authorised endpoints, data loss on write or migration paths, races on concurrent
writes. Style, naming and formatting are out of scope.

### F1 — <fill: one-line claim> — <fill: high | medium | low>

- File: <fill: path>
- Lines: <fill: range>
- Predicted failure: <fill: what concretely goes wrong, on what input or in what state.
  Not "this looks fragile".>
- Reproducing test: <fill: the command, payload or fixture that shows it — or the
  single word UNVERIFIED>
- Smallest fix that addresses the stated failure: <fill: the minimal change. Not a
  rewrite, and not a redesign of the surrounding code.>

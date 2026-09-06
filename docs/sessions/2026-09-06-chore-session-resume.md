<!-- {{TOKEN}} fields are filled by .claude/hooks/session-start.sh on startup/clear.
     <fill: ...> fields are filled by hand as the first step of the session.
     Builder-Codex: never create a second log for a branch. Append to the newest
     docs/sessions/*-<branch-slug>.md; only if none exists copy this file by hand,
     replace every {{TOKEN}}, and set Tool to Codex. -->
# Session log — 2026-09-06 — chore/session-resume

## Header

- Date: 2026-09-06
- Lane: docs (hooks + docs, no application code)
- Branch: chore/session-resume
- Worktree: /Users/michaelyoussef/mrc-app-1
- Tool: CC
- Model: claude-fable-5-1
- Baseline commit: e076aa6
- Starting tsc error lines: inherited (99 at dc55c15; no application code in this session, so no tsc run)
- Starting test count: inherited (71 files / 1222 at dc55c15; no tests run)
- Session id: 57592e44-92d4-4169-be79-3efa6afcae4b

Log created by hand from the template: this session started on `feat/schedule-rail-search-deeplink`, whose session-start hook predates the template, and the hook only creates a log on startup. Same session id as `2026-09-06-chore-session-logs.md` (one session, two briefs); the Stop hook picks this one by its `- Branch:` line.

## Intent

Make the session log handoff-ready without anyone remembering: a Stop hook rewrites "Resume from here" after every turn, the 5-hour window is printed at start and warned on at Stop, the Codex handover line is written down, and a cold Codex resume is proven live.

## Touching

- `.claude/hooks/session-resume.sh` (new, Stop hook)
- `.claude/hooks/window-remaining.sh` (new, shared by both hooks)
- `.claude/hooks/session-start.sh` (window line at startup)
- `.claude/hooks/README.md`
- `.claude/settings.json` (Stop hook registration only, committed from the index; the live deny list stays uncommitted)
- `docs/CODEX_WORKFLOW.md` (§9 handover, §10 hook facts and traps 3–4)
- `docs/sessions/_TEMPLATE.md`
- `docs/codex-review-log.md` (rows after each review)
- `docs/sessions/2026-09-06-chore-session-resume.md` (this log)

## Step log

Append a line BEFORE each unit of work. Sub-agents prefix every line with `[<agent-name>]`.
Format: `- HH:MM · tool · agent · what · files · outcome`

- 19:45 · CC · CC · Block A investigation, no repo changes · (none) · A1: Stop hook fires once per turn; payload fields recorded; plain stdout not in model context; systemMessage = user notice; additionalContext loops (9 firings, 4x cost). A2: usage endpoint + Keychain token works (HTTP 200, five_hour 32% at 09:48Z). A3: B1 worsens neither #139 finding; a truncated log leaves the Stop hook silent — one-time notice added.
- 19:58 · CC · CC · stashed AGENTS.md churn, cut chore/session-resume from origin/main e076aa6 · (none) · done, 7 stashes
- 20:00 · CC · CC · draft session-resume.sh + window-remaining.sh in scratch; smoke test (9 checks) · scratchpad b/ · pass on the second run (first run's one failure was the test dropping a file inside the repo)
- 20:10 · CC · CC · docs: CODEX_WORKFLOW §8 pointer, §9 handover line, §10 hook facts + traps 3–4; template step-log Tool column + hook-maintained Resume; README block in scratch · docs/CODEX_WORKFLOW.md, docs/sessions/_TEMPLATE.md, .claude/hooks/README.md (scratch) · done, uncommitted
- 20:13 · CC · CC · verification workflow (3 read-only attacker agents on scratch copies) launched; C2 fixture repo built at scratchpad c2/ (AGENTS.md, template, dry-run log, commit 2d89ab8) · (none) · in progress
- 20:15 · CC · CC · C2 run 1: codex exec read-only with the §9 handover line · scratchpad c2/ · see "C2" below

- 20:16 · CC · CC · C2 run 2: codex exec workspace-write with the handover line verbatim; config.toml reverted to the 9-line baseline (cmp ok) · scratchpad c2/ · PASS, see "C2" below
- 20:20 · CC · CC · verification workflow returned: 8 findings on session-resume.sh (idempotency on a clean committed log, sections after Resume deleted, CRLF, trailing-space heading, fenced bullets, paths with spaces, id with "/", read-only log), 3 on window-remaining.sh (non-UTC offset, failures cached, stderr noise), 1 on session-start.sh (empty Window line); token never leaked on any path · scratchpad b/ · all fixed; smoke test extended to 17 checks, all pass
- 20:24 · CC · CC · split by the 150 rule: PR-1 = session-resume.sh + settings.json Stop entry (108); PR-2 = window-remaining.sh + session-start.sh + README + docs · (none) · decided
- 20:24 · CC · CC · installed session-resume.sh (cp + cmp), staged settings.json from a blob (`git hash-object -w` + `update-index --cacheinfo`), committed 5ccf2ee · .claude/hooks/session-resume.sh, .claude/settings.json · working tree settings.json still ` M` with the live deny list; committed copy = origin/main + Stop entry
- 20:26 · CC · CC · C1: clone of chore/session-resume, three nested `claude -p` turns (haiku) · scratchpad c1/ · run 1: the `git add`/`git commit` turn asked for approval (my `--allowedTools` list was space-split), state never changed; also found the template's own `codex resume <threadId>` text matched with an empty id → fix committed ac22a32; run 2 with Write-tool turns: PASS, see "C1" below
- 20:29 · CC · CC · PR-1 review: companion script, `--base origin/main`, Target printed and matched, 108 lines · (none) · needs-attention, 4 findings, nothing applied, thread in "Codex threads"
- 20:35 · CC · CC · PR #149 opened (chore/session-resume, not merged) · (none) · done
- 20:36 · CC · CC · PR-2 in a scratch git worktree (so the live settings.json in ~/mrc-app-1 is never checked out): window-remaining.sh, session-start.sh, README, CODEX_WORKFLOW §8–§10, template · .claude/hooks/*, docs/CODEX_WORKFLOW.md, docs/sessions/_TEMPLATE.md · committed b21b7d7, 86 lines
- 00:13 (07 Sep) · CC · CC · PR-2 review from the worktree, `--base origin/main`, Target printed and matched, 86 lines · (none) · needs-attention, 4 findings, nothing applied, thread in "Codex threads"
- 00:20 · CC · CC · PR #150 opened (chore/session-window-docs, not merged); PR-1 row inserted in the review log · docs/codex-review-log.md (worktree) · done
- 00:22 · CC · CC · closing commit on PR-2: PR-2 review row + this log · docs/codex-review-log.md, docs/sessions/2026-09-06-chore-session-resume.md · pushed; worktree removed afterwards

## C1 — Stop hook proof (scratch clone of chore/session-resume @ ac22a32, three nested `claude -p` turns, haiku, `--resume`)

The clone's own SessionStart hook created `docs/sessions/2026-09-06-chore-session-resume.md` for the nested session; the Stop hook found it by session id. Turn 1 wrote `c1-note.txt` (Write tool), turn 2 `c1-second.txt`, turn 3 `c1-third.txt`. `## Resume from here` count after every turn: 1.

After turn 1:

```
- Updated: 2026-09-06 20:29 AEST · Tool: CC
- Branch: chore/session-resume @ ac22a32 chore(hooks): session-resume.sh requires an id after 'codex resume'
- Unpushed commits: none
- Uncommitted files (this log excluded):
  - `?? c1-note.txt`
- Last step-log line: HH:MM · CC · filled header · (none) · <fill>
- Codex threads: none
- Window: unknown
- Next step: the first open item under "Did NOT" or "Open", else continue from the last step-log line.
```

After turn 3: identical except the uncommitted list, which read `?? c1-note.txt`, `?? c1-second.txt`, `?? c1-third.txt`. "Window: unknown" because the clone has no `window-remaining.sh` (PR-2). Cost of the three turns: about four cents.

## C2 — cold Codex resume, dry run (2026-09-06, scratch repo, codex-cli 0.153.2, gpt-6-astra, effort medium, `--ephemeral`)

Fixture: a git repo holding only `AGENTS.md` (main's copy), `docs/sessions/_TEMPLATE.md` (this branch's) and a hand-written log `docs/sessions/2026-09-06-c2-dry-run.md` whose "Did NOT" and last step-log line name one step: create `hello.txt` containing exactly `OK`. Prompt = the §9 handover line with that filename.

Run 1, `-s read-only`, plus "this run is read-only; state the next step and the log path" (18 s). Commands Codex ran: one, `cat docs/sessions/2026-09-06-c2-dry-run.md`. Reply verbatim:

> 1. I would append a step-log line to the existing log, then create `hello.txt` containing exactly `OK` followed by a newline.
> 2. Log path: `/private/tmp/…/scratchpad/c2/docs/sessions/2026-09-06-c2-dry-run.md`

Run 2, `-s workspace-write`, the handover line alone (54 s). Reply verbatim:

> Created `hello.txt` with exactly `OK\n` and verified its three bytes. Appended completion to the existing session log; no second log created.
>
> `git diff --check` passed. Claude Code review remains pending.

What it did (verified after the run): `hello.txt` = `OK\n` (3 bytes, `od -c`); `git status` = ` M docs/sessions/2026-09-06-c2-dry-run.md`, `?? hello.txt`; `docs/sessions/` still holds exactly the template and the one log; two step-log lines appended, both `· codex · [codex] ·` (one before the work, one recording completion), one line added under "Did"; "Resume from here" untouched; the stale "Did NOT" entry left as history, not rewritten. Commands it ran: `cat` of the log and of `AGENTS.md`, `git status`, `rg --files`, `date`, then one python heredoc that wrote both files, then `git diff --check`.

Observations, not failures: (1) following the `docs/CODEX_WORKFLOW.md §6` pointer in AGENTS.md, Codex read that file from `/Users/michaelyoussef/mrc-app-1/` — an absolute path outside the scratch repo — because the scratch repo had no copy; it reads adjacent files wherever it can find them. (2) It inserted a blank line between its step-log entries. (3) `-s workspace-write` again auto-wrote `[projects."<scratch c2 path>"] trust_level = "trusted"` into `~/.codex/config.toml` (trap 2); reverted to the 9-line baseline of 18:56 and verified with `cmp`. (4) No thread id: `--ephemeral` runs do not persist a session, so `codex resume` is not available for these two runs.

Verdict: a cold Codex resume from the log alone works, on the first attempt, with the handover line as written in §9.

## Codex threads

Write `codex resume <threadId>` here the moment it is printed — on stderr as `Thread ready (<id>)`, or by `node <companion> status`. The plugin SessionEnd hook deletes every job of the session, running or finished.

- codex resume 01a07644-3943-7212-8883-b7653edba1a7 — PR-1 (chore/session-resume @ ac22a32 vs origin/main e076aa6), adversarial, 2026-09-06 10:29–10:32 UTC, Target `branch diff against origin/main`, verdict needs-attention
- codex resume 01a07711-3ea0-7102-b031-96e058b81874 — PR-2 (chore/session-window-docs @ b21b7d7 vs origin/main e076aa6), adversarial, 2026-09-06 14:13–14:17 UTC, Target `branch diff against origin/main`, verdict needs-attention
- C2's two `codex exec --ephemeral` runs left no thread (see "C2")

## Review

PR-1, chore/session-resume `ac22a32` vs origin/main `e076aa6`:

- Target: `branch diff against origin/main` (printed and matched before reading)
- Diff lines excl. docs/sessions/: 108 (108 added, 0 deleted, 2 files)
- Verdict: needs-attention
- Findings: 4 — (high) whole-file replacement can discard a concurrent edit made between the read and the `mv` (`session-resume.sh:70-75`); (high) a fenced `## Resume from here` inside the step log is taken as the section boundary, deleting what follows it (`:72-74`); (high) session matching is a substring grep, so a step line quoting another session's `- Session id:` can select the wrong log (`:27-32`); (medium) the missing-log path prints the session id in the systemMessage and in a marker filename (`:79-82`). Nothing applied; untriaged, to Michael.
- codex-review-log row: added in PR-2

PR-2, chore/session-window-docs `b21b7d7` vs origin/main `e076aa6` (reviewed from the scratch worktree, foreground):

- Target: `branch diff against origin/main` (printed and matched before reading)
- Diff lines excl. docs/sessions/: 86 (85 added, 1 deleted, 5 files)
- Verdict: needs-attention
- Findings: 4 — (high) curl loads `.curlrc` even with `-K -`, so a configured trace or libcurl output file could persist the Authorization header; recommendation `-q` first (`window-remaining.sh:26-27`); (high) with `TMPDIR` unset the cache lives at a predictable path in shared `/tmp`, `cat` follows a symlink another local user could plant, and its content would be printed into context (`:39-40`); (medium) `docs/CODEX_WORKFLOW.md:110` forbids hand-editing "Resume from here" while the reviewed checkout has no `session-resume.sh` and no Stop registration — true of PR-2 alone, that hook is PR-1 (#149); (medium) the reviewed checkout has no session log naming `window-remaining.sh` — this log is committed after the review by design, in the closing commit. Nothing applied; untriaged, to Michael.
- codex-review-log row: added in the closing commit of PR-2

## Did

- Block A: Stop hook, usage window and A3 answered live (step log 19:45); evidence in the scratchpad `out2/`.
- B1: `.claude/hooks/session-resume.sh` + Stop registration → PR #149 (`chore/session-resume`, 5ccf2ee + ac22a32, 108 lines). Settings committed from a blob; the live deny list never entered a commit and the working-tree copy stayed ` M`.
- B2: `.claude/hooks/window-remaining.sh` + `session-start.sh` window line → PR #150 (`chore/session-window-docs`, b21b7d7, 86 lines), built in a scratch worktree.
- B3: CODEX_WORKFLOW §9 (handover line, what Codex does first, C2 result) and §10 (hook facts, traps 3–4, usage endpoint, the credential-reading hook stated as a fact); §8 pointer. AGENTS.md untouched: its Builder-Codex section already says "appends to the same log … never create a second one".
- B4: template step-log tool column; "Resume from here" marked hook-maintained with the hand fallback.
- C1: proven in a scratch clone, three nested turns (section above).
- C2: proven, both runs (section above). `~/.codex/config.toml` reverted to the nine-line baseline, `cmp` clean.
- C3: two reviews, both `Target: branch diff against origin/main`, both needs-attention, 8 findings in total, nothing applied, both thread ids written the moment they printed, rows in `docs/codex-review-log.md`.
- Before install: 17-check smoke test plus three attacker agents on scratch copies (11 findings on the two scripts, all fixed before the cp).

## Did NOT

- No application code, no npm, no tsc, no vitest. No merge. Nothing applied from either review.
- Did not fix the two #139 findings (session-start.sh:135-136 truncation, :82-84 suffix glob) — Lane R, with today's eight untriaged findings.
- Did not use `hookSpecificOutput.additionalContext` anywhere.
- Did not test the statusLine surface or a UserPromptSubmit channel.

## Broke

- nothing known. Side effects: nested `claude -p` transcripts under `~/.claude/projects/-private-tmp-…/` (A1 four turns, C1 nine turns, all haiku, cents); `/tmp/claude-window-cache.txt` briefly created and deleted by an attacker agent.

## Open

- Both PRs are held for Michael's triage of the eight review findings (four each). The two high findings on `window-remaining.sh` (curl `-q`, cache symlink under an unset `TMPDIR`) and the three high on `session-resume.sh` (concurrent-edit loss, fenced heading as boundary, substring session-id match) are one-line to one-function fixes each, but ruling 1 says they are decided, not auto-applied.
- The Stop hook does not run in this session (trap 4). After #149 merges: restart or `/hooks` review in each worktree that should have it.
- `.claude/settings.json` in `~/mrc-app-1` is still the live, uncommitted deny-list copy (32 deny entries: main's 15 plus the 17 held for #144). #149's committed copy adds only the Stop entry; #144 will need a small merge with it.
- `~/.codex/config.toml`: nine lines, Michael's trust entry and tui block intact; no `hooks.state` entry, so the #143 trust step is still undone.
- The two #139 findings and today's eight: Lane R's input list.

## Resume from here

<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit -->

Hand-written at close (the hook cannot run in the session that added it):

- Updated: 2026-09-07 00:22 AEST · Tool: CC
- Branch: chore/session-resume @ ac22a32 in ~/mrc-app-1; PR #149 open. chore/session-window-docs @ closing commit; PR #150 open. Neither merged.
- Unpushed commits: none
- Uncommitted files (this log excluded): ` M .claude/settings.json` (live deny list, never commit), ` M docs/HOW_TO_USE_THE_APP.html` (pre-existing churn), `?? docs/TEST_LEAD_PURGE_*` and other pre-existing untracked files
- Last step-log line: see above
- Codex threads: `codex resume 01a07644-3943-7212-8883-b7653edba1a7` (#149 review), `codex resume 01a07711-3ea0-7102-b031-96e058b81874` (#150 review)
- Window: irrelevant at close
- Next step: Michael triages the eight findings (docs/codex-review-log.md, the two 2026-09-06 rows after PR #144's), decides merge order (#149 then #150, or together), then restarts to pick up the Stop hook. Pop the AGENTS.md stash on `feat/schedule-rail-search-deeplink` when returning there (`git stash list` shows "parked GitNexus regen 2026-09-06 (block B)").

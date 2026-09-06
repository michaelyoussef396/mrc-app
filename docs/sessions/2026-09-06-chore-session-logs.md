<!-- {{TOKEN}} fields are filled by .claude/hooks/session-start.sh on startup/clear.
     <fill: ...> fields are filled by hand as the first step of the session.
     Builder-Codex: never create a second log for a branch. Append to the newest
     docs/sessions/*-<branch-slug>.md; only if none exists copy this file by hand,
     replace every {{TOKEN}}, and set Tool to Codex. -->
# Session log — 2026-09-06 — chore/session-logs

## Header

- Date: 2026-09-06
- Lane: docs (Codex workflow, session logs, AGENTS.md/CLAUDE.md, Codex guard hook, repo deny list)
- Branch: chore/session-logs (first of six branches this session; all cut from origin/main dc55c15 except the two stacked ones)
- Worktree: /Users/michaelyoussef/mrc-app-1
- Tool: CC
- Model: claude-fable-5-1
- Baseline commit: dc55c15
- Starting tsc error lines: 99 — inherited from dc55c15, not re-run (no application code in scope; Michael's amendment)
- Starting test count: 71 files / 1222 — inherited from dc55c15, not re-run
- Session id: 57592e44-92d4-4169-be79-3efa6afcae4b

## Intent

Land the Codex review-then-stop workflow as repo state: session logs, docs/CODEX_WORKFLOW.md, shared rules in AGENTS.md, a Codex PreToolUse guard, and the repo-level deny list — each PR reviewed through the companion script.

## Touching

- PR-1 `chore/session-logs`: `docs/sessions/_TEMPLATE.md`, `.claude/hooks/session-start.sh`, `.claude/hooks/README.md`
- PR-2 `docs/codex-workflow`: `docs/CODEX_WORKFLOW.md`, `docs/codex-review-log.md`
- PR-3a `docs/agents-md`: `AGENTS.md`, `CLAUDE.md`
- PR-3b `docs/claude-md-cc-only` (stacked on 3a): `CLAUDE.md`, `AGENTS.override.md` (deleted)
- PR-4 `chore/codex-guard-hook`: `.codex/hooks.json`, `.codex/hooks/codex-guard.sh`, `docs/CODEX_WORKFLOW.md`, `AGENTS.md`
- PR-5 `chore/repo-deny-list`: `.claude/settings.json`
- Closing PR: `docs/codex-review-log.md` (rows), this file

## Step log

Append a line BEFORE each unit of work. Sub-agents prefix every line with `[<agent-name>]`.
Format: `- HH:MM · agent · what · files · outcome`

- 13:2x · CC · plan-mode probe `adversarial-review --help` started an UNINTENDED live review · working tree (43 dirty files) · needs-attention, 1 medium, thread below
- 18:0x · CC · Block A pre-flight: fetch, base check, root-notes check, companion `help` · scratch only · origin/main dc55c15 confirmed; notes still in root at the time
- 18:13 · CC · A2 precedence tests V0–V3 (prompt-input + exec, low effort, ephemeral) · scratch a2 · see Block A results
- 18:14 · CC · A3 hook tests (i)–(v) · scratch a3 · see Block A results; ~/.codex/config.toml reverted 3× and verified at 3 lines
- 18:2x · CC · Block B go: root notes verified gone; `~/mrc-offline` clean, ff-only merged to dc55c15 · — · local `main` = dc55c15
- 18:22 · CC · cut `chore/session-logs` from origin/main · — · dirty churn carried, AGENTS.md dirty (stash before PR-3a)
- 18:23 · CC · wrote template; hook + README via scratchpad → cp → cmp (approved route, protect-files.sh denies Edit under .claude/hooks) · the three PR-1 files · bash -n ok, cmp identical, mode 755 kept, 110 reviewable lines
- 18:24 · CC · C1 T1–T7 · docs/sessions/ · all pass; T3 artefact removed
- 18:24 · CC · commit e7b35ed, confinement ok, 110 lines, PII grep clean, pushed · PR-1 files · origin/chore/session-logs = e7b35ed
- 18:25 · CC · PR-1 adversarial review, `--base origin/main` · — · Target matched, needs-attention, 2 findings, nothing applied; thread logged
- 18:28 · CC · PR #139 opened (clean body) · — · https://github.com/michaelyoussef396/mrc-app/pull/139
- 18:28 · CC · cut `docs/codex-workflow` from origin/main; placed docs/CODEX_WORKFLOW.md (99 lines) · docs/CODEX_WORKFLOW.md · next: review-log pointer + table fix + incident row
- 18:29 · CC · review-log pointer, blank-line table fix, incident row · docs/codex-review-log.md · commit c8a4a69, 102 lines, pushed, reviewed (needs-attention, 2), PR #140
- 18:33 · CC · stashed dirty AGENTS.md (stash@{0}); cut `docs/agents-md`; AGENTS.md = 78-line head + untouched GitNexus block; CLAUDE.md import + enforcement block extended · AGENTS.md, CLAUDE.md · commit 4444a0d, 109 lines, reviewed (needs-attention, 3, all merge-order), PR #141
- 18:38 · CC · cut `docs/claude-md-cc-only` stacked on docs/agents-md; `git rm AGENTS.override.md`; CLAUDE.md: Git Workflow section and old two-round cycle removed, Claude Code specifics added · CLAUDE.md, AGENTS.override.md · pre-declared review base docs/agents-md
- 18:39 · CC · B4 Test 1: 26 synthetic payloads through .codex/hooks/codex-guard.sh in scratch b4 · scratch only · 17 deny / 8 allow / 1 known gap, 26/26 as expected
- 18:41 · CC · PR-3b commit c4e8155, 95 lines vs docs/agents-md, reviewed with `--base docs/agents-md` (needs-attention, 2, merge-order), PR #142 · CLAUDE.md, AGENTS.override.md · Codex reported it received AGENTS.md
- 18:43 · [doc-reviewer] C2 test: asked to quote the session-log rule from its instructions without tools · — · NOT PRESENT: the sub-agent received the CLAUDE.md snapshot loaded at session start (old branch, no `@AGENTS.md`), not the on-disk file. Inconclusive in-session; no agent files edited; Open
- 18:44 · CC · B4 Test 2: live `codex exec` in scratch b4 with the `sh -c` hooks.json form · scratch only · `git status` ran; `git add -A` and `git push --force` denied with the guards' reasons; 0 files staged; auto-written trust entry reverted, config.toml back to 3 lines
- 18:45 · CC · cut `chore/codex-guard-hook` from origin/main; placed .codex/hooks.json + .codex/hooks/codex-guard.sh · .codex/** · commit e27bad7, 67 lines, reviewed (needs-attention, 3 substantive), PR #143. First attempt of the chain was denied by the repo deny list because the focus text quoted two banned command forms — rephrased
- 18:50 · CC · cut `chore/repo-deny-list` from origin/main; committed Michael's working-tree `.claude/settings.json` as-is · .claude/settings.json · commit 0f49099, 38 lines, reviewed (needs-attention, 4), PR #144. Same deny-list trip on the first focus text — rephrased
- 18:53 · CC · cut `docs/session-2026-09-06-close` on docs/codex-workflow; restored the deny-list settings.json as an uncommitted working-tree change so the control stays live · docs/codex-review-log.md, this file · six review rows + "Do not review" entry; closing commit follows

## Codex threads

Write `codex resume <threadId>` here the moment it is printed — on stderr as `Thread ready (<id>)`, or by `node <companion> status`. The plugin SessionEnd hook deletes every job of the session, running or finished.

- codex resume 01a074c4-4dcb-7522-b9a3-bffba4f02b5f — UNINTENDED plan-mode review, Target: `working tree diff` (wrong target under ruling 3), finding untriaged, carried to Michael
- (A2/A3 exec runs were `--ephemeral`: no resumable threads)
- codex resume 01a075d2-ccbe-74d3-a0c8-d8d0ea20a21e — PR-1 review, e7b35ed vs origin/main dc55c15, 18:25–18:27 UTC
- codex resume 01a075d6-eb7e-77b2-ad11-c4adc98701ed — PR-2 review, c8a4a69 vs origin/main dc55c15, 18:30–18:32 UTC
- codex resume 01a075db-dfdd-73e3-801b-a24581122bfd — PR-3a review, 4444a0d vs origin/main dc55c15, 18:35–18:37 UTC
- codex resume 01a075e1-0c3e-7363-b744-de1f54917633 — PR-3b review, c4e8155 vs docs/agents-md 4444a0d, 18:41–18:42 UTC
- codex resume 01a075e5-3fea-75d2-bd46-1821ee16f8cf — PR-4 review, e27bad7 vs origin/main dc55c15, 18:45–18:48 UTC
- codex resume 01a075e9-4075-7600-9e86-77269cd436e6 — PR-5 review, 0f49099 vs origin/main dc55c15, 18:50–18:52 UTC

## Block A results (evidence in the scratchpad `out/`)

- A1: companion `help` prints usage. Only the top-level `help` does; the review subcommand treats `--help` as focus text.
- A2 V0 real repo (`codex debug prompt-input`): override brief loaded, CLAUDE.md not, AGENTS.md not.
- A2 V1 AGENTS+CLAUDE → `SENTINEL-AGENTS-7f3a` only · V2 CLAUDE only → nothing / `NONE` · V3 override+AGENTS+CLAUDE → `SENTINEL-OVERRIDE-4b2d` only. Exec self-reports matched prompt-input; 0 commands run in every variant.
- A3 (i) `.codex/hooks.json` + `--dangerously-bypass-hook-trust` → fired 2/2, sentinel denied · (ii) without the flag → hook never ran, no warning, sentinel executed · (iii) `-c hooks.PreToolUse=[…]` → fired, denied · (iv) no persisted project trust → fired, denied · (v) workspace-write, no flag, no override → skipped.
- Side effect: every `codex exec -s workspace-write` run wrote `[projects."<dir>"] trust_level = "trusted"` into `~/.codex/config.toml` on its own (3×). Reverted each time; final state verified at the original 3 lines. Read-only-sandbox runs did not write it.
- Payload fields: session_id, turn_id, transcript_path, cwd, hook_event_name, model, permission_mode, tool_name=`Bash`, tool_input.command, tool_use_id.
- Phone-pattern hits in `docs/multi-tech/deploy/*`: 4, all false positives (migration ids and clock times).

## Review

- PR-1 (`chore/session-logs` e7b35ed): Target: `branch diff against origin/main` ✓ · 110 reviewable lines, 3 files (self-collect) · Verdict: needs-attention · Findings: 2 — [high] concurrent starts can select and overwrite the same log (`session-start.sh:135-136`, non-exclusive create); [medium] prior-log glob `*-<slug>.md` also matches branches whose slug is a suffix of another (`session-start.sh:82-84`, e.g. slug `logs` matches `chore-session-logs`) · wall 114 s · applied: nothing (ruling 1) · row: closing PR
- PR-2 (`docs/codex-workflow` c8a4a69): Target: `branch diff against origin/main` ✓ · 102 reviewable lines, 2 files (inline) · Verdict: needs-attention · Findings: 2 — [high] Lane C's documented guard and the AGENTS.md Roles section are not on HEAD yet (`CODEX_WORKFLOW.md:75-79`; true by merge order — PR-3a/PR-4 land them; the doc says "until trusted the guard does nothing"); [medium] the count command's `-- .` pathspec is cwd-relative, so run from a subdirectory it undercounts (`CODEX_WORKFLOW.md:55-58`; fix would be `git -C <root>`) · wall 119 s · applied: nothing (ruling 1) · row: closing PR
- PR-3a (`docs/agents-md` 4444a0d): Target: `branch diff against origin/main` ✓ · 109 reviewable lines, 2 files (inline) · Verdict: needs-attention · Findings: 3 — [high] `AGENTS.override.md` still tracked so Codex loads it instead of AGENTS.md (`AGENTS.md:3`; PR-3b deletes it); [high] `.codex/hooks/codex-guard.sh` referenced but not on HEAD (`AGENTS.md:25`; PR-4); [medium] Lane C scope points at `docs/CODEX_WORKFLOW.md` §6, not on HEAD (`AGENTS.md:63-65`; PR-2) · wall 122 s · applied: nothing (ruling 1) · PII grep hit was the `@AGENTS.md` token (false positive) · row: closing PR
- PR-3b (`docs/claude-md-cc-only` c4e8155, stacked): Target: `branch diff against docs/agents-md` ✓ (pre-declared) · 95 reviewable lines, 2 files (inline) · Verdict: needs-attention · Findings: 2 — [high] the permission-layer bullet describes deny rules that are only in the uncommitted `.claude/settings.json` (`CLAUDE.md:145`; PR-5 commits them); [medium] the session-log bullet describes hook behaviour that lands in PR-1 (`CLAUDE.md:147`) · Codex stated it received AGENTS.md on this branch (override gone) · wall 98 s · applied: nothing (ruling 1) · row: closing PR
- PR-4 (`chore/codex-guard-hook` e27bad7): Target: `branch diff against origin/main` ✓ · 67 reviewable lines, 2 files (inline) · Verdict: needs-attention · Findings: 3 — [high] shell syntax bypasses the two git regexes: `/usr/bin/git`, `env git`, quoted `'git'`, `-C/tmp` without a space, a subshell, `;`-chaining and a newline before the command (`codex-guard.sh:12-13`; line 39 collapses newlines — same class as P0-9 in the CC guard, which the replay inherits); [medium] false denies: a commit message containing ` -a ` and `git add README.md && printf x -u` (`codex-guard.sh:12-13`); [medium] when `git rev-parse --show-toplevel` fails the `sh -c` launcher expands to `/.codex/hooks/codex-guard.sh`, exit 126, no deny JSON — fail-open on launcher failure (`hooks.json:9`) · B4 Test 1 26/26 and Test 2 live deny both pass but cover none of the reproduced bypass forms · wall 163 s · applied: nothing (ruling 1) · row: closing PR
- PR-5 (`chore/repo-deny-list` 0f49099): Target: `branch diff against origin/main` ✓ · 38 reviewable lines, 1 file (inline) · Verdict: needs-attention · Findings: 4 — [high] `env supabase --workdir . db reset --db-url …` matches no glob and both CC hooks allow it (`settings.json:10-12`); [high] `git -C . push origin HEAD:refs/heads/production --force` matches no deny and both hooks allow it (`settings.json:22-25`); [high] `gh --repo owner/repo pr merge …` skips the ask entry (`settings.json:44`); [medium] the unconditional `--linked` deny blocks `migration list --linked`, which the Supabase guard's verified-DEV read-only rule 3.5 deliberately allows (`settings.json:14`) · wall 112 s · applied: nothing (ruling 1) · row: closing PR
- Closing PR (`docs/session-2026-09-06-close`, stacked on docs/codex-workflow): not reviewed — log rows and this session log only (3af5241 precedent); recorded under "Do not review"

## Did

- Block A live: A2 precedence (V0–V3, prompt-input + exec), A3 hooks (runs i–v), with the config.toml side effect found, reverted and verified
- `~/mrc-offline` fast-forwarded to dc55c15 (local `main` no longer stale)
- PR-1 #139 session-log template + hook (C1 T1–T7 pass) · PR-2 #140 CODEX_WORKFLOW.md + log pointer/fix/incident row · PR-3a #141 AGENTS.md shared rules + CLAUDE.md import and extended enforcement block · PR-3b #142 (stacked on #141) CC-only CLAUDE.md, override retired · PR-4 #143 Codex guard (B4 Test 1 26/26, Test 2 live deny) · PR-5 #144 repo deny list · closing PR (stacked on #140) rows + this log
- Six adversarial reviews through the companion script, every `Target:` printed and matched before reading, every thread id written here first, every finding presented verbatim, none applied
- Path confinement checked per PR; 99 / 1222 recorded as inherited from dc55c15

## Did NOT

- No npm ci / tsc / vitest (out of scope by amendment); no application code touched; no frozen surface touched
- Nothing applied from any review: 16 findings across six PRs go to Michael untriaged
- Did not edit the 18 agent files (C2 inconclusive in-session)
- Did not trust the Codex hook anywhere (Michael's one-time `/hooks` step per worktree)
- Did not merge anything; nothing touched `production`

## Broke

- nothing known. Side effects reverted and verified: `~/.codex/config.toml` back to 3 lines after four auto-written trust entries; the scratch fixtures removed; the AGENTS.md stash popped and the deny-list settings.json restored as a working-tree change on the original branch at session end (see handover)

## Open

- Ledger: `Bash cp` bypasses `protect-files.sh` — used once this session, with approval, for `session-start.sh` and the hooks README; not this session's fix
- Ledger: `codex exec -s workspace-write` auto-trusts its working directory (writes `trust_level = "trusted"` into `~/.codex/config.toml` on its own; read-only runs do not)
- `~/.claude/hooks/session-start.sh` now drifts from the repo copy — keep-and-resync or remove the user-scope registration, Michael's call
- C2: a sub-agent spawned mid-session received the CLAUDE.md snapshot loaded at session start, not the on-disk file with `@AGENTS.md`; re-test in a fresh session after #141 merges before touching agent files
- PR-4's guard is inert on every worktree until `/hooks` trust is done there; it also inherits P0-9's bypass class and the review found its own regex bypasses — both go to Lane R's successor, not this session
- PR-5's deny list: three glob evasions and one over-block (the linked-target deny vs the verified-DEV read-only exception) — Michael's triage
- PR-1: concurrent-start truncation and suffix-overlapping slug match — Michael's triage
- Unintended plan-mode review: thread `01a074c4-4dcb-7522-b9a3-bffba4f02b5f`, one medium finding on the purge runbook, and the exposure question (business + test-lead addresses only; phone hits were false positives) — Michael's call
- The user-scope SessionStart registration duplicates the repo hook (banner prints twice)
- `.claude/skills/generated/*`, `deno.lock`, `docs/HOW_TO_USE_THE_APP.html`, `.claude/settings.local.json` remain dirty on `feat/schedule-rail-search-deeplink` exactly as found

## Resume from here

- Next command: merge order on GitHub with merge commits — #139, #140, #141, #142 (base #141), #143, #144, then the closing PR (base #140); after each, `git fetch origin && git log --oneline origin/main -3`
- Uncommitted files: on `feat/schedule-rail-search-deeplink` — the pre-existing churn plus `AGENTS.md` (stash popped) and `.claude/settings.json` (deny list, live, uncommitted until #144 merges)
- Untested: the Codex guard under a trusted (non-bypass) Codex session; the session-start hook's first real `/clear`; the `@AGENTS.md` import in a fresh session; every finding above

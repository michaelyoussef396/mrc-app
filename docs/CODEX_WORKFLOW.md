# Codex workflow — Claude Code writes, Codex reviews (and, in Lane C, builds)

What this file is: the rulings, the roles, and the exact procedure for running a Codex review from a Claude Code session. Rulings were made by Michael on 2026-09-06 and are recorded verbatim; they are not relitigated in a session. The other two sources of truth are `docs/codex-review-log.md` (one row per review) and `docs/sessions/` (one log per session). The binding text for the two Codex roles is the "Roles" section of `AGENTS.md`.

## 1. Rulings (verbatim, 2026-09-06)

1. Codex review is review-then-stop. CC runs the review, prints findings, STOPS. Findings go to Michael. No fix loop, no re-review loop. Reasons: (a) the reviewer's record is 13 false flags to 3 real fixes — auto-fixing at that rate manufactures work; (b) a Codex finding against working code needs a failing test before anyone acts, which an automated loop cannot honour; (c) "fix" means CC fixes, which spends the CC window that Lane C exists to conserve. A two-round cap may be added later if findings turn out mostly real; it cannot be removed once it is a loop.
2. disable-model-invocation stays TRUE in the plugin's commands/*.md. Never edit it — plugin updates overwrite it silently. CC invokes the review by calling the companion script the slash command runs anyway: `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" adversarial-review --base main [focus]`. Bash(node:*) is already permitted.
   *Why:* the flag blocks the slash command, not the script; Michael typing the command was the bottleneck. *As applied:* `CLAUDE_PLUGIN_ROOT` is empty in the Bash tool and local `main` is not trustworthy, so the resolved form in §3 uses the absolute path and `--base origin/main`.
3. Before continuing after any review, CC prints the Target: line and the diff line-count. If Target: is not the intended base/range, abort and report (#653: a bad --base exits 0 and silently reviews a wider diff).
4. The ~150 reviewable-line limit applies MECHANICALLY to the diff excluding docs/sessions/ — computed with a git pathspec exclude, never by judgment. Above 150 → split before reviewing.
   *Why:* "~150" was judged by eye three times and disputed once.
5. The plugin inlines the diff only when changed files <= 2 AND diff <= 256 KiB; otherwise self-collect mode. Most multi-file units will be self-collect — that is why rule 3 is mandatory.
   *Why:* plugin constant (`scripts/lib/git.mjs`, `DEFAULT_INLINE_DIFF_MAX_BYTES`); in self-collect mode Codex runs git itself and reads adjacent files.
6. The plugin's SessionEnd hook deletes ALL of a session's Codex jobs from state, finished ones included. Any `codex resume <threadId>` is unrecoverable after session end and must be written into the session log the moment it is printed.
   *Why:* `scripts/session-lifecycle-hook.mjs` filters every job carrying the session id out of plugin state; the thread survives under `~/.codex/sessions` but nothing in the plugin can find it again.
7. Reviewer-Codex never edits. Review gate (Stop hook) stays OFF. Codex gets no MCPs.
   *Why:* there is no write path for a reviewer; the gate loops on any transient failure (plugin issues #248, #306).
8. Lane C = builder-Codex, used only when the CC window is out. It reads the latest session log for its branch first, finishes the remaining steps from the log, never refactors what is there, appends to the same log, and its work gets a CC review when the window resets. Lane C's scope is decided by A3.
   *Why:* window exhaustion is the only reason to hand a lane to Codex. A3 result: yes (§6).
9. AGENTS.md becomes the real file; CLAUDE.md imports it via @AGENTS.md. Whether Codex ignores CLAUDE.md when AGENTS.md exists is decided by A2 — do not assume either way.
   *Why:* shared rules must live in a file both agents load. A2 result (2026-09-06, live): Codex never loads CLAUDE.md, and it loads `AGENTS.override.md` *instead of* `AGENTS.md` when both exist — one instruction file per directory, override wins. Hence the override is deleted and its brief folded into `AGENTS.md` (Michael, decision 1(a)).
10. Lane order after this lands: R alone, then PDF + L together. Not relitigating.

## 2. Roles

- **Claude Code — builder (default).** Runs the lane, keeps the session log, runs the review, stops. CC-specific procedure lives in `CLAUDE.md`.
- **Reviewer-Codex.** Read-only. Binding text: `AGENTS.md` → Roles → Reviewer-Codex.
- **Builder-Codex (Lane C).** Only when the CC window is out. Binding text: `AGENTS.md` → Roles → Builder-Codex; scope in §6.

## 3. Invoking the review

- Script (resolved 2026-09-06, plugin `openai-codex/codex` v1.0.6, user scope):
  `/Users/michaelyoussef/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs`
- `CLAUDE_PLUGIN_ROOT` is **empty** inside the Bash tool. Always use the absolute path.
- Re-resolve after a plugin update (the version is in the path):
  `jq -r '.plugins["codex@openai-codex"][] | select(.scope=="user") | .installPath' ~/.claude/plugins/installed_plugins.json` and append `/scripts/codex-companion.mjs`.
- The command, always foreground (`--wait`); background adds nothing because ruling 6 deletes the job anyway, and is forbidden inside worktrees (plugin issue #367):

  ```
  node /Users/michaelyoussef/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs adversarial-review --wait --cwd <worktree> --base origin/main -- <focus text>
  ```

  Flags the subcommand accepts: `--wait|--background`, `--base <ref>`, `--scope auto|working-tree|branch`, `--model`, `--cwd`, `--json`; `--` passes everything after it as focus text. Bash tool timeout 600000: runs have taken 26 s to several minutes.
- **The `--help` trap.** The review subcommand has no help flag. Any unrecognised token — `--help` included — becomes focus text and starts a live, quota-spending review. Only `node <script> help` prints usage. Never probe the subcommand. (This happened once, 2026-09-06; see the log.)
- The slash commands keep `disable-model-invocation: true` and are never called by CC.
- Default focus for code diffs: `challenge RLS policies and tenant isolation on every touched table; service-role key scope; any path where a cross-tenant read or write could occur; secrets or keys in tracked files; unauthenticated or under-authorised endpoints`. For config and docs diffs: name the exact failure you want disproved.

## 4. Before the review, in this order

1. **Commit everything on the branch.** Branch mode reviews merge-base..HEAD; uncommitted and untracked files are invisible to it.
2. **Measure.** The mechanical count, ruling 4:

   ```
   git diff --numstat origin/main...HEAD -- . ':(exclude)docs/sessions/' | awk '{a+=$1;d+=$2} END{print a+d " (" a " added, " d " deleted)"}'
   ```

   Print the number. Over 150: split before reviewing. CC subtracts nothing; the 2026-09-05 byte-identical-restore precedent is a waiver Michael applies. Three-dot range = merge-base to HEAD, the range the plugin reviews. `--numstat` prints `-` for binaries, which awk reads as 0.
3. **Base: always `--base origin/main`.** Never `--base main`: the plugin's auto-detection returns the bare name `main` (`git.mjs` `detectDefaultBranch`), which git resolves to the *local* branch, and local `main` in `~/mrc-app-1` lives in another worktree and lags. For a stacked branch, pass its parent and pre-declare that label.
4. **Never invoke without `--base`.** A dirty tree without `--base` flips the target to `working tree diff` and sends every untracked file in the checkout to OpenAI. `docs/sessions/<log>.md` is untracked for the whole of every session by design, so the tree is always dirty.
5. **PII check** on `git diff origin/main...HEAD`: names, emails, phones, addresses. Any customer data → no review; add a "Do not review" entry to the log instead.
6. **Path confinement** for docs/config sessions: `git diff --name-only origin/main...HEAD` must stay inside the paths the session owns; anything else aborts.
7. Print one announcement line: branch, base, reviewable lines, file count, command, focus.

## 5. Reading the result

- **First thing printed back, before any finding:** the `Target:` line verbatim and the count from §4.2. Target must read exactly `branch diff against origin/main` (or the pre-declared parent for a stacked branch). Anything else → abort: do not read the findings, do not log them as a review, report.
- **Inline vs self-collect.** Inline only when changed files ≤ 2 AND diff ≤ 256 KiB; otherwise Codex is told the context is a summary and runs read-only git itself. Self-collect is slower and Codex reads adjacent files (it has `cat`ed `AGENTS.md` in 3 of the 4 logged runs). The rendered output does not say which mode ran; predict it from the file count.
- **Thread id.** The foreground rendered block has no thread id. It appears on stderr as `[codex] Thread ready (<id>)` and from `node <script> status --cwd <worktree>` as `Resume in Codex: codex resume <id>`. Capture stderr (`2> file`) and run `status` immediately; write `codex resume <id>` into the session log's "Codex threads" section before anything else.
- **Present findings verbatim. Apply nothing.** No triage into fixes, no second round. STOP. Michael triages.
- **Log.** One row per review in `docs/codex-review-log.md` (columns as in that file), committed in a closing docs-only commit or PR at the end of the session, so review rows never conflict across branches.

## 6. Lane C — builder-Codex scope (A3 = yes, 2026-09-06)

A3 result: Codex 0.153.2 runs a repo-scoped `PreToolUse` hook from `<repo>/.codex/hooks.json` and a deny from it blocks the command (proven live in a scratch repo, five runs). The repo hook is `.codex/hooks.json` → `.codex/hooks/codex-guard.sh`, which replays every Bash command through the tracked Claude Code guards and adds the `git add -A/-u` and `git commit -a` rules. Lane C therefore keeps full scope:

- Before anything: read the newest `docs/sessions/*-<branch-slug>.md` for the branch; if none exists, create one from `docs/sessions/_TEMPLATE.md`; write its own `codex resume <id>` into it immediately.
- May: finish the steps under "Resume from here"; edit files listed under "Touching" and their tests; run `npm ci`, `npx tsc -p tsconfig.app.json --noEmit`, `npx vitest run`; `git add <explicit paths>` and `git commit` on the current branch; append step-log lines prefixed `[codex]`.
- Never: push, merge, rebase, reset, clean, stash; any `supabase` command; anything in a frozen surface (`AGENTS.md` → Frozen surfaces); dependency changes; refactors; files outside "Touching". Every Lane C commit gets a CC adversarial review when the window resets.

**Two traps, both observed live on 2026-09-06 — read before starting Lane C on any worktree:**

1. **An untrusted hook is silently inert.** Codex runs a non-managed hook only after its exact definition has been trusted (a hash in `~/.codex/config.toml` under `[hooks.state."<hooks.json path>:<event>:<group>:<index>"]`). Without that entry, or without `--dangerously-bypass-hook-trust` on the command line, the hook is skipped **with no warning of any kind** — the denied command simply runs. One-time step per worktree path: open `codex` in the worktree, run `/hooks`, trust the PreToolUse entry, then confirm with `grep -n hooks.state ~/.codex/config.toml`. Re-trust after any edit to `.codex/hooks.json`. **Until that step is done on a worktree, the guard there does nothing.**
2. **`codex exec -s workspace-write` auto-trusts its working directory.** Every such run writes `[projects."<dir>"] trust_level = "trusted"` into `~/.codex/config.toml` on its own, whether or not the run was asked to; read-only-sandbox runs do not. Project trust is therefore not a gate on project-scoped hooks in exec mode, and a scratch or test directory becomes a trusted project the first time `codex exec` runs in it. Check `grep -n trust_level ~/.codex/config.toml` after any exec run and remove entries you did not intend.

## 7. Sub-agent logging rule

Every sub-agent (the Agent tool, `.claude/agents/*`) appends its own step-log lines, each prefixed `[<agent-name>]`; the parent logs the spawn and the return. A sub-agent that cannot write says so in its result and the parent writes the lines on its behalf, still prefixed.

## 8. Known traps

- `--help` on the review subcommand starts a live review (§3).
- `--base main` reviews against the stale local branch; a missing `--base` reviews the working tree (§4).
- The plugin SessionEnd hook deletes the session's jobs; the session log is the only durable copy of a thread id (ruling 6).
- Background runs inside a worktree (#367).
- `>/dev/` in a Bash-tool command string is denied by the guard hook, so `2>/dev/null` lives only inside script files; `(` directly before the word `supabase` in echo or commit text is denied.
- The repo and user-scope `session-start.sh` are both registered, so the context banner prints twice; only the repo copy keeps the session log.
- Codex loads at most one instruction file per directory (`AGENTS.override.md` > `AGENTS.md` > fallbacks) and never `CLAUDE.md`; `cd <dir> && codex debug prompt-input "noop"` shows what loaded without spending quota.
- `protect-files.sh` denies Edit/Write under `.claude/hooks/*`; changes there go through Michael or an approved scratchpad-and-copy with the diff shown.
- A Stop hook must never emit `hookSpecificOutput.additionalContext` (§10, trap 3); a hook added this session does not run this session (§10, trap 4).
- **A worktree removed and recreated at the same path** leaves the companion's shared session runtime holding the deleted cwd; the next review from that path fails in about one second with empty output and `failed to load configuration: No such file or directory`. It is not a rate limit and not a Codex fault. Fix: review from a new path, or clear the stale runtime. One re-run from a fresh path is acceptable under ruling 1 because the failure is local, not a Codex failure (Michael, 2026-09-07; observed live on PR #150's re-review).

## 9. Handing over to Codex

The line Michael pastes into Codex, verbatim, with the log's real filename:

```
Read docs/sessions/<file>.md. Continue from "Resume from here". Append to that log — never create a second one. Follow AGENTS.md.
```

What Codex does first, before any other action: read that log top to bottom, then append its own step-log line — tool `codex`, agent `[codex]`, what = "read log, resuming from: <the next step it found>". For the rest of the session it appends to that same file: it never creates a second log for the branch, never rewrites earlier lines, and never hand-edits "Resume from here" (that section is hook-maintained by Claude Code's Stop hook; with no Stop hook running under Codex, Codex records its resume state as step-log lines instead). Scope stays bounded by §6: the steps named under "Resume from here" and the files under "Touching", nothing else. Proven live 2026-09-06 (`docs/sessions/2026-09-06-chore-session-resume.md`, "C2"): from a log naming one step, a read-only `codex exec` with this line stated the step from the log alone, and a workspace-write run performed it, appended two `· codex · [codex] ·` step-log lines to the same log, created no second log and left "Resume from here" untouched. Two things to expect: Codex follows absolute paths it finds in AGENTS.md and read `docs/CODEX_WORKFLOW.md` from `~/mrc-app-1` when the scratch repo had no copy; and `--ephemeral` runs leave no `codex resume` id.

## 10. Claude Code hooks and the usage window (established live 2026-09-06, Claude Code 2.1.263)

- **Stop hook.** Fires once at the end of every assistant turn: 11 `stop_hook_summary` entries paired with 11 `turn_duration` entries in one session's transcript, and one firing per `claude -p` turn in a nested test. Stdin JSON fields: `session_id, transcript_path, cwd, prompt_id, permission_mode, hook_event_name, stop_hook_active, last_assistant_message, background_tasks, session_crons`. The hook's environment also carries `CLAUDE_CODE_SESSION_ID` and `CLAUDE_PROJECT_DIR`.
- **Plain stdout from a Stop hook never reaches the model**; it shows only in transcript mode. `{"systemMessage": "…"}` is shown to the user as a notice, not to the model. The only model-facing hook channel is the SessionStart hook's stdout, at startup.
- **A tracked hook reads a credential.** `.claude/hooks/window-remaining.sh` (used by `session-start.sh` and `session-resume.sh`) takes the Claude Code OAuth token from the macOS Keychain item `Claude Code-credentials` (`security find-generic-password -s "Claude Code-credentials" -w`, field `.claudeAiOauth.accessToken`) and calls `GET https://api.anthropic.com/api/oauth/usage` with `Authorization: Bearer <token>` and `anthropic-beta: oauth-2025-04-20` — the same call Claude Code's own `fetchUtilization` makes. It reads `five_hour.utilization` (percent) and `five_hour.resets_at`. The token is held in a variable, fed to curl on stdin, never written or printed; the line is cached 60 s in `$TMPDIR`. The token expires about six hours after issue and Claude Code refreshes it, so anything but HTTP 200 prints `unknown`, never a stale number. Nothing else exposes the window non-interactively: no env var, no transcript field, no file under `~/.claude`; the statusLine stdin JSON carries `rate_limits.five_hour`, interactive only.
- **Edit after a Stop-hook rewrite.** The Edit tool refuses a file changed since it was last read, so after any turn that changed git state, re-read the session log before editing it.

**Traps 3 and 4 (numbering continues from §6):**

3. **`hookSpecificOutput.additionalContext` from a Stop hook loops.** It reaches the model as a system reminder and makes it answer again, which fires the Stop hook again with `stop_hook_active: true`: 9 firings in one turn at 4x the cost, in the 2026-09-06 nested test. Never emit it from a Stop hook, for any purpose. `session-resume.sh` carries the same warning above its output block.
4. **Hooks are snapshotted at session start.** A hook added to or changed in `.claude/settings.json` does not run in the session that changed it until a restart or a `/hooks` review. The session that ships a hook proves it in a nested `claude -p` session (a scratch clone, `--resume` for further turns), never by waiting for it to fire in itself.

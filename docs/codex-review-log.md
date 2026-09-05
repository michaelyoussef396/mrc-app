# Codex review log

One row per review. This log is the only input for any knowledge-base entry on this workflow.

| date | repo / worktree | diff lines | review type | model / effort | findings | acted | rejected | unclear | missed later | wall time | usage after `/status` | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-05 | mrc-merge / docs/backlog-pricing-canon-and-ledger, ddfa6ca vs main 3191a39 | 93 added, 3 files | adversarial, foreground, `--wait --base main`, MRC default focus, round 1 of 2 | gpt-6-astra / high, config intent only (#705) | 0 | 0 | 0 | 0 | — | 26s | not captured, no non-interactive path found | Target: `branch diff against main`. Verdict: approve. Codex thread `01a0704d-d03b-7422-b6a7-734dadbb0329`. Smoke test on the Part A setup diff, docs only. During the review Codex ran `cat AGENTS.md; cat AGENTS.override.md` as a disk read of files adjacent to the change; `codex debug prompt-input` confirms the instruction channel carried only the override. No git hooks in this repo, so #697 does not apply. Review gate off in both state roots (see Setup findings 1). |
| 2026-09-05 | mrc-node22 / chore/node-24, dc52bdc vs main 4d7c15b | 13 added, 6 removed, 5 files | adversarial, foreground, `--wait --base main`, MRC default focus, round 2 of 2 | gpt-6-astra / high, config intent only (#705) | 0 | 0 | 0 | 0 | — | 52s | not captured, no non-interactive path found | Target: `branch diff against main` — checked before reading the body, as briefed. Verdict: approve, no material findings. Codex thread `01a07185-4c26-7b41-9a90-6279e251bc2e`. Config + docs diff (the Node 24 pin). Codex independently re-derived this session's dependency result rather than taking it on trust: it evaluated all 1147 lockfile entries against Node 24 and ran a live import of the PDF dependencies under v24.20.0, both clean. It again ran `cat AGENTS.md ...` as a disk read of files adjacent to the change — same behaviour as round 1, so that is now a pattern rather than a one-off. Invoked by running `scripts/codex-companion.mjs` directly, because `/codex:adversarial-review` carries `disable-model-invocation: true` and cannot be called by the model; flags were identical to what the slash command would have passed. Codex's only caveat matches the session's own stated limit: full build and deployed PDF render not independently verified by it. |

`model / effort` is what `~/.codex/config.toml` was set to, not what ran — the plugin gives no way to verify that from the thread (issue #705).

## Do not review

Any branch whose diff contains customer PII is reviewed locally or not at all. Codex review sends the reviewed content to OpenAI, and the ruling is that no customer PII goes to OpenAI (Michael, 2026-09-05). Check the diff for names, emails, phone numbers and addresses before running any `/codex:*` command on it.

- Branch `docs/backlog-pricing-canon-and-ledger`, 2998 insertions, documentation only, no logic. Exceeds the ~150 line review limit by 20x and carries redacted customer data. Reviewed by Michael, not Codex. Round 1 smoke test on ddfa6ca stands as the loop's proof. (Michael, 2026-09-05)
- Commit `3af5241` (branch `docs/todo-node24-verified`), 7 insertions / 3 deletions, tracker text only — row N wording, the T13 note, and new rows P2-18 and P2-19 — no code and no config. Deliberately not reviewed: the round 2 review ran on the pin branch before this follow-up existed, and re-running `--base main` after the merge would have reviewed an empty diff and exited 0. Recorded so the gap is on the record rather than looking like an oversight. (Michael, 2026-09-05)

## Setup findings, 2026-09-05

1. **#684 split-root observed live.** The companion writes `stopReviewGate` to `os.tmpdir()/codex-companion/<workspace>/state.json` unless `CLAUDE_PLUGIN_DATA` is set, and it is not set in Claude Code's Bash tool. The Stop hook runs with it set and reads `~/.claude/plugins/data/codex-openai-codex/`, which is empty, so it falls back to the default. The gate is off in both roots, but only because the default is off, not because we set it there. If the default ever flips, this bites.
2. **`review_model` recognition unverified on codex-cli 0.153.2.** All three keys (`model`, `model_reasoning_effort`, `review_model`) are set to `gpt-6-astra` / `high` as the #705 mitigation. Whether the plugin honours `review_model` specifically could not be confirmed without spending quota. An unknown, not a pass.
3. **Pinned at codex-cli 0.153.2.** `codex doctor` reports 0.153.4 available. Staying pinned until three logged runs are done.

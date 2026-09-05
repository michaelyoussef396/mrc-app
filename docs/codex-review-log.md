# Codex review log

One row per review. This log is the only input for any knowledge-base entry on this workflow.

| date | repo / worktree | diff lines | review type | model / effort | findings | acted | rejected | unclear | missed later | wall time | usage after `/status` | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-05 | mrc-merge / docs/backlog-pricing-canon-and-ledger, ddfa6ca vs main 3191a39 | 93 added, 3 files | adversarial, foreground, `--wait --base main`, MRC default focus, round 1 of 2 | gpt-6-astra / high, config intent only (#705) | 0 | 0 | 0 | 0 | — | 26s | not captured, no non-interactive path found | Target: `branch diff against main`. Verdict: approve. Codex thread `01a0704d-d03b-7422-b6a7-734dadbb0329`. Smoke test on the Part A setup diff, docs only. During the review Codex ran `cat AGENTS.md; cat AGENTS.override.md` as a disk read of files adjacent to the change; `codex debug prompt-input` confirms the instruction channel carried only the override. No git hooks in this repo, so #697 does not apply. Review gate off in both state roots (see Setup findings 1). |

`model / effort` is what `~/.codex/config.toml` was set to, not what ran — the plugin gives no way to verify that from the thread (issue #705).

## Do not review

Any branch whose diff contains customer PII is reviewed locally or not at all. Codex review sends the reviewed content to OpenAI, and the ruling is that no customer PII goes to OpenAI (Michael, 2026-09-05). Check the diff for names, emails, phone numbers and addresses before running any `/codex:*` command on it.

## Setup findings, 2026-09-05

1. **#684 split-root observed live.** The companion writes `stopReviewGate` to `os.tmpdir()/codex-companion/<workspace>/state.json` unless `CLAUDE_PLUGIN_DATA` is set, and it is not set in Claude Code's Bash tool. The Stop hook runs with it set and reads `~/.claude/plugins/data/codex-openai-codex/`, which is empty, so it falls back to the default. The gate is off in both roots, but only because the default is off, not because we set it there. If the default ever flips, this bites.
2. **`review_model` recognition unverified on codex-cli 0.153.2.** All three keys (`model`, `model_reasoning_effort`, `review_model`) are set to `gpt-6-astra` / `high` as the #705 mitigation. Whether the plugin honours `review_model` specifically could not be confirmed without spending quota. An unknown, not a pass.
3. **Pinned at codex-cli 0.153.2.** `codex doctor` reports 0.153.4 available. Staying pinned until three logged runs are done.

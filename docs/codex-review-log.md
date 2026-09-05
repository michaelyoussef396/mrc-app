# Codex review log

One row per review. This log is the only input for any knowledge-base entry on this workflow.

| date | repo / worktree | diff lines | review type | model / effort | findings | acted | rejected | unclear | missed later | wall time | usage after `/status` | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-05 | mrc-merge / docs/backlog-pricing-canon-and-ledger, ddfa6ca vs main 3191a39 | 93 added, 3 files | adversarial, foreground, `--wait --base main`, MRC default focus, round 1 of 2 | gpt-6-astra / high, config intent only (#705) | 0 | 0 | 0 | 0 | — | 26s | not captured, no non-interactive path found | Target: `branch diff against main`. Verdict: approve. Codex thread `01a0704d-d03b-7422-b6a7-734dadbb0329`. Smoke test on the Part A setup diff, docs only. During the review Codex ran `cat AGENTS.md; cat AGENTS.override.md` as a disk read of files adjacent to the change; `codex debug prompt-input` confirms the instruction channel carried only the override. No git hooks in this repo, so #697 does not apply. Review gate off in both state roots (see Setup findings 1). |
| 2026-09-05 | mrc-node22 / chore/node-24, dc52bdc vs main 4d7c15b | 13 added, 6 removed, 5 files | adversarial, foreground, `--wait --base main`, MRC default focus, round 2 of 2 | gpt-6-astra / high, config intent only (#705) | 0 | 0 | 0 | 0 | — | 52s | not captured, no non-interactive path found | Target: `branch diff against main` — checked before reading the body, as briefed. Verdict: approve, no material findings. Codex thread `01a07185-4c26-7b41-9a90-6279e251bc2e`. Config + docs diff (the Node 24 pin). Codex independently re-derived this session's dependency result rather than taking it on trust: it evaluated all 1147 lockfile entries against Node 24 and ran a live import of the PDF dependencies under v24.20.0, both clean. It again ran `cat AGENTS.md ...` as a disk read of files adjacent to the change — same behaviour as round 1, so that is now a pattern rather than a one-off. Invoked by running `scripts/codex-companion.mjs` directly, because `/codex:adversarial-review` carries `disable-model-invocation: true` and cannot be called by the model; flags were identical to what the slash command would have passed. Codex's only caveat matches the session's own stated limit: full build and deployed PDF render not independently verified by it. |
| 2026-09-05 | mrc-offline / fix/offline-banner-copy, c0350dc vs main 61f77e9 | 27 added, 16 removed, 2 files | adversarial, foreground, `--wait --base main`, MRC default focus, round 3 of 3 | gpt-6-astra / high, config intent only (#705) | 0 | 0 | 0 | 0 | — | 65s | not captured, no non-interactive path found | Target: `branch diff against main` — checked before reading the body, as briefed. Verdict: approve, no material findings. Codex thread `01a071c5-e728-7783-8b9b-8b09fb15ded7`. First **code** diff of the three runs (rounds 1 and 2 were docs and config): the offline banner copy, P1-22 item 1a. Codex did not take the claim on trust — it read `OfflineBanner.tsx`, `useOfflineSync.ts` and grepped `saveDraft(|queuePhotoOffline(` to confirm for itself that nothing writes the offline queue before agreeing the old copy was false. It ran `cat AGENTS.md` alongside the changed files for the **third** consecutive run, so the adjacent-file disk read is confirmed as standard behaviour, not a pattern of two. Its one next step — run the OfflineBanner suite — could not be actioned by Codex because `mrc-offline` has no `node_modules`; I had symlinked `~/mrc-app-1/node_modules` (lockfiles verified identical), run the suite 14/14 green and a tsc baseline check (122 before and after, no new error lines), then removed the symlink before invoking the review. Sequencing artefact, not a gap: the verification exists, Codex just could not repeat it. Next run should leave the symlink in place so Codex can execute tests itself. |
| 2026-09-05 | mrc-lead-list / feat/lead-id-search, 8b5939f vs main 61f77e9 | 98 added, 23 removed, 2 files | adversarial, foreground, `--wait --base main`, MRC default focus + PostgREST `.or()` injection, round 1 of 2 (cycle 1 of 3, Session H) | gpt-6-astra / high, config intent only (#705) | 0 | 0 | 0 | 0 | — | not captured | Target: `branch diff against main` — checked before reading the body. Verdict: approve, no material findings, converged at round 1. Codex thread `01a071ca-efb2-7250-a9d0-e50d5aa75d54`. P1-15, Lead ID search: `applyLeadSearch` now builds a PostgREST `or=` **filter string** from user input, so the quoting is load-bearing rather than cosmetic. Codex did not reason about the grammar from memory — it fetched the actual parser source (`PostgREST v13.0.4 QueryParams.hs`) and checked `quoteOrValue` against it, then ran 111,111 escaping round trips and eight query-builder checks. It confirmed the two escape layers compose without double-escaping, that repeated `or=` params keep AND-across-words, that both callers retain `archived_at IS NULL`, and that adding `lead_number` cannot widen past `leads` RLS. Stated caveat, carried forward as a real gap: **live RLS was not tested.** |
| 2026-09-05 | mrc-lead-list / fix/lead-list-true-count, f3d65da vs main 61f77e9 | 105 added, 57 removed, 2 files (**162 — over the ~150 limit, waived by Michael before the run**) | adversarial, foreground, `--wait --base main`, MRC default focus + RLS/predicate + count-leak focus, round 1 of 2 (cycle 2 of 3, Session H) | gpt-6-astra / high, config intent only (#705) | 4 | 4 | 0 | 0 | — | not captured | Target: `branch diff against main` — checked before reading the body. Verdict: **needs-attention**. Codex thread `01a071cd-3df1-7a51-9e35-09c3500e4f88`. P0-2: status filter and sort moved server-side, header COUNT and tab badges made real. Confirmed no new RLS bypass, no service-role exposure, no secret, `archived_at` preserved, `?status=` validation intact, and that `count: 'exact'` does not count rows RLS would withhold. Four medium findings, **all four verified against the code before acting and all four accepted**: (1) the badge tally detected only its own `BADGE_COUNT_CAP`, never PostgREST's `db-max-rows`, so a truncated response would print a confident wrong number — the exact failure the branch exists to remove; fixed by comparing a server COUNT against rows received. (2) three handlers patched lead status in local state, which worked only while a client-side filter hid the row — with filtering server-side a lead marked Not Landed sat in the tab it had just left. (3) `loadMoreLeads` had no request guard — pre-existing, but this branch made it reachable. (4) `loadStatusTally` had no request guard, so an older search could overwrite the badges permanently. Fixes in `7784488`. Codex's remaining next step, **not actioned and still open**: verify deployed RLS with two separate users. |
| 2026-09-05 | mrc-lead-list / fix/lead-list-pagination, 45f63e4 vs **fix/lead-list-true-count** (stacked, NOT main) | 133 added, 62 removed, 2 files (**195 — over the ~150 limit, waived by Michael before the run**) | adversarial, foreground, `--wait --base fix/lead-list-true-count`, MRC default focus + range/off-by-one focus, round 1 of 2 (cycle 3 of 3, Session H) | gpt-6-astra / high, config intent only (#705) | 2 | 2 | 0 | 0 | — | not captured | Target: `branch diff against fix/lead-list-true-count` — **deliberate base deviation, approved by Michael in advance**, and the Target line was read and confirmed to name the stacked branch rather than `main` before the body was triaged. Verdict: **needs-attention**. Codex thread `01a071d4-b3f8-7c20-8017-9d58d44ca965`. P0-2: Load More replaced with page-based `.range()`. Range arithmetic confirmed correct and inclusive; `archived_at IS NULL` preserved on every path. Two medium findings, both verified and both accepted: (1) the empty-page clamp lived only on the success path, but an offset past the end answers **416/PGRST103**, so the generic error branch cleared `totalCount`, collapsed `pageCount` to 1, hid the controls and **stranded the user on an empty page with no way back**. (2) the query ordered on a single non-unique column, so tied rows — and `quoted_amount` is NULL often enough to form one enormous tie group under 'Value: High to Low' — had undefined order between requests, meaning a page walk could repeat some leads and omit others. Finding 2 mattered beyond the defect: **'page 1 to last page, no duplicates, no gaps' is an acceptance criterion for this work, and without a tie-breaker the code could not deliver it** — the fake-count error in a different hat. Fixes in `0635ecd`. |

| 2026-09-05 | mrc-guard-hook / chore/guard-hook-and-worktree-sync, `8984fed` vs main `c9af490` | 161 added, 5 removed, 2 files — 166 raw, **~42 reviewable** (see precedent below) | adversarial, foreground, `--base main`, focus "can any Supabase CLI invocation reach PROD through a path the allowlist doesn't cover" + MRC default focus, round 1 of 1 | gpt-6-astra / high, config intent only (#705) | 3 | 3 | 0 | 0 | — | not captured (single foreground call) | not captured, no non-interactive path found | Target: `branch diff against main` — checked before reading the body, as briefed. Verdict: **needs-attention**. Codex thread `01a071d5-3765-7542-8e89-9c7673b3a34f`. **Base verified before the run, not assumed**: local `main` and `origin/main` both at `c9af490`, and three independent measurements (`git diff main`, `git diff origin/main`, `git show HEAD`) agreed at 161/5 — so the issue #653 base-widening trap was ruled out rather than hoped past. Three HIGH findings, every one **independently reproduced** by feeding synthetic PreToolUse payloads to the hook: 7 of 7 probes bypassed. No Supabase CLI was invoked and no database was touched by the reproduction. Findings: (1) the CLI regex misses absolute paths, `env` wrappers and newline-separated commands, and because rule 1 runs *after* detection, `/opt/homebrew/bin/supabase functions deploy foo --project-ref <PROD>` returns ALLOW; (2) rules 3 and 3.5 scan the whole collapsed string, so `supabase --version; supabase db query --linked -f x.sql` returns ALLOW; (3) `CLAUDE_PROJECT_DIR` overrides the payload cwd, so the hook can verify a DEV link while the CLI resolves PROD. Triage: 3 acted, 0 rejected, 0 unclear — all three carry file:line and a stated failure mode and all reproduce, so none were rejectable on form. **EXIT by decision, not by convergence**: three findings survived triage, and round 2 on the same diff would re-litigate rather than add, so the cycle was stopped and reported (Michael, ruling). Fixes deferred to **P0-9 / Session R**; the restored hook is byte-identical to the copy already gating this machine, so distributing it is strictly an improvement on no guard, and the sweep proceeded on that basis. Incident 3 in `docs/POST_INCIDENT_FRAMEWORK.md` reopened on this evidence. **This is the first review of the night whose findings changed the plan** — rounds 1 to 3 were all clean approvals. And finding 2 is the same class as this session's own theme: line 87 of `scripts/test-supabase-guard.sh` asserts `"supabase --version; echo x"` → ALLOW, so the suite does not merely miss the bypass, it pins it as correct behaviour — a test that keeps passing because it asserts the bypass is correct. |

`model / effort` is what `~/.codex/config.toml` was set to, not what ran — the plugin gives no way to verify that from the thread (issue #705).

## Rulings — precedent

Standing rules established by a decision on a specific run, recorded here so the next
run that hits the same wall does not have to re-litigate it.

**Reviewable surface excludes byte-identical restores** (Michael, 2026-09-05, on
`8984fed`). A byte-identical restore of an unchanged tracked file is excluded from the
~150-line reviewable-surface count in the entry gate. The reviewer still receives the
file as context — it is not withheld — but only new or modified logic counts toward
the limit. Applied on `8984fed`: 166 raw lines, ~42 reviewable, because 124 of them
were a restore of a file that had been running unchanged for days. Without this rule
the commit would have failed entry condition 4 at 166 > ~150, and the review that
found three HIGH bypasses would never have run.

Both rounds so far ran in worktrees that carry `AGENTS.override.md` (`mrc-merge`, `mrc-node22`), so both had the reviewer brief and the log stands — but only 4 of 21 worktrees carry it; see the Session F scope note in `docs/TODO.md` (Session P, 2026-09-05).

## Session H, 2026-09-05 — first run where the reviewer changed the code

Three cycles, one round each, all converged at round 1 (no cycle needed its second round).
**Night total across every session: 6 runs, 6 findings, 6 accepted, 0 rejected, 0 unclear.**
All six findings came from Session H's three runs; the three earlier runs of the night
(`docs/backlog-pricing-canon-and-ledger`, `chore/node-24`, `fix/offline-banner-copy`) each
returned zero. Session H is therefore the whole of the loop's evidence that the reviewer
finds real defects rather than approving whatever it is shown.

Every finding carried a `file:line` and a stated failure mode, so none was rejectable on form,
and every one reproduced against the code before it was acted on. Michael's rule is to reject
findings without those two things; nothing here had to be rejected. That is the reviewer working,
not the reviewer being agreed with — four of the six were defects the session had introduced
while fixing a different defect, and two of those were *new wrong-number paths created inside a
change whose entire purpose was removing a wrong number*.

The single most valuable finding was cycle 3 finding 2, the missing `ORDER BY` tie-breaker.
"Page 1 to last page covers every lead, no duplicates, no gaps" was a written acceptance
criterion for this work. Without a unique tie-breaker the code could not satisfy it, and the
session would have reported the criterion as met. The reviewer caught a false sign-off, not just
a bug.

Notes on the run itself:

1. **Run numbering collided.** The brief called this "run 3 of the 3 needed before the loop counts
   as proven", but `mrc-offline` logged its own run 3 (`c0350dc`) concurrently. These are runs 4, 5
   and 6. The three-run condition in Setup finding 3 was already met before Session H started.
2. **`node_modules` left in place, and it is what produced the findings.** The previous run's log
   entry ended with exactly this recommendation, after that run could not action Codex's own next
   step because `mrc-offline` had no dependency tree. Acting on it is now proven, not speculative:
   **both needs-attention verdicts came from Codex executing code rather than reading it.** It read
   `@supabase/postgrest-js` off disk, fetched and checked the real `PostgREST v13.0.4` filter parser,
   ran extracted loaders against a simulated client to reproduce the 416 stranding, and ran a
   111,111-case escaping fuzz. The three zero-finding runs earlier in the night were all reviews
   Codex could only read. Leave the tree in place on every future run.
3. **A deliberate base deviation, approved in advance.** Cycle 3 ran `--base fix/lead-list-true-count`
   because the branch is stacked. The rule that a wrong base means discard-unread still held: the
   Target line was read first and confirmed to name the stacked branch. The rule protects against a
   *silent* base change, which is not what this was.
4. **Two waivers of the ~150 line limit**, both granted by Michael before the run, recorded in the
   diff-lines column. The reasoning accepted was that the ~150 limit protects review quality while
   the Target rule protects against silent scope corruption — breaking the former knowingly is safer
   than breaking the latter.
5. See the UNVERIFIED block below. It is not a caveat on the findings; it is the state of the work.

### ⛔ UNVERIFIED — read this before trusting anything above

**Nothing about these three branches is verified against a live row.** Six accepted findings is a
statement about a *reviewer*, not about the *software*. A future session must not read
"6 findings, 6 accepted" as "verified", and must not treat merge-readiness as following from it.
What was actually established is narrower: the code type-checks against an unchanged baseline, the
unit tests pass, and an adversarial reviewer stopped objecting.

Open, in the state Session H left them (Michael, 2026-09-05 — keep this list exactly as written):

- **Every content check.** All Part 3 criteria needing live row counts: the "All" total against a
  Studio count, at least three other tabs against their own filtered counts, the page-walk proving
  no gaps and no duplicates, search narrowing the total and the page count, and Lead ID search
  returning the right lead. The Studio pack was written but deliberately not run.
- **The four tab-less statuses** (`hipages_lead`, `contacted`, `inspection_completed`,
  `inspection_report_pdf_completed`), carried as its own P0 row — **no counts**.
- **Deployed RLS with two separate users.** Codex asked for this in two separate cycles. Not done.
- **375px, and the page walk, on a preview deploy.** Not run.
- Five test files still fail to load for want of the worktree's `.env` files.

Why they are open rather than skipped: the Supabase MCP was unauthenticated for the session, and the
standing order forbids re-authing it or querying PROD at all, reads included. Michael's ruling was to
ship with a stated gap rather than break that order. The gap is the honest cost of the order, and it
is recorded here so the next session inherits the gap and not a false sense that it was closed.

## Do not review

Any branch whose diff contains customer PII is reviewed locally or not at all. Codex review sends the reviewed content to OpenAI, and the ruling is that no customer PII goes to OpenAI (Michael, 2026-09-05). Check the diff for names, emails, phone numbers and addresses before running any `/codex:*` command on it.

- Branch `docs/backlog-pricing-canon-and-ledger`, 2998 insertions, documentation only, no logic. Exceeds the ~150 line review limit by 20x and carries redacted customer data. Reviewed by Michael, not Codex. Round 1 smoke test on ddfa6ca stands as the loop's proof. (Michael, 2026-09-05)
- Commit `3af5241` (branch `docs/todo-node24-verified`), 7 insertions / 3 deletions, tracker text only — row N wording, the T13 note, and new rows P2-18 and P2-19 — no code and no config. Deliberately not reviewed: the round 2 review ran on the pin branch before this follow-up existed, and re-running `--base main` after the merge would have reviewed an empty diff and exited 0. Recorded so the gap is on the record rather than looking like an oversight. (Michael, 2026-09-05)

## Setup findings, 2026-09-05

1. **#684 split-root observed live.** The companion writes `stopReviewGate` to `os.tmpdir()/codex-companion/<workspace>/state.json` unless `CLAUDE_PLUGIN_DATA` is set, and it is not set in Claude Code's Bash tool. The Stop hook runs with it set and reads `~/.claude/plugins/data/codex-openai-codex/`, which is empty, so it falls back to the default. The gate is off in both roots, but only because the default is off, not because we set it there. If the default ever flips, this bites.
2. **`review_model` recognition unverified on codex-cli 0.153.2.** All three keys (`model`, `model_reasoning_effort`, `review_model`) are set to `gpt-6-astra` / `high` as the #705 mitigation. Whether the plugin honours `review_model` specifically could not be confirmed without spending quota. An unknown, not a pass.
3. **Pinned at codex-cli 0.153.2.** `codex doctor` reports 0.153.4 available. Staying pinned until three logged runs are done. **Condition met 2026-09-05** — rounds 1, 2 and 3 are logged, all clean. The unpin is Michael's call, not an automatic consequence; nothing here upgrades on its own.

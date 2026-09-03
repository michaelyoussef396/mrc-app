# Post-Incident Framework

Standing process. Not a fix log — a fix log records what was repaired, and repairs
are not what stop recurrence.

## The four fields

Every incident gets an entry with all four. An entry missing the fourth is not an
entry; it is a note.

1. **What happened** — the observable event, dated, with the command or change that
   produced it.
2. **The mechanism that allowed it** — the thing about the system that made the
   event possible. Not the person, not the moment of inattention. If the entry
   reads "someone forgot", the mechanism has not been found yet.
3. **Why existing guards didn't catch it** — we usually had a guard. Say precisely
   why it did not apply. "There was no guard" is a valid answer and an important
   one; "the guard matched the wrong thing" is more common.
4. **The change that makes recurrence impossible** — a mechanism, not a resolution.

## The rule on field 4

> A resolution to be careful is not a control. If the only thing standing between
> the system and a repeat is that someone remembers, nothing has changed.

Field 4 must name something that would refuse the action, or make the wrong state
unrepresentable, or surface the divergence without being asked. Concretely, in
descending order of strength:

- **Impossible** — the wrong state cannot be expressed. The file is not in git, so
  there is no default to inherit.
- **Refused** — a check denies the action at the moment it is attempted, and fails
  closed when it cannot tell.
- **Surfaced** — the divergence is reported automatically, whether or not anyone
  thought to look.

"Documented", "agreed", and "we'll remember" are none of these. If the best
available answer today is one of those, write it down as **Open** with the
mechanism that would close it. An honest Open beats a false Closed.

## Adding an entry

```markdown
### N — YYYY-MM-DD: one-line title

**What happened.**
**Mechanism.**
**Why guards missed it.**
**Change.**
**Status.** Closed | Partial | Open — with the closing mechanism if not Closed.
```

Status means: **Closed** — a mechanism from the list above is in place and verified.
**Partial** — a mechanism covers some of it; name what is uncovered. **Open** — no
mechanism yet; name the one that would work.

---

# Incident register

### 1 — 2026-08-27: migration applied to PROD from a file marked NOT APPLIED

**What happened.** A migration whose own header read `STATUS: NOT APPLIED` was
applied to the production project via `npx supabase db query --linked -f`.

**Mechanism.** Two independent things lined up. `--linked` resolves its target from
`supabase/.temp/project-ref`; that file was tracked in git and carried the PROD ref,
so every worktree and every clone defaulted to production. Separately, the approval
state existed only as prose inside a SQL comment — no code read it, so
`STATUS: NOT APPLIED` constrained nothing. The command named no project, so nothing
about it looked dangerous at the point of execution.

**Why guards missed it.** `block-supabase-mcp-writes.sh` matches MCP tool names and
never sees a Bash command. `block-dangerous-commands.sh` had no Supabase rules.
Nothing parsed migration headers. The default target was both wrong and invisible.

**Change.**
- `supabase/.temp/` untracked — `5c8abbc` on main, `b958ecd` for the branch that
  predated it. No default target ships in git. *(impossible)*
- Guard rule 4 denies `--linked` and requires an explicit DEV ref. *(refused)*
- Guard rule 2 denies `db push` / `db reset` / `migration repair` by name. *(refused)*
- `db query` is deliberately excluded from the read-only allowlist added 2026-09-03,
  because it executes arbitrary SQL. *(refused)*

**Status.** **Partial.** The targeting half is closed. The approval half is not:
`STATUS: NOT APPLIED` is still unenforced prose, and a file marked unapplied can
still be executed by any path that reaches a database. Closing mechanism: a
pre-apply check that refuses to execute a `.sql` whose header declares it unapplied.
Not built.

---

### 2 — 2026-08-31 → 2026-09-03: guard hook committed to the repo but never registered

**What happened.** `.claude/hooks/block-supabase-prod.sh` was committed to main and
read as the project's Supabase guard. It was never referenced by
`.claude/settings.json`, so it never ran. The copy actually gating Bash was
`~/.claude/hooks/block-supabase-prod.sh`, registered in `~/.claude/settings.json`.
Found on 2026-09-03 when an edit to the repo copy changed no behaviour.

**Mechanism.** A hook executes from a path named in a settings file. Presence in
`.claude/hooks/` confers nothing. The two copies were byte-identical, so the
divergence produced no observable difference — the failure mode is silent by
construction, and stays silent until someone edits one copy and waits for a change
that never comes.

**Why guards missed it.** Nothing asserts that every file in `.claude/hooks/` is
referenced by some settings file, or that every registered path exists. There was
no observation that could have distinguished the two copies while they matched.

**Change.** Repo copy deleted 2026-09-03. `~/.claude/hooks/block-supabase-prod.sh`
is the single source of truth. `scripts/test-supabase-guard.sh` is tracked and pins
the guard's expected behaviour, so the contract is reviewable even though the hook
is not. *(impossible — there is only one file to edit)*

**Status.** **Partial.** The two-copy trap is gone. The surviving copy is
machine-local and untracked: no history, no review, and no propagation to another
machine or to Glen and Clayton. Closing mechanism: track the hook in the repo and
register it in `.claude/settings.json`, so the file and its registration travel in
the same commit and no worktree can have one without the other. Deferred on
2026-09-03 because 12 of 17 worktrees had not merged main; registering there while
removing the machine-local copy would have left them unguarded.

---

### 3 — 2026-09-03: a guard rule generalised one command's flags to a whole CLI

**What happened.** Guard rule 4 required `--project-ref <DEV>` on every Supabase
invocation. `migration list`, `db push`, `db dump` and `db query` have no such flag
— they target via `--linked`, `--db-url` or `--local`, and rule 4 separately denies
`--linked`. Read-only migration state was therefore unreachable from an agent
session, silently, and by no one's decision.

**Mechanism.** The guard was written from the flag surface of the single command
that caused the original incident (`functions deploy`, which does have
`--project-ref`) and applied to the entire CLI. The failure is silent because a
denial looks identical whether it is policy or an unmodelled flag: the message told
the caller to name the target explicitly, on commands that have no way to.

**Why guards missed it.** The hook had no tests. Its behaviour was only ever
observed when it fired, which tells you what it blocks and never what it blocks
wrongly.

**Change.**
- Read-only allowlist — `migration list`, `db diff`, `inspect db *` — permitted only
  when the hook itself reads `supabase/.temp/project-ref` and confirms DEV at invoke
  time. Fails closed when the file is missing, unreadable, or PROD, and refuses
  `--db-url` and `--workdir` because both make the target unverifiable from inside
  the hook. *(refused)*
- `scripts/test-supabase-guard.sh` — 15 fixtures asserting both allow and deny, so
  an over-broad rule fails a test instead of silently blocking work. *(surfaced)*

**Status.** **Closed.** Residual: the allowlist is safe only while every command on
it is incapable of writing. Verified against Supabase CLI 2.101.0. Re-run the test
suite on CLI upgrade — a command that gains a write path invalidates the rule with
nothing standing behind it.

---

### 4 — 2026-08-27 → 2026-09-03: a fix landed on main that four branches never received

**What happened.** `5c8abbc` untracked `supabase/.temp/` on main. Four branches had
diverged before it and kept the tracked PROD ref for a week: `launch/checks`,
`feat/area-hide-in-report-main`, `fix/attach-without-note-text`,
`feat/lead-note-mentions-attachments`. Any worktree on those branches still shipped
PROD as its default target, including `~/mrc-app-prod`.

**Mechanism.** A commit to a trunk does not reach branches that predate it. With 17
worktrees, branch staleness is invisible unless something measures it. "Fixed" was
asserted from the branch where the fix landed, which is the one branch guaranteed
to look correct.

**Why guards missed it.** Verification was branch-local. The fix was confirmed on
main and the question "which other branches lack it?" was never asked. No guard
covers repository topology.

**Change.** Safety-critical fixes are verified fleet-wide, not branch-local. The
check that found these four:

```bash
git merge-base --is-ancestor <fix-sha> <branch>
```

run across every worktree. A fix is not landed until that returns true for all of
them. *(surfaced)*

**Status.** **Partial.** Closed for this fix — all 17 worktrees verified at 0 tracked
`.temp` files on 2026-09-03. Open as a mechanism: that sweep was run by hand, and a
hand-run sweep is a resolution to be careful. Closing mechanism: a SessionStart hook
that warns when the current worktree lacks a named safety commit, so staleness
surfaces at the start of every session rather than when someone thinks to look.

---

### 5 — 2026-09-03: file-write protection matches tool names, not the protected resource

Found while doing the work above; not one of the four this register was seeded with.

**What happened.** The harness refused to author a hook script through the Write
tool. The same file had been modified successfully minutes earlier through Bash and
`python3`. Both edits were authorised work — the point is not that a rule was
broken, but that only one of the two paths was checked.

**Mechanism.** The protection is bound to tool names (`Write`, `Edit`), not to the
resource being protected. Any tool that can write bytes — a shell redirect, a
heredoc, an interpreter — reaches the same file without passing the check.

**Why guards missed it.** It *is* the guard; its matcher is the gap. The same shape
is already on record for the `~/okf` write gate, where a `Write|Edit` matcher left
Bash redirection unguarded. That it has now appeared twice is the signal worth
acting on.

**Change.** None yet.

**Status.** **Open.** Closing mechanism: a resource-bound check — a PreToolUse hook
on Bash that inspects the command for writes to protected paths. A tool-name-bound
check cannot be completed by adding more tool names, because the set of tools that
can write bytes is not enumerable in advance.

---

## Open items

| # | Open item | Closing mechanism | Strength |
|---|---|---|---|
| 1 | `STATUS: NOT APPLIED` in a migration header is unenforced prose | Pre-apply check that refuses to execute a `.sql` declaring itself unapplied | refused |
| 2 | The live guard hook is machine-local and untracked | Track it in the repo, register in `.claude/settings.json` so file and registration travel together | impossible |
| 4 | Fleet-wide staleness sweep is run by hand | SessionStart hook warning when the worktree lacks a named safety commit | surfaced |
| 5 | Write protection is bound to tool names, not resources | PreToolUse check on Bash inspecting for writes to protected paths | refused |

Review this table when an incident is added. An item that has been Open across
three incidents is telling you its closing mechanism is wrong, not that it needs
more resolve.

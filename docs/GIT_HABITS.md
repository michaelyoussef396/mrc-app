# GIT HABITS — MULTI-WORKTREE

**Why this exists.** On 5 Sep a full sequence of git commands ran in
`~/mrc-app-1` instead of `~/mrc-merge`. Git didn't error — it did
something plausible with the wrong files. A wrong commit landed on a
feature branch with Session E's message, and `git push origin main`
looked like it merged when it had done nothing.

Every command was correct. Only the directory was wrong.

## THE ONE HABIT

Before any git command that writes:

    pwd && git branch --show-current

Writes = add · commit · push · merge · checkout · reset · rm · stash
Reads are safe — status, log, diff, show can't hurt you.

## THE FOUR RULES

**1. Never `git add -u` or `git add -A`.** `git add -u docs/` is what
committed two unrelated files. With 32 dirty files in a worktree,
wildcards always pick up something you didn't mean. Explicit paths only.

**2. `git status` before `git add`, every time.** Count the files. If
the number surprises you, stop and find out why.

**3. Merge through GitHub, not locally.** Local merges need a clean
checkout of main and no worktree reliably has one. Use
github.com/michaelyoussef396/mrc-app/compare/main...BRANCH then
"Create a merge commit". Never squash, never rebase.

**4. Verify by content, never by exit code.**
    git show --stat <sha>
    git fetch origin && git log --oneline origin/main -3
If you didn't look, it didn't happen.

## THE SEQUENCE

    cd ~/<worktree>
    pwd && git branch --show-current
    git status
    git add <explicit> <paths>
    git status
    git commit -m "type: what changed"
    git push origin <branch>
    git show --stat HEAD

Then PR on GitHub, merge commit, then verify origin/main moved.

## STARTING A SESSION IN A WORKTREE

None of the 17 worktrees carry 394951c, so a session opened in one is
reading the old 2,624-line TODO.md.

    cd ~/<worktree>
    pwd && git branch --show-current
    git fetch origin
    git log --oneline -1
    git log --oneline origin/main -1
    git merge origin/main
    npx tsc -p tsconfig.app.json --noEmit 2>&1 | tail -1

The tsc baseline varies per worktree — 99, 122 and 135 all seen. Gate on
no new error lines in the same tree, never on the count.

## ENDING A SESSION

1. git status — only the files this session owned
2. git add explicit paths
3. Commit, push
4. git show --stat HEAD — verify
5. PR on GitHub, merge commit
6. git fetch origin && git log --oneline origin/main -3 — verify
7. Delete the branch, local and remote
8. Tick the item in docs/TODO.md
9. Write the ledger entry — same commit as the fix, never after

Steps 8 and 9 get skipped. That's why work gets relogged and why the
same bug class costs 40 minutes twice.

## AUTO MODE

`⏵⏵ auto mode on` self-enables. It turned itself on three times during
Session E, and once approved a 46-agent background workflow without
asking. Check the bottom of the terminal at session start and after
every compaction. Shift+Tab kills it.

## THE FAILURE PATTERN BEHIND ALL OF THIS

> A step looked complete because the previous step succeeded.

- The push worked, so the merge looked done — it wasn't
- The copy script ran, so the delete ran — verification had failed
- The CLI said success, so the deploy looked live — it was serving old
  code

The fix is always the same: check the thing itself, not the thing
before it.

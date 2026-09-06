#!/bin/bash
# Injects dynamic project context at session start.
# Used as a SessionStart hook.

CONTEXT=""

# Current branch (or detached HEAD)
BRANCH=$(git branch --show-current 2>/dev/null)
if [ -n "$BRANCH" ]; then
  CONTEXT="Branch: $BRANCH"
elif git rev-parse --git-dir >/dev/null 2>&1; then
  SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null)
  CONTEXT="HEAD: detached at $SHORT_SHA"
fi

# Last commit
LAST_COMMIT=$(git log --oneline -1 2>/dev/null)
if [ -n "$LAST_COMMIT" ]; then
  CONTEXT="$CONTEXT | Last commit: $LAST_COMMIT"
fi

# Uncommitted changes count
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$CHANGES" -gt 0 ] 2>/dev/null; then
  CONTEXT="$CONTEXT | Uncommitted changes: $CHANGES files"
fi

# Staged changes indicator
if ! git diff --cached --quiet 2>/dev/null; then
  CONTEXT="$CONTEXT | Staged: yes"
fi

# Stash count
STASH_COUNT=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
if [ "$STASH_COUNT" -gt 0 ] 2>/dev/null; then
  CONTEXT="$CONTEXT | Stashes: $STASH_COUNT"
fi

# Active PR on current branch (if gh CLI is available)
if command -v gh >/dev/null 2>&1; then
  PR_INFO=$(gh pr view --json number,title,state --jq '"PR #\(.number): \(.title) (\(.state))"' 2>/dev/null)
  if [ -n "$PR_INFO" ]; then
    CONTEXT="$CONTEXT | $PR_INFO"
  fi
fi

# --- Session log (docs/sessions/) -------------------------------------------
# On startup/clear, creates docs/sessions/<date>-<branch-slug>.md from
# _TEMPLATE.md and prints its path. If an earlier log exists for the same
# branch, its path and "Resume from here" section are printed so the new
# session continues from it. Paths resolve from this script's own location,
# so the byte-identical copy at ~/.claude/hooks/ and worktrees that predate
# the template are no-ops. Never fails the session.

SESSION_LOG_TZ="Australia/Melbourne"
SESSION_LOG_TOOL="CC"
SESSION_ID_FIELD="- Session id: "
RESUME_HEADING="## Resume from here"
HOOK_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
REPO_ROOT=$(cd "$HOOK_DIR/../.." && pwd -P)
SESSIONS_DIR="$REPO_ROOT/docs/sessions"
SESSION_TEMPLATE="$SESSIONS_DIR/_TEMPLATE.md"

# Hook stdin JSON, or empty when stdin is a terminal (manual run without a pipe).
read_hook_input() {
  if [ -t 0 ]; then printf ''; else cat; fi
}

# feat/Foo Bar -> feat-foo-bar. Detached HEAD -> detached-<short sha>.
branch_slug() {
  local raw="$1"
  [ -n "$raw" ] || raw="detached-$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null)"
  printf '%s' "$raw" | tr '[:upper:]' '[:lower:]' \
    | sed -e 's#[^a-z0-9._-]#-#g' -e 's#-\{2,\}#-#g' -e 's#^-##' -e 's#-$##'
}

# Path of the log already carrying this session id, or nothing.
find_session_log() {
  grep -l -F -- "${SESSION_ID_FIELD}$1" "$SESSIONS_DIR"/*.md 2>/dev/null | head -n 1
}

# Newest earlier log for this branch slug (any date, any -N suffix), or nothing.
find_prior_session_log() {
  ls -t "$SESSIONS_DIR"/*-"$1".md "$SESSIONS_DIR"/*-"$1"-[0-9]*.md 2>/dev/null | head -n 1
}

# First unused name: <date>-<slug>.md, then -2, -3, ...
next_free_session_log() {
  local base="$SESSIONS_DIR/$1-$2" n=2
  if [ ! -e "$base.md" ]; then printf '%s' "$base.md"; return 0; fi
  while [ -e "$base-$n.md" ]; do n=$((n + 1)); done
  printf '%s' "$base-$n.md"
}

# render_session_log <target> <date> <branch> <baseline> <session_id>
render_session_log() {
  local content
  content=$(cat "$SESSION_TEMPLATE")
  content=${content//"{{DATE}}"/$2}
  content=${content//"{{BRANCH}}"/$3}
  content=${content//"{{WORKTREE}}"/$REPO_ROOT}
  content=${content//"{{BASELINE_COMMIT}}"/$4}
  content=${content//"{{SESSION_ID}}"/$5}
  content=${content//"{{TOOL}}"/$SESSION_LOG_TOOL}
  printf '%s\n' "$content" > "$1"
}

# The "Resume from here" section of a log (it is the last section by template order).
resume_section() {
  sed -n "/^${RESUME_HEADING}/,\$p" "$1"
}

# Reuse the log for this session id; create one on startup/clear, pointing at
# the prior log for the branch if there is one; report none on resume/compact.
session_log_context() {
  local input session_id start_source existing log_date branch slug prior baseline target
  input=$(read_hook_input)
  session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)
  start_source=$(printf '%s' "$input" | jq -r '.source // empty' 2>/dev/null)
  [ -n "$session_id" ] || return 0
  existing=$(find_session_log "$session_id")
  if [ -n "$existing" ]; then
    printf 'Session log: %s (existing)\n' "${existing#$REPO_ROOT/}"
    return 0
  fi
  case "$start_source" in
    startup|clear) ;;
    *) printf 'Session log: none for this session (source=%s)\n' "${start_source:-unknown}"; return 0 ;;
  esac
  log_date=$(TZ="$SESSION_LOG_TZ" date +%Y-%m-%d)
  branch=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null)
  slug=$(branch_slug "$branch")
  prior=$(find_prior_session_log "$slug")
  baseline=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null)
  target=$(next_free_session_log "$log_date" "$slug")
  render_session_log "$target" "$log_date" "$branch" "$baseline" "$session_id" || return 0
  printf 'Session log: %s (created)\n' "${target#$REPO_ROOT/}"
  if [ -n "$prior" ]; then
    printf 'Prior log for this branch: %s — continue from it. Its "Resume from here":\n' "${prior#$REPO_ROOT/}"
    resume_section "$prior"
  fi
}

SESSION_LOG_CONTEXT=""
if command -v jq >/dev/null 2>&1 && [ -f "$SESSION_TEMPLATE" ]; then
  SESSION_LOG_CONTEXT=$(session_log_context)
fi

if [ -n "$CONTEXT" ]; then
  echo "$CONTEXT"
fi

if [ -n "$SESSION_LOG_CONTEXT" ]; then
  echo "$SESSION_LOG_CONTEXT"
fi

exit 0

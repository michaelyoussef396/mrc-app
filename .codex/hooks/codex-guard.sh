#!/bin/bash
# Codex PreToolUse (Bash) guard. Replays the payload through the tracked Claude
# Code guards so there is one source of truth, then adds the git staging rules
# from docs/GIT_HABITS.md that no Claude Code hook carries.
# Exit 2 = deny, exit 0 = allow. Fails closed: a missing jq or a missing guard
# script denies everything. Inert until trusted in Codex — see
# docs/CODEX_WORKFLOW.md section 6.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
CC_GUARDS="block-dangerous-commands.sh block-supabase-prod.sh"
GIT_ADD_ALL_RE='(^|[;&|(`]|\$\()[[:space:]]*git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?add([[:space:]]+[^[:space:]]+)*[[:space:]]+(-[a-zA-Z]*[Au][a-zA-Z]*|--all|--update)([[:space:]]|$)'
GIT_COMMIT_ALL_RE='(^|[;&|(`]|\$\()[[:space:]]*git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?commit([[:space:]]+[^[:space:]]+)*[[:space:]]+(-[a-zA-Z]*a[a-zA-Z]*|--all)([[:space:]]|$)'

INPUT="$(cat)"

deny() {
  jq -cn --arg reason "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  printf '%s\n' "$1" >&2
  exit 2
}

if ! command -v jq >/dev/null 2>&1; then
  printf '{"decision":"block","reason":"Blocked: jq is required by the Codex guard and is not installed. Failing closed."}\n'
  exit 2
fi

for guard in $CC_GUARDS; do
  script="$ROOT/.claude/hooks/$guard"
  [ -x "$script" ] || deny "Blocked: guard $script is missing or not executable. Failing closed."
  output="$(printf '%s' "$INPUT" | env -u CLAUDE_PROJECT_DIR "$script")"
  status=$?
  if [ "$status" -ne 0 ]; then
    reason="$(printf '%s' "$output" | jq -r '.hookSpecificOutput.permissionDecisionReason // empty' 2>/dev/null)"
    deny "${reason:-Blocked by $guard (exit $status).}"
  fi
done

CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' | tr '\n' ' ')"
[ -n "$CMD" ] || exit 0

if printf '%s' "$CMD" | grep -qE "$GIT_ADD_ALL_RE"; then
  deny "Blocked: git add -A / -u / --all / --update. Stage explicit paths only (docs/GIT_HABITS.md)."
fi

if printf '%s' "$CMD" | grep -qE "$GIT_COMMIT_ALL_RE"; then
  deny "Blocked: git commit -a / --all stages everything. Stage explicit paths, then commit (docs/GIT_HABITS.md)."
fi

exit 0

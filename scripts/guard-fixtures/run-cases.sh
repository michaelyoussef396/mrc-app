#!/bin/bash
# Probe harness for the Supabase PROD guard hook.
#
#   bash scripts/guard-fixtures/run-cases.sh <cases-file>
#
# Cases file: one case per line, TAB-separated. Blank lines and #comments ignored.
#   id <TAB> cwd_kind <TAB> projdir_kind <TAB> should <TAB> command
#     cwd_kind     : dev | prod | none      fixture worktree the payload cwd points at
#     projdir_kind : dev | prod | none | -  ( - leaves CLAUDE_PROJECT_DIR unset)
#     should       : ALLOW | DENY           what a CORRECT guard must answer
#     command      : {S} for the CLI name, {DEV} / {PROD} for the project refs,
#                    {PROD_UC} / {PROD_MC} for upper- and mixed-case PROD
#
# The placeholders exist so that no cases file has to contain the literal PROD
# ref: `permissions.deny` in .claude/settings.json hard-denies any Bash command
# carrying it, so a fixture written with the literal would be refused by the
# permission layer and never reach the hook — passing for the wrong reason.
# Refs are read from scripts/test-supabase-guard.sh, the one place they live.
#
# Nothing here invokes the Supabase CLI and nothing touches a database. The
# harness only feeds synthetic PreToolUse JSON to the hook and reports its exit
# status: 0 = ALLOW, anything else = DENY.
#
# Corpus: cases/ holds the 965 adversarial cases behind docs/LANE_R_PLAN.md,
# and confirmed.json the 101 that survived independent verification.

set -u

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
HOOK="${SUPABASE_GUARD_HOOK:-$REPO_ROOT/.claude/hooks/block-supabase-prod.sh}"
REF_SOURCE="$REPO_ROOT/scripts/test-supabase-guard.sh"
CASES="${1:-}"

[ -n "$CASES" ] && [ -r "$CASES" ] || {
  echo "usage: bash scripts/guard-fixtures/run-cases.sh <cases-file>" >&2
  exit 1
}
[ -r "$HOOK" ] || { echo "guard hook not readable: $HOOK" >&2; exit 1; }
[ -r "$REF_SOURCE" ] || { echo "ref source not readable: $REF_SOURCE" >&2; exit 1; }

DEV=$(grep -m1 '^DEV=' "$REF_SOURCE" | cut -d= -f2)
PROD=$(grep -m1 '^PROD=' "$REF_SOURCE" | cut -d= -f2)
S=supabase

# Case variants, derived from the ref above so no casing of it is ever typed into
# a fixture. Host names are case-insensitive, so all of these reach the same
# project and a correct guard refuses every one.
PROD_UC=$(printf '%s' "$PROD" | tr '[:lower:]' '[:upper:]')
PROD_MC=$(printf '%s' "$PROD" | awk '{print toupper(substr($0,1,4)) substr($0,5)}')

FX=$(mktemp -d)
trap 'rm -rf "$FX"' EXIT
mkdir -p "$FX/dev/supabase/.temp" "$FX/prod/supabase/.temp" "$FX/none/supabase/.temp"
printf '%s' "$DEV"  > "$FX/dev/supabase/.temp/project-ref"
printf '%s' "$PROD" > "$FX/prod/supabase/.temp/project-ref"
# $FX/none deliberately has no project-ref file.

json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

DEFECTS=0
CORRECT=0

while IFS=$'\t' read -r id cwdk projk should cmd; do
  case "${id:-}" in ''|'#'*) continue ;; esac
  [ -n "${cmd:-}" ] || continue

  cmd=${cmd//\{S\}/$S}
  cmd=${cmd//\{PROD_UC\}/$PROD_UC}
  cmd=${cmd//\{PROD_MC\}/$PROD_MC}
  cmd=${cmd//\{DEV\}/$DEV}
  cmd=${cmd//\{PROD\}/$PROD}

  payload=$(printf '{"cwd":"%s","tool_input":{"command":"%s"}}' \
    "$FX/$cwdk" "$(json_escape "$cmd")")

  if [ "$projk" = "-" ]; then
    printf '%s' "$payload" | env -u CLAUDE_PROJECT_DIR bash "$HOOK" >/dev/null 2>&1
  else
    printf '%s' "$payload" | CLAUDE_PROJECT_DIR="$FX/$projk" bash "$HOOK" >/dev/null 2>&1
  fi

  if [ $? -eq 0 ]; then got=ALLOW; else got=DENY; fi

  if [ "$got" = "$should" ]; then
    CORRECT=$((CORRECT + 1)); mark="ok      "
  else
    DEFECTS=$((DEFECTS + 1)); mark="**DEFECT"
  fi
  printf '%s %-8s got=%-5s should=%-5s  %s\n' "$mark" "$id" "$got" "$should" "$cmd"
done < "$CASES"

echo
printf 'correct %s, defects %s\n' "$CORRECT" "$DEFECTS"
[ "$DEFECTS" -eq 0 ]

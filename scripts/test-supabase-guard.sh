#!/bin/bash
# Behaviour contract for the Supabase PROD guard hook.
#
# Why this exists: on 2026-09-03 rule 4 of the guard was found to be silently
# blocking every read-only migration command. It required --project-ref on a CLI
# where only some commands have that flag. Nothing caught it, because the hook had
# no test for the commands it was supposed to ALLOW — a guard that is only ever
# observed when it fires cannot tell you what it is wrongly refusing.
#
# The hook itself is currently machine-local at ~/.claude/hooks/block-supabase-prod.sh
# and is NOT tracked in this repo. That is a known open item; see
# docs/POST_INCIDENT_FRAMEWORK.md, incident 2. This test is tracked so the expected
# behaviour is reviewable and reproducible even while the hook is not.
#
# Run after any edit to the hook:
#   bash scripts/test-supabase-guard.sh
#
# Nothing here invokes the Supabase CLI or touches a database. It feeds synthetic
# PreToolUse payloads to the hook and asserts allow/deny.

HOOK="${SUPABASE_GUARD_HOOK:-$HOME/.claude/hooks/block-supabase-prod.sh}"
DEV=ctppzqnysmzynkxjlzta
PROD=ecyivrxjpsmjmexqatym

if [ ! -r "$HOOK" ]; then
  echo "guard hook not found at $HOOK" >&2
  echo "set SUPABASE_GUARD_HOOK to override" >&2
  exit 1
fi

FX=$(mktemp -d)
trap 'rm -rf "$FX"' EXIT
mkdir -p "$FX/dev/supabase/.temp" "$FX/prod/supabase/.temp" "$FX/none/supabase/.temp"
printf '%s' "$DEV"  > "$FX/dev/supabase/.temp/project-ref"
printf '%s' "$PROD" > "$FX/prod/supabase/.temp/project-ref"
# $FX/none deliberately has no project-ref file.

PASS=0
FAIL=0

run() {
  local desc="$1" root="$2" cmd="$3" expect="$4" rc verdict mark
  printf '{"cwd":"%s","tool_input":{"command":"%s"}}' "$root" "$cmd" \
    | env -u CLAUDE_PROJECT_DIR bash "$HOOK" > /dev/null 2>&1
  rc=$?
  if [ "$rc" -eq 0 ]; then verdict=ALLOW; else verdict=DENY; fi
  if [ "$verdict" = "$expect" ]; then
    mark="ok  "
    PASS=$((PASS + 1))
  else
    mark="FAIL"
    FAIL=$((FAIL + 1))
  fi
  printf '  [%s] expected=%-5s got=%-5s  %s\n' "$mark" "$expect" "$verdict" "$desc"
}

echo "=== read-only allowlist, against a verified DEV link ==="
run "migration list"                 "$FX/dev"  "supabase migration list --linked" ALLOW
run "db diff"                        "$FX/dev"  "supabase db diff --linked" ALLOW
run "inspect db bloat"               "$FX/dev"  "supabase inspect db bloat --linked" ALLOW

echo
echo "=== fail closed ==="
run "linked project is PROD"         "$FX/prod" "supabase migration list --linked" DENY
run "ref file missing"               "$FX/none" "supabase migration list --linked" DENY
run "--db-url (unverifiable target)" "$FX/dev"  "supabase migration list --db-url postgres://x" DENY
run "--workdir (relocates root)"     "$FX/dev"  "supabase migration list --linked --workdir /other" DENY

echo
echo "=== writes stay blocked (the 2026-08-27 path) ==="
run "db query -f"                    "$FX/dev"  "supabase db query --linked -f x.sql" DENY
run "db push"                        "$FX/dev"  "supabase db push --linked" DENY
run "db reset"                       "$FX/dev"  "supabase db reset --linked" DENY
run "command naming the PROD ref"    "$FX/dev"  "supabase migration list --project-ref $PROD" DENY

echo
echo "=== unchanged behaviour ==="
run "functions deploy, DEV ref"      "$FX/dev"  "supabase functions deploy foo --project-ref $DEV" ALLOW
run "bare command, no target"        "$FX/dev"  "supabase projects list" DENY
run "not a supabase command"         "$FX/dev"  "git status" ALLOW
run "help behind a semicolon"        "$FX/dev"  "supabase --version; echo x" ALLOW

echo
printf 'passed %s, failed %s\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]

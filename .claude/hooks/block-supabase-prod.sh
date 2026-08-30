#!/bin/bash
# Denies any Bash invocation of the Supabase CLI or Management API that does not
# explicitly and exclusively target DEV.
#
# Why this exists: on 2026-08-27 a migration whose own header read
# "STATUS: NOT APPLIED" was applied to PROD by `npx supabase db query --linked -f`.
# `--linked` resolves from supabase/.temp/project-ref, which was git-tracked and
# carried the PROD ref, so every worktree and clone defaulted to production. The
# MCP guard (block-supabase-mcp-writes.sh) matches MCP tool names only and never
# sees a Bash command; block-dangerous-commands.sh had no Supabase rules at all.
#
# This hook gates the AGENT's Bash tool. It does not gate Michael's own terminal,
# which is where CLAUDE.md already says PROD Edge Function deploys are run by hand.
#
# PreToolUse hook. Matcher: Bash. Exit 2 = block, exit 0 = allow.

PROD_REF="ecyivrxjpsmjmexqatym"
DEV_REF="ctppzqnysmzynkxjlzta"

deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
  exit 2
}

if [ -z "$(command -v jq)" ]; then
  deny "jq is required for the Supabase PROD guard but is not installed. Failing closed."
fi

CMD=$(cat | jq -r '.tool_input.command // empty')
[ -z "$CMD" ] && exit 0

# Collapse newlines so multi-line commands are scanned as one string.
SCAN=$(printf '%s' "$CMD" | tr '\n' ' ')

# A Supabase CLI invocation: `supabase` at the start of a command segment,
# optionally behind env assignments and/or a package runner. Deliberately does
# NOT match `grep supabase ...`, `cat supabase/config.toml`, `ls supabase/.temp`.
CLI_RE='(^|[;&|(`]|\$\()[[:space:]]*([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*((npx|bunx|pnpm[[:space:]]+dlx|yarn[[:space:]]+dlx)[[:space:]]+(-y[[:space:]]+)?)?supabase([[:space:]]|$)'

# A Management API call: a network client plus the control-plane host.
API_RE='(curl|wget|http|xh)([[:space:]]|$)'
HOST_RE='api\.supabase\.(com|io)'

IS_CLI=0; IS_API=0
printf '%s' "$SCAN" | grep -qE "$CLI_RE" && IS_CLI=1
{ printf '%s' "$SCAN" | grep -qE "$API_RE" && printf '%s' "$SCAN" | grep -qE "$HOST_RE"; } && IS_API=1

# Not a Supabase control-plane command — none of this hook's business.
[ "$IS_CLI" -eq 0 ] && [ "$IS_API" -eq 0 ] && exit 0

# 1. The production ref is never permitted from an agent session.
if printf '%s' "$SCAN" | grep -qF "$PROD_REF"; then
  deny "Blocked: this command targets the PROD Supabase project ($PROD_REF, live customer data on mrcsystem.com). Agent sessions may only target DEV ($DEV_REF). If a PROD operation is genuinely required, Michael runs it himself in his own terminal, per CLAUDE.md."
fi

# 2. Commands that rewrite migration history are never permitted. The history is
#    forked 124 files deep and the project's standing policy is no repair.
if printf '%s' "$SCAN" | grep -qE 'db[[:space:]]+(push|reset)|migration[[:space:]]+repair'; then
  deny "Blocked: db push / db reset / migration repair are not permitted. Migration history is forked 124 files deep and the project's standing policy is that it is never repaired."
fi

# 3. Harmless introspection with no target is fine.
if printf '%s' "$SCAN" | grep -qE '(^|[[:space:]])(--help|-h|--version|-v)([[:space:]]|$)'; then
  exit 0
fi

# 4. The target must be named explicitly. This is what catches `--linked` and every
#    bare command that would otherwise resolve a default from config.toml or
#    supabase/.temp/project-ref.
if printf '%s' "$SCAN" | grep -qE -- '--linked([[:space:]]|=|$)'; then
  deny "Blocked: --linked resolves its target from supabase/.temp/project-ref, which is exactly how the 2026-08-27 unapproved PROD apply happened. Name the target explicitly: --project-ref $DEV_REF"
fi

if ! printf '%s' "$SCAN" | grep -qE -- "--project-ref([[:space:]]|=)+$DEV_REF"; then
  deny "Blocked: no explicit DEV target. Every Supabase command from an agent session must carry --project-ref $DEV_REF. Commands without a ref inherit a default target, and that default is PROD."
fi

exit 0

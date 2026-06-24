#!/bin/bash
# Blocks write/DDL operations issued through the Supabase MCP tools
# (apply_migration, execute_sql). Schema and data changes must be applied
# MANUALLY in Supabase Studio. Read-only SELECT/EXPLAIN/WITH queries are allowed
# so live-DB schema verification still works.
# PreToolUse hook. Matcher: mcp__.*supabase.*__(execute_sql|apply_migration)
# Exit 2 = block. Exit 0 = allow.

if [ -z "$(command -v jq)" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"jq is required for the Supabase MCP write-guard but is not installed."}}'
  exit 2
fi

INPUT=$(cat)
TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')

deny() {
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$1\"}}"
  exit 2
}

# apply_migration is always DDL — never allow it through MCP.
case "$TOOL" in
  *apply_migration*)
    deny "Blocked: database migrations must be applied manually in Supabase Studio, not via MCP. Generate the migration file and hand it to a human."
    ;;
esac

# execute_sql: allow read-only queries; block anything that writes or alters schema.
case "$TOOL" in
  *execute_sql*)
    QUERY=$(printf '%s' "$INPUT" | jq -r '.tool_input.query // empty')
    SCAN=$(printf '%s' "$QUERY" | sed 's/--.*$//' | tr '\n' ' ')
    if printf '%s' "$SCAN" | grep -qiwE 'ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|INSERT|UPDATE|DELETE|MERGE|REINDEX|VACUUM|CLUSTER|CALL'; then
      deny "Blocked: write/DDL via Supabase MCP execute_sql is not allowed. Apply changes manually in Supabase Studio. Read-only SELECT is permitted."
    fi
    if printf '%s' "$SCAN" | grep -qiE 'COMMENT[[:space:]]+ON|REFRESH[[:space:]]+MATERIALIZED'; then
      deny "Blocked: write/DDL via Supabase MCP execute_sql is not allowed. Apply changes manually in Supabase Studio. Read-only SELECT is permitted."
    fi
    ;;
esac

exit 0

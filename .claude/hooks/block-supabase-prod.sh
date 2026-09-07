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

PAYLOAD=$(cat)
CMD=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.command // empty')
[ -z "$CMD" ] && exit 0

# Collapse newlines so multi-line commands are scanned as one string.
SCAN=$(printf '%s' "$CMD" | tr '\n' ' ')

# 0. PROD is refused unconditionally, before any detection or classification, so
#    that no later rule can short-circuit it.
#
#    This was rule 1 and ran AFTER the CLI/API detection below, which made the
#    hook's whole reason to exist conditional on a regex recognising the command
#    name: one unrecognised wrapper word left IS_CLI at 0, the early exit fired,
#    and a command explicitly naming PROD ran (case e2 is a named PROD schema
#    push). Thirteen confirmed cases named PROD and were allowed — see
#    docs/LANE_R_PLAN.md and scripts/guard-fixtures/cases/confirmed.json.
#
#    The literal match is deliberate. The ref is a 20-character random string
#    occurring in no English word and no other identifier here, so there are no
#    spellings to enumerate and nothing to parse; and the PROD data-plane host
#    embeds it, so one match covers both. Fixture h13 proves that.
#
#    The match is case-folded because host names are case-insensitive: an
#    uppercase spelling of the ref inside a URL resolves to the same PROD host,
#    and the interpreter normalises it before the request goes out. Only the
#    haystack is lowered, never the pattern. Verified live 2026-09-07 while
#    closing this: the Bash(*<prod-ref>*) entry in .claude/settings.json is
#    itself case-SENSITIVE, so the uppercase spelling passed the permission
#    engine too. For that spelling this hook is the only thing that refuses it,
#    which is why the fold lives here and not only in the deny list.
#
#    The resulting over-block is INTENDED, ruled by Michael 2026-09-07: any
#    command naming the PROD ref or host is refused, a grep of the docs or a
#    commit message that quotes the ref included. Corpus cases verify-api2.tsv
#    g1 and g2 record that cost; they are a decision, not a defect, and must not
#    be "fixed" by narrowing this match. Narrowing it to exclude things that
#    look like prose is C11 again — you cannot tell a grep from a request
#    without parsing, which is R2b's job, not this rule's.
if printf '%s' "$SCAN" | tr '[:upper:]' '[:lower:]' | grep -qF "$PROD_REF"; then
  deny "Blocked: this command targets the PROD Supabase project ($PROD_REF, live customer data on mrcsystem.com). Agent sessions may only target DEV ($DEV_REF). If a PROD operation is genuinely required, Michael runs it himself in his own terminal, per CLAUDE.md."
fi

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

# 2. Commands that rewrite migration history are never permitted. The history is
#    forked 124 files deep and the project's standing policy is no repair.
if printf '%s' "$SCAN" | grep -qE 'db[[:space:]]+(push|reset)|migration[[:space:]]+repair'; then
  deny "Blocked: db push / db reset / migration repair are not permitted. Migration history is forked 124 files deep and the project's standing policy is that it is never repaired."
fi

# 3. Harmless introspection with no target is fine.
if printf '%s' "$SCAN" | grep -qE '(^|[[:space:]])(--help|-h|--version|-v)([[:space:];&|)]|$)'; then
  exit 0
fi

# 3.5. Read-only introspection against a VERIFIED DEV link.
#
#    These commands have no --project-ref flag. They target via --linked, --db-url
#    or --local only, so rule 4's requirement to name the target explicitly is
#    unsatisfiable for them: they were blocked as a side effect of rule 4 rather
#    than by any decision (found 2026-09-03). They are allowed only when this hook
#    itself reads supabase/.temp/project-ref and confirms DEV, so the target is
#    verified at invoke time instead of assumed.
#
#    db query is deliberately NOT on this list. It executes arbitrary SQL and is
#    exactly what applied a migration to PROD on 2026-08-27. The safety of this
#    rule rests entirely on every command in it being incapable of writing.
#
#    Verified against Supabase CLI 2.101.0. RE-CHECK ON CLI UPGRADE: if an
#    allowlisted command ever gains a write path, this rule silently stops being
#    safe and there is nothing else standing behind it.
READONLY_RE='(migration[[:space:]]+list|db[[:space:]]+diff|inspect[[:space:]]+db)([[:space:]]|$)'

if printf '%s' "$SCAN" | grep -qE "$READONLY_RE"; then
  # --db-url carries its own target (and a credential); --workdir relocates the
  # project root, so the ref file this hook reads would not be the one the CLI
  # resolves. Neither is verifiable from here. Fail closed.
  if printf '%s' "$SCAN" | grep -qE -- '--(db-url|workdir)([[:space:]]|=)'; then
    deny "Blocked: read-only introspection is allowed only against the verified DEV link. --db-url and --workdir make the target unverifiable from this hook, so they are refused."
  fi

  # Resolve exactly ONE project root and require that root's ref file. Searching
  # a list of candidate roots lets a project with no link silently borrow another
  # project's ref, which is the opposite of failing closed.
  HOOK_CWD=$(printf '%s' "$PAYLOAD" | jq -r '.cwd // empty')
  ROOT="${CLAUDE_PROJECT_DIR:-${HOOK_CWD:-$PWD}}"
  REF_FILE="$ROOT/supabase/.temp/project-ref"

  if [ ! -r "$REF_FILE" ]; then
    deny "Blocked: read-only introspection requires a verified DEV link, but $REF_FILE is missing or unreadable. Failing closed. Link DEV first with: supabase link --project-ref $DEV_REF"
  fi

  LINKED_REF=$(tr -d '[:space:]' < "$REF_FILE")
  if [ "$LINKED_REF" != "$DEV_REF" ]; then
    deny "Blocked: read-only introspection is permitted only against DEV ($DEV_REF), but the linked project in $REF_FILE resolves to '$LINKED_REF'. Failing closed."
  fi

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

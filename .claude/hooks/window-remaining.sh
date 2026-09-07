#!/bin/bash
# Prints the Claude Code 5-hour window: "five_hour 32% used, resets 22:50 AEST (12:50 UTC)",
# plus "window low: ..." on a second line at >= 80% used, or the single word "unknown" on any
# failure (no jq, no token, no network, non-200). Source: GET api.anthropic.com/api/oauth/usage,
# the call Claude Code itself makes, with the OAuth token from the macOS Keychain item
# "Claude Code-credentials" — a tracked hook reading a credential, documented in
# docs/CODEX_WORKFLOW.md §10. The token lives in a shell variable only: never written to disk,
# never printed, never on a command line (curl -q ignores .curlrc and reads it from stdin).
# A successful line is cached 60 s in a private 0700 directory; symlinks are never followed. macOS only.

CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/claude-hooks"
CACHE="$CACHE_DIR/window.txt"
CACHE_TTL_SECONDS=60
USAGE_URL="https://api.anthropic.com/api/oauth/usage"
OAUTH_BETA_HEADER="anthropic-beta: oauth-2025-04-20"
KEYCHAIN_SERVICE="Claude Code-credentials"
LOCAL_TZ="Australia/Melbourne"
WINDOW_LOW_USED_PERCENT=80
WINDOW_LOW_LINE="window low: finish the current unit, commit, and update the step log."

cache_readable() {  # a regular file we own, no symlink at either level
  [ -d "$CACHE_DIR" ] && [ ! -L "$CACHE_DIR" ] && [ ! -L "$CACHE" ] && [ -f "$CACHE" ] && [ -O "$CACHE" ]
}
cache_age() { printf '%s' $(( $(date +%s) - $(stat -f %m "$CACHE" 2>/dev/null || echo 0) )); }
write_cache() {  # a symlinked dir is rejected before mkdir or chmod can touch its target; 0700; atomic rename
  local tmp
  [ -L "$CACHE_DIR" ] && return 1
  { mkdir -p "$CACHE_DIR" && [ ! -L "$CACHE_DIR" ] && [ -O "$CACHE_DIR" ] && chmod 700 "$CACHE_DIR" \
    && tmp=$(mktemp "$CACHE_DIR/.window.XXXXXX") && printf '%s\n' "$1" > "$tmp" && mv -f "$tmp" "$CACHE"; } 2>/dev/null
}

fetch_window() {
  local token reply body used resets epoch
  command -v jq >/dev/null 2>&1 || return 1
  token=$(security find-generic-password -s "$KEYCHAIN_SERVICE" -w 2>/dev/null | jq -r '.claudeAiOauth.accessToken // empty' 2>/dev/null)
  [ -n "$token" ] || return 1
  reply=$(printf 'url = "%s"\nheader = "Authorization: Bearer %s"\nheader = "%s"\n' "$USAGE_URL" "$token" "$OAUTH_BETA_HEADER" \
    | curl -q -sS -m 5 -K - -w '\n%{http_code}' 2>/dev/null) || return 1
  [ "${reply##*$'\n'}" = "200" ] || return 1
  body=${reply%$'\n'*}
  used=$(printf '%s' "$body" | jq -r '.five_hour.utilization | floor' 2>/dev/null)
  resets=$(printf '%s' "$body" | jq -r '.five_hour.resets_at // empty' 2>/dev/null | sed -E 's/\.[0-9]+//; s/Z$/+0000/; s/([+-][0-9]{2}):([0-9]{2})$/\1\2/')
  epoch=$(date -j -f '%Y-%m-%dT%H:%M:%S%z' "$resets" +%s 2>/dev/null)
  [ -n "$used" ] && [ -n "$epoch" ] || return 1
  printf 'five_hour %s%% used, resets %s (%s UTC)\n' "$used" "$(TZ=$LOCAL_TZ date -r "$epoch" '+%H:%M %Z')" "$(TZ=UTC date -r "$epoch" '+%H:%M')"
  [ "$used" -ge "$WINDOW_LOW_USED_PERCENT" ] && printf '%s\n' "$WINDOW_LOW_LINE"
  return 0
}

if cache_readable && [ "$(cache_age)" -lt "$CACHE_TTL_SECONDS" ]; then cat "$CACHE"; exit 0; fi
if out=$(fetch_window); then write_cache "$out"; else out="unknown"; fi  # failures are never cached
printf '%s\n' "$out"

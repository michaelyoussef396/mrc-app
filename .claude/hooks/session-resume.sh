#!/bin/bash
# Stop hook: rewrites "Resume from here" in this session's log after every turn from git and
# the log itself (derived, never narrated). Replaces only that section; anything after it is
# kept; CommonMark fenced blocks are content, not boundaries. Missing jq/git/sessions dir, a
# read-only log, an unclosed fence, or a log changed by another writer mid-run: exit 0 with
# nothing written. No log carrying this session id: one systemMessage per session (marker
# file), then silent. docs/CODEX_WORKFLOW.md §10.

SESSION_ID_FIELD="- Session id: "
BRANCH_FIELD="- Branch: "
HEADER_HEADING="## Header"
RESUME_HEADING="## Resume from here"
STEP_HEADING="## Step log"
RESUME_NOTE="<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit -->"
LOG_TZ="Australia/Melbourne"
HOOK_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
REPO_ROOT=$(cd "$HOOK_DIR/../.." && pwd -P)
SESSIONS_DIR="$REPO_ROOT/docs/sessions"
WINDOW_SCRIPT="$HOOK_DIR/window-remaining.sh"

# CommonMark fence tracking shared by every awk pass: an opening fence is 3+ backticks or 3+
# tildes after 0-3 spaces; it closes only on the same character, at least as long, alone on
# its line. Runs first for every record (after stripping \r); f is 1 while inside a fence.
AWK_FENCE='function fence(line,   s, ch, n, i) {
  s = line; for (i = 0; i < 3 && substr(s, 1, 1) == " "; i++) s = substr(s, 2)
  if (s ~ /^```/) { ch = "`"; match(s, /^`+/); n = RLENGTH }
  else if (s ~ /^~~~/) { ch = "~"; match(s, /^~+/); n = RLENGTH }
  else return 0
  if (!f) { f = 1; fch = ch; flen = n; return 1 }
  if (ch == fch && n >= flen && substr(s, n + 1) ~ /^ *$/) { f = 0; return 1 }
  return 0
}
{ sub(/\r$/, ""); fence($0) }
'

command -v jq >/dev/null 2>&1 && [ -d "$SESSIONS_DIR" ] || exit 0
input=$(if [ -t 0 ]; then printf ''; else cat; fi)
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)
[[ "$session_id" =~ ^[A-Za-z0-9._-]+$ ]] || exit 0
branch=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null)
NO_LOG_MARKER="${TMPDIR:-/tmp}/session-resume-nolog-$(printf '%s' "$session_id" | shasum -a 256 | cut -c1-16)"

log_digest() { shasum -a 256 < "$1" | cut -c1-64; }
fences_balanced() { awk "$AWK_FENCE"'END { exit f }' "$1"; }

# header_field <log> <field> <value>: true when the Header section holds exactly "<field><value>"
# on a line outside any fence.
header_field() {
  awk -v want="$2$3" -v hh="$HEADER_HEADING" "$AWK_FENCE"'!f && /^## / { s = ($0 ~ "^" hh "[[:space:]]*$") } !f && s && $0 == want { found = 1; exit } END { exit !found }' "$1"
}

# The log whose Header carries this session id; with several, the one whose Header names the
# current branch, else the most recently modified.
find_log() {
  local hit newest=""
  for hit in "$SESSIONS_DIR"/*.md; do
    header_field "$hit" "$SESSION_ID_FIELD" "$session_id" || continue
    header_field "$hit" "$BRANCH_FIELD" "$branch" && { printf '%s' "$hit"; return 0; }
    [ -z "$newest" ] || [ "$hit" -nt "$newest" ] && newest="$hit"
  done
  printf '%s' "$newest"
}

nested_or_none() {  # " none" inline, or one nested backticked bullet per line of $1
  if [ -z "$1" ]; then printf ' none'; else printf '\n%s' "$(printf '%s\n' "$1" | sed 's/.*/  - `&`/')"; fi
}

last_step_line() {  # last "- " line of the step log, outside fences
  awk -v h="$STEP_HEADING" "$AWK_FENCE"'!f && $0 ~ "^" h "[[:space:]]*$" { s = 1; next } !f && s && /^## / { exit } !f && s && /^- / { l = substr($0, 3) } END { print l }' "$1"
}

current_section() {  # the section as it stands: heading (normalised) to the line before the next unfenced "## "
  awk -v h="$RESUME_HEADING" "$AWK_FENCE"'!f && s && /^## / { exit } s { print } !f && $0 ~ "^" h "[[:space:]]*$" { s = 1; print h }' "$1"
}

render_section() {  # render_section <log> <window line>
  local head unpushed uncommitted last_step threads
  head=$(git -C "$REPO_ROOT" log -1 --format='%h %s' 2>/dev/null)
  unpushed=$(git -C "$REPO_ROOT" log --oneline '@{upstream}..HEAD' 2>/dev/null) || unpushed="(no upstream)"
  uncommitted=$(git -C "$REPO_ROOT" status --porcelain -- . ":(exclude)${1#$REPO_ROOT/}" 2>/dev/null)
  last_step=$(last_step_line "$1")
  threads=$(grep -o 'codex resume [0-9a-f][0-9a-f-]*' "$1" | sort -u)
  printf '%s\n\n%s\n\n' "$RESUME_HEADING" "$RESUME_NOTE"
  printf -- '- Updated: %s · Tool: CC\n' "$(TZ=$LOG_TZ date '+%Y-%m-%d %H:%M %Z')"
  printf -- '- Branch: %s @ %s\n' "${branch:-detached}" "${head:-?}"
  if [ "$unpushed" = "(no upstream)" ]; then printf -- '- Unpushed commits: (no upstream)\n'; else printf -- '- Unpushed commits:%s\n' "$(nested_or_none "$unpushed")"; fi
  printf -- '- Uncommitted files (this log excluded):%s\n' "$(nested_or_none "$uncommitted")"
  printf -- '- Last step-log line: %s\n' "${last_step:-(none)}"
  printf -- '- Codex threads:%s\n' "$(nested_or_none "$threads")"
  printf -- '- Window: %s\n' "${2:-unknown}"
  printf -- '- Next step: the first open item under "Did NOT" or "Open", else continue from the last step-log line.\n'
}

# Lines above the heading (trailing blanks trimmed), blank, the new section, then everything
# from the next unfenced "## " heading on. Written to a temp file, then renamed over the log.
replace_section() {  # replace_section <log> <section> <digest of the log at hook start>
  local tmp mode
  tmp=$(mktemp "$SESSIONS_DIR/.resume.XXXXXX") || return 1
  mode=$(stat -f %OLp "$1" 2>/dev/null || echo 644)
  { awk -v h="$RESUME_HEADING" "$AWK_FENCE"'!f && $0 ~ "^" h "[[:space:]]*$" { exit } { l[++n] = $0 } END { while (n > 0 && l[n] == "") n--; for (i = 1; i <= n; i++) print l[i]; print "" }' "$1"
    printf '%s\n' "$2"
    awk -v h="$RESUME_HEADING" "$AWK_FENCE"'s == 0 && !f && $0 ~ "^" h "[[:space:]]*$" { s = 1; next } s == 1 && !f && /^## / { s = 2; print "" } s == 2 { print }' "$1"
  } > "$tmp" && chmod "$mode" "$tmp" || { rm -f "$tmp"; return 1; }
  # Optimistic concurrency: re-read immediately before the rename and skip this turn if any
  # other writer changed the log since the snapshot taken at hook start; the next Stop retries.
  # Known limit, not an assumption: an edit that lands between this re-read and the rename
  # (sub-millisecond) is still overwritten. No lock, because no other writer of this file
  # (SessionStart, the Edit tool, Codex) takes one.
  [ "$(log_digest "$1")" = "$3" ] || { rm -f "$tmp"; return 1; }
  mv -f "$tmp" "$1" || { rm -f "$tmp"; return 1; }
}

log=$(find_log)
if [ -z "$log" ]; then
  [ -e "$NO_LOG_MARKER" ] && exit 0
  { : > "$NO_LOG_MARKER"; } 2>/dev/null
  jq -cn --arg id "${session_id:0:8}" '{systemMessage: ("session-resume: no docs/sessions log carries this session id (" + $id + "…), so Resume from here is not being maintained")}'
  exit 0
fi
[ -w "$log" ] && fences_balanced "$log" || exit 0
log_at_start=$(log_digest "$log")
window_out=$( { [ -x "$WINDOW_SCRIPT" ] && "$WINDOW_SCRIPT"; } 2>/dev/null)
new_section=$(render_section "$log" "$(printf '%s\n' "$window_out" | head -n 1)")
if [ "$(current_section "$log" | grep -v '^- Updated: ')" != "$(printf '%s\n' "$new_section" | grep -v '^- Updated: ')" ]; then
  replace_section "$log" "$new_section" "$log_at_start" || exit 0
fi

# Only a systemMessage may leave this hook. NEVER hookSpecificOutput.additionalContext from a
# Stop hook: it re-triggers the model, which re-fires the hook — 9 firings in one turn at 4x
# cost in the 2026-09-06 test (docs/CODEX_WORKFLOW.md §10, trap 3).
low_line=$(printf '%s\n' "$window_out" | grep '^window low:' | head -n 1)
[ -z "$low_line" ] || jq -cn --arg m "$low_line" '{systemMessage: $m}'
exit 0

#!/bin/bash
# Stop hook: rewrites the "Resume from here" content of this session's log after every turn from
# git and the log itself (derived, never narrated). The content is the text between the marker
# lines <!-- resume:start --> and <!-- resume:end -->; only that is replaced. A log without exactly
# one start and one end marker, in that order, is never edited (one notice per session). A log with
# the "## Resume from here" heading and no markers gets the pair inserted around that section once.
# Missing jq/git/sessions dir, a read-only log, or a log changed mid-run: exit 0 silently. CODEX_WORKFLOW §10.

SESSION_ID_FIELD="- Session id: "
BRANCH_FIELD="- Branch: "
HEADER_HEADING="## Header"
RESUME_HEADING="## Resume from here"
RESUME_START="<!-- resume:start -->"
RESUME_END="<!-- resume:end -->"
STEP_HEADING="## Step log"
RESUME_NOTE="<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit between the markers -->"
LOG_TZ="Australia/Melbourne"
HOOK_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
REPO_ROOT=$(cd "$HOOK_DIR/../.." && pwd -P)
SESSIONS_DIR="$REPO_ROOT/docs/sessions"
WINDOW_SCRIPT="$HOOK_DIR/window-remaining.sh"

# CommonMark fence tracking for READ paths only (log selection, last step-log line, migration bounds):
# a wrong match there is cosmetic or ends in "write nothing", never data loss, so it need not be exact
# (known gap: a backtick opener with a backtick in its info string). The destructive path never sees fences.
AWK_FENCE='function fence(line,   s, ch, n, i) {
  s = line; for (i = 0; i < 3 && substr(s, 1, 1) == " "; i++) s = substr(s, 2)
  if (s ~ /^```/) { ch = "`"; match(s, /^`+/); n = RLENGTH }
  else if (s ~ /^~~~/) { ch = "~"; match(s, /^~+/); n = RLENGTH }
  else return 0
  if (!f) { f = 1; fch = ch; flen = n; return 1 }
  if (ch == fch && n >= flen && substr(s, n + 1) ~ /^[ \t]*$/) { f = 0; return 1 }
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
notice_once() {  # one systemMessage per session, then silent; always exits 0
  [ -e "$NO_LOG_MARKER" ] || { { : > "$NO_LOG_MARKER"; } 2>/dev/null; jq -cn --arg m "$1" '{systemMessage: $m}'; }
  exit 0
}
header_field() {  # header_field <log> <field> <value>: the Header section holds exactly "<field><value>", unfenced
  awk -v want="$2$3" -v hh="$HEADER_HEADING" "$AWK_FENCE"'!f && /^## / { s = ($0 ~ "^" hh "[[:space:]]*$") } !f && s && $0 == want { found = 1; exit } END { exit !found }' "$1"
}
find_log() {  # the log whose Header carries this session id; several: the one naming the current branch, else the newest
  local hit newest=""
  for hit in "$SESSIONS_DIR"/*.md; do
    header_field "$hit" "$SESSION_ID_FIELD" "$session_id" || continue
    header_field "$hit" "$BRANCH_FIELD" "$branch" && { printf '%s' "$hit"; return 0; }
    [ -z "$newest" ] || [ "$hit" -nt "$newest" ] && newest="$hit"
  done
  printf '%s' "$newest"
}
nested_or_none() { if [ -z "$1" ]; then printf ' none'; else printf '\n%s' "$(printf '%s\n' "$1" | sed 's/.*/  - `&`/')"; fi; }
last_step_line() {  # a READ: last "- " line of the step log outside fences; a wrong match is cosmetic
  awk -v h="$STEP_HEADING" "$AWK_FENCE"'!f && $0 ~ "^" h "[[:space:]]*$" { s = 1; next } !f && s && /^## / { exit } !f && s && /^- / { l = substr($0, 3) } END { print l }' "$1"
}
marker_lines() {  # "<start line> <end line>", printed only with exactly one of each, in order
  awk -v s="$RESUME_START" -v e="$RESUME_END" '{ sub(/\r$/, "") } $0 == s { ns++; ls = NR } $0 == e { ne++; le = NR } END { if (ns == 1 && ne == 1 && ls < le) print ls, le }' "$1"
}

# install <log> <temp file> <digest at hook start>: keep the mode, then rename — unless another writer
# changed the log since the snapshot, in which case this turn writes nothing and the next Stop retries.
# Known limit: an edit landing between this re-read and the rename (sub-millisecond) is still overwritten.
install() {
  chmod "$(stat -f %OLp "$1" 2>/dev/null || echo 644)" "$2" && [ "$(log_digest "$1")" = "$3" ] && mv -f "$2" "$1" || { rm -f "$2"; return 1; }
}

# One-time migration for a log with the heading and no markers: the pair goes around the heading's section
# (heading to the next unfenced "## " or EOF), bounded by the fence parser — its only remaining write. Refused,
# nothing written, when fences are unbalanced, the heading is absent, or a "## " line sits inside the bounds.
migrate_markers() {  # migrate_markers <log> <digest>
  local tmp
  awk "$AWK_FENCE"'END { exit f }' "$1" || return 1
  tmp=$(mktemp "$SESSIONS_DIR/.resume.XXXXXX") || return 1
  awk -v h="$RESUME_HEADING" -v s="$RESUME_START" -v e="$RESUME_END" "$AWK_FENCE"'
    !f && st == 0 && $0 ~ "^" h "[[:space:]]*$" { print; print ""; print s; st = 1; next }
    st == 1 && /^## / { if (f) { bad = 1; exit } print e; print ""; st = 2 }
    { print }
    END { if (bad || st == 0) exit 1; if (st == 1) print e }' "$1" > "$tmp" && install "$1" "$tmp" "$2" || { rm -f "$tmp"; return 1; }
}

render_content() {  # render_content <log> <window line>: the text that goes between the markers
  local head unpushed uncommitted last_step threads
  head=$(git -C "$REPO_ROOT" log -1 --format='%h %s' 2>/dev/null)
  unpushed=$(git -C "$REPO_ROOT" log --oneline '@{upstream}..HEAD' 2>/dev/null) || unpushed="(no upstream)"
  uncommitted=$(git -C "$REPO_ROOT" status --porcelain -- . ":(exclude)${1#$REPO_ROOT/}" 2>/dev/null)
  last_step=$(last_step_line "$1")
  threads=$(grep -o 'codex resume [0-9a-f][0-9a-f-]*' "$1" | sort -u)
  printf '%s\n\n' "$RESUME_NOTE"
  printf -- '- Updated: %s · Tool: CC\n' "$(TZ=$LOG_TZ date '+%Y-%m-%d %H:%M %Z')"
  printf -- '- Branch: %s @ %s\n' "${branch:-detached}" "${head:-?}"
  if [ "$unpushed" = "(no upstream)" ]; then printf -- '- Unpushed commits: (no upstream)\n'; else printf -- '- Unpushed commits:%s\n' "$(nested_or_none "$unpushed")"; fi
  printf -- '- Uncommitted files (this log excluded):%s\n' "$(nested_or_none "$uncommitted")"
  printf -- '- Last step-log line: %s\n' "${last_step:-(none)}"
  printf -- '- Codex threads:%s\n' "$(nested_or_none "$threads")"
  printf -- '- Window: %s\n' "${2:-unknown}"
  printf -- '- Next step: the first open item under "Did NOT" or "Open", else continue from the last step-log line.\n'
}
replace_between() {  # replace_between <log> <content> <start line> <end line> <digest>: the markers stay
  local tmp
  tmp=$(mktemp "$SESSIONS_DIR/.resume.XXXXXX") || return 1
  { head -n "$3" "$1" | tr -d '\r'; printf '%s\n' "$2"; tail -n +"$4" "$1" | tr -d '\r'; } > "$tmp" && install "$1" "$tmp" "$5" || { rm -f "$tmp"; return 1; }
}

log=$(find_log)
[ -n "$log" ] || notice_once "session-resume: no docs/sessions log carries this session id (${session_id:0:8}…), so Resume from here is not being maintained"
[ -w "$log" ] || exit 0
log_at_start=$(log_digest "$log")  # before any check, so a writer racing the checks cannot become the baseline
bounds=$(marker_lines "$log")
if [ -z "$bounds" ] && ! tr -d '\r' < "$log" | grep -q -x -F -e "$RESUME_START" -e "$RESUME_END"; then
  migrate_markers "$log" "$log_at_start" && log_at_start=$(log_digest "$log") && bounds=$(marker_lines "$log")
fi
[ -n "$bounds" ] || notice_once "session-resume: ${log#$REPO_ROOT/} has no usable Resume markers (exactly one $RESUME_START and one $RESUME_END, in that order), so it is not edited"
read -r start_line end_line <<< "$bounds"
window_out=$( { [ -x "$WINDOW_SCRIPT" ] && "$WINDOW_SCRIPT"; } 2>/dev/null)
new_content=$(render_content "$log" "$(printf '%s\n' "$window_out" | head -n 1)")
current=$(awk -v a="$start_line" -v b="$end_line" 'NR > a && NR < b { sub(/\r$/, ""); print }' "$log")
if [ "$(printf '%s\n' "$current" | grep -v '^- Updated: ')" != "$(printf '%s\n' "$new_content" | grep -v '^- Updated: ')" ]; then
  replace_between "$log" "$new_content" "$start_line" "$end_line" "$log_at_start" || exit 0
fi

# Only a systemMessage may leave this hook. NEVER hookSpecificOutput.additionalContext from a Stop hook:
# it re-triggers the model, which re-fires the hook — 9 firings in one turn at 4x cost (CODEX_WORKFLOW §10, trap 3).
low_line=$(printf '%s\n' "$window_out" | grep '^window low:' | head -n 1)
[ -z "$low_line" ] || jq -cn --arg m "$low_line" '{systemMessage: $m}'
exit 0

#!/usr/bin/env bash
# Deploy MRC-branded email templates to Supabase Auth
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=<your-token> ./deploy-templates.sh <project-ref>
#
#   DEV   ctppzqnysmzynkxjlzta   sandbox clone
#   PROD  ecyivrxjpsmjmexqatym   LIVE — mrcsystem.com, reaches real customers
#
# The ref is a required argument with no default. It used to be hardcoded to
# PROD, which made DEV unreachable and made a live auth-email change the
# accidental outcome of running the script at all.
#
# Get your access token from: https://supabase.com/dashboard/account/tokens

set -euo pipefail

PROD_REF="ecyivrxjpsmjmexqatym"
DEV_REF="ctppzqnysmzynkxjlzta"

PROJECT_REF="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$PROJECT_REF" ]; then
  echo "Error: project ref required."
  echo "Usage: SUPABASE_ACCESS_TOKEN=<token> $0 <project-ref>"
  echo "  DEV:  $DEV_REF"
  echo "  PROD: $PROD_REF   (LIVE — reaches real customers)"
  exit 1
fi

case "$PROJECT_REF" in
  "$PROD_REF") TARGET_ROLE="PROD — LIVE, reaches real customers" ;;
  "$DEV_REF")  TARGET_ROLE="DEV — sandbox clone" ;;
  *)           TARGET_ROLE="UNRECOGNISED ref" ;;
esac

echo "Target: $PROJECT_REF  ($TARGET_ROLE)"

# Auth emails apply immediately with no staging buffer, so the live project
# needs a deliberate confirmation. Skipped when there's no terminal attached,
# so a non-interactive run fails closed rather than hanging.
if [ "$PROJECT_REF" = "$PROD_REF" ]; then
  if [ -t 0 ]; then
    read -r -p "This is the LIVE project. Type 'yes' to continue: " confirm
    [ "$confirm" = "yes" ] || { echo "Aborted."; exit 1; }
  else
    echo "Refusing to deploy to PROD non-interactively." >&2
    exit 1
  fi
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN environment variable is required."
  echo "Get yours from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

# Read template files, escape for JSON
escape_html() {
  python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" < "$1"
}

CONFIRMATION=$(escape_html "$SCRIPT_DIR/confirmation.html")
RECOVERY=$(escape_html "$SCRIPT_DIR/recovery.html")
INVITE=$(escape_html "$SCRIPT_DIR/invite.html")
MAGIC_LINK=$(escape_html "$SCRIPT_DIR/magic_link.html")
EMAIL_CHANGE=$(escape_html "$SCRIPT_DIR/email_change.html")
REAUTHENTICATION=$(escape_html "$SCRIPT_DIR/reauthentication.html")

echo "Deploying MRC email templates to project $PROJECT_REF..."

curl -s -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"mailer_subjects_confirmation\": \"Confirm Your Email — Mould & Restoration Co.\",
    \"mailer_templates_confirmation_content\": $CONFIRMATION,
    \"mailer_subjects_recovery\": \"Reset Your Password — Mould & Restoration Co.\",
    \"mailer_templates_recovery_content\": $RECOVERY,
    \"mailer_subjects_invite\": \"You've Been Invited — Mould & Restoration Co.\",
    \"mailer_templates_invite_content\": $INVITE,
    \"mailer_subjects_magic_link\": \"Your Login Link — Mould & Restoration Co.\",
    \"mailer_templates_magic_link_content\": $MAGIC_LINK,
    \"mailer_subjects_email_change\": \"Confirm Email Change — Mould & Restoration Co.\",
    \"mailer_templates_email_change_content\": $EMAIL_CHANGE,
    \"mailer_subjects_reauthentication\": \"Confirm Action — Mould & Restoration Co.\",
    \"mailer_templates_reauthentication_content\": $REAUTHENTICATION
  }" | python3 -m json.tool

echo ""
echo "Done! Templates deployed successfully."
echo "Test by triggering a password reset from the app."

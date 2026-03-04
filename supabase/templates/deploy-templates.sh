#!/usr/bin/env bash
# Deploy MRC-branded email templates to Supabase Auth
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=<your-token> ./deploy-templates.sh
#
# Get your access token from: https://supabase.com/dashboard/account/tokens

set -euo pipefail

PROJECT_REF="ecyivrxjpsmjmexqatym"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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

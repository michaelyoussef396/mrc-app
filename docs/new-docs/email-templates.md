# Email Templates Documentation

## Overview
All authentication and security notification emails for the MRC Internal System have been configured in Supabase. These emails are for internal staff onboarding and account management - NOT customer-facing.

## Brand Guidelines Used
- Primary colour: #007AFF (Apple blue)
- Secondary: #1a365d (dark navy)
- Background: #f5f7f8 (light grey)
- Text: #1d1d1f (near black)
- Muted text: #86868b
- Style: Clean, professional, Apple-inspired, minimal

## Developer Contact (shown in all emails)
- Phone: 0433 880 403
- Email: michaelyoussef396@gmail.com

## Templates Configured

### Authentication Emails (with action buttons)

| Template | Subject Line | Purpose | Expiry |
|----------|--------------|---------|--------|
| Confirm sign up | "Verify your email - MRC Internal System" | New staff verifies email after account creation | 24 hours |
| Invite user | "You've been invited to join MRC Internal System" | Invite new staff member to create account | 24 hours |
| Magic link | "Sign in to MRC Internal System" | Passwordless one-click login | 10 minutes |
| Change email address | "Confirm your new email address - MRC Internal System" | Verify new email when user changes it | 24 hours |
| Reset password | "Reset your password - MRC Internal System" | Password reset link | 1 hour |
| Reauthentication | "Confirm your identity - MRC Internal System" | Re-verify before sensitive actions | 10 minutes |

### Security Notification Emails (no action button - alerts only)

| Template | Subject Line | Purpose |
|----------|--------------|---------|
| Password changed | "Security Alert: Your password was changed - MRC Internal System" | Alert when password is changed |
| Email address changed | "Security Alert: Your email address was changed - MRC Internal System" | Alert when email is changed |
| Phone number changed | "Security Alert: Your phone number was changed - MRC Internal System" | Alert when phone is changed |

### Not Configured (not needed currently)

| Template | Reason |
|----------|--------|
| Identity linked | Not using social logins (Google, Apple, etc.) |
| Identity unlinked | Not using social logins |
| MFA method added | Not using 2FA yet |
| MFA method removed | Not using 2FA yet |

## Supabase Variables Available

These variables can be used in email templates:

| Variable | Description |
|----------|-------------|
| {{ .ConfirmationURL }} | The action link (verify, reset, etc.) |
| {{ .Email }} | User's email address |
| {{ .SiteURL }} | Site URL (e.g., https://mrc-app.com) |
| {{ .Timestamp }} | When the action occurred |

## Email Design Features

All emails include:
- **Header**: Blue (#007AFF) or Navy (#1a365d) with MRC Internal System branding
- **Body**: Clear headline, explanation text, action button (where applicable)
- **Security notice**: Expiry time and "if you didn't request this" warning
- **Footer**: Developer contact info, "Internal Use Only" badge, copyright

## Technical Notes

- All templates use **inline CSS** (no external stylesheets)
- **Table-based layout** for email client compatibility
- Tested for: Gmail, Outlook, Apple Mail
- Max width: 600px
- Mobile responsive
- WCAG AA contrast compliance

## How to Edit Templates

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Click on the template to edit
3. Modify HTML (keep inline CSS)
4. Update subject line if needed
5. Click Save

## Testing

To test each email:
- **Confirm sign up**: Create new user in Supabase Auth
- **Invite user**: Use Supabase invite user feature
- **Magic link**: Request magic link login
- **Reset password**: Click "Forgot Password" on login page
- **Change email**: Change email in user settings
- **Security alerts**: Triggered automatically when actions occur

## Last Updated
- Date: 2026-01-26
- All 9 templates configured and tested

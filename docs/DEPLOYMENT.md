# MRC Lead Management System - Deployment Guide

**Version:** 1.0 (MVP)
**Hosting:** Vercel (frontend) + Supabase (backend/database/storage)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Database Migrations](#database-migrations)
5. [Edge Function Deployment](#edge-function-deployment)
6. [Rollback Procedure](#rollback-procedure)
7. [Post-Deployment Verification](#post-deployment-verification)

---

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **Supabase CLI** (`npm install -g supabase`)
- **Vercel CLI** (`npm install -g vercel`) - optional, can deploy via GitHub integration
- Access to:
  - Supabase project dashboard (`ecyivrxjpsmjmexqatym`)
  - Vercel project
  - GitHub repository

---

## Environment Variables

### Frontend (.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL | `https://ecyivrxjpsmjmexqatym.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key | `eyJhbG...` |
| `VITE_GOOGLE_MAPS_API_KEY` | No | Google Maps (for address autocomplete) | `AIza...` |

### Supabase Edge Function Secrets

Set via Supabase Dashboard > Project Settings > Edge Functions > Secrets, or CLI:

```bash
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set OPENROUTER_API_KEY=sk-or-xxxx
supabase secrets set GOOGLE_MAPS_API_KEY=AIza_xxxx
supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

| Secret | Used By | Purpose |
|--------|---------|---------|
| `RESEND_API_KEY` | send-email, send-inspection-reminder | Email delivery |
| `OPENROUTER_API_KEY` | generate-inspection-summary | AI report generation |
| `GOOGLE_MAPS_API_KEY` | calculate-travel-time | Travel time calculation |
| `SLACK_WEBHOOK_URL` | send-slack-notification | Slack notifications |
| `SUPABASE_SERVICE_ROLE_KEY` | manage-users, seed-admin | Admin operations bypassing RLS |

### Vercel Environment Variables

Set in Vercel Dashboard > Project Settings > Environment Variables:

| Variable | Environments | Value |
|----------|-------------|-------|
| `VITE_SUPABASE_URL` | Production, Preview | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | Supabase anon key |
| `VITE_GOOGLE_MAPS_API_KEY` | Production, Preview | Google Maps key |

---

## Step-by-Step Deployment

### 1. Pre-Deployment Checks

```bash
# Ensure clean working tree
git status

# Type check
npx tsc --noEmit

# Run tests
npm run test:run

# Production build
npx vite build

# Verify bundle size (htmlToPdf should be ~618KB, total initial JS ~875KB gzipped)
```

### 2. Deploy Frontend to Vercel

**Option A: Automatic (GitHub Integration)**

Push to `main` branch. Vercel auto-deploys on push.

```bash
git push origin main
```

**Option B: Manual (Vercel CLI)**

```bash
vercel --prod
```

### 3. Deploy Database Migrations

```bash
# Link to project (first time only)
supabase link --project-ref ecyivrxjpsmjmexqatym

# Push pending migrations
supabase db push

# Verify migration status
supabase migration list
```

### 4. Deploy Edge Functions

Deploy all functions:
```bash
supabase functions deploy send-email
supabase functions deploy generate-inspection-pdf
supabase functions deploy send-inspection-reminder
supabase functions deploy generate-inspection-summary
supabase functions deploy send-slack-notification
supabase functions deploy calculate-travel-time
supabase functions deploy manage-users
supabase functions deploy seed-admin
supabase functions deploy export-inspection-context
```

Or deploy all at once:
```bash
supabase functions deploy
```

### 5. Verify Deployment

See [Post-Deployment Verification](#post-deployment-verification) below.

---

## Database Migrations

### Creating a New Migration

```bash
# Create migration file
supabase migration new <description>
# e.g.: supabase migration new add_labor_cost_field

# Edit the generated file in supabase/migrations/
# Then push to remote
supabase db push
```

### Viewing Migration Status

```bash
supabase migration list
```

### Applying Migrations to Production

```bash
# Always review the SQL first
cat supabase/migrations/<timestamp>_<name>.sql

# Push to production
supabase db push
```

### Rolling Back a Migration

Supabase does not have automatic rollback. To revert:

1. Create a new migration that reverses the changes:
```bash
supabase migration new revert_<original_name>
```

2. Write the reverse SQL (e.g. `DROP COLUMN`, `ALTER TABLE`).

3. Push the revert migration:
```bash
supabase db push
```

---

## Edge Function Deployment

### Deploy a Single Function

```bash
supabase functions deploy <function-name>
```

### Test a Function Locally

```bash
supabase functions serve <function-name> --env-file .env.local
```

### View Function Logs

```bash
supabase functions logs <function-name> --project-ref ecyivrxjpsmjmexqatym
```

Or via Dashboard: Supabase Dashboard > Edge Functions > Select Function > Logs.

### Update Secrets

```bash
supabase secrets set KEY=value
supabase secrets list
```

---

## Rollback Procedure

### Frontend Rollback (Vercel)

1. Go to Vercel Dashboard > Project > Deployments
2. Find the last known-good deployment
3. Click the three-dot menu > "Promote to Production"
4. The previous deployment is now live (instant rollback)

### Database Rollback

There is no automatic rollback. Create a new forward migration that reverses changes:

```bash
# 1. Create revert migration
supabase migration new revert_<change_name>

# 2. Write reverse SQL in the new migration file

# 3. Apply
supabase db push
```

**Important:** Always take a database backup before applying migrations.

### Edge Function Rollback

Re-deploy the previous version of the function:

```bash
# 1. Revert the code change in git
git revert <commit-hash>

# 2. Re-deploy the function
supabase functions deploy <function-name>
```

### Full Rollback Checklist

1. [ ] Identify the problematic deployment (Vercel, DB, or Edge Function)
2. [ ] If frontend: promote previous Vercel deployment
3. [ ] If database: create and apply revert migration
4. [ ] If edge function: revert git commit, re-deploy function
5. [ ] Verify rollback via post-deployment checks
6. [ ] Notify team via Slack

---

## Post-Deployment Verification

Run through this checklist after every production deployment:

### Quick Smoke Test (~2 min)

1. [ ] **Login works** - Navigate to app URL, log in as admin
2. [ ] **Dashboard loads** - Admin dashboard shows stats, no errors
3. [ ] **Leads page loads** - Navigate to Leads Management, verify leads display
4. [ ] **No console errors** - Open browser DevTools, check for red errors

### Functional Verification (~5 min)

5. [ ] **Create a test lead** - Use "New Lead" button, fill minimum fields, save
6. [ ] **Technician view** - Log in as technician, verify jobs page loads
7. [ ] **Email works** - Trigger a test email (Leads > Send Email action)
8. [ ] **PDF generation** - Open an inspection, click "Generate PDF", verify it completes
9. [ ] **Navigation** - Click between pages, verify React Query caching (no reload flash)

### Performance Check (~2 min)

10. [ ] **Bundle loaded** - Check Network tab, verify JS chunks load correctly
11. [ ] **API responses** - Verify Supabase queries return in <500ms
12. [ ] **Mobile responsive** - Resize to 375px, verify no horizontal scroll

### Edge Function Health

```bash
# Test send-email
curl -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-key>" \
  -d '{"to":"test@example.com","subject":"Deploy test","html":"<p>OK</p>"}'

# Test Slack notification
curl -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-slack-notification \
  -H "Content-Type: application/json" \
  -d '{"event":"new_lead","full_name":"Deploy Test"}'
```

---

*Last Updated: 2026-02-17*

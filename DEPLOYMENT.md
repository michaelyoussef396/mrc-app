# MRC App — Deployment Guide

## Branches

| Branch | Purpose | Vercel Target |
|--------|---------|---------------|
| `production` | Live app (Clayton & Glen use this) | Production deployment |
| `main` | Development/staging (Michael builds here) | Preview deployment |

## How It Works

- **Push to `main`** — Vercel creates a preview deployment (for testing)
- **Push to `production`** — Vercel deploys to the live URL
- **Never push directly to `production`** — always merge from `main`

## How to Deploy

1. Push your changes to `main`
2. Check the Vercel preview URL to make sure everything works
3. Create a PR: `main` → `production`
4. Merge the PR
5. Vercel auto-deploys to the live URL

## How to Rollback

- **Option A:** Revert the merge commit on the `production` branch, push — Vercel redeploys
- **Option B:** Vercel Dashboard → Deployments → find the previous good deployment → click "Redeploy"

## Environment Variables

Set these in the **Vercel Dashboard** under Project Settings → Environment Variables.

| Variable | Production | Preview | Notes |
|----------|-----------|---------|-------|
| `VITE_SUPABASE_URL` | Live Supabase URL | Dev Supabase URL | **DIFFERENT per environment** |
| `VITE_SUPABASE_ANON_KEY` | Live anon key | Dev anon key | **DIFFERENT per environment** |
| `VITE_GOOGLE_MAPS_API_KEY` | Same | Same | Optional — address autocomplete |
| `VITE_SENTRY_DSN` | Same | Same | Optional — error tracking |
| `SENTRY_AUTH_TOKEN` | Same | Same | Build-time only — source map uploads |
| `SENTRY_ORG` | Same | Same | Build-time only |
| `SENTRY_PROJECT` | Same | Same | Build-time only |

For variables marked **DIFFERENT**, set separate values for Production and Preview scopes in Vercel.

## Manual Setup Required (Vercel Dashboard)

1. **Set production branch:**
   - Project Settings → Git → Production Branch → change to `production`

2. **Set environment variables:**
   - Settings → Environment Variables
   - For each variable, select which environments it applies to (Production / Preview / Development)
   - Production scope: points to live Supabase project
   - Preview scope: points to dev Supabase project (once created)

3. **Redeploy** the `production` branch after changing any settings

## Rules

- **NEVER** push directly to `production`
- **ALWAYS** test on the preview URL before merging
- **ALWAYS** check Vercel deployment succeeded after merge

# API Audit — MRC Lead Management System

**Date:** 2026-04-03
**Status:** CRITICAL — Key rotation required

---

## External APIs in Use

### 1. Supabase (Primary Backend)

| Detail | Value |
|--------|-------|
| **Purpose** | Database, Auth, Storage, Edge Functions, Realtime |
| **Project Ref** | `ecyivrxjpsmjmexqatym` |
| **Used By** | Every component, every Edge Function |
| **Client Keys** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client-side, publishable) |
| **Server Keys** | `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions only, never client-side) |
| **MCP Access Token** | `SUPABASE_ACCESS_TOKEN` in `.mcp.json` |
| **Rotation Status** | REQUIRED — MCP access token exposed in `.mcp.json` |
| **Recommendation** | Rotate access token. Anon key is publishable (safe). Service role key — verify not in any client bundle. |

**Files using Supabase client:**
- `src/integrations/supabase/client.ts` — Client initialization
- `src/integrations/supabase/types.ts` — Auto-generated types
- All 22 hooks (via client)
- All Edge Functions (via service role key)

---

### 2. Resend (Email Service)

| Detail | Value |
|--------|-------|
| **Purpose** | Transactional email delivery |
| **API Key Env Var** | `RESEND_API_KEY` |
| **Used By** | `send-email`, `send-inspection-reminder`, `receive-framer-lead` Edge Functions |
| **Client-side** | NO (Edge Functions only) |
| **MCP Key** | `RESEND_API_KEY` in `.mcp.json` (for MCP email server) |
| **Rotation Status** | REQUIRED — Key exposed in `.mcp.json` |
| **Rate Limits** | 10/min per IP, 100/hr global, 5min cooldown per recipient |
| **Current From** | `noreply@mrcsystem.com` |
| **Planned From** | `admin@mouldandrestoration.com.au` (pending domain switch) |

**Files:**
- `supabase/functions/send-email/index.ts`
- `supabase/functions/send-inspection-reminder/index.ts`
- `supabase/functions/receive-framer-lead/index.ts`
- `src/lib/api/notifications.ts` (calls Edge Function, not API directly)

**Rotation Steps:**
1. Generate new API key in Resend dashboard
2. Update Supabase Edge Function secrets: `supabase secrets set RESEND_API_KEY=new_key`
3. Update `.mcp.json` locally
4. Test email delivery via Edge Function
5. Revoke old key in Resend dashboard

---

### 3. Google Maps (Travel Time & Geocoding)

| Detail | Value |
|--------|-------|
| **Purpose** | Distance Matrix, Places Autocomplete, Geocoding |
| **API Key Env Var** | `VITE_GOOGLE_MAPS_API_KEY` (client) + `GOOGLE_MAPS_API_KEY` (Edge Function) |
| **Used By** | `calculate-travel-time` EF, `useGoogleMaps` hook, `AddressAutocomplete` component |
| **Client-side** | YES (loaded via `<script>` tag for autocomplete) |
| **Rotation Status** | REQUIRED — Potentially exposed in documentation |
| **Restrictions** | Should be restricted to MRC domain + API (HTTP referrer + API restriction) |

**Files:**
- `supabase/functions/calculate-travel-time/index.ts` — Server-side Distance Matrix
- `src/hooks/useGoogleMaps.ts` — Client-side script loading, autocomplete, travel time
- `src/components/booking/AddressAutocomplete.tsx` — Places Autocomplete UI

**Rotation Steps:**
1. Create new key in Google Cloud Console
2. Apply restrictions: HTTP referrer (production domain), API restrictions (Distance Matrix, Places, Geocoding)
3. Update Vercel env vars: `VITE_GOOGLE_MAPS_API_KEY=new_key`
4. Update Supabase secrets: `supabase secrets set GOOGLE_MAPS_API_KEY=new_key`
5. Deploy and verify autocomplete + travel time
6. Delete old key

---

### 4. OpenRouter (LLM / AI)

| Detail | Value |
|--------|-------|
| **Purpose** | AI-powered inspection report text generation |
| **API Key Env Var** | `OPENROUTER_API_KEY` |
| **Used By** | `generate-inspection-summary` Edge Function only |
| **Client-side** | NO |
| **Models** | google/gemini-2.0-flash-001 (primary), 2 fallbacks |
| **Rotation Status** | REQUIRED — Potentially exposed in documentation |
| **Cost** | Low (Gemini Flash is ~$0.15/1M tokens) |

**Files:**
- `supabase/functions/generate-inspection-summary/index.ts`

**Rotation Steps:**
1. Generate new key at openrouter.ai
2. Update Supabase secrets: `supabase secrets set OPENROUTER_API_KEY=new_key`
3. Test AI summary generation
4. Revoke old key

---

### 5. Slack (Webhooks)

| Detail | Value |
|--------|-------|
| **Purpose** | Team notifications for lead/inspection events |
| **Webhook URL Env Var** | `SLACK_WEBHOOK_URL` |
| **Used By** | `send-slack-notification`, `receive-framer-lead` Edge Functions |
| **Client-side** | NO |
| **Rotation Status** | RECOMMENDED — Webhook URLs are long-lived, but should be rotated if exposed |

**Files:**
- `supabase/functions/send-slack-notification/index.ts`
- `supabase/functions/receive-framer-lead/index.ts`

**Rotation Steps:**
1. Create new webhook in Slack workspace settings
2. Update Supabase secrets
3. Test notification delivery
4. Remove old webhook

---

### 6. Sentry (Error Monitoring)

| Detail | Value |
|--------|-------|
| **Purpose** | Error tracking, performance monitoring, session replay |
| **DSN Env Var** | `VITE_SENTRY_DSN` |
| **Used By** | Client-side (`src/lib/sentry.ts`, `main.tsx`, `ErrorBoundary.tsx`) |
| **Client-side** | YES (DSN is intended to be public) |
| **Rotation Status** | NOT REQUIRED — DSNs are designed to be public. Sentry rate limits by project. |

**Files:**
- `src/lib/sentry.ts` — Init, context, breadcrumbs
- `src/main.tsx` — Init call
- `src/components/ErrorBoundary.tsx` — Error capture
- `src/contexts/AuthContext.tsx` — User context

---

### 7. GitHub (MCP Server)

| Detail | Value |
|--------|-------|
| **Purpose** | Git operations, PR workflow via MCP |
| **Token** | `GITHUB_PERSONAL_ACCESS_TOKEN` in `.mcp.json` |
| **Used By** | MCP GitHub server (Claude Code tooling only) |
| **Client-side** | NO (development tooling only) |
| **Rotation Status** | REQUIRED — PAT exposed in `.mcp.json` |

**Rotation Steps:**
1. Generate new fine-grained PAT at github.com/settings/tokens
2. Scope: repo access for MRC repository only
3. Update `.mcp.json` locally
4. Verify MCP GitHub operations work

---

## APIs NOT in Use (Confirmed Unused)

| API | Status | Notes |
|-----|--------|-------|
| HiPages API | Not implemented | PRD mentions it, but leads are manual entry only |
| Twilio/SMS | Not implemented | `sms_logs` table was dropped |
| Stripe/Payment | Not implemented | Payment tracking is manual (Phase 2) |
| Google Business Profile | Not implemented | Planned for Phase 2F (review requests) |

---

## Security Summary

### CRITICAL — Rotate Immediately

| Key | Location | Risk |
|-----|----------|------|
| `SUPABASE_ACCESS_TOKEN` | `.mcp.json` | MCP management access to Supabase project |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | `.mcp.json` | GitHub repo access |
| `RESEND_API_KEY` | `.mcp.json` | Can send emails as MRC |

### IMPORTANT — Rotate Before Production Team Access

| Key | Location | Risk |
|-----|----------|------|
| `GOOGLE_MAPS_API_KEY` | Supabase secrets + Vercel env | Billing exposure if unrestricted |
| `OPENROUTER_API_KEY` | Supabase secrets | AI API billing exposure |
| `SLACK_WEBHOOK_URL` | Supabase secrets | Can post to MRC Slack channel |

### SAFE — No Rotation Needed

| Key | Reason |
|-----|--------|
| `VITE_SUPABASE_URL` | Public URL, designed to be exposed |
| `VITE_SUPABASE_ANON_KEY` | Publishable key, RLS enforces security |
| `VITE_SENTRY_DSN` | Public DSN, rate-limited by Sentry |

---

## Rotation Checklist

- [ ] Generate new Supabase access token → update `.mcp.json`
- [ ] Generate new GitHub PAT (fine-grained, repo-scoped) → update `.mcp.json`
- [ ] Generate new Resend API key → update Supabase secrets + `.mcp.json`
- [ ] Generate new Google Maps API key (with restrictions) → update Vercel env + Supabase secrets
- [ ] Generate new OpenRouter API key → update Supabase secrets
- [ ] Generate new Slack webhook URL → update Supabase secrets
- [ ] Verify all Edge Functions work after rotation
- [ ] Verify email delivery, Slack notifications, travel time, AI generation
- [ ] Revoke all old keys
- [ ] Confirm `.mcp.json` is in `.gitignore` (it is)

---

*All keys in `.mcp.json` are local-only (file is in `.gitignore`). However, some keys were reportedly exposed in a documentation file — rotation is mandatory before adding team members.*

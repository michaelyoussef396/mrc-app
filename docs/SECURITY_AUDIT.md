# MRC Security Audit — Credential & Secret Exposure Report

**Date:** 2026-04-05
**Auditor:** Claude Code (Opus 4.6)
**Scope:** Full codebase + git history scan for API keys, tokens, secrets, credentials
**Status:** REPORT ONLY — no keys rotated, no files modified

---

## Executive Summary

| Category | Count | Severity |
|----------|-------|----------|
| Secrets exposed in git history | 1 file (`.env` with 4 values) | CRITICAL |
| Secrets in local dev config | 3 keys in `.mcp.json` | HIGH (local only, never committed) |
| Hardcoded secrets in source code | 0 | CLEAN |
| External services requiring rotation | 4 immediate, 3 recommended | — |

**Key finding:** A `.env` file containing a Supabase access token (`sbp_2178...`) was committed to git history from Oct 2025 to Dec 2025. It was deleted but remains in git objects. The current codebase (HEAD) is clean.

---

## 1. Secrets Found in Git History

### 1.1 `.env` File — CRITICAL

| Detail | Value |
|--------|-------|
| **Added in commit** | `a19326f` (2025-10-28) "Review MRC authentication requirements" |
| **Deleted in commit** | `f48ca5a` (2025-12-20) "inspection form deployed" |
| **Git blob** | `7c7143d4bb6aa5835568aa8a94ad6ea31a18f714` |
| **Duration exposed** | ~53 days in git history |
| **Still in git objects** | YES — recoverable via `git cat-file -p 7c7143d` |

**Contents of the leaked `.env`:**

| Variable | Value (truncated) | Risk Level |
|----------|-------------------|------------|
| `VITE_SUPABASE_PROJECT_ID` | `ecyivrxjpsmjmexqatym` | LOW — public project ref |
| `VITE_SUPABASE_URL` | `https://ecyivrxjpsmjmexqatym.supabase.co` | LOW — public URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` (full JWT) | LOW — publishable key, RLS enforced |
| `SUPABASE_ACCESS_TOKEN` | `sbp_21780696b00479fc75e644ead21668d40ac1d464` | **CRITICAL** — full project management access |

**Impact of `SUPABASE_ACCESS_TOKEN` exposure:**
- Can manage Supabase projects, deploy functions, modify database schema
- Can read/write all data bypassing RLS
- Can manage auth users
- This is a DIFFERENT token than the current one in `.mcp.json` (`sbp_066ecc...`) — both need attention

### 1.2 Commits Referencing Secret Patterns

| Pattern | Commits Found | Assessment |
|---------|---------------|------------|
| `sbp_` (Supabase token) | `b9b2e7b`, `53aa49e`, `f48ca5a`, `8696d4e`, `6b8cbda` | Real token was in `.env` file across these commits |
| `eyJhbGciOiJIUzI1NiIs` (JWT) | 11+ commits | Anon key in `.env` and docs — publishable, low risk |
| `sk-or-` (OpenRouter) | `3bc65da` | Code references `Deno.env.get()` — no hardcoded value |
| `hooks.slack.com` | `3bc65da` | Only placeholder examples in docs (`/services/xxxx`) |
| `AIzaSy` (Google Maps) | None found | Never committed |
| `github_pat_` | `53aa49e` | In docs referencing the pattern (API_AUDIT.md), not the actual key |
| `re_` (Resend) | `ea49365`, `78c678d`, `7f0fcd8` | Only placeholder examples (`re_xxxx`) in docs |
| `RESEND_API_KEY` | 10 commits | References to env var name, not actual values |
| `.env` file additions | `a19326f` (first added) | Deleted by `f48ca5a`, now in `.gitignore` |
| `.mcp.json` | Never committed | Confirmed: `git log --all -- .mcp.json` returns empty |

---

## 2. Secrets in Local Configuration (`.mcp.json`)

`.mcp.json` was **never committed** to git (confirmed via git log). It is properly listed in `.gitignore`. However, it contains plaintext secrets on the local machine:

| Secret | Value (prefix) | Service | Risk |
|--------|---------------|---------|------|
| `SUPABASE_ACCESS_TOKEN` | `sbp_066eccca338d...` | Supabase MCP server | HIGH — project management |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | `github_pat_11AURY33Y05b...` | GitHub MCP server | HIGH — repo access |
| `RESEND_API_KEY` | `re_Fi1A3fnZ_LdBL...` | Resend MCP server | HIGH — can send emails as MRC |

**Mitigation:** These are local-only and never reached git. Risk is limited to local machine compromise. Rotation still recommended as best practice.

---

## 3. Current Codebase Scan (HEAD) — CLEAN

### Files Scanned
- `src/**/*` — all source code
- `supabase/**/*` — all Edge Functions and migrations
- `public/**/*` — all static assets
- `.claude/**/*` — all agent/skill/rule configs
- Root directory — all config files

### Patterns Searched

| Pattern | Result |
|---------|--------|
| `sk-` (OpenAI/OpenRouter keys) | NOT FOUND |
| `re_[a-zA-Z0-9]` (Resend keys) | NOT FOUND (only `re_xxxx` placeholder in docs) |
| `sbp_` (Supabase tokens) | NOT FOUND in source; pattern referenced in `docs/API_AUDIT.md` |
| `AIzaSy` (Google Maps keys) | NOT FOUND |
| `ghp_`, `gho_`, `github_pat_` (GitHub tokens) | NOT FOUND |
| `hooks.slack.com` (Slack webhooks) | Only placeholder in `docs/DEPLOYMENT.md` |
| `eyJhbG` (JWT tokens) | Only `eyJhbG...` truncated placeholder in `docs/DEPLOYMENT.md` |
| `ingest.*sentry` (Sentry DSN) | NOT FOUND hardcoded |
| `AKIA` (AWS keys) | NOT FOUND |
| `xoxb-`, `xoxp-` (Slack tokens) | NOT FOUND |
| Hardcoded passwords | NOT FOUND |

### Edge Functions — All Clean
All 10 Edge Functions read credentials via `Deno.env.get()`:
- `send-email/index.ts` → `Deno.env.get('RESEND_API_KEY')`
- `generate-inspection-summary/index.ts` → `Deno.env.get('OPENROUTER_API_KEY')`
- `calculate-travel-time/index.ts` → `Deno.env.get('GOOGLE_MAPS_API_KEY')`
- `send-slack-notification/index.ts` → `Deno.env.get('SLACK_WEBHOOK_URL')`
- `manage-users/index.ts` → `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`

### Frontend Client — Clean
- `src/integrations/supabase/client.ts` → `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `src/hooks/useGoogleMaps.ts` → `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`
- `src/lib/sentry.ts` → `import.meta.env.VITE_SENTRY_DSN`

### `.gitignore` Coverage — Correct

```
.env                 ✅ covered
.env.local           ✅ covered
.env.development     ✅ covered
.env.production      ✅ covered
.env.test            ✅ covered
.mcp.json            ✅ covered
```

No `.env` files exist in the working directory (confirmed via glob).

---

## 4. External Service Credential Matrix

| # | Service | Env Var | Stored In | Used By | Client-Exposed? | Needs Rotation? |
|---|---------|---------|-----------|---------|-----------------|-----------------|
| 1 | Supabase (client) | `VITE_SUPABASE_URL` | Vercel env | `supabase/client.ts`, all hooks | YES (publishable) | NO |
| 2 | Supabase (client) | `VITE_SUPABASE_ANON_KEY` | Vercel env | `supabase/client.ts`, all hooks | YES (publishable, RLS) | NO |
| 3 | Supabase (server) | `SUPABASE_SERVICE_ROLE_KEY` | Supabase secrets | `manage-users`, `seed-admin` Edge Functions | NO | VERIFY not in client bundle |
| 4 | Supabase (MCP) | `SUPABASE_ACCESS_TOKEN` | `.mcp.json` (local) | Claude Code MCP server | NO | **YES** — old token in git history |
| 5 | Resend | `RESEND_API_KEY` | Supabase secrets + `.mcp.json` | `send-email`, `send-inspection-reminder`, `receive-framer-lead` EFs | NO | **YES** — in `.mcp.json` |
| 6 | Google Maps (client) | `VITE_GOOGLE_MAPS_API_KEY` | Vercel env | `useGoogleMaps.ts`, `AddressAutocomplete.tsx` | YES | **RECOMMENDED** — add restrictions |
| 7 | Google Maps (server) | `GOOGLE_MAPS_API_KEY` | Supabase secrets | `calculate-travel-time` EF | NO | **RECOMMENDED** |
| 8 | OpenRouter | `OPENROUTER_API_KEY` | Supabase secrets | `generate-inspection-summary` EF | NO | **RECOMMENDED** |
| 9 | Slack | `SLACK_WEBHOOK_URL` | Supabase secrets | `send-slack-notification`, `receive-framer-lead` EFs | NO | **RECOMMENDED** |
| 10 | Sentry | `VITE_SENTRY_DSN` | Vercel env | `sentry.ts`, `main.tsx`, `ErrorBoundary.tsx`, `AuthContext.tsx` | YES (public DSN) | NO |
| 11 | GitHub (MCP) | `GITHUB_PERSONAL_ACCESS_TOKEN` | `.mcp.json` (local) | Claude Code MCP server | NO | **YES** — in `.mcp.json` |
| 12 | FingerprintJS | None (no key) | npm package | `deviceFingerprint.ts` | YES (client-side) | N/A |

---

## 5. Rotation Checklist

### Priority 1 — IMMEDIATE (tokens leaked in git history or local config)

#### 1a. Revoke OLD Supabase Access Token (from git history)
- **Token:** `sbp_21780696b00479fc75e644ead21668d40ac1d464`
- **Dashboard:** https://supabase.com/dashboard/account/tokens
- **Action:** Find and delete this token. It may already be expired/revoked.
- **Verify:** Confirm token no longer works

#### 1b. Rotate CURRENT Supabase Access Token
- **Token:** `sbp_066eccca338db40298e95ed3ccbdd78dfa1fb1a0` (in `.mcp.json`)
- **Dashboard:** https://supabase.com/dashboard/account/tokens
- **Action:** Generate new token → update `.mcp.json` locally
- **Verify:** `mcp__supabase__list_tables` works in Claude Code

#### 1c. Rotate GitHub Personal Access Token
- **Token:** `github_pat_11AURY33Y05beLyT58uzg4_...` (in `.mcp.json`)
- **Dashboard:** https://github.com/settings/tokens?type=beta (fine-grained)
- **Action:** Create new fine-grained PAT scoped to `michaelyoussef396/mrc-app` repo only → update `.mcp.json`
- **Verify:** `mcp__github__list_issues` works in Claude Code

#### 1d. Rotate Resend API Key
- **Token:** `re_Fi1A3fnZ_LdBL8kASZP8BR7ZcZWSy6vFM` (in `.mcp.json`)
- **Dashboard:** https://resend.com/api-keys
- **Action:** Generate new key → update in TWO places:
  1. `.mcp.json` locally (for MCP server)
  2. Supabase secrets: `supabase secrets set RESEND_API_KEY=<new_key> --project-ref ecyivrxjpsmjmexqatym`
- **Verify:** Send test email via Edge Function

### Priority 2 — IMPORTANT (before adding team members)

#### 2a. Restrict Google Maps API Keys
- **Dashboard:** https://console.cloud.google.com/apis/credentials
- **Action (client key):**
  - Add HTTP referrer restriction: production Vercel domain + `localhost:*`
  - Add API restriction: Places API, Geocoding API only
- **Action (server key):**
  - Add IP restriction: Supabase Edge Function IPs (or leave unrestricted if not feasible)
  - Add API restriction: Distance Matrix API, Geocoding API only
- **Optional:** Rotate both keys while adding restrictions
- **Update:** Vercel env (`VITE_GOOGLE_MAPS_API_KEY`) + Supabase secrets (`GOOGLE_MAPS_API_KEY`)
- **Verify:** Address autocomplete works + travel time calculation works

#### 2b. Rotate OpenRouter API Key
- **Dashboard:** https://openrouter.ai/settings/keys
- **Action:** Generate new key → `supabase secrets set OPENROUTER_API_KEY=<new_key> --project-ref ecyivrxjpsmjmexqatym`
- **Verify:** AI summary generation works (test via inspection form submit)

#### 2c. Rotate Slack Webhook URL
- **Dashboard:** Slack workspace → Apps → Incoming Webhooks → MRC channel
- **Action:** Generate new webhook → `supabase secrets set SLACK_WEBHOOK_URL=<new_url> --project-ref ecyivrxjpsmjmexqatym`
- **Verify:** Create test lead or trigger notification event

### Priority 3 — SAFE (no rotation needed)

| Item | Reason |
|------|--------|
| `VITE_SUPABASE_URL` | Public project URL by design |
| `VITE_SUPABASE_ANON_KEY` | Publishable key, all access controlled by RLS policies |
| `VITE_SENTRY_DSN` | Public DSN by design, rate-limited by Sentry |
| FingerprintJS | No API key required, open-source client library |

---

## 6. Git History Remediation

### Option A: Remove `.env` from git history (recommended if repo will be shared)
```bash
# Install git-filter-repo (if not installed)
pip install git-filter-repo

# Remove .env from ALL history
git filter-repo --path .env --invert-paths

# Force push all branches
git push --force-with-lease --all
git push --force-with-lease --tags

# All collaborators must re-clone
```

**Pros:** Secrets permanently removed from history
**Cons:** Rewrites all commit hashes, all collaborators need fresh clone

### Option B: Accept risk and rotate tokens (simpler)
- Repo is private (`michaelyoussef396/mrc-app`)
- Only 1 collaborator (Michael) currently has access
- Rotating all exposed tokens neutralizes the risk without history rewrite
- Faster to execute

**Recommendation:** Option B for now. Execute Priority 1 rotations immediately. Consider Option A before adding team members (Clayton, Glen) to the repo.

---

## 7. Verification After Rotation

After completing all rotations, verify every integration:

- [ ] **Supabase MCP:** `mcp__supabase__list_tables` returns 22 tables
- [ ] **GitHub MCP:** `mcp__github__list_issues` returns results
- [ ] **Resend MCP:** Test email sends successfully
- [ ] **Edge Function — send-email:** Email delivers to test address
- [ ] **Edge Function — send-inspection-reminder:** No errors in function logs
- [ ] **Edge Function — receive-framer-lead:** Accepts test webhook payload
- [ ] **Edge Function — generate-inspection-summary:** AI summary generates
- [ ] **Edge Function — calculate-travel-time:** Returns travel time between two addresses
- [ ] **Edge Function — send-slack-notification:** Message appears in Slack channel
- [ ] **Frontend — Google Maps:** Address autocomplete works on `/admin/leads`
- [ ] **Frontend — Sentry:** Errors still report (no change needed)
- [ ] **Build:** `npm run build` succeeds with no errors

---

## 8. Comparison with Existing API_AUDIT.md

Cross-referenced against `docs/API_AUDIT.md` (dated 2026-04-03):

| Finding | API_AUDIT.md | This Audit | Delta |
|---------|-------------|------------|-------|
| .mcp.json secrets | Listed as needing rotation | Confirmed — 3 secrets present | Aligned |
| .env in git history | Not mentioned | **NEW FINDING** — `sbp_2178...` token exposed in 4+ commits | Gap filled |
| Google Maps key | Listed for rotation | Confirmed — recommend restrictions over rotation | Aligned |
| OpenRouter key | Listed for rotation | Confirmed | Aligned |
| Slack webhook | Listed for rotation | Confirmed — no real webhook in git history | Aligned |
| Sentry DSN | Marked safe | Confirmed safe | Aligned |
| FingerprintJS | Not mentioned | Confirmed no API key needed | N/A |
| Source code secrets | Not audited | **Confirmed CLEAN** — no hardcoded secrets | New coverage |

---

*End of Security Audit. No files were modified. No keys were rotated. Awaiting review before remediation.*

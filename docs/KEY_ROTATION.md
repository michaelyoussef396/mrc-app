# KEY_ROTATION.md — MRC Secret Inventory & Rotation Runbook

**Created:** 2026-06-02
**Author:** Claude (read-only inventory) — execution is **[HUMAN] only**
**Purpose:** Single source of truth for every secret the system uses — where it's defined,
where it's consumed, and its git-history exposure. Drives the **Phase 6** full rotation of
the L4 workstream.

> **Tagging (overrides any older doc):** Every *rotation* action — generate, set, re-auth,
> revoke — is **[HUMAN]**. Claude does **read-only verification only** and never handles a
> secret value (no secrets in chat). FingerprintJS is the keyless open-source agent (and is
> currently commented out in `src/contexts/AuthContext.tsx`) — **no key, nothing to rotate.**

---

## 1. Why we are rotating (exposure history)

`.env` was tracked in git for ~2 months and its blob is **permanently recoverable** from
history even though the file is now gitignored and deleted:

| Commit | Date | Action on `.env` |
|---|---|---|
| `a19326f` (gpt-engineer bot) | 2025-10-28 | **A** (added — first committed) |
| `f7a0742` | 2025-11-18 | **M** (modified) |
| `6b8cbda` | 2025-11-18 | **M** (modified) |
| `f48ca5a` | 2025-12-20 | **D** (deleted) |

- **Treat every secret that was in `.env` during that window as compromised.** That covers at
  minimum the `VITE_*` set (Supabase anon, Maps, Sentry DSN, Supabase URL) and any service
  keys that were stored there at the time.
- **`.mcp.json` was *never* committed** — confirmed by `git log --all -- .mcp.json` (no
  history). MCP tokens (Supabase PAT, GitHub PAT, Resend) are **not git-exposed**, but are
  **still rolled** per the locked "roll everything" decision.
- A prior rotation was logged **2026-04-05** (per project memory). This rotation **supersedes
  it** — we are not diagnosing which key leaked; we roll all.
- `.gitignore` now covers `.env`, `.env.local`, `.env.development`, `.env.production`,
  `.env.test`, `.mcp.json`. Keep it that way.

---

## 2. Master secret inventory

### A. Frontend / Vercel env vars (`VITE_*`)
Defined in **Vercel → Project Settings → Environment Variables** (+ local `.env.local`).
Consumed in the browser bundle **and** the `api/*` serverless functions.

| Var | Consumed at | Sensitivity | Git-exposed |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts:5`; `api/render-pdf.ts:68`; `api/render-job-report-pdf.ts:66` | Not secret (public URL) | Yes — harmless |
| `VITE_SUPABASE_ANON_KEY` | `client.ts:6`; `api/render-pdf.ts:69`; `api/render-job-report-pdf.ts:67` | Public-by-design, RLS-gated — but rolled | Yes |
| `VITE_GOOGLE_MAPS_API_KEY` | Maps autocomplete (client) | **High** — billable; restrict by HTTP referrer | Yes |
| `VITE_SENTRY_DSN` | `src/lib/sentry.ts:4,7` | Low — DSN is write-only ingest, public by design | Yes |

### B. Supabase Edge Function secrets (per Supabase project)
Set via `npx supabase secrets set --project-ref <REF> …`. Three are **auto-injected** by
Supabase and must **never** be set/rotated manually.

| Secret | EF consumers | Sensitivity | Notes |
|---|---|---|---|
| `SUPABASE_URL` | all EFs | n/a | **auto-injected** |
| `SUPABASE_ANON_KEY` | all EFs | public | **auto-injected** |
| `SUPABASE_SERVICE_ROLE_KEY` | EFs (bypasses RLS) | 🔴 **CRITICAL (god key)** | **auto-injected**; only rotates via JWT-secret rotation (§C) |
| `RESEND_API_KEY` | `send-email`, `send-inspection-reminder`, `receive-framer-lead` | High | reuse prod key in dev (Q2) |
| `SLACK_WEBHOOK_URL` | `send-slack-notification`, `receive-framer-lead` | Medium | **dev = NEW channel webhook** (decision 5) |
| `OPENROUTER_API_KEY` | `generate-inspection-summary` | High (billable) | reuse prod in dev (Q2) |
| `GOOGLE_MAPS_API_KEY` | `calculate-travel-time` | High (billable) | reuse prod in dev (Q5) |
| `INTERNAL_WEBHOOK_SECRET` | `send-slack-notification` | Medium (internal auth) | ⚠️ **not in the L4 doc** — surfaced here; must be set in dev |
| `SYSTEM_USER_UUID` | `send-inspection-reminder`, `receive-framer-lead`, `generate-*` | Not secret (in CLAUDE.md) | canonical constant `a5ae96f1-…`; **not rotated** |
| `ADMIN_FALLBACK_EMAIL` | `receive-framer-lead` | Not secret | Q4 → current mrcsystem.com admin email |
| `ADMIN_SEED_PASSWORD` | `seed-admin` | High | **dev-only** value |

### C. Supabase platform keys
| Item | Where defined | Sensitivity | Rotation mechanics / blast radius |
|---|---|---|---|
| anon key (JWT) | Vercel `VITE_SUPABASE_ANON_KEY` + EF auto-inject | public-by-design | Rotating = **rotate the project JWT secret** |
| service_role key (JWT) | EF auto-inject | 🔴 CRITICAL | Same JWT-secret rotation |
| **JWT secret rotation effect** | — | 🔴 | **Invalidates ALL sessions (every user logged out)**, rotates anon + service_role together; then update Vercel **Production** `VITE_SUPABASE_ANON_KEY` + redeploy prod. **Do in a maintenance window.** |
| Personal Access Token `SUPABASE_ACCESS_TOKEN` | `.mcp.json` (local, never committed) | 🔴 HIGH (full account API) | new → update `.mcp.json` → `/mcp` re-auth → [CC] verify → revoke old |
| DB password | dashboard / connection string | High | rotate in dashboard; update any stored connection string |

### D. MCP / tooling tokens (`.mcp.json` — local, gitignored, never committed)
| Secret | Key name in `.mcp.json` | Rotation |
|---|---|---|
| Supabase PAT | `SUPABASE_ACCESS_TOKEN` | see §C |
| GitHub PAT | `GITHUB_PERSONAL_ACCESS_TOKEN` | new → update config → [CC] verify github MCP → revoke old |
| Resend (MCP) | `RESEND_API_KEY` (+ `SENDER_EMAIL_ADDRESS`) | same key family as the EF Resend secret — new → update both → verify → revoke |
| Slack (MCP) | — (OAuth, no env block) | re-auth via Slack OAuth if rolling |

> **Global-config MCP tokens (out of this file's scope to read):** Sentry, Vercel, Playwright,
> etc. live in the **global** Claude config, not project `.mcp.json`. **[HUMAN]** should check
> the global config and roll/re-auth those separately if they were ever exposed.

---

## 3. The non-negotiable rotation rule

For **every** secret:

```
1. Generate the NEW value (provider dashboard / Supabase / GitHub).
2. SET the new value in ALL consumers (table above).
3. VERIFY it works (runtime call / [CC] read-only ping).
4. ONLY THEN revoke/delete the OLD value.
```

**Never revoke-before-verify.** Rotating the Supabase PAT or GitHub PAT before the new one is
proven **locks Claude out of the Supabase / GitHub MCP** mid-session.

**Ordering:** rotate third-party + EF secrets first; rotate the **MCP-powering tokens
(Supabase PAT, GitHub PAT) LAST**, because Phases 1–5 depend on them.

---

## 4. Phase 6 per-secret runbook (all steps [HUMAN]; [CC] = read-only verify)

1. **Third-party API keys** — Resend, OpenRouter, Google Maps:
   - New key at provider dashboard → update **prod** Supabase EF secret **and** dev EF secret;
     Maps also updates Vercel `VITE_GOOGLE_MAPS_API_KEY` (all scopes) + redeploy; Resend also
     updates `.mcp.json`.
   - Verify: send-email test / AI summary / travel-time EF 200 ([CC] can read EF logs).
   - Revoke old at provider.
2. **Slack** — prod webhook + the new dev channel webhook (decision 5):
   - Create new incoming webhooks → set `SLACK_WEBHOOK_URL` on each project → test message →
     delete old webhook.
3. **`INTERNAL_WEBHOOK_SECRET`** — regenerate a random value → set on prod + dev → verify
   `send-slack-notification` path → done.
4. **Supabase JWT secret** (anon + service_role) — 🔴 maintenance window:
   - Rotate JWT secret in dashboard → update Vercel **Production** `VITE_SUPABASE_ANON_KEY` →
     redeploy prod → verify login + an authenticated read. (Dev uses its own keys, untouched.)
5. **Supabase PAT** (`SUPABASE_ACCESS_TOKEN`) — **last but one**:
   - Issue new PAT → update `.mcp.json` → `/mcp` reconnect → **[CC] verifies** with a
     read-only `list_migrations` against prod + dev → revoke old PAT.
6. **GitHub PAT** (`GITHUB_PERSONAL_ACCESS_TOKEN`) — **last**:
   - Issue new (fine-scoped) PAT → update `.mcp.json` → reconnect → **[CC] verifies** github
     MCP with a read-only call → revoke old PAT.
7. **DB password** (optional, if treated as exposed): rotate in dashboard → update any stored
   connection string → verify.

---

## 5. Verification checklist ([CC], read-only)

- [ ] EF runtime: Resend / OpenRouter / Maps EFs return 200 after their key swaps (EF logs).
- [ ] `send-slack-notification` posts to the **new** dev channel (dev) / prod channel (prod).
- [ ] Supabase MCP responds on the **new** PAT (`list_migrations` prod + dev) **before** old revoked.
- [ ] GitHub MCP responds on the **new** PAT **before** old revoked.
- [ ] Frontend login works after JWT-secret rotation (prod), authenticated read succeeds.
- [ ] `git log --all -- .env .mcp.json` shows no **new** secret-file commits.

---

## 6. Out of scope / notes

- This file is **inventory + runbook only** — no rotation performed by writing it.
- `SYSTEM_USER_UUID` and `ADMIN_FALLBACK_EMAIL` are **not secrets** (no rotation).
- `VITE_SUPABASE_URL` / `VITE_SENTRY_DSN` are public by design; rolled only if you choose to.
- The historical `.env` blob remains in git history forever; purging it (filter-repo/BFG) is a
  **separate, destructive history-rewrite decision** — not part of this rotation. Rotating the
  values is what neutralises the exposure.

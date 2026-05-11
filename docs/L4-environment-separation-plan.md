# L4 — Environment Separation Execution Plan

**Created:** 2026-05-11
**Status:** Plan locked. Execution deferred to next session.
**Owner:** Michael (decisions + dashboard clicks) + Claude (MCP-driven migrations + verifications)
**Goal:** Stand up a dev Supabase project (`mrc-system-dev`), wire Vercel Preview env vars at it, leave production (`ecyivrxjpsmjmexqatym`) untouched. Outcome: a preview deploy on any non-`production` branch hits dev DB, not prod.

---

## How to use this doc tomorrow

1. Read this entire file before clicking anything.
2. Confirm the 5 open questions are still answered the way they're answered here (Q1/Q2/Q3/Q5 locked; **Q4 still needs Michael's input** before Step 3.1).
3. Start at **Phase 1, Step 1.1**. Hard stops are marked between each handoff.
4. If anything diverges from this plan mid-execution, update this doc rather than improvise.

---

## Pre-flight Inventory

### Migrations: 88 files

Range: `20241221000000_add_pdf_system.sql` → `20260510070000_phase4_stage_4_3_soft_delete_photos.sql`.
Chronological filenames, no gaps. All applied to production (`ecyivrxjpsmjmexqatym`).

**Skip in dev:** 2 cron-creating migrations (locked answer to Q1):
- `20260218000003_create_reminder_cron_job.sql`
- `20260420000000_create_overdue_invoices_cron.sql`

→ 86 migrations applied to dev. Cron behaviour testable via manual EF invocation if needed.

### Edge Functions: 12

`calculate-travel-time`, `check-overdue-invoices`, `export-inspection-context`, `generate-inspection-pdf`, `generate-inspection-summary`, `generate-job-report-pdf`, `manage-users`, `receive-framer-lead`, `seed-admin`, `send-email`, `send-inspection-reminder`, `send-slack-notification`.

### Supabase secrets needed on dev project

**Auto-injected by Supabase (never manually set):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Must be set manually on dev project:**

| Secret | Used by | Dev value |
|---|---|---|
| `RESEND_API_KEY` | send-email, send-inspection-reminder, receive-framer-lead | **Reuse prod key** (Q2) |
| `SLACK_WEBHOOK_URL` | send-slack-notification, receive-framer-lead | **Reuse prod webhook tonight** (Q3). **TODO: swap to `#mrc-dev-alerts` channel webhook once that channel exists.** |
| `SYSTEM_USER_UUID` | send-inspection-reminder, receive-framer-lead, generate-* | `a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f` (canonical, reused) |
| `GOOGLE_MAPS_API_KEY` | calculate-travel-time | Same as prod (read-only API) |
| `OPENROUTER_API_KEY` | generate-inspection-summary | Same as prod (usage tracked by token) |
| `ADMIN_FALLBACK_EMAIL` | receive-framer-lead | **Q4 — Michael to answer before Step 3.1** |
| `ADMIN_SEED_PASSWORD` | seed-admin | Dev-only password (Michael picks at Step 3.1) |

### Vercel env vars needed (frontend, Preview scope only)

Frontend Vite env vars (referenced via `import.meta.env.VITE_*` in src/):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_SENTRY_DSN`

Vercel MCP doesn't expose env var listing. Use `npx vercel env ls` or Vercel dashboard (Project Settings → Environment Variables) to audit current state and set Preview-scope values.

### Storage buckets to create + populate in dev

| Bucket | Created by | Contents to seed |
|---|---|---|
| `inspection-photos` | Migration `20251028135212` (private) | Empty initially. Test photos added during walkthrough. |
| `pdf-templates` | Migration | `inspection-report-template-final.html` + `job-report-template.html` (sources in `src/templates/`) |
| `pdf-assets` | Migration | Logos and static assets (e.g. `assets/logos/logo-mrc.png`) — copy from prod Storage |
| `profile-photos` | Migration `20260415000000` | Empty initially |

### Cron jobs

Both skipped in dev (Q1). Reference only:
- `20260218000003` — inspection reminders (hourly)
- `20260420000000` — overdue invoice check (daily 9am AEST)

### Production state (DO NOT TOUCH)

- **Supabase project ref:** `ecyivrxjpsmjmexqatym` (canonical, hardcoded in `supabase/config.toml` line 1)
- **Vercel project:** `prj_TxVagFdUy1oPQwCrqZkYr35ZkJ9H` (mrc-system), domains: `mrcsystem.com`, `www.mrcsystem.com`, `mrc-system.vercel.app`

### Canonical dev naming

- **Supabase project name:** `mrc-system-dev`
- **Vercel env var scope:** **Preview only**. Production env vars left untouched.
- **Branch convention:** `production` branch → Vercel Production target (hits prod DB). All other branches (including `main`) → Vercel Preview target (hits dev DB).

---

## Open Questions

| # | Question | Status |
|---|---|---|
| Q1 | Cron migrations skip vs. apply in dev? | **LOCKED: skip both. Document the skip.** |
| Q2 | Resend API key — fresh dev-scoped or reuse prod? | **LOCKED: reuse prod key.** |
| Q3 | Slack webhook for dev — dev channel or reuse prod? | **LOCKED: reuse prod webhook tonight. TODO: swap to `#mrc-dev-alerts` webhook when channel exists.** |
| Q4 | `ADMIN_FALLBACK_EMAIL` for dev — which test inbox? | **OPEN. Michael answers before Step 3.1.** |
| Q5 | Dev region — same as prod (`ap-southeast-2`)? | **LOCKED: same as prod if free tier allows; accept dashboard fallback otherwise.** |

---

## Step-by-Step Setup Plan

Estimated total: **3-4 hours** wall-clock — mostly dashboard clicks + sequential migration application.

### Phase 1 — Dev project provisioning (~30 min)

#### Step 1.1 — Create dev Supabase project
- **Who:** Michael
- **Time:** 5 min
- **URL:** https://supabase.com/dashboard/projects
- **Click sequence:**
  1. Top right → **New project**
  2. Organization → select existing MRC org (same one that owns `ecyivrxjpsmjmexqatym`)
  3. Project name → exactly: `mrc-system-dev`
  4. Database password → use "Generate a password" button. Copy + save somewhere temporary.
  5. Region → `Sydney (ap-southeast-2)` if available; closest fallback otherwise.
  6. Pricing plan → Free tier.
  7. **Create new project**. Wait ~2 min for provisioning.
- **Then copy from Project Settings → API:**
  - Project ref (20-char string, also in browser URL)
  - Project URL (`https://<ref>.supabase.co`)
  - anon key (JWT, `anon` `public` row)
  - service_role key (JWT, `service_role` `secret` row, click Reveal)
- **Paste back to Claude** in the next prompt, format:
  ```
  PROJECT_REF=...
  PROJECT_URL=https://...supabase.co
  ANON_KEY=eyJ...
  SERVICE_ROLE_KEY=eyJ...
  DB_PASSWORD=... (optional)
  ```
- **Pasting in chat is OK** — brand new dev project, zero data, isolated from prod.

**HARD STOP — Michael shares dev project credentials.**

#### Step 1.2 — Verify dev project is empty
- **Who:** Claude (Supabase MCP)
- **Time:** 2 min
- **Action:** Connect to dev project. Run `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`. Must return 0 rows (Supabase scaffold leaves auth.*, storage.* schemas populated, but `public` schema must be empty).

#### Step 1.3 — Enable `pg_cron` + `pg_net` extensions on dev
- **Who:** Michael (dashboard) OR Claude (apply_migration)
- **Time:** 2 min
- **Action:** Dashboard → Database → Extensions → enable `pg_cron` and `pg_net`. Migrations expect these extensions present even though cron jobs themselves are skipped (some migrations reference `pg_net` for non-cron HTTP calls).

### Phase 2 — Migrations + Storage setup (~45 min)

#### Step 2.1 — Apply 86 migrations to dev
- **Who:** Claude (Supabase MCP `apply_migration` per file, chronological order)
- **Time:** ~30 min
- **Action:** Read each `supabase/migrations/*.sql` chronologically. Apply via MCP. Skip the 2 cron migrations (per Q1).
- **Stop on first failure:** Do not continue applying past a failed migration. Report the failure, diagnose, await user direction.

**HARD STOP — Claude confirms 86 migrations applied successfully.**

#### Step 2.2 — Verify dev schema matches production
- **Who:** Claude
- **Time:** 5 min
- **Action:** Query `information_schema.tables` on both prod + dev. Expected: identical public-schema table list (~21 tables). Compare counts, then table names. Any delta = stop and diagnose.

#### Step 2.3 — Create + populate Storage buckets
- **Who:** Michael (dashboard uploads)
- **Time:** 10 min
- **Action:**
  - Confirm 4 buckets exist in dev (migrations should have created via `INSERT INTO storage.buckets`): `inspection-photos`, `pdf-templates`, `pdf-assets`, `profile-photos`
  - Upload from repo:
    - `src/templates/inspection-report-template.html` → dev Storage `pdf-templates/inspection-report-template-final.html`
    - `src/templates/job-report-template.html` → dev Storage `pdf-templates/job-report-template.html`
  - Copy from prod Storage `pdf-assets/` to dev `pdf-assets/`: dashboard → Storage → download from prod, upload to dev. Mainly `assets/logos/logo-mrc.png`.

### Phase 3 — Edge Function secrets + deploy (~45 min)

#### Step 3.1 — Set EF secrets on dev project
- **Who:** Michael (Supabase CLI via `!` prefix)
- **Time:** 10 min
- **Prerequisite:** Q4 answered (ADMIN_FALLBACK_EMAIL value).
- **Action:** Run:
  ```bash
  npx supabase secrets set --project-ref <DEV_REF> \
    SYSTEM_USER_UUID=a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f \
    RESEND_API_KEY=<reuse-prod> \
    SLACK_WEBHOOK_URL=<reuse-prod> \
    GOOGLE_MAPS_API_KEY=<reuse-prod> \
    OPENROUTER_API_KEY=<reuse-prod> \
    ADMIN_FALLBACK_EMAIL=<Q4-answer> \
    ADMIN_SEED_PASSWORD=<dev-only-password-Michael-picks>
  ```
- Claude provides the exact command with prod values inlined once Q4 is answered.

**HARD STOP — Michael confirms secrets set (paste `npx supabase secrets list --project-ref <DEV_REF>` output).**

#### Step 3.2 — Deploy all 12 EFs to dev
- **Who:** Claude (Supabase MCP `deploy_edge_function` per EF) OR Michael (CLI loop)
- **Time:** 15 min
- **Action:** Deploy each of the 12 EFs to dev. EF source is identical to prod — no code changes needed.
- **Claude-preferred path:** Read each EF source via filesystem, deploy via MCP. Faster than CLI for 12 sequential deploys.

#### Step 3.3 — Smoke-test one EF invocation against dev
- **Who:** Claude
- **Time:** 5 min
- **Action:** Invoke `calculate-travel-time` against dev with a known address pair. Confirm 200 response with computed distance. Validates: EF deployed, secrets set, Google API key working.

### Phase 4 — Vercel preview env separation (~20 min)

#### Step 4.1 — Audit current Vercel env vars
- **Who:** Michael
- **Time:** 5 min
- **Action:** Vercel dashboard → mrc-system project → Settings → Environment Variables. List all entries with their scopes (Production / Preview / Development). Screenshot or paste back to Claude.
- **Why:** Establish baseline. Need to know which env vars are Production-only vs already split, so Step 4.2 doesn't accidentally override a Production value.

**HARD STOP — Michael shares current env var inventory.**

#### Step 4.2 — Set Preview-scoped env vars pointing at dev
- **Who:** Michael (dashboard)
- **Time:** 10 min
- **Action:** For each frontend Vite env var, add a **Preview**-scope value pointing at dev. **Triple-check the scope dropdown reads "Preview" only — not "Production" or "All Environments".**
  - `VITE_SUPABASE_URL` (Preview) = `https://<DEV_REF>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` (Preview) = `<DEV_ANON_KEY>`
  - `VITE_GOOGLE_MAPS_API_KEY` (Preview) = same as Production
  - `VITE_SENTRY_DSN` (Preview) = same as Production (or a dev-scoped DSN if Michael wants clean error separation)
- **Critical:** Production-scope values unchanged. New rows for Preview, do not edit existing Production rows.

### Phase 5 — End-to-end verification (~15 min)

#### Step 5.1 — Trigger a preview deploy on a feature branch
- **Who:** Michael (push to any non-`production` branch)
- **Time:** 5 min
- **Action:** Push a trivial commit on a branch like `chore/test-dev-env`. Vercel auto-deploys to Preview.

#### Step 5.2 — Verify preview hits dev DB
- **Who:** Claude
- **Time:** 5 min
- **Action:**
  - Get preview URL via Vercel MCP `list_deployments` filtered to the feature branch.
  - Fetch preview HTML via Vercel MCP `web_fetch_vercel_url`.
  - Inspect bundled JS for `VITE_SUPABASE_URL` value — must reference `<DEV_REF>.supabase.co`, NOT `ecyivrxjpsmjmexqatym.supabase.co`.
  - Optional cross-check: query dev DB for any new audit_logs/login_activity rows timestamped to when the preview was accessed.

#### Step 5.3 — Verify production deploy unchanged
- **Who:** Claude
- **Time:** 3 min
- **Action:** Confirm `www.mrcsystem.com` still references `ecyivrxjpsmjmexqatym.supabase.co` (no change). Vercel Production deploy did not auto-roll. Production unaffected.

---

## Rollback Procedures

| Failure point | Rollback |
|---|---|
| Step 1.2 (empty-state check fails) | Delete dev project. Recreate with different name. |
| Step 2.1 (migration fails midway) | Stop. Either fix the failing migration's prerequisite, OR delete dev project + restart. Migrations are not reversible without manual `DROP` work — easier to nuke and restart on dev. |
| Step 3.x (EF deploy fails) | Re-run deploy. EF deploys are idempotent. |
| Step 4.2 (wrong env var set on Production scope) | **CRITICAL.** Immediately remove the Preview value from the Production scope. Restore original Production value. Trigger Production redeploy if Vercel auto-rolled. Then re-attempt Step 4.2 with correct scope. |
| Step 5.2 (preview hits prod DB instead of dev) | Step 4.2 was misconfigured — env var likely set on All Environments instead of Preview only. Fix scope, redeploy preview branch. |

**The only step that can affect production is Step 4.2.** If env vars are accidentally overridden on Production scope, production deploys will use dev DB on next auto-deploy. Triple-check the scope dropdown reads "Preview" only.

---

## After L4 lands — next steps

Per `docs/TODO.md` launch model:
- **L5** — Email domain switch to `mouldandrestoration.com.au` (DNS work, 3-4h wall-clock)
- **L6** — Activate Glen + Clayton + Vryan production accounts (30 min)
- **L7** — Glen/Clayton E2E walkthrough on dev (uses L4's dev environment)

L4 is a prerequisite for L7. L1 (AFD rate) and L2 (variation admin panel) are independent.

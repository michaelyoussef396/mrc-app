# Key Rotation Runbook — CRITICAL + IMPORTANT keys (written 5 Aug 2026)

Executed by **Michael only**. Claude Code generates nothing, sets nothing, and never
receives a key value — its role is read-only verification (digest listings, EF logs,
MCP pings). Scope: the six keys flagged CRITICAL or IMPORTANT in `docs/API_AUDIT.md`.
Inventory cross-checked against `docs/KEY_ROTATION.md` (2 Jun) and against live
name-only listings of all four secret stores taken 5 Aug — those listings are the
current-state evidence cited throughout.

| env | ref | role |
|---|---|---|
| **PROD** | `ecyivrxjpsmjmexqatym` | LIVE — mrcsystem.com |
| **DEV** | `ctppzqnysmzynkxjlzta` | sandbox clone |

Vercel project is **`mrc-system`** (repo `.vercel` link is stale — always pass
`--project mrc-system`).

## The four rules

1. **New → set everywhere → verify → only then revoke.** Never revoke-before-verify.
2. **Every `supabase` command carries an explicit `--project-ref`.** The repo is linked
   to PROD; a bare command targets production.
3. **Key values never touch a chat, a doc, or a shell argument.** `vercel env add`
   prompts for the value interactively (type it there). For Supabase secrets, put the
   value in a throwaway env file so it stays out of shell history:
   ```bash
   printf 'NAME=PASTE_VALUE_HERE\n' > /tmp/rot.env && nano /tmp/rot.env   # paste the real value in the editor
   npx supabase secrets set --env-file /tmp/rot.env --project-ref <ref>
   rm /tmp/rot.env
   ```
4. **Verification is observable, not assumed:** a changed digest in
   `npx supabase secrets list --project-ref <ref>`, a runtime call that succeeds, an
   email that arrives. Digest prefixes below are from the 5 Aug listings — after a
   rotation the digest MUST differ from the one quoted.

## Why this order

Tooling tokens that verification depends on move at the edges: the **dead** Supabase
PAT goes **first** (nothing can break — it is already broken — and replacing it restores
the MCP verification channel), the **live** GitHub PAT goes **last** (per
`KEY_ROTATION.md` §3: never rotate the tokens the verify steps run on until everything
else is proven). The four service keys in between are mutually independent — their
internal ordering is dictated only by urgency: Maps carries a possibly-broken production
surface today, so it leads that group.

| # | Key | Flag | Why here |
|---|---|---|---|
| 1 | `SUPABASE_ACCESS_TOKEN` | CRITICAL | Already dead — zero-risk, restores MCP verify path |
| 2 | Google Maps (both keys) | IMPORTANT | Possibly broken on PROD right now — see the gate in §2 |
| 3 | `RESEND_API_KEY` (+ auth-SMTP twin) | CRITICAL | Four surfaces, most update sites |
| 4 | `OPENROUTER_API_KEY` | IMPORTANT | DEV+PROD share one value — both set before revoke |
| 5 | `SLACK_WEBHOOK_URL` | IMPORTANT | PROD-only today; DEV gets its planned own channel |
| 6 | `GITHUB_PERSONAL_ACCESS_TOKEN` | CRITICAL | Last — MCP/tooling token, rotate after all verifies |

**Preview vs Production values, per key** (detail in each section):

| Key | Different values needed? |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | N/A — `.mcp.json` only, no Vercel presence |
| Maps browser (`VITE_GOOGLE_MAPS_API_KEY`) | **Your choice** — one referrer-restricted key can serve both (recommended); split only for stricter isolation. Today it is ONE entry spanning all three scopes. |
| Maps server (`GOOGLE_MAPS_API_KEY`) | DEV and PROD already hold **different** values (DEV rotated 4 Aug) — keep them split |
| `RESEND_API_KEY` | No Vercel presence. DEV and PROD EF secrets currently **differ**; converge on one new key (or keep split — your call, note in §3) |
| `OPENROUTER_API_KEY` | No Vercel presence. DEV = PROD today (digest-identical); keep shared |
| `SLACK_WEBHOOK_URL` | No Vercel presence. PROD and DEV **must differ** — DEV posts to its own channel (KEY_ROTATION.md decision 5) |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | N/A — `.mcp.json` only |

---

## 1 — SUPABASE_ACCESS_TOKEN (CRITICAL — already dead)

The token in `.mcp.json` is confirmed dead: the `supabase` MCP server returns
Unauthorized on every call (verified 23 Jul and again 4 Aug). Nothing depends on it, so
this rotation has no revoke-risk and unblocks MCP-based verification for the rest of
this runbook. Note the MCP server is hard-scoped `--project-ref=ecyivrxjpsmjmexqatym`
(PROD) — its calls are read-only but hit the live project.

1. **Generate:** https://supabase.com/dashboard/account/tokens → *Generate new token*
   (name it e.g. `mcp-cc-2026-08`).
2. **Update:** `.mcp.json` → `mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN` (edit the
   file yourself; it is gitignored and must stay so). If your shell profile exports
   `SUPABASE_ACCESS_TOKEN` for `deploy-templates.sh`, update it there too.
3. **Reconnect:** in Claude Code run `/mcp` and reconnect the `supabase` server.
4. **Verify:** ask CC for a read-only `list_migrations` via the supabase MCP — a
   migration list (not Unauthorized) proves the token.
5. **Revoke:** delete the old token entry at the same dashboard page. (It no longer
   authenticates, but dead entries should still be removed.)

No Vercel scopes, no Supabase EF secrets involved.

---

## 2 — Google Maps: GOOGLE_MAPS_API_KEY + VITE_GOOGLE_MAPS_API_KEY (IMPORTANT)

**Current state (5 Aug evidence):**

| Surface | State |
|---|---|
| DEV EF secret `GOOGLE_MAPS_API_KEY` | **Rotated 4 Aug** — digest `989b34a4…`, differs from PROD |
| PROD EF secret `GOOGLE_MAPS_API_KEY` | **Old key** — digest `2dbd8d34…` |
| Vercel `VITE_GOOGLE_MAPS_API_KEY` | **ONE entry spanning Production + Preview + Development, 176 days old.** Preview builds throw "API key expired" — and the production bundle was built from this same entry. |

**2.0 — Gate: establish what still works, before touching anything.**
Open https://mrcsystem.com → lead form / booking → type an address. Also open Google
Cloud Console → APIs & Services → Credentials and check whether the old key still
exists and is enabled.
- Autocomplete works on PROD → the old browser key is alive; proceed calmly.
- Autocomplete throws "API key expired" on PROD → production is broken **now**; this
  section is an incident fix, do it immediately.
Check the travel-time path the same way (book a job → travel estimate appears).

**2.1 — Server key (PROD).**
1. Google Cloud Console → Credentials → *Create credentials → API key*. Restrict:
   **API restrictions** = Distance Matrix API, Geocoding API. No referrer restriction
   (server-side callers send none).
2. Set on PROD (env-file pattern from rule 3, `NAME` = `GOOGLE_MAPS_API_KEY`):
   ```bash
   npx supabase secrets set --env-file /tmp/rot.env --project-ref ecyivrxjpsmjmexqatym
   ```
   Setting a secret restarts the project's Edge Functions (momentary cold start).
3. Verify: `npx supabase secrets list --project-ref ecyivrxjpsmjmexqatym` → digest for
   `GOOGLE_MAPS_API_KEY` no longer `2dbd8d34…`. Then book/edit a job on mrcsystem.com
   and confirm a real travel-time estimate (not the postcode fallback).
   DEV keeps its 4 Aug key — untouched.

**2.2 — Browser key (Vercel, all scopes).**
1. Create a second new key. Restrict: **HTTP referrers** =
   `https://mrcsystem.com/*`, `https://*.vercel.app/*`, `http://localhost:*` ;
   **API restrictions** = Maps JavaScript API, Places API.
   One key for Production AND Preview is the recommended shape — the referrer list
   covers both. If you want Preview isolated on its own key, create two and adjust
   step 2 accordingly.
2. Replace the Vercel entry. Because today's entry is a single all-scopes value, remove
   it once and re-add (the `add` prompts for the value — paste it there, never on the
   command line):
   ```bash
   npx vercel env rm VITE_GOOGLE_MAPS_API_KEY --project mrc-system
   npx vercel env add VITE_GOOGLE_MAPS_API_KEY production --project mrc-system
   npx vercel env add VITE_GOOGLE_MAPS_API_KEY preview    --project mrc-system
   npx vercel env add VITE_GOOGLE_MAPS_API_KEY development --project mrc-system
   ```
3. **Redeploy — the env change alone does nothing.** `VITE_*` vars are baked into the
   bundle at build time. Note `vercel redeploy` takes a *deployment URL* (not the apex
   domain) and does not accept `--project` — find the current production deployment
   first:
   ```bash
   npx vercel ls mrc-system                       # copy the current Production deployment URL
   npx vercel redeploy <that-deployment-url> --scope michaelyoussef396s-projects
   ```
   (`redeploy` rebuilds from the same source, so the new env value is picked up.
   Dashboard alternative: mrc-system → Deployments → latest Production → Redeploy,
   with "Use existing Build Cache" UNTICKED.) For the Preview scope, trigger any new
   preview build — pushing a commit is cleanest (a local `npx vercel --project
   mrc-system` also works but deploys your local tree, not git).
4. Verify: autocomplete works on mrcsystem.com AND on a fresh preview URL; browser
   console free of Maps key errors.

**2.3 — Revoke, both keys.** Only after BOTH 2.1 and 2.2 verifies pass: open Google
Cloud Console → Credentials, identify **every** pre-rotation Maps credential — the
176-day browser key AND the credential behind the old PROD server secret
(`2dbd8d34…`), whether those are one entry or two — and delete each. When done,
exactly three Maps credentials remain: the new server key (2.1), the new browser key
(2.2), and the 4 Aug DEV server key. Confirm the DEV key is a separate credential
before deleting anything.

---

## 3 — RESEND_API_KEY (CRITICAL) — four surfaces

**Current state (5 Aug evidence):** PROD EF secret digest `9e3f6ca7…` and DEV EF secret
digest `5a14f787…` **differ** — two active keys in Supabase. Third copy in `.mcp.json`
(`resend` MCP server). Fourth, separate credential: the Resend key named
**`supabase-auth-smtp`** inside PROD Auth SMTP settings (Dashboard → Authentication →
SMTP) — it carries Supabase Auth emails and rotates independently (TODO.md, 2 Aug).

Decision to make first: converge EF/MCP on **one** new key (simplest, matches the
KEY_ROTATION.md Q2 reuse decision), or keep DEV on its own. Steps below assume one.

1. **Generate two new keys** at https://resend.com/api-keys: one for the app
   (EF + MCP), one to replace `supabase-auth-smtp`.
2. **Set the app key** (env-file pattern, `NAME` = `RESEND_API_KEY`):
   ```bash
   npx supabase secrets set --env-file /tmp/rot.env --project-ref ecyivrxjpsmjmexqatym
   npx supabase secrets set --env-file /tmp/rot.env --project-ref ctppzqnysmzynkxjlzta
   ```
   Then `.mcp.json` → `mcpServers.resend.env.RESEND_API_KEY`, and `/mcp` reconnect.
3. **Set the SMTP key:** PROD Dashboard → Authentication → SMTP → replace the password
   field with the new `supabase-auth-smtp` replacement key. Host/port/sender unchanged.
4. **Verify, all four surfaces:**
   - Digests changed on both refs (`npx supabase secrets list --project-ref <each>`).
   - App email — note **admin-UI lead creation sends no email** (it fires Slack only),
     so don't verify with a plain smoke lead. Use a path that exercises Resend: submit
     a lead through the fake Framer test form (drives `receive-framer-lead` → customer
     confirmation email), or book an inspection on an existing DEV lead
     (booking-confirmation via the `send-email` EF). Email arrives → app key proven.
   - Auth email: trigger a password reset from mrcsystem.com → email arrives.
   - Resend dashboard shows the sends attributed to the NEW keys.
5. **Revoke** all three old credentials in Resend (old PROD EF key, old DEV EF key, old
   `supabase-auth-smtp`) — only after every verify above has passed.

No Vercel scopes involved (email goes through EFs only).

---

## 4 — OPENROUTER_API_KEY (IMPORTANT)

**Current state (5 Aug evidence):** DEV and PROD hold the **identical** value (digest
`c8b156ae…` on both). Revoking the old key before BOTH projects carry the new one kills
AI generation everywhere — set both, verify, then revoke.

1. **Generate:** https://openrouter.ai/keys → create key (set a spend limit while
   you're there).
2. **Set on both refs** (env-file pattern, `NAME` = `OPENROUTER_API_KEY`):
   ```bash
   npx supabase secrets set --env-file /tmp/rot.env --project-ref ecyivrxjpsmjmexqatym
   npx supabase secrets set --env-file /tmp/rot.env --project-ref ctppzqnysmzynkxjlzta
   ```
3. **Verify:** digests changed on both refs. Runtime: regenerate the AI summary on a
   DEV inspection (INS-2026-0001 works) — expect success with
   `Trying model: google/gemini-2.5-flash` → `finish_reason=stop` in the DEV EF logs.
   PROD has no inspections to exercise; the digest change plus DEV runtime proof covers
   it (same EF code, same key value).
4. **Revoke** the old key at OpenRouter.

No Vercel scopes involved.

---

## 5 — SLACK_WEBHOOK_URL (IMPORTANT)

**Current state (5 Aug evidence):** set on PROD (digest `5ec25af0…`), **absent on DEV**
— which is why DEV Slack notifications currently fail with FunctionsFetchError (known,
benign). DEV is planned to get its **own channel's** webhook (KEY_ROTATION.md
decision 5) so test noise never lands in the real channel: PROD and DEV values must
differ.

1. **Generate:** Slack workspace → app settings → Incoming Webhooks → create TWO new
   webhooks: one for the production notifications channel, one for a dev/test channel.
2. **Set** (env-file pattern, `NAME` = `SLACK_WEBHOOK_URL`, different value per ref):
   ```bash
   npx supabase secrets set --env-file /tmp/rot-prod.env --project-ref ecyivrxjpsmjmexqatym
   npx supabase secrets set --env-file /tmp/rot-dev.env  --project-ref ctppzqnysmzynkxjlzta
   ```
   Note: DEV's `send-slack-notification` also wants `INTERNAL_WEBHOOK_SECRET`, which is
   **absent on DEV** (5 Aug listing) — set it in the same sitting if you want DEV Slack
   actually working, per KEY_ROTATION.md §4.3.
3. **Verify:** digest present/changed on each ref; create + delete a smoke lead on PROD
   → message in the production channel; same on DEV → message in the dev channel (and
   nothing in the production channel).
4. **Revoke:** delete the old webhook in Slack app settings.

No Vercel scopes involved.

---

## 6 — GITHUB_PERSONAL_ACCESS_TOKEN (CRITICAL) — LAST

Rotates last because it powers the `github` MCP server used for tooling verification.
Note the `gh` CLI authenticates separately (its own keychain credential) — rotating this
PAT does not touch `gh`; if the `gh` credential is also considered exposed, refresh it
separately with `gh auth login`.

1. **Generate:** https://github.com/settings/tokens → *Fine-grained tokens* → new token
   scoped to **only** `michaelyoussef396/mrc-app`, permissions: Contents + Pull
   requests (read/write), Metadata (read). Set an expiry.
2. **Update:** `.mcp.json` → `mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN` →
   `/mcp` reconnect.
3. **Verify:** ask CC for a read-only github MCP call (e.g. view a PR) — success on the
   new token before anything is revoked.
4. **Revoke:** delete the old PAT at github.com/settings/tokens.

---

## Adjacent findings from the 5 Aug evidence pass (not in the CRITICAL/IMPORTANT scope)

- **`ADMIN_FALLBACK_EMAIL` is confirmed UNSET on PROD** (present on DEV only). This is
  the exact pre-cutover check TODO.md asked for: until it is set, lead-capture failure
  alerts fall back to `admin@mrcsystem.com` — a mailbox on the domain being retired.
  One `secrets set` on PROD fixes it; do it alongside any step above.
- **`INTERNAL_WEBHOOK_SECRET`**: on PROD, absent on DEV. Not flagged in API_AUDIT.md
  (it is the secret `KEY_ROTATION.md` surfaced that the audit misses); rotate per that
  doc's §4.3 whenever desired — independent of everything here.
- **`SUPABASE_SERVICE_ROLE_KEY` still sits in Vercel Preview + Production scopes**
  (72 days old). Nothing reads it since the PDF pipeline rework — the tracked action is
  **deletion, not rotation** (TODO.md PDF-CL6):
  `npx vercel env rm SUPABASE_SERVICE_ROLE_KEY --project mrc-system` after confirming
  zero references in `api/`.
- **`SENTRY_AUTH_TOKEN`** (Vercel Production scope, build-time sourcemap upload): in
  TODO.md's full L4 Phase 6 rotation scope but not API_AUDIT-flagged — rotate at
  sentry.io during the full sweep.
- **JWT-secret rotation** (anon + service_role, logs every user out) is a separate
  maintenance-window job — `KEY_ROTATION.md` §2C/§4.4, deliberately NOT part of this
  runbook.

## Close-out checklist

- [ ] All six keys rotated new→set→verify→revoke, no verify skipped
- [ ] `npx supabase secrets list --project-ref ecyivrxjpsmjmexqatym` — every rotated
      digest differs from the 5 Aug values quoted above
- [ ] `npx supabase secrets list --project-ref ctppzqnysmzynkxjlzta` — same
- [ ] `npx vercel env ls production --project mrc-system` and
      `npx vercel env ls preview --project mrc-system` — `VITE_GOOGLE_MAPS_API_KEY`
      entries fresh (age resets), production redeployed after the change
- [ ] `.mcp.json` still gitignored, never committed
      (`git log --all -- .mcp.json` stays empty)
- [ ] Old credentials revoked at every provider dashboard

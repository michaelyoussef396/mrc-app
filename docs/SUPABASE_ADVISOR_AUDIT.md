# Supabase Advisor Audit — PROD + DEV

**Generated:** 2026-07-07 · **Point-in-time, read-only snapshot** (Supabase Security + Performance advisors).
**Projects audited:**

| env | ref | role |
|-----|-----|------|
| **PROD** | `ecyivrxjpsmjmexqatym` | LIVE — mrcsystem.com, real customer data |
| **DEV** | `ctppzqnysmzynkxjlzta` | Sandbox clone (restore-to-new-project) |

**Totals:** Security — PROD **1 ERROR / 25 WARN**, DEV **1 ERROR / 27 WARN** (DEV = PROD + 2 auth-config WARNs).
Performance — PROD **90** findings, DEV **161** (DEV = PROD's 90 + 71 extra `unused_index`, expected noise on a traffic-less clone).

No database was modified. This document records and triages only.

---

## ⭐ Recommend fixing before launch (shortlist)

Ordered by priority. These are the launch-relevant subset; everything else is expected/noise (see triage).

1. **[SECURITY ERROR] `security_definer_view` on `public.latest_ai_summary`** — the view runs with its
   creator's permissions, bypassing the querying user's RLS on `ai_summary_versions`. Low-effort fix:
   recreate the view `WITH (security_invoker = on)`. Touches RLS/data exposure → fix before launch.
2. **[SECURITY WARN] `rls_policy_always_true` — `webhook_submissions` INSERT** (`WITH CHECK (true)`).
   Any role the policy applies to can insert arbitrary rows. Confirm inserts are restricted to
   `service_role` (the `receive-framer-lead` path); if `anon`/`authenticated` can hit it, tighten the
   `WITH CHECK`. Exposed-write risk → verify before launch.
3. **[SECURITY WARN] `public_bucket_allows_listing` — `inspection-reports`** bucket has broad SELECT
   policies allowing clients to **list every file** (customer report filenames enumerable). Restrict to
   per-object access (drop the broad list policy; public URL access doesn't need it). The other 3 public
   buckets (`company-assets`, `pdf-assets`, `profile-photos`) are lower-sensitivity but same pattern.
4. **[Hardening, optional] Revoke `EXECUTE` from `anon`** on the SECURITY DEFINER functions that are not
   meant to be public (`audit_log_trigger`, `handle_new_user`, `audited_mark_invoice_overdue`,
   `auto_generate_lead_number`, `email_logs_notify_slack`, `get_user_roles_by_id`). Not blocking, but
   cheap attack-surface reduction. (`audited_insert_lead_via_framer` is intentionally anon-callable —
   leave it. `has_role`/`is_admin` are RLS helper functions — expected SECURITY DEFINER.)

**Not launch blockers:** the DEV-only auth WARNs (`auth_leaked_password_protection`,
`auth_insufficient_mfa_options`) — **PROD does not report these, i.e. PROD already has leaked-password
protection and sufficient MFA enabled.** They're config gaps on the sandbox clone only. All performance
findings are scale/tuning items, not launch blockers at current data volumes.

---

## Security ERROR triage

| ERROR | Object | Project(s) | Launch-relevant? | Reasoning |
|-------|--------|-----------|------------------|-----------|
| `security_definer_view` | `public.latest_ai_summary` (view) | Both | **Yes — low severity** | SECURITY DEFINER view bypasses the caller's RLS and runs as the view owner. The underlying `ai_summary_versions` is RLS-protected; the view can leak rows across the RLS boundary if the owner is privileged. App is internal (admin/technician), not anon-facing, so real-world exposure is limited — but it's a genuine RLS-correctness issue with a one-line fix (`security_invoker = on`). Fix before launch. |

Only **1 ERROR** exists (identical on both projects). No other ERROR-level findings.

---

## Section 1 — Security findings

Sorted ERROR → WARN. "Project(s)" = where the finding appears.

| Finding | Severity | Object | Description | Project(s) | Remediation |
|---------|----------|--------|-------------|-----------|-------------|
| `security_definer_view` | ERROR | view `public.latest_ai_summary` | View defined with SECURITY DEFINER — enforces creator's perms/RLS, not the querying user's | Both | [lint 0010](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view) |
| `rls_policy_always_true` | WARN | table `public.webhook_submissions` — INSERT policy "Service insert webhook submissions" | RLS INSERT policy with `WITH CHECK (true)` — unrestricted insert | Both | [lint 0024](https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy) |
| `public_bucket_allows_listing` | WARN | bucket `inspection-reports` (2 SELECT policies) | Public bucket with broad SELECT allows clients to list all files | Both | [lint 0025](https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing) |
| `public_bucket_allows_listing` | WARN | bucket `company-assets` | Public bucket with broad SELECT allows listing all files | Both | [lint 0025](https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing) |
| `public_bucket_allows_listing` | WARN | bucket `pdf-assets` | Public bucket with broad SELECT allows listing all files | Both | [lint 0025](https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing) |
| `public_bucket_allows_listing` | WARN | bucket `profile-photos` | Public bucket with broad SELECT allows listing all files | Both | [lint 0025](https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing) |
| `anon_security_definer_function_executable` | WARN | 10 functions (below) | SECURITY DEFINER functions callable by `anon` via `/rest/v1/rpc/...` | Both | [lint 0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) |
| `authenticated_security_definer_function_executable` | WARN | 10 functions (below) | SECURITY DEFINER functions callable by `authenticated` via `/rest/v1/rpc/...` | Both | [lint 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) |
| `auth_leaked_password_protection` | WARN | Auth | Leaked-password protection (HaveIBeenPwned) disabled | **DEV only** | [docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) |
| `auth_insufficient_mfa_options` | WARN | Auth | Too few MFA options enabled | **DEV only** | [docs](https://supabase.com/docs/guides/auth/auth-mfa) |

**The 10 SECURITY DEFINER functions** flagged for both `anon` (0028) and `authenticated` (0029), on both projects:
`audit_log_trigger()`, `audited_insert_lead_via_framer(uuid, jsonb)`, `audited_mark_invoice_overdue(uuid, uuid)`,
`auto_generate_lead_number()`, `email_logs_notify_slack()`, `get_user_roles_by_id(uuid)`, `handle_new_user()`,
`has_role(uuid, text)`, `is_admin()`, `is_admin(uuid)`.

*Triage note:* `has_role`/`is_admin` are intentional RLS helper functions (must be SECURITY DEFINER);
`audited_insert_lead_via_framer` is intentionally anon-callable (Framer lead intake). `audit_log_trigger`
and `handle_new_user` are trigger functions that shouldn't be RPC-reachable — revoking `EXECUTE` is safe
hardening. Not launch blockers, but see shortlist item 4.

---

## Section 2 — Performance findings

Grouped by lint type. Counts are per project.

| Finding | Severity | PROD count | DEV count | Project(s) | Remediation |
|---------|----------|-----------|-----------|-----------|-------------|
| `auth_rls_initplan` | WARN | 24 | 24 | Both | [lint 0003](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan) |
| `multiple_permissive_policies` | WARN | 24 | 24 | Both | [lint 0006](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies) |
| `unindexed_foreign_keys` | INFO | 9 | 9 | Both | [lint 0001](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) |
| `unused_index` | INFO | 32 | 103 | Both (DEV +71) | [lint 0005](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) |
| `auth_db_connections_absolute` | INFO | 1 | 1 | Both | [going to prod](https://supabase.com/docs/guides/deployment/going-into-prod) |

**Notes / triage:**
- **`auth_rls_initplan` (24, both)** — the highest-value perf item. RLS policies call `auth.<fn>()` /
  `current_setting()` re-evaluated **per row**. Fix by wrapping in a scalar subquery, e.g.
  `(select auth.uid())`. Affects: `ai_summary_versions, app_settings, error_logs, inspection_areas,
  inspections, invoices, job_completions, leads, login_activity, photo_history, photos,
  suspicious_activity, webhook_submissions`. Not launch-blocking at current volumes; worthwhile post-launch.
- **`multiple_permissive_policies` (24, both)** — multiple permissive policies per table/role/action, each
  evaluated on every query. Affects `ai_summary_versions, app_settings, inspection_areas, inspections,
  invoices, leads, photo_history, photos`. Tuning/cleanup, not blocking.
- **`unindexed_foreign_keys` (9, both)** — FK columns without a covering index on `ai_summary_versions,
  error_logs, invoices, job_completion_pdf_versions, job_completions, photo_history, webhook_submissions`.
  Minor at current scale; add indexes as row counts grow.
- **`unused_index` (32 PROD / 103 DEV)** — **DEV's extra 71 are noise**: the clone has no query traffic, so
  index-usage stats are empty and more indexes look "unused." Don't act on DEV's list. Even PROD's 32 should
  not be dropped pre-launch (usage stats are young; dropping indexes is risky). Review post-launch.
- **`auth_db_connections_absolute` (1, both)** — INFO advisory about connection sizing for production.

**Cross-project performance diff:** all **90** PROD findings also appear in DEV (`Both`). DEV has **71
additional `unused_index`** findings and **zero** PROD-only findings — consistent with DEV being a fresh
restore with no query history.

---

## Appendix A — Raw Security advisor JSON (verbatim)

Captured 2026-07-07 from `get_advisors { type: 'security' }`. Performance raw JSON is intentionally **not**
embedded (~180K chars across both projects) — it is summarized in Section 2 above.

### A.1 — PROD (`ecyivrxjpsmjmexqatym`) security lints

```json
[
  {"name":"security_definer_view","level":"ERROR","categories":["SECURITY"],"detail":"View `public.latest_ai_summary` is defined with the SECURITY DEFINER property","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view","metadata":{"name":"latest_ai_summary","type":"view","schema":"public"},"cache_key":"security_definer_view_public_latest_ai_summary"},
  {"name":"rls_policy_always_true","level":"WARN","categories":["SECURITY"],"detail":"Table `public.webhook_submissions` has an RLS policy `Service insert webhook submissions` for `INSERT` that allows unrestricted access (WITH CHECK clause is always true).","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy","metadata":{"name":"webhook_submissions","type":"table","schema":"public","command":"INSERT","with_check":"true","policy_name":"Service insert webhook submissions"},"cache_key":"rls_policy_always_true_public_webhook_submissions_Service insert webhook submissions"},
  {"name":"public_bucket_allows_listing","level":"WARN","categories":["SECURITY"],"detail":"Public bucket `company-assets` has 1 broad SELECT policy on `storage.objects` (Anyone can view company assets).","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing","metadata":{"bucket_name":"company-assets","policy_count":1,"policy_names":["Anyone can view company assets"]},"cache_key":"public_bucket_allows_listing_company-assets"},
  {"name":"public_bucket_allows_listing","level":"WARN","categories":["SECURITY"],"detail":"Public bucket `inspection-reports` has 2 broad SELECT policies on `storage.objects` (Authenticated users can read inspection reports, Public can read inspection reports).","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing","metadata":{"bucket_name":"inspection-reports","policy_count":2,"policy_names":["Authenticated users can read inspection reports","Public can read inspection reports"]},"cache_key":"public_bucket_allows_listing_inspection-reports"},
  {"name":"public_bucket_allows_listing","level":"WARN","categories":["SECURITY"],"detail":"Public bucket `pdf-assets` has 1 broad SELECT policy on `storage.objects` (Allow public read access on pdf-assets).","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing","metadata":{"bucket_name":"pdf-assets","policy_count":1,"policy_names":["Allow public read access on pdf-assets"]},"cache_key":"public_bucket_allows_listing_pdf-assets"},
  {"name":"public_bucket_allows_listing","level":"WARN","categories":["SECURITY"],"detail":"Public bucket `profile-photos` has 1 broad SELECT policy on `storage.objects` (Public read avatars).","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing","metadata":{"bucket_name":"profile-photos","policy_count":1,"policy_names":["Public read avatars"]},"cache_key":"public_bucket_allows_listing_profile-photos"},
  {"name":"anon_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.audit_log_trigger()` can be executed by the `anon` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable","metadata":{"name":"audit_log_trigger","schema":"public","security_definer":true},"cache_key":"anon_security_definer_function_executable_public_audit_log_trigger_"},
  {"name":"anon_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.audited_insert_lead_via_framer(p_acting_user_id uuid, p_payload jsonb)` can be executed by the `anon` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable","metadata":{"name":"audited_insert_lead_via_framer","schema":"public","arguments":"p_acting_user_id uuid, p_payload jsonb","security_definer":true},"cache_key":"anon_security_definer_function_executable_public_audited_insert_lead_via_framer_p_acting_user_id uuid, p_payload jsonb"},
  {"name":"anon_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.audited_mark_invoice_overdue(p_acting_user_id uuid, p_invoice_id uuid)` can be executed by the `anon` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable","metadata":{"name":"audited_mark_invoice_overdue","schema":"public","arguments":"p_acting_user_id uuid, p_invoice_id uuid","security_definer":true},"cache_key":"anon_security_definer_function_executable_public_audited_mark_invoice_overdue_p_acting_user_id uuid, p_invoice_id uuid"},
  {"name":"anon_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.auto_generate_lead_number()` can be executed by the `anon` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable","metadata":{"name":"auto_generate_lead_number","schema":"public","security_definer":true},"cache_key":"anon_security_definer_function_executable_public_auto_generate_lead_number_"},
  {"name":"anon_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.email_logs_notify_slack()` can be executed by the `anon` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable","metadata":{"name":"email_logs_notify_slack","schema":"public","security_definer":true},"cache_key":"anon_security_definer_function_executable_public_email_logs_notify_slack_"},
  {"name":"anon_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.get_user_roles_by_id(p_user_id uuid)` can be executed by the `anon` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable","metadata":{"name":"get_user_roles_by_id","schema":"public","arguments":"p_user_id uuid","security_definer":true},"cache_key":"anon_security_definer_function_executable_public_get_user_roles_by_id_p_user_id uuid"},
  {"name":"anon_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.handle_new_user()` can be executed by the `anon` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable","metadata":{"name":"handle_new_user","schema":"public","security_definer":true},"cache_key":"anon_security_definer_function_executable_public_handle_new_user_"},
  {"name":"anon_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.has_role(_user_id uuid, _role_name text)` can be executed by the `anon` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable","metadata":{"name":"has_role","schema":"public","arguments":"_user_id uuid, _role_name text","security_definer":true},"cache_key":"anon_security_definer_function_executable_public_has_role__user_id uuid, _role_name text"},
  {"name":"anon_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.is_admin()` can be executed by the `anon` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable","metadata":{"name":"is_admin","schema":"public","security_definer":true},"cache_key":"anon_security_definer_function_executable_public_is_admin_"},
  {"name":"anon_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.is_admin(_user_id uuid)` can be executed by the `anon` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable","metadata":{"name":"is_admin","schema":"public","arguments":"_user_id uuid","security_definer":true},"cache_key":"anon_security_definer_function_executable_public_is_admin__user_id uuid"},
  {"name":"authenticated_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.audit_log_trigger()` can be executed by the `authenticated` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable","metadata":{"name":"audit_log_trigger","schema":"public","security_definer":true},"cache_key":"authenticated_security_definer_function_executable_public_audit_log_trigger_"},
  {"name":"authenticated_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.audited_insert_lead_via_framer(p_acting_user_id uuid, p_payload jsonb)` can be executed by the `authenticated` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable","metadata":{"name":"audited_insert_lead_via_framer","schema":"public","arguments":"p_acting_user_id uuid, p_payload jsonb","security_definer":true},"cache_key":"authenticated_security_definer_function_executable_public_audited_insert_lead_via_framer_p_acting_user_id uuid, p_payload jsonb"},
  {"name":"authenticated_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.audited_mark_invoice_overdue(p_acting_user_id uuid, p_invoice_id uuid)` can be executed by the `authenticated` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable","metadata":{"name":"audited_mark_invoice_overdue","schema":"public","arguments":"p_acting_user_id uuid, p_invoice_id uuid","security_definer":true},"cache_key":"authenticated_security_definer_function_executable_public_audited_mark_invoice_overdue_p_acting_user_id uuid, p_invoice_id uuid"},
  {"name":"authenticated_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.auto_generate_lead_number()` can be executed by the `authenticated` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable","metadata":{"name":"auto_generate_lead_number","schema":"public","security_definer":true},"cache_key":"authenticated_security_definer_function_executable_public_auto_generate_lead_number_"},
  {"name":"authenticated_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.email_logs_notify_slack()` can be executed by the `authenticated` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable","metadata":{"name":"email_logs_notify_slack","schema":"public","security_definer":true},"cache_key":"authenticated_security_definer_function_executable_public_email_logs_notify_slack_"},
  {"name":"authenticated_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.get_user_roles_by_id(p_user_id uuid)` can be executed by the `authenticated` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable","metadata":{"name":"get_user_roles_by_id","schema":"public","arguments":"p_user_id uuid","security_definer":true},"cache_key":"authenticated_security_definer_function_executable_public_get_user_roles_by_id_p_user_id uuid"},
  {"name":"authenticated_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.handle_new_user()` can be executed by the `authenticated` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable","metadata":{"name":"handle_new_user","schema":"public","security_definer":true},"cache_key":"authenticated_security_definer_function_executable_public_handle_new_user_"},
  {"name":"authenticated_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.has_role(_user_id uuid, _role_name text)` can be executed by the `authenticated` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable","metadata":{"name":"has_role","schema":"public","arguments":"_user_id uuid, _role_name text","security_definer":true},"cache_key":"authenticated_security_definer_function_executable_public_has_role__user_id uuid, _role_name text"},
  {"name":"authenticated_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.is_admin()` can be executed by the `authenticated` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable","metadata":{"name":"is_admin","schema":"public","security_definer":true},"cache_key":"authenticated_security_definer_function_executable_public_is_admin_"},
  {"name":"authenticated_security_definer_function_executable","level":"WARN","categories":["SECURITY"],"detail":"Function `public.is_admin(_user_id uuid)` can be executed by the `authenticated` role as a SECURITY DEFINER function.","remediation":"https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable","metadata":{"name":"is_admin","schema":"public","arguments":"_user_id uuid","security_definer":true},"cache_key":"authenticated_security_definer_function_executable_public_is_admin__user_id uuid"}
]
```

### A.2 — DEV (`ctppzqnysmzynkxjlzta`) security lints

Identical to A.1 (same 26 findings, same `cache_key`s) **plus** the two DEV-only auth-config WARNs below:

```json
[
  {"name":"auth_leaked_password_protection","level":"WARN","categories":["SECURITY"],"detail":"Leaked password protection is currently disabled. Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org.","remediation":"https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection","metadata":{"type":"auth","entity":"Auth"},"cache_key":"auth_leaked_password_protection"},
  {"name":"auth_insufficient_mfa_options","level":"WARN","categories":["SECURITY"],"detail":"This project has too few multi-factor authentication (MFA) options enabled.","remediation":"https://supabase.com/docs/guides/auth/auth-mfa","metadata":{"type":"auth","entity":"Auth"},"cache_key":"auth_insufficient_mfa_options"}
]
```

*(PROD does **not** report these two — i.e. PROD already has leaked-password protection and sufficient MFA
enabled. They are sandbox-config gaps on DEV only.)*

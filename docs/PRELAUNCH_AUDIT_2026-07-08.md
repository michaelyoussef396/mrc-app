# Pre-Launch Consolidated Audit — 2026-07-08

**Scope:** codebase health + PRD drift, PROD↔DEV schema parity, security-advisor regression + auth/RLS code pass. Read-only pass (GitNexus index refreshed first). Findings reconciled against live data or code before ranking.

**Targets:** PROD `ecyivrxjpsmjmexqatym`, DEV `ctppzqnysmzynkxjlzta`.

---

## ⭐ Launch-relevant shortlist (ranked)

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| 1 | **High** | **Job-completion submit proceeds after a failed save** — `handleSave` swallows errors (no re-throw), so a failed final flush still flips status to submitted, generates the PDF from stale DB data, and toasts success. In the untested Phase 2 flow. | `src/hooks/useJobCompletionForm.ts:262-276,362-369` |
| 2 | **Med** | **`anon` can EXECUTE the SECURITY DEFINER audit RPCs with a forged `p_acting_user_id`** — `audited_mark_invoice_overdue` (flip any invoice overdue, RLS-bypassed) and `audited_insert_lead_via_framer` (insert leads bypassing the EF's rate-limit/validation, forge attribution). PUBLIC default grant never revoked. Close before the public Framer form / customers go live (L3). | `migrations/…phase2_audit_attribution_helpers.sql`, `…extend_framer_insert_rpc.sql` |
| 3 | **Med** | **Dehumidifier rate drift: code `$119`/day vs docs `$132`** — real invoice money; already in TODO L1 but unresolved. | `src/lib/calculations/pricing.ts:28` |
| 4 | **Med** | **Invoice preview total can diverge from the saved invoice** — lead-card preview uses stored `labour_cost_ex_gst`; AdminInvoiceHelper recomputes from hours. Diverge if rates drift. | `src/lib/api/invoices.ts:710` vs `AdminInvoiceHelper.tsx:220-222` |
| 5 | **Med** | **`markInvoicePaid` lead-status update is fire-and-forget** (floating `.then()`), unlike `markInvoiceSent` which awaits → refetch race. | `src/lib/api/invoices.ts:589-593` |

---

## 1 — Codebase (verified)

- **[High]** #1 — `handleSave` catches + toasts + does not re-throw; `handleSubmit` awaits it then submits unconditionally. Top fix.
- **[Med]** #3 dehumidifier rate; #4 invoice-total source divergence; #5 fire-and-forget lead status.
- **[Low]** Dead code — 4 unused exported API fns (`createInvoice`, `updateInvoice`, `markInvoiceOverdue`, `getJobCompletionById`); live write path is `saveCalculatedInvoice`.
- **[Low]** PRD drift — PRD promises an invoice discount control (13% cap) that doesn't exist in the helper (`discountPercent` hardwired to 0 by the per-day rate model); route is `:leadId` path-param vs PRD's query-param.
- **Clean:** `npm run typecheck` passes; pricing/penalty-ladder math correct at fence-posts; `submitJobCompletion`/`updateJobCompletion` guard on rows-affected (catch silent RLS denials); clocks injectable.

## 2 — Schema drift

- **PROD ↔ DEV: byte-identical** — all 29 tables' column signatures, all 28 policy signatures, and full migration history match. Backup-drop + `security_invoker` fix confirmed on both. **Parity verdict: PASS.**
- **[Low/INFO]** Migration-history bookkeeping lag — both DBs' `schema_migrations` end at `20260624104911`, but the repo has 6 later `.sql` files (applied via Studio raw SQL, not `db push`). All are idempotent (`IF EXISTS`/`IF NOT EXISTS`/`OR REPLACE`) → safe on replay. Process-hygiene gap, not a data risk.
- **Closed via live queries:** `audited_insert_lead_via_framer` extended RPC **is applied on both** (identical body hash). `job_completions` waste columns (`20260624113911`) **not applied** on either — consistent, "deferred/not-wired" → Low.
- `.sql.PENDING` AFD rename — correctly parked; do not apply without the coordinated code change.

## 3 — Security

- **Advisor regression: PASS / none.** PROD 0 ERROR/25 WARN, DEV 0 ERROR/27 WARN vs the doc's 1 ERROR each. The `security_definer_view` ERROR is **resolved**; WARN sets byte-identical to baseline.
- **[Med]** #2 (anon RPC) — top code-side security item; needs a `REVOKE EXECUTE … FROM anon, PUBLIC` migration.
- **[Low]** implicit auth flow instead of PKCE (`client.ts:117`); session tokens in localStorage (Supabase-SPA default); PDF endpoints' CORS accepts any `*.vercel.app` (each still requires an admin JWT — cross-ref to the tracked L4 Preview→PROD risk); raw DB error string returned by `check-overdue-invoices` (service-role only).
- **[Low, mitigated]** Framer intake interpolation into email/Slack — neutralized by `stripHtml()` at extraction; residual Slack-mrkdwn only, internal channel.
- **Verified clean:** no service-role key in the browser bundle; `manage-users` JWT-gated + server-side role check; both PDF `api/*` endpoints admin-gated, caller-JWT-bound, no service-role, path-traversal guarded; `AuthContext.hasRole` is UI-only but every privileged action is independently enforced server-side.

---

## Overall verdict

No launch-blocking schema or security *regression*. Fix **#1** before the Phase-2 flow goes live (real correctness bug in the untested area). Close **#2** before the public Framer form connects (L3). #3–#5 are money/consistency items. Everything else is Low/pre-existing/already-tracked.

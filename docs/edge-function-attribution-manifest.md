# Edge Function Attribution Manifest

**Canonical reference for all 12 deployed Edge Functions.** Update this file in the same commit that adds, removes, or restructures any EF.

**Created:** 2026-05-01 (Phase 2 of `docs/inspection-workflow-fix-plan-v2-2026-04-30.md`, Stage 2.0c)

## Background

The `audit_log_trigger()` function (modified in Stage 2.0a) attributes each audited write to a `user_id` by reading `auth.uid()` first, then falling back to `current_setting('app.acting_user_id', true)::uuid`.

Edge Functions can produce non-NULL `user_id` in audit_logs via two patterns:

1. **JWT-bound client (Bucket A):** create a Supabase client scoped to the caller's JWT and use it for audited writes. `auth.uid()` returns the calling user inside the trigger. No SQL helper required.
2. **RPC wrapper (Bucket B):** the EF calls a `SECURITY DEFINER` Postgres function that does `set_config('app.acting_user_id', ..., true)` and the audited write in the same transaction. Required when the EF runs without a user JWT (cron, webhook).

The two RPC helpers added in Stage 2.0c:
- `public.audited_insert_lead_via_framer(p_acting_user_id uuid, p_payload jsonb) RETURNS uuid`
- `public.audited_mark_invoice_overdue(p_acting_user_id uuid, p_invoice_id uuid) RETURNS void`

`SYSTEM_USER_UUID` (see `docs/system-user-uuid.md`) is the sentinel system identity passed by Bucket B EFs.

## EF inventory

12 Edge Functions deployed in `supabase/functions/`. Classified into three buckets.

### Bucket A — Frontend-invoked, audited writes (4 EFs)

| EF | Audited write | Frontend caller | Attribution mechanism |
|---|---|---|---|
| `generate-inspection-pdf` | `inspections` UPDATE (pdf_url, pdf_version, pdf_generated_at) | `src/lib/api/pdfGeneration.ts` `generateInspectionPDF()` | Dual-client: service role for reads, **JWT-bound client `supabaseAudited`** for the audited UPDATE. Auth header forwarded from frontend. |
| `generate-inspection-summary` | (none — returns AI text to frontend; the actual `inspections` UPDATE happens client-side via `InspectionAIReview.tsx:handleSave`) | `src/pages/InspectionAIReview.tsx` `invokeEdgeFunction()` | Frontend write captures `auth.uid()` natively via the user-scoped Supabase client. **No EF-side change needed.** |
| `send-email` | (writes `email_logs` which is not in the audit_log_trigger scope) | `src/lib/api/notifications.ts` `sendEmail()` | EF accepts `userId` in payload and writes to `email_logs.sent_by` directly. Frontend `sendEmail()` auto-resolves userId from the active session. |
| `generate-job-report-pdf` | `job_completions` UPDATE (pdf_url, pdf_version, pdf_generated_at) | `src/lib/api/jobReportPdf.ts` `generateJobReportPdf()` | Dual-client: service role for reads, **JWT-bound client `supabaseAudited`** for the audited UPDATE. |

### Bucket B — System-invoked, audited writes (4 EFs)

| EF | Audited write | Trigger source | Attribution mechanism |
|---|---|---|---|
| `receive-framer-lead` | `leads` INSERT | Framer webhook (no JWT) | RPC `audited_insert_lead_via_framer(SYSTEM_USER_UUID, leadRow)` — `SET LOCAL` + `INSERT` atomic. Also writes `email_logs.sent_by = SYSTEM_USER_UUID` for the confirmation email. |
| `send-inspection-reminder` | (writes only to `email_logs` and `calendar_bookings`, neither in audit_log_trigger scope) | Cron (no JWT) | Writes `email_logs.sent_by = SYSTEM_USER_UUID` directly. No RPC helper required. |
| `check-overdue-invoices` | `invoices` UPDATE (status → overdue) | Cron (no JWT) | RPC `audited_mark_invoice_overdue(SYSTEM_USER_UUID, invoice_id)` — `SET LOCAL` + `UPDATE` atomic. |
| `manage-users` | `user_roles` INSERT | Frontend (admin JWT) | Dual-client: service role for `auth.users` admin API + role lookup; **JWT-bound client `supabaseAudited`** for the `user_roles` INSERT. (Has admin JWT, so JWT-bound pattern works — does NOT need an RPC helper.) |

### Bucket C — Read-only or no audited writes (4 EFs)

No Phase 2 attribution work required.

| EF | Reason |
|---|---|
| `calculate-travel-time` | Read-only Google Maps proxy; no DB writes. |
| `send-slack-notification` | No DB writes (informational only). |
| `seed-admin` | One-time bootstrap utility; not exercised in normal operation. |
| `export-inspection-context` | Read-only data export. |

## Why two patterns instead of one

We considered using only the RPC pattern uniformly. We chose dual-client where possible because:

1. **No new SQL surface area.** Bucket A EFs already have a JWT in the request. The dual-client refactor is purely TypeScript — no migration, no per-table RPC sprawl.
2. **Native security alignment.** When the JWT-bound client writes, RLS policies still apply correctly. Service-role writes bypass RLS — fine for system writes, but unnecessary for user-initiated writes that should respect ordinary access controls.
3. **Auditable from one place.** auth.uid() captures the caller automatically; no per-call discipline required.

The RPC pattern is reserved for the two paths (`receive-framer-lead`, `check-overdue-invoices`) where there is no JWT and the SET-then-write must be atomic.

## Adding a new EF

When introducing a new Edge Function:

1. Identify the audited tables it writes to (cross-reference the Stage 2.1 trigger list)
2. Decide bucket:
   - Frontend caller passes a JWT → Bucket A → dual-client pattern
   - Cron / webhook / no JWT → Bucket B → RPC helper pattern
   - Read-only or non-audited writes → Bucket C → no work
3. For Bucket B, add a new `audited_*_with_audit` RPC in a fresh migration (don't modify existing helpers); call it from the EF
4. Update this manifest with the new EF row
5. Update CLAUDE.md's EF count if changed
6. Update `docs/phase-2-verification-matrix.md` (or the next phase's matrix) with a verification row for the new attribution path

## Frontend caller integration checklist

For Bucket A EFs, the frontend caller must include the user JWT in the Authorization header. All current frontend callers do this via either:

- Direct `fetch()` with `'Authorization': \`Bearer ${session.access_token}\`` (e.g. `pdfGeneration.ts`, `jobReportPdf.ts`)
- `supabase.functions.invoke()` which forwards the active session's JWT automatically (e.g. `notifications.ts:sendEmail`, the regenerate paths in `InspectionAIReview.tsx`)

When adding new frontend callers, verify the JWT is forwarded — otherwise auth.uid() returns NULL and audit attribution falls back to NULL (no SYSTEM_USER_UUID for frontend paths).

## Verification path

End-to-end attribution is checked in `docs/phase-2-verification-matrix.md`. Each EF write path has a row that runs the operation and asserts the resulting `audit_logs` (or `email_logs`) row carries the expected user_id (admin UUID for Bucket A, SYSTEM_USER_UUID for Bucket B).

## Deployment note

EF code changes ship in PR-C as part of the repo, but Supabase EFs deploy separately via:

```bash
npx supabase functions deploy <name> --project-ref ecyivrxjpsmjmexqatym
```

Run this for each modified EF after PR-C merges to production. The verification matrix should be run AFTER both the PR merge AND the EF deployments complete.

Modified EFs in Phase 2 Stage 2.0c (deploy these post-merge):
- `generate-inspection-pdf`
- `generate-job-report-pdf`
- `manage-users`
- `send-email`
- `receive-framer-lead`
- `send-inspection-reminder`
- `check-overdue-invoices`

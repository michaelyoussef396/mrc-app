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

## Verification (mandatory after EF deploy + secret changes)

### Step 1 — Confirm secrets actually landed

```bash
# Supabase EF runtime (where Bucket B EFs read SYSTEM_USER_UUID)
npx supabase secrets list --project-ref ecyivrxjpsmjmexqatym | grep SYSTEM_USER_UUID

# Vercel (where the future admin/audit UI will read VITE_SYSTEM_USER_UUID)
# Use dashboard or:
vercel env ls
# Look for VITE_SYSTEM_USER_UUID under both Production AND Preview
```

Phase 2 close-out caught this exact gap: the secret had never been set on Supabase despite verbal confirmation in a prior session. **A textual confirmation in chat is not verification.** A missing or empty digest in the `secrets list` output means the EF runtime can't read the value.

### Step 2 — Bucket A: invoke and check audit_logs

For each Bucket A EF, frontend caller test (one example — patterns identical for the other 3):

1. As an authenticated admin, click "Regenerate PDF" on `ViewReportPDF` (calls `generate-inspection-pdf`)
2. Run:
   ```sql
   SELECT user_id, action, entity_type, created_at
   FROM audit_logs
   WHERE entity_type = 'inspections' AND action = 'inspection_updated'
   ORDER BY created_at DESC LIMIT 1;
   ```
3. Expected: `user_id = <calling admin's UUID>` (NOT NULL, NOT the sentinel)

If `user_id = NULL`: the EF deploy didn't pick up the dual-client pattern, OR the frontend caller isn't forwarding the Authorization header. Re-deploy that specific EF; if still failing, inspect the deployed code on Supabase dashboard.

### Step 3 — Bucket B: invoke and check audit_logs

**Inspecting `index.ts` is not enough.** The Bucket B failure mode that surfaced in Phase 2 close-out was a runtime env var gap, not a code defect. The deployed EF code looks correct on disk; only an actual invocation reveals whether `Deno.env.get('SYSTEM_USER_UUID')` resolves at runtime.

For each Bucket B EF, runtime test:

| EF | Setup | Invoke | Expected audit_logs |
|---|---|---|---|
| `receive-framer-lead` | none | `curl -X POST https://<ref>.supabase.co/functions/v1/receive-framer-lead -H "Authorization: Bearer <anon_jwt>" -H "Content-Type: application/json" -d '<framer_payload>'` | `entity_type='leads', action='lead_created', user_id = a5ae96f1-...` |
| `check-overdue-invoices` | `UPDATE invoices SET status='sent', due_date='<past>' WHERE id=<test_id>` | `curl -X POST https://<ref>.supabase.co/functions/v1/check-overdue-invoices -H "Authorization: Bearer <anon_jwt>" -d '{}'` | `entity_type='invoices', action='update_invoice', user_id = a5ae96f1-...` |
| `send-inspection-reminder` | calendar booking with `reminder_scheduled_for < NOW()`, `reminder_sent=false`, `status='scheduled'` | invoke via Studio or curl | `email_logs.sent_by = a5ae96f1-...` |
| `manage-users` (admin JWT path) | as admin, create a new technician via Users page | UI action | `entity_type='user_roles', action='grant_role', user_id = <admin uuid>` (NOT sentinel — admin JWT path) |

If any returns `user_id = NULL`:
- First check `npx supabase secrets list | grep SYSTEM_USER_UUID` (Step 1 above)
- If missing, set it: `npx supabase secrets set SYSTEM_USER_UUID=<uuid> --project-ref <ref>`
- Reset the test condition (e.g. flip invoice back to 'sent') and re-invoke
- Verify the next audit_logs row carries the sentinel

### Step 4 — Daily integrity check

Save and run daily for 30 days post-deploy (Section 6.1 exit criterion D):

```sql
SELECT COUNT(*), entity_type, action
FROM public.audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND user_id IS NULL
GROUP BY entity_type, action;
```

Expected: 0 rows. Non-zero = a write path escaped attribution; investigate which `entity_type`/`action` pair is leaking.

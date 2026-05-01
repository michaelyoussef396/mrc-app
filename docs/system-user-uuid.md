# SYSTEM_USER_UUID

**Value:** `a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f`
**Generated:** 2026-05-01 (Phase 2 of `docs/inspection-workflow-fix-plan-v2-2026-04-30.md`)

## What it is

A sentinel UUID identifying writes performed by system Edge Functions — cron jobs, webhooks, and any code path that mutates audited tables without a user JWT. Used as the value for `app.acting_user_id` in those contexts so the `audit_log_trigger()` session-variable fallback (Stage 2.0a) records a non-NULL user_id.

This UUID does not correspond to a real account in `auth.users`. It is purely a marker the audit infrastructure recognises as "the system did this." UI surfaces that render audit_logs entries (Phase 10's `/admin/audit` page) detect this UUID and render "System" instead of a user link.

## Where it lives

Set in two places. Both must hold the same value.

**Supabase Edge Function secrets** — read by Bucket B EFs at boot
- Key: `SYSTEM_USER_UUID`
- Set via Supabase Dashboard → Project settings → Edge Functions → Secrets, or `npx supabase secrets set SYSTEM_USER_UUID=<value> --project-ref ecyivrxjpsmjmexqatym`

**Vercel environment variables** — exposed to the frontend bundle for read-only display purposes (e.g. an admin-page badge labelling system writes)
- Key: `VITE_SYSTEM_USER_UUID`
- Scope: Production AND Preview
- Set via Vercel Dashboard → Project → Settings → Environment Variables, or `vercel env add`

## Why a sentinel and not NULL

Section 6.1 exit criterion D of the master fix plan defines a data-integrity incident as "a row in any audited table whose audit_logs shows a write that does not have a corresponding application-layer event — i.e. an unattributed write that escaped the user_id propagation pattern." Validated daily by:

```sql
SELECT COUNT(*) FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND user_id IS NULL
  AND user_id IS DISTINCT FROM 'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f';
```

Expected: 0 rows. If a write happens without either `auth.uid()` or `app.acting_user_id` being set, the trigger writes NULL — and that's the signal that something escaped the attribution pattern. The sentinel makes intentional system writes distinguishable from accidental NULL writes.

## How EFs use it

Bucket B EFs (`receive-framer-lead`, `send-inspection-reminder`, `check-overdue-invoices`, `manage-users`) read `Deno.env.get('SYSTEM_USER_UUID')` and set it as `app.acting_user_id` before mutating audited tables. Bucket A EFs (frontend-invoked) propagate the calling user's UUID instead, taken from the JWT or the request body.

Pattern reference: `docs/edge-function-attribution-manifest.md`.

## Rotation

Do not rotate this value casually. If it is rotated:

1. Update both Supabase EF secret and Vercel env var to the new UUID
2. Update this file with the new value (keep the old value in a "Previous values" section below for historical audit_logs interpretation)
3. Existing audit_logs rows referencing the old UUID continue to be valid — they were system writes, just under a previous identifier
4. The daily integrity check (Section 6.1 criterion D) needs updating to recognise both old and new sentinels for as long as historical rows remain queried

## Previous values

(none)

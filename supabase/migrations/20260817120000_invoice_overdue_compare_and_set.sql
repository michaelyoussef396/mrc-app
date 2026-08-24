-- Migration: audited_mark_invoice_overdue becomes a true compare-and-set
-- Created: 2026-08-17
--
-- WHY
-- ---
-- Scheduled Edge Functions are invoked TWICE per cron tick — 100% of ticks, both
-- invocations executing the full function body. Root cause is duplicate HTTP
-- delivery between pg_net and the Supabase Edge Functions gateway; a support
-- ticket is open and it is not fixable in our code. This migration does not try
-- to stop the duplication, it makes one of its consequences harmless.
--
-- WHAT WAS NOT BROKEN (important — do not "fix" this again)
-- The UPDATE was ALREADY conditional: `AND status <> 'overdue'`. Under READ
-- COMMITTED, when the second invocation's UPDATE blocks on the first's row lock,
-- Postgres re-evaluates the WHERE against the committed new row version once the
-- lock releases (EvalPlanQual). status is 'overdue' by then, the predicate fails,
-- and the row is skipped — 0 rows affected. audit_invoices_update is
-- AFTER UPDATE ... FOR EACH ROW, so the loser fires no trigger and writes no
-- audit_logs row. `invoices` and `audit_logs` were never racing.
-- (docs/TODO.md previously stated the UPDATE was unconditional. That was wrong
-- and has been corrected in the same change as this migration.)
--
-- WHAT WAS BROKEN
-- RETURNS void discards the outcome. supabase-js hands BOTH invocations
-- (data: null, error: null), so check-overdue-invoices cannot tell the winner
-- from the loser and both fall through to an unconditional `activities` INSERT.
-- Observed on DEV: two 'invoice_overdue' rows 193 ms apart. The duplication was
-- entirely in `activities` — never in `invoices`, never in `audit_logs`.
--
-- THE FIX
-- Return rows-affected so the caller can distinguish "I made the transition"
-- from "someone else already did". That is the whole change.
--
-- PREDICATE NARROWED from `status <> 'overdue'` to `status = 'sent'` so the
-- function asserts the exact transition its only caller believes it is making.
-- This is safe: check-overdue-invoices already gates on `inv.status === 'sent'`
-- and re-reads before calling. Deliberately NOT broadened to
-- IN ('sent','viewed') — the caller's own query filters to 'sent'/'overdue', so
-- 'viewed' invoices never reach the RPC and broadening here alone would be a
-- false fix. The 'viewed' gap stays open and gets its own change.
--
-- CALLER AUDIT (verified against PROD before writing this)
--   1. check-overdue-invoices/index.ts — the only real caller. Updated in the
--      same change to consume the boolean.
--   2. docs/phase-2-verification-helpers.sql Test 6 — manual Studio test. Sets
--      status = 'sent' first, so it still transitions; extended to assert the
--      boolean.
--   3. src/lib/api/invoices.ts:671 markInvoiceOverdue() — does NOT use this RPC
--      (raw table UPDATE) and has ZERO importers. Dead code, deliberately left
--      alone; needs Glen/Clayton input on whether an admin "mark overdue" action
--      is planned.
--   4. Database-side: NO function, view or trigger references this RPC.
--
-- SCOPE: replaces one function and resets its grants. No table, column, index,
-- policy or trigger is touched. No data is read or written.
--
-- ⚠️ APPLY ORDER IS MANDATORY: this migration FIRST, then deploy
-- check-overdue-invoices. The reverse leaves the new Edge Function receiving
-- null from the old RPC, which trips its typeof guard and skips EVERY activity
-- row until this lands. Applying this migration while the OLD function is still
-- deployed is safe — it ignores the return value.
-- Apply well away from the 0 23 * * * cron tick.

BEGIN;

-- The return type changes (void -> boolean), so CREATE OR REPLACE is not
-- available: Postgres rejects it with "cannot change return type of existing
-- function". DROP + CREATE is the only route.
DROP FUNCTION IF EXISTS public.audited_mark_invoice_overdue(UUID, UUID);

CREATE FUNCTION public.audited_mark_invoice_overdue(
  p_acting_user_id UUID,
  p_invoice_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Unchanged: SET LOCAL and the UPDATE stay in one transaction so
  -- audit_log_trigger() reads the system sentinel out of the session variable.
  -- See docs/edge-function-attribution-manifest.md (Bucket B).
  PERFORM set_config('app.acting_user_id', p_acting_user_id::text, true);

  UPDATE public.invoices
     SET status = 'overdue',
         updated_at = NOW()
   WHERE id = p_invoice_id
     AND status = 'sent';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- TRUE only for the invocation whose UPDATE actually moved the row. FALSE means
  -- the invoice was not in 'sent' when this call got the lock — either a
  -- concurrent invocation won, or an admin changed the status underneath us.
  -- Either way the caller must write neither the activity row nor the digest line.
  RETURN v_updated = 1;
END;
$$;

COMMENT ON FUNCTION public.audited_mark_invoice_overdue IS
  'Compare-and-set: transitions an invoice sent -> overdue with system user '
  'attribution for the cron path, and returns TRUE only if THIS call made the '
  'transition. Pulls SET LOCAL app.acting_user_id and the conditional UPDATE '
  'into one transaction so audit_log_trigger() captures the system sentinel '
  'UUID. The boolean is the tie-breaker under duplicate cron delivery — a caller '
  'receiving FALSE must treat the invoice as owned by another invocation and '
  'write nothing. See docs/edge-function-attribution-manifest.md.';

-- ⚠️ GRANTS ARE NOT OPTIONAL HOUSEKEEPING.
-- DROP FUNCTION destroyed every grant, and CREATE FUNCTION re-establishes the
-- DEFAULT PUBLIC EXECUTE grant. Without the REVOKE below, this migration would
-- silently undo 20260709120000_revoke_anon_execute_audit_rpcs.sql and re-expose a
-- SECURITY DEFINER function that lets any caller flip any invoice to overdue with
-- a forged p_acting_user_id.
REVOKE ALL ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) FROM anon;

-- service_role ONLY. `authenticated` is deliberately NOT re-granted (it held
-- EXECUTE before this migration). The sole caller is a service_role cron, and
-- docs/SUPABASE_ADVISOR_AUDIT.md flags the authenticated grant as a WARN:
-- authenticated_security_definer_function_executable. This tightens it.
GRANT EXECUTE ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) TO service_role;

COMMIT;


-- ===========================================================================
-- VERIFICATION — run in the same Studio session, immediately after COMMIT
-- ===========================================================================
--
-- 1. Return type is boolean and it is still SECURITY DEFINER.
--    Expect exactly one row: returns = 'bool', security_definer = true.
--
--   SELECT t.typname AS returns,
--          p.prosecdef AS security_definer,
--          pg_get_function_identity_arguments(p.oid) AS args
--   FROM pg_proc p
--   JOIN pg_type t ON t.oid = p.prorettype
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname = 'audited_mark_invoice_overdue';
--
-- 2. Grants are EXACTLY postgres + service_role.
--    postgres appears as the function owner. If `anon`, `PUBLIC` or
--    `authenticated` appears, the REVOKE/GRANT block did not run — STOP and
--    re-run it before deploying anything.
--
--   SELECT grantee, privilege_type
--   FROM information_schema.routine_privileges
--   WHERE routine_schema = 'public'
--     AND routine_name = 'audited_mark_invoice_overdue'
--   ORDER BY grantee;
--
-- 3. Behavioural smoke test — SAFE, writes nothing (explicit ROLLBACK).
--    Expect: first_call = true, second_call = false. That pair IS the fix.
--    Requires at least one invoice row; skip if `invoices` is empty (it is on
--    PROD as of 2026-08-17).
--
--   BEGIN;
--     UPDATE public.invoices SET status = 'sent'
--      WHERE id = (SELECT id FROM public.invoices LIMIT 1);
--     SELECT
--       public.audited_mark_invoice_overdue(
--         'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid,
--         (SELECT id FROM public.invoices LIMIT 1)) AS first_call,
--       public.audited_mark_invoice_overdue(
--         'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid,
--         (SELECT id FROM public.invoices LIMIT 1)) AS second_call;
--   ROLLBACK;
--
-- 4. AFTER this migration is applied, regenerate the TypeScript types — the
--    generated signature still says `Returns: undefined`
--    (src/integrations/supabase/types.ts:2178). Not done in the authoring
--    session by instruction. Edge Functions use an untyped client so they are
--    unaffected, but src/ consumers would be wrong.
--
--      npx supabase gen types typescript --project-ref <REF> > src/integrations/supabase/types.ts
--
--    State the ref and its role out loud before running it (CLAUDE.md rule).


-- ===========================================================================
-- ROLLBACK — restores RETURNS void with the original `status <> 'overdue'` body
-- ===========================================================================
--
-- ⚠️ Rolling this back while the NEW check-overdue-invoices is deployed makes the
-- function receive null, trip its typeof guard, and skip every activity row. Roll
-- the Edge Function back FIRST, then run this.
--
-- Note the grant block differs from the pre-migration state by design: it does
-- NOT restore `authenticated` (see decision 3 above). Add
-- `GRANT EXECUTE ... TO authenticated;` only if you intend to undo that
-- tightening as well.
--
--   BEGIN;
--
--   DROP FUNCTION IF EXISTS public.audited_mark_invoice_overdue(UUID, UUID);
--
--   CREATE FUNCTION public.audited_mark_invoice_overdue(
--     p_acting_user_id UUID,
--     p_invoice_id UUID
--   )
--   RETURNS VOID
--   LANGUAGE plpgsql
--   SECURITY DEFINER
--   SET search_path = public
--   AS $rollback$
--   BEGIN
--     PERFORM set_config('app.acting_user_id', p_acting_user_id::text, true);
--
--     UPDATE public.invoices
--       SET status = 'overdue',
--           updated_at = NOW()
--       WHERE id = p_invoice_id
--         AND status <> 'overdue';
--   END;
--   $rollback$;
--
--   COMMENT ON FUNCTION public.audited_mark_invoice_overdue IS
--     'Marks an invoice as overdue with system user attribution for the cron path. '
--     'Pulls SET LOCAL and the UPDATE into one transaction so audit_log_trigger() '
--     'captures the system sentinel UUID. See '
--     'docs/edge-function-attribution-manifest.md for usage.';
--
--   REVOKE ALL ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) FROM PUBLIC;
--   REVOKE ALL ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) FROM anon;
--   GRANT EXECUTE ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) TO service_role;
--
--   COMMIT;

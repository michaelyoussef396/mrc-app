-- ############################################################################
-- #  APPLY — audited_mark_invoice_overdue compare-and-set
-- #  Copy-paste runbook for the Supabase Studio SQL Editor
-- #  Generated 2026-08-17. Run one SECTION at a time, top to bottom.
-- ############################################################################
--
--  TARGET: PROD  ecyivrxjpsmjmexqatym   (LIVE — mrcsystem.com, real customer data)
--          NOT   ctppzqnysmzynkxjlzta   (DEV sandbox)
--          Confirm the project name in the Studio header before you paste anything.
--
--  WHAT THIS DOES (two lines)
--    Replaces audited_mark_invoice_overdue so it RETURNS BOOLEAN instead of void —
--    TRUE only for the invocation whose UPDATE actually moved the invoice sent -> overdue.
--    That boolean is what lets check-overdue-invoices tell a winner from a loser under
--    Supabase's duplicate cron delivery, and stop writing two 'invoice_overdue' rows per tick.
--
--  ⚠️ APPLY ORDER IS NOT OPTIONAL
--      1. Run THIS FILE first (Studio).
--      2. Deploy check-overdue-invoices second.
--    Reversed, the new Edge Function receives null from the old RETURNS void RPC,
--    trips its `typeof !== 'boolean'` guard, and SKIPS EVERY ACTIVITY ROW until this
--    migration lands. Applying this while the OLD Edge Function is still deployed is
--    safe — the old code ignores the return value entirely.
--
--  ⚠️ TIMING
--    The cron is `0 23 * * *` UTC = 09:00 Melbourne.
--    DO NOT run this within 30 minutes either side of 09:00 Melbourne.
--
--  HOW TO USE
--    Run SECTION 2, then SECTION 3, then SECTION 4, then SECTION 5.
--    Do NOT paste the whole file in one go.
--    SECTION 5 is a STOP GATE — read its output before deploying anything.
--    SECTIONS 6 and 7 are fully commented out and are not run today.
--
--  SOURCE OF TRUTH
--    SECTION 3 below is a byte-identical copy of lines 1-128 of
--      supabase/migrations/20260817120000_invoice_overdue_compare_and_set.sql
--    If this file and that migration ever disagree, the migration file wins.


-- ############################################################################
-- #  SECTION 2 — PRE-CHECK        (run alone; reads only, changes nothing)
-- ############################################################################
--
--  Confirms you are looking at the BEFORE state. Expected RIGHT NOW, pre-migration:
--
--      returns          = 'void'
--      security_definer = true
--      owner            = postgres
--      grantees         = authenticated, postgres, service_role
--
--  If `returns` already reads 'bool', this migration has ALREADY been applied.
--  Stop — do NOT run SECTION 3 again. Skip to SECTION 4 and SECTION 5 to verify.

SELECT
  t.typname                                 AS returns,
  p.prosecdef                               AS security_definer,
  pg_get_userbyid(p.proowner)               AS owner,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_type      t ON t.oid = p.prorettype
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'audited_mark_invoice_overdue';

SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name   = 'audited_mark_invoice_overdue'
ORDER BY grantee;


-- ############################################################################
-- #  SECTION 3 — THE MIGRATION   (run this whole block; it is one transaction)
-- ############################################################################
--
--  Verbatim copy of supabase/migrations/20260817120000_invoice_overdue_compare_and_set.sql
--  lines 1-128. Byte-identity verified at generation time. Do not edit it here —
--  edit the migration file and regenerate this one.
--
-- >>>>>> BEGIN VERBATIM COPY >>>>>>
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
-- <<<<<< END VERBATIM COPY <<<<<<


-- ############################################################################
-- #  SECTION 4 — VERIFICATION BLOCK 1: return type
-- #             (run immediately after SECTION 3 commits)
-- ############################################################################
--
--  EXPECT exactly one row:
--
--      returns          = 'bool'          <- was 'void' before
--      security_definer = true
--      owner            = postgres
--      args             = p_acting_user_id uuid, p_invoice_id uuid
--
--  If `returns` still reads 'void', SECTION 3 did not commit. Re-run SECTION 3.
--  If `owner` is anything other than postgres, STOP — a SECURITY DEFINER function
--  executes as its owner, and the wrong owner silently changes what it can do.

SELECT
  t.typname                                 AS returns,
  p.prosecdef                               AS security_definer,
  pg_get_userbyid(p.proowner)               AS owner,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_type      t ON t.oid = p.prorettype
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'audited_mark_invoice_overdue';


-- ############################################################################
-- #  SECTION 5 — VERIFICATION BLOCK 2: GRANTS      ⛔  S T O P   G A T E  ⛔
-- ############################################################################
--
--  EXPECT EXACTLY TWO ROWS, AND NOTHING ELSE:
--
--      postgres       EXECUTE      <- the function owner
--      service_role   EXECUTE      <- the cron, the only real caller
--
--  `authenticated` IS CURRENTLY A GRANTEE AND MUST DISAPPEAR.
--  Removing it is a deliberate part of this change, not an accident. Before this
--  migration the grantees were: authenticated, postgres, service_role.
--
--  ⛔ IF `anon`, `PUBLIC`, OR `authenticated` APPEARS IN THE OUTPUT:
--
--     The REVOKE/GRANT block at the end of SECTION 3 did not run.
--
--     WHY THIS MATTERS: DROP FUNCTION destroys every grant, and CREATE FUNCTION
--     re-establishes the DEFAULT PUBLIC EXECUTE grant. So a partial apply does not
--     leave the old state — it leaves a WIDER one, silently undoing
--     20260709120000_revoke_anon_execute_audit_rpcs.sql. The function is
--     SECURITY DEFINER, so it executes as postgres and bypasses RLS: anyone holding
--     that role could flip ANY invoice to 'overdue' with a forged p_acting_user_id.
--
--     DO THIS, IN ORDER:
--
--       1. STOP. DO NOT DEPLOY THE EDGE FUNCTION.
--       2. Run these three lines exactly as written:
--
--            REVOKE ALL ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) FROM PUBLIC;
--            REVOKE ALL ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) FROM anon;
--            GRANT EXECUTE ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) TO service_role;
--
--       3. Re-run the SELECT below and confirm ONLY postgres + service_role.
--       4. Only then deploy check-overdue-invoices.

SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name   = 'audited_mark_invoice_overdue'
ORDER BY grantee;


-- ############################################################################
-- #  SECTION 6 — VERIFICATION BLOCK 3: behavioural smoke test
-- #             ⏭  SKIP THIS TODAY — fully commented out on purpose
-- ############################################################################
--
--  This is the test that actually proves the compare-and-set works: call the
--  function twice in a row against the same invoice. The first call moves the row
--  and returns TRUE; the second finds status is no longer 'sent', matches zero
--  rows, and returns FALSE. That true/false pair IS the fix.
--
--  ⏭ WHY SKIP IT NOW: it needs at least one row in `invoices`, and `invoices` is
--    0 rows on PROD as of 2026-08-17. With an empty table the subselects return
--    NULL and the test proves nothing. Come back to this the first time a real
--    invoice exists.
--
--  SAFE WHEN YOU DO RUN IT: wrapped in BEGIN ... ROLLBACK, so it writes nothing.
--  EXPECT: first_call = t, second_call = f, cas_pass = t
--
--   BEGIN;
--     UPDATE public.invoices
--        SET status = 'sent'
--      WHERE id = (SELECT id FROM public.invoices LIMIT 1);
--
--     SELECT
--       first_call,
--       second_call,
--       first_call IS TRUE AND second_call IS FALSE AS cas_pass
--     FROM (
--       SELECT
--         public.audited_mark_invoice_overdue(
--           'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid,
--           (SELECT id FROM public.invoices LIMIT 1)) AS first_call,
--         public.audited_mark_invoice_overdue(
--           'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid,
--           (SELECT id FROM public.invoices LIMIT 1)) AS second_call
--     ) AS calls;
--   ROLLBACK;


-- ############################################################################
-- #  SECTION 7 — ROLLBACK        ⏭  fully commented out — emergency use only
-- ############################################################################
--
--  ⚠️ ROLL THE EDGE FUNCTION BACK **FIRST**, THEN RUN THIS.
--     The new check-overdue-invoices expects a boolean. If you restore the old
--     RETURNS void function underneath it, every call returns null, the function's
--     `typeof !== 'boolean'` guard fires, and it SKIPS EVERY ACTIVITY ROW. That
--     failure is loud (it lands in the response `errors[]` array) but it is still
--     wrong. Correct order to undo:
--         1. Redeploy the previous check-overdue-invoices.
--         2. Run this rollback.
--
--  ⚠️ THIS DOES NOT RESTORE THE `authenticated` GRANT — deliberately.
--     Dropping `authenticated` was an independent security decision (it closes the
--     authenticated_security_definer_function_executable WARN in
--     docs/SUPABASE_ADVISOR_AUDIT.md) and it is not part of what you would be
--     rolling back here. If you specifically want that grant back as well,
--     uncomment the marked line at the bottom of this block.
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
--   -- Uncomment ONLY if you also want to undo the authenticated tightening:
--   -- GRANT EXECUTE ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) TO authenticated;
--
--   COMMIT;


-- ############################################################################
-- #  AFTER A SUCCESSFUL APPLY — not SQL, do not paste into Studio
-- ############################################################################
--
--   1. Deploy the Edge Function:
--        npx supabase functions deploy check-overdue-invoices
--   2. Regenerate the TypeScript types — the generated signature still says
--      `Returns: undefined` (src/integrations/supabase/types.ts). Edge Functions
--      use an untyped client so they are unaffected, but src/ consumers would be
--      wrong:
--        npx supabase gen types typescript --project-id ecyivrxjpsmjmexqatym > src/integrations/supabase/types.ts
--      State the ref and its role out loud before running it (CLAUDE.md rule).
--   3. Watch the 09:00 Melbourne tick. Expect TWO boots — the double-fire is
--      Supabase-side and is not what this change fixes. Expect empty errors[], and
--      alreadyFlagged / alreadyMilestoned = 0 (correct; the guards stay unexercised
--      until a real invoice exists).

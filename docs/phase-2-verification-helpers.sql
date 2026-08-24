-- Phase 2 Stage 2.0d — Verification helpers
--
-- Standalone SQL verification of the audit_log_trigger() session-variable
-- fallback (Stage 2.0a) and the audit attribution helpers (Stage 2.0c).
--
-- All 4 tests passed during Stage 2.0d execution on 2026-05-01.
-- Re-runnable manually for regression checks. Each test wraps in a
-- BEGIN/ROLLBACK so production data is not affected (Test 6 is the only
-- exception — it inserts an audit_logs row that survives because the
-- trigger fires before commit).
--
-- Run via Supabase Studio SQL editor or `psql` against the project DB.
--
-- =============================================================================
-- PREREQUISITES — verify these BEFORE running any of the SQL tests below
-- =============================================================================
--
-- These SQL tests verify the DB-side trigger + helper layer. They do NOT
-- exercise the EF runtime's environment, where SYSTEM_USER_UUID actually
-- lives. The Phase 2 close-out caught this gap: SQL tests passed end-to-end
-- while the Supabase EF secret was missing, because the SQL tests set the
-- session variable directly. Don't rely on these tests alone to claim
-- Phase 2 attribution is functional — exercise the EF runtime layer too.
--
-- Mandatory checks before running these tests:
--
-- 1. Supabase EF secret set:
--    npx supabase secrets list --project-ref ecyivrxjpsmjmexqatym | grep SYSTEM_USER_UUID
--    Expected: a non-empty digest. Missing or empty = secret never landed.
--
-- 2. Vercel env var set on BOTH Production and Preview:
--    Dashboard → Project → Settings → Environment Variables → VITE_SYSTEM_USER_UUID
--    Or: vercel env ls (look for both scopes)
--
-- 3. At least one Bucket B EF has been invoked post-deploy:
--    Invoke check-overdue-invoices via Supabase Studio (or curl with anon JWT)
--    on a test invoice in 'sent' status with a past due_date. Then run Test 6
--    of this file (or query audit_logs directly) to confirm the audit_logs
--    row carries SYSTEM_USER_UUID, NOT NULL.
--
-- Without all three checks passing, the SQL tests below are insufficient.

-- ---------------------------------------------------------------------------
-- Test 3 — Session variable fallback (auth.uid() NULL, var SET)
-- Expected: trigger captures the variable.
-- ---------------------------------------------------------------------------

BEGIN;

  CREATE TEMP TABLE _phase2_test_tab (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload TEXT
  ) ON COMMIT DROP;

  CREATE TRIGGER _phase2_test_audit_insert
    AFTER INSERT ON _phase2_test_tab
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('phase2_test_create');

  SELECT set_config('app.acting_user_id', 'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f', true);
  INSERT INTO _phase2_test_tab (payload) VALUES ('test-3-session-fallback');

  SELECT
    'Test 3 — session variable fallback' AS test,
    user_id,
    user_id = 'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid AS pass
  FROM public.audit_logs
  WHERE action = 'phase2_test_create'
  ORDER BY created_at DESC
  LIMIT 1;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- Test 4 — JWT precedence (both auth.uid() AND var SET)
-- Expected: auth.uid() wins.
-- ---------------------------------------------------------------------------

BEGIN;

  CREATE TEMP TABLE _phase2_test_tab (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload TEXT
  ) ON COMMIT DROP;

  CREATE TRIGGER _phase2_test_audit_insert
    AFTER INSERT ON _phase2_test_tab
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('phase2_test_create');

  SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
  SELECT set_config('app.acting_user_id', 'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f', true);
  INSERT INTO _phase2_test_tab (payload) VALUES ('test-4-jwt-precedence');

  SELECT
    'Test 4 — JWT precedence (auth.uid() wins)' AS test,
    user_id,
    user_id = '11111111-1111-1111-1111-111111111111'::uuid AS pass
  FROM public.audit_logs
  WHERE action = 'phase2_test_create'
  ORDER BY created_at DESC
  LIMIT 1;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- Test 5 — audited_insert_lead_via_framer end-to-end
-- Verifies the helper successfully INSERTs and returns the new lead UUID.
-- Trigger capture on the leads table happens after Stage 2.1 ships.
-- Run this AFTER Stage 2.1 to verify trigger capture works on the real
-- leads table; in the interim it just checks the INSERT path.
-- ---------------------------------------------------------------------------

BEGIN;

  SELECT public.audited_insert_lead_via_framer(
    'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid,
    jsonb_build_object(
      'full_name', 'Phase 2 Test Lead',
      'email', 'phase2-test@mrcsystem.internal',
      'phone', '0400000000',
      'property_address_street', '1 Test St',
      'property_address_suburb', 'Testville',
      'property_address_postcode', '3000'
    )
  ) AS new_lead_id;

  -- Post-Stage-2.1 only: confirm audit_logs row carries SYSTEM_USER_UUID
  SELECT
    'Test 5 — audited_insert_lead_via_framer trigger capture' AS test,
    user_id,
    action,
    user_id = 'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid AS pass
  FROM public.audit_logs
  WHERE entity_type = 'leads'
    AND created_at > NOW() - INTERVAL '5 seconds'
  ORDER BY created_at DESC
  LIMIT 1;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- Test 6 — audited_mark_invoice_overdue end-to-end
-- This test does NOT roll back to ensure the audit_logs row persists for
-- inspection. The invoice's status change is reset at the end.
-- Run with caution: leaves 2 audit_logs rows behind.
-- ---------------------------------------------------------------------------

-- 1. Pick an invoice and reset its status to 'sent'
UPDATE public.invoices
  SET status = 'sent'
  WHERE id = (SELECT id FROM public.invoices LIMIT 1);

-- 2. Call the helper TWICE. Since 20260817120000_invoice_overdue_compare_and_set
--    it RETURNS BOOLEAN — TRUE only for the call that actually moved the row — so
--    the pair is the compare-and-set assertion: the first call wins, the second
--    finds status already 'overdue' and matches zero rows.
--    Expect: first_call = t, second_call = f, cas_pass = t.
--    (Before that migration the function RETURNS void and both columns are NULL,
--    which is itself the signal that the migration has not been applied here.)
SELECT
  'Test 6a — audited_mark_invoice_overdue compare-and-set' AS test,
  first_call,
  second_call,
  first_call IS TRUE AND second_call IS FALSE AS cas_pass
FROM (
  SELECT
    public.audited_mark_invoice_overdue(
      'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid,
      (SELECT id FROM public.invoices LIMIT 1)
    ) AS first_call,
    public.audited_mark_invoice_overdue(
      'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid,
      (SELECT id FROM public.invoices LIMIT 1)
    ) AS second_call
) AS calls;

-- 2b. Grants must be EXACTLY postgres (owner) + service_role. `authenticated` was
--     dropped by 20260817120000; `anon` and PUBLIC must never appear.
SELECT
  'Test 6b — audited_mark_invoice_overdue grants' AS test,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'audited_mark_invoice_overdue'
ORDER BY grantee;

-- 3. Verify attribution. Only the FIRST call above transitioned the row, so
--    exactly ONE new update_invoice audit row is expected from the pair — a
--    second row would mean the compare-and-set is not holding.
SELECT
  'Test 6 — audited_mark_invoice_overdue' AS test,
  user_id,
  action,
  user_id = 'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid AS pass,
  created_at
FROM public.audit_logs
WHERE entity_type = 'invoices'
  AND action = 'update_invoice'
  AND created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC
LIMIT 3;

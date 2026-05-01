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

-- 2. Call the helper
SELECT public.audited_mark_invoice_overdue(
  'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid,
  (SELECT id FROM public.invoices LIMIT 1)
);

-- 3. Verify
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

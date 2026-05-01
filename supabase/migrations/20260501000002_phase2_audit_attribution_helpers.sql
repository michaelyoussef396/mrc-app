-- Phase 2 Stage 2.0c — Audit attribution helpers for system Edge Functions
--
-- Background: the audit_log_trigger() (modified in Stage 2.0a) reads
-- auth.uid() first, then falls back to current_setting('app.acting_user_id').
-- For Bucket B Edge Functions (cron jobs, webhooks) there is no JWT, so
-- auth.uid() returns NULL and the variable must be set explicitly.
--
-- Setting the variable from the Edge Function via supabase.rpc() in a
-- separate call doesn't work: each PostgREST request is its own
-- transaction, so SET LOCAL doesn't span the subsequent INSERT/UPDATE.
-- Wrapping both in a single SECURITY DEFINER function — which runs in
-- one transaction — pulls SET LOCAL and the audited write together so
-- the trigger captures the variable correctly.
--
-- Two helpers, one per audited Bucket B write path:
--   1. audited_insert_lead_via_framer  — receive-framer-lead webhook
--   2. audited_mark_invoice_overdue    — check-overdue-invoices cron
--
-- Other Bucket B EFs:
--   - send-inspection-reminder writes only to non-audited tables (no helper needed)
--   - manage-users uses an admin JWT so dual-client suffices (no helper needed)

-- 1. Insert a lead from the Framer webhook with system user attribution.
--
-- Explicit column list (NOT jsonb_populate_record) because leads.search_text
-- is a generated column and INSERT must skip it. Enumeration also acts as
-- an allowlist for fields the framer payload is permitted to write.
-- id / created_at / updated_at fall back to table defaults.
CREATE OR REPLACE FUNCTION public.audited_insert_lead_via_framer(
  p_acting_user_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  -- is_local = true scopes the variable to this function's transaction
  -- so it doesn't leak to subsequent calls on the same pooled connection.
  PERFORM set_config('app.acting_user_id', p_acting_user_id::text, true);

  INSERT INTO public.leads (
    full_name,
    email,
    phone,
    property_address_street,
    property_address_suburb,
    property_address_state,
    property_address_postcode,
    issue_description,
    lead_source,
    status,
    customer_preferred_date,
    customer_preferred_time,
    is_possible_duplicate,
    possible_duplicate_of
  )
  VALUES (
    p_payload->>'full_name',
    p_payload->>'email',
    p_payload->>'phone',
    p_payload->>'property_address_street',
    p_payload->>'property_address_suburb',
    COALESCE(p_payload->>'property_address_state', 'VIC'),
    p_payload->>'property_address_postcode',
    p_payload->>'issue_description',
    COALESCE(p_payload->>'lead_source', 'website'),
    COALESCE((p_payload->>'status')::lead_status, 'new_lead'::lead_status),
    (p_payload->>'customer_preferred_date')::date,
    p_payload->>'customer_preferred_time',
    COALESCE((p_payload->>'is_possible_duplicate')::boolean, FALSE),
    (p_payload->>'possible_duplicate_of')::uuid
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

COMMENT ON FUNCTION public.audited_insert_lead_via_framer IS
  'Inserts a lead row from the Framer webhook with system user attribution. '
  'Pulls SET LOCAL app.acting_user_id and the INSERT into one transaction so '
  'audit_log_trigger() captures the system sentinel UUID. See '
  'docs/edge-function-attribution-manifest.md for usage.';

-- 2. Mark an invoice as overdue with system user attribution (cron path).
CREATE OR REPLACE FUNCTION public.audited_mark_invoice_overdue(
  p_acting_user_id UUID,
  p_invoice_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.acting_user_id', p_acting_user_id::text, true);

  UPDATE public.invoices
    SET status = 'overdue',
        updated_at = NOW()
    WHERE id = p_invoice_id
      AND status <> 'overdue';
END;
$$;

COMMENT ON FUNCTION public.audited_mark_invoice_overdue IS
  'Marks an invoice as overdue with system user attribution for the cron path. '
  'Pulls SET LOCAL and the UPDATE into one transaction so audit_log_trigger() '
  'captures the system sentinel UUID. See '
  'docs/edge-function-attribution-manifest.md for usage.';

-- Grant execute. Webhooks/cron run with service_role; admin tools could
-- conceivably call these from authenticated context too. Anon stays excluded.
GRANT EXECUTE ON FUNCTION public.audited_insert_lead_via_framer(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audited_mark_invoice_overdue(UUID, UUID) TO authenticated, service_role;

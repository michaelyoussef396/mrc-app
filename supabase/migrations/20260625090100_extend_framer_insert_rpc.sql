-- PENDING — REVIEW + APPLY MANUALLY IN SUPABASE STUDIO (do not auto-apply).
--
-- Extend audited_insert_lead_via_framer for the in-app /request-inspection form.
--
-- WHAT: CREATE OR REPLACE of the Framer-webhook insert helper (originally
--       defined in 20260501000002_phase2_audit_attribution_helpers.sql) to add
--       five fields to its explicit INSERT allowlist:
--         preferred_day, issue_type, urgency, property_type, initial_photos.
--       The list is an allowlist BY DESIGN, so the receive-framer-lead EF could
--       not persist these without this change. Behaviour otherwise unchanged.
--
-- WHY:  The new in-app enquiry form drops the postcode field, so the EF now
--       sends property_address_postcode = '' — COALESCE keeps the NOT NULL
--       constraint satisfied if the key is ever absent. initial_photos arrives
--       as a JSON array of Storage paths and is converted to text[].
--
-- ORDERING: apply WITH/AFTER 20260625090000 (needs the new leads columns to exist).
--
-- REVERSIBLE: re-apply the function body from
--             20260501000002_phase2_audit_attribution_helpers.sql to restore the
--             prior column list.

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
    possible_duplicate_of,
    preferred_day,
    issue_type,
    urgency,
    property_type,
    initial_photos
  )
  VALUES (
    p_payload->>'full_name',
    p_payload->>'email',
    p_payload->>'phone',
    p_payload->>'property_address_street',
    p_payload->>'property_address_suburb',
    COALESCE(p_payload->>'property_address_state', 'VIC'),
    COALESCE(p_payload->>'property_address_postcode', ''),
    p_payload->>'issue_description',
    COALESCE(p_payload->>'lead_source', 'website'),
    COALESCE((p_payload->>'status')::lead_status, 'new_lead'::lead_status),
    (p_payload->>'customer_preferred_date')::date,
    p_payload->>'customer_preferred_time',
    COALESCE((p_payload->>'is_possible_duplicate')::boolean, FALSE),
    (p_payload->>'possible_duplicate_of')::uuid,
    p_payload->>'preferred_day',
    p_payload->>'issue_type',
    p_payload->>'urgency',
    p_payload->>'property_type',
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_payload->'initial_photos')),
      '{}'::text[]
    )
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

COMMENT ON FUNCTION public.audited_insert_lead_via_framer IS
  'Inserts a lead row from the Framer webhook / in-app enquiry form with system '
  'user attribution. Pulls SET LOCAL app.acting_user_id and the INSERT into one '
  'transaction so audit_log_trigger() captures the system sentinel UUID. '
  'Explicit column list acts as an allowlist for the payload. See '
  'docs/edge-function-attribution-manifest.md for usage.';

GRANT EXECUTE ON FUNCTION public.audited_insert_lead_via_framer(UUID, JSONB) TO authenticated, service_role;

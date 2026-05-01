-- Stage 2.0a — audit_log_trigger session-variable fallback
--
-- Phase 2 of the inspection-workflow fix plan
-- (docs/inspection-workflow-fix-plan-v2-2026-04-30.md).
--
-- Why: the existing audit_log_trigger() function captures auth.uid() at
-- trigger fire time. For service-role writes (cron jobs, webhooks,
-- system-only Edge Functions) auth.uid() returns NULL, which produces
-- unattributed audit_logs rows. This update adds a session-variable
-- fallback so Edge Functions can identify themselves before mutations
-- via SET LOCAL app.acting_user_id (or set_config(...,true)).
--
-- Read order: auth.uid() first (preserves authenticated user
-- attribution), then current_setting('app.acting_user_id', true) as a
-- fallback. NULLIF guards against the empty-string default that
-- current_setting returns when the variable was never set.
--
-- Existing trigger bindings on invoices and job_completions reference
-- this function by name, so the body update propagates automatically
-- without dropping or recreating any triggers. Stage 2.1 attaches the
-- same function to 8 additional tables.

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := COALESCE(
    (SELECT auth.uid()),
    NULLIF(current_setting('app.acting_user_id', true), '')::UUID
  );
BEGIN
  INSERT INTO public.audit_logs (
    id, user_id, action, entity_type, entity_id, metadata, created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    TG_ARGV[0],
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    jsonb_build_object(
      'operation', TG_OP,
      'before', CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
      'after',  CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
    ),
    NOW()
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Strip auto-set metadata columns from audit_log_trigger payload.
-- These columns change on every UPDATE regardless of user intent, producing
-- noise in the audit trail ("Updated At" appearing as a user edit).
--
-- Denylist: updated_at, created_at, last_edited_at, last_edited_by, version
--
-- Reversible: the previous trigger definition is in
-- 20260501000001_audit_trigger_session_fallback.sql — re-run that migration's
-- CREATE OR REPLACE to restore full-row capture.

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
  v_before JSONB;
  v_after  JSONB;
BEGIN
  v_before := CASE
    WHEN TG_OP IN ('DELETE', 'UPDATE') THEN
      row_to_json(OLD)::jsonb
      - 'updated_at' - 'created_at' - 'last_edited_at' - 'last_edited_by' - 'version'
    ELSE NULL
  END;

  v_after := CASE
    WHEN TG_OP IN ('INSERT', 'UPDATE') THEN
      row_to_json(NEW)::jsonb
      - 'updated_at' - 'created_at' - 'last_edited_at' - 'last_edited_by' - 'version'
    ELSE NULL
  END;

  -- Skip UPDATE if before and after are identical after stripping auto-set columns.
  -- This prevents logging phantom changes where only metadata columns changed.
  IF TG_OP = 'UPDATE' AND v_before = v_after THEN
    RETURN NEW;
  END IF;

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
      'before', v_before,
      'after', v_after
    ),
    NOW()
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

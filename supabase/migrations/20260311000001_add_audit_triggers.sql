-- Automatic audit logging triggers for key tables
-- Logs INSERT, UPDATE, DELETE to audit_logs table

-- Create the trigger function (SECURITY DEFINER to bypass RLS for insert)
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    (SELECT auth.uid()),
    TG_ARGV[0],
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    jsonb_build_object(
      'operation', TG_OP,
      'before', CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
      'after', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
    )
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- leads table
CREATE TRIGGER audit_leads_insert
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('create_lead');

CREATE TRIGGER audit_leads_update
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('update_lead');

CREATE TRIGGER audit_leads_delete
  AFTER DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('delete_lead');

-- inspections table
CREATE TRIGGER audit_inspections_insert
  AFTER INSERT ON inspections
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('create_inspection');

CREATE TRIGGER audit_inspections_update
  AFTER UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('update_inspection');

CREATE TRIGGER audit_inspections_delete
  AFTER DELETE ON inspections
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('delete_inspection');

-- inspection_areas table
CREATE TRIGGER audit_inspection_areas_insert
  AFTER INSERT ON inspection_areas
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('create_inspection_area');

CREATE TRIGGER audit_inspection_areas_update
  AFTER UPDATE ON inspection_areas
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('update_inspection_area');

CREATE TRIGGER audit_inspection_areas_delete
  AFTER DELETE ON inspection_areas
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('delete_inspection_area');

-- user_roles table (sensitive - role grants/revocations)
CREATE TRIGGER audit_user_roles_insert
  AFTER INSERT ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('grant_role');

CREATE TRIGGER audit_user_roles_delete
  AFTER DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('revoke_role');

-- Prevent DELETE on audit_logs (immutable audit trail)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be deleted';
END;
$$;

CREATE TRIGGER prevent_audit_logs_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_delete();

-- Prevent UPDATE on audit_logs (immutable)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified';
END;
$$;

CREATE TRIGGER prevent_audit_logs_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_update();

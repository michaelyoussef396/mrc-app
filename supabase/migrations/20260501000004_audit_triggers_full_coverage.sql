-- Phase 2 Stage 2.1 — Full audit_log_trigger coverage across the inspection schema
--
-- Pre-flight (run during planning, 2026-05-01) confirmed:
--   - audit_log_trigger() function exists (Stage 2.0a updated its body for
--     session-variable fallback)
--   - audit_logs table exists in production with RLS enabled
--   - Live trigger reality at Phase 2 start: audit_log_trigger() was bound
--     ONLY to invoices and job_completions, INSERT and UPDATE only.
--     The repo file 20260311000001_add_audit_triggers.sql was never applied.
--
-- This migration adds 25 new CREATE TRIGGER statements to bring the
-- inspection schema under full audit coverage. The 4 already-deployed
-- bindings (invoices INSERT/UPDATE, job_completions INSERT/UPDATE) are
-- left untouched — DROP→CREATE on those would create attribution gaps
-- during the brief window between statements.
--
-- Trigger count breakdown:
--   leads:               INSERT, UPDATE, DELETE  (3)
--   inspections:         INSERT, UPDATE, DELETE  (3)
--   inspection_areas:    INSERT, UPDATE, DELETE  (3)
--   subfloor_data:       INSERT, UPDATE, DELETE  (3)
--   moisture_readings:   INSERT, UPDATE, DELETE  (3)
--   subfloor_readings:   INSERT, UPDATE, DELETE  (3)
--   photos:              INSERT, UPDATE, DELETE  (3)
--   user_roles:          INSERT, DELETE          (2)  — INSERT+DELETE-only
--                                                       per existing pattern
--   invoices:            DELETE                  (1)  — supplements existing
--                                                       INSERT+UPDATE
--   job_completions:     DELETE                  (1)  — supplements existing
--                                                       INSERT+UPDATE
-- ──────────────────────────────────────────────────────────────────────
-- Total:                                          25 new triggers
--
-- Rollback: DROP each trigger by name. The 4 pre-existing triggers
-- continue to function unaffected.

-- =============================================================================
-- leads
-- =============================================================================
CREATE TRIGGER audit_leads_insert
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('lead_created');

CREATE TRIGGER audit_leads_update
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('lead_updated');

CREATE TRIGGER audit_leads_delete
  AFTER DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('lead_deleted');

-- =============================================================================
-- inspections
-- =============================================================================
CREATE TRIGGER audit_inspections_insert
  AFTER INSERT ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('inspection_created');

CREATE TRIGGER audit_inspections_update
  AFTER UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('inspection_updated');

CREATE TRIGGER audit_inspections_delete
  AFTER DELETE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('inspection_deleted');

-- =============================================================================
-- inspection_areas
-- =============================================================================
CREATE TRIGGER audit_inspection_areas_insert
  AFTER INSERT ON public.inspection_areas
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('inspection_area_created');

CREATE TRIGGER audit_inspection_areas_update
  AFTER UPDATE ON public.inspection_areas
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('inspection_area_updated');

CREATE TRIGGER audit_inspection_areas_delete
  AFTER DELETE ON public.inspection_areas
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('inspection_area_deleted');

-- =============================================================================
-- subfloor_data
-- =============================================================================
CREATE TRIGGER audit_subfloor_data_insert
  AFTER INSERT ON public.subfloor_data
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('subfloor_data_created');

CREATE TRIGGER audit_subfloor_data_update
  AFTER UPDATE ON public.subfloor_data
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('subfloor_data_updated');

CREATE TRIGGER audit_subfloor_data_delete
  AFTER DELETE ON public.subfloor_data
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('subfloor_data_deleted');

-- =============================================================================
-- moisture_readings
-- =============================================================================
CREATE TRIGGER audit_moisture_readings_insert
  AFTER INSERT ON public.moisture_readings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('moisture_reading_created');

CREATE TRIGGER audit_moisture_readings_update
  AFTER UPDATE ON public.moisture_readings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('moisture_reading_updated');

CREATE TRIGGER audit_moisture_readings_delete
  AFTER DELETE ON public.moisture_readings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('moisture_reading_deleted');

-- =============================================================================
-- subfloor_readings
-- =============================================================================
CREATE TRIGGER audit_subfloor_readings_insert
  AFTER INSERT ON public.subfloor_readings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('subfloor_reading_created');

CREATE TRIGGER audit_subfloor_readings_update
  AFTER UPDATE ON public.subfloor_readings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('subfloor_reading_updated');

CREATE TRIGGER audit_subfloor_readings_delete
  AFTER DELETE ON public.subfloor_readings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('subfloor_reading_deleted');

-- =============================================================================
-- photos
-- =============================================================================
CREATE TRIGGER audit_photos_insert
  AFTER INSERT ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('photo_created');

CREATE TRIGGER audit_photos_update
  AFTER UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('photo_updated');

CREATE TRIGGER audit_photos_delete
  AFTER DELETE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('photo_deleted');

-- =============================================================================
-- user_roles  (INSERT + DELETE only — rows aren't mutated, only granted/revoked)
-- =============================================================================
CREATE TRIGGER audit_user_roles_insert
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('grant_role');

CREATE TRIGGER audit_user_roles_delete
  AFTER DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('revoke_role');

-- =============================================================================
-- invoices  (DELETE only — INSERT and UPDATE already covered by existing triggers)
-- =============================================================================
CREATE TRIGGER audit_invoices_delete
  AFTER DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('delete_invoice');

-- =============================================================================
-- job_completions  (DELETE only — INSERT and UPDATE already covered)
-- =============================================================================
CREATE TRIGGER audit_job_completions_delete
  AFTER DELETE ON public.job_completions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('delete_job_completion');

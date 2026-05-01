-- Phase 2 — Drop audit_logs.user_id FK to auth.users
--
-- Discovered during Stage 2.0d verification: audit_logs.user_id has a
-- FOREIGN KEY constraint to auth.users(id) with ON DELETE NO ACTION.
--
-- Two reasons to drop it:
--
-- 1. The SYSTEM_USER_UUID sentinel (docs/system-user-uuid.md) is not a
--    real auth.users row. The audit_log_trigger() session-variable
--    fallback in Stage 2.0a relies on this UUID being storable in
--    audit_logs.user_id. The FK blocks that.
--
-- 2. Audit logs are immutable forensic records by design (see the
--    prevent_audit_log_update / prevent_audit_log_delete triggers from
--    migration 20260311000001). user_id MUST persist beyond the lifetime
--    of the referenced auth user — otherwise deleting a former technician
--    would either fail (NO ACTION) or destroy historical attribution.
--    The FK contradicts this design.
--
-- The dropped constraint is recoverable; if a future audit phase wants
-- referential integrity restored (e.g. with ON DELETE SET NULL plus a
-- sentinel-aware partial index), the constraint can be re-added in a
-- fresh migration.

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

COMMENT ON COLUMN public.audit_logs.user_id IS
  'The user that caused this audited write. Stores either a real auth.users.id, '
  'the SYSTEM_USER_UUID sentinel for system Edge Function writes (see '
  'docs/system-user-uuid.md and docs/edge-function-attribution-manifest.md), '
  'or NULL when attribution failed (caught by the Section 6.1 daily integrity '
  'check). The FK to auth.users(id) was dropped in Phase 2 because audit_logs '
  'is an immutable forensic log: user_id must persist even when the referenced '
  'auth user is later deleted.';

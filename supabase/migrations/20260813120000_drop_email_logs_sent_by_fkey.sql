-- Migration: drop email_logs_sent_by_fkey
-- Created: 2026-08-13
--
-- WHY
-- ---
-- email_logs.sent_by carries the SYSTEM_USER_UUID sentinel
-- (a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f) for every email originated by a
-- system code path with no user JWT — the Framer lead confirmation
-- (receive-framer-lead) and the inspection reminder cron
-- (send-inspection-reminder). Per docs/system-user-uuid.md that sentinel is
-- deliberately NOT a row in auth.users; it is a marker meaning "the system did
-- this", and creating a real account for it would add a loginable identity
-- purely to satisfy a constraint.
--
-- The FK therefore rejects every system-originated write with SQLSTATE 23503.
-- Confirmed on PROD 2026-08-13: auth.users has no such row, and email_logs is
-- empty all-time. Until now the rejection was masked by a separate bug — a
-- .catch() chained onto the supabase-js query builder (a PromiseLike with no
-- .catch) threw TypeError before the insert was ever issued. With that fixed,
-- the FK becomes the remaining blocker.
--
-- This aligns email_logs.sent_by with the established design of
-- audit_logs.user_id, which stores the same sentinel and intentionally carries
-- no FK to auth.users for exactly this reason.
--
-- SCOPE: drops one constraint. No column is altered, no data is written or
-- deleted, no policy, index or trigger is touched. sent_by remains
-- uuid NULL-able and idx_email_logs_sent_by is unaffected (a plain CREATE
-- INDEX, not constraint-backed).

ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_sent_by_fkey;

COMMENT ON COLUMN public.email_logs.sent_by IS
  'Sender attribution. Real auth.users id for user-initiated sends; the '
  'SYSTEM_USER_UUID sentinel (a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f) for '
  'system sends. Intentionally has NO FK to auth.users — the sentinel is not '
  'a real account. Mirrors audit_logs.user_id. See docs/system-user-uuid.md.';

-- Verify (expect email_logs_lead_id_fkey and email_logs_inspection_id_fkey
-- only — email_logs_sent_by_fkey must be absent):
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.email_logs'::regclass AND contype = 'f';
--
-- Rollback (only safe while no sentinel-valued rows exist; once system sends
-- have been logged this will fail with 23503, which is the point of the drop):
--   ALTER TABLE public.email_logs
--     ADD CONSTRAINT email_logs_sent_by_fkey
--     FOREIGN KEY (sent_by) REFERENCES auth.users(id);

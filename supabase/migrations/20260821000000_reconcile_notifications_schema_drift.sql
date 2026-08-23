-- ============================================================================
-- DRAFT MIGRATION — DO NOT APPLY AUTOMATICALLY
-- 20260821000000_reconcile_notifications_schema_drift.sql
--
-- STATUS: DRAFT for human review only. Per this project's standing rule
-- (no auto-apply migrations — CLAUDE.md "Database" section), this file must
-- be reviewed and run manually by Michael in Supabase Studio (or
-- `supabase db push` after explicit ref confirmation per CLAUDE.md's
-- PROD/DEV ref discipline). It has NOT been applied.
--
-- PURPOSE: Bring a fresh database built from this repo's recorded
-- migrations up to the live PROD shape of public.notifications, which
-- diverged via unrecorded Supabase Studio SQL (no migration file, local
-- or remote, contains these changes — see
-- docs/NOTIFICATIONS_SCHEMA_RECONCILIATION.md for the full diff).
--
-- SAFETY: Every statement is idempotent and is a guaranteed schema NO-OP
-- when run against current PROD, because PROD already has every column
-- this migration would create, under the exact names checked below.
-- Two advisories from adversarial review:
--   * The section-2 ALTER TABLE takes a brief ACCESS EXCLUSIVE lock on
--     public.notifications even when every ADD COLUMN IF NOT EXISTS is
--     skipped. Negligible on the repo-attested 0-row table
--     (docs/TODO.md:1950-1951), but not zero-impact under load.
--   * The section-4 DROP INDEX no-op claim rests on remote-only migration
--     20260217071219 having dropped idx_notifications_read. Run item 3 of
--     the Studio verification snippet (see the reconciliation doc) first
--     to confirm the index is still absent live.
--
-- ASSUMPTIONS (see the reconciliation doc's "not expressible" list +
-- Studio verification SQL for how to close these out before/after apply):
--   1. `read` -> `is_read` was a RENAME (not an add+drop). Evidence only
--      shows is_read existing and a duplicate `idx_notifications_read`
--      index being cleaned up — consistent with, but not conclusive
--      proof of, a plain RENAME COLUMN. A rename is the simplest DDL
--      that produces exactly the observed end state.
--   2. `metadata` is JSONB (project-wide convention for flexible/nested
--      data; the generated TS `Json` type does not distinguish json
--      from jsonb).
--   3. `lead_id` is UUID (matches the FK target leads.id, which is UUID).
--   4. `related_entity_id` is UUID and `related_entity_type` is TEXT.
--      This is a naming-convention inference, NOT attested by the
--      generated types (TEXT/VARCHAR(n)/UUID all render as `string`).
--   5. `read_at` is TIMESTAMPTZ, matching the created_at/updated_at
--      pattern already on this table.
--   6. The FK `notifications_lead_id_fkey` delete rule is UNKNOWN from
--      available evidence. This migration chooses ON DELETE SET NULL
--      (lead_id is nullable, and a nullable optional-reference column
--      conventionally does not CASCADE-delete notification history when
--      its lead is deleted). THIS IS A JUDGMENT CALL — confirm the live
--      rule with the verification SQL before relying on this choice; if
--      live uses CASCADE or RESTRICT instead, this ADD CONSTRAINT will
--      not fire on PROD anyway (guarded on the constraint already
--      existing there under this exact name), so PROD's real behavior
--      is never overwritten by this migration regardless.
--   7. Index defs for idx_notifications_is_read / idx_notifications_
--      user_unread are deliberately NOT recreated here — their exact
--      column list / partial-WHERE clause was never captured in any
--      migration and is not safe to guess. After this migration a fresh
--      build therefore has NO index on is_read; capture the live
--      definitions from PROD (Studio snippet item 3) and add them in a
--      follow-up migration.
--
-- ROLLBACK (manual, keep commented for reference):
--   ALTER TABLE public.notifications RENAME COLUMN is_read TO read;
--   ALTER TABLE public.notifications DROP COLUMN IF EXISTS lead_id;
--   ALTER TABLE public.notifications DROP COLUMN IF EXISTS metadata;
--   ALTER TABLE public.notifications DROP COLUMN IF EXISTS related_entity_id;
--   ALTER TABLE public.notifications DROP COLUMN IF EXISTS related_entity_type;
--   ALTER TABLE public.notifications DROP COLUMN IF EXISTS read_at;
--   ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_lead_id_fkey;
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1) read -> is_read: guarded rename, no-op if is_read already exists
--    (i.e. no-op on current PROD).
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'read'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2) Net-new columns observed live but absent from every recorded
--    migration. ADD COLUMN IF NOT EXISTS is a no-op on current PROD.
-- --------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS lead_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS related_entity_id UUID,
  ADD COLUMN IF NOT EXISTS related_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- --------------------------------------------------------------------------
-- 3) FK for lead_id, guarded by exact constraint name (attested live via
--    `gen types` Relationships block: notifications_lead_id_fkey). No-op
--    on current PROD since the constraint already exists there under
--    this exact name, whatever its real delete rule turns out to be.
--    ON DELETE SET NULL below is this migration's judgment call for a
--    fresh build only — see ASSUMPTIONS #6 above.
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_lead_id_fkey'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 4) idx_notifications_read: created by the repo's own base migration
--    (20251029103512...sql:80) but dropped live via a migration that
--    exists ONLY on remote (20260217071219_drop_broken_functions_and_
--    duplicate_indexes.sql:27-28, not present anywhere in this repo).
--    Dropping it here brings a fresh-repo-built DB to parity with live.
--    No-op on current PROD, which no longer has this index.
-- --------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_notifications_read;

COMMIT;

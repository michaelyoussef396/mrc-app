-- =====================================================================
-- lead_notes Phase 2 (File A of 3) — mentions + attachments TABLES
--
-- STATUS: APPLIED to PROD (ecyivrxjpsmjmexqatym) 2026-08-26 via
--         `npx supabase db query --linked -f`
--         NOT registered in migration history (no `migration repair`).
--         Never `db push`, `db reset` or `migration repair` — the migration
--         history is forked 104 files deep and a push would replay all of it.
--
-- Authorisation: scoped to the lead-notes mentions + attachments feature only.
--
-- Apply order: A (this file) -> B (storage) -> C (notification RPCs).
--
-- ROLLBACK (this file only; run B and C rollbacks first):
--   BEGIN;
--   DROP TABLE IF EXISTS public.lead_note_attachments;
--   DROP TABLE IF EXISTS public.lead_note_mentions;
--   ALTER TABLE public.lead_notes DROP CONSTRAINT IF EXISTS lead_notes_id_lead_id_key;
--   COMMIT;
--
-- DESIGN — load-bearing rules
--   * Every RLS policy delegates to public.leads through a plain,
--     NON-SECURITY-DEFINER EXISTS evaluated as the caller, exactly as
--     lead_notes does. NO policy references assigned_to. Visibility therefore
--     inherits whatever lead visibility becomes when the multi-technician
--     junction table lands (TODO.md R7), with zero rewrite.
--   * auth.uid() is always wrapped as (SELECT auth.uid()) for initplan caching.
--   * CREATE (not CREATE OR REPLACE) so a name collision fails loudly.
--
-- NOTE — one additive constraint on the existing lead_notes table.
--   lead_notes gains UNIQUE (id, lead_id). id is already the primary key, so
--   this adds no new restriction whatsoever; it exists purely so the two new
--   tables can carry a COMPOSITE foreign key (note_id, lead_id) and have their
--   denormalised lead_id enforced by the database rather than by convention.
--   Without it, a client holding an INSERT grant on lead_note_attachments could
--   pair note X with lead Y and the row's RLS visibility would derive from a
--   lead unrelated to the note it renders under.
-- =====================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- ---------------------------------------------------------------------
-- SECTION 0 — enable composite FK targets on lead_notes
-- ---------------------------------------------------------------------
ALTER TABLE public.lead_notes
  ADD CONSTRAINT lead_notes_id_lead_id_key UNIQUE (id, lead_id);

COMMENT ON CONSTRAINT lead_notes_id_lead_id_key ON public.lead_notes IS
  'Redundant to the primary key by design. Exists solely as the target of the composite (note_id, lead_id) foreign keys on lead_note_mentions and lead_note_attachments, so their denormalised lead_id cannot diverge from the note it belongs to.';

-- ---------------------------------------------------------------------
-- SECTION 1 — public.lead_note_mentions
--
-- A TABLE, not a JSONB column on lead_notes. Justification:
--   1. The stated requirement is "which notes mention this person". That is a
--      plain btree index on (mentioned_user_id). JSONB would need a GIN index
--      and containment predicates for the same query.
--   2. A uuid array inside JSONB cannot be foreign-keyed, so it would silently
--      accumulate references to users who no longer exist.
--   3. lead_notes column privileges are deliberately narrow — INSERT only on
--      (lead_id, author_id, body), UPDATE only on (deleted_at). Adding a JSONB
--      column would require granting INSERT on it, dissolving the note row's
--      designed immutability.
--   4. A separate table carries its own RLS and its own write path, so mention
--      rows can be RPC-only while notes stay client-writable.
--
-- lead_id is denormalised so the RLS predicate is the SAME single-hop
-- delegation lead_notes uses, not a two-hop join through lead_notes. The
-- composite FK below guarantees it always matches the note's lead.
--
-- mentioned_user_id is ON DELETE CASCADE — a deliberate deviation from
-- lead_notes.author_id (RESTRICT). A mention is derived data; historical
-- mentions must never block auth.admin.deleteUser(). The note body still
-- carries the @name text, so nothing readable is lost.
-- ---------------------------------------------------------------------
CREATE TABLE public.lead_note_mentions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id           uuid NOT NULL,
  lead_id           uuid NOT NULL REFERENCES public.leads(id)    ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_note_mentions_note_lead_fkey
    FOREIGN KEY (note_id, lead_id) REFERENCES public.lead_notes(id, lead_id) ON DELETE CASCADE,
  CONSTRAINT lead_note_mentions_unique UNIQUE (note_id, mentioned_user_id)
);

COMMENT ON TABLE  public.lead_note_mentions IS
  'Who was @mentioned in a lead note. NEVER customer-visible. Rows are written only by public.add_lead_note_mentions().';
COMMENT ON COLUMN public.lead_note_mentions.lead_id IS
  'Denormalised from lead_notes so RLS delegates to public.leads in one hop, identically to lead_notes. Kept honest by lead_note_mentions_note_lead_fkey.';

CREATE INDEX idx_lead_note_mentions_user ON public.lead_note_mentions (mentioned_user_id, created_at DESC);
CREATE INDEX idx_lead_note_mentions_note ON public.lead_note_mentions (note_id);
CREATE INDEX idx_lead_note_mentions_lead ON public.lead_note_mentions (lead_id);

ALTER TABLE public.lead_note_mentions ENABLE ROW LEVEL SECURITY;

-- Same delegation shape as authenticated_select_lead_notes. No assigned_to.
CREATE POLICY authenticated_select_lead_note_mentions
  ON public.lead_note_mentions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_note_mentions.lead_id)
  );

-- No INSERT / UPDATE / DELETE policy by design: the only write path is
-- public.add_lead_note_mentions(), which validates note authorship first.

REVOKE ALL ON TABLE public.lead_note_mentions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lead_note_mentions TO authenticated;

-- ---------------------------------------------------------------------
-- SECTION 2 — public.lead_note_attachments
--
-- public.photos cannot host these: photo_type is NOT NULL, there is no
-- lead_id column, and its RLS is keyed on inspections/job_completions
-- through l.assigned_to = auth.uid() (verified live) — precisely the
-- coupling this feature must not inherit.
--
-- Policy set mirrors lead_notes exactly: SELECT delegates to leads;
-- INSERT/UPDATE additionally bind the actor; NO DELETE policy — removal is
-- soft delete via deleted_at.
--
-- Blank-check regexes use the POSIX class [^[:space:]] rather than \S so the
-- constraint cannot silently degrade to "must contain the letter S" if
-- standard_conforming_strings is ever off.
-- ---------------------------------------------------------------------
CREATE TABLE public.lead_note_attachments (
  id           uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id      uuid   NOT NULL,
  lead_id      uuid   NOT NULL REFERENCES public.leads(id)    ON DELETE CASCADE,
  storage_path text   NOT NULL UNIQUE,
  file_name    text   NOT NULL,
  file_size    bigint NOT NULL,
  mime_type    text   NOT NULL,
  uploaded_by  uuid   NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CONSTRAINT lead_note_attachments_note_lead_fkey
    FOREIGN KEY (note_id, lead_id) REFERENCES public.lead_notes(id, lead_id) ON DELETE CASCADE,
  CONSTRAINT lead_note_attachments_file_name_not_blank CHECK (file_name ~ '[^[:space:]]'),
  CONSTRAINT lead_note_attachments_file_name_max_len   CHECK (length(file_name) <= 255),
  CONSTRAINT lead_note_attachments_mime_not_blank      CHECK (mime_type ~ '[^[:space:]]'),
  -- Mirrors the bucket's 25 MiB file_size_limit. Belt and braces: the bucket
  -- rejects the bytes, this rejects a row that lies about them.
  CONSTRAINT lead_note_attachments_size_range CHECK (file_size > 0 AND file_size <= 26214400)
);

COMMENT ON TABLE public.lead_note_attachments IS
  'Files attached to a lead note. NEVER customer-visible: never rendered into a report, an email or a PDF.';
COMMENT ON COLUMN public.lead_note_attachments.lead_id IS
  'Denormalised from lead_notes for single-hop RLS delegation and to match the storage object key prefix. Kept honest by lead_note_attachments_note_lead_fkey.';

CREATE INDEX idx_lead_note_attachments_note ON public.lead_note_attachments (note_id, created_at);
CREATE INDEX idx_lead_note_attachments_lead ON public.lead_note_attachments (lead_id);
CREATE INDEX idx_lead_note_attachments_uploader ON public.lead_note_attachments (uploaded_by);

ALTER TABLE public.lead_note_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_lead_note_attachments
  ON public.lead_note_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_note_attachments.lead_id)
  );

CREATE POLICY uploader_insert_lead_note_attachments
  ON public.lead_note_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_note_attachments.lead_id)
  );

CREATE POLICY uploader_update_lead_note_attachments
  ON public.lead_note_attachments
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_note_attachments.lead_id)
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_note_attachments.lead_id)
  );

-- RLS decides WHO; column privileges decide WHAT.
REVOKE ALL ON TABLE public.lead_note_attachments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lead_note_attachments TO authenticated;
GRANT INSERT (note_id, lead_id, storage_path, file_name, file_size, mime_type, uploaded_by)
  ON TABLE public.lead_note_attachments TO authenticated;
GRANT UPDATE (deleted_at) ON TABLE public.lead_note_attachments TO authenticated;

COMMIT;

-- =====================================================================
-- VERIFICATION (read-only; run after apply)
--
-- V1  columns
--   SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_schema='public' AND table_name IN ('lead_note_mentions','lead_note_attachments')
--   ORDER BY table_name, ordinal_position;
--
-- V2  RLS enabled on both
--   SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--   WHERE n.nspname='public' AND relname IN ('lead_note_mentions','lead_note_attachments');
--
-- V3  policies
--   SELECT tablename, policyname, cmd, roles::text, qual, with_check FROM pg_policies
--   WHERE schemaname='public' AND tablename IN ('lead_note_mentions','lead_note_attachments');
--
-- V4  *** NO new policy references assigned_to *** (must return 0)
--   SELECT count(*) FROM pg_policies
--   WHERE (tablename IN ('lead_note_mentions','lead_note_attachments')
--          OR policyname LIKE 'lead_note_attachments_object%')
--     AND (COALESCE(qual,'') || COALESCE(with_check,'')) ILIKE '%assigned_to%';
--
-- V6  anon/authenticated column grants
--   SELECT grantee, privilege_type, string_agg(column_name, ', ' ORDER BY column_name)
--   FROM information_schema.column_privileges
--   WHERE table_schema='public' AND table_name IN ('lead_note_mentions','lead_note_attachments')
--     AND grantee IN ('anon','authenticated') GROUP BY 1,2 ORDER BY 1,2;
--
-- V9  FK delete actions (composite FKs must be present)
--   SELECT conrelid::regclass::text, conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid IN ('public.lead_note_mentions'::regclass,'public.lead_note_attachments'::regclass)
--     AND contype='f' ORDER BY 1,2;
-- =====================================================================

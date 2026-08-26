-- =====================================================================
-- lead_notes Phase 2 (File B of 3) — attachment STORAGE bucket + policies
--
-- STATUS: APPLIED to PROD (ecyivrxjpsmjmexqatym) 2026-08-26 via
--         `npx supabase db query --linked -f`
--         NOT registered in migration history (no `migration repair`).
--         Never `db push`, `db reset` or `migration repair`.
--
-- Apply order: A (tables) -> B (this file) -> C (notification RPCs).
--
-- ROLLBACK (delete the objects through the Storage API FIRST — the DELETE
-- below removes only the metadata rows; the bytes would remain in the backing
-- store, unreachable by any policy and still billable):
--   BEGIN;
--   DROP POLICY IF EXISTS lead_note_attachments_object_delete ON storage.objects;
--   DROP POLICY IF EXISTS lead_note_attachments_object_insert ON storage.objects;
--   DROP POLICY IF EXISTS lead_note_attachments_object_select ON storage.objects;
--   DELETE FROM storage.objects WHERE bucket_id = 'lead-note-attachments';
--   DELETE FROM storage.buckets WHERE id = 'lead-note-attachments';
--   COMMIT;
--
-- PRIVILEGE NOTE — why this is its own file.
--   storage.objects is owned by supabase_storage_admin. The role behind
--   `db query --linked` is postgres, which is NOT superuser and NOT a member
--   of that role, so CREATE POLICY here may raise 42501 "must be owner of
--   table objects". Keeping storage separate means such a failure cannot roll
--   back File A or File C. On 42501: STOP, report, and create these three
--   policies through Supabase dashboard -> Storage -> Policies. Do NOT reshape
--   them into something that applies, and do NOT proceed with an unprotected
--   bucket.
--   The bucket INSERT itself is fine: postgres has rolbypassrls = true
--   (verified live), and an RLS-blocked INSERT raises 42501 rather than
--   silently inserting zero rows.
--
-- LOCK NOTE — CREATE POLICY takes ACCESS EXCLUSIVE on storage.objects, the
--   busiest table in the project. lock_timeout below makes this fail fast
--   instead of queueing every storage read in the project behind it.
-- =====================================================================

BEGIN;

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

-- ---------------------------------------------------------------------
-- SECTION 3 — storage bucket
--
-- storage.buckets has RLS enabled with ZERO policies (verified live), so a
-- bucket can only be created here, never from the client.
--
-- Private, 25 MiB, explicit MIME allowlist. Deliberately NOT modelled on
-- pdf-assets / pdf-templates — see the SECURITY NOTE at the bottom.
--
-- allowed_mime_types is checked against the client-supplied Content-Type
-- header. It is a correctness/UX guard against the wrong file being attached,
-- NOT a security control — a determined caller can mislabel bytes. The real
-- controls are the RLS policies below and the private bucket.
--
-- ON CONFLICT DO NOTHING matches the two prior bucket migrations in this repo
-- and keeps the DEV paste idempotent.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-note-attachments',
  'lead-note-attachments',
  false,
  26214400,  -- 25 MiB
  ARRAY[
    'application/pdf',
    'image/jpeg','image/png','image/webp','image/gif','image/tiff','image/heic','image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv','text/plain','application/rtf',
    'message/rfc822','application/vnd.ms-outlook',
    'application/zip','application/x-zip-compressed',
    'application/x-7z-compressed',
    'application/vnd.rar','application/x-rar-compressed'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- SECTION 4 — storage.objects policies for that bucket
--
-- Object key layout: <lead_id>/<note_id>/<uuid>-<sanitised filename>
-- so (storage.foldername(name))[1] is the lead id and the object inherits
-- lead visibility through the same EXISTS delegation used everywhere else.
-- No policy here references assigned_to.
--
-- The comparison is l.id::text = <folder>, NOT <folder>::uuid = l.id. Casting
-- a caller-controlled object key would raise 22P02 and error the whole query
-- rather than filter a row. This mirrors the live avatar policies. leads is
-- 96 rows, so the non-sargable comparison is immaterial.
--
-- Verified live before writing these: 0 of the 25 pre-existing
-- storage.objects policies lack a bucket_id predicate, so none of them
-- silently widens this bucket (RLS policies are PERMISSIVE and OR'd).
-- ---------------------------------------------------------------------
CREATE POLICY lead_note_attachments_object_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lead-note-attachments'
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY lead_note_attachments_object_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lead-note-attachments'
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id::text = (storage.foldername(name))[1]
    )
  );

-- DELETE exists ONLY so a client can roll back its own orphaned upload when
-- the matching lead_note_attachments row fails to insert.
--
-- Two guards make that the ONLY thing it can do:
--   * the caller must own the object (owner is populated for every
--     client-side upload on this project — verified: inspection-photos 247/247
--     and report-pdfs 21/21 non-null; owner_id is checked too because `owner`
--     is deprecated upstream and can be NULL on some upload paths);
--   * no lead_note_attachments row may reference the key. Once the row exists
--     the bytes are immutable, so a soft delete can never become a hard one
--     and an uploader cannot purge a file an admin is relying on.
-- ---------------------------------------------------------------------
CREATE POLICY lead_note_attachments_object_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lead-note-attachments'
    AND (
      owner = (SELECT auth.uid())
      OR owner_id = (SELECT auth.uid())::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.lead_note_attachments a
      WHERE a.storage_path = storage.objects.name
    )
  );

-- No UPDATE policy: uploads are upsert:false, objects are never overwritten.

COMMIT;

-- =====================================================================
-- SECURITY NOTE — pre-existing, NOT addressed by this migration.
-- Recorded as a P0 in docs/TODO.md.
--
-- storage.objects carries these live policies:
--   "Allow service role upload to pdf-assets"    INSERT TO public  WITH CHECK (bucket_id = 'pdf-assets')
--   "Allow update pdf-assets"                    UPDATE TO public  USING/CHECK (bucket_id = 'pdf-assets')
--   "Allow service role delete from pdf-assets"  DELETE TO public  USING (bucket_id = 'pdf-assets')
--   "Allow uploads to pdf-templates"             INSERT TO public  WITH CHECK (bucket_id = 'pdf-templates')
--   "Allow updates to pdf-templates"             UPDATE TO public  USING (bucket_id = 'pdf-templates')
-- None carries an auth predicate despite the "service role" naming, and
-- `public` includes `anon`, so an unauthenticated caller can upload to,
-- overwrite AND delete objects in pdf-assets/pdf-templates — the buckets that
-- feed the customer-facing PDF pipeline. Out of scope here; separate ticket.
-- =====================================================================

-- =====================================================================
-- VERIFICATION (read-only; run after apply)
--
-- V4b  no storage policy of ours references assigned_to (must return 0)
--   SELECT count(*) FROM pg_policies WHERE schemaname='storage'
--     AND policyname LIKE 'lead_note_attachments_object%'
--     AND (COALESCE(qual,'') || COALESCE(with_check,'')) ILIKE '%assigned_to%';
--
-- V7  bucket is private, limited and allowlisted
--   SELECT id, public, file_size_limit, array_length(allowed_mime_types,1) AS mime_count
--   FROM storage.buckets WHERE id='lead-note-attachments';
--
-- V10 no bucket-agnostic storage policy can widen this bucket (must return 0)
--   SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
--     AND (COALESCE(qual,'') || COALESCE(with_check,'')) NOT LIKE '%bucket_id%';
--
-- V11 our three policies exist
--   SELECT policyname, cmd, roles::text FROM pg_policies
--   WHERE schemaname='storage' AND policyname LIKE 'lead_note_attachments_object%' ORDER BY cmd;
-- =====================================================================

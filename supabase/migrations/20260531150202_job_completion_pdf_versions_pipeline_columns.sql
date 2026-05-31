-- Job-Report Hard-Save Pipeline — Phase 1 schema (ADDITIVE only)
--
-- Mirrors supabase/migrations/20260524044234_pdf_versions_pipeline_columns.sql
-- (pdf_versions extension) and 20260524064207_pdf_versions_pdf_url_drop_not_null.sql
-- onto public.job_completion_pdf_versions, so the job-report rebuild can use
-- the same hard-save / mismatch-guard / version-tracking shape that the
-- inspection-report pipeline already has.
--
-- Safety:
--   * Every change is ADDITIVE — nullable ADD COLUMNs, one CHECK constraint
--     on a new column, two partial indexes, one ALTER COLUMN ... DROP NOT NULL
--     that LOOSENS an existing constraint (never tightens). No backfill, no
--     row rewrites, no existing-code-path impact.
--   * Safe on the shared production DB (project ref ecyivrxjpsmjmexqatym).
--     The legacy generate-job-report-pdf EF still writes pdf_url (HTML URL)
--     unchanged — DROP NOT NULL only means future hard_save rows may leave
--     pdf_url blank by design.
--   * The original CREATE TABLE for job_completion_pdf_versions is not in
--     the migrations folder (created via Studio). ADD COLUMN IF NOT EXISTS
--     and the conditional CHECK make this idempotent regardless.
--
-- Existing posture LEFT INTACT:
--   * job_completion_pdf_versions has NO audit_log_trigger today (it's not
--     in the canonical audit list per CLAUDE.md). NOT adding one here — the
--     audit-trigger foundation is locked per Phase 2 (audit_logs foundation —
--     VERIFIED LIVE) and adding a trigger requires explicit instruction.
--   * RLS posture unchanged.
--   * Existing FK from 20260414000001 (job_completion_id → job_completions.id
--     ON DELETE SET NULL) unchanged.
--
-- Reversal (if ever needed):
--   ALTER TABLE public.job_completion_pdf_versions
--     DROP CONSTRAINT IF EXISTS job_completion_pdf_versions_generation_type_check;
--   DROP INDEX IF EXISTS public.idx_job_completion_pdf_versions_hard_save;
--   DROP INDEX IF EXISTS public.idx_job_completion_pdf_versions_emailed;
--   ALTER TABLE public.job_completion_pdf_versions
--     DROP COLUMN IF EXISTS file_size_bytes,
--     DROP COLUMN IF EXISTS generation_type,
--     DROP COLUMN IF EXISTS emailed_at,
--     DROP COLUMN IF EXISTS was_emailed,
--     DROP COLUMN IF EXISTS html_hash,
--     DROP COLUMN IF EXISTS html_storage_path,
--     DROP COLUMN IF EXISTS pdf_storage_path;
--   -- Restoring pdf_url NOT NULL requires backfilling any NULL rows first.
--
-- Verification (post-apply):
--   1. SELECT column_name, data_type, is_nullable, column_default
--        FROM information_schema.columns
--        WHERE table_schema = 'public'
--          AND table_name = 'job_completion_pdf_versions'
--          AND column_name IN ('pdf_storage_path','html_storage_path','html_hash',
--                              'was_emailed','emailed_at','generation_type',
--                              'file_size_bytes','pdf_url')
--        ORDER BY column_name;
--      Expect:
--        - was_emailed: boolean, NO,  false
--        - emailed_at, html_hash, html_storage_path, pdf_storage_path,
--          generation_type, file_size_bytes, pdf_url: all YES (nullable)
--   2. SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--        WHERE conrelid = 'public.job_completion_pdf_versions'::regclass
--          AND conname = 'job_completion_pdf_versions_generation_type_check';
--      Expect one row matching the inspection-side CHECK shape.
--   3. SELECT indexname FROM pg_indexes
--        WHERE schemaname = 'public'
--          AND tablename = 'job_completion_pdf_versions'
--          AND indexname IN ('idx_job_completion_pdf_versions_hard_save',
--                            'idx_job_completion_pdf_versions_emailed');
--      Expect 2 rows.
--   4. Legacy EF still inserts: spot-check that a job-report regen via the
--      old generate-job-report-pdf EF still writes a row with pdf_url
--      populated and the new columns all NULL.

-- ===== Columns =====

ALTER TABLE public.job_completion_pdf_versions
  ADD COLUMN IF NOT EXISTS pdf_storage_path  TEXT,
  ADD COLUMN IF NOT EXISTS html_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS html_hash         TEXT,
  ADD COLUMN IF NOT EXISTS was_emailed       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emailed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_type   TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes   BIGINT;

COMMENT ON COLUMN public.job_completion_pdf_versions.pdf_storage_path IS
  'Bucket-relative path to the rendered PDF in the report-pdfs bucket. NULL on rows written by the legacy EF path (which only produces HTML).';

COMMENT ON COLUMN public.job_completion_pdf_versions.html_storage_path IS
  'Bucket-relative path to the HTML snapshot in the report-pdfs bucket. The exact bytes used to render pdf_storage_path AND hashed into html_hash. Audit/archive value.';

COMMENT ON COLUMN public.job_completion_pdf_versions.html_hash IS
  'SHA-256 hex digest of the normalized HTML (signed-URL query strings stripped). Send-time mismatch guard compares this against a freshly re-rendered HTML hash.';

COMMENT ON COLUMN public.job_completion_pdf_versions.was_emailed IS
  'True once this exact version has been emailed to the customer. Set by the send-email path after a successful Resend dispatch.';

COMMENT ON COLUMN public.job_completion_pdf_versions.emailed_at IS
  'Timestamp of the email dispatch that flipped was_emailed to true.';

COMMENT ON COLUMN public.job_completion_pdf_versions.generation_type IS
  'How this row was created. NULL on legacy rows written by the EF before the new pipeline. Three new-pipeline values: legacy_ef_render (reserved for backfill if ever needed), hard_save (server-rendered via api/render-job-report-pdf), manual_upload_fallback (reserved — no manual upload UI exists for jobs yet).';

COMMENT ON COLUMN public.job_completion_pdf_versions.file_size_bytes IS
  'Size in bytes of the rendered PDF. Populated by api/render-job-report-pdf hard_save mode. NULL on legacy rows.';

-- ===== Constraint (added separately so the ADD COLUMN above stays IF NOT EXISTS safe) =====

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.job_completion_pdf_versions'::regclass
      AND conname  = 'job_completion_pdf_versions_generation_type_check'
  ) THEN
    ALTER TABLE public.job_completion_pdf_versions
      ADD CONSTRAINT job_completion_pdf_versions_generation_type_check
      CHECK (generation_type IN ('legacy_ef_render', 'hard_save', 'manual_upload_fallback')
             OR generation_type IS NULL);
  END IF;
END $$;

-- ===== Drop NOT NULL on pdf_url =====
-- Mirrors 20260524064207_pdf_versions_pdf_url_drop_not_null.sql. Hard-save
-- rows leave pdf_url NULL by design; the rendered PDF lives at
-- pdf_storage_path (in the report-pdfs bucket) and is fetched via a Storage
-- download rather than a public URL.

ALTER TABLE public.job_completion_pdf_versions
  ALTER COLUMN pdf_url DROP NOT NULL;

-- ===== Indexes =====

CREATE INDEX IF NOT EXISTS idx_job_completion_pdf_versions_hard_save
  ON public.job_completion_pdf_versions(job_completion_id, created_at DESC)
  WHERE generation_type = 'hard_save';

CREATE INDEX IF NOT EXISTS idx_job_completion_pdf_versions_emailed
  ON public.job_completion_pdf_versions(job_completion_id, emailed_at DESC)
  WHERE was_emailed = true;

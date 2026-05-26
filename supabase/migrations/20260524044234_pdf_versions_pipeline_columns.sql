-- PDF Pipeline Rebuild — Phase 1 schema (ADDITIVE only)
--
-- Adds the columns needed by the new server-rendered hard-save pipeline to the
-- existing public.pdf_versions table. The legacy column `pdf_url` (which
-- currently holds the HTML path under a misleading name) is intentionally
-- LEFT UNTOUCHED — the new pipeline writes only the new columns.
--
-- This migration is safe to apply to the shared production DB
-- (project ref ecyivrxjpsmjmexqatym, which serves both Vercel preview and
-- production) because every change is purely additive: nullable ADD COLUMNs,
-- new CHECK constraint on a new column, new partial indexes. No backfill,
-- no rewrites of existing rows, no production code paths reference the new
-- columns yet.
--
-- Existing trigger / RLS posture LEFT INTACT:
--   * RLS policies from 20241221000000 (admin/manager + inspection-scoped tech reads)
--   * Index posture from 20260217074249 (idx_pdf_versions_created_by)
--   * FK from 20260414000001
--   * pdf_versions has NO audit_log_trigger today (it's not in the canonical
--     audit list per CLAUDE.md). NOT adding one here — the audit-trigger
--     foundation is locked per Phase 2 (audit_logs foundation — VERIFIED LIVE)
--     and adding a trigger requires explicit instruction.
--
-- Verification (post-apply):
--   1. SELECT column_name, data_type, is_nullable
--        FROM information_schema.columns
--        WHERE table_schema = 'public' AND table_name = 'pdf_versions'
--          AND column_name IN ('pdf_storage_path','html_storage_path',
--                              'html_hash','was_emailed','emailed_at',
--                              'generation_type')
--        ORDER BY column_name;
--      -> expect 6 rows, was_emailed NOT NULL DEFAULT false, rest nullable.
--   2. SELECT indexname FROM pg_indexes
--        WHERE schemaname = 'public' AND tablename = 'pdf_versions'
--          AND indexname IN ('idx_pdf_versions_hard_save',
--                            'idx_pdf_versions_emailed');
--      -> expect 2 rows.
--   3. Verify StalePdfBanner (which reads pdf_versions.created_at) still
--      returns rows for inspections with prior PDF versions.

-- ===== Columns =====

ALTER TABLE public.pdf_versions
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS html_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS html_hash TEXT,
  ADD COLUMN IF NOT EXISTS was_emailed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_type TEXT;

COMMENT ON COLUMN public.pdf_versions.pdf_storage_path IS
  'Bucket-relative path to the rendered PDF in the report-pdfs bucket. NULL on rows written by the legacy EF path (which only produces HTML).';

COMMENT ON COLUMN public.pdf_versions.html_storage_path IS
  'Bucket-relative path to the HTML snapshot in the report-pdfs bucket. The exact bytes used to render pdf_storage_path AND hashed into html_hash. Audit/archive value.';

COMMENT ON COLUMN public.pdf_versions.html_hash IS
  'SHA-256 hex digest of the normalized HTML (signed-URL query strings stripped). Send-time mismatch guard compares this against a freshly re-rendered HTML hash.';

COMMENT ON COLUMN public.pdf_versions.was_emailed IS
  'True once this exact version has been emailed to the customer. Set by the send-email path after a successful Resend dispatch.';

COMMENT ON COLUMN public.pdf_versions.emailed_at IS
  'Timestamp of the email dispatch that flipped was_emailed to true.';

COMMENT ON COLUMN public.pdf_versions.generation_type IS
  'How this row was created. NULL on legacy rows written by the EF before the new pipeline. Three new-pipeline values: legacy_ef_render (reserved for backfill if ever needed), hard_save (server-rendered via api/render-pdf), manual_upload_fallback (admin uploaded a PDF manually).';

-- ===== Constraint (added separately so the ADD COLUMN above stays IF NOT EXISTS safe) =====

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pdf_versions'::regclass
      AND conname = 'pdf_versions_generation_type_check'
  ) THEN
    ALTER TABLE public.pdf_versions
      ADD CONSTRAINT pdf_versions_generation_type_check
      CHECK (generation_type IN ('legacy_ef_render', 'hard_save', 'manual_upload_fallback')
             OR generation_type IS NULL);
  END IF;
END $$;

-- ===== Indexes =====

CREATE INDEX IF NOT EXISTS idx_pdf_versions_hard_save
  ON public.pdf_versions(inspection_id, created_at DESC)
  WHERE generation_type = 'hard_save';

CREATE INDEX IF NOT EXISTS idx_pdf_versions_emailed
  ON public.pdf_versions(inspection_id, emailed_at DESC)
  WHERE was_emailed = true;

-- PDF Pipeline Rebuild — hotfix on top of 20260524044234
--
-- Drop NOT NULL on public.pdf_versions.pdf_url. The hard-save INSERT in
-- api/render-pdf.ts writes the rendered PDF path into the new
-- pdf_storage_path column and leaves the legacy pdf_url NULL — but the
-- original 20241221000000_add_pdf_system.sql schema declared pdf_url as
-- NOT NULL, so every hard-save INSERT trips 23502.
--
-- Two columns are not the same:
--   * pdf_url           — legacy; populated by the EF generate-inspection-pdf
--                         path with the inspection-reports bucket HTML URL
--                         (misnamed; tracked as PDF-CL1 in docs/TODO.md)
--   * pdf_storage_path  — new pipeline; bucket-relative path to the real
--                         rendered PDF in report-pdfs
--
-- Legacy EF rows still populate pdf_url so existing readers (e.g.
-- StalePdfBanner, ViewReportPDF's legacy switcher panel for the job branch)
-- keep working. New hard-save rows leave it NULL by design. The full
-- consolidation/rename is post-launch cleanup.
--
-- Verification (post-apply):
--   SELECT column_name, is_nullable
--     FROM information_schema.columns
--     WHERE table_schema='public' AND table_name='pdf_versions'
--       AND column_name='pdf_url';
--   -> expect is_nullable = 'YES'

ALTER TABLE public.pdf_versions
  ALTER COLUMN pdf_url DROP NOT NULL;

COMMENT ON COLUMN public.pdf_versions.pdf_url IS
  'Legacy column populated by generate-inspection-pdf EF with the HTML URL in the inspection-reports bucket (misnamed). New hard-save rows leave this NULL and write to pdf_storage_path instead. Consolidation tracked as PDF-CL1.';

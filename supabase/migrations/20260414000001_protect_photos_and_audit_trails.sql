-- Protect photos and audit trails from cascade deletes
-- Changes dangerous ON DELETE CASCADE to ON DELETE SET NULL so that
-- deleting a parent row (lead, inspection, job_completion, area, subfloor)
-- preserves the dependent records (photos, email logs, PDF version history).

-- Photos: never destroy photo records when a parent row is deleted
ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_inspection_id_fkey;
ALTER TABLE public.photos ADD CONSTRAINT photos_inspection_id_fkey
  FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE SET NULL;

ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_area_id_fkey;
ALTER TABLE public.photos ADD CONSTRAINT photos_area_id_fkey
  FOREIGN KEY (area_id) REFERENCES public.inspection_areas(id) ON DELETE SET NULL;

ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_subfloor_id_fkey;
ALTER TABLE public.photos ADD CONSTRAINT photos_subfloor_id_fkey
  FOREIGN KEY (subfloor_id) REFERENCES public.subfloor_data(id) ON DELETE SET NULL;

ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_job_completion_id_fkey;
ALTER TABLE public.photos ADD CONSTRAINT photos_job_completion_id_fkey
  FOREIGN KEY (job_completion_id) REFERENCES public.job_completions(id) ON DELETE SET NULL;

-- Email delivery audit trail: preserve on parent delete
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_lead_id_fkey;
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_inspection_id_fkey;
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_inspection_id_fkey
  FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE SET NULL;

-- PDF version history: preserve when inspection/job_completion is deleted
ALTER TABLE public.pdf_versions DROP CONSTRAINT IF EXISTS pdf_versions_inspection_id_fkey;
ALTER TABLE public.pdf_versions ADD CONSTRAINT pdf_versions_inspection_id_fkey
  FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE SET NULL;

ALTER TABLE public.job_completion_pdf_versions DROP CONSTRAINT IF EXISTS job_completion_pdf_versions_job_completion_id_fkey;
ALTER TABLE public.job_completion_pdf_versions ADD CONSTRAINT job_completion_pdf_versions_job_completion_id_fkey
  FOREIGN KEY (job_completion_id) REFERENCES public.job_completions(id) ON DELETE SET NULL;

-- Phase 3 Stage 3.1 — ai_summary_versions table
-- Versioned AI-generated inspection summaries with reproducibility metadata,
-- supersession chain, and admin approval lifecycle.
--
-- Verification (post-apply):
--   1. table public.ai_summary_versions present with 23 columns
--   2. indexes idx_ai_summary_versions_inspection (composite DESC) +
--      idx_ai_summary_versions_approved (partial WHERE approved_at IS NOT NULL)
--   3. policies admins_see_all (FOR ALL TO authenticated) +
--      technicians_see_assigned (FOR SELECT TO authenticated)
--   4. triggers audit_ai_summary_versions_insert ('ai_summary_version_created')
--      + audit_ai_summary_versions_update ('ai_summary_version_updated')
--   5. UNIQUE(inspection_id, version_number) constraint enforced
--
-- All five passed at apply time (2026-05-01).

CREATE TABLE public.ai_summary_versions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id            UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  version_number           INTEGER NOT NULL,
  generation_type          TEXT NOT NULL CHECK (generation_type IN ('initial', 'regeneration', 'manual_edit')),
  generated_by             UUID REFERENCES auth.users(id),
  generated_at             TIMESTAMPTZ DEFAULT NOW(),

  -- Reproducibility
  model_name               TEXT,
  model_version            TEXT,
  system_prompt_hash       TEXT,
  user_prompt              TEXT,
  prompt_tokens            INTEGER,
  response_tokens          INTEGER,
  regeneration_feedback    TEXT,

  -- Generated content (snapshot at time of generation)
  ai_summary_text          TEXT,
  what_we_found_text       TEXT,
  what_we_will_do_text     TEXT,
  what_you_get_text        TEXT,
  problem_analysis_content TEXT,
  demolition_content       TEXT,

  -- Supersession
  superseded_at            TIMESTAMPTZ,
  superseded_by_version_id UUID REFERENCES public.ai_summary_versions(id),

  -- Approval
  approved_at              TIMESTAMPTZ,
  approved_by              UUID REFERENCES auth.users(id),

  UNIQUE(inspection_id, version_number)
);

CREATE INDEX idx_ai_summary_versions_inspection
  ON public.ai_summary_versions(inspection_id, version_number DESC);

CREATE INDEX idx_ai_summary_versions_approved
  ON public.ai_summary_versions(inspection_id) WHERE approved_at IS NOT NULL;

ALTER TABLE public.ai_summary_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_see_all" ON public.ai_summary_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "technicians_see_assigned" ON public.ai_summary_versions
  FOR SELECT TO authenticated
  USING (
    inspection_id IN (
      SELECT id FROM public.inspections
      WHERE inspector_id = auth.uid()
    )
  );

CREATE TRIGGER audit_ai_summary_versions_insert
  AFTER INSERT ON public.ai_summary_versions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('ai_summary_version_created');

CREATE TRIGGER audit_ai_summary_versions_update
  AFTER UPDATE ON public.ai_summary_versions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('ai_summary_version_updated');

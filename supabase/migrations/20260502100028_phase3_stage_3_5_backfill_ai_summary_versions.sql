-- Phase 3 Stage 3.5 step A — backfill ai_summary_versions from legacy inspections columns
--
-- One row per inspection that has ANY of the 6 content columns populated.
-- generation_type = 'initial', version_number = 1.
-- generated_at = first non-null among (ai_summary_generated_at, updated_at, created_at).
-- approved_at / approved_by populated only for previously-approved inspections.
--
-- DIVERGENCE FROM MASTER PLAN (v2 line 547):
-- Master plan WHERE clause is `WHERE ai_summary_text IS NOT NULL`. Pre-flight
-- found 1 inspection (c61ffdf4-f42a-47a7-b579-1afa75a250db) with section content
-- but null ai_summary_text — would have been silent data loss. Predicate broadened
-- to OR across the 6 content columns. Authorized by Michael 2026-05-02.
-- Master plan footnote correction tracked separately (post-PR-E task).
--
-- Pre-flight FK-orphan check on last_edited_by → auth.users(id): 0 orphans, so
-- the approved_by FK on ai_summary_versions stays. (0 inspections currently have
-- ai_summary_approved = true, so the CASE WHEN clause never fires anyway.)
--
-- Verification (post-apply):
--   - 2 rows landed in ai_summary_versions, both generation_type='initial' v1
--   - inspection_id 1c29e606-ae24-4aec-90c3-229782d8a9d0: ai_summary_text + 3 sections + pa
--   - inspection_id c61ffdf4-f42a-47a7-b579-1afa75a250db: 4 sections (no ai_summary_text), at-risk row preserved
--   - approved_at/approved_by/generated_by NULL on both (legacy data, no user attribution available)
--   - superseded_at NULL on both (latest active versions, supersession invariant clean)

INSERT INTO public.ai_summary_versions (
  inspection_id, version_number, generation_type, generated_at,
  ai_summary_text, what_we_found_text, what_we_will_do_text,
  what_you_get_text, problem_analysis_content, demolition_content,
  approved_at, approved_by
)
SELECT
  id, 1, 'initial',
  COALESCE(ai_summary_generated_at, updated_at, created_at),
  ai_summary_text, what_we_found_text, what_we_will_do_text,
  what_you_get_text, problem_analysis_content, demolition_content,
  CASE WHEN ai_summary_approved THEN updated_at ELSE NULL END,
  CASE WHEN ai_summary_approved THEN last_edited_by ELSE NULL END
FROM public.inspections
WHERE ai_summary_text IS NOT NULL
   OR what_we_found_text IS NOT NULL
   OR what_we_will_do_text IS NOT NULL
   OR what_you_get_text IS NOT NULL
   OR problem_analysis_content IS NOT NULL
   OR demolition_content IS NOT NULL;

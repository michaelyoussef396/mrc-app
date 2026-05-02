-- Phase 3 Stage 3.5 step C — DESTRUCTIVE: drop legacy inspections.ai_summary_* columns
--
-- IRREVERSIBLE WITHOUT SNAPSHOT RESTORE.
--
-- Preconditions verified before this migration:
--   - Backfill migration 20260502100028_phase3_stage_3_5_backfill_ai_summary_versions applied
--   - 2 rows in public.ai_summary_versions, both generation_type='initial' v1
--   - Local snapshot phase3-stage-3.5-snapshot-pre-backfill.json (gitignored)
--   - Supabase automated backups remain primary recovery
--   - All consumer migrations from PR #47 read via latest_ai_summary view, not these columns
--   - Final consumer-audit re-grep: 0 inspections-table operations reference dropped columns
--
-- IF EXISTS on regeneration_feedback: pre-flight confirmed this column was never
-- created (per Phase 1 Stage 1.3 footnote — was a wired-but-not-implemented form
-- state stub that never had a backing column). The other 8 columns are explicit
-- DROP COLUMN since their existence is verified.
--
-- Backfilled inspection IDs (audit trail):
--   - 1c29e606-ae24-4aec-90c3-229782d8a9d0 (lead 21a9568d-7a28-4816-aa2b-02e61371f1e3)
--   - c61ffdf4-f42a-47a7-b579-1afa75a250db (lead 85fca3d1-f30b-4942-ba6c-f9c7d27269d8)

ALTER TABLE public.inspections
  DROP COLUMN ai_summary_text,
  DROP COLUMN ai_summary_approved,
  DROP COLUMN ai_summary_generated_at,
  DROP COLUMN what_we_found_text,
  DROP COLUMN what_we_will_do_text,
  DROP COLUMN what_you_get_text,
  DROP COLUMN problem_analysis_content,
  DROP COLUMN demolition_content,
  DROP COLUMN IF EXISTS regeneration_feedback;

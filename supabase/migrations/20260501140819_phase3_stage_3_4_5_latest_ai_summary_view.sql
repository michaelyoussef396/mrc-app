-- Phase 3 Stage 3.4.5 — latest_ai_summary compatibility view
--
-- Returns the single most-recent ai_summary_versions row per inspection.
-- Consumers migrating off the legacy inspections.ai_summary_* columns read
-- through this view. RLS inherits from ai_summary_versions
-- (SECURITY INVOKER, the default for views in Postgres), so admins see all
-- and technicians see only their assigned inspections — identical to the
-- underlying table's policies.
--
-- DISTINCT ON (inspection_id) ORDER BY inspection_id, version_number DESC
-- picks the highest version_number per inspection. After the supersession
-- invariant holds (each inspection has at most one row with
-- superseded_at IS NULL), this is equivalent to a WHERE superseded_at IS NULL
-- filter, but DISTINCT ON is safer because it doesn't depend on the
-- supersession update succeeding (which is best-effort in the EF).

CREATE VIEW public.latest_ai_summary AS
SELECT DISTINCT ON (inspection_id) *
FROM public.ai_summary_versions
ORDER BY inspection_id, version_number DESC;

-- Grant explicit SELECT to authenticated; RLS on the underlying table still
-- gates row visibility per the existing policies.
GRANT SELECT ON public.latest_ai_summary TO authenticated;

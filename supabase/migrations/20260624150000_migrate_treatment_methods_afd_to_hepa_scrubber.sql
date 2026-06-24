-- PENDING — REVIEW + APPLY MANUALLY IN SUPABASE STUDIO (do not auto-apply).
--
-- Part of the AFD → HEPA Air Scrubber rename (Glen + Clayton approved, 2026-06-24).
--
-- WHAT: Rewrites the persisted treatment-method label 'AFD Installation' to
--       'HEPA Air Scrubber Installation' inside the inspections.treatment_methods
--       text[] array. The frontend (SHARED_TREATMENT_METHODS / ReportPreviewHTML /
--       InspectionDataDisplay) and the generate-inspection-pdf Edge Function were
--       updated to the new string in the same change.
--
-- WHY:  treatment_methods stores the literal label strings and the EF matches them
--       against STEP_DESCRIPTIONS keys to render the customer PDF. Without this data
--       migration, inspections created before the code change keep the old string —
--       their toggle would read as un-set on reload. The EF retains a legacy
--       'AFD Installation' alias so un-migrated rows still render until this runs.
--
-- ORDERING: safe to run any time AFTER the code change ships. After it runs, the
--           EF's legacy 'AFD Installation' alias can be removed in a later cleanup.
--
-- REVERSIBLE: swap the two string literals in the UPDATE below to undo.

UPDATE public.inspections
SET treatment_methods = array_replace(
      treatment_methods,
      'AFD Installation',
      'HEPA Air Scrubber Installation'
    )
WHERE treatment_methods @> ARRAY['AFD Installation']::text[];

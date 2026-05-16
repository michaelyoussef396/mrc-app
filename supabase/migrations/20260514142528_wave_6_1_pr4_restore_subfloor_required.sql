-- Wave 6.1 PR #4: Restore inspections.subfloor_required column.
-- Column was dropped in Wave 6 Phase 5 (commit 0a2b473) on the false assumption
-- it was dead. Re-adding to support BUG-040 fix (subfloor toggle on form).
-- Tristate semantics: null = not yet determined; true = subfloor present;
-- false = no subfloor. All existing rows initialised to null per Wave 6.1 PR #4 brief.

-- Snapshot (no historical data to preserve since column was dropped, but follow
-- the snapshot convention anyway)
CREATE TABLE IF NOT EXISTS inspections_subfloor_required_restore_backup AS
SELECT id, created_at FROM public.inspections;

-- Restore column
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS subfloor_required boolean DEFAULT NULL;

COMMENT ON COLUMN public.inspections.subfloor_required IS
  'Tristate: null=not yet determined; true=subfloor present; false=no subfloor. Restored in Wave 6.1 PR #4 after erroneous drop in Wave 6 Phase 5.';

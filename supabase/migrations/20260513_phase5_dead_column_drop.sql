-- Migration: Phase 5 — Dead column drop
-- Created: 2026-05-13
-- Author: database-specialist agent
--
-- Purpose:
-- Removes 35 orphaned columns across 5 tables identified by the Phase 3.5 v2
-- wiring audit. Every column in this migration was confirmed to have no active
-- write path in the current codebase (post-Phase 4). Snapshot backup tables
-- were created on 2026-05-13 before this migration was drafted.
--
-- Backup tables (30-day retention, do NOT drop before 2026-06-13):
--   leads_dead_col_drop_backup_20260513          (19 rows)
--   inspections_dead_col_drop_backup_20260513     (2 rows)
--   inspection_areas_dead_col_drop_backup_20260513 (2 rows)
--   subfloor_data_dead_col_drop_backup_20260513   (2 rows)
--   moisture_readings_dead_col_drop_backup_20260513 (4 rows)
--
-- See docs/testing/01_DESKTOP-13-05-2026.md Phase 3.5 v2 audit for
-- column-by-column rationale and Phase 5c cleanup scope sheet.
--
-- PHASE 5C CODE CLEANUP REQUIRED (after this migration is applied):
--   See Step 4 findings in the agent report for the full list.
--   Critical items before applying:
--   1. generate-inspection-pdf EF: remove mould_* booleans from InspectionArea
--      interface and the legacy Priority 3 fallback in getMouldDescription()
--      (lines 44-67, 213-227). The function silently returns '' for all new
--      records after the drop; old records use mould_visible_locations which
--      already takes Priority 1.
--   2. generate-inspection-pdf EF: remove inspection_start_time from Inspection
--      interface (line 108). Field is declared but never read in generateReportHtml().
--   3. generate-inspection-pdf EF: subfloor_required is READ at lines 1456 and
--      1715 to gate subfloor page rendering and data fetch. The column MUST
--      remain mapped to something. Two options:
--        A) PREFERRED: Replace subfloor_required read with a live DB check
--           (subfloor_data row exists for this inspection_id).
--        B) Keep column but rename semantics to is_subfloor_inspection.
--      DO NOT drop subfloor_required until one of these is implemented.
--   4. TechnicianInspectionForm.tsx save payload (handleSave ~line 3458):
--      writes subfloor_required, drying_equipment_enabled, manual_price_override,
--      commercial_dehumidifier_enabled, air_movers_enabled, rcd_box_enabled.
--      All must be removed from inspectionRow before the DROP runs.
--   5. TechnicianInspectionForm.tsx load path (~line 2812-2829): reads
--      drying_equipment_enabled, manual_price_override,
--      commercial_dehumidifier_enabled, air_movers_enabled, rcd_box_enabled
--      when mapping DB row to formData. Remove after drop.
--   6. TechnicianInspectionForm.tsx areaRow save (line 3554): hardcodes
--      moisture_readings_enabled: true — remove after drop.
--   7. calculate_moisture_status() function: must be dropped before
--      DROP TYPE moisture_status. Included in this migration.
--
-- ROLLBACK:
-- There is no automatic rollback for column drops. To restore data:
--   1. Re-add the columns: ALTER TABLE <table> ADD COLUMN <col> <type>;
--   2. Restore from backup: UPDATE <table> t SET t.<col> = b.<col>
--      FROM <table>_dead_col_drop_backup_20260513 b WHERE t.id = b.id;
--
-- !! DO NOT APPLY UNTIL !!
-- Pause Point #2: Michael has given explicit "go" approval
-- Phase 5c code cleanup is complete and deployed
-- subfloor_required replacement strategy is implemented (see note 3 above)

BEGIN;

-- ============================================
-- SECTION 1: leads (1 column)
-- ============================================
-- urgency: non-null count = 0. No code references found.
-- Safe to drop.

ALTER TABLE leads
  DROP COLUMN IF EXISTS urgency;

-- ============================================
-- SECTION 2: inspections (19 columns)
-- ============================================
-- HOLD — subfloor_required: non-null count = 2, active READ in generate-inspection-pdf
--   EF at lines 1456 and 1715. Dropping without a replacement will break subfloor
--   page rendering in the customer PDF for all inspections.
--   subfloor_required is included below behind IF EXISTS for safety but MUST NOT
--   be executed until Phase 5c item #3 is resolved.
--
-- selected_job_type: non-null count = 0, enum type job_type — safe to drop.
-- inspection_start_time: non-null count = 1 (value: "00:03:59", likely test data).
--   Declared in EF Inspection interface but never read in generateReportHtml().
--   Safe to drop; the one non-null row is backed up.
-- property_address_snapshot: non-null count = 0 — safe to drop.
-- construction_hours: non-null count = 2 (default value = 0, no real data) — safe.
-- drying_equipment_enabled: non-null count = 2 (boolean with default false),
--   WRITE in TIF handleSave line 3446. Requires Phase 5c cleanup first.
-- manual_price_override: non-null count = 2 (one row = true),
--   WRITE in TIF handleSave line 3478 (as manual_labour_override, different column —
--   confirmed manual_price_override is the dead column, manual_labour_override is live).
--   READ in TIF load path line 2829. Requires Phase 5c cleanup first.
-- dehumidifier_rate/air_mover_rate/rcd_rate: non-null count = 2 (default values only,
--   132/46/5 — no user-set values). No code write path found. Safe to drop.
-- non_demo_labour_rate/demo_labour_rate/subfloor_labour_rate: non-null count = 2
--   (default 154.00 — no user-set values). No code write path found. Safe to drop.
-- equipment_cost_inc_gst/estimated_cost_ex_gst/estimated_cost_inc_gst:
--   non-null count = 0 — safe to drop.
-- commercial_dehumidifier_enabled/air_movers_enabled/rcd_box_enabled:
--   non-null count = 2 (boolean defaults), WRITE in TIF handleSave lines 3447/3449/3451.
--   Requires Phase 5c cleanup first.

-- All 19 inspections columns dropped atomically per Michael's approval (2026-05-13).
-- Phase 5c code cleanup completed: TIF writes removed, EF reads replaced
-- with subfloorData != null gating, manual_price_override row reconciled to
-- manual_labour_override (id 1c29e606-ae24-4aec-90c3-229782d8a9d0).
ALTER TABLE inspections
  DROP COLUMN IF EXISTS selected_job_type,
  DROP COLUMN IF EXISTS inspection_start_time,
  DROP COLUMN IF EXISTS property_address_snapshot,
  DROP COLUMN IF EXISTS construction_hours,
  DROP COLUMN IF EXISTS dehumidifier_rate,
  DROP COLUMN IF EXISTS air_mover_rate,
  DROP COLUMN IF EXISTS rcd_rate,
  DROP COLUMN IF EXISTS non_demo_labour_rate,
  DROP COLUMN IF EXISTS demo_labour_rate,
  DROP COLUMN IF EXISTS subfloor_labour_rate,
  DROP COLUMN IF EXISTS equipment_cost_inc_gst,
  DROP COLUMN IF EXISTS estimated_cost_ex_gst,
  DROP COLUMN IF EXISTS estimated_cost_inc_gst,
  DROP COLUMN IF EXISTS subfloor_required,
  DROP COLUMN IF EXISTS drying_equipment_enabled,
  DROP COLUMN IF EXISTS manual_price_override,
  DROP COLUMN IF EXISTS commercial_dehumidifier_enabled,
  DROP COLUMN IF EXISTS air_movers_enabled,
  DROP COLUMN IF EXISTS rcd_box_enabled;

-- ============================================
-- SECTION 3: inspection_areas (14 columns)
-- ============================================
-- comments_approved: non-null count = 2 (default false). No code write path.
-- moisture_readings_enabled: non-null count = 2 (default false / set to true hardcoded
--   in TIF areaRow save line 3554). Requires Phase 5c cleanup (remove the write).
--   Also declared in generate-inspection-pdf EF InspectionArea interface line 68 —
--   but only used structurally, not read in template logic. Safe after write removed.
-- mould_* 12 booleans: non-null count = 2 each (all default false — no real data).
--   Used as legacy Priority 3 fallback in generate-inspection-pdf getMouldDescription()
--   lines 215-227. Since Priority 1 (mould_visible_locations JSONB) exists and all
--   production records use it, the fallback returns '' for new records. The drop is
--   safe after Phase 5c removes the fallback code from the EF.
--   Note: these 12 columns are included in the drop below; the EF fallback code
--   must be cleaned up in Phase 5c regardless.

ALTER TABLE inspection_areas
  DROP COLUMN IF EXISTS comments_approved,
  DROP COLUMN IF EXISTS moisture_readings_enabled,
  DROP COLUMN IF EXISTS mould_ceiling,
  DROP COLUMN IF EXISTS mould_walls,
  DROP COLUMN IF EXISTS mould_flooring,
  DROP COLUMN IF EXISTS mould_cornice,
  DROP COLUMN IF EXISTS mould_skirting,
  DROP COLUMN IF EXISTS mould_windows,
  DROP COLUMN IF EXISTS mould_window_furnishings,
  DROP COLUMN IF EXISTS mould_grout_silicone,
  DROP COLUMN IF EXISTS mould_cupboard,
  DROP COLUMN IF EXISTS mould_wardrobe,
  DROP COLUMN IF EXISTS mould_contents,
  DROP COLUMN IF EXISTS mould_none_visible;

-- ============================================
-- SECTION 4: subfloor_data (1 column)
-- ============================================
-- racking_required: non-null count = 2 (both rows = true — real data).
--   Migration file 20260304000001_drop_racking_required.sql exists in repo
--   but was NEVER applied to production (confirmed via list_migrations).
--   Data backed up. No code read/write path found.

ALTER TABLE subfloor_data
  DROP COLUMN IF EXISTS racking_required;

-- ============================================
-- SECTION 5: moisture_readings (1 column + function + type)
-- ============================================
-- moisture_status: non-null count = 2 (values: 'dry', 'elevated').
--   No active write path in TIF save — readings are written without moisture_status.
--   The calculate_moisture_status() function returns this type but is never called
--   from application code (no references in src/ or supabase/functions/).
--   Data backed up.
--
-- Drop order: column first, then function (has type dependency), then type.

ALTER TABLE moisture_readings
  DROP COLUMN IF EXISTS moisture_status;

-- Drop the function that depends on the type (must precede DROP TYPE)
DROP FUNCTION IF EXISTS public.calculate_moisture_status(numeric);

-- Drop the enum type (now has no column or function consumers)
DROP TYPE IF EXISTS public.moisture_status;

-- ============================================
-- SECTION 6: job_type enum
-- ============================================
-- selected_job_type column dropped above (SECTION 2).
-- job_type enum: only consumer was selected_job_type on inspections.
-- Safe to drop once the column is gone.

DROP TYPE IF EXISTS public.job_type;

COMMIT;

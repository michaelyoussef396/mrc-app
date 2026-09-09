-- =============================================================================
-- inspections: four independent equipment hire periods                  [P2-3]
--
-- STATUS: NOT APPLIED ANYWHERE. Written 2026-09-08 on branch
--   feat/per-item-equipment-days. Not applied to DEV, not applied to PROD, not
--   registered in migration history, never run through `db push`.
--
-- Apply ONLY on Michael's explicit APPLY, by hand in the Studio SQL editor.
-- State the target ref AND its role in plain English first and get explicit
-- confirmation, per CLAUDE.md:
--   DEV  ctppzqnysmzynkxjlzta — sandbox clone (ap-southeast-1). Safe to break.
--   PROD ecyivrxjpsmjmexqatym — LIVE. mrcsystem.com. Real customer path.
-- Never `db push`, `db reset` or `migration repair` — the migration history is
-- forked 100+ files deep and a push would replay all of it.
--
-- RUN AS ONE WHOLE PASTE, never a highlighted selection. Section 3 run alone is
-- an unguarded, irreversible overwrite, and the SET LOCAL lines are no-ops
-- unless the whole file executes inside the BEGIN below.
--
-- WHY: inspections holds ONE shared equipment_days covering dehumidifier, air
-- mover and RCD. job_completions holds FOUR independent actuals and the invoice
-- bills off those, so for three of the four items the customer is billed against
-- a quoted figure that was never specific to that item.
--
-- equipment_days is KEPT: not dropped, not renamed, its type / DEFAULT 1 /
-- CHECK (equipment_days >= 1) unchanged. Section 3 does physically rewrite the
-- table, so its stored bytes move; its values do not.
--
-- THERE IS NO `UPDATE` IN THIS FILE, deliberately. inspections carries
-- update_inspections_updated_at (BEFORE UPDATE ROW -> NEW.updated_at = NOW())
-- and audit_inspections_update (AFTER UPDATE ROW -> audit_log_trigger). A
-- backfill UPDATE would stamp updated_at = today on 100% of inspections and
-- write one audit_logs row per inspection, each holding two row_to_json copies
-- of a 95-column row, user_id NULL. ALTER TABLE rewrites run below the trigger
-- layer and fire neither.
--
-- Full derivation, the V0/V1 proof queries, and the findings deferred out of
-- this file: docs/sessions/2026-09-08-feat-per-item-equipment-days.md.
-- =============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

-- --- 1. The three per-item hire periods --------------------------------------
-- Bare nullable INTEGER, mirroring hepa_air_scrubber_days
-- (20260728120000_hepa_quote_columns.sql), which is already per-item and is
-- deliberately untouched. Names mirror this table's own qty columns, not the
-- singular job_completions actuals.
-- This takes ACCESS EXCLUSIVE and the transaction holds it to COMMIT.
-- lock_timeout bounds only the wait to ACQUIRE it here; statement_timeout is per
-- statement, so worst-case hold is roughly the sum of sections 2-4. Apply out of
-- hours.
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS commercial_dehumidifier_days INTEGER,
  ADD COLUMN IF NOT EXISTS air_movers_days              INTEGER,
  ADD COLUMN IF NOT EXISTS rcd_box_days                 INTEGER;

-- --- 2. Pre-condition: refuse to overwrite real per-item data -----------------
-- Section 3 copies unconditionally; on a second run that would clobber genuine
-- per-item values. The file is one transaction, so a failed run leaves no
-- columns behind — if these are ever found populated, it already succeeded once.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.inspections
             WHERE commercial_dehumidifier_days IS NOT NULL
                OR air_movers_days IS NOT NULL
                OR rcd_box_days IS NOT NULL) THEN
    RAISE EXCEPTION 'per-item day columns already carry data - refusing to overwrite them from equipment_days';
  END IF;
END $$;

-- --- 3. Backfill from the shared period, trigger-free -------------------------
-- A USING expression that is not the identity of the column being altered forces
-- a table rewrite, and that rewrite assigns each new column from equipment_days
-- row by row without firing a row trigger. NULL copies through as NULL. If a
-- USING below is ever changed to name its own column, or dropped, this statement
-- still SUCCEEDS and copies nothing — hence section 3b.
ALTER TABLE public.inspections
  ALTER COLUMN commercial_dehumidifier_days TYPE INTEGER USING equipment_days,
  ALTER COLUMN air_movers_days              TYPE INTEGER USING equipment_days,
  ALTER COLUMN rcd_box_days                 TYPE INTEGER USING equipment_days;

-- --- 3b. Post-condition: prove the copy actually happened ---------------------
-- That rewrite behaviour could not be exercised before writing this file: there
-- is no Postgres an agent session can reach on this machine. So assert it
-- in-transaction rather than trust it — as GUARD 2 in 20260828120000 does.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.inspections
   WHERE commercial_dehumidifier_days IS DISTINCT FROM equipment_days
      OR air_movers_days              IS DISTINCT FROM equipment_days
      OR rcd_box_days                 IS DISTINCT FROM equipment_days;
  IF n > 0 THEN
    RAISE EXCEPTION 'rewrite did not copy equipment_days on % row(s) - rolling back', n;
  END IF;
END $$;

-- --- 4. Which hire-period model a row was quoted under ------------------------
-- ADD COLUMN with a constant DEFAULT is catalog-only in PG 11+: it flags every
-- existing row 'shared' without touching a heap page or firing a trigger. Must
-- stay AFTER section 3 — a rewrite materialises the stored missing value.
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS equipment_days_source TEXT NOT NULL DEFAULT 'shared';

-- Constraint named separately so the ADD COLUMN stays IF NOT EXISTS safe,
-- matching 20260524044234_pdf_versions_pipeline_columns.sql.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.inspections'::regclass
                   AND conname  = 'inspections_equipment_days_source_check') THEN
    ALTER TABLE public.inspections
      ADD CONSTRAINT inspections_equipment_days_source_check
      CHECK (equipment_days_source IN ('shared', 'per_item'));
  END IF;
END $$;

-- HAZARD — WHY THE DEFAULT STAYS 'shared'. The flip to DEFAULT 'per_item' is
-- deliberately NOT in this migration. It is one statement — ALTER COLUMN
-- equipment_days_source SET DEFAULT 'per_item' — and it ships in the SAME WAVE
-- as the form writer that populates the three day columns, not before.
-- Until that writer exists, TechnicianInspectionForm.tsx:4162 saves
-- equipment_days and nothing else, so a newly created inspection carries one
-- shared hire period and three NULL day columns. That IS a shared-model row.
-- 'shared' is not a placeholder standing in for the real value here — it is the
-- true value for every row written until the writer lands. Defaulting to
-- 'per_item' would make the column assert a per-item choice nobody made, and a
-- reader gated on the flag would price dehumidifier, air mover and RCD at zero
-- days on a quote the customer had already been sent.

COMMENT ON COLUMN public.inspections.commercial_dehumidifier_days IS
  'Quoted Commercial Dehumidifier hire days ($119/unit/day). Pairs with commercial_dehumidifier_qty. Copied from equipment_days on rows quoted under the shared model — check equipment_days_source before reading it as a per-item choice. No CHECK: unlike equipment_days there is no >= 1 floor.';
COMMENT ON COLUMN public.inspections.air_movers_days IS
  'Quoted Air Mover hire days ($46/unit/day). Pairs with air_movers_qty. Copied from equipment_days on rows quoted under the shared model — check equipment_days_source before reading it as a per-item choice.';
COMMENT ON COLUMN public.inspections.rcd_box_days IS
  'Quoted RCD Box hire days ($5/unit/day). Pairs with rcd_box_qty. Copied from equipment_days on rows quoted under the shared model — check equipment_days_source before reading it as a per-item choice.';
COMMENT ON COLUMN public.inspections.equipment_days_source IS
  'Which model commercial_dehumidifier_days / air_movers_days / rcd_box_days were quoted under. shared = copied from equipment_days by this migration, never chosen per item. per_item = set independently. Says nothing about hepa_air_scrubber_days, already per-item, nor about equipment_days, retained either way.';

COMMIT;

-- Outside the transaction so it does not extend the ACCESS EXCLUSIVE hold; the
-- rewrite leaves the four new columns with no statistics.
ANALYZE public.inspections;

-- =============================================================================
-- ROLLBACK (do NOT run unless reverting this migration)
--   BEGIN;
--   SET LOCAL lock_timeout = '5s';
--   SET LOCAL statement_timeout = '60s';
--   ALTER TABLE public.inspections
--     DROP COLUMN IF EXISTS commercial_dehumidifier_days,
--     DROP COLUMN IF EXISTS air_movers_days,
--     DROP COLUMN IF EXISTS rcd_box_days,
--     DROP COLUMN IF EXISTS equipment_days_source;
--   COMMIT;
-- Dropping equipment_days_source drops its CHECK with it. Lossless ONLY while
--   SELECT count(*) FROM public.inspections WHERE equipment_days_source <> 'shared'
-- returns 0; once the per-item writer ships these columns are the sole record of
-- per-item choices and dropping them destroys quoted data.
--
-- VERIFICATION — V0 before, V1 after, both in full in the session log above. V0
-- records a timestamp t0 and V1 pins every check to it, because on a live
-- database an ordinary inspection save between the two runs reads exactly like a
-- fired trigger. Take the definitive reading on DEV, where there is no traffic.
-- =============================================================================

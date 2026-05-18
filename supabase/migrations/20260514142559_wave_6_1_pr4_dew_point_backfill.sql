-- Wave 6.1 PR #4: Backfill dew_point columns using the existing dead
-- public.calculate_dew_point() PG function (Magnus formula, a=17.27, b=237.7
-- per migration 20251028135212:831-844).
-- "Revival" = first call site of the function; definition unchanged.
-- New inspections going forward use JS Magnus-Tetens with Alduchov-Eskridge
-- 1996 constants (a=17.625, b=243.04). Divergence between JS and PG
-- formulas is <0.5°C in typical conditions and acceptable for historical
-- backfill. Documented in PR #4 description.

-- Snapshot inspection_areas before backfill
CREATE TABLE IF NOT EXISTS inspection_areas_dew_point_backfill_backup AS
SELECT id, temperature, humidity, dew_point FROM public.inspection_areas;

-- Snapshot inspections.outdoor_dew_point before backfill
CREATE TABLE IF NOT EXISTS inspections_outdoor_dew_point_backup AS
SELECT id, outdoor_temperature, outdoor_humidity, outdoor_dew_point FROM public.inspections;

-- Backfill inspection_areas.dew_point
UPDATE public.inspection_areas
SET dew_point = public.calculate_dew_point(temperature::numeric, humidity::numeric)
WHERE temperature IS NOT NULL
  AND humidity IS NOT NULL
  AND humidity > 0
  AND humidity <= 100;

-- Backfill inspections.outdoor_dew_point
UPDATE public.inspections
SET outdoor_dew_point = public.calculate_dew_point(outdoor_temperature::numeric, outdoor_humidity::numeric)
WHERE outdoor_temperature IS NOT NULL
  AND outdoor_humidity IS NOT NULL
  AND outdoor_humidity > 0
  AND outdoor_humidity <= 100;

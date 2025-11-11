-- Migration: Create travel time and zone helper functions
-- Phase: 2B.3 & 2B.4 - CRITICAL FEATURE (BLOCKING)
-- Priority: P0
-- Created: 2025-11-11
-- Description: Create helper functions for travel time calculation and zone lookup
--              Required for: calendar conflict detection, scheduling, pricing

-- =============================================================================
-- Function 1: calculate_travel_time()
-- =============================================================================
-- Calculates travel time between two zones using a 4x4 matrix
-- Returns: Integer (minutes)
-- Usage: SELECT calculate_travel_time(1, 4); -- Returns 60 minutes

CREATE OR REPLACE FUNCTION calculate_travel_time(
  zone_from INTEGER,
  zone_to INTEGER
) RETURNS INTEGER AS $$
BEGIN
  -- Validate zone inputs (1-4)
  IF zone_from < 1 OR zone_from > 4 OR zone_to < 1 OR zone_to > 4 THEN
    RAISE EXCEPTION 'Invalid zone: Zones must be between 1 and 4';
  END IF;

  -- 4×4 travel time matrix (minutes)
  -- Rows = From Zone, Columns = To Zone
  RETURN CASE zone_from
    -- From Zone 1 (CBD): 15, 30, 45, 60 minutes
    WHEN 1 THEN CASE zone_to
      WHEN 1 THEN 15  -- CBD to CBD
      WHEN 2 THEN 30  -- CBD to Inner
      WHEN 3 THEN 45  -- CBD to Middle
      WHEN 4 THEN 60  -- CBD to Outer
    END

    -- From Zone 2 (Inner): 30, 20, 40, 55 minutes
    WHEN 2 THEN CASE zone_to
      WHEN 1 THEN 30  -- Inner to CBD
      WHEN 2 THEN 20  -- Inner to Inner
      WHEN 3 THEN 40  -- Inner to Middle
      WHEN 4 THEN 55  -- Inner to Outer
    END

    -- From Zone 3 (Middle): 45, 40, 25, 45 minutes
    WHEN 3 THEN CASE zone_to
      WHEN 1 THEN 45  -- Middle to CBD
      WHEN 2 THEN 40  -- Middle to Inner
      WHEN 3 THEN 25  -- Middle to Middle
      WHEN 4 THEN 45  -- Middle to Outer
    END

    -- From Zone 4 (Outer): 60, 55, 45, 30 minutes
    WHEN 4 THEN CASE zone_to
      WHEN 1 THEN 60  -- Outer to CBD
      WHEN 2 THEN 55  -- Outer to Inner
      WHEN 3 THEN 45  -- Outer to Middle
      WHEN 4 THEN 30  -- Outer to Outer
    END
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add function comment
COMMENT ON FUNCTION calculate_travel_time IS
  'Calculates travel time in minutes between two Melbourne zones (1-4).
   Zone 1 = CBD & Inner City, Zone 2 = Inner Suburbs,
   Zone 3 = Middle Suburbs, Zone 4 = Outer Suburbs.
   Returns average travel time without traffic.';

-- =============================================================================
-- Function 2: get_zone_by_suburb()
-- =============================================================================
-- Looks up zone number for a given suburb name
-- Returns: Integer (1-4) or NULL if suburb not found
-- Usage: SELECT get_zone_by_suburb('Carlton'); -- Returns 1

CREATE OR REPLACE FUNCTION get_zone_by_suburb(suburb_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  zone_number INTEGER;
BEGIN
  -- Case-insensitive lookup
  SELECT zone INTO zone_number
  FROM suburb_zones
  WHERE LOWER(suburb) = LOWER(suburb_name)
  LIMIT 1;

  -- Return zone or NULL if not found
  RETURN zone_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add function comment
COMMENT ON FUNCTION get_zone_by_suburb IS
  'Looks up the travel zone (1-4) for a given Melbourne suburb name.
   Search is case-insensitive. Returns NULL if suburb not found.
   Use this to determine zone before calculating travel times.';

-- =============================================================================
-- Function 3: get_suburb_details()
-- =============================================================================
-- Returns complete suburb information including zone, postcode, region
-- Returns: TABLE (suburb, postcode, zone, region, notes)
-- Usage: SELECT * FROM get_suburb_details('Carlton');

CREATE OR REPLACE FUNCTION get_suburb_details(suburb_name TEXT)
RETURNS TABLE (
  suburb TEXT,
  postcode TEXT,
  zone INTEGER,
  region TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sz.suburb,
    sz.postcode,
    sz.zone,
    sz.region,
    sz.notes
  FROM suburb_zones sz
  WHERE LOWER(sz.suburb) = LOWER(suburb_name)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add function comment
COMMENT ON FUNCTION get_suburb_details IS
  'Returns complete information for a suburb including zone, postcode, region, and notes.
   Search is case-insensitive. Returns empty result if suburb not found.';

-- =============================================================================
-- Verification Queries (commented out, run manually to test)
-- =============================================================================

-- Test calculate_travel_time function
-- SELECT calculate_travel_time(1, 1) as cbd_to_cbd;          -- Expected: 15
-- SELECT calculate_travel_time(1, 4) as cbd_to_outer;        -- Expected: 60
-- SELECT calculate_travel_time(4, 1) as outer_to_cbd;        -- Expected: 60
-- SELECT calculate_travel_time(2, 3) as inner_to_middle;     -- Expected: 40

-- Test get_zone_by_suburb function
-- SELECT get_zone_by_suburb('Carlton') as carlton_zone;      -- Expected: 1
-- SELECT get_zone_by_suburb('FRANKSTON') as frankston_zone;  -- Expected: 3 (case insensitive)
-- SELECT get_zone_by_suburb('Mernda') as mernda_zone;        -- Expected: 4
-- SELECT get_zone_by_suburb('Unknown') as unknown;           -- Expected: NULL

-- Test get_suburb_details function
-- SELECT * FROM get_suburb_details('Melbourne');
-- SELECT * FROM get_suburb_details('Brighton');

-- Real-world scenario: Calculate travel from Carlton to Mernda
-- SELECT
--   'Carlton' as from_suburb,
--   get_zone_by_suburb('Carlton') as from_zone,
--   'Mernda' as to_suburb,
--   get_zone_by_suburb('Mernda') as to_zone,
--   calculate_travel_time(
--     get_zone_by_suburb('Carlton'),
--     get_zone_by_suburb('Mernda')
--   ) as travel_time_minutes;
-- Expected result: Zone 1 → Zone 4 = 60 minutes

-- Migration: Fix column names in check_booking_conflicts function
-- Phase: 2E - CRITICAL FIX
-- Priority: HIGH
-- Created: 2025-11-11
-- Description: Update function to use correct leads table columns
--              full_name instead of customer_name
--              property_address_suburb instead of property_suburb

-- =============================================================================
-- Replace check_booking_conflicts() with correct column names
-- =============================================================================

CREATE OR REPLACE FUNCTION check_booking_conflicts(
  p_technician_ids UUID[],
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
  booking_id UUID,
  technician_id UUID,
  conflict_start TIMESTAMPTZ,
  conflict_end TIMESTAMPTZ,
  lead_id UUID,
  customer_name TEXT,
  property_suburb TEXT
) AS $$
BEGIN
  -- sql-pro: Using explicit RETURN QUERY with CTE for readability
  RETURN QUERY
  WITH potential_conflicts AS (
    -- Find all bookings for specified technicians
    SELECT
      ce.id,
      ce.assigned_to,
      ce.start_datetime,
      ce.end_datetime,
      ce.lead_id
    FROM calendar_events ce
    WHERE
      -- Technician is in the provided list
      ce.assigned_to = ANY(p_technician_ids)
      -- Exclude the booking we're checking (for updates)
      AND (p_exclude_booking_id IS NULL OR ce.id != p_exclude_booking_id)
      -- Only check active bookings (not cancelled/completed)
      AND ce.status NOT IN ('cancelled', 'completed')
      -- Check for time overlap using PostgreSQL's overlap operator
      AND (ce.start_datetime, ce.end_datetime) OVERLAPS (p_start_time, p_end_time)
  )
  SELECT
    pc.id,
    pc.assigned_to,
    pc.start_datetime,
    pc.end_datetime,
    pc.lead_id,
    COALESCE(l.full_name, 'Unknown') as customer_name,
    COALESCE(l.property_address_suburb, 'Unknown') as property_suburb
  FROM potential_conflicts pc
  LEFT JOIN leads l ON pc.lead_id = l.id
  ORDER BY pc.start_datetime;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update function comment
COMMENT ON FUNCTION check_booking_conflicts IS
  'Detects overlapping calendar bookings for specified technicians.
   Uses PostgreSQL OVERLAPS operator for accurate interval detection.
   Returns enriched results with customer info (full_name, property_address_suburb).
   sql-pro: CTE for readability, STABLE for query planner optimization.
   FIXED: Updated to use correct leads table column names.';

-- =============================================================================
-- Verification query (run manually to test)
-- =============================================================================

-- Test booking conflicts (replace with your actual UUID)
-- SELECT * FROM check_booking_conflicts(
--   ARRAY['bef0e406-68bd-4c31-a504-dbfc68069c71']::UUID[],
--   NOW(),
--   NOW() + INTERVAL '2 hours',
--   NULL
-- );
-- Expected: Rows with correct customer_name and property_suburb columns

-- =============================================================================
-- Column mapping summary
-- =============================================================================
-- ✅ customer_name now uses leads.full_name
-- ✅ property_suburb now uses leads.property_address_suburb
-- ✅ Function signature unchanged (backwards compatible)

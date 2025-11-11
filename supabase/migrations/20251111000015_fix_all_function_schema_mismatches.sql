-- Migration: Fix ALL schema mismatches in helper functions
-- Phase: 2E - CRITICAL FIX
-- Priority: P0
-- Created: 2025-11-11
-- Description: Corrects TWO types of schema issues in helper functions:
--              1. Data type mismatches (VARCHAR vs TEXT in return types)
--              2. Column name errors (property_suburb vs property_address_suburb)
--
-- Functions Fixed:
--   - check_booking_conflicts(): Return type mismatches + column references
--   - has_travel_time_conflict(): Column name error (property_suburb does not exist)

-- =============================================================================
-- ISSUE IDENTIFIED: Data Type Mismatches
-- =============================================================================
--
-- Problem: check_booking_conflicts() declares return columns as TEXT
--          but actual columns in leads table are VARCHAR(255) and VARCHAR(100)
--
-- PostgreSQL Error: "structure of query does not match function result type"
-- Detail: "Returned type character varying does not match expected type text in column 6"
--
-- Root Cause: PostgreSQL is strict about return type matching in RETURNS TABLE functions
--
-- Solution: Change return type declarations from TEXT to VARCHAR with matching lengths
--
-- =============================================================================

-- =============================================================================
-- Function 1: generate_inspection_number() - NO CHANGES NEEDED
-- =============================================================================
-- This function is working correctly
-- Returns: TEXT (no table column dependencies)
-- Status: ✅ No changes required

-- =============================================================================
-- Function 2: check_booking_conflicts() - FIX VARCHAR vs TEXT MISMATCH
-- =============================================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS check_booking_conflicts(UUID[], TIMESTAMPTZ, TIMESTAMPTZ, UUID);

-- Recreate with corrected data types
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
  customer_name VARCHAR(255),      -- ✅ FIXED: Was TEXT, now VARCHAR(255) to match leads.full_name
  property_suburb VARCHAR(100)     -- ✅ FIXED: Was TEXT, now VARCHAR(100) to match leads.property_address_suburb
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
    COALESCE(l.full_name, 'Unknown')::VARCHAR(255) as customer_name,
    COALESCE(l.property_address_suburb, 'Unknown')::VARCHAR(100) as property_suburb
  FROM potential_conflicts pc
  LEFT JOIN leads l ON pc.lead_id = l.id
  ORDER BY pc.start_datetime;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function comment for documentation
COMMENT ON FUNCTION check_booking_conflicts IS
  'Detects overlapping calendar bookings for specified technicians.
   Uses PostgreSQL OVERLAPS operator for accurate interval detection.
   Returns enriched results with customer info for better UX.

   ✅ FIXED: Return types now match actual table column types:
      - customer_name: VARCHAR(255) (matches leads.full_name)
      - property_suburb: VARCHAR(100) (matches leads.property_address_suburb)

   sql-pro: CTE for readability, STABLE for query planner optimization.';

-- =============================================================================
-- Function 3: has_travel_time_conflict() - FIX COLUMN NAME
-- =============================================================================
-- This function does not return table columns directly (returns BOOLEAN)
-- BUT it references WRONG column name in SELECT query
--
-- ❌ ISSUE: Selects l.property_suburb (does not exist)
-- ✅ FIX: Should be l.property_address_suburb
--
-- Error: ERROR: 42703: column l.property_suburb does not exist
-- Location: Line 175 in original migration 011
-- Status: ⚠️ NEEDS FIX

-- Drop existing function first
DROP FUNCTION IF EXISTS has_travel_time_conflict(UUID, TIMESTAMPTZ, INTEGER);

-- Recreate with corrected column name
CREATE OR REPLACE FUNCTION has_travel_time_conflict(
  p_technician_id UUID,
  p_new_start_time TIMESTAMPTZ,
  p_new_zone INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_previous_booking RECORD;
  v_required_travel_minutes INTEGER;
  v_actual_gap_minutes NUMERIC;
  v_buffer_minutes INTEGER := 15; -- Safety buffer
BEGIN
  -- sql-pro: CTE pattern for finding previous booking
  -- Find the most recent booking before the new one
  SELECT
    ce.end_datetime,
    l.property_zone,
    l.property_address_suburb  -- ✅ FIXED: Was property_suburb, now property_address_suburb
  INTO v_previous_booking
  FROM calendar_events ce
  LEFT JOIN leads l ON ce.lead_id = l.id
  WHERE
    ce.assigned_to = p_technician_id
    AND ce.end_datetime <= p_new_start_time
    AND ce.status NOT IN ('cancelled', 'completed')
  ORDER BY ce.end_datetime DESC
  LIMIT 1;

  -- sql-pro: Explicit NULL handling - no previous booking means no conflict
  IF v_previous_booking IS NULL OR v_previous_booking.property_zone IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Calculate required travel time using existing helper function
  v_required_travel_minutes := calculate_travel_time(
    v_previous_booking.property_zone,
    p_new_zone
  );

  -- Add safety buffer for unpredictable delays
  v_required_travel_minutes := v_required_travel_minutes + v_buffer_minutes;

  -- Calculate actual time gap between bookings (in minutes)
  v_actual_gap_minutes := EXTRACT(EPOCH FROM (p_new_start_time - v_previous_booking.end_datetime)) / 60;

  -- sql-pro: Explicit comparison - return true if gap is insufficient
  RETURN v_actual_gap_minutes < v_required_travel_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function comment for documentation
COMMENT ON FUNCTION has_travel_time_conflict IS
  'Validates if technician has sufficient travel time between consecutive bookings.
   Includes 15-minute safety buffer for traffic/delays.
   Uses calculate_travel_time() for zone-based estimates.

   ✅ FIXED: Column reference corrected:
      - property_suburb → property_address_suburb (matches leads table)

   sql-pro: Explicit NULL handling, STABLE for optimization, proper interval math.';

-- =============================================================================
-- VERIFICATION: Test all functions
-- =============================================================================

-- Test 1: Generate inspection number (should work as before)
-- SELECT generate_inspection_number();
-- Expected: INS-20251111-XXX

-- Test 2: Check booking conflicts with real UUID (should now work without error)
-- Replace 'your-technician-uuid' with actual UUID from database
-- SELECT * FROM check_booking_conflicts(
--   ARRAY['bef0e406-68bd-4c31-a504-dbfc68069c71']::UUID[],
--   NOW(),
--   NOW() + INTERVAL '2 hours',
--   NULL
-- );
-- Expected: Returns table with VARCHAR columns (no type mismatch error)

-- Test 3: Check travel time conflict (should now work without column error)
-- SELECT has_travel_time_conflict(
--   'bef0e406-68bd-4c31-a504-dbfc68069c71'::UUID,
--   NOW() + INTERVAL '3 hours',
--   3
-- );
-- Expected: BOOLEAN result (true/false)
-- Previously failed with: ERROR: 42703: column l.property_suburb does not exist
-- Now should work: ✅ Uses correct column l.property_address_suburb

-- =============================================================================
-- SUMMARY OF ALL FIXES
-- =============================================================================
--
-- ✅ FIXED: check_booking_conflicts() return types
--    - customer_name: TEXT → VARCHAR(255) (matches leads.full_name)
--    - property_suburb: TEXT → VARCHAR(100) (matches leads.property_address_suburb)
--
-- ✅ FIXED: has_travel_time_conflict() column reference
--    - l.property_suburb → l.property_address_suburb (column does not exist → correct column)
--    - Error: "column l.property_suburb does not exist" → RESOLVED
--
-- ✅ NO CHANGE NEEDED: generate_inspection_number()
--    - Returns TEXT (no table dependencies)
--    - Function working correctly
--
-- ✅ ALL PREVIOUS FIXES PRESERVED:
--    - start_time/end_time → start_datetime/end_datetime (column naming)
--    - customer_name → full_name (column reference in check_booking_conflicts)
--    - property_suburb → property_address_suburb (column reference in both functions)
--
-- =============================================================================
-- COMPLETE LIST OF SCHEMA FIXES (All Functions)
-- =============================================================================
--
-- Function: check_booking_conflicts()
--   ✅ Return type: customer_name TEXT → VARCHAR(255)
--   ✅ Return type: property_suburb TEXT → VARCHAR(100)
--   ✅ Column reference: l.property_address_suburb (correct)
--
-- Function: has_travel_time_conflict()
--   ✅ Column reference: l.property_suburb → l.property_address_suburb
--   ✅ SELECT query: Now uses correct column name
--
-- Function: generate_inspection_number()
--   ✅ No changes needed (works correctly)
--
-- =============================================================================
-- DATABASE SCHEMA REFERENCE (for future debugging)
-- =============================================================================
--
-- calendar_events table:
--   - id: UUID
--   - lead_id: UUID
--   - start_datetime: TIMESTAMPTZ ✅
--   - end_datetime: TIMESTAMPTZ ✅
--   - assigned_to: UUID ✅
--   - status: booking_status ENUM ✅
--
-- leads table:
--   - id: UUID
--   - full_name: VARCHAR(255) ✅
--   - property_address_suburb: VARCHAR(100) ✅  (NOT property_suburb!)
--   - property_zone: INTEGER ✅
--
-- inspections table:
--   - created_at: TIMESTAMPTZ ✅
--
-- =============================================================================

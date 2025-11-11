-- Migration: Fix sequence permissions for inspection numbering
-- Phase: 2E - CRITICAL FIX
-- Priority: HIGH
-- Created: 2025-11-11
-- Description: Grant necessary permissions on inspection_daily_seq sequence
--              Fixes "permission denied for sequence" error

-- =============================================================================
-- Grant permissions on sequence to authenticated users
-- =============================================================================

-- Grant USAGE permission to authenticated role (allows nextval/currval/setval)
GRANT USAGE ON SEQUENCE inspection_daily_seq TO authenticated;

-- Grant SELECT permission (allows reading sequence state)
GRANT SELECT ON SEQUENCE inspection_daily_seq TO authenticated;

-- Grant UPDATE permission (allows setval for daily reset)
GRANT UPDATE ON SEQUENCE inspection_daily_seq TO authenticated;

-- =============================================================================
-- Grant permissions on app_settings table
-- =============================================================================

-- Grant SELECT permission (read sequence reset tracking)
GRANT SELECT ON TABLE app_settings TO authenticated;

-- Grant INSERT permission (create reset tracking entries)
GRANT INSERT ON TABLE app_settings TO authenticated;

-- Grant UPDATE permission (update reset tracking)
GRANT UPDATE ON TABLE app_settings TO authenticated;

-- =============================================================================
-- Verification query (run manually to test)
-- =============================================================================

-- Test that permissions work
-- SELECT generate_inspection_number();
-- Expected: INS-20251111-001 (or next sequence)

-- =============================================================================
-- Permission grant summary
-- =============================================================================
-- ✅ inspection_daily_seq: USAGE, SELECT, UPDATE granted to authenticated
-- ✅ app_settings: SELECT, INSERT, UPDATE granted to authenticated
-- ✅ Functions can now execute without permission errors

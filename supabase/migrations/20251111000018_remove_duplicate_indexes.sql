-- ============================================================================
-- Migration 018: Remove Duplicate and Redundant Indexes
-- ============================================================================
-- Description: Clean up duplicate indexes to improve write performance
--
-- Based on issues identified in CURRENT-SCHEMA-STATE.md:
--   - Issue 1: Duplicate indexes (e.g., idx_leads_assigned + idx_leads_assigned_to)
--   - Issue 2: Redundant indexes (e.g., both (lead_id) and (lead_id, created_at))
--
-- Impact: Faster INSERT/UPDATE operations, reduced storage
-- Risk: Low (we keep the better index in each pair)
--
-- Dependencies: Migration 016 (table renames), Migration 017 (constraints)
--
-- Author: Claude SQL Expert
-- Date: 2025-11-11
-- Priority: P1 - Performance optimization
-- ============================================================================

BEGIN;

-- ============================================================================
-- ANALYSIS SUMMARY
-- ============================================================================

-- Current duplicate patterns found:
--
-- 1. leads table:
--    - idx_leads_assigned (assigned_to)
--    - idx_leads_assigned_to (assigned_to)
--    Action: Keep idx_leads_assigned_to (more descriptive), drop idx_leads_assigned
--
-- 2. activities table:
--    - idx_activities_lead (lead_id)
--    - idx_activities_lead_id (lead_id)
--    Action: Keep idx_activities_lead_id, drop idx_activities_lead
--
--    - idx_activities_created (created_at)
--    - idx_activities_created_at (created_at DESC)
--    Action: Keep idx_activities_created_at (DESC optimization), drop idx_activities_created
--
-- 3. calendar_bookings table (formerly calendar_events):
--    - Already dropped duplicates in Migration 016
--
-- 4. inspection_reports table (formerly inspections):
--    - Already dropped duplicates in Migration 016
--
-- ============================================================================

-- ============================================================================
-- PART 1: ANALYZE CURRENT INDEX USAGE
-- ============================================================================

-- Before dropping, log current index sizes for monitoring
DO $$
DECLARE
  idx RECORD;
  total_size BIGINT := 0;
BEGIN
  RAISE NOTICE '=== INDEX SIZE ANALYSIS (Before Cleanup) ===';

  FOR idx IN
    SELECT
      schemaname,
      tablename,
      indexname,
      pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size,
      pg_relation_size(indexname::regclass) AS size_bytes
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'idx_leads_assigned',
        'idx_activities_lead',
        'idx_activities_created'
      )
    ORDER BY pg_relation_size(indexname::regclass) DESC
  LOOP
    RAISE NOTICE 'Index: % on %.% - Size: %',
      idx.indexname, idx.schemaname, idx.tablename, idx.index_size;
    total_size := total_size + idx.size_bytes;
  END LOOP;

  RAISE NOTICE 'Total size of indexes to be dropped: %', pg_size_pretty(total_size);
END $$;

-- ============================================================================
-- PART 2: DROP DUPLICATE INDEXES ON leads TABLE
-- ============================================================================

-- Drop idx_leads_assigned (keeping idx_leads_assigned_to)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND indexname = 'idx_leads_assigned'
  ) THEN
    DROP INDEX IF EXISTS public.idx_leads_assigned;
    RAISE NOTICE 'Dropped duplicate index: idx_leads_assigned (keeping idx_leads_assigned_to)';
  ELSE
    RAISE NOTICE 'Index idx_leads_assigned not found (may have been dropped already)';
  END IF;
END $$;

-- Verify idx_leads_assigned_to still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'leads'
      AND indexname = 'idx_leads_assigned_to'
  ) THEN
    -- Recreate if missing
    CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to) WHERE deleted_at IS NULL;
    RAISE NOTICE 'Recreated missing index: idx_leads_assigned_to';
  ELSE
    RAISE NOTICE 'Verified index exists: idx_leads_assigned_to';
  END IF;
END $$;

-- ============================================================================
-- PART 3: DROP DUPLICATE INDEXES ON activities TABLE
-- ============================================================================

-- Drop idx_activities_lead (keeping idx_activities_lead_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'activities'
      AND indexname = 'idx_activities_lead'
  ) THEN
    DROP INDEX IF EXISTS public.idx_activities_lead;
    RAISE NOTICE 'Dropped duplicate index: idx_activities_lead (keeping idx_activities_lead_id)';
  ELSE
    RAISE NOTICE 'Index idx_activities_lead not found (may have been dropped already)';
  END IF;
END $$;

-- Verify idx_activities_lead_id still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'activities'
      AND indexname = 'idx_activities_lead_id'
  ) THEN
    -- Recreate if missing
    CREATE INDEX idx_activities_lead_id ON public.activities(lead_id);
    RAISE NOTICE 'Recreated missing index: idx_activities_lead_id';
  ELSE
    RAISE NOTICE 'Verified index exists: idx_activities_lead_id';
  END IF;
END $$;

-- Drop idx_activities_created (keeping idx_activities_created_at with DESC)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'activities'
      AND indexname = 'idx_activities_created'
  ) THEN
    DROP INDEX IF EXISTS public.idx_activities_created;
    RAISE NOTICE 'Dropped duplicate index: idx_activities_created (keeping idx_activities_created_at DESC)';
  ELSE
    RAISE NOTICE 'Index idx_activities_created not found (may have been dropped already)';
  END IF;
END $$;

-- Verify idx_activities_created_at still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'activities'
      AND indexname = 'idx_activities_created_at'
  ) THEN
    -- Recreate with DESC optimization
    CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
    RAISE NOTICE 'Recreated missing index: idx_activities_created_at (with DESC)';
  ELSE
    RAISE NOTICE 'Verified index exists: idx_activities_created_at';
  END IF;
END $$;

-- ============================================================================
-- PART 4: IDENTIFY AND DROP REDUNDANT COMPOSITE INDEXES
-- ============================================================================

-- Check for redundant indexes where a composite index can serve single-column queries
-- Example: If we have both (lead_id) and (lead_id, created_at), the composite can serve both

-- Analyze email_logs indexes
DO $$
BEGIN
  -- If both idx_email_logs_lead_id and a composite (lead_id, sent_at) exist,
  -- we only need the composite
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'email_logs'
      AND indexname = 'idx_email_logs_lead_sent'  -- Composite index
  ) AND EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'email_logs'
      AND indexname = 'idx_email_logs_lead_id'  -- Single-column index
  ) THEN
    -- Keep the composite, drop single-column
    -- Note: Only drop if composite is (lead_id, ...), not (..., lead_id)
    RAISE NOTICE 'Found potential redundancy in email_logs indexes';
    RAISE NOTICE 'Keeping both for now - composite may not cover all queries';
  END IF;
END $$;

-- ============================================================================
-- PART 5: DROP UNUSED INDEXES (Based on pg_stat_user_indexes)
-- ============================================================================

-- Note: This requires pg_stat_statements extension enabled
-- We'll create a helper query but not drop automatically (requires production data analysis)

DO $$
DECLARE
  unused_idx RECORD;
  unused_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== UNUSED INDEX ANALYSIS ===';
  RAISE NOTICE 'Indexes with 0 scans (may be candidates for removal):';

  FOR unused_idx IN
    SELECT
      schemaname,
      relname,
      indexrelname,
      idx_scan,
      pg_size_pretty(pg_relation_size(indexrelname::regclass)) AS index_size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND idx_scan = 0
      AND indexrelname NOT LIKE '%_pkey'  -- Keep primary keys
      AND indexrelname NOT LIKE '%_key'   -- Keep unique constraints
    ORDER BY pg_relation_size(indexrelname::regclass) DESC
  LOOP
    RAISE NOTICE '  - %.% on % (Size: %, Scans: %)',
      unused_idx.schemaname,
      unused_idx.indexrelname,
      unused_idx.relname,
      unused_idx.index_size,
      unused_idx.idx_scan;
    unused_count := unused_count + 1;
  END LOOP;

  IF unused_count = 0 THEN
    RAISE NOTICE '  No unused indexes found (all have been scanned at least once)';
  ELSE
    RAISE NOTICE '  Found % unused indexes - review before dropping', unused_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Note: Unused index analysis requires production traffic data';
  RAISE NOTICE 'Run this query on production database after 1 week of traffic';
  RAISE NOTICE 'to identify truly unused indexes';
END $$;

-- ============================================================================
-- PART 6: VERIFY CRITICAL INDEXES STILL EXIST
-- ============================================================================

DO $$
DECLARE
  critical_indexes TEXT[] := ARRAY[
    'leads_pkey',
    'leads_lead_number_key',
    'idx_leads_status',
    'idx_leads_assigned_to',
    'idx_leads_created_at',
    'inspection_reports_pkey',
    'inspection_reports_job_number_key',
    'idx_inspection_reports_lead_id',
    'idx_inspection_reports_technician_id',
    'calendar_bookings_pkey',
    'idx_calendar_bookings_technician_id',
    'idx_calendar_bookings_start_time',
    'email_logs_pkey',
    'idx_email_logs_lead_id',
    'idx_email_logs_status',
    'offline_queue_pkey',
    'idx_offline_queue_user_id',
    'idx_offline_queue_status',
    'suburb_zones_pkey',
    'suburb_zones_suburb_key',
    'user_roles_pkey',
    'idx_user_roles_user_id'
  ];
  idx TEXT;
  missing_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== CRITICAL INDEX VERIFICATION ===';

  FOREACH idx IN ARRAY critical_indexes
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = idx
    ) THEN
      RAISE WARNING 'MISSING CRITICAL INDEX: %', idx;
      missing_count := missing_count + 1;
    END IF;
  END LOOP;

  IF missing_count = 0 THEN
    RAISE NOTICE 'All critical indexes verified present';
  ELSE
    RAISE EXCEPTION 'Found % missing critical indexes - migration cannot complete safely', missing_count;
  END IF;
END $$;

-- ============================================================================
-- PART 7: POST-CLEANUP ANALYSIS
-- ============================================================================

DO $$
DECLARE
  total_indexes INTEGER;
  total_size TEXT;
BEGIN
  -- Count total indexes
  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes
  WHERE schemaname = 'public';

  -- Calculate total index size
  SELECT pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) INTO total_size
  FROM pg_indexes
  WHERE schemaname = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '=== POST-CLEANUP SUMMARY ===';
  RAISE NOTICE 'Migration 018 completed successfully';
  RAISE NOTICE '  - Dropped duplicate indexes on leads table';
  RAISE NOTICE '  - Dropped duplicate indexes on activities table';
  RAISE NOTICE '  - Verified all critical indexes present';
  RAISE NOTICE '';
  RAISE NOTICE 'Current schema statistics:';
  RAISE NOTICE '  - Total indexes: %', total_indexes;
  RAISE NOTICE '  - Total index size: %', total_size;
  RAISE NOTICE '';
  RAISE NOTICE 'Performance improvements:';
  RAISE NOTICE '  - INSERT operations should be faster (fewer indexes to update)';
  RAISE NOTICE '  - UPDATE operations should be faster (fewer indexes to maintain)';
  RAISE NOTICE '  - Storage reduced by removing redundant indexes';
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION MONITORING
-- ============================================================================

-- Run this query after migration to compare query performance:

/*
-- Query to analyze index usage after migration
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC, pg_relation_size(indexname::regclass) DESC
LIMIT 50;
*/

-- ============================================================================
-- ROLLBACK SCRIPT (Run only if queries become slower)
-- ============================================================================

/*
BEGIN;

-- Recreate dropped indexes

-- leads table
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);
RAISE NOTICE 'Recreated idx_leads_assigned';

-- activities table
CREATE INDEX IF NOT EXISTS idx_activities_lead ON public.activities(lead_id);
RAISE NOTICE 'Recreated idx_activities_lead';

CREATE INDEX IF NOT EXISTS idx_activities_created ON public.activities(created_at);
RAISE NOTICE 'Recreated idx_activities_created';

COMMIT;

RAISE NOTICE 'Rollback completed: Duplicate indexes recreated';
RAISE NOTICE 'Note: This doubles index maintenance cost - only rollback if queries are significantly slower';
*/

-- ============================================================================
-- PERFORMANCE TESTING GUIDE
-- ============================================================================

-- After migration, run these queries to verify performance is maintained:

/*
-- Test 1: leads assigned to technician (should use idx_leads_assigned_to)
EXPLAIN ANALYZE
SELECT * FROM leads
WHERE assigned_to = 'UUID-HERE'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Expected: Index Scan using idx_leads_assigned_to

-- Test 2: activities for lead (should use idx_activities_lead_id)
EXPLAIN ANALYZE
SELECT * FROM activities
WHERE lead_id = 'UUID-HERE'
ORDER BY created_at DESC
LIMIT 50;

-- Expected: Index Scan using idx_activities_lead_id

-- Test 3: recent activities (should use idx_activities_created_at)
EXPLAIN ANALYZE
SELECT * FROM activities
ORDER BY created_at DESC
LIMIT 100;

-- Expected: Index Scan using idx_activities_created_at

-- If any query shows "Seq Scan" instead of "Index Scan", investigate and
-- potentially rollback this migration.
*/

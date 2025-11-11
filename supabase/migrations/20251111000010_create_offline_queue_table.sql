-- Migration: Create offline_queue table
-- Phase: 2D.3 - HIGH PRIORITY
-- Priority: P1
-- Created: 2025-11-11
-- Description: Queue for offline data sync when technicians work without internet
--              User-specific access (technicians see own queue only)

-- =============================================================================
-- Create offline_queue table
-- =============================================================================

CREATE TABLE IF NOT EXISTS offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who created this offline action
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Action Details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create',  -- Create new record
    'update',  -- Update existing record
    'delete'   -- Delete record
  )),
  table_name TEXT NOT NULL CHECK (table_name IN (
    'leads',
    'inspections',
    'inspection_reports',
    'calendar_bookings',
    'calendar_events',
    'photos',
    'notes',
    'activities'
  )),
  record_id UUID, -- NULL for creates, UUID for updates/deletes
  payload JSONB NOT NULL, -- Full record data for create/update, ID for delete

  -- Sync Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Waiting to sync
    'syncing',    -- Currently syncing
    'synced',     -- Successfully synced
    'failed',     -- Sync failed (retryable)
    'conflict',   -- Conflict detected (needs manual resolution)
    'cancelled'   -- User cancelled this action
  )),

  -- Sync Details
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  sync_error TEXT,
  conflict_data JSONB, -- Details about conflicts

  -- Priority
  priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 10),
  -- Higher priority = sync first
  -- 10 = Urgent (emergency situations)
  -- 5 = Normal (standard operations)
  -- 0 = Low (can wait)

  -- Metadata
  device_info JSONB DEFAULT '{}'::jsonb, -- Browser, OS, etc.
  network_info JSONB DEFAULT '{}'::jsonb, -- Connection type when created

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Create indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_offline_queue_user_id ON offline_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_table_name ON offline_queue(table_name);
CREATE INDEX IF NOT EXISTS idx_offline_queue_priority ON offline_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_offline_queue_created_at ON offline_queue(created_at);

-- Composite index for sync processing (fetch pending items by priority)
CREATE INDEX IF NOT EXISTS idx_offline_queue_sync_processing
  ON offline_queue(user_id, status, priority DESC, created_at);

-- =============================================================================
-- Enable Row Level Security (User-specific access)
-- =============================================================================

ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_manage_own_queue" ON offline_queue;
DROP POLICY IF EXISTS "admins_view_all_queues" ON offline_queue;

-- Policy 1: Users can fully manage their own offline queue
CREATE POLICY "users_manage_own_queue"
  ON offline_queue
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 2: Admins can view all queues (debugging/support)
CREATE POLICY "admins_view_all_queues"
  ON offline_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- =============================================================================
-- Add updated_at trigger
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS update_offline_queue_updated_at ON offline_queue;
    CREATE TRIGGER update_offline_queue_updated_at
      BEFORE UPDATE ON offline_queue
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- Helper function: Get pending sync items for user
-- =============================================================================

CREATE OR REPLACE FUNCTION get_pending_sync_items(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  queue_id UUID,
  action_type TEXT,
  table_name TEXT,
  record_id UUID,
  payload JSONB,
  priority INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    offline_queue.action_type,
    offline_queue.table_name,
    offline_queue.record_id,
    offline_queue.payload,
    offline_queue.priority,
    offline_queue.created_at
  FROM offline_queue
  WHERE user_id = p_user_id
    AND status = 'pending'
  ORDER BY priority DESC, created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_pending_sync_items IS
  'Retrieves pending offline sync items for a user, ordered by priority and age.
   Used by the offline sync service to process queued actions.';

-- =============================================================================
-- Verification queries (commented out, run manually to test)
-- =============================================================================

-- Check table exists
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'offline_queue';

-- Check RLS policies
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'offline_queue';

-- Test offline queue entry (example)
-- INSERT INTO offline_queue (
--   user_id,
--   action_type,
--   table_name,
--   payload,
--   priority,
--   device_info
-- ) VALUES (
--   auth.uid(),
--   'create',
--   'inspections',
--   '{"customer_name": "Test Customer", "property_address": "123 Test St"}'::jsonb,
--   5,
--   '{"browser": "Chrome", "os": "iOS"}'::jsonb
-- );

-- Query user's pending sync items
-- SELECT
--   id,
--   action_type,
--   table_name,
--   status,
--   priority,
--   created_at
-- FROM offline_queue
-- WHERE user_id = auth.uid()
--   AND status = 'pending'
-- ORDER BY priority DESC, created_at ASC;

-- Test get_pending_sync_items function
-- SELECT * FROM get_pending_sync_items(auth.uid(), 10);

-- Queue statistics (as admin)
-- SELECT
--   table_name,
--   action_type,
--   status,
--   COUNT(*) as count
-- FROM offline_queue
-- GROUP BY table_name, action_type, status
-- ORDER BY table_name, action_type, status;

-- =============================================================================
-- Offline Sync Workflow
-- =============================================================================
-- 1. User goes offline while filling inspection form
-- 2. User clicks "Save" → App detects offline
-- 3. App creates offline_queue entry (status: pending, priority: 5)
-- 4. App saves data to localStorage as backup
-- 5. User continues working offline
-- 6. User comes back online
-- 7. App detects online status
-- 8. App calls get_pending_sync_items(user_id)
-- 9. App processes each item:
--    - Update status to 'syncing'
--    - Execute the action (INSERT/UPDATE/DELETE)
--    - If success: Update status to 'synced', set synced_at
--    - If conflict: Update status to 'conflict', store conflict_data
--    - If error: Update status to 'failed', increment sync_attempts
-- 10. Repeat until queue is empty
--
-- Conflict Resolution:
-- - If record was modified by someone else while offline
-- - Show user: "This record was updated by [user] at [time]"
-- - Options: "Keep mine", "Keep theirs", "Merge changes"
-- - Update conflict_data with resolution choice

-- Migration: Enable RLS on calendar_events table
-- Phase: 2A.3 - CRITICAL SECURITY FIX
-- Priority: P0
-- Created: 2025-11-11
-- Description: Enable Row Level Security on calendar_events table
--              All technicians can VIEW all events (for conflict detection)
--              Technicians can only EDIT their assigned events
--              Admins can do everything

-- Enable Row Level Security on calendar_events table
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "All authenticated users can view calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON calendar_events;

-- Policy 1: All authenticated users can view all calendar events
-- Reason: Needed for conflict detection - technicians must see all bookings
CREATE POLICY "all_technicians_view_calendar"
  ON calendar_events
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 2: Technicians can only update their assigned events
CREATE POLICY "technicians_update_assigned_events"
  ON calendar_events
  FOR UPDATE
  USING (
    assigned_to = auth.uid()
    OR is_admin(auth.uid())
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR is_admin(auth.uid())
  );

-- Policy 3: Authenticated users can create calendar events
-- Note: assignment validation should happen at application level
CREATE POLICY "authenticated_create_calendar_events"
  ON calendar_events
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 4: Only admins or assigned technicians can delete events
CREATE POLICY "technicians_delete_assigned_events"
  ON calendar_events
  FOR DELETE
  USING (
    assigned_to = auth.uid()
    OR is_admin(auth.uid())
  );

-- Policy 5: Admins have full management access
CREATE POLICY "admins_manage_all_calendar_events"
  ON calendar_events
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Verification queries (commented out, run manually to test):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'calendar_events';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'calendar_events';

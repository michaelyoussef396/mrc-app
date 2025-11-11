-- Migration: Enable RLS on inspections table
-- Phase: 2A.2 - CRITICAL SECURITY FIX
-- Priority: P0
-- Created: 2025-11-11
-- Description: Enable Row Level Security on inspections table
--              Technicians see only their own inspections, admins see all

-- Enable Row Level Security on inspections table
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "All authenticated users can view inspections" ON inspections;
DROP POLICY IF EXISTS "Admins can delete inspections" ON inspections;
DROP POLICY IF EXISTS "Inspectors can update their inspections" ON inspections;
DROP POLICY IF EXISTS "Technicians can create inspections" ON inspections;

-- Policy 1: Technicians can view only their own inspections, admins see all
CREATE POLICY "technicians_view_own_inspections"
  ON inspections
  FOR SELECT
  USING (
    inspector_id = auth.uid()
    OR is_admin(auth.uid())
  );

-- Policy 2: Technicians can create inspections (will be assigned to them)
CREATE POLICY "technicians_create_inspections"
  ON inspections
  FOR INSERT
  WITH CHECK (
    inspector_id = auth.uid()
    OR is_admin(auth.uid())
  );

-- Policy 3: Technicians can update only their own inspections
CREATE POLICY "technicians_update_own_inspections"
  ON inspections
  FOR UPDATE
  USING (inspector_id = auth.uid())
  WITH CHECK (inspector_id = auth.uid());

-- Policy 4: Only admins can delete inspections
CREATE POLICY "admins_delete_inspections"
  ON inspections
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Policy 5: Admins have full management access
CREATE POLICY "admins_manage_all_inspections"
  ON inspections
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Verification queries (commented out, run manually to test):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'inspections';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'inspections';

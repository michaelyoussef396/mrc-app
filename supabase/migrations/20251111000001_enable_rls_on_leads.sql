-- Migration: Enable RLS on leads table
-- Phase: 2A.1 - CRITICAL SECURITY FIX
-- Priority: P0
-- Created: 2025-11-11
-- Description: Enable Row Level Security on leads table with proper policies
--              Technicians see assigned leads only, admins see all

-- Enable Row Level Security on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "All authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "Admins can manage all leads" ON leads;
DROP POLICY IF EXISTS "Technicians can update assigned leads" ON leads;

-- Policy 1: Technicians can view only their assigned leads, admins see all
CREATE POLICY "technicians_view_assigned_leads"
  ON leads
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR is_admin(auth.uid())
  );

-- Policy 2: Technicians can update only their assigned leads (status, notes, etc.)
CREATE POLICY "technicians_update_assigned_leads"
  ON leads
  FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Policy 3: Only admins can insert new leads
CREATE POLICY "admins_insert_leads"
  ON leads
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Policy 4: Only admins can delete leads
CREATE POLICY "admins_delete_leads"
  ON leads
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Policy 5: Admins have full management access
CREATE POLICY "admins_manage_all_leads"
  ON leads
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Verification queries (commented out, run manually to test):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'leads';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'leads';

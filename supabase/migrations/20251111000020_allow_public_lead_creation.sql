-- Migration: Allow public (unauthenticated) users to create leads via request inspection form
-- Date: 2025-11-11
-- Purpose: Enable website lead capture form to work for anonymous visitors

-- ============================================================================
-- PROBLEM: Request inspection form fails with RLS error
-- ============================================================================
-- Current state: Only authenticated admins can insert leads
-- Issue: Public form submissions are blocked by RLS
-- Error: "new row violates row-level security policy for table leads"
--
-- This migration adds a policy to allow anonymous users to submit leads
-- through the public request inspection form.
-- ============================================================================

-- Create RLS policy to allow anonymous users to INSERT leads
CREATE POLICY "allow_public_insert_leads"
ON leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Only allow insertion if lead_source is 'website'
  -- This prevents abuse while allowing legitimate form submissions
  lead_source = 'website'
);

-- Add comment for documentation
COMMENT ON POLICY "allow_public_insert_leads" ON leads IS
'Allows anonymous users to create leads via the public request inspection form.
Only permits insertion when lead_source is website to prevent abuse.
Added: 2025-11-11';

-- ============================================================================
-- SECURITY NOTES:
-- ============================================================================
-- 1. This policy only allows INSERT, not SELECT/UPDATE/DELETE
-- 2. Restricted to lead_source = 'website' to prevent abuse
-- 3. Anonymous users cannot read or modify existing leads
-- 4. All other operations still require authentication
-- ============================================================================

-- Verification query (run after migration):
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'leads' AND policyname = 'allow_public_insert_leads';

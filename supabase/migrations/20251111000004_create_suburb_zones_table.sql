-- Migration: Create suburb_zones table
-- Phase: 2B.1 - CRITICAL FEATURE (BLOCKING)
-- Priority: P0
-- Created: 2025-11-11
-- Description: Create suburb_zones table for Melbourne suburbs
--              Maps 200+ suburbs to 4 travel zones (CBD, Inner, Middle, Outer)
--              Required for: travel time calculation, pricing, conflict detection

-- Create suburb_zones table
CREATE TABLE IF NOT EXISTS suburb_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb TEXT NOT NULL UNIQUE,
  postcode TEXT NOT NULL CHECK (postcode ~ '^3[0-9]{3}$'), -- VIC postcodes only (3XXX)
  zone INTEGER NOT NULL CHECK (zone BETWEEN 1 AND 4),
  region TEXT, -- Optional: "North", "South", "East", "West", "CBD"
  notes TEXT, -- Optional: Special notes about the suburb
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_suburb_zones_suburb ON suburb_zones(suburb);
CREATE INDEX IF NOT EXISTS idx_suburb_zones_postcode ON suburb_zones(postcode);
CREATE INDEX IF NOT EXISTS idx_suburb_zones_zone ON suburb_zones(zone);

-- Enable RLS (public read access, admin-only write)
ALTER TABLE suburb_zones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "public_read_suburb_zones" ON suburb_zones;
DROP POLICY IF EXISTS "admins_manage_suburb_zones" ON suburb_zones;

-- Policy 1: Everyone can read suburb zones
CREATE POLICY "public_read_suburb_zones"
  ON suburb_zones
  FOR SELECT
  USING (true);

-- Policy 2: Only admins can modify suburb zones
CREATE POLICY "admins_manage_suburb_zones"
  ON suburb_zones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add updated_at trigger (only if update_updated_at_column function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS update_suburb_zones_updated_at ON suburb_zones;
    CREATE TRIGGER update_suburb_zones_updated_at
      BEFORE UPDATE ON suburb_zones
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Verification queries (commented out, run manually to test):
-- SELECT COUNT(*) as total_suburbs FROM suburb_zones;
-- SELECT zone, COUNT(*) as suburbs_in_zone FROM suburb_zones GROUP BY zone ORDER BY zone;
-- SELECT * FROM suburb_zones WHERE suburb = 'Melbourne' OR suburb = 'Carlton';
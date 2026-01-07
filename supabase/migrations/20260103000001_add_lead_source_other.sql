-- Migration: Add lead_source_other column to leads table
-- Purpose: Store custom source text when lead_source = 'other'

-- Add the lead_source_other column
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS lead_source_other text;

-- Add comment for documentation
COMMENT ON COLUMN leads.lead_source_other IS 'Custom source text when lead_source is set to other';

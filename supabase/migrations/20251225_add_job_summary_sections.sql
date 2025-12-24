-- Migration: Add Job Summary Sections for Page 5 (Problem Analysis & Recommendations)
-- Date: 2025-12-25
-- Purpose: Add 8 structured fields for AI-generated Job Summary content

-- Add columns for Page 5 structured Job Summary
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS what_we_discovered TEXT,
ADD COLUMN IF NOT EXISTS identified_causes TEXT,
ADD COLUMN IF NOT EXISTS contributing_factors TEXT,
ADD COLUMN IF NOT EXISTS why_this_happened TEXT,
ADD COLUMN IF NOT EXISTS immediate_actions TEXT,
ADD COLUMN IF NOT EXISTS long_term_protection TEXT,
ADD COLUMN IF NOT EXISTS what_success_looks_like TEXT,
ADD COLUMN IF NOT EXISTS timeline_text TEXT;

-- Add comments for documentation
COMMENT ON COLUMN inspections.what_we_discovered IS 'AI-generated: Summary of mould findings discovered during inspection (Page 5)';
COMMENT ON COLUMN inspections.identified_causes IS 'AI-generated: Primary causes identified for the mould growth (Page 5)';
COMMENT ON COLUMN inspections.contributing_factors IS 'AI-generated: Contributing factors that enabled mould growth (Page 5)';
COMMENT ON COLUMN inspections.why_this_happened IS 'AI-generated: Explanation of root cause (Page 5)';
COMMENT ON COLUMN inspections.immediate_actions IS 'AI-generated: Recommended immediate actions for treatment (Page 5)';
COMMENT ON COLUMN inspections.long_term_protection IS 'AI-generated: Long-term protection recommendations (Page 5)';
COMMENT ON COLUMN inspections.what_success_looks_like IS 'AI-generated: Description of expected outcomes (Page 5)';
COMMENT ON COLUMN inspections.timeline_text IS 'AI-generated: Treatment timeline information (Page 5)';

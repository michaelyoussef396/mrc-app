-- Migration: Add PDF System to MRC Lead Management
-- Created: 2024-12-21
-- Author: Manager Agent (database-specialist delegation)
-- Purpose: Add PDF generation, versioning, and smart overlay editing system

-- =====================================================
-- SECTION 1: ADD PDF COLUMNS TO INSPECTIONS TABLE
-- =====================================================

ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pdf_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pdf_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pdf_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN inspections.pdf_url IS 'URL to the generated PDF report in Supabase Storage';
COMMENT ON COLUMN inspections.pdf_version IS 'Current version number of the PDF (increments with each regeneration)';
COMMENT ON COLUMN inspections.pdf_generated_at IS 'Timestamp when the PDF was last generated';
COMMENT ON COLUMN inspections.pdf_approved IS 'Whether the PDF has been approved for sending to customer';
COMMENT ON COLUMN inspections.pdf_approved_at IS 'Timestamp when the PDF was approved';
COMMENT ON COLUMN inspections.pdf_approved_by IS 'User who approved the PDF';
COMMENT ON COLUMN inspections.last_edited_at IS 'Timestamp of last edit via Smart Overlay';
COMMENT ON COLUMN inspections.last_edited_by IS 'User who last edited via Smart Overlay';

-- Create index for faster PDF queries
CREATE INDEX IF NOT EXISTS idx_inspections_pdf_url ON inspections(pdf_url) WHERE pdf_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inspections_pdf_approved ON inspections(pdf_approved) WHERE pdf_approved = true;

-- =====================================================
-- SECTION 2: CREATE PDF VERSIONS AUDIT TRAIL TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pdf_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  pdf_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  changes_made JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_inspection_version UNIQUE(inspection_id, version_number)
);

COMMENT ON TABLE pdf_versions IS 'Audit trail for PDF report versions - tracks all regenerations and changes';
COMMENT ON COLUMN pdf_versions.version_number IS 'Sequential version number for this inspection PDF';
COMMENT ON COLUMN pdf_versions.pdf_url IS 'URL to this specific version of the PDF';
COMMENT ON COLUMN pdf_versions.file_size_bytes IS 'Size of the PDF file in bytes';
COMMENT ON COLUMN pdf_versions.changes_made IS 'JSON array of field changes that triggered this version';

CREATE INDEX IF NOT EXISTS idx_pdf_versions_inspection ON pdf_versions(inspection_id);
CREATE INDEX IF NOT EXISTS idx_pdf_versions_created_at ON pdf_versions(created_at DESC);

-- =====================================================
-- SECTION 3: RLS POLICIES FOR PDF_VERSIONS
-- =====================================================

ALTER TABLE pdf_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view PDF versions for inspections they have access to
CREATE POLICY "Users can view PDF versions for accessible inspections"
ON pdf_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM inspections i
    WHERE i.id = pdf_versions.inspection_id
    AND (i.inspector_id = auth.uid() OR i.created_by = auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'manager')
  )
);

-- Policy: Users can create PDF versions for their inspections
CREATE POLICY "Users can create PDF versions for their inspections"
ON pdf_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM inspections i
    WHERE i.id = pdf_versions.inspection_id
    AND (i.inspector_id = auth.uid() OR i.created_by = auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'manager')
  )
);

-- =====================================================
-- SECTION 4: CREATE EDITABLE FIELDS METADATA TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS editable_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key TEXT UNIQUE NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'image', 'number', 'date', 'currency')),
  field_table TEXT NOT NULL,
  field_column TEXT NOT NULL,
  edit_icon_position JSONB,
  validation_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE editable_fields IS 'Metadata for Smart Overlay PDF editing - defines which fields can be edited in-place';
COMMENT ON COLUMN editable_fields.field_key IS 'Unique identifier for the field (used in frontend)';
COMMENT ON COLUMN editable_fields.field_label IS 'Human-readable label shown in edit modal';
COMMENT ON COLUMN editable_fields.field_type IS 'Type of input field (text, textarea, image, number, date, currency)';
COMMENT ON COLUMN editable_fields.field_table IS 'Database table containing this field';
COMMENT ON COLUMN editable_fields.field_column IS 'Database column name for this field';
COMMENT ON COLUMN editable_fields.edit_icon_position IS 'JSON with page number and x,y coordinates for edit icon';
COMMENT ON COLUMN editable_fields.validation_rules IS 'JSON validation rules (required, min, max, pattern, etc.)';

CREATE INDEX IF NOT EXISTS idx_editable_fields_key ON editable_fields(field_key);
CREATE INDEX IF NOT EXISTS idx_editable_fields_active ON editable_fields(is_active) WHERE is_active = true;

-- RLS for editable_fields (read-only for authenticated users)
ALTER TABLE editable_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view editable fields"
ON editable_fields FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage editable fields"
ON editable_fields FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- =====================================================
-- SECTION 5: SEED INITIAL EDITABLE FIELDS
-- =====================================================

INSERT INTO editable_fields (field_key, field_label, field_type, field_table, field_column, edit_icon_position, validation_rules) VALUES
-- Page 1: Cover
('client_name', 'Client Name', 'text', 'leads', 'client_name', '{"page": 1, "x": 50, "y": 320}', '{"required": true, "maxLength": 100}'),
('property_address', 'Property Address', 'textarea', 'leads', 'property_address', '{"page": 1, "x": 320, "y": 800}', '{"required": true, "maxLength": 200}'),
('property_type', 'Property Type', 'text', 'inspections', 'dwelling_type', '{"page": 1, "x": 50, "y": 500}', '{"required": false}'),
('inspection_date', 'Inspection Date', 'date', 'inspections', 'inspection_date', '{"page": 1, "x": 50, "y": 340}', '{"required": true}'),
('inspector_name', 'Inspector', 'text', 'profiles', 'full_name', '{"page": 1, "x": 50, "y": 360}', '{"required": true}'),
('examined_areas', 'Examined Areas', 'textarea', 'inspections', 'examined_areas_list', '{"page": 1, "x": 50, "y": 560}', '{"required": false}'),
('cover_photo', 'Cover Photo', 'image', 'photos', 'storage_path', '{"page": 1, "x": 280, "y": 430}', '{"required": false}'),

-- Page 2: Value Proposition
('what_we_found', 'What We Found Summary', 'textarea', 'inspections', 'job_summary_final', '{"page": 2, "x": 50, "y": 240}', '{"required": false, "maxLength": 2000}'),

-- Page 3: Outdoor Environment
('outdoor_temperature', 'Outdoor Temperature', 'number', 'inspections', 'outdoor_temperature', '{"page": 3, "x": 400, "y": 200}', '{"required": false, "min": -10, "max": 50}'),
('outdoor_humidity', 'Outdoor Humidity', 'number', 'inspections', 'outdoor_humidity', '{"page": 3, "x": 400, "y": 230}', '{"required": false, "min": 0, "max": 100}'),
('outdoor_comments', 'Outdoor Comments', 'textarea', 'inspections', 'outdoor_comments', '{"page": 3, "x": 50, "y": 400}', '{"required": false, "maxLength": 500}'),

-- Page 5: Problem Analysis
('cause_of_mould', 'Cause of Mould', 'textarea', 'inspections', 'cause_of_mould', '{"page": 5, "x": 50, "y": 200}', '{"required": false, "maxLength": 1000}'),

-- Page 6: Cleaning Estimate
('labor_cost', 'Labor Cost', 'currency', 'inspections', 'labor_cost_ex_gst', '{"page": 6, "x": 500, "y": 300}', '{"required": false, "min": 0}'),
('equipment_cost', 'Equipment Cost', 'currency', 'inspections', 'equipment_cost_ex_gst', '{"page": 6, "x": 500, "y": 340}', '{"required": false, "min": 0}'),
('total_cost', 'Total Cost (inc GST)', 'currency', 'inspections', 'total_inc_gst', '{"page": 6, "x": 500, "y": 450}', '{"required": false, "min": 0}')

ON CONFLICT (field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  field_table = EXCLUDED.field_table,
  field_column = EXCLUDED.field_column,
  edit_icon_position = EXCLUDED.edit_icon_position,
  validation_rules = EXCLUDED.validation_rules,
  updated_at = NOW();

-- =====================================================
-- SECTION 6: CREATE STORAGE BUCKET FOR PDFS
-- =====================================================
-- Note: Storage bucket creation may need to be done via Supabase Dashboard
-- if this fails due to permissions. The bucket should be named 'inspection-reports'.

-- Attempt to create bucket (may fail if bucket exists or permissions insufficient)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'inspection-reports',
    'inspection-reports',
    false,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'text/html']
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Storage bucket creation requires dashboard access. Please create bucket manually.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Storage bucket may already exist or require manual creation: %', SQLERRM;
END $$;

-- =====================================================
-- VERIFICATION QUERY (for testing)
-- =====================================================
-- Run this query to verify migration success:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'inspections' AND column_name LIKE 'pdf%';
-- SELECT * FROM pdf_versions LIMIT 1;
-- SELECT * FROM editable_fields;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- New columns added to inspections: 8
-- New tables created: 2 (pdf_versions, editable_fields)
-- RLS policies created: 4
-- Editable fields seeded: 15

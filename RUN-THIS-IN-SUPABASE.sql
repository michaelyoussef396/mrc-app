-- ================================================
-- MANUAL MIGRATION: Create Inspection Tables
-- Instructions:
--   1. Open https://supabase.com/dashboard
--   2. Go to SQL Editor
--   3. Copy and paste this entire file
--   4. Click "Run" or press Cmd+Enter
-- ================================================

-- 1. Create inspections table
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  job_number VARCHAR(50) UNIQUE,
  inspector_id UUID REFERENCES auth.users(id) NOT NULL,
  inspection_date DATE NOT NULL,
  inspection_start_time TIME,
  triage_description TEXT,
  requested_by VARCHAR(255),
  attention_to VARCHAR(255),
  property_occupation property_occupation,
  dwelling_type dwelling_type,
  total_time_minutes INTEGER,
  estimated_cost_ex_gst DECIMAL(10,2),
  estimated_cost_inc_gst DECIMAL(10,2),
  selected_job_type job_type,
  equipment_cost_ex_gst DECIMAL(10,2),
  equipment_cost_inc_gst DECIMAL(10,2),
  waste_disposal_cost DECIMAL(10,2),
  subfloor_required BOOLEAN DEFAULT false,
  waste_disposal_required BOOLEAN DEFAULT false,
  outdoor_temperature DECIMAL(5,2),
  outdoor_humidity DECIMAL(5,2),
  outdoor_dew_point DECIMAL(5,2),
  outdoor_comments TEXT,
  recommended_dehumidifier VARCHAR(100),
  cause_of_mould TEXT,
  additional_info_technician TEXT,
  additional_equipment_comments TEXT,
  parking_option VARCHAR(100),
  report_generated BOOLEAN DEFAULT false,
  report_pdf_url TEXT,
  report_sent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inspections_lead_id ON public.inspections(lead_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id ON public.inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON public.inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspections_job_number ON public.inspections(job_number);

-- 2. Create inspection_areas table
CREATE TABLE IF NOT EXISTS public.inspection_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
  area_order INTEGER,
  area_name VARCHAR(255) NOT NULL,
  mould_ceiling BOOLEAN DEFAULT false,
  mould_cornice BOOLEAN DEFAULT false,
  mould_windows BOOLEAN DEFAULT false,
  mould_window_furnishings BOOLEAN DEFAULT false,
  mould_walls BOOLEAN DEFAULT false,
  mould_skirting BOOLEAN DEFAULT false,
  mould_flooring BOOLEAN DEFAULT false,
  mould_wardrobe BOOLEAN DEFAULT false,
  mould_cupboard BOOLEAN DEFAULT false,
  mould_contents BOOLEAN DEFAULT false,
  mould_grout_silicone BOOLEAN DEFAULT false,
  mould_none_visible BOOLEAN DEFAULT false,
  comments TEXT,
  comments_approved BOOLEAN DEFAULT false,
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  dew_point DECIMAL(5,2),
  moisture_readings_enabled BOOLEAN DEFAULT false,
  internal_office_notes TEXT,
  infrared_enabled BOOLEAN DEFAULT false,
  infrared_observation_no_active BOOLEAN DEFAULT false,
  infrared_observation_water_infiltration BOOLEAN DEFAULT false,
  infrared_observation_past_ingress BOOLEAN DEFAULT false,
  infrared_observation_condensation BOOLEAN DEFAULT false,
  infrared_observation_missing_insulation BOOLEAN DEFAULT false,
  job_time_minutes INTEGER NOT NULL,
  demolition_required BOOLEAN DEFAULT false,
  demolition_time_minutes INTEGER,
  demolition_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inspection_areas ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inspection_areas_inspection_id ON public.inspection_areas(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_areas_order ON public.inspection_areas(area_order);

-- 3. Create photos table
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.inspection_areas(id) ON DELETE CASCADE,
  subfloor_id UUID,
  photo_type VARCHAR(50) NOT NULL,
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  caption VARCHAR(500),
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_photos_inspection_id ON public.photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_photos_area_id ON public.photos(area_id);
CREATE INDEX IF NOT EXISTS idx_photos_type ON public.photos(photo_type);

-- 4. Create RLS policies
-- Inspections policies
DROP POLICY IF EXISTS "All authenticated users can view inspections" ON public.inspections;
CREATE POLICY "All authenticated users can view inspections"
  ON public.inspections FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Technicians can create inspections" ON public.inspections;
CREATE POLICY "Technicians can create inspections"
  ON public.inspections FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Inspectors can update their inspections" ON public.inspections;
CREATE POLICY "Inspectors can update their inspections"
  ON public.inspections FOR UPDATE
  USING (inspector_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can delete inspections" ON public.inspections;
CREATE POLICY "Admins can delete inspections"
  ON public.inspections FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Inspection areas policies
DROP POLICY IF EXISTS "All authenticated users can view inspection areas" ON public.inspection_areas;
CREATE POLICY "All authenticated users can view inspection areas"
  ON public.inspection_areas FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage inspection areas" ON public.inspection_areas;
CREATE POLICY "Authenticated users can manage inspection areas"
  ON public.inspection_areas FOR ALL
  USING (auth.role() = 'authenticated');

-- Photos policies
DROP POLICY IF EXISTS "All authenticated users can manage photos" ON public.photos;
CREATE POLICY "All authenticated users can manage photos"
  ON public.photos FOR ALL
  USING (auth.role() = 'authenticated');

-- Success message
SELECT 'SUCCESS: All 3 tables created with RLS policies and indexes!' as status;

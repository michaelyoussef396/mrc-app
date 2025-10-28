-- ================================================
-- MRC Lead Management System - Complete Database Schema
-- ================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- ENUM TYPES
-- ================================================

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'technician', 'manager');

-- Lead status (12-stage pipeline)
CREATE TYPE public.lead_status AS ENUM (
  'new_lead',
  'contacted',
  'inspection_waiting',
  'inspection_completed',
  'inspection_report_pdf_completed',
  'job_waiting',
  'job_completed',
  'job_report_pdf_sent',
  'invoicing_sent',
  'paid',
  'google_review',
  'finished'
);

-- Job type
CREATE TYPE public.job_type AS ENUM (
  'no_demolition_surface',
  'demo',
  'construction',
  'subfloor'
);

-- Property occupation
CREATE TYPE public.property_occupation AS ENUM (
  'tenanted',
  'vacant',
  'owner_occupied',
  'tenants_vacating'
);

-- Dwelling type
CREATE TYPE public.dwelling_type AS ENUM (
  'house',
  'units',
  'apartment',
  'duplex',
  'townhouse',
  'commercial',
  'construction',
  'industrial'
);

-- Report status
CREATE TYPE public.report_status AS ENUM (
  'draft',
  'sent',
  'confirmed',
  'job_booked'
);

-- Invoice status
CREATE TYPE public.invoice_status AS ENUM (
  'draft',
  'sent',
  'overdue',
  'paid',
  'cancelled'
);

-- Payment method
CREATE TYPE public.payment_method AS ENUM (
  'bank_transfer',
  'credit_card',
  'cash',
  'cheque'
);

-- Booking status
CREATE TYPE public.booking_status AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'rescheduled'
);

-- Moisture status
CREATE TYPE public.moisture_status AS ENUM (
  'dry',
  'elevated',
  'wet',
  'very_wet'
);

-- Waste disposal size
CREATE TYPE public.waste_disposal_size AS ENUM (
  'small',
  'medium',
  'large',
  'extra_large'
);

-- Subfloor landscape
CREATE TYPE public.subfloor_landscape AS ENUM (
  'flat_block',
  'sloping_block'
);

-- ================================================
-- USER ROLES TABLE (Security Best Practice)
-- ================================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'technician',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ================================================
-- EXTEND PROFILES TABLE
-- ================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ================================================
-- PRICING SETTINGS TABLE
-- ================================================

CREATE TABLE public.pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type job_type NOT NULL UNIQUE,
  hours_2_rate DECIMAL(10,2) NOT NULL,
  hours_8_rate DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Insert default pricing
INSERT INTO public.pricing_settings (job_type, hours_2_rate, hours_8_rate) VALUES
  ('no_demolition_surface', 612.00, 1216.99),
  ('demo', 711.90, 1798.90),
  ('construction', 661.96, 1507.95),
  ('subfloor', 900.00, 2334.69);

CREATE POLICY "All authenticated users can view pricing"
  ON public.pricing_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update pricing"
  ON public.pricing_settings
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- ================================================
-- EQUIPMENT TABLE
-- ================================================

CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  quantity_available INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Insert default equipment
INSERT INTO public.equipment (name, daily_rate, category, quantity_available) VALUES
  ('Dehumidifier', 132.00, 'Drying Equipment', 4),
  ('Air Mover / Blower', 46.00, 'Drying Equipment', 8),
  ('RCD', 5.00, 'Safety Equipment', 6);

CREATE POLICY "All authenticated users can view equipment"
  ON public.equipment
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage equipment"
  ON public.equipment
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- ================================================
-- LEADS TABLE
-- ================================================

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number VARCHAR(50) UNIQUE,
  status lead_status DEFAULT 'new_lead' NOT NULL,
  
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  
  property_address_street VARCHAR(255) NOT NULL,
  property_address_suburb VARCHAR(100) NOT NULL,
  property_address_state VARCHAR(10) DEFAULT 'VIC',
  property_address_postcode VARCHAR(10) NOT NULL,
  property_zone INTEGER CHECK (property_zone BETWEEN 1 AND 4),
  
  lead_source VARCHAR(100),
  issue_description TEXT,
  urgency VARCHAR(50),
  property_type VARCHAR(50),
  
  assigned_to UUID REFERENCES auth.users(id),
  quoted_amount DECIMAL(10,2),
  invoice_amount DECIMAL(10,2),
  
  inspection_scheduled_date DATE,
  inspection_completed_date DATE,
  job_scheduled_date DATE,
  job_completed_date DATE,
  invoice_sent_date DATE,
  payment_received_date DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_leads_lead_number ON public.leads(lead_number);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_suburb ON public.leads(property_address_suburb);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- RLS policies for leads
CREATE POLICY "All authenticated users can view leads"
  ON public.leads
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage all leads"
  ON public.leads
  FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Technicians can update assigned leads"
  ON public.leads
  FOR UPDATE
  USING (assigned_to = auth.uid());

-- ================================================
-- INSPECTIONS TABLE
-- ================================================

CREATE TABLE public.inspections (
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

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_inspections_lead_id ON public.inspections(lead_id);
CREATE INDEX idx_inspections_inspector_id ON public.inspections(inspector_id);
CREATE INDEX idx_inspections_date ON public.inspections(inspection_date);
CREATE INDEX idx_inspections_job_number ON public.inspections(job_number);

-- RLS policies
CREATE POLICY "All authenticated users can view inspections"
  ON public.inspections
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Technicians can create inspections"
  ON public.inspections
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Inspectors can update their inspections"
  ON public.inspections
  FOR UPDATE
  USING (inspector_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete inspections"
  ON public.inspections
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ================================================
-- INSPECTION AREAS TABLE
-- ================================================

CREATE TABLE public.inspection_areas (
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

ALTER TABLE public.inspection_areas ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_inspection_areas_inspection_id ON public.inspection_areas(inspection_id);
CREATE INDEX idx_inspection_areas_order ON public.inspection_areas(area_order);

CREATE POLICY "All authenticated users can view inspection areas"
  ON public.inspection_areas
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage inspection areas"
  ON public.inspection_areas
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ================================================
-- MOISTURE READINGS TABLE
-- ================================================

CREATE TABLE public.moisture_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES public.inspection_areas(id) ON DELETE CASCADE NOT NULL,
  reading_order INTEGER,
  
  title VARCHAR(255),
  moisture_percentage DECIMAL(5,2) NOT NULL,
  moisture_status moisture_status,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.moisture_readings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_moisture_readings_area_id ON public.moisture_readings(area_id);

CREATE POLICY "All authenticated users can manage moisture readings"
  ON public.moisture_readings
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ================================================
-- SUBFLOOR DATA TABLE
-- ================================================

CREATE TABLE public.subfloor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  observations TEXT,
  comments TEXT,
  comments_approved BOOLEAN DEFAULT false,
  
  landscape subfloor_landscape,
  
  sanitation_required BOOLEAN DEFAULT false,
  racking_required BOOLEAN DEFAULT false,
  
  treatment_time_minutes INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subfloor_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can manage subfloor data"
  ON public.subfloor_data
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ================================================
-- SUBFLOOR READINGS TABLE
-- ================================================

CREATE TABLE public.subfloor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subfloor_id UUID REFERENCES public.subfloor_data(id) ON DELETE CASCADE NOT NULL,
  reading_order INTEGER,
  
  moisture_percentage DECIMAL(5,2) NOT NULL,
  location VARCHAR(255) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subfloor_readings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subfloor_readings_subfloor_id ON public.subfloor_readings(subfloor_id);

CREATE POLICY "All authenticated users can manage subfloor readings"
  ON public.subfloor_readings
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ================================================
-- EQUIPMENT BOOKINGS TABLE
-- ================================================

CREATE TABLE public.equipment_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES public.equipment(id) NOT NULL,
  
  quantity INTEGER NOT NULL DEFAULT 1,
  duration_days INTEGER NOT NULL,
  
  daily_rate DECIMAL(10,2),
  total_cost_ex_gst DECIMAL(10,2),
  total_cost_inc_gst DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.equipment_bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_equipment_bookings_inspection_id ON public.equipment_bookings(inspection_id);
CREATE INDEX idx_equipment_bookings_equipment_id ON public.equipment_bookings(equipment_id);

CREATE POLICY "All authenticated users can manage equipment bookings"
  ON public.equipment_bookings
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ================================================
-- PHOTOS TABLE
-- ================================================

CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.inspection_areas(id) ON DELETE CASCADE,
  subfloor_id UUID REFERENCES public.subfloor_data(id) ON DELETE CASCADE,
  
  photo_type VARCHAR(50) NOT NULL,
  
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  caption VARCHAR(500),
  order_index INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_photos_inspection_id ON public.photos(inspection_id);
CREATE INDEX idx_photos_area_id ON public.photos(area_id);
CREATE INDEX idx_photos_type ON public.photos(photo_type);

CREATE POLICY "All authenticated users can manage photos"
  ON public.photos
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ================================================
-- CALENDAR EVENTS TABLE
-- ================================================

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
  
  event_type VARCHAR(50) NOT NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  
  assigned_to UUID REFERENCES auth.users(id) NOT NULL,
  location_address VARCHAR(500),
  
  status booking_status DEFAULT 'scheduled',
  
  travel_time_minutes INTEGER,
  travel_from_suburb VARCHAR(100),
  travel_to_suburb VARCHAR(100),
  
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_datetime);
CREATE INDEX idx_calendar_events_assigned_to ON public.calendar_events(assigned_to);
CREATE INDEX idx_calendar_events_type ON public.calendar_events(event_type);
CREATE INDEX idx_calendar_events_status ON public.calendar_events(status);

CREATE POLICY "All authenticated users can view calendar events"
  ON public.calendar_events
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own calendar events"
  ON public.calendar_events
  FOR ALL
  USING (assigned_to = auth.uid() OR public.is_admin(auth.uid()));

-- ================================================
-- INVOICES TABLE
-- ================================================

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) NOT NULL,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
  
  invoice_number VARCHAR(50) UNIQUE,
  status invoice_status DEFAULT 'draft',
  
  subtotal_ex_gst DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL,
  total_inc_gst DECIMAL(10,2) NOT NULL,
  
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_terms_days INTEGER DEFAULT 14,
  
  payment_method payment_method,
  paid_date DATE,
  paid_amount DECIMAL(10,2),
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_lead_id ON public.invoices(lead_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

CREATE POLICY "All authenticated users can view invoices"
  ON public.invoices
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage invoices"
  ON public.invoices
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- ================================================
-- ACTIVITIES TABLE (Timeline/Audit Log)
-- ================================================

CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  
  activity_type VARCHAR(100) NOT NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX idx_activities_type ON public.activities(activity_type);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);

CREATE POLICY "All authenticated users can view activities"
  ON public.activities
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create activities"
  ON public.activities
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ================================================
-- PASSWORD RESET TOKENS TABLE
-- ================================================

CREATE TABLE public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- ================================================
-- CLIENT BOOKING TOKENS TABLE
-- ================================================

CREATE TABLE public.client_booking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  booked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.client_booking_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_client_booking_tokens_token ON public.client_booking_tokens(token);
CREATE INDEX idx_client_booking_tokens_inspection_id ON public.client_booking_tokens(inspection_id);

-- ================================================
-- UTILITY FUNCTIONS
-- ================================================

-- Calculate moisture status from percentage
CREATE OR REPLACE FUNCTION public.calculate_moisture_status(percentage DECIMAL)
RETURNS moisture_status
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF percentage <= 12 THEN
    RETURN 'dry'::moisture_status;
  ELSIF percentage <= 18 THEN
    RETURN 'elevated'::moisture_status;
  ELSIF percentage <= 25 THEN
    RETURN 'wet'::moisture_status;
  ELSE
    RETURN 'very_wet'::moisture_status;
  END IF;
END;
$$;

-- Calculate GST
CREATE OR REPLACE FUNCTION public.calculate_gst(amount_ex_gst DECIMAL)
RETURNS DECIMAL
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT ROUND(amount_ex_gst * 0.10, 2);
$$;

-- Calculate total including GST
CREATE OR REPLACE FUNCTION public.calculate_total_inc_gst(amount_ex_gst DECIMAL)
RETURNS DECIMAL
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT ROUND(amount_ex_gst * 1.10, 2);
$$;

-- Calculate dew point
CREATE OR REPLACE FUNCTION public.calculate_dew_point(temperature DECIMAL, humidity DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  a CONSTANT DECIMAL := 17.27;
  b CONSTANT DECIMAL := 237.7;
  alpha DECIMAL;
BEGIN
  alpha := ((a * temperature) / (b + temperature)) + LN(humidity / 100.0);
  RETURN ROUND((b * alpha) / (a - alpha), 2);
END;
$$;

-- Generate lead number
CREATE OR REPLACE FUNCTION public.generate_lead_number()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  new_lead_number VARCHAR(50);
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(lead_number FROM 10) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM public.leads
  WHERE lead_number LIKE 'MRC-' || current_year || '-%';
  
  new_lead_number := 'MRC-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN new_lead_number;
END;
$$;

-- Generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  new_invoice_number VARCHAR(50);
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || current_year || '-%';
  
  new_invoice_number := 'INV-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN new_invoice_number;
END;
$$;

-- ================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ================================================

-- Note: update_profiles_updated_at trigger already exists, skipping

CREATE TRIGGER update_pricing_settings_updated_at
  BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_areas_updated_at
  BEFORE UPDATE ON public.inspection_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subfloor_data_updated_at
  BEFORE UPDATE ON public.subfloor_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_bookings_updated_at
  BEFORE UPDATE ON public.equipment_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- STORAGE BUCKETS
-- ================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('inspection-photos', 'inspection-photos', false),
  ('report-pdfs', 'report-pdfs', false),
  ('company-assets', 'company-assets', true),
  ('user-avatars', 'user-avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for inspection-photos
CREATE POLICY "Authenticated users can upload inspection photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'inspection-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view inspection photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'inspection-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete their inspection photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'inspection-photos' AND
    auth.role() = 'authenticated'
  );

-- Storage policies for report-pdfs
CREATE POLICY "Authenticated users can upload report PDFs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'report-pdfs' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view report PDFs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'report-pdfs' AND
    auth.role() = 'authenticated'
  );

-- Storage policies for company-assets (public)
CREATE POLICY "Anyone can view company assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "Admins can upload company assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'company-assets' AND
    public.is_admin(auth.uid())
  );

-- Storage policies for user-avatars
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own avatar"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
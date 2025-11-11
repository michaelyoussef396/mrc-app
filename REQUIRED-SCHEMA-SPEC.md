# MRC Lead Management System - Required Database Schema Specification

**Version:** 1.0
**Date:** 2025-11-11
**Purpose:** Comprehensive specification of the REQUIRED database schema based on MRC technical documentation
**Source Documents:**
- `/context/MRC-TECHNICAL-SPEC.md` (Technical Implementation)
- `/context/MRC-PRD.md` (Product Requirements)
- `CLAUDE.md` (Project Guide)

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Required Tables](#required-tables)
3. [Current vs Required Comparison](#current-vs-required-comparison)
4. [Migration Checklist](#migration-checklist)
5. [Naming Conventions](#naming-conventions)
6. [Critical Issues](#critical-issues)

---

## Schema Overview

### **Total Required Tables: 11**

#### Sprint 1 (Production Ready):
1. `leads` - Lead pipeline management (12 stages)
2. `inspection_reports` - Detailed inspection data (100+ fields)
3. `calendar_bookings` - Inspection/job scheduling with travel time logic
4. `email_logs` - Email delivery tracking
5. `offline_queue` - Offline sync queue
6. `suburb_zones` - Suburb-to-zone mappings for travel time
7. `user_roles` - User permissions (admin, technician, manager)
8. `pricing_settings` - Editable pricing configuration
9. `equipment` - Equipment rental rates
10. `profiles` - Extended user profiles

#### Sprint 2 (Future):
11. `invoices` - Invoice generation and tracking

### **Helper Functions Required:**
- `update_updated_at_column()` - Auto-update timestamps
- `has_role(_user_id UUID, _role app_role)` - Check user role
- `is_admin(_user_id UUID)` - Check admin status
- `generate_lead_number()` - Generate unique lead numbers (MRC-2025-0001)

---

## Required Tables

### **1. `leads` Table**

**Purpose:** Central table for all lead information across 12-stage pipeline

**Source:** MRC-TECHNICAL-SPEC.md lines 107-199, MRC-PRD.md lines 117-130

#### Required Columns:

```sql
CREATE TABLE public.leads (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lead Tracking
  lead_number TEXT UNIQUE NOT NULL,  -- Format: MRC-2025-0001
  source TEXT NOT NULL CHECK (source IN ('website', 'hipages', 'phone', 'referral', 'repeat')),
  hipages_lead_id TEXT UNIQUE,  -- HiPages external ID (nullable)

  -- Pipeline Status (12 stages)
  status TEXT NOT NULL DEFAULT 'new_lead' CHECK (status IN (
    'hipages_lead',           -- Stage 1: HiPages lead (suburb/phone/email only)
    'new_lead',               -- Stage 2: Complete lead details filled
    'inspection_booked',      -- Stage 3: Inspection scheduled (awaiting inspection)
    'inspection_in_progress', -- Stage 4: Technician started inspection
    'report_pdf_approval',    -- Stage 5: PDF generated, awaiting technician approval
    'awaiting_job_approval',  -- Stage 6: Report sent, awaiting customer booking
    'job_booked',             -- Stage 7: Customer booked remediation job
    'job_in_progress',        -- Stage 8: Job started
    'job_completed',          -- Stage 9: Job finished (Sprint 2)
    'invoice_sent',           -- Stage 10: Invoice emailed (Sprint 2)
    'payment_received',       -- Stage 11: Payment confirmed (Sprint 2)
    'job_closed'              -- Stage 12: Review requested (Sprint 2)
  )),

  -- Customer Information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,  -- Format: 04XX XXX XXX or (0X) XXXX XXXX

  -- Property Address
  property_address TEXT NOT NULL,  -- Full street address
  property_suburb TEXT NOT NULL,
  property_postcode TEXT NOT NULL,  -- VIC: 3000-3999, 8000-8999
  property_zone INTEGER CHECK (property_zone BETWEEN 1 AND 4),  -- Calculated from suburb

  -- Lead Details
  urgency TEXT CHECK (urgency IN ('ASAP', 'within_week', 'next_couple_weeks', 'within_month', 'next_couple_months')),
  issue_description TEXT,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('phone', 'email', 'sms')),

  -- Inspection Scheduling
  inspection_date TIMESTAMPTZ,
  inspection_technician_id UUID REFERENCES auth.users(id),
  inspection_duration_hours DECIMAL(3,1),  -- 1.0, 2.0, etc.
  inspection_notes TEXT,

  -- Inspection Completion
  inspection_completed_at TIMESTAMPTZ,
  inspection_report_id UUID REFERENCES inspection_reports(id),
  inspection_pdf_url TEXT,  -- URL to approved PDF in Supabase Storage
  inspection_pdf_approved_at TIMESTAMPTZ,

  -- Job Scheduling
  job_start_date TIMESTAMPTZ,
  job_end_date TIMESTAMPTZ,  -- For multi-day jobs
  job_technician_id UUID REFERENCES auth.users(id),
  job_estimated_hours DECIMAL(5,1),
  job_estimated_cost DECIMAL(10,2),  -- ex GST
  job_notes TEXT,

  -- Job Completion (Sprint 2)
  job_completed_at TIMESTAMPTZ,
  actual_hours DECIMAL(5,1),
  actual_cost DECIMAL(10,2),

  -- Invoicing (Sprint 2)
  invoice_sent_at TIMESTAMPTZ,
  invoice_amount DECIMAL(10,2),  -- inc GST
  invoice_due_date DATE,
  payment_received_at TIMESTAMPTZ,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'card', 'cash', 'cheque')),

  -- Audit Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),  -- Current owner

  -- Soft Delete
  deleted_at TIMESTAMPTZ
);
```

#### Required Indexes:
```sql
CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_inspection_date ON leads(inspection_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_job_start_date ON leads(job_start_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_customer_phone ON leads(customer_phone);
CREATE INDEX idx_leads_customer_email ON leads(customer_email);
CREATE INDEX idx_leads_lead_number ON leads(lead_number);
```

#### Required Trigger:
```sql
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Required RLS Policies:
```sql
-- Technicians can view leads assigned to them
CREATE POLICY "technicians_view_assigned_leads"
  ON leads FOR SELECT
  USING (auth.uid() = assigned_to);

-- Admins can view all leads
CREATE POLICY "admins_view_all_leads"
  ON leads FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can insert/update/delete leads
CREATE POLICY "admins_manage_leads"
  ON leads FOR ALL
  USING (public.is_admin(auth.uid()));
```

---

### **2. `inspection_reports` Table**

**Purpose:** Store complete inspection form data (100+ fields)

**Source:** MRC-TECHNICAL-SPEC.md lines 206-291, MRC-PRD.md lines 270-377

**CRITICAL RENAME:** Current table is named `inspections`, should be `inspection_reports` per spec.

#### Required Columns:

```sql
CREATE TABLE public.inspection_reports (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Report Metadata
  job_number TEXT UNIQUE NOT NULL,  -- Format: MRC-2025-0001 (same as lead_number)
  inspection_date TIMESTAMPTZ NOT NULL,
  technician_id UUID NOT NULL REFERENCES auth.users(id),
  technician_name TEXT NOT NULL,  -- Stored for PDF generation
  report_status TEXT NOT NULL DEFAULT 'draft' CHECK (report_status IN ('draft', 'pending_approval', 'approved', 'sent')),

  -- Customer & Property (duplicated from leads for PDF generation)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_abn TEXT,  -- Format: XX XXX XXX XXX (optional)
  property_address TEXT NOT NULL,
  property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'industrial')),
  property_occupation TEXT CHECK (property_occupation IN ('tenanted', 'vacant', 'owner_occupied', 'tenants_vacating')),
  dwelling_type TEXT CHECK (dwelling_type IN ('house', 'units', 'apartment', 'duplex', 'townhouse', 'commercial', 'construction', 'industrial')),

  -- Outdoor Environment
  outdoor_temperature DECIMAL(4,1),  -- -10.0 to 50.0°C
  outdoor_humidity DECIMAL(4,1),  -- 0.0 to 100.0%
  outdoor_dew_point DECIMAL(4,1),
  outdoor_photos JSONB,  -- [{url: '...', caption: '...', timestamp: '...'}] (min 3 photos)
  outdoor_comments TEXT,

  -- Area Inspections (Repeatable)
  areas JSONB NOT NULL,  -- Array of area objects (see structure below)

  -- Subfloor Assessment (Toggle)
  subfloor_required BOOLEAN DEFAULT false,
  subfloor_observations TEXT,
  subfloor_landscape TEXT CHECK (subfloor_landscape IN ('flat_block', 'sloping_block')),
  subfloor_comments TEXT,
  subfloor_readings JSONB,  -- [{location: '...', reading: X.X}]
  subfloor_photos JSONB,  -- (min 6 photos if enabled)
  subfloor_sanitation BOOLEAN DEFAULT false,
  subfloor_racking BOOLEAN DEFAULT false,
  subfloor_treatment_time TEXT,

  -- Demolition Details (Toggle - NEW PAGE IN PDF)
  demolition_required BOOLEAN DEFAULT false,
  demolition_details JSONB,  -- [{area_name: '...', specifications: '...'}]

  -- Inventory Assessment (Toggle - NEW PAGE IN PDF)
  inventory_required BOOLEAN DEFAULT false,
  inventory_salvageable JSONB,  -- [{item: '...', treatment: '...'}]
  inventory_non_salvageable JSONB,  -- [{item: '...', disposal: '...'}]
  inventory_notes TEXT,
  inventory_onsite_confirmation TEXT,

  -- Work Procedures
  waste_disposal_required BOOLEAN DEFAULT false,
  waste_disposal_size TEXT CHECK (waste_disposal_size IN ('small', 'medium', 'large', 'extra_large')),
  hepa_vac BOOLEAN DEFAULT false,
  antimicrobial BOOLEAN DEFAULT false,
  fogging BOOLEAN DEFAULT false,

  -- Drying Equipment (Toggle)
  drying_equipment_required BOOLEAN DEFAULT false,
  equipment_dehumidifiers INTEGER DEFAULT 0,
  equipment_air_movers INTEGER DEFAULT 0,
  equipment_rcd_box BOOLEAN DEFAULT false,
  equipment_days INTEGER DEFAULT 0,

  -- Direction Photos (Toggle)
  direction_photos_required BOOLEAN DEFAULT false,
  direction_photos JSONB,  -- {front_door: '...', front_house: '...', mailbox: '...', street_view: '...'}

  -- Pricing Calculation (ex GST)
  job_type TEXT NOT NULL CHECK (job_type IN ('no_demolition', 'demolition', 'construction', 'subfloor')),
  estimated_hours DECIMAL(5,1) NOT NULL,
  base_rate DECIMAL(10,2) NOT NULL,
  multi_day_discount DECIMAL(5,4),  -- 0.925 (7.5%) or 0.87 (13% cap)
  equipment_cost DECIMAL(10,2) DEFAULT 0,
  total_cost_ex_gst DECIMAL(10,2) NOT NULL,
  total_cost_inc_gst DECIMAL(10,2) NOT NULL,

  -- AI-Generated Summary
  ai_summary TEXT,  -- Claude-generated summary (editable)
  ai_summary_prompt TEXT,  -- Prompt used for generation (for versioning)
  ai_summary_generated_at TIMESTAMPTZ,

  -- Additional Sections
  scope_of_works TEXT,
  exclusions TEXT,
  assumptions TEXT,
  technician_notes TEXT,  -- Internal notes (not in PDF)

  -- PDF Generation
  pdf_url_draft TEXT,  -- Draft PDF URL
  pdf_url_approved TEXT,  -- Approved PDF URL (final, locked)
  pdf_version INTEGER DEFAULT 1,
  pdf_regeneration_count INTEGER DEFAULT 0,
  pdf_generated_at TIMESTAMPTZ,
  pdf_approved_by UUID REFERENCES auth.users(id),
  pdf_approved_at TIMESTAMPTZ,

  -- Audit Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft Delete
  deleted_at TIMESTAMPTZ
);
```

#### Area Object Structure (JSONB):
```typescript
// Each area in the `areas` JSONB array:
{
  area_name: string,  // "Bathroom", "Living Room", etc.
  temperature: number,  // °C
  humidity: number,  // %
  dew_point: number,
  visible_mould_locations: string[],  // Checkboxes: ['ceiling', 'walls', 'floor', 'fixtures']
  moisture_readings: {
    internal: { location: string, reading: number }[],
    external: { location: string, reading: number }[]
  },
  room_view_photos: { url: string, caption: string, timestamp: string }[],  // min 4
  infrared_enabled: boolean,
  infrared_photos: { url: string, caption: string }[],
  infrared_observations: string,
  work_procedure: 'no_demo' | 'demo_required',
  demolition_description: string,  // If demo_required
  internal_notes: string,  // Not shown in PDF
  area_notes: string  // Shown in PDF (plain text, no AI)
}
```

#### Required Indexes:
```sql
CREATE INDEX idx_inspection_reports_lead_id ON inspection_reports(lead_id);
CREATE INDEX idx_inspection_reports_technician_id ON inspection_reports(technician_id);
CREATE INDEX idx_inspection_reports_status ON inspection_reports(report_status);
CREATE INDEX idx_inspection_reports_job_number ON inspection_reports(job_number);
CREATE INDEX idx_inspection_reports_created_at ON inspection_reports(created_at DESC);
```

#### Required Trigger:
```sql
CREATE TRIGGER update_inspection_reports_updated_at
  BEFORE UPDATE ON inspection_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Required RLS Policies:
```sql
-- Technicians can view their own inspection reports
CREATE POLICY "technicians_view_own_reports"
  ON inspection_reports FOR SELECT
  USING (auth.uid() = technician_id);

-- Admins can view all reports
CREATE POLICY "admins_view_all_reports"
  ON inspection_reports FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Technicians can create/update their own reports
CREATE POLICY "technicians_manage_own_reports"
  ON inspection_reports FOR INSERT
  WITH CHECK (auth.uid() = technician_id);

CREATE POLICY "technicians_update_own_reports"
  ON inspection_reports FOR UPDATE
  USING (auth.uid() = technician_id);

-- Admins can manage all reports
CREATE POLICY "admins_manage_reports"
  ON inspection_reports FOR ALL
  USING (public.is_admin(auth.uid()));
```

---

### **3. `calendar_bookings` Table**

**Purpose:** Store inspection and job bookings with travel time logic

**Source:** MRC-TECHNICAL-SPEC.md lines 299-343, MRC-PRD.md lines 1405-1675

**CRITICAL RENAME:** Current table is named `calendar_events`, should be `calendar_bookings` per spec.

#### Required Columns:

```sql
CREATE TABLE public.calendar_bookings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Booking Type
  booking_type TEXT NOT NULL CHECK (booking_type IN ('inspection', 'job')),

  -- Scheduling
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_hours DECIMAL(3,1) NOT NULL,  -- 1.0, 2.0, 8.0
  technician_id UUID NOT NULL REFERENCES auth.users(id),

  -- Travel Time Logic
  property_suburb TEXT NOT NULL,  -- For travel time calculation
  property_zone INTEGER NOT NULL CHECK (property_zone BETWEEN 1 AND 4),
  previous_booking_id UUID REFERENCES calendar_bookings(id),
  previous_booking_zone INTEGER,
  travel_time_minutes INTEGER,  -- Calculated from zone matrix

  -- Status
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'in_progress', 'completed', 'cancelled')),

  -- Notes
  booking_notes TEXT,
  customer_booked BOOLEAN DEFAULT false,  -- true if customer self-booked

  -- Audit Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Soft Delete
  deleted_at TIMESTAMPTZ
);
```

#### Required Indexes:
```sql
CREATE INDEX idx_calendar_bookings_technician_date ON calendar_bookings(technician_id, start_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_bookings_lead_id ON calendar_bookings(lead_id);
CREATE INDEX idx_calendar_bookings_status ON calendar_bookings(status);
CREATE INDEX idx_calendar_bookings_start_time ON calendar_bookings(start_time);
CREATE INDEX idx_calendar_bookings_end_time ON calendar_bookings(end_time);

-- Constraint: Prevent overlapping bookings for same technician
CREATE UNIQUE INDEX idx_no_overlap_bookings
  ON calendar_bookings(technician_id, start_time, end_time)
  WHERE deleted_at IS NULL;
```

#### Required Trigger:
```sql
CREATE TRIGGER update_calendar_bookings_updated_at
  BEFORE UPDATE ON calendar_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Required RLS Policies:
```sql
-- Technicians can view their own bookings
CREATE POLICY "technicians_view_own_bookings"
  ON calendar_bookings FOR SELECT
  USING (auth.uid() = technician_id);

-- Admins can view all bookings
CREATE POLICY "admins_view_all_bookings"
  ON calendar_bookings FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can manage all bookings
CREATE POLICY "admins_manage_bookings"
  ON calendar_bookings FOR ALL
  USING (public.is_admin(auth.uid()));

-- Customers can view their own bookings (via token)
CREATE POLICY "customers_view_own_bookings"
  ON calendar_bookings FOR SELECT
  USING (lead_id IN (
    SELECT id FROM leads WHERE customer_email = (auth.jwt() -> 'email')::text
  ));
```

---

### **4. `email_logs` Table**

**Purpose:** Track all automated emails sent through Resend API

**Source:** MRC-TECHNICAL-SPEC.md lines 352-379, MRC-PRD.md lines 821-1060

#### Required Columns:

```sql
CREATE TABLE public.email_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Email Details
  template_name TEXT NOT NULL,  -- 'new_lead_response', 'inspection_confirmation', 'inspection_report', etc.
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,

  -- Delivery Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  resend_email_id TEXT,  -- Resend API email ID for tracking

  -- Error Tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,  -- Resend webhook
  clicked_at TIMESTAMPTZ,  -- Resend webhook
  bounced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Required Indexes:
```sql
CREATE INDEX idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_template ON email_logs(template_name);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
```

#### Required RLS Policies:
```sql
-- Only admins can view email logs
CREATE POLICY "admins_view_email_logs"
  ON email_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- System can insert email logs (via service role)
-- No RLS policy needed for insert (Edge Functions use service role)
```

---

### **5. `offline_queue` Table**

**Purpose:** Store actions performed while offline for later sync

**Source:** MRC-TECHNICAL-SPEC.md lines 388-416, MRC-PRD.md lines 653-684

#### Required Columns:

```sql
CREATE TABLE public.offline_queue (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Context
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Action Details
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id UUID,  -- ID of the record being created/updated/deleted
  payload JSONB NOT NULL,  -- The data to sync

  -- Sync Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed', 'conflict')),
  sync_error TEXT,
  sync_attempts INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- When offline action was queued
  synced_at TIMESTAMPTZ,  -- When successfully synced

  -- Conflict Resolution
  conflict_data JSONB  -- Store conflicting server data if needed
);
```

#### Required Indexes:
```sql
CREATE INDEX idx_offline_queue_user_id ON offline_queue(user_id);
CREATE INDEX idx_offline_queue_status ON offline_queue(status);
CREATE INDEX idx_offline_queue_created_at ON offline_queue(created_at);
CREATE INDEX idx_offline_queue_table ON offline_queue(table_name);
```

#### Required RLS Policies:
```sql
-- Users can only view/manage their own offline queue
CREATE POLICY "users_view_own_queue"
  ON offline_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_queue"
  ON offline_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_queue"
  ON offline_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all queues
CREATE POLICY "admins_view_all_queues"
  ON offline_queue FOR SELECT
  USING (public.is_admin(auth.uid()));
```

---

### **6. `suburb_zones` Table**

**Purpose:** Pre-defined suburb-to-zone mappings for travel time calculations

**Source:** MRC-TECHNICAL-SPEC.md lines 424-457, MRC-PRD.md lines 1520-1570

#### Required Columns:

```sql
CREATE TABLE public.suburb_zones (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Suburb Details
  suburb TEXT NOT NULL UNIQUE,  -- Lowercase for case-insensitive lookup
  postcode TEXT NOT NULL,
  zone INTEGER NOT NULL CHECK (zone BETWEEN 1 AND 4),

  -- State
  state TEXT NOT NULL DEFAULT 'VIC' CHECK (state IN ('VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Required Indexes:
```sql
CREATE INDEX idx_suburb_zones_suburb ON suburb_zones(LOWER(suburb));
CREATE INDEX idx_suburb_zones_postcode ON suburb_zones(postcode);
CREATE INDEX idx_suburb_zones_zone ON suburb_zones(zone);
```

#### Seed Data Required:
```sql
-- Zone 1: Inner Melbourne (CBD + immediate suburbs)
INSERT INTO suburb_zones (suburb, postcode, zone, state) VALUES
  ('melbourne', '3000', 1, 'VIC'),
  ('carlton', '3053', 1, 'VIC'),
  ('fitzroy', '3065', 1, 'VIC'),
  ('richmond', '3121', 1, 'VIC'),
  ('south yarra', '3141', 1, 'VIC'),
  ('prahran', '3181', 1, 'VIC'),
  ('st kilda', '3182', 1, 'VIC'),
  ('port melbourne', '3207', 1, 'VIC'),
  ('docklands', '3008', 1, 'VIC'),
  ('southbank', '3006', 1, 'VIC'),
  ('collingwood', '3066', 1, 'VIC'),
  ('north melbourne', '3051', 1, 'VIC');

-- Zone 2: Middle Melbourne
INSERT INTO suburb_zones (suburb, postcode, zone, state) VALUES
  ('preston', '3072', 2, 'VIC'),
  ('thornbury', '3071', 2, 'VIC'),
  ('northcote', '3070', 2, 'VIC'),
  ('coburg', '3058', 2, 'VIC'),
  ('brunswick', '3056', 2, 'VIC'),
  ('footscray', '3011', 2, 'VIC'),
  ('newport', '3015', 2, 'VIC'),
  ('yarraville', '3013', 2, 'VIC'),
  ('hawthorn', '3122', 2, 'VIC'),
  ('kew', '3101', 2, 'VIC'),
  ('camberwell', '3124', 2, 'VIC'),
  ('malvern', '3144', 2, 'VIC'),
  ('caulfield', '3162', 2, 'VIC'),
  ('elsternwick', '3185', 2, 'VIC'),
  ('brighton', '3186', 2, 'VIC');

-- Zone 3: Outer Melbourne
INSERT INTO suburb_zones (suburb, postcode, zone, state) VALUES
  ('frankston', '3199', 3, 'VIC'),
  ('dandenong', '3175', 3, 'VIC'),
  ('cranbourne', '3977', 3, 'VIC'),
  ('pakenham', '3810', 3, 'VIC'),
  ('berwick', '3806', 3, 'VIC'),
  ('narre warren', '3805', 3, 'VIC'),
  ('werribee', '3030', 3, 'VIC'),
  ('sunbury', '3429', 3, 'VIC'),
  ('melton', '3337', 3, 'VIC'),
  ('epping', '3076', 3, 'VIC'),
  ('reservoir', '3073', 3, 'VIC'),
  ('bundoora', '3083', 3, 'VIC'),
  ('airport west', '3042', 3, 'VIC'),
  ('mernda', '3754', 3, 'VIC'),
  ('croydon', '3136', 3, 'VIC');

-- Zone 4: Extended areas
INSERT INTO suburb_zones (suburb, postcode, zone, state) VALUES
  ('geelong', '3220', 4, 'VIC'),
  ('ballarat', '3350', 4, 'VIC'),
  ('bendigo', '3550', 4, 'VIC'),
  ('mornington', '3931', 4, 'VIC');

-- (Full list of 200+ suburbs in separate seed file)
```

#### Travel Time Matrix (Constant):
```sql
-- Stored in application code, not database
const TRAVEL_TIME_MATRIX = {
  1: { 1: 15, 2: 30, 3: 45, 4: 60 },
  2: { 1: 30, 2: 20, 3: 40, 4: 55 },
  3: { 1: 45, 2: 40, 3: 25, 4: 45 },
  4: { 1: 60, 2: 55, 3: 45, 4: 30 }
};
```

#### Required RLS Policies:
```sql
-- All authenticated users can view suburb zones
CREATE POLICY "authenticated_view_suburb_zones"
  ON suburb_zones FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can manage suburb zones
CREATE POLICY "admins_manage_suburb_zones"
  ON suburb_zones FOR ALL
  USING (public.is_admin(auth.uid()));
```

---

### **7. `user_roles` Table**

**Purpose:** User permissions (admin, technician, manager)

**Source:** MRC-TECHNICAL-SPEC.md lines 120-186

#### Required Columns:

```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'manager')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)  -- User can have multiple roles
);
```

#### Required Indexes:
```sql
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
```

#### Required Helper Functions:
```sql
-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
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

-- Check if user is admin
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
```

#### Required RLS Policies:
```sql
-- Users can view their own roles
CREATE POLICY "users_view_own_roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "admins_view_all_roles"
  ON user_roles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can manage roles
CREATE POLICY "admins_insert_roles"
  ON user_roles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins_update_roles"
  ON user_roles FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "admins_delete_roles"
  ON user_roles FOR DELETE
  USING (public.is_admin(auth.uid()));
```

---

### **8. `pricing_settings` Table**

**Purpose:** Editable pricing configuration

**Source:** MRC-TECHNICAL-SPEC.md lines 204-230, MRC-PRD.md lines 342-364

#### Required Columns:

```sql
CREATE TABLE public.pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL UNIQUE CHECK (job_type IN ('no_demolition', 'demolition', 'construction', 'subfloor')),
  hours_2_rate DECIMAL(10,2) NOT NULL,  -- 2-hour rate (ex GST)
  hours_8_rate DECIMAL(10,2) NOT NULL,  -- 8-hour rate (ex GST)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Default Pricing (Seed Data):
```sql
INSERT INTO pricing_settings (job_type, hours_2_rate, hours_8_rate) VALUES
  ('no_demolition', 612.00, 1216.99),
  ('demolition', 711.90, 1798.90),
  ('construction', 661.96, 1507.95),
  ('subfloor', 900.00, 2334.69);
```

#### Required Trigger:
```sql
CREATE TRIGGER update_pricing_settings_updated_at
  BEFORE UPDATE ON pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Required RLS Policies:
```sql
-- All authenticated users can view pricing
CREATE POLICY "authenticated_view_pricing"
  ON pricing_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can update pricing
CREATE POLICY "admins_update_pricing"
  ON pricing_settings FOR ALL
  USING (public.is_admin(auth.uid()));
```

---

### **9. `equipment` Table**

**Purpose:** Equipment rental rates

**Source:** MRC-TECHNICAL-SPEC.md lines 236-264, MRC-PRD.md lines 342-364

#### Required Columns:

```sql
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,  -- ex GST
  category VARCHAR(100),
  description TEXT,
  quantity_available INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Default Equipment (Seed Data):
```sql
INSERT INTO equipment (name, daily_rate, category, quantity_available) VALUES
  ('Dehumidifier', 132.00, 'Drying Equipment', 4),
  ('Air Mover / Blower', 46.00, 'Drying Equipment', 8),
  ('RCD', 5.00, 'Safety Equipment', 6);
```

#### Required Indexes:
```sql
CREATE INDEX idx_equipment_is_active ON equipment(is_active);
CREATE INDEX idx_equipment_category ON equipment(category);
```

#### Required Trigger:
```sql
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Required RLS Policies:
```sql
-- All authenticated users can view equipment
CREATE POLICY "authenticated_view_equipment"
  ON equipment FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can manage equipment
CREATE POLICY "admins_manage_equipment"
  ON equipment FOR ALL
  USING (public.is_admin(auth.uid()));
```

---

### **10. `profiles` Table (Extended)**

**Purpose:** Extended user profiles

**Source:** MRC-TECHNICAL-SPEC.md lines 192-198

**NOTE:** Table exists from Supabase Auth, needs extension columns added.

#### Required Additional Columns:

```sql
-- Extend existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
```

#### Required Indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
```

---

### **11. `invoices` Table (Sprint 2)**

**Purpose:** Invoice generation and tracking

**Source:** MRC-PRD.md lines 509-543

**STATUS:** Sprint 2 - Not required for initial production demo

#### Required Columns (Future):

```sql
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,  -- MRC-INV-2025-0001

  -- Invoice Details
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount_ex_gst DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL,
  amount_inc_gst DECIMAL(10,2) NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'overdue', 'paid', 'cancelled')),

  -- Payment
  paid_at TIMESTAMPTZ,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'card', 'cash', 'cheque')),

  -- PDF
  pdf_url TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  deleted_at TIMESTAMPTZ
);
```

---

## Current vs Required Comparison

### **Critical Naming Discrepancies:**

| Current Name | Required Name | Status | Priority |
|-------------|--------------|--------|----------|
| `inspections` | `inspection_reports` | RENAME REQUIRED | P0 - CRITICAL |
| `calendar_events` | `calendar_bookings` | RENAME REQUIRED | P0 - CRITICAL |

### **Missing Tables:**

None identified - all Sprint 1 tables exist.

### **Missing Columns:**

#### `leads` table:
- ✅ All required columns present (verified in migration 20251111000014_fix_leads_column_names.sql)

#### `inspection_reports` table (currently `inspections`):
- ⚠️ Need to verify all JSONB structures match spec
- ⚠️ Need to verify toggle fields (demolition_required, subfloor_required, etc.)
- ⚠️ Need to verify PDF versioning columns (pdf_url_draft, pdf_url_approved)

#### `calendar_bookings` table (currently `calendar_events`):
- ✅ All required columns verified in migration 20251111000003

#### `email_logs` table:
- ✅ All required columns verified in migration 20251111000008

#### `offline_queue` table:
- ✅ All required columns verified in migration 20251111000010

#### `suburb_zones` table:
- ✅ All required columns verified in migration 20251111000004

### **Missing Indexes:**

Review each table's indexes against spec - most appear complete.

### **Missing RLS Policies:**

- ✅ `leads` - Policies enabled in migration 20251111000001
- ✅ `inspection_reports` - Policies enabled in migration 20251111000002
- ✅ `calendar_bookings` - Policies enabled in migration 20251111000003
- ⚠️ Need to verify specific policy rules match spec

### **Missing Helper Functions:**

- ✅ `update_updated_at_column()` - Present in migration 20251111000011
- ✅ `has_role()` - Present in migration 20251111000011
- ✅ `is_admin()` - Present in migration 20251111000011
- ⚠️ Need to verify exact function signatures match spec

---

## Migration Checklist

### **Phase 1: Critical Renames (BLOCKING)**

- [ ] **Task 1.1:** Rename `inspections` table to `inspection_reports`
  - Create migration to rename table
  - Update all foreign key references
  - Update all indexes
  - Update all RLS policies
  - Update all triggers
  - Test TypeScript types still work

- [ ] **Task 1.2:** Rename `calendar_events` table to `calendar_bookings`
  - Create migration to rename table
  - Update all foreign key references
  - Update all indexes
  - Update all RLS policies
  - Update all triggers
  - Test TypeScript types still work

- [ ] **Task 1.3:** Update application code references
  - Search codebase for "inspections" table references → update to "inspection_reports"
  - Search codebase for "calendar_events" table references → update to "calendar_bookings"
  - Update TypeScript types in `/src/types/database.types.ts`
  - Update all API functions in `/src/lib/api/`
  - Update all React Query hooks

### **Phase 2: Column Validation**

- [ ] **Task 2.1:** Verify `inspection_reports` JSONB structures
  - Check `areas` JSONB matches spec structure
  - Check `outdoor_photos` JSONB matches spec
  - Check `subfloor_readings` JSONB matches spec
  - Check `demolition_details` JSONB matches spec
  - Check `inventory_salvageable/non_salvageable` JSONB matches spec

- [ ] **Task 2.2:** Verify toggle fields exist
  - `demolition_required` BOOLEAN
  - `subfloor_required` BOOLEAN
  - `inventory_required` BOOLEAN
  - `drying_equipment_required` BOOLEAN
  - `direction_photos_required` BOOLEAN
  - `waste_disposal_required` BOOLEAN

- [ ] **Task 2.3:** Verify PDF versioning columns
  - `pdf_url_draft` TEXT
  - `pdf_url_approved` TEXT
  - `pdf_regeneration_count` INTEGER

### **Phase 3: Index Validation**

- [ ] **Task 3.1:** Verify all required indexes exist
  - Compare current indexes against spec for each table
  - Create missing indexes
  - Remove redundant indexes

### **Phase 4: RLS Policy Validation**

- [ ] **Task 4.1:** Verify RLS policies match spec
  - `leads` - technicians_view_assigned_leads, admins_view_all_leads, admins_manage_leads
  - `inspection_reports` - technicians_view_own_reports, admins_view_all_reports, etc.
  - `calendar_bookings` - technicians_view_own_bookings, admins_view_all_bookings, etc.
  - `email_logs` - admins_view_email_logs
  - `offline_queue` - users_view_own_queue, etc.

### **Phase 5: Helper Function Validation**

- [ ] **Task 5.1:** Verify helper functions match spec exactly
  - `update_updated_at_column()` signature
  - `has_role(_user_id UUID, _role TEXT)` signature
  - `is_admin(_user_id UUID)` signature
  - All functions use `SECURITY DEFINER` and `SET search_path = public`

### **Phase 6: Seed Data Validation**

- [ ] **Task 6.1:** Verify pricing_settings seed data
  - no_demolition: 612.00, 1216.99
  - demolition: 711.90, 1798.90
  - construction: 661.96, 1507.95
  - subfloor: 900.00, 2334.69

- [ ] **Task 6.2:** Verify equipment seed data
  - Dehumidifier: 132.00
  - Air Mover: 46.00
  - RCD: 5.00

- [ ] **Task 6.3:** Verify suburb_zones seed data
  - All 200+ suburbs loaded
  - Zones assigned correctly (1-4)
  - All VIC postcodes present

---

## Naming Conventions

### **Table Naming:**
- Use lowercase with underscores: `inspection_reports`, `calendar_bookings`
- Plural for collections: `leads`, `inspections`, `bookings`
- Descriptive, not abbreviated: `inspection_reports` not `insp_rpts`

### **Column Naming:**
- Use lowercase with underscores: `customer_name`, `property_address`
- Boolean fields: `is_active`, `demolition_required`, `subfloor_required`
- Timestamp fields: `created_at`, `updated_at`, `deleted_at`, `sent_at`
- Foreign keys: `{table}_id` (e.g., `lead_id`, `technician_id`)
- JSONB fields: Descriptive name (e.g., `areas`, `outdoor_photos`, `moisture_readings`)

### **Index Naming:**
- Pattern: `idx_{table}_{column(s)}_{optional_suffix}`
- Examples:
  - `idx_leads_status`
  - `idx_leads_inspection_date`
  - `idx_leads_assigned_to`
  - `idx_no_overlap_bookings` (unique constraint)

### **Constraint Naming:**
- Pattern: `{table}_{column}_{constraint_type}`
- Examples:
  - `leads_status_check`
  - `calendar_bookings_duration_check`

### **Function Naming:**
- Use lowercase with underscores
- Descriptive action: `update_updated_at_column()`, `has_role()`, `is_admin()`
- No abbreviations

### **Policy Naming:**
- Pattern: `{role}_{action}_{context}`
- Examples:
  - `technicians_view_assigned_leads`
  - `admins_manage_leads`
  - `users_view_own_queue`

---

## Critical Issues

### **Issue 1: Table Name Mismatches**

**Problem:** Current schema uses `inspections` and `calendar_events`, spec requires `inspection_reports` and `calendar_bookings`.

**Impact:**
- Code references wrong table names
- Documentation inconsistency
- Confusion for future developers
- Technical debt

**Resolution:**
1. Create migration to rename tables
2. Update all code references
3. Regenerate TypeScript types
4. Test thoroughly

**Priority:** P0 - BLOCKING for production

---

### **Issue 2: JSONB Structure Validation**

**Problem:** Need to verify JSONB structures in `inspection_reports` match spec exactly.

**Impact:**
- PDF generation may fail if structure doesn't match
- AI summary generation may fail
- Data validation issues

**Resolution:**
1. Create Zod schemas for all JSONB structures
2. Validate on form submission
3. Add database CHECK constraints where possible
4. Document structure in schema comments

**Priority:** P1 - Should be validated before production

---

### **Issue 3: Missing PDF Versioning Logic**

**Problem:** Need to verify PDF versioning columns and workflow match spec.

**Impact:**
- Technician may lose work if PDF regeneration fails
- Approval workflow may not work correctly

**Resolution:**
1. Verify `pdf_url_draft` and `pdf_url_approved` columns exist
2. Implement version tracking logic
3. Test regeneration workflow

**Priority:** P1 - Critical for inspection workflow

---

### **Issue 4: Travel Time Matrix Not in Database**

**Problem:** Spec says travel time matrix should be in application code, but some implementations may have stored it in database.

**Impact:**
- Inconsistency between spec and implementation
- Performance considerations

**Resolution:**
1. Confirm travel time matrix is constants in application code
2. Document why it's not in database (performance, simplicity)
3. Ensure suburb zones are complete in database

**Priority:** P2 - Works either way, but should match spec

---

## Validation Scripts

### **Script 1: Verify Table Names**

```sql
-- Check if tables exist with correct names
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspection_reports')
    THEN 'inspection_reports EXISTS'
    ELSE 'inspection_reports MISSING - Found: ' || (SELECT table_name FROM information_schema.tables WHERE table_name IN ('inspections', 'inspection_report'))
  END AS inspection_reports_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_bookings')
    THEN 'calendar_bookings EXISTS'
    ELSE 'calendar_bookings MISSING - Found: ' || (SELECT table_name FROM information_schema.tables WHERE table_name IN ('calendar_events', 'calendar_booking'))
  END AS calendar_bookings_status;
```

### **Script 2: Verify All Required Tables**

```sql
-- Check all Sprint 1 tables exist
WITH required_tables AS (
  SELECT unnest(ARRAY[
    'leads',
    'inspection_reports',
    'calendar_bookings',
    'email_logs',
    'offline_queue',
    'suburb_zones',
    'user_roles',
    'pricing_settings',
    'equipment',
    'profiles'
  ]) AS table_name
)
SELECT
  rt.table_name,
  CASE
    WHEN t.table_name IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END AS status
FROM required_tables rt
LEFT JOIN information_schema.tables t
  ON rt.table_name = t.table_name
  AND t.table_schema = 'public'
ORDER BY rt.table_name;
```

### **Script 3: Verify Required Columns on leads**

```sql
-- Check all required columns on leads table
WITH required_columns AS (
  SELECT unnest(ARRAY[
    'id', 'lead_number', 'source', 'hipages_lead_id', 'status',
    'customer_name', 'customer_email', 'customer_phone',
    'property_address', 'property_suburb', 'property_postcode', 'property_zone',
    'urgency', 'issue_description', 'preferred_contact_method',
    'inspection_date', 'inspection_technician_id', 'inspection_duration_hours', 'inspection_notes',
    'inspection_completed_at', 'inspection_report_id', 'inspection_pdf_url', 'inspection_pdf_approved_at',
    'job_start_date', 'job_end_date', 'job_technician_id', 'job_estimated_hours', 'job_estimated_cost', 'job_notes',
    'job_completed_at', 'actual_hours', 'actual_cost',
    'invoice_sent_at', 'invoice_amount', 'invoice_due_date', 'payment_received_at', 'payment_method',
    'created_at', 'updated_at', 'created_by', 'assigned_to', 'deleted_at'
  ]) AS column_name
)
SELECT
  rc.column_name,
  CASE
    WHEN c.column_name IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END AS status
FROM required_columns rc
LEFT JOIN information_schema.columns c
  ON rc.column_name = c.column_name
  AND c.table_name = 'leads'
  AND c.table_schema = 'public'
ORDER BY rc.column_name;
```

### **Script 4: Verify RLS Enabled**

```sql
-- Check RLS is enabled on all required tables
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'leads',
    'inspection_reports',
    'calendar_bookings',
    'email_logs',
    'offline_queue',
    'suburb_zones',
    'user_roles',
    'pricing_settings',
    'equipment'
  )
ORDER BY tablename;
```

### **Script 5: Count RLS Policies**

```sql
-- Count RLS policies per table
SELECT
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

---

## Summary

This document provides a comprehensive specification of the REQUIRED database schema based on the MRC technical documentation.

**Critical Actions Required:**

1. **Rename Tables:**
   - `inspections` → `inspection_reports`
   - `calendar_events` → `calendar_bookings`

2. **Validate Columns:**
   - Verify all JSONB structures match spec
   - Verify toggle fields exist
   - Verify PDF versioning columns exist

3. **Validate Indexes:**
   - Compare current indexes against spec
   - Create missing indexes

4. **Validate RLS Policies:**
   - Verify policy rules match spec
   - Test with different user roles

5. **Validate Helper Functions:**
   - Verify function signatures match spec
   - Verify SECURITY DEFINER is used

**Next Steps:**

1. Run validation scripts to identify gaps
2. Create migration plan for table renames
3. Update application code references
4. Regenerate TypeScript types
5. Test thoroughly before production deployment

---

**Document Status:** Complete
**Last Updated:** 2025-11-11
**Ready for:** Migration Planning

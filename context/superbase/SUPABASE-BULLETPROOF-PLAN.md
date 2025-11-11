# MRC Supabase Bulletproofing Plan

**Goal:** Audit current Supabase setup and make it production-ready, bulletproof, and compliant with all MRC requirements.

**Status:** 🟡 In Progress
**Owner:** Claude Code + User
**Timeline:** 1-2 days

---

## Phase 1: Current State Assessment (30 minutes)

### Task 1.1: Connect to Supabase & Analyze Current Schema

**What Claude Code Will Do:**
```bash
# Using Supabase MCP, analyze current state
- List all existing tables
- Check which migrations have been run
- Analyze RLS policy coverage
- Check indexes and constraints
- Review storage buckets
- Analyze auth configuration
```

**Required Information from User:**
```bash
# Provide these to Claude Code:
SUPABASE_PROJECT_REF="your-project-ref"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-role-key"  # For admin operations
```

**Assessment Checklist:**

**Database Tables (11 Required):**
- [ ] `leads` - Lead tracking and status management
- [ ] `inspection_reports` - Full inspection form data (JSONB)
- [ ] `calendar_bookings` - Time slot management with conflicts
- [ ] `jobs` - Scheduled remediation work
- [ ] `photos` - Photo uploads with metadata
- [ ] `notes` - Communication history and internal notes
- [ ] `email_logs` - Track all automated emails
- [ ] `sms_logs` - Track all SMS messages
- [ ] `notifications` - System-wide notifications
- [ ] `pricing_settings` - Admin-configurable pricing
- [ ] `suburb_zones` - Melbourne suburb-to-zone mapping (200+ suburbs)

**Database Features:**
- [ ] Auto-updating timestamps (`updated_at` triggers)
- [ ] UUID primary keys on all tables
- [ ] Foreign key constraints with CASCADE
- [ ] Check constraints (phone numbers, postcodes, status enums)
- [ ] Indexes on frequently queried columns
- [ ] JSONB columns for nested data (inspection areas, readings)

**Row Level Security (RLS):**
- [ ] RLS enabled on ALL tables
- [ ] Policies for `leads` (technicians see assigned only)
- [ ] Policies for `inspection_reports` (technicians see assigned only)
- [ ] Policies for `calendar_bookings` (all technicians view, assigned can edit)
- [ ] Policies for `email_logs` (admin only)
- [ ] Policies for `offline_queue` (user-specific access)
- [ ] Test users created (Clayton, Glen, Admin)

**Storage Buckets:**
- [ ] `inspection-photos` - Customer photos from inspections
- [ ] `inspection-pdfs` - Generated PDF reports
- [ ] `templates` - Email templates and assets
- [ ] Proper bucket policies (public read for PDFs, authenticated upload)

**Auth Configuration:**
- [ ] Email/password provider enabled
- [ ] Email templates customized (MRC branding)
- [ ] Password requirements (8+ chars, complexity)
- [ ] Session timeout configured (24 hours)

**Seed Data:**
- [ ] Melbourne suburbs with zones (200+ entries)
- [ ] Default pricing settings
- [ ] Test users (Clayton, Glen, Admin)

---

## Phase 2: Database Schema Implementation (3-4 hours)

### Task 2.1: Create Missing Tables

**Claude Code Will Execute:**

#### Migration 1: Create `leads` table
```sql
-- File: supabase/migrations/20250111000001_create_leads.sql

CREATE TABLE leads (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer Information
  customer_name TEXT NOT NULL,
  email TEXT CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  phone TEXT NOT NULL CHECK (
    phone ~ '^04[0-9]{8}$'  -- Mobile: 04XX XXX XXX
    OR phone ~ '^\(0[2-9]\) [0-9]{4} [0-9]{4}$'  -- Landline: (0X) XXXX XXXX
    OR phone ~ '^1800 [0-9]{3} [0-9]{3}$'  -- Toll-free: 1800 XXX XXX
  ),

  -- Property Information
  property_address TEXT NOT NULL,
  suburb TEXT NOT NULL,
  postcode TEXT NOT NULL CHECK (postcode ~ '^3[0-9]{3}$'),  -- VIC postcodes
  state TEXT NOT NULL DEFAULT 'VIC',
  property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'strata')),

  -- Lead Source
  source TEXT NOT NULL CHECK (source IN ('website', 'hipages', 'referral', 'google', 'repeat_customer', 'other')),
  source_details TEXT,

  -- Pipeline Stage (12 stages total)
  status TEXT NOT NULL DEFAULT 'new_lead' CHECK (status IN (
    'hipages_lead',          -- Stage 1: HiPages leads
    'new_lead',              -- Stage 2: New website leads
    'quote_requested',       -- Stage 3: Customer requested quote
    'quote_sent',            -- Stage 4: Quote sent to customer
    'inspection_booked',     -- Stage 5: Inspection appointment set
    'inspection_completed',  -- Stage 6: Inspection done, report pending
    'awaiting_job_approval', -- Stage 7: Report sent, waiting for customer approval
    'job_booked',            -- Stage 8: Job scheduled
    'job_in_progress',       -- Stage 9: Currently working on job
    'job_completed',         -- Stage 10: Job finished
    'invoice_sent',          -- Stage 11: Invoice sent to customer
    'paid'                   -- Stage 12: Payment received
  )),

  -- Inspection Scheduling
  inspection_date TIMESTAMPTZ,
  inspection_time_slot TEXT,  -- "9am-12pm" or "1pm-4pm"
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'sms')),

  -- Assignment
  assigned_technician_id UUID REFERENCES auth.users(id),

  -- Urgency
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'emergency')),

  -- Notes
  initial_description TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft Delete
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_assigned ON leads(assigned_technician_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_suburb ON leads(LOWER(suburb));
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_inspection_date ON leads(inspection_date) WHERE inspection_date IS NOT NULL;

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE leads IS 'Central lead tracking table for all customer inquiries and jobs';
COMMENT ON COLUMN leads.status IS '12-stage pipeline from HiPages lead to paid invoice';
COMMENT ON COLUMN leads.source IS 'Where the lead originated (website, HiPages, referral, etc.)';
```

#### Migration 2: Create `inspection_reports` table
```sql
-- File: supabase/migrations/20250111000002_create_inspection_reports.sql

CREATE TABLE inspection_reports (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL REFERENCES auth.users(id),

  -- Report Identification
  inspection_number TEXT NOT NULL UNIQUE,  -- Format: INS-YYYYMMDD-XXX
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Inspection Data (JSONB for flexibility)
  property_details JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Type, age, construction, etc.
  affected_areas JSONB NOT NULL DEFAULT '[]'::jsonb,    -- Array of areas with measurements
  moisture_readings JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of readings by area
  scope_of_work JSONB NOT NULL DEFAULT '{}'::jsonb,     -- Work required, hours, equipment
  cost_estimate JSONB NOT NULL DEFAULT '{}'::jsonb,     -- Detailed pricing breakdown
  
  -- AI-Generated Content
  ai_summary TEXT,
  ai_summary_approved BOOLEAN DEFAULT FALSE,
  ai_summary_generated_at TIMESTAMPTZ,

  -- PDF Report
  pdf_url TEXT,  -- Supabase Storage URL
  pdf_generated_at TIMESTAMPTZ,
  pdf_approved_by UUID REFERENCES auth.users(id),
  pdf_approved_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Being filled out
    'completed',       -- Inspection data complete
    'ai_generated',    -- AI summary created
    'pdf_generated',   -- PDF created
    'approved',        -- Approved by admin
    'sent_to_customer' -- Email sent
  )),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inspection_reports_lead_id ON inspection_reports(lead_id);
CREATE INDEX idx_inspection_reports_inspector_id ON inspection_reports(inspector_id);
CREATE INDEX idx_inspection_reports_status ON inspection_reports(status);
CREATE INDEX idx_inspection_reports_created_at ON inspection_reports(created_at DESC);
CREATE UNIQUE INDEX idx_inspection_reports_number ON inspection_reports(inspection_number);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_inspection_reports_updated_at
  BEFORE UPDATE ON inspection_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate inspection number
CREATE OR REPLACE FUNCTION generate_inspection_number()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  sequence_num INTEGER;
  new_number TEXT;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get the next sequence number for today
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(inspection_number FROM 'INS-[0-9]{8}-([0-9]{3})') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM inspection_reports
  WHERE inspection_number LIKE 'INS-' || today_date || '-%';
  
  new_number := 'INS-' || today_date || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate inspection number on insert
CREATE OR REPLACE FUNCTION set_inspection_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inspection_number IS NULL THEN
    NEW.inspection_number := generate_inspection_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_inspection_number_trigger
  BEFORE INSERT ON inspection_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_inspection_number();
```

#### Migration 3: Create `calendar_bookings` table
```sql
-- File: supabase/migrations/20250111000003_create_calendar_bookings.sql

CREATE TABLE calendar_bookings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  job_id UUID,  -- Will reference jobs table (create later)

  -- Booking Type
  booking_type TEXT NOT NULL CHECK (booking_type IN ('inspection', 'job', 'blocked_time')),

  -- Technician Assignment
  technician_ids UUID[] NOT NULL,  -- Array for multi-technician jobs
  
  -- Date & Time
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  
  -- Calculated Duration (in minutes)
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 60
  ) STORED,

  -- Location (for travel time calculations)
  suburb TEXT NOT NULL,
  zone INTEGER CHECK (zone BETWEEN 1 AND 4),  -- Melbourne zone

  -- Status
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN (
    'tentative',    -- Pending confirmation
    'confirmed',    -- Confirmed booking
    'in_progress',  -- Currently happening
    'completed',    -- Finished
    'cancelled',    -- Cancelled
    'no_show'       -- Customer didn't show
  )),

  -- Conflict Detection Flags
  has_travel_time_conflict BOOLEAN DEFAULT FALSE,
  has_overlap_conflict BOOLEAN DEFAULT FALSE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_datetime_range CHECK (end_datetime > start_datetime),
  CONSTRAINT valid_duration CHECK (EXTRACT(EPOCH FROM (end_datetime - start_datetime)) >= 1800)  -- Minimum 30 min
);

-- Indexes for conflict detection and querying
CREATE INDEX idx_calendar_bookings_start_datetime ON calendar_bookings(start_datetime);
CREATE INDEX idx_calendar_bookings_end_datetime ON calendar_bookings(end_datetime);
CREATE INDEX idx_calendar_bookings_technician_ids ON calendar_bookings USING GIN(technician_ids);
CREATE INDEX idx_calendar_bookings_status ON calendar_bookings(status);
CREATE INDEX idx_calendar_bookings_date_range ON calendar_bookings(start_datetime, end_datetime);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_calendar_bookings_updated_at
  BEFORE UPDATE ON calendar_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflicts(
  p_technician_ids UUID[],
  p_start_datetime TIMESTAMPTZ,
  p_end_datetime TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_type TEXT,
  conflicting_booking_id UUID,
  conflict_details TEXT
) AS $$
BEGIN
  -- Check for overlapping bookings
  RETURN QUERY
  SELECT 
    'overlap'::TEXT AS conflict_type,
    cb.id AS conflicting_booking_id,
    'Overlaps with existing booking from ' || 
    TO_CHAR(cb.start_datetime AT TIME ZONE 'Australia/Melbourne', 'DD/MM/YYYY HH24:MI') || 
    ' to ' || 
    TO_CHAR(cb.end_datetime AT TIME ZONE 'Australia/Melbourne', 'DD/MM/YYYY HH24:MI') AS conflict_details
  FROM calendar_bookings cb
  WHERE 
    cb.technician_ids && p_technician_ids  -- Array overlap
    AND cb.status NOT IN ('cancelled', 'completed')
    AND (cb.id != p_exclude_booking_id OR p_exclude_booking_id IS NULL)
    AND (
      (p_start_datetime >= cb.start_datetime AND p_start_datetime < cb.end_datetime)
      OR (p_end_datetime > cb.start_datetime AND p_end_datetime <= cb.end_datetime)
      OR (p_start_datetime <= cb.start_datetime AND p_end_datetime >= cb.end_datetime)
    );
END;
$$ LANGUAGE plpgsql;
```

#### Migration 4: Create remaining core tables
```sql
-- File: supabase/migrations/20250111000004_create_email_sms_logs.sql

-- Email Logs Table
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Related Records
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  inspection_report_id UUID REFERENCES inspection_reports(id) ON DELETE SET NULL,
  
  -- Email Details
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,  -- Which template was used
  
  -- Resend Integration
  resend_email_id TEXT,  -- Resend's unique ID
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',      -- In sending queue
    'sending',     -- Currently sending
    'sent',        -- Successfully sent
    'delivered',   -- Confirmed delivery
    'opened',      -- Recipient opened
    'clicked',     -- Recipient clicked link
    'bounced',     -- Email bounced
    'failed',      -- Send failed
    'spam'         -- Marked as spam
  )),
  
  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_queued_at ON email_logs(queued_at);
CREATE INDEX idx_email_logs_template_name ON email_logs(template_name);

-- SMS Logs Table
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Related Records
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- SMS Details
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message TEXT NOT NULL CHECK (LENGTH(message) <= 160),  -- SMS limit
  
  -- Twilio Integration
  twilio_message_sid TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',
    'sending',
    'sent',
    'delivered',
    'failed',
    'undelivered'
  )),
  
  error_message TEXT,
  
  -- Timestamps
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_logs_lead_id ON sms_logs(lead_id);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);
CREATE INDEX idx_sms_logs_queued_at ON sms_logs(queued_at);
```

```sql
-- File: supabase/migrations/20250111000005_create_support_tables.sql

-- Notes Table (Communication History)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  
  note_type TEXT NOT NULL CHECK (note_type IN (
    'customer_call',
    'internal_note',
    'status_change',
    'email_sent',
    'sms_sent',
    'system_event'
  )),
  
  content TEXT NOT NULL,
  
  -- For linking to specific events
  related_email_id UUID REFERENCES email_logs(id),
  related_sms_id UUID REFERENCES sms_logs(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_lead_id ON notes(lead_id);
CREATE INDEX idx_notes_author_id ON notes(author_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- Photos Table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  inspection_report_id UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  
  -- Storage
  storage_path TEXT NOT NULL,  -- Supabase Storage path
  url TEXT NOT NULL,           -- Public URL
  
  -- Metadata
  filename TEXT NOT NULL,
  file_size INTEGER,  -- bytes
  mime_type TEXT NOT NULL,
  
  -- Photo Details
  area TEXT,  -- Which area of property
  description TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Image Processing
  thumbnail_url TEXT,
  is_processed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_inspection_report_id ON photos(inspection_report_id);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification Details
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'new_lead',
    'inspection_booked',
    'inspection_completed',
    'report_ready',
    'job_approved',
    'payment_received',
    'system_alert'
  )),
  
  -- Action Link
  action_url TEXT,
  
  -- Related Records
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  inspection_report_id UUID REFERENCES inspection_reports(id) ON DELETE CASCADE,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Pricing Settings Table (Admin Configurable)
CREATE TABLE pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Work Type
  work_type TEXT NOT NULL CHECK (work_type IN (
    'no_demolition',
    'demolition',
    'construction',
    'subfloor'
  )),
  
  -- Duration Type
  duration_type TEXT NOT NULL CHECK (duration_type IN ('2_hour', '8_hour')),
  
  -- Pricing (Excluding GST)
  price_excluding_gst NUMERIC(10, 2) NOT NULL,
  
  -- Equipment Hire Rates (per day, excluding GST)
  dehumidifier_rate NUMERIC(10, 2) DEFAULT 132.00,
  air_mover_rate NUMERIC(10, 2) DEFAULT 46.00,
  rcd_rate NUMERIC(10, 2) DEFAULT 5.00,
  
  -- Discount Tiers
  discount_16_hours NUMERIC(5, 4) DEFAULT 0.925,   -- 7.5% discount
  discount_max NUMERIC(5, 4) DEFAULT 0.87,         -- 13% max discount
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (work_type, duration_type)
);

CREATE TRIGGER update_pricing_settings_updated_at
  BEFORE UPDATE ON pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed default pricing
INSERT INTO pricing_settings (work_type, duration_type, price_excluding_gst) VALUES
  ('no_demolition', '2_hour', 612.00),
  ('no_demolition', '8_hour', 1216.99),
  ('demolition', '2_hour', 711.90),
  ('demolition', '8_hour', 1798.90),
  ('construction', '2_hour', 661.96),
  ('construction', '8_hour', 1507.95),
  ('subfloor', '2_hour', 900.00),
  ('subfloor', '8_hour', 2334.69);

-- Offline Queue Table
CREATE TABLE offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Action Details
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id UUID,
  payload JSONB NOT NULL,
  
  -- Sync Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed', 'conflict')),
  sync_error TEXT,
  conflict_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX idx_offline_queue_user_id ON offline_queue(user_id);
CREATE INDEX idx_offline_queue_status ON offline_queue(status);
```

#### Migration 5: Create suburb zones seed data
```sql
-- File: supabase/migrations/20250111000006_seed_suburb_zones.sql

CREATE TABLE suburb_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  suburb TEXT NOT NULL,
  postcode TEXT NOT NULL,
  zone INTEGER NOT NULL CHECK (zone BETWEEN 1 AND 4),
  state TEXT NOT NULL DEFAULT 'VIC',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (suburb, postcode)
);

CREATE INDEX idx_suburb_zones_suburb ON suburb_zones(LOWER(suburb));
CREATE INDEX idx_suburb_zones_postcode ON suburb_zones(postcode);
CREATE INDEX idx_suburb_zones_zone ON suburb_zones(zone);

-- Seed Melbourne suburbs (Zone 1 - CBD & Inner City)
INSERT INTO suburb_zones (suburb, postcode, zone, state) VALUES
  ('Melbourne', '3000', 1, 'VIC'),
  ('East Melbourne', '3002', 1, 'VIC'),
  ('West Melbourne', '3003', 1, 'VIC'),
  ('Docklands', '3008', 1, 'VIC'),
  ('Southbank', '3006', 1, 'VIC'),
  ('South Wharf', '3006', 1, 'VIC'),
  ('Carlton', '3053', 1, 'VIC'),
  ('North Melbourne', '3051', 1, 'VIC'),
  ('Parkville', '3052', 1, 'VIC'),
  ('Fitzroy', '3065', 1, 'VIC'),
  ('Collingwood', '3066', 1, 'VIC'),
  ('Richmond', '3121', 1, 'VIC'),
  ('Abbotsford', '3067', 1, 'VIC'),
  ('South Yarra', '3141', 1, 'VIC'),
  ('Prahran', '3181', 1, 'VIC'),
  ('St Kilda', '3182', 1, 'VIC'),
  ('St Kilda East', '3183', 1, 'VIC'),
  ('Port Melbourne', '3207', 1, 'VIC'),
  ('Albert Park', '3206', 1, 'VIC'),
  ('Middle Park', '3206', 1, 'VIC');

-- Zone 2 - Inner Suburbs (10-15km from CBD)
INSERT INTO suburb_zones (suburb, postcode, zone, state) VALUES
  ('Brunswick', '3056', 2, 'VIC'),
  ('Brunswick East', '3057', 2, 'VIC'),
  ('Coburg', '3058', 2, 'VIC'),
  ('Thornbury', '3071', 2, 'VIC'),
  ('Northcote', '3070', 2, 'VIC'),
  ('Preston', '3072', 2, 'VIC'),
  ('Reservoir', '3073', 2, 'VIC'),
  ('Ivanhoe', '3079', 2, 'VIC'),
  ('Kew', '3101', 2, 'VIC'),
  ('Kew East', '3102', 2, 'VIC'),
  ('Hawthorn', '3122', 2, 'VIC'),
  ('Hawthorn East', '3123', 2, 'VIC'),
  ('Camberwell', '3124', 2, 'VIC'),
  ('Canterbury', '3126', 2, 'VIC'),
  ('Surrey Hills', '3127', 2, 'VIC'),
  ('Box Hill', '3128', 2, 'VIC'),
  ('Footscray', '3011', 2, 'VIC'),
  ('Yarraville', '3013', 2, 'VIC'),
  ('Williamstown', '3016', 2, 'VIC'),
  ('Newport', '3015', 2, 'VIC'),
  ('Caulfield', '3162', 2, 'VIC'),
  ('Caulfield North', '3161', 2, 'VIC'),
  ('Carnegie', '3163', 2, 'VIC'),
  ('Malvern', '3144', 2, 'VIC'),
  ('Malvern East', '3145', 2, 'VIC'),
  ('Elsternwick', '3185', 2, 'VIC'),
  ('Brighton', '3186', 2, 'VIC'),
  ('Brighton East', '3187', 2, 'VIC');

-- Zone 3 - Middle Suburbs (15-30km from CBD)
INSERT INTO suburb_zones (suburb, postcode, zone, state) VALUES
  ('Essendon', '3040', 3, 'VIC'),
  ('Moonee Ponds', '3039', 3, 'VIC'),
  ('Ascot Vale', '3032', 3, 'VIC'),
  ('Keilor', '3036', 3, 'VIC'),
  ('Sunshine', '3020', 3, 'VIC'),
  ('St Albans', '3021', 3, 'VIC'),
  ('Deer Park', '3023', 3, 'VIC'),
  ('Altona', '3018', 3, 'VIC'),
  ('Altona Meadows', '3028', 3, 'VIC'),
  ('Heidelberg', '3084', 3, 'VIC'),
  ('Rosanna', '3084', 3, 'VIC'),
  ('Macleod', '3085', 3, 'VIC'),
  ('Bundoora', '3083', 3, 'VIC'),
  ('Greensborough', '3088', 3, 'VIC'),
  ('Diamond Creek', '3089', 3, 'VIC'),
  ('Eltham', '3095', 3, 'VIC'),
  ('Templestowe', '3106', 3, 'VIC'),
  ('Doncaster', '3108', 3, 'VIC'),
  ('Bulleen', '3105', 3, 'VIC'),
  ('Ringwood', '3134', 3, 'VIC'),
  ('Croydon', '3136', 3, 'VIC'),
  ('Mooroolbark', '3138', 3, 'VIC'),
  ('Mitcham', '3132', 3, 'VIC'),
  ('Nunawading', '3131', 3, 'VIC'),
  ('Oakleigh', '3166', 3, 'VIC'),
  ('Oakleigh South', '3167', 3, 'VIC'),
  ('Clayton', '3168', 3, 'VIC'),
  ('Dandenong', '3175', 3, 'VIC'),
  ('Noble Park', '3174', 3, 'VIC'),
  ('Springvale', '3171', 3, 'VIC'),
  ('Keysborough', '3173', 3, 'VIC'),
  ('Mordialloc', '3195', 3, 'VIC'),
  ('Chelsea', '3196', 3, 'VIC'),
  ('Carrum', '3197', 3, 'VIC'),
  ('Frankston', '3199', 3, 'VIC'),
  ('Moorabbin', '3189', 3, 'VIC'),
  ('Mentone', '3194', 3, 'VIC'),
  ('Cheltenham', '3192', 3, 'VIC'),
  ('Sandringham', '3191', 3, 'VIC'),
  ('Hampton', '3188', 3, 'VIC');

-- Zone 4 - Outer Suburbs (30km+ from CBD)
INSERT INTO suburb_zones (suburb, postcode, zone, state) VALUES
  ('Werribee', '3030', 4, 'VIC'),
  ('Hoppers Crossing', '3029', 4, 'VIC'),
  ('Point Cook', '3030', 4, 'VIC'),
  ('Tarneit', '3029', 4, 'VIC'),
  ('Melton', '3337', 4, 'VIC'),
  ('Sunbury', '3429', 4, 'VIC'),
  ('Craigieburn', '3064', 4, 'VIC'),
  ('Broadmeadows', '3047', 4, 'VIC'),
  ('Epping', '3076', 4, 'VIC'),
  ('Mill Park', '3082', 4, 'VIC'),
  ('South Morang', '3752', 4, 'VIC'),
  ('Mernda', '3754', 4, 'VIC'),
  ('Doreen', '3754', 4, 'VIC'),
  ('Wantirna', '3152', 4, 'VIC'),
  ('Wantirna South', '3152', 4, 'VIC'),
  ('Rowville', '3178', 4, 'VIC'),
  ('Mulgrave', '3170', 4, 'VIC'),
  ('Wheelers Hill', '3150', 4, 'VIC'),
  ('Berwick', '3806', 4, 'VIC'),
  ('Beaconsfield', '3807', 4, 'VIC'),
  ('Officer', '3809', 4, 'VIC'),
  ('Pakenham', '3810', 4, 'VIC'),
  ('Narre Warren', '3805', 4, 'VIC'),
  ('Cranbourne', '3977', 4, 'VIC'),
  ('Clyde North', '3978', 4, 'VIC'),
  ('Carrum Downs', '3201', 4, 'VIC'),
  ('Seaford', '3198', 4, 'VIC'),
  ('Langwarrin', '3910', 4, 'VIC'),
  ('Karingal', '3199', 4, 'VIC'),
  ('Mt Eliza', '3930', 4, 'VIC'),
  ('Mornington', '3931', 4, 'VIC'),
  ('Rosebud', '3939', 4, 'VIC'),
  ('Rye', '3941', 4, 'VIC'),
  ('Sorrento', '3943', 4, 'VIC'),
  ('Portsea', '3944', 4, 'VIC');

-- Create helper function to get zone by suburb
CREATE OR REPLACE FUNCTION get_zone_by_suburb(p_suburb TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_zone INTEGER;
BEGIN
  SELECT zone INTO v_zone
  FROM suburb_zones
  WHERE LOWER(suburb) = LOWER(p_suburb)
  LIMIT 1;
  
  RETURN COALESCE(v_zone, 4);  -- Default to zone 4 if not found
END;
$$ LANGUAGE plpgsql;
```

#### Migration 6: Helper function for timestamp updates
```sql
-- File: supabase/migrations/20250111000007_create_helper_functions.sql

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate travel time between zones
CREATE OR REPLACE FUNCTION calculate_travel_time(
  p_from_zone INTEGER,
  p_to_zone INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  travel_time_matrix INTEGER[][] := ARRAY[
    ARRAY[15, 25, 40, 60],  -- From Zone 1
    ARRAY[25, 20, 35, 55],  -- From Zone 2
    ARRAY[40, 35, 25, 40],  -- From Zone 3
    ARRAY[60, 55, 40, 30]   -- From Zone 4
  ];
BEGIN
  -- Return travel time in minutes
  RETURN travel_time_matrix[p_from_zone][p_to_zone];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if booking has travel time conflict
CREATE OR REPLACE FUNCTION has_travel_time_conflict(
  p_technician_id UUID,
  p_start_datetime TIMESTAMPTZ,
  p_from_zone INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_previous_booking RECORD;
  v_travel_time INTEGER;
  v_buffer_minutes INTEGER := 15;  -- Extra buffer
BEGIN
  -- Get the booking immediately before this one for the same technician
  SELECT cb.end_datetime, cb.zone
  INTO v_previous_booking
  FROM calendar_bookings cb
  WHERE 
    p_technician_id = ANY(cb.technician_ids)
    AND cb.end_datetime <= p_start_datetime
    AND cb.status NOT IN ('cancelled', 'completed')
  ORDER BY cb.end_datetime DESC
  LIMIT 1;
  
  -- If no previous booking, no conflict
  IF v_previous_booking IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate travel time needed
  v_travel_time := calculate_travel_time(v_previous_booking.zone, p_from_zone);
  
  -- Check if there's enough time (travel time + buffer)
  IF EXTRACT(EPOCH FROM (p_start_datetime - v_previous_booking.end_datetime)) / 60 
     < (v_travel_time + v_buffer_minutes) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

---

## Phase 3: Row Level Security (RLS) Implementation (2-3 hours)

### Task 3.1: Enable RLS and Create Policies

```sql
-- File: supabase/migrations/20250111000008_enable_rls.sql

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- LEADS TABLE POLICIES
-- ================================================================

-- Technicians can view leads assigned to them
CREATE POLICY "Technicians can view assigned leads"
  ON leads
  FOR SELECT
  USING (
    auth.uid() = assigned_technician_id
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Technicians can update leads assigned to them
CREATE POLICY "Technicians can update assigned leads"
  ON leads
  FOR UPDATE
  USING (
    auth.uid() = assigned_technician_id
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can create leads
CREATE POLICY "Admins can create leads"
  ON leads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can delete leads (soft delete)
CREATE POLICY "Admins can delete leads"
  ON leads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ================================================================
-- INSPECTION REPORTS TABLE POLICIES
-- ================================================================

-- Technicians can view their own inspection reports
CREATE POLICY "Technicians can view their inspection reports"
  ON inspection_reports
  FOR SELECT
  USING (
    auth.uid() = inspector_id
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Technicians can create inspection reports
CREATE POLICY "Technicians can create inspection reports"
  ON inspection_reports
  FOR INSERT
  WITH CHECK (auth.uid() = inspector_id);

-- Technicians can update their own inspection reports
CREATE POLICY "Technicians can update their inspection reports"
  ON inspection_reports
  FOR UPDATE
  USING (
    auth.uid() = inspector_id
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ================================================================
-- CALENDAR BOOKINGS POLICIES
-- ================================================================

-- All technicians can view all bookings (for conflict detection)
CREATE POLICY "All technicians can view bookings"
  ON calendar_bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('technician', 'admin')
    )
  );

-- Technicians can create bookings
CREATE POLICY "Technicians can create bookings"
  ON calendar_bookings
  FOR INSERT
  WITH CHECK (
    auth.uid() = ANY(technician_ids)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Technicians can update their assigned bookings
CREATE POLICY "Technicians can update assigned bookings"
  ON calendar_bookings
  FOR UPDATE
  USING (
    auth.uid() = ANY(technician_ids)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ================================================================
-- PHOTOS TABLE POLICIES
-- ================================================================

-- Technicians can view photos for their inspections
CREATE POLICY "Technicians can view inspection photos"
  ON photos
  FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM inspection_reports ir
      WHERE ir.id = photos.inspection_report_id
      AND ir.inspector_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Technicians can upload photos
CREATE POLICY "Technicians can upload photos"
  ON photos
  FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- ================================================================
-- NOTES TABLE POLICIES
-- ================================================================

-- Users can view notes on leads they're involved with
CREATE POLICY "Users can view relevant notes"
  ON notes
  FOR SELECT
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = notes.lead_id
      AND l.assigned_technician_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can create notes
CREATE POLICY "Users can create notes"
  ON notes
  FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- ================================================================
-- EMAIL/SMS LOGS POLICIES (Admin only)
-- ================================================================

CREATE POLICY "Only admins can view email logs"
  ON email_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can view SMS logs"
  ON sms_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ================================================================
-- NOTIFICATIONS POLICIES
-- ================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (TRUE);  -- Service role can insert

-- ================================================================
-- PRICING SETTINGS POLICIES (Admin only)
-- ================================================================

-- Everyone can read pricing settings
CREATE POLICY "Everyone can read pricing settings"
  ON pricing_settings
  FOR SELECT
  USING (is_active = TRUE);

-- Only admins can modify pricing settings
CREATE POLICY "Only admins can modify pricing"
  ON pricing_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ================================================================
-- OFFLINE QUEUE POLICIES (User-specific)
-- ================================================================

-- Users can only access their own offline queue
CREATE POLICY "Users can access own offline queue"
  ON offline_queue
  FOR ALL
  USING (user_id = auth.uid());

-- ================================================================
-- SUBURB ZONES POLICIES (Read-only for all)
-- ================================================================

CREATE POLICY "Everyone can read suburb zones"
  ON suburb_zones
  FOR SELECT
  USING (TRUE);
```

---

## Phase 4: Storage Buckets & Authentication (1 hour)

### Task 4.1: Create Storage Buckets

**Claude Code Will Execute via Supabase Dashboard API:**

```typescript
// Create storage buckets programmatically
const buckets = [
  {
    name: 'inspection-photos',
    public: false,
    file_size_limit: 10485760, // 10MB
    allowed_mime_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  },
  {
    name: 'inspection-pdfs',
    public: true, // Customers need to access their reports
    file_size_limit: 52428800, // 50MB
    allowed_mime_types: ['application/pdf']
  },
  {
    name: 'templates',
    public: false,
    file_size_limit: 5242880, // 5MB
    allowed_mime_types: ['text/html', 'image/jpeg', 'image/png']
  }
];
```

**Storage Bucket Policies:**

```sql
-- Photos bucket policy (authenticated users only)
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY "Users can view photos from their inspections"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM inspection_reports
    WHERE inspector_id = auth.uid()
  )
);

-- PDFs bucket policy (public read, authenticated write)
CREATE POLICY "Public can read PDFs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inspection-pdfs');

CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-pdfs');
```

### Task 4.2: Configure Authentication

**Email Templates (MRC Branding):**

Navigate to: Authentication > Email Templates in Supabase Dashboard

**Confirmation Email:**
```html
<h2>Welcome to MRC Lead Management</h2>
<p>Hi {{ .Name }},</p>
<p>Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
<p>Thanks,<br/>Mould & Restoration Co.<br/>1800 954 117</p>
```

**Password Reset Email:**
```html
<h2>Reset Your Password</h2>
<p>Hi {{ .Name }},</p>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, please ignore this email.</p>
<p>Thanks,<br/>Mould & Restoration Co.</p>
```

---

## Phase 5: TypeScript Types Generation (30 minutes)

### Task 5.1: Generate Database Types

**Claude Code Will Execute:**

```bash
# Install Supabase CLI (if not installed)
npm install supabase --save-dev

# Generate TypeScript types from database schema
npx supabase gen types typescript --local > src/types/database.ts

# Or if connected to remote:
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```

**Create Custom Type Files:**

```typescript
// src/types/leads.ts
import { Database } from './database';

export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadInsert = Database['public']['Tables']['leads']['Insert'];
export type LeadUpdate = Database['public']['Tables']['leads']['Update'];

export type LeadStatus = Database['public']['Enums']['lead_status'];
export type LeadSource = 'website' | 'hipages' | 'referral' | 'google' | 'repeat_customer' | 'other';

// ... similar for all tables
```

---

## Phase 6: Testing & Validation (1-2 hours)

### Task 6.1: Create Test Users

```sql
-- Create test users via Supabase Auth
-- Run via Supabase SQL Editor

-- Admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'admin@mrc.com.au',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  '{"role": "admin", "display_name": "Admin User"}'::jsonb
);

-- Clayton (Technician)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'clayton@mrc.com.au',
  crypt('Clayton123!', gen_salt('bf')),
  NOW(),
  '{"role": "technician", "display_name": "Clayton"}'::jsonb
);

-- Glen (Technician)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'glen@mrc.com.au',
  crypt('Glen123!', gen_salt('bf')),
  NOW(),
  '{"role": "technician", "display_name": "Glen"}'::jsonb
);
```

### Task 6.2: Test RLS Policies

**Test Script:**

```sql
-- Test as Clayton (technician)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "clayton-user-id", "role": "technician"}';

-- Should see only Clayton's leads
SELECT COUNT(*) FROM leads WHERE assigned_technician_id = 'clayton-user-id';

-- Should NOT see Glen's leads
SELECT COUNT(*) FROM leads WHERE assigned_technician_id != 'clayton-user-id';

-- Reset
RESET ROLE;
```

### Task 6.3: Validation Checklist

**Run through this checklist:**

- [ ] All 11 tables exist in Supabase dashboard
- [ ] RLS enabled on all tables (green shield icons)
- [ ] Test INSERT as technician → success
- [ ] Test SELECT on other technician's data → empty result
- [ ] Suburb zones table has 200+ entries
- [ ] Pricing settings table has 8 default entries
- [ ] Storage buckets created with correct policies
- [ ] Auth email templates customized
- [ ] TypeScript types generated successfully
- [ ] Test users created (Clayton, Glen, Admin)
- [ ] All foreign keys working
- [ ] All triggers firing (updated_at)
- [ ] Helper functions working (travel_time, conflict detection)

---

## Phase 7: Documentation & Handoff (30 minutes)

### Task 7.1: Create Database Documentation

```markdown
# MRC Database Schema Documentation

## Tables Overview

### Core Tables
1. **leads** - Central lead tracking (12-stage pipeline)
2. **inspection_reports** - Full inspection data (JSONB)
3. **calendar_bookings** - Scheduling with conflict detection

### Supporting Tables
4. **photos** - Photo uploads
5. **notes** - Communication history
6. **notifications** - User notifications
7. **email_logs** - Email tracking
8. **sms_logs** - SMS tracking
9. **pricing_settings** - Admin-configurable pricing
10. **suburb_zones** - Melbourne suburbs (200+)
11. **offline_queue** - Offline sync queue

## Key Features

### Automatic Inspection Numbering
- Format: `INS-YYYYMMDD-XXX`
- Auto-generated on insert
- Sequential per day

### Travel Time Intelligence
- 4x4 zone matrix (CBD, Inner, Middle, Outer)
- Function: `calculate_travel_time(from_zone, to_zone)`
- Returns minutes between zones

### Booking Conflict Detection
- Function: `check_booking_conflicts(technician_ids, start, end)`
- Checks for overlaps and travel time issues

### Australian Compliance
- Phone validation (04XX XXX XXX format)
- VIC postcode validation (3XXX)
- GST calculations (10%)
- Currency storage (NUMERIC for precision)
- Timezone-aware timestamps (Australia/Melbourne)

## Access Control (RLS)

### Technicians
- View/edit assigned leads only
- View all calendar bookings (conflict detection)
- Create inspection reports
- Upload photos

### Admins
- Full access to all data
- Modify pricing settings
- View email/SMS logs

## Next Steps

1. **Frontend Development** - Build React components using these tables
2. **API Integration** - Connect OpenAI, Resend, Twilio
3. **Edge Functions** - PDF generation, email automation
4. **Testing** - E2E tests with Playwright
```

---

## Success Criteria

**Phase 1-7 Complete When:**

✅ All 11 tables created with proper schema
✅ RLS policies enabled and tested
✅ 200+ Melbourne suburbs seeded
✅ Storage buckets configured
✅ Test users created (Clayton, Glen, Admin)
✅ TypeScript types generated
✅ All migrations run successfully
✅ Helper functions working
✅ Documentation complete

---

## Next Actions for User

**Once Claude Code completes the setup:**

1. **Verify in Supabase Dashboard:**
   ```bash
   # Open Supabase project
   open https://supabase.com/dashboard/project/YOUR_PROJECT_REF
   
   # Check:
   # - Table Editor: See all 11 tables
   # - Authentication: See 3 test users
   # - Storage: See 3 buckets
   # - Database > Migrations: See 8 migrations applied
   ```

2. **Test Database Locally:**
   ```bash
   # Connect to local Supabase
   npx supabase start
   
   # Run queries
   npx supabase db query "SELECT COUNT(*) FROM suburb_zones"  # Should return 200+
   npx supabase db query "SELECT * FROM pricing_settings"     # Should return 8 rows
   ```

3. **Generate API Documentation:**
   ```bash
   # Supabase auto-generates REST API docs
   open https://supabase.com/dashboard/project/YOUR_PROJECT_REF/api
   ```

4. **Begin Frontend Development:**
   - Install dependencies
   - Configure Supabase client
   - Start building React components

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Assessment | 30 min | 🟡 Pending |
| Phase 2: Schema Implementation | 3-4 hours | 🟡 Pending |
| Phase 3: RLS Policies | 2-3 hours | 🟡 Pending |
| Phase 4: Storage & Auth | 1 hour | 🟡 Pending |
| Phase 5: TypeScript Types | 30 min | 🟡 Pending |
| Phase 6: Testing | 1-2 hours | 🟡 Pending |
| Phase 7: Documentation | 30 min | 🟡 Pending |
| **TOTAL** | **8-12 hours** | 🟡 In Progress |

---

## Ready to Start?

**User Action Required:**

Provide Claude Code with your Supabase credentials:

```bash
SUPABASE_PROJECT_REF="your-project-ref"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="eyJhbG..."
SUPABASE_SERVICE_KEY="eyJhbG..."  # For admin operations
```

Then say: **"Start Phase 1: Assess current Supabase setup"**

Claude Code will:
1. Connect to your Supabase project
2. Analyze what exists
3. Create a detailed report
4. Provide step-by-step plan to make it bulletproof

Let's get started! 🚀
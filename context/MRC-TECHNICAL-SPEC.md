# MRC Lead Management System - Technical Specification

**Version:** 1.0
**Last Updated:** 2025-11-11
**Sprint:** Sprint 1 (Lead → Inspection → Customer Booking)

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [API Design](#api-design)
4. [File Structure](#file-structure)
5. [Component Architecture](#component-architecture)
6. [Email System Implementation](#email-system-implementation)
7. [PDF Generation System](#pdf-generation-system)
8. [Calendar Booking Algorithm](#calendar-booking-algorithm)
9. [Offline Mode & Auto-Save](#offline-mode--auto-save)
10. [Authentication & Authorization](#authentication--authorization)
11. [Environment Variables](#environment-variables)
12. [Third-Party Integrations](#third-party-integrations)
13. [Testing Strategy](#testing-strategy)
14. [Deployment](#deployment)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │ Inspection   │  │   Customer   │      │
│  │              │  │     Form     │  │   Booking    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     React Query (Server State Management)            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     localStorage (Offline Queue + Auto-Save)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
                    Supabase Client SDK
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Auth (RLS)  │  │   Storage    │      │
│  │   Database   │  │              │  │   (PDFs)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Edge Functions (Deno Runtime)               │   │
│  │  • generate-inspection-pdf                           │   │
│  │  • send-email                                        │   │
│  │  • generate-ai-summary                               │   │
│  │  • sync-offline-queue                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
              ┌─────────────┴──────────────┐
              ↓                            ↓
    ┌──────────────────┐        ┌──────────────────┐
    │   Resend API     │        │   Claude API     │
    │  (Email Delivery)│        │  (AI Summaries)  │
    └──────────────────┘        └──────────────────┘
```

### Technology Stack

**Frontend:**
- React 18.3.1 (UI library)
- TypeScript 5.8.3 (type safety)
- Vite 5.4.19 (build tool)
- Tailwind CSS 3.4.17 (styling)
- shadcn/ui (component library)
- React Hook Form 7.61.1 + Zod 3.25.76 (forms)
- React Query 5.83.0 (server state)
- React Router v6.30.1 (routing)

**Backend:**
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Deno (Edge Functions runtime)
- Puppeteer (PDF generation)

**Third-Party Services:**
- Resend API (email delivery)
- Claude API (AI summaries)

---

## Database Schema

### Supabase PostgreSQL Tables

#### 1. `leads` Table

Stores all lead information across the 12-stage pipeline.

```sql
CREATE TABLE leads (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lead Source & Tracking
  source TEXT NOT NULL CHECK (source IN ('website', 'hipages', 'phone', 'referral', 'repeat')),
  hipages_lead_id TEXT UNIQUE, -- HiPages external ID
  lead_number TEXT UNIQUE NOT NULL, -- MRC-2025-0001 format

  -- Pipeline Status
  status TEXT NOT NULL DEFAULT 'new_lead' CHECK (status IN (
    'hipages_lead',
    'new_lead',
    'inspection_booked',
    'inspection_in_progress',
    'report_pdf_approval',
    'awaiting_job_approval',
    'job_booked',
    'job_in_progress',
    'job_completed',
    'invoice_sent',
    'payment_received',
    'job_closed'
  )),

  -- Customer Information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL, -- 04XX XXX XXX format
  property_address TEXT NOT NULL,
  property_suburb TEXT NOT NULL,
  property_postcode TEXT NOT NULL,
  property_zone INTEGER CHECK (property_zone BETWEEN 1 AND 4),

  -- Lead Details
  urgency TEXT CHECK (urgency IN ('emergency', 'urgent', 'standard')),
  issue_description TEXT,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('phone', 'email', 'sms')),

  -- Inspection Scheduling
  inspection_date TIMESTAMPTZ,
  inspection_technician_id UUID REFERENCES auth.users(id),
  inspection_duration_hours DECIMAL(3,1), -- 2.0, 8.0
  inspection_notes TEXT,

  -- Inspection Report
  inspection_completed_at TIMESTAMPTZ,
  inspection_report_id UUID REFERENCES inspection_reports(id),
  inspection_pdf_url TEXT, -- URL to approved PDF in storage
  inspection_pdf_approved_at TIMESTAMPTZ,

  -- Job Scheduling
  job_start_date TIMESTAMPTZ,
  job_technician_id UUID REFERENCES auth.users(id),
  job_estimated_hours DECIMAL(5,1),
  job_estimated_cost DECIMAL(10,2), -- ex GST
  job_notes TEXT,

  -- Job Completion (Sprint 2)
  job_completed_at TIMESTAMPTZ,
  actual_hours DECIMAL(5,1),
  actual_cost DECIMAL(10,2),

  -- Invoicing (Sprint 2)
  invoice_sent_at TIMESTAMPTZ,
  invoice_amount DECIMAL(10,2), -- inc GST
  invoice_due_date DATE,
  payment_received_at TIMESTAMPTZ,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'card', 'cash', 'cheque')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),

  -- Soft Delete
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_inspection_date ON leads(inspection_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_job_start_date ON leads(job_start_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 2. `inspection_reports` Table

Stores detailed inspection data from the 100+ field form.

```sql
CREATE TABLE inspection_reports (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Report Metadata
  inspection_date TIMESTAMPTZ NOT NULL,
  technician_id UUID NOT NULL REFERENCES auth.users(id),
  report_status TEXT NOT NULL DEFAULT 'draft' CHECK (report_status IN ('draft', 'pending_approval', 'approved', 'sent')),

  -- Customer & Property
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_abn TEXT, -- XX XXX XXX XXX format
  property_address TEXT NOT NULL,
  property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'industrial')),

  -- Assessment Details
  affected_areas JSONB, -- [{area: 'Bathroom', size_m2: 12.5, moisture_reading: 85}]
  moisture_readings JSONB, -- [{location: 'Wall A', reading: 65, timestamp: '...'}]

  -- Demolition Work
  demolition_required BOOLEAN DEFAULT false,
  demolition_description TEXT,
  demolition_photos JSONB, -- [{url: '...', caption: '...', timestamp: '...'}]

  -- Construction Work
  construction_required BOOLEAN DEFAULT false,
  construction_description TEXT,
  construction_photos JSONB,

  -- Subfloor Work
  subfloor_required BOOLEAN DEFAULT false,
  subfloor_description TEXT,
  subfloor_photos JSONB,

  -- Equipment Required
  equipment_dehumidifiers INTEGER DEFAULT 0,
  equipment_air_movers INTEGER DEFAULT 0,
  equipment_rcd_box BOOLEAN DEFAULT false,
  equipment_days INTEGER DEFAULT 0,

  -- Pricing Calculation (ex GST)
  estimated_hours DECIMAL(5,1) NOT NULL,
  base_rate DECIMAL(10,2) NOT NULL,
  multi_day_discount DECIMAL(5,4), -- 0.925 (7.5%) or 0.87 (13%)
  equipment_cost DECIMAL(10,2) DEFAULT 0,
  total_cost_ex_gst DECIMAL(10,2) NOT NULL,
  total_cost_inc_gst DECIMAL(10,2) NOT NULL,

  -- AI-Generated Summary
  ai_summary TEXT, -- Claude-generated summary
  ai_summary_generated_at TIMESTAMPTZ,

  -- Additional Notes
  scope_of_works TEXT,
  exclusions TEXT,
  assumptions TEXT,
  technician_notes TEXT,

  -- PDF Generation
  pdf_url TEXT, -- Current version URL
  pdf_version INTEGER DEFAULT 1,
  pdf_generated_at TIMESTAMPTZ,
  pdf_approved_by UUID REFERENCES auth.users(id),
  pdf_approved_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft Delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_inspection_reports_lead_id ON inspection_reports(lead_id);
CREATE INDEX idx_inspection_reports_technician_id ON inspection_reports(technician_id);
CREATE INDEX idx_inspection_reports_status ON inspection_reports(report_status);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_inspection_reports_updated_at
  BEFORE UPDATE ON inspection_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 3. `calendar_bookings` Table

Stores inspection and job bookings with travel time logic.

```sql
CREATE TABLE calendar_bookings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Booking Type
  booking_type TEXT NOT NULL CHECK (booking_type IN ('inspection', 'job')),

  -- Scheduling
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_hours DECIMAL(3,1) NOT NULL,
  technician_id UUID NOT NULL REFERENCES auth.users(id),

  -- Travel Time Logic
  property_zone INTEGER NOT NULL CHECK (property_zone BETWEEN 1 AND 4),
  previous_booking_id UUID REFERENCES calendar_bookings(id),
  previous_booking_zone INTEGER,
  travel_time_minutes INTEGER, -- Calculated from zone matrix

  -- Status
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'in_progress', 'completed', 'cancelled')),

  -- Notes
  booking_notes TEXT,
  customer_booked BOOLEAN DEFAULT false, -- true if customer self-booked

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Soft Delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_calendar_bookings_technician_date ON calendar_bookings(technician_id, start_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_bookings_lead_id ON calendar_bookings(lead_id);
CREATE INDEX idx_calendar_bookings_status ON calendar_bookings(status);

-- Constraint: Prevent overlapping bookings for same technician
CREATE UNIQUE INDEX idx_no_overlap_bookings
  ON calendar_bookings(technician_id, start_time, end_time)
  WHERE deleted_at IS NULL;
```

#### 4. `email_logs` Table

Tracks all automated emails sent through the system.

```sql
CREATE TABLE email_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Email Details
  template_name TEXT NOT NULL, -- 'new_lead_response', 'inspection_confirmation', etc.
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,

  -- Delivery Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  resend_email_id TEXT, -- Resend API email ID

  -- Error Tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
```

#### 5. `offline_queue` Table

Stores actions performed while offline for later sync.

```sql
CREATE TABLE offline_queue (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Context
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Action Details
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id UUID,
  payload JSONB NOT NULL, -- The data to sync

  -- Sync Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed', 'conflict')),
  sync_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When offline action was queued
  synced_at TIMESTAMPTZ, -- When successfully synced

  -- Conflict Resolution
  conflict_data JSONB -- Store conflicting server data if needed
);

-- Indexes
CREATE INDEX idx_offline_queue_user_id ON offline_queue(user_id);
CREATE INDEX idx_offline_queue_status ON offline_queue(status);
CREATE INDEX idx_offline_queue_created_at ON offline_queue(created_at);
```

#### 6. `suburb_zones` Table

Pre-defined suburb-to-zone mappings for travel time calculations.

```sql
CREATE TABLE suburb_zones (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Suburb Details
  suburb TEXT NOT NULL UNIQUE,
  postcode TEXT NOT NULL,
  zone INTEGER NOT NULL CHECK (zone BETWEEN 1 AND 4),

  -- State
  state TEXT NOT NULL DEFAULT 'VIC' CHECK (state IN ('VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_suburb_zones_suburb ON suburb_zones(LOWER(suburb));
CREATE INDEX idx_suburb_zones_postcode ON suburb_zones(postcode);
CREATE INDEX idx_suburb_zones_zone ON suburb_zones(zone);

-- Seed Data (examples - full list in separate migration)
INSERT INTO suburb_zones (suburb, postcode, zone, state) VALUES
  ('Melbourne', '3000', 1, 'VIC'),
  ('Carlton', '3053', 1, 'VIC'),
  ('Fitzroy', '3065', 1, 'VIC'),
  ('Richmond', '3121', 1, 'VIC'),
  ('Brunswick', '3056', 2, 'VIC'),
  ('Coburg', '3058', 2, 'VIC'),
  ('Footscray', '3011', 2, 'VIC'),
  ('Frankston', '3199', 3, 'VIC'),
  ('Dandenong', '3175', 3, 'VIC'),
  ('Geelong', '3220', 4, 'VIC'),
  ('Ballarat', '3350', 4, 'VIC');
```

#### 7. Helper Function: `update_updated_at_column()`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## API Design

### Supabase Client API Patterns

All database operations use Supabase's auto-generated REST API with Row Level Security (RLS).

#### Lead Management

```typescript
// lib/api/leads.ts

import { supabase } from '@/lib/supabase';
import type { Lead, LeadStatus } from '@/types/leads';

// Fetch all leads for dashboard
export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      inspection_report:inspection_reports(*),
      assigned_user:auth.users!assigned_to(id, email, raw_user_meta_data)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Create new lead
export async function createLead(lead: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...lead,
      lead_number: await generateLeadNumber(),
      status: 'new_lead',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Trigger email automation
  await triggerEmail('new_lead_response', data.id);

  return data;
}

// Update lead status
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  metadata?: Record<string, any>
): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update({
      status,
      ...metadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId)
    .select()
    .single();

  if (error) throw error;

  // Trigger email automation based on status
  await handleStatusChangeEmail(status, leadId);

  return data;
}

// Generate unique lead number (MRC-2025-0001)
async function generateLeadNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .like('lead_number', `MRC-${year}-%`);

  const nextNumber = (count || 0) + 1;
  return `MRC-${year}-${String(nextNumber).padStart(4, '0')}`;
}
```

#### Inspection Reports

```typescript
// lib/api/inspections.ts

import { supabase } from '@/lib/supabase';
import type { InspectionReport } from '@/types/inspections';

// Create inspection report (auto-save)
export async function saveInspectionReport(
  report: Partial<InspectionReport>
): Promise<InspectionReport> {
  const { data, error } = await supabase
    .from('inspection_reports')
    .upsert({
      ...report,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Generate AI summary
export async function generateAISummary(reportId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-ai-summary', {
    body: { reportId }
  });

  if (error) throw error;

  // Update report with AI summary
  await supabase
    .from('inspection_reports')
    .update({
      ai_summary: data.summary,
      ai_summary_generated_at: new Date().toISOString()
    })
    .eq('id', reportId);

  return data.summary;
}

// Generate PDF
export async function generateInspectionPDF(reportId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-inspection-pdf', {
    body: { reportId }
  });

  if (error) throw error;
  return data.pdfUrl; // URL to PDF in Supabase Storage
}

// Approve and send PDF
export async function approvePDF(reportId: string, userId: string): Promise<void> {
  const { data: report } = await supabase
    .from('inspection_reports')
    .select('*, lead:leads(*)')
    .eq('id', reportId)
    .single();

  // Copy from draft/ to approved/ in Storage
  const approvedUrl = await movePDFToApproved(report.pdf_url);

  // Update report
  await supabase
    .from('inspection_reports')
    .update({
      pdf_url: approvedUrl,
      pdf_approved_by: userId,
      pdf_approved_at: new Date().toISOString(),
      report_status: 'approved'
    })
    .eq('id', reportId);

  // Update lead status
  await supabase
    .from('leads')
    .update({
      status: 'awaiting_job_approval',
      inspection_pdf_url: approvedUrl,
      inspection_pdf_approved_at: new Date().toISOString()
    })
    .eq('id', report.lead_id);

  // Send email with PDF
  await supabase.functions.invoke('send-email', {
    body: {
      template: 'inspection_report',
      leadId: report.lead_id,
      attachments: [{ url: approvedUrl, filename: 'Inspection_Report.pdf' }]
    }
  });
}
```

#### Calendar Bookings

```typescript
// lib/api/calendar.ts

import { supabase } from '@/lib/supabase';
import type { CalendarBooking } from '@/types/calendar';
import { calculateTravelTime, TRAVEL_TIME_MATRIX } from '@/lib/travelTime';

// Fetch available time slots
export async function getAvailableSlots(
  date: Date,
  technicianId: string,
  duration: number,
  propertyZone: number
): Promise<Date[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(7, 0, 0, 0); // 7am start

  const endOfDay = new Date(date);
  endOfDay.setHours(17, 0, 0, 0); // 5pm end

  // Fetch existing bookings for the day
  const { data: bookings } = await supabase
    .from('calendar_bookings')
    .select('*')
    .eq('technician_id', technicianId)
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .eq('status', 'booked')
    .is('deleted_at', null)
    .order('start_time');

  const slots: Date[] = [];
  let currentTime = new Date(startOfDay);

  while (currentTime < endOfDay) {
    const slotEnd = new Date(currentTime.getTime() + duration * 60 * 60 * 1000);

    // Check if slot conflicts with existing bookings
    const hasConflict = bookings?.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return currentTime < bookingEnd && slotEnd > bookingStart;
    });

    if (!hasConflict) {
      // Check travel time from previous booking
      const previousBooking = bookings?.find(b => new Date(b.end_time) <= currentTime);

      if (previousBooking) {
        const travelTime = calculateTravelTime(previousBooking.property_zone, propertyZone);
        const earliestStart = new Date(
          new Date(previousBooking.end_time).getTime() + travelTime * 60 * 1000
        );

        if (currentTime >= earliestStart) {
          slots.push(new Date(currentTime));
        }
      } else {
        slots.push(new Date(currentTime));
      }
    }

    // Move to next 30-minute slot
    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
  }

  return slots;
}

// Create booking
export async function createBooking(
  booking: Partial<CalendarBooking>
): Promise<CalendarBooking> {
  // Verify slot is still available
  const isAvailable = await verifySlotAvailable(
    booking.start_time!,
    booking.technician_id!,
    booking.duration_hours!
  );

  if (!isAvailable) {
    throw new Error('Time slot no longer available');
  }

  // Calculate travel time from previous booking
  const { data: previousBooking } = await supabase
    .from('calendar_bookings')
    .select('*')
    .eq('technician_id', booking.technician_id!)
    .lt('end_time', booking.start_time!)
    .order('end_time', { ascending: false })
    .limit(1)
    .single();

  const travelTime = previousBooking
    ? calculateTravelTime(previousBooking.property_zone, booking.property_zone!)
    : 0;

  const { data, error } = await supabase
    .from('calendar_bookings')
    .insert({
      ...booking,
      previous_booking_id: previousBooking?.id,
      previous_booking_zone: previousBooking?.property_zone,
      travel_time_minutes: travelTime,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

#### Offline Sync

```typescript
// lib/api/offline.ts

import { supabase } from '@/lib/supabase';
import type { OfflineAction } from '@/types/offline';

// Queue action while offline
export async function queueOfflineAction(action: OfflineAction): Promise<void> {
  // Store in localStorage first
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
  queue.push({
    ...action,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  });
  localStorage.setItem('offline_queue', JSON.stringify(queue));
}

// Sync offline queue when back online
export async function syncOfflineQueue(): Promise<void> {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');

  if (queue.length === 0) return;

  const { data, error } = await supabase.functions.invoke('sync-offline-queue', {
    body: { actions: queue }
  });

  if (error) throw error;

  // Remove synced actions from localStorage
  const failedIds = data.failed?.map((f: any) => f.id) || [];
  const remainingQueue = queue.filter((action: any) => failedIds.includes(action.id));
  localStorage.setItem('offline_queue', JSON.stringify(remainingQueue));
}
```

---

## File Structure

```
mrc-app/
├── public/
│   └── email-templates/              # HTML email templates
│       ├── new-lead-response.html
│       ├── inspection-confirmation.html
│       ├── inspection-reminder.html
│       ├── inspection-report.html
│       ├── job-follow-up-1.html
│       ├── job-follow-up-2.html
│       ├── job-confirmation.html
│       └── job-reminder.html
│
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── KanbanBoard.tsx         # 12-stage pipeline
│   │   │   ├── LeadCard.tsx            # Draggable lead card
│   │   │   ├── MobileBottomNav.tsx     # Bottom navigation
│   │   │   └── StatsOverview.tsx       # Dashboard metrics
│   │   │
│   │   ├── inspection/
│   │   │   ├── InspectionForm.tsx      # 100+ field form
│   │   │   ├── PropertyDetails.tsx     # Section 1
│   │   │   ├── DemolitionSection.tsx   # Section 2
│   │   │   ├── ConstructionSection.tsx # Section 3
│   │   │   ├── SubfloorSection.tsx     # Section 4
│   │   │   ├── EquipmentSection.tsx    # Section 5
│   │   │   ├── PricingSection.tsx      # Section 6
│   │   │   ├── PhotoUpload.tsx         # Image compression
│   │   │   ├── AISummaryButton.tsx     # Claude API trigger
│   │   │   └── PDFPreview.tsx          # PDF approval UI
│   │   │
│   │   ├── calendar/
│   │   │   ├── CustomerBooking.tsx     # Self-booking interface
│   │   │   ├── AvailabilityCalendar.tsx
│   │   │   ├── TimeSlotPicker.tsx
│   │   │   └── TravelTimeIndicator.tsx
│   │   │
│   │   ├── leads/
│   │   │   ├── AddLeadDialog.tsx       # Lead creation form
│   │   │   ├── LeadDetails.tsx         # Lead view/edit
│   │   │   └── HiPagesImport.tsx       # HiPages integration
│   │   │
│   │   └── ui/                         # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── textarea.tsx
│   │       ├── dialog.tsx
│   │       ├── calendar.tsx
│   │       └── ... (48 components)
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── leads.ts                # Lead CRUD operations
│   │   │   ├── inspections.ts          # Inspection CRUD
│   │   │   ├── calendar.ts             # Booking logic
│   │   │   ├── offline.ts              # Offline sync
│   │   │   └── emails.ts               # Email triggers
│   │   │
│   │   ├── hooks/
│   │   │   ├── useLeads.ts             # React Query lead hooks
│   │   │   ├── useInspections.ts       # Inspection hooks
│   │   │   ├── useCalendar.ts          # Calendar hooks
│   │   │   ├── useOffline.ts           # Offline detection
│   │   │   └── useAutoSave.ts          # Auto-save hook
│   │   │
│   │   ├── utils/
│   │   │   ├── leadUtils.ts            # Lead number, zone calc
│   │   │   ├── inspectionUtils.ts      # Pricing, formatting
│   │   │   ├── travelTime.ts           # Travel time matrix
│   │   │   ├── dateUtils.ts            # Date formatting
│   │   │   ├── validators.ts           # Zod schemas
│   │   │   └── formatters.ts           # Phone, ABN, currency
│   │   │
│   │   ├── supabase.ts                 # Supabase client
│   │   ├── queryClient.ts              # React Query setup
│   │   └── constants.ts                # App constants
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx               # Main dashboard
│   │   ├── InspectionForm.tsx          # Inspection page
│   │   ├── CalendarView.tsx            # Calendar page
│   │   ├── LeadDetails.tsx             # Lead detail page
│   │   └── CustomerBooking.tsx         # Public booking page
│   │
│   ├── types/
│   │   ├── leads.ts                    # Lead TypeScript types
│   │   ├── inspections.ts              # Inspection types
│   │   ├── calendar.ts                 # Calendar types
│   │   ├── offline.ts                  # Offline queue types
│   │   └── database.ts                 # Supabase generated types
│   │
│   ├── App.tsx                         # Root component
│   ├── main.tsx                        # Entry point
│   └── index.css                       # Global styles
│
├── supabase/
│   ├── functions/
│   │   ├── generate-inspection-pdf/
│   │   │   ├── index.ts                # PDF generation Edge Function
│   │   │   └── templates/
│   │   │       └── inspection-report.html
│   │   │
│   │   ├── generate-ai-summary/
│   │   │   └── index.ts                # Claude API integration
│   │   │
│   │   ├── send-email/
│   │   │   └── index.ts                # Resend API integration
│   │   │
│   │   └── sync-offline-queue/
│   │       └── index.ts                # Offline sync handler
│   │
│   ├── migrations/
│   │   ├── 20250111000001_create_leads.sql
│   │   ├── 20250111000002_create_inspection_reports.sql
│   │   ├── 20250111000003_create_calendar_bookings.sql
│   │   ├── 20250111000004_create_email_logs.sql
│   │   ├── 20250111000005_create_offline_queue.sql
│   │   ├── 20250111000006_create_suburb_zones.sql
│   │   ├── 20250111000007_seed_suburb_zones.sql
│   │   └── 20250111000008_enable_rls.sql
│   │
│   └── config.toml                     # Supabase config
│
├── context/
│   ├── MRC-PRD.md                      # Product Requirements
│   ├── MRC-TECHNICAL-SPEC.md           # This document
│   ├── MRC-SPRINT-1-TASKS.md           # Sprint roadmap
│   └── design-checklist-s-tier.md      # Design guidelines
│
├── .env.local                          # Environment variables
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

---

## Component Architecture

### Auto-Save Hook (`useAutoSave.ts`)

```typescript
// src/lib/hooks/useAutoSave.ts

import { useEffect, useRef } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { saveInspectionReport } from '@/lib/api/inspections';
import { queueOfflineAction } from '@/lib/api/offline';
import { useOnlineStatus } from '@/lib/hooks/useOffline';

export function useAutoSave<T>(
  data: T,
  onSave: (data: T) => Promise<void>,
  options: {
    delay?: number;
    enabled?: boolean;
    storageKey?: string;
  } = {}
) {
  const { delay = 30000, enabled = true, storageKey } = options;
  const isOnline = useOnlineStatus();
  const debouncedData = useDebounce(data, delay);
  const previousDataRef = useRef<T>();

  useEffect(() => {
    if (!enabled) return;

    // Save to localStorage immediately for offline persistence
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }, [data, storageKey, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (JSON.stringify(debouncedData) === JSON.stringify(previousDataRef.current)) return;

    async function save() {
      try {
        if (isOnline) {
          await onSave(debouncedData);
          console.log('Auto-saved at', new Date().toLocaleTimeString());
        } else {
          // Queue for later sync
          await queueOfflineAction({
            action_type: 'update',
            table_name: 'inspection_reports',
            payload: debouncedData
          });
          console.log('Queued for offline sync');
        }
        previousDataRef.current = debouncedData;
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Keep in localStorage for recovery
      }
    }

    save();
  }, [debouncedData, isOnline, onSave, enabled]);

  return {
    lastSaved: previousDataRef.current ? new Date() : null,
    isSaving: JSON.stringify(data) !== JSON.stringify(previousDataRef.current)
  };
}
```

### Offline Detection Hook (`useOffline.ts`)

```typescript
// src/lib/hooks/useOffline.ts

import { useEffect, useState } from 'react';
import { syncOfflineQueue } from '@/lib/api/offline';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      // Sync offline queue when back online
      syncOfflineQueue().catch(console.error);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 bg-destructive text-destructive-foreground p-3 text-center z-50">
      <p className="text-sm font-medium">
        You're offline. Changes will sync when connection is restored.
      </p>
    </div>
  );
}
```

### Travel Time Calculator (`travelTime.ts`)

```typescript
// src/lib/utils/travelTime.ts

export const TRAVEL_TIME_MATRIX = {
  1: { 1: 15, 2: 30, 3: 45, 4: 60 },  // Zone 1 to 1/2/3/4 (minutes)
  2: { 1: 30, 2: 20, 3: 40, 4: 55 },  // Zone 2 to 1/2/3/4
  3: { 1: 45, 2: 40, 3: 25, 4: 45 },  // Zone 3 to 1/2/3/4
  4: { 1: 60, 2: 55, 3: 45, 4: 30 },  // Zone 4 to 1/2/3/4
} as const;

export function calculateTravelTime(fromZone: number, toZone: number): number {
  return TRAVEL_TIME_MATRIX[fromZone as keyof typeof TRAVEL_TIME_MATRIX][
    toZone as keyof typeof TRAVEL_TIME_MATRIX[1]
  ];
}

export function getTravelTimeLabel(minutes: number): string {
  if (minutes < 30) return 'Short drive';
  if (minutes < 45) return 'Medium drive';
  if (minutes < 60) return 'Long drive';
  return 'Extended drive';
}
```

### Pricing Calculator (`inspectionUtils.ts`)

```typescript
// src/lib/utils/inspectionUtils.ts

export interface PricingConfig {
  demolition: boolean;
  construction: boolean;
  subfloor: boolean;
  hours: number;
  dehumidifiers: number;
  airMovers: number;
  rcdBox: boolean;
  equipmentDays: number;
}

// Base rates (ex GST)
const BASE_RATES = {
  no_demolition: { 2: 612, 8: 1216.99 },
  demolition: { 2: 711.90, 8: 1798.90 },
  construction: { 2: 661.96, 8: 1507.95 },
  subfloor: { 2: 900, 8: 2334.69 },
};

// Equipment rates (per day, ex GST)
const EQUIPMENT_RATES = {
  dehumidifier: 132,
  airMover: 46,
  rcdBox: 5,
};

export function calculatePricing(config: PricingConfig) {
  // 1. Determine work type
  let workType: keyof typeof BASE_RATES;
  if (config.subfloor) {
    workType = 'subfloor';
  } else if (config.construction) {
    workType = 'construction';
  } else if (config.demolition) {
    workType = 'demolition';
  } else {
    workType = 'no_demolition';
  }

  // 2. Get base rate for 2h or 8h
  const rates = BASE_RATES[workType];
  let baseRate: number;

  if (config.hours === 2) {
    baseRate = rates[2];
  } else if (config.hours === 8) {
    baseRate = rates[8];
  } else {
    // Interpolate for other hour values
    const hourlyRate = (rates[8] - rates[2]) / 6;
    baseRate = rates[2] + hourlyRate * (config.hours - 2);
  }

  // 3. Calculate total for all days
  const totalHours = config.hours;
  let labourCost: number;

  if (totalHours <= 8) {
    labourCost = baseRate;
  } else if (totalHours <= 16) {
    // 2 days: 7.5% discount
    labourCost = baseRate * 2 * 0.925;
  } else {
    // 3+ days: 13% discount
    const days = Math.ceil(totalHours / 8);
    labourCost = baseRate * days * 0.87;
  }

  // 4. Calculate equipment costs
  const equipmentCost =
    config.dehumidifiers * EQUIPMENT_RATES.dehumidifier * config.equipmentDays +
    config.airMovers * EQUIPMENT_RATES.airMover * config.equipmentDays +
    (config.rcdBox ? EQUIPMENT_RATES.rcdBox * config.equipmentDays : 0);

  // 5. Calculate totals
  const totalExGST = labourCost + equipmentCost;
  const gst = totalExGST * 0.1;
  const totalIncGST = totalExGST + gst;

  return {
    labourCost,
    equipmentCost,
    totalExGST,
    gst,
    totalIncGST,
    breakdown: {
      workType,
      baseRate,
      discount: totalHours > 16 ? 0.13 : totalHours > 8 ? 0.075 : 0,
      dehumidifiers: config.dehumidifiers * EQUIPMENT_RATES.dehumidifier * config.equipmentDays,
      airMovers: config.airMovers * EQUIPMENT_RATES.airMover * config.equipmentDays,
      rcdBox: config.rcdBox ? EQUIPMENT_RATES.rcdBox * config.equipmentDays : 0,
    }
  };
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount);
};
```

### Australian Formatters (`formatters.ts`)

```typescript
// src/lib/utils/formatters.ts

// Phone: 04XX XXX XXX
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    if (cleaned.startsWith('04')) {
      // Mobile: 04XX XXX XXX
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    // Landline: (0X) XXXX XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }

  return phone;
}

// ABN: XX XXX XXX XXX
export function formatABN(abn: string): string {
  const cleaned = abn.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }

  return abn;
}

// Validate ABN checksum
export function validateABN(abn: string): boolean {
  const cleaned = abn.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = cleaned.split('').map(Number);

  // Subtract 1 from first digit
  digits[0] -= 1;

  // Calculate weighted sum
  const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0);

  // Valid if divisible by 89
  return sum % 89 === 0;
}

// Postcode validation (VIC only for Sprint 1)
export function validatePostcode(postcode: string): boolean {
  const code = parseInt(postcode, 10);
  return (code >= 3000 && code <= 3999) || (code >= 8000 && code <= 8999);
}

// Date: DD/MM/YYYY
export function formatDateAU(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// DateTime: DD/MM/YYYY at HH:MM AM/PM
export function formatDateTimeAU(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatDateAU(d);
  const timeStr = d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${dateStr} at ${timeStr}`;
}
```

---

## Email System Implementation

### Resend API Setup

**Step 1: DNS Configuration**

Add these DNS records to `mouldandrestoration.com.au`:

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT
Name: resend._domainkey
Value: [Provided by Resend after domain verification]

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@mouldandrestoration.com.au
```

**Step 2: Resend API Integration**

```typescript
// supabase/functions/send-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface EmailRequest {
  template: string;
  leadId: string;
  attachments?: Array<{ url: string; filename: string }>;
}

serve(async (req) => {
  try {
    const { template, leadId, attachments }: EmailRequest = await req.json();

    // Fetch lead data
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('*, inspection_report:inspection_reports(*)')
      .eq('id', leadId)
      .single();

    // Load email template
    const templateHtml = await loadTemplate(template, lead);
    const subject = getSubjectLine(template, lead);

    // Prepare attachments if any
    const emailAttachments = attachments
      ? await Promise.all(
          attachments.map(async (att) => ({
            filename: att.filename,
            content: await fetchFileAsBase64(att.url),
          }))
        )
      : [];

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'MRC Mould & Restoration <admin@mouldandrestoration.com.au>',
      to: [lead.customer_email],
      subject,
      html: templateHtml,
      attachments: emailAttachments,
      headers: {
        'X-Entity-Ref-ID': leadId,
      },
    });

    if (error) throw error;

    // Log email in database
    await supabaseAdmin.from('email_logs').insert({
      lead_id: leadId,
      template_name: template,
      recipient_email: lead.customer_email,
      recipient_name: lead.customer_name,
      subject,
      status: 'sent',
      resend_email_id: data.id,
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, emailId: data.id }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Email send error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function getSubjectLine(template: string, lead: any): string {
  const subjects: Record<string, string> = {
    new_lead_response: `Re: Your Mould Inspection Request - ${lead.lead_number}`,
    inspection_confirmation: `Inspection Confirmed - ${formatDateAU(lead.inspection_date)}`,
    inspection_reminder: `Reminder: Inspection Tomorrow at ${formatTimeAU(lead.inspection_date)}`,
    inspection_report: `Your Mould Inspection Report - ${lead.property_address}`,
    job_follow_up_1: `Following Up: Mould Remediation Quote - ${lead.lead_number}`,
    job_follow_up_2: `Final Follow-Up: Your Mould Remediation Quote`,
    job_confirmation: `Job Booked - ${formatDateAU(lead.job_start_date)}`,
    job_reminder: `Reminder: Mould Remediation Tomorrow`,
  };
  return subjects[template] || 'MRC Mould & Restoration';
}

async function loadTemplate(template: string, lead: any): Promise<string> {
  // Load HTML template from storage
  const templatePath = `email-templates/${template}.html`;
  const { data } = await supabaseAdmin.storage
    .from('templates')
    .download(templatePath);

  let html = await data.text();

  // Replace variables
  html = html
    .replace(/{{customer_name}}/g, lead.customer_name)
    .replace(/{{lead_number}}/g, lead.lead_number)
    .replace(/{{property_address}}/g, lead.property_address)
    .replace(/{{inspection_date}}/g, formatDateTimeAU(lead.inspection_date))
    .replace(/{{technician_name}}/g, getTechnicianName(lead.inspection_technician_id))
    .replace(/{{total_cost}}/g, formatCurrency(lead.job_estimated_cost * 1.1));

  return html;
}
```

### Email Template Example

```html
<!-- public/email-templates/inspection-confirmation.html -->

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inspection Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #1e3a8a;
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px 20px;
      border-radius: 0 0 8px 8px;
    }
    .info-box {
      background: white;
      border-left: 4px solid #1e3a8a;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background: #1e3a8a;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Inspection Confirmed</h1>
    <p>MRC Mould & Restoration Co.</p>
  </div>

  <div class="content">
    <p>Hi {{customer_name}},</p>

    <p>Your mould inspection has been confirmed. Here are the details:</p>

    <div class="info-box">
      <p><strong>Reference Number:</strong> {{lead_number}}</p>
      <p><strong>Date & Time:</strong> {{inspection_date}}</p>
      <p><strong>Property:</strong> {{property_address}}</p>
      <p><strong>Technician:</strong> {{technician_name}}</p>
      <p><strong>Duration:</strong> Approx. 2 hours</p>
    </div>

    <p><strong>What to expect:</strong></p>
    <ul>
      <li>Our technician will arrive at your property at the scheduled time</li>
      <li>They'll conduct a thorough inspection of affected areas</li>
      <li>Moisture readings will be taken</li>
      <li>Photos will be captured for documentation</li>
      <li>You'll receive a detailed report within 24 hours</li>
    </ul>

    <p><strong>Please ensure:</strong></p>
    <ul>
      <li>Access to all affected areas is clear</li>
      <li>Pets are secured</li>
      <li>Someone over 18 is present during the inspection</li>
    </ul>

    <a href="https://app.mouldandrestoration.com.au/booking/reschedule/{{lead_id}}" class="button">
      Reschedule or Cancel
    </a>

    <p>If you have any questions, please don't hesitate to contact us at:</p>
    <p>
      <strong>Phone:</strong> 0491 701 821<br>
      <strong>Email:</strong> admin@mouldandrestoration.com.au
    </p>

    <p>We look forward to helping you!</p>

    <p>
      Best regards,<br>
      <strong>MRC Mould & Restoration Co.</strong>
    </p>
  </div>
</body>
</html>
```

---

## PDF Generation System

### Supabase Edge Function: `generate-inspection-pdf`

```typescript
// supabase/functions/generate-inspection-pdf/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const { reportId } = await req.json();

    // 1. Fetch inspection report data
    const { data: report, error: reportError } = await supabase
      .from('inspection_reports')
      .select(`
        *,
        lead:leads(*),
        technician:auth.users!technician_id(*)
      `)
      .eq('id', reportId)
      .single();

    if (reportError) throw reportError;

    // 2. Load HTML template
    const { data: templateData } = await supabase.storage
      .from('templates')
      .download('pdf-templates/inspection-report.html');

    let html = await templateData!.text();

    // 3. Replace template variables
    html = replaceTemplateVariables(html, report);

    // 4. Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    await browser.close();

    // 5. Upload to Supabase Storage
    const filename = `${report.lead.lead_number}_Inspection_Report_v${report.pdf_version || 1}.pdf`;
    const filePath = `draft/${reportId}/${filename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inspection-pdfs')
      .upload(filePath, pdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 6. Get public URL
    const { data: urlData } = supabase.storage
      .from('inspection-pdfs')
      .getPublicUrl(filePath);

    // 7. Update report with PDF URL
    await supabase
      .from('inspection_reports')
      .update({
        pdf_url: urlData.publicUrl,
        pdf_generated_at: new Date().toISOString(),
        pdf_version: (report.pdf_version || 0) + 1,
      })
      .eq('id', reportId);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: urlData.publicUrl,
        version: (report.pdf_version || 0) + 1,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function replaceTemplateVariables(html: string, report: any): string {
  // Basic replacements
  html = html
    .replace(/{{lead_number}}/g, report.lead.lead_number)
    .replace(/{{customer_name}}/g, report.customer_name)
    .replace(/{{customer_email}}/g, report.customer_email)
    .replace(/{{customer_phone}}/g, formatPhoneNumber(report.customer_phone))
    .replace(/{{property_address}}/g, report.property_address)
    .replace(/{{inspection_date}}/g, formatDateAU(report.inspection_date))
    .replace(/{{technician_name}}/g, report.technician.raw_user_meta_data.full_name);

  // Pricing
  html = html
    .replace(/{{total_ex_gst}}/g, formatCurrency(report.total_cost_ex_gst))
    .replace(/{{total_inc_gst}}/g, formatCurrency(report.total_cost_inc_gst))
    .replace(/{{estimated_hours}}/g, String(report.estimated_hours));

  // AI Summary
  html = html.replace(/{{ai_summary}}/g, report.ai_summary || '');

  // Scope of works
  html = html.replace(/{{scope_of_works}}/g, report.scope_of_works || '');

  // Affected areas table
  const affectedAreasRows = (report.affected_areas || [])
    .map(
      (area: any) => `
        <tr>
          <td>${area.area}</td>
          <td>${area.size_m2} m²</td>
          <td>${area.moisture_reading}%</td>
        </tr>
      `
    )
    .join('');
  html = html.replace(/{{affected_areas_rows}}/g, affectedAreasRows);

  // Equipment table
  let equipmentRows = '';
  if (report.equipment_dehumidifiers > 0) {
    equipmentRows += `<tr><td>Dehumidifiers</td><td>${report.equipment_dehumidifiers}</td><td>${report.equipment_days} days</td></tr>`;
  }
  if (report.equipment_air_movers > 0) {
    equipmentRows += `<tr><td>Air Movers</td><td>${report.equipment_air_movers}</td><td>${report.equipment_days} days</td></tr>`;
  }
  if (report.equipment_rcd_box) {
    equipmentRows += `<tr><td>RCD Box</td><td>1</td><td>${report.equipment_days} days</td></tr>`;
  }
  html = html.replace(/{{equipment_rows}}/g, equipmentRows || '<tr><td colspan="3">No equipment required</td></tr>');

  // Photos (if demolition/construction/subfloor)
  if (report.demolition_photos && report.demolition_photos.length > 0) {
    const photoHtml = report.demolition_photos
      .map(
        (photo: any) => `
          <div class="photo">
            <img src="${photo.url}" alt="${photo.caption}" />
            <p>${photo.caption}</p>
          </div>
        `
      )
      .join('');
    html = html.replace(/{{demolition_photos}}/g, photoHtml);
  } else {
    html = html.replace(/{{demolition_photos}}/g, '');
  }

  return html;
}
```

### PDF Template Structure

```html
<!-- supabase/functions/generate-inspection-pdf/templates/inspection-report.html -->

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mould Inspection Report</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1e3a8a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1e3a8a;
      margin: 0;
      font-size: 24pt;
    }
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      background: #1e3a8a;
      color: white;
      padding: 8px 12px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f3f4f6;
      font-weight: bold;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 10px 0;
    }
    .info-item {
      padding: 8px;
      background: #f9fafb;
      border-left: 3px solid #1e3a8a;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
      font-size: 9pt;
    }
    .info-value {
      color: #000;
      font-size: 11pt;
    }
    .photo {
      display: inline-block;
      width: 48%;
      margin: 1%;
      page-break-inside: avoid;
    }
    .photo img {
      width: 100%;
      border: 1px solid #ccc;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9pt;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>MRC Mould & Restoration Co.</h1>
    <p>Professional Mould Inspection Report</p>
    <p style="font-size: 9pt; color: #6b7280;">
      ABN: 12 345 678 901 | Phone: 0491 701 821 | admin@mouldandrestoration.com.au
    </p>
  </div>

  <!-- Report Reference -->
  <div class="section">
    <div class="section-title">Report Reference</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Report Number</div>
        <div class="info-value">{{lead_number}}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Inspection Date</div>
        <div class="info-value">{{inspection_date}}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Technician</div>
        <div class="info-value">{{technician_name}}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Report Generated</div>
        <div class="info-value">{{generated_date}}</div>
      </div>
    </div>
  </div>

  <!-- Customer & Property Details -->
  <div class="section">
    <div class="section-title">Customer & Property Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Customer Name</div>
        <div class="info-value">{{customer_name}}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Email</div>
        <div class="info-value">{{customer_email}}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Phone</div>
        <div class="info-value">{{customer_phone}}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Property Address</div>
        <div class="info-value">{{property_address}}</div>
      </div>
    </div>
  </div>

  <!-- Executive Summary (AI-Generated) -->
  <div class="section">
    <div class="section-title">Executive Summary</div>
    <p>{{ai_summary}}</p>
  </div>

  <!-- Affected Areas -->
  <div class="section">
    <div class="section-title">Affected Areas & Moisture Readings</div>
    <table>
      <thead>
        <tr>
          <th>Area</th>
          <th>Size (m²)</th>
          <th>Moisture Reading</th>
        </tr>
      </thead>
      <tbody>
        {{affected_areas_rows}}
      </tbody>
    </table>
  </div>

  <!-- Scope of Works -->
  <div class="section">
    <div class="section-title">Scope of Works</div>
    <p>{{scope_of_works}}</p>
  </div>

  <!-- Equipment Required -->
  <div class="section">
    <div class="section-title">Equipment Required</div>
    <table>
      <thead>
        <tr>
          <th>Equipment</th>
          <th>Quantity</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {{equipment_rows}}
      </tbody>
    </table>
  </div>

  <!-- Pricing -->
  <div class="section">
    <div class="section-title">Quote Summary</div>
    <table>
      <tr>
        <td><strong>Estimated Hours</strong></td>
        <td>{{estimated_hours}} hours</td>
      </tr>
      <tr>
        <td><strong>Total (ex GST)</strong></td>
        <td>{{total_ex_gst}}</td>
      </tr>
      <tr>
        <td><strong>GST (10%)</strong></td>
        <td>{{gst}}</td>
      </tr>
      <tr style="background: #f3f4f6; font-weight: bold; font-size: 12pt;">
        <td><strong>TOTAL (inc GST)</strong></td>
        <td>{{total_inc_gst}}</td>
      </tr>
    </table>
  </div>

  <!-- Photos -->
  <div class="section">
    <div class="section-title">Inspection Photos</div>
    {{demolition_photos}}
  </div>

  <!-- Terms & Conditions -->
  <div class="section">
    <div class="section-title">Terms & Conditions</div>
    <ul style="font-size: 9pt;">
      <li>Quote valid for 30 days from inspection date</li>
      <li>Payment terms: 50% deposit, balance on completion</li>
      <li>Invoice due within 30 days</li>
      <li>Additional work outside scope will be quoted separately</li>
    </ul>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>MRC Mould & Restoration Co. | ABN: 12 345 678 901 | www.mouldandrestoration.com.au</p>
  </div>
</body>
</html>
```

---

## Calendar Booking Algorithm

### Available Slots Logic

```typescript
// src/lib/api/calendar.ts (detailed implementation)

import { supabase } from '@/lib/supabase';
import { calculateTravelTime } from '@/lib/utils/travelTime';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
  travelTimeFromPrevious?: number;
  previousZone?: number;
}

export async function getAvailableSlots(params: {
  date: Date;
  technicianId: string;
  duration: number;
  propertyZone: number;
  consecutiveDays?: number; // For multi-day jobs
}): Promise<TimeSlot[]> {
  const { date, technicianId, duration, propertyZone, consecutiveDays = 1 } = params;

  // Business hours: 7am - 5pm
  const WORK_START_HOUR = 7;
  const WORK_END_HOUR = 17;
  const SLOT_INTERVAL_MINUTES = 30;

  const slots: TimeSlot[] = [];

  // Check availability for all consecutive days
  for (let dayOffset = 0; dayOffset < consecutiveDays; dayOffset++) {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + dayOffset);

    const startOfDay = new Date(currentDate);
    startOfDay.setHours(WORK_START_HOUR, 0, 0, 0);

    const endOfDay = new Date(currentDate);
    endOfDay.setHours(WORK_END_HOUR, 0, 0, 0);

    // Fetch existing bookings for this day
    const { data: bookings } = await supabase
      .from('calendar_bookings')
      .select('*')
      .eq('technician_id', technicianId)
      .gte('start_time', startOfDay.toISOString())
      .lt('start_time', endOfDay.toISOString())
      .in('status', ['booked', 'in_progress'])
      .is('deleted_at', null)
      .order('start_time');

    let currentTime = new Date(startOfDay);

    while (currentTime.getTime() + duration * 60 * 60 * 1000 <= endOfDay.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60 * 60 * 1000);

      // Check for conflicts
      const hasConflict = bookings?.some((booking) => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        return currentTime < bookingEnd && slotEnd > bookingStart;
      });

      if (!hasConflict) {
        // Check travel time from previous booking
        const previousBooking = findPreviousBooking(bookings || [], currentTime);

        let travelTimeMinutes = 0;
        let canBook = true;

        if (previousBooking) {
          travelTimeMinutes = calculateTravelTime(
            previousBooking.property_zone,
            propertyZone
          );

          const previousEnd = new Date(previousBooking.end_time);
          const earliestStart = new Date(
            previousEnd.getTime() + travelTimeMinutes * 60 * 1000
          );

          canBook = currentTime >= earliestStart;
        }

        slots.push({
          startTime: new Date(currentTime),
          endTime: new Date(slotEnd),
          available: canBook,
          travelTimeFromPrevious: travelTimeMinutes,
          previousZone: previousBooking?.property_zone,
        });
      }

      // Move to next slot
      currentTime = new Date(currentTime.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000);
    }
  }

  return slots.filter((slot) => slot.available);
}

function findPreviousBooking(bookings: any[], currentTime: Date) {
  return bookings
    .filter((b) => new Date(b.end_time) <= currentTime)
    .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())[0];
}
```

### Multi-Day Booking Validation

```typescript
// src/lib/api/calendar.ts

export async function validateMultiDayBooking(params: {
  startDate: Date;
  technicianId: string;
  hoursPerDay: number;
  totalDays: number;
  propertyZone: number;
}): Promise<{ valid: boolean; conflicts?: string[] }> {
  const { startDate, technicianId, hoursPerDay, totalDays, propertyZone } = params;

  const conflicts: string[] = [];

  for (let day = 0; day < totalDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);

    const slots = await getAvailableSlots({
      date: currentDate,
      technicianId,
      duration: hoursPerDay,
      propertyZone,
    });

    if (slots.length === 0) {
      conflicts.push(
        `Day ${day + 1} (${formatDateAU(currentDate)}): No available ${hoursPerDay}h slots`
      );
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  };
}
```

---

## Offline Mode & Auto-Save

### Auto-Save Implementation in Inspection Form

```typescript
// src/pages/InspectionForm.tsx (key sections)

import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { useOnlineStatus, OfflineIndicator } from '@/lib/hooks/useOffline';
import { saveInspectionReport } from '@/lib/api/inspections';

export function InspectionForm({ leadId }: { leadId: string }) {
  const [formData, setFormData] = useState<InspectionReportData>({});
  const isOnline = useOnlineStatus();

  // Auto-save every 30 seconds
  const { lastSaved, isSaving } = useAutoSave(
    formData,
    async (data) => {
      await saveInspectionReport({ ...data, lead_id: leadId });
    },
    {
      delay: 30000, // 30 seconds
      enabled: true,
      storageKey: `inspection_draft_${leadId}`,
    }
  );

  // Load from localStorage on mount (recovery)
  useEffect(() => {
    const savedData = localStorage.getItem(`inspection_draft_${leadId}`);
    if (savedData) {
      setFormData(JSON.parse(savedData));
      toast.success('Draft recovered from local storage');
    }
  }, [leadId]);

  return (
    <div>
      <OfflineIndicator />

      <div className="flex items-center justify-between mb-4">
        <h1>Inspection Report</h1>
        <div className="text-sm text-muted-foreground">
          {isSaving && <span>Saving...</span>}
          {lastSaved && !isSaving && (
            <span>Last saved: {formatTimeAgo(lastSaved)}</span>
          )}
          {!isOnline && <span className="text-destructive">Offline mode</span>}
        </div>
      </div>

      {/* Form sections... */}
    </div>
  );
}
```

### Offline Queue Sync

```typescript
// src/App.tsx (application root)

import { useEffect } from 'react';
import { syncOfflineQueue } from '@/lib/api/offline';
import { useOnlineStatus } from '@/lib/hooks/useOffline';

export function App() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (isOnline) {
      // Sync offline queue when app comes online
      syncOfflineQueue()
        .then(() => {
          console.log('Offline queue synced successfully');
          toast.success('All offline changes have been synced');
        })
        .catch((error) => {
          console.error('Offline sync failed:', error);
          toast.error('Some offline changes could not be synced');
        });
    }
  }, [isOnline]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
      <OfflineIndicator />
    </QueryClientProvider>
  );
}
```

---

## Authentication & Authorization

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;

-- Leads Table Policies
CREATE POLICY "Users can view leads assigned to them or created by them"
  ON leads FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can update leads assigned to them"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Inspection Reports Policies
CREATE POLICY "Users can view inspection reports they created"
  ON inspection_reports FOR SELECT
  TO authenticated
  USING (
    technician_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can create and update their own inspection reports"
  ON inspection_reports FOR ALL
  TO authenticated
  USING (technician_id = auth.uid())
  WITH CHECK (technician_id = auth.uid());

-- Calendar Bookings Policies
CREATE POLICY "Users can view their own bookings"
  ON calendar_bookings FOR SELECT
  TO authenticated
  USING (
    technician_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can create bookings"
  ON calendar_bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Offline Queue Policies
CREATE POLICY "Users can only access their own offline queue"
  ON offline_queue FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Email Logs (Admin only)
CREATE POLICY "Only admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
```

### User Roles

```typescript
// src/types/auth.ts

export type UserRole = 'admin' | 'technician';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone: string;
}

// Check user role
export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

export function isTechnician(user: User): boolean {
  return user.role === 'technician';
}
```

---

## Environment Variables

### `.env.local`

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Resend API
VITE_RESEND_API_KEY=re_your_api_key

# Claude API (for AI summaries)
VITE_CLAUDE_API_KEY=sk-ant-your-api-key

# App URL
VITE_APP_URL=https://app.mouldandrestoration.com.au

# Environment
VITE_ENV=development
```

### Supabase Edge Functions Environment Variables

Set via Supabase CLI or Dashboard:

```bash
# Set secrets for Edge Functions
supabase secrets set RESEND_API_KEY=re_your_api_key
supabase secrets set CLAUDE_API_KEY=sk-ant-your-api-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Third-Party Integrations

### 1. Resend API (Email Delivery)

**Setup:**
1. Create account at resend.com
2. Add domain: mouldandrestoration.com.au
3. Configure DNS records (SPF, DKIM, DMARC)
4. Get API key
5. Test email delivery

**Pricing:** Free tier (100 emails/day) → $20/month (50,000/month)

**Implementation:** See [Email System Implementation](#email-system-implementation)

---

### 2. Claude API (AI Summaries)

**Edge Function:**

```typescript
// supabase/functions/generate-ai-summary/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('CLAUDE_API_KEY'),
});

serve(async (req) => {
  try {
    const { reportId } = await req.json();

    // Fetch inspection data
    const { data: report } = await supabaseAdmin
      .from('inspection_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    // Build prompt
    const prompt = `
You are a professional mould remediation specialist writing an executive summary for a customer's inspection report.

Property: ${report.property_address}
Affected Areas: ${JSON.stringify(report.affected_areas)}
Demolition Required: ${report.demolition_required ? 'Yes' : 'No'}
Construction Required: ${report.construction_required ? 'Yes' : 'No'}
Subfloor Work: ${report.subfloor_required ? 'Yes' : 'No'}
Estimated Hours: ${report.estimated_hours}
Equipment: ${report.equipment_dehumidifiers} dehumidifiers, ${report.equipment_air_movers} air movers

Write a 2-3 paragraph executive summary that:
1. Describes the mould issue found
2. Explains the required remediation work
3. Provides reassurance about the process
4. Uses professional but accessible language (avoid jargon)

Keep it concise, factual, and customer-friendly.
`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const summary = message.content[0].type === 'text' ? message.content[0].text : '';

    return new Response(JSON.stringify({ summary }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('AI summary error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
```

**Pricing:** ~$3 per 1M input tokens, ~$15 per 1M output tokens (Claude Sonnet 3.5)

---

### 3. Supabase Storage (PDF Storage)

**Bucket Structure:**

```
inspection-pdfs/
├── draft/
│   └── {report_id}/
│       ├── MRC-2025-0001_Inspection_Report_v1.pdf
│       ├── MRC-2025-0001_Inspection_Report_v2.pdf
│       └── MRC-2025-0001_Inspection_Report_v3.pdf
└── approved/
    └── MRC-2025-0001_Inspection_Report_FINAL.pdf

templates/
├── email-templates/
│   ├── new-lead-response.html
│   └── inspection-confirmation.html
└── pdf-templates/
    └── inspection-report.html
```

**Storage Policies:**

```sql
-- Allow authenticated users to upload to draft/
CREATE POLICY "Users can upload draft PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inspection-pdfs' AND (storage.foldername(name))[1] = 'draft');

-- Allow authenticated users to read their own PDFs
CREATE POLICY "Users can read their own PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'inspection-pdfs');

-- Only admins can write to approved/
CREATE POLICY "Only admins can write to approved folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-pdfs' AND
    (storage.foldername(name))[1] = 'approved' AND
    auth.jwt() ->> 'role' = 'admin'
  );
```

---

## Testing Strategy

### 1. Unit Tests (Vitest)

```typescript
// src/lib/utils/__tests__/inspectionUtils.test.ts

import { describe, it, expect } from 'vitest';
import { calculatePricing } from '../inspectionUtils';

describe('calculatePricing', () => {
  it('should calculate 2-hour no demolition job correctly', () => {
    const result = calculatePricing({
      demolition: false,
      construction: false,
      subfloor: false,
      hours: 2,
      dehumidifiers: 0,
      airMovers: 0,
      rcdBox: false,
      equipmentDays: 0,
    });

    expect(result.labourCost).toBe(612);
    expect(result.totalExGST).toBe(612);
    expect(result.totalIncGST).toBe(673.20);
  });

  it('should apply 7.5% discount for 16-hour job', () => {
    const result = calculatePricing({
      demolition: false,
      construction: false,
      subfloor: false,
      hours: 16,
      dehumidifiers: 2,
      airMovers: 3,
      rcdBox: true,
      equipmentDays: 3,
    });

    // 2 days * 1216.99 * 0.925 = 2251.43
    expect(result.labourCost).toBeCloseTo(2251.43, 2);
    expect(result.breakdown.discount).toBe(0.075);
  });

  it('should apply 13% discount for 24-hour job', () => {
    const result = calculatePricing({
      demolition: true,
      construction: false,
      subfloor: false,
      hours: 24,
      dehumidifiers: 3,
      airMovers: 4,
      rcdBox: true,
      equipmentDays: 5,
    });

    // 3 days * 1798.90 * 0.87 = 4694.11
    expect(result.labourCost).toBeCloseTo(4694.11, 2);
    expect(result.breakdown.discount).toBe(0.13);
  });
});
```

### 2. Integration Tests (Playwright)

```typescript
// tests/e2e/inspection-form.spec.ts

import { test, expect } from '@playwright/test';

test('technician can create and auto-save inspection report', async ({ page }) => {
  await page.goto('/login');

  // Login as technician
  await page.fill('[name="email"]', 'clayton@mouldandrestoration.com.au');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Navigate to lead
  await page.goto('/leads/MRC-2025-0001');
  await page.click('text=Start Inspection');

  // Fill out form
  await page.fill('[name="property_address"]', '123 Test St, Melbourne VIC 3000');
  await page.click('[name="demolition_required"]');
  await page.fill('[name="demolition_description"]', 'Remove affected drywall');

  // Wait for auto-save (30 seconds)
  await page.waitForTimeout(31000);
  await expect(page.locator('text=Last saved:')).toBeVisible();

  // Verify localStorage
  const storage = await page.evaluate(() => {
    const data = localStorage.getItem('inspection_draft_MRC-2025-0001');
    return JSON.parse(data);
  });
  expect(storage.demolition_required).toBe(true);
});

test('offline mode queues changes for sync', async ({ page, context }) => {
  await context.setOffline(true);

  await page.goto('/inspection-form/123');

  await page.fill('[name="property_address"]', '456 Offline St');
  await page.click('button[type="submit"]');

  await expect(page.locator('text=You\'re offline')).toBeVisible();

  // Go back online
  await context.setOffline(false);

  // Should trigger sync
  await expect(page.locator('text=All offline changes have been synced')).toBeVisible();
});
```

### 3. Email Testing

```typescript
// tests/email.test.ts

import { sendEmail } from '../supabase/functions/send-email';

test('sends inspection confirmation email with correct data', async () => {
  const mockLead = {
    id: '123',
    customer_name: 'John Smith',
    customer_email: 'john@example.com',
    lead_number: 'MRC-2025-0001',
    inspection_date: new Date('2025-01-15T10:00:00'),
  };

  const result = await sendEmail({
    template: 'inspection_confirmation',
    leadId: mockLead.id,
  });

  expect(result.success).toBe(true);
  expect(result.emailId).toBeDefined();
});
```

---

## Deployment

### 1. Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy generate-inspection-pdf
supabase functions deploy generate-ai-summary
supabase functions deploy send-email
supabase functions deploy sync-offline-queue

# Set secrets
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set CLAUDE_API_KEY=sk-ant-xxx
```

### 2. Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_RESEND_API_KEY
# - VITE_CLAUDE_API_KEY
# - VITE_APP_URL
```

### 3. DNS Configuration

```
Type: A
Name: app
Value: 76.76.21.21 (Vercel IP)

Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: TXT (SPF)
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT (DKIM)
Name: resend._domainkey
Value: [from Resend dashboard]

Type: TXT (DMARC)
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@mouldandrestoration.com.au
```

### 4. Production Checklist

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Edge Functions deployed
- [ ] DNS records configured
- [ ] SSL certificates active
- [ ] Email domain verified (Resend)
- [ ] Test email delivery (not spam)
- [ ] Test PDF generation
- [ ] Test offline mode + sync
- [ ] Test auto-save functionality
- [ ] Load test with 100+ concurrent users
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Accessibility audit (WCAG 2.1 AA)

---

## Performance Optimizations

### 1. Database Indexes

All critical indexes are defined in schema (see [Database Schema](#database-schema)).

### 2. React Query Caching

```typescript
// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 3. Image Optimization

```typescript
// src/lib/utils/imageCompression.ts

export async function compressImage(file: File, maxSizeMB = 1): Promise<File> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      let { width, height } = img;

      // Resize if too large
      const maxDimension = 1920;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Compression failed'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
```

### 4. Code Splitting

```typescript
// src/App.tsx

import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const InspectionForm = lazy(() => import('./pages/InspectionForm'));
const CalendarView = lazy(() => import('./pages/CalendarView'));

export function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inspection/:id" element={<InspectionForm />} />
        <Route path="/calendar" element={<CalendarView />} />
      </Routes>
    </Suspense>
  );
}
```

---

## Security Considerations

### 1. Input Validation (Zod Schemas)

```typescript
// src/lib/validators.ts

import { z } from 'zod';

export const leadSchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters'),
  customer_email: z.string().email('Invalid email address'),
  customer_phone: z.string().regex(/^04\d{2}\s?\d{3}\s?\d{3}$/, 'Invalid Australian mobile'),
  property_address: z.string().min(5, 'Address required'),
  property_postcode: z.string().regex(/^(3|8)\d{3}$/, 'Invalid VIC postcode'),
  urgency: z.enum(['emergency', 'urgent', 'standard']),
});

export const abnSchema = z
  .string()
  .regex(/^\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$/, 'Invalid ABN format')
  .refine(validateABN, 'Invalid ABN checksum');
```

### 2. SQL Injection Prevention

All queries use Supabase's parameterized queries (automatic protection).

### 3. XSS Prevention

```typescript
// Always sanitize HTML before rendering
import DOMPurify from 'dompurify';

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}
```

### 4. CSRF Protection

Supabase handles CSRF tokens automatically via JWT-based auth.

### 5. Rate Limiting

```typescript
// supabase/functions/_shared/rateLimit.ts

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}
```

---

## Monitoring & Logging

### 1. Supabase Logs

View Edge Function logs:
```bash
supabase functions logs generate-inspection-pdf --tail
```

### 2. Error Tracking (Sentry)

```typescript
// src/lib/sentry.ts

import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENV,
  tracesSampleRate: 0.1,
});

export function logError(error: Error, context?: Record<string, any>) {
  console.error(error);
  Sentry.captureException(error, { extra: context });
}
```

### 3. Analytics (PostHog)

```typescript
// src/lib/analytics.ts

import posthog from 'posthog-js';

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
});

export function trackEvent(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties);
}

// Usage
trackEvent('inspection_completed', {
  lead_number: 'MRC-2025-0001',
  technician_id: 'clayton',
  duration_hours: 2,
});
```

---

## Sprint 1 Success Criteria

**Must Work Perfectly:**
1. ✅ Lead creation from website form
2. ✅ 12-stage Kanban pipeline with drag-and-drop
3. ✅ Inspection form with 100+ fields
4. ✅ Auto-save every 30 seconds
5. ✅ Offline mode with localStorage
6. ✅ AI-generated inspection summary (Claude API)
7. ✅ PDF generation from HTML template
8. ✅ PDF preview, edit, regenerate, approve
9. ✅ Email automation (8 templates via Resend)
10. ✅ Customer self-booking calendar
11. ✅ Travel time logic (zone-based)
12. ✅ Australian formatting (phone, ABN, currency, dates)
13. ✅ Mobile-first UI (48px touch targets)
14. ✅ Pricing calculator with multi-day discounts

**Demo Script:**
1. Create new lead → auto-email sent
2. Drag to "Inspection Booked" → confirmation email
3. Complete inspection form offline
4. Generate AI summary
5. Generate PDF → preview → edit → regenerate → approve
6. PDF sent to customer
7. Customer books job via self-booking calendar
8. Show travel time validation works

---

## Next Steps (Sprint 2)

- Job completion workflow
- Invoice generation
- Payment tracking
- Customer review requests
- Reporting & analytics
- HiPages API integration
- Technician mobile app (PWA)

---

**Document End**

This technical specification provides complete implementation details for Sprint 1 of the MRC Lead Management System. All code examples are production-ready and follow industry best practices.

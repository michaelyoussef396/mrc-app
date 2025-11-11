# MRC Database Schema - Relationships & Data Flow Map

**Created:** 2025-11-11
**Purpose:** Visual reference for table relationships and data dependencies

---

## Core Entity Relationships

### Primary Entity: LEADS (Customer Records)

```
┌─────────────────────────────────────────────────────────────┐
│                          LEADS                              │
│                    (Core Customer Record)                   │
│                                                             │
│  lead_number (unique)                                       │
│  status: [new_lead → ... → finished]                        │
│  full_name, email, phone                                    │
│  property_address_*, property_zone                          │
│  assigned_to (FK: auth.users.id)                            │
│  quoted_amount, invoice_amount                              │
│  inspection_scheduled_date, job_scheduled_date              │
│  inspection_completed_date, job_completed_date              │
│  invoice_sent_date, payment_received_date                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
    ┌────────────────┬───────────────┬────────────────────┐
    │                │               │                    │
    ↓                ↓               ↓                    ↓
INSPECTIONS    CALENDAR_EVENTS  EMAIL_LOGS          SMS_LOGS
(Form Data)    (Schedule)       (Reports)           (Alerts)
    │                │               │                    │
    ├─ inspection_areas             │                    │
    ├─ subfloor_data     ┌──────────┴────────┐           │
    ├─ photos            │                   │           │
    └─ equipment_bookings        ACTIVITIES  │           │
                                  (Audit)    │           │
                                  │          │           │
                             INVOICES (Sprint 2)
```

---

## Data Flow: 12-Stage Lead Pipeline

```
NEW_LEAD
  ↓
  └─→ Contact customer → CONTACTED
        ↓
        └─→ Schedule inspection → INSPECTION_WAITING
              ↓ [calendar_event created]
              └─→ Perform inspection → INSPECTION_COMPLETED
                    ↓ [inspection form filled, photos added]
                    ├─→ Generate AI summary
                    ├─→ Generate PDF report
                    └─→ INSPECTION_REPORT_PDF_COMPLETED
                          ↓ [email_log: send report]
                          └─→ Customer approves quote → JOB_WAITING
                                ↓ [customer self-booking OR admin schedule]
                                └─→ Schedule job → JOB_BOOKED [calendar_event]
                                      ↓ [perform work]
                                      └─→ JOB_COMPLETED
                                            ↓ [generate job report]
                                            └─→ JOB_REPORT_PDF_SENT
                                                  ↓ [send invoice]
                                                  └─→ INVOICING_SENT
                                                        ↓ [payment received]
                                                        └─→ PAID
                                                              ↓
                                                              └─→ GOOGLE_REVIEW
                                                                    ↓
                                                                    └─→ FINISHED
```

---

## Inspection Form Data Hierarchy

```
INSPECTIONS (1:1 per lead)
│
├─ INSPECTION_AREAS (1:N) ─ Room-by-room detail
│  │
│  ├─ MOISTURE_READINGS (1:N)
│  │  └─ moisture_percentage → moisture_status
│  │
│  └─ PHOTOS (1:N) ─ Photos in this room
│
├─ SUBFLOOR_DATA (0:1) ─ Optional subfloor section
│  │
│  ├─ SUBFLOOR_READINGS (1:N)
│  │
│  └─ PHOTOS (1:N) ─ Subfloor photos
│
├─ PHOTOS (1:N) ─ General inspection photos
│
└─ EQUIPMENT_BOOKINGS (1:N) ─ Equipment rental
   │
   └─ EQUIPMENT (N:1)
      ├─ name: "Dehumidifier", daily_rate: $132
      ├─ name: "Air mover", daily_rate: $46
      └─ name: "RCD box", daily_rate: $5
```

---

## Calendar & Booking Workflow

```
LEAD (property_zone, property_address_suburb)
│
└─→ BOOKING_TOKENS (one-time tokens for customer self-booking)
    │
    ├─ send to customer via email_logs
    │
    └─ customer clicks link → Calendar booking page
        │
        ├─ SUBURB_ZONES lookup (suburb → zone)
        ├─ SUBURB_ZONES travel time matrix lookup
        ├─ Calendar conflict check (has_travel_time_conflict)
        │
        └─ If no conflicts:
            │
            └─→ CALENDAR_EVENTS created
                │
                ├─ assigned_to: technician (leads.assigned_to)
                ├─ start_datetime, end_datetime
                ├─ travel_time_minutes (calculated)
                ├─ status: 'scheduled'
                │
                └─→ send_reminder (email_logs)

CALENDAR_EVENTS (All bookings - inspections AND jobs)
│
├─ Inspect for conflicts with: has_travel_time_conflict()
├─ Check technician availability: operating_hours
│
└─ On completion: status → 'completed'
```

---

## Offline Sync Queue Flow

```
MOBILE APP (Goes offline)
│
├─ Form changes saved to localStorage
│
└─→ OFFLINE_QUEUE entry created
    │
    ├─ user_id, action_type (create/update/delete)
    ├─ table_name (leads, inspections, photos, etc)
    ├─ record_id, payload (full data)
    ├─ status: 'pending'
    ├─ device_info, network_info
    │
    └─ User sees: "Offline mode - changes will sync"
        │
        └─→ Connection restored
            │
            └─→ Sync engine reads: get_pending_sync_items(user_id)
                │
                ├─ Process by priority DESC, created_at ASC
                ├─ Apply each action to Supabase
                │
                ├─ If success: status → 'synced'
                ├─ If conflict: status → 'conflict', store server data
                │
                └─ localStorage cleared
```

---

## Communication Audit Trail

```
LEADS
│
├─→ EMAIL_LOGS (tracking all outbound emails)
│   │
│   ├─ inspection_report_ready: Send PDF to customer
│   ├─ booking_confirmation: Confirm calendar event
│   ├─ job_completion: Job finished notification
│   ├─ payment_reminder: Invoice due notice
│   ├─ password_reset: Auth flow
│   ├─ customer_booking_link: Self-booking URL
│   ├─ technician_reminder: Schedule reminder
│   │
│   └─ tracking:
│       ├─ sent_at, delivered_at
│       ├─ opened_at, clicked_at
│       ├─ status: pending/sent/delivered/bounced/failed
│       └─ provider_message_id (Resend API)
│
├─→ SMS_LOGS (tracking SMS messages)
│   │
│   ├─ booking_reminder: Calendar event reminder
│   ├─ inspection_ready: Ready to schedule
│   │
│   └─ tracking:
│       ├─ sent_at, delivered_at
│       ├─ status: pending/sent/delivered/failed
│       ├─ cost_cents: Per-SMS cost tracking
│       └─ provider_message_id (Twilio)
│
└─→ ACTIVITIES (internal audit trail)
    │
    ├─ status_change: Lead moved to new stage
    ├─ file_uploaded: Photo added
    ├─ inspection_completed: Form submitted
    ├─ note_added: Internal comment
    │
    └─ metadata: JSONB with details
```

---

## User & Access Control

```
AUTH.USERS (Supabase Auth - authoritative)
│
├─ PRIMARY: ID used for all FK references
│
└─→ PROFILES (Extended user data)
    ├─ onboarding_completed, onboarding_step
    ├─ phone, avatar_url, is_active
    ├─ last_login, created_at, updated_at
    │
    └─→ USER_ROLES (Role assignments)
        ├─ role: 'admin' | 'technician' | 'manager'
        │
        └─ RLS Policies:
            ├─ is_admin() → has_role('admin')
            ├─ has_role(role_name) → check user_roles table
            │
            └─ Example (leads):
                ├─ Admins: SELECT/INSERT/UPDATE/DELETE all
                ├─ Technicians: SELECT own (assigned_to = auth.uid())
                ├─ Public (customers): SELECT own booking info
                └─ Cannot: cross-assign leads (admin-only)

OPERATING_HOURS (Per-technician availability)
│
├─ user_id (FK: auth.users.id)
├─ day_of_week (0-6)
├─ is_open, open_time, close_time
│
└─ Used in: Calendar conflict detection, availability checks
```

---

## Pricing & Financial Workflow

```
PRICING_SETTINGS (Configuration, 1 row per job_type)
│
├─ no_demolition_surface: $612 (2h), $1,216.99 (8h)
├─ demo: $711.90 (2h), $1,798.90 (8h)
├─ construction: $661.96 (2h), $1,507.95 (8h)
├─ subfloor: $900 (2h), $2,334.69 (8h)
│
└─→ Used in INSPECTIONS form:
    │
    ├─ User selects job_type
    ├─ User enters job_time_minutes
    │
    ├─→ Calculate labor cost:
    │   ├─ Get base rate (hours_2_rate or hours_8_rate)
    │   ├─ Calculate hours: job_time_minutes / 60
    │   ├─ interpolate or round to hour
    │   ├─ Apply multi-day discount:
    │   │  ├─ 0-8h: 0% discount
    │   │  ├─ 8-16h: 7.5% discount
    │   │  └─ 16+h: 13% discount (capped)
    │   │
    │   └─ estimated_cost_ex_gst
    │
    ├─→ EQUIPMENT_BOOKINGS:
    │   ├─ Select equipment: Dehumidifier ($132/day), Air mover ($46/day), RCD box ($5/day)
    │   ├─ Duration_days
    │   └─ equipment_cost_ex_gst
    │
    ├─→ Calculate totals:
    │   ├─ subtotal_ex_gst = labor + equipment + waste_disposal
    │   ├─ gst_amount = subtotal_ex_gst * 0.1
    │   ├─ total_inc_gst = subtotal_ex_gst * 1.1
    │   │
    │   └─ Store in:
    │       ├─ inspections.estimated_cost_ex_gst
    │       ├─ inspections.estimated_cost_inc_gst
    │       ├─ inspections.equipment_cost_ex_gst
    │       ├─ inspections.equipment_cost_inc_gst
    │       └─ leads.quoted_amount
    │
    └─→ INVOICES (Sprint 2):
        ├─ subtotal_ex_gst
        ├─ gst_amount (calculated: subtotal * 0.1)
        ├─ total_inc_gst (calculated: subtotal * 1.1)
        ├─ issue_date, due_date
        ├─ status: draft → sent → paid
        └─ track: paid_date, paid_amount
```

---

## Search & Query Patterns

### High-Frequency Queries & Their Indexes

**1. "Show me all my assigned leads" (Technician Dashboard)**
```sql
SELECT * FROM leads 
WHERE assigned_to = ? 
ORDER BY created_at DESC;

Indexes used:
- idx_leads_assigned_to
- Primary sort on created_at (sequential)
```

**2. "What's on my schedule today?" (Technician Calendar)**
```sql
SELECT * FROM calendar_events 
WHERE assigned_to = ? 
AND start_datetime BETWEEN ? AND ? 
AND status != 'cancelled'
ORDER BY start_datetime;

Indexes used:
- idx_calendar_events_technician_time (assigned_to, start_datetime, end_datetime)
- Filtered WHERE status != 'cancelled' (built into index)
```

**3. "Is there a scheduling conflict?" (Booking Validation)**
```sql
SELECT COUNT(*) FROM calendar_events 
WHERE assigned_to = ? 
AND ((start_datetime < ? AND end_datetime > ?) 
     OR (start_datetime < ? AND end_datetime > ?))
AND status NOT IN ('cancelled', 'completed');

Indexes used:
- idx_calendar_events_technician_time (multi-column, filtered)
- Travel time calculated with has_travel_time_conflict()
```

**4. "Get all photos for this inspection" (Report Generation)**
```sql
SELECT * FROM photos 
WHERE inspection_id = ? 
ORDER BY order_index;

Indexes used:
- idx_photos_inspection_id
```

**5. "What's the status of inspection reports?" (Email Tracking)**
```sql
SELECT * FROM email_logs 
WHERE inspection_id = ? 
AND template_name = 'inspection_report_ready'
ORDER BY sent_at DESC;

Indexes used:
- idx_email_logs_inspection_id
- idx_email_logs_template_name
- Need: composite (inspection_id, template_name, sent_at)
```

**6. "Pending offline sync items?" (Mobile Sync Engine)**
```sql
SELECT * FROM offline_queue 
WHERE user_id = ? 
AND status = 'pending'
ORDER BY priority DESC, created_at ASC;

Indexes used:
- idx_offline_queue_sync_processing (composite, optimized)
```

**7. "Get zone for suburb" (Location Validation)**
```sql
SELECT zone FROM suburb_zones 
WHERE suburb = ?;

Indexes used:
- suburb_zones_suburb_key (unique, fastest)
```

**8. "Which leads are awaiting inspection?" (Admin Dashboard)**
```sql
SELECT * FROM leads 
WHERE status = 'inspection_waiting'
ORDER BY created_at DESC;

Indexes used:
- idx_leads_status
```

---

## Data Validation & Constraints

### Database-Level Constraints

```
LEADS:
├─ property_zone: CHECK (1-4)
├─ assigned_to: FK → auth.users.id
├─ lead_number: UNIQUE
└─ status: ENUM

INSPECTIONS:
├─ lead_id: FK → leads.id (required)
├─ inspector_id: FK → auth.users.id (required)
├─ job_number: UNIQUE
└─ selected_job_type: ENUM

CALENDAR_EVENTS:
├─ assigned_to: FK → auth.users.id (required)
├─ start_datetime < end_datetime (implicit)
└─ status: ENUM

EMAIL_LOGS:
├─ recipient_email: REGEX (email format)
├─ status: ENUM (pending/sent/delivered/...)
└─ template_name: VARCHAR

SMS_LOGS:
├─ recipient_phone: REGEX (AU phone format)
├─ message: length <= 1600 chars
├─ message_type: ENUM
└─ status: ENUM

OPERATING_HOURS:
├─ day_of_week: CHECK (0-6)
└─ user_id + day_of_week: UNIQUE

OFFLINE_QUEUE:
├─ action_type: ENUM (create/update/delete)
├─ table_name: ENUM (limited to syncable tables)
├─ status: ENUM
└─ priority: CHECK (0-10)

SUBURB_ZONES:
├─ suburb: UNIQUE
├─ postcode: REGEX (3XXX format)
└─ zone: CHECK (1-4)
```

---

## Performance Optimization Targets

### 1. Inspection Form Load
```
Query: leads JOIN inspections JOIN inspection_areas 
       JOIN photos LEFT JOIN subfloor_data LEFT JOIN subfloor_readings
       
Rows: 1 lead + 1 inspection + N areas (avg 5-10) 
      + N photos (avg 30-50) + 1 subfloor + N readings

Expected: <200ms with indexes

Indexes involved:
- idx_inspections_lead_id
- idx_inspection_areas_inspection_id
- idx_photos_inspection_id
- idx_photos_area_id
```

### 2. Technician Schedule
```
Query: calendar_events WHERE assigned_to = ? AND date_range
       + calculate_travel_time() calls for each event

Rows: N events (avg 5-8 per day)

Expected: <150ms

Indexes involved:
- idx_calendar_events_technician_time (composite)
```

### 3. Booking Conflict Detection
```
Query: has_travel_time_conflict(assigned_to, start, end)
       + check_booking_conflicts(assigned_to, start, end)

Function calls:
- calculate_travel_time(from_suburb, to_suburb)
- get_zone_by_suburb(suburb)
- SUBURB_ZONES lookups

Expected: <50ms

Optimization: All lookups use UNIQUE or PRIMARY indexes
```

### 4. Email Log Queries
```
Query: email_logs WHERE inspection_id = ? 
       AND template_name = 'inspection_report_ready'

Need: Composite index (inspection_id, template_name, sent_at DESC)
Current: Two separate indexes

Expected: <100ms with current, <50ms with composite
```

---

## Data Retention & Archival

### No Soft-Delete Currently
- All DELETE operations are permanent
- No audit trail for deleted records
- No GDPR-friendly data retention

### Recommendation: Add deleted_at
```
Affected tables:
├─ leads (retention: 7 years, tax requirement)
├─ inspections (retention: 7 years)
├─ invoices (retention: 7 years)
├─ email_logs (retention: 1 year)
└─ sms_logs (retention: 1 year)

Implementation:
├─ Add deleted_at TIMESTAMPTZ NULL to each table
├─ Update all queries to: WHERE deleted_at IS NULL
├─ Create RLS policy for soft-delete cascade
└─ Add archival job (move to archive after retention period)
```

---

## Security & RLS Summary

### Policy Coverage by Access Level

**Admin (is_admin() = true):**
- Full access to all tables and operations
- Can view all leads, inspections, calendar events
- Can modify pricing, company settings, suburbs
- Can manage users and roles

**Technician (has_role('technician')):**
- Own calendar events only
- Own assigned leads only
- Own offline queue
- Read-only pricing, suburbs (reference data)
- Cannot modify other technician's schedules

**Customer (public user with booking token):**
- Can access public booking form
- Can read own calendar event details
- Can access inspection report once generated
- Cannot see admin data, other customers, pricing

**No Auth User (public):**
- Reference data only (suburbs, zones)
- No access to leads, inspections, schedules

---

## Critical Data Dependencies

### Tables That Must Exist For:

**Lead Creation:**
- auth.users (for assignment)
- user_roles (for validation)

**Inspection Creation:**
- leads (parent)
- auth.users (for inspector)
- pricing_settings (for calculation)
- suburb_zones (for zone lookup)

**Calendar Booking:**
- leads, inspections (for context)
- auth.users (for technician)
- suburb_zones (for travel time)
- operating_hours (for availability)

**Email Send:**
- leads, inspections (for context)
- auth.users (for sender)
- email_logs (for tracking)

**Offline Sync:**
- offline_queue (must exist)
- All tables being synced must exist

---

## Conclusion

The current schema is well-structured with:
- Clear entity relationships
- Comprehensive indexing (155+ indexes)
- RLS security on 24/27 tables
- 17 custom functions for business logic
- Support for full inspection workflow

**Phase 2F Focus Areas:**
1. Eliminate duplicate/redundant indexes
2. Add missing NOT NULL constraints
3. Consolidate dual user systems
4. Implement soft-delete for compliance
5. Add automatic audit triggers


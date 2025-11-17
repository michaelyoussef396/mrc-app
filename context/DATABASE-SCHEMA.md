# 🗄️ MRC Database Schema - Production

**Last Updated:** November 17, 2025
**Database:** Supabase PostgreSQL
**Schema Version:** Migration 20251112000020 (latest)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Supporting Tables](#supporting-tables)
4. [Relationships](#relationships)
5. [Indexes](#indexes)
6. [RLS Policies](#rls-policies)
7. [Functions & Triggers](#functions--triggers)

---

## Overview

The MRC database consists of **16 core tables** managing:
- Lead management & tracking
- Customer information
- Inspections & job scheduling
- Quotes & invoicing
- Equipment hire
- Geographic zones & travel time
- Activity logging
- Notifications
- Offline queue management
- Communication logs (email/SMS)

---

## Core Tables

### 1. `leads`

**Purpose:** Central table for all business leads (HiPages, direct, referrals)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default uuid_generate_v4() | Unique lead identifier |
| `lead_number` | text | UNIQUE, NOT NULL | Auto-generated (e.g., "L-2024-0001") |
| `source` | lead_source_enum | NOT NULL | "hipages", "direct", "referral", "google" |
| `hipages_lead_status` | text | nullable | HiPages-specific status |
| `customer_name` | text | NOT NULL | Full customer name |
| `customer_email` | text | nullable | Email address |
| `customer_phone` | text | NOT NULL | Phone number (formatted) |
| `customer_address` | text | NOT NULL | Full address |
| `suburb` | text | nullable | Suburb name |
| `postcode` | text | nullable | Australian postcode |
| `enquiry_details` | text | nullable | Customer enquiry/issue description |
| `work_type` | work_type_enum | nullable | "no_demolition", "demolition", "construction", "subfloor" |
| `status` | lead_status_enum | NOT NULL, default 'new' | Current lead status |
| `priority` | priority_enum | NOT NULL, default 'medium' | "low", "medium", "high", "urgent" |
| `estimated_value` | decimal(10,2) | nullable | Estimated job value (AUD) |
| `actual_value` | decimal(10,2) | nullable | Final job value (AUD) |
| `assigned_to` | uuid | FK → users.id | Technician assigned |
| `notes` | text | nullable | Internal notes |
| `created_at` | timestamptz | NOT NULL, default now() | Lead creation timestamp |
| `updated_at` | timestamptz | NOT NULL, default now() | Last update timestamp |
| `created_by` | uuid | FK → users.id, nullable | User who created lead |
| `follow_up_date` | date | nullable | Next follow-up date |

**Indexes:**
- `idx_leads_lead_number` (lead_number)
- `idx_leads_status` (status)
- `idx_leads_assigned_to` (assigned_to)
- `idx_leads_created_at` (created_at DESC)
- `idx_leads_follow_up_date` (follow_up_date) WHERE status = 'follow_up'

**RLS Policies:**
- `SELECT`: All authenticated users can view leads
- `INSERT`: All authenticated users can create leads
- `UPDATE`: Only assigned technician or admins can update
- `DELETE`: Only admins can delete

---

### 2. `customers`

**Purpose:** Customer contact information and history

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default uuid_generate_v4() | Unique customer ID |
| `name` | text | NOT NULL | Full name |
| `email` | text | nullable | Email address |
| `phone` | text | NOT NULL | Primary phone |
| `address` | text | NOT NULL | Full address |
| `suburb` | text | nullable | Suburb |
| `postcode` | text | nullable | Postcode |
| `notes` | text | nullable | Customer notes |
| `created_at` | timestamptz | NOT NULL, default now() | Record creation |
| `updated_at` | timestamptz | NOT NULL, default now() | Last update |

**Indexes:**
- `idx_customers_phone` (phone)
- `idx_customers_email` (email)

---

### 3. `inspections`

**Purpose:** Scheduled property inspections

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default uuid_generate_v4() | Unique inspection ID |
| `inspection_number` | text | UNIQUE, NOT NULL | Auto-generated (e.g., "I-2024-0001") |
| `lead_id` | uuid | FK → leads.id, NOT NULL | Associated lead |
| `inspection_type` | inspection_type_enum | NOT NULL | "initial", "follow_up", "final" |
| `scheduled_date` | date | NOT NULL | Inspection date |
| `scheduled_time` | time | NOT NULL | Inspection time |
| `duration_minutes` | integer | NOT NULL, default 60 | Expected duration |
| `assigned_to` | uuid | FK → users.id, NOT NULL | Assigned technician |
| `status` | inspection_status_enum | NOT NULL, default 'scheduled' | Current status |
| `customer_name` | text | NOT NULL | Customer name |
| `customer_phone` | text | NOT NULL | Contact phone |
| `property_address` | text | NOT NULL | Inspection address |
| `access_instructions` | text | nullable | Access notes |
| `inspection_notes` | text | nullable | Technician notes |
| `areas_inspected` | jsonb | nullable | Array of area objects with photos |
| `completed_at` | timestamptz | nullable | Completion timestamp |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, default now() | Last update |

**JSONB Structure for `areas_inspected`:**
```json
[
  {
    "area_name": "Kitchen",
    "moisture_reading": "15%",
    "findings": "Visible mould on ceiling",
    "severity": "moderate",
    "photos": [
      {"url": "https://...", "caption": "Kitchen ceiling mould"}
    ],
    "recommendations": "Require remediation"
  }
]
```

**Indexes:**
- `idx_inspections_inspection_number` (inspection_number)
- `idx_inspections_lead_id` (lead_id)
- `idx_inspections_scheduled_date` (scheduled_date)
- `idx_inspections_assigned_to` (assigned_to)
- `idx_inspections_status` (status)

---

### 4. `quotes`

**Purpose:** Job quotes and pricing

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default uuid_generate_v4() | Quote ID |
| `quote_number` | text | UNIQUE, NOT NULL | Auto-generated (e.g., "Q-2024-0001") |
| `lead_id` | uuid | FK → leads.id, NOT NULL | Associated lead |
| `inspection_id` | uuid | FK → inspections.id, nullable | Associated inspection |
| `customer_name` | text | NOT NULL | Customer name |
| `customer_email` | text | nullable | Email for sending quote |
| `customer_phone` | text | NOT NULL | Contact phone |
| `property_address` | text | NOT NULL | Job address |
| `work_type` | work_type_enum | NOT NULL | Type of work |
| `hourly_rate` | decimal(10,2) | NOT NULL | Base hourly rate |
| `estimated_hours` | decimal(5,2) | NOT NULL | Estimated job duration |
| `labour_cost` | decimal(10,2) | NOT NULL | Calculated labour |
| `equipment_hire_items` | jsonb | nullable | Equipment hire details |
| `equipment_hire_cost` | decimal(10,2) | NOT NULL, default 0 | Total equipment cost |
| `materials_cost` | decimal(10,2) | NOT NULL, default 0 | Materials cost |
| `travel_time_minutes` | integer | nullable | Calculated travel time |
| `travel_cost` | decimal(10,2) | NOT NULL, default 0 | Travel charge |
| `subtotal` | decimal(10,2) | NOT NULL | Before discount/GST |
| `discount_percentage` | decimal(5,2) | NOT NULL, default 0 | Discount % (max 13%) |
| `discount_amount` | decimal(10,2) | NOT NULL, default 0 | Discount $ amount |
| `subtotal_after_discount` | decimal(10,2) | NOT NULL | After discount |
| `gst_amount` | decimal(10,2) | NOT NULL | GST (10% of subtotal) |
| `total_amount` | decimal(10,2) | NOT NULL | Final total inc GST |
| `status` | quote_status_enum | NOT NULL, default 'draft' | Quote status |
| `valid_until` | date | NOT NULL | Quote expiry date |
| `notes` | text | nullable | Internal notes |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, default now() | Last update |
| `created_by` | uuid | FK → users.id | Creator |
| `sent_at` | timestamptz | nullable | When quote was sent |
| `accepted_at` | timestamptz | nullable | When accepted |

**JSONB Structure for `equipment_hire_items`:**
```json
[
  {
    "equipment_type": "dehumidifier",
    "quantity": 2,
    "days": 3,
    "rate_per_day": 132.00,
    "total": 792.00
  }
]
```

**Business Rules:**
- `discount_percentage` capped at 13% (0.13)
- `gst_amount` always 10% of `subtotal_after_discount`
- Multi-day jobs (16+ hours) automatically get 13% discount

**Indexes:**
- `idx_quotes_quote_number` (quote_number)
- `idx_quotes_lead_id` (lead_id)
- `idx_quotes_status` (status)

---

### 5. `invoices`

**Purpose:** Job invoices and payment tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Invoice ID |
| `invoice_number` | text | UNIQUE, NOT NULL | Auto-generated (e.g., "INV-2024-0001") |
| `quote_id` | uuid | FK → quotes.id, NOT NULL | Source quote |
| `lead_id` | uuid | FK → leads.id, NOT NULL | Associated lead |
| `customer_name` | text | NOT NULL | Customer name |
| `customer_email` | text | nullable | Billing email |
| `customer_phone` | text | NOT NULL | Contact phone |
| `billing_address` | text | NOT NULL | Invoice address |
| `subtotal` | decimal(10,2) | NOT NULL | Before GST |
| `gst_amount` | decimal(10,2) | NOT NULL | GST amount (10%) |
| `total_amount` | decimal(10,2) | NOT NULL | Total inc GST |
| `amount_paid` | decimal(10,2) | NOT NULL, default 0 | Amount received |
| `amount_outstanding` | decimal(10,2) | NOT NULL | Balance due |
| `status` | invoice_status_enum | NOT NULL, default 'draft' | Invoice status |
| `issued_date` | date | NOT NULL | Issue date |
| `due_date` | date | NOT NULL | Payment due date |
| `paid_date` | date | nullable | Date paid in full |
| `payment_method` | text | nullable | "cash", "card", "bank_transfer" |
| `payment_reference` | text | nullable | Transaction reference |
| `notes` | text | nullable | Invoice notes |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, default now() | Last update |

**Indexes:**
- `idx_invoices_invoice_number` (invoice_number)
- `idx_invoices_lead_id` (lead_id)
- `idx_invoices_status` (status)
- `idx_invoices_due_date` (due_date) WHERE status != 'paid'

---

### 6. `calendar_events`

**Purpose:** Scheduling and calendar management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Event ID |
| `user_id` | uuid | FK → users.id, NOT NULL | Assigned user |
| `event_type` | event_type_enum | NOT NULL | "inspection", "job", "meeting", "other" |
| `related_inspection_id` | uuid | FK → inspections.id, nullable | If type = inspection |
| `related_lead_id` | uuid | FK → leads.id, nullable | Associated lead |
| `title` | text | NOT NULL | Event title |
| `description` | text | nullable | Event details |
| `start_time` | timestamptz | NOT NULL | Event start |
| `end_time` | timestamptz | NOT NULL | Event end |
| `all_day` | boolean | NOT NULL, default false | All-day event |
| `location` | text | nullable | Event location |
| `status` | event_status_enum | NOT NULL, default 'scheduled' | Event status |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, default now() | Last update |

**Indexes:**
- `idx_calendar_events_user_id` (user_id)
- `idx_calendar_events_start_time` (start_time)
- `idx_calendar_events_event_type` (event_type)

---

### 7. `suburb_zones`

**Purpose:** Melbourne suburb zone mapping for travel time calculations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Zone ID |
| `suburb` | text | NOT NULL | Suburb name |
| `postcode` | text | NOT NULL | Postcode |
| `zone` | zone_enum | NOT NULL | "inner", "middle", "outer" |
| `base_travel_time_minutes` | integer | NOT NULL | Base travel time from depot |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL, default now() | Last update |

**Indexes:**
- `idx_suburb_zones_suburb` (suburb)
- `idx_suburb_zones_postcode` (postcode)
- `idx_suburb_zones_zone` (zone)

**Travel Time Calculation:**
- Inner: 15-30 minutes
- Middle: 30-45 minutes
- Outer: 45-60 minutes

---

### 8. `notifications`

**Purpose:** Real-time user notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Notification ID |
| `user_id` | uuid | FK → users.id, NOT NULL | Recipient user |
| `title` | text | NOT NULL | Notification title |
| `message` | text | NOT NULL | Notification body |
| `type` | notification_type_enum | NOT NULL | Notification category |
| `related_lead_id` | uuid | FK → leads.id, nullable | Associated lead |
| `related_inspection_id` | uuid | FK → inspections.id, nullable | Associated inspection |
| `link_url` | text | nullable | Click destination URL |
| `is_read` | boolean | NOT NULL, default false | Read status |
| `read_at` | timestamptz | nullable | When marked read |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |

**Notification Types:**
- `new_lead` - New lead created
- `status_change` - Lead status changed
- `job_completed` - Job marked complete
- `payment_received` - Payment recorded
- `inspection_scheduled` - Inspection booked

**Indexes:**
- `idx_notifications_user_id` (user_id)
- `idx_notifications_is_read` (is_read)
- `idx_notifications_created_at` (created_at DESC)
- Composite: `idx_notifications_user_unread` (user_id, is_read) WHERE is_read = false

---

### 9. `lead_activities`

**Purpose:** Activity log for lead tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Activity ID |
| `lead_id` | uuid | FK → leads.id, NOT NULL | Associated lead |
| `user_id` | uuid | FK → users.id, NOT NULL | User who performed action |
| `activity_type` | activity_type_enum | NOT NULL | Type of activity |
| `description` | text | NOT NULL | Activity description |
| `metadata` | jsonb | nullable | Additional data |
| `created_at` | timestamptz | NOT NULL, default now() | Activity timestamp |

**Activity Types:**
- `created` - Lead created
- `status_changed` - Status updated
- `assigned` - Lead assigned
- `note_added` - Note added
- `inspection_scheduled` - Inspection booked
- `quote_sent` - Quote sent
- `converted` - Lead converted to job

**Indexes:**
- `idx_lead_activities_lead_id` (lead_id)
- `idx_lead_activities_created_at` (created_at DESC)

---

### 10. `offline_queue`

**Purpose:** Offline-first queue for sync when reconnected

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Queue item ID |
| `user_id` | uuid | FK → users.id, NOT NULL | User who created |
| `operation_type` | operation_type_enum | NOT NULL | "create", "update", "delete" |
| `table_name` | text | NOT NULL | Target table |
| `record_id` | uuid | nullable | Record being modified |
| `payload` | jsonb | NOT NULL | Operation data |
| `status` | queue_status_enum | NOT NULL, default 'pending' | Queue status |
| `retry_count` | integer | NOT NULL, default 0 | Retry attempts |
| `error_message` | text | nullable | Last error |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |
| `processed_at` | timestamptz | nullable | When processed |

**Indexes:**
- `idx_offline_queue_user_id` (user_id)
- `idx_offline_queue_status` (status)
- `idx_offline_queue_created_at` (created_at)

---

### 11. `email_logs`

**Purpose:** Email communication tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Log entry ID |
| `lead_id` | uuid | FK → leads.id, nullable | Associated lead |
| `quote_id` | uuid | FK → quotes.id, nullable | Associated quote |
| `invoice_id` | uuid | FK → invoices.id, nullable | Associated invoice |
| `recipient_email` | text | NOT NULL | To email |
| `subject` | text | NOT NULL | Email subject |
| `body` | text | NOT NULL | Email body |
| `status` | email_status_enum | NOT NULL | Delivery status |
| `provider_message_id` | text | nullable | Provider tracking ID |
| `sent_at` | timestamptz | nullable | When sent |
| `delivered_at` | timestamptz | nullable | When delivered |
| `opened_at` | timestamptz | nullable | When opened |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |

**Indexes:**
- `idx_email_logs_lead_id` (lead_id)
- `idx_email_logs_status` (status)

---

### 12. `sms_logs`

**Purpose:** SMS communication tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Log entry ID |
| `lead_id` | uuid | FK → leads.id, nullable | Associated lead |
| `recipient_phone` | text | NOT NULL | To phone number |
| `message` | text | NOT NULL | SMS content |
| `status` | sms_status_enum | NOT NULL | Delivery status |
| `provider_message_id` | text | nullable | Provider tracking ID |
| `sent_at` | timestamptz | nullable | When sent |
| `delivered_at` | timestamptz | nullable | When delivered |
| `created_at` | timestamptz | NOT NULL, default now() | Creation timestamp |

**Indexes:**
- `idx_sms_logs_lead_id` (lead_id)
- `idx_sms_logs_status` (status)

---

### 13. `users` (Managed by Supabase Auth)

**Purpose:** User accounts and authentication

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | User ID (from auth.users) |
| `email` | text | Email address |
| `full_name` | text | Display name |
| `role` | user_role_enum | "admin", "technician", "office" |
| `created_at` | timestamptz | Account creation |

---

## Enums

### `lead_source_enum`
- `hipages`
- `direct`
- `referral`
- `google`

### `work_type_enum`
- `no_demolition`
- `demolition`
- `construction`
- `subfloor`

### `lead_status_enum`
- `new`
- `contacted`
- `qualified`
- `quote_sent`
- `follow_up`
- `won`
- `lost`
- `on_hold`

### `priority_enum`
- `low`
- `medium`
- `high`
- `urgent`

### `inspection_status_enum`
- `scheduled`
- `in_progress`
- `completed`
- `cancelled`
- `rescheduled`

### `quote_status_enum`
- `draft`
- `sent`
- `accepted`
- `declined`
- `expired`

### `invoice_status_enum`
- `draft`
- `sent`
- `paid`
- `overdue`
- `cancelled`

### `zone_enum`
- `inner`
- `middle`
- `outer`

---

## Relationships

```
users
  ├─→ leads (assigned_to, created_by)
  ├─→ inspections (assigned_to)
  ├─→ calendar_events (user_id)
  ├─→ notifications (user_id)
  ├─→ lead_activities (user_id)
  └─→ offline_queue (user_id)

leads
  ├─→ inspections (lead_id)
  ├─→ quotes (lead_id)
  ├─→ invoices (lead_id)
  ├─→ calendar_events (related_lead_id)
  ├─→ notifications (related_lead_id)
  ├─→ lead_activities (lead_id)
  ├─→ email_logs (lead_id)
  └─→ sms_logs (lead_id)

inspections
  ├─→ quotes (inspection_id)
  ├─→ calendar_events (related_inspection_id)
  └─→ notifications (related_inspection_id)

quotes
  └─→ invoices (quote_id)
```

---

## Functions & Triggers

### Auto-Increment Functions

1. **`generate_lead_number()`**
   - Auto-generates sequential lead numbers: `L-2024-0001`
   - Trigger: `BEFORE INSERT ON leads`

2. **`generate_inspection_number()`**
   - Auto-generates inspection numbers: `I-2024-0001`
   - Trigger: `BEFORE INSERT ON inspections`

3. **`generate_quote_number()`**
   - Auto-generates quote numbers: `Q-2024-0001`
   - Trigger: `BEFORE INSERT ON quotes`

4. **`generate_invoice_number()`**
   - Auto-generates invoice numbers: `INV-2024-0001`
   - Trigger: `BEFORE INSERT ON invoices`

### Timestamp Triggers

- **`update_updated_at_column()`**
  - Updates `updated_at` on every UPDATE
  - Applied to: `leads`, `customers`, `inspections`, `quotes`, `invoices`, etc.

### Notification Triggers

1. **`notify_on_new_lead()`**
   - Creates notification when new lead inserted
   - Trigger: `AFTER INSERT ON leads`

2. **`notify_on_status_change()`**
   - Creates notification when lead status changes
   - Trigger: `AFTER UPDATE ON leads` (when status changes)

3. **`notify_on_inspection_scheduled()`**
   - Creates notification when inspection booked
   - Trigger: `AFTER INSERT ON inspections`

4. **`notify_on_job_completed()`**
   - Creates notification when job marked complete
   - Trigger: `AFTER UPDATE ON leads` (when status = 'won')

5. **`notify_on_payment_received()`**
   - Creates notification when payment recorded
   - Trigger: `AFTER UPDATE ON invoices` (when status = 'paid')

### Activity Logging Triggers

- **`log_lead_activity()`**
  - Logs all lead changes to `lead_activities`
  - Trigger: `AFTER INSERT OR UPDATE ON leads`

---

## RLS Policies Summary

### Global Rules
- All tables: Row Level Security ENABLED
- Public table access: DENIED (except public lead creation for HiPages webhook)
- Authenticated users: READ access to all data
- UPDATE/DELETE: Role-based restrictions

### Specific Policies

**Leads:**
- SELECT: All authenticated users
- INSERT: All authenticated users (+ public for HiPages API)
- UPDATE: Assigned technician OR admin role
- DELETE: Admin role only

**Inspections:**
- SELECT: All authenticated users
- INSERT: All authenticated users
- UPDATE: Assigned technician OR admin
- DELETE: Admin only

**Quotes & Invoices:**
- SELECT: All authenticated users
- INSERT: Admin OR technician
- UPDATE: Admin OR creator
- DELETE: Admin only

**Notifications:**
- SELECT: Own notifications only (`user_id = auth.uid()`)
- INSERT: System/triggers only
- UPDATE: Own notifications only (mark read)
- DELETE: Own notifications only

**Calendar Events:**
- SELECT: Own events OR admin
- INSERT: Own events OR admin
- UPDATE: Own events OR admin
- DELETE: Own events OR admin

---

## Performance Indexes

### Critical Performance Indexes

```sql
-- Lead lookups
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- Notification queries
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = false;

-- Calendar queries
CREATE INDEX idx_calendar_events_user_date
  ON calendar_events(user_id, start_time);

-- Activity timeline
CREATE INDEX idx_lead_activities_lead_created
  ON lead_activities(lead_id, created_at DESC);
```

---

## Backup & Recovery

**Backup Strategy:**
- Automatic daily backups (Supabase managed)
- Point-in-time recovery (PITR) enabled
- 7-day retention

**Critical Tables (Priority Backup):**
1. `leads` - Business critical
2. `customers` - Business critical
3. `inspections` - Business critical
4. `quotes` - Financial critical
5. `invoices` - Financial critical

---

## Migration History

**Latest Migration:** `20251112000020_add_lead_activity_triggers.sql`

**Applied Migrations (28 total):**
- Phase 1: Initial schema (tables, enums, RLS)
- Phase 2: Functions & triggers
- Phase 3: Performance indexes
- Phase 4: Notification system
- Phase 5: Activity logging

**Migration Files:** See `supabase/migrations/` directory

---

## Schema Maintenance

### Adding New Tables
1. Create migration file: `supabase/migrations/YYYYMMDD_description.sql`
2. Enable RLS: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
3. Add RLS policies
4. Create indexes
5. Update this documentation

### Modifying Columns
1. Create migration with ALTER TABLE
2. Update TypeScript types: `npm run generate-types`
3. Update this documentation

### Adding Triggers
1. Create function first
2. Add trigger with AFTER/BEFORE timing
3. Test with sample data
4. Update this documentation

---

## TypeScript Types

**Generate types from schema:**
```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

**Types are auto-generated from this schema** - see `src/types/database.types.ts`

---

## Contact

**Schema Maintainer:** MRC Development Team
**Last Schema Review:** November 17, 2025
**Next Review:** Monthly (or after major migrations)

---

**This is the SINGLE SOURCE OF TRUTH for MRC database schema.**
**All 7 previous schema docs have been consolidated into this document.**

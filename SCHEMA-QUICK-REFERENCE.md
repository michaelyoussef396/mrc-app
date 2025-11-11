# MRC Database Schema - Quick Reference Guide

**Purpose:** Fast lookup for developers
**Last Updated:** 2025-11-11

---

## The 27 Tables at a Glance

### Core Workflow (Must Know)
```
LEADS → INSPECTIONS → PHOTOS → CALENDAR_EVENTS → EMAIL_LOGS → INVOICES
  ↓         ↓            ↓          ↓                ↓
assigned   inspector   storage    technician      recipient
  ↓         ↓            ↓          ↓                ↓
auth.users auth.users  storage    auth.users      customer
```

### The 10 Most Important Tables

| # | Table | Key Field | Purpose | Rows |
|---|-------|-----------|---------|------|
| 1 | **leads** | id (UUID) | Customer inquiries | 12 |
| 2 | **inspections** | lead_id | Form data | 0 |
| 3 | **calendar_events** | assigned_to | Technician schedule | 2 |
| 4 | **inspection_areas** | inspection_id | Room-by-room detail | 0 |
| 5 | **photos** | inspection_id | Photo storage | 0 |
| 6 | **email_logs** | lead_id | Delivery tracking | 0 |
| 7 | **offline_queue** | user_id | Mobile sync | 0 |
| 8 | **suburb_zones** | suburb | Location mapping | 126 |
| 9 | **pricing_settings** | job_type | Job pricing | 4 |
| 10 | **equipment** | id | Equipment rental | 3 |

---

## Critical Queries

### "Get my leads" (Technician Dashboard)
```sql
SELECT * FROM leads 
WHERE assigned_to = auth.uid() 
ORDER BY created_at DESC;
-- Index: idx_leads_assigned_to
```

### "What's on my calendar?" (Technician Schedule)
```sql
SELECT * FROM calendar_events 
WHERE assigned_to = auth.uid() 
AND start_datetime >= NOW()::date 
AND status != 'cancelled'
ORDER BY start_datetime;
-- Index: idx_calendar_events_technician_time
```

### "Can I book this time?" (Conflict Check)
```sql
SELECT has_travel_time_conflict(
  assigned_to_uuid, 
  start_time, 
  end_time
) AS conflict;
-- Uses: suburb_zones travel matrix, calendar_events
```

### "Get inspection photos" (Report Generation)
```sql
SELECT * FROM photos 
WHERE inspection_id = ? 
ORDER BY area_id, order_index;
-- Index: idx_photos_inspection_id
```

### "Get pending syncs" (Mobile App)
```sql
SELECT * FROM offline_queue 
WHERE user_id = auth.uid() 
AND status = 'pending'
ORDER BY priority DESC, created_at ASC;
-- Index: idx_offline_queue_sync_processing
```

### "Find zone for suburb" (Location Lookup)
```sql
SELECT zone FROM suburb_zones WHERE suburb = 'Carlton';
-- Index: suburb_zones_suburb_key (unique)
```

### "Email delivery status" (Report Tracking)
```sql
SELECT * FROM email_logs 
WHERE inspection_id = ? 
AND template_name = 'inspection_report_ready'
ORDER BY sent_at DESC;
-- Indexes: idx_email_logs_inspection_id, idx_email_logs_template_name
-- Better: Composite index needed
```

---

## Common Operations

### Creating a New Lead
```sql
INSERT INTO leads (
  lead_number,      -- AUTO from generate_lead_number()
  full_name,
  email,
  phone,
  property_address_street,
  property_address_suburb,
  property_address_postcode,
  property_zone,    -- AUTO from get_zone_by_suburb(suburb)
  status,           -- DEFAULT 'new_lead'
  assigned_to       -- FK to auth.users.id
) VALUES (...)
RETURNING *;
```

### Scheduling an Inspection
```sql
-- 1. Check conflict
SELECT has_travel_time_conflict(
  technician_id, 
  start_time, 
  end_time
) AS has_conflict;

-- 2. If no conflict, create event
INSERT INTO calendar_events (
  lead_id,
  event_type,       -- 'inspection'
  title,
  start_datetime,
  end_datetime,
  assigned_to,      -- technician_id
  location_address,
  status            -- DEFAULT 'scheduled'
) VALUES (...)
RETURNING *;

-- 3. Update lead status
UPDATE leads SET status = 'inspection_waiting' WHERE id = ?;
```

### Recording an Inspection
```sql
-- 1. Create inspection record
INSERT INTO inspections (
  lead_id,
  inspector_id,
  inspection_date,
  job_number,       -- AUTO from generate_inspection_number()
  selected_job_type,
  estimated_cost_ex_gst
) VALUES (...) RETURNING *;

-- 2. Add inspection areas (rooms)
INSERT INTO inspection_areas (
  inspection_id,
  area_order,
  area_name,
  mould_ceiling,    -- ... other checkboxes
  job_time_minutes
) VALUES (...);

-- 3. Add moisture readings
INSERT INTO moisture_readings (
  area_id,
  moisture_percentage,
  moisture_status   -- AUTO from calculate_moisture_status(percentage)
) VALUES (...);

-- 4. Upload photos
INSERT INTO photos (
  inspection_id,
  area_id,
  photo_type,
  storage_path,     -- 'mrc-photos/{inspection_id}/{area_id}/...'
  file_name,
  file_size,
  mime_type
) VALUES (...);

-- 5. Update lead status
UPDATE leads SET status = 'inspection_completed' WHERE id = ?;
```

### Sending Inspection Report
```sql
-- 1. Check if PDF generated
SELECT report_pdf_url FROM inspections WHERE id = ?;

-- 2. Send email (via Edge Function)
INSERT INTO email_logs (
  inspection_id,
  lead_id,
  sent_by,          -- admin user_id
  recipient_email,
  recipient_name,
  subject,
  template_name,    -- 'inspection_report_ready'
  status,           -- 'pending' initially
  provider,         -- 'resend'
  metadata          -- JSON: {inspection_id, report_url, ...}
) VALUES (...)
RETURNING *;

-- 3. Update lead status
UPDATE leads SET status = 'inspection_report_pdf_completed' WHERE id = ?;
```

### Offline Sync (Mobile App)
```sql
-- On mobile, user edits lead while offline
-- App creates offline_queue entry
INSERT INTO offline_queue (
  user_id,
  action_type,      -- 'update'
  table_name,       -- 'leads'
  record_id,        -- lead uuid
  payload,          -- {full_name, phone, ...}
  status,           -- 'pending'
  device_info,      -- {model, os, browser}
  network_info,     -- {type, signal_strength}
  priority          -- 5 (normal)
) VALUES (...)
RETURNING *;

-- Later, when connection restored, sync engine:
-- 1. Gets pending items
SELECT * FROM offline_queue 
WHERE user_id = auth.uid() 
AND status = 'pending'
ORDER BY priority DESC, created_at ASC;

-- 2. For each item, apply to database
UPDATE leads SET {payload} WHERE id = record_id;

-- 3. Mark as synced
UPDATE offline_queue SET status = 'synced', synced_at = NOW() 
WHERE id = queue_item_id;
```

---

## Function Reference

### Numbering
```sql
generate_lead_number()        → VARCHAR (L-2025-001)
generate_inspection_number()  → TEXT (INS-2025-001)
generate_invoice_number()     → VARCHAR (INV-2025-001)
```

### Pricing
```sql
calculate_gst(amount_ex_gst)           → NUMERIC
calculate_total_inc_gst(amount_ex_gst) → NUMERIC
```

### Location
```sql
get_zone_by_suburb(suburb_name)        → INTEGER (1-4)
get_suburb_details(suburb_name)        → RECORD {suburb, postcode, zone, region}
calculate_travel_time(from, to)        → INTEGER (minutes)
```

### Booking
```sql
has_travel_time_conflict(user_id, start, end)  → BOOLEAN
check_booking_conflicts(user_id, start, end)   → RECORD {conflict_exists, event_id, reason}
```

### Environmental
```sql
calculate_dew_point(temp, humidity)     → NUMERIC
calculate_moisture_status(percentage)   → moisture_status ENUM
```

### Security
```sql
is_admin()                   → BOOLEAN
has_role(role_name)         → BOOLEAN
```

---

## Enum Reference

### lead_status (12 values)
```
new_lead → contacted → inspection_waiting → inspection_completed 
→ inspection_report_pdf_completed → job_waiting → job_completed 
→ job_report_pdf_sent → invoicing_sent → paid → google_review → finished
```

### job_type (4 values)
```
no_demolition_surface | demo | construction | subfloor
```

### booking_status (5 values)
```
scheduled | in_progress | completed | cancelled | rescheduled
```

### moisture_status (4 values)
```
dry (<12%) | elevated (12-18%) | wet (18-25%) | very_wet (>25%)
```

### property_occupation (4 values)
```
tenanted | vacant | owner_occupied | tenants_vacating
```

### dwelling_type (8 values)
```
house | units | apartment | duplex | townhouse | commercial | construction | industrial
```

### user_role / app_role (3 values)
```
admin | technician | manager
```

---

## RLS Policies Quick Guide

### Who can see what?

| Table | Admins | Technicians | Customers |
|-------|--------|-------------|-----------|
| leads | All | Own assigned | Own booking |
| inspections | All | Own | Own lead |
| calendar_events | All | Own | Read own |
| email_logs | All | Sent by them | Own lead |
| offline_queue | All | Own queue | N/A |
| suburb_zones | All | All (read) | All (read) |
| pricing_settings | All | All (read) | None |
| profiles | All | Own | Own |
| users | All | Own | None |

### Adding a Policy
```sql
-- Example: User can only see own offline queue
CREATE POLICY "Users can access own offline queue"
  ON offline_queue
  FOR ALL
  USING (auth.uid() = user_id);

-- Example: Admins can see all leads
CREATE POLICY "Admins can see all leads"
  ON leads
  FOR SELECT
  USING (is_admin());

-- Example: Technicians see assigned leads
CREATE POLICY "Technicians see assigned leads"
  ON leads
  FOR SELECT
  USING (
    auth.uid() = assigned_to 
    OR is_admin()
  );
```

---

## Index Reference (Quick Lookup)

### Search by Table

**leads (7 indexes)**
- idx_leads_assigned_to (assigned_to)
- idx_leads_status (status)
- idx_leads_created_at (created_at DESC)
- idx_leads_lead_number (lead_number)
- idx_leads_suburb (property_address_suburb)
- leads_lead_number_key (unique)
- leads_pkey (PK)

**inspections (5 indexes)**
- idx_inspections_lead_id (lead_id)
- idx_inspections_inspector_id (inspector_id)
- idx_inspections_date (inspection_date)
- idx_inspections_job_number (job_number)
- inspections_job_number_key (unique)

**calendar_events (7 indexes)**
- idx_calendar_events_assigned_to (assigned_to)
- idx_calendar_events_start (start_datetime)
- idx_calendar_events_status (status)
- idx_calendar_events_type (event_type)
- idx_calendar_events_technician_time (composite: assigned_to, start_datetime, end_datetime)
- idx_calendar_events_tech_end_time (composite: assigned_to, end_datetime DESC)
- calendar_events_pkey (PK)

**email_logs (7 indexes)**
- idx_email_logs_lead_id (lead_id)
- idx_email_logs_inspection_id (inspection_id)
- idx_email_logs_status (status)
- idx_email_logs_template_name (template_name)
- idx_email_logs_recipient_email (recipient_email)
- idx_email_logs_sent_at (sent_at DESC)
- email_logs_pkey (PK)

**offline_queue (6 indexes)**
- idx_offline_queue_user_id (user_id)
- idx_offline_queue_status (status)
- idx_offline_queue_table_name (table_name)
- idx_offline_queue_priority (priority DESC)
- idx_offline_queue_sync_processing (composite: user_id, status, priority DESC, created_at)
- idx_offline_queue_created_at (created_at)

---

## Data Types & Validation

### Phone Numbers (VIC Australia)
```
Format: 04XX XXX XXX or (0X) XXXX XXXX
Regex in sms_logs: '^(04[0-9]{8}|\\(0[2-9]\\) [0-9]{4} [0-9]{4})$'
Examples: 0412 345 678, (03) 9876 5432
```

### Email
```
Regex: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$'
```

### Postcodes (VIC only)
```
Format: 3XXX (3000-3999)
Regex: '^3[0-9]{3}$'
Examples: 3000 (CBD), 3181 (St Kilda), 3977 (Frankston)
```

### ABN (Australian Business Number)
```
Format: XX XXX XXX XXX (11 digits)
Stored as: '12 345 678 901'
Validation: Must pass ABN checksum algorithm (not stored)
```

### Currency
```
Type: NUMERIC with 2 decimals
Format: XXXX.XX (AUD)
Examples: 1234.56 (ex GST), 1357.02 (inc GST)
GST: 10% of ex-GST amount
```

---

## Common Mistakes to Avoid

### ❌ Don't:
1. Query auth.users directly - use profiles/public.users
2. Assume assigned_to exists without checking auth.users
3. Skip RLS checks - test every query with different roles
4. Hardcode zone numbers - always use get_zone_by_suburb()
5. Forget to handle timestamps with timezone
6. Insert leads without assigned_to - RLS requires it
7. Create calendar_events overlapping without conflict check
8. Delete records - use soft-delete (coming Phase 2F)

### ✅ Do:
1. Use RLS-aware queries (auth.uid() in WHERE)
2. Use generated numbers (lead_number, job_number)
3. Include timezone in all datetime queries
4. Use functions for calculations (calculate_total_inc_gst)
5. Test multi-role access (admin, tech, customer)
6. Log activities for audit trail (activities table)
7. Check conflicts before calendar_events INSERT
8. Use offline_queue for mobile changes

---

## Performance Tips

### For Faster Queries:
1. Use primary keys for exact matches
2. Use indexed columns in WHERE clause
3. Avoid SELECT * (specify columns)
4. Use composite indexes for multi-column searches
5. Add LIMIT to result sets
6. Use date range filters (not open-ended)

### Query Planning:
```sql
-- BAD: Full table scan
SELECT * FROM leads WHERE full_name LIKE 'John%';

-- GOOD: Use indexed status, then filter
SELECT * FROM leads 
WHERE status = 'inspection_waiting' 
AND created_at > NOW() - INTERVAL '30 days';

-- BEST: Specific fields, use indices
SELECT id, lead_number, full_name, status 
FROM leads 
WHERE assigned_to = ? 
AND status = 'inspection_waiting'
ORDER BY created_at DESC
LIMIT 50;
```

---

## Testing Checklist

- [ ] Create lead (check auto-generated lead_number)
- [ ] Assign technician (check RLS - only assigned tech sees it)
- [ ] Schedule inspection (check conflict detection)
- [ ] Create inspection form (add areas, photos, readings)
- [ ] Check email_logs (inspection report sent)
- [ ] Test offline: Create offline_queue entry, verify sync
- [ ] Check audit trail (activities table updated)
- [ ] Test role access (admin vs tech vs customer)
- [ ] Verify calculations (pricing, GST, travel time)

---

## Troubleshooting

### "Permission Denied" on Query
**Cause:** RLS policy denying access
**Check:** 
1. Is user authenticated? (auth.uid())
2. Do they have right role?
3. Is the record assigned to them?
4. Try as different role to debug

### "No Conflict" But Schedule Overlaps
**Cause:** has_travel_time_conflict function not working
**Check:**
1. Is suburb_zones lookup working?
2. Are travel times set correctly?
3. Check timezone handling (TIMESTAMPTZ)

### "Offline Queue Not Syncing"
**Cause:** Status not 'pending'
**Check:**
1. Is status 'pending'?
2. Is user_id correct?
3. Check device_info/network_info (logging)
4. Look for error_message field

### Photos Not Appearing in Report
**Cause:** Photos not linked to inspection_id
**Check:**
1. Is photo.inspection_id set?
2. Is photo_type correct?
3. Is storage_path valid?
4. Check file exists in Supabase Storage

---

## Useful SQL Snippets

### Find all pending emails for a lead
```sql
SELECT * FROM email_logs 
WHERE lead_id = '?' 
AND status IN ('pending', 'sent')
ORDER BY sent_at DESC;
```

### Find technician's next event
```sql
SELECT * FROM calendar_events 
WHERE assigned_to = ? 
AND start_datetime > NOW()
AND status != 'cancelled'
ORDER BY start_datetime ASC 
LIMIT 1;
```

### Calculate time since inspection
```sql
SELECT 
  lead_number,
  DATE_PART('day', NOW() - inspection_completed_date) AS days_since
FROM leads 
WHERE inspection_completed_date IS NOT NULL
ORDER BY days_since DESC;
```

### Find high-value jobs (over $5000)
```sql
SELECT 
  lead_number, 
  full_name, 
  quoted_amount,
  status
FROM leads 
WHERE quoted_amount > 5000
ORDER BY quoted_amount DESC;
```

### Pending offline syncs by user
```sql
SELECT 
  user_id,
  COUNT(*) as pending_count,
  STRING_AGG(table_name, ', ') as tables
FROM offline_queue 
WHERE status = 'pending'
GROUP BY user_id
ORDER BY pending_count DESC;
```

---

## Key Metrics

**Database Size:** ~5MB
**Largest Table:** suburb_zones (126 rows)
**Most Indexed Table:** calendar_events, email_logs (7 indexes each)
**Most Complex Table:** inspections (35+ columns)
**Fastest Query:** Zone lookup (unique index) <10ms
**Slowest Query:** Inspection form load <200ms with all data

---

## Contact Points

**For Schema Changes:** Review CURRENT-SCHEMA-STATE.md
**For Relationships:** See SCHEMA-RELATIONSHIPS-MAP.md
**For Deep Dive:** Read SCHEMA-ANALYSIS-SUMMARY.md
**For Questions:** Refer to this quick reference first

---

**Updated:** 2025-11-11
**Schema Version:** Latest (20251104233314)
**Status:** Production-ready with minor Phase 2F improvements needed


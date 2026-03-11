# MRC App - Notifications, Triggers & Lead Lifecycle

**Complete reference for all notification features, email triggers, automated actions, database triggers, and lead pipeline movements.**

*Last Updated: 2026-02-19*

---

## Table of Contents

1. [Lead Pipeline Flow](#1-lead-pipeline-flow)
2. [Email System](#2-email-system)
3. [Slack Notifications](#3-slack-notifications)
4. [In-App Notifications](#4-in-app-notifications)
5. [Toast Notifications](#5-toast-notifications)
6. [Database Triggers](#6-database-triggers)
7. [Cron Jobs](#7-cron-jobs)
8. [Realtime Subscriptions](#8-realtime-subscriptions)
9. [Offline Sync](#9-offline-sync)
10. [PWA Caching](#10-pwa-caching)
11. [Planned / Incomplete Features](#11-planned--incomplete-features)

---

## 1. Lead Pipeline Flow

### 1.1 Active Statuses (Stage 1 - Inspection Phase)

The app currently implements 7 statuses for the inspection-only pipeline. The full 18-status enum exists in the database but only these are active.

**Source:** `src/lib/statusFlow.ts`

```
new_lead -> inspection_waiting -> inspection_ai_summary -> approve_inspection_report -> inspection_email_approval -> closed
                                                                                                                   \-> not_landed (from any status)
```

| # | Status | Title | Short | Next Action | Color |
|---|--------|-------|-------|-------------|-------|
| 1 | `new_lead` | New Lead | NEW | Book inspection with customer | Blue |
| 2 | `inspection_waiting` | Awaiting Inspection | AWAITING | Complete inspection and submit form | Orange |
| 3 | `inspection_ai_summary` | AI Summary Review | AI REVIEW | Review and approve AI-generated content | Purple |
| 4 | `approve_inspection_report` | Approve Inspection Report | APPROVE | Review and approve PDF report | Magenta |
| 5 | `inspection_email_approval` | Email Approval | EMAIL | Send inspection report via email | Cyan |
| 6 | `closed` | Closed | CLOSED | Lead completed successfully | Green |
| 7 | `not_landed` | Not Landed | NOT LANDED | Lead lost or rejected | Red |

Terminal states: `closed` and `not_landed` (no further transitions).

### 1.2 Full Database Enum (Future Stages)

The `lead_status` enum in PostgreSQL includes these additional statuses for future phases:

```sql
'hipages_lead', 'new_lead', 'contacted', 'inspection_waiting',
'inspection_ai_summary', 'approve_inspection_report', 'inspection_email_approval',
'inspection_completed', 'inspection_report_pdf_completed',
'job_waiting', 'job_completed', 'job_report_pdf_sent',
'invoicing_sent', 'paid', 'google_review', 'finished', 'closed', 'not_landed'
```

### 1.3 Status Transitions & Side Effects

#### `new_lead` (Entry Point)

| Aspect | Detail |
|--------|--------|
| **Created when** | Lead submitted via website form or admin manual entry |
| **Auto-generated** | `lead_number` (format: `MRC-YYYY-XXXX`) via database trigger |
| **Activity logged** | `lead_created` - "New lead from [name] in [suburb]" (trigger) |
| **Slack** | `new_lead` event sent via `send-slack-notification` edge function |
| **Transitions to** | `inspection_waiting` (when booking is scheduled) |
| **Key files** | `src/pages/NewLeadView.tsx`, `src/components/leads/AddLeadDialog.tsx` |

#### `inspection_waiting` (Inspection Booked)

| Aspect | Detail |
|--------|--------|
| **Created when** | Admin books inspection via `BookInspectionModal` |
| **DB changes** | Creates `calendar_bookings` record (status: `scheduled`), updates `leads.assigned_to`, `inspection_scheduled_date`, `scheduled_time` |
| **Reminder set** | `reminder_scheduled_for = start_datetime - 48 hours` (trigger) |
| **Activity logged** | `status_changed` (trigger) + `inspection_booked` (app code) |
| **Email** | Booking confirmation sent to customer (`booking-confirmation` template) |
| **Slack** | `inspection_booked` event |
| **Transitions to** | `inspection_ai_summary` (when technician submits inspection form) |
| **Key files** | `src/components/leads/BookInspectionModal.tsx`, `src/lib/bookingService.ts` |

#### `inspection_ai_summary` (AI Summary Generated)

| Aspect | Detail |
|--------|--------|
| **Created when** | Technician submits completed inspection form |
| **DB changes** | Creates/updates `inspections` record, uploads photos to storage |
| **Activity logged** | `status_changed` (trigger) |
| **Edge function** | `generate-inspection-summary` invoked to produce AI summary |
| **Sets** | `inspections.ai_summary_text`, `ai_summary_generated_at` |
| **Transitions to** | `approve_inspection_report` (admin approves AI summary) |
| **Key files** | `src/pages/TechnicianInspectionForm.tsx` |

#### `approve_inspection_report` (PDF Review)

| Aspect | Detail |
|--------|--------|
| **Created when** | Admin approves AI summary |
| **DB changes** | Sets `inspections.pdf_approved`, `pdf_approved_at`, `pdf_approved_by`, creates `pdf_versions` record |
| **Activity logged** | `status_changed` (trigger) |
| **PDF** | Generated and stored; version tracked in `pdf_versions` table |
| **Transitions to** | `inspection_email_approval` (admin approves PDF) |
| **Key files** | `src/pages/InspectionAIReview.tsx`, `src/lib/api/pdfGeneration.ts` |

#### `inspection_email_approval` (Ready to Send)

| Aspect | Detail |
|--------|--------|
| **Created when** | Admin approves PDF report |
| **Activity logged** | `status_changed` (trigger) |
| **Transitions to** | `closed` (email sent successfully) |
| **Key files** | `src/pages/ViewReportPDF.tsx` |

#### `closed` (Completed)

| Aspect | Detail |
|--------|--------|
| **Created when** | Report email sent to customer |
| **Email** | PDF report sent as attachment (`report-approved` template) |
| **Slack** | `report_approved` event |
| **Email log** | Created in `email_logs` with `status: 'sent'` |
| **Activity logged** | `status_changed` (trigger) |
| **Terminal** | No further transitions |
| **Key files** | `src/pages/ViewReportPDF.tsx`, `src/pages/LeadsManagement.tsx` |

#### `not_landed` (Lost/Rejected)

| Aspect | Detail |
|--------|--------|
| **Created when** | Admin manually moves lead here from any status |
| **Activity logged** | `status_changed` (trigger) |
| **Terminal** | No further transitions |
| **Key files** | `src/pages/LeadsManagement.tsx`, `src/pages/LeadDetail.tsx` |

### 1.4 Activity Logging

**Table:** `activities`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `lead_id` | UUID | FK to `leads` |
| `activity_type` | string | e.g. `lead_created`, `status_changed`, `inspection_booked` |
| `title` | string | Human-readable title |
| `description` | string | Detailed description |
| `user_id` | UUID | Who performed the action |
| `metadata` | JSONB | Additional context (e.g. `{ old_status, new_status }`) |
| `created_at` | TIMESTAMPTZ | When activity occurred |

**Automatic activities** (via database triggers):
- `lead_created` - on INSERT to `leads`
- `status_changed` - on UPDATE of `leads.status`

**Manual activities** (via application code):
- `inspection_booked` - when booking is created

---

## 2. Email System

### 2.1 Architecture

```
Frontend (notifications.ts)
  -> supabase.functions.invoke('send-email')
    -> Edge Function (send-email/index.ts)
      -> Resend API (https://api.resend.com/emails)
        -> email_logs table (logged on send)
```

**Pattern:** Fire-and-forget (errors logged to console, never thrown to UI).

### 2.2 Resend Configuration

| Setting | Value |
|---------|-------|
| **API Endpoint** | `https://api.resend.com/emails` |
| **From Address** | `Mould & Restoration Co <noreply@mrcsystem.com>` |
| **Reply-To** | `admin@mouldandrestoration.com.au` |
| **Domain** | `mrcsystem.com` |
| **Env Variable** | `RESEND_API_KEY` |

### 2.3 Retry Logic

**Edge Function:** `supabase/functions/send-email/index.ts`

- **Max retries:** 3 attempts
- **Backoff:** Exponential (1s, 2s, 3s between attempts)
- **Retryable:** 5xx server errors, 429 rate limit
- **Non-retryable:** 4xx client errors (except 429)
- **All attempts logged** to `email_logs` table

### 2.4 Email Templates

All templates defined in `src/lib/api/notifications.ts` and wrapped in `wrapInBrandedTemplate()`.

**Branded template styling:**
- Header: Navy (#121D73) background, white text
- Body: White background, dark gray text
- Footer: Light gray with company info + phone link (`0433 880 403`)
- Max-width: 620px, Arial/Helvetica font

| # | Template Name | Recipient | Trigger | Attachment | Key Data |
|---|--------------|-----------|---------|------------|----------|
| 1 | `booking-confirmation` | Customer | Inspection booked | None | Date, time, address, technician |
| 2 | `inspection-reminder` | Customer | Cron job (48h before) | None | Date, time, address, checklist |
| 3 | `report-approved` | Customer | Admin sends report | PDF | Address, job number |
| 4 | `job-started-client` | Customer | Service begins | None | Address |
| 5 | `job-completed-client` | Customer | Service finished | None | Address |
| 6 | `job-booked-technician` | Technician | New job assigned | None | Client, date, time, property, quote |
| 7 | `welcome` | New user | Admin creates user | None | First name, email, role |

### 2.5 Email Sending Locations

| Trigger | File | Template | Extra |
|---------|------|----------|-------|
| Book inspection | `src/lib/bookingService.ts` | `booking-confirmation` | Also sends Slack |
| Send report to customer | `src/pages/ViewReportPDF.tsx`, `LeadsManagement.tsx` | `report-approved` | PDF attachment (base64) |
| Create new user | `src/pages/ManageUsers.tsx` | `welcome` | Fire-and-forget |
| Job booked for technician | `src/lib/notifications.ts` | `job-booked-technician` | Bulk to all active techs |
| Service started | `src/lib/notifications.ts` | `job-started-client` | Via `sendClientNotification()` |
| Service completed | `src/lib/notifications.ts` | `job-completed-client` | Via `sendClientNotification()` |
| 48h reminder | `supabase/functions/send-inspection-reminder/` | Built inline | Automated via cron |

### 2.6 Email Logs Table

**Table:** `email_logs` (Migration: `20251111000008`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `lead_id` | UUID | FK to `leads` (nullable) |
| `inspection_id` | UUID | FK to `inspections` (nullable) |
| `sent_by` | UUID | FK to `auth.users` |
| `recipient_email` | TEXT | Validated email address |
| `recipient_name` | TEXT | Optional |
| `subject` | TEXT | Email subject line |
| `template_name` | TEXT | e.g. `booking-confirmation` |
| `status` | TEXT | `pending`, `sent`, `delivered`, `bounced`, `soft_bounce`, `failed`, `spam`, `unsubscribed` |
| `provider` | TEXT | Default: `resend` |
| `provider_message_id` | TEXT | Resend email ID |
| `error_message` | TEXT | Error details on failure |
| `metadata` | JSONB | Additional context |
| `sent_at` | TIMESTAMPTZ | When sent |
| `delivered_at` | TIMESTAMPTZ | When delivered |
| `opened_at` | TIMESTAMPTZ | When opened (tracked) |
| `clicked_at` | TIMESTAMPTZ | When link clicked (tracked) |

**RLS:** Admin-only read/manage access.

**Indexes:** `lead_id`, `inspection_id`, `recipient_email`, `status`, `sent_at DESC`, `template_name`

---

## 3. Slack Notifications

### 3.1 Architecture

```
Frontend (notifications.ts)
  -> supabase.functions.invoke('send-slack-notification')
    -> Edge Function (send-slack-notification/index.ts)
      -> Slack Incoming Webhook (SLACK_WEBHOOK_URL env var)
```

**Pattern:** Fire-and-forget, same as email.

### 3.2 Event Types

| Event | Color | Trigger | Message Format |
|-------|-------|---------|----------------|
| `new_lead` | Green | New lead created | Name, phone, email, source, address, issue, timestamp (Melbourne TZ) |
| `inspection_booked` | Orange (#f39c12) | Inspection scheduled | Lead name, address, technician, date |
| `report_ready` | Red (#e74c3c) | Report needs review | Lead name, address, "action required" |
| `report_approved` | Green (#2ecc71) | Report sent to customer | Lead name, address, status |

### 3.3 Message Formats

**New Lead (Block Kit):**
- Header: "New Lead Received"
- Fields: Name, Phone, Email, Source
- Sections: Property Address, Issue Description
- Context: Timestamp (Australia/Melbourne)

**Other Events (Attachment):**
- Single attachment with color bar
- Formatted text with lead/property details

### 3.4 Where Slack Is Called

| Location | Event |
|----------|-------|
| `src/components/admin/CreateLeadModal.tsx` | `new_lead` |
| `src/lib/bookingService.ts` | `inspection_booked` |
| `src/pages/ViewReportPDF.tsx` | `report_approved` |
| `src/pages/LeadsManagement.tsx` | `report_approved` |

---

## 4. In-App Notifications

### 4.1 Notifications Table

**Table:** `notifications` (Migration: `20251029103512`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to auth user (notification recipient) |
| `type` | VARCHAR(50) | Notification type (see below) |
| `title` | VARCHAR(255) | Display title |
| `message` | TEXT | Notification body |
| `action_url` | TEXT | Navigate-to URL on click |
| `priority` | VARCHAR(20) | `normal` or `high` |
| `is_read` | BOOLEAN | Default: false |
| `read_at` | TIMESTAMPTZ | When marked read |
| `lead_id` | UUID | FK to `leads` (optional) |
| `related_entity_id` | UUID | Generic entity reference |
| `related_entity_type` | VARCHAR | Entity type (e.g. `inspection`) |
| `metadata` | JSONB | Additional context |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** Users can only see/update their own notifications.

### 4.2 Notification Types

| Type | Icon | Trigger | Priority |
|------|------|---------|----------|
| `job-booked` | - | Inspection booked for technician | `high` |
| `lead_created` | Person | New lead in system | `normal` |
| `status_changed` | Refresh | Lead status update | `normal` |
| `job_completed` | Check | Inspection finished | `normal` |
| `payment_received` | Dollar | Payment processed | `normal` |
| `inspection_scheduled` | Calendar | Inspection booked | `normal` |

### 4.3 Creating Notifications

**Bulk creation** (`src/lib/notifications.ts` - `sendTechnicianNotifications()`):
1. Query all active technicians from `profiles` + `user_roles`
2. Build notification per technician with `action_url: /leads/{leadId}`
3. Bulk INSERT into `notifications` table
4. Send email to each technician in parallel (fire-and-forget)

**Direct creation** (`createNotification()`) - single user notification.

### 4.4 Notification Bell UI

**Components:**
- `src/components/notifications/NotificationBell.tsx` - Bell icon with unread badge
- `src/components/notifications/Notifications.tsx` - Dropdown/panel with notification list

**Hook:** `src/hooks/useNotifications.ts`

| Hook | Purpose |
|------|---------|
| `useNotifications()` | Fetch all notifications for current user (ordered by `created_at DESC`) |
| `useUnreadCount()` | Count unread notifications (`is_read = false`) |
| `useMarkAsRead(id)` | Set `is_read = true`, `read_at = now()` |
| `useMarkAsUnread(id)` | Set `is_read = false`, `read_at = null` |
| `useMarkAllAsRead()` | Bulk update all unread for current user |
| `useDeleteNotification(id)` | Hard delete from database |

**Realtime:** Subscribed to `notifications` table changes, auto-invalidates React Query cache.

---

## 5. Toast Notifications

### 5.1 Two Toast Systems

The app uses **two** toast systems side-by-side:

| System | Import | API | Used For |
|--------|--------|-----|----------|
| **Sonner** | `import { toast } from 'sonner'` | `toast.success()`, `toast.error()`, `toast.info()` | Realtime events, modern UI feedback |
| **shadcn/ui** | `import { useToast } from '@/hooks/use-toast'` | `toast({ title, description, variant })` | Page-level forms, legacy dialogs |

Both toasters are mounted in `src/App.tsx`.

### 5.2 Sonner Toast Usage

| File | Message | Type |
|------|---------|------|
| `src/hooks/useTechnicianJobs.ts` | "New job assigned" (5s) | `success` |
| `src/hooks/useTechnicianJobs.ts` | "Job updated" (4s) | `info` |
| `src/hooks/useTechnicianJobs.ts` | "Job removed" (4s) | `info` |
| `src/components/schedule/LeadBookingCard.tsx` | "Inspection booked successfully!" | `success` |
| `src/components/schedule/LeadBookingCard.tsx` | "Failed to book inspection" | `error` |
| `src/components/schedule/EventDetailsPanel.tsx` | Event operation results | mixed |
| `src/components/leads/BookInspectionModal.tsx` | Booking validation/errors | mixed |
| `src/components/pdf/ImageUploadModal.tsx` | Upload status | mixed |
| `src/components/pdf/EditFieldModal.tsx` | Edit confirmation | `success` |
| `src/pages/LeadDetail.tsx` | Status updates, PDF regeneration | mixed |
| `src/pages/ViewReportPDF.tsx` | PDF generation status | mixed |

### 5.3 shadcn/ui Toast Usage

| File | Title | Variant |
|------|-------|---------|
| `src/pages/Settings.tsx` | "Settings saved" | `default` |
| `src/pages/InspectionForm.tsx` | Form submission feedback | mixed |
| `src/pages/TechnicianInspectionForm.tsx` | Form submission feedback | mixed |
| `src/pages/ManageUsers.tsx` | User operation results | mixed |
| `src/pages/CheckEmail.tsx` | Email verification | `default` |
| `src/pages/Profile.tsx` | Profile update results | mixed |
| `src/pages/Leads.tsx` | Lead operations | mixed |
| `src/pages/InspectionAIReview.tsx` | AI review status | mixed |
| `src/pages/TechnicianJobDetail.tsx` | Job detail operations | mixed |
| `src/components/leads/NormalLeadForm.tsx` | Form save errors | `destructive` |

---

## 6. Database Triggers

### 6.1 Timestamp Triggers (updated_at)

All tables with `updated_at` columns use the shared `update_updated_at_column()` function.

| Trigger | Table | When |
|---------|-------|------|
| `update_leads_updated_at` | `leads` | BEFORE UPDATE |
| `update_inspections_updated_at` | `inspections` | BEFORE UPDATE |
| `update_inspection_areas_updated_at` | `inspection_areas` | BEFORE UPDATE |
| `update_subfloor_data_updated_at` | `subfloor_data` | BEFORE UPDATE |
| `update_calendar_bookings_updated_at` | `calendar_bookings` | BEFORE UPDATE |
| `update_notifications_updated_at` | `notifications` | BEFORE UPDATE |
| `update_email_logs_updated_at` | `email_logs` | BEFORE UPDATE |
| `update_profiles_updated_at` | `profiles` | BEFORE UPDATE |
| `update_suburb_zones_updated_at` | `suburb_zones` | BEFORE UPDATE |

**Function:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 6.2 Lead Number Auto-Generation

**Trigger:** `trigger_auto_generate_lead_number`
**Table:** `leads`
**When:** BEFORE INSERT
**Migration:** `20251112000003`

```sql
CREATE OR REPLACE FUNCTION auto_generate_lead_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_seq INT;
BEGIN
  IF NEW.lead_number IS NULL OR NEW.lead_number = '' THEN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    SELECT COALESCE(MAX(
      CAST(SPLIT_PART(lead_number, '-', 3) AS INTEGER)
    ), 0) + 1 INTO next_seq
    FROM leads
    WHERE lead_number LIKE 'MRC-' || current_year || '-%';

    NEW.lead_number := 'MRC-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Format:** `MRC-2026-0001`, `MRC-2026-0002`, etc.

### 6.3 Activity Logging Triggers

**Migration:** `20251112000020`

#### Lead Creation Activity

**Trigger:** `trigger_log_lead_creation`
**Table:** `leads`
**When:** AFTER INSERT

```sql
CREATE OR REPLACE FUNCTION log_lead_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activities (lead_id, activity_type, title, description, user_id, created_at)
  VALUES (
    NEW.id,
    'lead_created',
    CASE
      WHEN NEW.status = 'hipages_lead' THEN 'HiPages Lead Created'
      ELSE 'Lead Created'
    END,
    CASE
      WHEN NEW.status = 'hipages_lead'
        THEN 'New HiPages lead for ' || NEW.property_address_suburb || ' - requires initial contact'
      ELSE 'New lead from ' || COALESCE(NEW.full_name, 'customer') || ' in ' || NEW.property_address_suburb
    END,
    NEW.assigned_to,
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Status Change Activity

**Trigger:** `trigger_log_lead_status_change`
**Table:** `leads`
**When:** AFTER UPDATE

```sql
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activities (lead_id, activity_type, title, description, user_id, metadata)
    VALUES (
      NEW.id,
      'status_changed',
      'Status Changed',
      'Lead status updated from ' || OLD.status || ' to ' || NEW.status,
      NEW.assigned_to,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.4 Reminder Scheduling Trigger

**Trigger:** `trigger_set_reminder_scheduled_for`
**Table:** `calendar_bookings`
**When:** BEFORE INSERT OR UPDATE OF `start_datetime`, `status`
**Migration:** `20260218000001`

```sql
CREATE OR REPLACE FUNCTION set_reminder_scheduled_for()
RETURNS TRIGGER AS $$
BEGIN
  -- Set reminder 48 hours before for scheduled inspections
  IF NEW.event_type = 'inspection' AND NEW.status = 'scheduled' THEN
    NEW.reminder_scheduled_for := NEW.start_datetime - INTERVAL '48 hours';
  END IF;

  -- Clear reminder for cancelled/completed
  IF NEW.status IN ('cancelled', 'completed') THEN
    NEW.reminder_scheduled_for := NULL;
  END IF;

  -- Reset reminder on reschedule
  IF TG_OP = 'UPDATE'
     AND OLD.start_datetime IS DISTINCT FROM NEW.start_datetime
     AND NEW.status = 'scheduled' THEN
    NEW.reminder_sent := false;
    NEW.reminder_sent_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 6.5 Auth User Profile Creation

**Trigger:** `on_auth_user_created`
**Table:** `auth.users`
**When:** AFTER INSERT
**Migration:** `20260209000000`

Automatically creates a `profiles` row when a new auth user is created, extracting `full_name` and `email` from auth metadata.

---

## 7. Cron Jobs

### 7.1 Inspection Reminder Cron

**Job Name:** `send-inspection-reminders`
**Schedule:** `0 * * * *` (every hour at :00)
**Migration:** `20260218000003`
**Extensions Required:** `pg_cron`, `pg_net` (enabled in migration `20260218000002`)

```sql
SELECT cron.schedule(
  'send-inspection-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### 7.2 Reminder Edge Function

**Location:** `supabase/functions/send-inspection-reminder/index.ts`

**Query Logic:**
```sql
SELECT id, start_datetime, location_address, lead_id,
       leads!calendar_bookings_lead_id_fkey(full_name, email, ...)
FROM calendar_bookings
WHERE reminder_sent = false
  AND status = 'scheduled'
  AND reminder_scheduled_for <= NOW()
  AND lead_id IS NOT NULL
```

**Process per booking:**
1. Format date/time in `Australia/Melbourne` timezone
2. Build branded HTML email with inspection details + checklist
3. Send via Resend API (with retry)
4. Update booking: `reminder_sent = true`, `reminder_sent_at = NOW()`
5. Log any failures

**Response:**
```json
{ "processed": 5, "sent": 4, "failed": 0, "skipped": 1 }
```

---

## 8. Realtime Subscriptions

### 8.1 Technician Jobs Channel

**Hook:** `src/hooks/useTechnicianJobs.ts`
**Channel:** `technician-jobs-{user.id}`
**Table:** `calendar_bookings`
**Filter:** `assigned_to=eq.{user.id}`

| Event | Action |
|-------|--------|
| INSERT | Toast: "New job assigned" (5s, success), refetch jobs |
| UPDATE | Toast: "Job updated" (4s, info), refetch jobs |
| DELETE | Toast: "Job removed" (4s, info), refetch jobs |

**Lifecycle:** Subscribes on mount, unsubscribes on unmount. Depends on `user.id`.

### 8.2 Notifications Channel

**Hook:** `src/hooks/useNotifications.ts`
**Channel:** `notifications-{user.id}`
**Table:** `notifications`
**Filter:** `user_id=eq.{user.id}`

| Event | Action |
|-------|--------|
| INSERT | Invalidate `notifications` + `unread-count` React Query cache |
| UPDATE | Invalidate `notifications` + `unread-count` cache |
| DELETE | Invalidate `notifications` + `unread-count` cache |

**Effect:** NotificationBell badge count updates in real time.

### 8.3 Leads Channel (Admin)

**Hook:** React Query with realtime invalidation
**Table:** `leads`
**Events:** INSERT, UPDATE

Used in admin pipeline view (`src/pages/Leads.tsx`) to keep lead cards updated across browser tabs.

### 8.4 Auth State Listener

**File:** `src/integrations/supabase/client.ts`
**Method:** `supabase.auth.onAuthStateChange()`

Listens for auth events (sign in, sign out, token refresh) and updates app-level auth state.

---

## 9. Offline Sync

### 9.1 Architecture

**Library:** Dexie v4 (IndexedDB wrapper)
**Database name:** `mrc-offline`

```
Technician fills form offline
  -> Data saved to IndexedDB (inspectionDrafts)
  -> Photos resized & queued (photoQueue)
  -> SyncIndicator shows "Pending"
  -> Network regained (window.online event)
  -> useOfflineSync triggers auto-sync
  -> SyncManager.syncAll()
    -> syncDraft() -> INSERT/UPDATE inspections table
    -> syncPhoto() -> Upload to Storage + INSERT photos table
  -> SyncIndicator shows "Synced"
```

### 9.2 IndexedDB Schema

**File:** `src/lib/offline/db.ts`

```typescript
class MrcOfflineDb extends Dexie {
  inspectionDrafts!: Table<InspectionDraft, string>;
  photoQueue!: Table<QueuedPhoto, string>;
  syncLog!: Table<SyncLogEntry, string>;

  constructor() {
    super('mrc-offline');
    this.version(1).stores({
      inspectionDrafts: 'id, leadId, status, updatedAt',
      photoQueue: 'id, inspectionDraftId, status, createdAt',
      syncLog: 'id, entityType, entityId, syncedAt',
    });
  }
}
```

### 9.3 Data Types

**InspectionDraft:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Client-generated UUID |
| `leadId` | string | Lead reference |
| `status` | SyncStatus | `pending`, `syncing`, `synced`, `error` |
| `formData` | Record | All inspection text/structured data (snake_case) |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |
| `remoteInspectionId` | string? | Supabase `inspections.id` after sync |
| `errorMessage` | string? | Last error |

**QueuedPhoto:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Client-generated UUID |
| `inspectionDraftId` | string | FK to InspectionDraft |
| `status` | SyncStatus | `pending`, `syncing`, `synced`, `error` |
| `blob` | Blob | Resized JPEG (1600px max, 85% quality) |
| `photoType` | string | `area`, `subfloor`, `general`, `outdoor` |
| `areaId` | string? | Area reference |
| `orderIndex` | number | Photo order |

### 9.4 SyncManager

**File:** `src/lib/offline/SyncManager.ts`

**Key methods:**
- `saveDraft(draft)` - Save/update inspection draft to IndexedDB
- `queuePhoto(photo)` - Add photo to upload queue
- `getPendingCounts()` - Returns `{ drafts, photos }` pending
- `syncAll()` - Main sync: text first, then photos per draft
- `syncDraft(draft)` - Upload text data to `inspections` table
- `syncPhoto(photo, draft)` - Upload photo to Storage + `photos` table

**Sync strategy:** Text-first (get remote inspection_id, then upload photos).

**Photo upload path:** `{inspectionId}/{areaId}/{filename}` in `inspection-photos` storage bucket.

### 9.5 Network Detection

**File:** `src/lib/offline/useNetworkStatus.ts`

Listens to `window.online` and `window.offline` events. Initial state from `navigator.onLine`.

### 9.6 Auto-Sync Hook

**File:** `src/lib/offline/useOfflineSync.ts`

| Config | Value |
|--------|-------|
| Polling interval | 30 seconds |
| Auto-sync | When online + pending items |
| Manual sync | Via `syncNow()` |

**States:** `synced` | `pending` | `offline` | `syncing` | `error`

### 9.7 Sync Indicator

**File:** `src/lib/offline/SyncIndicator.tsx`
**Used in:** `TechnicianBottomNav`

| State | Color | Dot | Clickable |
|-------|-------|-----|-----------|
| synced | Green (#34C759) | static | No |
| pending | Orange (#FF9500) | static | Yes (tap to sync) |
| syncing | Blue (#007AFF) | pulsing | No |
| offline | Red (#FF3B30) | static | No |
| error | Red (#FF3B30) | static | Yes (tap to retry) |

### 9.8 Photo Resizing

**File:** `src/lib/offline/photoResizer.ts`

- Max dimension: 1600px (maintains aspect ratio)
- JPEG quality: 85%
- Uses OffscreenCanvas (worker-friendly) with HTMLCanvas fallback
- Reduces blob size ~70-80%

---

## 10. PWA Caching

### 10.1 Configuration

**File:** `vite.config.ts`
**Plugin:** `vite-plugin-pwa` with Workbox
**Register type:** `autoUpdate` (seamless background updates)

### 10.2 Manifest

```json
{
  "name": "MRC Field",
  "short_name": "MRC",
  "start_url": "/technician",
  "display": "standalone",
  "background_color": "#f5f7f8",
  "theme_color": "#007AFF",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192" },
    { "src": "/icon-512.png", "sizes": "512x512", "purpose": "any maskable" }
  ]
}
```

Generated by VitePWA as `manifest.webmanifest` (old `/public/manifest.json` is unused).

### 10.3 Precaching

```typescript
globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]
cleanupOutdatedCaches: true
```

All JS bundles, CSS, HTML, images, and fonts are precached at install time. Old caches are automatically cleaned on new builds.

### 10.4 Runtime Caching Strategies

| URL Pattern | Strategy | Cache Name | Max Entries | Max Age | Timeout |
|-------------|----------|------------|-------------|---------|---------|
| `fonts.googleapis.com/*` | CacheFirst | `google-fonts-cache` | 10 | 365 days | - |
| `fonts.gstatic.com/*` | CacheFirst | `gstatic-fonts-cache` | 10 | 365 days | - |
| `fonts.googleapis.com/css2?family=Material+Symbols*` | CacheFirst | `material-symbols-cache` | 5 | 365 days | - |
| `*.supabase.co/rest/*` | NetworkFirst | `supabase-api-cache` | 50 | 1 hour | 10s |
| `*.supabase.co/auth/*` | **NetworkOnly** | - | - | - | - |
| `*.supabase.co/functions/*` | NetworkFirst | `edge-functions-cache` | 20 | 5 min | 15s |

**Key decisions:**
- **Fonts:** CacheFirst (never change, safe to cache 1 year)
- **API data:** NetworkFirst (prefer fresh, fallback to cache within 10s timeout)
- **Auth:** NetworkOnly (never cache - security requirement)
- **Edge functions:** NetworkFirst (short 5min TTL, longer 15s timeout for heavy functions)

---

## 11. Planned / Incomplete Features

### 11.1 Web Push Notifications

**Status:** Not implemented

No `web-push`, `firebase-messaging`, or `PushManager` usage found. Would require:
- VAPID key generation
- `Notification.requestPermission()` in frontend
- Push subscription storage in database
- Edge function for sending push notifications
- Service worker `push` event handler

### 11.2 Job Started / Completed Emails

**Status:** Templates exist, not yet wired to UI triggers

The `buildJobStartedHtml()` and `buildJobCompletedHtml()` templates are defined but currently only callable via `sendClientNotification()` in `src/lib/notifications.ts`. No UI button or automatic trigger exists in the current Phase 1 flow to invoke these.

### 11.3 HiPages Lead Auto-Import

**Status:** Enum value exists, not fully implemented

The `hipages_lead` status exists in the database enum and the activity trigger handles it, but there is no automated import pipeline from HiPages. Leads are manually entered.

### 11.4 Session Management / Timeout

**Status:** Basic auth state listener only

No session timeout, forced re-auth, or activity-based session extension. Uses Supabase's default token refresh.

### 11.5 Future Pipeline Stages

The following statuses exist in the enum but have no UI or business logic:
- `contacted` - Initial customer contact
- `inspection_completed` - Inspection done (redundant with AI summary?)
- `inspection_report_pdf_completed` - PDF done (redundant with approve?)
- `job_waiting` - Remediation job scheduled
- `job_completed` - Remediation finished
- `job_report_pdf_sent` - Job report sent
- `invoicing_sent` - Invoice sent
- `paid` - Payment received
- `google_review` - Review requested
- `finished` - Full lifecycle complete

### 11.6 Notification Sound / Vibration

**Status:** Not implemented

No audio cues or haptic feedback for notifications. Could be added via Web Audio API or `navigator.vibrate()`.

### 11.7 Notification Preferences

**Status:** Not implemented

No per-user notification settings (email opt-out, push preferences, quiet hours).

---

## Quick Reference: What Happens When...

| Event | Email | Slack | In-App | Toast | Activity | DB Trigger |
|-------|-------|-------|--------|-------|----------|------------|
| New lead created | - | new_lead | - | - | lead_created | lead_number, activity |
| Inspection booked | booking-confirmation | inspection_booked | job-booked (techs) | success | inspection_booked + status_changed | reminder_scheduled_for |
| 48h before inspection | inspection-reminder | - | - | - | - | (via cron) |
| Inspection submitted | - | - | - | success | status_changed | updated_at |
| AI summary ready | - | - | - | - | status_changed | updated_at |
| PDF approved | - | - | - | success | status_changed | updated_at |
| Report emailed | report-approved (+ PDF) | report_approved | - | success | status_changed | updated_at |
| Lead closed | - | - | - | - | status_changed | updated_at |
| Lead not landed | - | - | - | - | status_changed | updated_at |
| New user created | welcome | - | - | success | - | profile created |
| Booking rescheduled | - | - | - | success | - | reminder reset |
| Booking cancelled | - | - | - | - | - | reminder cleared |
| Job assigned (realtime) | - | - | - | "New job assigned" | - | - |
| Job updated (realtime) | - | - | - | "Job updated" | - | - |

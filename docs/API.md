# MRC Lead Management System - API Documentation

**Version:** 1.0 (MVP)
**Base URL:** `https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1`
**Authentication:** Supabase JWT via `Authorization: Bearer <token>`

---

## Table of Contents

1. [Edge Functions](#edge-functions)
2. [Database Schema](#database-schema)
3. [Authentication Flow](#authentication-flow)
4. [Enums & Constants](#enums--constants)

---

## Edge Functions

All edge functions accept `POST` requests with `Content-Type: application/json`.

CORS headers are included on all responses. Preflight `OPTIONS` requests return `204`.

---

### 1. send-email

Sends a single email via Resend with optional file attachments.

**Endpoint:** `POST /send-email`

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `to` | string | Yes | - | Recipient email |
| `subject` | string | Yes | - | Email subject line |
| `html` | string | Yes | - | HTML email body |
| `from` | string | No | `Mould & Restoration Co <noreply@mrcsystem.com>` | Sender address |
| `replyTo` | string | No | `admin@mouldandrestoration.com.au` | Reply-to address |
| `leadId` | string | No | - | Associated lead ID (for logging) |
| `inspectionId` | string | No | - | Associated inspection ID (for logging) |
| `templateName` | string | No | - | Template name (for logging) |
| `attachments` | array | No | - | File attachments |
| `attachments[].filename` | string | Yes | - | Attachment filename |
| `attachments[].content` | string | Yes | - | Base64-encoded file content |
| `attachments[].content_type` | string | Yes | - | MIME type (e.g. `application/pdf`) |

**Success Response (200):**
```json
{
  "success": true,
  "emailId": "re_abc123..."
}
```

**Error Responses:**

| Code | Body | Cause |
|------|------|-------|
| 400 | `{ "error": "Missing required fields: to, subject, html" }` | Missing required fields |
| 500 | `{ "error": "RESEND_API_KEY not configured" }` | Server misconfiguration |
| 500 | `{ "error": "Failed to send email", "details": "..." }` | Resend API failure after 3 retries |

**Retry Logic:** 3 attempts with exponential backoff (1s, 2s, 3s). Retries on 429 (rate limit) and 5xx errors. Stops on other 4xx errors.

**Side Effects:** Inserts a row into `email_logs` on every call (success or failure).

**External API:** Resend (`https://api.resend.com/emails`)

---

### 2. generate-inspection-pdf

Generates an HTML inspection report from a template + inspection data. Stores the populated HTML in Supabase Storage and returns a URL or the raw HTML.

**Endpoint:** `POST /generate-inspection-pdf`

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `inspectionId` | string (UUID) | Yes | - | Inspection to generate PDF for |
| `regenerate` | boolean | No | `false` | Force regeneration even if PDF exists |
| `returnHtml` | boolean | No | `false` | Return raw HTML instead of storage URL |

**Success Response (200) - URL mode:**
```json
{
  "success": true,
  "pdfUrl": "https://...supabase.co/storage/v1/object/public/inspection-reports/...",
  "version": 3,
  "inspectionId": "uuid",
  "generatedAt": "2026-02-17T10:30:00.000Z"
}
```

**Success Response (200) - HTML mode (`returnHtml: true`):**
```json
{
  "success": true,
  "html": "<html>...</html>",
  "version": 3,
  "inspectionId": "uuid",
  "generatedAt": "2026-02-17T10:30:00.000Z"
}
```

**Error Responses:**

| Code | Body | Cause |
|------|------|-------|
| 400 | `{ "error": "Missing inspectionId in request body" }` | No inspectionId provided |
| 400 | `{ "error": "Inspection not complete...", "currentStatus": "new_lead" }` | Lead not in post-inspection status |
| 404 | `{ "error": "Inspection not found" }` | Invalid inspectionId |
| 500 | `{ "error": "Failed to generate PDF: ..." }` | Template fetch failure, storage error |

**Database Operations:**
- Reads: `inspections`, `leads`, `inspection_areas`, `photos`, `subfloor_data`, `subfloor_readings`
- Writes: Updates `inspections.pdf_url`, `pdf_version`, `pdf_generated_at`. Inserts into `pdf_versions`.

**Performance:** 1-3s typical. Photo signed URLs generated in parallel batches of 10.

---

### 3. send-inspection-reminder

Scheduled function that sends 48-hour reminder emails for upcoming inspections.

**Endpoint:** `POST /send-inspection-reminder`

**Request Body:** None (triggered by Supabase CRON scheduler).

**Success Response (200):**
```json
{
  "processed": 5,
  "sent": 4,
  "failed": 0,
  "skipped": 1
}
```

**No Pending Response (200):**
```json
{
  "processed": 0,
  "sent": 0,
  "failed": 0,
  "message": "No pending reminders"
}
```

**Error Responses:**

| Code | Body | Cause |
|------|------|-------|
| 500 | `{ "error": "RESEND_API_KEY not configured" }` | Missing API key |
| 500 | `{ "error": "Failed to query bookings", "details": "..." }` | Database query failure |

**Query Logic:** Finds `calendar_bookings` where `reminder_sent = false`, `status = 'scheduled'`, `reminder_scheduled_for <= now()`, and `lead_id IS NOT NULL`.

**Side Effects:** Sets `reminder_sent = true` and `reminder_sent_at` on each processed booking. Inserts rows into `email_logs`.

---

### 4. generate-inspection-summary

Generates AI-powered inspection report sections using Google Gemini via OpenRouter.

**Endpoint:** `POST /generate-inspection-summary`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `formData` | object | Yes | Full inspection form data (areas, readings, photos, etc.) |
| `structured` | boolean | No | If `true`, generates all 4 sections as JSON |
| `section` | string | No | Single section to generate: `whatWeFound`, `whatWeWillDo`, `detailedAnalysis`, `demolitionDetails` |
| `feedback` | string | No | User feedback for regeneration |
| `customPrompt` | string | No | Custom prompt override |
| `currentContent` | string | No | Existing content being regenerated |

**Success Response (200) - Structured mode:**
```json
{
  "success": true,
  "structured": true,
  "what_we_found": "Mould contamination was identified in...",
  "what_we_will_do": "Our remediation plan includes...",
  "detailed_analysis": "## Area Analysis\n### Bathroom\n...",
  "demolition_details": "Demolition of affected materials...",
  "generated_at": "2026-02-17T10:30:00.000Z"
}
```

**Error Responses:**

| Code | Body | Cause |
|------|------|-------|
| 400 | `{ "error": "Missing formData in request body" }` | No form data |
| 405 | `{ "error": "Method not allowed" }` | Non-POST request |
| 500 | `{ "error": "AI service not configured. Please contact support." }` | Missing OPENROUTER_API_KEY |
| 500 | `{ "success": false, "error": "AI generation failed: ..." }` | All 3 model attempts failed |

**Model Fallback Chain:**
1. `google/gemini-2.0-flash-001`
2. `google/gemini-2.5-flash-preview`
3. `google/gemini-2.0-flash-thinking-exp:free`

Retries on 429 rate limit. Fails on other errors.

**Performance:** 30-60s (LLM inference time). Called fire-and-forget from the frontend.

---

### 5. send-slack-notification

Sends notifications to a Slack channel via incoming webhook.

**Endpoint:** `POST /send-slack-notification`

**Request Body (new_lead event):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | `"new_lead"` | Yes | Event type |
| `full_name` | string | Yes | Customer name |
| `phone` | string | No | Customer phone |
| `email` | string | No | Customer email |
| `street_address` | string | No | Property street |
| `suburb` | string | No | Property suburb |
| `postcode` | string | No | Postcode |
| `issue_description` | string | No | Issue summary |
| `lead_source` | string | No | Lead source |

**Request Body (other events):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | `"inspection_booked"` / `"report_ready"` / `"report_approved"` | Yes | Event type |
| `leadName` | string | No | Customer name |
| `propertyAddress` | string | No | Property address |
| `technicianName` | string | No | Assigned technician |
| `bookingDate` | string | No | Booking date |

**Success Response (200):**
```json
{ "success": true }
```

**Error Responses:**

| Code | Body | Cause |
|------|------|-------|
| 500 | `{ "error": "SLACK_WEBHOOK_URL not configured" }` | Missing webhook URL |
| 500 | `{ "error": "Slack API error: ..." }` | Slack rejected the message |

**Performance:** <200ms. Fire-and-forget.

---

### 6. calculate-travel-time

Multi-purpose function for travel time estimation, lead triage, and technician availability.

**Endpoint:** `POST /calculate-travel-time`

#### Action: Simple Travel Time (default)

**Request:**
```json
{
  "origin": "123 Main St, Melbourne VIC",
  "destination": "456 Smith St, Fitzroy VIC"
}
```

**Response (200):**
```json
{
  "distance_km": 12.5,
  "duration_minutes": 18,
  "duration_in_traffic_minutes": 22,
  "origin_address": "123 Main St, Melbourne VIC 3000",
  "destination_address": "456 Smith St, Fitzroy VIC 3065"
}
```

#### Action: Triage Lead

Ranks all technicians by proximity to a lead's property.

**Request:**
```json
{
  "action": "triage_lead",
  "lead_id": "uuid"
}
```

**Response (200):**
```json
{
  "lead_id": "uuid",
  "lead_address": "123 Main St, Melbourne VIC",
  "ranked_technicians": [
    {
      "technician_id": "uuid",
      "technician_name": "John Smith",
      "travel_time_minutes": 15,
      "distance_km": 8.2,
      "source": "google_api"
    }
  ],
  "recommended_technician_id": "uuid"
}
```

#### Action: Check Availability

Checks if a technician is available at a requested date/time.

**Request:**
```json
{
  "action": "check_availability",
  "technician_id": "uuid",
  "date": "2026-03-15",
  "requested_time": "10:00",
  "destination_address": "123 Main St, Melbourne VIC"
}
```

**Response (200):**
```json
{
  "available": true,
  "technician_name": "John Smith",
  "earliest_start": "09:30",
  "requested_time_works": true,
  "buffer_minutes": 30,
  "suggestions": ["09:00", "10:00", "11:00"],
  "day_schedule": [
    { "time": "08:00", "client_name": "Jane Doe", "suburb": "Richmond", "ends_at": "09:00" }
  ]
}
```

#### Action: Get Recommended Dates

Suggests optimal booking dates for a technician near a destination.

**Request:**
```json
{
  "action": "get_recommended_dates",
  "technician_id": "uuid",
  "destination_address": "123 Main St, Melbourne VIC",
  "destination_suburb": "Melbourne",
  "days_ahead": 7
}
```

**Response (200):**
```json
{
  "recommendations": [
    {
      "date": "2026-03-16",
      "day_name": "Mon",
      "display_date": "16 Mar",
      "score": 95,
      "rating": "best",
      "reason": "Nearby appointment in same suburb",
      "appointment_count": 2,
      "available_slots": ["08:00", "11:00", "14:00"]
    }
  ],
  "technician_name": "John Smith"
}
```

**Error Responses:**

| Code | Body | Cause |
|------|------|-------|
| 400 | `{ "error": "Origin and destination are required" }` | Missing fields |
| 404 | `{ "error": "Lead not found" }` | Invalid lead_id |
| 404 | `{ "error": "No technicians found" }` | No technicians in system |
| 500 | `{ "error": "Google Maps API not configured" }` | Missing API key |

**External API:** Google Maps Distance Matrix (`https://maps.googleapis.com/maps/api/distancematrix/json`).

**Fallback:** Haversine formula calculation when Google API is unavailable (assumes 40 km/h Melbourne metro average).

---

### Additional Edge Functions

| Function | Method | Purpose |
|----------|--------|---------|
| `manage-users` | GET/POST/PATCH/DELETE | Admin user CRUD (requires admin JWT) |
| `seed-admin` | POST | Creates/ensures default admin accounts |
| `export-inspection-context` | POST | Exports full lead + inspection data as JSON |

---

## Database Schema

### Core Tables (22 total)

#### leads
Central entity tracking customer/property through the inspection pipeline.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `full_name` | TEXT | No | Customer name |
| `email` | TEXT | No | Customer email |
| `phone` | TEXT | No | Phone number |
| `property_address_street` | TEXT | No | Street address |
| `property_address_suburb` | TEXT | No | Suburb |
| `property_address_postcode` | TEXT | No | Postcode |
| `property_address_state` | TEXT | Yes | State (VIC, NSW, etc.) |
| `lead_number` | TEXT | No | Auto-generated, unique |
| `status` | lead_status | No | Pipeline status |
| `lead_source` | TEXT | Yes | hipages, facebook, referral, etc. |
| `issue_description` | TEXT | Yes | Customer's issue summary |
| `notes` | TEXT | Yes | Public notes |
| `internal_notes` | TEXT | Yes | Internal team notes |
| `assigned_to` | UUID | Yes | FK to auth.users (technician) |
| `created_by` | UUID | Yes | FK to auth.users |
| `quoted_amount` | NUMERIC | Yes | Quote amount |
| `urgency` | TEXT | Yes | urgent, normal, low |
| `inspection_scheduled_date` | DATE | Yes | Scheduled inspection date |
| `scheduled_time` | TEXT | Yes | Preferred time |
| `archived_at` | TIMESTAMPTZ | Yes | Soft-delete timestamp |
| `created_at` | TIMESTAMPTZ | No | Auto-set |
| `updated_at` | TIMESTAMPTZ | No | Auto-updated by trigger |

**Key Indexes:** `(status, assigned_to, created_at)`, `(lead_number)` UNIQUE, `(inspection_scheduled_date)`, `(created_at)`

#### inspections
Inspection form data, pricing, and PDF tracking. ~95 columns.

| Column Group | Key Columns | Description |
|--------------|-------------|-------------|
| Identity | `id`, `job_number`, `lead_id`, `inspector_id` | Identifiers and relationships |
| Climate | `outdoor_temperature`, `outdoor_humidity`, `outdoor_dew_point` | External conditions |
| Equipment | `commercial_dehumidifier_qty`, `air_movers_qty`, `rcd_box_qty` | Equipment quantities |
| Pricing | `equipment_cost_ex_gst`, `labour_cost_ex_gst`, `estimated_cost_ex_gst`, `discount_percent`, `gst_amount`, `total_inc_gst` | Cost breakdown |
| PDF | `pdf_url`, `pdf_version`, `pdf_generated_at`, `pdf_approved` | Report tracking |
| AI Summary | `ai_summary_text`, `ai_summary_generated_at`, `ai_summary_approved` | AI analysis |

**FK:** `lead_id` -> `leads.id` (CASCADE)

#### inspection_areas
Room-by-room inspection breakdown.

| Key Columns | Type | Description |
|-------------|------|-------------|
| `inspection_id` | UUID | FK to inspections (CASCADE) |
| `area_name` | TEXT | Room name |
| `temperature`, `humidity`, `dew_point` | DECIMAL | Climate readings |
| `mould_ceiling`, `mould_walls`, `mould_flooring`, etc. | BOOLEAN | Mould location checkboxes |
| `demolition_required`, `demolition_time_minutes` | BOOLEAN, INTEGER | Demolition info |
| `comments` | TEXT | Customer-facing notes |

#### photos
Inspection images stored in Supabase Storage.

| Key Columns | Type | Description |
|-------------|------|-------------|
| `inspection_id` | UUID | FK to inspections |
| `area_id` | UUID | FK to inspection_areas |
| `storage_path` | TEXT | Cloud storage path |
| `photo_type` | TEXT | area, subfloor, moisture |
| `caption` | TEXT | User description |

#### moisture_readings
Individual moisture percentage readings per area.

| Key Columns | Type | Description |
|-------------|------|-------------|
| `area_id` | UUID | FK to inspection_areas |
| `moisture_percentage` | DECIMAL | 0-100% reading |
| `moisture_status` | ENUM | dry, elevated, wet, very_wet |
| `title` | TEXT | Reading location |

#### subfloor_data / subfloor_readings
Subfloor inspection observations and moisture readings. One `subfloor_data` per inspection (1:1). Multiple `subfloor_readings` per subfloor.

#### calendar_bookings
Scheduling for inspections and jobs.

| Key Columns | Type | Description |
|-------------|------|-------------|
| `lead_id` | UUID | FK to leads |
| `inspection_id` | UUID | FK to inspections |
| `assigned_to` | UUID | FK to auth.users (technician) |
| `start_datetime`, `end_datetime` | TIMESTAMPTZ | Event times |
| `status` | booking_status | scheduled, in_progress, completed, cancelled |
| `reminder_sent` | BOOLEAN | Reminder email sent |
| `travel_time_minutes` | INTEGER | Calculated travel time |

#### Other Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (extends auth.users) |
| `roles` | Role definitions (admin, technician) |
| `user_roles` | User-to-role mapping (RBAC) |
| `activities` | Lead activity timeline |
| `notifications` | In-app notification system |
| `email_logs` | Email delivery audit trail |
| `audit_logs` | System-level audit trail |
| `pdf_versions` | PDF report version history |
| `login_activity` | Login attempt audit trail |
| `user_devices` | Trusted device registry |
| `user_sessions` | Active session tracking |
| `suspicious_activity` | Flagged security events |
| `editable_fields` | PDF inline-edit configuration |
| `app_settings` | Key-value application settings |

### Entity Relationship Summary

```
leads (1) -----> (many) inspections
leads (1) -----> (many) calendar_bookings
leads (1) -----> (many) activities
leads (1) -----> (many) notifications
inspections (1) -----> (many) inspection_areas
inspections (1) -----> (many) photos
inspections (1) -----> (1) subfloor_data
inspections (1) -----> (many) pdf_versions
inspection_areas (1) -> (many) moisture_readings
inspection_areas (1) -> (many) photos
subfloor_data (1) ----> (many) subfloor_readings
subfloor_data (1) ----> (many) photos
auth.users (1) -------> (many) user_roles
auth.users (1) -------> (many) calendar_bookings
auth.users (1) -------> (1) profiles
```

---

## Authentication Flow

### Login
1. User submits email + password to Supabase Auth
2. Supabase returns JWT + refresh token
3. App fetches `profiles` (name), `user_roles` + `roles` (role)
4. Role stored in `localStorage` as `mrc_current_role`
5. Redirect to role-specific dashboard (`/admin` or `/technician`)

### Session Management
- JWT stored in `localStorage` (remember me) or `sessionStorage` (single session)
- Proactive token refresh every 5 minutes via `useSessionRefresh` hook
- `onAuthStateChange` listener handles session events

### Password Reset
1. User enters email on `/forgot-password`
2. Supabase sends reset link to email
3. User clicks link, lands on `/reset-password` with token in URL
4. User enters new password, Supabase updates auth record

### Role-Based Access
- `ProtectedRoute` - Requires any authenticated user
- `RoleProtectedRoute` - Requires specific role(s)
- `is_admin()` - Database function used in RLS policies

---

## Enums & Constants

### Lead Status Pipeline
```
hipages_lead -> new_lead -> contacted -> inspection_waiting ->
inspection_ai_summary -> approve_inspection_report ->
inspection_email_approval -> closed
                         -> not_landed (removed from pipeline)
```

### Booking Status
```
scheduled -> in_progress -> completed
                         -> cancelled
                         -> rescheduled
```

### Equipment Pricing (AUD, ex-GST)
| Equipment | Daily Rate |
|-----------|-----------|
| Commercial Dehumidifier | $132.00 |
| Air Mover | $46.00 |
| RCD Box | $5.00 |

### Business Rules
- **GST:** Always 10%
- **Discount Cap:** 13% maximum (multiplier floor: 0.87)
- **Currency Format:** `$X,XXX.XX` (AUD)
- **Date Format:** DD/MM/YYYY
- **Timezone:** Australia/Melbourne

---

*Last Updated: 2026-02-17*

# MRC Lead Management System - Database Technical Audit

**Auditor:** Claude Code (Opus 4.6)
**Date:** 2026-02-17
**Supabase Project:** `ecyivrxjpsmjmexqatym`
**Method:** Live schema introspection via Supabase MCP + full codebase scan + migration file analysis

---

## 1. Executive Summary

### Health Score: 68/100

| Area | Score | Notes |
|------|-------|-------|
| Schema Design | 7/10 | Solid core model, but `inspections` vs `inspection_reports` confusion is a blocker |
| Data Integrity | 5/10 | 5 FK constraints point to wrong table (`inspection_reports` instead of `inspections`) |
| RLS/Security | 7/10 | All 31 tables have RLS enabled; several policies too permissive |
| Indexes | 6/10 | 140+ indexes (comprehensive), but 8+ duplicates and legacy remnants |
| Functions/Triggers | 6/10 | 2 functions reference renamed table (`calendar_events`); 3 duplicate triggers |
| Codebase Alignment | 7/10 | 22 of 31 tables actively queried; 9 tables have zero frontend references |
| Overall Cleanliness | 5/10 | 13 effectively unused tables; naming inconsistencies from renames |

### Top 3 Blockers

1. **CRITICAL: 5 FK constraints point to `inspection_reports` (0 rows, legacy) instead of `inspections` (2 rows, active).** This means `calendar_bookings.inspection_id`, `invoices.inspection_id`, `email_logs.inspection_id`, `sms_logs.inspection_id`, and `client_booking_tokens.inspection_id` all reference the wrong table. Any future attempt to JOIN these tables to real inspection data will fail.

2. **CRITICAL: 2 database functions reference `calendar_events` (old table name).** `check_booking_conflicts()` and `has_travel_time_conflict(uuid, timestamptz, integer)` query `calendar_events` which was renamed to `calendar_bookings`. These functions will throw "relation does not exist" errors if called.

3. **HIGH: `inspections` table has 95 columns** with duplicate equipment fields (`commercial_dehumidifier_qty` vs `dehumidifier_count`, `air_movers_qty` vs `air_mover_count`, `rcd_box_qty` vs `rcd_count`) and is missing its `updated_at` trigger.

### Production Readiness

**MVP Functional** - The core inspection workflow works (leads -> inspections -> areas -> photos -> PDF). Schema debt is manageable but the FK misdirection to `inspection_reports` must be fixed before scaling.

---

## 2. Table-by-Table Analysis (31 Tables)

### Category A: Core Active (7 tables) - Actively used, real data

| Table | Rows | Columns | Frontend Refs | Purpose | Issues |
|-------|------|---------|---------------|---------|--------|
| `leads` | 3 | 37 | 29 files | Central entity - customer/property tracking through pipeline | Confusing note fields: `notes`, `internal_notes`, `access_instructions`, `special_requests`. Duplicate indexes: `idx_leads_created`/`idx_leads_created_at`, `idx_leads_lead_number`/`idx_leads_number` |
| `inspections` | 2 | 95 | 18 files | NEW inspection table - technician form data, pricing, AI summaries, PDF tracking | 95 columns (massive!). Duplicate equipment columns. Missing `updated_at` trigger. Trigger `update_inspections_updated_at` is on `inspection_reports` instead |
| `inspection_areas` | 2 | 41 | 5 files | Room-by-room inspection data with mould locations, climate readings | Has proper FK cascade to `inspections`. Has `updated_at` trigger |
| `calendar_bookings` | 14 | 19 | 12 files | Scheduling system for inspections/jobs | `inspection_id` FK points to `inspection_reports` (WRONG). 3 duplicate `updated_at` triggers. Legacy constraint name `calendar_events_lead_id_fkey` |
| `activities` | 12 | 8 | 5 files | Lead timeline - user-facing activity feed | RLS too permissive: all authenticated users see ALL activities. Should scope to assigned leads |
| `photos` | 42 | 14 | 8 files | Inspection photos linked to areas, subfloor, moisture readings | Good FK design with CASCADE deletes. No `updated_at` column (acceptable for immutable records) |
| `pdf_versions` | 78 | 8 | 1 file | Version history for generated PDF reports | Proper unique constraint on `(inspection_id, version_number)`. FK to `inspections` (correct!) |

### Category B: Active Supporting (7 tables) - Actively used, supporting roles

| Table | Rows | Columns | Frontend Refs | Purpose | Issues |
|-------|------|---------|---------------|---------|--------|
| `moisture_readings` | 4 | 7 | 4 files | Per-area moisture percentage readings | No `updated_at` column (acceptable - readings are immutable). Has CASCADE from `inspection_areas` |
| `subfloor_data` | 2 | 11 | 4 files | Subfloor inspection observations per inspection | Unique constraint on `inspection_id` (1:1 relationship). Correct FK to `inspections` |
| `subfloor_readings` | 3 | 6 | 4 files | Individual moisture readings for subfloor locations | Clean schema. CASCADE from `subfloor_data` |
| `profiles` | 2 | 9 | 1 file | User profile extension (onboarding status) | Thin table - most profile data in `auth.users.user_metadata`. FK to `auth.users.id` |
| `user_roles` | 5 | 5 | 5 files | RBAC join table (user <-> role mapping) | Proper unique constraint on `(user_id, role_id)`. CASCADE on role deletion |
| `roles` | 3 | 5 | 3 files | Role definitions (admin, technician, developer) | Public SELECT policy (any user can view role names). Clean schema |
| `editable_fields` | 12 | 11 | 1 file | PDF field edit configuration - defines which report fields are inline-editable | Used by `pdfGeneration.ts`. Missing `updated_at` trigger |

### Category C: Active Security (4 tables) - Session/security tracking

| Table | Rows | Columns | Frontend Refs | Purpose | Issues |
|-------|------|---------|---------------|---------|--------|
| `login_activity` | 59 | 18 | 2 files | Login attempt audit trail (success/fail, device, location) | Properly scoped RLS: users see own, admins see all. Good indexes |
| `user_devices` | 6 | 13 | 2 files | Known device registry with trust status | Unique constraint on `(user_id, device_fingerprint)`. Clean RLS (own devices only) |
| `user_sessions` | 39 | 12 | 1 file | Active session tracking for force-logout | RLS properly scoped to own sessions. Missing admin view policy |
| `suspicious_activity` | 6 | 11 | 1 file | Flagged suspicious login events for admin review | Admin-only SELECT + UPDATE. Anyone can INSERT (for logging). Good design |

### Category D: Active Logging (2 tables) - Used by edge functions/triggers

| Table | Rows | Columns | Frontend Refs | Purpose | Issues |
|-------|------|---------|---------------|---------|--------|
| `email_logs` | 5 | 19 | 0 frontend, 1 edge fn | Email delivery audit trail (Resend provider) | `inspection_id` FK points to `inspection_reports` (WRONG). Used by `send-email` edge function. 10 indexes (over-indexed for 5 rows) |
| `notifications` | 36 | 15 | 2 files | In-app notification system | Populated by 5 database triggers on `leads`. Properly scoped RLS (own notifications). `lead_id` FK has CASCADE (correct) |

### Category E: Legacy (1 table) - Should be removed

| Table | Rows | Columns | Frontend Refs | Purpose | Issues |
|-------|------|---------|---------------|---------|--------|
| `inspection_reports` | 0 | 33 | 0 files | **LEGACY** - Original inspections table, renamed when new `inspections` table was created | 0 rows, 0 codebase references. BUT 5 tables still have FK constraints pointing to it. Has 2 `updated_at` triggers (one is misnamed `update_inspections_updated_at`). 8 indexes on an empty table. **Must migrate FKs before dropping** |

### Category F: Future/Empty (9 tables) - Phase 2+ or unused

| Table | Rows | Columns | Frontend Refs | Purpose | Phase |
|-------|------|---------|---------------|---------|-------|
| `invoices` | 0 | 17 | 0 files | Invoice management | Phase 2. `inspection_id` FK to `inspection_reports` (wrong). `lead_id` FK missing CASCADE |
| `equipment` | 0 | 9 | 0 files | Equipment catalog with daily rates | Phase 2. Superseded by columns on `inspections` table |
| `equipment_bookings` | 0 | 10 | 0 files | Equipment-to-inspection booking records | Phase 2. FK correctly points to `inspections` |
| `booking_tokens` | 0 | 7 | 1 file | Pre-inspection booking tokens (lead schedules) | Phase 2. 1 reference in `notifications.ts` (likely placeholder) |
| `client_booking_tokens` | 0 | 7 | 0 files | Post-inspection client booking tokens | Phase 2. `inspection_id` FK to `inspection_reports` (wrong) |
| `company_settings` | 0 | 12 | 0 files | Business profile configuration | Phase 2. Missing `updated_at` trigger |
| `operating_hours` | 0 | 8 | 0 files | Technician availability schedule | Phase 2. Not referenced in codebase |
| `pricing_settings` | 0 | 6 | 0 files | Job type hourly rate configuration | Phase 2. Superseded by rate columns on `inspections` table |
| `offline_queue` | 0 | 17 | 0 files | PWA offline sync queue | Phase 2. Comprehensive schema ready for offline support |

### Other tables (not in main 31 from list_tables):

| Table | Status | Notes |
|-------|--------|-------|
| `suburb_zones` | **DOES NOT EXIST** | Referenced by 2 functions (`get_suburb_details`, `get_zone_by_suburb`) but table was never created. These functions will error if called |
| `password_reset_tokens` | 0 rows, 0 refs | Supabase Auth handles password resets natively. This table is unnecessary |
| `app_settings` | 0 rows, 0 frontend refs | Used by `generate_inspection_number()` function for daily sequence tracking. Indirectly active via function |
| `audit_logs` | 15 rows, 1 ref | System audit trail. Used by `CreateLeadModal.tsx`. Different purpose from `activities` |
| `sms_logs` | 0 rows, 0 refs | SMS delivery audit trail (Twilio). No SMS provider integrated yet. `inspection_id` FK to `inspection_reports` (wrong) |

---

## 3. Permission Model Assessment

### Overview
- **All 31 tables have RLS enabled** (good baseline)
- Security functions `is_admin()` and `has_role()` are `SECURITY DEFINER` (correct)
- `has_role()` does NOT set `search_path` (minor security concern)

### Policy Analysis by Risk Level

#### HIGH RISK - Overly Permissive

| Table | Policy | Issue | Recommendation |
|-------|--------|-------|----------------|
| `activities` | `All authenticated users can view activities` | Any logged-in user sees ALL lead activities across the system | Scope to: `lead_id IN (SELECT id FROM leads WHERE assigned_to = auth.uid()) OR is_admin()` |
| `calendar_bookings` | `authenticated_full_access_bookings` | ALL operations for any authenticated user | Technicians should only manage their own bookings: `assigned_to = auth.uid() OR is_admin()` |
| `inspection_reports` | `authenticated_full_access_reports` | ALL operations for any authenticated user | Redundant since table is legacy. Lock down to admin-only or drop table |
| `password_reset_tokens` | `authenticated_manage_reset_tokens` | `qual: true, with_check: true` for ALL operations | Any authenticated user can read/modify ANY reset token. Critical security flaw |
| `booking_tokens` | Multiple policies | `public_read_valid_tokens` allows `qual: true` for SELECT (anyone, even anon, can read ALL tokens) | Should scope to token-based access only |

#### MEDIUM RISK - Could Be Tighter

| Table | Policy | Issue | Recommendation |
|-------|--------|-------|----------------|
| `inspections` | `authenticated_*` (4 policies) | All authenticated users have full CRUD on all inspections | Scope writes to: `inspector_id = auth.uid() OR is_admin()` |
| `leads` | `authenticated_*` (4 policies) | All authenticated users have full CRUD on all leads | Scope to: `assigned_to = auth.uid() OR is_admin()` for writes |
| `app_settings` | `authenticated_manage_app_settings` | Any authenticated user can modify app-level settings | Restrict writes to admin only |
| `company_settings` | `authenticated_manage_company_settings` | Any authenticated user can modify company settings | Restrict to admin only |
| `moisture_readings` | `All authenticated users can manage` | Full access for all authenticated | Acceptable for MVP but should scope to inspection owner |

#### LOW RISK - Properly Scoped

| Table | Assessment |
|-------|------------|
| `profiles` | Own profile only (uid = id) |
| `user_devices` | Own devices only (uid = user_id) |
| `user_sessions` | Own sessions only (uid = user_id) |
| `login_activity` | Own + admin view |
| `suspicious_activity` | Own view + admin view/update |
| `notifications` | Own notifications + system insert |
| `audit_logs` | Admin/developer view + own insert |
| `roles` | Public SELECT (read-only, acceptable) |
| `user_roles` | Own roles SELECT only |
| `editable_fields` | Authenticated SELECT only (read-only) |

#### MISSING POLICIES

| Table | Issue |
|-------|-------|
| `client_booking_tokens` | RLS enabled but **no explicit policies found in pg_policies**. This means NO access is possible (implicit deny). Confirmed: 0 rows, 0 codebase references. Not a problem until Phase 2 |
| `user_sessions` | No admin policy to view all sessions (needed for force-logout feature) |

---

## 4. Data Model Integrity Analysis

### 4.1 CRITICAL: `inspections` vs `inspection_reports`

**Timeline of confusion:**
1. Original table created as `inspections` (used for inspection reports)
2. Table renamed to `inspection_reports` (to clarify it held report data)
3. NEW `inspections` table created (for the technician mobile form)
4. All FK constraints from other tables still point to `inspection_reports` (the OLD table)
5. The NEW `inspections` table is where all real data lives (2 rows)
6. `inspection_reports` has 0 rows and 0 codebase references

**Affected FK Constraints:**

| Constraint Name | Source Table.Column | Points To | Should Point To |
|----------------|--------------------| ----------|-----------------|
| `calendar_bookings_inspection_id_fkey` | `calendar_bookings.inspection_id` | `inspection_reports.id` | `inspections.id` |
| `invoices_inspection_id_fkey` | `invoices.inspection_id` | `inspection_reports.id` | `inspections.id` |
| `email_logs_inspection_id_fkey` | `email_logs.inspection_id` | `inspection_reports.id` | `inspections.id` |
| `sms_logs_inspection_id_fkey` | `sms_logs.inspection_id` | `inspection_reports.id` | `inspections.id` |
| `client_booking_tokens_inspection_id_fkey` | `client_booking_tokens.inspection_id` | `inspection_reports.id` | `inspections.id` |

**Impact:** Currently low (all affected tables except `email_logs` have 0 rows, and `email_logs.inspection_id` is nullable). But this is a ticking time bomb - any future feature using these joins will break.

**Recommendation:** Single migration to:
1. Drop the 5 FK constraints
2. Recreate them pointing to `inspections.id`
3. After verification, drop `inspection_reports` table entirely

### 4.2 Duplicate Token Tables

| Table | Purpose | Rows | FK Target | Codebase Refs |
|-------|---------|------|-----------|---------------|
| `booking_tokens` | Pre-inspection: lead schedules inspection | 0 | `leads.id` | 1 (placeholder) |
| `client_booking_tokens` | Post-inspection: client books remediation job | 0 | `inspection_reports.id` (wrong!) | 0 |

Both are empty and unused. **Recommendation:** Consolidate into a single `booking_tokens` table with a `token_type` ENUM column (`'inspection_booking'`, `'job_booking'`) and a polymorphic `entity_id` + `entity_type` pattern.

### 4.3 `activities` vs `audit_logs`

| Aspect | `activities` | `audit_logs` |
|--------|-------------|-------------|
| Purpose | User-facing lead timeline | System-level audit trail |
| Rows | 12 | 15 |
| Codebase refs | 5 files | 1 file |
| UI visible | Yes (LeadDetail page) | No (admin debugging) |
| Columns | lead_id, activity_type, title, description | action, entity_type, entity_id, metadata |
| RLS | All authenticated (too permissive) | Admin/developer only |

**Verdict:** NOT redundant. Different purposes. Keep both but tighten `activities` RLS.

### 4.4 Denormalization Issues

| Duplication | Location A | Location B | Recommendation |
|------------|------------|------------|----------------|
| Report PDF URL | `leads.report_pdf_url` | `inspections.pdf_url` + `inspections.report_pdf_url` | Single source of truth on `inspections`. Remove from `leads` or make it a computed view |
| Inspector name | `inspections.inspector_name` (denormalized) | `auth.users.user_metadata.full_name` | Acceptable denormalization (avoids auth join in PDF generation). Keep but ensure sync |
| Property address | `inspections.property_address_snapshot` | `leads.property_address_*` columns | Acceptable (snapshot at inspection time vs live data). Good design |

### 4.5 Missing CASCADE Rules

| FK Constraint | Table | Delete Rule | Issue |
|---------------|-------|-------------|-------|
| `invoices_lead_id_fkey` | `invoices.lead_id` → `leads.id` | NO ACTION | Would orphan invoices if lead deleted. Should be RESTRICT or CASCADE |
| `suspicious_activity_login_activity_id_fkey` | `suspicious_activity.login_activity_id` → `login_activity.id` | NO ACTION | Would orphan suspicious_activity records. Should be CASCADE |
| `equipment_bookings_equipment_id_fkey` | `equipment_bookings.equipment_id` → `equipment.id` | NO ACTION | Should be RESTRICT (prevent deleting equipment with bookings) |

### 4.6 Duplicate Equipment Columns on `inspections`

The `inspections` table has TWO sets of equipment tracking columns:

| Set A (Section 7 toggles) | Set B (Pricing calculator) | Overlap |
|---------------------------|---------------------------|---------|
| `commercial_dehumidifier_enabled` (bool) | - | No equivalent |
| `commercial_dehumidifier_qty` (int) | `dehumidifier_count` (int) | **DUPLICATE** |
| `air_movers_enabled` (bool) | - | No equivalent |
| `air_movers_qty` (int) | `air_mover_count` (int) | **DUPLICATE** |
| `rcd_box_enabled` (bool) | - | No equivalent |
| `rcd_box_qty` (int) | `rcd_count` (int) | **DUPLICATE** |

**Recommendation:** Keep Set B (`dehumidifier_count`, `air_mover_count`, `rcd_count`) as they align with the pricing calculator. Remove Set A `_qty` columns and keep only the `_enabled` booleans as toggles. Alternatively, derive `_enabled` from `count > 0`.

---

## 5. Performance Recommendations

### 5.1 Index Health

**Total Indexes: ~145** across 31 tables. This is over-indexed for the current data volume but acceptable for future growth.

#### Duplicate Indexes (Remove)

| Table | Index A | Index B | Action |
|-------|---------|---------|--------|
| `leads` | `idx_leads_created` | `idx_leads_created_at` | Drop `idx_leads_created` |
| `leads` | `idx_leads_lead_number` | `idx_leads_number` | Drop `idx_leads_number` |
| `invoices` | `idx_invoices_lead` | `idx_invoices_lead_id` | Drop `idx_invoices_lead` |
| `notifications` | `idx_notifications_is_read` | `idx_notifications_read` | Drop `idx_notifications_read` |
| `inspection_areas` | `idx_areas_inspection` | `idx_inspection_areas_inspection_id` | Drop `idx_areas_inspection` |
| `calendar_bookings` | `idx_calendar_bookings_active` | `idx_calendar_bookings_technician_time` | Near-duplicate (same columns, same WHERE). Drop `idx_calendar_bookings_active` |
| `booking_tokens` | `booking_tokens_token_key` (unique) | `idx_booking_tokens_token` | Drop `idx_booking_tokens_token` (unique already creates index) |
| `client_booking_tokens` | `client_booking_tokens_token_key` (unique) | `idx_client_booking_tokens_token` | Drop `idx_client_booking_tokens_token` |

**Savings:** 8 redundant indexes removed.

#### Over-Indexed Tables (Low Row Count)

| Table | Rows | Indexes | Assessment |
|-------|------|---------|------------|
| `email_logs` | 5 | 10 | Excessive. Keep PK + `lead_id` + `status`. Remove 7 |
| `sms_logs` | 0 | 7 | Excessive for empty table. Keep PK + basics. Remove 4 |
| `offline_queue` | 0 | 8 | Excessive for empty table. Keep until feature is built |
| `inspection_reports` | 0 | 8 | **Drop entire table** (all indexes go with it) |
| `audit_logs` | 15 | 4 | Acceptable |
| `booking_tokens` | 0 | 4 | Acceptable (small count) |

#### Missing Indexes

All foreign keys appear to have corresponding indexes. No missing FK indexes detected.

### 5.2 Trigger Cleanup

#### Duplicate Triggers on `calendar_bookings`

| Trigger | Action | Status |
|---------|--------|--------|
| `update_calendar_bookings_updated_at` | `update_updated_at_column()` | KEEP (correct name) |
| `update_calendar_events_updated_at` | `update_updated_at_column()` | DROP (legacy from rename) |
| `update_calendar_updated_at` | `update_updated_at_column()` | DROP (duplicate) |

**Impact:** All 3 triggers fire on every UPDATE, calling `update_updated_at_column()` three times. No data corruption but unnecessary overhead.

#### Misplaced Triggers on `inspection_reports`

| Trigger | On Table | Should Be On |
|---------|----------|-------------|
| `update_inspection_reports_updated_at` | `inspection_reports` | Keep (if table retained) |
| `update_inspections_updated_at` | `inspection_reports` | **Should be on `inspections`** |

**Impact:** The `inspections` table (the ACTIVE one with 2 rows) has NO `updated_at` trigger. The trigger named `update_inspections_updated_at` was left on `inspection_reports` when the table was renamed. Result: `inspections.updated_at` is never automatically updated.

### 5.3 Query Patterns

The calendar booking indexes are well-designed for the scheduling use case:
- `idx_calendar_bookings_tech_date_status` — Technician dashboard queries
- `idx_calendar_bookings_technician_time` — Conflict detection
- Partial indexes filtering out cancelled/completed bookings

The leads table has good composite indexes for filtered queries:
- `idx_leads_status_assigned_created` — Dashboard pipeline
- `idx_leads_inspection_scheduled` — Scheduling views
- `idx_leads_job_scheduled` — Job management views

---

## 6. Function & Trigger Audit

### 6.1 Functions (27 total)

#### CRITICAL: Broken Table References

| Function | References | Actual Table | Impact |
|----------|-----------|-------------|--------|
| `check_booking_conflicts()` | `calendar_events` | `calendar_bookings` | **Will error if called.** Not currently called from frontend (conflict checking done client-side) |
| `has_travel_time_conflict(uuid, timestamptz, int)` | `calendar_events` | `calendar_bookings` | **Will error if called.** Also references `leads.property_suburb` (should be `property_address_suburb`) |
| `has_travel_time_conflict(uuid, timestamptz, timestamptz)` | `calendar_bookings` (correct) | `calendar_bookings` | References `deleted_at` column which does NOT exist on `calendar_bookings`. **Will error** |

#### Missing Table Reference

| Function | References | Status |
|----------|-----------|--------|
| `get_suburb_details()` | `suburb_zones` | **Table does not exist.** Will error if called |
| `get_zone_by_suburb()` | `suburb_zones` | **Table does not exist.** Will error if called |
| `get_pending_sync_items()` | `offline_queue` | Table exists (0 rows). Function works but unused |

#### Security Analysis

| Function | SECURITY DEFINER | search_path Set | Risk |
|----------|-----------------|-----------------|------|
| `is_admin()` | Yes | No | LOW - simple wrapper around `has_role()` |
| `is_admin(uuid)` | Yes | No | LOW |
| `has_role()` | Yes | No | **MEDIUM** - Should set `search_path = 'public'` |
| `get_user_roles_by_id()` | Yes | Yes (`'public'`) | Safe |
| `auto_generate_lead_number()` | Yes | Yes (`'public'`) | Safe |
| `handle_new_user()` | Yes | Yes (`'public'`) | Safe |
| `get_admin_user_ids()` | Yes | No | **MEDIUM** - Queries `auth.users`. Should set search_path |
| `notify_*` (5 functions) | Yes | No | **MEDIUM** - All 5 notification triggers lack search_path |
| All others | No | N/A | N/A (not SECURITY DEFINER) |

**Recommendation:** Add `SET search_path TO 'public'` to all `SECURITY DEFINER` functions that don't already have it.

#### Functions That Could Be Simplified

| Function | Current | Suggestion |
|----------|---------|------------|
| `calculate_gst()` | PL/pgSQL function | Already SQL — fine as-is |
| `calculate_total_inc_gst()` | SQL function | Could be inline expression, but function is cleaner |
| `generate_lead_number()` | PL/pgSQL with string concat | Fine as-is. Sequence-based, thread-safe |
| `generate_invoice_number()` | PL/pgSQL | Same pattern as lead number. Fine |

### 6.2 Triggers (24 total)

| Trigger Category | Count | Status |
|-----------------|-------|--------|
| `update_updated_at` | 16 | 3 duplicates on `calendar_bookings`, 1 misplaced on `inspection_reports` |
| Lead notification | 5 | All fire on leads INSERT/UPDATE. Working correctly |
| Lead number auto-gen | 1 | BEFORE INSERT on leads. Working correctly |
| **Total active needed** | **~19** | After removing duplicates and fixing misplacements |

#### Tables WITH `updated_at` column but WITHOUT trigger

| Table | Has `updated_at` | Has Trigger | Action Needed |
|-------|-----------------|-------------|---------------|
| `inspections` | Yes | **No** (misplaced on `inspection_reports`) | **Create trigger** |
| `editable_fields` | Yes | No | Create trigger |
| `company_settings` | Yes | No | Create trigger (when table is used) |
| `app_settings` | Yes | No | Create trigger (low priority) |

---

## 7. Specific Concerns (Channel.md Questions)

### Q1: Why both `booking_tokens` AND `client_booking_tokens`?

**Answer:** They were designed for different workflow stages:
- `booking_tokens` — Pre-inspection: client receives a link to book their inspection appointment. FK to `leads`. Has 1 codebase reference (in `notifications.ts`, likely placeholder).
- `client_booking_tokens` — Post-inspection: client receives a link to book the remediation job. FK to `inspection_reports` (wrong table).

**Both tables have 0 rows and are effectively unused.** The booking flow is currently handled through the admin dashboard without tokens.

**Recommendation:** Consolidate into a single `booking_tokens` table with:
```sql
token_type TEXT CHECK (token_type IN ('inspection_booking', 'job_booking'))
entity_id UUID  -- references leads.id OR inspections.id
entity_type TEXT CHECK (entity_type IN ('lead', 'inspection'))
```

### Q2: Why `email_logs`, `sms_logs`, AND `notifications`?

**Answer:** These serve three distinct purposes and are **NOT redundant**:

| Table | Purpose | Provider | Audience | Rows |
|-------|---------|----------|----------|------|
| `email_logs` | Email delivery audit trail | Resend | System/admin debugging | 5 |
| `sms_logs` | SMS delivery audit trail | Twilio (not yet integrated) | System/admin debugging | 0 |
| `notifications` | In-app UI notifications | Internal (DB triggers) | End users | 36 |

- `email_logs` tracks Resend API delivery status (sent, delivered, bounced, opened, clicked)
- `sms_logs` is prepared for Twilio integration (Phase 2)
- `notifications` powers the in-app notification bell and is populated by 5 database triggers

**Recommendation:** Keep all three. They serve fundamentally different purposes.

### Q3: Why both `activities` AND `audit_logs`?

**Answer:** Different audiences and use cases:

| Aspect | `activities` | `audit_logs` |
|--------|-------------|-------------|
| Audience | Users (visible in Lead Detail) | Admins (debugging) |
| Scope | Lead-specific timeline | System-wide actions |
| Content | "Inspection scheduled for John" | "lead.update: {old_status, new_status}" |
| Rows | 12 | 15 |
| Codebase refs | 5 files | 1 file |

**Recommendation:** Keep both. Tighten `activities` RLS to scope by lead assignment.

### Q4: Is `editable_fields` table actually used?

**Answer: Yes.** 12 rows, queried by `src/lib/api/pdfGeneration.ts`. It defines which fields in the generated PDF report can be inline-edited by admins (field key, label, type, table/column mapping, validation rules, edit icon position).

### Q5: Are `operating_hours` and `user_devices` MVP-critical?

| Table | Rows | Codebase Refs | MVP-Critical? |
|-------|------|---------------|---------------|
| `operating_hours` | 0 | 0 | **No** — Phase 2 scheduling feature. Not referenced anywhere |
| `user_devices` | 6 | 2 files | **Yes** — Actively used by `sessionService.ts` and `loginActivityService.ts` for device tracking, trust management, and session security |

### Q6: Are `subfloor_data` and `equipment_bookings` MVP or Phase 2?

| Table | Rows | Codebase Refs | MVP or Phase 2? |
|-------|------|---------------|-----------------|
| `subfloor_data` | 2 | 4 files | **MVP** — Actively used by the technician inspection form. Stores subfloor observations, treatment time, landscape type |
| `equipment_bookings` | 0 | 0 files | **Phase 2** — Equipment is currently tracked as columns directly on the `inspections` table. This relational approach was superseded |

---

## 8. Cleanup Recommendations (Prioritized)

### P0 - Critical (Fix Before Next Feature)

| # | Action | Risk | Effort | Details |
|---|--------|------|--------|---------|
| 1 | **Fix 5 FK constraints** pointing to `inspection_reports` | Data integrity | Low | Single migration: DROP + CREATE FK to `inspections` for: `calendar_bookings`, `invoices`, `email_logs`, `sms_logs`, `client_booking_tokens` |
| 2 | **Add `updated_at` trigger** to `inspections` table | Data integrity | Low | The active inspections table has no auto-update trigger |
| 3 | **Fix `check_booking_conflicts()`** function | Runtime error | Low | Replace `calendar_events` with `calendar_bookings` |
| 4 | **Fix `has_travel_time_conflict()`** functions (both overloads) | Runtime error | Low | Fix table reference, column name `property_suburb` → `property_address_suburb`, remove `deleted_at` reference |

### P1 - High (Fix This Sprint)

| # | Action | Risk | Effort | Details |
|---|--------|------|--------|---------|
| 5 | **Drop `inspection_reports` table** | Medium | Medium | After P0 FK migration. Remove 0-row legacy table with 8 indexes, 2 triggers, 5 RLS policies |
| 6 | **Remove 2 duplicate triggers** on `calendar_bookings` | Low | Low | Drop `update_calendar_events_updated_at` and `update_calendar_updated_at` |
| 7 | **Remove 8 duplicate indexes** | Low | Low | See Section 5.1 for full list |
| 8 | **Tighten `activities` RLS** | Security | Low | Scope SELECT to lead assignment or admin |
| 9 | **Fix `password_reset_tokens` RLS** | Security | Low | Currently `qual: true` for ALL operations. Restrict to service role or drop table (Supabase Auth handles resets) |
| 10 | **Add `search_path`** to SECURITY DEFINER functions | Security | Low | `has_role()`, `get_admin_user_ids()`, `is_admin()`, 5 `notify_*` functions |

### P2 - Medium (Plan For Next Sprint)

| # | Action | Risk | Effort | Details |
|---|--------|------|--------|---------|
| 11 | **Remove duplicate equipment columns** from `inspections` | Low | Medium | Remove either Set A (`commercial_dehumidifier_qty`, `air_movers_qty`, `rcd_box_qty`) or Set B (`dehumidifier_count`, `air_mover_count`, `rcd_count`). Requires codebase audit of which set is used |
| 12 | **Consolidate `booking_tokens` tables** | Low | Low | Merge into single table with `token_type` column |
| 13 | **Tighten `calendar_bookings` RLS** | Security | Medium | Scope to `assigned_to = auth.uid() OR is_admin()` |
| 14 | **Tighten `inspections` RLS** | Security | Medium | Scope writes to `inspector_id = auth.uid() OR is_admin()` |
| 15 | **Drop or fix `suburb_zones` functions** | Low | Low | Either create the `suburb_zones` table or drop the 2 orphaned functions |
| 16 | **Remove over-indexed tables** | Low | Low | Trim `email_logs` from 10 to 3 indexes, `sms_logs` from 7 to 3 |

### P3 - Low (Backlog)

| # | Action | Risk | Effort | Details |
|---|--------|------|--------|---------|
| 17 | **Add missing `updated_at` triggers** | Low | Low | `editable_fields`, `company_settings`, `app_settings` |
| 18 | **Fix `invoices.lead_id` CASCADE** | Low | Low | Change from NO ACTION to RESTRICT |
| 19 | **Drop `password_reset_tokens` table** | Low | Low | Supabase Auth handles this natively |
| 20 | **Clean up `leads` note columns** | Low | Medium | Clarify `notes` vs `internal_notes` vs `access_instructions` vs `special_requests` |
| 21 | **Review Phase 2 empty tables** | Low | Low | Decide: keep as schema-ready or drop and recreate later |

---

## Appendix A: Complete Table Inventory

| # | Table | Rows | Cols | RLS | Triggers | Indexes | FK In | FK Out | Frontend Refs | Status |
|---|-------|------|------|-----|----------|---------|-------|--------|---------------|--------|
| 1 | leads | 3 | 37 | Yes | 7 | 14 | 0 | 11 | 29 | Active Core |
| 2 | inspections | 2 | 95 | Yes | 0* | 12 | 3 | 9 | 18 | Active Core |
| 3 | inspection_areas | 2 | 41 | Yes | 1 | 5 | 1 | 4 | 5 | Active Core |
| 4 | calendar_bookings | 14 | 19 | Yes | 3** | 9 | 3 | 0 | 12 | Active Core |
| 5 | activities | 12 | 8 | Yes | 0 | 6 | 2 | 0 | 5 | Active Core |
| 6 | photos | 42 | 14 | Yes | 0 | 6 | 5 | 1 | 8 | Active Core |
| 7 | pdf_versions | 78 | 8 | Yes | 0 | 4 | 2 | 0 | 1 | Active Core |
| 8 | moisture_readings | 4 | 7 | Yes | 0 | 2 | 1 | 1 | 4 | Active Support |
| 9 | subfloor_data | 2 | 11 | Yes | 1 | 2 | 1 | 3 | 4 | Active Support |
| 10 | subfloor_readings | 3 | 6 | Yes | 0 | 2 | 1 | 0 | 4 | Active Support |
| 11 | profiles | 2 | 9 | Yes | 1 | 1 | 1 | 0 | 1 | Active Support |
| 12 | user_roles | 5 | 5 | Yes | 0 | 4 | 2 | 0 | 5 | Active Support |
| 13 | roles | 3 | 5 | Yes | 0 | 2 | 0 | 1 | 3 | Active Support |
| 14 | editable_fields | 12 | 11 | Yes | 0 | 3 | 0 | 0 | 1 | Active Support |
| 15 | login_activity | 59 | 18 | Yes | 0 | 5 | 1 | 1 | 2 | Active Security |
| 16 | user_devices | 6 | 13 | Yes | 0 | 4 | 1 | 1 | 2 | Active Security |
| 17 | user_sessions | 39 | 12 | Yes | 0 | 3 | 2 | 0 | 1 | Active Security |
| 18 | suspicious_activity | 6 | 11 | Yes | 0 | 3 | 2 | 0 | 1 | Active Security |
| 19 | email_logs | 5 | 19 | Yes | 1 | 10 | 2 | 0 | 0+1 fn | Active Logging |
| 20 | notifications | 36 | 15 | Yes | 1 | 8 | 1 | 0 | 2 | Active Logging |
| 21 | audit_logs | 15 | 7 | Yes | 0 | 4 | 1 | 0 | 1 | Active Logging |
| 22 | inspection_reports | 0 | 33 | Yes | 2 | 8 | 1 | 6 | 0 | LEGACY |
| 23 | invoices | 0 | 17 | Yes | 1 | 7 | 2 | 0 | 0 | Phase 2 |
| 24 | equipment | 0 | 9 | Yes | 1 | 1 | 0 | 1 | 0 | Phase 2 |
| 25 | equipment_bookings | 0 | 10 | Yes | 1 | 3 | 2 | 0 | 0 | Phase 2 |
| 26 | booking_tokens | 0 | 7 | Yes | 0 | 4 | 1 | 0 | 1 | Phase 2 |
| 27 | client_booking_tokens | 0 | 7 | Yes | 0 | 4 | 1 | 0 | 0 | Phase 2 |
| 28 | company_settings | 0 | 12 | Yes | 0 | 1 | 0 | 0 | 0 | Phase 2 |
| 29 | operating_hours | 0 | 8 | Yes | 1 | 2 | 1 | 0 | 0 | Phase 2 |
| 30 | pricing_settings | 0 | 6 | Yes | 1 | 2 | 0 | 0 | 0 | Phase 2 |
| 31 | offline_queue | 0 | 17 | Yes | 1 | 8 | 1 | 0 | 0 | Phase 2 |
| - | app_settings | 0 | 4 | Yes | 0 | 1 | 0 | 0 | 0 | Active (via fn) |
| - | sms_logs | 0 | 18 | Yes | 1 | 7 | 2 | 0 | 0 | Phase 2 |
| - | password_reset_tokens | 0 | 6 | Yes | 0 | 5 | 1 | 0 | 0 | Unnecessary |

\* `inspections` trigger is misplaced on `inspection_reports`
\** `calendar_bookings` has 3 duplicate triggers (should be 1)

---

## Appendix B: Edge Functions Inventory

| # | Function | JWT | Tables Touched | Status |
|---|----------|-----|----------------|--------|
| 1 | `generate-inspection-pdf` | No | inspections, inspection_areas, photos, moisture_readings, leads | Active |
| 2 | `generate-inspection-summary` | No | inspections, inspection_areas, photos, leads | Active |
| 3 | `generate-ai-summary` | Yes | inspections | Active |
| 4 | `modify-ai-summary` | Yes | inspections | Active |
| 5 | `send-email` | No | email_logs | Active |
| 6 | `send-slack-notification` | No | - (external API) | Active |
| 7 | `manage-users` | No | user_roles, roles | Active |
| 8 | `calculate-travel-time` | No | leads, calendar_bookings, user_roles | Active |
| 9 | `seed-admin` | Yes | profiles, user_roles, roles | Setup utility |
| 10 | `export-inspection-context` | Yes | inspections, inspection_areas, calendar_bookings, leads, photos | Active |

---

## Appendix C: Database Functions Inventory

| # | Function | Type | SECURITY DEFINER | search_path | Status |
|---|----------|------|-----------------|-------------|--------|
| 1 | `auto_generate_lead_number()` | Trigger | Yes | Yes | OK |
| 2 | `calculate_dew_point()` | Utility | No | N/A | OK |
| 3 | `calculate_gst()` | Utility | No | N/A | OK |
| 4 | `calculate_moisture_status()` | Utility | No | N/A | OK |
| 5 | `calculate_total_inc_gst()` | Utility | No | N/A | OK |
| 6 | `calculate_travel_time()` | Utility | No | N/A | OK |
| 7 | `check_booking_conflicts()` | Query | No | N/A | **BROKEN** (refs `calendar_events`) |
| 8 | `fix_auth_null_strings()` | Trigger | No | N/A | OK |
| 9 | `generate_inspection_number()` | Utility | No | N/A | OK |
| 10 | `generate_invoice_number()` | Utility | No | N/A | OK |
| 11 | `generate_lead_number()` | Utility | No | N/A | OK |
| 12 | `get_admin_user_ids()` | Query | Yes | **No** | Needs fix |
| 13 | `get_pending_sync_items()` | Query | No | N/A | OK (unused) |
| 14 | `get_suburb_details()` | Query | No | N/A | **BROKEN** (refs missing `suburb_zones`) |
| 15 | `get_user_roles_by_id()` | Query | Yes | Yes | OK |
| 16 | `get_zone_by_suburb()` | Query | No | N/A | **BROKEN** (refs missing `suburb_zones`) |
| 17 | `handle_new_user()` | Trigger | Yes | Yes | OK |
| 18 | `has_role()` | Auth | Yes | **No** | Needs fix |
| 19 | `has_travel_time_conflict(3)` | Query | No | N/A | **BROKEN** (refs `calendar_events`, wrong column) |
| 20 | `has_travel_time_conflict(3b)` | Query | No | N/A | **BROKEN** (refs non-existent `deleted_at`) |
| 21 | `is_admin()` | Auth | Yes | **No** | Needs fix (wrapper) |
| 22 | `is_admin(uuid)` | Auth | Yes | **No** | Needs fix |
| 23 | `notify_inspection_scheduled()` | Trigger | Yes | **No** | Needs fix |
| 24 | `notify_job_completed()` | Trigger | Yes | **No** | Needs fix |
| 25 | `notify_lead_created()` | Trigger | Yes | **No** | Needs fix |
| 26 | `notify_lead_status_changed()` | Trigger | Yes | **No** | Needs fix |
| 27 | `notify_payment_received()` | Trigger | Yes | **No** | Needs fix |
| 28 | `update_updated_at_column()` | Trigger | No | N/A | OK |

**Summary:** 5 broken functions, 9 functions missing `search_path` on SECURITY DEFINER.

---

*End of Technical Audit. No database changes were made during this audit.*

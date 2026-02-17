-- Migration: Fix unindexed_foreign_keys + drop unused_index warnings
-- Adds 12 missing FK indexes, drops ~17 clearly redundant indexes

-- ============================================================================
-- PART A: Add 12 missing FK indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_calendar_bookings_inspection_id
  ON public.calendar_bookings(inspection_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by
  ON public.email_logs(sent_by);

CREATE INDEX IF NOT EXISTS idx_inspection_areas_primary_photo_id
  ON public.inspection_areas(primary_photo_id);

CREATE INDEX IF NOT EXISTS idx_inspections_last_edited_by
  ON public.inspections(last_edited_by);

CREATE INDEX IF NOT EXISTS idx_inspections_pdf_approved_by
  ON public.inspections(pdf_approved_by);

CREATE INDEX IF NOT EXISTS idx_leads_created_by
  ON public.leads(created_by);

CREATE INDEX IF NOT EXISTS idx_pdf_versions_created_by
  ON public.pdf_versions(created_by);

CREATE INDEX IF NOT EXISTS idx_photos_subfloor_id
  ON public.photos(subfloor_id);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_login_activity_id
  ON public.suspicious_activity(login_activity_id);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_reviewed_by
  ON public.suspicious_activity(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by
  ON public.user_roles(assigned_by);

CREATE INDEX IF NOT EXISTS idx_user_sessions_device_id
  ON public.user_sessions(device_id);

-- ============================================================================
-- PART B: Drop ~17 clearly redundant / unused indexes
-- ============================================================================

-- email_logs: 4 indexes superseded by composites
DROP INDEX IF EXISTS public.idx_email_logs_template_name;   -- superseded by idx_email_logs_template_status
DROP INDEX IF EXISTS public.idx_email_logs_sent_at;          -- superseded by idx_email_logs_status_sent
DROP INDEX IF EXISTS public.idx_email_logs_status;           -- superseded by idx_email_logs_status_sent
DROP INDEX IF EXISTS public.idx_email_logs_recipient_email;  -- low value, rarely queried alone

-- activities: 2 low-selectivity indexes (composite idx_activities_lead_created_type covers queries)
DROP INDEX IF EXISTS public.idx_activities_type;             -- low selectivity
DROP INDEX IF EXISTS public.idx_activities_created_at;       -- superseded by composite

-- calendar_bookings: 2 indexes superseded by tech_date_status composite
DROP INDEX IF EXISTS public.idx_calendar_bookings_type;      -- low selectivity
DROP INDEX IF EXISTS public.idx_calendar_bookings_status;    -- superseded by tech_date_status

-- notifications: 2 low-value indexes (idx_notifications_user_unread covers queries)
DROP INDEX IF EXISTS public.idx_notifications_type;          -- low selectivity
DROP INDEX IF EXISTS public.idx_notifications_created_at;    -- superseded by user_unread composite

-- inspections: 4 boolean/rarely-queried partial indexes
DROP INDEX IF EXISTS public.idx_inspections_manual_override;       -- boolean partial, never queried
DROP INDEX IF EXISTS public.idx_inspections_pdf_approved;          -- boolean partial, never queried
DROP INDEX IF EXISTS public.idx_inspections_ai_summary_approved;   -- never queried
DROP INDEX IF EXISTS public.idx_inspections_ai_summary_generated_at; -- never queried

-- audit_logs: 3 indexes on tiny table (~15 rows)
DROP INDEX IF EXISTS public.idx_audit_logs_entity;           -- tiny table
DROP INDEX IF EXISTS public.idx_audit_logs_action;           -- tiny table
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;       -- tiny table

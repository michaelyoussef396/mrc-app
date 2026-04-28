-- Adds dedicated columns for customer-supplied preferred date/time so they
-- stop sharing the inspection_scheduled_date / scheduled_time columns with
-- admin-confirmed bookings (a long-running dual-purpose smell flagged P2 in
-- docs/MRC_FULL_WALKTHROUGH.html and docs/lead-detail-diagnosis.md).
--
-- Columns are nullable, no defaults — every existing row gets NULL on apply.
-- Stage 2 of the multi-stage rollout backfills new_lead rows from the legacy
-- columns, then NULLs out the source columns. hipages_lead rows are
-- intentionally NOT backfilled (admin-created leads keep their existing
-- column convention until product reviews that path separately).
--
-- Snapshot taken before this migration: leads_backup_20260428 (retained 30+ days).

ALTER TABLE leads ADD COLUMN customer_preferred_date date;
ALTER TABLE leads ADD COLUMN customer_preferred_time text;

COMMENT ON COLUMN leads.customer_preferred_date IS
  'Customer-supplied preferred inspection date from the intake form. Distinct from inspection_scheduled_date (admin-confirmed booking). Set on lead creation by receive-framer-lead Edge Function. Never overwritten by the booking flow.';

COMMENT ON COLUMN leads.customer_preferred_time IS
  'Customer-supplied preferred inspection time from the intake form, format "HH:mm". Distinct from scheduled_time (admin-confirmed booking). Set on lead creation by receive-framer-lead Edge Function. Never overwritten by the booking flow.';

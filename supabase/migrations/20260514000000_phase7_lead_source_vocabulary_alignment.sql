-- Phase 7 / BUG-011: lead_source vocabulary alignment.
-- Collapses 21 Title-Case + mixed-case values to canonical 8 lowercase:
--   website · hipages · google · referral · repeat · facebook · instagram · other
-- Snapshot backup retained 30 days.

BEGIN;

-- Attribute backfill rows to SYSTEM_USER_UUID so audit_log_trigger() captures
-- these changes as system-attributed rather than NULL-user writes.
SET LOCAL app.acting_user_id = 'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f';

-- Snapshot pre-backfill state for rollback reference (30-day retention).
CREATE TABLE IF NOT EXISTS leads_source_backfill_backup_20260514 AS
  SELECT id, lead_source, NOW() AS snapshot_at
  FROM leads WHERE lead_source IS NOT NULL;

-- Map to canonical values. Order matters: most-specific patterns first.
UPDATE leads SET lead_source = 'website'   WHERE lead_source ILIKE 'website%' OR lead_source ILIKE '%framer%';
UPDATE leads SET lead_source = 'google'    WHERE lead_source ILIKE '%google%';
UPDATE leads SET lead_source = 'hipages'   WHERE lead_source ILIKE '%hipages%';
UPDATE leads SET lead_source = 'facebook'  WHERE lead_source ILIKE '%facebook%';
UPDATE leads SET lead_source = 'instagram' WHERE lead_source ILIKE '%instagram%';
UPDATE leads SET lead_source = 'referral'  WHERE lead_source IN (
  'Customer Referral', 'Real Estate Agent', 'Property Manager',
  'Strata Manager', 'Insurance Company'
);
UPDATE leads SET lead_source = 'repeat'    WHERE lead_source = 'Repeat Customer';
-- Catch-all: anything non-null that still isn't one of the 8 canonical values becomes 'other'.
UPDATE leads SET lead_source = 'other'
  WHERE lead_source IS NOT NULL
    AND lead_source NOT IN ('website', 'hipages', 'google', 'referral', 'repeat', 'facebook', 'instagram', 'other');

COMMIT;

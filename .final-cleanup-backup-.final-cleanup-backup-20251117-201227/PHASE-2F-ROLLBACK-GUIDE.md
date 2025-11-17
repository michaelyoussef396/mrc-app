# Phase 2F: Migration Rollback Guide

**Version:** 1.0
**Date:** 2025-11-11
**Purpose:** Emergency rollback procedures for schema alignment migrations

---

## Emergency Contact

**If migrations fail during execution, immediately:**

1. **STOP** - Do not continue with application deployment
2. **NOTIFY** - Alert technical lead and stakeholders
3. **ASSESS** - Determine which migration failed
4. **ROLLBACK** - Follow procedures below
5. **REDEPLOY** - Restore previous application version

---

## Quick Reference: Rollback Order

**Migrations MUST be rolled back in reverse order:**

```
19 → 18 → 17 → 16
```

**Do NOT skip migrations in rollback sequence.**

---

## Rollback Decision Matrix

### When to Rollback

| Scenario | Rollback Required | Migrations to Rollback |
|----------|------------------|----------------------|
| Migration 016 fails (table rename) | YES - CRITICAL | None (auto-rollback) |
| Migration 017 fails (constraints) | YES - CRITICAL | None (auto-rollback) |
| Migration 018 fails (index cleanup) | YES | None (auto-rollback) |
| Migration 019 fails (new indexes) | YES | None (auto-rollback) |
| Application doesn't load after migration | YES - CRITICAL | 19 → 18 → 17 → 16 |
| Queries 20%+ slower after migration | YES | 19 only (test first) |
| Constraint violations occurring | YES | 17 only (test first) |
| Index usage low after 48 hours | MAYBE | 19 only (review first) |
| Write performance degraded | MAYBE | 18 → 19 (review first) |

### When NOT to Rollback

- Minor performance fluctuations (<10%)
- Single isolated error (investigate first)
- User reports unrelated to database
- Cosmetic issues in UI

---

## Rollback Procedures

### Rollback Migration 019: Composite Indexes

**Reason:** Query performance didn't improve OR write performance degraded

**Risk Level:** LOW (safe rollback, no data loss)

**Duration:** 2-3 minutes

#### Steps

1. **Connect to database:**
```bash
# Via Supabase CLI
supabase db remote --db-url <connection-string>

# Or via psql
psql -h <supabase-host> -U postgres -d postgres
```

2. **Run rollback script:**
```sql
BEGIN;

-- Drop all composite indexes created in Migration 019
DROP INDEX IF EXISTS public.idx_leads_status_assigned_created;
DROP INDEX IF EXISTS public.idx_leads_customer_email_phone;
DROP INDEX IF EXISTS public.idx_leads_inspection_scheduled;
DROP INDEX IF EXISTS public.idx_leads_job_scheduled;

DROP INDEX IF EXISTS public.idx_inspection_reports_tech_status_created;
DROP INDEX IF EXISTS public.idx_inspection_reports_lead_created;

DROP INDEX IF EXISTS public.idx_calendar_bookings_active;
DROP INDEX IF EXISTS public.idx_calendar_bookings_tech_date_status;
DROP INDEX IF EXISTS public.idx_calendar_bookings_lead_start;

DROP INDEX IF EXISTS public.idx_email_logs_lead_status_sent;
DROP INDEX IF EXISTS public.idx_email_logs_status_sent;
DROP INDEX IF EXISTS public.idx_email_logs_template_status;

DROP INDEX IF EXISTS public.idx_offline_queue_sync_processing;
DROP INDEX IF EXISTS public.idx_offline_queue_conflicts;

DROP INDEX IF EXISTS public.idx_activities_lead_created_type;
DROP INDEX IF EXISTS public.idx_activities_user_created;

DROP INDEX IF EXISTS public.idx_suburb_zones_suburb_lower;
DROP INDEX IF EXISTS public.idx_suburb_zones_postcode_zone;

COMMIT;
```

3. **Verify rollback:**
```sql
-- Check that composite indexes are gone
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_leads_status_assigned_created',
    'idx_inspection_reports_tech_status_created',
    'idx_calendar_bookings_active'
  );
-- Should return 0 rows
```

4. **Test application:**
- Dashboard loads normally
- Queries still work (may be slower)
- No errors in console

**Note:** Application continues to work, just queries may be slower. This is a safe rollback.

---

### Rollback Migration 018: Index Cleanup

**Reason:** Write performance didn't improve OR queries became slower

**Risk Level:** LOW (safe rollback, recreates indexes)

**Duration:** 2-3 minutes

#### Steps

1. **Connect to database** (as above)

2. **Run rollback script:**
```sql
BEGIN;

-- Recreate duplicate indexes that were dropped

-- leads table
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);

-- activities table
CREATE INDEX IF NOT EXISTS idx_activities_lead ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON public.activities(created_at);

COMMIT;
```

3. **Verify rollback:**
```sql
-- Check that duplicate indexes exist again
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('idx_leads_assigned', 'idx_activities_lead', 'idx_activities_created');
-- Should return 3 rows
```

4. **Analyze tables:**
```sql
ANALYZE public.leads;
ANALYZE public.activities;
```

**Warning:** This recreates duplicate indexes, which means slower INSERT/UPDATE. Only rollback if queries broke.

---

### Rollback Migration 017: Constraints

**Reason:** Constraint violations occurring OR application errors

**Risk Level:** MEDIUM (allows invalid data after rollback)

**Duration:** 3-5 minutes

#### Steps

1. **Connect to database** (as above)

2. **Run rollback script:**
```sql
BEGIN;

-- Remove NOT NULL constraints
ALTER TABLE inspection_reports ALTER COLUMN inspector_id DROP NOT NULL;
ALTER TABLE inspection_reports ALTER COLUMN inspection_date DROP NOT NULL;
ALTER TABLE inspection_reports ALTER COLUMN job_number DROP NOT NULL;

ALTER TABLE calendar_bookings ALTER COLUMN assigned_to DROP NOT NULL;
ALTER TABLE calendar_bookings ALTER COLUMN start_datetime DROP NOT NULL;
ALTER TABLE calendar_bookings ALTER COLUMN end_datetime DROP NOT NULL;

ALTER TABLE email_logs ALTER COLUMN recipient_email DROP NOT NULL;
ALTER TABLE email_logs ALTER COLUMN subject DROP NOT NULL;
ALTER TABLE email_logs ALTER COLUMN template_name DROP NOT NULL;

-- Only if sms_logs table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_logs') THEN
    ALTER TABLE sms_logs ALTER COLUMN recipient_phone DROP NOT NULL;
    ALTER TABLE sms_logs ALTER COLUMN message DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE offline_queue ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE offline_queue ALTER COLUMN action_type DROP NOT NULL;
ALTER TABLE offline_queue ALTER COLUMN table_name DROP NOT NULL;
ALTER TABLE offline_queue ALTER COLUMN payload DROP NOT NULL;

-- Remove CHECK constraints
ALTER TABLE calendar_bookings DROP CONSTRAINT IF EXISTS calendar_bookings_time_order_check;
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_valid_email_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_property_zone_check;
ALTER TABLE pricing_settings DROP CONSTRAINT IF EXISTS pricing_settings_positive_rates_check;
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_positive_rate_check;

-- Remove DEFAULT values
ALTER TABLE inspection_reports ALTER COLUMN inspection_date DROP DEFAULT;
ALTER TABLE calendar_bookings ALTER COLUMN status DROP DEFAULT;
ALTER TABLE offline_queue ALTER COLUMN status DROP DEFAULT;
ALTER TABLE offline_queue ALTER COLUMN sync_attempts DROP DEFAULT;

COMMIT;
```

3. **Verify rollback:**
```sql
-- Check that constraints are removed
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_name IN (
    'calendar_bookings_time_order_check',
    'email_logs_valid_email_check',
    'leads_property_zone_check'
  );
-- Should return 0 rows
```

4. **Test application:**
- Forms submit without constraint errors
- No validation errors in logs

**CRITICAL WARNING:** After this rollback, invalid data can be inserted. Monitor data quality closely.

---

### Rollback Migration 016: Table Renames

**Reason:** Application broken, cannot load pages

**Risk Level:** HIGH (requires application code rollback too)

**Duration:** 5-10 minutes (database + application)

#### Steps

**PART 1: Database Rollback**

1. **Connect to database** (as above)

2. **Run rollback script:**
```sql
BEGIN;

-- ====================================================================
-- Rollback calendar_bookings → calendar_events
-- ====================================================================

ALTER TABLE public.calendar_bookings DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "technicians_view_own_bookings" ON public.calendar_bookings;
DROP POLICY IF EXISTS "admins_view_all_bookings" ON public.calendar_bookings;
DROP POLICY IF EXISTS "admins_insert_bookings" ON public.calendar_bookings;
DROP POLICY IF EXISTS "admins_update_bookings" ON public.calendar_bookings;
DROP POLICY IF EXISTS "admins_delete_bookings" ON public.calendar_bookings;

-- Rename table back
ALTER TABLE public.calendar_bookings RENAME TO calendar_events;

-- Rename indexes back
ALTER INDEX IF EXISTS calendar_bookings_pkey RENAME TO calendar_events_pkey;
ALTER INDEX IF EXISTS idx_calendar_bookings_technician_id RENAME TO idx_calendar_events_assigned_to;
ALTER INDEX IF EXISTS idx_calendar_bookings_start_time RENAME TO idx_calendar_events_start;
ALTER INDEX IF EXISTS idx_calendar_bookings_end_time RENAME TO idx_calendar_events_end;
ALTER INDEX IF EXISTS idx_calendar_bookings_status RENAME TO idx_calendar_events_status;
ALTER INDEX IF EXISTS idx_calendar_bookings_type RENAME TO idx_calendar_events_type;
ALTER INDEX IF EXISTS idx_calendar_bookings_lead_id RENAME TO idx_calendar_events_lead_id;
ALTER INDEX IF EXISTS idx_calendar_bookings_inspection_id RENAME TO idx_calendar_events_inspection_id;
ALTER INDEX IF EXISTS idx_calendar_bookings_technician_time RENAME TO idx_calendar_events_technician_time;
ALTER INDEX IF EXISTS idx_calendar_bookings_tech_end_time RENAME TO idx_calendar_events_tech_end_time;

-- Recreate original policies (basic set)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians view own events"
  ON public.calendar_events FOR SELECT
  USING (auth.uid() = assigned_to);

CREATE POLICY "Admins view all events"
  ON public.calendar_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ====================================================================
-- Rollback inspection_reports → inspections
-- ====================================================================

ALTER TABLE public.inspection_reports DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "technicians_view_own_reports" ON public.inspection_reports;
DROP POLICY IF EXISTS "admins_view_all_reports" ON public.inspection_reports;
DROP POLICY IF EXISTS "technicians_insert_reports" ON public.inspection_reports;
DROP POLICY IF EXISTS "technicians_update_own_reports" ON public.inspection_reports;
DROP POLICY IF EXISTS "admins_manage_all_reports" ON public.inspection_reports;

-- Rename table back
ALTER TABLE public.inspection_reports RENAME TO inspections;

-- Rename indexes back
ALTER INDEX IF EXISTS inspection_reports_pkey RENAME TO inspections_pkey;
ALTER INDEX IF EXISTS inspection_reports_job_number_key RENAME TO inspections_job_number_key;
ALTER INDEX IF EXISTS idx_inspection_reports_lead_id RENAME TO idx_inspections_lead_id;
ALTER INDEX IF EXISTS idx_inspection_reports_technician_id RENAME TO idx_inspections_inspector_id;
ALTER INDEX IF EXISTS idx_inspection_reports_inspection_date RENAME TO idx_inspections_date;
ALTER INDEX IF EXISTS idx_inspection_reports_created_at RENAME TO idx_inspections_created_at;
ALTER INDEX IF EXISTS idx_inspection_reports_job_number RENAME TO idx_inspections_job_number;
ALTER INDEX IF EXISTS idx_inspection_reports_report_status RENAME TO idx_inspections_status;

-- Recreate original policies (basic set)
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inspectors view own inspections"
  ON public.inspections FOR SELECT
  USING (auth.uid() = inspector_id);

CREATE POLICY "Admins view all inspections"
  ON public.inspections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

COMMIT;
```

3. **Verify database rollback:**
```sql
-- Check old table names exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('inspections', 'calendar_events');
-- Should return 2 rows

-- Check new table names don't exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('inspection_reports', 'calendar_bookings');
-- Should return 0 rows
```

**PART 2: Application Code Rollback**

4. **Revert application code changes:**
```bash
# Option A: Git revert (if changes were committed)
git log --oneline -10  # Find commit hash before migration
git revert <commit-hash>
git push

# Option B: Git reset (if changes not pushed yet)
git reset --hard <commit-hash-before-migration>
git push --force

# Option C: Manually undo changes
# - Rename inspection-reports.ts back to inspections.ts
# - Change all .from('inspection_reports') → .from('inspections')
# - Change all .from('calendar_bookings') → .from('calendar_events')
```

5. **Regenerate old TypeScript types:**
```bash
supabase gen types typescript --local > src/types/database.types.ts
```

6. **Rebuild and redeploy:**
```bash
npm run build
npm run deploy  # or vercel --prod
```

7. **Verify application works:**
- Login successful
- Dashboard loads
- Inspection form works
- Calendar loads

**CRITICAL:** Both database AND application must be rolled back together. One without the other will cause errors.

---

## Post-Rollback Actions

### After Rolling Back Migration 019 (Composite Indexes)

**Immediate:**
- [ ] Document why rollback was necessary
- [ ] Run EXPLAIN ANALYZE on slow queries
- [ ] Identify which queries need optimization
- [ ] Create new migration with better indexes

**Within 24 hours:**
- [ ] Analyze query patterns with pg_stat_statements
- [ ] Review application logs for query errors
- [ ] Consider alternative indexing strategy

### After Rolling Back Migration 018 (Index Cleanup)

**Immediate:**
- [ ] Verify write performance improved
- [ ] Check if specific queries broke
- [ ] Document which queries need the duplicate indexes

**Within 24 hours:**
- [ ] Analyze actual index usage with pg_stat_user_indexes
- [ ] Determine which duplicates are actually needed
- [ ] Update migration to keep necessary duplicates

### After Rolling Back Migration 017 (Constraints)

**Immediate:**
- [ ] Identify why constraints failed
- [ ] Check for NULL values in affected columns
- [ ] Clean up invalid data
- [ ] Document data quality issues

**Within 48 hours:**
- [ ] Fix data quality at application level
- [ ] Add proper validation in forms
- [ ] Re-attempt constraint migration with cleaned data

**CRITICAL:** Monitor data quality closely. Invalid data can now be inserted.

### After Rolling Back Migration 016 (Table Renames)

**Immediate:**
- [ ] Verify application fully functional
- [ ] Document why rename caused issues
- [ ] Review all code references to tables
- [ ] Update documentation to reflect current state

**Within 1 week:**
- [ ] Create comprehensive test suite for table rename
- [ ] Test migration on exact copy of production data
- [ ] Update application code more carefully
- [ ] Schedule new migration attempt with better testing

---

## Troubleshooting

### Problem: "Relation does not exist" errors

**Symptoms:** Application shows errors like "relation 'inspection_reports' does not exist"

**Diagnosis:**
```sql
-- Check which table name exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('inspections', 'inspection_reports', 'calendar_events', 'calendar_bookings');
```

**Solution:**
- If old names exist → Application code not updated, redeploy with correct table names
- If new names exist → Database rolled back, application needs rollback too
- If neither exist → Major error, restore from backup

### Problem: Constraint violation errors

**Symptoms:** Application errors like "violates not-null constraint"

**Diagnosis:**
```sql
-- Check which constraints exist
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type IN ('CHECK', 'NOT NULL')
ORDER BY table_name, constraint_name;
```

**Solution:**
- If constraints exist → Rollback Migration 017 to allow NULL values
- If constraints don't exist → Application sending invalid data, fix validation

### Problem: Slow queries after migration

**Symptoms:** Dashboard takes 2-3 seconds to load (was <1 second before)

**Diagnosis:**
```sql
-- Check which indexes are being used
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;
```

**Solution:**
- If idx_scan = 0 for new indexes → Indexes not being used, review query patterns
- If idx_scan > 0 but queries slow → Indexes wrong columns, rollback Migration 019
- Run EXPLAIN ANALYZE on slow queries to see actual execution plan

### Problem: Write operations slow after migration

**Symptoms:** Form submissions take 2-3 seconds (was instant before)

**Diagnosis:**
```sql
-- Check total number of indexes per table
SELECT
  tablename,
  COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY index_count DESC;
```

**Solution:**
- If index_count > 15 per table → Too many indexes, rollback Migrations 18 + 19
- Check if duplicate indexes were NOT removed → Rollback Migration 18

### Problem: Foreign key constraint errors

**Symptoms:** "violates foreign key constraint" errors

**Diagnosis:**
```sql
-- Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

**Solution:**
- Check if foreign keys reference old table names
- Rollback Migration 016 and update all foreign keys properly

---

## Emergency Backup Restore

### When to Restore from Backup

**Only if:**
- Multiple rollback attempts failed
- Data corruption detected
- Foreign key constraints broken
- Irreversible errors occurred

**Before restoring:**
- [ ] Document all errors thoroughly
- [ ] Export current state for analysis
- [ ] Notify all stakeholders
- [ ] Schedule extended downtime

### Supabase Backup Restore Procedure

1. **Via Supabase Dashboard:**
   - Go to Database → Backups
   - Select backup from before migration (should be < 24 hours old)
   - Click "Restore" and confirm

2. **Via CLI:**
```bash
# List available backups
supabase db backups list

# Restore specific backup
supabase db backups restore <backup-id>
```

3. **Verify restore:**
```sql
-- Check table names
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check data integrity
SELECT COUNT(*) FROM leads;
SELECT COUNT(*) FROM inspections;  -- or inspection_reports
SELECT COUNT(*) FROM calendar_events;  -- or calendar_bookings
```

4. **Redeploy previous application version:**
```bash
# Deploy last known good version
git checkout <last-good-commit>
npm run build
npm run deploy
```

---

## Rollback Verification Checklist

### After Any Rollback

- [ ] Database connection successful
- [ ] Application loads without errors
- [ ] Critical workflows function:
  - [ ] Login/logout
  - [ ] Dashboard
  - [ ] Lead creation
  - [ ] Inspection form
  - [ ] Calendar booking
- [ ] No console errors (F12 DevTools)
- [ ] Query performance acceptable (< 1 second for key queries)
- [ ] No data loss (row counts match pre-migration)

### Specific to Migration 016 Rollback

- [ ] Old table names exist (inspections, calendar_events)
- [ ] New table names don't exist (inspection_reports, calendar_bookings)
- [ ] All foreign keys working
- [ ] Application code matches database schema
- [ ] TypeScript types regenerated correctly

### Specific to Migration 017 Rollback

- [ ] NOT NULL constraints removed
- [ ] CHECK constraints removed
- [ ] Forms submit without validation errors
- [ ] Default values removed (if needed)

### Specific to Migration 018 Rollback

- [ ] Duplicate indexes recreated
- [ ] Write performance restored
- [ ] Query performance maintained

### Specific to Migration 019 Rollback

- [ ] Composite indexes removed
- [ ] Query performance measured
- [ ] Application still functional (may be slower)

---

## Lessons Learned Template

**After any rollback, document:**

### What Went Wrong

- [ ] Which migration failed?
- [ ] What was the error message?
- [ ] When did the error occur? (during migration or after deployment)
- [ ] What was the impact? (broken application, slow queries, data errors)

### Root Cause

- [ ] Was it a code error?
- [ ] Was it a data issue?
- [ ] Was it a schema incompatibility?
- [ ] Was it a performance issue?

### How We Fixed It

- [ ] Which rollback procedure was used?
- [ ] How long did rollback take?
- [ ] Were there any complications?

### Prevention for Next Time

- [ ] What testing was missing?
- [ ] What should we test differently?
- [ ] What should be in the migration checklist?
- [ ] What documentation should be updated?

---

## Reference: Migration File Locations

```
/Users/michaelyoussef/MRC_MAIN/mrc-app/supabase/migrations/
├── 20251111000016_rename_tables_to_match_spec.sql
├── 20251111000017_add_missing_constraints.sql
├── 20251111000018_remove_duplicate_indexes.sql
└── 20251111000019_add_missing_composite_indexes.sql
```

Each file contains its own rollback script at the bottom (in comments).

---

## Support Contacts

**Technical Lead:** [Name] - [Phone] - [Email]
**Database Admin:** [Name] - [Phone] - [Email]
**Supabase Support:** support@supabase.com
**Emergency Escalation:** [Management contact]

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-11 | Initial rollback guide | Claude SQL Expert |

---

**REMEMBER:** When in doubt, rollback. It's safer to rollback and retry than to leave a broken system in production.

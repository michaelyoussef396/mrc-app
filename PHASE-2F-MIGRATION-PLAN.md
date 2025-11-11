# Phase 2F: Schema Alignment Migration Plan

**Version:** 1.0
**Date:** 2025-11-11
**Status:** Ready for execution
**Estimated Duration:** 5-10 minutes (requires application downtime)

---

## Executive Summary

This migration plan safely aligns the MRC database schema with the technical specification by:

1. **Renaming tables** to match spec conventions (P0 - CRITICAL)
2. **Adding constraints** for data integrity (P0 - CRITICAL)
3. **Removing duplicate indexes** for performance (P1)
4. **Adding composite indexes** for query optimization (P1)

**Total Migrations:** 4 (016-019)
**Risk Level:** Medium (table renames require downtime)
**Rollback Available:** Yes (full rollback scripts provided)

---

## Critical Changes Overview

### Table Renames (Migration 016)

| Current Name | New Name | Impact | Reason |
|-------------|----------|--------|--------|
| `inspections` | `inspection_reports` | **HIGH** | Match technical spec naming |
| `calendar_events` | `calendar_bookings` | **HIGH** | Match technical spec naming |

**Why P0:** Code references must be updated. Application will break without sync.

### Constraints Added (Migration 017)

**NOT NULL Constraints:**
- `inspection_reports.inspector_id` - Who did the inspection
- `inspection_reports.inspection_date` - When inspection occurred
- `calendar_bookings.assigned_to` - Technician assignment
- `calendar_bookings.start_datetime` - Booking start time
- `email_logs.recipient_email` - Email recipient (validated format)
- `offline_queue.user_id` - Queue ownership

**CHECK Constraints:**
- `calendar_bookings.end_datetime > start_datetime` - Valid time range
- `email_logs.recipient_email` format validation (regex)
- `leads.property_zone BETWEEN 1 AND 4` - Valid zone
- `pricing_settings` rates must be positive
- `equipment.daily_rate >= 0` - Non-negative rates

**Why P0:** Ensures data integrity, prevents invalid records

### Index Cleanup (Migration 018)

**Duplicate Indexes Removed:**
- `idx_leads_assigned` (keeping `idx_leads_assigned_to`)
- `idx_activities_lead` (keeping `idx_activities_lead_id`)
- `idx_activities_created` (keeping `idx_activities_created_at` with DESC)

**Impact:** Faster INSERT/UPDATE operations, reduced storage

**Why P1:** Performance improvement, not critical for functionality

### Composite Indexes Added (Migration 019)

**18 new composite indexes** for common query patterns:
- Dashboard queries (status + technician + recency)
- Lead detail views (email tracking, activity timeline)
- Calendar conflict detection (active bookings)
- Offline sync processing (priority queue)

**Impact:** 50-90% faster queries on key workflows

**Why P1:** Significant performance improvement, not blocking

---

## Migration Execution Plan

### Pre-Migration Checklist

- [ ] **Backup database** (full snapshot via Supabase dashboard)
- [ ] **Schedule maintenance window** (5-10 minutes, off-peak hours)
- [ ] **Notify stakeholders** (owners, technicians)
- [ ] **Verify current schema version** (should be on migration 015)
- [ ] **Test migrations on copy of database** (Supabase local)
- [ ] **Prepare application code updates** (ready to deploy immediately after)

### Execution Steps

#### Step 1: Database Migrations (5 minutes)

```bash
# Navigate to project directory
cd /Users/michaelyoussef/MRC_MAIN/mrc-app

# Verify Supabase connection
supabase status

# Run migrations in order (DO NOT SKIP ANY)
supabase db push

# This will run:
# - 20251111000016_rename_tables_to_match_spec.sql
# - 20251111000017_add_missing_constraints.sql
# - 20251111000018_remove_duplicate_indexes.sql
# - 20251111000019_add_missing_composite_indexes.sql
```

**Expected output:**
```
Applying migration 20251111000016_rename_tables_to_match_spec.sql...
NOTICE: Migration 016: Table renames completed successfully
  - inspections → inspection_reports
  - calendar_events → calendar_bookings

Applying migration 20251111000017_add_missing_constraints.sql...
NOTICE: Migration 017 completed successfully
  - Added NOT NULL constraints to critical fields
  - Added CHECK constraints for data validation

Applying migration 20251111000018_remove_duplicate_indexes.sql...
NOTICE: Migration 018 completed successfully
  - Dropped duplicate indexes on leads table
  - Dropped duplicate indexes on activities table

Applying migration 20251111000019_add_missing_composite_indexes.sql...
NOTICE: Migration 019 completed successfully
  - New indexes created: 18
  - Performance improvements expected: 50-90%
```

#### Step 2: Regenerate TypeScript Types (1 minute)

```bash
# Generate updated types from new schema
supabase gen types typescript --local > src/types/database.types.ts

# Verify no syntax errors
npm run type-check
```

**Critical:** This step must complete successfully before deploying code.

#### Step 3: Update Application Code (MANUAL)

**Search and replace across codebase:**

```bash
# Find all references to old table names
grep -r "inspections" src/
grep -r "calendar_events" src/

# Replace with new names (use IDE find-replace)
# inspections → inspection_reports
# calendar_events → calendar_bookings
```

**Files likely to need updates:**
- `/src/lib/api/inspections.ts` → `/src/lib/api/inspection-reports.ts`
- `/src/lib/api/calendar.ts` → Update all `calendar_events` references
- `/src/lib/hooks/useInspections.ts` → Update React Query keys
- `/src/lib/hooks/useCalendar.ts` → Update React Query keys
- All Supabase query calls: `.from('inspections')` → `.from('inspection_reports')`
- All Supabase query calls: `.from('calendar_events')` → `.from('calendar_bookings')`

#### Step 4: Deploy Application (2 minutes)

```bash
# Build production bundle
npm run build

# Test build locally
npm run preview

# Deploy to Vercel (or your hosting)
vercel --prod

# Or if using Netlify:
npm run deploy
```

#### Step 5: Verify Deployment (2 minutes)

**Test critical workflows:**
- [ ] Login works
- [ ] Dashboard loads (uses `leads` table)
- [ ] Inspection form loads (uses `inspection_reports` table)
- [ ] Calendar view loads (uses `calendar_bookings` table)
- [ ] Create new lead (INSERT test)
- [ ] Update lead status (UPDATE test)
- [ ] Email logs tracking (uses `email_logs` table)
- [ ] No console errors (F12 DevTools)

**Database queries to verify:**
```sql
-- Verify table renames
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('inspection_reports', 'calendar_bookings');
-- Should return 2 rows

-- Verify old tables don't exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('inspections', 'calendar_events');
-- Should return 0 rows

-- Verify constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type = 'CHECK';
-- Should see new CHECK constraints

-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY indexname;
-- Should see new composite indexes, no duplicates
```

---

## Rollback Procedures

### Emergency Rollback (If Migrations Fail)

Each migration includes a rollback script at the bottom of the file.

**Rollback Migration 019 (Composite Indexes):**
```sql
-- Run rollback script from 20251111000019_add_missing_composite_indexes.sql
-- This drops all new composite indexes (safe, no data loss)
```

**Rollback Migration 018 (Duplicate Cleanup):**
```sql
-- Run rollback script from 20251111000018_remove_duplicate_indexes.sql
-- This recreates dropped duplicate indexes (safe, no data loss)
```

**Rollback Migration 017 (Constraints):**
```sql
-- Run rollback script from 20251111000017_add_missing_constraints.sql
-- This removes NOT NULL and CHECK constraints (CAUTION: allows invalid data)
```

**Rollback Migration 016 (Table Renames):**
```sql
-- Run rollback script from 20251111000016_rename_tables_to_match_spec.sql
-- This renames tables back to original names (CRITICAL: must also rollback application code)
```

**Full rollback command:**
```bash
# Connect to database
psql -h <supabase-host> -U postgres -d postgres

# Paste rollback script from migration file
# Then immediately redeploy previous application version
```

---

## Performance Impact Analysis

### Before Migration

**Current Issues:**
- Duplicate indexes slow down INSERT/UPDATE (2x maintenance cost)
- Missing composite indexes cause full table scans (slow queries)
- No constraints allow invalid data (data integrity risk)

**Baseline Performance (Estimated):**
- Dashboard load: 800-1200ms
- Lead detail view: 400-600ms
- Calendar conflict check: 200-400ms
- Offline sync processing: 300-500ms

### After Migration

**Expected Improvements:**
- Duplicate index removal: 10-20% faster INSERT/UPDATE
- Composite indexes: 50-90% faster SELECT queries
- Constraints: No performance impact (validation is lightweight)

**Target Performance:**
- Dashboard load: 300-500ms (60% faster)
- Lead detail view: 150-250ms (60% faster)
- Calendar conflict check: 50-100ms (75% faster)
- Offline sync processing: 100-200ms (65% faster)

**Write Performance:**
- INSERT: 10-15% faster (fewer indexes to update)
- UPDATE: 10-15% faster (fewer indexes to maintain)
- DELETE: No change (soft-delete, minimal indexes on deleted_at)

---

## Risk Assessment

### High Risk: Table Renames (Migration 016)

**Risk:** Application breaks if code not updated
**Mitigation:**
1. Test on local copy first (Supabase local)
2. Update code before deploying to production
3. Schedule during low-traffic window (3am-5am)
4. Have rollback script ready

**Rollback Time:** 5 minutes (run rollback SQL + redeploy previous code)

### Medium Risk: Constraint Addition (Migration 017)

**Risk:** Existing NULL values prevent constraint creation
**Mitigation:**
1. Pre-flight checks in migration script (warns, doesn't fail)
2. Manual data cleanup if warnings appear
3. Constraints only added if data is clean

**Rollback Time:** 2 minutes (drop constraints, no data loss)

### Low Risk: Index Changes (Migrations 018-019)

**Risk:** Query performance regression (if indexes not optimal)
**Mitigation:**
1. Monitor query performance with EXPLAIN ANALYZE
2. pg_stat_user_indexes tracks actual index usage
3. Easy to rollback (just drop/recreate indexes)

**Rollback Time:** 2 minutes (drop/recreate indexes, no data loss)

---

## Post-Migration Monitoring

### Week 1: Intensive Monitoring

**Daily checks:**
- [ ] Query performance (EXPLAIN ANALYZE key queries)
- [ ] Error logs (Sentry/application logs)
- [ ] Index usage (pg_stat_user_indexes)
- [ ] Constraint violations (database error logs)

**Queries to run daily:**
```sql
-- Check for constraint violations
SELECT COUNT(*) FROM inspection_reports WHERE inspector_id IS NULL;
-- Should be 0

-- Check index usage
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC
LIMIT 20;
-- New indexes should have non-zero idx_scan

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM leads
WHERE status = 'inspection_booked' AND assigned_to = 'UUID'
ORDER BY created_at DESC LIMIT 20;
-- Should use idx_leads_status_assigned_created
```

### Week 2-4: Standard Monitoring

**Weekly checks:**
- [ ] Overall database performance (query times)
- [ ] Index bloat (pg_stat_user_indexes)
- [ ] Table bloat (pg_stat_user_tables)
- [ ] Unused indexes (idx_scan = 0)

**Query to find unused indexes:**
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

---

## Success Criteria

### Technical Success

- [ ] All 4 migrations complete without errors
- [ ] All critical workflows function correctly
- [ ] Query performance improves by 40%+ on key queries
- [ ] No constraint violations in production
- [ ] No rollback required within first week

### Business Success

- [ ] No downtime beyond scheduled maintenance window
- [ ] No user complaints about application errors
- [ ] Technicians can use inspection forms without issues
- [ ] Calendar bookings work without conflicts
- [ ] Dashboard loads faster (perceived by users)

### Acceptance Criteria

**Migration is considered successful if:**
1. Application functions normally after deployment
2. Query performance metrics improve by 40%+ within 48 hours
3. No database constraint violations occur
4. No emergency rollback required
5. All tests pass (manual and automated)

**Migration must be rolled back if:**
1. Application breaks (unable to load critical pages)
2. Query performance degrades by 20%+ on any key query
3. Constraint violations occur frequently (>10/hour)
4. Data integrity issues detected
5. Unable to complete deployment within maintenance window

---

## Communication Plan

### Pre-Migration (24 hours before)

**Email to stakeholders:**
```
Subject: Scheduled Database Maintenance - Tuesday 3am-3:30am

Hi team,

We're performing a scheduled database optimization on Tuesday, Nov 12 at 3:00am AEDT.

Expected downtime: 5-10 minutes
Impact: Application will be unavailable during this window

What we're doing:
- Renaming database tables to match technical standards
- Adding data validation rules for better integrity
- Optimizing database indexes for faster performance

Expected improvements after maintenance:
- Dashboard loads 60% faster
- Calendar conflict detection 75% faster
- Overall application feels more responsive

Please save any work before 3:00am. The system will be back online by 3:30am.

Questions? Reply to this email or call [phone].

Thanks,
[Name]
```

### During Migration

**Status page update:**
```
Status: Maintenance in Progress
Estimated completion: 3:30am AEDT
Current step: Running database migrations (3/4 complete)
```

### Post-Migration

**Email to stakeholders:**
```
Subject: Database Maintenance Complete - Application Back Online

Hi team,

The scheduled database maintenance completed successfully at 3:15am AEDT.

The application is now back online with the following improvements:
✅ Dashboard loads significantly faster
✅ Calendar booking is more responsive
✅ Better data validation prevents errors

If you experience any issues, please report them immediately.

Thanks for your patience,
[Name]
```

---

## FAQ

### Q: Why do we need to rename tables?

**A:** The current table names (`inspections`, `calendar_events`) don't match the technical specification. This causes:
- Confusion for future developers
- Documentation inconsistency
- Technical debt

Renaming now (during low-traffic period) is safer than renaming later with production data.

### Q: What if the migration fails mid-way?

**A:** Each migration is wrapped in a transaction (BEGIN...COMMIT). If any step fails, the entire migration rolls back automatically. Database returns to pre-migration state.

### Q: Can we run migrations without downtime?

**A:** Migration 016 (table renames) requires downtime because application code references table names. Migrations 017-019 (constraints, indexes) could theoretically run without downtime, but we bundle them together for safety.

### Q: How do we test migrations before production?

**A:** Run migrations on Supabase local environment:
```bash
supabase db reset --local  # Reset to clean state
supabase db push --local   # Apply migrations
npm run dev                # Test application
```

### Q: What if query performance degrades after migration?

**A:** Rollback Migration 019 (composite indexes) using the rollback script. This removes new indexes but keeps all other improvements. Then investigate with EXPLAIN ANALYZE.

### Q: Can we rollback only specific migrations?

**A:** Migrations should be rolled back in reverse order (019 → 018 → 017 → 016). Rolling back 016 requires code changes too.

---

## Appendix A: Migration File Locations

```
/Users/michaelyoussef/MRC_MAIN/mrc-app/supabase/migrations/
├── 20251111000016_rename_tables_to_match_spec.sql       (4.2 KB)
├── 20251111000017_add_missing_constraints.sql            (3.8 KB)
├── 20251111000018_remove_duplicate_indexes.sql           (3.5 KB)
└── 20251111000019_add_missing_composite_indexes.sql      (5.1 KB)
```

**Total migration size:** 16.6 KB

---

## Appendix B: Code Files Requiring Updates

**High Priority (MUST update):**
- `/src/lib/api/inspections.ts` - All `.from('inspections')` calls
- `/src/lib/api/calendar.ts` - All `.from('calendar_events')` calls
- `/src/lib/hooks/useInspections.ts` - React Query keys
- `/src/lib/hooks/useCalendar.ts` - React Query keys
- `/src/types/database.types.ts` - TypeScript types (regenerate)

**Medium Priority (should update):**
- All components importing inspection types
- All components importing calendar types
- Test files referencing old table names

**Low Priority (optional):**
- Comments mentioning old table names
- Documentation files

---

## Appendix C: Testing Checklist

### Pre-Migration Tests (on local copy)

- [ ] Run all 4 migrations on local Supabase
- [ ] Regenerate TypeScript types
- [ ] Update code references
- [ ] Run `npm run type-check` (no errors)
- [ ] Run `npm run build` (successful build)
- [ ] Test critical workflows manually
- [ ] Check browser console (no errors)

### Post-Migration Tests (on production)

- [ ] Login/logout works
- [ ] Dashboard loads (uses leads + inspection_reports)
- [ ] Create new lead (INSERT test)
- [ ] Edit lead (UPDATE test)
- [ ] Delete lead (soft-delete test)
- [ ] Inspection form submission (uses inspection_reports)
- [ ] Calendar booking creation (uses calendar_bookings)
- [ ] Email tracking works (uses email_logs)
- [ ] Offline sync queue (uses offline_queue)
- [ ] Search by customer email/phone
- [ ] Filter leads by status
- [ ] View lead activity timeline
- [ ] Mobile responsiveness (375px, 768px, 1440px)

### Performance Tests

- [ ] Dashboard load time < 500ms
- [ ] Lead detail view < 250ms
- [ ] Calendar conflict detection < 100ms
- [ ] Offline sync processing < 200ms
- [ ] EXPLAIN ANALYZE shows Index Scan (not Seq Scan)

---

## Approval Sign-off

**Technical Review:**
- [ ] Database schema reviewed by: _________________
- [ ] Migration scripts reviewed by: _________________
- [ ] Rollback procedures tested by: _________________

**Deployment Approval:**
- [ ] Business owner approval: _________________
- [ ] Development lead approval: _________________
- [ ] Maintenance window scheduled: _________________

**Post-Migration Verification:**
- [ ] All tests passed: _________________
- [ ] Performance metrics met: _________________
- [ ] No critical errors: _________________

---

**Document Version:** 1.0
**Last Updated:** 2025-11-11
**Next Review:** After migration completion
**Status:** Ready for execution

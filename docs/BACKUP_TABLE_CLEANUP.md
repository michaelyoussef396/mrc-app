# Backup Table Cleanup Review

**Purpose:** Pre-launch review of all backup and snapshot tables in the production database,
ahead of the July 2026 cutover. This document identifies tables that are candidates for
removal to reduce the attack surface of unprotected data, shrink the schema surface area,
and clean up stale TypeScript types.

**Target database:** PROD `ecyivrxjpsmjmexqatym` (mrcsystem.com). All queries below are
SELECT-only; no DDL was executed during this investigation.

**Generated:** 2026-07-07 (read-only pass against live production DB).

---

## Security Callout

**All 15 tables have RLS completely disabled and zero policies.**

Several of these tables are backups of customer-facing tables that contain real PII:

- `leads_backup_20260428` and `leads_dead_col_drop_backup_20260513` — 16 and 19 rows of
  customer names, emails, phone numbers, and property addresses. No row-level protection.
- `leads_revert_cleanup_backup_20260429` and `leads_source_backfill_backup_20260514` —
  same schema, same exposure.
- `photos_backup_20260526` — 61 rows containing storage URLs for customer property photos.
- `photos_subfloor_snapshot_20260527` — 17 rows of photo records.
- `inspections_*` tables — inspection records including property details.

Any Supabase service-role connection or any authenticated user whose session bypasses RLS
can SELECT all rows from all 15 tables. These tables are not gated by any policy.

**Correction to investigation brief:** The brief stated that `src/integrations/supabase/types.ts`
only exposes 3 of these 15 tables. The actual finding is that all 15 backup tables are
present in types.ts (lines 293 through 2535). This means TypeScript type definitions exist
for every backup table, giving any developer writing against the Supabase client type-safe
access to these unprotected records. After the tables are dropped, types should be
regenerated (`npx supabase gen types typescript`) to remove the dead declarations.

---

## Inventory: Confirmed Table Count

Re-running the enumeration query against production on 2026-07-07 returns **15 tables** —
the same list as the earlier audit. No new backup or snapshot tables have been created since.

---

## Findings Table

| Table | Group | RLS | Policies | Rows | Last modified | Code refs | Safe to drop? |
|-------|-------|-----|----------|------|---------------|-----------|---------------|
| `calendar_bookings_revert_cleanup_backup_20260429` | revert-cleanup | DISABLED | 0 | 2 | 28 Apr 2026 (max updated\_at) | types.ts:293 only | YES |
| `inspection_areas_dead_col_drop_backup_20260513` | dead-col-drop | DISABLED | 0 | 2 | static backup — no timestamp column, never autovacuumed | types.ts:632; migration 20260513\_phase5\_dead\_column\_drop.sql:14 | YES |
| `inspection_areas_dew_point_backfill_backup` | dew-point | DISABLED | 0 | 4 | static backup — no timestamp column, never autovacuumed | types.ts:689; migration 20260514142559\_wave\_6\_1\_pr4\_dew\_point\_backfill.sql:11 | YES |
| `inspections_dead_col_drop_backup_20260513` | dead-col-drop | DISABLED | 0 | 2 | static backup — no timestamp column, never autovacuumed | types.ts:964; migration 20260513\_phase5\_dead\_column\_drop.sql:13 | YES |
| `inspections_discount_backfill_backup_20260513` | backfill | DISABLED | 0 | 2 | static backup — no timestamp column, never autovacuumed | types.ts:1036 only | YES |
| `inspections_outdoor_dew_point_backup` | dew-point | DISABLED | 0 | 3 | static backup — no timestamp column, never autovacuumed | types.ts:1054; migration 20260514142559\_wave\_6\_1\_pr4\_dew\_point\_backfill.sql:15 | YES |
| `inspections_subfloor_required_restore_backup` | restore | DISABLED | 0 | 3 | 14 May 2026 (max created\_at) | types.ts:1075; migration 20260514142528\_wave\_6\_1\_pr4\_restore\_subfloor\_required.sql:9 | YES |
| `leads_backup_20260428` | plain-backup | DISABLED | 0 | 16 | 28 Apr 2026 (max updated\_at) | types.ts:1646 only | YES |
| `leads_dead_col_drop_backup_20260513` | dead-col-drop | DISABLED | 0 | 19 | static backup — no timestamp column, never autovacuumed | types.ts:1781; migration 20260513\_phase5\_dead\_column\_drop.sql:12 | YES |
| `leads_revert_cleanup_backup_20260429` | revert-cleanup | DISABLED | 0 | 2 | 29 Apr 2026 (max updated\_at) | types.ts:1799 only | YES |
| `leads_source_backfill_backup_20260514` | backfill | DISABLED | 0 | 19 | static backup — no timestamp column, never autovacuumed | types.ts:1940; migration 20260514000000\_phase7\_lead\_source\_vocabulary\_alignment.sql:13 | YES |
| `moisture_readings_dead_col_drop_backup_20260513` | dead-col-drop | DISABLED | 0 | 4 | static backup — no timestamp column, never autovacuumed | types.ts:2056; migration 20260513\_phase5\_dead\_column\_drop.sql:16 | YES |
| `photos_backup_20260526` | plain-backup | DISABLED | 0 | 61 | 25 May 2026 21:26 UTC (max created\_at) | types.ts:2324 only | YES |
| `photos_subfloor_snapshot_20260527` | plain-backup | DISABLED | 0 | 17 | 26 May 2026 11:11 UTC (max created\_at) | types.ts:2384 only | YES |
| `subfloor_data_dead_col_drop_backup_20260513` | dead-col-drop | DISABLED | 0 | 2 | static backup — no timestamp column, never autovacuumed | types.ts:2535; migration 20260513\_phase5\_dead\_column\_drop.sql:15 | YES |

**Total rows across all 15 backup tables: 158**

### Group summary

| Group | Tables | Description |
|-------|--------|-------------|
| dead-col-drop (20260513) | 5 | Pre-drop row snapshots created by `20260513_phase5_dead_column_drop.sql` before removing dead columns from leads, inspections, inspection\_areas, subfloor\_data, moisture\_readings. Migration comments note a 30-day retention period — that window has passed (>40 days as of 2026-07-07). |
| revert-cleanup (20260429) | 2 | Pre-revert snapshots of calendar\_bookings and leads taken on or around 29 Apr 2026 during the revert cleanup wave. |
| dew-point | 2 | Pre-backfill snapshots created by `wave_6_1_pr4_dew_point_backfill.sql` before populating dew point columns in inspection\_areas and inspections. Backfill has been live in production for >50 days. |
| backfill | 2 | Pre-backfill snapshots for discount percent scale fix (inspections, 20260513) and lead source vocabulary alignment (leads, 20260514). Both backfills are long since complete. |
| restore | 1 | Pre-restore snapshot of inspections taken by `wave_6_1_pr4_restore_subfloor_required.sql` before restoring the subfloor\_required column. Restore is complete. |
| plain-backup | 3 | Point-in-time snapshots: `leads_backup_20260428` (16 rows), `photos_backup_20260526` (61 rows), `photos_subfloor_snapshot_20260527` (17 rows). No associated migration CREATE found in repo — likely created directly via Supabase Studio. |

### Code reference verdict

No live application code in `src/` queries any of these 15 tables by name. The grep across all
`.ts` and `.tsx` files (excluding types.ts) returned zero hits for any backup table identifier.
No edge function under `supabase/functions/` references them. References that exist are:

1. `src/integrations/supabase/types.ts` — type declarations only, not live queries. All 15
   tables appear here. These declarations are dead once the tables are dropped and will be
   removed when types are regenerated.
2. `supabase/migrations/*.sql` — the migrations that originally created the backup tables
   contain CREATE TABLE or documentary references. Dropping the tables does not affect
   migration history and these files should not be changed.
3. `docs/database_technical_audit.md` — documentation referencing the Phase 5 dead-column
   drop backups. This document can be updated or left as historical record.

---

## Drop Draft

**DO NOT RUN. This block is provided for review and future execution only.**

Before running these DROPs, the following conditions must be satisfied:

1. Michael provides explicit written approval.
2. A fresh database dump or table-level export has been taken and verified.
3. A final `grep -rIn "<table_name>" src/ supabase/ docs/` confirms zero new references since
   this audit (someone may have added code referencing a backup table between audit and drop).
4. Target is confirmed as DEV first; run against PROD only after DEV verification.
5. After dropping, regenerate TypeScript types:
   `npx supabase gen types typescript --project-id ecyivrxjpsmjmexqatym > src/integrations/supabase/types.ts`

```sql
-- DO NOT RUN WITHOUT EXPLICIT APPROVAL + FRESH BACKUP + RE-VERIFIED ZERO REFS
--
-- Drops all 15 backup/snapshot tables from public schema.
-- Grouped by origin for traceability.
-- Total rows removed: 158
-- RLS on all: DISABLED (0 policies)
-- Live application code references: NONE

-- BEGIN;

-- Group 1: dead-col-drop backups (Phase 5, 2026-05-13) — 31 rows
-- DROP TABLE IF EXISTS public.leads_dead_col_drop_backup_20260513;
-- DROP TABLE IF EXISTS public.inspections_dead_col_drop_backup_20260513;
-- DROP TABLE IF EXISTS public.inspection_areas_dead_col_drop_backup_20260513;
-- DROP TABLE IF EXISTS public.subfloor_data_dead_col_drop_backup_20260513;
-- DROP TABLE IF EXISTS public.moisture_readings_dead_col_drop_backup_20260513;

-- Group 2: revert-cleanup backups (2026-04-29) — 4 rows
-- DROP TABLE IF EXISTS public.calendar_bookings_revert_cleanup_backup_20260429;
-- DROP TABLE IF EXISTS public.leads_revert_cleanup_backup_20260429;

-- Group 3: dew-point backfill backups (wave_6_1_pr4, 2026-05-14) — 7 rows
-- DROP TABLE IF EXISTS public.inspection_areas_dew_point_backfill_backup;
-- DROP TABLE IF EXISTS public.inspections_outdoor_dew_point_backup;

-- Group 4: backfill snapshots (2026-05-13 and 2026-05-14) — 21 rows
-- DROP TABLE IF EXISTS public.inspections_discount_backfill_backup_20260513;
-- DROP TABLE IF EXISTS public.leads_source_backfill_backup_20260514;

-- Group 5: restore backup (wave_6_1_pr4, 2026-05-14) — 3 rows
-- DROP TABLE IF EXISTS public.inspections_subfloor_required_restore_backup;

-- Group 6: plain point-in-time backups (Studio-created) — 94 rows
-- DROP TABLE IF EXISTS public.leads_backup_20260428;
-- DROP TABLE IF EXISTS public.photos_backup_20260526;
-- DROP TABLE IF EXISTS public.photos_subfloor_snapshot_20260527;

-- COMMIT;

-- After committing, regenerate TypeScript types to remove dead declarations:
-- npx supabase gen types typescript --project-id ecyivrxjpsmjmexqatym \
--   > src/integrations/supabase/types.ts
```

---

## Post-Drop Checklist

- [ ] Michael approval received
- [ ] Fresh backup taken and verified
- [ ] Zero new code refs confirmed (`grep -rIn` across src/, supabase/, docs/)
- [ ] Drops executed against DEV (`ctppzqnysmzynkxjlzta`) first
- [ ] DEV verified clean (schema diff confirms tables absent)
- [ ] Drops executed against PROD (`ecyivrxjpsmjmexqatym`)
- [ ] TypeScript types regenerated and committed
- [ ] `docs/database_technical_audit.md` updated to remove backup table references
- [ ] This document updated to mark drops as complete

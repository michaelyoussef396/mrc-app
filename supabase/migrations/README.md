# MRC Supabase Migrations - Phase 2A & 2B

**Created:** 2025-11-11
**Status:** Ready to Apply
**Priority:** P0 - CRITICAL SECURITY & BLOCKING FEATURES

---

## 📋 Migration Files Created

This directory contains 6 migration files that implement **Phase 2A (RLS Security)** and **Phase 2B (Suburb Zones & Travel Time)**:

### Phase 2A: Critical Security Fixes (RLS)

1. **20251111000001_enable_rls_on_leads.sql**
   - Enables Row Level Security on `leads` table
   - Technicians see assigned leads only
   - Admins see all leads
   - 5 security policies

2. **20251111000002_enable_rls_on_inspections.sql**
   - Enables Row Level Security on `inspections` table
   - Technicians see own inspections only
   - Admins see all inspections
   - 5 security policies

3. **20251111000003_enable_rls_on_calendar_events.sql**
   - Enables Row Level Security on `calendar_events` table
   - All technicians view all events (conflict detection)
   - Technicians edit assigned events only
   - 5 security policies

### Phase 2B: Suburb Zones & Travel Time (Blocking Features)

4. **20251111000004_create_suburb_zones_table.sql**
   - Creates `suburb_zones` table
   - Maps Melbourne suburbs to 4 travel zones
   - Public read access, admin-only write
   - Indexed for fast lookups

5. **20251111000005_seed_suburb_zones_data.sql**
   - Seeds 126 Melbourne suburbs with zone mapping
   - Zone 1: 20 suburbs (CBD & Inner City)
   - Zone 2: 28 suburbs (Inner Suburbs, 10-15km)
   - Zone 3: 40 suburbs (Middle Suburbs, 15-30km)
   - Zone 4: 38 suburbs (Outer Suburbs, 30km+)

6. **20251111000006_create_travel_time_functions.sql**
   - `calculate_travel_time(zone_from, zone_to)` - 4×4 travel matrix
   - `get_zone_by_suburb(suburb_name)` - Zone lookup by suburb
   - `get_suburb_details(suburb_name)` - Complete suburb info

---

## 🚀 How to Apply Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym
   ```

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Apply Each Migration in Order:**

   **Step 1: Enable RLS on leads**
   - Copy contents of `20251111000001_enable_rls_on_leads.sql`
   - Paste into SQL Editor
   - Click "Run" (or Cmd+Enter)
   - Verify: "Success. No rows returned"

   **Step 2: Enable RLS on inspections**
   - Copy contents of `20251111000002_enable_rls_on_inspections.sql`
   - Paste into SQL Editor
   - Click "Run"

   **Step 3: Enable RLS on calendar_events**
   - Copy contents of `20251111000003_enable_rls_on_calendar_events.sql`
   - Paste into SQL Editor
   - Click "Run"

   **Step 4: Create suburb_zones table**
   - Copy contents of `20251111000004_create_suburb_zones_table.sql`
   - Paste into SQL Editor
   - Click "Run"

   **Step 5: Seed suburb_zones data**
   - Copy contents of `20251111000005_seed_suburb_zones_data.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Verify: "Success. 126 rows affected"

   **Step 6: Create helper functions**
   - Copy contents of `20251111000006_create_travel_time_functions.sql`
   - Paste into SQL Editor
   - Click "Run"

### Option 2: Via Supabase CLI (Advanced)

```bash
# Ensure Supabase CLI is installed and linked
supabase link --project-ref ecyivrxjpsmjmexqatym

# Apply all migrations in order
supabase db push

# Or apply individually
supabase db execute -f supabase/migrations/20251111000001_enable_rls_on_leads.sql
supabase db execute -f supabase/migrations/20251111000002_enable_rls_on_inspections.sql
supabase db execute -f supabase/migrations/20251111000003_enable_rls_on_calendar_events.sql
supabase db execute -f supabase/migrations/20251111000004_create_suburb_zones_table.sql
supabase db execute -f supabase/migrations/20251111000005_seed_suburb_zones_data.sql
supabase db execute -f supabase/migrations/20251111000006_create_travel_time_functions.sql
```

---

## ✅ Verification Checklist

After applying all migrations, verify everything is working:

### 1. Check RLS Enabled on Critical Tables

```sql
-- Run in SQL Editor
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('leads', 'inspections', 'calendar_events', 'suburb_zones')
ORDER BY tablename;

-- Expected result: All should show rls_enabled = true
```

### 2. Count RLS Policies

```sql
-- Run in SQL Editor
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('leads', 'inspections', 'calendar_events', 'suburb_zones')
GROUP BY tablename
ORDER BY tablename;

-- Expected result:
-- leads: 5 policies
-- inspections: 5 policies
-- calendar_events: 5 policies
-- suburb_zones: 2 policies
```

### 3. Verify Suburb Zones Data

```sql
-- Run in SQL Editor
SELECT
  zone,
  COUNT(*) as suburb_count
FROM suburb_zones
GROUP BY zone
ORDER BY zone;

-- Expected result:
-- Zone 1: 20 suburbs
-- Zone 2: 28 suburbs
-- Zone 3: 40 suburbs
-- Zone 4: 38 suburbs
-- TOTAL: 126 suburbs
```

### 4. Test Travel Time Functions

```sql
-- Run in SQL Editor
SELECT
  'Carlton to Mernda' as route,
  get_zone_by_suburb('Carlton') as from_zone,
  get_zone_by_suburb('Mernda') as to_zone,
  calculate_travel_time(
    get_zone_by_suburb('Carlton'),
    get_zone_by_suburb('Mernda')
  ) as travel_time_minutes;

-- Expected result: Zone 1 → Zone 4 = 60 minutes

SELECT calculate_travel_time(1, 1) as cbd_to_cbd;          -- Expected: 15
SELECT calculate_travel_time(1, 4) as cbd_to_outer;        -- Expected: 60
SELECT calculate_travel_time(3, 3) as middle_to_middle;    -- Expected: 25
```

### 5. Check Helper Functions Exist

```sql
-- Run in SQL Editor
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'calculate_travel_time',
    'get_zone_by_suburb',
    'get_suburb_details'
  )
ORDER BY routine_name;

-- Expected result: 3 functions listed
```

---

## 🎯 Success Criteria

**Phase 2A & 2B are complete when:**

✅ **Security (RLS):**
- [ ] Green shield icon visible on `leads` table in dashboard
- [ ] Green shield icon visible on `inspections` table in dashboard
- [ ] Green shield icon visible on `calendar_events` table in dashboard
- [ ] Login as technician → see assigned leads only
- [ ] Login as admin → see all leads

✅ **Suburb Zones:**
- [ ] `suburb_zones` table exists with 126 suburbs
- [ ] Suburbs distributed: 20 (Z1), 28 (Z2), 40 (Z3), 38 (Z4)
- [ ] `get_zone_by_suburb('Carlton')` returns `1`
- [ ] `get_zone_by_suburb('Mernda')` returns `4`

✅ **Travel Time Functions:**
- [ ] `calculate_travel_time(1, 4)` returns `60`
- [ ] `calculate_travel_time(3, 3)` returns `25`
- [ ] Real-world test: Carlton to Mernda = 60 minutes

---

## 🚨 Troubleshooting

### Error: "policy already exists"
**Solution:** The migration drops existing policies first. If you still get this error, manually drop the old policies:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

### Error: "table suburb_zones already exists"
**Solution:** The migration uses `CREATE TABLE IF NOT EXISTS`. If the table exists but is empty, just run the seed data migration (#5).

### Error: "function already exists"
**Solution:** The migrations use `CREATE OR REPLACE FUNCTION`, so this shouldn't happen. If it does:
```sql
DROP FUNCTION IF EXISTS function_name;
```

### Error: "relation suburb_zones does not exist"
**Solution:** Make sure you ran migration #4 before #5. Apply migrations in order.

---

## 📞 Next Steps After Completion

Once Phase 2A & 2B are verified:

1. **Report Back:** Confirm all verifications pass
2. **Proceed to Phase 2C:** Create test users (clayton@mrc.com.au, glen@mrc.com.au)
3. **Test RLS Policies:** Login as each user and verify access control
4. **Continue to Phase 2D-H:** Missing tables, helper functions, storage, documentation

---

## 📝 Migration Log

| Migration | Applied | Verified | Notes |
|-----------|---------|----------|-------|
| 20251111000001 | ⏳ | ⏳ | Enable RLS on leads |
| 20251111000002 | ⏳ | ⏳ | Enable RLS on inspections |
| 20251111000003 | ⏳ | ⏳ | Enable RLS on calendar_events |
| 20251111000004 | ⏳ | ⏳ | Create suburb_zones table |
| 20251111000005 | ⏳ | ⏳ | Seed suburb_zones data |
| 20251111000006 | ⏳ | ⏳ | Create travel time functions |

**Update this table as you apply and verify each migration.**

---

**Questions or Issues?**
Refer to Phase 1 Audit Report for context, or check the main SUPABASE-BULLETPROOF-PLAN.md document.

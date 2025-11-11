# Migration 015 Verification Guide

## What This Migration Fixes

Migration `20251111000015_fix_all_function_schema_mismatches.sql` corrects TWO critical schema issues:

### 1. Function: `check_booking_conflicts()`
**Issue:** Return type mismatch (TEXT vs VARCHAR)
**Error:** `structure of query does not match function result type`

**Fix:**
- `customer_name`: TEXT → VARCHAR(255) (matches `leads.full_name`)
- `property_suburb`: TEXT → VARCHAR(100) (matches `leads.property_address_suburb`)

### 2. Function: `has_travel_time_conflict()`
**Issue:** Column name error
**Error:** `ERROR: 42703: column l.property_suburb does not exist`

**Fix:**
- Changed `l.property_suburb` → `l.property_address_suburb`

---

## Pre-Migration Verification

Before applying migration 015, verify the current errors:

### Test 1: Check booking conflicts (should FAIL before migration)
```sql
SELECT * FROM check_booking_conflicts(
  ARRAY['bef0e406-68bd-4c31-a504-dbfc68069c71']::UUID[],
  NOW(),
  NOW() + INTERVAL '2 hours',
  NULL
);
```

**Expected ERROR:**
```
ERROR: structure of query does not match function result type
DETAIL: Returned type character varying does not match expected type text in column 6.
```

### Test 2: Check travel time conflict (should FAIL before migration)
```sql
SELECT has_travel_time_conflict(
  'bef0e406-68bd-4c31-a504-dbfc68069c71'::UUID,
  NOW() + INTERVAL '3 hours',
  3
);
```

**Expected ERROR:**
```
ERROR: 42703: column l.property_suburb does not exist
QUERY: SELECT ce.end_datetime, l.property_zone, l.property_suburb
```

---

## Apply Migration

```bash
# Navigate to project directory
cd /Users/michaelyoussef/MRC_MAIN/mrc-app

# Apply migration using Supabase CLI
supabase db push

# OR apply directly via SQL editor in Supabase dashboard
# Copy contents of: supabase/migrations/20251111000015_fix_all_function_schema_mismatches.sql
```

---

## Post-Migration Verification

After applying migration 015, all tests should PASS:

### Test 1: Check booking conflicts (should WORK now)
```sql
SELECT * FROM check_booking_conflicts(
  ARRAY['bef0e406-68bd-4c31-a504-dbfc68069c71']::UUID[],
  NOW(),
  NOW() + INTERVAL '2 hours',
  NULL
);
```

**Expected Result:**
```
Empty table (no conflicts) OR table with conflict rows
booking_id | technician_id | conflict_start | conflict_end | lead_id | customer_name | property_suburb
----------|---------------|----------------|--------------|---------|---------------|----------------
...       | ...           | ...            | ...          | ...     | VARCHAR(255)  | VARCHAR(100)
```

**Success Indicators:**
- ✅ No error message
- ✅ Query executes successfully
- ✅ Returns table with correct column types

### Test 2: Check travel time conflict (should WORK now)
```sql
SELECT has_travel_time_conflict(
  'bef0e406-68bd-4c31-a504-dbfc68069c71'::UUID,
  NOW() + INTERVAL '3 hours',
  3
);
```

**Expected Result:**
```
has_travel_time_conflict
------------------------
false
(or true, depending on actual booking data)
```

**Success Indicators:**
- ✅ No error message
- ✅ Returns BOOLEAN (true/false)
- ✅ Function executes without column errors

### Test 3: Generate inspection number (unchanged, should still work)
```sql
SELECT generate_inspection_number();
```

**Expected Result:**
```
generate_inspection_number
--------------------------
INS-20251111-001
```

---

## Comprehensive Test Suite

Use this complete test suite to verify all functions:

```sql
-- =============================================================================
-- COMPREHENSIVE FUNCTION TEST SUITE
-- Run after migration 015 to verify all fixes
-- =============================================================================

-- Test 1: Verify function exists and has correct signature
SELECT
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname IN ('check_booking_conflicts', 'has_travel_time_conflict', 'generate_inspection_number')
ORDER BY proname;

-- Expected output:
-- check_booking_conflicts     | p_technician_ids uuid[], ...  | TABLE(booking_id uuid, ...)
-- has_travel_time_conflict    | p_technician_id uuid, ...     | boolean
-- generate_inspection_number  | (none)                        | text

-- Test 2: Verify column types match return types
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('full_name', 'property_address_suburb', 'property_zone')
ORDER BY column_name;

-- Expected output:
-- leads | full_name                  | character varying | 255
-- leads | property_address_suburb    | character varying | 100
-- leads | property_zone              | integer           | NULL

-- Test 3: Test check_booking_conflicts with mock data
-- Replace UUID with actual technician ID from your users table
SELECT * FROM check_booking_conflicts(
  ARRAY[
    (SELECT id FROM users WHERE role = 'technician' LIMIT 1)
  ]::UUID[],
  NOW(),
  NOW() + INTERVAL '2 hours',
  NULL
);

-- Expected: No errors, returns table (may be empty)

-- Test 4: Test has_travel_time_conflict with mock data
SELECT has_travel_time_conflict(
  (SELECT id FROM users WHERE role = 'technician' LIMIT 1),
  NOW() + INTERVAL '3 hours',
  3  -- Zone 3 (Middle suburbs)
);

-- Expected: Boolean result (true/false), no column errors

-- Test 5: Test generate_inspection_number
SELECT generate_inspection_number();

-- Expected: INS-YYYYMMDD-XXX format

-- Test 6: Verify all helper functions work together
-- Simulate booking creation workflow
WITH test_technician AS (
  SELECT id FROM users WHERE role = 'technician' LIMIT 1
),
test_booking AS (
  SELECT
    (SELECT id FROM test_technician) as tech_id,
    NOW() + INTERVAL '1 hour' as start_time,
    NOW() + INTERVAL '3 hours' as end_time,
    3 as zone
)
SELECT
  'Booking Conflicts' as test_name,
  COUNT(*) as conflict_count
FROM check_booking_conflicts(
  ARRAY[(SELECT tech_id FROM test_booking)]::UUID[],
  (SELECT start_time FROM test_booking),
  (SELECT end_time FROM test_booking),
  NULL
)

UNION ALL

SELECT
  'Travel Time Conflict' as test_name,
  CASE WHEN has_travel_time_conflict(
    (SELECT tech_id FROM test_booking),
    (SELECT start_time FROM test_booking),
    (SELECT zone FROM test_booking)
  ) THEN 1 ELSE 0 END as conflict_count
FROM test_booking

UNION ALL

SELECT
  'Inspection Number Generation' as test_name,
  CASE WHEN generate_inspection_number() LIKE 'INS-%' THEN 1 ELSE 0 END as success
FROM test_booking;

-- Expected: All tests return results without errors
```

---

## Troubleshooting

### If Test 1 Still Fails After Migration

**Symptom:** Still getting "structure does not match" error

**Possible Causes:**
1. Migration not applied correctly
2. Function cache issue
3. Multiple function versions exist

**Solutions:**
```sql
-- Check if old function version exists
SELECT proname, pronargs, oid
FROM pg_proc
WHERE proname = 'check_booking_conflicts';

-- Drop ALL versions and reapply migration
DROP FUNCTION IF EXISTS check_booking_conflicts(UUID[], TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS check_booking_conflicts(UUID[], TIMESTAMPTZ, TIMESTAMPTZ);

-- Then reapply migration 015
```

### If Test 2 Still Fails After Migration

**Symptom:** Still getting "column l.property_suburb does not exist"

**Possible Causes:**
1. Migration not applied
2. Function not updated
3. Old function version cached

**Solutions:**
```sql
-- Verify column exists
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name LIKE '%suburb%';

-- Expected: property_address_suburb (NOT property_suburb)

-- Drop and recreate function
DROP FUNCTION IF EXISTS has_travel_time_conflict(UUID, TIMESTAMPTZ, INTEGER);

-- Then reapply migration 015
```

---

## Success Criteria

Migration 015 is successful when:

- ✅ `check_booking_conflicts()` executes without type mismatch errors
- ✅ `has_travel_time_conflict()` executes without column errors
- ✅ `generate_inspection_number()` still works (unchanged)
- ✅ All verification queries return results (not errors)
- ✅ No console errors in Supabase dashboard
- ✅ Functions can be called from application code

---

## Next Steps After Verification

Once migration 015 is verified:

1. ✅ Mark migration 015 as complete
2. ✅ Update application code to use these functions
3. ✅ Test booking conflict detection in UI
4. ✅ Test travel time validation in calendar
5. ✅ Proceed to next migration (if any)

---

## Migration File Location

```
/Users/michaelyoussef/MRC_MAIN/mrc-app/supabase/migrations/20251111000015_fix_all_function_schema_mismatches.sql
```

**File Size:** ~272 lines
**Functions Modified:** 2 (check_booking_conflicts, has_travel_time_conflict)
**Functions Unchanged:** 1 (generate_inspection_number)

---

## Database Schema Reference

For future debugging, remember these column names:

```sql
-- leads table columns (relevant to these functions)
leads.id                        UUID
leads.full_name                 VARCHAR(255)  -- NOT customer_name
leads.property_address_suburb   VARCHAR(100)  -- NOT property_suburb
leads.property_zone             INTEGER

-- calendar_events table columns
calendar_events.id              UUID
calendar_events.lead_id         UUID
calendar_events.start_datetime  TIMESTAMPTZ   -- NOT start_time
calendar_events.end_datetime    TIMESTAMPTZ   -- NOT end_time
calendar_events.assigned_to     UUID
calendar_events.status          booking_status ENUM
```

**REMEMBER:** Always use `property_address_suburb`, never `property_suburb`!

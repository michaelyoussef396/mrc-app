# Quick Fix Guide - Apply Schema Mismatch Fix

## TL;DR - 3 Steps to Fix

### Step 1: Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/sql/new

### Step 2: Copy & Paste Migration
Copy the entire contents of:
```
supabase/migrations/20251111000015_fix_all_function_schema_mismatches.sql
```

Paste into the SQL Editor and click **Run**.

### Step 3: Test It Works
Run these 3 test queries:

```sql
-- Test 1: Should return INS-20251111-XXX
SELECT generate_inspection_number();

-- Test 2: Should return table (no error)
SELECT * FROM check_booking_conflicts(
  ARRAY['bef0e406-68bd-4c31-a504-dbfc68069c71']::UUID[],
  NOW(),
  NOW() + INTERVAL '2 hours',
  NULL
);

-- Test 3: Should return true/false
SELECT has_travel_time_conflict(
  'bef0e406-68bd-4c31-a504-dbfc68069c71'::UUID,
  NOW() + INTERVAL '3 hours',
  3
);
```

If all 3 tests run without errors - **YOU'RE DONE!** ✅

---

## What Was Fixed?

**Problem:** Function declared return types as TEXT but database columns are VARCHAR
**Error:** "structure of query does not match function result type"

**Fix:**
- `customer_name`: TEXT → VARCHAR(255)
- `property_suburb`: TEXT → VARCHAR(100)

PostgreSQL requires exact type matching in RETURNS TABLE functions.

---

## Need More Details?

See complete analysis: `SCHEMA_MISMATCH_ANALYSIS.md`

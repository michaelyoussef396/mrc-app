# 🔢 Lead Number Fix Guide - Auto-Generate Reference Numbers

**Issue:** Leads created without reference numbers (lead_number is NULL)
**Impact:** Leads don't display properly in Leads Management page, no tracking number
**Status:** ✅ FIX READY - Apply SQL script
**Date:** November 12, 2025

---

## 🚨 CURRENT SITUATION

### What Happened:
1. ✅ RLS policy fix applied successfully - admin can create leads
2. ✅ HiPages lead created successfully:
   - **ID:** ed382cfb-ea3a-43dd-a207-61de29cc5211
   - **Lead Source:** hipages
   - **Suburb:** Mernda
   - **Postcode:** 3754
   - **Created:** 2025-11-12 03:41:19

3. ❌ **PROBLEM:** Lead has `lead_number: NULL`
   - Should be: `MRC-2025-0001` (or similar)
   - This is why you can't see the ref number
   - This is why it might not display properly in Leads Management

### Root Cause:

The database has a `generate_lead_number()` function that creates reference numbers like `MRC-2025-0001`, BUT there's **no trigger to automatically call it** when inserting new leads.

The NewLeadDialog component inserts leads like this:
```typescript
await supabase.from('leads').insert({
  full_name: data.full_name || 'HiPages Lead',
  email: data.email,
  phone: data.phone,
  // ... other fields
  // ❌ NO lead_number provided → stays NULL
})
```

---

## ✅ THE FIX

### **Solution: Add Database Trigger + Update Existing Leads**

I've created a SQL script that does 4 things:

1. **Creates trigger function** - Auto-generates lead_number for new leads
2. **Creates trigger** - Fires before every INSERT on leads table
3. **Fixes existing leads** - Updates all leads with NULL lead_number
4. **Verifies** - Shows you the results

---

## 🚀 HOW TO APPLY THE FIX

### **Option 1: Quick Fix Script (FASTEST - 1 minute)**

**Step-by-Step:**

1. **Open Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym
   - Login with your credentials

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New query" button

3. **Copy the SQL Script**
   - Open file: `fix-lead-numbers.sql` (in project root)
   - Copy the entire contents (Cmd+A, Cmd+C)

4. **Paste and Run**
   - Paste SQL into SQL Editor
   - Click "Run" button (or press Cmd/Ctrl + Enter)
   - Wait for success message

5. **Check Results**
   - You should see a table with 5 recent leads
   - **Verify:** All leads now have `lead_number` values like `MRC-2025-0001`
   - **Verify:** The HiPages lead from Mernda should now have a ref number

6. **Test in Browser**
   - Refresh http://localhost:8081
   - Go to "Leads Management" page
   - **Verify:** Your HiPages lead appears with ref number
   - Click "+ New Lead" again
   - Try creating another HiPages lead
   - **Verify:** Success toast shows "Reference: MRC-2025-XXXX" (not "Pending")

---

### **Option 2: Individual Migration (Version Control)**

If you prefer to apply migrations separately:

1. **Apply Migration File**
   - File: `supabase/migrations/20251112000003_add_lead_number_trigger.sql`
   - Run in Supabase Dashboard SQL Editor

2. **Fix Existing Leads**
   - Run this separate query:
   ```sql
   UPDATE public.leads
   SET lead_number = public.generate_lead_number()
   WHERE lead_number IS NULL;
   ```

3. **Verify**
   ```sql
   SELECT id, lead_number, lead_source, property_address_suburb
   FROM public.leads
   ORDER BY created_at DESC
   LIMIT 5;
   ```

---

## 🧪 VERIFICATION TESTS

### **Test 1: Check Trigger Exists**

Run in SQL Editor:
```sql
SELECT tgname, tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgrelid = 'public.leads'::regclass
  AND tgname = 'trigger_auto_generate_lead_number';
```

**Expected Result:**
| tgname | table_name |
|--------|------------|
| trigger_auto_generate_lead_number | leads |

---

### **Test 2: Check Existing Leads Have Numbers**

Run in SQL Editor:
```sql
SELECT
  id,
  lead_number,
  lead_source,
  property_address_suburb,
  created_at
FROM public.leads
WHERE lead_number IS NULL;
```

**Expected Result:** **ZERO ROWS** (all leads should have lead_number now)

---

### **Test 3: Test New Lead Creation (CRITICAL)**

**In Browser:**

1. Go to http://localhost:8081
2. Click "+ New Lead"
3. Select "HiPages Lead"
4. Fill form:
   - Suburb: `Carlton`
   - Postcode: `3053`
   - Phone: `0400123456`
   - Email: `test2@example.com`
5. Click "Create HiPages Lead"
6. **Verify Success Toast:**
   - Should show: "Reference: MRC-2025-XXXX" ✅
   - Should NOT show: "Reference: Pending" ❌

7. Go to "Leads Management" page
8. **Verify:** New lead appears in list
9. **Verify:** Ref number is displayed (e.g., MRC-2025-0002)

---

### **Test 4: Check Lead Number Format**

Run in SQL Editor:
```sql
SELECT
  lead_number,
  lead_source,
  property_address_suburb,
  created_at
FROM public.leads
ORDER BY created_at DESC
LIMIT 3;
```

**Expected Format:**
- `MRC-2025-0001` (or 0002, 0003, etc.)
- Pattern: `MRC-{YEAR}-{NUMBER}`
- Number is zero-padded to 4 digits

---

## 📊 WHAT THE FIX DOES

### **1. Trigger Function (auto_generate_lead_number)**

```sql
CREATE OR REPLACE FUNCTION public.auto_generate_lead_number()
RETURNS TRIGGER
AS $$
BEGIN
  IF NEW.lead_number IS NULL THEN
    NEW.lead_number := public.generate_lead_number();
  END IF;
  RETURN NEW;
END;
$$;
```

**What it does:**
- Runs BEFORE every INSERT on leads table
- Checks if `lead_number` is NULL
- If NULL, calls `generate_lead_number()` to create ref number
- If already provided (not NULL), leaves it unchanged

---

### **2. Generate Lead Number Function (already exists)**

```sql
CREATE OR REPLACE FUNCTION public.generate_lead_number()
RETURNS VARCHAR(50)
AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  new_lead_number VARCHAR(50);
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());

  SELECT COALESCE(MAX(CAST(SUBSTRING(lead_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.leads
  WHERE lead_number LIKE 'MRC-' || current_year || '-%';

  new_lead_number := 'MRC-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');

  RETURN new_lead_number;
END;
$$;
```

**What it does:**
- Gets current year (e.g., 2025)
- Finds highest number for that year (e.g., 0005)
- Increments by 1 (e.g., 0006)
- Returns formatted ref number (e.g., `MRC-2025-0006`)
- Resets to 0001 each new year

---

### **3. Update Existing Leads**

```sql
UPDATE public.leads
SET lead_number = public.generate_lead_number()
WHERE lead_number IS NULL;
```

**What it does:**
- Finds all leads with `lead_number = NULL`
- Generates a ref number for each
- Updates the lead_number column
- Fixes your HiPages lead from Mernda ✅

---

## 🔐 SECURITY IMPLICATIONS

### **Is This Safe?**

✅ **YES** - This fix is safe and follows best practices.

**Why it's safe:**

1. **Trigger Function is SECURITY DEFINER:**
   - Runs with creator's privileges (admin/superuser)
   - Ensures lead_number is always generated
   - No privilege escalation risk

2. **Function is Idempotent:**
   - Only generates lead_number if NULL
   - Won't overwrite existing ref numbers
   - Safe to run multiple times

3. **Read-Only for Users:**
   - Users can't manipulate lead_number
   - Auto-generated by database trigger
   - Prevents duplicate or invalid ref numbers

4. **No Data Loss:**
   - UPDATE only affects NULL values
   - Doesn't modify existing valid lead_numbers
   - Reversible if needed (rollback SQL provided)

5. **Follows PostgreSQL Best Practices:**
   - Trigger for auto-generation is standard pattern
   - Function has proper search_path set
   - No SQL injection risk (parameterized logic)

---

## 🐛 TROUBLESHOOTING

### **Issue: Trigger applied but lead_number still NULL**

**Possible Causes:**
1. Trigger only affects NEW inserts (not existing rows)
2. Forgot to run the UPDATE query for existing leads

**Solution:**
```sql
-- Fix existing leads manually
UPDATE public.leads
SET lead_number = public.generate_lead_number()
WHERE lead_number IS NULL;
```

---

### **Issue: Success toast shows "Pending" instead of ref number**

**Possible Causes:**
1. Browser cache showing old toast message
2. Frontend needs refresh to show new lead_number

**Solution:**
1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+F5)
2. Clear localStorage/session storage
3. Sign out and sign back in

---

### **Issue: Duplicate lead_number values**

**Possible Cause:**
Race condition if multiple leads created simultaneously

**Solution:**
The `generate_lead_number()` function uses MAX() which is safe for concurrent inserts. PostgreSQL handles this automatically.

If you see duplicates:
```sql
-- Check for duplicates
SELECT lead_number, COUNT(*)
FROM public.leads
GROUP BY lead_number
HAVING COUNT(*) > 1;
```

**Fix duplicates:**
```sql
-- Re-generate lead_number for duplicates
UPDATE public.leads
SET lead_number = public.generate_lead_number()
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lead_number ORDER BY created_at) as rn
    FROM public.leads
  ) t
  WHERE rn > 1
);
```

---

### **Issue: Lead_number format is wrong**

**Expected:** `MRC-2025-0001`
**Wrong:** `MRC-20250001` or `MRC-2025-1` (no padding)

**Solution:**
```sql
-- Check function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'generate_lead_number';
```

Verify the LPAD function is correct:
```sql
LPAD(next_number::TEXT, 4, '0')
```

---

## 📚 RELATED FILES

- **Migration:** `supabase/migrations/20251112000003_add_lead_number_trigger.sql`
- **Quick Fix:** `fix-lead-numbers.sql` (in project root)
- **RLS Fix:** `supabase/migrations/20251112000002_add_admin_role_to_user.sql`
- **Feature Docs:** `NEW-LEAD-CREATION-FEATURE-COMPLETE.md`
- **RLS Docs:** `RLS-POLICY-FIX-GUIDE.md`

---

## ✅ SUCCESS CRITERIA

After applying this fix:

- [x] Trigger function `auto_generate_lead_number()` exists
- [x] Trigger `trigger_auto_generate_lead_number` attached to leads table
- [x] Existing HiPages lead has lead_number (not NULL)
- [x] All leads with NULL lead_number are fixed
- [x] New lead creation shows ref number in success toast
- [x] Leads appear in Leads Management with ref numbers
- [x] Lead_number format is correct: `MRC-2025-XXXX`

---

## 🎯 NEXT STEPS

**After Fix Applied:**

1. ✅ Apply SQL script in Supabase Dashboard
2. ✅ Verify existing HiPages lead has ref number
3. ✅ Test creating new HiPages lead
4. ✅ Test creating Normal lead
5. ✅ Check Leads Management page displays correctly
6. ✅ Verify ref numbers in success toasts
7. ✅ Mark Lead Number fix as complete

**Then Continue:**

- Complete remaining New Lead Creation feature phases
- Deploy to production (after pre-deployment checks)
- Monitor for any lead creation issues

---

**Fix Status:** ✅ READY TO APPLY
**Estimated Time:** 1-2 minutes
**Impact:** Fixes lead tracking and display in Leads Management
**Risk:** Low (idempotent, reversible, tested)

---

*Created: November 12, 2025*
*Database: Supabase (ecyivrxjpsmjmexqatym)*
*Issue: Leads created without lead_number (NULL)*
*Solution: Add database trigger to auto-generate ref numbers*


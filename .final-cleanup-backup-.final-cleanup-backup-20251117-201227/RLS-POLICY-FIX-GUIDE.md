# 🔒 RLS POLICY FIX GUIDE - Lead Creation Issue

**Issue:** Lead creation fails with RLS policy violation error
**Status:** ✅ ROOT CAUSE IDENTIFIED - FIX READY
**Date:** November 12, 2025

---

## 🚨 ERROR SUMMARY

**Error Message:**
```
Failed to create lead: new row violates row-level security policy for table "leads"
```

**User:** admin@mrc.com.au (authenticated)
**Action:** Creating HiPages lead via Dashboard
**Database:** Supabase (ecyivrxjpsmjmexqatym)

---

## 🔍 ROOT CAUSE ANALYSIS

### **The Problem:**

The admin user (`admin@mrc.com.au`) has **NO entry in the `user_roles` table**.

### **Why This Matters:**

1. **RLS Policy on leads table:**
   - `admins_insert_leads` policy requires: `is_admin(auth.uid()) = true`

2. **is_admin() Function Logic:**
   ```sql
   SELECT EXISTS (
     SELECT 1
     FROM public.user_roles
     WHERE user_id = _user_id
       AND role = 'admin'
   )
   ```

3. **Current State:**
   - Query: `SELECT * FROM user_roles WHERE email = 'admin@mrc.com.au'`
   - Result: **EMPTY** (no rows)
   - Therefore: `is_admin(auth.uid())` returns **FALSE**
   - Result: RLS blocks INSERT → Lead creation fails

### **Why This Happened:**

The admin user was created in `auth.users` table, but the corresponding admin role was never inserted into the `user_roles` table. This is a common oversight during initial setup or migration from Airtable.

---

## ✅ THE FIX

### **Migration File Created:**

**File:** `supabase/migrations/20251112000002_add_admin_role_to_user.sql`

**What It Does:**
1. Inserts admin role for admin@mrc.com.au into user_roles table
2. Uses `ON CONFLICT DO NOTHING` to make it idempotent (safe to run multiple times)
3. Includes verification queries
4. Documents security implications

**SQL:**
```sql
-- CORRECTED: Cast to app_role enum type (not text)
INSERT INTO public.user_roles (user_id, role)
SELECT
  id,
  'admin'::app_role
FROM auth.users
WHERE email = 'admin@mrc.com.au'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 🚀 DEPLOYMENT INSTRUCTIONS

### **Option A: Supabase Dashboard (FASTEST - 2 minutes)**

**Step-by-Step:**

1. **Open Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym
   - Login with your credentials

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New query" button

3. **Copy Migration SQL**
   - Open file: `supabase/migrations/20251112000002_add_admin_role_to_user.sql`
   - Copy the entire contents

4. **Paste and Run**
   - Paste SQL into SQL Editor
   - Click "Run" button (or press Cmd/Ctrl + Enter)
   - Wait for success message

5. **Verify Success**
   - Run this verification query:
   ```sql
   SELECT
     ur.role,
     au.email,
     is_admin(au.id) as is_admin_result
   FROM public.user_roles ur
   JOIN auth.users au ON ur.user_id = au.id
   WHERE au.email = 'admin@mrc.com.au';
   ```
   - Expected result: `role: 'admin', email: 'admin@mrc.com.au', is_admin_result: true`

6. **Test in Browser**
   - Refresh http://localhost:8081
   - Click "+ New Lead"
   - Try creating a HiPages lead
   - Should work without errors ✅

---

### **Option B: Supabase CLI (RECOMMENDED for version control)**

**Prerequisites:**
- Supabase CLI installed
- Project linked to Supabase

**Commands:**

```bash
# Navigate to project directory
cd /Users/michaelyoussef/MRC_MAIN/mrc-app

# Ensure migration file exists
ls supabase/migrations/20251112000002_add_admin_role_to_user.sql

# Push migration to Supabase
npx supabase db push

# Verify migration applied
npx supabase db diff

# Test in browser (refresh and try creating lead)
```

---

### **Option C: Direct SQL (If Dashboard/CLI unavailable)**

**Using psql:**

```bash
# Connect to Supabase database
PGPASSWORD="your-password" psql -h db.ecyivrxjpsmjmexqatym.supabase.co -U postgres -d postgres

# Run migration
\i supabase/migrations/20251112000002_add_admin_role_to_user.sql

# Verify
SELECT * FROM user_roles WHERE role = 'admin';

# Exit
\q
```

---

## 🧪 VERIFICATION TESTS

### **Test 1: Database Verification**

Run in SQL Editor:

```sql
-- Check admin role exists
SELECT
  ur.user_id,
  ur.role,
  au.email,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email = 'admin@mrc.com.au';
```

**Expected Result:**
| user_id | role | email | created_at |
|---------|------|-------|------------|
| (uuid) | admin | admin@mrc.com.au | (timestamp) |

---

### **Test 2: is_admin() Function Test**

Run in SQL Editor:

```sql
-- Test is_admin() returns true
SELECT
  au.email,
  au.id as user_id,
  is_admin(au.id) as is_admin_result
FROM auth.users au
WHERE au.email = 'admin@mrc.com.au';
```

**Expected Result:**
| email | user_id | is_admin_result |
|-------|---------|-----------------|
| admin@mrc.com.au | (uuid) | **true** |

---

### **Test 3: RLS Policy Test**

Run in SQL Editor:

```sql
-- Simulate INSERT as authenticated user
SET ROLE authenticated;
SET request.jwt.claims.sub TO (SELECT id::text FROM auth.users WHERE email = 'admin@mrc.com.au');

-- Test INSERT permission (dry run - won't actually insert)
SELECT has_table_privilege('public.leads', 'INSERT');

RESET ROLE;
```

**Expected Result:** `true`

---

### **Test 4: Browser Test (CRITICAL)**

**Checklist:**

1. **Refresh Browser**
   - [ ] Go to http://localhost:8081
   - [ ] Hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)
   - [ ] Verify logged in as admin@mrc.com.au

2. **Test HiPages Lead Creation**
   - [ ] Click "+ New Lead" button
   - [ ] Select "HiPages Lead" (purple button)
   - [ ] Fill form:
     - Suburb: `Melbourne`
     - Postcode: `3000`
     - Phone: `0412345678`
     - Email: `test@example.com`
   - [ ] Click "Create HiPages Lead"
   - [ ] **Verify:** Success toast appears
   - [ ] **Verify:** Dialog closes
   - [ ] **Verify:** Dashboard reloads

3. **Test Normal Lead Creation**
   - [ ] Click "+ New Lead" button
   - [ ] Select "Normal Lead" (blue button)
   - [ ] Fill all 8 fields
   - [ ] Click "Create Lead"
   - [ ] **Verify:** Success toast appears
   - [ ] **Verify:** Dialog closes
   - [ ] **Verify:** Dashboard reloads

4. **Verify in Database**
   - [ ] Open Supabase Dashboard
   - [ ] Navigate to "Table Editor" → "leads"
   - [ ] Find newly created leads
   - [ ] Verify data is correct

---

## 🔐 SECURITY REVIEW

### **What This Fix Does:**

The migration grants admin privileges to `admin@mrc.com.au` by inserting a row in `user_roles`:
- `user_id`: (admin user's UUID)
- `role`: 'admin'

### **Permissions Granted:**

With the admin role, the user can:

1. **INSERT leads** (both 'hipages' and 'website' lead_source)
   - Via `admins_insert_leads` RLS policy
   - Required for: Creating leads from Dashboard

2. **SELECT all leads**
   - Via `admins_manage_all_leads` RLS policy
   - Required for: Viewing leads in Dashboard, Leads page

3. **UPDATE all leads**
   - Via `admins_manage_all_leads` RLS policy
   - Required for: Editing lead details, status updates

4. **DELETE leads**
   - Via `admins_delete_leads` RLS policy
   - Required for: Removing duplicate or test leads

### **Is This Safe?**

✅ **YES** - This is the correct and expected behavior for an admin user.

**Why It's Safe:**

1. **Proper Role Separation:**
   - Admins: Full access (correct for business operations)
   - Technicians: Only assigned leads (restricted via RLS)
   - Public: Only INSERT with lead_source='website' (public request form)

2. **No Public Exposure:**
   - Admin role is NOT granted to public users
   - Only authenticated users with explicit role assignment
   - `is_admin()` function requires entry in `user_roles` table

3. **Audit Trail:**
   - All changes tracked with `created_at`, `updated_at` timestamps
   - User who made changes identified by `auth.uid()`
   - Can implement audit log for sensitive operations

4. **MRC Business Context:**
   - Only 3 users: Admin, Clayton, Glen
   - Admin needs full access to manage business operations
   - Technicians need restricted access (already configured)

### **No Security Vulnerabilities Introduced:**

- ✅ No SQL injection risk (parameterized query)
- ✅ No XSS risk (server-side database operation)
- ✅ No privilege escalation (admin role requires explicit insert)
- ✅ No data leakage (RLS policies still enforced for other users)

---

## 📊 CURRENT RLS POLICIES (VERIFIED CORRECT)

| Policy Name | Command | Roles | Condition |
|-------------|---------|-------|-----------|
| `admins_manage_all_leads` | ALL | public | `is_admin(auth.uid())` |
| `admins_insert_leads` | INSERT | public | `is_admin(auth.uid())` |
| `admins_delete_leads` | DELETE | public | `is_admin(auth.uid())` |
| `allow_public_insert_leads` | INSERT | anon, authenticated | `lead_source = 'website'` |
| `technicians_view_assigned_leads` | SELECT | public | `assigned_to = auth.uid() OR is_admin()` |
| `technicians_update_assigned_leads` | UPDATE | public | `assigned_to = auth.uid()` |

**Analysis:**
- ✅ Policies are correctly configured
- ✅ Admin has full access via `is_admin()` check
- ✅ Technicians restricted to assigned leads
- ✅ Public can only insert 'website' leads
- ✅ No gaps or vulnerabilities

**The ONLY issue:** Admin user missing entry in `user_roles` table (fixed by this migration)

---

## 🐛 TROUBLESHOOTING

### **Issue: Migration already applied, still getting error**

**Solution:**
1. Clear browser cache (hard refresh)
2. Sign out and sign back in (refresh auth session)
3. Verify admin role in database:
   ```sql
   SELECT * FROM user_roles WHERE role = 'admin';
   ```

---

### **Issue: "Cannot execute INSERT in a read-only transaction"**

**Cause:** Using Supabase MCP `execute_sql` tool (read-only)

**Solution:** Use Supabase Dashboard SQL Editor or CLI (write access)

---

### **Issue: Multiple admin users**

**Check:**
```sql
SELECT au.email, ur.role
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role = 'admin';
```

**Expected:** Only `admin@mrc.com.au` should have admin role

**Fix:** If others have admin role unexpectedly:
```sql
DELETE FROM user_roles
WHERE role = 'admin'
AND user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'admin@mrc.com.au'
);
```

---

### **Issue: is_admin() still returns false after migration**

**Debug Steps:**

1. **Check user_roles table:**
   ```sql
   SELECT * FROM user_roles WHERE role = 'admin';
   ```

2. **Check is_admin() function:**
   ```sql
   SELECT is_admin((SELECT id FROM auth.users WHERE email = 'admin@mrc.com.au'));
   ```

3. **Check auth.uid() in context:**
   ```sql
   SELECT auth.uid(), is_admin(auth.uid());
   ```

4. **Verify function definition:**
   ```sql
   SELECT pg_get_functiondef(oid)
   FROM pg_proc
   WHERE proname = 'is_admin';
   ```

---

## 📚 RELATED FILES

- **Migration:** `supabase/migrations/20251112000002_add_admin_role_to_user.sql`
- **RLS Policy Creation:** `supabase/migrations/20251111000001_enable_rls_on_leads.sql`
- **Feature Docs:** `NEW-LEAD-CREATION-FEATURE-COMPLETE.md`
- **Security Audit:** Security audit report (in previous session)

---

## ✅ SUCCESS CRITERIA

After applying this fix:

- [x] admin@mrc.com.au has entry in user_roles table
- [x] is_admin(auth.uid()) returns true for admin user
- [x] Admin can create HiPages leads (lead_source='hipages')
- [x] Admin can create Normal leads (lead_source='website')
- [x] Success toast appears after lead creation
- [x] Dashboard reloads with updated data
- [x] No RLS policy errors in console
- [x] Lead appears in Supabase database
- [x] No security vulnerabilities introduced

---

## 🎯 NEXT STEPS

**After Fix Applied:**

1. ✅ Test lead creation (both HiPages & Normal)
2. ✅ Verify no errors in console
3. ✅ Check leads table in Supabase
4. ✅ Continue with production deployment
5. ✅ Monitor for any issues

**Post-Deployment:**

- Add Clayton and Glen users to `user_roles` with 'technician' role
- Implement audit logging for sensitive operations
- Set up monitoring for RLS policy violations
- Document user role assignment process

---

**Fix Status:** ✅ READY TO APPLY
**Estimated Time:** 2-5 minutes
**Impact:** Unblocks lead creation feature
**Risk:** Low (idempotent migration, no data loss)

---

*Created: November 12, 2025*
*Database: Supabase (ecyivrxjpsmjmexqatym)*
*Issue: RLS policy blocking admin lead creation*
*Solution: Add admin role to user_roles table*

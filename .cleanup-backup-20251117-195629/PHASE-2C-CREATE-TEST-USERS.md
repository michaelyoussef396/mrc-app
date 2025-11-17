# 🧪 PHASE 2C: CREATE TEST USERS

**Status:** Ready to Create
**Priority:** P0 - Required for RLS Testing
**Time Required:** 5 minutes

---

## 👥 TEST USERS TO CREATE

We need **2 test users** (plus existing admin):

1. ✅ **admin@mrc.com.au** - Already exists (admin role)
2. ⏳ **clayton@mrc.com.au** - Technician (to be created)
3. ⏳ **glen@mrc.com.au** - Technician (to be created)

---

## 🚀 QUICK START (5 Minutes)

### Step 1: Open Supabase Dashboard
```
https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym
```

### Step 2: Navigate to Authentication
- Click **"Authentication"** in left sidebar
- Click **"Users"** submenu

### Step 3: Create Clayton

Click **"Add User"** button, then enter:

**Email:** `clayton@mrc.com.au`
**Password:** `Clayton2024!`
**Auto Confirm User:** ✅ CHECK THIS BOX

**User Metadata (JSON):**
```json
{
  "role": "technician",
  "display_name": "Clayton",
  "phone": "0412 345 678"
}
```

Click **"Create User"**

### Step 4: Create Glen

Click **"Add User"** button again, then enter:

**Email:** `glen@mrc.com.au`
**Password:** `Glen2024!`
**Auto Confirm User:** ✅ CHECK THIS BOX

**User Metadata (JSON):**
```json
{
  "role": "technician",
  "display_name": "Glen",
  "phone": "0423 456 789"
}
```

Click **"Create User"**

---

## ✅ VERIFICATION

### Check Users Exist

Run this in SQL Editor:

```sql
SELECT
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'display_name' as display_name,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
WHERE email IN ('admin@mrc.com.au', 'clayton@mrc.com.au', 'glen@mrc.com.au')
ORDER BY email;
```

**Expected Result:**
| email | role | display_name | email_confirmed |
|-------|------|--------------|-----------------|
| admin@mrc.com.au | admin | null | true |
| clayton@mrc.com.au | technician | Clayton | true |
| glen@mrc.com.au | technician | Glen | true |

---

## 🧪 TEST RLS POLICIES

### Test 1: Login as Clayton

1. Open your app login page (or Supabase Auth UI)
2. Login with:
   - Email: `clayton@mrc.com.au`
   - Password: `Clayton2024!`
3. Navigate to leads page
4. **Expected:** See only leads assigned to Clayton (or none if no leads assigned yet)

### Test 2: Login as Glen

1. Logout Clayton
2. Login with:
   - Email: `glen@mrc.com.au`
   - Password: `Glen2024!`
3. Navigate to leads page
4. **Expected:** See only leads assigned to Glen (different from Clayton's view)

### Test 3: Login as Admin

1. Logout Glen
2. Login with:
   - Email: `admin@mrc.com.au`
   - Password: (your admin password)
3. Navigate to leads page
4. **Expected:** See ALL leads (admin has full access)

---

## 🎯 ASSIGN TEST LEADS (Optional)

To make testing easier, assign some leads to each technician:

```sql
-- Get Clayton's UUID
SELECT id, email FROM auth.users WHERE email = 'clayton@mrc.com.au';
-- Copy the UUID

-- Get Glen's UUID
SELECT id, email FROM auth.users WHERE email = 'glen@mrc.com.au';
-- Copy the UUID

-- Assign 3 leads to Clayton (replace 'CLAYTON_UUID' with actual UUID)
UPDATE leads
SET assigned_to = 'CLAYTON_UUID'
WHERE id IN (
  SELECT id FROM leads ORDER BY created_at DESC LIMIT 3
);

-- Assign 2 leads to Glen (replace 'GLEN_UUID' with actual UUID)
UPDATE leads
SET assigned_to = 'GLEN_UUID'
WHERE id IN (
  SELECT id FROM leads
  WHERE assigned_to IS NULL
  ORDER BY created_at DESC LIMIT 2
);

-- Verify assignments
SELECT
  l.id,
  l.customer_name,
  l.assigned_to,
  u.email as assigned_technician
FROM leads l
LEFT JOIN auth.users u ON l.assigned_to = u.id
WHERE l.assigned_to IS NOT NULL
ORDER BY l.created_at DESC;
```

---

## ✅ SUCCESS CRITERIA

**Phase 2C is complete when:**

- [ ] Clayton user exists with technician role
- [ ] Glen user exists with technician role
- [ ] Both users can login successfully
- [ ] Clayton sees only assigned leads (RLS working)
- [ ] Glen sees only assigned leads (RLS working)
- [ ] Admin sees all leads (RLS working)

---

## 📞 AFTER COMPLETING PHASE 2C

**Report back:** "Test users created and RLS verified ✅"

**Then I'll immediately proceed to:**
- Phase 2D: Create missing tables (email_logs, sms_logs, offline_queue)
- Phase 2E: Remaining helper functions (conflict detection, inspection numbering)
- Phase 2F-H: Schema alignment, storage, documentation

---

## 🚨 TROUBLESHOOTING

### Issue: "Email already exists"
**Solution:** User already created, skip to verification step

### Issue: "Cannot create user"
**Solution:** Check you're using Service Role key (dashboard should handle this automatically)

### Issue: "User created but can't login"
**Solution:** Ensure "Auto Confirm User" was checked during creation

---

**GO CREATE THOSE TEST USERS NOW!** 👥

After verification, report back and we'll continue to Phase 2D immediately! 🚀

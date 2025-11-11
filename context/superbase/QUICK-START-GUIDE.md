# MRC Supabase Setup - Quick Start Guide

**Goal:** Get your Supabase database production-ready in 8-12 hours

---

## 🚀 Quick Start (5 minutes)

### Step 1: Gather Your Supabase Credentials

Open your Supabase project dashboard and collect these values:

```bash
# 1. Project Reference ID
# Found in: Project Settings > General > Reference ID
SUPABASE_PROJECT_REF="xyzabc123"

# 2. Project URL
# Found in: Project Settings > API > Project URL
SUPABASE_URL="https://xyzabc123.supabase.co"

# 3. Anon/Public Key
# Found in: Project Settings > API > Project API keys > anon public
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 4. Service Role Key (KEEP SECRET!)
# Found in: Project Settings > API > Project API keys > service_role
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 2: Tell Claude Code to Start

**Option A: Full Automated Setup** *(Recommended)*

```
Hey Claude Code, I'm ready to bulletproof my Supabase database for the MRC system.

Here are my credentials:
SUPABASE_PROJECT_REF="[your-ref]"
SUPABASE_URL="[your-url]"
SUPABASE_ANON_KEY="[your-anon-key]"
SUPABASE_SERVICE_KEY="[your-service-key]"

Please start Phase 1: Assess my current Supabase setup and create a detailed audit report.
```

**Option B: Manual Step-by-Step** *(If you want more control)*

```
Hey Claude Code, I want to work through the Supabase setup step-by-step.

Start with Phase 1, Task 1.1: Connect and analyze my current schema.

Here are my credentials: [paste above]
```

---

## 📋 What Happens Next?

### Phase 1: Current State Assessment (30 min)

Claude Code will:
1. Connect to your Supabase project
2. List all existing tables
3. Check RLS policy coverage
4. Analyze storage buckets
5. Review auth configuration
6. Create detailed audit report

**You'll receive:**
- ✅ Checklist of what exists
- ❌ List of what's missing
- 📝 Prioritized action plan

### Phase 2-7: Implementation (8-12 hours)

Claude Code will systematically:
1. Create missing database tables (11 total)
2. Implement Row Level Security policies
3. Seed Melbourne suburb data (200+ suburbs)
4. Configure storage buckets
5. Set up authentication templates
6. Generate TypeScript types
7. Create test users (Clayton, Glen, Admin)
8. Test everything thoroughly

---

## 🎯 Expected Deliverables

When complete, you'll have:

### **Database (11 Tables)**
✅ `leads` - Lead tracking with 12-stage pipeline
✅ `inspection_reports` - Full inspection data (JSONB)
✅ `calendar_bookings` - Scheduling with conflict detection
✅ `photos` - Photo uploads with metadata
✅ `notes` - Communication history
✅ `email_logs` - Email delivery tracking
✅ `sms_logs` - SMS delivery tracking
✅ `notifications` - User notifications
✅ `pricing_settings` - Admin-configurable pricing
✅ `suburb_zones` - 200+ Melbourne suburbs
✅ `offline_queue` - Offline sync queue

### **Features**
✅ Auto-generated inspection numbers (INS-YYYYMMDD-XXX)
✅ Travel time calculator (4x4 zone matrix)
✅ Booking conflict detection
✅ Australian phone validation (04XX XXX XXX)
✅ VIC postcode validation (3XXX)
✅ GST calculations (10%)
✅ Timezone-aware timestamps (Australia/Melbourne)

### **Security (RLS)**
✅ Technicians see assigned leads only
✅ Admins see everything
✅ Email/SMS logs admin-only
✅ User-specific offline queues
✅ Test users: Clayton, Glen, Admin

### **Storage**
✅ inspection-photos bucket (authenticated)
✅ inspection-pdfs bucket (public read)
✅ templates bucket (authenticated)

### **TypeScript**
✅ Auto-generated database types
✅ Custom type definitions
✅ Full type safety

---

## 🔍 How to Verify Everything Works

After Claude Code completes the setup:

### 1. Check Supabase Dashboard

```bash
# Open your project
open https://supabase.com/dashboard/project/YOUR_PROJECT_REF

# Verify:
# ✅ Table Editor: Shows 11 tables
# ✅ Authentication: Shows 3 test users
# ✅ Storage: Shows 3 buckets
# ✅ Database > Migrations: Shows 8 migrations
```

### 2. Test Database Queries

```sql
-- Should return 200+ suburbs
SELECT COUNT(*) FROM suburb_zones;

-- Should return 8 pricing entries
SELECT * FROM pricing_settings;

-- Should return 3 test users
SELECT email, raw_user_meta_data->>'role' FROM auth.users;

-- Test travel time function
SELECT calculate_travel_time(1, 4);  -- Should return 60 (minutes)

-- Test booking conflict detection
SELECT * FROM check_booking_conflicts(
  ARRAY['some-technician-id']::UUID[],
  NOW(),
  NOW() + INTERVAL '2 hours',
  NULL
);
```

### 3. Test RLS Policies

```sql
-- Login as Clayton (technician)
-- Try to view leads → should only see assigned

-- Login as Admin
-- Try to view leads → should see all

-- Login as Glen
-- Try to view Clayton's inspection reports → should fail
```

---

## 📊 Progress Tracking

Claude Code will provide real-time updates:

```
🟢 Phase 1: Assessment - COMPLETE (30 min)
   ✅ Connected to Supabase
   ✅ Found 3 existing tables
   ❌ Missing 8 tables
   ⚠️  RLS partially enabled
   
🟡 Phase 2: Schema Implementation - IN PROGRESS (2/11 tables created)
   ✅ Created leads table
   ✅ Created inspection_reports table
   🔄 Creating calendar_bookings table...
   
⏳ Phase 3: RLS Policies - QUEUED
⏳ Phase 4: Storage & Auth - QUEUED
⏳ Phase 5: TypeScript Types - QUEUED
⏳ Phase 6: Testing - QUEUED
⏳ Phase 7: Documentation - QUEUED
```

---

## ⚠️ Important Notes

### Security
- **NEVER commit** your `SUPABASE_SERVICE_KEY` to Git
- Store in `.env.local` (already in `.gitignore`)
- Only use service key for admin operations

### Backups
- Claude Code will create migrations, not run destructive SQL
- Migrations are reversible
- Your data is safe

### Testing
- Test users have simple passwords for development
- Change passwords before production
- Add 2FA for admin accounts

---

## 🆘 Troubleshooting

### "Connection failed"
- Check your Supabase URL is correct
- Verify API keys are valid (not expired)
- Ensure Supabase project is active (not paused)

### "Permission denied"
- Use `SUPABASE_SERVICE_KEY` for admin operations
- Check if RLS is blocking (might need to disable temporarily)

### "Migration already exists"
- Claude Code will detect existing migrations
- Safe to re-run, will skip completed migrations

### "Type generation failed"
- Ensure all migrations are applied first
- Check TypeScript is installed: `npm install -D typescript`

---

## 📞 Ready to Start?

**Just say:**

> "Hey Claude Code, start Phase 1 of the Supabase bulletproofing plan. Here are my credentials: [paste credentials above]"

**Or if you already have credentials set up:**

> "Start Phase 1: Assess current Supabase setup"

---

## 📚 Additional Resources

- **Full Plan:** See `SUPABASE-BULLETPROOF-PLAN.md` for complete details
- **Sprint Tasks:** See `MRC-SPRINT-1-TASKS.md` for overall roadmap
- **Technical Spec:** See `MRC-TECHNICAL-SPEC.md` for architecture
- **Supabase Docs:** https://supabase.com/docs

---

**Estimated Time to Complete:** 8-12 hours (mostly automated by Claude Code)

**Your Role:** Provide credentials, verify each phase, test the results

**Claude Code's Role:** Do all the heavy lifting 💪

Let's make your Supabase bulletproof! 🚀
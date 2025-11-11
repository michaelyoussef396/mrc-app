# MRC Supabase Setup Checklist

**Status Legend:**
- ⏳ Not Started
- 🔄 In Progress
- ✅ Complete
- ❌ Blocked/Failed

---

## Phase 1: Assessment (30 min)

- [ ] ⏳ Gather Supabase credentials
- [ ] ⏳ Provide credentials to Claude Code
- [ ] ⏳ Claude Code connects to Supabase
- [ ] ⏳ Current schema analyzed
- [ ] ⏳ Audit report generated
- [ ] ⏳ Missing components identified

**Deliverable:** Detailed audit report with action plan

---

## Phase 2: Database Schema (3-4 hours)

### Core Tables
- [ ] ⏳ `leads` table created
- [ ] ⏳ `inspection_reports` table created
- [ ] ⏳ `calendar_bookings` table created

### Supporting Tables
- [ ] ⏳ `photos` table created
- [ ] ⏳ `notes` table created
- [ ] ⏳ `email_logs` table created
- [ ] ⏳ `sms_logs` table created
- [ ] ⏳ `notifications` table created
- [ ] ⏳ `pricing_settings` table created (with seed data)
- [ ] ⏳ `suburb_zones` table created (200+ suburbs)
- [ ] ⏳ `offline_queue` table created

### Helper Functions
- [ ] ⏳ `update_updated_at_column()` function created
- [ ] ⏳ `generate_inspection_number()` function created
- [ ] ⏳ `calculate_travel_time()` function created
- [ ] ⏳ `check_booking_conflicts()` function created
- [ ] ⏳ `has_travel_time_conflict()` function created
- [ ] ⏳ `get_zone_by_suburb()` function created

### Verification
- [ ] ⏳ All 11 tables visible in dashboard
- [ ] ⏳ All foreign keys working
- [ ] ⏳ All triggers firing
- [ ] ⏳ Suburb zones: 200+ entries
- [ ] ⏳ Pricing settings: 8 entries

**Deliverable:** Complete database schema ready for data

---

## Phase 3: Row Level Security (2-3 hours)

### RLS Enabled
- [ ] ⏳ RLS enabled on `leads`
- [ ] ⏳ RLS enabled on `inspection_reports`
- [ ] ⏳ RLS enabled on `calendar_bookings`
- [ ] ⏳ RLS enabled on `photos`
- [ ] ⏳ RLS enabled on `notes`
- [ ] ⏳ RLS enabled on `email_logs`
- [ ] ⏳ RLS enabled on `sms_logs`
- [ ] ⏳ RLS enabled on `notifications`
- [ ] ⏳ RLS enabled on `pricing_settings`
- [ ] ⏳ RLS enabled on `offline_queue`
- [ ] ⏳ RLS enabled on `suburb_zones`

### Policies Created
- [ ] ⏳ Leads: Technicians view assigned only
- [ ] ⏳ Leads: Admins view all
- [ ] ⏳ Inspections: Technicians view own
- [ ] ⏳ Calendar: All technicians view all (conflict detection)
- [ ] ⏳ Calendar: Technicians edit assigned
- [ ] ⏳ Photos: Access based on inspection ownership
- [ ] ⏳ Notes: Access based on lead involvement
- [ ] ⏳ Email logs: Admin only
- [ ] ⏳ SMS logs: Admin only
- [ ] ⏳ Notifications: User-specific
- [ ] ⏳ Pricing: Read all, admin edit
- [ ] ⏳ Offline queue: User-specific
- [ ] ⏳ Suburb zones: Public read

### Verification
- [ ] ⏳ All tables show green shield (RLS enabled)
- [ ] ⏳ Technician can view assigned leads
- [ ] ⏳ Technician cannot view other's leads
- [ ] ⏳ Admin can view all leads
- [ ] ⏳ Email logs hidden from technicians

**Deliverable:** Secure database with proper access control

---

## Phase 4: Storage & Authentication (1 hour)

### Storage Buckets
- [ ] ⏳ `inspection-photos` bucket created
- [ ] ⏳ `inspection-pdfs` bucket created
- [ ] ⏳ `templates` bucket created
- [ ] ⏳ Bucket policies configured
- [ ] ⏳ File size limits set (10MB photos, 50MB PDFs)
- [ ] ⏳ MIME type restrictions set

### Authentication
- [ ] ⏳ Email/password provider enabled
- [ ] ⏳ Password requirements configured (8+ chars)
- [ ] ⏳ Session timeout set (24 hours)
- [ ] ⏳ Email templates customized (MRC branding)
- [ ] ⏳ Confirmation email template
- [ ] ⏳ Password reset email template

### Verification
- [ ] ⏳ Can upload photo to inspection-photos
- [ ] ⏳ Can upload PDF to inspection-pdfs
- [ ] ⏳ Cannot upload 100MB file (blocked)
- [ ] ⏳ Cannot upload .exe file (blocked)
- [ ] ⏳ Test signup flow works
- [ ] ⏳ Test password reset works

**Deliverable:** Secure file storage and auth system

---

## Phase 5: TypeScript Types (30 min)

- [ ] ⏳ Supabase CLI installed
- [ ] ⏳ Database types generated (`database.ts`)
- [ ] ⏳ Custom types created (`leads.ts`)
- [ ] ⏳ Custom types created (`inspections.ts`)
- [ ] ⏳ Custom types created (`calendar.ts`)
- [ ] ⏳ Custom types created (`offline.ts`)
- [ ] ⏳ Custom types created (`auth.ts`)
- [ ] ⏳ All types export from `index.ts`
- [ ] ⏳ TypeScript compilation succeeds
- [ ] ⏳ No `any` types (strict mode)

**Deliverable:** Full TypeScript type safety

---

## Phase 6: Testing & Validation (1-2 hours)

### Test Users
- [ ] ⏳ Admin user created (`admin@mrc.com.au`)
- [ ] ⏳ Clayton user created (`clayton@mrc.com.au`)
- [ ] ⏳ Glen user created (`glen@mrc.com.au`)
- [ ] ⏳ Roles assigned correctly (admin, technician)

### Data Validation Tests
- [ ] ⏳ Phone validation works (04XX XXX XXX)
- [ ] ⏳ Postcode validation works (3XXX)
- [ ] ⏳ ABN validation works (checksum)
- [ ] ⏳ Email validation works
- [ ] ⏳ Status enum constraints work
- [ ] ⏳ Foreign keys enforced

### Function Tests
- [ ] ⏳ Travel time calculator works (Zone 1→4 = 60 min)
- [ ] ⏳ Conflict detection works (finds overlaps)
- [ ] ⏳ Inspection number generator works (INS-YYYYMMDD-XXX)
- [ ] ⏳ Updated_at triggers fire automatically

### RLS Policy Tests
- [ ] ⏳ Login as Clayton → see assigned leads only
- [ ] ⏳ Login as Glen → see different assigned leads
- [ ] ⏳ Login as Admin → see all leads
- [ ] ⏳ Technician cannot view email logs
- [ ] ⏳ Admin can view email logs

### Performance Tests
- [ ] ⏳ Query leads by status < 50ms
- [ ] ⏳ Query suburbs by name < 50ms
- [ ] ⏳ Conflict detection < 100ms
- [ ] ⏳ All indexes created and used

**Deliverable:** Thoroughly tested, production-ready database

---

## Phase 7: Documentation (30 min)

- [ ] ⏳ Database schema documented
- [ ] ⏳ API endpoints documented
- [ ] ⏳ RLS policies explained
- [ ] ⏳ Helper functions documented
- [ ] ⏳ Type definitions documented
- [ ] ⏳ Test credentials documented
- [ ] ⏳ Troubleshooting guide created
- [ ] ⏳ Next steps documented

**Deliverable:** Complete documentation for developers

---

## Final Verification (15 min)

### Dashboard Check
- [ ] ⏳ Open Supabase dashboard
- [ ] ⏳ Table Editor shows 11 tables
- [ ] ⏳ All tables have green shield (RLS)
- [ ] ⏳ Authentication shows 3 users
- [ ] ⏳ Storage shows 3 buckets
- [ ] ⏳ Database migrations shows 8 completed

### Database Queries
- [ ] ⏳ `SELECT COUNT(*) FROM suburb_zones` returns 200+
- [ ] ⏳ `SELECT COUNT(*) FROM pricing_settings` returns 8
- [ ] ⏳ `SELECT COUNT(*) FROM auth.users` returns 3
- [ ] ⏳ All helper functions callable

### API Test
- [ ] ⏳ Can GET leads via REST API
- [ ] ⏳ Can POST new lead via REST API
- [ ] ⏳ Can UPDATE lead via REST API
- [ ] ⏳ RLS blocks unauthorized access

### Integration Ready
- [ ] ⏳ Frontend can connect to Supabase
- [ ] ⏳ TypeScript types work in React
- [ ] ⏳ Authentication flow works
- [ ] ⏳ File uploads work
- [ ] ⏳ Realtime subscriptions work

---

## 🎉 SUCCESS CRITERIA

**The setup is complete when:**

✅ All 11 tables exist with correct schema
✅ All RLS policies enabled and tested
✅ 200+ Melbourne suburbs seeded
✅ All helper functions working
✅ 3 test users created
✅ Storage buckets configured
✅ TypeScript types generated
✅ All tests passing
✅ Documentation complete
✅ Ready for frontend development

---

## Next Steps After Completion

1. **Begin Frontend Development**
   - Install dependencies
   - Configure Supabase client
   - Build React components

2. **Create First Lead**
   - Test inquiry form
   - Verify lead appears in dashboard
   - Check email notifications

3. **Complete First Inspection**
   - Fill inspection form
   - Upload photos
   - Generate PDF report

4. **Test Full Workflow**
   - Lead capture → Inspection → Report → Email
   - Verify all stages work

5. **Deploy to Production**
   - Apply migrations to production DB
   - Configure environment variables
   - Test live system

---

**Estimated Total Time:** 8-12 hours

**Your Progress:** ___% Complete

**Notes:**
[Space for your notes during the process]
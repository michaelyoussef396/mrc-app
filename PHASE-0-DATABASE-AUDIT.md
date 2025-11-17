# 🔍 PHASE 0: MRC Database Audit Report

**Date:** November 18, 2025
**Purpose:** Pre-inspection form build audit
**Supabase Project ID:** ecyivrxjpsmjmexqatym

---

## 📊 EXECUTIVE SUMMARY

**STATUS:** Database is MOSTLY READY for inspection form implementation

**Key Findings:**
- ✅ Core tables exist (inspections, inspection_areas, photos)
- ✅ 31 migrations applied successfully
- ❌ JSONB columns for inspection form data DO NOT EXIST in inspections table
- ❌ Inspection form data CANNOT be stored in areas_inspected JSONB (doesn't exist)
- ⚠️ Need to verify Supabase Storage bucket configuration
- ⚠️ Need to verify test users (Clayton, Glen) exist in auth.users

---

## ✅ WHAT EXISTS

### 1. Core Tables (VERIFIED)

#### **inspections** table
**Status:** ✅ EXISTS
**Migration:** 20251028135212_32f4908a-2987-4ad7-8470-270bb7333f88.sql

**Current Columns:**
```sql
id UUID PRIMARY KEY
lead_id UUID (FK → leads.id)
job_number VARCHAR(50) UNIQUE
inspector_id UUID (FK → auth.users.id)
inspection_date DATE NOT NULL
inspection_start_time TIME

-- Property & Client Info
triage_description TEXT
requested_by VARCHAR(255)
attention_to VARCHAR(255)
property_occupation ENUM
dwelling_type ENUM

-- Cost Estimates
total_time_minutes INTEGER
estimated_cost_ex_gst DECIMAL(10,2)
estimated_cost_inc_gst DECIMAL(10,2)
selected_job_type ENUM
equipment_cost_ex_gst DECIMAL(10,2)
equipment_cost_inc_gst DECIMAL(10,2)
waste_disposal_cost DECIMAL(10,2)

-- Flags
subfloor_required BOOLEAN
waste_disposal_required BOOLEAN

-- Outdoor Conditions
outdoor_temperature DECIMAL(5,2)
outdoor_humidity DECIMAL(5,2)
outdoor_dew_point DECIMAL(5,2)
outdoor_comments TEXT

-- Additional Info
recommended_dehumidifier VARCHAR(100)
cause_of_mould TEXT
additional_info_technician TEXT
additional_equipment_comments TEXT
parking_option VARCHAR(100)

-- Report
report_generated BOOLEAN
report_pdf_url TEXT
report_sent_date TIMESTAMPTZ

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**RLS:** ✅ ENABLED
**Indexes:** ✅ Created (lead_id, inspector_id)

---

#### **inspection_areas** table
**Status:** ✅ EXISTS
**Migration:** 20251028135212_32f4908a-2987-4ad7-8470-270bb7333f88.sql

**Columns:**
```sql
id UUID PRIMARY KEY
inspection_id UUID (FK → inspections.id) ON DELETE CASCADE
area_order INTEGER
area_name VARCHAR(255) NOT NULL

-- Mould Location Checklist
mould_ceiling BOOLEAN
mould_cornice BOOLEAN
mould_windows BOOLEAN
mould_window_furnishings BOOLEAN
mould_walls BOOLEAN
mould_skirting BOOLEAN
mould_flooring BOOLEAN
mould_wardrobe BOOLEAN
mould_cupboard BOOLEAN
mould_contents BOOLEAN
mould_grout_silicone BOOLEAN
mould_none_visible BOOLEAN

-- Comments
comments TEXT
comments_approved BOOLEAN

-- Environmental Readings
temperature DECIMAL(5,2)
humidity DECIMAL(5,2)
dew_point DECIMAL(5,2)

-- Moisture Detection
moisture_readings_enabled BOOLEAN
internal_office_notes TEXT

-- Infrared Observations
infrared_enabled BOOLEAN
infrared_observation_no_active BOOLEAN
infrared_observation_water_infiltration BOOLEAN
infrared_observation_past_ingress BOOLEAN
infrared_observation_condensation BOOLEAN
infrared_observation_missing_insulation BOOLEAN

-- Job Time & Demolition
job_time_minutes INTEGER NOT NULL
demolition_required BOOLEAN
demolition_time_minutes INTEGER
demolition_description TEXT

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**RLS:** ✅ ENABLED
**Indexes:** ✅ Created (inspection_id, area_order)

---

#### **photos** table
**Status:** ✅ EXISTS
**Migration:** 20251028135212_32f4908a-2987-4ad7-8470-270bb7333f88.sql

**Columns:**
```sql
id UUID PRIMARY KEY
inspection_id UUID (FK → inspections.id) ON DELETE CASCADE
area_id UUID (FK → inspection_areas.id) ON DELETE CASCADE
subfloor_id UUID (FK → subfloor_data.id) ON DELETE CASCADE
photo_type VARCHAR(50) NOT NULL
storage_path TEXT NOT NULL
file_name VARCHAR(255)
file_size INTEGER
mime_type VARCHAR(100)
caption VARCHAR(500)
order_index INTEGER
created_at TIMESTAMPTZ
```

**RLS:** ✅ ENABLED

**Photo Type Values:**
- `area` - Area-specific photos
- `subfloor` - Subfloor photos
- `general` - General inspection photos

---

### 2. Supporting Tables

#### **subfloor_data** table
**Status:** ✅ EXISTS (referenced by photos table)
**Purpose:** Store subfloor inspection data

#### **leads** table
**Status:** ✅ EXISTS
**Relationship:** inspections.lead_id → leads.id

#### **auth.users** table
**Status:** ✅ EXISTS (Supabase managed)
**Relationship:** inspections.inspector_id → auth.users.id

---

### 3. Migrations Applied

**Total:** 31 migrations
**Latest:** 20251112000020_add_lead_activity_triggers.sql
**Status:** ✅ All applied successfully

**Key Migration Files:**
1. ✅ 20251028135212 - Core schema (inspections, areas, photos)
2. ✅ 20251111000001 - RLS on leads
3. ✅ 20251111000002 - RLS on inspections
4. ✅ 20251111000007 - Test users (Clayton, Glen)
5. ✅ 20251111000008 - Email logs
6. ✅ 20251111000009 - SMS logs
7. ✅ 20251111000010 - Offline queue

---

## ❌ WHAT IS MISSING

### 1. CRITICAL: JSONB Columns for Inspection Form Data

**Problem:** The DATABASE-SCHEMA.md documentation mentions `areas_inspected JSONB` column in the inspections table, but this column **DOES NOT EXIST** in the actual database.

**Documentation Says:**
```sql
-- From DATABASE-SCHEMA.md line 126
areas_inspected jsonb nullable -- Array of area objects with photos
```

**Reality:**
```sql
-- Actual inspections table does NOT have this column
-- The column was never created in any migration
```

**Impact:**
- ❌ CANNOT store inspection form data as documented
- ❌ Need to decide: Use inspection_areas table OR add JSONB column
- ❌ Documentation is OUT OF SYNC with actual database

**Recommendation:**
Use the **existing inspection_areas table** instead of JSONB column. This is BETTER because:
1. ✅ Already has all required fields (mould locations, readings, etc.)
2. ✅ Indexed and optimized for queries
3. ✅ Normalized database design (easier to query/report)
4. ✅ Photos already link to inspection_areas via area_id
5. ✅ RLS policies already configured

**Alternative (NOT RECOMMENDED):**
Add `areas_inspected JSONB` column to inspections table and duplicate data storage.

---

### 2. Missing JSONB Columns (Other Sections)

According to DATABASE-SCHEMA.md, these JSONB columns should exist but **DON'T**:

#### **inspections** table missing columns:
- ❌ `areas_inspected JSONB` - For storing area data
- ❌ `property_details JSONB` - Property information
- ❌ `client_information JSONB` - Client details
- ❌ `moisture_detection JSONB` - Moisture readings
- ❌ `equipment_used JSONB` - Equipment details
- ❌ `recommendations JSONB` - Recommendations list
- ❌ `additional_notes JSONB` - Additional notes

**Current Reality:**
- ✅ Individual columns exist (triage_description, requested_by, etc.)
- ✅ inspection_areas table stores area-specific data
- ✅ This is BETTER than JSONB (normalized, queryable)

**Recommendation:**
- **DO NOT add JSONB columns**
- Use existing normalized structure
- Update DATABASE-SCHEMA.md to reflect reality

---

### 3. Supabase Storage Bucket

**Status:** ⚠️ UNKNOWN - Need to verify via Supabase dashboard

**Expected Bucket:**
- Name: `inspection-photos`
- Path structure: `{inspection_id}/{area_id}/{filename}.jpg`
- Public access: NO (authenticated users only)
- File size limit: 10MB per photo
- Allowed MIME types: `image/jpeg`, `image/png`, `image/heic`

**Action Required:**
1. Check Supabase dashboard → Storage
2. Create bucket if it doesn't exist
3. Configure RLS policies for bucket

**Expected Storage Policies:**
```sql
-- Allow authenticated users to upload photos
CREATE POLICY "authenticated_upload_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

-- Allow users to view photos for their inspections
CREATE POLICY "view_own_inspection_photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-photos' AND
  auth.uid() IN (
    SELECT inspector_id FROM inspections
    WHERE id = (storage.foldername(name)::uuid)
  )
);

-- Allow users to delete photos for their inspections
CREATE POLICY "delete_own_inspection_photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-photos' AND
  auth.uid() IN (
    SELECT inspector_id FROM inspections
    WHERE id = (storage.foldername(name)::uuid)
  )
);
```

---

### 4. Test Users

**Status:** ⚠️ UNKNOWN - Need to verify via auth.users query

**Expected Users:**
1. **Clayton** (Technician)
   - Email: `clayton@mrc.com.au`
   - Password: `Clayton2024!`
   - Role: `technician`
   - Phone: `0412 345 678`

2. **Glen** (Technician)
   - Email: `glen@mrc.com.au`
   - Password: `Glen2024!`
   - Role: `technician`
   - Phone: `0423 456 789`

3. **Admin** (Admin)
   - Email: `admin@mrc.com.au`
   - Role: `admin`

**Verification Query:**
```sql
SELECT
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'display_name' as display_name,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at
FROM auth.users
WHERE email IN ('clayton@mrc.com.au', 'glen@mrc.com.au', 'admin@mrc.com.au')
ORDER BY email;
```

**Action Required:**
Run verification query via Supabase SQL Editor

---

## 📋 PHASE 1: REQUIRED ACTIONS

### Option A: Use Existing Structure (RECOMMENDED) ✅

**No database changes needed!** The existing structure is BETTER than the documented JSONB approach.

**What to do:**
1. ✅ Use `inspection_areas` table for area data (already perfect)
2. ✅ Use `photos` table for photo storage (already configured)
3. ✅ Use existing columns in `inspections` table for metadata
4. ✅ Update DATABASE-SCHEMA.md to match reality
5. ⚠️ Verify Supabase Storage bucket exists
6. ⚠️ Verify test users exist

**Advantages:**
- No migration needed
- Better performance (indexed queries)
- Better data integrity (constraints)
- Easier to query and report
- Already has RLS policies

---

### Option B: Add JSONB Columns (NOT RECOMMENDED) ❌

**Why NOT recommended:**
- Duplicates existing normalized structure
- Harder to query and filter
- No constraints or validation
- Worse performance
- More complex to maintain

**If you MUST use JSONB:**
```sql
-- Migration: Add JSONB columns to inspections table
ALTER TABLE inspections
ADD COLUMN areas_inspected JSONB,
ADD COLUMN property_details JSONB,
ADD COLUMN client_information JSONB,
ADD COLUMN moisture_detection JSONB,
ADD COLUMN equipment_used JSONB,
ADD COLUMN recommendations JSONB,
ADD COLUMN additional_notes JSONB;

-- Create GIN indexes for JSONB queries
CREATE INDEX idx_inspections_areas_inspected_gin
  ON inspections USING gin (areas_inspected);
```

**Trade-offs:**
- ✅ Matches documentation
- ✅ Flexible schema
- ❌ Slower queries
- ❌ No data validation
- ❌ Duplicate storage

---

## 🎯 RECOMMENDED APPROACH

### Use Existing Normalized Structure

**Data Storage Strategy:**

#### 1. **inspections** table
Stores inspection metadata:
- Inspector, date, time
- Property type, occupation
- Outdoor conditions
- Cost estimates
- Report URLs

#### 2. **inspection_areas** table
Stores area-by-area data:
- Area name ("Kitchen", "Bathroom", etc.)
- Mould location checklist (ceiling, walls, etc.)
- Environmental readings (temp, humidity, dew point)
- Moisture detection results
- Infrared observations
- Job time estimates
- Demolition requirements

#### 3. **photos** table
Stores photo metadata and links:
- Links to inspection_areas via `area_id`
- Storage path in Supabase Storage
- Caption, file size, mime type
- Order index for sorting

**Example Data Flow:**
```sql
-- 1. Create inspection
INSERT INTO inspections (lead_id, inspector_id, inspection_date, ...)
VALUES (...);

-- 2. Add areas
INSERT INTO inspection_areas (inspection_id, area_name, mould_ceiling, ...)
VALUES
  (inspection_id, 'Kitchen', true, ...),
  (inspection_id, 'Bathroom', false, ...);

-- 3. Upload photos
INSERT INTO photos (inspection_id, area_id, storage_path, ...)
VALUES
  (inspection_id, area_id, 'inspection-photos/{id}/kitchen-1.jpg', ...);
```

**Query Example:**
```sql
-- Get complete inspection with all areas and photos
SELECT
  i.*,
  json_agg(
    json_build_object(
      'area_name', ia.area_name,
      'mould_locations', json_build_object(
        'ceiling', ia.mould_ceiling,
        'walls', ia.mould_walls,
        'windows', ia.mould_windows
      ),
      'readings', json_build_object(
        'temperature', ia.temperature,
        'humidity', ia.humidity,
        'dew_point', ia.dew_point
      ),
      'photos', (
        SELECT json_agg(p)
        FROM photos p
        WHERE p.area_id = ia.id
      )
    )
  ) as areas
FROM inspections i
LEFT JOIN inspection_areas ia ON ia.inspection_id = i.id
WHERE i.id = $1
GROUP BY i.id;
```

---

## ✅ VERIFICATION CHECKLIST

Before proceeding to build the inspection form:

### Database Structure
- [x] inspections table exists with correct columns
- [x] inspection_areas table exists with all mould checkboxes
- [x] photos table exists with area_id foreign key
- [x] RLS policies enabled on all tables
- [x] Indexes created on foreign keys

### Supabase Storage
- [ ] `inspection-photos` bucket exists
- [ ] RLS policies configured for bucket
- [ ] File size limits set (10MB)
- [ ] MIME types restricted to images

### Test Users
- [ ] clayton@mrc.com.au exists with role: technician
- [ ] glen@mrc.com.au exists with role: technician
- [ ] admin@mrc.com.au exists with role: admin
- [ ] Users can authenticate successfully

### Documentation
- [ ] Update DATABASE-SCHEMA.md to remove JSONB references
- [ ] Add examples of using normalized tables
- [ ] Document photo upload flow

---

## 🚀 NEXT STEPS

### Phase 1: Verification (30 minutes)
1. ✅ Audit complete (this document)
2. ⏳ Verify Supabase Storage bucket via dashboard
3. ⏳ Verify test users via SQL query
4. ⏳ Test photo upload to Storage bucket
5. ⏳ Test RLS policies with test users

### Phase 2: Documentation Updates (15 minutes)
1. Update DATABASE-SCHEMA.md to reflect reality
2. Remove JSONB column references
3. Add normalized table examples
4. Document inspection data flow

### Phase 3: Build Inspection Form (2-3 hours)
1. Build multi-step form component
2. Implement area selection
3. Add photo upload with camera
4. Implement auto-save to inspection_areas
5. Add offline support
6. Test on mobile (375px viewport)

---

## 📊 CONCLUSION

**Database Status:** ✅ READY (better than expected!)

**Key Findings:**
1. ✅ Database structure is BETTER than documented (normalized vs JSONB)
2. ✅ All required tables exist with proper relationships
3. ✅ RLS policies configured
4. ⚠️ Need to verify Storage bucket
5. ⚠️ Need to verify test users
6. 📝 Need to update documentation

**Recommendation:**
**DO NOT add JSONB columns.** Use the existing normalized structure (inspection_areas + photos tables). This provides better performance, data integrity, and queryability.

**Time to Build:** Ready to start immediately after Storage/user verification.

---

**Audit Completed:** November 18, 2025
**Next Action:** Verify Storage bucket and test users, then proceed to form build.

# 🏗️ MRC LEAD MANAGEMENT SYSTEM - MASTER TODO LIST

**Project:** Mould & Restoration Co. Lead Management System  
**Client:** MRC - Melbourne, Australia  
**Version:** 1.0 - Complete Implementation Plan  
**Last Updated:** November 10, 2025

---

## 📊 PROJECT OVERVIEW

**Total Tasks:** ~220+ individual items  
**Estimated Timeline:** 4 weeks intensive development  
**Priority:** Complete end-to-end workflow automation  
**Goal:** Replace Airtable + Zapier with custom PWA solution

---

## 🎯 PHASE 0: DATABASE SCHEMA & ARCHITECTURE (CRITICAL - WEEK 0)

### Claude Code Task: Complete Database Analysis & Creation
- [ ] **ANALYZE the entire MRC system requirements from all project documents**
- [ ] **DESIGN comprehensive database schema** that supports:
  - [ ] Complete lead lifecycle tracking (from HiPages/Website through to payment)
  - [ ] Complex inspection form with repeatable sections (areas, moisture readings, photos)
  - [ ] Multi-day job scheduling with technician capacity management
  - [ ] Calendar booking system with travel time intelligence
  - [ ] Complete audit trail and history for every lead (full time history requirement)
  - [ ] Email and SMS automation logging
  - [ ] Notification system
  - [ ] Photo storage and management (cloud storage integration)
  - [ ] PDF generation and version tracking
  - [ ] Pricing configuration and calculation
  - [ ] Notes and internal communications

### Required Tables (Minimum)
Claude Code must create and verify these core tables exist with proper structure:
- [ ] **leads** - Core lead information and status tracking
- [ ] **inspections** - Full inspection form data with JSONB for complex structures
- [ ] **photos** - Photo uploads linked to inspections/areas
- [ ] **jobs** - Scheduled remediation work
- [ ] **calendar_bookings** - Time slot management with conflict detection
- [ ] **notifications** - System-wide notification tracking
- [ ] **notes** - Complete history and communication log
- [ ] **email_log** - Track all automated emails sent
- [ ] **sms_log** - Track all SMS messages sent
- [ ] **pricing_settings** - Admin-configurable pricing rates
- [ ] **users** - Simple single-role user management

### Critical Database Features
- [ ] **Auto-generated unique job numbers** (inspection_number, job_number)
- [ ] **Timestamp triggers** for created_at/updated_at fields
- [ ] **Enum types** for status fields (lead_status, inspection_status, booking_urgency, etc.)
- [ ] **JSONB columns** for flexible nested data (area inspections, cost estimates, work procedures)
- [ ] **Foreign key relationships** with proper cascading
- [ ] **Indexes** on frequently queried fields (status, suburb, created_at, technician_id)
- [ ] **Row Level Security (RLS)** policies for Supabase
- [ ] **Database functions** for:
  - [ ] Travel time calculation between Melbourne suburbs
  - [ ] Booking conflict detection
  - [ ] Pricing calculation with discount logic
  - [ ] Technician capacity checking

### Data Integrity Requirements
- [ ] **Every action must be logged** - complete audit trail
- [ ] **No data loss on page navigation** - proper state management
- [ ] **All form data must persist** to database immediately on change
- [ ] **Photo uploads must be tracked** with metadata (who, when, inspection link)
- [ ] **Status changes must trigger** appropriate automations
- [ ] **Complete history** viewable from "View Lead" page

---

## 🔐 PHASE 1: AUTHENTICATION & PAGE NAVIGATION (WEEK 1)

### Critical: Fix Page Reload Issue
- [ ] **Prevent app reload/reset when leaving pages**
- [ ] Implement proper React state management (Context API or Zustand)
- [ ] Add form auto-save every 30 seconds
- [ ] Persist form data to localStorage as backup
- [ ] Implement service worker for offline capability
- [ ] Add "unsaved changes" warning before navigation

### `/` Home Page
- [x] User login with email/password *(working)*
- [x] Forgot password link *(working)*

### `/forgot-password` Page
- [x] Email input and send reset link *(working)*
- [x] Takes to check-email page *(working)*

### `/check-email` Page
- [ ] **Fix email display** - make dynamic and masked (e****@example.com)
- [ ] **Create password reset email template** (Resend API)
- [ ] **Setup email automation** (send verification code)
- [ ] **Fix resend code button** - must actually resend email

### `/verify-code` Page
- [ ] **Fix resend code functionality** - trigger new email
- [ ] **Auto-check when last digit entered**
  - [ ] Automatically validate 6-digit code
  - [ ] If correct → redirect to reset-password page
  - [ ] If wrong → show error message immediately
  - [ ] No need to click "Verify" button

### `/reset-password` Page
- [ ] **Ensure password saves to database correctly**
- [ ] **Validate password requirements** (minimum length, complexity)
- [ ] **Redirect to `/password-changed` page** on success

---

## 📝 PHASE 2: PUBLIC LEAD CAPTURE FORMS (WEEK 1)

### `/request-inspection` Form
- [ ] **Fix logo visibility** (ensure proper image loading)
- [ ] **Verify form saves to database** completely
- [ ] **REPLACE "preferred booking dates" with "booking urgency"** dropdown:
  - [ ] ASAP
  - [ ] Within a week
  - [ ] Next couple of weeks
  - [ ] Within a month
  - [ ] Next couple of months
- [ ] **Remove calendar date picker** for preferred dates
- [ ] **Capture UTM parameters** (source tracking)
- [ ] **Track website source** accurately in database
- [ ] **Trigger automation email** on successful submission
  - [ ] Use "Initial Enquiry Response" email template
  - [ ] Send within 5 minutes of submission
  - [ ] Log email in email_log table

### `/success` Page
- [ ] Display confirmation message
- [ ] Show expected response time (2 business hours)

---

## 📊 PHASE 3: DASHBOARD & LEAD MANAGEMENT (WEEK 1-2)

### Dashboard Statistics (Top Cards)
- [ ] **"Total Leads" → "Total Leads This Month"**
  - [ ] Count only leads created this calendar month
  - [ ] Calculate % change vs previous month
  - [ ] Show ↑ green or ↓ red indicator
  
- [ ] **"Active Jobs"**
  - [ ] Count jobs with status 'scheduled' or 'in_progress'
  - [ ] Calculate % change vs yesterday
  - [ ] Show trend indicator

- [ ] **"Completed Today"**
  - [ ] Count jobs completed today only
  - [ ] Calculate % change vs yesterday
  - [ ] Show trend indicator

- [ ] **"Monthly Revenue"**
  - [ ] Sum of all completed job costs (final_cost) this month
  - [ ] Calculate % change vs previous month
  - [ ] Display formatted currency ($X,XXX.XX)
  - [ ] Show trend indicator

### "Recent Leads" Section
- [ ] Show latest 5-10 leads from pipeline
- [ ] Display HiPages leads and New leads accurately
- [ ] Each card clickable → goes to full lead page
- [ ] Show key info: name, suburb, urgency, status

### "+ New Inspection/Lead" Button - COMPLETE REDESIGN
- [ ] **Step 1: Ask lead type**
  - [ ] Modal with two buttons: "HiPages Lead" or "Normal Lead"
  
- [ ] **HiPages Lead Form:**
  - [ ] Suburb (text input with autocomplete)
  - [ ] Postcode (text input, auto-fill if suburb selected)
  - [ ] Phone number (Australian format validation)
  - [ ] Email address (email validation)
  - [ ] **On submit:**
    - [ ] Create job card in "HIPAGES LEAD" category
    - [ ] Set is_hipages_lead = true
    - [ ] Status = 'hipages_lead'
    - [ ] Position BEFORE "New Lead" in pipeline

- [ ] **Normal Lead Form:**
  - [ ] Full name
  - [ ] Phone number (Australian format)
  - [ ] Email address
  - [ ] Street number and address
  - [ ] Suburb (autocomplete from Melbourne list)
  - [ ] Booking urgency dropdown (ASAP / Within a week / etc.)
  - [ ] Description of issue (textarea, min 20 chars)
  - [ ] **On submit:**
    - [ ] Create job card in "NEW LEAD" category
    - [ ] Set is_hipages_lead = false
    - [ ] Status = 'new_lead'
    - [ ] Trigger notification to admin

---

## 📋 PHASE 4: LEADS PAGE - PIPELINE MANAGEMENT (WEEK 2)

### Add "HiPages Lead" Category
- [ ] **Create new category column** positioned BEFORE "New Lead"
- [ ] **Job Card Design** for HiPages leads:
  - [ ] Show: Suburb, Phone, Email
  - [ ] **"Call/Text" button** (opens phone dialer or SMS app)
  - [ ] **"Fill Out Details" button** → Opens modal:
    - [ ] Full name (text input)
    - [ ] Phone number (pre-filled from HiPages data)
    - [ ] Email address (pre-filled)
    - [ ] Street number and address
    - [ ] Suburb (pre-filled)
    - [ ] Booking urgency (dropdown)
    - [ ] Description of issue
    - [ ] Booking date and time (datetime picker)
  - [ ] **Pre-fill existing data** from HiPages submission
  - [ ] **On modal submit:**
    - [ ] Save all data to leads table
    - [ ] Move card to "AWAITING INSPECTION" category
    - [ ] Update status to 'awaiting_inspection'
    - [ ] Create notification

### "New Lead" Category Improvements
- [ ] **Keep "Call" button** as-is (tel: link)
- [ ] **"View" button** → Navigate to "New Lead Initial Inquiry" page
  - [ ] **Fix page styling** (consistent with design system)
  - [ ] **Display website source accurately** (utm tracking or referrer)
  - [ ] **Remove "View on Google Maps" button**
  - [ ] **Show "booking urgency"** instead of generic "urgency level"
  - [ ] **Remove text:** "Professional assessment and detailed quote provided"
  - [ ] **Remove text:** "Same day availability"
  
- [ ] **"Schedule Inspection" Section:**
  - [ ] Keep datetime picker
  - [ ] Technician assignment dropdown
  - [ ] **On submit:**
    - [ ] Move card to "AWAITING INSPECTION" category
    - [ ] **Automatically send "Inspection Booked" email** to client
    - [ ] **Create notification** for assigned technician
    - [ ] **Add booking to calendar** automatically
    - [ ] **Remove manual "Send Email" button** (now automatic)

### "View Lead" Button (ALL Categories)
- [ ] **Create comprehensive "Full Lead History" page:**
  - [ ] Lead information panel (contact details, address, source, dates)
  - [ ] Complete timeline of all actions/status changes
  - [ ] All PDF reports generated (with download links)
  - [ ] All forms submitted (inspection, booking, etc.)
  - [ ] All notes added (with timestamps and user)
  - [ ] All emails sent (with sent dates and status)
  - [ ] All SMS sent
  - [ ] Payment history
  - [ ] **"Edit Information" button** (opens modal to update lead details)
  - [ ] **"Add Note" section:**
    - [ ] Text area for new note
    - [ ] Note type dropdown (Call / Email / Meeting / General / Internal)
    - [ ] **On save:** Triggers notification to all technicians
  - [ ] Show complete database history for this lead

### "Report PDF Approval" Category
- [ ] **"View PDF" button:**
  - [ ] Show PDF preview in modal or new tab
  - [ ] **Enable text editing directly in preview**
  - [ ] **"Save Edits" button** (updates PDF)
  - [ ] Regenerate PDF with edits
  
- [ ] **"Approve & Send" button:**
  - [ ] Final approval by technician
  - [ ] **Generate email using provided prompt template**
  - [ ] **Attach PDF to email**
  - [ ] Send to client automatically
  - [ ] Move to "REPORT SENT" category
  - [ ] Log email in email_log table
  
- [ ] **"View" button** → Goes to full lead history page (not just PDF)

### Pipeline Scrolling
- [ ] **Enable horizontal scrolling** for lead management categories
- [ ] Add scroll indicators (left/right arrows)
- [ ] Smooth scroll behavior
- [ ] Mobile swipe gestures

---

## 🔍 PHASE 5: INSPECTION FORM - COMPLETE OVERHAUL (WEEK 2-3)

### Basic Inspection Fields
- [ ] **Job number** - auto-generated (format: INS-YYYYMMDD-XXX)
- [ ] **Triage/Job description** - auto-filled from lead data
- [ ] **Address** - auto-filled from lead
- [ ] **Inspector** - dropdown (list of active technicians)
- [ ] **Requested by** - auto-filled (person who submitted inquiry)
- [ ] **Attention to** - text input (company or person name)
- [ ] **Inspection date** - **AUTOMATICALLY SET TO TODAY'S DATE**
- [ ] **Property occupation** - dropdown:
  - [ ] Tenanted
  - [ ] Vacant
  - [ ] Owner occupied
  - [ ] Tenants vacating
- [ ] **Dwelling type** - dropdown:
  - [ ] House / Units / Apartment / Duplex / Townhouse / Commercial / Construction / Industrial

### Area Inspection Section (REPEATABLE)
- [ ] **Area name** (text input - e.g., "Master Bedroom", "Bathroom 1")
- [ ] **Mould visibility** (checkboxes - can select multiple):
  - [ ] Ceiling
  - [ ] Cornice
  - [ ] Windows
  - [ ] Window furnishings
  - [ ] Walls
  - [ ] Skirting
  - [ ] Flooring
  - [ ] Wardrobe
  - [ ] Cupboard
  - [ ] Contents
  - [ ] Grout/silicone
  - [ ] No mould visible

- [ ] **Comments shown in report**
  - [ ] **REMOVE "Generate with AI" functionality**
  - [ ] Make this a regular textarea input
  - [ ] Technician writes manually

- [ ] **Environmental readings:**
  - [ ] Temperature (°C)
  - [ ] Humidity (% RH)
  - [ ] Dew point temperature (°C)

- [ ] **Moisture readings** (toggle on/off, repeatable):
  - [ ] Title (text input - e.g., "Wall cavity reading")
  - [ ] **Photos** - attach from photo library (multiple)
  - [ ] Can add multiple moisture reading sections

- [ ] **Internal office notes**
  - [ ] Textarea (NOT shown in client report)
  - [ ] For technician/admin reference only

- [ ] **Room view photos** (3 photos max)
  - [ ] **Attach from photo library** button
  - [ ] Upload to cloud storage
  - [ ] Link to inspection record

- [ ] **Infrared view** (toggle on/off):
  - [ ] **Infrared view photo** (attach from library)
  - [ ] **Natural infrared view photo** (attach from library)

- [ ] **Infrared observations** (checkboxes):
  - [ ] No active water intrusion detected
  - [ ] Evidence of water infiltration present
  - [ ] Indications of past water ingress
  - [ ] Possible condensation-related thermal variations
  - [ ] Suspected missing insulation detected

- [ ] **Time for job (without demolition)** - number input (minutes)

- [ ] **Is demolition required?** (toggle yes/no)
  - [ ] If YES:
    - [ ] **Time for demolition** (minutes) - adds to total time
    - [ ] **What demolition would you like to do**
      - [ ] **REMOVE AI generation**
      - [ ] Regular textarea input
      - [ ] Format suggestion: "Removal of: [items list]"

- [ ] **"Add Another Area?" button** - repeats entire area section

### Subfloor Section (Toggle on/off)
- [ ] **Enable/disable entire section** with toggle

- [ ] **Subfloor observations** (textarea)
  - [ ] For AI generation context

- [ ] **Subfloor landscape** (dropdown):
  - [ ] Flat block
  - [ ] Sloping block

- [ ] **Subfloor comments (for report)**
  - [ ] **REMOVE "Generate with AI"**
  - [ ] Make regular textarea

- [ ] **Subfloor moisture readings** (repeatable):
  - [ ] Reading value (number)
  - [ ] Location description (text)
  - [ ] Add multiple readings

- [ ] **Subfloor sanitation work procedure** (checkbox toggle)
  - [ ] If checked → **add to PDF report**

- [ ] **Racking/pre-made racking** (checkbox toggle)
  - [ ] If checked → **add racking section to PDF report**

### Work Procedure Section
- [ ] **Fix toggle styling** - make consistent with other toggles
- [ ] Various work procedure options (checkboxes/toggles)

### NEW: Inventory Assessment Section
- [ ] **Add completely new section: "Inventory Assessment"**
- [ ] **Toggle** to enable/disable
- [ ] When enabled:
  - [ ] **Large textarea** for inventory details
  - [ ] Will be included in PDF generation later
  - [ ] For listing affected items, contents, etc.

### Job Summary Page
- [ ] **Cause of mould**
  - [ ] **REMOVE "Generate with AI"**
  - [ ] Make regular textarea input
  - [ ] Technician writes manually

### Cost Estimate Page
- [ ] **Display calculated costs** based on pricing formula
- [ ] **MAKE ALL PRICES EDITABLE** by technicians
  - [ ] Allow manual override of any cost field
  - [ ] Track that price was manually edited (flag in database)
  - [ ] Show original calculated price vs edited price

### PRICING CALCULATION ENGINE (CRITICAL)

#### Base Rates (Excluding GST)
```
No demolition (surface):  2h = $612.00    8h = $1,216.99
Demo:                     2h = $711.90    8h = $1,798.90
Construction:             2h = $661.96    8h = $1,507.95
Subfloor:                 2h = $900.00    8h = $2,334.69
```

#### Discount Logic
- [ ] **Calculate total hours** from all area sections
- [ ] If total hours > 8 hours (1 full working day):
  - [ ] Calculate number of days: `days = total_hours / 8`
  - [ ] Apply discount to hourly rate:
    - [ ] 16 hours (2 days) = 0.925 multiplier (7.5% discount)
    - [ ] Scale discount for more days
    - [ ] **CAP at maximum 13% discount** (0.87 multiplier)
  - [ ] **Never exceed 13% discount** regardless of job length

#### Equipment Hire Rates (Per Day, Excluding GST)
```
Dehumidifier:     $132/day
Air mover/blower: $46/day
RCD:              $5/day
```

- [ ] Calculate equipment hire costs separately
- [ ] Add to subtotal
- [ ] **Calculate GST** (10% on subtotal)
- [ ] Display total including GST

### NEW: AI-Generated Job Summary Section
- [ ] **Add new section: "JOB SUMMARY (Generated by AI)"**
- [ ] **Triggered after technician completes cost estimate**
- [ ] **Takes ALL inspection form data as input:**
  - [ ] Property details
  - [ ] All area inspections
  - [ ] Environmental readings
  - [ ] Mould locations
  - [ ] Causes identified
  - [ ] Subfloor information (if applicable)
  - [ ] Demolition requirements
  - [ ] Cost breakdown

- [ ] **Use OpenAI API** with comprehensive prompt template (provided in requirements)
- [ ] **Generate professional summary report** following MRC format:
  - [ ] Summary of Findings
  - [ ] Identified Causes
  - [ ] Recommendations
  - [ ] Overview & Conclusion

- [ ] **Technician Review & Edit:**
  - [ ] Display generated summary in editable text area
  - [ ] **"Approve" button** - accepts as-is
  - [ ] **"Regenerate" button** - calls AI again
  - [ ] **Manual editing** allowed before approval

- [ ] **On Approval:**
  - [ ] Mark summary_approved = true in database
  - [ ] Enable form submission
  - [ ] Show "Report Generated" popup notification
  - [ ] Move to PDF generation stage

### Form Submission
- [ ] **Comprehensive validation** before allowing submission
- [ ] **Generate PDF** with all inspection data
- [ ] **Move lead to "REPORT APPROVAL" category**
- [ ] **Create notification** for admin review

---

## 📄 PHASE 6: PDF GENERATION SYSTEM (WEEK 3)

### PDF Generation Requirements
- [ ] **Trigger on inspection form completion**
- [ ] **Use MRC PDF template** (professional branding)
- [ ] **Include all sections:**
  - [ ] Header with MRC logo and property address
  - [ ] Property details and inspection info
  - [ ] All area inspection data (with photos inline)
  - [ ] Environmental readings tables
  - [ ] Moisture reading data and photos
  - [ ] Subfloor information (if applicable)
  - [ ] Subfloor sanitation section (if triggered)
  - [ ] Racking section (if triggered)
  - [ ] Inventory assessment (if added)
  - [ ] AI-generated job summary (formatted professionally)
  - [ ] Cost breakdown with GST
  - [ ] Terms and warranty information
  - [ ] Contact details footer

- [ ] **Photo positioning:**
  - [ ] Room view photos in gallery format
  - [ ] Moisture reading photos inline with data
  - [ ] Infrared photos side-by-side comparison

- [ ] **Store PDF:**
  - [ ] Upload to Supabase Storage
  - [ ] Save URL to inspection record
  - [ ] Track generation timestamp

- [ ] **PDF versioning:**
  - [ ] Track if PDF was edited/regenerated
  - [ ] Keep version history

---

## 📧 PHASE 7: EMAIL AUTOMATION SYSTEM (WEEK 3-4)

### Email Service Setup
- [ ] **Configure Resend API** with MRC domain
- [ ] **Create email templates** (21 total automated messages)
- [ ] **Setup logging** (email_log table)

### Email Template 1: Initial Enquiry Response
- [ ] **Trigger:** Form submission on `/request-inspection`
- [ ] **Send within:** 5 minutes
- [ ] **Template content:**
  - [ ] Thank you for enquiry
  - [ ] We'll call within 2 business hours
  - [ ] What to expect next
  - [ ] Operating hours (7am-7pm, 7 days)
  - [ ] Contact details

### Email Template 2: Inspection Booked Confirmation
- [ ] **Trigger:** Status change to 'inspection_booked'
- [ ] **Dynamic content:**
  - [ ] Client name
  - [ ] Inspection date and time
  - [ ] Property address
  - [ ] Assigned technician name
  - [ ] What to expect
  - [ ] Preparation instructions

### Email Template 3: 24-Hour Reminder
- [ ] **Trigger:** Scheduled job, 24 hours before inspection
- [ ] **Use cron job or scheduled function**
- [ ] Reminder of tomorrow's inspection

### Email Template 4: Inspection Report Delivery
- [ ] **Trigger:** PDF approved in "Report PDF Approval" category
- [ ] **Use comprehensive email generation prompt** (provided in requirements)
- [ ] **Dynamic content from PDF:**
  - [ ] Customer name and address
  - [ ] Key findings summary
  - [ ] Primary causes
  - [ ] Recommended solutions (immediate and ongoing)
  - [ ] Treatment options and pricing (exact $X,XXX.XX + GST format)
  - [ ] Booking request
  - [ ] **ATTACH PDF to email**
  - [ ] **Include client self-booking link**

- [ ] **Email formatting:**
  - [ ] Use section headers with emojis (🔍, 💡, 💰, 📅)
  - [ ] Professional but approachable tone
  - [ ] Australian spelling throughout
  - [ ] NO email signature (content only)

### Remaining Email Templates (5-21)
- [ ] Email 5: Project Approval Thank You
- [ ] Email 6: Work Scheduled Confirmation
- [ ] Email 7: Work Day Reminder (day before)
- [ ] Email 8: Work Completion Notification
- [ ] Email 9: Job Report Delivery (with before/after photos)
- [ ] Email 10: Invoice Sent
- [ ] Email 11: Payment Received Confirmation
- [ ] Email 12: Review Request (with incentive: 20% off next service)
- [ ] Email 13: Review Reminder (7 days later)
- [ ] Email 14: Final Review Request (14 days later)
- [ ] Internal Email 1: New Lead Notification (to admin)
- [ ] Internal Email 2: Inspection Completed (to admin)
- [ ] Internal Email 3: Payment Received (to admin)

### SMS Messages (8 Total)
- [ ] SMS 1: Initial Enquiry Response (short version)
- [ ] SMS 2: Inspection Booked
- [ ] SMS 3: Inspection Reminder (day before)
- [ ] SMS 4: Report Sent
- [ ] SMS 5: Work Scheduled
- [ ] SMS 6: Work Complete
- [ ] SMS 7: Invoice Sent
- [ ] SMS 8: Payment Received

### Email/SMS Best Practices
- [ ] **Keep SMS under 160 characters**
- [ ] **Include company name in every SMS**
- [ ] **Include contact number** (1800 954 117)
- [ ] **Track delivery status** in logs
- [ ] **Retry failed sends** (up to 3 attempts)

---

## 📅 PHASE 8: CALENDAR & BOOKING SYSTEM (WEEK 4)

### Calendar Display Page
- [ ] **Show job cards** matching lead pipeline design
- [ ] **Same card options** as in leads page
- [ ] **For inspection bookings:**
  - [ ] **Add Google Maps direction link** (suburb-based routing)
  - [ ] Calculate route from previous job or office
  - [ ] Estimated travel time display

### Client Self-Booking System
- [ ] **Create public booking form** (link sent in inspection report email)
- [ ] **Form fields:**
  - [ ] Confirmation code (validates access)
  - [ ] Preferred start date (calendar picker)
  - [ ] Special requirements (textarea)

- [ ] **Booking Logic (Bulletproof System):**
  1. [ ] **Fetch total job hours** from inspection cost estimate
  2. [ ] **Calculate capacity requirements:**
     - [ ] 1 technician = 8 hours max per day
     - [ ] 2 technicians = 16 hours max per day
     - [ ] If job > 16 hours: require consecutive days
  3. [ ] **Check availability:**
     - [ ] Query inspections table for scheduled inspections
     - [ ] Query jobs table for ongoing work
     - [ ] Query calendar_bookings for blocked time
     - [ ] Query technician_availability
  4. [ ] **Melbourne suburb travel time intelligence:**
     - [ ] Calculate realistic travel between suburbs
     - [ ] Example: Craigieburn (2pm) → Mernda (3pm) = BLOCKED (too tight)
     - [ ] Add 30-60min buffer based on distance
     - [ ] Use Google Maps Distance Matrix API or static lookup table
  5. [ ] **Multi-day job logic:**
     - [ ] If total_hours > 16: calculate days needed
     - [ ] Block consecutive calendar days
     - [ ] Ensure same technicians assigned throughout
  6. [ ] **Display only available dates** in calendar picker
  7. [ ] **Prevent double-booking** at database level (unique constraints)

- [ ] **On booking confirmation:**
  - [ ] Create records in jobs and calendar_bookings tables
  - [ ] Send confirmation email to client
  - [ ] Send notification to assigned technicians
  - [ ] Update lead status to 'job_approved'

### Internal Calendar Management
- [ ] **Admin view:** See all bookings (inspections + jobs)
- [ ] **Filter by:** Date range, Technician, Status, Suburb
- [ ] **Drag-and-drop rescheduling**
- [ ] **Conflict warnings** before saving changes
- [ ] **Color coding:**
  - [ ] Inspections: Blue
  - [ ] Jobs: Green
  - [ ] Blocked time: Red

---

## 🔔 PHASE 9: NOTIFICATION SYSTEM (WEEK 4)

### Notification Triggers
- [ ] **New lead received** (any source)
- [ ] **Lead status change** (any category transition)
- [ ] **Inspection scheduled**
- [ ] **Inspection completed**
- [ ] **Report approved by technician**
- [ ] **Client booking confirmed**
- [ ] **Work started**
- [ ] **Work completed**
- [ ] **Payment received**
- [ ] **Note added to lead**
- [ ] **Any system event**

### Notification Display (`/notifications` page)
- [ ] **List all notifications** for logged-in user
- [ ] **Show unread count badge** in navigation
- [ ] **Notification card design:**
  - [ ] Icon based on type
  - [ ] Title and message
  - [ ] Timestamp (relative: "2 hours ago")
  - [ ] Link to related lead/inspection/job
  - [ ] Read/unread visual indicator

- [ ] **Mark as read:**
  - [ ] Click on notification → mark as read
  - [ ] "Mark all as read" button
  - [ ] Update read_at timestamp in database

- [ ] **Filter options:**
  - [ ] All / Unread Only
  - [ ] By type (Leads / Inspections / Jobs / Payments)

---

## ⚙️ PHASE 10: SETTINGS & PROFILE PAGES (WEEK 4)

### `/profile` Page Cleanup
- [ ] **Keep ONLY:**
  - [ ] Edit profile (name, email, phone)
  - [ ] Activity overview (accurate tracking of user actions)
  - [ ] Sign out button

- [ ] **Remove sections:**
  - [ ] Notification preferences
  - [ ] Privacy and security
  - [ ] Any other unnecessary sections

- [ ] **Fix "Edit Profile":**
  - [ ] Modal with form
  - [ ] Update user record in database
  - [ ] Show success message

- [ ] **Activity Overview accuracy:**
  - [ ] Track: Inspections completed, Leads processed, Hours logged
  - [ ] Display recent activity timeline

### `/settings` Page Cleanup
- [ ] **Manage Users:**
  - [ ] **Simplify to single account type only** (remove complex roles)
  - [ ] List all users with name, email, status
  - [ ] **"Add New User" button:**
    - [ ] Modal with: Full name, Email, Phone, Password
    - [ ] Create user in database
    - [ ] Send welcome email

- [ ] **Pricing Configuration Section (NEW):**
  - [ ] **Base Rates Table:**
    - [ ] No Demolition (2h / 8h rates)
    - [ ] Demo (2h / 8h rates)
    - [ ] Construction (2h / 8h rates)
    - [ ] Subfloor (2h / 8h rates)
    - [ ] Editable inline
    - [ ] "Save Changes" button

  - [ ] **Equipment Hire Rates:**
    - [ ] Dehumidifier (per day)
    - [ ] Air mover/blower (per day)
    - [ ] RCD (per day)
    - [ ] Editable inline

  - [ ] **Save to pricing_settings table** with timestamp and user

- [ ] **Remove sections:**
  - [ ] Notifications
  - [ ] Appearance
  - [ ] System options (auto-sync is now always on)
  - [ ] Data and storage
  - [ ] Security and privacy
  - [ ] Help and support
  - [ ] About
  - [ ] Delete account option

- [ ] **Keep:**
  - [ ] Sign out option (prominent button)

---

## 📊 PHASE 11: REPORTS PAGE REDESIGN (WEEK 4)

### Complete Reports Page Overhaul
- [ ] **Delete current `/analytics` page** (shows 404)
- [ ] **Redesign `/reports` page** with comprehensive business intelligence:

#### Lead Source Tracking
- [ ] **Chart:** Leads by source (Website, HiPages, Phone, Referral, Google)
- [ ] **Time range selector:** This week / This month / This year / Custom
- [ ] **Table:** Source breakdown with conversion rates

#### Conversion Funnel
- [ ] **Visual funnel chart:**
  - [ ] New Leads
  - [ ] Inspections Booked
  - [ ] Inspections Completed
  - [ ] Reports Sent
  - [ ] Jobs Approved
  - [ ] Jobs Completed
  - [ ] Payments Received
- [ ] **Conversion percentages** at each stage
- [ ] **Drop-off analysis**

#### Revenue Analytics
- [ ] **Monthly revenue chart** (line graph, last 12 months)
- [ ] **Average job value** calculation
- [ ] **Revenue by service type** (No Demo / Demo / Construction / Subfloor)
- [ ] **Revenue by suburb** (top 10 suburbs)
- [ ] **Projected revenue** for current month

#### Technician Performance
- [ ] **Inspections completed** per technician
- [ ] **Jobs completed** per technician
- [ ] **Average job duration** per technician
- [ ] **Customer satisfaction** (if reviews tracked)
- [ ] **Revenue generated** per technician

#### Suburb Coverage
- [ ] **Map visualization** of Melbourne suburbs served
- [ ] **Table:** Jobs per suburb (sorted by volume)
- [ ] **Identify underserved areas** (opportunity analysis)
- [ ] **Travel time analysis** (avg time between jobs per suburb)

#### Time Tracking
- [ ] **Average time:** Lead → Inspection scheduled
- [ ] **Average time:** Inspection → Report sent
- [ ] **Average time:** Report sent → Job approved
- [ ] **Average time:** Job approved → Work completed
- [ ] **Identify bottlenecks** in workflow

#### Equipment Utilization
- [ ] **Dehumidifier hire days** (total per month)
- [ ] **Air mover hire days** (total per month)
- [ ] **Equipment revenue** (hire charges)
- [ ] **ROI on equipment** (if purchase costs tracked)

---

## 🚀 PHASE 12: DEPLOYMENT & GO-LIVE (WEEK 4)

### Pre-Deployment Checklist
- [ ] **Complete testing of all features:**
  - [ ] Test every form submission
  - [ ] Test all email automations
  - [ ] Test PDF generation with sample data
  - [ ] Test calendar booking logic (edge cases)
  - [ ] Test pricing calculations (all scenarios)
  - [ ] Test mobile responsiveness (375px viewport)

- [ ] **Database verification:**
  - [ ] All tables created
  - [ ] All relationships correct
  - [ ] All indexes in place
  - [ ] Row Level Security policies enabled
  - [ ] Test data cleaned up

- [ ] **Environment variables:**
  - [ ] Supabase URL and keys (production)
  - [ ] Resend API key (production)
  - [ ] OpenAI API key (production)
  - [ ] Any other secrets properly configured

- [ ] **Error handling:**
  - [ ] Graceful error messages for users
  - [ ] Error logging system (Sentry or similar)
  - [ ] 404 page design
  - [ ] 500 error page design

### Frontend Deployment
- [ ] **Deploy to production hosting:**
  - [ ] Build optimized production bundle
  - [ ] Deploy to Vercel/Netlify/Cloudflare Pages
  - [ ] Configure custom domain (if applicable)
  - [ ] Enable HTTPS/SSL
  - [ ] Configure CDN for assets

- [ ] **Performance optimization:**
  - [ ] Image optimization (WebP format, lazy loading)
  - [ ] Code splitting for faster loads
  - [ ] Service worker for offline functionality
  - [ ] Cache static assets
  - [ ] Lighthouse score > 90

### Backend Deployment
- [ ] **Supabase Production Setup:**
  - [ ] Migrate database schema to production
  - [ ] Configure production connection pooling
  - [ ] Enable database backups (daily)
  - [ ] Set up monitoring and alerts

- [ ] **API Endpoints:**
  - [ ] Verify all endpoints functional
  - [ ] Rate limiting configured
  - [ ] CORS settings correct
  - [ ] Authentication working

- [ ] **Cloud Storage:**
  - [ ] Configure Supabase Storage buckets (photos, PDFs)
  - [ ] Set proper permissions and policies
  - [ ] Enable CDN for file delivery

### Post-Deployment Monitoring
- [ ] **Setup monitoring:**
  - [ ] Uptime monitoring (UptimeRobot, Pingdom)
  - [ ] Error tracking (Sentry)
  - [ ] Analytics (Google Analytics or Plausible)
  - [ ] Performance monitoring (Lighthouse CI)

- [ ] **Create admin dashboard:**
  - [ ] System health indicators
  - [ ] Recent errors log
  - [ ] API usage stats
  - [ ] Database performance metrics

### Training & Documentation
- [ ] **Create user documentation:**
  - [ ] Admin user guide (how to manage leads, view reports)
  - [ ] Technician guide (how to complete inspections)
  - [ ] Troubleshooting guide

- [ ] **Training sessions:**
  - [ ] Train Clayton and Glen on system usage
  - [ ] Walk through entire workflow
  - [ ] Practice with test leads

### Go-Live Transition
- [ ] **Data migration from Airtable:**
  - [ ] Export existing lead data
  - [ ] Import into new system (preserving history)
  - [ ] Verify data integrity

- [ ] **Parallel running period:**
  - [ ] Run new system alongside Airtable for 1-2 weeks
  - [ ] Verify all automations working
  - [ ] Compare results

- [ ] **Full cutover:**
  - [ ] Disable Airtable automations
  - [ ] Make new system primary
  - [ ] Archive Airtable as backup only

---

## 🎯 CRITICAL SUCCESS FACTORS

### Non-Negotiable Requirements
1. **Mobile-first everything** (technicians work on phones)
2. **No data loss ever** (complete audit trail)
3. **Automations must be reliable** (emails sent 100% of time)
4. **Fast load times** (under 3 seconds on 4G)
5. **Offline capability** (inspection form works without internet)
6. **Accurate pricing** (calculations match business rules exactly)
7. **Bulletproof calendar** (no double-bookings possible)

### Quality Standards
- [ ] **Code quality:** ESLint + Prettier configured and passing
- [ ] **Type safety:** TypeScript strict mode enabled
- [ ] **Testing:** Playwright tests covering critical paths
- [ ] **Accessibility:** WCAG 2.1 AA compliance
- [ ] **Security:** OWASP top 10 vulnerabilities addressed
- [ ] **Performance:** Lighthouse score > 90 on mobile

---

## 📝 NOTES FOR CLAUDE CODE

### Development Approach
1. **Start with database schema** - foundation for everything
2. **Build backend APIs** before frontend features
3. **Test incrementally** - don't move forward with broken code
4. **Mobile-first always** - test at 375px after every change
5. **Git commits frequently** - checkpoint working code

### Key Integrations
- **Supabase:** Database, auth, storage, real-time
- **Resend API:** Email automation
- **OpenAI API:** AI-generated report summaries
- **Puppeteer:** PDF generation
- **Google Maps API:** Travel time calculation (optional - can use static lookup)

### Australian Business Requirements
- **Phone format:** (03) XXXX XXXX or 04XX XXX XXX
- **ABN format:** XX XXX XXX XXX
- **GST:** Always 10% on top of subtotal
- **Currency:** Australian dollars ($X,XXX.XX format)
- **Date format:** DD/MM/YYYY (Australian standard)
- **Timezone:** Australia/Melbourne (AEST/AEDT)
- **Spelling:** Australian English throughout (colour, labour, organise)

### Business Rules to Remember
- **Operating hours:** 7am-7pm, 7 days a week
- **Service area:** Melbourne metro only
- **Technicians:** 2 total (Clayton and Glen)
- **Max discount:** 13% (never exceed)
- **Job capacity:** 8 hours per technician per day
- **Multi-day jobs:** Must be consecutive days
- **Review incentive:** 20% off next service

---

## 📊 PROGRESS TRACKING

**Total Tasks:** ~220
**Completed:** 0
**In Progress:** 0
**Blocked:** 0
**Remaining:** 220

**Current Phase:** Phase 0 - Database Schema & Architecture
**Next Milestone:** Complete database design and API foundation
**Target Completion:** 4 weeks from start date

---

## 🚨 KNOWN ISSUES TO FIX

1. Page reload/reset issue (CRITICAL)
2. Email verification not sending (authentication broken)
3. Inspection form AI sections need removal
4. Pricing calculation not matching business rules
5. Calendar has no conflict detection
6. PDF generation incomplete
7. No email automation working yet
8. Dashboard statistics not accurate
9. Lead pipeline missing HiPages category
10. Mobile viewport needs fixing throughout

---

*This TODO list is comprehensive and actionable. Every checkbox represents a distinct, testable deliverable. Use this as your single source of truth for the MRC Lead Management System implementation.*

**Last Updated:** November 10, 2025
**Document Owner:** Michael (Master Prompter)
**Development Team:** Claude Code
**Project Duration:** 4 weeks intensive
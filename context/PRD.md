# MRC Lead Management System - Product Requirements Document (PRD)

**Version:** 2.0
**Date:** February 7, 2025
**Status:** In Development - Phase 1 Technician Role (80% Complete)
**Project:** Mould & Restoration Co. Lead Management System

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [User Personas](#user-personas)
4. [Complete Workflow](#complete-workflow)
5. [Feature Specifications](#feature-specifications)
6. [Email Automation](#email-automation)
7. [PDF Generation System](#pdf-generation-system)
8. [Customer Self-Booking Calendar](#customer-self-booking-calendar)
9. [Success Metrics](#success-metrics)
10. [Out of Scope (Sprint 2)](#out-of-scope-sprint-2)

---

## 🎯 Executive Summary

### **Problem Statement**
MRC currently manages mould remediation leads and inspections manually, resulting in:
- Data loss from handwritten inspection notes
- Slow quote turnaround (24-48 hours)
- Manual PDF report creation (2-3 hours per report)
- Missed follow-ups and lost revenue
- No centralized customer history

### **Solution**
A mobile-first SaaS platform that automates the complete lead-to-inspection workflow with:
- **Offline-capable mobile inspection forms** with auto-save
- **AI-generated inspection summaries** from field data
- **Automated PDF report generation** from beautiful HTML templates
- **Smart email automation** at every pipeline stage
- **Customer self-service booking** with travel time intelligence
- **Zero data loss** guarantee

### **Sprint 1 Scope (Production Demo Ready)**
Complete lead capture → inspection → PDF generation → customer booking workflow, fully functional and demo-ready for business owners.

### **Business Impact**
- **Inspection-to-quote time:** 24-48 hours → **2 hours**
- **Report generation:** 2-3 hours → **5 minutes**
- **Data accuracy:** 60% → **100%**
- **Lead response time:** 4-6 hours → **Instant (automated)**
- **Customer satisfaction:** Professional, fast, automated communication

---

## 🌟 Product Vision

### **Mission**
Create a **Simple, Loveable, Complete (SLC)** lead management system that feels like a finished product, not an MVP, while maintaining a tight scope focused on the inspection workflow.

### **Design Principles**
1. **Mobile-First:** Field technicians are primary users (vans, outdoors, work gloves)
2. **Zero Data Loss:** Auto-save, offline mode, no page reloads losing data
3. **Speed:** Sub-3 second interactions, instant feedback
4. **Automation:** Reduce manual work by 80%
5. **Professional:** Melbourne business standards (ABN, GST, Australian formatting)
6. **Delight:** Beautiful PDFs, smart automations, seamless workflow

---

## 👥 User Personas

### **1. Field Technician (Clayton & Glen)**

**Role:** Conducts inspections, completes forms, approves reports

**Daily Workflow:**
- 7:00 AM: Check today's schedule on mobile
- 8:00 AM: Drive to first inspection (GPS directions)
- 9:00 AM: Complete inspection form on-site (iPad/phone)
- 10:00 AM: Review AI-generated summary, approve PDF
- System auto-sends report to customer
- Repeat for jobs throughout day

**Pain Points (Current):**
- Handwritten notes get lost
- Can't complete forms offline (basements, poor signal)
- Manual PDF creation takes hours
- Forgot to take required photos

**Goals:**
- Complete inspection in <60 minutes
- Zero data entry after leaving site
- Professional reports sent same day
- Clear schedule with travel time

**Tech Proficiency:** Moderate (comfortable with iPad, not power users)

---

### **2. Office Admin**

**Role:** Manages leads, schedules inspections, customer communication

**Daily Workflow:**
- Answer phones → Create leads in system
- HiPages leads → Copy into system
- Call new leads → Schedule inspections
- Monitor pipeline → Follow up on quotes
- Handle customer inquiries

**Pain Points (Current):**
- Manual data entry (typing from HiPages)
- Tracking which leads were contacted
- Remembering to follow up
- Scheduling conflicts

**Goals:**
- Instant lead capture (no re-typing)
- Automated reminders for follow-ups
- Clear pipeline visibility
- Faster customer responses

**Tech Proficiency:** High (uses CRM daily)

---

### **3. Customer**

**Role:** Homeowner/property manager needing mould inspection

**User Journey:**
1. Submit inspection request (website form)
2. Receive booking confirmation email
3. Technician arrives for inspection
4. Receive detailed PDF report same day
5. Click link to self-book remediation job
6. Job completed → Receive invoice
7. Payment → Asked for Google review

**Pain Points (Current):**
- Slow responses (wait 24-48 hours for quote)
- Phone tag (scheduling via phone calls)
- Unprofessional reports (unclear pricing)

**Goals:**
- Fast response (<1 hour)
- Professional communication
- Easy online booking
- Transparent pricing

**Tech Proficiency:** Varies (must work for 60+ year olds)

---

## 🔄 Complete Workflow (12-Stage Pipeline)

### **Stage 1: HiPages Lead** (New Category)

**Trigger:** HiPages API integration (or manual entry)

**Lead Data Captured:**
- Suburb + Postcode
- Phone number
- Email address

**Job Card Actions:**
- 📞 **Call/Text Customer** button
- 📝 **Fill Out Details** (opens modal)

**"Fill Out Details" Modal Fields:**
- Full name
- Phone number (pre-filled)
- Email address (pre-filled)
- Street address
- Suburb (pre-filled)
- Booking urgency dropdown:
  - ASAP
  - Within a week
  - Next couple of weeks
  - Within a month
  - Next couple of months
- Description of issue

**Automation:**
- On submit → Lead moves to **Stage 2: New Lead**

---

### **Stage 2: New Lead**

**Trigger:**
- Website form submission (`/request-inspection`)
- HiPages lead details filled out

**Lead Data Captured:**
- Full name
- Phone number (formatted: 04XX XXX XXX)
- Email address
- Street address
- Suburb
- Postcode
- Booking urgency
- Issue description

**Job Card Actions:**
- 📞 **Call** button (click-to-call on mobile)
- 👁️ **View Lead** → Opens lead detail page
- 🗑️ **Delete** button

**Automation:**
- **Instant email sent** to customer:
  - Subject: "Thank you for contacting MRC - Inspection Request Received"
  - Body: Professional acknowledgment, expectations, contact info
  - Template: `new-lead-response-email.html`

**Lead Detail Page:**
- Full customer information
- Website source tracked
- Urgency level displayed
- Property details
- Issue description
- **Schedule Inspection** button (prominent)

---

### **Stage 3: Inspection Booked (Awaiting Inspection)**

**Trigger:** Admin/technician schedules inspection

**Schedule Inspection Form:**
- Inspection date picker
- Time slot dropdown (7:00 AM - 7:00 PM, 30-min intervals)
- Assigned technician (Clayton or Glen)
- Internal notes (optional)

**Job Card Actions:**
- 📞 **Call** button
- 🚀 **Start Inspection** button
- 👁️ **View Lead** button
- 🗑️ **Delete** button

**Automation:**
- **Booking confirmation email** sent immediately:
  - Subject: "Mould Inspection Confirmed – [Address]"
  - Body: Confirmation details, technician name, date/time, what to expect
  - Template: Based on your provided template (updated to HTML)
- **Notification created** for assigned technician
- **Calendar event created** (appears on `/calendar` page)
- **24-hour reminder email** sent automatically:
  - Sent 24 hours before inspection
  - Subject: "Reminder: MRC Inspection Tomorrow at [Time]"
  - Friendly reminder with technician details

---

### **Stage 4: Inspection In Progress**

**Trigger:** Technician clicks "Start Inspection"

**Action:** Opens `/inspection/new?leadId=[id]`

**Inspection Form Features:**
- Auto-save every 30 seconds to localStorage
- Offline mode (works without internet)
- Sync when connection restored
- Progress indicators per section
- Photo upload (camera integration)
- Editable pricing at end

**Inspection Form Sections:**

1. **Basic Information**
   - Job number (auto-generated: MRC-YYYY-XXXX)
   - Inspector name (auto-filled)
   - Inspection date (auto-filled: today)
   - Property occupation, dwelling type

2. **Outdoor Environment** (3 photos)
   - Temperature, Humidity, Dew Point
   - Outdoor comments

3. **Area Inspections** (Repeatable)
   - Area name
   - Temperature, Humidity, Dew Point
   - Visible mould locations (checkboxes)
   - Moisture readings (table)
   - 4+ room view photos
   - Infrared photos (optional toggle)
   - Infrared observations
   - Work procedure (no demo / demo required)
   - Demolition details (if demo selected)
   - Internal notes (not shown in report)
   - Area notes for report (plain text, no AI)

4. **Subfloor Assessment** (Toggle)
   - Observations, landscape, comments
   - Subfloor readings table
   - 6+ photos
   - Sanitation/racking checkboxes
   - Treatment time

5. **Demolition Details** (Toggle - NEW PAGE IN PDF)
   - Appears after Problem Analysis page
   - Specifications for material removal per area
   - Dynamic content based on areas with demolition

6. **Inventory Assessment** (Toggle - NEW PAGE IN PDF)
   - VCAT documentation section
   - Salvageable items list (with treatment protocol)
   - Non-salvageable items list (with disposal protocol)
   - Free-text input for detailed inventory
   - Onsite confirmation notes

7. **Work Procedures**
   - Waste disposal (toggle + amount)
   - HEPA vac, antimicrobial, fogging (checkboxes)
   - Drying equipment (toggle + quantities)

8. **Direction Photos** (Toggle)
   - Front door, front house, mailbox, street view

9. **Job Summary** (AI-Generated)
   - **Input:** All inspection data submitted
   - **AI Prompt:** Uses your provided "INSTRUCTIONS FOR MOULD INSPECTION SUMMARY REPORTS"
   - **Output:**
     - Summary of Findings paragraph
     - Identified Causes (primary + contributing factors)
     - Recommendations (immediate + long-term)
     - Overview & Conclusion paragraph
   - **Technician can edit** before approval

10. **Cost Estimate**
    - Auto-calculated from labor hours + equipment
    - **Pricing is editable** (technician can override)
    - GST calculated automatically (10%)
    - Equipment costs shown separately

**Pricing Calculation Logic:**

```
Base Rates (excluding GST):
- No demolition (surface): 2h = $612.00, 8h = $1,216.99
- Demolition: 2h = $711.90, 8h = $1,798.90
- Construction: 2h = $661.96, 8h = $1,507.95
- Subfloor: 2h = $900.00, 8h = $2,334.69

Multi-Day Discount:
- If total hours > 8 hours:
  - 16 hours (2 days) = 7.5% discount (multiply by 0.925)
  - 24+ hours = Cap at 13% discount (multiply by 0.87)

Equipment Costs (per day, excluding GST):
- Dehumidifier: $132/day
- Air mover: $46/day
- RCD box: $5/day

Final Calculation:
1. Calculate labor cost (with multi-day discount if applicable)
2. Add equipment costs
3. Subtotal = Labor + Equipment
4. GST = Subtotal × 0.10
5. Total = Subtotal + GST
```

**On Form Submit:**
- Show loading spinner: "Generating inspection report..."
- Trigger Supabase Edge Function (PDF generation)
- Display success notification: "✅ Inspection report generated!"
- Lead moves to **Stage 5: Report PDF Approval**

**Auto-Save Behavior:**
- Every 30 seconds: Save to `localStorage` with key `inspection-draft-${leadId}`
- On page load: Check for draft, show "Resume draft from [timestamp]?" banner
- On successful submit: Clear localStorage draft
- On navigation away: Show "Unsaved changes" warning

---

### **Stage 5: Report PDF Approval**

**Trigger:** Inspection form submitted successfully

**Job Card Actions:**
- 📄 **View PDF** → Opens PDF preview modal
- ✅ **Approve & Send** button
- 👁️ **View Lead** button
- 🗑️ **Delete** button

**PDF Preview Modal:**
- Shows generated PDF in iframe
- **Edit** button → Opens text editor for AI summary section
- **Regenerate PDF** button (if edited)
- **Approve & Send** button

**Edit Functionality:**
- Technician can edit:
  - Job Summary (AI-generated section)
  - Any text fields in the PDF
- Saves to database
- Regenerates PDF with new content
- Version control (tracks edits)

**Automation on "Approve & Send":**
- PDF marked as "Approved" (locked, no more edits)
- PDF moved to permanent storage folder
- **Email sent immediately** to customer:
  - Subject: "MRC Mould Inspection Report – [Address]"
  - Body: Uses your provided email prompt template
  - Attachment: Approved PDF
  - Includes self-booking link
- Lead moves to **Stage 6: Awaiting Job Approval**

---

### **Stage 6: Awaiting Job Approval**

**Trigger:** Inspection report email sent to customer

**Job Card Actions:**
- 📞 **Call** button
- 📧 **Email** button (optional manual follow-up)
- 👁️ **View Lead** → Full lead history
- 🗑️ **Delete** → Archive as "Failed Lead"

**Customer Action:**
- Receives email with PDF report
- Reviews pricing and findings
- Clicks **"Book Your Remediation Job"** link
- Opens customer self-booking calendar

**Automation:**
- **3-day follow-up email** if no booking:
  - Subject: "Following up - [Address] Inspection Report"
  - Body: Friendly reminder, offer to answer questions
- **7-day follow-up email** if still no booking:
  - Subject: "Have questions about your mould inspection?"
  - Body: Offer phone call, address concerns

**View Lead Page:**
- Complete customer information
- Timeline of all activities:
  - Lead created (timestamp, source)
  - Inspection scheduled (who, when)
  - Inspection completed (technician, date)
  - Report sent (timestamp, email status)
  - Customer viewed email (if tracked)
- All saved PDFs (inspection report)
- Notes section with @mentions
  - @Clayton, @Glen, @Admin
  - Sends in-app notification when mentioned
- Edit customer details button
- Activity history (who did what, when)

---

### **Stage 7: Job Booked**

**Trigger:** Customer completes self-booking calendar

**Job Card Actions:**
- 🗺️ **Directions** → Opens Google Maps to property
- 🚀 **Start Job** button
- 📞 **Call** button
- 👁️ **View Lead** button

**Automation:**
- **Booking confirmation email** sent to customer:
  - Subject: "Job Booking Confirmed – [Date Range]"
  - Body: Confirmation details, what to expect, preparation instructions
- **Notification sent** to assigned technician(s)
- **Calendar updated** with multi-day job block
- **24-hour reminder email** sent before job start:
  - Subject: "Reminder: MRC Job Starting Tomorrow"
  - Body: Arrival time, technician details, contact info

**Calendar Behavior:**
- Multi-day jobs block consecutive days
- Shows as single calendar event spanning multiple days
- Color-coded by job type
- Displays customer name, address, job hours

---

### **Stage 8: Job In Progress**

**Trigger:** Technician clicks "Start Job"

**Job Card Actions:**
- 👁️ **View Lead** button
- ✅ **Complete Job** button

**Complete Job Functionality:**
- Opens job completion form
- Captures additional hours (if job took longer than estimated)
- Final notes
- Completion timestamp

---

### **Stage 9: Job Completed** (Sprint 2)

**Trigger:** Technician marks job as complete

**Automation:**
- Generate job report PDF (different template from inspection report)
- Send completion email with job report
- Generate invoice automatically
- Move to Stage 10

---

### **Stage 10: Invoice Sent** (Sprint 2)

**Trigger:** Job marked complete

**Automation:**
- Invoice PDF generated
- Email sent with payment details
- Track invoice status (sent, viewed, overdue)

---

### **Stage 11: Payment Received** (Sprint 2)

**Trigger:** Admin manually marks "Payment Received"

**Automation:**
- Payment confirmation email
- Warranty activated (12 months)
- Move to Stage 12

---

### **Stage 12: Job Closed - Request Review** (Sprint 2)

**Trigger:** Payment received

**Automation:**
- Google review request email
- Subject: "We'd love your feedback!"
- Body: Thank you, request review, link to Google
- Track if review left

---

## 🎨 Feature Specifications

### **1. Lead Capture - Website Form** (`/request-inspection`)

**Location:** Public-facing page (no login required)

**Form Fields:**
- Full name (required)
- Email address (required, validated)
- Phone number (required, auto-formatted to 04XX XXX XXX)
- Street address (required)
- Suburb (required)
- Postcode (required, validated for VIC: 3000-3999, 8000-8999)
- Booking urgency (required, dropdown):
  - ASAP
  - Within a week
  - Next couple of weeks
  - Within a month
  - Next couple of months
- Description of issue (optional, textarea, max 1000 chars)

**Validation:**
- Email: Valid format
- Phone: Australian mobile (04XX XXX XXX) or landline (0X XXXX XXXX)
- Postcode: 4 digits, VIC ranges

**On Submit:**
- Show loading spinner
- Save to Supabase `leads` table
- Create activity log entry
- Trigger "New Lead Response" email
- Redirect to `/inspection-success` page
- Clear form (prevent duplicate submissions)

**Success Page:**
- "Thank you! We've received your inspection request."
- "You'll receive a confirmation email shortly."
- Expected response time: "Within 1 business hour"
- Display MRC logo, contact info

**Mobile Optimization:**
- Touch-friendly inputs (min 48px height)
- Automatic keyboard type (email, tel, number)
- Clear error messages
- Progress indicator (if multi-step)

---

### **2. Lead Pipeline - Kanban Board** (`/leads`)

**Layout:**
- Horizontal scrollable stages (mobile)
- Drag-and-drop between stages (desktop)
- Stage columns:
  1. HiPages Lead
  2. New Lead
  3. Inspection Booked
  4. Report PDF Approval
  5. Awaiting Job Approval
  6. Job Booked
  7. Job In Progress
  8. Job Completed (Sprint 2)
  9. Invoice Sent (Sprint 2)
  10. Payment Received (Sprint 2)
  11. Closed - Review Requested (Sprint 2)
  12. Failed/Archived

**Job Card Design:**
- Customer name (large, bold)
- Address (suburb, postcode)
- Urgency indicator (color-coded badge)
- Lead source icon (HiPages, Website, Referral)
- Days in current stage (e.g., "3 days")
- Action buttons (context-specific per stage)

**Stage Counts:**
- Show count of leads per stage (e.g., "New Lead (5)")
- Total leads in pipeline

**Filters:**
- By technician (Clayton, Glen, Unassigned)
- By urgency (ASAP, High, Medium, Low)
- By date range
- By lead source

**Search:**
- Search by customer name, address, phone, email
- Real-time filtering

**Performance:**
- Lazy load lead cards (virtual scrolling)
- Cache pipeline data (React Query)
- Optimistic UI updates (immediate drag-and-drop feedback)

---

### **3. Inspection Form** (`/technician/inspection?leadId={id}`)

**Mobile-First Design:**
- One section visible at a time (accordion style)
- Large touch targets (48px min) for work gloves
- Sticky header with progress bar
- Floating "Save" button
- Offline mode indicator

**10-Step Inspection Workflow (Implemented):**

1. **Basic Information:** Job #, Triage, Address, Inspector, Date.
2. **Property Details:** Occupation (Vacant/Tenanted), Dwelling Type (House/Unit/Apartment).
3. **Area Inspection (Repeatable):**
    - Temp/Humidity/Dew Point readings
    - Visible mould locations
    - Moisture readings table (Repeatable)
    - Room Photos (4 max) & Infrared Toggle
    - Demolition requirements per area
4. **Subfloor Assessment:**
    - Toggle enabled/disabled
    - Readings & Observation notes
    - Photos (up to 20)
    - Sanitation & Racking toggles
5. **Outdoor Info:**
    - Climate readings (Temp/Humidity/Dew Point)
    - Photos: Front Door, Front House, Mailbox, Street
    - Direction photos toggle
6. **Waste Disposal:**
    - Size selection (Small/Medium/Large/XL)
7. **Work Procedure:**
    - HEPA Vac, Antimicrobial, Fogging toggles
    - Drying Equipment: Dehumidifier/Air Mover/RCD Box quantities
8. **Job Summary:**
    - Recommendation Dehumidifier size
    - Cause of Mould textarea
    - Parking options
9. **Cost Estimate:**
    - **Live Calculation:** Updates as hours/equipment change
    - **Breakdown Display:** Tiered rates (2h/8h), Equipment costs, GST
    - **Discount Logic:**
        - &le; 8 hours: 0% discount
        - 9-16 hours: 7.5% discount
        - 17-24 hours: 10.25% discount
        - 25-32 hours: 11.5% discount
        - 33+ hours: **Capped at 13%** (Strict Business Rule)
10. **AI Job Summary:**
    - "Generate AI Summary" button
    - Generates: Findings, Causes, Recommendations, Conclusion
    - Editable textareas for final refinement

**Auto-Save & Offline:**
- Saves to `localStorage` every 30 seconds
- Syncs to Supabase `inspections` table when online
- Service Worker caches static assets for offline load
---

### **4. Notification System**

**Notification Types:**
- Lead assigned to you
- @Mention in notes
- Inspection scheduled for today
- Report awaiting approval
- Payment overdue (Sprint 2)
- Booking reminder (24 hours before)
- Job reminder (24 hours before)
- System errors (email send failure, PDF generation failure)

**Notification UI:**
- Bell icon in top nav (badge with count)
- Dropdown panel:
  - Grouped by type
  - Newest first
  - Mark as read
  - Click to navigate to relevant page
- Unread count persists across sessions

**Notification Storage:**
- Supabase `notifications` table
- Fields: user_id, type, title, message, link, read, created_at

**Real-Time:**
- Supabase Realtime subscriptions
- Toast notification when new notification arrives
- Auto-refresh notification count

---

### **5. Calendar Page** (`/calendar`)

**View Modes:**
- Month view (default)
- Week view
- Day view (mobile-optimized)

**Event Types:**
- Inspections (1-hour blocks, blue)
- Jobs (multi-day blocks, green)
- Travel time (gray blocks, non-interactive)
- Blocked time (admin can block dates)

**Event Details:**
- Customer name
- Property address
- Job type (inspection vs. remediation)
- Assigned technician
- Estimated duration
- Click to view full lead details

**Filtering:**
- By technician (Clayton, Glen, All)
- By event type (Inspections, Jobs, All)

**Actions:**
- Click event → View lead
- Drag-and-drop to reschedule (admin only)
- Click empty slot → Quick-add inspection booking

**Sync Behavior:**
- Calendar data cached (React Query)
- Real-time updates (Supabase Realtime)
- Optimistic UI (immediate feedback on changes)

---

### **6. Settings - Editable Pricing** (`/settings`)

**Pricing Configuration:**
- Labor rates (per hour):
  - No demolition (surface): 2h rate, 8h rate
  - Demolition: 2h rate, 8h rate
  - Construction: 2h rate, 8h rate
  - Subfloor: 2h rate, 8h rate
- Equipment rates (per day):
  - Dehumidifier
  - Air mover
  - RCD box
- Multi-day discount percentages:
  - 2 days (16 hours): X%
  - 3+ days: Y% (max 13%)

**Version Control:**
- Historical pricing saved
- Old quotes use old rates (locked)
- New quotes use current rates
- "Last updated" timestamp
- "Updated by" user tracking

**UI:**
- Simple form layout
- All rates editable
- Save button
- Confirmation: "Pricing updated. New quotes will use these rates."

---

## 📧 Email Automation

### **Email Infrastructure - Resend API**

**Why Resend:**
- ✅ Free tier: 3,000 emails/month
- ✅ Never goes to spam (SPF, DKIM, DMARC)
- ✅ React Email templates (beautiful, responsive)
- ✅ Delivery tracking (opens, clicks)
- ✅ Bounce/complaint handling
- ✅ Custom domain: admin@mouldandrestoration.com.au

**Setup Requirements:**
1. Domain verification (mouldandrestoration.com.au)
2. DNS records (SPF, DKIM, DMARC) - added to domain registrar
3. Resend API key stored in Supabase secrets
4. React Email templates in codebase

---

### **Email Templates (React Email)**

**Template Structure:**
```tsx
// components/emails/NewLeadResponse.tsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

export default function NewLeadResponseEmail({ customerName, address }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f5f5f5' }}>
        <Container>
          <Text>Dear {customerName},</Text>
          <Text>Thank you for contacting Mould & Restoration Co...</Text>
          <Button href="tel:1800954117">Call Us: 1800 954 117</Button>
        </Container>
      </Body>
    </Html>
  );
}
```

**Template Variables:**
- Customer name, address, property details
- Inspection date/time, technician name
- Booking links, calendar links
- Pricing, invoice details
- MRC branding (logo, colors, footer)

---

### **Email Triggers & Templates**

#### **1. New Lead Response Email**
**Trigger:** Website form submitted (`/request-inspection`)
**Sent to:** Customer
**Subject:** "Thank you for contacting MRC - Inspection Request Received"
**Template:** `new-lead-response.tsx`
**Variables:** `{ customerName, address, suburb, urgency }`
**Content:**
- Thank you message
- What happens next (response within 1 hour)
- Contact information
- Professional MRC branding

---

#### **2. Inspection Booking Confirmation Email**
**Trigger:** Inspection scheduled
**Sent to:** Customer
**Subject:** "Mould Inspection Confirmed – [Address]"
**Template:** `inspection-booking-confirmation.tsx`
**Variables:** `{ customerName, address, inspectionDate, inspectionTime, technicianName, issueDescription }`
**Content:**
- Confirmation of booking
- Technician details
- What to expect during inspection
- Preparation instructions (if any)
- Contact information if changes needed

**Example (from your template):**
```
Dear Kasey,

Thank you for reaching out to Mould & Restoration Co.

We've received your enquiry regarding mould growth under the carpet in the room adjacent to your bathroom, which appears to be linked to the recent shower waterproofing failure.

We're pleased to confirm that we service South Morang and can absolutely assist with your inspection and treatment requirements.

Next Steps:
Our team will contact you within the next business day to arrange a suitable inspection time...

[Rest of template]
```

---

#### **3. Inspection Reminder Email (24 hours before)**
**Trigger:** Automated cron job (24 hours before inspection)
**Sent to:** Customer
**Subject:** "Reminder: MRC Inspection Tomorrow at [Time]"
**Template:** `inspection-reminder.tsx`
**Variables:** `{ customerName, inspectionDate, inspectionTime, technicianName, address }`
**Content:**
- Friendly reminder
- Technician arrival time
- Contact number if customer needs to reschedule
- What to prepare

---

#### **4. Inspection Report Email**
**Trigger:** Technician approves PDF report
**Sent to:** Customer
**Subject:** "MRC Mould Inspection Report – [Full Property Address]"
**Template:** `inspection-report.tsx`
**Variables:** `{ customerName, address, findings, causes, pricing, bookingLink, pdfUrl }`
**Attachment:** Approved inspection report PDF
**Content:** (Uses your exact template structure)

```
Dear [Name],

Please find attached the Mould Inspection Report for [Address].

🔍 Key Findings
[Summary of findings from AI-generated section]

💡 Recommended Solutions
Immediate Actions:
- [Action 1]
- [Action 2]

Ongoing Prevention:
- [Prevention measure 1]

💰 Treatment Options
[Pricing details from quote]
Total: $X,XXX.XX + GST

📅 When Would You Like to Book?
[Button: Book Your Remediation Job]
[Link to self-booking calendar]

If you have any questions, please don't hesitate to contact us.
```

---

#### **5. Job Booking Follow-Up Email (3 days after report)**
**Trigger:** Automated cron job (3 days after report sent, if no booking)
**Sent to:** Customer
**Subject:** "Following up - [Address] Inspection Report"
**Template:** `job-booking-followup.tsx`
**Variables:** `{ customerName, reportDate, bookingLink }`
**Content:**
- Friendly check-in
- Offer to answer questions
- Reminder of booking link
- Contact information

---

#### **6. Job Booking Follow-Up Email #2 (7 days after report)**
**Trigger:** Automated cron job (7 days after report sent, if still no booking)
**Sent to:** Customer
**Subject:** "Have questions about your mould inspection?"
**Template:** `job-booking-followup-2.tsx`
**Variables:** `{ customerName, reportDate, phoneNumber }`
**Content:**
- Offer phone consultation
- Address common concerns (pricing, timeline, warranty)
- Final opportunity to book
- Move to archived if no response

---

#### **7. Job Booking Confirmation Email**
**Trigger:** Customer completes self-booking
**Sent to:** Customer + Technician
**Subject:** "Job Booking Confirmed – [Date Range]"
**Template:** `job-booking-confirmation.tsx`
**Variables:** `{ customerName, address, startDate, endDate, technicianName, jobHours }`
**Content:**
- Confirmation of job dates
- Technician arrival time
- What to expect (equipment, duration, access needed)
- Preparation instructions (clear area, pets, access)
- Contact information

---

#### **8. Job Reminder Email (24 hours before)**
**Trigger:** Automated cron job (24 hours before job start)
**Sent to:** Customer + Technician
**Subject:** "Reminder: MRC Job Starting Tomorrow"
**Template:** `job-reminder.tsx`
**Variables:** `{ customerName, address, startDate, startTime, technicianName }`
**Content:**
- Friendly reminder
- Technician arrival window
- Contact number
- Final preparation reminders

---

#### **9-12. Sprint 2 Emails**
- Job completion email (with job report PDF)
- Invoice email (with payment link)
- Payment confirmation email
- Google review request email

---

### **Email Delivery Tracking**

**Metrics Tracked:**
- Sent timestamp
- Delivered (Resend webhook)
- Opened (pixel tracking)
- Clicked (link tracking)
- Bounced (hard/soft)
- Complained (marked as spam)

**Database Schema:**
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  recipient_email TEXT,
  email_type TEXT, -- 'new_lead_response', 'inspection_confirmation', etc.
  subject TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced_at TIMESTAMP,
  complaint_at TIMESTAMP,
  resend_id TEXT, -- Resend API message ID
  error_message TEXT
);
```

---

## 📄 PDF Generation System

### **Technology Stack**

**Supabase Edge Functions + Puppeteer**

**Why This Approach:**
- ✅ Generates pixel-perfect PDFs from your HTML templates
- ✅ Serverless (no infrastructure to manage)
- ✅ Versioning (save multiple versions before approval)
- ✅ Editable (regenerate PDF with updated data)
- ✅ Scalable (auto-scales with demand)

**PDF Generation Flow:**
```
1. Inspection form submitted
   ↓
2. Save data to Supabase `inspections` table
   ↓
3. Trigger Edge Function: generate-inspection-pdf
   ↓
4. Edge Function:
   - Fetch inspection data
   - Fetch HTML template
   - Replace template variables with data
   - Launch Puppeteer (headless Chrome)
   - Render HTML → PDF
   - Upload PDF to Supabase Storage (draft folder)
   - Return PDF URL
   ↓
5. Show PDF preview to technician
   ↓
6. [If technician edits]
   - Update inspection data
   - Regenerate PDF
   - Overwrite draft PDF
   ↓
7. [Technician approves]
   - Copy PDF from draft/ to approved/
   - Lock PDF (no more edits)
   - Trigger email with PDF attachment
```

---

## 🏗️ Technical Architecture (Serverless)

### **Edge Functions**
We use Supabase Edge Functions (Deno/TypeScript) for critical business logic to ensure security and performance.

| Function Name | Trigger | Purpose |
| :--- | :--- | :--- |
| `generate-inspection-pdf` | Form Submit | Renders HTML template with Puppeteer, saves to Storage. |
| `send-email` | DB Trigger / API | Sends transactional emails via Resend API. |
| `generate-ai-summary` | API Call | Calls Anthropic Claude API to summarize inspection data. |

### **Offline Architecture (PWA)**
- **Service Worker:** Caches app shell (HTML/CSS/JS) for instant load.
- **IndexedDB:** Stores inspection drafts locally (`mrc-offline` db).
- **Sync Queue:** Array of operations (`POST/PUT`) stored in localStorage when offline; replayed when `navigator.onLine` becomes true.

### **Database Wiring**
- **RLS Policies:** Strict Row Level Security. Technicians see assigned jobs; Admins see all.
- **Storage:** `inspection-photos` bucket (private), `pdfs` bucket (private).

---


### **Edge Function: generate-inspection-pdf**

**Input:**
```typescript
{
  inspectionId: string,
  version: 'draft' | 'approved'
}
```

**Process:**
```typescript
// Pseudo-code
async function generateInspectionPDF(inspectionId, version) {
  // 1. Fetch inspection data
  const inspection = await supabase
    .from('inspections')
    .select('*, lead:leads(*), areas:inspection_areas(*)')
    .eq('id', inspectionId)
    .single();

  // 2. Prepare template data
  const templateData = {
    // Cover page
    orderedBy: inspection.lead.full_name,
    inspector: inspection.inspector_name,
    date: format(inspection.inspection_date, 'dd/MM/yyyy'),
    propertyType: inspection.property_type,
    examinedAreas: inspection.areas.map(a => a.area_name).join(', '),
    address: `${inspection.lead.property_address_street} ${inspection.lead.property_address_suburb} VIC ${inspection.lead.property_address_postcode}`,
    coverPhoto: inspection.cover_photo_url,

    // Value proposition
    whatWeFound: inspection.ai_summary.what_we_found,
    whatWereGoingToDo: inspection.ai_summary.what_were_going_to_do,
    pricing: inspection.total_price_inc_gst,

    // Outdoor environment
    outdoorTemp: inspection.outdoor_temperature,
    outdoorHumidity: inspection.outdoor_humidity,
    outdoorDewPoint: inspection.outdoor_dew_point,
    outdoorPhotos: inspection.outdoor_photos,

    // Areas (repeatable)
    areas: inspection.areas.map(area => ({
      name: area.area_name,
      temperature: area.temperature,
      humidity: area.humidity,
      dewPoint: area.dew_point,
      visibleMould: area.visible_mould_locations.join(', '),
      internalMoisture: area.internal_moisture,
      externalMoisture: area.external_moisture,
      photos: area.room_view_photos,
      areaNotes: area.area_notes,
      infraredPhotos: area.infrared_photos,
      extraNotes: area.extra_notes,
    })),

    // Problem analysis
    problemAnalysis: inspection.ai_summary.problem_analysis,

    // Demolition details (if toggle enabled)
    demolitionDetails: inspection.demolition_enabled ? {
      areas: inspection.areas.filter(a => a.demolition_required).map(a => ({
        name: a.area_name,
        description: a.demolition_description
      }))
    } : null,

    // Inventory assessment (if toggle enabled)
    inventoryAssessment: inspection.inventory_enabled ? {
      content: inspection.inventory_assessment_text
    } : null,

    // Pricing
    option1Price: 'N/A', // Surface treatment only (if no demo)
    option2Price: inspection.total_price_inc_gst,
    equipmentCosts: inspection.equipment_costs,
  };

  // 3. Load HTML template
  const htmlTemplate = await loadHTMLTemplate('inspection-report.html');

  // 4. Replace template variables
  const html = replaceTemplateVariables(htmlTemplate, templateData);

  // 5. Generate PDF with Puppeteer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  await browser.close();

  // 6. Upload to Supabase Storage
  const filename = `${inspection.job_number}-${version}.pdf`;
  const path = version === 'draft'
    ? `inspection-reports/draft/${filename}`
    : `inspection-reports/approved/${filename}`;

  const { data, error } = await supabase.storage
    .from('pdfs')
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true // Overwrite if exists
    });

  // 7. Get public URL
  const { data: urlData } = supabase.storage
    .from('pdfs')
    .getPublicUrl(path);

  // 8. Save PDF URL to database
  await supabase
    .from('inspections')
    .update({
      pdf_url_draft: version === 'draft' ? urlData.publicUrl : undefined,
      pdf_url_approved: version === 'approved' ? urlData.publicUrl : undefined
    })
    .eq('id', inspectionId);

  return {
    success: true,
    pdfUrl: urlData.publicUrl
  };
}
```

---

### **HTML Template Structure**

**Your Provided Templates:**
1. `inspection-report-template-1.html` (9 pages)
2. `inspection-report-template-2.html` (10 pages - includes Inventory Assessment)

**Template Variables (Handlebars-style):**
```html
<!-- Cover Page -->
<div>{{orderedBy}}</div>
<div>{{inspector}}</div>
<div>{{date}}</div>
<div>{{propertyType}}</div>
<div>{{examinedAreas}}</div>
<div>{{address}}</div>
<img src="{{coverPhoto}}" />

<!-- Value Proposition -->
<div>{{whatWeFound}}</div>
<div>{{whatWereGoingToDo}}</div>
<div>{{pricing}}</div>

<!-- Areas (repeatable) -->
{{#each areas}}
  <div class="report-page">
    <div>AREA INSPECTED: {{this.name}}</div>
    <div>TEMPERATURE: {{this.temperature}}°C</div>
    <div>HUMIDITY: {{this.humidity}}%</div>
    <!-- ... rest of area template -->
  </div>
{{/each}}

<!-- Demolition Details (conditional) -->
{{#if demolitionDetails}}
  <div class="report-page">
    <h2>DEMOLITION DETAILS</h2>
    {{#each demolitionDetails.areas}}
      <div>{{this.name}}: {{this.description}}</div>
    {{/each}}
  </div>
{{/if}}

<!-- Inventory Assessment (conditional) -->
{{#if inventoryAssessment}}
  <div class="report-page">
    <h2>INVENTORY ASSESSMENT</h2>
    <div>{{{inventoryAssessment.content}}}</div>
  </div>
{{/if}}
```

**Template Rendering Library:**
- Option A: Handlebars.js (simple, fast)
- Option B: EJS (embedded JavaScript)
- **Recommendation:** Handlebars (cleaner syntax, less code injection risk)

---

### **PDF Versioning**

**Storage Structure:**
```
supabase-storage/
  pdfs/
    inspection-reports/
      draft/
        MRC-2025-0123-draft.pdf (overwritten each regeneration)
      approved/
        MRC-2025-0123-approved.pdf (final, locked)
    job-reports/ (Sprint 2)
      MRC-2025-0123-job-report.pdf
    invoices/ (Sprint 2)
      MRC-2025-0123-invoice.pdf
```

**Database Tracking:**
```sql
CREATE TABLE inspections (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  job_number TEXT UNIQUE,
  inspector_name TEXT,
  inspection_date DATE,
  -- ... all inspection data fields ...
  pdf_url_draft TEXT,
  pdf_url_approved TEXT,
  pdf_approved_at TIMESTAMP,
  pdf_approved_by UUID REFERENCES profiles(id),
  pdf_regeneration_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### **Edit & Regenerate Flow**

**UI (PDF Preview Modal):**
```tsx
function PDFPreviewModal({ inspectionId, pdfUrl }) {
  const [editing, setEditing] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  const handleEdit = () => {
    setEditing(true);
    // Load current AI summary from database
    fetchInspectionSummary(inspectionId).then(setSummaryText);
  };

  const handleRegenerate = async () => {
    // Update database with new summary text
    await updateInspectionSummary(inspectionId, summaryText);

    // Trigger PDF regeneration
    const { data } = await supabase.functions.invoke('generate-inspection-pdf', {
      body: { inspectionId, version: 'draft' }
    });

    // Refresh PDF preview
    window.location.reload();
  };

  const handleApprove = async () => {
    // Generate final approved PDF
    const { data } = await supabase.functions.invoke('generate-inspection-pdf', {
      body: { inspectionId, version: 'approved' }
    });

    // Update inspection status
    await supabase
      .from('inspections')
      .update({ status: 'approved', pdf_approved_at: new Date() })
      .eq('id', inspectionId);

    // Send email with PDF
    await sendInspectionReportEmail(inspectionId);

    // Navigate to next stage
    navigate('/leads');
  };

  return (
    <Modal>
      <iframe src={pdfUrl} style={{ width: '100%', height: '80vh' }} />

      {editing ? (
        <>
          <Textarea value={summaryText} onChange={e => setSummaryText(e.target.value)} />
          <Button onClick={handleRegenerate}>Regenerate PDF</Button>
        </>
      ) : (
        <>
          <Button onClick={handleEdit}>Edit Summary</Button>
          <Button onClick={handleApprove}>Approve & Send</Button>
        </>
      )}
    </Modal>
  );
}
```

---

## 📅 Customer Self-Booking Calendar

### **Requirements**

**Customer sees:**
- Calendar with available dates
- Job duration displayed (e.g., "16-hour job requires 2 consecutive days")
- Unavailable dates grayed out
- Select start date → system calculates end date
- Confirmation before booking

**System prevents:**
- Double-booking technicians
- Impossible travel schedules (Carlton 2pm → Mernda 3pm)
- Non-consecutive multi-day jobs
- Bookings outside 7am-7pm
- Bookings when technician unavailable

---

### **Booking Page URL**

**Link in Inspection Report Email:**
```
https://app.mouldandrestoration.com.au/book-job?token=[SECURE_TOKEN]
```

**Token contains (JWT):**
- Lead ID (encrypted)
- Job hours (from inspection report)
- Expiry (30 days)

**On page load:**
- Verify token
- Fetch lead details
- Calculate job days (jobHours / 8 = days, round up)
- Display job summary
- Load calendar with availability

---

### **Availability Calculation Algorithm**

**Inputs:**
- Existing calendar events (inspections + jobs)
- Technician schedules (Clayton, Glen)
- Job duration (hours → days)
- Customer's property suburb (for travel time calculation)

**Process:**
```typescript
function calculateAvailableDates(jobHours: number, customerSuburb: string) {
  const jobDays = Math.ceil(jobHours / 8); // 8-hour workdays
  const availableDates = [];

  // Get next 60 days
  const startDate = new Date();
  const endDate = addDays(startDate, 60);

  // For each potential start date
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {

    // Check if enough consecutive days are available
    let consecutiveDaysAvailable = true;

    for (let i = 0; i < jobDays; i++) {
      const checkDate = addDays(date, i);

      // Get technician schedules for this day
      const claytonSchedule = getScheduleForDate(checkDate, 'Clayton');
      const glenSchedule = getScheduleForDate(checkDate, 'Glen');

      // Check if either technician is free all day
      const claytonFree = isTechnicianFree(claytonSchedule, checkDate, customerSuburb);
      const glenFree = isTechnicianFree(glenSchedule, checkDate, customerSuburb);

      if (!claytonFree && !glenFree) {
        consecutiveDaysAvailable = false;
        break;
      }
    }

    if (consecutiveDaysAvailable) {
      availableDates.push({
        date,
        assignedTechnician: determineTechnician(date, jobDays, customerSuburb)
      });
    }
  }

  return availableDates;
}

function isTechnicianFree(schedule, date, customerSuburb) {
  // Check if technician has any events on this day
  if (schedule.length === 0) return true;

  // Check for conflicts considering travel time
  for (const event of schedule) {
    const travelTime = calculateTravelTime(event.suburb, customerSuburb);
    const eventEndWithTravel = addMinutes(event.endTime, travelTime);

    // If event ends after 7pm (with travel time), day is not available
    if (eventEndWithTravel > setHours(date, 19)) {
      return false;
    }
  }

  return true;
}
```

---

### **Travel Time Calculation**

**Pre-Defined Suburb Zones:**
```typescript
const suburbZones = {
  // Zone 1: Inner Melbourne
  'carlton': 1, 'fitzroy': 1, 'richmond': 1, 'south yarra': 1,
  'prahran': 1, 'st kilda': 1, 'port melbourne': 1, 'docklands': 1,
  'southbank': 1, 'collingwood': 1, 'north melbourne': 1,

  // Zone 2: Middle Melbourne
  'preston': 2, 'thornbury': 2, 'northcote': 2, 'coburg': 2,
  'brunswick': 2, 'footscray': 2, 'newport': 2, 'yarraville': 2,
  'hawthorn': 2, 'kew': 2, 'camberwell': 2, 'malvern': 2,
  'caulfield': 2, 'elsternwick': 2, 'brighton': 2,

  // Zone 3: Outer Melbourne
  'frankston': 3, 'dandenong': 3, 'cranbourne': 3, 'pakenham': 3,
  'berwick': 3, 'narre warren': 3, 'werribee': 3, 'sunbury': 3,
  'melton': 3, 'epping': 3, 'reservoir': 3, 'bundoora': 3,
  'airport west': 3, 'mernda': 3, 'croydon': 3,

  // Zone 4: Extended areas
  'geelong': 4, 'ballarat': 4, 'bendigo': 4, 'mornington': 4,
  // ... more suburbs
};

const travelTimeMatrix = {
  // [from_zone][to_zone] = minutes
  1: { 1: 15, 2: 30, 3: 45, 4: 60 },
  2: { 1: 30, 2: 20, 3: 40, 4: 55 },
  3: { 1: 45, 2: 40, 3: 25, 4: 45 },
  4: { 1: 60, 2: 55, 3: 45, 4: 30 },
};

function calculateTravelTime(fromSuburb: string, toSuburb: string): number {
  const fromZone = suburbZones[fromSuburb.toLowerCase()] || 2; // Default to Zone 2
  const toZone = suburbZones[toSuburb.toLowerCase()] || 2;
  return travelTimeMatrix[fromZone][toZone];
}
```

**Example:**
- Last job: Carlton (Zone 1), ends 2:00 PM
- Next potential job: Mernda (Zone 3)
- Travel time: Zone 1 → Zone 3 = 45 minutes
- Earliest next job start: 2:00 PM + 45 min = 2:45 PM
- If customer tries to book 3:00 PM job in Mernda: ✅ ALLOWED (15 min buffer)
- If customer tries to book 2:30 PM job in Mernda: ❌ BLOCKED (not enough travel time)

---

### **Calendar UI (Customer-Facing)**

**React Big Calendar (or similar library)**

**Features:**
- Month view (default)
- Grayed-out unavailable dates
- Green checkmark on available dates
- Click date → Show time slots (if partial day availability)
- Select start date → End date auto-calculated and highlighted
- Tooltip: "16-hour job (2 days) - $2,855.55 inc GST"

**Booking Confirmation Modal:**
```tsx
<Modal>
  <h2>Confirm Your Booking</h2>
  <p>Job: Mould Remediation (16 hours)</p>
  <p>Dates: Monday 15th Nov - Tuesday 16th Nov</p>
  <p>Technician: Clayton</p>
  <p>Start Time: 7:00 AM (approx)</p>
  <p>Total: $2,855.55 inc GST</p>
  <Checkbox>I confirm availability and access to property</Checkbox>
  <Button onClick={confirmBooking}>Confirm Booking</Button>
</Modal>
```

**On Confirm:**
```typescript
async function confirmBooking(leadId, startDate, endDate, technician) {
  // 1. Create calendar events
  const events = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    events.push({
      lead_id: leadId,
      technician_id: technician.id,
      event_type: 'job',
      start_time: setHours(date, 7), // 7 AM start
      end_time: setHours(date, 15), // 3 PM end (8 hours)
      address: lead.property_address,
      suburb: lead.property_address_suburb,
    });
  }

  await supabase.from('calendar_events').insert(events);

  // 2. Update lead status
  await supabase
    .from('leads')
    .update({
      status: 'job_booked',
      job_start_date: startDate,
      job_end_date: endDate,
      assigned_technician: technician.id
    })
    .eq('id', leadId);

  // 3. Send confirmation email (customer + technician)
  await sendJobBookingConfirmationEmail(leadId);

  // 4. Create notification
  await createNotification({
    user_id: technician.id,
    type: 'job_booked',
    title: 'New Job Booked',
    message: `${lead.full_name} - ${lead.property_address_suburb}`,
    link: `/leads/${leadId}`
  });

  // 5. Show success message
  return { success: true, message: 'Booking confirmed! You will receive a confirmation email shortly.' };
}
```

---

### **Booking Conflict Prevention**

**Real-Time Availability Check:**
```typescript
// Before allowing booking, double-check availability
async function verifyAvailability(startDate, endDate, technician) {
  const { data: conflicts } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('technician_id', technician.id)
    .gte('start_time', startDate)
    .lte('end_time', endDate);

  if (conflicts.length > 0) {
    return {
      available: false,
      message: 'Sorry, this time slot was just booked. Please select another date.'
    };
  }

  return { available: true };
}
```

**Optimistic Locking:**
- Use database transactions
- Check availability again inside transaction
- If conflict detected, rollback and show error

---

## 📊 Success Metrics

### **Sprint 1 Demo Metrics**

**Operational Efficiency:**
- Lead response time: **<1 hour** (automated email)
- Inspection form completion: **<60 minutes** (mobile-optimized)
- Report generation: **<5 minutes** (vs. 2-3 hours manual)
- Customer booking: **Self-service** (vs. phone tag)

**Data Quality:**
- Form completion rate: **100%** (required fields enforced)
- Photo capture rate: **100%** (minimum photos required)
- Data loss incidents: **0** (auto-save + offline mode)

**User Experience:**
- Technician satisfaction: **"Easy to use on-site"**
- Customer satisfaction: **"Fast, professional"**
- Admin satisfaction: **"Pipeline visibility is clear"**

**Technical Performance:**
- Mobile load time: **<3 seconds**
- Offline mode functionality: **Works in basements**
- PDF generation time: **<30 seconds**
- Email delivery rate: **>98%** (Resend API)

---

### **Business Impact (Post-Launch)**

**Revenue Metrics:**
- Lead-to-quote conversion: **Baseline → +20%** (faster response)
- Quote-to-job conversion: **Baseline → +15%** (professional reports)
- Average job value: **Track trend** (upsell opportunities)

**Efficiency Metrics:**
- Inspections per technician per week: **Baseline → +30%** (faster forms)
- Admin hours per lead: **2 hours → 0.5 hours** (automation)
- Quote turnaround: **24-48 hours → 2 hours**

**Customer Metrics:**
- Customer satisfaction (CSAT): **>4.5/5**
- Google review rate: **Baseline → +40%** (automated requests)
- Repeat customer rate: **Track trend**

---

## 🚫 Out of Scope (Sprint 2)

**The following features are explicitly NOT in Sprint 1:**

### **Job Completion Workflow**
- Job report PDF generation
- Job completion form (photos, justifications, removal notes)
- Different template from inspection report

### **Invoicing & Payments**
- Invoice PDF generation
- Invoice email automation
- Payment tracking (manual "Mark as Paid" button)
- Overdue invoice reminders
- 30-day warranty expiry tracking
- Weekly payment reminders

### **Google Review System**
- Review request email automation
- Review link generation
- Tracking review submissions

### **Advanced Analytics**
- Dashboard analytics page
- Lead source analysis
- Conversion funnel tracking
- Revenue forecasting

### **Mobile Apps**
- Native iOS app
- Native Android app
- Push notifications (vs. in-app only)

### **Integrations**
- Xero/MYOB accounting sync
- SMS notifications (email only for Sprint 1)
- Google Calendar sync (internal calendar only)

---

## 📝 Acceptance Criteria (Sprint 1 Complete)

### **Definition of Done**

**Sprint 1 is complete when:**

1. ✅ **Lead Capture Works**
   - Website form saves to database
   - HiPages integration captures leads
   - New lead email sent instantly
   - All Australian formatting correct (phone, postcode)

2. ✅ **Pipeline Management Works**
   - 12 stages visible
   - Drag-and-drop between stages
   - Job cards display correctly
   - Stage-specific action buttons work
   - Lead counts accurate

3. ✅ **Inspection Form Works**
   - All sections functional
   - Auto-save every 30 seconds
   - Offline mode works (tested in airplane mode)
   - Photo upload works (tested with 20+ photos)
   - AI summary generation works
   - Pricing calculation accurate
   - Form submission triggers PDF generation

4. ✅ **PDF Generation Works**
   - PDF generated from HTML templates
   - All data populates correctly
   - Dynamic sections (demolition, inventory) conditional
   - Photos display correctly
   - Pricing matches form
   - PDF stored in Supabase Storage

5. ✅ **PDF Approval Works**
   - Technician can preview PDF
   - Edit functionality works
   - Regenerate PDF works
   - Approve locks PDF
   - Email sent with PDF attachment

6. ✅ **Email Automation Works**
   - All 8 Sprint 1 emails send correctly
   - Emails never go to spam (SPF/DKIM verified)
   - Resend API integrated
   - Email templates render beautifully
   - Attachments work (PDF reports)

7. ✅ **Customer Self-Booking Works**
   - Calendar displays available dates
   - Travel time logic prevents impossible bookings
   - Multi-day jobs block consecutive days
   - Booking confirmation email sent
   - Calendar updates in real-time
   - No double-booking possible (tested with concurrent bookings)

8. ✅ **Mobile Experience Works**
   - App works on iPhone (tested)
   - App works on Android (tested)
   - Touch targets ≥48px
   - Forms usable with work gloves
   - Inspection form works in van (tested offline)
   - No page reloads lose data

9. ✅ **Australian Business Standards Met**
   - Phone: 04XX XXX XXX format
   - Currency: $X,XXX.XX inc GST
   - Dates: DD/MM/YYYY format
   - Postcodes: VIC validation
   - ABN: XX XXX XXX XXX format (in settings)
   - Professional appearance

10. ✅ **Demo Ready**
    - Test data loaded (5 sample leads in various stages)
    - Owners can see complete workflow
    - PDF samples generated
    - Emails tested (sent to owner's email)
    - Calendar shows sample bookings
    - No errors or bugs visible

---

## 🎬 Demo Script (For Owners)

**15-Minute Walkthrough:**

1. **Lead Capture (2 min)**
   - Show website form
   - Submit test lead
   - Show instant email received
   - Lead appears in "New Lead" stage

2. **Schedule Inspection (2 min)**
   - Click "View Lead" → show details
   - Click "Schedule Inspection"
   - Select date/time, assign technician
   - Show booking confirmation email

3. **Complete Inspection (3 min)**
   - Open inspection form on iPad
   - Show offline mode (airplane mode on)
   - Fill out sections (pre-filled with test data)
   - Upload photos
   - Show AI summary generation
   - Submit form

4. **Approve PDF Report (2 min)**
   - Show PDF preview
   - Demo edit functionality
   - Regenerate PDF
   - Approve and send
   - Show email with PDF attachment received

5. **Customer Self-Booking (3 min)**
   - Open booking link from email
   - Show calendar with availability
   - Select dates (show multi-day blocking)
   - Confirm booking
   - Show booking confirmation email
   - Lead moves to "Job Booked" stage

6. **Pipeline Overview (2 min)**
   - Show full pipeline with all stages
   - Drag lead between stages
   - Show job cards
   - Show calendar with bookings

7. **Settings & Pricing (1 min)**
   - Show editable pricing configuration
   - Demonstrate version control (old quotes use old rates)

---

**This PRD documents the complete Sprint 1 scope for the MRC Lead Management System. All features are designed to be production-ready and demo-ready for business owners.**

**Next Steps:**
1. Review and approve this PRD
2. Proceed to Technical Specification (database schema, API design, implementation details)
3. Break down into 2-week sprint tasks
4. Begin development

---

**Document Version:** 1.0
**Last Updated:** November 11, 2025
**Status:** Ready for Review

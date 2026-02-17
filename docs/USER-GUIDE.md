# MRC Lead Management System - User Guide

**For:** Field Technicians and Admin Staff
**App:** Mould & Restoration Co. Lead Management System

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Technician Workflow](#technician-workflow)
3. [Admin Workflow](#admin-workflow)
4. [Mobile Usage](#mobile-usage)

---

## Getting Started

### Logging In

1. Open the app URL in your browser (or tap the app icon on your home screen)
2. Enter your email and password
3. Tick "Remember Me" to stay logged in on this device
4. Tap **Sign In**

You'll be directed to your role-specific dashboard:
- **Technicians** see the Technician Dashboard
- **Admins** see the Admin Dashboard

### Installing as a Mobile App

The app works as a PWA (Progressive Web App) -- you can install it on your phone for quick access:

**iPhone (Safari):**
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

**Android (Chrome):**
1. Open the app in Chrome
2. Tap the three-dot menu
3. Tap "Install app" or "Add to Home screen"
4. Tap "Install"

### Resetting Your Password

1. On the login screen, tap "Forgot password?"
2. Enter your email address
3. Check your inbox for a reset link
4. Click the link and enter your new password

---

## Technician Workflow

### Your Dashboard

When you log in, you see today's schedule at a glance:

- **Next Job** card shows your next upcoming appointment with the customer name, time, address, and travel time
- **Quick Actions:** Start Inspection, Get Directions, View Lead
- **Remaining Jobs** listed below

If you have no jobs today, you'll see a message confirming you're all clear.

### Viewing Your Jobs

Tap **Jobs** in the bottom navigation to see all your assigned work:

- **Today** - Today's jobs
- **This Week** - Jobs for the current week
- **This Month** - Full month view
- **Upcoming** - Future scheduled work
- **Completed** - Finished jobs

Each job card shows:
- Customer name and time slot
- Property address and suburb
- Travel time from previous location
- Status badge (Scheduled, In Progress, Completed)

### Job Detail

Tap any job card to see full details:

- **Customer Information** - Name, phone, email, lead source
- **Property & Access** - Full address, property type, access instructions (shown in a blue box)
- **Inquiry Notes** - What the customer originally reported
- **Internal Notes** - Office notes (not visible to customer)

**Quick Actions:**
- **Call** - Tap to call the customer directly
- **Directions** - Opens Google Maps with the property address

### Starting an Inspection

1. From your dashboard or job detail, tap **Start Inspection**
2. The inspection form has **9 sections**:

| Section | What to Fill In |
|---------|----------------|
| 1. Basic Information | Job type, dwelling type, occupancy, parking |
| 2. Property Details | Outdoor temperature, humidity (auto-calculates dew point) |
| 3. Area Inspection | Room-by-room mould assessment, moisture readings, photos |
| 4. Subfloor | Subfloor observations, readings (if applicable) |
| 5. Outdoor Info | External factors |
| 6. Waste Disposal | Waste removal requirements |
| 7. Work Procedure | Treatment plan and methods |
| 8. Job Summary | Equipment needed, time estimates |
| 9. Cost Estimate | Labour, equipment costs (auto-calculates totals with GST) |

3. Navigate between sections using the **Previous** and **Next** buttons
4. Your progress is shown at the top (e.g. "Section 3 of 9")

### Taking Photos

During the area inspection (Section 3):

1. Tap the **camera icon** or **Add Photo** button
2. Take a photo or select from your gallery
3. Photos are automatically compressed and uploaded
4. Add a caption to describe what the photo shows
5. You can take multiple photos per area

Photos are saved automatically -- you don't need to do anything extra.

### Auto-Save

The form **automatically saves every 30 seconds** while you're working. You'll never lose your progress, even if:
- You lose internet connection temporarily
- You need to close the app and come back later
- Your phone runs out of battery

When you return, tap **Resume Inspection** to continue where you left off.

### Completing an Inspection

After filling in all 9 sections:

1. Review your entries in the Job Summary section
2. Verify the cost estimate looks correct
3. Tap **Submit Inspection**
4. The system generates an AI summary and PDF report
5. The report goes to Admin for review and approval

---

## Admin Workflow

### Admin Dashboard

Your dashboard shows key metrics:

- **Today's Jobs** - Number of jobs scheduled for today
- **Leads to Assign** - New leads that need a technician assigned (orange badge if > 0)
- **Completed This Week** - Jobs finished this week
- **Revenue This Week** - Total revenue for the week

Below the stats, you'll see today's schedule and any unassigned leads requiring attention.

### Managing Leads

Navigate to **Lead Management** from the sidebar.

#### Pipeline Stages

Leads move through these stages:

1. **New Lead** - Just received, needs action
2. **Awaiting Inspection** - Booked, waiting for technician to inspect
3. **AI Review** - Inspection complete, AI summary generated
4. **Approve Report** - PDF report ready for admin review
5. **Email Approval** - Report approved, ready to send to customer
6. **Closed** - Email sent, job complete
7. **Not Landed** - Lead didn't convert

Use the **pipeline tabs** at the top to filter by stage.

#### Lead Actions

Each lead card has stage-specific actions:

| Stage | Available Actions |
|-------|-------------------|
| New Lead | View Details, Schedule Inspection, Archive |
| Awaiting Inspection | View Details, Start Inspection |
| AI Review | Review AI Summary |
| Approve Report | View PDF, Approve Report, Regenerate PDF |
| Email Approval | Send Email with Report, View PDF |
| Closed | View History, Archive |
| Not Landed | Reactivate, View History |

#### Creating a New Lead

1. Click the **New Lead** button (top right)
2. Fill in:
   - Customer name, email, phone
   - Property address (street, suburb, postcode)
   - Issue description
   - Lead source
   - Urgency level
3. Click **Create Lead**
4. The lead appears in the "New Lead" stage

#### Scheduling an Inspection

1. Open the lead detail page
2. Click **Book Inspection**
3. Select a technician
4. The system suggests optimal dates based on:
   - Technician proximity to the property
   - Existing bookings (avoids conflicts)
   - Travel time estimates
5. Pick a date and time
6. Confirm booking

The customer receives a confirmation, and a 48-hour reminder email is sent automatically before the appointment.

#### Approving Reports

When an inspection is complete:

1. Navigate to leads in the **Approve Report** stage
2. Click **View PDF** to review the generated report
3. If edits are needed, make inline edits directly on the report
4. Click **Approve Report** when satisfied
5. The lead moves to **Email Approval** stage

#### Sending Reports to Customers

1. From the **Email Approval** stage, click **Send Email**
2. Review the pre-filled email subject and body
3. The inspection report PDF is attached automatically
4. Click **Send Email with Report**
5. The lead automatically moves to **Closed** status

#### Searching and Filtering

- **Search bar** - Search by customer name, address, email, or phone
- **Sort options** - Newest first, oldest first, by value, by name
- **View modes** - Card view (grid) or List view

#### Archiving Leads

To remove a lead from the active pipeline without deleting it:
1. Click **Archive** on the lead card
2. Confirm the archive action
3. Archived leads are hidden but still exist in the database

---

## Mobile Usage

### Designed for Field Work

The app is built for technicians working on-site:

- **Large touch targets** (48px minimum) - easy to tap even with work gloves
- **No horizontal scrolling** - everything fits on your phone screen
- **High contrast text** - readable in bright outdoor conditions

### Offline Mode

If you lose internet connection while on-site:

- **Form data is saved locally** to your device
- You can continue filling in the inspection form
- When connection returns, data syncs automatically
- Photos are queued and uploaded when back online

### Tips for Mobile Use

1. **Install the app** to your home screen for the best experience
2. **Take photos during inspection** - they're compressed automatically, no need to resize
3. **Use the auto-save** - don't worry about manually saving, it happens every 30 seconds
4. **Check directions** before heading out - tap the Directions button for Google Maps navigation
5. **Call customers** directly from the job detail page using the Call button

### Supported Browsers

| Browser | Support |
|---------|---------|
| Safari (iOS 15+) | Full support |
| Chrome (Android) | Full support |
| Chrome (Desktop) | Full support |
| Firefox | Full support |
| Edge | Full support |

---

*Last Updated: 2026-02-17*

# MRC Manual Testing Checklist

Pre-handover smoke test. Walk through each section in order. Tick boxes as you confirm.

**Environment**
- [ ] Production URL loads (Vercel domain)
- [ ] Service worker updates (hard-refresh on first load)
- [ ] No console errors on landing page

---

## 1. Authentication

### Admin login
- [ ] Open `/` — login page renders
- [ ] Enter admin email + password, click **Sign in** — redirects to `/admin`
- [ ] Admin dashboard loads with KPI cards

### Technician login
- [ ] Log out → `/` login page
- [ ] Enter technician email + password — redirects to `/technician`
- [ ] Technician dashboard loads (no admin nav)

### Forgot / reset password
- [ ] Click **Forgot password** — lands on `/forgot-password`
- [ ] Submit email — success screen "Check your email"
- [ ] Open reset link in email — lands on `/reset-password`
- [ ] Enter new password twice — toast success, redirected to login
- [ ] Log in with new password — works

### Session persistence
- [ ] Log in as admin
- [ ] Close tab, reopen the URL — still logged in, no redirect to `/`
- [ ] Open a new tab to same URL — still logged in
- [ ] Sign out — next refresh returns to `/`

### Role-based routing
- [ ] While logged in as technician, manually visit `/admin` — blocked (redirect or 404)
- [ ] While logged in as technician, visit `/admin/schedule` — blocked
- [ ] While logged in as admin, visit `/technician/jobs` — blocked
- [ ] Log out → visit `/admin` — redirected to `/`

---

## 2. Admin — Lead Management

### Create new lead
- [ ] From `/admin/leads`, click **+ New Lead**
- [ ] Fill required fields: full name, phone, email, property address
- [ ] Click **Create** — lead appears in pipeline under **New Lead** column
- [ ] Activity timeline shows "Lead created"

### Edit lead details
- [ ] Open the new lead (`/leads/:id`)
- [ ] Inline-edit customer name → Save → value persists on refresh
- [ ] Inline-edit phone → Save → Australian format preserved (`04XX XXX XXX` or `(03) XXXX XXXX`)
- [ ] Inline-edit property address → Save → persists

### Archive lead (soft-delete)
- [ ] From lead detail, click **Archive** (or equivalent)
- [ ] Lead disappears from `/admin/leads` pipeline
- [ ] Lead does NOT appear in any KPI counts
- [ ] Database check: `leads.archived_at` is set, row not deleted

### View lead in pipeline
- [ ] `/admin/leads` shows all pipeline tabs in order
- [ ] Each tab count matches the number of cards
- [ ] Lead appears in the correct tab for its status

### Filter leads by status
- [ ] Click each tab (New Lead, Awaiting Inspection, AI Review, Approve, Email, Job Waiting, Scheduled, Completed, Pending Review, Report Sent, Invoiced, Paid, Google Review, Finished, Closed, Not Landed)
- [ ] URL updates with `?status=<slug>` — reloading preserves the filter
- [ ] Cards shown match the status

### Search leads
- [ ] Search by customer name — matches filter live
- [ ] Search by suburb — matches
- [ ] Search by phone — matches
- [ ] Clear search — all leads return

---

## 3. Admin — Inspection Flow

### Schedule inspection
- [ ] From new lead, click **Schedule Inspection**
- [ ] Pick date + start time — availability check runs
- [ ] Assign a technician — save succeeds, lead advances to **Awaiting Inspection**
- [ ] Booking appears on `/admin/schedule` calendar under the chosen technician

### Assign technician
- [ ] Re-open the lead, change technician assignment — saves, activity logged

### View inspection report PDF
- [ ] Once AI summary is ready and approved (simulate or walk a real flow), open `/inspection/:inspectionId/report`
- [ ] PDF preview renders at A4 aspect ratio
- [ ] Navigation between pages works
- [ ] No console errors

### Edit inspection report
- [ ] Toggle edit mode
- [ ] Change a text field (e.g. summary) → save → preview re-renders with new text
- [ ] Upload a replacement photo → save → preview shows new image
- [ ] Refresh page — edits persist

### Download inspection report as A4 PDF
- [ ] Click **Download PDF**
- [ ] File downloads; open in Preview — A4 size, all pages present, readable

### Send inspection report email
- [ ] Click **Approve & Send**
- [ ] Email preview modal shows correct customer name + address
- [ ] Confirm send — success toast
- [ ] Check Resend dashboard: email sent with PDF attachment > 0 bytes, content-type `application/pdf`
- [ ] Customer inbox: email received with attachment opens cleanly

### Approve inspection report
- [ ] After approve+send, lead advances to **Email Approval** → **Job Waiting**
- [ ] Activity timeline shows approval entry with admin name + timestamp

---

## 4. Technician — Inspection

### See assigned inspection
- [ ] `/technician` — Next Job card shows the inspection
- [ ] `/technician/jobs` — inspection appears under **Today** or **Upcoming** per its date

### Start inspection
- [ ] Tap the job → opens lead detail (technician view)
- [ ] Tap **Start Inspection** — opens `/technician/inspection`

### Fill all 10 sections
- [ ] Section 1 — Property & Client Info
- [ ] Section 2 — Outdoor Conditions (temp, humidity)
- [ ] Section 3 — Indoor Conditions
- [ ] Section 4 — Inspection Areas (add at least 2 areas with mould + moisture readings)
- [ ] Section 5 — Labor + Equipment + Discount (verify 13% cap enforced, equipment never discounted)
- [ ] Section 6 — Subfloor (if applicable)
- [ ] Section 7 — Treatment Methods (toggles save)
- [ ] Section 8 — Chemicals
- [ ] Section 9 — Photos (upload at least 3)
- [ ] Section 10 — Notes & Recommendations

### Save and reopen
- [ ] Tap **Save Draft** — toast success
- [ ] Navigate away, return to `/technician/inspection` for same lead
- [ ] All fields + photos restored

### Submit inspection
- [ ] Tap **Submit**
- [ ] Validation triggers on any missing required fields — toast lists them
- [ ] Fix and resubmit — success, lead advances to **AI Summary Review**

---

## 5. Admin — Job Scheduling

### Schedule job
- [ ] From a lead at **Job Waiting**, click **Schedule Job**
- [ ] Pick start date + duration (multi-day)
- [ ] Each day books a slot on the calendar for the chosen technician
- [ ] Save succeeds, lead advances to **Job Scheduled**

### Assign technician
- [ ] Change technician on a booked job — calendar updates, activity logged

---

## 6. Technician — Job Completion

### See assigned job
- [ ] `/technician` — Next Job card shows the scheduled remediation job
- [ ] `/technician/jobs` — under **Today** / **Upcoming** / **This Week** as appropriate

### Start job completion form
- [ ] Tap the job → lead detail → **Start Job Completion**
- [ ] Opens `/technician/job-completion/:leadId`

### Section 1 — Office Info
- [ ] Job number auto-populated (format `JOB-YYYY-XXXX` or similar)
- [ ] Address read-only, matches lead
- [ ] Requested By read-only
- [ ] Attention To — editable, saves

### Section 2 — Summary
- [ ] SWMS toggle — works, 48px target
- [ ] Premises type dropdown — residential/commercial
- [ ] Completion Date — DD/MM/YYYY, defaults to today
- [ ] Areas Treated — checkboxes pre-populated from inspection areas

### Section 3 — Before Photos
- [ ] Photos pre-loaded from inspection, grouped by area
- [ ] Max 10 per category enforced — 11th upload blocked with toast
- [ ] Tap photo → lightbox opens; can close

### Section 4 — After Photos + Demolition
- [ ] **After** photo count cap matches the **Before** count for that area
- [ ] Demolition toggle — when on, reveals exactly 4 photo slots
- [ ] Demolition justification textarea appears
- [ ] Demolition removal notes textarea appears
- [ ] Toggle off → demolition section hidden but data retained

### Section 5 — Treatment Methods
- [ ] All 11 toggles present and saving
- [ ] Pre-populated from inspection treatment_methods

### Section 6 — Chemicals
- [ ] All 5 chemical toggles working

### Section 7 — Equipment
- [ ] Dehumidifier, Air Mover, AFD, RCD cards each show qty + days steppers (48px)
- [ ] Subtotal = qty × days × rate (rates: 132/46/75/5)
- [ ] Quoted comparison visible below each card
- [ ] Exceeding quoted → amber warning text
- [ ] Total equipment cost matches sum of subtotals

### Section 8 — Variations
- [ ] Scope Changed toggle reveals 4 textareas
- [ ] All textareas save

### Section 9 — Job Notes
- [ ] Request Review toggle
- [ ] Damages Present → reveals Damages Details textarea
- [ ] Staining Present → reveals Staining Details textarea
- [ ] Additional Notes textarea saves

### Section 10 — Office Notes (admin only)
- [ ] Signed in as technician: section hidden
- [ ] Sign in as admin, open same form: section visible with Office Notes + Followup Required toggle

### Save and reopen
- [ ] Tap **Save Draft** — toast success
- [ ] Navigate away, return — every field + photo restored
- [ ] Kill browser, reopen — still restored (IndexedDB persistence)

### Submit validation
- [ ] Clear a required field (e.g. Completion Date) → tap Submit → toast names the missing field
- [ ] Fill all required → Submit succeeds
- [ ] If **Request Review** was on → lead status = `pending_review`; else `job_completed`

---

## 7. Admin — Job Report Review

### View job report PDF
- [ ] From lead at `job_completed` or `pending_review`, click **View Job Report**
- [ ] Opens `/admin/job-report/:leadId` — PDF renders

### Verify pages
- [ ] Page 1: cover (logo, job number, address, date, technician, customer)
- [ ] Page 2: contents / work summary (areas treated, completion date, tech name)
- [ ] Page 3+: treated areas with before/after photo pairs, grouped by area
- [ ] Demolition section present only if demolition toggle was on
- [ ] T&Cs / warranty pages render

### Edit mode — text
- [ ] Toggle edit, change work summary text → save → preview regenerates immediately

### Edit mode — photos
- [ ] Swap a before or after photo → save → preview regenerates with new image

### Download as A4 PDF
- [ ] Click Download — file opens in Preview at A4 size, all pages

### Approve and send
- [ ] Click **Approve & Send**
- [ ] Email preview modal: customer name + address correct, PDF attachment indicated
- [ ] Confirm send — success toast
- [ ] Lead advances to **Job Report Sent** (`job_report_pdf_sent`)
- [ ] Resend dashboard: email has PDF attachment > 0 bytes
- [ ] Customer inbox: email received, attachment opens

---

## 8. Admin — Revision Flow

- [ ] From lead at `job_completed`, admin enters a revision note and clicks **Request Changes**
- [ ] Lead status changes (e.g. back to a revision-pending state) — activity logged with note
- [ ] Log in as the assigned technician
- [ ] `/technician` Home: revision item visible on Next Job card or alerts
- [ ] `/technician/jobs` — **Revisions** tab shows this job
- [ ] Open the job completion form — amber revision banner at top with admin's note
- [ ] Make a change, resubmit
- [ ] Back on admin side: PDF auto-regenerates with new data
- [ ] Admin reviews updated report — page refresh shows new content

---

## 9. Admin — Invoice & Payment Pipeline

### After job report sent
- [ ] Lead detail shows **Invoice Summary** card with line items from inspection pricing
- [ ] GST = 10% of subtotal, total matches

### Send invoice (outside system) + track
- [ ] Admin sends invoice manually via accounting tool
- [ ] Click **I've sent the invoice** — tracker created in DB, lead advances to **Invoicing Sent**
- [ ] Overdue timeline card shows correct milestones (sent date, due date, overdue date)

### Mark as Paid
- [ ] Click **Mark as Paid**
- [ ] Select payment method (cash / visa / mastercard / bank transfer / cheque)
- [ ] Enter payment date + optional reference
- [ ] Save — lead advances to **Paid**
- [ ] Invoice row: `status = 'paid'`, `payment_date` + `payment_method` set

### Google review CTA
- [ ] At **Paid** status, Google Review card appears with **Send review request** button
- [ ] Click → email sent to customer, lead advances to **Google Review**
- [ ] Customer inbox: Google review request email received

### Mark as Finished
- [ ] At `google_review`, click **Mark as Finished** — lead advances to **Finished**
- [ ] `FinishLeadSection` disappears; `LeadCompleteBanner` appears
- [ ] Banner shows: customer name, property, total paid, payment date, review status

---

## 10. Admin Dashboard (`/admin`)

### KPI cards (6 total)
- [ ] **Today's Jobs** — count matches inspections for today (Melbourne timezone)
- [ ] **Leads to Assign** — count matches unassigned `new_lead` / `hipages_lead`
- [ ] **Completed This Week** — count matches leads moved to paid/completed/finished this week
- [ ] **Revenue This Week** — sum matches inspections created this week
- [ ] **Pending Reviews** — count matches `status = 'pending_review'`
- [ ] **Overdue Invoices** — count + dollar total matches `invoices.status = 'overdue'`

### Today's Schedule widget
- [ ] Lists inspections + jobs scheduled for today in time order
- [ ] Empty state shown if none

### Recent Activity
- [ ] Shows latest 10-20 activity log entries across all leads
- [ ] Timestamps are Melbourne-local

### KPI click-through
- [ ] Click **Pending Reviews** → `/admin/leads?status=pending_review` with filter applied
- [ ] Click **Overdue Invoices** → `/admin/leads?status=invoicing_sent` (or invoice view)
- [ ] Click other KPIs → navigate to relevant filtered views

---

## 11. Technician Dashboard

### Home (`/technician`)
- [ ] **Next Job** card shows next scheduled job/inspection
- [ ] **Today's Jobs** list in time order
- [ ] Empty state if no jobs today

### My Jobs (`/technician/jobs`)
- [ ] Tabs visible: **Revisions**, **Today**, **This Week**, **This Month**, **Upcoming**, **Completed**
- [ ] Each tab shows the correct subset of jobs
- [ ] Revisions tab has amber indicator when items present

### Alerts (`/technician/alerts`)
- [ ] Page loads
- [ ] Shows relevant notifications for the technician (even if mock data — note if so)

### Profile (`/technician/profile`)
- [ ] Page loads, name + email shown
- [ ] Edit profile — save works
- [ ] Avatar: tap camera → pick image → uploads → preview updates
- [ ] Reload page — avatar still shown (stored in `user_metadata.avatar_url`)

---

## 12. Mobile Testing (375px viewport)

Use Chrome DevTools device emulation at **iPhone SE / 375 × 667**.

### Admin pages at 375px
- [ ] `/admin` — readable, no horizontal scroll, KPI cards stack to 1-2 columns
- [ ] `/admin/leads` — pipeline tabs scroll horizontally, cards stack
- [ ] `/admin/schedule` — calendar usable
- [ ] Lead detail — all cards readable, buttons ≥48px

### Technician pages at 375px
- [ ] `/technician` — Next Job + Today's Jobs readable
- [ ] `/technician/jobs` — tabs scroll, job cards readable
- [ ] `/technician/inspection` — form sections one-column, touch targets ≥48px
- [ ] `/technician/job-completion/:leadId` — all 10 sections usable; steppers ≥48px

### Shared
- [ ] No horizontal scroll anywhere (scroll-x === 0 on `<body>`)
- [ ] All buttons, toggles, steppers ≥48px
- [ ] Inputs don't trigger iOS zoom (font-size ≥16px on text inputs)

---

## 13. Edge Cases

### Offline
- [ ] Open job completion form online
- [ ] DevTools → Network → **Offline**
- [ ] Fill a section, upload a photo (queued)
- [ ] Banner shows offline state
- [ ] Go back online — sync fires, photo uploads, fields persist in DB

### Multiple tabs
- [ ] Open same lead detail in two tabs
- [ ] Edit in Tab A, save
- [ ] Refresh Tab B — shows new value (no stale overwrite)

### Empty states
- [ ] Fresh account with no leads → `/admin/leads` shows empty state copy + CTA
- [ ] No jobs assigned → `/technician/jobs` shows "No jobs" per tab
- [ ] Lead with no photos → inspection form Section 9 shows upload prompt, no broken thumbnails

### Long text
- [ ] Create a lead with a 100-character customer name — list + detail views wrap or truncate cleanly, no overflow
- [ ] Long street address — same
- [ ] 2000-character notes in job completion → saves, renders without breaking layout in PDF

### Australian formatting spot-checks
- [ ] Currency displays as `$X,XXX.XX` everywhere (AdminDashboard, LeadDetail, invoice card, PDFs)
- [ ] Dates as `DD/MM/YYYY` everywhere
- [ ] Phone numbers in `(03) XXXX XXXX` or `04XX XXX XXX`
- [ ] GST is 10% in every calculation

---

## Sign-off

- [ ] All sections above complete
- [ ] Any failures logged as GitHub issues before launch
- [ ] Glen + Clayton walked through Sections 4, 6, 11, 12 live
- [ ] Production database backup taken before go-live

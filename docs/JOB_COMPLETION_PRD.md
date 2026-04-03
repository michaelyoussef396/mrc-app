# Job Completion Workflow — Product Requirements Document

**Version:** 1.0
**Date:** 2026-04-03
**Status:** DRAFT — Pending Michael's Review
**Scope:** Stages 7-12 of the MRC lead pipeline

---

## Overview

The Job Completion Workflow extends the MRC pipeline from "Inspection Report Sent" through to "Job Closed". It covers everything a technician and admin need to complete a remediation job, generate a professional report, invoice the customer, track payment, and request a Google review.

**User Flow:**
1. Customer approves inspection report and books remediation job
2. Technician completes job on-site, fills out completion form
3. Admin reviews job report, approves, emails to customer
4. Admin generates and sends invoice
5. Customer pays, admin marks paid
6. System sends Google review request
7. Lead marked as finished

---

## Section 1: Office Info

**Purpose:** Auto-populated header identifying the job

| Field | Source | Editable | Type |
|-------|--------|----------|------|
| Job Number | Auto-generated (MRC-YYYY-XXXX) | No | VARCHAR(50) |
| Property Address | From `leads.property_address_*` | No | TEXT |
| Requested By | From `leads.full_name` | No | VARCHAR(255) |
| Attention To | From `inspections.attention_to` or lead contact | Yes | VARCHAR(255) |

**Mobile:** Read-only card at top of form. No scrolling needed.

---

## Section 2: Summary

**Purpose:** Overview of the completed remediation work

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| SWMS Completed | Toggle (boolean) | Yes | Safe Work Method Statement |
| Premises Type | Dropdown | Yes | residential / commercial |
| Remediation Completed By | Auto (logged-in tech) | No | Display name from profile |
| Completion Date | Date picker | Yes | Default: today, format DD/MM/YYYY |
| Areas Treated | Multi-select checkboxes | Yes | Pre-populated from inspection areas |

**Mobile:** Single column layout. Date picker uses native mobile input. Areas treated as checkbox list (48px touch targets per item).

---

## Section 3: Before Photos

**Purpose:** Visual record of conditions before remediation (from inspection)

| Field | Type | Notes |
|-------|------|-------|
| Photo slots | 7 per area + additional | Pre-populated from inspection photos |
| Area selector | Tabs or accordion | One section per inspection area |

**Behaviour:**
- Photos pre-load from `photos` table where `inspection_id` matches and `photo_type` is area/general
- Technician can add more "before" photos if they took extras before starting work
- Photos tagged with `photo_category = 'before'`
- Each photo: thumbnail + caption, tap to enlarge

**Mobile:** Horizontal scroll carousel per area. 48px touch target for add button.

**Offline:** Pre-populated photos require initial online load. If offline at form start, show "Connect to load before photos" message. New photos can be taken offline and queued.

---

## Section 4: After Photos

**Purpose:** Visual record of conditions after remediation

| Field | Type | Notes |
|-------|------|-------|
| Photo slots | 7 per area + additional | New photos taken by technician |
| Demolition Works | Toggle (boolean) | Shows demolition photo section when on |
| Demolition photos | Additional slots | Only visible when demolition toggle is on |

**Behaviour:**
- Photos taken on-site with device camera
- Tagged with `photo_category = 'after'` or `'demolition'`
- Same upload pipeline as inspection photos (resize to JPEG, max 1600px)
- Auto-save photo references to IndexedDB for offline resilience

**Mobile:** Camera button prominent (48px+). Preview thumbnails in grid. Pinch-to-zoom on tap.

---

## Section 5: Treatment Methods

**Purpose:** Record which treatment methods were used during the job

| Toggle | Field Name | Default |
|--------|------------|---------|
| HEPA Vacuuming | `method_hepa_vacuuming` | false |
| Surface Mould Remediation | `method_surface_mould_remediation` | false |
| ULV Fogging Property | `method_ulv_fogging_property` | false |
| ULV Fogging Subfloor | `method_ulv_fogging_subfloor` | false |
| Subfloor Remediation | `method_subfloor_remediation` | false |
| AFD Installation | `method_afd_installation` | false |
| Drying Equipment | `method_drying_equipment` | false |
| Containment & PRV | `method_containment_prv` | false |
| Material Demolition | `method_material_demolition` | false |
| Cavity Treatment | `method_cavity_treatment` | false |
| Debris Removal | `method_debris_removal` | false |

**Mobile:** Vertical list of switches. Each switch row: label + 48px toggle. Green when active.

**Pre-population:** Treatment methods from the inspection form (`inspections.treatment_methods` array) should be pre-selected as defaults. Technician can toggle on/off.

---

## Section 6: Chemical Toggles

**Purpose:** Record chemicals applied during remediation

| Toggle | Field Name | Default |
|--------|------------|---------|
| Air Filtration Device | `chemical_air_filtration` | false |
| Water Based Solution | `chemical_water_based` | false |
| Sodium Hypochlorite | `chemical_sodium_hypochlorite` | false |
| HEPA Vac'd | `chemical_hepa_vacuumed` | false |
| Sanitised Premises | `chemical_sanitised_premises` | false |

**Mobile:** Same layout as Section 5. Vertical switch list.

---

## Section 7: Equipment Used

**Purpose:** Record actual equipment used vs. what was quoted in the inspection

| Equipment | Fields | Rate |
|-----------|--------|------|
| Dehumidifier | Quantity + Days | $132/day |
| Air Mover | Quantity + Days | $46/day |
| AFD | Quantity + Days | TBD (need rate from Michael) |
| RCD | Quantity + Days | $5/day |

**Behaviour:**
- Each row shows: Equipment name, Qty input (number), Days input (number), Daily rate, Subtotal
- Below each row: "Quoted: X units" comparison from inspection data
- Highlight in amber if actual exceeds quoted
- Auto-calculate: `subtotal = qty × days × rate`
- Total equipment cost shown at bottom

**Mobile:** Each equipment type as a card. Qty and Days as number inputs with +/- steppers (48px buttons). Comparison text below in muted color.

**Data Source for comparison:**
- `inspections.commercial_dehumidifier_qty` → Quoted dehumidifier qty
- `inspections.air_movers_qty` → Quoted air mover qty
- `inspections.rcd_box_qty` → Quoted RCD qty

---

## Section 8: Variation Tracking

**Purpose:** Document any scope changes from the original inspection quote. Critical for billing dispute resolution.

| Field | Type | Conditional |
|-------|------|-------------|
| Scope Changed | Toggle (boolean) | Always visible |
| What Changed | Textarea | Shows when scope_changed = true |
| Why Changed | Textarea | Shows when scope_changed = true |
| Extra Work Performed | Textarea | Shows when scope_changed = true |
| Scope Reduced | Textarea | Shows when scope_changed = true |

**Mobile:** Toggle at top. When enabled, expandable text areas appear below. Each textarea: min 3 rows, auto-expand.

**Business Rule:** If `scope_changed = true`, the variation details appear in the Job Report PDF (page 7) and the invoice helper pre-populates a variation line item.

---

## Section 9: Job Notes

**Purpose:** Technician notes and flags for admin attention

| Field | Type | Notes |
|-------|------|-------|
| Request Review | Toggle (boolean) | Flags job for admin review before report generation |
| Damages Present | Toggle (boolean) | Indicates pre-existing or job-related damage |
| Damages Details | Textarea | Shows when damages_present = true |
| Staining Present | Toggle (boolean) | Indicates residual staining after treatment |
| Staining Details | Textarea | Shows when staining_present = true |
| Additional Notes | Textarea | Free-form technician notes |

**Behaviour:**
- If `request_review = true`, lead status becomes `pending_review` instead of `job_completed`
- Damages and staining details appear in the Job Report PDF
- Additional notes appear in the report's work summary section

**Mobile:** Toggle + conditional textarea pattern (same as Section 8). 48px targets on all toggles.

---

## Section 10: Office Notes (Admin Only)

**Purpose:** Internal admin notes not visible to customer or in reports

| Field | Type | Notes |
|-------|------|-------|
| Office Notes | Textarea | Internal only |
| Followup Required | Toggle (boolean) | Flags for admin follow-up |

**Access Control:** Only visible when `currentRole === 'admin'`. Hidden for technician role. The `RoleProtectedRoute` pattern from existing code handles this via `useAuth().hasRole('admin')`.

**Mobile:** Same textarea + toggle pattern.

---

## Job Report PDF — 9 Pages

The job report uses the same MRC branding and design system as the inspection report (navy #121D73 headers, gold accents, professional typography).

### Page 1: Cover Page
- MRC logo (centered)
- "Job Completion Report" title
- Job number (MRC-YYYY-XXXX)
- Property address
- Completion date (DD/MM/YYYY)
- Technician name
- Customer name

### Page 2: Work Summary
- Areas treated (list)
- Completion date
- Premises type
- SWMS status
- Technician name
- Brief summary of work performed

### Page 3: Before Photos
- Grid layout (2 columns on desktop, 1 on mobile)
- Area name as section header
- Photos with captions
- "Before remediation" label

### Page 4: After Photos
- Same grid layout as before photos
- "After remediation" label
- Demolition photos section (if applicable)

### Page 5: Treatment Methods
- Checklist of all 11 treatment methods
- Checkmark icon for methods used, dash for not used
- Chemical treatments sub-section with same format

### Page 6: Equipment Summary
- Table format: Equipment | Qty | Days | Rate | Total
- Dehumidifier, Air Mover, AFD, RCD rows
- Quoted vs Actual comparison column
- Equipment subtotal

### Page 7: Variations (conditional — only if scope_changed)
- What changed
- Why changed
- Extra work performed
- Scope reduced
- Financial impact summary

### Page 8: Warranty Certificate
- MRC warranty header
- Job number and date
- Property address
- Warranty period (12 months from completion date)
- Coverage details (standard warranty text)
- Exclusions (standard exclusion text)
- MRC contact details

### Page 9: Post-Treatment Care Guide
- Ventilation recommendations
- Humidity management
- Cleaning guidance
- Warning signs to watch for
- When to contact MRC
- MRC contact details

### Page 10: Contact Page
- MRC logo and ABN
- Office phone, email, website
- Emergency contact number
- Service area (Melbourne and surrounds)
- Social media links

---

## Admin Review Flow

### Status Transitions

```
job_waiting
  ↓ (technician submits form)
job_completed (or pending_review if request_review = true)
  ↓ (admin reviews + approves PDF)
job_report_pdf_sent
  ↓ (admin sends invoice)
invoicing_sent
  ↓ (admin marks paid)
paid
  ↓ (system sends review request)
google_review
  ↓ (auto or manual)
finished
```

### Admin Actions on Lead Detail

| Status | Available Actions |
|--------|-------------------|
| job_completed | View Job Report, Edit Fields, Approve & Send |
| pending_review | Review Notes, Edit Fields, Approve & Send, Request Changes |
| job_report_pdf_sent | View Sent Report, Generate Invoice |
| invoicing_sent | View Invoice, Mark as Paid |
| paid | Send Google Review Request, Close |

---

## Invoice Helper

### Auto-Populated Fields

| Field | Source |
|-------|--------|
| Customer Name | `leads.full_name` |
| Customer Email | `leads.email` |
| Customer Address | `leads.property_address_*` |
| Quoted Amount | `inspections.total_inc_gst` |
| Labour Cost | From inspection pricing |
| Equipment Cost | `Σ(qty × days × rate)` from job completion |
| Variation Amount | Calculated from scope changes |
| Subtotal (ex GST) | Labour + Equipment + Variations |
| GST (10%) | `subtotal × 0.10` |
| Total (inc GST) | `subtotal + gst` |
| Payment Terms | 14 days (default, editable) |

### Admin Can Edit
- All line item amounts
- Payment terms
- Add/remove custom line items
- Apply discounts (max 13% cap enforced)

### Actions
- **Save Draft** — Save without sending
- **Preview** — Show formatted invoice
- **Send Invoice** — Email to customer with amount + payment details

---

## Payment Tracking

### Statuses
- `draft` — Invoice created but not sent
- `sent` — Invoice emailed to customer
- `paid` — Customer has paid
- `overdue` — Past due date and unpaid

### Dashboard Widget (Admin)
- Total outstanding: $X,XXX.XX
- Overdue count: X invoices
- Recently paid: last 7 days

### Overdue Detection
- Daily cron job at 9am AEST
- Checks: `status = 'sent' AND due_date < NOW()`
- Updates status to `overdue`
- Sends Slack notification

---

## Audit Trail Requirements

Every action in the job completion workflow is logged to the `audit_logs` table via database triggers and application-level logging to the `activities` table.

### Trigger-Level (automatic, via `audit_log_trigger()`)
- job_completions: INSERT, UPDATE
- invoices: INSERT, UPDATE

### Application-Level (logged in activities table)
- Job completion form started
- Each section saved (auto-save)
- Job completion form submitted
- Job report PDF generated
- Job report PDF edited (field changes)
- Job report approved
- Job report email sent
- Invoice created
- Invoice sent
- Payment received
- Payment method recorded
- Google review request sent
- Lead status changed (each transition)

### Viewable On
- Lead detail page → Activity timeline (existing `useActivityTimeline` hook)
- Admin dashboard → Recent activity widget

---

## Technical Constraints

- **Mobile-first:** All forms tested at 375px viewport FIRST
- **Touch targets:** Minimum 48px on all interactive elements (gloves requirement)
- **Offline:** Form auto-saves to IndexedDB. Photos queue offline. Sync on reconnect.
- **Australian compliance:** DD/MM/YYYY dates, $X,XXX.XX currency, GST 10%, Australia/Melbourne timezone
- **Pricing rules:** 13% discount cap (0.87 multiplier), equipment rates per CLAUDE.md
- **No `any` types:** TypeScript strict mode throughout
- **shadcn/ui:** All UI components use shadcn/ui primitives
- **Auto-save:** Every section change persists to IndexedDB within 2 seconds

---

## Acceptance Criteria

- [ ] Technician can complete all 10 form sections on mobile (375px)
- [ ] Touch targets >= 48px on all interactive elements
- [ ] Before photos pre-populate from inspection data
- [ ] After photos upload with offline queuing
- [ ] Equipment comparison shows quoted vs actual
- [ ] Variations section records scope changes
- [ ] `request_review` toggle routes to `pending_review` status
- [ ] Job report PDF generates with all 9 pages
- [ ] Admin can edit PDF fields inline
- [ ] Admin approve triggers email with PDF attachment
- [ ] Invoice auto-populates from inspection + job completion data
- [ ] Admin can edit invoice before sending
- [ ] Payment status tracks correctly (sent → paid → overdue)
- [ ] Overdue invoices flagged daily at 9am AEST
- [ ] All status transitions logged in audit trail
- [ ] Slack notifications fire for: job_completed, report_approved, invoice_sent, payment_received
- [ ] Form auto-saves to IndexedDB for offline resilience
- [ ] Google review request email sends after payment received

---

*This PRD is the feature specification for Phase 2 implementation. All sections must pass acceptance criteria before Phase 2 is considered complete.*

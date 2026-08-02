# Launch Testing Findings — 2 Aug 2026

## How to use this

Issues logged during end-to-end testing. Each gets a severity, the step it was found
in, and the file/template responsible where known. Fixed in one batch, not during the
test run.

**Severity:** BLOCKER (stops launch) / HIGH (customer-visible, fix before team use) /
MEDIUM (polish) / LOW (nice to have)

---

## Step 1 — Framer form submission → lead capture

**Status: PASS** (chain worked end to end)

Verified working:

- Framer form submitted successfully
- Slack notification received
- Framer backup email received at `admin@`
- Lead visible in pipeline on mrcsystem.com
- Confirmation email delivered from `admin@mouldandrestoration.com.au`

### Issues found

**1. HIGH — Google Review link in enquiry confirmation email**

The confirmation email footer contains "Write a Review: Leave us a Google Review".
This is promotional content in a transactional email. Both compliance reviews concluded
transactional emails are not commercial electronic messages under s 6 of the Spam Act,
which is what exempts them from s 18 unsubscribe requirements. A promotional review
link undermines that position. Remove from all transactional templates — the review
request belongs only in the post-job-completion email, which already carries the
unsubscribe line.

Location: `src/lib/api/notifications.ts:170`, inside `wrapInBrandedTemplate` — the
shared wrapper used by all six branded email bodies. The same signature block is
duplicated in two Edge Functions: `receive-framer-lead/index.ts:340` and
`send-inspection-reminder/index.ts:81`. All three need the change, and the two EFs need
redeploying separately from the frontend.

Why this is sharper than "promotional content in a transactional email": the enquiry
confirmation goes to someone who has just filled in a webform and is not yet a
customer. There is no existing transaction to anchor a commercial call to action to,
which is a materially weaker position under s 6 than the inspection report's embedded
quote. Severity and fix are unchanged; this is the reasoning for the batch session.

Batch note: this is an Edge Function change, not just a template edit. EF deploy order
applies (EF first, template second), and re-proving Step 1 requires a fresh Framer
submission after `receive-framer-lead` is redeployed.

**2. HIGH — Phone number leading zero stripped**

Submitted as `0433 880 403`, stored/displayed as `433880403`. Confirm whether the zero
is lost at parse time in `receive-framer-lead` or only on display. If lost at storage,
click-to-call and technician callbacks will fail.

Diagnostic: `webhook_submissions.raw_payload` stores the parsed body of every
submission, so the original row will show whether `phone` arrived as a JSON string or a
JSON number. A number would explain the loss before any app code runs.

**3. MEDIUM — Name not title-cased**

Email greeting reads "Hi michael youssef". Should render as submitted or title-cased
for display.

**4. MEDIUM — Inconsistent business name in one email**

- Header: "Mould & Restoration Co."
- Sign-off: "The MRC Team – Mould & Restoration Experts"
- Footer: "Mould and Restoration Co."

Pick one canonical form and use it throughout.

**5. MEDIUM — Logo renders poorly at email size**

The dot-ring mark is illegible small and reads as visual noise. Needs a larger asset or
a wordmark version.

**6. MEDIUM — Preferred time format**

Displays "10:00" rather than "10:00 AM". Australian formatting convention.

**7. LOW — Postcode absent from confirmation details table**

Name, Address, Preferred Date and Preferred Time shown. Postcode was submitted but not
echoed.

**8. LOW — Issue description not echoed to customer**

Good practice so the customer can confirm the details were captured correctly.

**9. LOW — Legal confidentiality disclaimer**

The "confidential and intended solely for the addressee" block reads as corporate
boilerplate on a customer enquiry confirmation. Consider removing or shortening.

---

## Step 2 — Admin books the job

**Status: PASS** (chain worked end to end)

Verified working:

- Lead created directly in app — Slack notification and email fired identically to the
  Framer path
- Lead scheduled via recommended-date picker, no issues
- Slack "Inspection Booked" received with lead, address, technician, date and time
- Slack "Booking confirmation sent" received with recipient address
- Booking confirmation email delivered to customer
- Time rendered correctly as "10:00 AM" in this template

Test data: lead "michael youssef", 35 wellington street, mernda, VIC, 3754, booked
6 Aug 2026 10:00 AM.

### Issues found

**10. PARKED — Intermittent error page, clears on refresh**

An error page appears at random points in the app. Pressing the blue refresh button
clears it, usually first or second attempt. Pre-existing, long-standing, not introduced
by launch testing. Never blocks completion of a workflow.

Not in scope for the launch batch. A previous full-day investigation produced no root
cause and no change. Deliberately parked — do not reopen without new evidence (a
reproducible route, or a Sentry issue ID appearing on its own).

**11. MEDIUM — Sender display name is a fourth business-name variant**

Inbox shows "Mould & Restoration Co" with no trailing period, while the email header
uses "Mould & Restoration Co." and the footer uses "Mould and Restoration Co.". Rolls
into issue 4, but note this variant is the one customers see in their inbox list before
opening. Set in the Resend `from` field, not the template body.

**12. MEDIUM — Address not title-cased**

Renders as "35 wellington street, mernda, VIC, 3754". Same root cause as issue 3 (name
casing) — submitted values echoed raw. Suburb and street should be title-cased for
display; VIC and postcode are already correct.

### Recurrences confirmed from Step 1

The following appear identically in the booking confirmation, confirming
`wrapInBrandedTemplate` is the single shared source:

- Issue 1 — Google Review link in footer
- Issue 4 — business name inconsistent between header, sign-off and footer
- Issue 5 — dot-ring logo illegible at email size
- Issue 9 — confidentiality disclaimer boilerplate

### Scope narrowed

Issue 6 (time shown as "10:00" not "10:00 AM") does **not** occur in the booking
confirmation — this template renders "10:00 AM" correctly. Issue 6 is therefore scoped
to the enquiry confirmation template only, not the shared wrapper.

Note: date renders as "6 Aug 2026" rather than DD/MM/YYYY. Flagging for a decision
rather than as a defect — long-form date may be intentional for customer-facing email
even though the app standard is DD/MM/YYYY. Confirm before changing.

---

## Step 3 — Technician inspection form at 375px

**Status: PASS** (all 9 sections completed and saved end to end)

Verified working:

- Sections 3–8 all saved to server, "Saved — Section N saved to the server" toast on each
- Photo upload working across Area Inspection, Subfloor, Outdoor, Infrared
- Auto-calculated labour hours pulled correctly from Area Inspection and Subfloor
- No horizontal scroll, no layout breakage at 375px
- Internal notes carried through from booking call and displayed in later sections
- Dew point auto-calc correct in both sections (23°C/32% → 5.4°C; 46°C/23% → 19.9°C)

**Pricing engine verified correct against MRC Pricing Reference:**

- 2h rates are exactly 2× the 1h reference figures across all three labour types
- Demolition 6h interpolated to $1,571.25 — matches linear interpolation between
  2h ($1,062.00) and 8h ($1,825.87)
- Partial days correctly prorate against day-2 rates, not day-1
  (Treatment day 2: $1,060.34 ÷ 8 = $132.54/h; Subfloor day 2: $2,015.47 ÷ 8 × 2 = $503.87)
- Equipment charged at correct per-unit-per-day rates: Dehumidifier $119, Air Mover $46,
  RCD Box $5
- GST 10% on subtotal correct on both options

Test data: Kitchen, cornice + grout/silicone, 9h surface / 6h demolition / 10h subfloor,
25h total, 4 work days, 6m³ bin at $550.

### Issues found

**13. HIGH — Multiple photos can be attached to a single caption slot**

On mobile, the photo picker allows selecting and uploading multiple images against one
caption. The intended model is one photo per caption. Affects Area Inspection photo
gallery and likely every captioned photo field in the form.

Consequence is report quality rather than data loss — captions stop matching images in
the PDF. Needs both a form-level constraint and a note to Glen and Clayton on expected
behaviour before they start using the form.

**14. MEDIUM — Dehumidifier Size dropdown does not affect pricing**

Section 8 presents a Dehumidifier Size selector (Small/Medium/Large). Equipment is
charged at a flat $119 per unit per day regardless of size, per the MRC Pricing
Reference. The field implies a pricing consequence that does not exist.

The calculation itself is correct — this is a UI expectation problem, not a pricing
defect. Decision needed: relabel as technician-reference-only, or remove. Pricing
surface, so pricing-guardian gate applies before any change.

**15. MEDIUM — Equipment days auto-calculate with no confirm step**

Equipment hire days are derived from labour hours (25h → 4 days) and applied silently.
The tech has no opportunity to confirm or adjust before the figure drives the equipment
total.

Section 6 (Waste Disposal) already implements the correct pattern: tech enters bin size,
price calculates, tech confirms, with an "Edit price" escape hatch. Equipment days should
follow the same confirm-or-override pattern. See Confirmed Rules below.

**16. LOW — HEPA Air Scrubber toggle should reveal its detail section**

HEPA Air Scrubber already has a detail section with units and an auto day count, matching
the other equipment — no new build required. The Treatment Methods toggle
"HEPA Air Scrubber Installation" should show and hide that detail section the way the
Drying Equipment toggle does, so there is one place to turn HEPA on rather than two
states that can drift apart.

**17. LOW — Timestamp casing inconsistent**

Internal notes render "[02/08/2026 at 11:32 pm]" in lowercase, while booking emails use
"10:00 AM". Date format DD/MM/YYYY is correct. Pick one casing convention.

### Untested this run

**HEPA Air Scrubber pricing path.** The Treatment Methods toggle was off for this run, so
the $100/day line never rendered in the Section 8 breakdown. HEPA is unit-tested and in
the pricing engine but has not been exercised end to end. Needs a pass with the toggle on
and a quantity set, confirming the line appears in Labour/Equipment Breakdown and flows
into both option totals.

### Confirmed rules — Michael, 3 Aug 2026

Answers to questions raised during this test run. These are settled; no further
consultation needed before the batch session.

**Equipment quantities and days.** Section 7 (Drying Equipment) is the single home for
all equipment — Commercial Dehumidifier, Air Movers, RCD Box, HEPA Air Scrubber — and
holds the per-unit quantities. Day count is auto-calculated from labour hours and applies
as one shared figure across all equipment units, not per-unit. Auto-calculation stays;
the change required is a confirm/override step matching the Section 6 bin-price pattern.

**Option 1 equipment value.** Option 1 showing $472.00 against Option 2's $944.00 is
correct. Surface-only scope runs fewer days, so the lower equipment figure reflects the
shorter duration. Not a hardcoded halving. No change required.

**4-day residential cap.** Remains a displayed guideline rather than a code-enforced
constraint, on the condition that the cap is stated in the pricing section of the form
where the tech can see it. Verify the text is present and visible at 375px; if it is,
no change required.

**RCD Box.** Charging correctly at $5 per unit per day. Absent from the MRC Pricing
Reference table — update the reference document to include it rather than changing the
code.

---

## Step 4 — Report generation and PDF

**Status:** awaiting test

### Issues found

---

## Step 5 — Report email delivery

**Status:** awaiting test

### Issues found

---

## Step 6 — Job completion form

**Status:** awaiting test

### Issues found

---

## Step 7 — Job report and invoice

**Status:** awaiting test

### Issues found

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

**15. LOW — Editable days field exists on HEPA only, not the other equipment rows**

HEPA Air Scrubber Details includes a Days field showing "Auto (4)" with steppers and the
hint "Days defaults to the job's equipment days" — the tech can accept the calculated
figure or override it. This is the correct pattern and matches the Section 6 bin-price
confirm flow.

Commercial Dehumidifier, Air Movers and RCD Box have quantity steppers only, with no
equivalent days control. Extend the HEPA pattern to the other three rows so every
equipment line can be adjusted the same way. Not urgent — the shared auto figure is
correct for typical jobs.

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

## Step 4 — Report generation and AI summary

**Status: PASS with defects** (generation and pricing correct, narrative asserts
unselected services)

Verified working:

- AI summary generated automatically on inspection completion, no manual trigger needed
- Admin review screen renders all five sections with per-section and global regenerate
- Per-section instruction boxes present with 2000-char counters
- Lead context, internal notes and inspection metrics all populate correctly
- Reject / Save Draft / Approve & Next controls present
- Prose quality is good — structure, tone and Australian spelling all correct

**All numeric values transcribe accurately from the form.** Verified individually:
kitchen 46°C / 23% RH / dew point 19.9°C, internal moisture 46% near window, external
wall 31%, subfloor 20% under shower, outdoor 23°C / 32% / dew point 5.4°C. Both dew point
figures correct to one decimal against the Magnus formula.

**Equipment pricing verified correct with HEPA enabled.** Section 9 Cost Estimate:
Dehumidifier 1 × $119 × 4 = $476.00, Air Movers 2 × $46 × 4 = $368.00, HEPA Air Scrubber
4 × $100 × 4 = $1,600.00, RCD Box 5 × $5 × 4 = $100.00, equipment total $2,544.00. Labour
subtotal $5,828.20. Option 2 subtotal $8,372.20, GST $837.22, total $9,209.42 — all
arithmetically correct. Option 1 equipment $1,272.00 reflects the shorter surface-only
duration as confirmed in Step 3.

This closes the HEPA end-to-end gap flagged in Step 3.

### Issues found

**18. HIGH — AI asserts treatment methods whose toggles are OFF**

Two services appear in the narrative that were not selected in Section 7:

1. "A broad-spectrum antimicrobial solution will then be applied to kill any remaining
   mould spores" — Surface Remediation Treatment is OFF.
2. "A final clearance air test will be conducted to confirm the successful restoration of
   healthy air quality" — not present in Treatment Methods at all and not priced.

Containment and negative pressure also appear despite Containment and Prep being OFF,
though that one traces to the technician's own extra notes and is defensible.

Root cause is scope: the model fills gaps with plausible remediation-industry defaults
rather than restricting itself to selected inputs. Needs a prompt-level constraint plus a
post-generation check that no service appears in the narrative which is absent from the
work procedure toggles.

Customer-visible commitment to unquoted work — fix before the team uses the form.

**19. HIGH — Broken character in section heading**

The Recommendations heading renders as `**\ccb RECOMMENDATIONS**` — a literal escape
artifact where the adjacent heading renders an emoji correctly. Customer-visible in the
PDF. Confirmed as an escaping issue, not model output. The prompt string at
`supabase/functions/generate-inspection-summary/index.ts:712` contains
`\ud83d\udccb RECOMMENDATIONS` — a surrogate pair for 📋 (U+1F4CB). The leading
`\ud83d` half is lost and the trailing `\udccb` collapses to `\ccb`. The adjacent
heading in the same prompt uses `\ud83d\udd0d` for 🔍 (U+1F50D) and renders
correctly, so the fault is specific to this pair rather than to emoji handling
generally.

Batch note: this is an Edge Function change and needs a deploy, not just a template edit.

**20. HIGH — Timeline is arithmetically self-contradictory**

Report states "MRC treatment: 6 days", "Drying equipment: 4 days", "Total project: 10 days".

Actual labour is 25 hours across 4 work days. The 6 appears to be demolition's 6 *hours*
misread as days. Drying also normally runs concurrent with treatment rather than
sequentially, so summing to 10 inflates the customer's expected disruption by more than
double.

Timeline should derive from the calculated work-days figure rather than be generated
freely.

**21. MEDIUM — No range validation on temperature and humidity inputs**

Kitchen was recorded at 46°C, which is not physically plausible indoors in Melbourne, and
the same value 46 also appears as the internal moisture percentage — consistent with one
number typed into two fields.

The AI transcribed both accurately, so this is a form-level gap rather than an AI defect.
Add range validation on temperature, humidity and moisture inputs so implausible values
are caught at entry rather than reaching the customer's report.

**22. MEDIUM — Customer's reported issue never reconciled with inspection findings**

The enquiry describes black mould on the bathroom ceiling around the exhaust fan spreading
behind the shower, roughly 1.5m², following a roof leak, plus a musty smell in the
adjacent bedroom. The report covers the kitchen sink trap exclusively and never addresses
the bathroom, the bedroom odour, or the roof leak.

This run used mismatched test data, so the specific divergence is an artifact. The absence
of any reconciliation step is not — where findings diverge from what the customer
reported, the report should say so explicitly.

**23. MEDIUM — Conflicting values quoted without flagging**

Subfloor moisture reading in the form is 20% (under shower); the subfloor free-text
comment states 22–28% WME. The AI quoted 20% and ignored the conflict. Dwelling type is
recorded as "townhouse" while the enquiry describes a 1950s weatherboard.

Where structured fields and free text disagree, the conflict should surface for admin
review rather than being silently resolved.

### PDF output

**Status: PASS with defects** (PDF generated, renders end to end, one layout ordering issue)

Verified working:

- PDF generated on approval and renders complete
- Cover page with property address, inspection date and branding
- Area Inspected, Outdoor Environment, Subfloor, Problem Analysis, Demolition,
  Visual Mould Cleaning Estimate, Terms & Conditions and closing page all present
- Photos render throughout including infrared, natural light comparison, subfloor,
  street view, front house and front door
- Outdoor Environment section correctly displays numeric values: outdoor temp 23°C,
  humidity 32%, dew point 5.4°C
- Before/after comparison imagery present in the cleaning estimate section

**24. MEDIUM — Internal and external moisture readings render in the wrong position**

The readings are present in the PDF and the data is intact — this is a layout ordering
issue, not missing data.

Internal moisture (46%, near window), external moisture (31%, external wall) and the area
environment values (46°C, 23% humidity, 19.9°C dew point) appear further down the page
than intended, separated from the Area Inspected: Kitchen block they belong to. The
readings should sit with their area section the way the Outdoor Environment section groups
its values, rather than appearing after the photo tiles.

Presentation only. The report is readable and no value is lost. Fix is a block reorder in
the inspection report HTML template.

### Assessment

Pricing, generation, review UI and numeric transcription are all correct. The remaining
defects are confined to what the model is permitted to assert and how the timeline is
derived. Issues 18–20 before the team uses the form; 21–24 are polish.

Note for the batch session: an earlier reading of this run reported HEPA as missing from
equipment pricing. That was a stale screenshot taken before the HEPA toggle was enabled.
Pricing is correct. Do not open the pricing engine for this.

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

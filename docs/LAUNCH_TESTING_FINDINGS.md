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

**13. MEDIUM — Multiple photos can be attached to a single caption slot**

On iOS the native photo picker allows multi-select and the web form cannot prevent the
user from choosing several images at once. Downgraded from HIGH: this is a platform
constraint, not purely an application defect.

Two mitigations remain available and should be assessed in the batch session:

1. Omit the `multiple` attribute on the file input, which limits the iOS picker to a
   single selection at the OS level.
2. Accept only the first file returned and discard the remainder, with a visible message
   telling the tech that one photo per caption is expected.

If neither is workable, the fallback is documentation: brief Glen and Clayton that one
photo per caption is required, and note the limitation in the team guide. Consequence is
report quality rather than data loss — captions stop matching images in the PDF.

Applies to Area Inspection and likely every captioned photo field. Confirm during Step 6
whether the job completion form shares the same photo component — if it does, one fix
covers both.

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

**Status: FAIL** (delivery works, one blocker in the customer-facing body)

Verified working:

- Report email delivered on approval, subject line "Your Inspection Report — INS-2026-0001"
- PDF attached correctly, 16 pages, opens and renders in Gmail's viewer
- Slack notification fired
- Reference number, property address and status all populate correctly
- Body copy reads well and the approval framing is clear

### Issues found

**25. BLOCKER — Personal mobile number appears in the customer-facing email body**

The sign-off reads:

    Kind regards,
    Mould & Restoration Co.
    0433 880 403

That is a personal mobile, not a business line. It goes to every customer receiving an
inspection report.

**Root cause confirmed by code trace, 3 Aug 2026. Not a field resolution problem.**

The number is a hardcoded string literal at `src/pages/ViewReportPDF.tsx:361`, inside the
email body template literal:

    `Kind regards,\nMould & Restoration Co.\n0433 880 403`

Line 361 contains no `${}` interpolation. Lines 356–358 of the same literal do
interpolate `lead?.full_name`, the address and `inspection.job_number` — the phone is
conspicuously not among them. The digits are characters in source.

The match with the test lead's submitted phone is coincidence: the same mobile was used as
the test customer and is separately hardcoded in the composer.

Why the footer is correct: `notifications.ts:162` hardcodes `1800 954 117` in
`wrapInBrandedTemplate`. The body arrives as `customMessage` and is wrapped by it. Two
independent hardcoded numbers in one email, not one field resolving inconsistently.

Flow: `emailBody` state (ViewReportPDF.tsx:322) → editable textarea (:2343-2344) →
`customMessage` (:978) → `buildReportApprovedHtml` (notifications.ts:369-375) → `sendEmail`.

Fix is a one-line change at ViewReportPDF.tsx:361 to the business number, or removal of
the line so the footer number stands alone. Frontend only — no Edge Function deploy.

**Verification superseded.** The two-lead test described earlier is not required; the code
trace is sufficient proof. Verify instead by sending one report after the change and
confirming 1800 954 117 appears in both body and footer.

Note: `LeadsManagement.tsx:512` produces a different subject line format (hyphen, property
or suburb) and is a separate send path. Confirm whether it carries its own hardcoded
number before closing this issue.

**26. HIGH — MRC logo does not render in the sender profile**

The sender avatar shows a generic placeholder rather than the MRC mark. Distinct from
issue 5 (dot-ring logo illegible inside the email body) — this is the profile image Gmail
displays beside the sender name, set via BIMI or the sending domain's profile rather than
in the template.

Related to issue 11 (sender display name variant), since both are sender-identity
configuration rather than template content.

### Recurrences confirmed

Fifth appearance of the shared footer block, confirming `wrapInBrandedTemplate` reaches
this template too:

- Issue 1 — Google Review link
- Issue 4 — business name inconsistent: header "Mould & Restoration Co.", sign-off
  "The MRC Team – Mould & Restoration Experts", footer "Mould and Restoration Co."
- Issue 5 — dot-ring logo illegible at email size
- Issue 9 — confidentiality disclaimer boilerplate
- Issue 3 — greeting not title-cased ("Hi michael youssef")
- Issue 12 — address not title-cased ("35 wellington street, mernda")

**27. LOW — Duplicate sentence in email body**

"If you have any questions about the report or would like to discuss remediation options,
please don't hesitate to get in touch." appears twice — once above the details table and
again below it, immediately before the Call Us button.

**28. HIGH — Job report hard-save fails at three independent points**

Console captured during the failed send attempts, from the Google review step before
lead closure. Three distinct errors, not one flaky operation:

    HardSaveJobReportError: HTML storage upload failed
      at Ma (ViewReportPDF-*.js) at async pe (ViewReportPDF-*.js)

    HardSaveJobReportError: PDF render failed
      at Ma (ViewReportPDF-*.js) at async pe (ViewReportPDF-*.js)

    [Notifications] Email edge function error:
      FunctionsHttpError: Edge Function returned a non-2xx status code

Attempt 1 failed at HTML storage upload. Attempt 2 failed later, at PDF render. Attempt 3
succeeded. The email Edge Function error is separate again.

Three failure stages in the hard-save chain: HTML upload to storage, PDF render, and the
email dispatch EF. Each fails independently and each is caught by the same
`HardSaveJobReportError` wrapper, which makes them look like one intermittent fault when
they are not.

**The email arrived despite the EF returning non-2xx.** Either the function partially
succeeded before erroring, or the successful third attempt sent it and this error is
orphaned. Worth establishing — an admin who sees a send failure may reasonably assume no
email went out, and could resend, producing a duplicate to the customer.

Source is `ViewReportPDF` (the lazy-loaded chunk). Sentry captured all three, so the
issues should be retrievable there with full stack traces rather than minified frames.

Fix scope for the batch session:

- Distinguish the three failure modes in error handling rather than collapsing them into
  one wrapper error
- Surface a specific, actionable message per failure mode
- Establish whether the email EF genuinely failed or reported failure after sending
- Add a retry affordance with a clear success state

**28a. LOW — Radix Dialog accessibility warnings**

Same console shows two Radix warnings on the dialog used in this flow: `DialogContent`
requires a `DialogTitle`, and `Description`/`aria-describedby` is missing. Screen reader
accessibility only, no functional impact. Fix is a `VisuallyHidden` wrapped title and a
description on the dialog.

---

## Step 6 — Job completion form

**Status: PASS** (all 10 sections completed, submitted, approved and report sent)

Verified working:

- All 10 sections completed and submitted, JOB-2026-0001 created
- Office info, address snapshot, requested-by and attention-to all carried from inspection
- Before photos (3) and after photos (7, split across After and Demolition) uploaded
- Treatment methods, chemicals used and SWMS all recorded
- Section 7 shows Actual vs Quoted side by side for every equipment type — good design,
  makes divergence visible at the point of entry
- Waste disposal captured actual 8m³ / $703.00 against quoted 6m³ / $550.00
- Job report approved and emailed at 12:47am, appears in Email History
- Activity Log captured every state transition with timestamps and attribution

**No em-dashes in snapshot values.** Quoted figures rendered correctly throughout
Section 7, confirming the snapshot path works on inspections created after the snapshot
code landed. The em-dash behaviour in fixture 1b81f7e7 remains the known null-tolerance
case and is not a defect.

### Issues found

**29. HIGH — No field for actual labour hours**

Section 7 captures actual equipment quantities and days against quoted. There is no
equivalent for labour. The invoice bills labour at the quoted $5,828.20, derived from the
25h inspection estimate.

The job was booked as 5 days / 34 hours. If 34 hours were worked, roughly 9 hours are
unbilled. Equipment is billed at actual while labour is billed at quote — the two halves
of the invoice use different bases.

Needs a decision from Glen and Clayton on whether labour should bill at quote (fixed-price
model) or actual (time-and-materials). If quote, the current behaviour is correct and only
needs documenting. If actual, Section 7 needs actual-hours fields per labour type and the
invoice needs rewiring.

**30. MEDIUM — Variations section left empty despite substantial scope change**

Section 8 records "No scope variations recorded" while every equipment line and the waste
disposal diverged materially from quote. Nothing required an entry and nothing warned.

The section exists and works; the gap is that it is optional in a case where a variation
clearly occurred. Consider requiring a variation note when actual equipment or waste
diverges from quote beyond a threshold.

**31. LOW — Sections 9 and 10 empty**

Job Notes and Office Notes both recorded as empty. Not a defect — no notes were entered.
Flagged only to confirm the sections render correctly when unpopulated, which they do.

---

## Step 7 — Job report and invoice

**Status: PASS**

Verified working:

- Job Completion Report emailed to customer, appears in Email History as sent
- Invoice Summary renders all line items with unit counts and day counts shown
- Generate Invoice control present, opens invoice editor
- Status advanced correctly to Job Report Sent, ready to invoice
- Activity Log captured approval, send and status transitions with attribution

**Invoice arithmetic verified line by line — all correct:**

- Dehumidifier 6 × 5 days × $119.00 = $3,570.00
- Air Mover 4 × 3 days × $46.00 = $552.00
- HEPA Air Scrubber 2 × 3 days × $100.00 = $600.00
- RCD 2 × 4 days × $5.00 = $40.00
- Equipment subtotal $4,762.00, labour $5,828.20, waste $703.00
- Subtotal ex GST $11,293.20, GST 10% $1,129.32, total inc GST $12,422.52

Every figure is exact. The defect is not in the calculation.

### Issues found

**32. CLOSED — Invoice divergence from quote is handled manually**

Observed in this run: quoted $9,209.42 inc GST, invoice generated at $12,422.52 —
$3,213.10 over. Driven mostly by dehumidifiers (quoted 1 × 4 days, actual 6 × 5 days).
RCDs and HEPA came in under quote. Section 8 recorded no variations.

Closed by Michael, 3 Aug 2026: invoices are reviewed and sent manually, so an admin sees
the total against the quote before anything reaches the customer. No system-level
variation gate is required. Not a defect.

Retained as a record because the Actual vs Quoted display in Section 7 is what makes this
visible at all, and that behaviour should not be removed in future work.

**33. HIGH — Phone number stored without leading zero, confirmed at storage level**

`433880403` appears in the lead detail view Contact Information block and again in the
Invoice Summary customer block. Submitted as `0433 880 403`.

This confirms issue 2: the zero is lost at storage, not at display. Every downstream
consumer inherits it — click-to-call, technician callbacks, and now the invoice, where it
will be copied into Xero and reach the customer on a tax document.

Escalates issue 2 from HIGH-uncertain to HIGH-confirmed. The `raw_payload` diagnostic in
issue 2 is still worth running to establish whether the loss occurs at Framer or at
ingest, since that determines who fixes it.

**34. MEDIUM — Waste disposal amount shows em-dash in inspection data view**

Lead page Inspection Data section renders "Waste Disposal — Required: Yes, Amount: —"
while Section 6 of the inspection recorded 6m³ at $550.00 confirmed. The value exists but
does not surface in this view.

**35. LOW — PDF version 2 attributed to "Unknown"**

Inspection Report History shows v3 by michael youssef and v2 by Unknown, marked Legacy.
Attribution missing on the earlier version.

### Lead detail page — content inventory

Recorded for the team guide. The page surfaces, in order: status header with contact
actions, current status card with next-action prompt, contact information, property
information with Google Maps link, issue description, lead details, inspection scheduling
with reschedule control, customer requests, internal notes with add-note control, cost
estimate summary, subfloor and waste status, dehumidifier size, parking, additional info
for technician, internal office notes per area, cause of mould, property occupation,
outdoor comments, admin cost breakdown for both options, full inspection data including
all areas with photos and moisture readings, subfloor assessment, outdoor environment,
waste disposal, work procedure and equipment, job summary, cost estimate with labour
breakdown and rate reference, AI summary in full, inspection report history with PDF
versions, email history, job completion sections 1–10, invoice summary with line items,
and activity log.

Note for the team guide: this page is long. Admin users will need guidance on which
sections matter at which stage, and technicians should not be directed here at all —
their entry point is the mobile dashboard.

---

## Batch C outcomes — 3 Aug 2026 (`batch-c-forms-ui`)

Forms, PDF and UI batch. Three of the seven briefs did not survive contact with the code;
those are recorded below rather than quietly reinterpreted.

| Issue | Outcome |
|---|---|
| 13 — multiple photos per caption | **FIXED.** Seven fields, not nine. |
| 15 — editable days on other equipment | **PARKED** — see `docs/TODO.md`. |
| 16 — HEPA toggle reveals its section | **ALREADY IMPLEMENTED.** Inverse defect found and fixed. |
| 24 — PDF readings position | **HELD** — does not reproduce, see below. |
| 30 — variation note on the invoice | **FIXED.** |
| 34 — waste amount em-dash | **FIXED**, plus a money bug found alongside. |
| 35 — PDF version "Unknown" | **FIXED forward**, no backfill. |

**13.** The `multiple` flag is not a JSX attribute — `openFilePicker` sets `input.multiple`
imperatively (`TechnicianInspectionForm.tsx:3505-3511`), so a grep for `multiple` finds
nothing. Two of the nine fields named in the brief (internal and external moisture) were
already correct via the `readingId` guard. The other seven were real. Room view and subfloor
keep multi-select — both spread into arrays. Also stops orphan `photos` rows: the upload loop
wrote every selected file before `newPhotos[0]` discarded the extras.

**16.** `TechnicianInspectionForm.tsx:2148` already gates the HEPA detail section on the
treatment-method toggle, symmetric with Drying Equipment at `:2054`, and was present on `main`
before this test run — no later commit fixed it. The genuine "two states that can drift apart"
is the opposite one: Drying Equipment hid its UI while its quantities kept feeding pricing,
kept being saved and kept being billed. Fixed in `bcb9e99` with `getEffectiveDryingQty`,
mirroring the HEPA helper. No existing quote changes — the load path reconciles pre-gate
records by treating stored quantities as evidence the equipment was on, so nothing is
dropped retroactively.

**24 — verification, since the brief asked for the live template to be identified first.**
The live template is `pdf-templates/inspection-report-template-final.html`, fetched by public
URL at `generate-inspection-pdf/index.ts:12`, sourced from
`src/templates/inspection-report-template.html` and renamed on upload. Fetched 3 Aug: HTTP 200,
66,282 bytes, **byte-identical to the repo file**.

The stated premise does not hold. The area page is entirely absolutely positioned inside
`.report-page { position: relative }`, and the readings already sit above the photos:

| Element | y |
|---|---|
| `AREA INSPECTED` | 40 |
| navy readings box | **241 → 378** |
| temperature / humidity | 249 |
| dew point / visible mould | 304 |
| internal / external moisture | 349 / 348 |
| **photo grid** | **402 → 735** |

Because the layout is absolute, a DOM reorder changes nothing visually; only coordinate edits
would, and that means editing a page verified to render correctly. There is no second render
path — `ReportPreviewHTML.tsx:920` injects the EF's HTML wholesale and has no area layout of
its own. **Held pending the actual defective PDF or a screenshot.**

Two things noticed while verifying, worth checking against that artefact:
- `index.ts:1126` selects the internal reading with
  `find(r => r.title?.toLowerCase().includes('internal')) || moistureReadings[0]` — a reading
  titled otherwise silently falls through to the first one.
- Only the percentage is emitted; the reading title ("near window") never reaches the PDF at
  all, which may be what read as "separated from" its block.

**34.** Root cause was a column rename, not a missing value. Both surfaces read
`waste_disposal_amount`, the Small/Medium/Large enum superseded by `waste_disposal_m3` +
`waste_disposal_confirmed_cost` in `20260624104911`. The data was present the whole time.
Found alongside: `InspectionDataDisplay.tsx:712-721` omitted `wasteDisposalCost` from
`calculateCostEstimate`, so the lead-view estimate understated every waste-bearing job by the
waste amount plus GST — $550 + $55 on this test lead. Fixed in the same batch.

**35.** `pdf_versions.created_by` is nullable with no default and no trigger, and the legacy
EF's insert never set it. The "Legacy" badge renders exactly when `pdf_storage_path` is NULL,
which only that insert produces — so v2 is a legacy-EF row with a genuinely empty column and
v3 is a hard-save row. The name lookup works. Historic rows left alone; the writer now
attributes new ones.

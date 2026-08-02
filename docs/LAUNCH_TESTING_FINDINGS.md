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

**Status:** awaiting test

### Issues found

---

## Step 3 — Technician inspection form at 375px

**Status:** awaiting test

### Issues found

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

---
# MRC Pricing & Business Rules — paste this into your AI

*Don't want to read the whole thing? Paste this entire file into ChatGPT or Claude and ask your question — it's set up to answer from the document below.*

---

You are a pricing and business-rules assistant for Mould & Restoration Co. (MRC), a Melbourne mould-remediation business. The person talking to you is an MRC team member — a field technician or sales — asking how the company prices jobs and the rules it follows. Your only source of truth is the reference document between the tags below.

**Rules:**
- Answer ONLY from the reference document. Never invent, estimate, assume, or fill in a number, rate, percentage, or rule. If it isn't in the document, say so plainly.
- Use the EXACT figures from the document (dollar rates, GST, discount percentages) — don't round or approximate.
- Keep answers short and plain — the reader is on a job site or in front of a customer, not an accountant. No jargon.
- If they want an overview, summarise the essentials: the labour rate card, how charging works (the 2-hour minimum and day rates), discounts, GST, equipment charges, and the built-in checks.
- If they ask something specific (e.g. "what's a subfloor day rate?"), give the figure directly plus the one-line rule behind it.
- If a question goes beyond the document, say what isn't covered and suggest they check with Michael.

To start: if they've already asked something, answer it; otherwise greet them briefly and ask what they'd like to know.

<reference_document>

# Mould & Restoration Co. — Business Rules — Pricing & Process

A plain-English guide to our pricing and process rules.

Last reviewed: 2 June 2026

---

## 1. How a job is priced

Every quote is built in four steps:

1. **Start with the labour cost** — based on how many hours or days the team is on site.
2. **Apply a discount to the labour** — bigger jobs get a bigger discount (up to the 13% ceiling). The discount only comes off the labour, never the equipment.
3. **Add the equipment hire** — equipment is billed separately at a fixed daily rate and is never discounted.
4. **Add 10% GST** — GST is calculated on the combined total (discounted labour + equipment) and added last. That's the price the customer pays.

Any job under 2 hours is charged at our 2-hour minimum.

### Worked Example

Scenario: 3 full days of standard (non-demolition) work, with 2 dehumidifiers, 4 air movers, and 1 RCD hired for those 3 days.

| Item | Amount |
|------|-------:|
| Labour: 3 days × $1,216.99 per day | $3,650.97 |
| 24 labour hours → 10.25% discount | −$374.22 |
| **Labour after discount** | **$3,276.75** |
| 2 dehumidifiers × $132 × 3 days | $792.00 |
| 4 air movers × $46 × 3 days | $552.00 |
| 1 RCD × $5 × 3 days | $15.00 |
| **Total equipment hire** | **$1,359.00** |
| **Subtotal (before GST)** | **$4,635.75** |
| GST (10%) | $463.58 |
| **Final total (including GST)** | **$5,099.33** |

> Notice the discount only comes off the labour — never off the equipment.

---

## 1b. Labour rate card

Labour is charged based on the type of work and how long the team is on site. There are three active work types:

| Work type | 2-hour minimum | Full day (8 hours) |
|-----------|---------------:|-------------------:|
| Normal (non-demolition) | $612.00 | $1,216.99 |
| Demolition | $711.90 | $1,798.90 |
| Subfloor | $900.00 | $2,334.69 |

Construction is a planned future labour stream (provisional rates $661.96 two-hour minimum / $1,507.95 day) — not yet built or offered, and can't be quoted today.

**How the charge is worked out:**

- **Under 2 hours** — the job is charged a flat 2-hour minimum. There is no cheaper partial rate.
- **Between 2 and 8 hours** — the price scales smoothly between the 2-hour minimum and the full-day rate based on actual hours on site.
- **Beyond 8 hours** — charged in full-day blocks, plus a part-day remainder for any hours left over.

### The charging shape

Illustrative shape — see the table above for actual rates.

The chart below describes cost against hours worked across three regimes:

- **Under 2 hours (flat line at 2-hr minimum):** From 0 to 2 hours worked, the cost is constant at the 2-hour minimum. There is no partial rate cheaper than this floor.
- **2 to 8 hours (linear ramp to the day rate):** From 2 hours to 8 hours, the cost rises in a straight line from the 2-hour minimum up to the full one-day rate.
- **Beyond 8 hours (sawtooth — each block ramps a full day):** Each additional 8-hour block starts with the 2-hour-minimum floor being added, then ramps upward across that block to reach the next day rate. At 16 hours the cost reaches the 2-day rate; at 24 hours it reaches the 3-day rate. The shape is a repeating sawtooth: step up at each day boundary, then ramp.

Legend:
- Under 2 hours: flat 2-hr minimum
- 2 to 8 hours: linear to day rate
- Beyond 8 hours: each block ramps up a day

---

## 2. The discount cap

The maximum discount is **13%**. This is a hard rule built into the app — a quote can never exceed it, even by accident.

The discount applies to **labour and services only**. Equipment hire is never discounted.

The discount grows with the size of the job, up to the 13% ceiling:

| Total labour hours | Discount |
|-------------------|----------:|
| 0–8 hours (≈1 day) | 0% |
| 9–16 hours (≈2 days) | 7.5% |
| 17–24 hours (≈3 days) | 10.25% |
| 25–32 hours (≈4 days) | 11.5% |
| 33+ hours (≈5 days or more) | 13% (maximum) |

The 13% cap is not just a rule inside the quoting screen. The app enforces it, and separately, the database itself is set up to reject any figure above 13% — so the cap cannot be exceeded even if something goes wrong in the app, or if a coding mistake slips through. Both layers have to fail at once for the cap to be breached, which in practice means it cannot happen.

When an invoice is filled in automatically from a completed job, the labour figure it pulls in already has its discount included. For that reason, the system deliberately does not apply the discount again at invoice time. This prevents a job from being double-discounted by accident — the discount comes off once, at the quoting stage, and that is the final figure used on the invoice.

---

## 3. GST

GST is always **10%**. It is added to the subtotal — that is, the discounted labour plus equipment — as the final step before the customer's total is shown. This is the amount the customer pays.

Every money figure is rounded to the nearest cent. GST is worked out and rounded on its own, then added to the subtotal — which is why, for example, a raw GST of $463.575 is shown as $463.58 on the customer's total. The rounding happens to the GST amount first, before the grand total is produced.

---

## 4. Equipment rates

Equipment is billed as: **quantity × daily rate × number of days**. Equipment is never discounted.

Equipment is billed by whole days. The number of days is the job's labour time rounded up to the next full 8-hour day, with a minimum of one day — so even a short job is charged at least one day of equipment hire, and any part-day counts as a full day.

| Equipment | Daily rate |
|-----------|----------:|
| Dehumidifier | $132 / day |
| Air Mover | $46 / day |
| RCD | $5 / day |
| Air Filtration Device (AFD) | $75 / unit / day *(provisional)* |

> **AFD — provisional rate, not yet billed**
>
> The $75 per unit per day AFD rate is a placeholder, not a confirmed figure. AFD usage is recorded on every job (how many units, how many days), but that amount is **not** currently added to the invoice — it shows up as $0 on the bill. The rate needs to be confirmed with Glen and Clayton before it can be wired into invoices.

---

## 5. Waste disposal

Waste disposal is recorded on the inspection form as a size — Small, Medium or Large — for reporting context only. It has never been a dollar amount, and it is not charged to customers today.

> **Still being confirmed**
>
> To confirm with Glen/Clayton: should waste disposal be charged to customers? No rate is currently set.

---

## 6. The lead pipeline

The full step-by-step journey of a lead — from first contact through to finished — is covered in the separate "How It Works" guide.

---

## 7. Booking rules

- A technician cannot be double-booked. The system will block any booking that overlaps a job a technician already has.
- When booking an inspection, the admin sets an estimated duration — anywhere from 30 minutes to 8 hours, in 15-minute steps — defaulting to 60 minutes.
- Bookable times run on the hour from 7:00 AM to 7:00 PM.
- There are two technicians in the system: Clayton and Glen.
- When an inspection is booked, the lead moves to "Awaiting Inspection," the customer is automatically sent a booking confirmation email, and the team gets a notification. If the customer has no email on file, the system records that it couldn't send — nothing is silently dropped.

---

## 8. Job completion

When a technician finishes a job, they fill in the **job completion form**. It covers:

- **Work summary** — the areas treated, the completion date, and whether it was a residential or commercial premises.
- **Before photos** — carried over automatically from the original inspection, plus any extras the technician took before starting.
- **After photos** — photos taken on site once the work is done, including demolition photos if relevant.
- **Treatment methods** — which methods were used (for example, HEPA vacuuming, ULV fogging, subfloor remediation).
- **Chemicals used** — which chemical treatments were applied.
- **Equipment actually used** — quantities and days for each piece of equipment, with a side-by-side comparison against what was quoted in the inspection.
- **Variations** — if the scope of work changed from the original quote, the technician records what changed and why.
- **Job notes** — including any damage or staining noticed on site.

The form **auto-saves as the technician works** — about every 30 seconds — and keeps an on-device backup that can restore in-progress work after a crash or reload (once there's been at least one save). It does **not** work offline, though: the technician needs a connection for the form to save, so on-site they should make sure they have signal.

Once submitted:

- If the technician ticked "request review," the job goes to an admin first (Pending Review) before the report is sent.
- Otherwise, it moves straight to Job Completed.
- The admin reviews and approves the job report, which is then emailed to the customer.
- The invoice is generated and sent, the customer pays, a Google review request goes out, and the lead is finished.

---

## 9. Built-in checks

Both the inspection form and the job-completion form have a number of built-in safeguards to protect the technician's work and the quality of what gets sent to customers. Here is what each one does and which form it applies to.

- **Auto-save — both forms.** Both forms save the technician's work to the system automatically, roughly every 30 seconds while they are working. There is no need to remember to hit a save button.

- **Device backup and crash recovery — both forms.** Separately from the auto-save, each form also keeps a backup copy on the device itself, refreshed about every 30 seconds. If the app closes unexpectedly, the browser reloads, or the device crashes, reopening the form within 24 hours will offer to restore the in-progress work so nothing typed is lost.

  > **Honest caveat:** the device backup only kicks in once the form's record has been created. On the inspection form, that happens after the first successful save. This means there is one edge case: a brand-new inspection that has never saved even once — if the device crashes before that first save, what was typed in that very first sitting could be lost. That is the only scenario where this protection does not apply. On the job-completion form this is not an issue because the record is created before the technician opens the form.
  >
  > Also important: this is an on-device backup that survives a reload or crash — it is not the same as working offline. The forms do not work offline; they need a connection to save to the system.

- **Blank or $0 price guard — inspection form only.** On the inspection form, when a job is quoted with two options, the form checks the price of both options — not just one. If it cannot work out a valid price for either option (for example, because the hours have not been entered), it will not save. This means a report cannot go to the customer with a blank or $0 price on either option, protecting the integrity of every quote.

  > **Currently a bit over-eager**
  >
  > This guard is intentional and correct in what it is protecting, but right now it can interrupt the auto-save and moving between sections, not just the final submit. That is being refined. No work is lost when this happens — the form simply asks for the missing information before it will continue. The job-completion form does not have this price guard.

- **No stale price carry-over — inspection form only.** If a quote is switched between options, the system clears the saved price for the old option. An out-of-date price from a previous option can never carry over onto the customer's report — the form always works from the current, freshly calculated figure.

- **Photo caption requirement — both forms.** A photo cannot be added without a caption. The form asks for the caption first and will not accept the photo until one is provided. On the inspection form this applies to the area and subfloor photos. On the job-completion form it applies to the "after" photos taken on site. The before-photos on the job form are carried over from the inspection, so they already have their captions.

- **Finish-time checks — both forms, more detailed on the job form.** Moving between sections is not blocked, but a technician cannot submit or finish until the key details are filled in.
  - **Inspection form:** the inspection date, at least one named area, at least one treatment method, and the work hours must all be entered before the form can be finished.
  - **Job-completion form:** a broader set of requirements — the safe-work statement must be marked done, premises type and completion date filled in, at least one area treated and at least one treatment method selected. The photo record must also be consistent: after photos must match up with the before photos (one set of after photos for every before photo). If demolition work was carried out, the required justification and the demolition photos must be present. If the scope changed from the original quote, the what-and-why must be recorded before the form can be submitted.

- **Photo count consistency — job-completion form only.** The job-completion form keeps the photo record consistent throughout. There is a limit on how many before-photos can be included, after photos must match the number of before photos, and when demolition work applies there is a set number of demolition photos required. Photos that have been deleted do not count toward any of these checks — only photos that are currently live and active are counted. These rules prevent mismatched or incomplete photo records from going into the job report.

- **Warning when leaving with unsaved work — inspection form only.** If a technician tries to navigate away from the inspection form while there are unsaved changes, the form warns them before letting them leave. The job-completion form handles this differently — it saves and lets the technician leave without prompting.

---

## Decisions needed + Known issues

These items are not yet fully settled. No one should treat them as confirmed business rules until they are signed off.

### AFD — confirm the rate so it can be billed

On the inspection, AFD is a simple on/off treatment-method tag — it gets saved, but no quantity is recorded at that stage. On the job-completion form, the technician records how many AFD units were used and for how many days.

However, the $75 per unit per day is a placeholder, not a confirmed rate, and AFD usage is not added to the invoice — it bills at $0 today regardless of how much was used.

**Decision needed:** Confirm the per-day rate so that AFD can be quoted and billed from the units and days the technician records on the job-completion form.

### Waste disposal — size recorded, nothing billed

Waste disposal is recorded on the inspection form as a size — Small, Medium or Large — for reporting context only. It has never been a dollar amount, is not added to any total, and is not billed to customers today.

**Decision needed:** Should waste disposal be charged to customers? No rate is currently set, and there is no billing path for it. If the answer is yes, both the rate and the billing logic would need to be built.

</reference_document>
---

# Xero Integration — Handoff Document

**Created:** 2026-06-23
**Author:** Claude Code (factual handoff — NOT an implementation plan)
**Audience:** the separate planning chat that will design the Xero integration (target: ~6–8 weeks out)
**Status of the feature this documents:** Phase 2D (Admin Invoice & Payment Tracking) + Phase 2F (Google Review & Closure) are **CODE COMPLETE and merged to `production`** (merge commit `3982402`). The current manual flow is **Xero-ready by design** — figures and statuses are tracked in MRC; the actual invoice lives in Xero and is created/sent there by hand today.

> **Scope of this document:** record, accurately, what exists in the codebase right now so the planning chat starts from facts. It does **not** plan the integration, choose an approach, or design Edge Functions. Where it names integration points or candidate EF names, those are descriptive markers for the planning chat to confirm — not a design.

---

## 1. What Was Built This Session

### 1.1 Files created

| File | One-line description |
|---|---|
| `src/pages/AdminInvoiceHelper.tsx` | Full invoice editor page at route `/admin/invoice/:leadId` (admin-only). Hour-based labour + per-item equipment + custom lines → live totals; Save Draft / Mark as Sent / Mark as Paid. |
| `src/lib/calculations/penaltyLadder.ts` | Pure, **display-only** T&Cs penalty-ladder logic: `getDaysOverdue()`, `getPenaltyTier()`, `PenaltyTier` type, fee/interest constants. No I/O. |
| `src/lib/calculations/penaltyLadder.test.ts` | 35 unit tests covering every ladder boundary + fee math + status gating. |
| `src/components/invoices/PenaltyLadderWidget.tsx` | Reusable timeline widget rendering the penalty ladder (milestone dates derived from `due_date`). Used by the page and the inline `InvoicePaymentCard`. |
| `src/components/dashboard/OutstandingInvoicesWidget.tsx` | Admin dashboard widget listing sent/viewed/overdue invoices (soonest-due first) with penalty-tier badges. |
| `supabase/migrations/20260623165447_invoice_xero_ready.sql` | Additive migration adding 3 nullable Xero stub columns (see §3). No table recreate, no RLS change. |
| `docs/PHASE_2D_INVOICE_TODO.md` | Session plan / task tracker for Phase 2D. |

### 1.2 Files modified

| File | One-line description of the change |
|---|---|
| `src/lib/api/invoices.ts` | Added `saveCalculatedInvoice()` (engine-driven create/update), `getOutstandingInvoices()`, `logInvoiceActivity()`, equipment/labour breakdown fields on `InvoiceLineItem`, `EquipmentKey` type. Existing CRUD/mark functions retained. |
| `src/hooks/usePaymentTracking.ts` | Now also exposes `penaltyTier` for the current invoice; added `useOverdueInvoices()` hook (enriches each outstanding invoice with `daysOverdue` + `penaltyTier`). |
| `src/components/leads/InvoicePaymentCard.tsx` | Swapped its private hardcoded timeline for the shared `PenaltyLadderWidget`; added a penalty-tier badge; "Open full invoice editor" → page. |
| `src/components/leads/InvoiceSummaryCard.tsx` | "Generate Invoice" button now **navigates** to `/admin/invoice/:leadId` (create/edit owned by the page); kept the auto-populated read-only preview + Copy. |
| `src/pages/AdminDashboard.tsx` | Mounts `OutstandingInvoicesWidget` in the right column. |
| `src/App.tsx` | Registered the `/admin/invoice/:leadId` route (admin-guarded). |
| `src/pages/LeadDetail.tsx` | **Phase 2F:** `GoogleReviewSection` (status `paid` → send review email + advance to `google_review` + `google_review_sent` activity) and `FinishLeadSection` (status `google_review` → confirm modal → advance to `finished` + `lead_closed` activity). Invoice card wiring unchanged otherwise. |
| `src/lib/api/notifications.ts` | **Phase 2F:** extracted `GOOGLE_REVIEW_URL` constant; `buildGoogleReviewEmailHtml()` / `sendGoogleReviewEmail()` for the review request. |
| `src/integrations/supabase/types.ts` | Regenerated to include the 3 Xero stub columns (commit `2036bd6`). |

### 1.3 DB columns added (exact names from `types.ts`)

Migration `supabase/migrations/20260623165447_invoice_xero_ready.sql` — all nullable, `VARCHAR(255)` in SQL / `string | null` in `types.ts`:

| Table | Column | Type (types.ts) |
|---|---|---|
| `invoices` | `xero_invoice_id` | `string \| null` |
| `invoices` | `xero_contact_id` | `string \| null` |
| `leads` | `xero_contact_id` | `string \| null` |

No other schema changes. The `invoices` table itself predates this session (rich schema already in prod); only the 3 stub columns were added.

### 1.4 What the penalty ladder does and how it works

`src/lib/calculations/penaltyLadder.ts` is **DISPLAY ONLY**. It computes where a sent invoice sits on MRC's contractual T&Cs penalty ladder so an admin can see it. **No fee or interest it reports is ever written to an invoice or charged by MRC** — that is Xero's job after integration.

- `getDaysOverdue(invoice, now?)` — days past `due_date`. Returns `0` when not overdue, when there is no due date, or when the invoice is `draft` / `paid` / `void`. `now` is injectable for tests.
- `getPenaltyTier(daysOverdue)` — maps a days-overdue count to a `PenaltyTier` (tier name, warranty flags, cumulative fee, interest rate, label, description). Pure.
- The ladder is **keyed off `daysOverdue` (days past `due_date`)**, not days-since-sent, so it stays correct across the 7/14/30/60-day payment-terms selector.
- `PenaltyLadderWidget` renders the ladder with milestone **dates derived from `due_date`** and highlights the current tier. Red when warranty void, amber when suspended.
- Full tier table in §5.

---

## 2. Current Manual Flow

### 2.1 Step by step — what the admin does today

1. Lead reaches status `job_report_pdf_sent` (job report approved + sent to customer).
2. On **Lead Detail**, `InvoiceSection` renders `InvoiceSummaryCard` — a read-only, auto-populated preview (labour, equipment, GST, total) with a **Copy** button and a **Generate Invoice** button.
3. **Generate Invoice** navigates to `/admin/invoice/:leadId` (`AdminInvoiceHelper`). The page loads any existing invoice, else auto-populates from lead + most-recent job completion + most-recent inspection.
4. Admin reviews/edits on the page:
   - **Labour** — non-demolition / demolition / subfloor hours. Drives `calculateCostEstimate()` (volume discount derived from hours, **13% cap**).
   - **Equipment** — per-item qty × days for Dehumidifier ($132/day), Air Mover ($46/day), RCD Box ($5/day), seeded from job-completion actuals. **Never volume-discounted.**
   - **Custom line items** — variations/misc, **never discounted**.
   - **Payment terms** — 7 / 14 / 30 / 60 days (default 14); due date = invoice date + terms.
   - **Notes**.
   - **Penalty ladder widget** — informational preview of the T&Cs timeline.
5. **Save Draft** → `saveCalculatedInvoice()` persists the row (status stays `draft`); logs an `invoice_updated` activity.
6. Admin **creates and sends the actual invoice in Xero by hand** (today there is no automated Xero call).
7. **Mark Invoice as Sent to Client** → confirm modal literally asks *"Have you created this invoice in Xero…?"* → `markInvoiceSent()`:
   - `invoices.status = 'sent'`, `sent_at` stamped.
   - `leads.status = 'invoicing_sent'`.
   - Slack `custom` notification fires (`notifyInvoiceSent`).
   - `invoice_sent` activity logged.
8. Customer pays (in the real world / via Xero). Admin clicks **Mark as Paid** (on the page or the inline `InvoicePaymentCard`) → modal for method (`cash`/`visa`/`mastercard`/`bank_transfer`/`cheque`) + date + optional reference → `markInvoicePaid()`:
   - `invoices.status = 'paid'`, `payment_method` / `payment_date` / `payment_reference` / `paid_at` stamped.
   - `leads.status = 'paid'`.
   - Slack `custom` notification fires (`notifyPaymentReceived`).
9. **Phase 2F:** at status `paid`, Lead Detail shows **Send Google Review Request** → `sendGoogleReviewEmail()` + `leads.status = 'google_review'` + `google_review_sent` activity.
10. At status `google_review`, **Close Lead** → confirm modal → `leads.status = 'finished'` + `lead_closed` activity.

### 2.2 What the MRC system does vs what the admin does manually in Xero

| Action | MRC system (today) | Admin manually in Xero (today) |
|---|---|---|
| Build invoice figures (line items, GST 10%, 13% labour discount, equipment never discounted) | ✅ MRC | — |
| Persist the invoice row + statuses (`draft`/`sent`/`viewed`/`paid`/`overdue`/`void`) | ✅ MRC | — |
| **Create the actual customer invoice** | ❌ | ✅ Xero (by hand) |
| **Send the invoice to the customer** | ❌ | ✅ Xero (by hand) |
| Mark "sent" / "paid" as a mirror of the Xero action | ✅ MRC (manual button) | ✅ admin did it in Xero first |
| Advance the lead pipeline on send/pay | ✅ MRC | — |
| Slack notify team on send/pay | ✅ MRC | — |
| Activity-timeline logging | ✅ MRC | — |
| Penalty-ladder display (fees/interest/warranty status) | ✅ MRC (**display only**) | — |
| **Calculate/charge penalty fees + interest** | ❌ (display only) | ✅ Xero (intended) |
| **Send payment reminders / chase overdue** | ❌ | ✅ Xero (intended) |
| Record the real payment | ❌ (mirror only) | ✅ Xero |

---

## 3. Xero Stub Columns (already in DB, ready)

Added this session, **nullable, currently always `NULL`, never populated and never referenced in UI or queries** (verified — no code reads or writes them):

| Table | Column | SQL type | `types.ts` type |
|---|---|---|---|
| `invoices` | `xero_invoice_id` | `VARCHAR(255)` | `string \| null` |
| `invoices` | `xero_contact_id` | `VARCHAR(255)` | `string \| null` |
| `leads` | `xero_contact_id` | `VARCHAR(255)` | `string \| null` |

Migration file: `supabase/migrations/20260623165447_invoice_xero_ready.sql` (additive, `IF NOT EXISTS`, rollback documented in header, `COMMENT ON COLUMN` on all three). The `invoices` table already carries audit triggers — not touched.

> **Note for the planning chat:** the building session had no DB credentials, so confirm the migration is actually **applied to the production database** and the columns exist + are `NULL` before designing anything that writes to them. `types.ts` was regenerated to include them (commit `2036bd6`), which is consistent with the columns existing, but verify against the live DB directly.

---

## 4. What Xero Integration Must Replace

Factual integration points in the current code. **The planning chat owns the actual design** — the EF names below are descriptive placeholders only.

### 4.1 Buttons / functions that get swapped from "manual mirror" to "real Xero action"

| Today (manual mirror) | Location | What integration would change |
|---|---|---|
| **Mark Invoice as Sent to Client** (confirm modal asks "Have you created this in Xero?") → `markInvoiceSent()` | `AdminInvoiceHelper.tsx` (sticky bar) + `InvoicePaymentCard.tsx` | Would instead create + send the invoice **in Xero**, then store `invoices.xero_invoice_id`. The "did you do it by hand?" confirmation goes away. |
| **Mark as Paid** → `markInvoicePaid()` | `AdminInvoiceHelper.tsx` + `InvoicePaymentCard.tsx` | Payment status would be **sourced from Xero** (webhook/poll) rather than a manual button. |
| **Save Draft** → `saveCalculatedInvoice()` | `AdminInvoiceHelper.tsx` | Could optionally push a Xero draft; line-item construction already exists. |
| Overdue status | `markInvoiceOverdue()` + Phase-2E `check-overdue-invoices` cron (derives from `due_date`) | Overdue/reminders/fees would be owned by Xero; the MRC penalty ladder stays display-only or is reconciled against Xero. |
| Customer contact identity | `autoPopulateFromLead()` (lead → invoice fields) | Would map/create a Xero contact and store `leads.xero_contact_id` / `invoices.xero_contact_id`. |

### 4.2 Files that would need to change

- `src/lib/api/invoices.ts` — `markInvoiceSent`, `markInvoicePaid`, `saveCalculatedInvoice`, `createInvoice`/`updateInvoice` (the create/send/pay seams).
- `src/pages/AdminInvoiceHelper.tsx` — the Mark-as-Sent / Mark-as-Paid handlers and the "Have you created this in Xero?" confirm copy.
- `src/components/leads/InvoicePaymentCard.tsx` — inline Mark Paid / Void / status display.
- `src/hooks/usePaymentTracking.ts` / `useOverdueInvoices()` — if payment/overdue state becomes Xero-sourced.
- `src/integrations/supabase/types.ts` — regen if any new columns/tables are added.

### 4.3 Edge Functions that would need to be built (names only — planning chat to confirm)

MRC has no Xero Edge Functions today. Candidate capabilities (names are placeholders, **not a design**):

- `xero-oauth-callback` — OAuth handshake / token storage.
- `xero-create-invoice` — push an MRC invoice into Xero, return `xero_invoice_id`.
- `xero-sync-payment` — receive/poll payment status from Xero.
- `xero-webhook` — receive Xero events (paid, voided, etc.).
- `xero-upsert-contact` — create/match a Xero contact, return `xero_contact_id`.

### 4.4 What stays in MRC forever vs what Xero owns

| Stays in MRC | Owned by Xero (post-integration) |
|---|---|
| Lead → job → invoice **pipeline + statuses** (`leads.status`, `invoices.status`) | The accounting invoice record of truth |
| **Pricing engine**: labour hours, 13% volume-discount cap, equipment rate card, GST 10%, custom lines (`pricing.ts`, `invoices.ts` `calculate*`) | Invoice delivery to customer |
| Line-item construction + auto-populate from inspection/job-completion | Penalty **fee + interest calculation** and charging |
| Activity timeline + Slack notifications | Payment reminders / dunning / overdue chasing |
| Penalty-ladder **display** (informational T&Cs preview) | Recording the real payment |
| Google review + lead closure (Phase 2F) | — |

---

## 5. Business Rules Xero Must Enforce

Transcribed verbatim from `src/lib/calculations/penaltyLadder.ts` (the source of truth). All fees/interest are **currently display-only in MRC**; Xero must be the one to actually calculate and charge them.

### 5.1 Payment terms
- Selectable: **7 / 14 / 30 / 60 days**. **Default 14 days.**
- `due_date = invoice_date + terms`.

### 5.2 Penalty ladder (keyed off `daysOverdue` = days past `due_date`)

| `daysOverdue` | Tier | Warranty | Cumulative admin fee | Interest (p.a.) |
|---|---|---|---|---|
| ≤ 0 | `current` | OK | $0 | 0% |
| 1–7 | `overdue` | **Suspended** | $65 | 10% |
| 8–14 | `second_reminder` | Suspended | $130 | 10% |
| 15 | `final_notice` | Suspended | $195 | 10% |
| 16–28 | `warranty_void` | **VOID** | $195 | 35% (10% + 25% combined) |
| ≥ 29 | `ongoing` | VOID | $195 **+ $65 per additional 14-day period** | 35% |

Constants (`penaltyLadder.ts`): `PENALTY_FEE_INCREMENT = 65`, `INTEREST_RATE_OVERDUE = 0.10`, `INTEREST_RATE_VOID = 0.35`. Cumulative fee math: $65 at day 1, $130 at day 8, $195 at day 15, then +$65 every 14-day period (e.g. $260 at day 29).

> The T&Cs were originally written in **days-from-sent assuming 14-day terms**; MRC keys the logic off `daysOverdue` so other terms don't break it. For default 14-day terms, `daysOverdue + 14 == daysFromSent` (so day-15-from-sent == 1 day overdue).

### 5.3 Warranty suspension / void rules
- **Suspended** while `daysOverdue` is 1–15 (tiers `overdue`, `second_reminder`, `final_notice`).
- **VOID** from `daysOverdue` ≥ 16 (tiers `warranty_void`, `ongoing`).

### 5.4 Pricing rules that constrain any Xero invoice (must not be violated)
- **13% maximum labour discount** (`MAX_DISCOUNT = 0.13`) — sacred, enforced in the engine + a DB CHECK on `invoices.discount_percentage`.
- **Equipment is never discounted.** Rate card: Dehumidifier $132/day, Air Mover $46/day, RCD Box $5/day.
- **Custom line items are never discounted.**
- **GST always 10%** on the (discounted services + equipment) subtotal.
- Payment methods recorded: `cash`, `visa`, `mastercard`, `bank_transfer`, `cheque`.

---

## 6. Pre-Integration Human Gates

Everything that must happen (mostly human) before Claude Code can build Xero Edge Functions:

1. **Verify the Xero stub migration is applied to the production DB** — confirm `invoices.xero_invoice_id`, `invoices.xero_contact_id`, `leads.xero_contact_id` exist and are `NULL`. (Built without DB creds; not verified live this session.)
2. **Xero account + API app provisioned** — OAuth 2.0 app, client id/secret, tenant/organisation id, scopes, and where tokens are stored — all human/admin steps outside the codebase.
3. **Resolve the open invoice-data questions** from `docs/PHASE_2D_INVOICE_TODO.md` that affect what Xero reads:
   - **Q2 — discount semantics:** `autoPopulateFromLead()` sets `discount_percentage = 0` because `inspections.labour_cost_ex_gst` is already net of the inspection volume discount. Confirm the page's discount field is an *additional manual* discount, not a second volume discount.
   - **Q3 — `applyManualInvoiceTotal()`:** decide whether the GST-inclusive manual-total override path is exposed/used (it changes how totals derive).
   - **Q4 — overdue definition drift:** the dashboard KPI counts persisted `status='overdue'` (Phase-2E cron) while `useOverdueInvoices()` derives past-due from `due_date`. Decide the canonical definition Xero should reconcile against.
4. **Lock the T&Cs penalty values** (§5) as final, since Xero will be the system that actually charges them.
5. **Decide the source of truth for payment status** (manual mirror vs Xero webhook/poll) — drives whether `markInvoicePaid` stays a button.
6. **Confirm the dev/staging environment** (see L4 in `docs/TODO.md`) so Xero wiring isn't first tested against the production DB.

---

## 7. Key Files for the Integration Sprint

Exact paths that will need touching or reading:

**Invoice data + logic**
- `src/lib/api/invoices.ts` — CRUD, `saveCalculatedInvoice`, `markInvoiceSent`, `markInvoicePaid`, `markInvoiceOverdue`, `voidInvoice`, `autoPopulateFromLead`, `calculateInvoiceTotals`, `logInvoiceActivity`.
- `src/lib/calculations/pricing.ts` — engine (`calculateCostEstimate`, `EQUIPMENT_RATES`, `GST_RATE`, `MAX_DISCOUNT`).
- `src/lib/calculations/penaltyLadder.ts` (+ `penaltyLadder.test.ts`) — T&Cs ladder (display only).
- `src/hooks/usePaymentTracking.ts` — `usePaymentTracking`, `useOverdueInvoices`.

**UI surfaces**
- `src/pages/AdminInvoiceHelper.tsx` — invoice editor + Mark Sent/Paid handlers.
- `src/components/leads/InvoicePaymentCard.tsx` — inline tracker + quick actions.
- `src/components/leads/InvoiceSummaryCard.tsx` — read-only preview + entry button.
- `src/components/invoices/PenaltyLadderWidget.tsx` — penalty display.
- `src/components/dashboard/OutstandingInvoicesWidget.tsx` — dashboard list.
- `src/pages/LeadDetail.tsx` — `InvoiceSection`, plus Phase 2F review/closure sections.
- `src/App.tsx` — `/admin/invoice/:leadId` route.

**Schema / types**
- `supabase/migrations/20260623165447_invoice_xero_ready.sql` — the stub-column migration.
- `src/integrations/supabase/types.ts` — generated types (regen on any schema change).

**Notifications**
- `src/lib/api/notifications.ts` — Slack `notifyInvoiceSent` / `notifyPaymentReceived` / `notifyInvoiceOverdue` (Phase 2D uses the existing `custom` Slack event; no EF change was made).

**Reference docs**
- `docs/PHASE_2D_INVOICE_TODO.md` — full Phase 2D plan, decisions D1–D6, open questions Q1–Q4.
- `docs/JOB_COMPLETION_PRD.md` — Invoice Helper / Payment Tracking spec context.
- `docs/TODO.md` — L4 (environment separation) gate.

---

*End of handoff. This document records the current state only. The integration approach, Edge Function design, OAuth flow, and sync model are for the dedicated Xero planning chat to produce.*

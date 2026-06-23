# Phase 2D — Admin Invoice & Payment Tracking (Xero-Ready Manual Flow)

**Created:** 2026-06-23
**Owner:** Michael
**Status:** PLANNING COMPLETE — ready to build
**Source spec:** in-session `/plan` prompt (7 tasks) + `docs/JOB_COMPLETION_PRD.md` (Invoice Helper / Payment Tracking sections)

> This is the single source of truth for THIS session. Update the **Task Tracker** checkboxes
> and the **Session Log** at the bottom as work progresses or the plan changes. The Session Log
> is the running record of every deviation from this plan.

---

## TL;DR — The spec is stale; ~80% of Phase 2D already shipped

The `/plan` prompt was written as greenfield ("recreate the invoices table", "create
usePaymentTracking", "create the LeadDetail card", "add the dashboard widget"). **Verification
against the live codebase + generated `types.ts` shows most of that already exists in production.**
Building the spec verbatim would duplicate or destroy working code.

The real remaining work is a **reconciliation + gap-fill**, scoped below.

### What ALREADY EXISTS (do NOT rebuild)

| Spec asks to create | Reality | Action |
|---|---|---|
| `invoices` table (recreate) | **Exists in prod** — richer schema: `line_items` JSONB, `invoice_number`, `subtotal`/`discount_amount`/`subtotal_after_discount`/`gst_amount`/`total_amount`/`equipment_subtotal`, status `draft\|sent\|viewed\|paid\|overdue\|void`, `payment_method` `cash\|visa\|mastercard\|bank_transfer\|cheque`, `payment_date`/`payment_reference`/`paid_at`/`sent_at`/`invoice_date`/`due_date`/`notes`/`created_by` | **KEEP. Additive migration only** (Xero columns). NEVER recreate. |
| `usePaymentTracking` hook | **Exists** (`src/hooks/usePaymentTracking.ts`) — query + markSent/markPaid + overdue calc | Keep; extend if needed |
| `src/lib/api/invoices.ts` CRUD | **Exists** — `createInvoice`, `updateInvoice`, `applyManualInvoiceTotal`, `markInvoiceSent` (→ lead `invoicing_sent` + Slack), `markInvoicePaid` (→ lead `paid` + Slack), `markInvoiceOverdue`, `voidInvoice`, `autoPopulateFromLead`, `calculateInvoiceTotals` (13% cap + equipment-never-discounted enforced) | Keep; add penalty helpers |
| LeadDetail invoice card | **Exists** — `InvoiceSummaryCard` → `InvoicePaymentCard`, gated `InvoiceSection` renderer (`LeadDetail.tsx:2208`, `2398`) | Keep; add quick-actions + penalty badge |
| AdminDashboard overdue KPI | **Exists** — `useAdminDashboardStats` computes `overdueInvoicesCount`/`overdueInvoicesTotal`; KPI card at `AdminDashboard.tsx:202` | Keep; add the past-due **list** widget |
| `statusFlow.ts` statuses | **Exists** — `job_report_pdf_sent → invoicing_sent → paid → google_review → finished` all present | No change |
| Slack `invoice_sent`/`payment_received` | **Exists** via `custom` event (`notifyInvoiceSent`/`notifyPaymentReceived` in `notifications.ts`) | **No change** (decision locked) |

### What is GENUINELY MISSING (the actual build)

1. **Penalty ladder / T&Cs logic** — `getDaysOverdue()`, `getPenaltyTier()`, `PenaltyTier` type. Not built.
2. **Penalty ladder widget** — visual T&Cs timeline. Not built.
3. **Xero stub columns** — `invoices.xero_invoice_id`, `invoices.xero_contact_id`, `leads.xero_contact_id`. Not in schema.
4. **`AdminInvoiceHelper` page + `/admin/invoice/:leadId` route** — not present (flow currently inline in LeadDetail).
5. **`useOverdueInvoices()`** standalone hook — today overdue is computed inline in dashboard stats.

---

## Decisions Locked (this session)

| # | Decision | Choice |
|---|---|---|
| D1 | Invoice editing surface | **Both** — dedicated `/admin/invoice/:leadId` page (full editor + penalty widget) **AND** keep existing inline LeadDetail quick-actions cards |
| D2 | Slack events | **Keep existing `custom`-event approach** — no Edge Function change, no redeploy |
| D3 | invoices schema | **Additive only** — add 2 Xero stub columns; never recreate the table (spec's "recreate" is wrong against live prod) |
| D4 | Penalty ladder keying | Key all tier logic off **`daysOverdue` (past `due_date`)**, NOT days-since-sent — so it generalises across the 7/14/30/60 payment-terms selector. Widget derives absolute milestone dates from `due_date`. |
| D5 | Penalty fees/interest | **DISPLAY ONLY.** Never written to the invoice. MRC never calculates/adds fees — that is Xero's job post-integration. Purely informational admin UI. |
| D6 | Xero stub columns | Exist in migration, remain **NULL**, never populated, never referenced in UI |

---

## Penalty Ladder Spec (T&Cs) — keyed off `daysOverdue` (days past `due_date`)

`PenaltyTier` type:

```typescript
type PenaltyTier = {
  tier: 'current' | 'overdue' | 'second_reminder' | 'final_notice' | 'warranty_void' | 'ongoing'
  daysOverdue: number
  warrantySuspended: boolean
  warrantyVoid: boolean
  feeApplied: number        // cumulative $65 increments — DISPLAY ONLY
  interestRate: number      // 0, 0.10, or 0.35 (10% + 25% combined after day 30-from-sent)
  label: string             // short badge label
  description: string       // full admin warning text
}
```

Ladder (the "Day N" column = days-from-sent assuming the default 14-day terms; logic is keyed off `daysOverdue` so it stays correct for other terms):

| daysOverdue | Day-from-sent (14d terms) | tier | warranty | fee (cumulative) | interest | notes |
|---|---|---|---|---|---|---|
| ≤ 0 | 0–14 | `current` | OK | $0 | 0% | not overdue |
| 1–7 | 15–21 | `overdue` | **suspended** | $65 | 10% p.a. | warranty suspended, interest starts |
| 8–14 | 22–28 | `second_reminder` | suspended | $130 | 10% p.a. | +$65 |
| 15 | 29 | `final_notice` | suspended | $195 | 10% p.a. | +$65 |
| ≥ 16 | 30+ | `warranty_void` | **VOID** | $195+ | 35% p.a. | +25% interest (35% combined) |
| 16, 30, 44… (every 14d after final_notice) | 43, 57, 71… | `ongoing` | VOID | +$65/period | 35% p.a. | recurring $65 per 14-day period |

> **NOTE (D4):** the spec's milestone table is written in days-from-sent. We key the function off
> `daysOverdue` (past `due_date`) so the 7/14/30/60-day terms selector doesn't break the ladder.
> The widget shows absolute milestone dates computed from `due_date`.

---

## Task Tracker

Status key: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

### T1 — DB migration: Xero stub columns (additive) · STATUS: file done, apply pending [HUMAN]
- [x] New migration `supabase/migrations/20260623165447_invoice_xero_ready.sql`
- [x] `ALTER TABLE invoices ADD COLUMN xero_invoice_id VARCHAR(255)` (nullable, IF NOT EXISTS)
- [x] `ALTER TABLE invoices ADD COLUMN xero_contact_id VARCHAR(255)` (nullable, IF NOT EXISTS)
- [x] `ALTER TABLE leads ADD COLUMN xero_contact_id VARCHAR(255)` (nullable, IF NOT EXISTS)
- [x] Verified audit triggers already on `invoices` (`20260414000004` lines 71-75) — NOT touched
- [x] NO table recreate. NO RLS rewrite (existing `admin_all_invoices`/`tech_read_invoices` stand). Additive only.
- [x] Documented rollback (DROP COLUMN x3) in migration header
- [x] COMMENT ON COLUMN on all three (NULL-until-Xero intent)
- [ ] **[HUMAN] Apply migration** — session has no DB creds (CLI + MCP both return 401 Unauthorized).
      Michael: `npx supabase migration up --linked` (with `SUPABASE_DB_PASSWORD`) OR apply in Studio.
- [ ] **[HUMAN] Regenerate types** after apply: `npx supabase gen types typescript --project-id ecyivrxjpsmjmexqatym > src/integrations/supabase/types.ts`
- [ ] **[HUMAN] Verify** columns exist + remain NULL (D6)
- [x] **Non-blocking for T2–T7:** per D6 no UI/TS code references the Xero columns, so the missing
      regen does NOT block downstream tasks or the build. `types.ts` left untouched (regen will own it).

### T2 — Penalty ladder pure logic + tests · STATUS: DONE ✅
- [x] New file `src/lib/calculations/penaltyLadder.ts` (pure, no I/O, `now` injectable)
- [x] `PenaltyTier` type + tier names + exported constants (`PENALTY_FEE_INCREMENT`, interest rates)
- [x] `getDaysOverdue(invoice, now?)` — days past `due_date`; 0 for no-due-date / draft / paid / void
- [x] `getPenaltyTier(daysOverdue)` — full ladder, keyed off daysOverdue (D4)
- [x] Unit tests `penaltyLadder.test.ts` — 35 tests, all boundaries (0/1/7/8/14/15/16/28/29/43) + fee math + status gating + 20-day integration case. **35/35 pass.** No `any`.
- [~] pricing-guardian review — **deferred to T8** (batched single pass over all money-touching code: penalty fees + invoice discount UI). Logic is DISPLAY-ONLY; no fee/interest value is written anywhere.

### T3 — `useOverdueInvoices()` hook · STATUS: DONE ✅
- [x] `getOutstandingInvoices()` added to `src/lib/api/invoices.ts` — `status IN ('sent','viewed','overdue')`, ordered by due_date
- [x] `useOverdueInvoices()` in `usePaymentTracking.ts` — returns `outstanding`/`overdue` (+counts/totals), each row enriched with `daysOverdue` + `penaltyTier`
- [x] `usePaymentTracking` kept intact; now also exposes `penaltyTier` for the current invoice (inline card use)
- [x] Reconciliation note: existing KPI (`useAdminDashboardStats`) defines overdue as persisted `status='overdue'` only (relies on Phase-2E cron). New hook derives past-due from `due_date` so it catches not-yet-flagged rows. **KPI left unchanged** (don't shift a shipped number) — see Open Q4 below for follow-up.
- [x] Typecheck clean.

### T4 — AdminInvoiceHelper page + route · STATUS: DONE ✅
- [x] New `src/pages/AdminInvoiceHelper.tsx`, route `/admin/invoice/:leadId` in `App.tsx` (admin-only, mirrors `inspection-ai-review` guard: ProtectedRoute → RoleProtectedRoute["admin"] → Suspense → PageErrorBoundary)
- [x] Section A — read-only header (customer, job number, invoice date, due-date preview DD/MM/YYYY)
- [x] Section B — editable line items (description/qty/unit_price/equipment switch/remove + add-line); discount field **13% cap enforced in UI** (red error + `aria-invalid`, save buttons disabled when invalid, `persist()` early-returns); totals via `calculateInvoiceTotals` (equipment never discounted, GST 10%, bold total)
- [x] Section C — payment terms Select 7/14/30/60 (default 14, derived from existing due−invoice date), live due-date preview
- [x] Section D — notes
- [x] Section E — sticky actions: Save Draft · Mark as Sent (confirm modal "Have you sent this in Xero?") → `markInvoiceSent` (→ `invoicing_sent` + Slack via existing api) · post-sent: Mark as Paid (shadcn Select method + DD/MM/YYYY date + ref modal) → `markInvoicePaid` (→ `paid`)
- [x] Section F — penalty ladder widget (T5), visible when `sent`/`viewed`/`overdue`; paid summary block when paid
- [x] Create vs edit: loads existing invoice (edit) or `autoPopulateFromLead` (create); `persist()` does create-or-update
- [x] Mobile-safe: stacked line-item cards (no table), `max-w-3xl`, sticky action bar. shadcn Select/Input/Switch/Textarea/Dialog (no raw form elements). Typecheck + build clean.

### T5 — Penalty ladder widget component · STATUS: DONE ✅
- [x] New `src/components/invoices/PenaltyLadderWidget.tsx` (reusable: used by page + inline `InvoicePaymentCard`)
- [x] Timeline with milestone **dates derived from `due_date`** (D4), current milestone highlighted
- [x] shadcn `Alert`: **red** if `warrantyVoid`, **amber** if `warrantySuspended`; tier `Badge`
- [x] Driven entirely by `getDaysOverdue()` + `getPenaltyTier()` (T2). DISPLAY-ONLY footer disclaimer. No `any`.

### T6 — LeadDetail inline quick-actions · STATUS: DONE ✅
- [x] `InvoiceSummaryCard`: "Generate Invoice" now **navigates** to `/admin/invoice/:leadId` — removed inline `createInvoice`/`markInvoiceSent` (page owns create, Q1). Kept the auto-populated preview + Copy. Dead code (`handleStartTracking`/`defaultDueDate`/`starting`) removed.
- [x] `InvoicePaymentCard`: replaced its **private hardcoded `OverdueTimeline`/`TERMS_MILESTONES`** with the shared `PenaltyLadderWidget` (single source — no more diverging ladder). Added penalty-tier badge in header (when suspended/void) + "Open full invoice editor" → page. Kept existing Mark Paid / Edit / Void quick-actions.
- [x] `paid` state already shows paid badge/date/method (existing card) — verified.
- [x] Only the invoice card components touched; no other LeadDetail sections modified.

### T7 — AdminDashboard outstanding-invoices list widget · STATUS: DONE ✅
- [x] New `src/components/dashboard/OutstandingInvoicesWidget.tsx` using `useOverdueInvoices()` — count · $ total header, up to 6 rows (soonest-due first) with due date, days-overdue, and penalty-tier badge; each row → `/admin/invoice/:leadId` (keyboard-accessible). Matches dashboard card aesthetic.
- [x] Inserted at top of the right column. Existing "Overdue Invoices" KPI card left unchanged (see Q4).

### T8 — Verification gate · STATUS: code gates PASS; live/visual checks pending [HUMAN]
- [x] `npm run typecheck` — zero errors. `npm run build` — clean (built in ~7s).
- [x] No `any` introduced anywhere in T2–T7.
- [x] **pricing-guardian: PASS / APPROVED** — 13% cap enforced by 4 layers (input `max`, `discountInvalid` flag, `persist()` guard, `calculateInvoiceTotals` clamp); equipment never discounted by default; penalty fees/interest are display-only, never persisted (penaltyLadder has no Supabase dep; widget only renders on locked non-draft invoices).
- [x] Penalty widget tier correctness covered by `penaltyLadder.test.ts` incl. the 20-day-overdue → `warranty_void` integration case.
- [x] No existing tests broken — **full suite 280/280 pass** (18 files).
- [x] Slack `invoice_sent`/`payment_received` path unchanged (markInvoiceSent/markInvoicePaid still call existing notify helpers) — D2.
- [ ] **[HUMAN] Live DB check:** after T1 migration applied, exercise Mark as Sent → confirm `invoices.status='sent'`, `sent_at`, `due_date`, lead→`invoicing_sent`; Mark as Paid → `paid`/`payment_*`, lead→`paid`. (Needs running app + DB creds — not available this session.)
- [ ] **[HUMAN] Visual check** at 375px + 1440px (built mobile-safe: stacked line-item cards, no tables, `max-w-3xl`, sticky bar — but confirm in browser).

---

## Build Order & Dependencies

```
T1 (migration + types) ──┬── T2 (penalty logic) ──┬── T5 (widget) ──┐
                         │                         │                 ├── T4 (page) ── T6 (inline) ── T8 (verify)
                         └── T3 (overdue hook) ─────┴── T7 (dashboard)┘
```
T1 first (types unblock everything). T2/T3 are parallel. T4 needs T2+T5. T7 needs T3+T5.

---

## Constraints (non-negotiable)

- Never touch `/src/auth/` or `src/contexts/AuthContext.tsx`.
- Never modify existing migrations — new file only. One concern per migration.
- pricing-guardian must review any discount-touching code before commit. **13% cap is sacred** — UI error state, never persist over cap.
- AU formatting throughout: DD/MM/YYYY, `$X,XXX.XX`, Australia/Melbourne tz.
- No TypeScript `any`. shadcn/ui only (no raw HTML form elements). RLS on all tables.
- `xero_invoice_id` / `xero_contact_id` exist in migration but stay NULL — never populate or reference in UI.
- Schema verified via live DB / generated `types.ts`, never repo file presence (note: Supabase MCP returned Unauthorized this session — no access token in env; verification done via `types.ts` + source).

---

## Open Questions / To-Confirm At Build Time

- **Q1 — RESOLVED (2026-06-23, Michael):** The dedicated `AdminInvoiceHelper` page **IS** the
  create/edit surface. The inline `InvoiceSummaryCard` "Generate Invoice" button **navigates** to
  `/admin/invoice/:leadId` and does nothing inline. The page owns create. No duplication.
- **Q2 — Discount semantics:** `autoPopulateFromLead` deliberately sets `discount_percentage = 0`
  (labour is already net of the inspection volume discount — re-applying would double-discount + breach
  cap). The page's discount field is therefore an *additional manual* discount on services only. Confirm
  this is the intended admin behaviour, not a second volume discount.
- **Q3 — `applyManualInvoiceTotal`:** an override path exists (admin types a GST-inclusive total). Decide
  whether the new page exposes it or only structured line-item editing.
- **Q4 — Overdue KPI definition drift (surfaced T3):** AdminDashboard's "Overdue Invoices" KPI counts
  persisted `status='overdue'` only (depends on the Phase-2E `check-overdue-invoices` cron flipping the
  status). The new `useOverdueInvoices` derives past-due from `due_date`, so the new **list widget** (T7)
  may show overdue rows the **KPI** doesn't. Options: (a) leave both — list is the accurate one; (b) later
  switch the KPI to the derived definition too. Left as (a) for now; not blocking.

---

## Session Log (running record of plan changes)

- **2026-06-23** — Plan authored. Verified live state: invoices table + invoices.ts CRUD + usePaymentTracking
  + LeadDetail InvoiceSection + AdminDashboard overdue KPI + Slack custom-event helpers all already shipped.
  Spec's "recreate table / create hook / create card" tasks reclassified as KEEP. Real scope = penalty
  ladder + Xero columns + dedicated page + overdue hook. Decisions D1–D6 locked with Michael.
- **2026-06-23** — Q1 resolved by Michael: AdminInvoiceHelper page is the sole create/edit surface;
  inline "Generate Invoice" navigates to `/admin/invoice/:leadId` (no inline create). T6 updated.
  Starting T1 (Xero columns migration). Build order T1→T8 confirmed.
- **2026-06-23** — T1 migration file written (`20260623165447_invoice_xero_ready.sql`): 3 additive
  nullable Xero columns, IF NOT EXISTS, rollback + COMMENTs documented. Session has **no DB creds**
  (CLI `migration up` + Supabase MCP both 401). Apply + type-regen deferred to Michael [HUMAN]. Confirmed
  non-blocking: D6 means no downstream code reads the Xero columns, so `types.ts` regen isn't on the
  critical path. Did NOT hand-edit generated `types.ts` (would be clobbered by next real regen). → T2.
- **2026-06-23** — T2 done: `penaltyLadder.ts` + 35 passing tests (keyed off daysOverdue, D4).
- **2026-06-23** — T3 done: `getOutstandingInvoices()` (api) + `useOverdueInvoices()` hook; `usePaymentTracking` now also returns `penaltyTier`. Surfaced Q4 (KPI vs derived overdue definition).
- **2026-06-23** — T4/T5 done: `AdminInvoiceHelper` page + `/admin/invoice/:leadId` route + `PenaltyLadderWidget`. shadcn-only, mobile-safe.
- **2026-06-23** — T6 done: `InvoiceSummaryCard` "Generate Invoice" → navigates to page (inline create removed, Q1); `InvoicePaymentCard` swapped its private timeline for the shared widget + penalty badge + "open full editor" link. Single source of truth for the ladder now.
- **2026-06-23** — T7 done: `OutstandingInvoicesWidget` on AdminDashboard right column.
- **2026-06-23** — T8: typecheck + build clean; **280/280 tests pass**; **pricing-guardian APPROVED** (13% cap + equipment-never-discounted + penalty-display-only all verified). Remaining: [HUMAN] T1 migration apply + type regen, live DB state check, 375px/1440px visual pass.
- **CODE COMPLETE 2026-06-23.** All 8 tasks code-done. Outstanding = human-only steps (DB migration apply, type regen, live/visual verification) + non-blocking follow-ups (Q2/Q3/Q4).
- _(append further changes here as they happen)_

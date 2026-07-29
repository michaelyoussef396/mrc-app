# Invoice Integrity Runbook — delete three rows, then add CHECK constraints

**Written:** 2026-07-29 · **Run by:** Michael, in the Supabase SQL editor
**Claude Code has NOT executed any of this. No DB writes, no migration applied.**

Run **DEV first**, confirm clean, then **PROD**. Within each environment run
**Block A before Block B** — Block B adds VALID constraints and will abort while
the two defective rows are still present.

| env | ref | SQL editor |
|---|---|---|
| **DEV** (sandbox — do this first) | `ctppzqnysmzynkxjlzta` | https://supabase.com/dashboard/project/ctppzqnysmzynkxjlzta/sql/new |
| **PROD** (LIVE, mrcsystem.com) | `ecyivrxjpsmjmexqatym` | https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/sql/new |

> DEV was restored from PROD, so it may hold the same rows. If Block A's first
> SELECT returns 0 rows on DEV, they aren't there — skip to Block B.

---

## Why these three rows go

Two different reasons. Only the first two are *defective*; the third is simply fake.

### Defective — wrong money columns

Both stored an inc-GST figure in `subtotal_after_discount`, the ex-GST column.
Both were written by code that has since been removed.

| Invoice | Stored (wrong) | Status | Written by |
|---|---|---|---|
| `INV-2026-0001` | sad **290.40**, gst **0.00**, total 290.40 | overdue | `handleCreate`, `InvoicePaymentCard.tsx` — raw insert bypassing `calculateInvoiceTotals`, gst hardcoded 0. Removed 2026-07-29. |
| `INV-2026-0002` | sad **11029.77**, gst 1002.69, total 11029.77 | paid | pre-`bb1ee91` `handleEdit`, same file — stamped the typed inc-GST total onto three money columns, leaving gst stale. Removed 2026-06-02. |

These two are what Block B's constraints would reject. They must go before Block B.

### Not defective — test data

| Invoice | Status | Total |
|---|---|---|
| `INV-2026-0004` | paid | $28,603.75 |

`INV-2026-0004` is **arithmetically perfect** — it came through the proper
`saveCalculatedInvoice` / `calculateInvoiceTotals` path and passes both
constraints. It is being deleted because it is not a real invoice:

- **Customer email `user.name+tag+sorting@example.com`** — a textbook
  email-validator test string on an IANA-reserved domain that can never receive
  mail. Customer name is "Dot Email".
- **Invoice notes read `notes optial in invocie`** — dev scratch text.
- **A line item is literally named `testing custom line`**, $1,000.
- **Equipment is 10 × 10 days of every single item** — 10 dehumidifiers, 10 air
  movers, 10 RCD boxes, all for exactly 10 days, $18,300. Nobody hires that.
- **Property address is just `VIC`** — street, suburb and postcode all blank.
- **Zero inspections, zero job completions, zero calendar bookings** for its
  lead. No work was ever recorded against it.
- **The entire lifecycle ran in 50 minutes**: created 10:16:32, marked sent one
  second later at 10:16:33, edited 11:06:18, re-sent 11:06:23, marked paid
  11:06:29 — six seconds after being sent. That is someone clicking through the
  UI to exercise the flow.
- Its one email went to the `example.com` address and could not have been
  delivered.

It is not revenue. Deleting it takes reported paid revenue to **$0.00**, which
is the honest figure — nothing real has been invoiced through this system yet.

### What survives

`INV-2026-0003` (Amy sherry, $4,697.48, **overdue/unpaid**) is retained. It is
internally consistent and passes both constraints.

> **Flagging, not acting:** it also looks like test data — its email is
> `michaelayoussef396@gmail.com` (a variant of your own address) and one line
> item is named `custom one`. It exercised more of the pipeline than the others
> (1 inspection, 1 booking). It is **unpaid**, so leaving it in still gives
> revenue $0.00; it only shows as $4,697.48 outstanding. Say the word and I'll
> add it to Block A — I haven't, because you specified three.

---

## Dependency check (done 2026-07-29, read-only — nothing blocks or cascades)

- **No table in the database has an `invoice_id` column.** All 26 public tables
  probed. No foreign key anywhere references `invoices.id`, so the delete
  cascades to nothing and is blocked by nothing.
- `job_completion_pdf_versions` keys off `job_completion_id`, not invoices.
- `activities` keys off `lead_id`. Invoice-related timeline entries on the parent
  leads remain — harmless lead narrative, not FK'd to the invoice.
- **`audit_logs` keeps everything.** 18 rows reference these three invoices
  (9 + 4 + 5) via `entity_id`, with no FK. They survive, and
  `prevent_audit_logs_delete` makes them undeletable — the complete before-state
  of all three is preserved permanently in `audit_logs.metadata->'before'`.
  Nothing is actually lost.
- The `audit_invoices_delete` trigger fires and writes one `delete_invoice` row
  per invoice, each carrying the full deleted row as JSONB.
- That trigger records `auth.uid()`, which is NULL in the Studio SQL editor.
  `audit_logs.user_id` is nullable (confirmed — NULL rows already exist), so
  **the delete will not fail on attribution.** The new rows will show
  `user_id = NULL`; expected for a Studio-run correction.
- `invoice_number_seq` is not rewound by a delete. The next invoice is
  `INV-2026-0005`.

## Expected reporting change — not a regression

Both paid invoices are being deleted, so:

- **Reports → Total Revenue, year view: $39,633.52 → $0.00**
- **Reports → Total Revenue, month view: $0.00 → $0.00** (unchanged — both
  payments predated the trailing 30 days anyway)
- **Technician card revenue: $0 → $0** (unchanged — neither payment fell in the
  current calendar month)
- **Outstanding: $4,987.88 → $4,697.48** (`INV-2026-0001` removed)

$0.00 revenue is the correct figure. No real customer has been invoiced through
this system.

---

## BLOCK A — delete the three rows

Run all statements together. The SELECTs bracket the DELETE so you can see
exactly what goes and confirm it is gone.

```sql
-- ── A1. BEFORE: the three rows about to be deleted. Expect exactly 3. ───────
SELECT invoice_number,
       status,
       total_amount,
       customer_email,
       total_amount <> subtotal_after_discount + gst_amount              AS breaks_sum,
       ABS(gst_amount - ROUND(subtotal_after_discount * 0.10, 2)) > 0.01 AS breaks_gst
FROM public.invoices
WHERE invoice_number IN ('INV-2026-0001', 'INV-2026-0002', 'INV-2026-0004')
ORDER BY invoice_number;
-- Expected on PROD:
--   INV-2026-0001  overdue     290.40  <blank>                              false  true
--   INV-2026-0002  paid      11029.77  ...                                  true   true
--   INV-2026-0004  paid      28603.75  user.name+tag+sorting@example.com    false  false
-- INV-2026-0004 shows false/false because it is not defective — it is test data.


-- ── A2. DELETE. Expect "DELETE 3". ──────────────────────────────────────────
-- Targeted by invoice_number, not id, so it cannot hit an unintended row.
-- Fires audit_invoices_delete -> three 'delete_invoice' rows land in audit_logs
-- carrying the full deleted rows in metadata->'before'. Nothing is lost.
DELETE FROM public.invoices
WHERE invoice_number IN ('INV-2026-0001', 'INV-2026-0002', 'INV-2026-0004');


-- ── A3. AFTER: confirm gone, and that nothing defective remains. ───────────
-- Both queries must return 0 rows before Block B will succeed.
SELECT invoice_number
FROM public.invoices
WHERE invoice_number IN ('INV-2026-0001', 'INV-2026-0002', 'INV-2026-0004');
-- Expect: 0 rows

SELECT invoice_number, subtotal_after_discount, gst_amount, total_amount
FROM public.invoices
WHERE total_amount <> subtotal_after_discount + gst_amount
   OR ABS(gst_amount - ROUND(subtotal_after_discount * 0.10, 2)) > 0.01;
-- Expect: 0 rows


-- ── A4. What remains. Expect exactly 1 row. ────────────────────────────────
SELECT invoice_number, status, subtotal_after_discount, gst_amount, total_amount
FROM public.invoices
ORDER BY invoice_number;
-- Expected:
--   INV-2026-0003  overdue  4270.44  427.04  4697.48


-- ── A5. Revenue is now $0.00 — the honest figure. ──────────────────────────
SELECT COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)  AS paid_revenue,
       COALESCE(SUM(total_amount) FILTER (WHERE status <> 'paid'), 0) AS outstanding
FROM public.invoices;
-- Expect: paid_revenue 0.00 | outstanding 4697.48


-- ── A6. The deleted rows are preserved in the audit trail. Expect 3 rows. ──
SELECT action, user_id, created_at,
       metadata->'before'->>'invoice_number' AS invoice_number,
       metadata->'before'->>'total_amount'   AS total_amount
FROM public.audit_logs
WHERE entity_type = 'invoices' AND action = 'delete_invoice'
ORDER BY created_at DESC;
-- user_id will be NULL (Studio has no auth.uid()) — expected.
```

**Do not continue to Block B until A3 returns 0 rows for both queries.**

---

## BLOCK B — add the constraints

This is `supabase/migrations/20260729153000_invoice_totals_integrity_checks.sql`.
Paste the file's contents, or the two statements below. Both are `VALID`, so
Postgres re-checks every remaining row at apply time and aborts on any violation.

```sql
-- ── B1. Sum check: total must equal ex-GST base + GST. ──────────────────────
ALTER TABLE public.invoices
  ADD CONSTRAINT invoice_totals_sum
  CHECK (total_amount = subtotal_after_discount + gst_amount);


-- ── B2. GST relation: GST must be 10% of the ex-GST base, within 1c. ────────
-- Both constraints are required. INV-2026-0001 PASSED the sum check
-- (290.40 + 0.00 = 290.40 is arithmetically consistent) and was caught only by
-- this one — a sum check alone would have permitted a $0-GST invoice.
ALTER TABLE public.invoices
  ADD CONSTRAINT invoice_gst_relation
  CHECK (ABS(gst_amount - ROUND(subtotal_after_discount * 0.10, 2)) <= 0.01);


-- ── B3. Verify. Expect 2 rows, convalidated = true on both. ────────────────
SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid = 'public.invoices'::regclass
  AND conname IN ('invoice_totals_sum', 'invoice_gst_relation');
```

If B1 or B2 errors with `check constraint "..." of relation "invoices" is
violated by some row`, Block A has not been run in this environment. Run Block A,
confirm A3 returns 0 rows, then retry.

**Rollback:**

```sql
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoice_totals_sum;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoice_gst_relation;
```

---

## After both blocks pass on PROD

- Tick the invoice data integrity item in `docs/TODO.md`.
- Reports → Total Revenue should read **$0.00** on every period.
- No type regeneration needed — constraints do not alter generated types.
- Any future code that writes `invoices` must go through `calculateInvoiceTotals`
  in `src/lib/api/invoices.ts`. Both constraints will now reject a raw insert or
  update that stamps an inc-GST figure into `subtotal_after_discount`, which is
  what produced the two defective rows.

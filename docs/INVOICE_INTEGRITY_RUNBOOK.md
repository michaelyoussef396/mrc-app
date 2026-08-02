# Invoice Integrity Runbook — empty the invoices table, then add CHECK constraints

**Written:** 2026-07-29 · **Run by:** Michael, in the Supabase SQL editor
**Claude Code has NOT executed any of this. No DB writes, no migration applied.**

All four invoices are deleted. None is a real customer invoice — nothing has
ever been billed through this system. The table ends **empty**, reported revenue
ends at **$0.00**, and two CHECK constraints go on so the defective shape cannot
come back.

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

## Why each row goes

Two distinct reasons. Only the first pair is *defective*; the second pair is fake.

### Defective — wrong money columns (a precondition for Block B)

Both stored an inc-GST figure in `subtotal_after_discount`, the ex-GST column.
Both were written by code that has since been removed.

| Invoice | Stored (wrong) | Status | Written by |
|---|---|---|---|
| `INV-2026-0001` | sad **290.40**, gst **0.00**, total 290.40 | overdue | `handleCreate`, `InvoicePaymentCard.tsx` — raw insert bypassing `calculateInvoiceTotals`, gst hardcoded 0. Removed 2026-07-29. |
| `INV-2026-0002` | sad **11029.77**, gst 1002.69, total 11029.77 | paid | pre-`bb1ee91` `handleEdit`, same file — stamped the typed inc-GST total onto three money columns, leaving gst stale. Removed 2026-06-02. |

### Not defective — test data (independent of Block B)

Both are arithmetically perfect, came through the proper `saveCalculatedInvoice`
/ `calculateInvoiceTotals` path, and pass both constraints. They go because they
are not real invoices.

| Invoice | Status | Total | Why it's test data |
|---|---|---|---|
| `INV-2026-0004` | paid | $28,603.75 | Email `user.name+tag+sorting@example.com` (validator test string, IANA-reserved domain that cannot receive mail); name "Dot Email"; notes read `notes optial in invocie`; a line item named `testing custom line` ($1,000); equipment of 10 × 10 days for *every* item ($18,300); address just "VIC"; zero inspections/job completions/bookings; whole create→sent→paid lifecycle in 50 minutes, marked sent **one second** after creation and paid **six seconds** after being re-sent. |
| `INV-2026-0003` | overdue | $4,697.48 | Email `michaelayoussef396@gmail.com` — a variant of the developer's own address, not a customer; a line item named `custom one` ($1,000). It exercised more of the pipeline than the others (1 inspection, 1 booking), but it was never a real billing. |

---

## What is NOT touched

**Only the four invoice rows are deleted.** Nothing else in the database changes.

- **`INV-2026-0003`'s inspection (`8414b6ea…`) and calendar booking
  (`f4f81fb5…`) SURVIVE.** They are not linked to the invoice in any way:
  neither `inspections` nor `calendar_bookings` has an `invoice_id` column
  (probed — both return 400), and both link to the *lead*, not to the invoice.
  Block A's step A7 asserts they are still present after the delete.
- **The foreign keys point the wrong way to cascade.** `invoices.lead_id →
  leads(id)` and `invoices.job_completion_id → job_completions(id)` — invoices
  *reference* those tables, they are not referenced by them. Deleting the
  referencing side can never remove the referenced parent. The `ON DELETE SET
  NULL` on those columns describes what happens if a *lead* is deleted, which is
  not what we are doing.
- **No table in the database has an `invoice_id` column** — all 26 public tables
  probed. No foreign key anywhere references `invoices.id`, so the delete
  cascades to nothing and is blocked by nothing.
- **Leads, activities and email_logs are untouched.** The parent leads keep their
  status and their timelines. Invoice-related `activities` rows remain as lead
  narrative — they key off `lead_id`, not the invoice.
- **`audit_logs` keeps everything.** 24 rows reference these four invoices
  (9 + 4 + 6 + 5) via `entity_id`, with no FK. They survive, and
  `prevent_audit_logs_delete` makes them undeletable — the complete before-state
  of all four is preserved permanently in `audit_logs.metadata->'before'`.
  Nothing is actually lost.
- The `audit_invoices_delete` trigger fires and writes one `delete_invoice` row
  per invoice, each carrying the full deleted row as JSONB. That trigger records
  `auth.uid()`, which is NULL in the Studio SQL editor; `audit_logs.user_id` is
  nullable (confirmed — NULL rows already exist), so **the delete will not fail
  on attribution.** The new rows will show `user_id = NULL`; expected.

### Invoice numbers are not reused

`invoice_number` is assigned by the `set_invoice_number` BEFORE INSERT trigger
from `NEXTVAL('public.invoice_number_seq')`. **A DELETE never touches a
sequence** — Postgres sequences are non-transactional counters that only advance
on `NEXTVAL` and are not rewound by row deletion or rollback.

Four invoices have been created, numbered contiguously 0001–0004, so the
sequence sits at 4 and the next real invoice will be **`INV-2026-0005`**. Step A8
verifies this directly rather than assuming it.

## Expected reporting change — not a regression

| figure | before | after |
|---|---|---|
| Reports → Total Revenue (year) | $39,633.52 | **$0.00** |
| Reports → Total Revenue (month) | $0.00 | $0.00 |
| Technician card revenue | $0 | $0 |
| Outstanding | $4,987.88 | **$0.00** |

$0.00 across the board is the correct figure. No real customer has been invoiced
through this system.

---

## BLOCK A — delete all four rows

Run all statements together. The SELECTs bracket the DELETE so you can see
exactly what goes and confirm it is gone.

```sql
-- ── A1. BEFORE: the four rows about to be deleted. Expect exactly 4. ───────
SELECT invoice_number,
       status,
       total_amount,
       customer_email,
       total_amount <> subtotal_after_discount + gst_amount              AS breaks_sum,
       ABS(gst_amount - ROUND(subtotal_after_discount * 0.10, 2)) > 0.01 AS breaks_gst
FROM public.invoices
ORDER BY invoice_number;
-- Expected on PROD:
--   INV-2026-0001  overdue     290.40                                     false  true
--   INV-2026-0002  paid      11029.77                                     true   true
--   INV-2026-0003  overdue    4697.48  michaelayoussef396@gmail.com       false  false
--   INV-2026-0004  paid      28603.75  user.name+tag+sorting@example.com  false  false
-- 0003 and 0004 show false/false because they are not defective — they are test data.


-- ── A2. DELETE. Expect "DELETE 4". ─────────────────────────────────────────
-- Targeted by invoice_number so it cannot hit an unintended row, even though
-- the table happens to contain nothing else.
-- Fires audit_invoices_delete -> four 'delete_invoice' rows land in audit_logs
-- carrying the full deleted rows in metadata->'before'. Nothing is lost.
DELETE FROM public.invoices
WHERE invoice_number IN ('INV-2026-0001', 'INV-2026-0002',
                         'INV-2026-0003', 'INV-2026-0004');


-- ── A3. AFTER: the table is empty. Expect 0. ───────────────────────────────
SELECT COUNT(*) AS remaining_invoices FROM public.invoices;
-- Expect: 0


-- ── A4. Nothing defective remains (trivially true on an empty table, but this
--        is the exact predicate Block B enforces). Expect 0 rows. ───────────
SELECT invoice_number, subtotal_after_discount, gst_amount, total_amount
FROM public.invoices
WHERE total_amount <> subtotal_after_discount + gst_amount
   OR ABS(gst_amount - ROUND(subtotal_after_discount * 0.10, 2)) > 0.01;
-- Expect: 0 rows


-- ── A5. Revenue and outstanding are both zero — the honest figures. ────────
SELECT COALESCE(SUM(total_amount) FILTER (WHERE status =  'paid'), 0) AS paid_revenue,
       COALESCE(SUM(total_amount) FILTER (WHERE status <> 'paid'), 0) AS outstanding
FROM public.invoices;
-- Expect: paid_revenue 0.00 | outstanding 0.00


-- ── A6. All four deleted rows are preserved in the audit trail. Expect 4. ──
SELECT action, user_id, created_at,
       metadata->'before'->>'invoice_number' AS invoice_number,
       metadata->'before'->>'total_amount'   AS total_amount
FROM public.audit_logs
WHERE entity_type = 'invoices' AND action = 'delete_invoice'
ORDER BY created_at DESC;
-- Expect: 4 rows, one per invoice. user_id NULL (Studio has no auth.uid()) — expected.


-- ── A7. The linked test records SURVIVE — only invoices were deleted. ──────
SELECT 'inspections'       AS table_name, COUNT(*) AS rows
  FROM public.inspections       WHERE lead_id = '4a16bdd1-55e6-4897-821a-e360acc47678'
UNION ALL
SELECT 'calendar_bookings', COUNT(*)
  FROM public.calendar_bookings WHERE lead_id = '4a16bdd1-55e6-4897-821a-e360acc47678'
UNION ALL
SELECT 'leads (total)',     COUNT(*) FROM public.leads;
-- Expect: inspections 1 | calendar_bookings 1 | leads 29
-- These belong to INV-2026-0003's lead and are deliberately left alone.


-- ── A8. Invoice numbering is not rewound. ──────────────────────────────────
SELECT last_value, is_called FROM public.invoice_number_seq;
-- Expect: last_value 4, is_called true  ->  next invoice is INV-2026-0005.
-- If last_value is anything other than 4, the next number is last_value + 1;
-- either way it is NEVER a reused number — DELETE does not rewind a sequence.
```

**Do not continue to Block B until A3 returns 0.**

---

## BLOCK B — add the constraints

This is `supabase/migrations/20260729153000_invoice_totals_integrity_checks.sql`.
Paste the file's contents, or the two statements below. Both are `VALID`, so
Postgres re-checks every row at apply time (vacuously true on an empty table)
and will keep checking every future INSERT and UPDATE.

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
confirm A3 returns 0, then retry.

**Rollback:**

```sql
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoice_totals_sum;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoice_gst_relation;
```

---

## After both blocks pass on PROD

- Tick the invoice data integrity item in `docs/TODO.md`.
- Reports → Total Revenue reads **$0.00** on every period; Outstanding reads
  **$0.00**. The dashboard Outstanding Invoices widget will be empty.
- The first real invoice will be **`INV-2026-0005`**.
- No type regeneration needed — constraints do not alter generated types.
- Any future code that writes `invoices` must go through `calculateInvoiceTotals`
  in `src/lib/api/invoices.ts`. Both constraints will now reject a raw insert or
  update that stamps an inc-GST figure into `subtotal_after_discount`, which is
  what produced the two defective rows.

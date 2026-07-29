# Invoice Integrity Runbook — delete two defective rows, then add CHECK constraints

**Written:** 2026-07-29 · **Run by:** Michael, in the Supabase SQL editor
**Claude Code has NOT executed any of this. No DB writes, no migration applied.**

Run **DEV first**, confirm clean, then **PROD**. Within each environment run
**Block A before Block B** — Block B adds VALID constraints and will abort while
the bad rows are still present.

| env | ref | SQL editor |
|---|---|---|
| **DEV** (sandbox — do this first) | `ctppzqnysmzynkxjlzta` | https://supabase.com/dashboard/project/ctppzqnysmzynkxjlzta/sql/new |
| **PROD** (LIVE, mrcsystem.com) | `ecyivrxjpsmjmexqatym` | https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/sql/new |

> DEV was restored from PROD, so it may hold the same two rows. If Block A's
> first SELECT returns 0 rows on DEV, the rows aren't there — skip to Block B.

---

## Why these two rows are being deleted

Both were written by code that no longer exists, and both store an inc-GST
figure in `subtotal_after_discount`, the ex-GST column.

| Invoice | Stored (wrong) | Status | Written by |
|---|---|---|---|
| `INV-2026-0001` | sad **290.40**, gst **0.00**, total 290.40 | overdue | `handleCreate`, `InvoicePaymentCard.tsx` — removed 2026-07-29 |
| `INV-2026-0002` | sad **11029.77**, gst 1002.69, total 11029.77 | paid | pre-`bb1ee91` `handleEdit`, same file — removed 2026-06-02 |

Deleting rather than correcting because none of this is real customer data, and
it lets the constraints go in `VALID` immediately instead of `NOT VALID` plus a
later validate step.

### Dependency check (done 2026-07-29, read-only — nothing blocks or cascades)

- **No table in the database has an `invoice_id` column.** Probed all 26 public
  tables. No foreign key anywhere references `invoices.id`, so the delete
  cascades to nothing and is blocked by nothing.
- `job_completion_pdf_versions` keys off `job_completion_id`, not invoices.
- `activities` keys off `lead_id`. The 5 `invoice_*` timeline entries on
  INV-2026-0001's lead will remain — harmless lead-timeline narrative, not FK'd
  to the invoice.
- **`audit_logs` keeps everything.** 13 rows reference these two invoices
  (9 + 4) via `entity_id`, with no FK. They survive the delete, and
  `prevent_audit_logs_delete` makes them undeletable — so the complete
  before-state of both invoices is preserved permanently in
  `audit_logs.metadata->'before'`. Nothing is actually lost.
- The `audit_invoices_delete` trigger fires and writes one `delete_invoice` row
  per invoice, each carrying the full deleted row as JSONB.
- That trigger records `auth.uid()`, which is NULL in the Studio SQL editor.
  `audit_logs.user_id` is nullable (confirmed — NULL rows already exist), so
  **the delete will not fail on attribution.** The two new rows will show
  `user_id = NULL`; that is expected for a Studio-run correction.
- `invoice_number_seq` is not rewound by a delete. The next invoice is
  `INV-2026-0005`; numbers 0001 and 0002 are simply retired.

### Expected reporting change — not a regression

`INV-2026-0002` is a **paid** invoice, so removing it changes what Reports shows:

- **Total Revenue, year view: $39,633.52 → $28,603.75** (−$11,029.77)
- Month view stays **$0.00** — both payments predate the trailing 30 days either way.

`INV-2026-0001` is `overdue`, never paid, so it does not touch revenue. It does
change outstanding: **$4,987.88 → $4,697.48** (−$290.40).

If the Reports year figure reads $28,603.75 afterwards, that is correct.

> Separately: the remaining $28,603.75 belongs to `INV-2026-0004`, which is
> unattributable (no job completion, no assigned lead) and whose parent lead has
> no inspection, booking or job completion at all. It may also be test data. Not
> in scope here — flagged so the number isn't mistaken for verified revenue.

---

## BLOCK A — delete the two rows

Run all three statements together. The SELECTs bracket the DELETE so you can see
exactly what goes and confirm it is gone.

```sql
-- ── A1. BEFORE: the two rows about to be deleted. Expect exactly 2. ──────────
SELECT invoice_number,
       status,
       subtotal_after_discount,
       gst_amount,
       total_amount,
       total_amount <> subtotal_after_discount + gst_amount              AS breaks_sum,
       ABS(gst_amount - ROUND(subtotal_after_discount * 0.10, 2)) > 0.01 AS breaks_gst
FROM public.invoices
WHERE invoice_number IN ('INV-2026-0001', 'INV-2026-0002')
ORDER BY invoice_number;
-- Expected on PROD:
--   INV-2026-0001  overdue   290.40   0.00      290.40   false  true
--   INV-2026-0002  paid    11029.77   1002.69  11029.77  true   true


-- ── A2. DELETE. Expect "DELETE 2". ──────────────────────────────────────────
-- Targeted by invoice_number, not id, so it cannot hit an unintended row.
-- Fires audit_invoices_delete -> two 'delete_invoice' rows land in audit_logs
-- carrying the full deleted rows in metadata->'before'. Nothing is lost.
DELETE FROM public.invoices
WHERE invoice_number IN ('INV-2026-0001', 'INV-2026-0002');


-- ── A3. AFTER: confirm gone, and that nothing else is defective. ────────────
-- Both queries must return 0 rows before Block B will succeed.
SELECT invoice_number
FROM public.invoices
WHERE invoice_number IN ('INV-2026-0001', 'INV-2026-0002');
-- Expect: 0 rows

SELECT invoice_number, subtotal_after_discount, gst_amount, total_amount
FROM public.invoices
WHERE total_amount <> subtotal_after_discount + gst_amount
   OR ABS(gst_amount - ROUND(subtotal_after_discount * 0.10, 2)) > 0.01;
-- Expect: 0 rows


-- ── A4. Sanity: the two good invoices survive. Expect 2 rows. ───────────────
SELECT invoice_number, status, subtotal_after_discount, gst_amount, total_amount
FROM public.invoices
ORDER BY invoice_number;
-- Expected:
--   INV-2026-0003  overdue   4270.44   427.04   4697.48
--   INV-2026-0004  paid     26003.41  2600.34  28603.75


-- ── A5. The deleted rows are preserved in the audit trail. Expect 2 rows. ───
SELECT action, entity_id, user_id, created_at,
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


-- ── B3. Verify. Expect 2 rows, convalidated = true on both. ─────────────────
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
- Reports year revenue should read **$28,603.75**.
- No type regeneration needed — constraints do not alter generated types.
- Any future code that writes `invoices` must go through `calculateInvoiceTotals`
  in `src/lib/api/invoices.ts`. Both constraints will now reject a raw insert or
  update that stamps an inc-GST figure into `subtotal_after_discount`, which is
  what produced both deleted rows.

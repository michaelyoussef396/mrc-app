-- Invoice money-column integrity: two CHECK constraints on public.invoices.
--
-- WRITTEN, NOT APPLIED BY CLAUDE CODE. Michael runs this in Studio.
--
-- ⚠️ PRECONDITION — RUN BLOCK A FIRST
-- This migration adds both constraints as VALID, so Postgres verifies every
-- existing row at apply time and ABORTS if any row violates. INV-2026-0001 and
-- INV-2026-0002 both violate. They must be deleted first — see
-- docs/INVOICE_INTEGRITY_RUNBOOK.md, Block A. If this migration errors with
-- "check constraint ... is violated by some row", Block A has not been run.
--
-- Block A also deletes INV-2026-0003 and INV-2026-0004, which are NOT defective
-- — both pass these constraints. They are removed separately as test data
-- (0004: email user.name+tag+sorting@example.com, a line item named "testing
-- custom line"; 0003: a developer's own address, a line item named "custom
-- one"). Their removal is not a precondition for this migration. The table ends
-- empty, so both constraints validate vacuously and then bind every future write.
--
-- WHY
-- The only money constraint on this table was `discount_cap`. Nothing enforced
-- the relationship between subtotal_after_discount, gst_amount and
-- total_amount, and two writers silently broke it:
--
--   * handleEdit in InvoicePaymentCard.tsx (removed 2026-06-02, commit bb1ee91)
--     stamped the typed inc-GST amount onto total_amount, subtotal AND
--     subtotal_after_discount without touching gst_amount, leaving a stale GST.
--     Produced INV-2026-0002.
--   * handleCreate in the same file (removed 2026-07-29) raw-inserted an inc-GST
--     amount into the same three columns with gst_amount hardcoded to 0.
--     Produced INV-2026-0001.
--
-- Both writers are gone. These constraints stop the shape returning.
--
-- WHY TWO CONSTRAINTS AND NOT ONE
-- Each defect evades the other check. Measured against the four PROD rows as
-- they stood on 2026-07-29:
--
--   row            sad        gst       total      sum check   gst check
--   INV-2026-0001  290.40     0.00      290.40     PASSES      fails ($29.04)   [deleted: defective]
--   INV-2026-0002  11029.77   1002.69   11029.77   fails       fails ($100.29)  [deleted: defective]
--   INV-2026-0003  4270.44    427.04    4697.48    passes      passes           [deleted: test data]
--   INV-2026-0004  26003.41   2600.34   28603.75   passes      passes           [deleted: test data]
--
-- INV-2026-0001 satisfies the sum (290.40 + 0.00 = 290.40) because $0 GST is
-- arithmetically consistent — it is wrong only against the GST relation. A sum
-- check alone would have shipped a $0-GST invoice. Hence both.
--
-- ROLLBACK
--   ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoice_totals_sum;
--   ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoice_gst_relation;

-- Pre-flight: MUST return 0 rows before the ALTERs below will succeed.
-- If it returns anything, run Block A first.
--
--   SELECT invoice_number, subtotal_after_discount, gst_amount, total_amount
--   FROM public.invoices
--   WHERE total_amount <> subtotal_after_discount + gst_amount
--      OR ABS(gst_amount - ROUND(subtotal_after_discount * 0.10, 2)) > 0.01;

-- All three columns are DECIMAL(10,2) NOT NULL DEFAULT 0, so this is exact
-- decimal arithmetic — no float tolerance required and no NULL branch needed.
ALTER TABLE public.invoices
  ADD CONSTRAINT invoice_totals_sum
  CHECK (total_amount = subtotal_after_discount + gst_amount);

-- GST is always 10% of the ex-GST base (CLAUDE.md: "GST always 10% on subtotal").
-- MRC has no GST-free service line; if that ever changes, this constraint is the
-- thing that will block the save, and it should be revisited rather than dropped.
--
-- The 1 cent tolerance accommodates the two legitimate rounding paths:
--   calculateInvoiceTotals  gst = round2(subtotal_after_discount * 0.10)
--   applyManualInvoiceTotal gst = total_amount - round2(total_amount / 1.10)
-- These agree exactly at realistic invoice values and can differ by one cent
-- only on sub-dollar totals. It is far tighter than any real defect: the $0-GST
-- case above was out by $29.04 and the stale-GST case by $100.29.
ALTER TABLE public.invoices
  ADD CONSTRAINT invoice_gst_relation
  CHECK (ABS(gst_amount - ROUND(subtotal_after_discount * 0.10, 2)) <= 0.01);

COMMENT ON CONSTRAINT invoice_totals_sum ON public.invoices IS
  'total_amount must equal subtotal_after_discount + gst_amount. Added VALID 2026-07-29 after removing the two rows that violated it.';

COMMENT ON CONSTRAINT invoice_gst_relation ON public.invoices IS
  'gst_amount must be 10% of subtotal_after_discount within 1c. Catches the $0-GST shape that the sum check alone permits.';

-- Post-apply verification — expect both rows, convalidated = true:
--
--   SELECT conname, convalidated
--   FROM pg_constraint
--   WHERE conrelid = 'public.invoices'::regclass
--     AND conname IN ('invoice_totals_sum', 'invoice_gst_relation');

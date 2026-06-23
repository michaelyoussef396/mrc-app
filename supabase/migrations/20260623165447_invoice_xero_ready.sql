-- Phase 2D — Xero-ready stub columns (additive, non-destructive)
--
-- Adds nullable Xero linkage columns ahead of the Xero integration (6-8 weeks out).
-- These remain NULL until that integration lands — nothing populates or reads them yet.
-- The existing invoices table, audit triggers, RLS, and the 13% discount CHECK are
-- untouched (see 20260414000004_create_invoices_table.sql). Additive only.
--
-- Rollback:
--   ALTER TABLE public.invoices DROP COLUMN IF EXISTS xero_invoice_id;
--   ALTER TABLE public.invoices DROP COLUMN IF EXISTS xero_contact_id;
--   ALTER TABLE public.leads    DROP COLUMN IF EXISTS xero_contact_id;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS xero_invoice_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS xero_contact_id VARCHAR(255);

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS xero_contact_id VARCHAR(255);

COMMENT ON COLUMN public.invoices.xero_invoice_id IS 'Xero InvoiceID — populated when Xero integration lands. NULL until then.';
COMMENT ON COLUMN public.invoices.xero_contact_id IS 'Xero ContactID for the invoice customer — populated when Xero integration lands. NULL until then.';
COMMENT ON COLUMN public.leads.xero_contact_id IS 'Xero ContactID for the lead/customer — populated when Xero integration lands. NULL until then.';

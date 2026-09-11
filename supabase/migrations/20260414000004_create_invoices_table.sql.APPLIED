-- Invoices table for Phase 2 billing flow
-- Drops the legacy empty invoices table and recreates with JSONB line_items schema.
-- 13% discount cap enforced at both app layer AND DB (CHECK constraint).
-- Equipment is tracked separately and never discounted.

DROP TABLE IF EXISTS public.invoices CASCADE;

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  job_completion_id UUID REFERENCES public.job_completions(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,

  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  property_address TEXT,

  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  subtotal_after_discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  equipment_subtotal DECIMAL(10,2) DEFAULT 0,

  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','paid','overdue','void')),
  payment_method VARCHAR(50) CHECK (payment_method IS NULL OR payment_method IN ('cash','visa','mastercard','bank_transfer','cheque')),
  payment_date DATE,
  payment_reference VARCHAR(255),

  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT discount_cap CHECK (discount_percentage >= 0 AND discount_percentage <= 13)
);

CREATE INDEX idx_invoices_lead_id ON public.invoices(lead_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date) WHERE status NOT IN ('paid','void');
CREATE INDEX idx_invoices_job_completion_id ON public.invoices(job_completion_id);

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' ||
      LPAD(NEXTVAL('public.invoice_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_invoice_number BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_invoices_insert AFTER INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('create_invoice');

CREATE TRIGGER audit_invoices_update AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('update_invoice');

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_invoices ON public.invoices
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY tech_read_invoices ON public.invoices
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = invoices.lead_id AND l.assigned_to = auth.uid()));

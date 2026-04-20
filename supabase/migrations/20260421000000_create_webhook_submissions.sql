CREATE TABLE public.webhook_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'framer',
  raw_payload JSONB NOT NULL,
  headers JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_webhook_submissions_status ON public.webhook_submissions(status);
CREATE INDEX idx_webhook_submissions_created_at ON public.webhook_submissions(created_at DESC);

ALTER TABLE public.webhook_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read webhook submissions"
  ON public.webhook_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  ));

CREATE POLICY "Service insert webhook submissions"
  ON public.webhook_submissions FOR INSERT
  WITH CHECK (true);

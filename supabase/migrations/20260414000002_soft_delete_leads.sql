-- Soft-delete support for leads
-- Aligns LeadDetail's archive button with the existing archived_at column
-- (already used by LeadsManagement archive feature).
-- App-layer queries filter .is('archived_at', null) to hide archived leads.

-- The archived_at column already exists on leads. Just ensure the partial
-- index exists for fast active-lead queries.
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON public.leads(archived_at) WHERE archived_at IS NULL;

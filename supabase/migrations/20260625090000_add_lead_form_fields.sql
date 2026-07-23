-- PENDING — REVIEW + APPLY MANUALLY IN SUPABASE STUDIO (do not auto-apply).
--
-- Public in-app lead capture form (/request-inspection) — new lead fields.
--
-- WHAT: Adds four nullable columns to leads to back the new in-app public
--       enquiry form. The form POSTs to the receive-framer-lead Edge Function,
--       which writes these via the audited_insert_lead_via_framer RPC (that RPC
--       is updated in the companion migration 20260625090100 — an explicit
--       column allowlist, so these columns do nothing until it ships too).
--
--   - preferred_day   : day-of-week / "Flexible (Any Day)" select (replaces the
--                       old date picker; customer_preferred_date stays for the
--                       Framer path and is simply null for in-app submissions).
--   - issue_type      : Mould Growth / Water Damage / Subfloor / Pre-Purchase / Other.
--   - urgency         : Emergency / Urgent / Flexible. RE-ADDED — this column was
--                       dropped in 20260513_phase5_dead_column_drop.sql when it had
--                       zero non-null values and no consumers. It now has a writer
--                       again. No badge/filter consumer is being reintroduced here.
--   - initial_photos  : Storage object PATHS (not URLs) in the private
--                       lead-enquiry-photos bucket. Admin views via signed URLs.
--
-- NOTE: preferred_time reuses the existing customer_preferred_time column, and
--       property_type already exists (VARCHAR(50)) — neither is added here.
--
-- WHY:  Additive + nullable, so existing rows and the live Framer path are
--       unaffected (no breaking change).
--
-- ORDERING: apply BEFORE or WITH 20260625090100 (the RPC needs these columns to
--           exist before it references them).
--
-- REVERSIBLE:
--   ALTER TABLE public.leads
--     DROP COLUMN IF EXISTS preferred_day,
--     DROP COLUMN IF EXISTS issue_type,
--     DROP COLUMN IF EXISTS urgency,
--     DROP COLUMN IF EXISTS initial_photos;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS preferred_day   TEXT,
  ADD COLUMN IF NOT EXISTS issue_type      TEXT,
  ADD COLUMN IF NOT EXISTS urgency         TEXT,
  ADD COLUMN IF NOT EXISTS initial_photos  TEXT[];

COMMENT ON COLUMN public.leads.preferred_day IS
  'In-app enquiry form: preferred inspection day-of-week or "Flexible (Any Day)".';
COMMENT ON COLUMN public.leads.issue_type IS
  'In-app enquiry form: category of issue (Mould Growth / Water Damage / Subfloor / Pre-Purchase / Other).';
COMMENT ON COLUMN public.leads.urgency IS
  'In-app enquiry form: urgency (Emergency / Urgent / Flexible). Re-added after the Phase 5 drop; free text, no enum.';
COMMENT ON COLUMN public.leads.initial_photos IS
  'In-app enquiry form: Storage object paths in the private lead-enquiry-photos bucket. View via signed URLs (not public URLs).';

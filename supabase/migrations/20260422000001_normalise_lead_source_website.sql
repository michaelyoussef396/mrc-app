-- Migration: normalise lead_source values for website-sourced leads
-- Purpose: rename historical 'website_form' values to 'website' so reports
--          and KPIs aggregate by a single canonical channel name.
-- Created:  2026-04-22
--
-- Pre-migration counts (verified by query at draft time):
--   - rows with lead_source = 'website_form'   : 7   (will be renamed)
--   - rows with lead_source = 'website'        : 3   (already canonical)
--   - rows with empty/null property_address_postcode : 8
--     ↳ of those, 7 are also lead_source='website_form'
--
-- The empty-postcode rows are NOT touched by this migration. They require
-- manual cleanup by an admin (look up postcode for each lead's suburb and
-- update individually). Going forward, the receive-framer-lead Edge Function
-- requires postcode at validation time, so new leads will always have one.
--
-- To inspect after running:
--   SELECT lead_source, COUNT(*) FROM leads GROUP BY lead_source;
--   SELECT id, full_name, property_address_suburb FROM leads
--    WHERE property_address_postcode = '' OR property_address_postcode IS NULL;

UPDATE public.leads
SET lead_source = 'website'
WHERE lead_source = 'website_form';

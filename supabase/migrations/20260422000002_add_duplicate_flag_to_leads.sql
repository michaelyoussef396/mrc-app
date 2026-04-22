-- Migration: add duplicate-detection flag columns to leads
-- Purpose: replace the silent-rejection dedup behaviour in receive-framer-lead
--          with capture-and-flag. Every Framer submission becomes a lead;
--          repeats are tagged so admin can decide what to do.
-- Created:  2026-04-22
--
-- Columns:
--   is_possible_duplicate  — true when a matching email+phone existed in last 24h
--   possible_duplicate_of  — UUID of the earlier lead the new one looks like
--                            (nullable; FK ON DELETE SET NULL preserves audit trail)
--
-- Index supports the admin "find all flagged duplicates" query and the
-- LeadDetail follow-up lookup of the original lead's lead_number.
-- Partial index keeps it small — only flagged rows.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_possible_duplicate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS possible_duplicate_of UUID REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_possible_duplicate
  ON public.leads(possible_duplicate_of)
  WHERE possible_duplicate_of IS NOT NULL;

-- Sequential job + inspection numbers.
--
-- Replaces client-side Math.random() generation of job_number on two tables:
--   inspections.job_number      random MRC-YYYY-NNNN  ->  INS-YYYY-NNNN
--   job_completions.job_number  random JOB-YYYY-NNNN  ->  JOB-YYYY-NNNN
--
-- Why: inspections.job_number is VARCHAR(50) UNIQUE (20251028135212) and the client
-- drew from 9,000 values, so a duplicate was more likely than not by ~110 inspections;
-- the losing INSERT surfaced to the technician as an unexplained "Save Failed". The
-- MRC- prefix also collided with the leads.lead_number namespace produced by
-- generate_lead_number(), making a lead and an inspection indistinguishable by format.
--
-- Structure mirrors generate_invoice_number() / set_invoice_number
-- (20260414000004_create_invoices_table.sql:54-66) with the search_path hardening from
-- 20260421000001. The IS NULL / '' guard means an explicitly supplied number is still
-- honoured, so the migration is inert against an old frontend that still sends one.
--
-- Safe only while both tables are empty (verified 2026-08-02): the UNIQUE constraint
-- below aborts against pre-existing duplicates.
--
-- Note: like invoice_number_seq, these sequences do not reset on 1 January. The first
-- inspection of 2027 continues the run rather than restarting at 0001.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS set_inspection_job_number ON public.inspections;
--   DROP TRIGGER IF EXISTS set_job_number ON public.job_completions;
--   DROP FUNCTION IF EXISTS public.generate_inspection_job_number();
--   DROP FUNCTION IF EXISTS public.generate_job_number();
--   DROP SEQUENCE IF EXISTS public.inspection_number_seq;
--   DROP SEQUENCE IF EXISTS public.job_number_seq;
--   ALTER TABLE public.job_completions
--     DROP CONSTRAINT IF EXISTS job_completions_job_number_key;

-- =============================================================================
-- Sequences
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.inspection_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.job_number_seq START 1;

-- The trigger functions run SECURITY INVOKER (as generate_invoice_number does), so the
-- inserting role needs USAGE. Supabase's default privileges on public already cover
-- this; granting explicitly keeps the migration self-contained.
GRANT USAGE, SELECT ON SEQUENCE public.inspection_number_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.job_number_seq        TO authenticated;

-- =============================================================================
-- inspections.job_number -> INS-YYYY-NNNN
-- =============================================================================

-- Named generate_inspection_job_number, not generate_inspection_number: the latter
-- already exists (20251111000012) with a RETURNS text signature and must not be
-- clobbered by a RETURNS TRIGGER replacement.
CREATE OR REPLACE FUNCTION public.generate_inspection_job_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := 'INS-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' ||
      LPAD(NEXTVAL('public.inspection_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_inspection_job_number ON public.inspections;

CREATE TRIGGER set_inspection_job_number
  BEFORE INSERT ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.generate_inspection_job_number();

-- =============================================================================
-- job_completions.job_number -> JOB-YYYY-NNNN
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := 'JOB-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' ||
      LPAD(NEXTVAL('public.job_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_job_number ON public.job_completions;

CREATE TRIGGER set_job_number
  BEFORE INSERT ON public.job_completions
  FOR EACH ROW EXECUTE FUNCTION public.generate_job_number();

-- =============================================================================
-- Uniqueness on job_completions.job_number
-- =============================================================================

-- job_completions was created outside supabase/migrations/, so its DDL is not readable
-- from the repo and the constraint may or may not already exist. Probe rather than
-- assume; both branches leave the same end state.
DO $$
DECLARE
  v_attnum SMALLINT;
BEGIN
  SELECT attnum INTO v_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.job_completions'::regclass
    AND attname = 'job_number'
    AND NOT attisdropped;

  IF v_attnum IS NULL THEN
    RAISE EXCEPTION 'public.job_completions.job_number not found — aborting';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.job_completions'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[v_attnum]
  ) THEN
    ALTER TABLE public.job_completions
      ADD CONSTRAINT job_completions_job_number_key UNIQUE (job_number);
    RAISE NOTICE 'Added UNIQUE constraint job_completions_job_number_key';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on job_completions.job_number already present';
  END IF;
END
$$;

COMMENT ON SEQUENCE public.inspection_number_seq IS
  'Backs INS-YYYY-NNNN in inspections.job_number via set_inspection_job_number.';
COMMENT ON SEQUENCE public.job_number_seq IS
  'Backs JOB-YYYY-NNNN in job_completions.job_number via set_job_number.';

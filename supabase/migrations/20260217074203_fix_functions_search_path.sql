-- Migration: Fix function_search_path_mutable linter warnings
-- Drops 9 dead/broken functions, sets search_path='' on 10 active functions
-- All table/type references fully qualified for safety with empty search_path

-- ============================================================================
-- PART A: Drop 9 dead/broken functions
-- ============================================================================

-- Drop orphaned triggers before their functions
DROP TRIGGER IF EXISTS fix_null_strings_trigger ON auth.users;
DROP TRIGGER IF EXISTS trigger_notify_lead_created ON public.leads;
DROP TRIGGER IF EXISTS trigger_notify_lead_status_changed ON public.leads;
DROP TRIGGER IF EXISTS trigger_notify_job_completed ON public.leads;
DROP TRIGGER IF EXISTS trigger_notify_payment_received ON public.leads;
DROP TRIGGER IF EXISTS trigger_notify_inspection_scheduled ON public.leads;

DROP FUNCTION IF EXISTS public.fix_auth_null_strings();
DROP FUNCTION IF EXISTS public.calculate_travel_time(integer, integer);
DROP FUNCTION IF EXISTS public.get_admin_user_ids();
DROP FUNCTION IF EXISTS public.generate_invoice_number();
DROP FUNCTION IF EXISTS public.notify_lead_created();
DROP FUNCTION IF EXISTS public.notify_lead_status_changed();
DROP FUNCTION IF EXISTS public.notify_job_completed();
DROP FUNCTION IF EXISTS public.notify_payment_received();
DROP FUNCTION IF EXISTS public.notify_inspection_scheduled();

-- ============================================================================
-- PART B: Fix search_path on 10 active functions
-- All get SET search_path = '' and fully-qualified table/type references
-- ============================================================================

-- 1. has_role — must come before is_admin (dependency)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id AND r.name = _role_name
  );
$$;

-- 2. is_admin() — no args, delegates to has_role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- 3. is_admin(uuid)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- 4. generate_lead_number()
CREATE OR REPLACE FUNCTION public.generate_lead_number()
RETURNS character varying
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  new_lead_number VARCHAR(50);
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(lead_number FROM 10) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM public.leads
  WHERE lead_number LIKE 'MRC-' || current_year || '-%';

  new_lead_number := 'MRC-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');

  RETURN new_lead_number;
END;
$$;

-- 5. generate_inspection_number()
CREATE OR REPLACE FUNCTION public.generate_inspection_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_date_str TEXT;
  v_sequence INTEGER;
  v_last_reset_date DATE;
BEGIN
  v_date_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  SELECT value::DATE INTO v_last_reset_date
  FROM public.app_settings
  WHERE key = 'inspection_seq_last_reset';

  IF v_last_reset_date IS NULL OR v_last_reset_date < CURRENT_DATE THEN
    PERFORM setval('public.inspection_daily_seq', 1, false);

    INSERT INTO public.app_settings (key, value, updated_at)
    VALUES ('inspection_seq_last_reset', CURRENT_DATE::TEXT, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value = CURRENT_DATE::TEXT,
          updated_at = NOW();
  END IF;

  v_sequence := nextval('public.inspection_daily_seq');

  RETURN 'INS-' || v_date_str || '-' || LPAD(v_sequence::TEXT, 3, '0');

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to generate inspection number: %', SQLERRM;
END;
$$;

-- 6. calculate_moisture_status()
CREATE OR REPLACE FUNCTION public.calculate_moisture_status(percentage numeric)
RETURNS public.moisture_status
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF percentage <= 12 THEN
    RETURN 'dry'::public.moisture_status;
  ELSIF percentage <= 18 THEN
    RETURN 'elevated'::public.moisture_status;
  ELSIF percentage <= 25 THEN
    RETURN 'wet'::public.moisture_status;
  ELSE
    RETURN 'very_wet'::public.moisture_status;
  END IF;
END;
$$;

-- 7. calculate_gst()
CREATE OR REPLACE FUNCTION public.calculate_gst(amount_ex_gst numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ROUND(amount_ex_gst * 0.10, 2);
$$;

-- 8. calculate_total_inc_gst()
CREATE OR REPLACE FUNCTION public.calculate_total_inc_gst(amount_ex_gst numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ROUND(amount_ex_gst * 1.10, 2);
$$;

-- 9. calculate_dew_point()
CREATE OR REPLACE FUNCTION public.calculate_dew_point(temperature numeric, humidity numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  a CONSTANT DECIMAL := 17.27;
  b CONSTANT DECIMAL := 237.7;
  alpha DECIMAL;
BEGIN
  alpha := ((a * temperature) / (b + temperature)) + LN(humidity / 100.0);
  RETURN ROUND((b * alpha) / (a - alpha), 2);
END;
$$;

-- 10. update_updated_at_column() — used by triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

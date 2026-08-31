-- ============================================================================
-- READ-ONLY: how many inspections carry "stacked" labour hours, and who has
-- seen them. Nothing here writes. Run in Supabase Studio > SQL editor,
-- ONE QUERY AT A TIME (Q1, then Q2, then Q3).
--
-- Target: PROD ecyivrxjpsmjmexqatym (live mrcsystem.com) — Michael runs this
-- himself; agent sessions are blocked from PROD by the guard hook.
--
-- Context (branch fix/option-stacking-equipment-days, 2026-08-31): until this
-- branch, an area flagged for demolition was priced at surface + demolition.
-- Under the owner's rule (demolition REPLACES surface per area) the app now
-- derives either/or hours live, but the stored hour/money columns on
-- inspections keep the stacked figures until the inspection is re-saved from
-- the technician form. This pack measures that population.
--
-- "Stacked" = at least one area with demolition_required = true, a demolition
-- time entered (> 0) AND a surface time entered (> 0). A flagged area with no
-- demolition time still prices as surface under the new rule, so it is NOT
-- stacked; it is counted separately as flagged_without_demo_time.
-- ============================================================================


-- ============================ Q1 ============================================
-- Population and split by option / override flag.
-- ============================================================================
WITH area_sums AS (
  SELECT
    inspection_id,
    SUM(COALESCE(job_time_minutes, 0)) / 60.0 AS surface_all_h,
    SUM(
      CASE
        WHEN demolition_required AND COALESCE(demolition_time_minutes, 0) > 0
          THEN 0
        ELSE COALESCE(job_time_minutes, 0)
      END
    ) / 60.0 AS surface_either_or_h,
    SUM(
      CASE
        WHEN demolition_required THEN COALESCE(demolition_time_minutes, 0)
        ELSE 0
      END
    ) / 60.0 AS demo_h,
    BOOL_OR(
      demolition_required
      AND COALESCE(demolition_time_minutes, 0) > 0
      AND COALESCE(job_time_minutes, 0) > 0
    ) AS has_stacked_area,
    BOOL_OR(
      demolition_required
      AND COALESCE(demolition_time_minutes, 0) = 0
    ) AS has_flagged_without_time
  FROM public.inspection_areas
  GROUP BY inspection_id
),
classified AS (
  SELECT
    i.id,
    i.option_selected,
    COALESCE(i.manual_labour_override, false) AS override_flag,
    a.has_stacked_area,
    a.has_flagged_without_time,
    (a.surface_all_h - a.surface_either_or_h) AS stacked_hours,
    ABS(COALESCE(i.no_demolition_hours, 0) - a.surface_all_h) < 0.01
      AS stored_matches_old_rule,
    CEIL((a.surface_all_h + a.demo_h + COALESCE(i.subfloor_hours, 0)) / 8.0)
      AS old_rule_days,
    CEIL((a.surface_either_or_h + a.demo_h + COALESCE(i.subfloor_hours, 0)) / 8.0)
      AS new_rule_days
  FROM public.inspections i
  JOIN area_sums a ON a.inspection_id = i.id
)
SELECT
  COUNT(*) AS inspections_with_areas,
  COUNT(*) FILTER (WHERE has_stacked_area) AS stacked_inspections,
  COUNT(*) FILTER (WHERE has_stacked_area AND stored_matches_old_rule)
    AS stacked_and_stored_still_old_rule,
  COUNT(*) FILTER (WHERE has_stacked_area AND option_selected = 3)
    AS stacked_both_mode,
  COUNT(*) FILTER (WHERE has_stacked_area AND option_selected = 2)
    AS stacked_option_2,
  COUNT(*) FILTER (WHERE has_stacked_area AND option_selected = 1)
    AS stacked_option_1,
  COUNT(*) FILTER (WHERE has_stacked_area AND option_selected IS NULL)
    AS stacked_no_option,
  COUNT(*) FILTER (WHERE has_stacked_area AND override_flag)
    AS stacked_with_override_flag,
  COUNT(*) FILTER (WHERE has_stacked_area AND old_rule_days <> new_rule_days)
    AS stacked_equipment_days_would_change,
  COUNT(*) FILTER (WHERE has_flagged_without_time)
    AS flagged_without_demo_time,
  ROUND(COALESCE(SUM(stacked_hours) FILTER (WHERE has_stacked_area), 0)::numeric, 1)
    AS total_stacked_hours
FROM classified;


-- ============================ Q2 ============================================
-- Of the stacked inspections: has a customer seen a number, and is a job in
-- flight?
-- ============================================================================
WITH area_sums AS (
  SELECT
    inspection_id,
    BOOL_OR(
      demolition_required
      AND COALESCE(demolition_time_minutes, 0) > 0
      AND COALESCE(job_time_minutes, 0) > 0
    ) AS has_stacked_area
  FROM public.inspection_areas
  GROUP BY inspection_id
),
stacked AS (
  SELECT i.id, i.lead_id, i.report_sent_date
  FROM public.inspections i
  JOIN area_sums a ON a.inspection_id = i.id
  WHERE a.has_stacked_area
),
per_row AS (
  SELECT
    s.id AS inspection_id,
    EXISTS (
      SELECT 1 FROM public.pdf_versions pv
      WHERE pv.inspection_id = s.id AND pv.was_emailed
    ) AS report_pdf_emailed,
    (s.report_sent_date IS NOT NULL) AS report_sent_date_set,
    EXISTS (
      SELECT 1 FROM public.email_logs el
      WHERE el.inspection_id = s.id AND el.status::text = 'sent'
    ) AS email_logged,
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.lead_id = s.lead_id
    ) AS invoice_exists,
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.lead_id = s.lead_id
        AND (inv.sent_at IS NOT NULL
             OR inv.status::text IN ('sent', 'paid', 'overdue'))
    ) AS invoice_sent,
    EXISTS (
      SELECT 1 FROM public.calendar_bookings cb
      WHERE cb.lead_id = s.lead_id
        AND cb.event_type::text = 'job'
        AND COALESCE(cb.status::text, '') <> 'cancelled'
    ) AS job_booked,
    EXISTS (
      SELECT 1 FROM public.job_completions jc
      WHERE jc.inspection_id = s.id OR jc.lead_id = s.lead_id
    ) AS job_completion_exists
  FROM stacked s
)
SELECT
  COUNT(*) AS stacked_inspections,
  COUNT(*) FILTER (
    WHERE report_pdf_emailed OR report_sent_date_set OR email_logged
  ) AS customer_saw_report,
  COUNT(*) FILTER (WHERE invoice_exists) AS invoice_generated,
  COUNT(*) FILTER (WHERE invoice_sent) AS invoice_sent,
  COUNT(*) FILTER (WHERE job_booked) AS job_booked,
  COUNT(*) FILTER (WHERE job_completion_exists)
    AS job_completed_or_in_completion,
  COUNT(*) FILTER (
    WHERE NOT (report_pdf_emailed OR report_sent_date_set OR email_logged)
      AND NOT invoice_exists
      AND NOT job_booked
      AND NOT job_completion_exists
  ) AS untouched_by_customer_or_job
FROM per_row;


-- ============================ Q3 ============================================
-- The same population, one row each, for eyeballing before any decision.
-- Ids and status only, no customer names.
-- ============================================================================
WITH area_sums AS (
  SELECT
    inspection_id,
    SUM(COALESCE(job_time_minutes, 0)) / 60.0 AS surface_all_h,
    SUM(
      CASE
        WHEN demolition_required AND COALESCE(demolition_time_minutes, 0) > 0
          THEN 0
        ELSE COALESCE(job_time_minutes, 0)
      END
    ) / 60.0 AS surface_either_or_h,
    SUM(
      CASE
        WHEN demolition_required THEN COALESCE(demolition_time_minutes, 0)
        ELSE 0
      END
    ) / 60.0 AS demo_h,
    BOOL_OR(
      demolition_required
      AND COALESCE(demolition_time_minutes, 0) > 0
      AND COALESCE(job_time_minutes, 0) > 0
    ) AS has_stacked_area
  FROM public.inspection_areas
  GROUP BY inspection_id
)
SELECT
  i.id AS inspection_id,
  i.lead_id,
  l.status::text AS lead_status,
  i.option_selected,
  COALESCE(i.manual_labour_override, false) AS override_flag,
  ROUND(a.surface_all_h::numeric, 2) AS surface_hours_stored_basis,
  ROUND(a.surface_either_or_h::numeric, 2) AS surface_hours_new_rule,
  ROUND(a.demo_h::numeric, 2) AS demolition_hours,
  i.labour_cost_ex_gst,
  i.total_inc_gst,
  i.report_sent_date,
  EXISTS (
    SELECT 1 FROM public.pdf_versions pv
    WHERE pv.inspection_id = i.id AND pv.was_emailed
  ) AS report_pdf_emailed,
  EXISTS (
    SELECT 1 FROM public.invoices inv WHERE inv.lead_id = i.lead_id
  ) AS invoice_exists,
  EXISTS (
    SELECT 1 FROM public.calendar_bookings cb
    WHERE cb.lead_id = i.lead_id
      AND cb.event_type::text = 'job'
      AND COALESCE(cb.status::text, '') <> 'cancelled'
  ) AS job_booked,
  EXISTS (
    SELECT 1 FROM public.job_completions jc
    WHERE jc.inspection_id = i.id OR jc.lead_id = i.lead_id
  ) AS job_completion_exists,
  i.updated_at
FROM public.inspections i
JOIN area_sums a ON a.inspection_id = i.id
LEFT JOIN public.leads l ON l.id = i.lead_id
WHERE a.has_stacked_area
ORDER BY i.updated_at DESC;

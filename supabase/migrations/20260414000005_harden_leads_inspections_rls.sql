-- Harden RLS on leads, inspections, inspection_areas with role-scoped policies.
-- Pattern matches the photos RLS fix (20260414000003).
-- Admins: full access via is_admin()
-- Technicians: access only to leads they're assigned to (and cascading children)

-- LEADS
DROP POLICY IF EXISTS authenticated_select_leads ON public.leads;
DROP POLICY IF EXISTS authenticated_update_leads ON public.leads;
DROP POLICY IF EXISTS authenticated_delete_leads ON public.leads;

CREATE POLICY admin_all_leads ON public.leads
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY tech_select_assigned_leads ON public.leads
  FOR SELECT TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY tech_update_assigned_leads ON public.leads
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Keep: allow_public_insert_leads (website form) and authenticated_insert_leads (admin create)

-- INSPECTIONS
DROP POLICY IF EXISTS authenticated_select_inspections ON public.inspections;
DROP POLICY IF EXISTS authenticated_insert_inspections ON public.inspections;
DROP POLICY IF EXISTS authenticated_update_inspections ON public.inspections;
DROP POLICY IF EXISTS authenticated_delete_inspections ON public.inspections;

CREATE POLICY admin_all_inspections ON public.inspections
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY tech_select_own_inspections ON public.inspections
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = inspections.lead_id AND l.assigned_to = auth.uid()));

CREATE POLICY tech_insert_own_inspections ON public.inspections
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = inspections.lead_id AND l.assigned_to = auth.uid()));

CREATE POLICY tech_update_own_inspections ON public.inspections
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = inspections.lead_id AND l.assigned_to = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = inspections.lead_id AND l.assigned_to = auth.uid()));

-- INSPECTION_AREAS
DROP POLICY IF EXISTS authenticated_all_inspection_areas ON public.inspection_areas;

CREATE POLICY admin_all_inspection_areas ON public.inspection_areas
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY tech_all_own_inspection_areas ON public.inspection_areas
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.inspections i
    JOIN public.leads l ON l.id = i.lead_id
    WHERE i.id = inspection_areas.inspection_id AND l.assigned_to = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.inspections i
    JOIN public.leads l ON l.id = i.lead_id
    WHERE i.id = inspection_areas.inspection_id AND l.assigned_to = auth.uid()
  ));

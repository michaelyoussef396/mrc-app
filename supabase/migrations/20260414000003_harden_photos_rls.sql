-- Harden photos RLS: replace blanket authenticated_all_photos with role-scoped policies.
-- Pattern matches job_completions RLS (uses the existing is_admin() helper).
-- Admins: full access. Technicians: photos on inspections for their assigned leads,
-- OR photos on job completions they completed.

DROP POLICY IF EXISTS authenticated_all_photos ON public.photos;

-- Admin: full access to all photos
CREATE POLICY admin_all_photos ON public.photos
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Technician SELECT: photos on inspections for their assigned leads,
-- OR photos on job completions they completed.
CREATE POLICY tech_select_photos ON public.photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.leads l ON l.id = i.lead_id
      WHERE i.id = photos.inspection_id
        AND l.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.job_completions jc
      WHERE jc.id = photos.job_completion_id
        AND jc.completed_by = auth.uid()
    )
  );

-- Technician INSERT: can upload a photo linked to their inspection or their job completion.
CREATE POLICY tech_insert_photos ON public.photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.leads l ON l.id = i.lead_id
      WHERE i.id = photos.inspection_id
        AND l.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.job_completions jc
      WHERE jc.id = photos.job_completion_id
        AND jc.completed_by = auth.uid()
    )
  );

-- Technician UPDATE: can modify photos they have access to
-- (used for before-photo toggle: sets job_completion_id + photo_category).
CREATE POLICY tech_update_photos ON public.photos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.leads l ON l.id = i.lead_id
      WHERE i.id = photos.inspection_id
        AND l.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.job_completions jc
      WHERE jc.id = photos.job_completion_id
        AND jc.completed_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.leads l ON l.id = i.lead_id
      WHERE i.id = photos.inspection_id
        AND l.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.job_completions jc
      WHERE jc.id = photos.job_completion_id
        AND jc.completed_by = auth.uid()
    )
  );

-- Technician DELETE: can delete photos they have access to
-- (used by Section 4 delete button on after/demolition photos).
CREATE POLICY tech_delete_photos ON public.photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.leads l ON l.id = i.lead_id
      WHERE i.id = photos.inspection_id
        AND l.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.job_completions jc
      WHERE jc.id = photos.job_completion_id
        AND jc.completed_by = auth.uid()
    )
  );

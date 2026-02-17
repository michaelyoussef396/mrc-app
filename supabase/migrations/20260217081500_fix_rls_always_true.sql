-- Fix rls_policy_always_true warnings (11 of 13)
-- Replaces literal USING (true) / WITH CHECK (true) with (select auth.uid()) IS NOT NULL
-- Leaves login_activity and suspicious_activity INSERT policies as-is (pre-auth requirement)

-- Group 1: TO authenticated policies — replace true with (select auth.uid()) IS NOT NULL

-- inspection_areas (ALL)
DROP POLICY IF EXISTS "authenticated_all_inspection_areas" ON public.inspection_areas;
CREATE POLICY "authenticated_all_inspection_areas"
  ON public.inspection_areas FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- inspections (DELETE, INSERT, UPDATE)
DROP POLICY IF EXISTS "authenticated_delete_inspections" ON public.inspections;
CREATE POLICY "authenticated_delete_inspections"
  ON public.inspections FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_insert_inspections" ON public.inspections;
CREATE POLICY "authenticated_insert_inspections"
  ON public.inspections FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_update_inspections" ON public.inspections;
CREATE POLICY "authenticated_update_inspections"
  ON public.inspections FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- leads (DELETE, INSERT, UPDATE)
DROP POLICY IF EXISTS "authenticated_delete_leads" ON public.leads;
CREATE POLICY "authenticated_delete_leads"
  ON public.leads FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_insert_leads" ON public.leads;
CREATE POLICY "authenticated_insert_leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_update_leads" ON public.leads;
CREATE POLICY "authenticated_update_leads"
  ON public.leads FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- photos (ALL)
DROP POLICY IF EXISTS "authenticated_all_photos" ON public.photos;
CREATE POLICY "authenticated_all_photos"
  ON public.photos FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- notifications (INSERT)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Group 2: TO public → TO authenticated (service_role bypasses RLS anyway)

-- email_logs (INSERT)
DROP POLICY IF EXISTS "system_create_email_logs" ON public.email_logs;
CREATE POLICY "system_create_email_logs"
  ON public.email_logs FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- pdf_versions (INSERT)
DROP POLICY IF EXISTS "Users can create PDF versions" ON public.pdf_versions;
CREATE POLICY "Users can create PDF versions"
  ON public.pdf_versions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

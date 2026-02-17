-- Migration: Fix auth_rls_initplan warnings + deduplicate overlapping policies
-- Wraps auth.uid()/auth.role() in (select ...) for query planner optimization
-- Merges duplicate SELECT policies on login_activity and suspicious_activity
-- Drops redundant policies on notifications and app_settings

-- ============================================================================
-- activities: fix auth.role() → (select auth.role())
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can view activities" ON public.activities;
CREATE POLICY "All authenticated users can view activities"
  ON public.activities FOR SELECT TO public
  USING ((select auth.role()) = 'authenticated'::text);

DROP POLICY IF EXISTS "Authenticated users can create activities" ON public.activities;
CREATE POLICY "Authenticated users can create activities"
  ON public.activities FOR INSERT TO public
  WITH CHECK ((select auth.role()) = 'authenticated'::text);

-- ============================================================================
-- app_settings: drop redundant SELECT policy, fix ALL policy
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_read_app_settings" ON public.app_settings;

DROP POLICY IF EXISTS "authenticated_manage_app_settings" ON public.app_settings;
CREATE POLICY "authenticated_manage_app_settings"
  ON public.app_settings FOR ALL TO public
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- audit_logs: fix auth.uid() in both policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs FOR INSERT TO public
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = ANY (ARRAY['admin'::text, 'developer'::text])
    )
  );

-- ============================================================================
-- calendar_bookings: fix auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_full_access_bookings" ON public.calendar_bookings;
CREATE POLICY "authenticated_full_access_bookings"
  ON public.calendar_bookings FOR ALL TO public
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- editable_fields: fix auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_view_editable_fields" ON public.editable_fields;
CREATE POLICY "authenticated_view_editable_fields"
  ON public.editable_fields FOR SELECT TO public
  USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- email_logs: fix auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_read_email_logs" ON public.email_logs;
CREATE POLICY "authenticated_read_email_logs"
  ON public.email_logs FOR SELECT TO public
  USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- login_activity: merge user + admin SELECT into one policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own login activity" ON public.login_activity;
DROP POLICY IF EXISTS "Admins can view all login activity" ON public.login_activity;
CREATE POLICY "Users and admins can view login activity"
  ON public.login_activity FOR SELECT TO public
  USING ((select auth.uid()) = user_id OR (select public.is_admin()));

-- ============================================================================
-- moisture_readings: fix auth.role()
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can manage moisture readings" ON public.moisture_readings;
CREATE POLICY "All authenticated users can manage moisture readings"
  ON public.moisture_readings FOR ALL TO public
  USING ((select auth.role()) = 'authenticated'::text);

-- ============================================================================
-- notifications: drop duplicate INSERT, fix user policies
-- ============================================================================

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- profiles: fix auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO public
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO public
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO public
  USING ((select auth.uid()) = id);

-- ============================================================================
-- subfloor_data: fix auth.role()
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can manage subfloor data" ON public.subfloor_data;
CREATE POLICY "All authenticated users can manage subfloor data"
  ON public.subfloor_data FOR ALL TO public
  USING ((select auth.role()) = 'authenticated'::text);

-- ============================================================================
-- subfloor_readings: fix auth.role()
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can manage subfloor readings" ON public.subfloor_readings;
CREATE POLICY "All authenticated users can manage subfloor readings"
  ON public.subfloor_readings FOR ALL TO public
  USING ((select auth.role()) = 'authenticated'::text);

-- ============================================================================
-- suspicious_activity: merge user + admin SELECT, fix admin UPDATE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own suspicious activity" ON public.suspicious_activity;
DROP POLICY IF EXISTS "Admins can view all suspicious activity" ON public.suspicious_activity;
CREATE POLICY "Users and admins can view suspicious activity"
  ON public.suspicious_activity FOR SELECT TO public
  USING ((select auth.uid()) = user_id OR (select public.is_admin()));

-- ============================================================================
-- user_devices: fix auth.uid() on all 4 policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own devices" ON public.user_devices;
CREATE POLICY "Users can view own devices"
  ON public.user_devices FOR SELECT TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own devices" ON public.user_devices;
CREATE POLICY "Users can insert own devices"
  ON public.user_devices FOR INSERT TO public
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own devices" ON public.user_devices;
CREATE POLICY "Users can update own devices"
  ON public.user_devices FOR UPDATE TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own devices" ON public.user_devices;
CREATE POLICY "Users can delete own devices"
  ON public.user_devices FOR DELETE TO public
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- user_roles: fix auth.uid()
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO public
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- user_sessions: fix auth.uid() on all 3 policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions FOR INSERT TO public
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE TO public
  USING ((select auth.uid()) = user_id);

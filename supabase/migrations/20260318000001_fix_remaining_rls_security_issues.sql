-- Fix 4 remaining RLS security issues flagged by Supabase linter
-- Follows up on 20260217081500_fix_rls_always_true.sql which fixed 11/13

-- 1. DROP unused debug_logs table (no codebase references, no migration, no RLS)
DROP TABLE IF EXISTS public.debug_logs;

-- 2. Tighten error_logs INSERT (was WITH CHECK (true) for authenticated)
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON public.error_logs;
CREATE POLICY "Authenticated users can insert own error logs"
  ON public.error_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Fix login_activity INSERT (was WITH CHECK (true) for public/anon)
DROP POLICY IF EXISTS "Anyone can insert login activity" ON public.login_activity;
DROP POLICY IF EXISTS "Service role can insert login activity" ON public.login_activity;

-- Anon: only failed login attempts with constraints
CREATE POLICY "Anon can insert failed login attempts"
  ON public.login_activity FOR INSERT TO anon
  WITH CHECK (
    success = false
    AND user_id IS NULL
    AND email IS NOT NULL
    AND length(email) <= 255
  );

-- Authenticated: can insert own login records
CREATE POLICY "Authenticated users can insert own login activity"
  ON public.login_activity FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. Fix suspicious_activity INSERT (was WITH CHECK (true) for public/anon)
DROP POLICY IF EXISTS "Anyone can insert suspicious activity" ON public.suspicious_activity;
DROP POLICY IF EXISTS "Service role can insert suspicious activity" ON public.suspicious_activity;

CREATE POLICY "Authenticated users can insert own suspicious activity"
  ON public.suspicious_activity FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

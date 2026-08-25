-- =============================================================================
-- get_staff_names — author-name resolution for lead_notes                    [02]
--
-- STATUS: APPLIED to PROD (ecyivrxjpsmjmexqatym) 2026-08-26 via
--   `npx supabase db query --linked -f` on Michael's explicit approval of
--   this file. Saved for the record; NOT registered in migration history
--   (no `migration repair`). Verified live afterwards: SECURITY DEFINER,
--   search_path '', STABLE, anon EXECUTE = false, authenticated = true
--   (service_role also holds EXECUTE from pg_default_acl — harmless, it
--   bypasses RLS anyway and auth.uid() is NULL for it).
-- ROLLBACK (manual, only on explicit instruction):
--   BEGIN; DROP FUNCTION public.get_staff_names(uuid[]); COMMIT;
--
-- *** Was OUTSIDE the "lead_notes table only" authorisation — approved separately ***
--
-- Why it exists: public.profiles RLS is SELECT own-row-only (live 2026-08-25:
-- "Users can view their own profile" USING (auth.uid() = id); no admin read
-- policy). A FK embed or a .in('id', ...) lookup from the client therefore
-- returns NULL for every author except the caller — for admins too (the
-- existing useActivityTimeline.ts:134-137 lookup already behaves this way).
-- Part 2 must resolve author_id -> name without storing a name string, so it
-- needs a narrow read path: id + full_name only, staff callers only, staff
-- targets only. Mirrors the live has_role / is_admin / get_user_roles_by_id
-- SECURITY DEFINER style (STABLE, SET search_path = '', schema-qualified).
--
-- Honest scope note: staff ids are already discoverable by any signed-in
-- user via public.user_roles (SELECT USING (true)), so this is a
-- name-resolution path, not a secrecy boundary. It exposes nothing beyond
-- id + full_name of users who hold a role.
-- =============================================================================

BEGIN;

-- CREATE (not OR REPLACE): no such function exists live; fail loudly if it does.
CREATE FUNCTION public.get_staff_names(p_user_ids uuid[])
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM public.user_roles cr WHERE cr.user_id = (SELECT auth.uid()))  -- caller is staff
    AND p.id = ANY (p_user_ids)
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)                 -- target is staff
$$;

COMMENT ON FUNCTION public.get_staff_names(uuid[]) IS
  'Resolve staff user ids to display names (id, full_name only). SECURITY DEFINER to read through the own-row-only profiles policy; caller must hold a role in user_roles; returns only users who hold a role.';

-- pg_default_acl regrants anon EXECUTE on every new public function at
-- creation time (verified live). Revoke explicitly, then grant the app role.
-- service_role is deliberately not granted: under a service_role JWT
-- auth.uid() is NULL (the caller-is-staff gate returns nothing) and
-- service_role can read profiles directly anyway.
REVOKE EXECUTE ON FUNCTION public.get_staff_names(uuid[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_staff_names(uuid[]) TO authenticated;

COMMIT;

-- =============================================================================
-- VERIFICATION — run after applying (read-only; one statement each)
-- =============================================================================
-- V1. anon cannot execute (expect false)
-- SELECT has_function_privilege('anon', 'public.get_staff_names(uuid[])', 'EXECUTE');
--
-- V2. Definer + search_path + ACL (expect prosecdef = true, proconfig = {search_path=},
--     proacl with authenticated=X and NO "=X/" (PUBLIC) or "anon=X" entry)
-- SELECT prosecdef, proconfig, proacl::text FROM pg_proc WHERE oid = 'public.get_staff_names(uuid[])'::regprocedure;
--
-- V3. Grantees (expect authenticated + postgres only)
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
--  WHERE specific_schema = 'public' AND routine_name = 'get_staff_names' ORDER BY grantee;

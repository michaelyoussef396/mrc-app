-- =====================================================================
-- lead_notes Phase 2 (File C of 3) — notification RPCs
--
-- STATUS: APPLIED to PROD (ecyivrxjpsmjmexqatym) 2026-08-26 via
--         `npx supabase db query --linked -f`
--         NOT registered in migration history (no `migration repair`).
--         Never `db push`, `db reset` or `migration repair`.
--
-- Apply order: A (tables) -> B (storage) -> C (this file).
--
-- ROLLBACK:
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.add_lead_note_mentions(uuid, uuid[]);
--   DROP FUNCTION IF EXISTS public.notify_users(uuid[], text, text, text, uuid, text, jsonb, text, uuid);
--   COMMIT;
--
-- MANDATORY on every SECURITY DEFINER function here:
--   REVOKE EXECUTE ... FROM PUBLIC, anon;  -- pg_default_acl silently grants
--                                          -- anon EXECUTE at creation time
--   GRANT  EXECUTE ... TO authenticated;
-- Both signatures list ALL parameters including defaulted ones, or the
-- REVOKE/GRANT would not match the registered function.
--
-- EXCEPTION — notify_users is NOT granted to authenticated. It has no client
-- caller: add_lead_note_mentions is SECURITY DEFINER owned by postgres, so it
-- invokes notify_users as postgres and is unaffected by the grant. Leaving the
-- grant in place would let any signed-in staff member push a notification with
-- an arbitrary title, message, type and priority into any other staff member's
-- feed — a spoofing surface with nothing using it. Revoked on PROD 2026-08-26
-- and verified: has_function_privilege('authenticated', ...) = false, while
-- add_lead_note_mentions still returns notified=1 end to end.
-- =====================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- ---------------------------------------------------------------------
-- SECTION 5 — public.notify_users : single-recipient notifications
--
-- fan_out_notification(p_roles text[]) is role-only — it has no user_id
-- parameter and writes one row per holder of a role. It cannot address one
-- person, so a mention needs this.
--
-- action_url is computed PER RECIPIENT, server-side and authoritative:
-- admins get /leads/:id, technicians get /technician/job/:id. The existing
-- buildLeadDetailPath hardcodes /leads/, and /leads/:id is allowedRoles
-- ["admin"] — a technician clicking it is hard-redirected to "/".
-- Verified live: 0 staff hold neither admin nor technician, so the ELSE NULL
-- branch is unreachable today and degrades to "no link", never a broken link.
--
-- *** CALLERS MUST NOT PASS PROTECTED CONTENT IN p_title / p_message. ***
-- This function is SECURITY DEFINER and therefore bypasses RLS. Live leads
-- RLS is admin_all_leads (is_admin()) OR tech_select_assigned_leads
-- (assigned_to = auth.uid()), so a technician can only read leads assigned to
-- them. Anything embedded in the notification body is readable by the
-- recipient regardless of whether they can see the underlying lead — the
-- notification row is gated only by notifications.user_id = auth.uid().
-- Pass identifiers (p_lead_id, p_related_entity_id) and let the client fetch
-- the detail through RLS. See add_lead_note_mentions below for the pattern.
-- ---------------------------------------------------------------------
CREATE FUNCTION public.notify_users(
  p_user_ids            uuid[],
  p_type                text,
  p_title               text,
  p_message             text,
  p_lead_id             uuid    DEFAULT NULL,
  p_priority            text    DEFAULT 'normal',
  p_metadata            jsonb   DEFAULT NULL,
  p_related_entity_type text    DEFAULT NULL,
  p_related_entity_id   uuid    DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_count integer;
BEGIN
  -- SECURITY DEFINER can address anyone, so gate on the caller being staff.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'notify_users: caller is not staff';
  END IF;

  INSERT INTO public.notifications (
    user_id, type, title, message, lead_id, action_url, priority, metadata,
    related_entity_type, related_entity_id, is_read
  )
  SELECT
    t.user_id,
    LEFT(p_type, 50),
    LEFT(p_title, 255),
    p_message,
    p_lead_id,
    CASE
      WHEN p_lead_id IS NULL THEN NULL
      WHEN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = t.user_id AND r.name = 'admin'
      ) THEN '/leads/' || p_lead_id::text
      WHEN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = t.user_id AND r.name = 'technician'
      ) THEN '/technician/job/' || p_lead_id::text
      ELSE NULL
    END,
    LEFT(COALESCE(p_priority, 'normal'), 20),
    COALESCE(p_metadata, '{}'::jsonb),
    p_related_entity_type,
    p_related_entity_id,
    false
  FROM (SELECT DISTINCT t0.user_id FROM unnest(p_user_ids) AS t0(user_id)) t
  WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

COMMENT ON FUNCTION public.notify_users(uuid[], text, text, text, uuid, text, jsonb, text, uuid) IS
  'Addresses a notification to specific users with a per-recipient, role-aware action_url. Complements fan_out_notification, which is role-only. SECURITY DEFINER: callers must pass identifiers, never RLS-protected content, in p_title/p_message.';

REVOKE EXECUTE ON FUNCTION public.notify_users(uuid[], text, text, text, uuid, text, jsonb, text, uuid) FROM PUBLIC, anon;
-- Deliberately NOT granted to authenticated — see the EXCEPTION note in the
-- header. Only postgres (via the SECURITY DEFINER caller below) and
-- service_role can execute this.
REVOKE EXECUTE ON FUNCTION public.notify_users(uuid[], text, text, text, uuid, text, jsonb, text, uuid) FROM authenticated;

-- ---------------------------------------------------------------------
-- SECTION 6 — public.add_lead_note_mentions
--
-- One round trip: persist the linkage AND notify, atomically. SECURITY
-- DEFINER because lead_note_mentions has no INSERT policy; authorship is
-- validated here instead, so nobody can attach mentions to someone else's note.
-- Slack is posted by the client afterwards via the existing
-- sendSlackNotification({ event: 'custom' }) helper — one post per note, not
-- one per mentioned person.
--
-- *** The notification carries NO note body and NO customer name. ***
-- An admin can mention a technician on a lead that is not assigned to them.
-- Live leads RLS (tech_select_assigned_leads: assigned_to = auth.uid()) means
-- that technician cannot read the lead or the note — but a notification row is
-- gated only by its own user_id, so any content embedded here would be handed
-- straight past the lead's RLS. The row therefore carries only identifiers;
-- the client renders the preview by reading the note through RLS, which
-- returns nothing for a recipient who is not entitled to it.
-- ---------------------------------------------------------------------
CREATE FUNCTION public.add_lead_note_mentions(
  p_note_id  uuid,
  p_user_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_lead_id     uuid;
  v_author_id   uuid;
  v_author_name text;
  v_inserted    uuid[];
  v_count       integer;
BEGIN
  SELECT n.lead_id, n.author_id
    INTO v_lead_id, v_author_id
  FROM public.lead_notes n
  WHERE n.id = p_note_id AND n.deleted_at IS NULL;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'add_lead_note_mentions: note % not found or deleted', p_note_id;
  END IF;

  IF v_author_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'add_lead_note_mentions: only the note author may add mentions';
  END IF;

  -- Staff-only targets; never mention yourself; ignore duplicates.
  -- The profiles guard matters: mentioned_user_id is FK'd to profiles but the
  -- staff test reads user_roles, and a user_roles row without a profiles row
  -- would abort the whole RPC with 23503 and silently lose every mention.
  -- The CTE captures ONLY the rows actually inserted by this call, so calling
  -- twice never re-notifies someone already mentioned on this note.
  WITH ins AS (
    INSERT INTO public.lead_note_mentions (note_id, lead_id, mentioned_user_id)
    SELECT p_note_id, v_lead_id, t.user_id
    FROM (SELECT DISTINCT t0.user_id FROM unnest(p_user_ids) AS t0(user_id)) t
    WHERE t.user_id <> v_author_id
      AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.user_id)
      AND EXISTS (SELECT 1 FROM public.profiles  p  WHERE p.id      = t.user_id)
    ON CONFLICT (note_id, mentioned_user_id) DO NOTHING
    RETURNING mentioned_user_id
  )
  SELECT array_agg(ins.mentioned_user_id) INTO v_inserted FROM ins;

  IF v_inserted IS NULL THEN
    RETURN 0;
  END IF;

  SELECT p.full_name INTO v_author_name FROM public.profiles p WHERE p.id = v_author_id;

  v_count := public.notify_users(
    p_user_ids            => v_inserted,
    p_type                => 'note_mention',
    p_title               => COALESCE(v_author_name, 'Someone') || ' mentioned you in a note',
    p_message             => 'You were mentioned in an internal note. Open the lead to read it.',
    p_lead_id             => v_lead_id,
    p_priority            => 'high',
    p_related_entity_type => 'lead_note',
    p_related_entity_id   => p_note_id
  );

  RETURN v_count;
END;
$function$;

COMMENT ON FUNCTION public.add_lead_note_mentions(uuid, uuid[]) IS
  'Persists @mention linkage for a lead note and notifies each mentioned staff member. Author-only. Notification carries identifiers only, never the note body or customer name. NEVER customer-visible.';

REVOKE EXECUTE ON FUNCTION public.add_lead_note_mentions(uuid, uuid[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_lead_note_mentions(uuid, uuid[]) TO authenticated;

COMMIT;

-- =====================================================================
-- VERIFICATION (read-only; run after apply)
--
-- V5  *** anon has EXECUTE on nothing new *** (must still be 18)
--   SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND has_function_privilege('anon', p.oid, 'EXECUTE');
--
-- V12 notify_users is reachable ONLY by postgres and service_role
--     (authenticated and anon must both be false; expected end-state ACL is
--      {postgres=X/postgres,service_role=X/postgres})
--   SELECT
--     has_function_privilege('authenticated','public.notify_users(uuid[], text, text, text, uuid, text, jsonb, text, uuid)','EXECUTE') AS authenticated,
--     has_function_privilege('anon','public.notify_users(uuid[], text, text, text, uuid, text, jsonb, text, uuid)','EXECUTE') AS anon,
--     has_function_privilege('postgres','public.notify_users(uuid[], text, text, text, uuid, text, jsonb, text, uuid)','EXECUTE') AS postgres;
--
-- V13 add_lead_note_mentions is STILL reachable by authenticated (must be true)
--   SELECT has_function_privilege('authenticated','public.add_lead_note_mentions(uuid, uuid[])','EXECUTE');
--
-- V8  function security + ACL (prosecdef true, no anon in proacl)
--   SELECT proname, prosecdef, proconfig::text, proacl::text
--   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND proname IN ('notify_users','add_lead_note_mentions');
-- =====================================================================

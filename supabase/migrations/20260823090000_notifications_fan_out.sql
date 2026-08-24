-- ============================================================================
-- APPLIED MIGRATION — DO NOT RE-APPLY
-- 20260823090000_notifications_fan_out.sql
--
-- STATUS: APPLIED to PROD (ecyivrxjpsmjmexqatym) on 23 Aug 2026, pasted
-- manually in Supabase Studio per this project's standing rule (no auto-apply
-- migrations — CLAUDE.md "Database" section / memory
-- feedback_no_auto_apply_migrations.md). The CLI's migration history was
-- repaired the same day with
-- `npx supabase migration repair --status applied 20260823090000 --linked`,
-- so a future `db push` will not try to re-run it. Do not re-apply.
--
-- PURPOSE
-- -------
-- Adds a second, additive notification channel alongside the existing Slack
-- posts: an in-app `notifications` row for every admin/technician, fanned out
-- from one SECURITY DEFINER RPC. Nothing here changes what Slack receives —
-- every existing Slack call, payload, template and guard in this codebase
-- stays byte-identical. This migration only gives callers (Edge Functions,
-- the email_logs trigger, and — in a later change owned elsewhere — direct
-- frontend actions) a second place to write to.
--
-- SECTION 1 creates `public.fan_out_notification(...)`, a single INSERT ...
-- SELECT that writes one notification per user holding any of the given
-- roles (default: admin + technician).
--
-- SECTION 2 replaces the body of `public.email_logs_notify_slack()` to add
-- ONE additional call to the new RPC for the email-sent / email-failed
-- events, alongside its existing Slack post. The Slack net.http_post call,
-- the Vault lookup, the system-send suppression filter (added
-- 20260813115000) and the EXCEPTION handler are copied VERBATIM from that
-- migration — see the "VERBATIM" marker below for the one addition.
--
-- WHY A NEW RPC INSTEAD OF A DIRECT INSERT AT EACH CALL SITE
-- ------------------------------------------------------------
-- The callers that need this — receive-framer-lead (unauthenticated),
-- check-overdue-invoices (pg_cron, no JWT), and the email_logs DB trigger
-- (no auth.uid() either) — have no session to satisfy the existing
-- notifications RLS INSERT policy's `auth.uid() IS NOT NULL` check, and none
-- of them can enumerate "every admin and technician user_id" without first
-- querying user_roles themselves. A technician session has the same
-- enumeration problem even when authenticated: RLS scopes normal SELECT
-- access to that technician's own rows, not the full user_roles table.
-- SECURITY DEFINER + a pinned search_path solves every one of these origins
-- in one place, without touching a single RLS policy (out of scope for this
-- migration — Path A was chosen specifically because it needs none).
--
-- ASSUMPTIONS
-- -----------
--   1. DISTINCT on the SELECT dedupes a user who holds more than one target
--      role (e.g. a user in both 'admin' and 'technician') down to one
--      notification row instead of one per role.
--   2. is_read is set to `false` explicitly rather than relied upon as a
--      column default — the live column's actual DEFAULT is unattested (see
--      20260821000000_reconcile_notifications_schema_drift.sql, which
--      documents this table's schema as reconstructed from drift, not from
--      a CREATE TABLE this repo controls).
--   3. LEFT(p_type, 50), LEFT(p_title, 255), LEFT(p_priority, 20) guard
--      against a silent 22001 "value too long" error if any of these three
--      columns are the VARCHAR(n) the reconciliation migration could not
--      confirm (Json-typed generated columns render identically for
--      TEXT/VARCHAR(n)/UUID — see that migration's assumption #4). `message`
--      and `metadata` are not LEFT()-guarded: this project's convention is
--      TEXT for unbounded content (CLAUDE.md "Text fields") and JSONB has no
--      length limit to guard against.
--   4. LIVE-MODEL NOTE (read before applying): `public.roles` /
--      `public.user_roles.role_id` — a roles-table + join-table model — is
--      the LIVE PROD role model. This is attested by two independent
--      sources: the generated `src/integrations/supabase/types.ts` (its
--      `roles` block at line ~1784 and `user_roles` block at line ~1985,
--      with `user_roles_role_id_fkey` referencing `roles.id`), and working
--      production code that queries exactly this shape
--      (`src/hooks/useTechnicians.ts:91-114`, `.from('roles').select('id')
--      .eq('name','technician')` then `.from('user_roles')
--      .select('user_id').eq('role_id', technicianRoleId)`). This repo's
--      OWN recorded migration history tells a different, stale story:
--      `20251028135212_...sql:14,120,123` defines `user_roles.role app_role`
--      (a single enum column, no `roles` table, no `role_id` at all) and no
--      migration anywhere in this repo contains `CREATE TABLE public.roles`.
--      Exactly like `public.notifications` (reconciled in
--      20260821000000), `public.roles` and the `user_roles.role_id` join
--      shape reached PROD via unrecorded Studio SQL. CONSEQUENCE: a fresh
--      database built from only this repo's migrations will create
--      `fan_out_notification` successfully (the function body only
--      references `public.roles` / `public.user_roles.role_id` by name, not
--      by a compile-time dependency), but every CALL will fail at runtime
--      with "relation public.roles does not exist" or a role_id column
--      error until that database's role tables are reconciled to the live
--      shape — the same class of gap 20260821000000 closed for
--      notifications, not yet closed here for roles/user_roles.
--
-- SAFETY
-- ------
-- Section 1 is CREATE OR REPLACE — no-op-safe to re-run, and creates
-- nothing that did not exist before (this function does not exist on PROD
-- today; there is no drift to reconcile for it). Section 2 is also
-- CREATE OR REPLACE and changes ONLY the function body of
-- `email_logs_notify_slack` — no table, column, index, RLS policy, or
-- trigger binding is touched, matching the scope discipline of
-- 20260813115000 (which this section extends, not replaces).
--
-- ROLLBACK (manual, keep commented for reference):
--   DROP FUNCTION IF EXISTS public.fan_out_notification(
--     text, text, text, text[], uuid, text, text, jsonb, text, uuid);
--   -- Section 2 rollback: re-apply the body from
--   -- 20260813115000_email_logs_slack_suppress_system_sends.sql verbatim
--   -- (CREATE OR REPLACE FUNCTION public.email_logs_notify_slack() with that
--   -- file's exact body) to remove the PERFORM added below. The trigger
--   -- binding (email_logs_after_insert_slack) is untouched either way, so no
--   -- rollback step is needed for it.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- SECTION 1: public.fan_out_notification
--
-- One INSERT ... SELECT DISTINCT per call: writes a notifications row for
-- every user holding any role in p_roles (default admin + technician).
-- Returns the number of rows inserted so a caller can log/skip on 0.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fan_out_notification(
  p_type text,
  p_title text,
  p_message text,
  p_roles text[] DEFAULT ARRAY['admin', 'technician'],
  p_lead_id uuid DEFAULT NULL,
  p_action_url text DEFAULT NULL,
  p_priority text DEFAULT 'normal',
  p_metadata jsonb DEFAULT NULL,
  p_related_entity_type text DEFAULT NULL,
  p_related_entity_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message, lead_id, action_url, priority, metadata,
    related_entity_type, related_entity_id, is_read
  )
  SELECT DISTINCT
    ur.user_id,
    LEFT(p_type, 50),
    LEFT(p_title, 255),
    p_message,
    p_lead_id,
    p_action_url,
    LEFT(COALESCE(p_priority, 'normal'), 20),
    p_metadata,
    p_related_entity_type,
    p_related_entity_id,
    false
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.name = ANY(p_roles);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.fan_out_notification(
  text, text, text, text[], uuid, text, text, jsonb, text, uuid
) IS
  'Writes one public.notifications row per distinct user holding any role in '
  'p_roles (default admin+technician). SECURITY DEFINER so unauthenticated '
  'and system-originated callers (webhooks, pg_cron, DB triggers) can reach '
  'it without any RLS policy change. See 20260823090000_notifications_fan_out.sql '
  'for the LIVE-MODEL NOTE on public.roles / user_roles.role_id.';

-- Same posture as the audited_* RPCs (20260709120000): SECURITY DEFINER
-- functions default to PUBLIC EXECUTE, which anon inherits. This function
-- takes an arbitrary p_roles array and would let anon spam every admin and
-- technician's notification feed if left open.
REVOKE EXECUTE ON FUNCTION public.fan_out_notification(
  text, text, text, text[], uuid, text, text, jsonb, text, uuid
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.fan_out_notification(
  text, text, text, text[], uuid, text, text, jsonb, text, uuid
) TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- SECTION 2: public.email_logs_notify_slack — additive fan-out call
--
-- Body copied VERBATIM from 20260813115000_email_logs_slack_suppress_system_
-- sends.sql (the Slack net.http_post, Vault lookup, system-send suppression
-- filter, and EXCEPTION handler are byte-identical to that file). The ONLY
-- change is one PERFORM added after the Slack post, marked "ADDED
-- 2026-08-23" below.
--
-- Placed AFTER net.http_post so a fan-out failure can never prevent the
-- Slack post that already succeeded, and BEFORE the explicit RETURN NEW so
-- it still runs on every non-suppressed path. It needs no EXCEPTION block of
-- its own: the function's single EXCEPTION WHEN OTHERS already wraps the
-- entire body (Slack post included), so a fan-out error is caught the same
-- way a Slack error already is — logged via RAISE WARNING, RETURN NEW still
-- fires, and the email_logs INSERT that fired this trigger is never rolled
-- back.
--
-- Trigger binding (email_logs_after_insert_slack, created in
-- 20260527023540) is NOT re-stated here, matching 20260813115000's own
-- precedent: CREATE OR REPLACE FUNCTION only replaces the function body: an
-- existing trigger already bound to this function name picks up the new
-- body automatically. Re-stating CREATE TRIGGER would double-bind.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.email_logs_notify_slack()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  _label TEXT;
  _msg TEXT;
  _secret TEXT;
BEGIN
  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'internal_webhook_secret';

  IF _secret IS NULL THEN
    RAISE WARNING 'email_logs_notify_slack: internal_webhook_secret not found in Vault';
    RETURN NEW;
  END IF;

  -- ADDED 2026-08-13 — system-originated sends are logged, not announced.
  -- Success is noise (the lead already produced its own Slack post, and the
  -- record is the email_logs row itself); failure still posts below.
  IF NEW.template_name IN ('framer_lead_confirmation', 'inspection_reminder')
     AND NEW.status <> 'failed' THEN
    RETURN NEW;
  END IF;

  _label := CASE NEW.template_name
    WHEN 'report-approved'           THEN 'Inspection report'
    WHEN 'job_report_sent'           THEN 'Job report'
    WHEN 'booking-confirmation'      THEN 'Booking confirmation'
    WHEN 'job-booking-confirmation'  THEN 'Job booking confirmation'
    WHEN 'google_review_request'     THEN 'Google review request'
    WHEN 'inspection_reminder'       THEN 'Inspection reminder'
    WHEN 'framer_lead_confirmation'  THEN 'Lead confirmation'
    ELSE COALESCE(NEW.template_name, 'Email')
  END;

  IF NEW.status = 'failed' THEN
    _msg := _label || ' FAILED | '
      || COALESCE(NEW.recipient_email, '?')
      || COALESCE(' | ' || LEFT(NEW.error_message, 150), '');
  ELSE
    _msg := _label || ' sent | '
      || COALESCE(NEW.recipient_email, '?');
  END IF;

  -- apikey header is required by the Supabase API gateway for project
  -- routing, even with verify_jwt=false. This is the publishable anon
  -- key (already public in every client bundle).
  PERFORM net.http_post(
    url := 'https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-slack-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjeWl2cnhqcHNtam1leHFhdHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODQwNTgsImV4cCI6MjA4MDg0NDA1OH0.Koy5QOR5uAMuXEGxtHuDQCJ_gGGcLrGG07bJXkb3EAQ',
      'x-internal-secret', _secret
    ),
    body := jsonb_build_object(
      'event', 'custom',
      'leadId', NEW.lead_id::text,
      'message', _msg
    )
  );

  -- ADDED 2026-08-23 — mirror the Slack post as an in-app notification for
  -- every admin/technician. Same template-suppression semantics as Slack:
  -- this line is unreachable for a suppressed framer_lead_confirmation /
  -- inspection_reminder success, because the RETURN NEW above already exited
  -- the function for that case. type/title/priority mirror _label/_msg
  -- exactly so the in-app copy never says something Slack didn't.
  PERFORM public.fan_out_notification(
    p_type => CASE WHEN NEW.status = 'failed' THEN 'email_failed' ELSE 'email_sent' END,
    p_title => CASE WHEN NEW.status = 'failed' THEN _label || ' FAILED' ELSE _label || ' sent' END,
    p_message => _msg,
    p_lead_id => NEW.lead_id,
    p_priority => CASE WHEN NEW.status = 'failed' THEN 'high' ELSE 'normal' END,
    p_related_entity_type => 'email_log',
    p_related_entity_id => NEW.id
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'email_logs_notify_slack failed: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

-- Verify section 2's addition is present in the live definition (expect 1):
--   SELECT count(*) FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'email_logs_notify_slack'
--     AND pg_get_functiondef(p.oid) LIKE '%ADDED 2026-08-23%';
--
-- Verify the trigger binding is unchanged (expect email_logs_after_insert_slack):
--   SELECT tgname FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid
--   WHERE c.relname = 'email_logs' AND NOT tg.tgisinternal;
--
-- Verify fan_out_notification's grantees (expect authenticated, service_role only):
--   SELECT grantee, privilege_type FROM information_schema.routine_privileges
--   WHERE routine_schema = 'public' AND routine_name = 'fan_out_notification'
--   ORDER BY grantee;

COMMIT;

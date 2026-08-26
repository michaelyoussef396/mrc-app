-- =============================================================================
-- lead_notes — Phase 1 internal notes on a lead (text only)                  [01]
--
-- STATUS: APPLIED to PROD (ecyivrxjpsmjmexqatym) 2026-08-26 via
--   `npx supabase db query --linked -f` on Michael's explicit APPLY (with the
--   DELETE policy/grant removed at his instruction). Saved for the record;
--   NOT registered in migration history (no `migration repair`). Verified
--   live afterwards: 7 columns, RLS on, 3 policies, 0 mention assigned_to,
--   anon no privileges, column grants INSERT(lead_id,author_id,body) /
--   UPDATE(deleted_at) only.
-- ROLLBACK (manual, only on explicit instruction — drops the notes data):
--   BEGIN; DROP TABLE public.lead_notes; COMMIT;
--   (policies, indexes, trigger and grants go with the table; nothing else
--   was altered by this file.)
--
-- Target: PROD ecyivrxjpsmjmexqatym. Applied ONLY on Michael's explicit APPLY,
-- via `npx supabase db query --linked -f <this file>` (executes every statement
-- in the file; verified 2026-08-25). Never `db push`, `db reset` or
-- `migration repair` — migration history is forked 104 files deep.
--
-- Authorisation (2026-08-25): THIS FILE = the lead_notes table only.
-- Author-name resolution (get_staff_names) is a separate file, 02_*, with its
-- own approval — it is NOT part of this transaction.
--
-- Design (recon 2026-08-25, adversarial review 2026-08-26):
--   * Row-per-note table. leads.internal_notes is FROZEN and untouched.
--   * RLS DELEGATES to public.leads' own policies through a plain EXISTS that
--     runs as the caller. Nothing here names assigned_to, so visibility follows
--     whatever leads visibility becomes (assigned_to today; lead_assignments
--     junction later, TODO.md R7) with zero rewrite.
--   * INVARIANT: lead_notes visibility == public.leads SELECT visibility. Any
--     change to a leads SELECT policy is also a change to internal-note
--     exposure and must be reviewed as such. The R7 junction must be enforced
--     as a policy/function on public.leads (not a client-side join) to flow
--     through here.
--   * RLS decides WHO; column privileges decide WHAT. Callers may INSERT only
--     (lead_id, author_id, body) and UPDATE only (deleted_at): body, lead_id
--     and created_at are immutable once written — no edits, no backdating,
--     no re-parenting. Soft delete via deleted_at (photos pattern); no
--     DELETE policy or grant for app roles (decision 2026-08-26).
--   * pg_default_acl (verified live) grants anon/authenticated/service_role
--     ALL on every new public table — SECTION 3 revokes and re-grants narrowly.
--   * Consequence to know: author_id -> profiles(id) is ON DELETE RESTRICT.
--     auth.users -> profiles is ON DELETE CASCADE, so
--     `auth.admin.deleteUser()` (manage-users DELETE, index.ts:399; also
--     Settings > Delete account) will fail with FK 23503 for any staff member
--     who has authored a note. leads.assigned_to / created_by already impose
--     the same block today (both REFERENCES auth.users with no ON DELETE).
--     Deactivate via manage-users is_active instead. Follow-up for TODO.md:
--     map 23503 to a readable message in manage-users.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 1 — table, constraints, indexes, updated_at trigger
-- ---------------------------------------------------------------------------
CREATE TABLE public.lead_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid        NOT NULL REFERENCES public.leads(id)    ON DELETE CASCADE,
  author_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz NULL,
  -- '\S' rejects bodies that are only spaces/tabs/newlines (btrim would only
  -- strip ASCII space). NBSP/zero-width still pass — the client .trim()s too.
  CONSTRAINT lead_notes_body_not_blank CHECK (body ~ '\S'),
  CONSTRAINT lead_notes_body_max_len   CHECK (length(body) <= 10000)
);

COMMENT ON TABLE  public.lead_notes IS
  'Internal staff notes on a lead. NEVER customer-visible (no report, email or PDF may read this table). Append-only feed: body/lead_id/created_at are immutable via column privileges; removal is soft delete via deleted_at.';
COMMENT ON COLUMN public.lead_notes.author_id IS
  'FK to profiles(id) = auth.uid() of the writer. ON DELETE RESTRICT: a staff profile with notes cannot be hard-deleted (attribution is preserved; deactivate via manage-users is_active instead). manage-users DELETE surfaces this as FK 23503.';
COMMENT ON COLUMN public.lead_notes.deleted_at IS
  'Soft delete marker (photos pattern). Readers filter deleted_at IS NULL. Only the author may set it (UPDATE policy + column privilege).';

-- Feed order per lead. Deliberately NOT partial (unlike idx_photos_active):
-- the same index backs the leads -> lead_notes ON DELETE CASCADE lookup,
-- which must find soft-deleted rows too.
CREATE INDEX idx_lead_notes_lead_created ON public.lead_notes (lead_id, created_at DESC);
-- FK column index (profiles RESTRICT check) + backs author_id = auth.uid().
CREATE INDEX idx_lead_notes_author_id    ON public.lead_notes (author_id);

-- Reuses the existing live trigger function (verified body 2026-08-26:
-- NEW.updated_at = NOW(); plpgsql; SECURITY INVOKER; search_path ''), same as
-- update_leads_updated_at / update_profiles_updated_at.
CREATE TRIGGER update_lead_notes_updated_at
  BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- SECTION 2 — row level security (delegating to public.leads)
-- ---------------------------------------------------------------------------
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- The EXISTS is a policy expression, so it is evaluated as the calling user
-- and public.leads' own RLS applies inside it — admin_all_leads (is_admin())
-- and tech_select_assigned_leads (assigned_to = auth.uid()) today. Nothing
-- here names assigned_to. Policy names follow the live <actor>_<cmd>_<table>
-- convention (admin_all_leads, tech_select_assigned_leads, ...).
CREATE POLICY authenticated_select_lead_notes
  ON public.lead_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_notes.lead_id)
  );

-- Writer must be the author AND must be able to see the lead.
CREATE POLICY author_insert_lead_notes
  ON public.lead_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_notes.lead_id)
  );

-- Author-only. Column privileges (SECTION 3) restrict this to deleted_at, so
-- the only UPDATE an author can perform is their own soft delete/undelete.
CREATE POLICY author_update_lead_notes
  ON public.lead_notes
  FOR UPDATE
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_notes.lead_id)
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_notes.lead_id)
  );

-- No DELETE policy, deliberately (decision 2026-08-26): the feed is
-- append-only and removal is soft delete via deleted_at. Hard delete is
-- reachable only by service_role / postgres.

-- ---------------------------------------------------------------------------
-- SECTION 3 — privileges (RLS = who, ACL = what)
-- ---------------------------------------------------------------------------
-- pg_default_acl (owner postgres, schema public, verified live 2026-08-25)
-- auto-granted anon, authenticated and service_role ALL (arwdDxtm) at CREATE
-- TABLE time. GRANT never narrows, so revoke first. service_role keeps its
-- default grant (system/EF use, bypasses RLS) — intentional.
REVOKE ALL ON TABLE public.lead_notes FROM PUBLIC, anon, authenticated;

GRANT SELECT                          ON TABLE public.lead_notes TO authenticated;
GRANT INSERT (lead_id, author_id, body) ON TABLE public.lead_notes TO authenticated;
GRANT UPDATE (deleted_at)             ON TABLE public.lead_notes TO authenticated;
-- No DELETE grant: append-only feed, soft delete only (decision 2026-08-26).
-- id / created_at / updated_at come from defaults + the trigger (trigger
-- assignments are not column-privilege checked). The client must send only
-- lead_id, author_id, body on insert and only deleted_at on update.

-- ---------------------------------------------------------------------------
-- SECTION 4 — audit trigger: RECOMMENDATION = DO NOT ATTACH (nothing added)
-- ---------------------------------------------------------------------------
-- CLAUDE.md fixes the audit_logs foundation at 29 audit_log_trigger() triggers
-- across 10 tables and forbids adding one without an explicit instruction.
-- Recommendation for Phase 1: leave lead_notes OFF the audit set, because
--   (a) the row is the record and column privileges make body / lead_id /
--       created_at immutable — the only mutation an author can make is their
--       own soft delete (deleted_at), which keeps the row; and
--   (b) every new note also writes an activities row (activity_type
--       'note_added') via the existing logNoteAdded(), the user-facing history
--       the app already relies on; and
--   (c) there is no DELETE policy or grant for app roles, so no row can
--       disappear without a trace.
-- Revisit only on an explicit instruction.

COMMIT;

-- =============================================================================
-- VERIFICATION — run after applying (read-only; one statement each)
-- =============================================================================
-- V1. Columns (expect 7 rows: id, lead_id, author_id, body, created_at, updated_at, deleted_at)
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'lead_notes'
--  ORDER BY ordinal_position;
--
-- V2. RLS enabled (expect relrowsecurity = true)
-- SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'public.lead_notes'::regclass;
--
-- V3. Policies (expect exactly 3 — SELECT, INSERT, UPDATE — all roles = {authenticated}; no DELETE)
-- SELECT policyname, cmd, roles, qual, with_check
--   FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lead_notes'
--  ORDER BY cmd;
--
-- V4. No lead_notes policy mentions assigned_to (expect 0)
-- SELECT count(*) FROM pg_policies
--  WHERE schemaname = 'public' AND tablename = 'lead_notes'
--    AND (coalesce(qual,'') ILIKE '%assigned_to%' OR coalesce(with_check,'') ILIKE '%assigned_to%');
--
-- V5. anon has no privilege on the table (expect false)
-- SELECT has_table_privilege('anon','public.lead_notes','SELECT')
--     OR has_table_privilege('anon','public.lead_notes','INSERT')
--     OR has_table_privilege('anon','public.lead_notes','UPDATE')
--     OR has_table_privilege('anon','public.lead_notes','DELETE') AS anon_has_any;
--
-- V6. Table-level grants (expect authenticated = SELECT only at table level;
--     postgres + service_role = all; anon absent)
-- SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
--   FROM information_schema.role_table_grants
--  WHERE table_schema = 'public' AND table_name = 'lead_notes'
--  GROUP BY grantee ORDER BY grantee;
--
-- V7. Column-level grants for authenticated (expect INSERT on lead_id, author_id,
--     body; UPDATE on deleted_at; nothing else)
-- SELECT column_name, privilege_type
--   FROM information_schema.column_privileges
--  WHERE table_schema = 'public' AND table_name = 'lead_notes' AND grantee = 'authenticated'
--    AND privilege_type IN ('INSERT','UPDATE')
--  ORDER BY privilege_type, column_name;
--
-- V8. FK delete actions (expect lead_id = c (cascade), author_id = r (restrict))
-- SELECT conname, confdeltype FROM pg_constraint
--  WHERE conrelid = 'public.lead_notes'::regclass AND contype = 'f' ORDER BY conname;
--
-- V9a. Indexes (expect lead_notes_pkey, idx_lead_notes_lead_created, idx_lead_notes_author_id)
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'lead_notes';
--
-- V9b. Trigger (expect update_lead_notes_updated_at)
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.lead_notes'::regclass AND NOT tgisinternal;
--
-- V10. Every auth user has a profiles row (expect 0 — otherwise that user's
--      first note INSERT fails with FK 23503)
-- SELECT count(*) FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL;

-- =============================================================================
-- calendar_bookings.booking_group_id — Step 0a of the multi-technician
-- forced-order sequence                                                    [S4]
--
-- STATUS: NOT APPLIED ANYWHERE. Written 2026-08-28 on branch
--   feat/booking-group-id. Not applied to DEV, not applied to PROD, not
--   registered in migration history, never run through `db push`.
--
-- Apply ONLY on Michael's explicit APPLY, and ONLY after
--   docs/multi-tech/SESSION-4-PROD-PREFLIGHT.md
-- has been run against the intended target and every gate in it has cleared.
-- State the target ref AND its role in plain English first and get explicit
-- confirmation, per CLAUDE.md:
--   DEV  ctppzqnysmzynkxjlzta — sandbox clone (ap-southeast-1). Safe to break.
--   PROD ecyivrxjpsmjmexqatym — LIVE. mrcsystem.com. Real customer path.
-- Never `db push`, `db reset` or `migration repair` — the migration history is
-- forked 100+ files deep and a push would replay all of it.
--
--
-- SCOPE — ADDITIVE ONLY. THIS FILE PERMITS NO FAN-OUT.
-- -----------------------------------------------------------------------------
-- It adds one column, populates it, and indexes it. After it commits,
-- calendar_bookings still holds EXACTLY ONE ROW PER BOOKING and every group
-- holds exactly one row. No query returns different ROWS. No email, PDF,
-- calendar cell, dashboard tile or Edge Function behaves differently.
--
-- Stated precisely, because "nothing changes" is the sentence a reviewer would
-- use to skip a reader audit: the only observable difference anywhere is ONE
-- EXTRA FIELD in the shape returned to three `SELECT *`-style consumers —
-- supabase/functions/export-inspection-context/index.ts:94 (which
-- JSON.stringifies the whole booking row into its export payload),
-- src/pages/LeadDetail.tsx:320, and the Realtime payload delivered to
-- src/hooks/useTechnicianJobs.ts:356-395. None of the three reads the field,
-- none indexes by column position or count, and no row count, ordering or
-- filter result changes anywhere.
--
-- It exists so that SESSION 5's group-aware reminder claim has a column to
-- claim on BEFORE any two-row booking can exist. Deploy order is forced:
--   0a  this migration                      <- YOU ARE HERE
--   0b  group-aware send-inspection-reminder EF   (SESSION 5)
--   0c  calculate-travel-time leads-side fix      (SESSION 6)
--   1   lead_assignments junction + 16 RLS rewrites
--   2   the multi-tech picker and the fan-out writer  <- the only fan-out gate
-- See docs/multi-tech/HANDOFF.md §3.
--
--
-- WHY
-- -----------------------------------------------------------------------------
-- Today `send-inspection-reminder` claims a reminder with a PER-ROW
-- compare-and-swap (index.ts:334-339):
--
--     UPDATE calendar_bookings SET reminder_sent = true
--      WHERE id = $1 AND reminder_sent = false
--
-- The inline comment at :330-332 records the duplicate-send incident that CAS
-- was written to prevent. Once a booking fans out to one row per technician,
-- two rows carry two independent reminder_sent flags and the customer receives
-- two identical emails — through a door the per-row CAS cannot close, because
-- the rows are now legitimately distinct records. The claim has to move to the
-- GROUP:
--
--     UPDATE calendar_bookings SET reminder_sent = true
--      WHERE booking_group_id = $1 AND reminder_sent = false
--
-- One statement, therefore atomic: the first invocation claims every row in the
-- group and a concurrent second matches zero. Correct with one row per group
-- (today) and with N (after fan-out). That EF cannot be written until this
-- column exists, and it must be deployed and verified live BEFORE any migration
-- that permits a second row — Edge Functions here are CLI-only, human-applied
-- and global-immediate, with no staging buffer.
--
-- ONE HAND-OFF NOTE FOR SESSION 5, since this migration sets up their column:
-- index.ts:461 is NOT a second claim. It is the RELEASE — it sets reminder_sent
-- back to false — and it is scoped `.eq('id', booking.id)`, per row. If the
-- CLAIM is group-scoped and the RELEASE is left row-scoped, a send that fails
-- after claiming a two-row group releases only one of the two rows. The group
-- is then permanently half-claimed: the group claim can never match it again
-- (one row already has reminder_sent = true), so that customer's reminder is
-- never retried. The claim and the release have to move to the group TOGETHER.
-- This migration provides the column for both; it does not and must not touch
-- that Edge Function.
--
--
-- DESIGN — load-bearing decisions
-- -----------------------------------------------------------------------------
-- * NOT NULL, in THIS migration, via `DEFAULT gen_random_uuid()`.
--   The usual reason to defer NOT NULL is that a backfill and a later
--   SET NOT NULL are two steps, and a row inserted between them slips a NULL
--   past the constraint — a race that DEV's 3 rows would never expose and
--   PROD's larger set would. THAT RACE DOES NOT EXIST HERE. A volatile column
--   default is applied during the ADD COLUMN table rewrite itself, so the
--   column is born fully populated inside one statement. There is no interval,
--   however brief, in which a calendar_bookings row has a NULL group id. A
--   second migration to tighten the constraint would introduce exactly the
--   risk that deferring is supposed to avoid.
--
--   NOT NULL is also load-bearing, not cosmetic. Every downstream consumer
--   predicates on this column: `WHERE booking_group_id = $1` (the reminder
--   claim), `GROUP BY booking_group_id` (the R1 duplicate detector, the
--   R14 dashboard de-dupe, the R15 reschedule diff). Under SQL's three-valued
--   logic a NULL group id makes the first silently match ZERO rows — the
--   reminder is never claimed and never sent — while the second lumps every
--   NULL row into ONE bucket, silently merging unrelated bookings into a single
--   fake group. Both fail without an error. NOT NULL removes the entire class.
--
-- * The DEFAULT is PERMANENT and that is deliberate.
--   Dropping it after the rewrite would make every INSERT that omits the column
--   fail on the not-null constraint — i.e. it would break every existing
--   booking writer the moment this commits. That is an outage, not a
--   migration. Keeping the default means each existing writer keeps working
--   untouched and each new row gets its own group, which IS the correct
--   semantics today: one row = one booking = one group.
--
--   The consequence for Step 2 is stated plainly so nobody rediscovers it in
--   the field: the fan-out writer must pass ONE SHARED booking_group_id to
--   BOTH rows. If it forgets, the two rows get two different defaults and the
--   customer gets two reminder emails — i.e. the failure degrades to exactly
--   today's behaviour, loudly enough to catch in preview, rather than to a
--   NULL that silently claims nothing. That asymmetry is why the default is
--   preferred over a nullable column.
--
-- * ONE DISTINCT GROUP ID PER EXISTING ROW — not one per natural key.
--   `gen_random_uuid()` is VOLATILE, so Postgres evaluates it once per row
--   during the rewrite. Every existing booking becomes its own group, which
--   preserves today's one-row-per-group invariant exactly. GUARD 2 below
--   proves this rather than assuming it.
--
-- * NO `UPDATE` BACKFILL. This is why the whole thing is one ALTER.
--   calendar_bookings carries `update_calendar_bookings_updated_at`, a
--   BEFORE UPDATE FOR EACH ROW trigger with NO column list
--   (20251111000016_rename_tables_to_match_spec.sql:578-590), whose body is
--   `NEW.updated_at = NOW()`
--   (20251028133857_e48ba1f0-1d2e-48c1-aa22-f5c11d70c706.sql:132-137).
--   An `UPDATE calendar_bookings SET booking_group_id = ...` backfill would
--   therefore rewrite `updated_at` on 100% of rows, destroying the record of
--   when each booking was last genuinely changed. An ALTER TABLE rewrite does
--   not fire row triggers, so `updated_at` survives byte-for-byte.
--   Verification A4 proves it with a before/after fingerprint.
--
--   AND IT WOULD SPAM EVERY TECHNICIAN'S PHONE. calendar_bookings is a member
--   of the `supabase_realtime` publication
--   (20260209100000_enable_realtime_calendar_bookings.sql:2), and
--   src/hooks/useTechnicianJobs.ts:356-395 subscribes with `event: '*'`
--   filtered to `assigned_to=eq.<user>`, firing a 4-second
--   `toast.info('Job updated')` AND a full `fetchJobs()` refetch on every
--   payload. An UPDATE backfill emits one Realtime UPDATE per row, so every
--   logged-in technician would get one toast and one refetch for every booking
--   they own — a toast avalanche on a phone, in the field. The ALTER emits
--   NOTHING: the rewrite's tuple inserts are flagged HEAP_INSERT_NO_LOGICAL, so
--   logical decoding skips them entirely. (The mechanism is that flag, NOT
--   "the new relfilenode is not a publication member" — publication membership
--   is by relation OID and survives a rewrite. The conclusion is the same; the
--   reason matters because the wrong one would suggest, falsely, that any
--   rewrite of any published table is silent.)
--
--   The table's other trigger, `trigger_set_reminder_scheduled_for`, is scoped
--   `BEFORE INSERT OR UPDATE OF start_datetime, status`
--   (20260218000001_add_reminder_scheduled_for.sql:34-37), so it would not have
--   fired on an UPDATE of this column either. It is named here only so a
--   reviewer does not have to go and check.
--
-- * NO AUDIT ROWS. calendar_bookings is not one of the 10 tables in CLAUDE.md's
--   29-trigger audit foundation (leads, inspections, inspection_areas,
--   subfloor_data, moisture_readings, subfloor_readings, photos, user_roles,
--   invoices, job_completions). This migration adds no trigger — CLAUDE.md
--   forbids that without explicit instruction. Preflight S4-P6 re-confirms the
--   trigger list on the live target rather than trusting this repo, because the
--   history is forked; verification A5 confirms the audit_logs delta is zero.
--
-- * NO RLS, GRANT or REVOKE change is needed, and none is made.
--   Adding a column to an existing table inherits that table's grants —
--   pg_default_acl only auto-grants on NEW tables and functions. The same
--   reasoning was recorded for inspection_areas in
--   20260827200000_inspection_area_include_in_report.sql. Preflight S4-P9
--   checks the one way this can be wrong: if calendar_bookings carries
--   COLUMN-level rather than table-level grants, a new column receives no
--   grant at all and every write naming it fails with permission denied.
--
--   Separately, and NOT addressed here: calendar_bookings has exactly one
--   policy, `authenticated_full_access_bookings`, cmd = ALL, qual and
--   with_check both `auth.uid() IS NOT NULL` — every authenticated user can
--   already read and write every booking row. That is standing finding SF-1 in
--   docs/multi-tech/HANDOFF.md §8. It needs its own triage and its own ticket;
--   tightening it inside a migration about a group id would be scope creep with
--   a blast radius across Schedule, the dashboard and travel-time.
--
-- * INDEX: a plain btree on (booking_group_id). Justified in SECTION 3.
--
--
-- REJECTED ALTERNATIVES — recorded so they are not "fixed" back in
-- -----------------------------------------------------------------------------
-- * A UNIQUE index on booking_group_id. It is tempting precisely because the
--   column IS unique today, and it is the single most damaging change that
--   could be made to this file: uniqueness is exactly what fan-out must be
--   allowed to violate. Adding it would make Step 2 impossible to ship and the
--   failure would surface as a constraint violation on the first real two-tech
--   booking, in the field.
--
-- * Backfilling one group id per NATURAL key (lead_id, event_type,
--   start_datetime) instead of one per row. This would silently assert that any
--   two rows sharing that key ARE one booking. Nobody has verified that claim
--   for PROD data. GUARD 1 refuses to guess: if such a pair exists, the
--   migration aborts and names it for a human.
--
-- * `CREATE INDEX CONCURRENTLY`. It cannot run inside a transaction block, and
--   the ADD COLUMN in the same file already holds ACCESS EXCLUSIVE on the
--   table, so it would buy nothing and cost the all-or-nothing property.
--
-- * A nullable column with no default. Cheaper to apply (catalog-only, no
--   rewrite) but it hands SESSION 5 a column that can be NULL, which is the
--   silent-failure mode described under NOT NULL above.
--
--
-- COST — the one real trade this file makes
-- -----------------------------------------------------------------------------
-- A volatile DEFAULT forces a FULL TABLE REWRITE under ACCESS EXCLUSIVE. For a
-- bookings table this is expected to be sub-second, but the PROD row count has
-- never been measured. Preflight S4-P3 captures it, and states the number above
-- which this design should be swapped for the deferred-NOT-NULL Plan B.
--
-- The lock is taken up front (SECTION 0) and held for the whole transaction, so
-- state the window honestly: FOUR heavy statements run under ACCESS EXCLUSIVE —
-- GUARD 1's scan, the ALTER rewrite, CREATE INDEX, and GUARD 2's
-- count(DISTINCT) scan. `statement_timeout` is PER STATEMENT, not per
-- transaction, so the worst-case hold is up to roughly 4 x 60s, NOT 60s.
-- `lock_timeout` bounds only the wait to ACQUIRE the lock, making the migration
-- FAIL FAST rather than form a queue behind a long-running transaction and
-- stall every booking read in the app. Either timeout aborts the whole
-- transaction cleanly, leaving the table byte-identical to before.
--
-- Taking the lock before GUARD 1 rather than after does lengthen the exclusive
-- window by one sequential scan. That is a deliberate trade: a guard that reads
-- a state the ALTER is not going to stamp is not a guard.
--
--
-- EVERY WRITER THAT CAN CREATE A calendar_bookings ROW — and why none changes
-- -----------------------------------------------------------------------------
-- Swept 2026-08-28 across src/, supabase/functions/, supabase/migrations/,
-- scripts/, api/, tests/ and the seed files. NONE of these needs a change for
-- this migration to be correct, because the column DEFAULT populates every row
-- they create and one row per occurrence is the correct grouping today.
--
--   RUNTIME, APPLICATION (2):
--     src/lib/bookingService.ts:119        bookInspection()  — one row.
--     src/components/leads/BookJobSheet.tsx:433 (rows built at :416)
--       — job booking. NOTE: this ALREADY fans out, one row per DAY of a
--         multi-day job. Those rows share lead_id and event_type but carry
--         DIFFERENT start_datetime, so GUARD 1 does not see them as one group
--         and each correctly becomes its own occurrence. It also does a
--         DELETE-then-INSERT on reschedule (:408-409), so group ids are minted
--         fresh on every resubmit — correct now, and a thing Step 2 must handle
--         deliberately rather than inherit.
--
--   NON-FRONTEND, so no src/ change would ever reach them (3):
--     supabase/seed_technician_dashboard.sql:53          (3 rows)
--     supabase/seed_50_inspection_waiting_leads.sql      (50 INSERTs, :51-519)
--       Both use explicit column lists that omit booking_group_id. After this
--       migration they still succeed and each seeded row lands in its own
--       group. This is the strongest single argument for the DEFAULT: a
--       nullable column would have had these two files silently minting NULLs
--       into DEV for as long as anyone kept reseeding it.
--     supabase/migrations/20251111000010_create_offline_queue_table.sql:24-32
--       allow-lists 'calendar_bookings' for replayed 'create' actions. LATENT
--       ONLY — grep for offline_queue across src/, supabase/functions/, api/,
--       scripts/ and tests/ returns zero hits, so nothing reads or replays that
--       queue today. If it is ever revived, the DEFAULT still covers it.
--
--   NOT WRITERS, confirmed by the same sweep: no Edge Function inserts a
--   booking (send-inspection-reminder only UPDATEs, at :334 and :461);
--   no SQL function, RPC or trigger inserts one; SyncManager.ts replays only
--   'inspections' and 'photos'; there are no .upsert() calls anywhere in src/.
--
--   WHAT CHANGES AT STEP 2, NOT NOW: both runtime sites must pass ONE SHARED
--   booking_group_id across the rows of a single occurrence. That is a change
--   to the fan-out writer, not a fix to a defect this migration introduces.
--
--
-- ROLLBACK (manual, only on explicit instruction — DO NOT run after Step 2)
-- -----------------------------------------------------------------------------
--   BEGIN;
--   SET LOCAL lock_timeout = '3s';
--   SET LOCAL statement_timeout = '60s';
--   DROP INDEX IF EXISTS public.idx_calendar_bookings_booking_group_id;
--   ALTER TABLE public.calendar_bookings DROP COLUMN booking_group_id;
--   COMMIT;
--
--   The two timeouts are not decoration. Both statements take ACCESS EXCLUSIVE,
--   and a rollback is run under pressure, right after something has gone wrong.
--   Without lock_timeout the DROP sits at the head of the lock queue for an
--   unbounded time and EVERY booking read in the app queues behind it — the
--   exact failure the forward migration defends against, in the one block whose
--   entire job is to make a bad outcome recoverable.
--
--   DROP COLUMN drops the index and the COMMENT on its own; the explicit
--   DROP INDEX is stated first so the rollback reads as the exact inverse of
--   the forward migration. DROP COLUMN here is catalog-only — no rewrite, no
--   dependent objects at Step 0a. This file alters no existing object, so
--   nothing else needs reverting.
--
--   ⚠️ THIS ROLLBACK HAS AN EXPIRY DATE. It is lossless-in-effect only while
--   every group holds exactly one row: the group ids carry no information the
--   forward migration cannot regenerate. From the moment Step 2 ships and a
--   booking spans two rows, booking_group_id becomes the ONLY record of which
--   rows form one booking — the natural key cannot rebuild it, because that is
--   the ambiguity GUARD 1 exists to refuse. After fan-out, DROP COLUMN is
--   destructive. Do not reuse this block.
-- =============================================================================

BEGIN;

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

-- ---------------------------------------------------------------------------
-- SECTION 0 — take the lock BEFORE reading, not after
--
-- Without this, GUARD 1 below would read under ACCESS SHARE and the ALTER in
-- SECTION 2 would not take ACCESS EXCLUSIVE until afterwards. In READ
-- COMMITTED, another session can INSERT and COMMIT a second row into a natural
-- group in that window — after the guard's snapshot, before the ALTER's lock —
-- and the guard would never see the row the migration is about to stamp. Taking
-- the lock first makes the guard read exactly the state it gates.
--
-- It also makes the fail-fast property arrive EARLIER: with lock_timeout = '3s'
-- this aborts in three seconds if the table is busy, instead of paying for a
-- full scan first and only then discovering it cannot get the lock.
-- ---------------------------------------------------------------------------
LOCK TABLE public.calendar_bookings IN ACCESS EXCLUSIVE MODE;

-- ---------------------------------------------------------------------------
-- SECTION 1 — GUARD 1: natural-group ambiguity
--
-- Runs BEFORE the column exists, so an abort here leaves the schema untouched,
-- and under the ACCESS EXCLUSIVE lock taken in SECTION 0, so what it reads is
-- what SECTION 2 will stamp.
--
-- What it refuses: any (lead_id, event_type, start_datetime) that already holds
-- more than one non-voided row. Such a pair is a booking whose rows we did
-- not create and whose grouping we cannot infer. Per-row group ids would split
-- it — and if SESSION 5's group claim then runs against it, the customer gets
-- the very duplicate email this workstream exists to prevent, BEFORE fan-out
-- has shipped anything. Per-natural-key group ids would instead merge it, which
-- asserts a semantic nobody has verified. Neither is a decision a migration may
-- make silently, so it fails loudly and names the offending groups.
--
-- VOIDED rows are excluded — 'cancelled' AND 'rescheduled', and only those two.
-- Both mean the occurrence did not happen in that slot, so a slot that was
-- vacated and later refilled is not an ambiguous two-technician booking and
-- must not abort the migration:
--   * 'rescheduled' is a TOMBSTONE left behind at the ORIGINAL start_datetime
--     when a booking is moved; the replacement is created fresh as 'scheduled'
--     at the new time (src/hooks/useTechnicianJobs.ts:248-249). Re-book the
--     vacated slot and the tombstone collides with the new row on the natural
--     key. Excluding it is what stops that false abort.
--   * The codebase already treats exactly these plus 'completed' as immutable
--     history (src/pages/LeadDetail.tsx:569, :580). 'completed' is
--     deliberately NOT excluded here: a completed row is an occurrence that
--     really happened, so two of them in one slot either were one job with two
--     technicians or are a duplicate-row bug. Both deserve a human's eyes.
--     'in_progress' and 'scheduled' are in scope for the same reason.
--
-- `status IS NULL OR status NOT IN (...)` rather than a bare `NOT IN`, because
-- calendar_bookings.status is NULLABLE (booking_status, DEFAULT 'scheduled',
-- no NOT NULL — 20251028135212:639) and `NULL NOT IN (...)` evaluates to NULL,
-- which would silently drop every NULL-status row out of the guard.
-- Preflight S4-P5 confirms both labels exist on the live enum; a missing label
-- is a parse error, not a silent skip.
--
-- Rows with a NULL lead_id are excluded: lead_id is
-- `ON DELETE SET NULL` (20251028135212:624), so those are orphans of deleted
-- leads. Grouping them together would group unrelated orphans that happen to
-- share an event_type and a timestamp, producing a false abort. Their count is
-- surfaced by verification B6 instead.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_offending_groups bigint;
  v_detail           text;
BEGIN
  SELECT count(*),
         string_agg(
           format('lead_id=%s event_type=%L start_datetime=%s rows=%s statuses=%s booking_ids=%s',
                  g.lead_id, g.event_type, g.start_datetime,
                  g.rows_in_group, g.statuses, g.booking_ids),
           E'\n    ' ORDER BY g.start_datetime DESC)
    INTO v_offending_groups, v_detail
  FROM (
    SELECT lead_id,
           event_type,
           start_datetime,
           count(*)                          AS rows_in_group,
           array_agg(DISTINCT status::text)  AS statuses,
           array_agg(id ORDER BY id)         AS booking_ids
    FROM public.calendar_bookings
    WHERE lead_id IS NOT NULL
      AND (status IS NULL OR status NOT IN ('cancelled', 'rescheduled'))
    GROUP BY lead_id, event_type, start_datetime
    HAVING count(*) > 1
  ) g;

  -- RAISE's only format specifier is `%`. `%s` would be `%` followed by a
  -- literal "s" — two placeholders here, two arguments, no more.
  IF v_offending_groups > 0 THEN
    RAISE EXCEPTION
      'booking_group_id ABORTED: % natural booking group(s) already hold more than one non-voided row. The correct grouping for them is ambiguous and this migration will not guess it — adjudicate each one with a human first (docs/multi-tech/SESSION-4-PROD-PREFLIGHT.md, gate S4-P4). Offending groups: %',
      v_offending_groups, v_detail;
  END IF;

  RAISE NOTICE 'GUARD 1 passed: every non-voided natural booking group with a non-null lead_id holds exactly one row.';
END $$;

-- ---------------------------------------------------------------------------
-- SECTION 2 — the column
--
-- One statement does the add, the backfill and the not-null constraint,
-- because a volatile DEFAULT is evaluated per row during the rewrite. There is
-- no separate UPDATE, therefore no trigger fires and no updated_at is touched.
-- ---------------------------------------------------------------------------
ALTER TABLE public.calendar_bookings
  ADD COLUMN booking_group_id uuid NOT NULL DEFAULT gen_random_uuid();

COMMENT ON COLUMN public.calendar_bookings.booking_group_id IS
  'The single booking OCCURRENCE this row belongs to — one lead, one event_type, one time slot — across technicians. Rows sharing a booking_group_id are ONE occurrence attended by more than one technician. It does NOT group the days of a multi-day job: a 6-day job is 6 occurrences and therefore 6 groups, because each day is independently scheduled, independently cancellable, carries its own start_datetime and end_datetime, and appears as its own row in every calendar, dashboard and travel-time query. A group that spanned days would make all of those collapse six days of work into one. Today every group holds exactly one row and this column is informationally redundant; it exists so that reminder claim can be one atomic UPDATE over the group (WHERE booking_group_id = <the group> AND reminder_sent = false) instead of one per row, which is what stops a two-technician booking sending the customer two identical emails. DEFAULT gen_random_uuid() means an INSERT that omits it gets its own group, so every writer that exists today needs no change. A writer that creates several rows for ONE occurrence MUST pass the SAME value to all of them — the default will not do it for you. Never make this column UNIQUE: sharing it across rows is the entire point.';

-- ---------------------------------------------------------------------------
-- SECTION 3 — the index
--
-- Plain btree on the single column. Every known and anticipated consumer
-- predicates on full-column equality or groups by it:
--   * the reminder claim, WHERE booking_group_id = $1 AND reminder_sent = false
--   * the R1 duplicate detector, GROUP BY booking_group_id
--   * the R15 reschedule diff and R14 dashboard de-dupe, both group-scoped
-- Group cardinality is 1 today and 2-4 after fan-out, so the leading column is
-- already fully selective: a composite (booking_group_id, reminder_sent) would
-- not change the plan, and would only add width to every entry. There is
-- already a partial index serving the reminder cron's OTHER access path —
-- idx_calendar_bookings_reminder_pending on (reminder_scheduled_for) WHERE
-- reminder_sent = false AND status = 'scheduled'
-- (20260218000001_add_reminder_scheduled_for.sql:47-49) — and this one is the
-- claim-by-group path, not a duplicate of it.
--
-- NOT UNIQUE. See REJECTED ALTERNATIVES in the header: uniqueness is exactly
-- what fan-out must be permitted to violate.
--
-- Named to the table's existing convention, idx_calendar_bookings_<column>,
-- established by the rename block at 20251111000016:166-175 and still in use by
-- live examples idx_calendar_bookings_technician_id,
-- idx_calendar_bookings_inspection_id (20260217074249:8-9) and
-- idx_calendar_bookings_reminder_pending. So a grep for the column name finds
-- the index. (Do not copy the convention from idx_calendar_bookings_status or
-- _type — both were DROPPED at 20260217074249:59-60 — or from
-- idx_calendar_bookings_lead_id, _end_time and _created_at, which the repo
-- renames but never creates. Preflight S4-P7 reads the live list rather than
-- inferring it from these files.)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_calendar_bookings_booking_group_id
  ON public.calendar_bookings (booking_group_id);

-- ---------------------------------------------------------------------------
-- SECTION 4 — GUARD 2: post-condition
--
-- Proves, rather than assumes, that the volatile default produced ONE DISTINCT
-- value PER ROW. That is documented Postgres behaviour — a non-volatile default
-- is stored in catalog metadata with no rewrite, a volatile one forces the
-- rewrite and is evaluated per row — but it is the single assumption this file
-- rests on, and it could not be exercised before writing this migration (there
-- is no Postgres an agent session can reach on this machine; see HANDOFF §11).
-- So it is checked here instead of trusted: if the default were ever evaluated
-- once for the whole rewrite, every booking in the company would share one
-- group id and SESSION 5's claim would mark EVERY booking reminded on its first
-- run. This aborts the transaction instead.
--
-- count(DISTINCT ...) ignores NULLs, so this check also subsumes a null check:
-- any NULL would make v_distinct fall short of v_rows.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_rows     bigint;
  v_distinct bigint;
BEGIN
  SELECT count(*), count(DISTINCT booking_group_id)
    INTO v_rows, v_distinct
  FROM public.calendar_bookings;

  IF v_distinct <> v_rows THEN
    RAISE EXCEPTION
      'booking_group_id ABORTED: expected one distinct group id per row, got % distinct across % rows. The column default did not evaluate per row, so this migration would have merged unrelated bookings into shared groups. Nothing has been applied.',
      v_distinct, v_rows;
  END IF;

  RAISE NOTICE 'GUARD 2 passed: % row(s), % distinct group id(s) — one row per group, as designed.',
    v_rows, v_distinct;
END $$;

COMMIT;

-- =============================================================================
-- VERIFICATION — for a human in the Studio SQL editor
--
-- Studio shows only the LAST result set of a multi-statement run, so run each
-- block ON ITS OWN.
--
-- Every DEV number below is from SESSION 1's live query pack (DEV
-- ctppzqnysmzynkxjlzta, 2026-08-28: 3 leads, 3 bookings). DEV is a near-empty
-- sandbox. PROD carries 101+ leads and HAS NEVER BEEN MEASURED — every PROD
-- figure is marked UNKNOWN-MUST-CAPTURE, and the AFTER checks are identities
-- against the BEFORE numbers, so they are meaningless unless you record the
-- BEFORE numbers first.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BEFORE — run these first and WRITE THE ANSWERS DOWN
-- -----------------------------------------------------------------------------

-- B1 · Row count. The denominator for every AFTER identity.
--   SELECT count(*) AS bookings_before FROM public.calendar_bookings;
--   DEV expects  : 3
--   PROD expects : UNKNOWN — MUST CAPTURE
--   Also gates the rewrite cost: see preflight S4-P3.

-- B2 · GUARD 1's predicate, run as a query. MUST RETURN ZERO ROWS.
--   SELECT lead_id, event_type, start_datetime,
--          count(*)                         AS rows_in_group,
--          array_agg(DISTINCT status::text) AS statuses,
--          array_agg(id ORDER BY id)        AS booking_ids
--   FROM public.calendar_bookings
--   WHERE lead_id IS NOT NULL
--     AND (status IS NULL OR status NOT IN ('cancelled', 'rescheduled'))
--   GROUP BY lead_id, event_type, start_datetime
--   HAVING count(*) > 1;
--   DEV expects  : 0 rows (SESSION 1 e3_rows_per_natural_group: all 3 groups = 1 row)
--   PROD expects : UNKNOWN — MUST CAPTURE. Non-zero ⇒ GUARD 1 aborts this
--                  migration by design. Do not edit the guard; adjudicate the
--                  groups. See preflight S4-P4.

-- B3 · The column must not already exist. History is forked and this project
--      has applied DDL to PROD out-of-band (20260825141426_lead_notes.sql:3-10).
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'calendar_bookings'
--     AND column_name IN ('booking_group_id', 'group_id', 'booking_group');
--   DEV expects  : 0 rows
--   PROD expects : UNKNOWN — MUST CAPTURE. Any row ⇒ STOP, do not apply.

-- B4 · The index name must be free. Record the current index count.
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
--   ORDER BY indexname;
--   DEV expects  : idx_calendar_bookings_booking_group_id ABSENT
--   PROD expects : UNKNOWN — MUST CAPTURE (record the count; A3 is count + 1)

-- B5 · updated_at fingerprint. A4 must return the IDENTICAL digest — that is
--      the proof no row trigger fired and no booking's last-changed record moved.
--
--      ⚠️ PIN THE ROW SET. calendar_bookings has a SCHEDULED WRITER: pg_cron job
--      'send-inspection-reminders' fires EVERY HOUR ON THE HOUR
--      (20260218000003_create_reminder_cron_job.sql:1-11) and the Edge Function
--      it calls UPDATEs reminder_sent / reminder_sent_at, which fires the
--      updated_at trigger. An unpinned fingerprint over the whole live table
--      would therefore change between B5 and A4 for a reason that has nothing
--      to do with this migration. Record the timestamp you run B5 at and use
--      the SAME literal in A4, so both digests cover the same fixed rows.
--
--      It fingerprints extract(epoch ...) and NOT updated_at::text because
--      casting a timestamptz to text renders it through the SESSION's TimeZone
--      and DateStyle, so two Studio sessions with different settings would
--      change the digest while the data was untouched. The epoch is the
--      absolute instant. coalesce(...) because updated_at is NULLABLE (DEFAULT
--      now(), no NOT NULL); without it string_agg drops NULL rows and silently
--      shrinks the fingerprint's coverage.
--
--   -- Choose t0 = now() and WRITE IT DOWN. Use the identical literal in A4.
--   SELECT count(*)        AS row_count,
--          max(updated_at) AS newest_updated_at,
--          md5(string_agg(id::text || '|' ||
--                         coalesce(extract(epoch FROM updated_at)::text, 'NULL'),
--                         ',' ORDER BY id)) AS fingerprint
--   FROM public.calendar_bookings
--   WHERE created_at <= '<t0>'::timestamptz;
--   DEV expects  : row_count = 3, fingerprint = UNKNOWN-MUST-CAPTURE (data-derived)
--   PROD expects : UNKNOWN — MUST CAPTURE
--
--   NOTE on Postgres versions: extract(epoch FROM timestamptz) returns numeric
--   on PG14+ and double precision on PG13 and earlier, where ::text is governed
--   by extra_float_digits. Both runs are on the SAME database, so this cannot
--   differ between B5 and A4 — but if you change the session's
--   extra_float_digits between the two runs on a PG13 target, it can. Don't.

-- B6 · Orphan bookings, excluded from GUARD 1 by design. Informational only —
--      no gate. A large number here is its own finding, not this file's business.
--   SELECT count(*) AS bookings_with_null_lead_id
--   FROM public.calendar_bookings WHERE lead_id IS NULL;
--   DEV expects  : UNKNOWN — MUST CAPTURE (not measured by SESSION 1)
--   PROD expects : UNKNOWN — MUST CAPTURE

-- B7 · audit_logs baseline, for A5. SCOPED to this table.
--      An unscoped count(*) over audit_logs is NOT a test of this migration —
--      29 triggers on 10 OTHER tables write that table on every ordinary lead
--      edit, inspection save or photo write, so an unscoped delta measures
--      whether anyone used the app. audit_log_trigger() records the source
--      table in entity_type (20260311000001_add_audit_triggers.sql:12-21), so
--      scope to it and the check means what it says.
--   SELECT count(*) AS audit_rows_before
--   FROM public.audit_logs WHERE entity_type = 'calendar_bookings';
--   DEV expects  : UNKNOWN — MUST CAPTURE (expected 0; the table has no audit trigger)
--   PROD expects : UNKNOWN — MUST CAPTURE

-- -----------------------------------------------------------------------------
-- AFTER — every one of these is an identity against a BEFORE number
-- -----------------------------------------------------------------------------

-- A1 · Column shape. Exactly one row, and all three values must match.
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'calendar_bookings'
--     AND column_name = 'booking_group_id';
--   DEV and PROD expect : booking_group_id | uuid | NO | gen_random_uuid()
--   is_nullable = YES ⇒ the NOT NULL did not take. STOP.
--   column_default NULL ⇒ the default did not take; every future INSERT that
--   omits the column will now FAIL. STOP and roll back.

-- A2 · One distinct group per row. GUARD 2 already enforced this inside the
--      transaction; this restates it for the written record.
--   SELECT count(*)                                          AS bookings,
--          count(DISTINCT booking_group_id)                  AS distinct_groups,
--          count(*) FILTER (WHERE booking_group_id IS NULL)  AS nulls
--   FROM public.calendar_bookings;
--   DEV expects  : 3 | 3 | 0
--   PROD expects : B1 | B1 | 0   (bookings and distinct_groups must both equal B1)

-- A3 · The index exists and nothing else changed.
--   SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
--   ORDER BY indexname;
--   DEV and PROD expect : B4's list, plus idx_calendar_bookings_booking_group_id,
--                         and NOTHING removed.

-- A4 · updated_at fingerprint — THE "nothing behaved differently" PROOF.
--      Re-run B5's query verbatim, WITH THE SAME '<t0>' LITERAL.
--   DEV and PROD expect : digest IDENTICAL to B5.
--
--   A changed digest is a DIFF, not a verdict. Read it in this order:
--     1. Run the discriminator below. If it returns > 0, ordinary activity
--        touched the table between your two runs — almost certainly the hourly
--        reminder cron — and THAT is your explanation. The ALTER in SECTION 2
--        cannot move updated_at: an ALTER TABLE rewrite fires no row triggers.
--     2. Only if the discriminator returns 0 is a changed digest unexplained.
--        Then investigate before proceeding to Step 0b.
--
--   SELECT count(*) AS rows_touched_since_t0
--   FROM public.calendar_bookings
--   WHERE created_at <= '<t0>'::timestamptz
--     AND updated_at  >  '<t0>'::timestamptz;
--   Expect 0 on a quiet table. Non-zero names the rows that moved.

-- A5 · Zero audit rows FOR THIS TABLE. calendar_bookings is not in CLAUDE.md's
--      29-trigger audit foundation, and this migration adds no trigger.
--   SELECT count(*) AS audit_rows_after
--   FROM public.audit_logs WHERE entity_type = 'calendar_bookings';
--   DEV and PROD expect : IDENTICAL to B7.
--   Because it is scoped to calendar_bookings, a non-zero delta cannot be
--   ordinary app activity on other tables. It means the live target carries an
--   audit trigger on calendar_bookings that neither this repo nor DEV has.
--   Re-read preflight S4-P6 before continuing.

-- A6 · Behaviour unchanged: still exactly one row per booking. Re-run B2.
--   DEV and PROD expect : 0 rows, same as B2.

-- A7 · Readiness for Step 0b. The shape SESSION 5's claim will use, as a
--      read-only rehearsal. Every group must show exactly one row.
--   SELECT rows_in_group, count(*) AS number_of_groups FROM (
--     SELECT booking_group_id, count(*) AS rows_in_group
--     FROM public.calendar_bookings GROUP BY booking_group_id
--   ) g GROUP BY rows_in_group ORDER BY rows_in_group;
--   DEV expects  : one row — rows_in_group = 1, number_of_groups = 3
--   PROD expects : one row — rows_in_group = 1, number_of_groups = B1
--   Any rows_in_group > 1 here before Step 2 ships means something fanned out
--   early. STOP and do not deploy the reminder EF.
-- =============================================================================

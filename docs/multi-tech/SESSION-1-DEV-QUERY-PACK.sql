-- =====================================================================
-- SESSION 1 — DEV EVIDENCE PACK  (multi-technician DB/RLS inventory)
--
-- TARGET: DEV  ctppzqnysmzynkxjlzta   (sandbox clone, ap-southeast-1)
-- NEVER RUN THIS AGAINST PROD. The PROD ref is listed in CLAUDE.md.
--
-- 100% READ-ONLY. Every statement is a SELECT. No DDL, no DML, no writes.
-- Safe to run repeatedly.
--
-- WHY THIS FILE EXISTS INSTEAD OF THE CLI:
--   `npx supabase db query` in CLI 2.101.0 accepts only --db-url / --linked /
--   --local. It has NO --project-ref flag, so the brief's prescribed invocation
--   silently prints help and runs nothing. The project Bash guard then rejects
--   every supabase command that LACKS --project-ref. That is a closed loop, so
--   an agent session has no route to DEV. These queries are for a human to run
--   in the DEV Studio SQL editor.
--
-- HOW TO RUN:
--   Studio's SQL editor displays only the LAST result set of a multi-statement
--   run. Run ONE numbered block at a time and paste the returned cell back.
--
-- SANITY CHECK FIRST — confirm you are on DEV:
--   SELECT current_database(), current_user, inet_server_addr();
--
-- BUNDLE MAP:
--   A  Step 1  — technician columns, row/NULL counts, FKs, indexes, RLS on/off
--   B  Step 2  — every live RLS policy + technician subset + indirection check
--   C  Step 3  — SECURITY DEFINER functions, anon EXECUTE, pg_default_acl
--   D  Cross-session queries injected verbatim from SESSION 2 and SESSION 3
--   E  SESSION 1 additions, each demanded by a constraint in the injection
-- =====================================================================


-- =====================================================================
-- BUNDLE A — Step 1a/1b/1c/1d: technician-related schema on DEV
-- Answers: which columns exist, their types/nullability/defaults/FK targets,
-- live row and NULL counts per column, FKs into user tables, indexes,
-- and which tables have RLS enabled.
--
-- q1b (row + NULL counts) is what sets the EXPECTED BACKFILL ROW COUNT.
-- =====================================================================
WITH tech_cols AS (
  SELECT c.table_schema, c.table_name, c.column_name, c.data_type,
         c.is_nullable, c.column_default
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema
   AND t.table_name   = c.table_name
   AND t.table_type   = 'BASE TABLE'
  WHERE c.table_schema = 'public'
    AND c.column_name ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by|user_id|created_by)'
),
fks AS (
  SELECT con.conname,
         src_ns.nspname AS src_schema, src.relname AS src_table, src_att.attname AS src_column,
         tgt_ns.nspname AS tgt_schema, tgt.relname AS tgt_table, tgt_att.attname AS tgt_column,
         con.confdeltype::text AS on_delete_code,
         con.confupdtype::text AS on_update_code
  FROM pg_constraint con
  JOIN pg_class     src    ON src.oid    = con.conrelid
  JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
  JOIN pg_class     tgt    ON tgt.oid    = con.confrelid
  JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
  JOIN unnest(con.conkey)  WITH ORDINALITY AS sk(attnum, ord) ON true
  JOIN unnest(con.confkey) WITH ORDINALITY AS tk(attnum, ord) ON tk.ord = sk.ord
  JOIN pg_attribute src_att ON src_att.attrelid = src.oid AND src_att.attnum = sk.attnum
  JOIN pg_attribute tgt_att ON tgt_att.attrelid = tgt.oid AND tgt_att.attnum = tk.attnum
  WHERE con.contype = 'f'
),
counts AS (
  SELECT tc.table_name, tc.column_name,
    (xpath('/row/c/text()', query_to_xml(
      format('SELECT count(*) AS c FROM %I.%I', tc.table_schema, tc.table_name),
      false, true, '')))[1]::text::bigint AS total_rows,
    (xpath('/row/c/text()', query_to_xml(
      format('SELECT count(*) AS c FROM %I.%I WHERE %I IS NULL',
             tc.table_schema, tc.table_name, tc.column_name),
      false, true, '')))[1]::text::bigint AS null_rows
  FROM tech_cols tc
),
idx AS (
  SELECT t.relname AS table_name, a.attname AS column_name, i.relname AS index_name,
         ix.indisunique AS is_unique, ix.indisprimary AS is_primary,
         pg_get_indexdef(ix.indexrelid) AS index_def
  FROM pg_index ix
  JOIN pg_class     t ON t.oid = ix.indrelid
  JOIN pg_class     i ON i.oid = ix.indexrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
  WHERE n.nspname = 'public'
    AND a.attname ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by|user_id|created_by)'
)
SELECT jsonb_pretty(jsonb_build_object(
  'bundle', 'A',
  'current_database', current_database(),
  'current_user', current_user,
  'q1a_columns', (
    SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.table_name, x.column_name), '[]'::jsonb)
    FROM (
      SELECT tc.*,
             f.tgt_schema || '.' || f.tgt_table || '.' || f.tgt_column AS fk_target,
             f.conname        AS fk_constraint,
             f.on_delete_code AS fk_on_delete_code
      FROM tech_cols tc
      LEFT JOIN fks f
        ON f.src_schema = tc.table_schema
       AND f.src_table  = tc.table_name
       AND f.src_column = tc.column_name
    ) x),
  'q1b_row_and_null_counts', (
    SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.table_name, c.column_name), '[]'::jsonb)
    FROM counts c),
  'q1c_fks_to_user_tables', (
    SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.src_table, f.src_column), '[]'::jsonb)
    FROM fks f
    WHERE f.tgt_schema = 'auth'
       OR f.tgt_table IN ('users','profiles','user_roles','technicians')),
  'q1d_indexes', (
    SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.table_name, i.index_name), '[]'::jsonb)
    FROM idx i),
  'rls_enabled_by_table', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'table', c.relname,
             'rls_enabled', c.relrowsecurity,
             'rls_forced', c.relforcerowsecurity) ORDER BY c.relname), '[]'::jsonb)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r')
)) AS bundle_a;
-- on_delete_code / on_update_code legend:
--   a = NO ACTION, r = RESTRICT, c = CASCADE, n = SET NULL, d = SET DEFAULT


-- =====================================================================
-- BUNDLE B — Step 2: EVERY live RLS policy in public + the technician subset
--
-- THIS BUNDLE SETTLES THE FOLKLORE. The claim under test is
-- "16 ALTER POLICY across 13 RLS policies". Repo replay says the real shape is
-- different (see SESSION-1-DB-RLS-FINDINGS.md, CORRECTIONS). Bundle B is the
-- only authority.
--
-- q2_all_policies is the authority, NOT q2_technician_referencing_policies:
-- the regex subset cannot see a policy that reaches a technician column through
-- a helper function. q2_policies_calling_public_functions closes that gap.
--
-- EXPECT ON photos: 4 technician policies (tech_select/insert/update/delete),
-- carrying 5 predicate bodies, because tech_update_photos has BOTH a qual and a
-- with_check. "Five policies" would be a miscount; five BODIES is correct.
-- =====================================================================
SELECT jsonb_pretty(jsonb_build_object(
  'bundle', 'B',
  'current_database', current_database(),
  'q2_total_policy_count_public', (
    SELECT count(*) FROM pg_policies WHERE schemaname = 'public'),
  'q2_all_policies', (
    SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.tablename, p.policyname), '[]'::jsonb)
    FROM (
      SELECT schemaname, tablename, policyname, permissive,
             roles::text AS roles, cmd, qual, with_check
      FROM pg_policies WHERE schemaname = 'public') p),
  'q2_technician_referencing_count', (
    SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual,'')       ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)'
        OR coalesce(with_check,'') ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)')),
  'q2_technician_predicate_body_count', (
    SELECT
      count(*) FILTER (WHERE coalesce(qual,'')       ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)')
    + count(*) FILTER (WHERE coalesce(with_check,'') ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)')
    FROM pg_policies WHERE schemaname = 'public'),
  'q2_technician_referencing_policies', (
    SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.tablename, p.policyname), '[]'::jsonb)
    FROM (
      SELECT schemaname, tablename, policyname, permissive,
             roles::text AS roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND (coalesce(qual,'')       ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)'
          OR coalesce(with_check,'') ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)')) p),
  'q2_policy_count_by_table', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table', t.tablename, 'policies', t.n)
                              ORDER BY t.tablename), '[]'::jsonb)
    FROM (SELECT tablename, count(*) AS n FROM pg_policies
          WHERE schemaname='public' GROUP BY tablename) t),
  'q2_policies_calling_public_functions', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'table', x.tablename, 'policy', x.policyname, 'calls_function', x.proname)
             ORDER BY x.tablename, x.policyname, x.proname), '[]'::jsonb)
    FROM (
      SELECT DISTINCT pol.tablename, pol.policyname, f.proname
      FROM pg_policies pol
      JOIN pg_proc f ON f.pronamespace = 'public'::regnamespace
      WHERE pol.schemaname = 'public'
        AND length(f.proname) > 3
        AND (coalesce(pol.qual,'') || ' ' || coalesce(pol.with_check,''))
            ~ ('\m' || f.proname || '\M')
    ) x)
)) AS bundle_b;


-- =====================================================================
-- BUNDLE C — Step 3: SECURITY DEFINER functions, anon EXECUTE, default ACL
--
-- !!! THE ORIGINAL SINGLE-STATEMENT BUNDLE C IS SUPERSEDED. It failed with:
-- !!!   ERROR: 42809: "array_agg" is an aggregate function
-- !!! Cause: `... OR pg_get_functiondef(p.oid) ~* '...'` forces pg_get_functiondef()
-- !!! onto every public function that misses the name regex, and it raises on
-- !!! aggregates. Fix: `p.prokind = 'f'` (normal functions only; trigger functions
-- !!! ARE prokind 'f', so they are still included). Split into C1/C1b/C2/C3 so one
-- !!! failure cannot take the others down. Run each block separately.
-- =====================================================================


-- ---------------------------------------------------------------------
-- C1 — THE COMPLETE anon EXECUTE SWEEP. No proname filter.
--
-- is_trigger_function separates EXPLOITABILITY from PRESENCE:
--   anon_execute=true + is_trigger_function=false -> DIRECTLY CALLABLE by an
--       unauthenticated PostgREST request. Real finding, triage individually.
--   anon_execute=true + is_trigger_function=true  -> not callable ("trigger
--       functions can only be called as triggers"), but still live proof the
--       pg_default_acl grant is active on this database.
--   anon_execute=false                            -> correctly revoked.
-- ---------------------------------------------------------------------
SELECT
  p.proname                                   AS function_name,
  pg_get_function_identity_arguments(p.oid)   AS args,
  p.pronargs                                  AS num_args,
  p.prokind                                   AS prokind,
  pg_get_function_result(p.oid)               AS returns,
  (pg_get_function_result(p.oid) = 'trigger') AS is_trigger_function,
  has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_role_execute,
  p.proacl::text                              AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND p.prokind = 'f'
ORDER BY anon_execute DESC, is_trigger_function ASC, p.proname;


-- ---------------------------------------------------------------------
-- C1b — full definitions for ONLY the anon-reachable ones, so C1 stays readable.
-- ---------------------------------------------------------------------
SELECT p.proname                                   AS function_name,
       pg_get_function_identity_arguments(p.oid)   AS args,
       (pg_get_function_result(p.oid) = 'trigger') AS is_trigger_function,
       pg_get_functiondef(p.oid)                   AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f'
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY is_trigger_function ASC, p.proname;


-- ---------------------------------------------------------------------
-- C2a — THE AUTHORING GATE. Exact-name check, ALL schemas.
-- MUST RETURN ZERO ROWS before the junction migration is authored.
--   present over a DIFFERENT junction table -> STOP, re-point the design.
--   present with a different signature       -> CREATE OR REPLACE aborts 42P13.
-- ---------------------------------------------------------------------
SELECT n.nspname AS schema, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns,
       p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('is_assigned_to_lead','set_lead_assignments',
                    'lead_assignments_sync_pointer','lead_assignments_assert_contiguous')
ORDER BY n.nspname, p.proname;


-- ---------------------------------------------------------------------
-- C2b — table-name gate. MUST RETURN ZERO ROWS.
-- ---------------------------------------------------------------------
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_name IN ('lead_assignments','lead_technicians','leads_technicians')
ORDER BY table_schema, table_name;


-- ---------------------------------------------------------------------
-- C2c — does an EQUIVALENT already exist under a different name?
-- Not a gate; read the definitions and judge. prokind='f' is what fixes 42809.
-- ---------------------------------------------------------------------
SELECT p.proname                                 AS function_name,
       p.prosecdef                               AS security_definer,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_functiondef(p.oid)                 AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
  AND (p.proname ~* '(assign|owns|is_.*lead|can_access|has_access|lead_access|is_admin|is_tech|has_role)'
    OR pg_get_functiondef(p.oid) ~* '(technician|assigned_to|tech_id|completed_by)')
ORDER BY p.proname;


-- ---------------------------------------------------------------------
-- C3 — pg_default_acl: the grant that causes the anon trap.
-- ---------------------------------------------------------------------
SELECT d.defaclrole::regrole::text          AS grantor,
       coalesce(n.nspname, '(all schemas)') AS schema,
       d.defaclobjtype::text                AS objtype,
       CASE d.defaclobjtype
         WHEN 'r' THEN 'table'    WHEN 'S' THEN 'sequence' WHEN 'f' THEN 'function'
         WHEN 'T' THEN 'type'     WHEN 'n' THEN 'schema'
         ELSE d.defaclobjtype::text END     AS objtype_name,
       d.defaclacl::text                    AS default_acl
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
ORDER BY schema, objtype;


-- =====================================================================
-- BUNDLE D — CROSS-SESSION QUERIES (injected verbatim, not rewritten)
-- =====================================================================

-- ---------------------------------------------------------------------
-- D-COUNTS — small scalar checks bundled into one cell.
-- Contains SESSION 3 PENDING-1, SESSION 3 PENDING-2, and the SESSION 2
-- addendum A7 mismatch-detection query.
-- ---------------------------------------------------------------------
SELECT jsonb_pretty(jsonb_build_object(
  'bundle', 'D-COUNTS',

  -- SESSION 3 PENDING-1: confirm ai_summary_versions really has NO inspector_id.
  -- Repo migration + generated types both say it does not, but generated types lag.
  'd1_ai_summary_versions_columns', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'column_name', column_name, 'data_type', data_type, 'is_nullable', is_nullable)
             ORDER BY ordinal_position), '[]'::jsonb)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ai_summary_versions'),

  -- SESSION 3 PENDING-2: confirm F2 (is remediation_completed_by unreachable on
  -- the customer PDF?). F2 holds only if EVERY completed_by resolves to a profile
  -- with a non-empty full_name. If BOTH counts are 0, F2 is confirmed.
  'd2_f2_profile_resolution', (
    SELECT to_jsonb(x) FROM (
      SELECT
        count(*) FILTER (WHERE p.id IS NULL)                          AS missing_profile,
        count(*) FILTER (WHERE p.id IS NOT NULL
                           AND coalesce(trim(p.full_name), '') = '')  AS blank_full_name,
        count(*)                                                      AS total_job_completions
      FROM public.job_completions jc
      LEFT JOIN public.profiles p ON p.id = jc.completed_by
    ) x),

  -- SESSION 2 ADDENDUM A7: how many historical job_completions were submitted by
  -- someone other than the lead's assigned technician?
  -- lead_unassigned is the bucket that decides the backfill strategy.
  -- NOTE: a null assigned_to does NOT prove the job was unassigned — the
  -- LeadDetail.tsx:526 reversion path may have nulled it. See E1.
  'd6_completed_by_vs_lead_assignment', (
    SELECT to_jsonb(x) FROM (
      SELECT
        count(*) FILTER (WHERE jc.completed_by IS DISTINCT FROM l.assigned_to) AS mismatched,
        count(*) FILTER (WHERE jc.completed_by = l.assigned_to)                AS matched,
        count(*) FILTER (WHERE l.assigned_to IS NULL)                          AS lead_unassigned,
        count(*)                                                               AS total
      FROM public.job_completions jc
      JOIN public.leads l ON l.id = jc.lead_id
    ) x)
)) AS bundle_d_counts;


-- ---------------------------------------------------------------------
-- D3 — SESSION 3 PENDING-3 / §5.6, VERBATIM.
-- Historical drift on job_completions.completed_by. Row listing, runs alone.
--
-- Read the result as:
--   never_booked_on_this_job = true  -> HARD drift. The name on that customer's
--        PDF belongs to someone never rostered on the job.
--   differs_from_lead_assignment = true, never_booked = false -> soft drift.
--   completed_by_name IS DISTINCT FROM free_text_name -> strongest evidence F2
--        is real; the tech believed they had set a different name.
-- This is also the input to SESSION 3's business question Q7.
-- ---------------------------------------------------------------------
SELECT
  jc.id                            AS job_completion_id,
  jc.job_number,
  jc.lead_id,
  jc.completion_date,
  jc.completed_by,
  pc.full_name                     AS completed_by_name,
  jc.remediation_completed_by      AS free_text_name,
  l.assigned_to                    AS lead_assigned_to,
  pa.full_name                     AS lead_assigned_name,
  (jc.completed_by IS DISTINCT FROM l.assigned_to) AS differs_from_lead_assignment,
  bk.booked_technicians,
  (bk.booked_technicians IS NOT NULL
     AND NOT (jc.completed_by = ANY (bk.booked_technicians))) AS never_booked_on_this_job
FROM public.job_completions jc
LEFT JOIN public.leads    l  ON l.id = jc.lead_id
LEFT JOIN public.profiles pc ON pc.id = jc.completed_by
LEFT JOIN public.profiles pa ON pa.id = l.assigned_to
LEFT JOIN LATERAL (
  SELECT array_agg(DISTINCT cb.assigned_to) AS booked_technicians
  FROM public.calendar_bookings cb
  WHERE cb.lead_id = jc.lead_id
    AND cb.event_type = 'job'
    AND cb.status <> 'cancelled'
) bk ON TRUE
ORDER BY jc.completion_date DESC;


-- ---------------------------------------------------------------------
-- D4 — SESSION 3 PENDING-4, VERBATIM.
-- Has any generated AI summary ever echoed an inspector's name into
-- customer-facing text? generate-inspection-summary/index.ts:219 injects
-- "INSPECTOR: <name>" into the prompt.
-- EXPECT ZERO ROWS. Any hit = a technician name reached a customer through an
-- unmonitored channel.
-- ---------------------------------------------------------------------
SELECT v.id, v.inspection_id, v.version_number, i.inspector_name
FROM public.ai_summary_versions v
JOIN public.inspections i ON i.id = v.inspection_id
WHERE coalesce(trim(i.inspector_name), '') <> ''
  AND (
       v.ai_summary_text          ILIKE '%' || i.inspector_name || '%'
    OR v.what_we_found_text       ILIKE '%' || i.inspector_name || '%'
    OR v.what_we_will_do_text     ILIKE '%' || i.inspector_name || '%'
    OR v.problem_analysis_content ILIKE '%' || i.inspector_name || '%'
    OR v.demolition_content       ILIKE '%' || i.inspector_name || '%'
  );


-- ---------------------------------------------------------------------
-- D5 — SESSION 3 PENDING-5, VERBATIM.
-- Confirm the live RLS policy bodies match the repo migrations, since policies
-- can be edited directly in Studio.
-- Cross-check against Bundle B. If D5 and Bundle B disagree, something is wrong
-- with one of the queries — resolve before designing any policy change.
-- ---------------------------------------------------------------------
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('photos', 'inspections', 'inspection_areas', 'ai_summary_versions')
ORDER BY tablename, policyname;


-- =====================================================================
-- BUNDLE E — SESSION 1 ADDITIONS
-- Each exists because a constraint in the injection cannot be satisfied
-- without it. Not optional extras.
-- =====================================================================

-- ---------------------------------------------------------------------
-- E-BUNDLE — three checks that size decisions the design cannot make blind.
-- ---------------------------------------------------------------------
SELECT jsonb_pretty(jsonb_build_object(
  'bundle', 'E',

  -- E1 — BACKFILL BUCKET SIZING.
  -- Required by injection PART F2: "a null assigned_to does NOT prove the job was
  -- unassigned — LeadDetail.tsx:526 may have nulled it on reversion. Your backfill
  -- strategy must handle that ambiguity explicitly."
  -- bucket1 -> backfill directly, assignment_order = 1.
  -- bucket2 -> AMBIGUOUS. Pointer is null but bookings name technicians. Do NOT
  --            auto-backfill: that would resurrect an assignment a reversion
  --            deliberately cleared. Manual review list.
  -- bucket3 -> genuinely unassigned. No junction rows. Correct as-is.
  -- EXPECTED: bucket1 = the backfill row count = leads.assigned_to non-null count
  --           from Bundle A q1b. These two numbers MUST agree.
  'e1_backfill_buckets', (
    SELECT to_jsonb(x) FROM (
      SELECT
        count(*)                                                                        AS leads_total,
        count(*) FILTER (WHERE l.assigned_to IS NOT NULL)                               AS bucket1_pointer_set,
        count(*) FILTER (WHERE l.assigned_to IS NULL AND coalesce(bk.tech_count,0) > 0)  AS bucket2_null_pointer_but_booked,
        count(*) FILTER (WHERE l.assigned_to IS NULL AND coalesce(bk.tech_count,0) = 0)  AS bucket3_truly_unassigned
      FROM public.leads l
      LEFT JOIN LATERAL (
        SELECT count(DISTINCT cb.assigned_to) AS tech_count
        FROM public.calendar_bookings cb
        WHERE cb.lead_id = l.id AND cb.status <> 'cancelled'
      ) bk ON TRUE
    ) x),

  -- E2 — EXISTING DOUBLE-BOOKING PRE-FLIGHT.
  -- Required by injection PART B(c): uniqueness constraints preventing the same
  -- technician being double-booked in one slot.
  -- An EXCLUDE constraint CANNOT be added if existing rows already violate it.
  -- Overlap test mirrors the app's half-open bounds (bookingService.ts:43-72
  -- uses lt/gt, never lte/gte), so this counts exactly what the app calls a clash.
  -- EXPECTED: 0. Any non-zero means the constraint must be deferred to a cleanup
  -- migration, and it tells you the app's fail-open conflict check has already
  -- let real double-bookings through.
  'e2_existing_overlapping_bookings', (
    SELECT to_jsonb(x) FROM (
      SELECT count(*)                     AS overlapping_pairs,
             count(DISTINCT a.assigned_to) AS technicians_affected
      FROM public.calendar_bookings a
      JOIN public.calendar_bookings b
        ON a.assigned_to = b.assigned_to
       AND a.id < b.id
       AND a.status <> 'cancelled'
       AND b.status <> 'cancelled'
       AND a.start_datetime < b.end_datetime
       AND a.end_datetime   > b.start_datetime
    ) x),

  -- E3 — BOOKING GROUP NATURAL-KEY SHAPE.
  -- Required by injection PART B(a): a booking_group_id so all rows for one
  -- job-day are addressable as a unit.
  -- Tests whether (lead_id, event_type, start_datetime) is ALREADY unique.
  -- EXPECTED: every group has rows_in_group = 1, because calendar_bookings has
  -- one technician per row today. If any group is >1, the natural key is already
  -- ambiguous, an explicit booking_group_id column is mandatory rather than
  -- merely preferable, and the group backfill cannot use the natural key.
  'e3_rows_per_natural_group', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'rows_in_group', g.rows_in_group, 'number_of_groups', g.groups)
             ORDER BY g.rows_in_group), '[]'::jsonb)
    FROM (
      SELECT rows_in_group, count(*) AS groups
      FROM (
        SELECT lead_id, event_type, start_datetime, count(*) AS rows_in_group
        FROM public.calendar_bookings
        GROUP BY lead_id, event_type, start_datetime
      ) inner_g
      GROUP BY rows_in_group
    ) g),

  -- E3b — total booking rows, for scale.
  'e3b_calendar_bookings_total', (SELECT count(*) FROM public.calendar_bookings)
)) AS bundle_e;


-- ---------------------------------------------------------------------
-- E4 — AUDIT TRIGGER ENUMERATION.
-- Required by injection PART E(3): "job_completions is an audit-triggered table.
-- Account for the audit rows your backfill will generate." And SESSION 2 A7
-- note 3: "New column, existing triggers — worth confirming the trigger
-- definition does not enumerate columns."
--
-- Read for TWO things:
--   1. Does any trigger fire on UPDATE OF <column list>? A column list means
--      adding submitted_by changes nothing; no list means every backfill UPDATE
--      writes an audit row.
--   2. How many triggers sit on leads — this sets the audit cost of the
--      junction -> leads.assigned_to sync trigger proposed in Step 5d.
-- ---------------------------------------------------------------------
SELECT
  c.relname                AS table_name,
  t.tgname                 AS trigger_name,
  p.proname                AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_def
FROM pg_trigger t
JOIN pg_class     c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc      p ON p.oid = t.tgfoid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND c.relname IN ('job_completions','leads','calendar_bookings','photos','inspections')
ORDER BY c.relname, t.tgname;


-- ---------------------------------------------------------------------
-- E5 — THE AUDIT FUNCTION BODY ITSELF.
-- Confirms whether audit_log_trigger() enumerates columns (in which case a new
-- submitted_by column is invisible to the audit trail until the function is
-- updated) or serialises the whole row.
-- Also re-confirms the documented auth.uid() -> app.acting_user_id fallback.
-- ---------------------------------------------------------------------
SELECT p.proname   AS function_name,
       p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname ~* 'audit'
ORDER BY p.proname;

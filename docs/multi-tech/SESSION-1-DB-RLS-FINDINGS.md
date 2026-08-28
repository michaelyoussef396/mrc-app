# SESSION 1 — DB / RLS INVENTORY

**Worktree:** `~/mrc-multi-tech` · **Branch:** `feat/multi-tech-inventory` · **HEAD:** `c47b8ed`
**Date:** 2026-08-28
**Evidence:** live DEV (`ctppzqnysmzynkxjlzta`), read-only SELECTs run in Studio by Michael, ref
confirmed by browser URL. Raw output pasted beneath every claim.
**Mode:** READ-ONLY. No migration written or applied, nothing deployed, PROD never targeted.
**Files created by this session:** this document and `SESSION-1-DEV-QUERY-PACK.sql`. Nothing else.

---

# 0. HEADLINE

| Question | Answer |
|---|---|
| **Policy-rewrite count** | **16 policies · 20 predicate bodies · 32 DDL statements.** 17 technician-referencing policies exist live; **1 (`leads.tech_update_assigned_leads`) is deliberately excluded** — widening it is a privilege escalation. See §5f-E. |
| **Backfill row count** | **2 — ⚠️ DEV ONLY.** `leads` total 3, `assigned_to` NULL 1. Cross-check with `e1` **PASSES**. **PROD has 101+ leads. This number does not transfer. See §PROD PRE-FLIGHT.** |
| **Statement form** | **`DROP POLICY` + `CREATE POLICY`.** Zero `ALTER POLICY` statements exist anywhere in this project's 124 migrations (211 CREATE / 88 DROP / **0 ALTER**). |
| **Fan-out verdict** | **AGREE** — and live evidence *strengthens* it: `calendar_bookings` has no per-technician RLS at all, so fan-out has zero RLS consequences on that table. |
| **Cross-check D5 vs Bundle B** | ✅ **PASS.** 13 rows, byte-identical predicates. Proceed. |
| **Cross-check e1 vs Bundle A** | ✅ **PASS.** Both say 2. Proceed. |
| **Still pending** | **Bundle C only** — it errored. Fixed version in §3. It does not gate the migration; it gates the completeness of the `anon` EXECUTE sweep. |

## 🔴 THE FINDING THAT CHANGES PART D

**`job_completions` RLS was a total blind spot, and it is worse than photos.**
Three live policies gate `job_completions` itself on `completed_by = auth.uid()`, including the
**INSERT** `WITH CHECK`. Re-sourcing `completed_by` to the primary therefore does not merely
revoke a secondary's *photo* access — **it makes it impossible for a secondary technician to
create the job-completion record at all.** The INSERT is refused by RLS.

Part D's atomic unit must grow from three items to four. Detail in **§5f-D2** and **R2**.

---

# CORRECTIONS TO PRIOR ASSUMPTIONS

## C-1 · The folklore is wrong, and so was my own repo-derived hypothesis

| Source | Technician-referencing policies | Verdict |
|---|---|---|
| Brief / `docs/TONIGHT_BATCH_RECON.md` | 13 (also stated as 15, 16, 17 in the same doc) | **WRONG — undercounts by 4** |
| My repo replay (previous revision of this doc) | 28 survivors (23 ex-ghosts, 20 ex-drop-alls) | **WRONG — overcounts by 11** |
| **Live DEV `pg_policies`** | **17 policies / 22 predicate bodies** | **AUTHORITATIVE** |

```json
"q2_total_policy_count_public": 80,
"q2_technician_referencing_count": 17,
"q2_technician_predicate_body_count": 22
```

I was closer than the folklore on *shape* and further away on *count*. Both numbers are discarded.

**On the coincidence:** my rewrite count below is 16, and the folklore said "16 `ALTER POLICY`".
**That is a coincidence, not vindication.** The folklore's 16 ranged over a 13-policy set that
omitted `job_completions` entirely — and `job_completions` supplies 3 of my 16. Different set,
different statement type, same integer.

## C-2 · Zero `ALTER POLICY` statements exist in this project

Comment-stripped replay of all 124 migrations: **211 `CREATE POLICY`, 88 `DROP POLICY`, 0 `ALTER
POLICY`.** (A naive grep returns 311 statements; `20251111000016:645-757` holds a
`/* ROLLBACK SCRIPT */` block with 12 commented-out policy statements.) §5f is authored as
DROP+CREATE pairs accordingly.

## C-3 · ✅ CONFIRMED LIVE — the photos counting trap

The injection said `completed_by` appears in "FIVE photos RLS policy bodies". Exactly right, and
it is **4 policies / 5 bodies** — `tech_update_photos` carries both a `qual` and a `with_check`.
Live `photos` has **5 policies total** (4 technician + `admin_all_photos`):

```json
{ "table": "photos", "policies": 5 }
```

All four technician policies confirmed present with both branches (`leads.assigned_to` transitive
**OR** `job_completions.completed_by`). Had we counted "5 completed_by policies" we would have
over-counted by one and masked a real miss.

## C-4 · ✅ CONFIRMED LIVE — `ai_summary_versions.inspector_id` does not exist

Injection A2 confirmed. All 23 columns returned; there is no `inspector_id`. `generated_by`
(uuid, nullable) is the real provenance column and needs no change.

```json
"d1_ai_summary_versions_columns": [ "id","inspection_id","version_number","generation_type",
"generated_by","generated_at","model_name","model_version","system_prompt_hash","user_prompt",
"prompt_tokens","response_tokens","regeneration_feedback","ai_summary_text","what_we_found_text",
"what_we_will_do_text","what_you_get_text","problem_analysis_content","demolition_content",
"superseded_at","superseded_by_version_id","approved_at","approved_by" ]
```

## C-5 · ❌ CORRECTION TO SESSION 3 — the PDF-system `inspector_id` policies do not exist

SESSION 3 §2.3 lists "PDF-system RLS (`20241221000000_add_pdf_system.sql:71,88`)" as anchored on
`inspections.inspector_id`, under audience **SECURITY**. My previous revision hedged that one of
the two was "probably shadowed". Live is blunter — **neither exists.** `pdf_versions` has exactly
two policies and neither mentions `inspector_id`:

```json
{"tablename":"pdf_versions","policyname":"Users can create PDF versions","cmd":"INSERT",
 "with_check":"(( SELECT auth.uid() AS uid) IS NOT NULL)"}
{"tablename":"pdf_versions","policyname":"Users can view PDF versions","cmd":"SELECT",
 "qual":"true","roles":"{public}"}
```

**Nothing to rewrite on `pdf_versions`.** Secondary technicians already have full read access to
every PDF version.

> ⚠️ **Out-of-scope security note, reported not acted on:** `"Users can view PDF versions"` is
> `SELECT USING true` to role `{public}`. Every PDF version row is readable by any caller the
> table grants reach. Same shape on `job_completion_pdf_versions`
> (`SELECT qual: "true"`, role `{authenticated}`). Not this workstream's to fix; flagging it.

## C-6 · ❌ CORRECTION TO MY OWN HYPOTHESIS — `calendar_bookings.technicians_view_own_bookings` does not exist

I called it a "HIGH-VALUE OMISSION" from the folklore. It is not live. `calendar_bookings` has
**exactly one policy**:

```json
{"tablename":"calendar_bookings","policyname":"authenticated_full_access_bookings","cmd":"ALL",
 "qual":"(( SELECT auth.uid() AS uid) IS NOT NULL)",
 "with_check":"(( SELECT auth.uid() AS uid) IS NOT NULL)","roles":"{public}"}
```

**Every authenticated user can read and write every booking row.** There is no per-technician RLS
on `calendar_bookings` whatsoever.

**This materially simplifies the fan-out decision** — fan-out has *zero* RLS consequences on that
table. It also means the `.eq('assigned_to', …)` filters in application code are the *only* thing
scoping a technician's calendar view; they are a UX filter, not a security boundary.

## C-7 · ✅ Ghost tables confirmed absent

No `calendar_events` and no `inspection_reports` policies appear in the 80. My ghost analysis was
correct: the `20251111000016` rename never took effect live.

## C-8 · ✅ RESOLVED — `job_completions` RLS (was a total blind spot)

Zero policy DDL for this table exists anywhere in `supabase/migrations/**`, yet **four policies are
live.** Its entire RLS surface was remote-only and invisible to all three sessions. See §5f-D.

## C-9 · ❌ CORRECTION TO MY OWN DESIGN — the junction FK must target `auth.users`, not `profiles`

My previous revision left the FK target `<PENDING>` with `profiles(id)` as the leading candidate,
and the adversarial pass flagged a "FK domain mismatch" as CRITICAL. **It was right, and live
evidence settles it:**

```json
{"conname":"leads_assigned_to_fkey","src_table":"leads","src_column":"assigned_to",
 "tgt_schema":"auth","tgt_table":"users","tgt_column":"id","on_delete_code":"a"}
{"conname":"profiles_id_fkey","src_table":"profiles","src_column":"id",
 "tgt_schema":"auth","tgt_table":"users","on_delete_code":"c"}
```

`leads.assigned_to → auth.users(id)`, `ON DELETE NO ACTION`. `profiles.id` is itself FK'd to
`auth.users` — so **`profiles` is a strict subset of `auth.users`**. A junction FK'd to `profiles`
would reject any `assigned_to` value belonging to an auth user without a profiles row, turning a
backfill into a hard `23503` and a working assignment write into a failing one.

**Decision: `technician_id uuid NOT NULL REFERENCES auth.users(id)`, `ON DELETE NO ACTION`** —
mirroring `leads.assigned_to` exactly. This also means **R16 disappears**: `manage-users` delete
behaviour is unchanged from today, because the constraint is identical to the one already there.

(Note the newer tables — `lead_notes.author_id`, `lead_note_attachments.uploaded_by`,
`lead_note_mentions.mentioned_user_id` — do target `public.profiles`. The project is drifting that
way. Do not follow that drift here: this column must mirror the one it caches.)

---

# 1. LIVE TECHNICIAN SCHEMA · ✅ EVIDENCED

## 1a · Columns, types, nullability, FK targets

```json
{"table_name":"leads","column_name":"assigned_to","data_type":"uuid","is_nullable":"YES",
 "column_default":null,"fk_target":"auth.users.id","fk_constraint":"leads_assigned_to_fkey","fk_on_delete_code":"a"}
{"table_name":"calendar_bookings","column_name":"assigned_to","data_type":"uuid","is_nullable":"NO",
 "fk_target":"auth.users.id","fk_constraint":"calendar_bookings_assigned_to_fkey","fk_on_delete_code":"a"}
{"table_name":"inspections","column_name":"inspector_id","data_type":"uuid","is_nullable":"NO",
 "fk_target":"auth.users.id","fk_constraint":"inspections_inspector_id_fkey","fk_on_delete_code":"a"}
{"table_name":"inspections","column_name":"inspector_name","data_type":"text","is_nullable":"YES","fk_target":null}
{"table_name":"job_completions","column_name":"completed_by","data_type":"uuid","is_nullable":"NO",
 "fk_target":"auth.users.id","fk_constraint":"job_completions_completed_by_fkey","fk_on_delete_code":"a"}
{"table_name":"job_completions","column_name":"remediation_completed_by","data_type":"character varying","is_nullable":"YES"}
{"table_name":"inspections","column_name":"additional_info_technician","data_type":"text","is_nullable":"YES"}
```

Legend: `a` = NO ACTION, `c` = CASCADE, `n` = SET NULL, `r` = RESTRICT.

**Every nullability claim in `types.ts` is confirmed against live.** `leads.assigned_to` nullable
(**S1 ✅**); `calendar_bookings.assigned_to`, `inspections.inspector_id`,
`job_completions.completed_by` all NOT NULL.

## 1b · Row and NULL counts — **the backfill number**

```json
{"table_name":"leads","column_name":"assigned_to","total_rows":3,"null_rows":1}
{"table_name":"calendar_bookings","column_name":"assigned_to","total_rows":3,"null_rows":0}
{"table_name":"inspections","column_name":"inspector_id","total_rows":2,"null_rows":0}
{"table_name":"job_completions","column_name":"completed_by","total_rows":1,"null_rows":0}
```

> # BACKFILL ROW COUNT = **2** (3 leads − 1 NULL) — ⚠️ **DEV ONLY.**
>
> DEV is a near-empty sandbox: **3 leads, 3 bookings, 2 inspections, 1 job completion.**
> **PROD carries 101+ leads.** Every conclusion below that is derived from a *count* rather than
> from *schema shape* is therefore provisional and must be re-measured on PROD before anything is
> applied there. Schema, FK targets, nullability, policy text and policy count are structural and
> do transfer; row counts and "we found zero of X" do not.
>
> **See §PROD PRE-FLIGHT for the exact re-runs and the decision each one gates.**

## 1c · Foreign keys into user tables

All technician columns target **`auth.users(id)`** with `on_delete = 'a'` (NO ACTION):
`leads.assigned_to`, `leads.created_by`, `calendar_bookings.assigned_to`,
`inspections.inspector_id`, `job_completions.completed_by`, `pdf_versions.created_by`,
`photos.uploaded_by`, `photo_history.changed_by`, `invoices.created_by`,
`ai_summary_versions.generated_by`/`approved_by`.

Only the lead-notes family targets `public.profiles`: `lead_notes.author_id` (`r` RESTRICT),
`lead_note_attachments.uploaded_by` (`r`), `lead_note_mentions.mentioned_user_id` (`c` CASCADE).

## 1d · Indexes

`idx_leads_assigned_to` on `leads(assigned_to)`; four composite indexes leading with
`calendar_bookings.assigned_to`; `idx_inspections_inspector_id`;
`idx_job_completions_completed_by`. Three `leads` composites also carry `assigned_to` as a trailing
column (`idx_leads_status_assigned_created`, `idx_leads_inspection_scheduled`,
`idx_leads_job_scheduled`).

## 1e · RLS posture — **S5 RESOLVED**

All 32 public tables: `rls_enabled = true`, **`rls_forced = false` on every single one.**

> **This clears the `42P17` recursion hazard.** `is_assigned_to_lead()` reads `public.leads` while
> being called from a `public.leads` policy; that is safe precisely because no table has FORCE ROW
> LEVEL SECURITY and a SECURITY DEFINER function owned by the table owner bypasses that table's
> RLS. The literal-disjunct escape hatch in §5f-A is retained anyway, at zero cost.

---

# 2. EVERY LIVE RLS POLICY · ✅ EVIDENCED

**80 policies in `public`. 17 reference a technician column, across 22 predicate bodies.**

## 2a · The 17, by bucket

| # | Table | Policy | Cmd | Bodies | Axis |
|---|---|---|---|---|---|
| 1 | `leads` | `tech_select_assigned_leads` | SELECT | 1 | **A** direct `assigned_to` |
| 2 | `leads` | `tech_update_assigned_leads` | UPDATE | 2 | **A** direct — ⛔ **EXCLUDED, see §5f-E** |
| 3 | `inspections` | `tech_select_own_inspections` | SELECT | 1 | **B** 1-hop |
| 4 | `inspections` | `tech_insert_own_inspections` | INSERT | 1 | **B** 1-hop |
| 5 | `inspections` | `tech_update_own_inspections` | UPDATE | 2 | **B** 1-hop |
| 6 | `inspection_areas` | `tech_all_own_inspection_areas` | ALL | 2 | **B** 2-hop |
| 7 | `invoices` | `tech_read_invoices` | SELECT | 1 | **B** 1-hop |
| 8 | `photo_history` | `tech_select_photo_history` | SELECT | 1 | **B** 2-hop |
| 9 | `photo_history` | `tech_insert_photo_history` | INSERT | 1 | **B** 2-hop |
| 10 | `photos` | `tech_select_photos` | SELECT | 1 | **B**+**D** |
| 11 | `photos` | `tech_insert_photos` | INSERT | 1 | **B**+**D** |
| 12 | `photos` | `tech_update_photos` | UPDATE | 2 | **B**+**D** |
| 13 | `photos` | `tech_delete_photos` | DELETE | 1 | **B**+**D** |
| 14 | `ai_summary_versions` | `technicians_see_assigned` | SELECT | 1 | **C** `inspector_id` |
| 15 | `job_completions` | `Technicians can view own job completions` | SELECT | 1 | **D** `completed_by` |
| 16 | `job_completions` | `Technicians can update own job completions` | UPDATE | 2 | **D** `completed_by` |
| 17 | `job_completions` | `Technicians can insert own job completions` | INSERT | 1 | **D** `completed_by` |

Bodies: 1+2+1+1+2+2+1+1+1+1+1+2+1+1+1+2+1 = **22** ✅ matches `q2_technician_predicate_body_count`.

## 2b · Verbatim predicates (the four distinct shapes)

**A — direct on `leads`:**
```
tech_select_assigned_leads   SELECT  qual: (assigned_to = auth.uid())
tech_update_assigned_leads   UPDATE  qual: (assigned_to = auth.uid())
                                     with_check: (assigned_to = auth.uid())
```

**B — 1-hop transitive:**
```
tech_select_own_inspections  SELECT  qual:
  (EXISTS ( SELECT 1 FROM leads l WHERE ((l.id = inspections.lead_id) AND (l.assigned_to = auth.uid()))))
tech_read_invoices           SELECT  qual: same shape over invoices.lead_id
```

**B — 2-hop transitive:**
```
tech_all_own_inspection_areas ALL  qual & with_check:
  (EXISTS ( SELECT 1 FROM (inspections i JOIN leads l ON ((l.id = i.lead_id)))
     WHERE ((i.id = inspection_areas.inspection_id) AND (l.assigned_to = auth.uid()))))
```

**B+D — the photos two-branch shape (all four policies, verbatim):**
```
((EXISTS ( SELECT 1 FROM (inspections i JOIN leads l ON ((l.id = i.lead_id)))
   WHERE ((i.id = photos.inspection_id) AND (l.assigned_to = auth.uid()))))
 OR (EXISTS ( SELECT 1 FROM job_completions jc
   WHERE ((jc.id = photos.job_completion_id) AND (jc.completed_by = auth.uid())))))
```

**C — `inspector_id` axis:**
```
technicians_see_assigned  SELECT  qual:
  (inspection_id IN ( SELECT inspections.id FROM inspections WHERE (inspections.inspector_id = auth.uid())))
```

**D — `job_completions`, the blind spot:**
```
Technicians can view own job completions    SELECT      qual: ((completed_by = auth.uid()) OR is_admin())
Technicians can update own job completions  UPDATE      qual & with_check: ((completed_by = auth.uid()) OR is_admin())
Technicians can insert own job completions  INSERT  with_check: ((completed_by = auth.uid()) OR is_admin())
```

## 2c · ✅ Bucket E is EMPTY — no policy reaches an assignment column through a helper

`q2_policies_calling_public_functions` returned 18 rows. **Every one calls `is_admin` or
`has_role`** — role-membership checks over `user_roles`/`roles`, not assignment checks. The same
logic appears inlined in `audit_logs`/`error_logs` policies, confirming what those helpers do:

```
(EXISTS ( SELECT 1 FROM (user_roles ur JOIN roles r ON ((ur.role_id = r.id)))
   WHERE ((ur.user_id = auth.uid()) AND (r.name = 'admin'::text))))
```

**No policy reaches an assignment column indirectly. The 17 is complete.** (Bundle C's re-run will
print the two helper bodies for final confirmation; nothing in the plan depends on it.)

## 2d · ✅ CROSS-CHECK — D5 vs Bundle B (deliverable #2)

D5 returned **13 rows** for `photos`, `inspections`, `inspection_areas`, `ai_summary_versions`.
Bundle B's per-table counts for the same four: `photos` 5 + `inspections` 4 +
`inspection_areas` 2 + `ai_summary_versions` 2 = **13**. Every `qual`/`with_check` string is
byte-identical between the two result sets.

> ### ✅ NO DISAGREEMENT. Evidence is self-consistent. Cleared to design.

---

# 3. SECURITY DEFINER FUNCTIONS · ⚠️ BUNDLE C ERRORED — PARTIAL EVIDENCE

## 3a · Why it failed, and the fix

```
Error: Failed to run sql query: ERROR: 42809: "array_agg" is an aggregate function
```

**Root cause:** `q3_assignment_check_candidates` filters
`... OR pg_get_functiondef(p.oid) ~* '(technician|...)'`. That `OR` forces
`pg_get_functiondef()` to be evaluated for **every** function in `public` whose name misses the
first regex — and `pg_get_functiondef()` raises `42809` when handed an aggregate. My query never
excluded aggregates. **My defect, not a data problem.**

**Fix: add `p.prokind = 'f'`** (normal functions only; excludes aggregates `a`, window `w`,
procedures `p`), and split the three sub-queries so one failure cannot take the others down:

**C1 — the COMPLETE `anon` EXECUTE sweep. No `proname` filter.**
`is_trigger_function` is what separates *exploitability* from *presence*: a trigger function
returns `trigger` and takes no arguments, so a direct call raises *"trigger functions can only be
called as triggers"*. A non-trigger function with `anon_execute = true` **is** callable by an
unauthenticated PostgREST request.

```sql
-- C1 — every SECURITY DEFINER function in public, with grantees and callability.
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
  AND p.prokind = 'f'          -- excludes aggregates; trigger functions ARE prokind 'f'
ORDER BY anon_execute DESC, is_trigger_function ASC, p.proname;
```

**How to read C1:**

| `anon_execute` | `is_trigger_function` | Verdict |
|---|---|---|
| `true` | **`false`** | 🔴 **Directly callable by an unauthenticated request. Real finding — triage individually.** |
| `true` | `true` | 🟡 Present but not exploitable. Still live proof the `pg_default_acl` grant is active. |
| `false` | either | ✅ Correctly revoked. |

```sql
-- C1b — full definitions for ONLY the anon-reachable ones, so C1 stays readable.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       (pg_get_function_result(p.oid) = 'trigger') AS is_trigger_function,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f'
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY is_trigger_function ASC, p.proname;
```

**C2 — THE AUTHORING GATE. C2a and C2b must BOTH return zero rows.**

```sql
-- C2a — exact-name check, ALL schemas (not just public). MUST RETURN ZERO ROWS.
SELECT n.nspname AS schema, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns,
       p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('is_assigned_to_lead','set_lead_assignments',
                    'lead_assignments_sync_pointer','lead_assignments_assert_contiguous')
ORDER BY n.nspname, p.proname;
```

```sql
-- C2b — table-name check. MUST RETURN ZERO ROWS.
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_name IN ('lead_assignments','lead_technicians','leads_technicians')
ORDER BY table_schema, table_name;
```

```sql
-- C2c — does an EQUIVALENT already exist under a different name?
-- Not a gate; read the definitions and judge. prokind='f' is what fixes the 42809.
SELECT p.proname AS function_name,
       p.prosecdef AS security_definer,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
  AND (p.proname ~* '(assign|owns|is_.*lead|can_access|has_access|lead_access|is_admin|is_tech|has_role)'
    OR pg_get_functiondef(p.oid) ~* '(technician|assigned_to|tech_id|completed_by)')
ORDER BY p.proname;
```

**C3 — `pg_default_acl`, the grant that causes the trap.**

```sql
SELECT d.defaclrole::regrole::text            AS grantor,
       coalesce(n.nspname, '(all schemas)')   AS schema,
       d.defaclobjtype::text                  AS objtype,
       CASE d.defaclobjtype
         WHEN 'r' THEN 'table'    WHEN 'S' THEN 'sequence' WHEN 'f' THEN 'function'
         WHEN 'T' THEN 'type'     WHEN 'n' THEN 'schema'
         ELSE d.defaclobjtype::text END       AS objtype_name,
       d.defaclacl::text                      AS default_acl
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
ORDER BY schema, objtype;
```

## 3b · 🔴 SECURITY FINDING — `audit_log_trigger()` has `anon` EXECUTE (deliverable #5)

From E5, which did run:

```json
{"function_name":"audit_log_trigger","security_definer":true,"anon_execute":true}
{"function_name":"audited_insert_lead_via_framer","security_definer":true,"anon_execute":false}
{"function_name":"audited_mark_invoice_overdue","security_definer":true,"anon_execute":false}
```

**`public.audit_log_trigger()` is SECURITY DEFINER and `anon` holds EXECUTE on it today.**

**Assessment — stated precisely, not inflated.** It is a trigger function: it takes no arguments
and returns `trigger`, so a direct PostgREST/SQL call fails with *"trigger functions can only be
called as triggers"*. **It is not directly exploitable.** Its significance is different and
arguably more important:

- It is a **live, unrevoked instance of the `pg_default_acl` grant** on this exact database.
- The two `audited_*` RPCs beside it show `anon_execute = false` — they were explicitly revoked by
  `20260709120000_revoke_anon_execute_audit_rpcs.sql`. `audit_log_trigger()` was **missed by that
  cleanup.**
- Therefore the mechanism is **active right now**, and any new SECURITY DEFINER function created
  without an explicit `REVOKE` will receive the same grant. That converts the `REVOKE` block in
  §5b from "project lore" into a measured, current fact.

**Scope caveat:** E5 filtered on `proname ~* 'audit'`. This is **not** a complete sweep — Bundle C1
above is. There may be other SECURITY DEFINER functions with `anon` EXECUTE that this filter never
looked at. **Run C1 and treat any additional `anon_execute = true` row as a separate finding,
independent of this workstream.**

## 3c · Does `is_assigned_to_lead()` already exist? · ⛔ STILL PENDING (C2)

Not answerable from E5's filtered view. **C2 must return zero rows for
`is_assigned_to_lead` before the migration is authored.** The three outcomes and their handling
are unchanged: absent → create with bare `CREATE`; present over a *different* junction → **STOP**
and re-point; present with a different signature → `42P13` abort, which is the desired loud
failure.

---

# 4. EDGE FUNCTIONS · ✅ EVIDENCED (repo)

Eight of 14 Edge Functions reference technician columns; **all use the service_role key and
therefore bypass RLS entirely.** Widening RLS does nothing for them.

```
$ grep -rlE 'technician|tech_id|assigned_to|assigned_technician|inspector|completed_by' supabase/functions | sort
supabase/functions/_shared/fanout.ts
supabase/functions/calculate-travel-time/index.ts
supabase/functions/generate-inspection-pdf/index.ts
supabase/functions/generate-inspection-summary/index.ts
supabase/functions/generate-job-report-pdf/index.ts
supabase/functions/manage-users/index.ts
supabase/functions/receive-framer-lead/index.ts
supabase/functions/send-slack-notification/index.ts
```

`send-inspection-reminder` is **absent from that list** — zero technician-identifier hits — yet it
is the highest-severity item in the whole plan. That is exactly why a term-based sweep is
insufficient: fan-out breaks code that treats a booking *row* as a booking *event*.

| Edge Function | Multi-tech impact |
|---|---|
| **`send-inspection-reminder`** | 🔴 **CRITICAL / CUSTOMER-VISIBLE.** Per-row CAS at `:334-339` ⇒ two rows ⇒ two `reminder_sent` flags ⇒ **two identical reminder emails.** Blocks everything. |
| **`calculate-travel-time`** | 🔴 **HIGH.** L739 is on `calendar_bookings` (fan-out-safe). **L1073 and L1395 are on `leads`** and are not. Also `endMinutesByLead` is keyed by `leadId` (`:1088-1090`) so a second row silently overwrites the first; `recommended_technician_id` (`:1016`) is a scalar. |
| `generate-job-report-pdf` | MEDIUM. Resolves `{{technician_name}}` from `completed_by` (`:209`→`:212`→`:306`). **No EF change needed** if `completed_by` is re-sourced at the write path. |
| `generate-inspection-pdf` | MEDIUM — goes stale silently. `inspector_name` is a denormalised TEXT snapshot; `inspector_id` is declared at `:105` and never read. The junction feeds it nothing. |
| `generate-inspection-summary` | LOW. `formData.inspector` passthrough into the prompt at `:219`. ✅ **D4 returned zero rows** — no AI summary has ever echoed an inspector name. |
| `manage-users` | ✅ **Downgraded to NO IMPACT** by C-9. The junction FK now matches `leads_assigned_to_fkey` exactly (`auth.users`, NO ACTION), so delete behaviour is unchanged. |
| `receive-framer-lead` | LOW but load-bearing. Inserts leads with no technician. **A lead with zero technicians must stay legal** — no NOT NULL, no minimum-membership constraint on `leads`. |
| `send-slack-notification` | LOW. Forwards a string it is handed. |
| `export-inspection-context` | LOW. `.limit(1).maybeSingle()` — arbitrary row of the pair, reads only fields identical across it. |

---

# 5. JUNCTION TABLE AND MIGRATION PLAN

Nothing here has been applied. Name is **`lead_assignments`** — the project's own paper trail
already uses it (`docs/TODO.md:2384`; shipped migration comment
`20260825141426_lead_notes.sql:29`). SESSION 2's Wave 1 filenames (`leadTechnicians.ts`) need
renaming to match.

## 5a · Junction table

```sql
CREATE TABLE public.lead_assignments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          uuid        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  technician_id    uuid        NOT NULL REFERENCES auth.users(id),        -- NO ACTION: mirrors leads_assigned_to_fkey
  assignment_order smallint    NOT NULL,
  is_primary       boolean     NOT NULL GENERATED ALWAYS AS (assignment_order = 1) STORED,
  assigned_by      uuid        NULL,                                       -- deliberately NO FK
  assigned_at      timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lead_assignments_order_positive CHECK (assignment_order >= 1),
  CONSTRAINT lead_assignments_lead_tech_key  UNIQUE (lead_id, technician_id),
  CONSTRAINT lead_assignments_lead_order_key UNIQUE (lead_id, assignment_order)
                                             DEFERRABLE INITIALLY IMMEDIATE
);

CREATE UNIQUE INDEX uniq_lead_assignments_one_primary
  ON public.lead_assignments (lead_id) WHERE is_primary;

CREATE INDEX idx_lead_assignments_tech_lead
  ON public.lead_assignments (technician_id, lead_id);
```

| Column | Reasoning (live-evidenced where marked ✅) |
|---|---|
| `id` scalar PK | ✅ **Confirmed necessary.** `audit_log_trigger()` writes `CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END` into `audit_logs.entity_id`. A composite-PK table could never carry this project's shared audit trigger without editing that function. |
| `technician_id → auth.users(id)`, NO ACTION | ✅ **C-9.** Mirrors `leads_assigned_to_fkey` exactly. `profiles` is a strict subset and would narrow the domain. |
| `assignment_order` | Selection order **is** the data. The picker must store an ordered array, not a Set. Named `assignment_order` because `POSITION` is a SQL function name. |
| `is_primary` GENERATED | The anti-drift device — `is_primary` and the ordering cannot disagree because `is_primary` *is* the ordering. ⚠️ PostgREST exposes generated columns read-only; any payload naming it is rejected `428C9`. |
| `assigned_by` no FK | This repo has twice dropped an `auth.users` FK to store the `SYSTEM_USER_UUID` sentinel (`20260501000003:7-11`, `20260813120000:5-16`). |
| `updated_at` | Reuses the existing live `public.update_updated_at_column()` — ✅ confirmed present on `leads`, `inspections`, `job_completions`, `calendar_bookings`. |

**One-primary-per-lead** is guaranteed three ways: `UNIQUE(lead_id, assignment_order)` + generated
`is_primary`; the partial unique index stating it literally (and, being an index, undeferrable);
and a deferred constraint trigger for the one thing `UNIQUE` cannot express — *exactly* one
primary when rows exist (`UNIQUE` permits `{order 2}` alone = zero primaries). **That trigger fires
only on `lead_assignments` changes, never on a `leads` insert** — a lead with zero technicians is
legal (`receive-framer-lead`).

**No audit trigger is attached.** `CLAUDE.md` fixes the foundation at 29 triggers / 10 tables and
forbids additions without instruction. The `id` column keeps that door open for a later, approved
migration.

## 5b · `is_assigned_to_lead()`

```sql
CREATE OR REPLACE FUNCTION public.is_assigned_to_lead(_lead_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.lead_assignments la
                  WHERE la.lead_id = _lead_id AND la.technician_id = (SELECT auth.uid()))
      OR EXISTS (SELECT 1 FROM public.leads l
                  WHERE l.id = _lead_id AND l.assigned_to = (SELECT auth.uid()));
$$;

-- ##### MANDATORY. SAME MIGRATION. #####
REVOKE ALL     ON FUNCTION public.is_assigned_to_lead(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_assigned_to_lead(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_assigned_to_lead(uuid) TO authenticated;
```

**The `REVOKE` is now backed by measurement, not lore:** `audit_log_trigger()` is SECURITY DEFINER
with `anon_execute = true` on this database *today* (§3b). The mechanism is live. Omitting these
lines would ship a **membership oracle callable by an unauthenticated PostgREST request** — and
unlike `audit_log_trigger()`, this function takes an argument and returns boolean, so it *would* be
directly callable.

`service_role` deliberately not granted: under a service_role JWT `auth.uid()` is NULL, so it
returns false for every lead, and those EFs bypass RLS anyway.

**The second disjunct is the safety thesis.** Branch 1 is the feature; branch 2 is the legacy
column, which makes every rewritten `USING` predicate a **provable superset** of the one it
replaces. If the backfill is skipped, partial or rolled back, nobody loses read access — the system
degrades to today's behaviour. Deleted only in the migration that drops `leads.assigned_to`.

> ⚠️ **The superset property holds for `USING`, NOT for `WITH CHECK`.** Widening a `WITH CHECK`
> widens *what a technician may write*. This is precisely why `leads.tech_update_assigned_leads` is
> excluded — §5f-E.

`STABLE` + `(SELECT auth.uid())` so the planner hoists it into a per-statement InitPlan, matching
the project-wide fix in `20260217074235_fix_rls_initplan_and_dedup.sql:57-61`.
`SET search_path = ''` with every object schema-qualified, matching
`20260217074203_fix_functions_search_path.sql`. ✅ Recursion risk cleared by `rls_forced = false`
on all 32 tables (§1e).

## 5c · Backfill — same migration, same transaction

```sql
INSERT INTO public.lead_assignments (lead_id, technician_id, assignment_order, assigned_by)
SELECT l.id, l.assigned_to, 1, NULL
  FROM public.leads l
 WHERE l.assigned_to IS NOT NULL
ON CONFLICT ON CONSTRAINT lead_assignments_lead_tech_key DO NOTHING;

ANALYZE public.lead_assignments;
```

### ✅ CROSS-CHECK PASSED (deliverable #3)

```json
Bundle A  leads.assigned_to: total_rows 3, null_rows 1   →  non-null = 2
Bundle E  {"leads_total":3, "bucket1_pointer_set":2,
           "bucket2_null_pointer_but_booked":0, "bucket3_truly_unassigned":1}
```

**2 = 2. Buckets sum 2+0+1 = 3 = leads_total.** Internally consistent. **Cleared to proceed.**

**`bucket2_null_pointer_but_booked = 0`** — ⚠️ **DEV ONLY, and this is the one most likely to
differ on PROD.** Bucket 2 is populated by the `LeadDetail.tsx:526` reversion path, which nulls
`assigned_to` on a status reversion below rank 1. On a 3-lead sandbox that path has plausibly never
been exercised; on 101+ real leads with real status churn it almost certainly has. **A non-zero
bucket 2 on PROD does not block the migration — it produces a manual-review list that a human must
adjudicate before the backfill is trusted.** The three-bucket strategy stands either way:

| Bucket | Condition | Treatment |
|---|---|---|
| 1 | `assigned_to IS NOT NULL` | Backfill, `assignment_order = 1`. **This is the backfill count.** |
| 2 | NULL pointer **but** non-cancelled bookings name technicians | 🟡 **Do NOT auto-backfill.** Resurrecting an assignment a reversion deliberately cleared is a silent access grant. Manual-review list. |
| 3 | NULL pointer, no bookings | Genuinely unassigned. Zero rows. Correct. |

**Idempotency notes:** `is_primary` is omitted (GENERATED — naming it errors `428C9`);
`ON CONFLICT` arbitrates the **named** constraint so a duplicate-key from
`uniq_lead_assignments_one_primary` is **not swallowed**; `DO NOTHING` not `DO UPDATE` so a re-run
cannot demote a real secondary; `CREATE TABLE` deliberately **not** `IF NOT EXISTS`; **no filter on
`archived_at` or status** — technicians open their own history, and this migration reproduces
today's state exactly.

### Verification queries

```sql
-- BEFORE (record first — the AFTER checks are identities against these)
SELECT count(*) AS leads_total,
       count(*) FILTER (WHERE assigned_to IS NOT NULL) AS leads_with_pointer,
       count(*) FILTER (WHERE assigned_to IS NULL)     AS leads_null_pointer
FROM public.leads;

-- AFTER
SELECT count(*) AS junction_rows, count(DISTINCT lead_id) AS leads_covered,
       count(*) FILTER (WHERE is_primary)     AS primary_rows,
       count(*) FILTER (WHERE NOT is_primary) AS secondary_rows
FROM public.lead_assignments;

-- DRIFT MONITOR — must be 0, permanently, for the whole dual-write window
SELECT count(*) AS pointer_junction_drift
FROM public.leads l
LEFT JOIN public.lead_assignments la ON la.lead_id = l.id AND la.is_primary
WHERE l.assigned_to IS DISTINCT FROM la.technician_id;
```

**Expected on DEV: `junction_rows = leads_covered = primary_rows = 2`, `secondary_rows = 0`,
`pointer_junction_drift = 0`.** Re-derive all four on PROD before applying there.

## 5d · Dual-write strategy

**Application-level dual-write. No sync triggers on `leads`.** This matches SESSION 2's Wave 2.

A trigger-based bidirectional design was authored and **rejected** — it produced four CRITICAL
findings under adversarial review, the worst being that a `leads.assigned_to` write from any
*unmigrated* writer (i.e. every writer until Wave 2) would fire a reconcile trigger replacing the
crew with a single technician: Glen and Clayton become Glen, silently and unauditably. A "blessed
RPC" was also rejected: a SECURITY DEFINER function reachable over PostgREST is a
grant-any-user-access-to-any-lead primitive.

- **Direction of truth:** `lead_assignments` is authoritative. `leads.assigned_to` is a
  denormalised cache of the primary, dropped in a later migration.
- **Writers** (`bookingService.ts:158`, `BookJobSheet.tsx:443`) write both in one operation.
- **Reversion** (`LeadDetail.tsx:526`) must delete junction rows **and** null the pointer, in one
  transaction — SESSION 2 Wave 5, frozen region, needs sign-off.
- A `COMMENT ON COLUMN public.leads.assigned_to` recording "denormalised cache — source of truth is
  `public.lead_assignments`" is the cheapest day-2 artefact: it surfaces in `\d+`,
  `information_schema` and typegen metadata.

**The honest cost:** drift becomes possible, and the legacy disjunct in §5b means a broken junction
write path is **invisible** — the app keeps working via branch 2. The drift monitor is the only
control, and **it needs a named owner and a cadence** or it conceals rather than detects (R18).

## 5e · Indexes

| Index | Justification |
|---|---|
| `UNIQUE (lead_id, technician_id)` *(implicit)* | **The hot path.** `is_assigned_to_lead()`'s first branch is equality on both columns in leading order — one index probe, run per candidate row for every RLS-checked read across the six-table chain. Also the `ON CONFLICT` arbiter. |
| `UNIQUE (lead_id, assignment_order)` *(implicit)* | Integrity first. As an access path it serves `WHERE lead_id = $1 ORDER BY assignment_order` with **no sort** — the query behind every crew render. |
| `uniq_lead_assignments_one_primary (lead_id) WHERE is_primary` | States the invariant literally; survives someone later making `is_primary` writable; as an index it can never be deferred. |
| `idx_lead_assignments_tech_lead (technician_id, lead_id)` | **Reverse lookup** — "every lead this technician is on" — which no `lead_id`-leading index serves. Callers: `useTechnicianDetail.ts:206,286`, `useTechnicianStats.ts:204,216`, `useTechnicianJobs.ts:283` + realtime `:368`. |

**Deliberately not created:** standalone `(lead_id)` (redundant — two unique indexes lead with it),
`(assignment_order)`, `(assigned_at)`. The blessed write pattern is delete-all-then-insert-all per
lead, the worst shape for surplus indexes.

## 5f · POLICY REWRITES — 16 policies · 20 bodies · 32 statements

Authored as **DROP + CREATE** (C-2). Every predicate below is a rewrite of the verbatim live text
in §2b. All are `TO authenticated`, `PERMISSIVE`, matching what is live.

### 5f-A · `leads` — 1 rewritten, 1 excluded

```sql
DROP POLICY IF EXISTS tech_select_assigned_leads ON public.leads;
CREATE POLICY tech_select_assigned_leads ON public.leads
  FOR SELECT TO authenticated
  USING (assigned_to = (SELECT auth.uid()) OR public.is_assigned_to_lead(id));
```

The raw column test is kept as a **literal** disjunct, not folded into the helper — it is the
escape hatch if the helper ever has to lose its `leads` branch.

### 5f-B · Transitive — the `EXISTS` collapses to one call (7 policies)

```sql
-- inspections ×3
DROP POLICY IF EXISTS tech_select_own_inspections ON public.inspections;
CREATE POLICY tech_select_own_inspections ON public.inspections
  FOR SELECT TO authenticated
  USING (public.is_assigned_to_lead(inspections.lead_id));

DROP POLICY IF EXISTS tech_insert_own_inspections ON public.inspections;
CREATE POLICY tech_insert_own_inspections ON public.inspections
  FOR INSERT TO authenticated
  WITH CHECK (public.is_assigned_to_lead(inspections.lead_id));

DROP POLICY IF EXISTS tech_update_own_inspections ON public.inspections;
CREATE POLICY tech_update_own_inspections ON public.inspections
  FOR UPDATE TO authenticated
  USING      (public.is_assigned_to_lead(inspections.lead_id))
  WITH CHECK (public.is_assigned_to_lead(inspections.lead_id));

-- invoices ×1
DROP POLICY IF EXISTS tech_read_invoices ON public.invoices;
CREATE POLICY tech_read_invoices ON public.invoices
  FOR SELECT TO authenticated
  USING (public.is_assigned_to_lead(invoices.lead_id));

-- inspection_areas ×1 (2-hop: keep the inspections join, swap only the leaf)
DROP POLICY IF EXISTS tech_all_own_inspection_areas ON public.inspection_areas;
CREATE POLICY tech_all_own_inspection_areas ON public.inspection_areas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i
                  WHERE i.id = inspection_areas.inspection_id
                    AND public.is_assigned_to_lead(i.lead_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i
                  WHERE i.id = inspection_areas.inspection_id
                    AND public.is_assigned_to_lead(i.lead_id)));

-- photo_history ×2 (2-hop)
DROP POLICY IF EXISTS tech_select_photo_history ON public.photo_history;
CREATE POLICY tech_select_photo_history ON public.photo_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i
                  WHERE i.id = photo_history.inspection_id
                    AND public.is_assigned_to_lead(i.lead_id)));

DROP POLICY IF EXISTS tech_insert_photo_history ON public.photo_history;
CREATE POLICY tech_insert_photo_history ON public.photo_history
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i
                  WHERE i.id = photo_history.inspection_id
                    AND public.is_assigned_to_lead(i.lead_id)));
```

The `JOIN public.leads l` disappears from every one — a planner win as well as a correctness one.

### 5f-C · `photos` — both branches widened (4 policies, 5 bodies)

The shared predicate, used identically in all four:

```sql
-- P(photos) :=
(   EXISTS (SELECT 1 FROM public.inspections i
             WHERE i.id = photos.inspection_id
               AND public.is_assigned_to_lead(i.lead_id))
 OR EXISTS (SELECT 1 FROM public.job_completions jc
             WHERE jc.id = photos.job_completion_id
               AND (jc.completed_by = (SELECT auth.uid())
                 OR public.is_assigned_to_lead(jc.lead_id))))
```

```sql
DROP POLICY IF EXISTS tech_select_photos ON public.photos;
CREATE POLICY tech_select_photos ON public.photos FOR SELECT TO authenticated USING (P(photos));

DROP POLICY IF EXISTS tech_insert_photos ON public.photos;
CREATE POLICY tech_insert_photos ON public.photos FOR INSERT TO authenticated WITH CHECK (P(photos));

DROP POLICY IF EXISTS tech_update_photos ON public.photos;
CREATE POLICY tech_update_photos ON public.photos FOR UPDATE TO authenticated
  USING (P(photos)) WITH CHECK (P(photos));

DROP POLICY IF EXISTS tech_delete_photos ON public.photos;
CREATE POLICY tech_delete_photos ON public.photos FOR DELETE TO authenticated USING (P(photos));
```

`jc.completed_by = auth.uid()` is **retained** alongside the junction branch, so nobody who has
access today loses it. ✅ `job_completions.lead_id` confirmed to exist (D3 joined on it).

### 5f-D · 🔴 `job_completions` — the blind spot (3 policies, 4 bodies)

**This section did not exist before Bundle B.** Without it, re-sourcing `completed_by` makes it
impossible for a secondary technician to create a job completion — the INSERT is refused by RLS.

```sql
DROP POLICY IF EXISTS "Technicians can view own job completions" ON public.job_completions;
CREATE POLICY "Technicians can view own job completions" ON public.job_completions
  FOR SELECT TO authenticated
  USING (completed_by = (SELECT auth.uid())
      OR public.is_assigned_to_lead(job_completions.lead_id)
      OR public.is_admin());

DROP POLICY IF EXISTS "Technicians can update own job completions" ON public.job_completions;
CREATE POLICY "Technicians can update own job completions" ON public.job_completions
  FOR UPDATE TO authenticated
  USING      (completed_by = (SELECT auth.uid())
           OR public.is_assigned_to_lead(job_completions.lead_id) OR public.is_admin())
  WITH CHECK (completed_by = (SELECT auth.uid())
           OR public.is_assigned_to_lead(job_completions.lead_id) OR public.is_admin());

DROP POLICY IF EXISTS "Technicians can insert own job completions" ON public.job_completions;
CREATE POLICY "Technicians can insert own job completions" ON public.job_completions
  FOR INSERT TO authenticated
  WITH CHECK (completed_by = (SELECT auth.uid())
           OR public.is_assigned_to_lead(job_completions.lead_id) OR public.is_admin());
```

The INSERT `WITH CHECK` widening is **the statement that unblocks the entire `completed_by`
re-source.** Note this is a genuine `WITH CHECK` widening and is therefore *not* covered by the
superset argument — it is justified on its own terms: it permits a technician on the lead to create
that lead's job completion with any `completed_by`, which is exactly the required behaviour and is
scoped to leads they are already assigned to.

### 5f-D2 · 🔴 THE PART D ATOMIC UNIT — **FOUR items, not three**

SESSION 3 §5.8 and the injection both specify a three-item atomic unit. **Live evidence adds a
fourth, and the fourth is the one that makes the other three possible.** All four land in **one
migration, one transaction**:

| # | Item | Status |
|---|---|---|
| 1 | Widen the 4 `photos` technician policies (5 predicate bodies) to consult the junction | §5f-C — was already in the plan |
| 2 | **Widen the 3 `job_completions` technician policies (4 bodies) — above all the INSERT `WITH CHECK`** | **§5f-D — NEW. Invisible before Bundle B.** |
| 3 | Re-source `completed_by` from `auth.uid()` to the lead's primary technician (write path) | was already in the plan |
| 4 | Add `submitted_by` = `auth.uid()`, backfilled `submitted_by = completed_by` | was already in the plan |

**Why item 2 is the unblocker, not merely an addition.** Item 3 changes what
`createJobCompletion()` writes into `completed_by`. The live INSERT policy is:

```
Technicians can insert own job completions  INSERT  with_check: ((completed_by = auth.uid()) OR is_admin())
```

So the moment `completed_by` becomes the **primary's** id, a **secondary** opening the job form
submits a row where `completed_by ≠ auth.uid()` and `is_admin()` is false. **Postgres refuses the
INSERT.** Item 3 without item 2 does not degrade the secondary's experience — it removes their
ability to start a job completion at all.

**The backfill for item 4 is lossless and needs no judgement:** historically `completed_by` *was*
the submitter (`useJobCompletionForm.ts:256` passes `user.id`), so
`UPDATE job_completions SET submitted_by = completed_by` preserves the audit fact exactly. Make
`submitted_by` NOT NULL after that backfill — `completed_by` is NOT NULL, so every row gets a
value. **Historical `completed_by` values are NOT rewritten** — that is SESSION 3's business
question Q7, and D3 exists to produce the list first.

**Ordering, if the four genuinely cannot be one migration** — the risk is asymmetric, not
symmetric (SESSION 3 §5.8):

| Split order | Consequence | Severity |
|---|---|---|
| Items 3/4 **before** items 1/2 | Secondaries lose photo access **and** cannot create job completions. Silent RLS denial mid-job. | 🔴 **CRITICAL** |
| Items 1/2 **before** items 3/4 | Safe. Access is strictly broadened first, attribution corrected second. The window is over-permissive, not under-permissive. | 🟢 LOW |

**RLS-widening first, always. Put that in the DEPLOY RUNBOOK, not in a filename** — migrations here
are human-applied in Studio with no staging buffer, so ordering is a person's decision at a
keyboard, not a CI guarantee.

### 5f-E · ⛔ `leads.tech_update_assigned_leads` — DELIBERATELY NOT REWRITTEN

Live:
```
qual:       (assigned_to = auth.uid())
with_check: (assigned_to = auth.uid())
```

The `WITH CHECK` means: *after* the update, `assigned_to` must equal me. It is what stops a
technician reassigning a lead to anyone else.

**Widening it to `... OR public.is_assigned_to_lead(id)` is a privilege escalation.**
`is_assigned_to_lead(id)` is true for a secondary **regardless of what `assigned_to` becomes**, so
a secondary could set the primary pointer to any value — stealing the lead, or handing it to a
third party. Widening only the `USING` half is no better: `WITH CHECK` would then force
`assigned_to = self`, which *is* the theft.

**Decision: leave both bodies exactly as they are.** No secondary capability in the multi-tech
feature requires updating the `leads` row itself — they need to read the lead and read/write the
inspection, areas, photos and job completion, all of which are granted above. Whether technicians
should gain multi-tech write on `leads` is a **product question, escalated, not assumed.** It is
additive and reversible later.

**This is the concrete instance of the adversarial CRITICAL finding that the monotonic-widening
claim fails for `WITH CHECK`.**

### 5f-F · Tally

| Table | Policies rewritten | Bodies |
|---|---|---|
| `leads` | 1 (of 2) | 1 |
| `inspections` | 3 | 4 |
| `inspection_areas` | 1 | 2 |
| `invoices` | 1 | 1 |
| `photo_history` | 2 | 2 |
| `photos` | 4 | 5 |
| `ai_summary_versions` | 1 | 1 |
| `job_completions` | 3 | 4 |
| **TOTAL** | **16** | **20** |

**32 DDL statements** (16 DROP + 16 CREATE). 22 technician bodies exist live; 20 rewritten, 2 left
alone by design. Nothing on `pdf_versions` (C-5) or `calendar_bookings` (C-6).

### 5f-G · `ai_summary_versions` (bucket C — the `inspector_id` axis)

```sql
DROP POLICY IF EXISTS technicians_see_assigned ON public.ai_summary_versions;
CREATE POLICY technicians_see_assigned ON public.ai_summary_versions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i
                  WHERE i.id = ai_summary_versions.inspection_id
                    AND (i.inspector_id = (SELECT auth.uid())
                      OR public.is_assigned_to_lead(i.lead_id))));
```

`inspector_id` stays scalar (SESSION 3 §5.2). This is the "junction for access, scalar for
attribution" split.

## 5g · Rollback (SQL comments — project convention)

```sql
-- ROLLBACK — Wave 0 (junction + helper + backfill + 16 policy rewrites).
--
-- R1. Restore all 16 policies from the Bundle B output pasted at the top of the
--     migration file. THAT PASTED OUTPUT IS THE ROLLBACK SCRIPT. Without it there
--     is no rollback. 16 DROP + 16 CREATE, back to the verbatim predicates.
--
-- R2. DROP FUNCTION public.is_assigned_to_lead(uuid);
--     BARE DROP. Not IF EXISTS, not CASCADE. If a policy still references it the
--     drop fails and NAMES that policy — which is the desired outcome: it means R1
--     was incomplete. CASCADE would silently drop the dependent policies instead,
--     leaving those tables with NO technician policy at all. That is a lockout
--     dressed up as a successful rollback.
--
-- R3. DROP TABLE public.lead_assignments;
--     Safe here: nothing outside this wave reads it, and no trigger writes
--     public.leads (the trigger design was rejected — see 5d). leads.assigned_to
--     was never modified by this wave, so access returns byte-identical to before.
--
-- R4. Re-run the DRIFT MONITOR and the per-technician access counts. They must
--     return to their pre-migration values EXACTLY. A count still elevated means a
--     policy rewrite survived R1.
--
-- NOT REVERSIBLE BY THIS SCRIPT, and out of scope for it:
--   - booking_group_id (Step 0a) — additive and harmless, leave it
--   - the deployed reminder Edge Function (Step 0b) — redeploy the prior version
--     from ~/mrc-app-prod; it is correct with one row per group
```

---

# 6. RISK REGISTER

## 6.1 · RLS between table creation and backfill, if NOT in one transaction

**On day one, nothing happens — and that is what makes it dangerous.**

- **While no policy references the junction**, an empty junction changes nothing. This is why the
  window *looks* harmless and why splitting the migration is tempting.
- **The moment any of the 16 rewrites lands**, an empty junction makes branch 1 false for every
  lead in the company.
  - **With the legacy `OR` disjunct (§5b):** branch 2 still matches `leads.assigned_to`. Access
    degrades to exactly today's behaviour. **No lockout.** This is the design's load-bearing
    safety property.
  - **Without it:** total field-app blackout across `leads`, `inspections`, `inspection_areas`,
    `photos`, `photo_history`, `invoices` **and now `job_completions`** — seven tables, not six.
    And critically, **RLS returns empty result sets, not permission errors.** The app renders "no
    jobs", "no photos". To a technician on site that is indistinguishable from catastrophic data
    loss, and it produces no failed request and nothing to grep for.
- **Partial backfill is worse than none** — inconsistent, with no pattern a user can describe.
  "It works on Glen's jobs but not Clayton's" is a support ticket nobody can triage.

**Both guarantees ship together:** same-transaction backfill (the window is *unreachable*) **and**
the legacy disjunct (the window is *survivable* anyway). Either suffices; both are nearly free; a
forked-history repo that applies SQL by hand does not get to rely on "someone will remember the
second step".

**A further reason the split is not merely inelegant:** the backfill can fail `23503` if any
`leads.assigned_to` lacks a target row. In **one** transaction that leaves no table, no function,
no policies — byte-identical to before, and the human fixes the data and re-runs. **Split**, it
leaves a half-built junction and 16 rewritten policies pointing at it.

*(C-9 makes this failure much less likely: the FK now targets `auth.users`, the same table
`leads.assigned_to` already points at, so any value in that column is by construction valid.)*

## 6.2 · Register

| # | Risk | Likelihood | Blast radius | Detection |
|---|---|---|---|---|
| **R1** | 🔴 **Duplicate reminder emails.** Fan-out ⇒ two rows ⇒ two `reminder_sent` flags. | **Zero if Step 0b lands first; HIGH otherwise** | Every customer with a two-tech inspection. Irreversible once sent. | `SELECT booking_group_id, count(*) FILTER (WHERE reminder_sent) FROM calendar_bookings GROUP BY 1 HAVING count(*) FILTER (WHERE reminder_sent) > 1;` |
| **R2** | 🔴 **Without the `job_completions` INSERT `WITH CHECK` widening (§5f-D, atomic-unit item 2), a secondary technician cannot create a job completion AT ALL.** Once `completed_by` is re-sourced to the primary, the secondary's insert carries `completed_by ≠ auth.uid()`, `is_admin()` is false, and **RLS refuses the row.** Not degraded access to photos — no record at all. **The failure lands in the field, on a phone, as a silent RLS denial, with NO build-time signal**: it type-checks, it lints, it passes CI, and it fails only when a real technician taps Save on a real job. | **CERTAIN if §5f-D is omitted** | Every secondary on every job, from the moment the migration commits. | As the secondary, on the preview: `INSERT INTO job_completions (lead_id, completed_by, …) VALUES (<their lead>, <primary_id>, …)` **must succeed.** Test this explicitly — no other check surfaces it. |
| **R3** | 🔴 **Field-app blackout** — rewrites land against an empty junction with no legacy disjunct. | LOW as designed; CATASTROPHIC if the disjunct is "simplified away" | Seven tables, presenting as empty lists, not errors. | Per-technician row counts before/after. **Any count that DROPS is an immediate abort.** |
| **R4** | 🔴 **`calculate-travel-time` under-reports a secondary's day.** L1073/L1395 are on `leads`; fan-out does not touch them. | **HIGH — default behaviour, not a failure mode** | Every two-tech booking. Presents as intermittent double-booking. | Count leads where the tech is in the junction but not `assigned_to`. |
| **R5** | 🟠 **Privilege escalation if §5f-E is "completed" by a well-meaning reviewer.** Widening the `leads` UPDATE `WITH CHECK` lets a secondary steal or reassign the primary pointer. | MEDIUM — it looks like an omission | Lead ownership integrity. | Post-migration: `pg_policies` for `tech_update_assigned_leads` must still read `(assigned_to = auth.uid())` in **both** bodies. |
| **R6** | 🟠 **`fetchMelbourneBookings` overwrites a booking.** `endMinutesByLead` keyed by `leadId` (`:1088-1090`). | HIGH once fan-out ships | Travel time computed from one of two bookings, arbitrarily. | Unit-test the map with two rows sharing a `lead_id`. |
| **R7** | 🟠 **Reversion orphans junction rows.** `LeadDetail.tsx:526` nulls the pointer; junction rows survive. | **HIGH until SESSION 2 Wave 5 lands** | Every reverted lead; corrupts the unassigned queue in three places. | The **drift monitor** (§5c). Must be 0. |
| **R8** | 🟠 **Audit-row volume.** `audit_leads_*` and `audit_job_completions_*` are `FOR EACH ROW` with **no column list**, and `audit_log_trigger()` serialises the whole row. A `submitted_by` backfill UPDATE writes one audit row per job completion. | Certain, magnitude = PROD `job_completions` count | `audit_logs` growth. On DEV: 1 row. | Count `audit_logs` before/after the backfill. |
| **R9** | 🟡 **`is_primary` rejected by PostgREST** (`428C9`) if a frontend payload names the generated column. | MEDIUM | Every junction write fails — **loudly**, therefore low-harm. | Wave 2 preview: create a two-tech booking, watch the network tab. |
| **R10** | 🟡 **`is_assigned_to_lead()` already exists** over a different junction. | LOW — **unmeasured, C2 pending** | Two competing junctions. | **Bundle C2 must return zero rows for that name before authoring.** |
| **R11** | 🟡 **Other SECURITY DEFINER functions carry `anon` EXECUTE.** One confirmed (`audit_log_trigger`); the sweep was filtered on `'audit'`. | **Unmeasured** | Unknown — that is the risk. | **Bundle C1.** |
| **R12** | 🟡 **Lock contention.** 16 policy rewrites take locks on the busiest tables. | MEDIUM | Brief app-wide stall at the wrong hour. | `SET LOCAL lock_timeout = '5s'` so it **fails fast rather than queueing**. Apply outside working hours. |
| **R13** | 🟡 **Drift monitor has no owner.** The legacy disjunct means a junction-write bug is invisible — the app keeps working via branch 2. | **HIGH without an owner** | A silently broken write path for the whole dual-write window. | It is only a control if someone runs it. **Assign an owner and a cadence.** |
| **R14** | ⚪ **"Today's Jobs" double-counts** (`useAdminDashboardStats.ts:88-92`). | Certain once fan-out ships | A wrong number on the admin landing page, daily. | Compare the tile against a `DISTINCT lead_id` count. |
| **R15** | ⚪ **Reschedule audit trail silently wrong.** `BookJobSheet.tsx:514-515` index-pairs and reads `[0].assigned_to`. | HIGH once fan-out ships, unless grouped | Plausible-looking but wrong activity timeline. | Reschedule a two-tech multi-day job and **read** the timeline. |

### Retired by STRUCTURAL evidence — these transfer to PROD

Schema shape is the same on both projects, so these stay retired:

- The **FK-domain-mismatch CRITICAL** and the **`manage-users` delete risk** — both resolved by
  C-9 (`technician_id → auth.users(id)` NO ACTION, identical to `leads_assigned_to_fkey`).
- The **`42P17` recursion risk** — `rls_forced = false` on all 32 public tables.
- **Bucket E is empty** — no policy reaches an assignment column through a helper.

### ⚠️ Retired by COUNT evidence — these do NOT transfer to PROD

Both were measured on 3 leads / 3 bookings. **Neither is retired on PROD until re-measured.**

| Risk | DEV result | Why PROD may differ | What a different result means |
|---|---|---|---|
| **Existing double-bookings block the `EXCLUDE` constraint** | `e2_existing_overlapping_bookings` = **0 pairs, 0 technicians** | 3 bookings cannot overlap much. `checkBookingConflict` **fails open on error** (`bookingService.ts`) and nothing re-checks at write time — so real overlaps are expected to exist in a year of production data. | Non-zero ⇒ **the `EXCLUDE` constraint cannot be added at all** until the overlaps are resolved. It also means the app's conflict check has already let real double-bookings through, which is its own finding. |
| **`booking_group_id` is a preference, not mandatory** | `e3_rows_per_natural_group` = all **3** groups have exactly 1 row | With one technician per booking today the natural key `(lead_id, event_type, start_datetime)` is trivially unique on 3 rows. Across 101+ leads, two bookings sharing a lead + event type + exact start timestamp is entirely plausible. | Any group with `rows_in_group > 1` ⇒ **`booking_group_id` becomes MANDATORY**, the natural-key reminder claim is unsafe, and the group backfill cannot use the natural key. |

## 6.3 · Pre-existing bugs — DB-side implications only

**F1 — `inspector_id` takeover.** `TechnicianInspectionForm.tsx` uses one row object for both
INSERT and UPDATE, so the last technician to save becomes the inspector; RLS then locks out the
first. `SyncManager.ts:213-214` guards the offline path; the online path is unguarded.

> **DB-side implication only:** `inspections` and `inspection_areas` RLS must be widened
> **before** anything stabilises `inspector_id` — the same asymmetry as Part D. §5f-B does exactly
> that. No code fix proposed here.

**F2 — reversion nulls the pointer.** `LeadDetail.tsx:526`, inside the frozen `ALL_STATUSES` block.
Separate single-file PR, needs sign-off; **no code change proposed here.**

> **DB-side implications:** drives the three-bucket backfill (§5c — measured at **0** on DEV);
> is the mechanism behind R7; and is the concrete reason the rejected reconcile trigger would have
> been actively harmful — it would have resurrected assignments a reversion deliberately cleared.

---

# PROD PRE-FLIGHT

> **Every number in this document was measured on DEV `ctppzqnysmzynkxjlzta`: 3 leads, 3 bookings,
> 2 inspections, 1 job completion. PROD `ecyivrxjpsmjmexqatym` carries 101+ leads.**
>
> **Run this whole section against PROD immediately before applying anything there. Do not run it
> now. State the target ref and its role aloud and get explicit confirmation first, per CLAUDE.md.**
> All queries are read-only `SELECT`s.

## What transfers and what does not

| Transfers (structural) | Does NOT transfer (count-derived) |
|---|---|
| Column types, nullability, defaults | Backfill row count |
| FK targets and `ON DELETE` actions | Bucket 2 (null pointer but booked) |
| `rls_forced = false` | Existing overlapping bookings |
| Predicate *shapes* (the four buckets) | Rows per natural booking group |
| The `is_primary` / `428C9` PostgREST behaviour | Audit-row volume |

## ⚠️ P0 — THE POLICY LIST ITSELF MUST BE RE-HARVESTED

**The 16-policy rewrite list in §5f is DEV-derived.** The migration history is forked
(16 shared / 104 local-only / 102 remote-only) and this project has demonstrably applied DDL to
PROD out-of-band — `20260825141426_lead_notes.sql:3-10` records exactly that, in-repo. **PROD's
policy set may not equal DEV's.** Three of the four surprises in this document
(`job_completions` having policies at all, `pdf_versions` having none, `calendar_bookings` having
one) were invisible until DEV was queried; PROD gets no free pass on that basis.

**Re-run Bundle B against PROD and diff it against the DEV output pasted in §2 before authoring the
PROD migration.** If the two differ, §5f is a template, not a work order.

| Result | Decision it gates |
|---|---|
| `q2_technician_referencing_count` ≠ 17 | §5f is incomplete or over-broad for PROD. Re-derive the bucket assignment per policy. |
| Any `job_completions` policy text ≠ DEV | Part D's atomic unit changes shape. Re-read §5f-D. |
| `pdf_versions` or `calendar_bookings` differ | New rewrite targets, or new standing findings. |

## P1 — Confirm the target before anything else

```sql
SELECT current_database(), current_user, inet_server_addr();
```

## P2 — Backfill row count · gates the AFTER identities in §5c

```sql
SELECT count(*)                                        AS leads_total,
       count(*) FILTER (WHERE assigned_to IS NOT NULL) AS leads_with_pointer,
       count(*) FILTER (WHERE assigned_to IS NULL)     AS leads_null_pointer
FROM public.leads;
```

**Gates:** `leads_with_pointer` **is** the PROD backfill row count. After the migration,
`junction_rows = leads_covered = primary_rows = leads_with_pointer` and `secondary_rows = 0`.
Record the BEFORE numbers; the AFTER checks are identities against them and are meaningless
without them.

## P3 — Backfill buckets · gates whether a manual-review list is needed

```sql
SELECT
  count(*)                                                                       AS leads_total,
  count(*) FILTER (WHERE l.assigned_to IS NOT NULL)                              AS bucket1_pointer_set,
  count(*) FILTER (WHERE l.assigned_to IS NULL AND coalesce(bk.tech_count,0) > 0) AS bucket2_null_pointer_but_booked,
  count(*) FILTER (WHERE l.assigned_to IS NULL AND coalesce(bk.tech_count,0) = 0) AS bucket3_truly_unassigned
FROM public.leads l
LEFT JOIN LATERAL (
  SELECT count(DISTINCT cb.assigned_to) AS tech_count
  FROM public.calendar_bookings cb
  WHERE cb.lead_id = l.id AND cb.status <> 'cancelled'
) bk ON TRUE;
```

**Gates:** `bucket1_pointer_set` **must equal** P2's `leads_with_pointer` — if not, **STOP**, one
query is wrong and nothing is applied. `bucket2 > 0` ⇒ produce the review list below and have a
human adjudicate **before** the backfill is trusted. Do **not** auto-backfill bucket 2: those
pointers may have been nulled by the `LeadDetail.tsx:526` reversion path, and resurrecting them is
a silent access grant.

```sql
-- The bucket-2 review list, if P3 returns non-zero.
SELECT l.id AS lead_id, l.status, l.updated_at,
       array_agg(DISTINCT cb.assigned_to) AS booked_technicians
FROM public.leads l
JOIN public.calendar_bookings cb ON cb.lead_id = l.id AND cb.status <> 'cancelled'
WHERE l.assigned_to IS NULL
GROUP BY l.id, l.status, l.updated_at
ORDER BY l.updated_at DESC;
```

## P4 — Existing double-bookings · gates whether the `EXCLUDE` constraint can be added AT ALL

```sql
SELECT count(*)                      AS overlapping_pairs,
       count(DISTINCT a.assigned_to) AS technicians_affected
FROM public.calendar_bookings a
JOIN public.calendar_bookings b
  ON a.assigned_to = b.assigned_to
 AND a.id < b.id
 AND a.status <> 'cancelled' AND b.status <> 'cancelled'
 AND a.start_datetime < b.end_datetime
 AND a.end_datetime   > b.start_datetime;
```

**Gates:** `0` ⇒ the per-technician `EXCLUDE USING gist` constraint can be added.
**Non-zero ⇒ it CANNOT be added** until the overlaps are resolved; defer it to a cleanup migration.
Non-zero is also independently a finding: `checkBookingConflict` **fails open on error** and
nothing re-checks at write time, so a non-zero count means real double-bookings already shipped.

## P5 — Booking group shape · gates whether `booking_group_id` is MANDATORY

```sql
SELECT rows_in_group, count(*) AS number_of_groups
FROM (
  SELECT lead_id, event_type, start_datetime, count(*) AS rows_in_group
  FROM public.calendar_bookings
  GROUP BY lead_id, event_type, start_datetime
) g
GROUP BY rows_in_group
ORDER BY rows_in_group;
```

**Gates:** all groups `rows_in_group = 1` ⇒ the natural key is unique, `booking_group_id` stays a
recommendation, and the natural-key reminder claim in the Part C blocker is safe.
**Any group `> 1` ⇒ `booking_group_id` is MANDATORY**, the natural-key claim is unsafe, and the
group backfill cannot use `(lead_id, event_type, start_datetime)`.

## P6 — Audit volume · gates R8 and the migration's runtime

```sql
SELECT (SELECT count(*) FROM public.job_completions) AS job_completions_rows,
       (SELECT count(*) FROM public.leads)           AS leads_rows,
       (SELECT count(*) FROM public.audit_logs)      AS audit_logs_rows_before;
```

**Gates:** `job_completions_rows` is the number of audit rows the `submitted_by` backfill will
write (`audit_log_trigger()` serialises the whole row and suppresses only true no-ops, and none of
the `job_completions` triggers use `UPDATE OF <columns>`). Re-count `audit_logs` afterwards; the
delta should equal `job_completions_rows` exactly.

## P7 — Security sweep on PROD

Run **C1**, **C1b** and **C3** from §3a against PROD. The `anon` EXECUTE posture is set per-database
by `pg_default_acl` and **there is no reason to assume DEV and PROD agree.** Any
`anon_execute = true` with `is_trigger_function = false` on PROD is a live, directly-callable
finding and should be raised immediately, separately from this workstream.

## P8 — Authoring gates on PROD

Run **C2a** and **C2b** from §3a against PROD. Both must return zero rows. If `lead_assignments`
already exists on PROD but not DEV — entirely possible given the forked history — **STOP** and
re-point the design at it rather than creating a second junction.

---

# STANDING FINDINGS — NOT PART OF THIS WORKSTREAM

> These two are unrelated to multi-technician. They were surfaced by the Bundle B and E5 sweeps and
> are recorded here so they survive being read out of context. **Neither is fixed, proposed, or
> actioned by this session.** Both should be triaged on their own merits and, if accepted, given
> their own tickets.

## SF-1 · `calendar_bookings` has no per-technician RLS at all

Live `pg_policies`, DEV, 2026-08-28 — **one policy on the table:**

```json
{"schemaname":"public","tablename":"calendar_bookings",
 "policyname":"authenticated_full_access_bookings","cmd":"ALL","permissive":"PERMISSIVE",
 "roles":"{public}",
 "qual":"(( SELECT auth.uid() AS uid) IS NOT NULL)",
 "with_check":"(( SELECT auth.uid() AS uid) IS NOT NULL)"}
```

**Every authenticated user can read AND write every booking row**, including bookings assigned to
other technicians. `cmd = ALL` covers SELECT, INSERT, UPDATE and DELETE.

**Consequence for how the codebase should be read:** the fifteen `.eq('assigned_to', …)` filters
catalogued by SESSION 2 are **UX scoping, not a security boundary.** A technician's calendar looks
filtered because the client asks for a filtered set, not because the database would refuse a
broader one. Any reasoning that treats those filters as an access control has the wrong model.

Confirmed absent live: `technicians_view_own_bookings`, which exists in
`20251111000016_rename_tables_to_match_spec.sql:185-187` and never took effect.

**Not addressed by the multi-tech work.** Tightening this is a behaviour change with its own blast
radius across the Schedule, dashboard and travel-time surfaces, and it should not ride along inside
a migration about technician assignment.

## SF-2 · `audit_log_trigger()` carries `anon` EXECUTE

Live, DEV, 2026-08-28:

```json
{"function_name":"audit_log_trigger",              "security_definer":true, "anon_execute":true}
{"function_name":"audited_insert_lead_via_framer", "security_definer":true, "anon_execute":false}
{"function_name":"audited_mark_invoice_overdue",   "security_definer":true, "anon_execute":false}
```

Its two siblings were explicitly revoked by
`20260709120000_revoke_anon_execute_audit_rpcs.sql`; **`audit_log_trigger()` was missed by that
cleanup.**

**Exploitability: NO.** It is a trigger function — no arguments, returns `trigger` — so a direct
PostgREST or SQL call fails with *"trigger functions can only be called as triggers"*.

**Significance: YES, and this is the part that matters.** It is live proof that the
`pg_default_acl` grant is **active on this database today**. Any SECURITY DEFINER function created
without an explicit `REVOKE` will receive the same grant — and a function that *does* take
arguments and return a scalar would be directly callable by an unauthenticated request. That is
precisely the failure mode the mandatory `REVOKE` block in §5b exists to prevent, and it is now
backed by measurement rather than lore.

**Scope caveat:** this came from a sweep filtered on `proname ~* 'audit'`. **C1 in §3a is the
complete sweep and has not been run.** There may be other SECURITY DEFINER functions with `anon`
EXECUTE — including non-trigger ones, which *would* be exploitable.

---

# APPENDIX — VERIFICATION

```
$ git -C ~/mrc-multi-tech status --short --untracked-files=all
?? docs/multi-tech/SESSION-1-DB-RLS-FINDINGS.md
?? docs/multi-tech/SESSION-1-DEV-QUERY-PACK.sql
?? docs/multi-tech/SESSION-2-CODE-SURFACE-FINDINGS.md
?? docs/multi-tech/SESSION-3-REPORTING-FINDINGS.md
```

**No `.ts`, `.tsx`, `.sql` migration, template or Edge Function was created or modified. No
migration was written or applied. No Edge Function was deployed. Every SQL statement run against
DEV was a `SELECT`. PROD was never targeted.**

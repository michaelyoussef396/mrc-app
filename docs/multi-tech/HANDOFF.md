# MULTI-TECHNICIAN — HANDOFF

**Written:** 2026-08-28 · **Worktree:** `~/mrc-multi-tech` · **Branch:** `feat/multi-tech-inventory`
· **HEAD:** `c47b8ed`

**Read this cold. It assumes no context from the session that produced it.**

**Status: INVENTORY COMPLETE. NOTHING HAS BEEN BUILT.** No migration file exists. No Edge Function
was deployed. No source file was modified. Five documents were produced and nothing else.

---

## 0 · WHAT THIS PROJECT IS

MRC assigns exactly **one** technician per lead today (`leads.assigned_to`, a nullable uuid). In
reality two technicians (Glen and Clayton) often attend the same job. The work is to move to a
junction table so a lead can carry many technicians.

**Decisions already made before the inventory started — do not relitigate:**

- Technicians are selected **in order** at booking. First selected = **PRIMARY**, second =
  **SECONDARY**. Order is data, not presentation.
- PRIMARY is the name that prints as "completed by" on the customer job report.
- If two technicians are assigned, the booking must block **both** their calendars.
- **Junction table AND keep `leads.assigned_to`** as a denormalised pointer to the primary.
  Dual-write. Readers migrate in waves. The old column is dropped in a **later** migration.

**Junction table name: `lead_assignments`** — not `lead_technicians`. The project's own paper trail
already uses it (`docs/TODO.md:2384`, and a shipped migration comment at
`20260825141426_lead_notes.sql:29`). SESSION 2's Wave 1 filenames (`leadTechnicians.ts`,
`useLeadTechnicians.ts`) need renaming to match.

---

## 1 · THE DOCUMENTS

| File | What it contains |
|---|---|
| `SESSION-1-DB-RLS-FINDINGS.md` | **The database side.** Live DEV schema, all 80 RLS policies, the 16-policy rewrite authored in full as DROP+CREATE, the junction table design, `is_assigned_to_lead()`, the backfill, the risk register, PROD pre-flight, and two standing security findings. **Start here.** |
| `SESSION-2-CODE-SURFACE-FINDINGS.md` | **The code side.** 304 occurrences / 268 matched lines / 49 files in `src/` (the prior "88 hits / 24 files" figure was wrong by 3×), bucketed by read/write/filter/type/booking/offline/test. Five-wave migration plan. **Read its ADDENDUM** — it materially corrects its own Step 4b and Step 6. |
| `SESSION-3-REPORTING-FINDINGS.md` | **The identity side.** Which technician name reaches which audience. `completed_by` and `inspector_id` end-to-end, the four customer-facing surfaces, the stale-PDF analysis, and eight business questions for Glen & Clayton. |
| `SESSION-1-DEV-QUERY-PACK.sql` | Read-only SELECT bundles A–E. **Bundles A, B, D, E have been run against DEV; their output is pasted in the findings doc. Bundle C has NOT been run** — see §7. |
| `HANDOFF.md` | This file. |

**Reading order if you have an hour:** this file → SESSION-1 §0 and §6 → SESSION-2 addendum →
SESSION-3 §5.7/§5.8.

---

## 2 · THE GATING NUMBERS

| Number | Value | Scope |
|---|---|---|
| Total RLS policies in `public` | **80** | Structural — transfers to PROD |
| Technician-referencing policies | **17** (22 predicate bodies) | Structural — but **re-harvest on PROD, see P0** |
| **Policies to rewrite** | **16 · 20 bodies · 32 DDL statements** (16 `DROP` + 16 `CREATE`) | 1 of the 17 is deliberately excluded — §6 |
| **Backfill row count** | **2** | ⚠️ **DEV ONLY.** DEV has 3 leads. **PROD has 101+.** Re-measure via P2. |
| `bucket2_null_pointer_but_booked` | **0** | ⚠️ **DEV ONLY.** Most likely of all four to differ on PROD. |
| Existing overlapping bookings | **0 pairs** | ⚠️ **DEV ONLY.** Gates whether the `EXCLUDE` constraint can be added **at all**. |
| Rows per natural booking group | **all 3 groups = 1 row** | ⚠️ **DEV ONLY.** Gates whether `booking_group_id` is **mandatory**. |

**Statement form is `DROP POLICY` + `CREATE POLICY`, never `ALTER POLICY`.** A comment-stripped
replay of all 124 migrations finds 211 CREATE / 88 DROP / **0 ALTER**. The folklore figure
"16 `ALTER POLICY` across 13 policies" was wrong on the count, the set **and** the statement type.
That my rewrite count also lands on 16 is a coincidence — the folklore's 16 ranged over a set that
omitted `job_completions` entirely, and `job_completions` supplies 3 of mine.

---

## 3 · FAN-OUT VERDICT AND ITS PREREQUISITES

### Verdict: **fan out `calendar_bookings` to one row per technician per day.** ✅

Two techs on a 2-day job ⇒ 4 rows, each with its own `assigned_to`. One tech ⇒ unchanged.

**The decisive argument is structural, not economic.** `src/hooks/useTechnicianJobs.ts:368` is a
realtime `postgres_changes` subscription, `filter: assigned_to=eq.${user.id}`. A `postgres_changes`
filter is a single-column equality on the changed row and **cannot express a join.** Under a
bookings-junction it has no equivalent — subscribing to the junction instead would fire on
*assignment* changes but not on booking *reschedules*, silently losing live updates on the most
common edit. Under fan-out the filter keeps working untouched.

Live evidence **strengthened** this: `calendar_bookings` has no per-technician RLS at all (SF-1),
so fan-out has zero RLS consequences on that table.

**The case against, fully accepted:** fan-out converts "one row per booking event" into "one row
per technician per booking event", and three things depend on the old invariant without ever naming
`assigned_to` — the reminder claim, the dashboard count, and the reschedule index-paired diff.

### The three prerequisites, IN DEPLOY ORDER

| Step | Action | Permits fan-out? |
|---|---|---|
| **0a** | **Migration:** add `calendar_bookings.booking_group_id uuid`, backfill one distinct group id per existing row, index it. Nothing writes two rows yet. | No — purely additive |
| **0b** | **Deploy the group-aware reminder Edge Function.** Verify live against one-row-per-group data, where its behaviour is byte-identical to today. | No |
| **1** | **Migration:** junction + backfill + the 16 policy rewrites + Part D's four-item atomic unit (§5). | No — no writer creates two rows yet |
| **2** | **Code:** the multi-tech picker and the fan-out writer (SESSION 2 Wave 2). | **YES — this is the gate** |

Step 0a resolves the apparent chicken-and-egg ("the reminder claim needs a group column, but the
claim must ship before any migration"): **0a is a migration, but it is not one that permits
fan-out.** 0b then satisfies "deployed and verified live before any migration that permits fan-out"
literally.

Also required, and easy to miss: **`calculate-travel-time`'s two `leads`-side filters** must be
migrated before or with Step 2 — see §4.

---

## 4 · THE TWO GLOBAL-IMMEDIATE EDGE FUNCTION CONSTRAINTS

**Why EF ordering is not negotiable.** Per `CLAUDE.md`, Edge Functions are **CLI-only,
human-applied, and global-immediate** — no preview deployment, no branch, no gradual rollout, no
staging buffer. The moment an EF is deployed it is live for every user. There is no window in which
a mistake is only visible internally. That is why these two must be sequenced deliberately rather
than discovered.

### 🔴 EF-1 · `send-inspection-reminder` — duplicate customer emails

`supabase/functions/send-inspection-reminder/index.ts:334-339` claims a reminder with a **per-row**
compare-and-swap:

```ts
await supabase.from('calendar_bookings')
  .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
  .eq('id', booking.id)
  .eq('reminder_sent', false)
  .select('id');
```

Two technicians ⇒ two rows ⇒ two independent `reminder_sent` flags ⇒ **two identical reminder
emails to the customer.** The function carries an inline comment at `:330-332` describing the exact
duplicate-send incident this CAS was written to prevent. Fan-out reintroduces that incident through
a door the CAS cannot close, because the two rows are now legitimately distinct records. The
release path at `:461` has the same shape.

**A group id alone does not fix it — the claim must move to the group:**

```sql
UPDATE public.calendar_bookings
   SET reminder_sent = true, reminder_sent_at = now()
 WHERE booking_group_id = $1
   AND reminder_sent = false
RETURNING id;
```

One statement, therefore atomic. The first invocation claims **every** row in the group; a
concurrent second matches zero and sends nothing. Correct with one row per group (today) and with N
(after fan-out).

**Ordering: deploy and verify this BEFORE Step 1.** If a two-row booking can exist before this
lands, the first two-tech booking sends a duplicate email with no code change in between.

### 🔴 EF-2 · `calculate-travel-time` — a secondary's day is under-reported

SESSION 2's addendum A5 lists lines 739, 1073 and 1395 as fan-out-safe and calls that "the core of
the fan-out case". **Two of the three are on a different table:**

```
737:  .from('calendar_bookings')   ← line 739 lives here.  SAFE under fan-out.
1061: .from('leads')               ← line 1073 lives here. NOT SAFE.
1385: .from('leads')               ← line 1395 lives here. NOT SAFE.
```

Fan-out only fans out `calendar_bookings`. `leads.assigned_to` stays a singular pointer to the
primary **by design**, so a technician who is SECONDARY on a lead matches neither `leads`-side
filter. Their inspection-day appointments sourced from `leads` are invisible to their own
availability check and recommended-dates computation — so the engine offers them a slot on top of a
job they are already attending. **That is the "block both calendars" rule failing.**

It is a *partial* gap — booking-sourced appointments are covered by L739 — so it presents as an
**intermittent** double-book, not an obvious outage.

**This contradicts SESSION 2 Step 5c's claim that the plan "avoids an EF change entirely under the
fan-out model." That claim is false.**

Also in the same file: `endMinutesByLead` is keyed by `leadId` (`:1088-1090`), so a second row for
the same lead **silently overwrites the first**; and `recommended_technician_id` (`:1016`) is a
scalar that cannot express a pair.

---

## 5 · PART D — THE FOUR-ITEM ATOMIC UNIT

SESSION 3 §5.8 and the brief both specify **three** items. Live evidence added a fourth, and the
fourth is the one that makes the other three possible. **All four land in one migration, one
transaction.**

| # | Item |
|---|---|
| 1 | Widen the 4 `photos` technician policies (5 predicate bodies) to consult the junction |
| 2 | **Widen the 3 `job_completions` technician policies (4 bodies) — above all the INSERT `WITH CHECK`** |
| 3 | Re-source `completed_by` from `auth.uid()` to the lead's primary technician (write path) |
| 4 | Add `submitted_by` = `auth.uid()`, backfilled `submitted_by = completed_by` |

### Why item 2 is the unblocker

`job_completions` RLS was a **total blind spot** — zero policy DDL for that table exists anywhere
in `supabase/migrations/**`, yet four policies are live. Three gate on `completed_by`, including:

```
Technicians can insert own job completions  INSERT  with_check: ((completed_by = auth.uid()) OR is_admin())
```

Item 3 changes what `createJobCompletion()` writes into `completed_by`
(`useJobCompletionForm.ts:256` currently passes `user.id`). The moment `completed_by` becomes the
**primary's** id, a **secondary** opening the job form submits a row where
`completed_by ≠ auth.uid()` and `is_admin()` is false. **Postgres refuses the INSERT.**

### 🔴 R2 — THE NO-BUILD-TIME-SIGNAL WARNING

> Without item 2, a secondary technician **cannot create a job completion at all.** Not degraded
> access to photos — no record at all. **The failure lands in the field, on a phone, as a silent
> RLS denial, with NO build-time signal**: it type-checks, it lints, it passes CI, and it fails
> only when a real technician taps Save on a real job.

**Verification is an explicit insert-as-the-secondary on the preview.** No other check surfaces it:

```sql
-- as the SECONDARY technician, on the preview. Must succeed.
INSERT INTO public.job_completions (lead_id, completed_by, …)
VALUES (<their lead>, <primary_id>, …);
```

### Ordering if the four genuinely cannot be one migration

The risk is **asymmetric, not symmetric** (SESSION 3 §5.8):

| Split order | Consequence | Severity |
|---|---|---|
| Items 3/4 **before** 1/2 | Secondaries lose photo access **and** cannot create job completions. Silent RLS denial mid-job. | 🔴 **CRITICAL** |
| Items 1/2 **before** 3/4 | Safe. Access broadened first, attribution corrected second. Window is over-permissive, not under-permissive. | 🟢 LOW |

**RLS-widening first, always — and put it in the DEPLOY RUNBOOK, not in a filename.** Migrations
here are human-applied in Studio with no staging buffer, so ordering is a person's decision at a
keyboard, not a CI guarantee.

Item 4's backfill is **lossless and needs no judgement**: historically `completed_by` *was* the
submitter, so `UPDATE job_completions SET submitted_by = completed_by` preserves the audit fact
exactly. Historical `completed_by` values are **not** rewritten — that is Q7 in §8.

---

## 6 · THE ONE POLICY DELIBERATELY LEFT ALONE

**`leads.tech_update_assigned_leads` is NOT rewritten.** It is the 17th technician-referencing
policy, and it is excluded on purpose.

```
qual:       (assigned_to = auth.uid())
with_check: (assigned_to = auth.uid())
```

The `WITH CHECK` means: *after* the update, `assigned_to` must equal me. That is what stops a
technician reassigning a lead to anyone else.

**Widening it is a privilege escalation.** `is_assigned_to_lead(id)` is true for a secondary
**regardless of what `assigned_to` becomes**, so a secondary could set the primary pointer to any
value — stealing the lead or handing it to a third party. Widening only the `USING` half is no
better: `WITH CHECK` then forces `assigned_to = self`, which *is* the theft.

This is the concrete instance of a general rule worth carrying forward: **the "every rewritten
predicate is a provable superset" safety argument holds for `USING`, and NOT for `WITH CHECK`.**
Widening a `WITH CHECK` widens what a user may *write*.

> ⚠️ **It looks exactly like an omission to a reviewer.** Risk R5 in the findings doc tracks this.
> Post-migration, `pg_policies` for `tech_update_assigned_leads` must still read
> `(assigned_to = auth.uid())` in **both** bodies.

---

## 7 · PROD PRE-FLIGHT — P0 THROUGH P8

Every number in the findings doc was measured on **DEV `ctppzqnysmzynkxjlzta`**: 3 leads, 3
bookings, 2 inspections, 1 job completion. **PROD `ecyivrxjpsmjmexqatym` carries 101+ leads.**

**Run all of these against PROD immediately before applying anything there. State the target ref
and its role aloud and get explicit confirmation first, per `CLAUDE.md`. All are read-only
`SELECT`s. Full text is in `SESSION-1-DB-RLS-FINDINGS.md` § PROD PRE-FLIGHT.**

| ID | Query | Decision it gates |
|---|---|---|
| **P0** | **Re-run Bundle B and diff against the DEV output** | ⚠️ **The 16-policy list is DEV-derived.** History is forked; `20260825141426_lead_notes.sql:3-10` records in-repo that DDL has been applied to PROD out-of-band. **If PROD differs, §5f is a template, not a work order.** |
| **P1** | `current_database(), current_user, inet_server_addr()` | Confirms you are on the intended project before anything else. |
| **P2** | `leads` total / non-null / null `assigned_to` | **Is the PROD backfill row count.** The AFTER identities are meaningless without the BEFORE numbers. |
| **P3** | Three-bucket sizing | `bucket1` must equal P2 or **STOP**. `bucket2 > 0` ⇒ manual-review list before the backfill is trusted. |
| **P4** | Existing overlapping bookings | **Non-zero ⇒ the `EXCLUDE` constraint CANNOT be added at all.** Also independently a finding — `checkBookingConflict` fails open and nothing re-checks at write time. |
| **P5** | Rows per natural booking group | **Any group > 1 ⇒ `booking_group_id` is MANDATORY**, the natural-key reminder claim is unsafe, and the group backfill cannot use the natural key. |
| **P6** | `job_completions` / `leads` / `audit_logs` counts | Audit-row volume from the `submitted_by` backfill. `audit_log_trigger()` serialises the whole row and no `job_completions` trigger uses `UPDATE OF <columns>`, so the delta should equal `job_completions_rows` exactly. |
| **P7** | C1 / C1b / C3 on PROD | The `anon` EXECUTE posture is set per-database by `pg_default_acl`. **No reason to assume DEV and PROD agree.** |
| **P8** | C2a / C2b on PROD | Both must return zero rows. If `lead_assignments` already exists on PROD but not DEV — possible given the forked history — **STOP** and re-point the design. |

**Structural facts that DO transfer:** column types, nullability, FK targets and `ON DELETE`
actions, `rls_forced = false` on all 32 tables, the four predicate *shapes*, and the PostgREST
`428C9` behaviour on generated columns.

---

## 8 · TWO STANDING FINDINGS — UNRELATED TO THIS WORKSTREAM

Neither is fixed, proposed, or actioned. Both need their own triage and their own tickets.

### SF-1 · `calendar_bookings` has no per-technician RLS at all

One policy on the table, `cmd = ALL`:

```
authenticated_full_access_bookings   ALL   qual & with_check: (auth.uid() IS NOT NULL)   roles: {public}
```

**Every authenticated user can read AND write every booking row**, including other technicians'.

**How this should change your reading of the codebase:** the fifteen `.eq('assigned_to', …)`
filters catalogued by SESSION 2 are **UX scoping, not a security boundary.** A technician's
calendar looks filtered because the client asks for a filtered set, not because the database would
refuse a broader one. Any reasoning that treats them as access control has the wrong model.

Confirmed absent live: `technicians_view_own_bookings`, which exists in
`20251111000016_rename_tables_to_match_spec.sql:185-187` and never took effect.

### SF-2 · `audit_log_trigger()` carries `anon` EXECUTE

```
audit_log_trigger               SECURITY DEFINER  anon_execute: TRUE
audited_insert_lead_via_framer  SECURITY DEFINER  anon_execute: false
audited_mark_invoice_overdue    SECURITY DEFINER  anon_execute: false
```

The two siblings were revoked by `20260709120000_revoke_anon_execute_audit_rpcs.sql`;
**`audit_log_trigger()` was missed by that cleanup.**

**Exploitable: NO.** It is a trigger function — no arguments, returns `trigger` — so a direct call
fails with *"trigger functions can only be called as triggers"*.

**Significant: YES.** It is live proof the `pg_default_acl` grant is **active on this database
today.** Any SECURITY DEFINER function created without an explicit `REVOKE` receives the same
grant — and one that takes arguments and returns a scalar **would** be directly callable by an
unauthenticated request. This is exactly why the `REVOKE ... FROM anon` block is mandatory in the
same migration as any new SECURITY DEFINER function.

⚠️ **Scope caveat: this came from a sweep filtered on `proname ~* 'audit'`. C1 is the complete
sweep and HAS NOT BEEN RUN.** There may be other SECURITY DEFINER functions with `anon` EXECUTE,
including non-trigger ones, which *would* be exploitable.

---

## 9 · OPEN PRODUCT DECISIONS

### 9.1 · Escalated by the database work

**Should technicians gain multi-tech write access to the `leads` row itself?**
`tech_update_assigned_leads` was left unrewritten (§6) because widening it lets a secondary steal
or reassign the primary pointer. No secondary capability the feature needs requires updating the
`leads` row — they need to read the lead and read/write the inspection, areas, photos and job
completion, all of which the 16 rewrites grant. **Granting it later is additive and reversible.**
Nobody has decided it either way.

### 9.2 · For Glen & Clayton (SESSION 3, verbatim)

| Q | Question | SESSION 3's recommendation |
|---|---|---|
| **Q1** | Two techs on a job — should the customer's job report still name just one? | Name one (the lead technician) |
| **Q2** | Same for the inspection report's "INSPECTOR:" line | Name one |
| **Q3** | Booking confirmation email — name every attending tech or just the lead? | Keep one name; consider changing the prose to "Our **team** will arrive" for job bookings |
| **Q4** | Second tech added *after* the report was emailed — send a corrected report? | **No recommendation.** Purely a customer-relationship call |
| **Q5** | Two-tech job — who gets the revenue credit? 100% to lead / 50-50 / 100% each? | **No recommendation.** Affects any pay or performance conversation built on these numbers |
| **Q6** | Same for the technician scoreboard's job and inspection counts | **No recommendation** |
| **Q7** | Some past job reports may name a technician who was never rostered on that job | Get the list first (query D3), then decide. Correcting records does not change any PDF already sent |
| **Q8** | Lead tech starts a job, second tech finishes it — whose name does the customer see? | The lead technician, with an admin able to override manually (that override already exists for inspection reports) |

**Note on Q7:** D3 was run on DEV and returned **1 row with no drift**. That is DEV's single job
completion and tells you nothing about PROD. Re-run D3 on PROD to produce the real list.

### 9.3 · Display decisions SESSION 2 flagged but did not settle

Under fan-out, `useTodaysSchedule.ts`, `useScheduleCalendar.ts` and `useCancelledBookings.ts` map
one row → one rendered item, so a two-tech job appears **twice**. That may be desirable (each
technician's own slot) or not. **Needs an explicit product decision, not just a name-widening.**

---

## 10 · WHAT HAS *NOT* BEEN DECIDED OR DONE

Stated plainly so nobody infers a decision that was never made.

**Not built:**
- No migration file has been written. Not for the junction, not for `booking_group_id`, not for the
  policy rewrites. The SQL in the findings doc is a **design document**, not a migration.
- No Edge Function has been modified or deployed.
- No source file has been touched. SESSION 2's five-wave plan is a plan; none of it is implemented.
- The `EXCLUDE` constraint preventing per-technician double-booking is **designed but not
  scheduled**, and P4 may show it cannot be added at all.

**Not verified:**
- **Bundle C has never run.** So: (a) the complete `anon` EXECUTE sweep does not exist — only an
  `'audit'`-filtered slice; and (b) **it is not confirmed that `is_assigned_to_lead()` and
  `lead_assignments` do not already exist.** C2a and C2b are authoring gates that **must return
  zero rows before the migration is written.** Do not skip this: if a junction already exists,
  creating a second one is the worst outcome available.
- Nothing has been measured on PROD. Every number is DEV.
- `is_admin()`'s live signature is unconfirmed — the repo contains **both** `is_admin(_user_id uuid)`
  (`20251028135212:147`) and zero-arg `is_admin()` (`20260109000003:25`). The policy rewrites use
  the zero-arg form because that is what live `pg_policies` shows in use, but the function bodies
  were never read.

**Decided against, deliberately (so nobody "fixes" these):**
- **No sync triggers on `leads`.** A trigger-based bidirectional design was authored and rejected —
  it produced four CRITICAL findings, worst of which is that a `leads.assigned_to` write from any
  *unmigrated* writer (i.e. every writer until Wave 2) would fire a reconcile trigger replacing the
  crew with one technician. Glen and Clayton become Glen, silently and unauditably. **Dual-write is
  application-level**, matching SESSION 2's Wave 2.
- **No "blessed RPC"** (`set_lead_assignments(uuid, uuid[])`). A SECURITY DEFINER function reachable
  over PostgREST is a grant-any-user-access-to-any-lead primitive.
- **No audit trigger on the junction.** `CLAUDE.md` fixes the foundation at 29 triggers across 10
  tables and forbids additions without explicit instruction. The junction's scalar `id` column
  keeps that door open for a later, approved migration.
- **`inspections.inspector_id` stays scalar.** The junction is scoped to lead → technicians, not
  inspection → inspectors. A two-tech *inspection* will still print one inspector name. Recorded so
  a later reader does not mistake this for an oversight.
- **`leads.assigned_to` is NOT dropped in this work.** That is a later migration, after all readers
  have migrated.

**The one control that needs an owner:**
`is_assigned_to_lead()` deliberately keeps a second disjunct on the legacy `leads.assigned_to`
column, which makes every rewritten `USING` predicate a provable superset and prevents any
lockout. **The cost is that a broken junction-write path is invisible** — the app keeps working via
the legacy branch. The drift monitor in `SESSION-1-DB-RLS-FINDINGS.md` §5c is the only thing that
would catch it, and **it is only a control if somebody runs it on a schedule.** Assign an owner and
a cadence, or the safety net becomes a blindfold.

---

## 11 · IF YOU NEED TO QUERY THE DATABASE

**An agent session has no CLI route to any Supabase database on this machine.** `supabase db query`
in CLI 2.101.0 accepts only `--db-url`, `--linked` and `--local` — there is **no `--project-ref`
flag** — while the project's Bash guard rejects every Supabase command that *lacks* one. That is a
closed loop. The Supabase MCP is pinned on disk to the PROD ref with a dead token.

**The working route is: hand Michael a read-only SQL block and have him run it in the Studio SQL
editor.** `SESSION-1-DEV-QUERY-PACK.sql` is built for exactly that — Studio shows only the last
result set of a multi-statement run, so each block is designed to be run one at a time.

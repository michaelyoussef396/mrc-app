# SESSION 4 — PROD PRE-FLIGHT for `booking_group_id` (Step 0a)

**Written:** 2026-08-28 · **Worktree:** `~/mrc-booking-group` · **Branch:** `feat/booking-group-id`

**Gates:** `supabase/migrations/20260828120000_add_booking_group_id.sql`

> **NOTHING IN THIS DOCUMENT HAS BEEN RUN.** No database was contacted while writing it. PROD
> `ecyivrxjpsmjmexqatym` was never targeted, and neither was DEV. Every expected PROD value is
> `UNKNOWN — MUST CAPTURE`.
>
> **Every gate in §1 (S4-P1 … S4-P11) is a read-only `SELECT`.** The pack is safe to run in full,
> at any hour, in any order, without reading every line — that is a deliberate property, and it is
> why pausing the reminder cron was kept out of it (see S4-P11). The only SQL in this document that
> writes anything is **§3 Plan B**, which is not a gate at all: it is the alternative *apply*
> procedure, reached only if S4-P3 rules out the migration as written.

---

## 0 · How to run this, and why it is not automated

An agent session on this machine has **no CLI route to any Supabase database**. `supabase db query`
accepts only `--db-url`, `--linked` and `--local` — there is no `--project-ref` flag — while this
project's Bash guard rejects every `supabase` command that *lacks* one. The Supabase MCP is pinned
on disk to the PROD ref with a dead token. That is a closed loop, documented in
[`HANDOFF.md`](HANDOFF.md) §11.

**So: Michael runs these in the Supabase Studio SQL editor and pastes the output back.**

Studio shows only the **last** result set of a multi-statement run. **Run each query on its own.**

### Before the first query

Per `CLAUDE.md`, state the target ref **and its role in plain English** and get explicit
confirmation. Do not infer it. Do not default to PROD.

| env | ref | role |
|---|---|---|
| **DEV** | `ctppzqnysmzynkxjlzta` | Sandbox clone (ap-southeast-1). Safe to break. |
| **PROD** | `ecyivrxjpsmjmexqatym` | **LIVE — mrcsystem.com. Real customer path.** |

### Order of application

Run this whole pack against **DEV first**, apply the migration to DEV, verify, and only then run the
pack again against **PROD**. The DEV pass is not a formality: it is the only place the migration's
two guards get exercised against real data before they run on the live customer path.

### What is and is not carried over from SESSION 1

SESSION 1 measured DEV on 2026-08-28: **3 leads, 3 bookings, 2 inspections, 1 job completion.**
PROD carries **101+ leads** and has never been measured.

| Transfers to PROD (structural) | Does NOT transfer (count-derived) |
|---|---|
| Column types, nullability, defaults, FK targets | Row count — and therefore the rewrite cost |
| `rls_forced = false` on all 32 tables | Rows per natural booking group |
| Policy *shapes* | Whether any booking group already holds two rows |
| | Orphan (`lead_id IS NULL`) booking count |

---

## 1 · THE GATE TABLE

Run in order. A **STOP** means do not apply the migration and come back with the output.

| ID | What it asks | Decision it gates |
|---|---|---|
| **S4-P1** | Which database am I actually on? | Everything. Wrong answer ⇒ STOP immediately. |
| **S4-P2** | Does `booking_group_id` already exist? | Whether Step 0a is still the right shape at all. Any row ⇒ **STOP**. |
| **S4-P3** | How many rows / how big is the table? | **Whether NOT NULL ships now (as written) or is deferred to Plan B.** |
| **S4-P4** | Does any natural booking group already hold >1 non-voided row? (and **S4-P4d**: any *near-miss* pair the exact-key guard cannot see) | Whether GUARD 1 will abort. Non-zero ⇒ human adjudication **before** applying. S4-P4d is a human gate with no automatic backstop. |
| **S4-P5** | What are the live `booking_status` enum labels? | Whether GUARD 1's `'cancelled'` AND `'rescheduled'` literals parse. Repo and live are known to disagree. |
| **S4-P6** | Which triggers are on `calendar_bookings`? | The "no trigger fires, no audit rows, `updated_at` untouched" claims. |
| **S4-P7** | Which indexes are on `calendar_bookings`? | Whether the new index name collides, and the AFTER count identity. |
| **S4-P8** | What is the RLS posture on `calendar_bookings`? | Confirms SF-1 on PROD and that no policy change is needed. |
| **S4-P9** | Table-level or **column-level** grants? | **The one way a new column can be unwritable.** Column-level grants ⇒ STOP. |
| **S4-P10** | Orphan and reminder-state distribution | Baseline for the AFTER checks and for Step 0b's EF verification. |
| **S4-P11** | **Is the hourly reminder cron going to fire mid-apply?** | **Whether the table is actually quiet.** "Outside working hours" is not enough — this writer runs 24/7. |

---

## S4-P1 — Confirm the target before anything else

```sql
SELECT current_database(),
       current_user,
       inet_server_addr(),
       version();
```

**Gates:** that you are on the project you said you were on. Do not proceed on a mismatch, and do
not proceed if you cannot tell — re-check the Studio project selector rather than guessing.

---

## S4-P2 — The column must not already exist · **authoring gate**

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'calendar_bookings'
  AND column_name IN ('booking_group_id', 'group_id', 'booking_group');
```

**DEV expects:** 0 rows. **PROD expects:** `UNKNOWN — MUST CAPTURE`.

**Gates:** any row ⇒ **STOP.** This is not paranoia. The migration history is forked (16 shared /
104 local-only / 102 remote-only) and this project has demonstrably applied DDL to PROD out-of-band
— `20260825141426_lead_notes.sql:3-10` records exactly that, in-repo. A `booking_group_id` that
already exists on PROD but not in this repo would have unknown type, unknown nullability and unknown
population. Creating a second grouping column beside it is the worst outcome available.

The migration uses a bare `ADD COLUMN` (not `IF NOT EXISTS`) precisely so this case fails loudly at
`42701` rather than silently no-op'ing past a column whose contents nobody has looked at. This gate
exists so you learn it before pasting, not during.

---

## S4-P3 — Table size · **gates NOT NULL now vs. Plan B**

```sql
SELECT count(*) AS calendar_bookings_rows FROM public.calendar_bookings;
```

```sql
SELECT pg_size_pretty(pg_total_relation_size('public.calendar_bookings')) AS total_size,
       pg_size_pretty(pg_relation_size('public.calendar_bookings'))       AS heap_size,
       pg_size_pretty(pg_indexes_size('public.calendar_bookings'))        AS indexes_size;
```

**DEV expects:** 3 rows (SESSION 1 §1b). **PROD expects:** `UNKNOWN — MUST CAPTURE`.

**Why this is the decisive number.** The migration adds the column with
`NOT NULL DEFAULT gen_random_uuid()`. `gen_random_uuid()` is **volatile**, so Postgres cannot use
the PG11+ catalog-only fast path: it performs a **full table rewrite under `ACCESS EXCLUSIVE`**,
evaluating the default once per row. That is what makes the column born-populated in a single
statement with no NULL window — and it is also the entire cost of the design.

**Gates:**

| `calendar_bookings_rows` | Decision |
|---|---|
| Under ~500,000 (and heap under ~1 GB) | **Apply as written.** Expect sub-second to a few seconds. This is the overwhelmingly likely case — a Melbourne mould business with 101+ leads has hundreds of bookings, not millions. |
| Above that, or heap over ~1 GB | **Do not apply as written.** Switch to Plan B in §3 and get sign-off on the extra risk it carries. |

Regardless of the number, apply **outside working hours**.

**Be honest about the lock window.** `lock_timeout = '3s'` makes the migration fail fast rather than
queue behind a long-running transaction; `statement_timeout = '60s'` is **per statement, not per
transaction**. The migration takes `ACCESS EXCLUSIVE` up front (SECTION 0) and then runs four heavy
statements under it — GUARD 1's scan, the `ALTER` rewrite, `CREATE INDEX`, and GUARD 2's
`count(DISTINCT ...)` scan. **The worst-case hold is therefore up to roughly 4 × 60s, not 60s.**
That is the number to plan the window around. Either timeout aborts the whole transaction cleanly
and leaves the table byte-identical to before — a failed apply is safe, a queued lock is not.

The row thresholds above are set well below where that matters, but they are cost estimates for the
rewrite alone; on a table anywhere near the upper bound, budget for the index build and both guard
scans as well.

---

## S4-P4 — Natural-group ambiguity · **gates GUARD 1**

This is [`SESSION-1-DB-RLS-FINDINGS.md`](SESSION-1-DB-RLS-FINDINGS.md) **P5**, narrowed to the exact
predicate the migration's GUARD 1 uses.

### S4-P4a — the shape

```sql
SELECT rows_in_group, count(*) AS number_of_groups
FROM (
  SELECT lead_id, event_type, start_datetime, count(*) AS rows_in_group
  FROM public.calendar_bookings
  WHERE lead_id IS NOT NULL
    AND (status IS NULL OR status NOT IN ('cancelled', 'rescheduled'))
  GROUP BY lead_id, event_type, start_datetime
) g
GROUP BY rows_in_group
ORDER BY rows_in_group;
```

**DEV expects:** exactly one row — `rows_in_group = 1`, `number_of_groups = 3` (SESSION 1's
`e3_rows_per_natural_group`: all 3 groups hold exactly 1 row).
**PROD expects:** `UNKNOWN — MUST CAPTURE`.

**Gates:** every group must be `rows_in_group = 1`. **Any `> 1` ⇒ GUARD 1 will abort the migration.**
That is the guard working, not failing. Run S4-P4b, adjudicate, then decide.

### S4-P4b — the offending groups, if S4-P4a shows any

```sql
SELECT lead_id,
       event_type,
       start_datetime,
       count(*)                          AS rows_in_group,
       array_agg(DISTINCT status::text)  AS statuses,
       array_agg(DISTINCT assigned_to)   AS technicians,
       array_agg(id ORDER BY created_at) AS booking_ids,
       min(created_at)                   AS first_created,
       max(created_at)                   AS last_created
FROM public.calendar_bookings
WHERE lead_id IS NOT NULL
  AND (status IS NULL OR status NOT IN ('cancelled', 'rescheduled'))
GROUP BY lead_id, event_type, start_datetime
HAVING count(*) > 1
ORDER BY start_datetime DESC;
```

**What a human has to decide for each group, and why a migration must not decide it:**

- **Two different `technicians`, same slot** — this is already a de-facto two-technician booking,
  created by hand before the feature existed. It *should* share one group id. But asserting that
  automatically means asserting a semantic nobody has verified.
- **The same technician twice** — a duplicate booking, i.e. a data bug. It should probably be
  deleted or cancelled, not grouped.
- **`created_at` far apart** — a re-book that never cancelled the original.

**Why it matters that this is settled before Step 0b, not after.** If two rows that are really one
booking end up in two different groups, SESSION 5's group-scoped claim treats them as two bookings
and sends the customer **two identical reminder emails** — the exact R1 incident, arriving *before*
fan-out has shipped anything. Emails are irreversible.

**Do not edit GUARD 1 to get past this.** Fix the data, or come back with a decision.

### S4-P4c — the voided-inclusive count (informational, no gate)

```sql
SELECT rows_in_group, count(*) AS number_of_groups
FROM (
  SELECT lead_id, event_type, start_datetime, count(*) AS rows_in_group
  FROM public.calendar_bookings
  WHERE lead_id IS NOT NULL
  GROUP BY lead_id, event_type, start_datetime
) g
GROUP BY rows_in_group
ORDER BY rows_in_group;
```

**Gates:** nothing. It exists to explain a discrepancy. If S4-P4c shows collisions and S4-P4a does
not, the collisions involve a **voided** row — either a cancel-then-rebook-the-same-slot, or a
`'rescheduled'` **tombstone** left at the original `start_datetime` when a booking was moved away
and the freed slot was later refilled (`src/hooks/useTechnicianJobs.ts:248-249`). GUARD 1 excludes
`'cancelled'` and `'rescheduled'` deliberately, so those are benign and the guard is right to ignore
them. Capture this anyway, so nobody later reads the unfiltered P5 number from SESSION 1 — which
excludes nothing — and concludes the guard is broken.

Note that SESSION 1's P5 and this query are **not** the same question. P5 grouped every row
regardless of status or `lead_id`; S4-P4a mirrors the migration's guard exactly. Expect the two
numbers to differ, and do not treat that as a discrepancy.

---

### S4-P4d — NEAR-MISS duplicates · informational, but read it before you trust a clean S4-P4a

**A clean S4-P4a is narrower evidence than it looks.** GUARD 1 groups on *exact* equality:
`start_datetime` at full microsecond precision, and `event_type` as a raw case- and
whitespace-sensitive `VARCHAR(50)`. Two rows that a human would call one occurrence — booked a
minute apart, or one with seconds set and one zeroed, or `'inspection'` beside `'Inspection'` —
land in different buckets and the guard correctly reports nothing. PROD has never been measured and
its oldest rows predate every current code path, so hand-entered near-misses are plausible there in
a way they are not on DEV's three rows.

```sql
-- Same-lead, same-normalised-event_type pairs within 15 minutes of each other.
SELECT a.lead_id,
       a.event_type       AS event_type_a,
       b.event_type       AS event_type_b,
       a.start_datetime   AS start_a,
       b.start_datetime   AS start_b,
       b.start_datetime - a.start_datetime AS gap,
       a.assigned_to      AS tech_a,
       b.assigned_to      AS tech_b,
       a.status::text     AS status_a,
       b.status::text     AS status_b,
       a.id               AS id_a,
       b.id               AS id_b
FROM public.calendar_bookings a
JOIN public.calendar_bookings b
  ON  a.lead_id = b.lead_id
 AND  a.id < b.id
 AND  lower(btrim(a.event_type)) = lower(btrim(b.event_type))
 AND  b.start_datetime BETWEEN a.start_datetime - INTERVAL '15 minutes'
                           AND a.start_datetime + INTERVAL '15 minutes'
WHERE a.lead_id IS NOT NULL
  AND (a.status IS NULL OR a.status NOT IN ('cancelled', 'rescheduled'))
  AND (b.status IS NULL OR b.status NOT IN ('cancelled', 'rescheduled'))
ORDER BY a.start_datetime DESC;
```

**DEV expects:** 0 rows. **PROD expects:** `UNKNOWN — MUST CAPTURE`.

**Gates:** nothing automatically — **GUARD 1 is deliberately NOT loosened to match this.** A fuzzy
abort predicate would false-abort on legitimately distinct bookings and there is no threshold that
is right for every case. This is a **human** gate: if it returns rows, look at them with the same
S4-P4b questions before applying. A near-miss pair that really is one occurrence will be split into
two groups by this migration, and SESSION 5's group claim will then send that customer two reminder
emails. Deciding that is a person's job, and this query is how the person finds out.

**If you find real near-miss pairs**, the fix is to correct the data (align the timestamps, or
cancel the duplicate) *before* applying — not to change the guard.

---

## S4-P5 — Live `booking_status` labels · gates GUARD 1's literal

```sql
SELECT t.typname, e.enumlabel, e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'booking_status'
ORDER BY e.enumsortorder;
```

**Repo says:** `scheduled, in_progress, completed, cancelled, rescheduled`
(`20251028135212_...sql:85-91`).
**PROD expects:** `UNKNOWN — MUST CAPTURE`.

**Gates:** **both** `'cancelled'` and `'rescheduled'` must be present, or GUARD 1 fails at parse
time with `invalid input value for enum booking_status`. GUARD 1 excludes both as voided statuses:
a cancelled row never happened, and a `'rescheduled'` row is a tombstone left at the original slot
when a booking was moved (`src/hooks/useTechnicianJobs.ts:248-249`), so re-booking that freed slot
would otherwise collide with it and abort the migration for no reason. `'completed'` is
deliberately NOT excluded — a completed row is an occurrence that really happened, so two of them
in one slot deserve a human's attention.

**Why this is not a formality.** `set_reminder_scheduled_for()` tests
`NEW.status IN ('cancelled', 'completed', 'no_show')`
(`20260218000001_add_reminder_scheduled_for.sql:18`). **`no_show` is not in the repo's enum
definition.** If the live enum genuinely lacked it, every status-changing update on
`calendar_bookings` would already be throwing — so the live type has almost certainly drifted from
this repo. That is one more instance of the forked history, and it is the reason to read the live
catalog rather than the migration files.

If the query returns **zero rows**, `status` is not an enum on this database at all (it may be
`text`). The guard's comparison still works; record the finding and move on.

---

## S4-P6 — Triggers on `calendar_bookings` · gates three claims at once

```sql
SELECT tg.tgname,
       tg.tgenabled,
       pg_get_triggerdef(tg.oid) AS definition
FROM pg_trigger tg
JOIN pg_class     c ON c.oid = tg.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'calendar_bookings'
  AND NOT tg.tgisinternal
ORDER BY tg.tgname;
```

**Repo says exactly two:**

| Trigger | Definition | Consequence |
|---|---|---|
| `update_calendar_bookings_updated_at` | `BEFORE UPDATE ... FOR EACH ROW`, **no column list** (`20251111000016:578-590`), body `NEW.updated_at = NOW()` (`20251028133857:132-137`) | Any `UPDATE`-based backfill would rewrite `updated_at` on **100% of rows**. The migration uses an `ALTER` instead, and `ALTER TABLE` rewrites do not fire row triggers. |
| `trigger_set_reminder_scheduled_for` | `BEFORE INSERT OR UPDATE OF start_datetime, status` (`20260218000001:34-37`) | Column-scoped, so it would not have fired on a `booking_group_id` update either. Listed so a reviewer need not go and check. |

**PROD expects:** `UNKNOWN — MUST CAPTURE`.

**Gates:**

- **More than two triggers ⇒ read every extra one before applying.** In particular, if PROD carries
  an **audit** trigger on `calendar_bookings`, the "zero audit rows" claim in the migration's
  verification A5 is void. `CLAUDE.md` fixes the audit foundation at 29 triggers across 10 tables
  and `calendar_bookings` is **not** one of them (leads, inspections, inspection_areas,
  subfloor_data, moisture_readings, subfloor_readings, photos, user_roles, invoices,
  job_completions) — but the repo has been wrong about live triggers before.
- Any `AFTER INSERT` trigger here is also context for Step 0b.

---

## S4-P7 — Indexes · gates the name and the AFTER identity

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
ORDER BY indexname;
```

**DEV expects:** `idx_calendar_bookings_booking_group_id` **absent**.
**PROD expects:** `UNKNOWN — MUST CAPTURE` — record the full list *and the count*; the AFTER check
is `count + 1` with nothing removed.

**Gates:** a name collision ⇒ the bare `CREATE INDEX` fails at `42P07`. Also worth reading the list:
if PROD already carries an index on a column this repo does not know about, that is a forked-history
finding in its own right.

---

## S4-P8 — RLS posture · confirms SF-1 on PROD

```sql
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
ORDER BY policyname;
```

**DEV showed exactly one** (SESSION 1, SF-1): `authenticated_full_access_bookings`, `cmd = ALL`,
`qual` and `with_check` both `((SELECT auth.uid()) IS NOT NULL)`, `roles = {public}`.
**PROD expects:** `UNKNOWN — MUST CAPTURE`.

**Gates:** the migration makes no policy change and needs none — a column added to an existing table
is covered by that table's existing policies. This query exists to confirm PROD agrees with DEV
before that reasoning is relied on, per `HANDOFF.md` P0.

**Not this workstream's business, but capture it anyway:** if PROD matches DEV, every authenticated
user can read and write every booking row, including other technicians'. That is standing finding
SF-1 and needs its own ticket. It is explicitly **not** fixed here.

---

## S4-P9 — Grants · **the one way the new column can be unwritable**

### S4-P9a — table-level

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'calendar_bookings'
ORDER BY grantee, privilege_type;
```

### S4-P9b — column-level

⚠️ **Do NOT use `information_schema.column_privileges` for this.** That view is a UNION of
column-level ACLs *and* table-level ACLs expanded one row per column, so on a normal Supabase table
— where `anon`, `authenticated` and `service_role` hold table-level grants — it returns rows for all
three grantees whether or not a single column-level grant exists. It cannot distinguish the one
failure mode this gate is for, and reading it literally produces a guaranteed false STOP.

Read the column ACLs directly instead. `pg_attribute.attacl` is NULL unless a genuine column-level
`GRANT` has been issued:

```sql
SELECT a.attname AS column_name,
       a.attacl  AS column_level_acl
FROM pg_attribute a
WHERE a.attrelid = 'public.calendar_bookings'::regclass
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND a.attacl IS NOT NULL
ORDER BY a.attname;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE` for both.

**Gates:** the migration adds **no** `GRANT`, on the reasoning that a new column inherits the
table's grants — `pg_default_acl` only auto-grants on **new tables and functions**, which is the
same reasoning recorded for `inspection_areas` in
`20260827200000_inspection_area_include_in_report.sql`.

**That reasoning has exactly one failure mode: column-level grants.** If `calendar_bookings` is
granted per-column rather than per-table, a newly added column receives **no privilege at all**, and
every `INSERT`/`UPDATE` naming `booking_group_id` fails with `permission denied for column`. Worse,
Step 2's fan-out writer is the first thing that would ever name it explicitly — so the failure would
surface months later, in the field.

**S4-P9b returning ANY rows ⇒ STOP** and add an explicit `GRANT` for the new column before
applying. Zero rows is the expected and healthy answer: it means every privilege on this table is
held at the table level, which a new column inherits automatically.

---

## S4-P10 — Baseline distributions · no gate, but capture them

### S4-P10a — orphan bookings (excluded from GUARD 1 by design)

```sql
SELECT count(*) FILTER (WHERE lead_id IS NULL) AS bookings_with_null_lead_id,
       count(*)                                AS bookings_total
FROM public.calendar_bookings;
```

`calendar_bookings.lead_id` is `ON DELETE SET NULL` (`20251028135212:624`), so these are orphans of
deleted leads. GUARD 1 excludes them because grouping unrelated orphans that merely share an
`event_type` and a timestamp would produce a **false abort**. A large count here is its own finding
and belongs in its own ticket, not in Step 0a.

### S4-P10b — reminder state, the Step 0b baseline

```sql
SELECT status, event_type, reminder_sent, count(*)
FROM public.calendar_bookings
GROUP BY status, event_type, reminder_sent
ORDER BY status, event_type, reminder_sent;
```

Capture this **before** Step 0a and again **after** Step 0b's Edge Function has been deployed and
has run once. Step 0b's whole claim is that its group-aware `UPDATE` is byte-identical in effect to
today's per-row CAS while every group holds one row. **This table is the evidence for that claim.**
Without a BEFORE capture there is nothing to compare against.

### S4-P10c — audit_logs baseline · **scoped to this table**

```sql
SELECT count(*) AS audit_rows_before
FROM public.audit_logs
WHERE entity_type = 'calendar_bookings';
```

Feeds verification **B7/A5** in the migration. The expected delta is **zero**, and the expected
value itself is almost certainly zero — `calendar_bookings` has no audit trigger.

**The `WHERE` clause is load-bearing.** An unscoped `count(*)` over `audit_logs` is not a test of
this migration at all: 29 triggers across 10 *other* tables write that table on every ordinary lead
edit, inspection save or photo write, so an unscoped delta measures whether anyone used the app
between the two runs. `audit_log_trigger()` records the source table in `entity_type`
(`20260311000001_add_audit_triggers.sql:12-21`), so scoping it makes A5 mean what it says: a
non-zero delta can only be an audit trigger on `calendar_bookings` that neither this repo nor DEV
has. Do not simplify it back.

---

## S4-P11 — The hourly reminder cron · **the table is NOT quiet at 3am**

`20260218000003_create_reminder_cron_job.sql:1-11` schedules a pg_cron job:

```
cron.schedule('send-inspection-reminders', '0 * * * *', ...)
  -> net.http_post('https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder')
```

**Every hour, on the hour, 24/7, against PROD.** That Edge Function then runs
`UPDATE calendar_bookings SET reminder_sent, reminder_sent_at` (`index.ts:333-338`) and the
row-scoped release (`index.ts:460-464`) — both of which fire `update_calendar_bookings_updated_at`
and move `updated_at`.

**"Apply outside working hours" does not give you a quiet table.** This is the one writer that does
not care what time it is.

### Capture the cron state

```sql
SELECT jobid, jobname, schedule, active, command
FROM cron.job
ORDER BY jobname;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. Expect to see `send-inspection-reminders` on `0 * * * *`.
(If `cron.job` is not readable or the extension is absent on the target, record that — it means the
scheduled writer does not exist there and this gate is moot.)

### It gates three things

1. **The lock.** The migration holds `ACCESS EXCLUSIVE` for a stated worst case of ~4 × 60s. If that
   straddles the top of the hour, the cron's EF either queues behind it and times out — skipping or
   partially claiming that hour's reminders — or wins the race and makes the migration lose its own
   3s `lock_timeout`.
2. **Verification A4**, the `updated_at` fingerprint. A cron run between B5 and A4 moves `updated_at`
   on any row it claims, changing the digest for a reason unrelated to this migration.
3. **Verification A2/B1**, the row-count identity.

### The operator step

**Apply in the first half of an hour, not the last** — start at :05, not at :55. The whole
transaction is budgeted at up to ~4 × 60s, so a :05 start clears the next top-of-hour by a wide
margin. That is the entire pre-flight step.

If the apply window cannot avoid the top of the hour, pausing the reminder cron is a
deploy-runbook decision, not a pre-flight step — see S4-P11 notes.

> **S4-P11 notes — why pausing cron is deliberately NOT in this pack.**
> Pausing it means `cron.unschedule('send-inspection-reminders')`, which is a write, and a reminder
> job left unscheduled **stops every customer inspection reminder silently** — nothing errors,
> nothing logs, and the next person to notice is a customer who did not get their 48-hour notice.
> A pre-flight pack has to be safe to run in full, at any hour, by someone tired, without reading
> every line; a statement whose failure mode is silent and customer-facing does not belong in one.
> If it is genuinely needed, it belongs in the deploy runbook as an explicit step with its own
> restore gate and its own verification that the job came back on the same schedule — captured
> from this section's query, restored verbatim, and confirmed by re-running it.

---

## 2 · AFTER APPLYING

The migration file's own `VERIFICATION` block (checks **B1–B7** and **A1–A7**) is the authority.
Run **every BEFORE check and write the numbers down** — the AFTER checks are identities against
them and are meaningless without them.

> ⚠️ **You will NOT see the guards pass.** Both guards announce success with `RAISE NOTICE`, and the
> Supabase Studio SQL editor renders result sets and errors but **not** server NOTICE messages. A
> successful apply shows only *"Success. No rows returned."* — which is indistinguishable from a run
> where a guard had been edited out or short-circuited.
>
> **A2 and A6 are therefore the operator-visible proof, and they are not optional.** A2 restates
> GUARD 2's identity (one distinct group id per row) and A6 restates GUARD 1's predicate. Run both.
> This matters more than it normally would: GUARD 2 exists specifically to prove the single
> PostgreSQL assumption the whole design rests on, on a target where it has never been exercised.

> ⚠️ **B5/A4 and B7/A5 are only meaningful on a quiet table — and this table has a scheduled
> writer.** See **S4-P11**. B5/A4 pin their row set with a `<t0>` literal you must reuse verbatim,
> and A4 ships a discriminator query so an hourly-cron write is diagnosed as an hourly-cron write
> rather than as a phantom trigger. B7/A5 are scoped to `entity_type = 'calendar_bookings'` so an
> ordinary lead edit on another table cannot move them. Use the versions in the migration file; do
> not simplify either back to an unscoped `count(*)`.

The two that most matter:

- **A4 — the `updated_at` fingerprint must be byte-identical to B5.** That is the proof that no row
  trigger fired and that no booking's last-changed record moved. A changed digest means the change
  was applied as an `UPDATE` backfill rather than as the `ALTER`, and the offline sync surface
  should be checked before going further.
- **A7 — every group must hold exactly one row.** Anything else before Step 2 ships means something
  fanned out early. **Do not deploy the reminder Edge Function** until that is explained.

---

## 3 · PLAN B — only if S4-P3 says the table is too large to rewrite

**Do not use this by preference.** It is strictly riskier than the migration as written and exists
only so that a surprising S4-P3 does not lead to someone editing the guard under time pressure.

```sql
-- Step 1 — catalog-only, instant, no rewrite, no lock held for any real time.
ALTER TABLE public.calendar_bookings ADD COLUMN booking_group_id uuid;

-- Step 2 — backfill in batches, OUTSIDE a long transaction.
--   ⚠️ THIS FIRES update_calendar_bookings_updated_at ON EVERY ROW IT TOUCHES.
--   updated_at will be rewritten across the whole table. That is the cost.
UPDATE public.calendar_bookings
   SET booking_group_id = gen_random_uuid()
 WHERE booking_group_id IS NULL
   AND id IN (SELECT id FROM public.calendar_bookings
               WHERE booking_group_id IS NULL LIMIT 5000);
-- repeat until it reports 0 rows.

-- Step 3 — the default, so new INSERTs stop producing NULLs.
ALTER TABLE public.calendar_bookings
  ALTER COLUMN booking_group_id SET DEFAULT gen_random_uuid();

-- Step 4 — mop up anything inserted during steps 2-3, then constrain.
UPDATE public.calendar_bookings SET booking_group_id = gen_random_uuid()
 WHERE booking_group_id IS NULL;
ALTER TABLE public.calendar_bookings ALTER COLUMN booking_group_id SET NOT NULL;

-- Step 5 — index.
CREATE INDEX CONCURRENTLY idx_calendar_bookings_booking_group_id
  ON public.calendar_bookings (booking_group_id);
```

**Every Plan B statement must carry its own timeouts.** None of the five below inherits the forward
migration's protection, and steps 1, 3, 4 and 5 all take a table-level lock. Prefix each with:

```sql
SET lock_timeout = '3s';
SET statement_timeout = '600s';
```

**What Plan B costs, stated honestly:**

1. **`updated_at` is rewritten on every row.** Unavoidable — the trigger has no column list.
2. **It spams every technician's phone.** `calendar_bookings` is in the `supabase_realtime`
   publication (`20260209100000_enable_realtime_calendar_bookings.sql:2`), and
   `src/hooks/useTechnicianJobs.ts:356-395` subscribes with `event: '*'` filtered to
   `assigned_to=eq.<user>`, firing a 4-second `toast.info('Job updated')` **and** a full
   `fetchJobs()` refetch on every payload. A batched full-table `UPDATE` emits one Realtime UPDATE
   per row — one toast and one refetch per booking, per logged-in technician, on exactly the row
   counts that justified Plan B. **The as-written `ALTER` has none of this cost:** a rewrite's tuple
   inserts are flagged `HEAP_INSERT_NO_LOGICAL`, so logical decoding skips them entirely. Run the
   batched `UPDATE` only when no technician is logged in.
3. **Step 4's `SET NOT NULL` takes `ACCESS EXCLUSIVE` and FULL-SCANS the table to validate.** This
   is the one that undercuts the whole plan: Postgres skips that scan only when a valid
   `CHECK (col IS NOT NULL)` already exists (PG12+), and Plan B creates none. So on the ≥500k-row
   table that is the *only* reason to choose Plan B, step 4 reintroduces exactly the long exclusive
   window Plan B exists to avoid — cheaper than a rewrite because it is a read, but not free, and
   **not** the near-instant operation the shape of the plan implies. If that matters at your row
   count, add a `NOT VALID` check constraint, `VALIDATE` it under a weaker lock, then `SET NOT NULL`
   — and get that variant reviewed before running it.
4. **There is a real NULL window — steps 1→3, and only steps 1→3.** Every booking created before
   step 3 installs the `DEFAULT` starts NULL, and `SET DEFAULT` does not retroactively fix rows
   already inserted. Step 4's mop-up `UPDATE` closes it.
   *(An earlier draft of this section claimed step 4 was a race against concurrent inserts. It is
   not: by step 4 the `DEFAULT` is already installed and every writer that exists today omits the
   column — see the migration's writer sweep — so no new NULL can appear. Corrected here so nobody
   plans around a race that cannot occur, or dismisses the real window at steps 1→3.)*
5. **The batched `UPDATE` bloats the table.** Every updated row is a new heap tuple plus new index
   entries, roughly doubling heap and index size until `VACUUM` catches up — again on precisely the
   row counts that triggered Plan B. Budget for it, and consider `VACUUM (ANALYZE)` afterwards.
6. **Step 5 cannot be run from the Supabase Studio SQL editor at all.** `CREATE INDEX CONCURRENTLY`
   cannot run inside a transaction block, and the Studio editor *is* a transaction block — it fails
   with `25001`. §0 designates Studio as the only route available, so **this step has no route
   without a second channel.** Either run it over a direct `psql` connection (non-pooler
   connection string), or drop `CONCURRENTLY` and accept a plain `CREATE INDEX`, which is
   Studio-runnable but takes `ACCESS EXCLUSIVE` for the build. Decide which **before** starting Plan
   B, not at 2am with steps 1–4 already committed. If `CONCURRENTLY` is used and fails, it can leave
   an **invalid** index — check `pg_index.indisvalid` and `DROP`/recreate if false.
7. It is **five statements a human applies by hand**, in order, with no transaction tying them
   together, against a project whose standing rule is hand-applied Studio SQL with no staging
   buffer. A half-applied Plan B leaves a nullable, partially-populated column.

**If you use Plan B, GUARD 1 still applies.** Run S4-P4a/S4-P4b first and adjudicate exactly as
above — the ambiguity it refuses is a property of the data, not of the migration's shape.

---

## 4 · RISK REGISTER — this migration alone

Scoped to Step 0a. It deliberately does **not** restate the R1–R15 register in
[`SESSION-1-DB-RLS-FINDINGS.md`](SESSION-1-DB-RLS-FINDINGS.md) §6.2, which covers the *later* waves.

| # | Risk | Likelihood | Blast radius | Detection |
|---|---|---|---|---|
| **S4-R1** | 🔴 **The column already exists on the live target, added out-of-band.** History is forked and this project has applied DDL to PROD outside the repo (`20260825141426_lead_notes.sql:3-10`). | **LOW but unmeasured** | A second grouping column beside an existing one, with unknown type, nullability and contents. Worst available outcome. | **S4-P2** before pasting. Backstop: the bare `ADD COLUMN` (not `IF NOT EXISTS`) fails loudly at `42701`. |
| **S4-R2** | 🔴 **GUARD 1 aborts on PROD and the migration will not apply.** | **UNMEASURED.** DEV = 0 offending groups; PROD has never been counted. | None — nothing is applied. The real danger is a person editing the guard out at a keyboard under time pressure. | **S4-P4a** before pasting, so it is never a surprise. If it fires, **S4-P4b** produces the adjudication list. **Do not edit the guard.** |
| **S4-R3** | 🟠 **The `ACCESS EXCLUSIVE` rewrite stalls booking reads.** A volatile default forces a full table rewrite. | LOW as designed; MEDIUM if applied in business hours | Every `calendar_bookings` read and write blocks for the lock's duration. | **S4-P3** sizes it first. `lock_timeout = '3s'` makes it fail fast rather than form a queue; `statement_timeout = '60s'` bounds the rewrite. Either aborts the whole transaction cleanly. Apply outside working hours. |
| **S4-R4** | 🟠 **Column-level grants make the new column unwritable.** A new column inherits *table*-level grants only. | LOW (DEV is table-level); unmeasured on PROD | `42501 permission denied for column` on every write naming it. **Latent** — nothing names the column until Step 2, so it would surface months later, in the field. | **S4-P9b.** ANY row (a non-NULL `attacl` on any column) ⇒ STOP and add an explicit `GRANT` for the new column first. Zero rows is expected and healthy. **Do NOT substitute `information_schema.column_privileges`** — it unions table-level ACLs and guarantees a false STOP. See §S4-P9b. |
| **S4-R5** | 🟡 **The live `booking_status` enum lacks `'cancelled'` or `'rescheduled'`.** Repo and live have demonstrably drifted — `set_reminder_scheduled_for()` references `'no_show'`, which the repo enum does not define. | LOW | GUARD 1 fails at parse time with `invalid input value for enum booking_status`. Loud, harmless, nothing applied. | **S4-P5.** |
| **S4-R6** | 🟡 **Stale generated types hide a later mistake.** `src/integrations/supabase/types.ts` will not know the column until regenerated — and `npm run build` runs `tsc --noEmit` against a root `tsconfig.json` with `"files": []` and no `"include"`, so it type-checks **zero files**. | Certain (the staleness); the *mistake* is Step 2's risk | A wrong reference to `booking_group_id` would pass lint, pass the build, pass CI, and fail only at runtime. | **No automatic detection exists.** Regenerate `types.ts` as its own commit before any code names the column. Treat a green build as proof of nothing. |
| **S4-R7** | 🟡 **GUARD 2 passes vacuously on an empty table.** `0 = 0`. | Certain on an empty database | None — an empty table has no groups to get wrong. | Recorded so the guard is not mistaken for coverage it does not provide. Verification **A2** shows the row count alongside the distinct count. |
| **S4-R8** | 🟡 **Re-seeding puts modelled multi-technician bookings in separate groups.** `seed_technician_dashboard.sql` and `seed_50_inspection_waiting_leads.sql` use explicit column lists that omit the column. | Certain whenever DEV is reseeded | DEV only. Correct today (one row = one occurrence); wrong once a seed file models a two-technician booking. | Run verification **A7** on DEV after any reseed: every `rows_in_group` must be 1. |
| **S4-R11** | 🟠 **GUARD 1 cannot see NEAR-MISS duplicates.** It groups on exact `start_datetime` and raw `event_type`, so two rows that are really one occurrence but differ by a minute, or by case/whitespace in `event_type`, pass through and are split into two groups. | **UNMEASURED.** Plausible on PROD, whose oldest rows predate every current code path. | That customer receives **two reminder emails** once Step 0b ships — the R1 incident, without fan-out. | **S4-P4d**, and only S4-P4d. There is no automatic backstop: the guard is deliberately not loosened, because a fuzzy abort predicate would false-abort on legitimately distinct bookings. Fix the data before applying; do not change the guard. |
| **S4-R12** | 🟡 **The guards' success messages are invisible in Studio.** Both announce via `RAISE NOTICE`, which the Studio SQL editor does not render. A clean apply shows only "Success. No rows returned." | Certain, on every apply | An operator cannot distinguish "both guards passed" from "a guard was edited out". | Verification **A2** and **A6** are the operator-visible restatements of GUARD 2 and GUARD 1. Running them is not optional — see §2. |
| **S4-R9** | ⚪ **The rollback becomes destructive after Step 2.** A rollback block in a migration header invites reuse. | MEDIUM — it reads as evergreen | Irrecoverable loss of which rows form one booking. The natural key cannot rebuild it — that ambiguity is exactly what GUARD 1 refuses. | The migration header states the expiry in place. Nothing enforces it. |

### S4-R10 · What happens to SESSION 5's Edge Function if a booking is created with a NULL `booking_group_id`

**It cannot happen. The likelihood is ZERO by construction, and that is the point of the design.**

The column is `NOT NULL DEFAULT gen_random_uuid()`:

- A writer that **omits** the column gets a fresh group id from the default. All five writers that
  exist today omit it. None changes.
- A writer that **explicitly passes `null`** is refused by the database with
  `23502 not_null_violation` — **at the insert, loudly, with a stack trace**, not silently, and not
  months later.

There is no third path. That is precisely why the column is `NOT NULL` in this migration rather than
a later one, and why the default is permanent.

**What the failure would have looked like under the rejected nullable design**, recorded so nobody
"simplifies" the constraint away later:

1. A booking row is created with `booking_group_id IS NULL`.
2. The EF runs its group claim: `UPDATE ... WHERE booking_group_id = $1 AND reminder_sent = false`.
   With `$1` NULL, `NULL = NULL` evaluates to NULL, never true. **The statement claims ZERO rows.**
3. The EF sees a zero-row result. Under the existing compare-and-swap idiom that means *"a
   concurrent invocation already claimed this"* — so it **skips the send**. The customer's reminder
   is never sent. No error, no log line, no failed request, nothing to grep for. It looks exactly
   like correct de-duplication.
4. The plausible "fix" is worse. Someone reaches for `IS NOT DISTINCT FROM` to make NULL match, and
   a single invocation then claims **every NULL-group booking in the database at once**, marking
   them all reminded and suppressing all of their reminders permanently.
5. A `GROUP BY booking_group_id` — the R1 duplicate detector, the R14 dashboard de-dupe — lumps
   every NULL row into **one** bucket, silently merging unrelated bookings into a single fake group.

Every step of that is silent. `NOT NULL` deletes the whole branch.

**Detection, if the constraint is ever relaxed:**

```sql
-- Must always return 0. With NOT NULL in place this is a tautology — which is the point.
SELECT count(*) AS null_group_bookings
FROM public.calendar_bookings
WHERE booking_group_id IS NULL;
```

**The risk that remains, relocated.** Once Step 2 ships, the live failure mode is no longer NULL but
*two rows of one occurrence carrying two different group ids* — the fan-out writer forgetting to
share the value. That degrades to exactly today's per-row behaviour (two reminder emails for a
two-technician booking) rather than to silence, which is the strictly better failure to have. It is
caught by verification **A7** and by SESSION 1's R1 detector:

```sql
SELECT booking_group_id, count(*) FILTER (WHERE reminder_sent) AS reminded_rows
FROM public.calendar_bookings
GROUP BY booking_group_id
HAVING count(*) FILTER (WHERE reminder_sent) > 1;
```

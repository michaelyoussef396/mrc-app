# STEP 4 — PROD PRE-FLIGHT GATE PACK · `calendar_bookings.booking_group_id` (Step 0a)

**Target: PROD `ecyivrxjpsmjmexqatym` — LIVE. mrcsystem.com. Real customer path. 101+ leads.**

**Written:** 2026-08-30 · **Gates:** `supabase/migrations/20260828120000_add_booking_group_id.sql` (blob `6d4cb51db8c0251098307fc4b7fcc94fa9b4356b`) · **Template:** `SESSION-4-PROD-PREFLIGHT.md` gates S4-P1…S4-P11, as amended by the DEV run recorded in `DEPLOY-LOG.md`.

> **NOTHING IN THIS DOCUMENT WRITES.** Every block is a read-only `SELECT` except **PP17**, which is a read-only CLI call run in a terminal. The pack is safe to run in full, at any hour, in any order, by someone tired. The apply itself is **not** in here — it is the migration file, and it is a separate, gated step.
>
> **No agent ran any of this.** No database was contacted while writing it. Every PROD value below is `UNKNOWN — MUST CAPTURE`.

---

## 0 · How to run this

An agent on this machine has **no CLI route to any Supabase database** (`db query` has no `--project-ref`; the Bash guard rejects every `supabase` command that lacks one; the MCP is pinned to PROD with a dead token). **Michael runs every block in the Supabase Studio SQL editor and pastes the output back.**

**Studio shows only the LAST result set of a multi-statement run.** Every block below is runnable on its own and must be pasted on its own.

### Before the first query — the confirmation ritual (CLAUDE.md)

Say it out loud, in plain English, and get an explicit yes:

> *"I am about to run read-only pre-flight queries against **`ecyivrxjpsmjmexqatym`**, which is **PRODUCTION — the live mrcsystem.com database carrying real customer data**. Not the DEV sandbox `ctppzqnysmzynkxjlzta`."*

Then read the ref out of the Studio address bar (`/dashboard/project/<ref>/sql`) and confirm it is `ecyivrxjpsmjmexqatym` **before** pasting PP1. PP1 confirms it a second way.

### Paste-back discipline

Paste results back **verbatim — headers and rows**. Gates are decided on the numbers, not on "looked fine". A block you skipped is not a pass.

---

## 0.1 · WHAT DEV PROVED, AND WHAT IT DID NOT

0a **is applied and verified on DEV** (2026-08-30: A1…A8 all pass; 3 bookings, 3 groups, fingerprint unchanged, 10 indexes, 0 audit rows). That run proved the migration's **design** — most importantly GUARD 2's assumption that a volatile `DEFAULT` is evaluated **per row**, which is now demonstrated on a real PostgreSQL instance rather than merely documented.

**It proved nothing about PROD's data.** DEV carries 3 leads and 3 bookings. PROD carries 101+ leads and has never been measured on any of these questions. The migration history is forked (16 shared / 104 local-only / 102 remote-only) and this project has demonstrably applied DDL to PROD out-of-band (`20260825141426_lead_notes.sql:3-10`), so even the *structural* facts are re-asked here rather than assumed — DEV's own run already caught one live/repo divergence (D16: the live `set_reminder_scheduled_for()` body has no `no_show` branch, unlike the repo migration).

### Every count-derived DEV number is UNKNOWN on PROD

| DEV, captured 2026-08-30 | Kind | PROD | What gates on the PROD value |
|---|---|---|---|
| D3 / **B1** = **3 bookings** | count | **UNKNOWN — MUST CAPTURE** | **PP3.** Decides *apply-as-written vs Plan B*. Also the denominator of A2 and A7. |
| D3 size = 200 kB total / 16 kB heap / 144 kB idx | count | **UNKNOWN — MUST CAPTURE** | **PP3.** The lock-window estimate. |
| D4 = `rows_in_group 1 × 2 groups` | count | **UNKNOWN — MUST CAPTURE** | **PP6a. The gate most likely to fire on PROD.** Any group > 1 ⇒ GUARD 1 aborts the migration. |
| D4c (voided-inclusive) = `1 × 3` | count | **UNKNOWN — MUST CAPTURE** | Nothing. Explains a PP6a/unfiltered discrepancy. |
| D4d near-miss = **0 rows** | count | **UNKNOWN — MUST CAPTURE** | **PP6d.** Human gate, no automatic backstop (S4-R11). Far more plausible on PROD, whose oldest rows predate every current code path. |
| D7 / **B4** = **9 indexes** | count + list | **UNKNOWN — MUST CAPTURE** | **PP9.** A3 is *your* count + 1. **Do not carry "10" over from DEV.** |
| D10a = 0 orphans / 3 total | count | **UNKNOWN — MUST CAPTURE** | Informational. A large orphan count is its own ticket, not a 0a gate. |
| D10b reminder state (2 scheduled-unsent, 1 cancelled-unsent) | count | **UNKNOWN — MUST CAPTURE** | **PP12b.** The BEFORE evidence for Step 0b's "byte-identical in effect" claim. |
| D10c / **B7** = **0** | count | **UNKNOWN — MUST CAPTURE** | **PP12c.** A5 is an identity against it. |
| D12 / **B5** t0 `2026-08-30 19:30:00+10`, fingerprint `e92d84bdba558ccf08fa97828f26d217` | count | **UNKNOWN — MUST CAPTURE, and must be re-taken on PROD** | **B0/B5 → A4.** DEV's fingerprint and DEV's t0 are **meaningless on PROD**. Never compare a fingerprint across databases. |
| D13 pending_sendable_now = 2 | count | **UNKNOWN** | Step 0b, not 0a. Runs at 0b time from the SESSION-5 runbook (P-E1/P-E2). Not in this pack. |
| D14 `is_owner = true` | structural | **RE-ASK — PP4** | Whether `ALTER TABLE` is permitted at all. |
| D15 `pgrst_ddl_watch` present, `'O'` | structural | **RE-ASK — PP5** | What else fires on DDL. |
| D2 / **B3** column absent | structural | **RE-ASK — PP2** | **STOP gate (S4-R1).** Forked history is exactly why this is re-asked. |
| D5 enum = `scheduled, in_progress, completed, cancelled, rescheduled` (**no** `no_show`) | structural | **RE-ASK — PP7** | GUARD 1's literals parse *and* which statuses count as live occurrences. |
| D6 exactly 2 triggers | structural | **RE-ASK — PP8** | The "no trigger fires / zero audit rows / `updated_at` untouched" claims. |
| D8 one policy (SF-1) | structural | **RE-ASK — PP10** | That no policy change is needed. HANDOFF P0's reasoning. |
| D9a `anon` holds `arwdDxtm` (SF-3) | structural | **RE-ASK — PP11a** | Nothing in 0a. Records SF-3 on PROD. |
| D9b 0 column ACLs | structural | **RE-ASK — PP11b** | **STOP gate (S4-R4).** The one way the new column can be unwritable. |
| D11 cron | behavioural | **DIFFERENT BY CONSTRUCTION** | **PP13.** DEV's table has *no* scheduled writer; PROD's has **two callers**. See PP13. |

**The rule this table encodes:** structural facts transfer to PROD as *expectations to be confirmed*, never as *evidence already in hand*.

---

## 1 · THE GATE TABLE

| ID | = S4 / B | What it asks | ⛔? |
|---|---|---|---|
| **PP1** | S4-P1 | Which database am I actually on? | ⛔ |
| **PP2** | S4-P2 = B3 | Does `booking_group_id` already exist? | ⛔ |
| **PP3** | S4-P3 = B1 | How many rows, how big? → NOT NULL now vs Plan B | ⛔ |
| **PP4** | (D14) | Can this session actually `ALTER` the table? | ⛔ |
| **PP5** | (D15) | What event triggers fire on DDL? | ⛔ if unknown ones |
| **PP6a** | S4-P4a | Does any natural group hold > 1 live row? | ⛔ **most likely to fire** |
| **PP6b** | S4-P4b = B2 | The offending groups, for adjudication | ⛔ |
| **PP6c** | S4-P4c | Voided-inclusive count | — |
| **PP6d** | S4-P4d | Near-miss pairs GUARD 1 cannot see | human gate |
| **PP6e** | new | Has any such group **already** double-sent? | evidence |
| **PP7** | S4-P5 | Live `booking_status` labels | ⛔ |
| **PP8** | S4-P6 | Triggers on `calendar_bookings` | ⛔ |
| **PP9** | S4-P7 = B4 | Indexes: name collision + count | ⛔ |
| **PP10** | S4-P8 | RLS posture | — |
| **PP11a** | S4-P9a | Table-level grants | — |
| **PP11b** | S4-P9b | **Column-level** ACLs | ⛔ |
| **PP12a** | S4-P10a = B6 | Orphan bookings | — |
| **PP12b** | S4-P10b | Reminder-state baseline (0b's BEFORE) | — |
| **PP12c** | S4-P10c = B7 | audit_logs baseline, scoped | — |
| **PP13** | S4-P11 | The hourly cron — and the *second* caller | ⛔ timing |
| **PP14** | — | HANDOFF **P0** RLS re-harvest (gates **Step 1**, not 0a) | capture now |
| **PP17** | — | SF-5: `functions list` baselines (terminal) | informational |
| **PP18** | — | Vault claims query: **DEV, not PROD** | do not run here |

Blocks marked `= Bn` are the same query as the migration's BEFORE check. Run once; record under both IDs. **§2 restates B0…B7 as one uncommented capture sheet** — the migration file keeps them inside `--` comments, so they are not runnable as shipped.

---

## PP1 · Identity — S4-P1 ⛔

```sql
SELECT current_database(),
       current_user,
       inet_server_addr(),
       version(),
       (SELECT count(*) FROM public.leads)             AS leads_rows,
       (SELECT count(*) FROM public.calendar_bookings) AS booking_rows;
```

**PROD expects:** `leads_rows` **101 or more**. `booking_rows` UNKNOWN. DEV showed `leads_rows = 3` / `booking_rows = 3` on PG 17.6.

**⛔ STOP if:** `leads_rows` is 3, or single-digit, or anything that looks like the sandbox — **you are on DEV and must not proceed**. Also STOP if you cannot tell: re-check the Studio project selector rather than guessing. Record `inet_server_addr()` and the PG major version; both are needed later (the PG version governs the `extract(epoch …)` note in B5).

---

## PP2 · The column must not already exist — S4-P2 = B3 ⛔

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'calendar_bookings'
  AND column_name IN ('booking_group_id', 'group_id', 'booking_group');
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV returned 0 rows.

**⛔ STOP on ANY row.** This is S4-R1 and it is not paranoia: the history is forked and this project has applied DDL to PROD outside the repo before. A `booking_group_id` that exists on PROD but not in this repo has unknown type, unknown nullability and unknown population; creating a second grouping column beside it is the worst outcome available.

The migration's backstop is real — DEV proved it. The 2026-08-30 DEV re-paste failed loudly at **`42701 column already exists`** and rolled back cleanly, because the migration uses a bare `ADD COLUMN`, not `IF NOT EXISTS`. That backstop works; this gate exists so you learn the answer *before* pasting, not during.

---

## PP3 · Table size — S4-P3 = B1 ⛔ **decides apply-as-written vs Plan B**

```sql
SELECT count(*) AS calendar_bookings_rows FROM public.calendar_bookings;
```

```sql
SELECT pg_size_pretty(pg_total_relation_size('public.calendar_bookings')) AS total_size,
       pg_size_pretty(pg_relation_size('public.calendar_bookings'))       AS heap_size,
       pg_size_pretty(pg_indexes_size('public.calendar_bookings'))        AS indexes_size;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: 3 rows / 200 kB total / 16 kB heap / 144 kB indexes.

**Why this number decides everything.** The column is added `NOT NULL DEFAULT gen_random_uuid()`. `gen_random_uuid()` is **volatile**, so Postgres cannot use the PG11+ catalog-only fast path: it performs a **full table rewrite under `ACCESS EXCLUSIVE`**, evaluating the default once per row. That is what makes the column born-populated with no NULL window — and it is the entire cost of the design.

### The thresholds

| `calendar_bookings_rows` | `heap_size` | Decision |
|---|---|---|
| **< 10,000** | < 50 MB | **Apply as written.** This is the expected PROD case. |
| **10,000 – 499,999** | < 1 GB | **Apply as written**, outside working hours, and budget seconds rather than milliseconds. |
| **≥ 500,000** | **or ≥ 1 GB** | **DO NOT APPLY AS WRITTEN.** Switch to Plan B (`SESSION-4-PROD-PREFLIGHT.md` §3) and get explicit sign-off on the extra risk it carries — Plan B rewrites `updated_at` on every row, spams every logged-in technician's phone via Realtime, and its step 5 has no Studio route at all. |

### The lock window, in plain English

**For as long as the transaction runs, every read and every write of `calendar_bookings` anywhere in the system waits in line:** the technician calendar, the booking form, `LeadDetail`, the reminder Edge Function, the travel-time Edge Function, the export function. Nothing errors — they queue.

At the row counts this business plausibly has (a Melbourne mould business with 101+ leads has hundreds of bookings, not millions), **that wait is a fraction of a second and no human notices it.** The guaranteed ceiling is different from the expected cost: the transaction takes `ACCESS EXCLUSIVE` up front and then runs four heavy statements under it — GUARD 1's scan, the `ALTER` rewrite, `CREATE INDEX`, and GUARD 2's `count(DISTINCT …)` scan — each bounded by `statement_timeout = '60s'`, which is **per statement, not per transaction**. **So the honest worst case to plan the window around is roughly 4 × 60 s ≈ four minutes, not sixty seconds.** `lock_timeout = '3s'` means the migration fails fast rather than forming a queue behind someone else's long transaction. Either timeout aborts the whole transaction cleanly and leaves the table byte-identical to before: **a failed apply is safe; a queued lock is not.**

---

## PP4 · Ownership — can this session `ALTER` the table at all? ⛔

```sql
SELECT c.relname                                       AS table_name,
       pg_get_userbyid(c.relowner)                     AS table_owner,
       current_user                                    AS running_as,
       pg_has_role(current_user, c.relowner, 'USAGE')  AS is_owner,
       has_table_privilege(current_user, c.oid, 'UPDATE')   AS has_update,
       has_table_privilege(current_user, c.oid, 'TRUNCATE') AS has_truncate
FROM pg_class c
WHERE c.oid = 'public.calendar_bookings'::regclass;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: `is_owner = true`, running as `postgres`.

**⛔ STOP if `is_owner` is false.** `ALTER TABLE … ADD COLUMN` and `CREATE INDEX` both require ownership (or membership in the owning role). If PROD's `calendar_bookings` is owned by a role the Studio session is not a member of — plausible on a forked project where DDL has been applied out-of-band by different tooling — the migration fails at `42501` **mid-transaction**. That failure is safe (the whole transaction rolls back) but it is an avoidable 2 a.m. surprise, and it means the apply needs a different connection, which has to be arranged *before* the window, not during it.

`has_update` / `has_truncate` are captured because they are what `LOCK TABLE … IN ACCESS EXCLUSIVE MODE` in SECTION 0 needs. If `is_owner` is true these are almost certainly true too; record them anyway.

---

## PP5 · Event triggers — what else fires on DDL ⛔ if unrecognised

```sql
SELECT et.evtname,
       et.evtevent,
       et.evtenabled,
       et.evttags,
       pg_get_userbyid(et.evtowner) AS owner,
       p.proname                    AS function_name
FROM pg_event_trigger et
JOIN pg_proc p ON p.oid = et.evtfoid
ORDER BY et.evtname;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV recorded `pgrst_ddl_watch`, enabled `'O'`. A `pgrst_drop_watch` sibling is a normal Supabase pairing and is not a finding.

**What `pgrst_ddl_watch` does and why you want it:** it fires on DDL and tells PostgREST to reload its schema cache, so the new column becomes visible to the API almost immediately. That is expected and is the mechanism behind the one observable change the migration admits to — **one extra field** in the shape returned to three `SELECT *`-style consumers (`export-inspection-context/index.ts:94`, `src/pages/LeadDetail.tsx:320`, and the Realtime payload to `src/hooks/useTechnicianJobs.ts:356-395`). None of the three reads the field; no row count, ordering or filter result changes anywhere.

**⛔ STOP and paste for reading if PROD carries any event trigger other than the `pgrst_*` pair.** An event trigger fires *inside your transaction* on `ALTER TABLE` and can do arbitrary work — including writes you did not budget for and did not lock against.

---

## PP6 · Natural-group ambiguity — S4-P4 ⛔ **THE GATE MOST LIKELY TO FIRE**

DEV had 3 bookings and 2 live groups. **PROD has 101+ leads and years of hand-entered history.** Treat a clean result here as the surprise, not the default.

### PP6a — the shape ⛔

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

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: one row, `rows_in_group = 1`, `number_of_groups = 2`.

**⛔ Every row must show `rows_in_group = 1`. Any `> 1` ⇒ GUARD 1 will abort the migration.** That is the guard working, not failing. Run PP6b and adjudicate before deciding anything.

**Arithmetic cross-check (no extra query).** If every group holds one row, then
`B1 − number_of_groups = (orphan rows, PP12a) + (voided non-orphan rows, PP12b)`.
On DEV: `3 − 2 = 1` = 0 orphans + 1 cancelled. ✅ Do this subtraction on PROD; if it does not balance, one of the three captures is wrong or was taken at a different moment.

**Do not carry `number_of_groups` forward into A7.** A7's `number_of_groups` counts *every* row — orphans and cancelled rows included, because each gets its own `gen_random_uuid()` — so A7's number is **B1**, not PP6a's number. On DEV those were 3 and 2 respectively. This is a real trap; write both down separately.

### PP6b — the offending groups — = B2 ⛔

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

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: 0 rows.

### Adjudication — the questions to ask **per offending-group shape**

A migration must not decide any of these. Work through the shapes in order; the shape is read off `technicians`, `statuses` and the `created_at` spread.

**Shape A — two rows, two *different* `technicians`, both live statuses, `created_at` close together.**
This is a de-facto two-technician booking, created by hand before the feature existed.
- Is this Glen and Clayton on the same job — confirm with them by lead, not by inference?
- Is this booking **in the future**? If yes, the customer is scheduled to receive **two reminder emails** for it (see PP6e for whether it has already happened).
- Do both rows carry the same `start_datetime` *and* the same end time, or is one a partial-day attendance?
- **Decision:** these two rows should share one group id. **The migration cannot give them one** — GUARD 1 aborts precisely because it will not guess. Options, in order of preference: **(1)** if one row is redundant, cancel it; **(2)** defer 0a until Step 2's fan-out design covers pre-existing pairs, and record this group as the reason; **(3)** a documented, signed-off, one-off data correction *before* the apply. Option 3 is a **write to a live customer table** and does not belong in a pre-flight pack — it belongs in a deploy runbook with its own gates and its own rollback.

**Shape B — two rows, the *same* technician twice, both live.**
A duplicate booking, i.e. a data bug.
- Which of the two `booking_ids` is the one the field actually worked — check `created_at`, and check whether either has an `inspection_id` or a job completion hanging off it?
- Has either already sent a reminder (PP6e)?
- **Decision:** it should almost certainly be cancelled or deleted, not grouped. This is the one shape with a clean answer — but it is still a write, and still needs sign-off.

**Shape C — two rows, `created_at` far apart (days or weeks).**
A re-book where the original was never cancelled.
- Why did the original survive? Is `status` on the older row still `scheduled`?
- Does the customer expect the old slot or the new one?
- **Decision:** the stale row should carry `cancelled` or `rescheduled` — which is also what makes GUARD 1 stop seeing it, because the guard excludes both. Note that this exact pattern is a **pre-existing** duplicate-email source under today's code, independent of 0a and 0b; do not let 0b be blamed for it later.

**Shape D — `statuses` contains a label DEV never had (e.g. `no_show`, or anything not in PP7's list).**
DEV's enum had no `no_show`; PROD's may. GUARD 1 excludes **only** `'cancelled'` and `'rescheduled'`, so a `no_show` row counts as a live occurrence and can collide with a re-booking of the same slot.
- Is `no_show` semantically a voided occurrence in this business, or a real attended-but-absent record?
- **Decision:** if it is genuinely voided, the correct change is to GUARD 1's exclusion list — which is **a migration edit needing review and a fresh DEV run**, not a keyboard change at 2 a.m. Do not widen the list under time pressure.

**In every shape: do not edit GUARD 1 to get past this.** Fix the data, or come back with a decision. If two rows that are really one booking end up in two different groups, Step 0b's group-scoped claim treats them as two bookings and sends the customer **two identical reminder emails** — the R1 incident, arriving *before* fan-out has shipped anything. Emails are irreversible.

### PP6c — voided-inclusive count (informational, no gate)

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

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: `1 × 3`.

If PP6c shows collisions and PP6a does not, the collisions involve a **voided** row — a cancel-then-rebook of the same slot, or a `'rescheduled'` **tombstone** left at the original `start_datetime` when a booking was moved (`src/hooks/useTechnicianJobs.ts:248-249`) and the freed slot was later refilled. Those are benign and the guard is right to ignore them. Capture it so nobody later reads SESSION 1's unfiltered P5 number — which excludes nothing — and concludes the guard is broken. **Expect PP6a, PP6c and SESSION 1's P5 to differ from each other; that is not a discrepancy.**

### PP6d — near-miss pairs GUARD 1 cannot see (human gate, no automatic backstop)

```sql
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

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: 0 rows (confirmed).

**A clean PP6a is narrower evidence than it looks.** GUARD 1 groups on *exact* equality: `start_datetime` at full microsecond precision and `event_type` as a raw case- and whitespace-sensitive `VARCHAR(50)`. Two rows a human would call one occurrence — booked a minute apart, one with seconds set and one zeroed, `'inspection'` beside `'Inspection'` — land in different buckets and the guard correctly reports nothing.

**This gates nothing automatically, and GUARD 1 is deliberately NOT loosened to match it** — a fuzzy abort predicate would false-abort on legitimately distinct bookings and no threshold is right for every case. This is a **person's** job. If it returns rows, run them through the same PP6b shape questions. A near-miss pair that really is one occurrence gets split into two groups by this migration, and Step 0b's group claim then sends that customer two reminder emails. **Fix the data before applying; do not change the guard.**

### PP6e — has any such group *already* double-sent? (evidence for the adjudication)

```sql
SELECT lead_id,
       event_type,
       start_datetime,
       count(*)                               AS rows_in_group,
       count(*) FILTER (WHERE reminder_sent)  AS rows_already_reminded
FROM public.calendar_bookings
WHERE lead_id IS NOT NULL
  AND (status IS NULL OR status NOT IN ('cancelled', 'rescheduled'))
GROUP BY lead_id, event_type, start_datetime
HAVING count(*) FILTER (WHERE reminder_sent) > 1;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`.

This is SESSION 1's R1 duplicate detector in its **pre-0a** form (keyed on the natural group, since `booking_group_id` does not exist yet). No gate. Its purpose is to tell you, during a PP6b adjudication, whether the pair you are looking at has **already sent that customer two reminders under today's code** — which changes the conversation from "will we cause an incident" to "we have been having one, undetected". Any row here is a finding worth its own ticket regardless of what happens to 0a.

---

## PP7 · Live `booking_status` labels — S4-P5 ⛔

First establish what `status` actually is:

```sql
SELECT data_type, udt_schema, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'calendar_bookings'
  AND column_name = 'status';
```

Expect `USER-DEFINED` / `public` / `booking_status` / `YES` / `'scheduled'::booking_status`. **If `udt_name` is something other than `booking_status`, substitute it into the next query.**

```sql
SELECT t.typname, e.enumlabel, e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'booking_status'
ORDER BY e.enumsortorder;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: `scheduled, in_progress, completed, cancelled, rescheduled` — **no `no_show`**. Repo says the same five (`20251028135212_…sql:85-91`).

**⛔ STOP if either `'cancelled'` or `'rescheduled'` is missing.** GUARD 1 would fail at parse time with `invalid input value for enum booking_status`. That failure is loud and harmless — nothing applies — but it should never be a surprise at the keyboard.

**PROD-specific reading, and this is the part DEV could not test:**

- **Extra labels are not a STOP, but they change PP6's meaning.** GUARD 1 excludes *only* `'cancelled'` and `'rescheduled'`. Any additional live label on PROD — `no_show` being the obvious candidate — counts as a real occurrence and can make GUARD 1 abort on a slot that a human would consider free. If PP7 shows labels DEV lacked, re-read PP6b's `statuses` arrays with Shape D in mind before concluding the guard is wrong.
- **`'completed'` is deliberately NOT excluded.** A completed row is an occurrence that really happened; two of them in one slot deserve a person's attention.
- **The drift is documented and real.** `set_reminder_scheduled_for()` in the repo tests `NEW.status IN ('cancelled', 'completed', 'no_show')` (`20260218000001_add_reminder_scheduled_for.sql:18`) — and DEV's D16 found the **live** function body has no `no_show` branch at all. Repo and live have demonstrably diverged on exactly this type. Read the live catalog; do not read the migration files.
- **Zero rows** means `status` is not an enum on this database (probably `text`). The guard's comparison still works. Record it and move on.

---

## PP8 · Triggers on `calendar_bookings` — S4-P6 ⛔

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

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: exactly two.

| Trigger | Definition | Why it matters here |
|---|---|---|
| `update_calendar_bookings_updated_at` | `BEFORE UPDATE … FOR EACH ROW`, **no column list** (`20251111000016:578-590`), body `NEW.updated_at = NOW()` | Any `UPDATE`-based backfill would rewrite `updated_at` on **100 % of rows**. The migration uses an `ALTER` instead, and **`ALTER TABLE` rewrites fire no row triggers** — that is the whole basis of the B5/A4 identity. |
| `trigger_set_reminder_scheduled_for` | `BEFORE INSERT OR UPDATE OF start_datetime, status` (`20260218000001:34-37`) | Column-scoped, so it would not have fired on a `booking_group_id` write either. Listed so a reviewer need not go and check. |

**⛔ STOP rules, PROD-specific:**

- **More than two triggers ⇒ read every extra one before applying, and paste it.**
- **Anything named `audit`, or any `AFTER INSERT`/`AFTER UPDATE` trigger, is an immediate STOP.** If PROD carries an audit trigger on `calendar_bookings`, verification **A5's "zero audit rows" claim is void** and the migration's stated blast radius is wrong. `CLAUDE.md` fixes the audit foundation at 29 triggers across 10 tables and `calendar_bookings` is **not** one of them — but the repo has been wrong about live triggers before, and PROD is where that would show up.
- **Read `tgenabled` on each.** `'O'` is normal (origin). `'D'` means the trigger is **disabled** — if `update_calendar_bookings_updated_at` is disabled on PROD, the A4 fingerprint identity becomes weaker evidence than it is on DEV (it would hold for a second reason), so say so in the record rather than claiming a proof you did not get. `'A'`/`'R'` (replica) are unexpected here and warrant a read.
- Any `AFTER INSERT` trigger is also context Step 0b needs.

---

## PP9 · Indexes — S4-P7 = B4 ⛔

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
ORDER BY indexname;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. Record **the full list AND the count**. DEV: 9 (pkey, inspection_id, lead_start, reminder_pending, start_time, tech_date_status, tech_end_time, technician_id, technician_time), all 9 traceable to repo migrations.

**⛔ STOP if `idx_calendar_bookings_booking_group_id` is already present.** The migration's bare `CREATE INDEX` fails at `42P07`.

**PROD-specific notes:**

- **A3's expectation is *your* count + 1, with nothing removed.** DEV's AFTER count was 10 because DEV's BEFORE count was 9. **Do not carry "10" to PROD.** Write down PROD's number now; A3 is meaningless without it.
- An index on PROD that this repo cannot account for is a **forked-history finding** in its own right. Not a STOP for 0a — record it and raise it separately.
- A large `indexes_size` from PP3 means the in-transaction `CREATE INDEX` contributes more to the lock window; fold that into the PP3 banding.

---

## PP10 · RLS posture — S4-P8

```sql
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
ORDER BY policyname;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV showed exactly one (SF-1): `authenticated_full_access_bookings`, `cmd = ALL`, `roles = {public}`, `qual` and `with_check` both `((SELECT auth.uid()) IS NOT NULL)`.

**No gate.** The migration makes no policy change and needs none — a column added to an existing table is covered by that table's existing policies. This query confirms PROD agrees with DEV *before* that reasoning is relied on, per HANDOFF P0.

**Capture it anyway, because it is not this workstream's business but it is somebody's:** if PROD matches DEV, **every authenticated user can read and write every booking row, including other technicians'.** That is standing finding **SF-1**. It needs its own ticket. It is explicitly not fixed here. And it should change how anyone reads the fifteen `.eq('assigned_to', …)` filters in `src/` — those are UX scoping, not a security boundary.

---

## PP11 · Grants — S4-P9

### PP11a — table-level (informational)

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'calendar_bookings'
ORDER BY grantee, privilege_type;
```

```sql
SELECT c.relacl AS table_acl
FROM pg_class c
WHERE c.oid = 'public.calendar_bookings'::regclass;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: `anon`, `authenticated`, `postgres`, `service_role` all holding `arwdDxtm` — logged as **SF-3**.

No gate. **Record whether SF-3 reproduces on PROD:** `anon` holding SELECT/INSERT/UPDATE/DELETE on the live bookings table means RLS (enabled, **not forced**, single `auth.uid() IS NOT NULL` policy) is the sole control, and `anon` is denied only because `auth.uid()` is NULL. It materialises the moment RLS is disabled on the table or a permissive `anon` policy is added. Its own ticket, not this one.

### PP11b — column-level ACLs ⛔ **the one way the new column can be unwritable**

⚠️ **Do NOT use `information_schema.column_privileges`.** That view unions column-level ACLs *with* table-level ACLs expanded one row per column, so on a normal Supabase table it returns rows for `anon`, `authenticated` and `service_role` whether or not a single column-level grant exists. It cannot distinguish the failure mode this gate is for, and reading it literally produces a **guaranteed false STOP**.

Read the column ACLs directly. `pg_attribute.attacl` is NULL unless a genuine column-level `GRANT` has been issued:

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

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: 0 rows.

**⛔ ANY row ⇒ STOP.** Do not apply. Add an explicit `GRANT` for `booking_group_id` first, as a reviewed change to the migration.

**Why this one is worth a gate to itself (S4-R4).** The migration adds no `GRANT`, on the reasoning that a new column inherits the *table's* grants — `pg_default_acl` only auto-grants on new **tables and functions**. That reasoning has exactly one failure mode: if `calendar_bookings` is granted per-column rather than per-table, a newly added column receives **no privilege at all**, and every `INSERT`/`UPDATE` naming `booking_group_id` fails with `42501 permission denied for column`. **The failure is latent:** nothing names the column until Step 2's fan-out writer, so on PROD it would surface **months later, in the field, on a real booking.** Zero rows is the expected and healthy answer.

---

## PP12 · Baselines — S4-P10 (no gates, but the AFTER checks need them)

### PP12a — orphan bookings = B6

```sql
SELECT count(*) FILTER (WHERE lead_id IS NULL) AS bookings_with_null_lead_id,
       count(*)                                AS bookings_total
FROM public.calendar_bookings;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: 0 orphans / 3 total.

`calendar_bookings.lead_id` is `ON DELETE SET NULL` (`20251028135212:624`), so these are orphans of deleted leads. GUARD 1 excludes them by design — grouping unrelated orphans that merely share an `event_type` and a timestamp would produce a **false abort**. On PROD, with a real deletion history, this number may be substantial. **A large count is its own finding and its own ticket, not a 0a gate** — but it feeds the PP6a arithmetic cross-check, and every orphan still gets its own group id (so it counts toward A2 and A7).

### PP12b — reminder-state baseline (Step 0b's BEFORE evidence)

```sql
SELECT status, event_type, reminder_sent, count(*)
FROM public.calendar_bookings
GROUP BY status, event_type, reminder_sent
ORDER BY status, event_type, reminder_sent;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: `scheduled/inspection/unsent = 2`, `cancelled/inspection/unsent = 1`.

Capture **before** Step 0a, and again **after** Step 0b's Edge Function has been deployed and has run once on PROD. Step 0b's entire claim is that its group-aware `UPDATE` is byte-identical in effect to today's per-row CAS while every group holds one row. **This table is the evidence for that claim, and without the BEFORE capture there is nothing to compare against.**

### PP12c — audit_logs baseline, scoped = B7

```sql
SELECT count(*) AS audit_rows_before
FROM public.audit_logs
WHERE entity_type = 'calendar_bookings';
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`, almost certainly 0. DEV: 0.

**The `WHERE` clause is load-bearing — do not simplify it back.** An unscoped `count(*)` over `audit_logs` is not a test of this migration: 29 triggers on 10 *other* tables write that table on every ordinary lead edit, inspection save or photo write, so on **PROD, during business hours, an unscoped delta measures whether anyone used the app.** `audit_log_trigger()` records the source table in `entity_type` (`20260311000001_add_audit_triggers.sql:12-21`), so scoping it makes A5 mean what it says: a non-zero delta can only be an audit trigger on `calendar_bookings` that neither this repo nor DEV has.

---

## PP13 · The reminder cron — S4-P11 ⛔ **timing**

```sql
SELECT jobid, jobname, schedule, active,
       substring(command from 'https://([a-z]+)\.supabase\.co') AS target_project_ref,
       command
FROM cron.job
ORDER BY jobname;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. Expect `send-inspection-reminders` on `0 * * * *` targeting `ecyivrxjpsmjmexqatym`, and probably `check-overdue-invoices` on `0 23 * * *`. (If `cron.job` is unreadable or the extension is absent, record that and say so.)

### What is different on PROD — and it is not what SESSION 4 assumed

`20260218000003_create_reminder_cron_job.sql:1-11` schedules `net.http_post` to `https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder` **every hour on the hour, 24/7**. The Edge Function then runs `UPDATE calendar_bookings SET reminder_sent, reminder_sent_at` (`index.ts:333-338`) and a row-scoped release (`index.ts:460-464`) — **both fire `update_calendar_bookings_updated_at` and move `updated_at`.**

**On DEV, this table had no scheduled writer at all** — DEV's two cron jobs point at PROD, not at DEV. **On PROD, the table has a scheduled writer *and* a second, unauthorised caller:**

1. **PROD's own pg_cron** fires at `:00` with a PROD-Vault bearer.
2. **DEV's pg_cron** fires at `:00` with a **DEV-Vault bearer that PROD accepts** — this is **SF-5**, and it is proven, not suspected: DEV's `net._http_response` id 1377 shows `200` and PROD's own run summary `{"processed":1,"sent":0,"failed":0,"skipped":0,"alreadyClaimed":1,"released":0}` at `2026-08-30 09:00:00.023502+00`.

**So PROD's `send-inspection-reminder` is invoked TWICE at every `:00`.** The per-row CAS absorbs it (`alreadyClaimed:1, sent:0` is the live proof), so it is not a duplicate-email source today. **SF-5 is unremediated and out of scope for this pack** — the point here is that it makes the top of the hour *busier*, not that there is a second window to dodge. Both callers converge on the same minute.

### ⛔ The apply window, concretely

**Start the apply at `:05`. Not at `:55`. Never inside `:50`–`:10`.**

The whole transaction is budgeted at up to ~4 × 60 s (PP3). A `:05` start finishes by roughly `:09` and clears the next top-of-hour by about 51 minutes. A `:55` start runs straight into two concurrent invocations of the reminder function.

**What straddling `:00` costs, specifically:**

1. **The lock.** Both invocations' `UPDATE`s queue behind `ACCESS EXCLUSIVE`. They either time out — **skipping or partially claiming that hour's real customer reminders** — or one wins the race and the migration loses its own 3 s `lock_timeout` and aborts.
2. **Verification A4.** A cron write between B5 and A4 moves `updated_at` on any row it claims, changing the fingerprint for a reason that has nothing to do with this migration.
3. **Verification A2/A7.** A concurrent write is not a row-count change, but a *new booking* created in the window is — see §3.

**Also avoid `23:00`–`23:10` Melbourne**: `check-overdue-invoices` fires at `0 23 * * *` alongside the reminder job. It writes `invoices`, not `calendar_bookings`, so it does not contend for this lock — but it is more concurrent load on PROD for no benefit.

> **Why pausing the cron is deliberately NOT in this pack.** Pausing means `cron.unschedule('send-inspection-reminders')`, which is a **write**, and a reminder job left unscheduled **stops every customer inspection reminder silently** — nothing errors, nothing logs, and the next person to notice is a customer who did not get their 48-hour notice. A pre-flight pack must be safe to run in full, at any hour, by someone tired, without reading every line; a statement whose failure mode is silent and customer-facing does not belong in one. If it is genuinely needed, it belongs in the **deploy runbook** as an explicit step with its own restore gate — captured verbatim from this query, restored verbatim, and confirmed by re-running this query. A `:05` start makes it unnecessary.

---

## PP14 · HANDOFF **P0** — re-harvest the technician-referencing RLS policies

> **⛔ READ THIS FIRST: this gates STEP 1 (`lead_assignments` + the 16-policy RLS rewrite), NOT Step 0a.** A difference here does **not** block the 0a apply. Capture it now purely because the human is already in PROD's Studio with the ritual done, and doing it later costs another authenticated session on a live database.

**Why it must be re-harvested rather than inherited.** SESSION 1's "17 technician-referencing policies / 22 predicate bodies / 16 to rewrite" is **DEV-derived**. History is forked and `20260825141426_lead_notes.sql:3-10` records in-repo that DDL has been applied to PROD out-of-band. **If PROD's list differs, SESSION 1 §5f is a template, not a work order.**

The regex below is **byte-identical to Bundle B's** so the outputs diff line-by-line against `SESSION-1-DB-RLS-FINDINGS.md`. Do not "improve" it.

### PP14a — the counts

```sql
SELECT
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS total_policies_public,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual,'')       ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)'
        OR coalesce(with_check,'') ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)')
  ) AS technician_referencing_policies,
  (SELECT count(*) FILTER (WHERE coalesce(qual,'')       ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)')
        + count(*) FILTER (WHERE coalesce(with_check,'') ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)')
     FROM pg_policies WHERE schemaname = 'public'
  ) AS technician_predicate_bodies;
```

**DEV (SESSION 1):** `80 | 17 | 22`. **PROD expects:** `UNKNOWN — MUST CAPTURE`.

### PP14b — the policy list, for a line-by-line diff

```sql
SELECT tablename, policyname, cmd, permissive, roles::text AS roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (coalesce(qual,'')       ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)'
    OR coalesce(with_check,'') ~* '(technician|tech_id|assigned|inspector|completed_by|submitted_by)')
ORDER BY tablename, policyname;
```

**DEV:** 17 rows. **PROD expects:** `UNKNOWN — MUST CAPTURE`.

### PP14c — policies reaching a technician column through a helper function

The regex subset in PP14b cannot see a policy that reaches a technician column via a function call. This closes that gap:

```sql
SELECT DISTINCT pol.tablename, pol.policyname, f.proname AS calls_function
FROM pg_policies pol
JOIN pg_proc f ON f.pronamespace = 'public'::regnamespace
WHERE pol.schemaname = 'public'
  AND length(f.proname) > 3
  AND (coalesce(pol.qual,'') || ' ' || coalesce(pol.with_check,''))
      ~ ('\m' || f.proname || '\M')
ORDER BY pol.tablename, pol.policyname, f.proname;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. Diff against the same field in SESSION 1's Bundle B output.

**How to read the diff (all of these gate Step 1, none gates 0a):**

- **Identical to DEV** ⇒ SESSION 1 §5f's 32 DDL statements are a work order. Proceed to Step 1 planning on that basis.
- **PROD has a policy DEV lacks** ⇒ it needs its own rewrite authored; the "16 policies / 20 bodies / 32 statements" figure is wrong and must be recomputed.
- **PROD lacks a policy DEV has** ⇒ a `DROP POLICY` in §5f will fail; the rewrite must be re-derived, not patched.
- **Same names, different predicate bodies** ⇒ the most dangerous shape. A `DROP`+`CREATE` would silently replace PROD's real policy with DEV's. Stop and re-author.
- **Statement form is `DROP POLICY` + `CREATE POLICY`, never `ALTER POLICY`** — a comment-stripped replay of all 124 migrations finds 211 CREATE / 88 DROP / **0 ALTER**.
- **Do not forget the deliberate exclusion.** One of the 17 is excluded on purpose (HANDOFF §6): post-migration, `tech_update_assigned_leads` must **still** read `(assigned_to = auth.uid())` in **both** bodies. It looks exactly like an omission to a reviewer.

---

## 2 · THE BEFORE CAPTURE SHEET — B0…B7, uncommented

The migration file carries B1…B7 inside `--` comments, so they are **not runnable as shipped**. Here they are as SQL. B1, B2, B3, B4, B6 and B7 are the same queries as PP3, PP6b, PP2, PP9, PP12a and PP12c — **if you ran those in this same Studio session and nothing has been applied since, record the same numbers here rather than re-running.**

**B5 is different: it must be the LAST capture before the apply.**

---

### B0 · Choose `t0` — run this FIRST, immediately before B5

```sql
SELECT now()                       AS t0,
       now()::text                 AS t0_literal,
       current_setting('TimeZone') AS session_timezone;
```

**Copy `t0_literal` EXACTLY as returned — every digit, and the trailing offset (`+00`, `+10`, …).**

**Paste that literal verbatim into B5, and again into A4 and A4's discriminator. Do not retype it. Do not reformat it. Do not drop the offset** — a bare timestamp is interpreted in the *session's* `TimeZone`, so if A4 runs in a different Studio tab with a different `TimeZone` setting, the pinned row set silently changes and the fingerprint comparison becomes meaningless.

Write it here before continuing:

```
t0_literal = ______________________________________________
```

**Timing rule, PROD-specific:** take B0/B5 inside the same `:05`–`:20` window as the apply. **If more than about 30 minutes elapse between B5 and the apply, discard t0 and re-take B0/B5 with a fresh one** — the longer the gap, the more likely an hourly-cron write lands inside the window and moves `updated_at` on rows created at or before t0, which turns a clean A4 into a diagnosis exercise for no reason.

---

### B1 · Row count — the denominator for every AFTER identity (= PP3)

```sql
SELECT count(*) AS bookings_before FROM public.calendar_bookings;
```

**DEV: 3. PROD: `UNKNOWN — MUST CAPTURE` → `B1 = __________`**

---

### B2 · GUARD 1's predicate as a query — MUST RETURN ZERO ROWS (= PP6b)

```sql
SELECT lead_id, event_type, start_datetime,
       count(*)                         AS rows_in_group,
       array_agg(DISTINCT status::text) AS statuses,
       array_agg(id ORDER BY id)        AS booking_ids
FROM public.calendar_bookings
WHERE lead_id IS NOT NULL
  AND (status IS NULL OR status NOT IN ('cancelled', 'rescheduled'))
GROUP BY lead_id, event_type, start_datetime
HAVING count(*) > 1;
```

**DEV: 0 rows. PROD: `UNKNOWN — MUST CAPTURE`. Non-zero ⇒ GUARD 1 aborts by design — adjudicate per PP6, do not edit the guard.**

---

### B3 · The column must not already exist (= PP2)

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'calendar_bookings'
  AND column_name IN ('booking_group_id', 'group_id', 'booking_group');
```

**DEV: 0 rows. PROD: `UNKNOWN — MUST CAPTURE`. Any row ⇒ STOP.**

---

### B4 · Index list and count (= PP9)

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
ORDER BY indexname;
```

**DEV: 9, `idx_calendar_bookings_booking_group_id` absent. PROD: `UNKNOWN — MUST CAPTURE` → `B4 count = __________` (A3 is this + 1).**

---

### B5 · `updated_at` fingerprint — the "nothing behaved differently" proof

**Substitute your `t0_literal` from B0 in the one place marked. Take this LAST, immediately before the apply.**

```sql
SELECT count(*)        AS row_count,
       max(updated_at) AS newest_updated_at,
       md5(string_agg(id::text || '|' ||
                      coalesce(extract(epoch FROM updated_at)::text, 'NULL'),
                      ',' ORDER BY id)) AS fingerprint
FROM public.calendar_bookings
WHERE coalesce(created_at, '-infinity'::timestamptz) <= '<PASTE t0_literal HERE>'::timestamptz;
```

**PROD: `UNKNOWN — MUST CAPTURE` → `row_count = __________` · `fingerprint = ______________________________`**

DEV's values were `3` / `e92d84bdba558ccf08fa97828f26d217` at t0 `2026-08-30 19:30:00+10`. **Those are DEV's. A fingerprint is never comparable across databases — PROD's own B5 is the only thing A4 may be compared to.**

Notes that are load-bearing, not decoration:

- **The row set is pinned by `created_at <= t0` precisely because PROD's table has a scheduled writer** (PP13). Without the pin, an unpinned fingerprint over the whole live table would change between B5 and A4 for a reason unrelated to this migration. The pin also excludes bookings *created* during the window — which is what you want.
- **`coalesce(created_at, …)`** because a NULL `created_at` would otherwise drop that row from both captures asymmetrically.
- **It fingerprints `extract(epoch …)`, not `updated_at::text`,** because casting a `timestamptz` to text renders through the *session's* `TimeZone` and `DateStyle` — two Studio tabs with different settings would change the digest while the data was untouched. The epoch is the absolute instant.
- **`coalesce(…, 'NULL')` on the epoch** because `updated_at` is nullable (`DEFAULT now()`, no `NOT NULL`); without it `string_agg` drops NULL rows and silently shrinks the fingerprint's coverage.
- `newest_updated_at` is display-only (it renders in the session `TimeZone`). **Ignore it.** `row_count` and `fingerprint` are the identity.
- On PG14+ `extract(epoch FROM timestamptz)` returns `numeric`; on PG13 and earlier, `double precision`, whose `::text` is governed by `extra_float_digits`. Both runs are on the same database so this cannot differ — **unless you change the session's `extra_float_digits` between them. Don't.** (PP1 records the version.)

---

### B6 · Orphan bookings (= PP12a)

```sql
SELECT count(*) AS bookings_with_null_lead_id
FROM public.calendar_bookings WHERE lead_id IS NULL;
```

**PROD: `UNKNOWN — MUST CAPTURE`.** Informational; no gate.

---

### B7 · audit_logs baseline, scoped (= PP12c)

```sql
SELECT count(*) AS audit_rows_before
FROM public.audit_logs WHERE entity_type = 'calendar_bookings';
```

**DEV: 0. PROD: `UNKNOWN — MUST CAPTURE` → `B7 = __________`. A5 must equal it exactly.**

---

## 3 · HOW THE AFTER CHECKS CHANGE ON PROD

Do not carry DEV's AFTER expectations across. **PROD is a live system with real writers**, and three of the identities need restating because of it.

| Check | DEV expectation | **PROD expectation** |
|---|---|---|
| **A1** column shape | `booking_group_id \| uuid \| NO \| gen_random_uuid()` | **Identical.** `is_nullable = YES` ⇒ the NOT NULL did not take, **STOP**. `column_default` NULL ⇒ every future INSERT that omits the column will now FAIL, **STOP and roll back**. |
| **A2** `bookings \| distinct_groups \| nulls` | `3 \| 3 \| 0` | **`bookings = distinct_groups` AND `nulls = 0` is the load-bearing part — NOT the match to B1.** A booking created between B1 and the apply makes `bookings > B1` legitimately. On DEV nothing could write; on PROD, during any window, it can. Compare `bookings` to a **fresh `count(*)`**, not to B1. |
| **A3** index list | B4's list + the new index, nothing removed | **Identical rule, but against PROD's own B4 count + 1** — not against DEV's 10. |
| **A4** fingerprint | identical digest to B5 | **Identical rule.** Survives new bookings unchanged, because the row set is pinned by `created_at <= t0`. If the digest differs, run the discriminator **before** concluding anything: `SELECT count(*) FROM public.calendar_bookings WHERE created_at <= '<t0>'::timestamptz AND updated_at > '<t0>'::timestamptz;` — a non-zero result is almost certainly the hourly reminder cron (or its SF-5 twin) and **that is your explanation**. `ALTER TABLE` rewrites fire no row triggers. Only a changed digest with a **zero** discriminator is unexplained. |
| **A5** audit rows | identical to B7 | **Identical rule** — and it holds on PROD *because* it is scoped to `entity_type = 'calendar_bookings'`. Do not simplify it to an unscoped `count(*)`; on PROD during business hours that measures whether anyone used the app. |
| **A6** GUARD 1 predicate | 0 rows | **0 rows — with one PROD-only caveat.** If it returns rows, check their `created_at` first: a booking created *after* the apply can form a new natural-key collision through ordinary use, and that is new activity, not a migration failure. Rows created *before* the apply would mean GUARD 1 did not run. |
| **A7** groups | `1 \| 3` | **one row, `rows_in_group = 1`, `number_of_groups` = the CURRENT row count** (every row, orphans and cancelled included — each gets its own `gen_random_uuid()`). **This is not PP6a's `number_of_groups`.** On DEV those were 3 and 2. Any `rows_in_group > 1` before Step 2 ships means something fanned out early — **STOP and do not deploy the reminder Edge Function.** |
| **A8** | `true` | The `booking_group_id IS NULL` count must be 0 — a tautology while `NOT NULL` holds, which is the point. |

> ⚠️ **You will NOT see the guards pass.** Both announce success with `RAISE NOTICE`, and the Studio SQL editor renders result sets and errors but **not** server NOTICE messages. A clean apply shows only *"Success. No rows returned."* — indistinguishable from a run where a guard had been edited out. **A2 and A6 are therefore the only operator-visible proof, and they are not optional.** A2 restates GUARD 2's identity; A6 restates GUARD 1's predicate.

---

## 4 · THE SF-5 INFORMATIONAL READS

### PP17 · `functions list` — record the baselines for BOTH functions (terminal, not Studio)

State the ref and its role aloud and get confirmation, exactly as for the SQL. This is a **read-only** command and applies nothing.

```
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym --output json
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. Record, for **both** `send-inspection-reminder` and `calculate-travel-time`: `id`, `slug`, `status`, **`version`**, **`verify_jwt`**, `created_at`, `updated_at`.

**Why it belongs in this pack even though it gates nothing in 0a:**

1. **It is the before-baseline for the 0b and 0c deploy gates.** Those gates assert `version` **+1** and `verify_jwt` **unchanged** after each deploy. A baseline captured after the fact is not a baseline.
2. **It is the SF-5 H2 discriminator, and the Step 0b deploy destroys it.** `supabase/config.toml` has **no** `[functions.send-inspection-reminder]` section, so every CLI deploy re-asserts the default `verify_jwt = true`. If PROD currently reads `verify_jwt = false`, then the DEV→PROD calls are passing because the gateway is not checking at all (H2) — and the 0b deploy will flip it back to `true` and silently change that behaviour. **Capture it now or the question becomes unanswerable.**
3. Record any function on PROD that `docs/edge-function-attribution-manifest.md` does not list.

**No STOP rule for 0a.** Two operational rules apply regardless: **do not run `functions deploy` from this window** — deploys are their own gated step with their own identity checks — and note that `functions list` needs a valid access token, so a failure here is a credential problem, not a finding.

### PP18 · The Vault claims query belongs on **DEV**, not PROD — do not run it here

SF-5's discriminating query (`SF-5-prod-credential-in-dev-vault.md` §3) decodes the **JWT payload claims only** (`ref`, `role`, `iat`, `exp`, never the token itself) of the Vault secret named `service_role_key`. **Its target is DEV `ctppzqnysmzynkxjlzta`.**

**Why not PROD:**

- The question it answers is *"what is inside **DEV's** Vault secret, and is it PROD-signed?"* — the H1/H2 discriminator. Decoding **PROD's** own Vault entry answers nothing about that.
- Running it on PROD means decrypting a live production credential inside a SQL editor for no decision that depends on the result.
- **It is not a 0a gate in any form.** Nothing in this migration reads, writes or depends on Vault.

There *is* a later, separate reason to confirm PROD's own Vault entry is PROD-signed — SF-5 §5, **before any credential rotation**. That is a rotation-time task with its own runbook. **It is not part of this pack and must not be folded into it.**

---

## 5 · STOP CONDITIONS — any ONE of these means do not apply 0a on PROD

Paste the output and wait.

| # | Condition | Block |
|---|---|---|
| 1 | `leads_rows` looks like DEV, or the ref in the address bar is not `ecyivrxjpsmjmexqatym` | PP1 |
| 2 | `booking_group_id` (or `group_id` / `booking_group`) already exists | PP2 / B3 |
| 3 | `calendar_bookings_rows ≥ 500,000` **or** heap `≥ 1 GB` | PP3 / B1 |
| 4 | `is_owner = false` | PP4 |
| 5 | Any event trigger other than the `pgrst_*` pair | PP5 |
| 6 | Any `rows_in_group > 1` | PP6a / PP6b / B2 |
| 7 | `'cancelled'` or `'rescheduled'` missing from the live status type | PP7 |
| 8 | More than the two known triggers — **especially anything named `audit`, or any `AFTER` trigger** | PP8 |
| 9 | `idx_calendar_bookings_booking_group_id` already exists | PP9 / B4 |
| 10 | **ANY** row from the `pg_attribute.attacl` query | PP11b |
| 11 | The apply window cannot start in the first ten minutes of an hour | PP13 |

**Human gates — not automatic STOPs, but a person must look before the apply:** PP6d (near-miss pairs) and PP6e (already-double-sent groups).

**Not a stop for 0a, but capture it while you are here:** PP14 (HANDOFF P0 — gates Step 1), PP17 (SF-5 baselines — gates the 0b/0c deploys).

---

## 6 · HANDOFF TO THE APPLY — three corrections that came out of the DEV run

Not part of this pack. Stated here so the gate results are handed over with them attached.

1. **The migration body from `BEGIN;` to `COMMIT;` is ONE Studio execution.** Do not run it statement by statement — that drops the `SET LOCAL` timeouts and the `LOCK TABLE`, and every protection in the file with them.
2. **A non-Postgres error (browser timeout, wifi drop, gateway 5xx) is NOT proof of rollback.** DEV's apply committed *during* a wifi drop and looked like a failure. **Run A1 first. Do not re-paste blind.** If A1 shows the column, the migration applied — proceed to A2…A8. If A1 shows nothing, the transaction rolled back and a clean re-paste is safe. The bare `ADD COLUMN` is the backstop either way: a blind re-paste against an applied migration fails loudly at `42701` and rolls back, exactly as it did on DEV.
3. **Plan B is not a preference.** It is reached only if PP3 crosses the thresholds, it is strictly riskier, and its step 5 (`CREATE INDEX CONCURRENTLY`) **cannot run in the Studio SQL editor at all** (`25001` — the editor is a transaction block). Decide that route *before* starting, not at 2 a.m. with steps 1–4 already committed. Full text: `SESSION-4-PROD-PREFLIGHT.md` §3.
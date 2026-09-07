# STEP 4 — PROD PRE-FLIGHT GATE PACK · `calendar_bookings.booking_group_id` (Step 0a)

**Target: PROD `ecyivrxjpsmjmexqatym` — LIVE. mrcsystem.com. Real customer path. 144 leads (measured 2026-08-31).**

**Revised:** 2026-08-31 · **Gates:** `supabase/migrations/20260828120000_add_booking_group_id.sql` (blob `6d4cb51db8c0251098307fc4b7fcc94fa9b4356b`) · **Template:** `SESSION-4-PROD-PREFLIGHT.md` gates S4-P1…S4-P11, as amended by the DEV run and the adversarial review recorded in `DEPLOY-LOG.md`.

> **NOTHING IN THIS DOCUMENT WRITES.** Every block is a read-only `SELECT` except **PP17**, which is a read-only CLI call run in a terminal, and §6 correction 0, which is a read-only `git cat-file`. The pack is safe to run in full, at any hour, in any order, by someone tired. The apply itself is **not** in here — it is the migration file, and it is a separate, gated step.
>
> **Every PROD value below is `UNKNOWN — MUST CAPTURE` except the four in §0.1's measured table.** Nothing else may be treated as known.

---

## 0 · How to run this

An agent on this machine has **no CLI route to any Supabase database** (`db query` has no `--project-ref`; the Bash guard rejects every `supabase` command that lacks one; the MCP is pinned to PROD with a dead token). **Michael runs every block in the Supabase Studio SQL editor and pastes the output back.**

**Studio shows only the LAST result set of a multi-statement run.** Every block below is runnable on its own and must be pasted on its own.

**Shell note (applies to every terminal block in this pack).** Each Claude Code `!` invocation is a **fresh shell** — no `export`, no variable, nothing survives between commands. Every command here uses **literal paths** and is a **single line**. Do not split one into two.

### Before the first query — the confirmation ritual (CLAUDE.md)

Say it out loud, in plain English, and get an explicit yes:

> *"I am about to run read-only pre-flight queries against **`ecyivrxjpsmjmexqatym`**, which is **PRODUCTION — the live mrcsystem.com database carrying real customer data**. Not the DEV sandbox `ctppzqnysmzynkxjlzta`."*

Then read the ref out of the Studio address bar (`/dashboard/project/<ref>/sql`) and confirm it is `ecyivrxjpsmjmexqatym` **before** pasting PP1. PP1 confirms it a second way, and it is the **only** identity check in this pack — see PP13's warning about `target_project_ref`.

### Paste-back discipline

Paste results back **verbatim — headers and rows**. Gates are decided on the numbers, not on "looked fine". A block you skipped is not a pass.

---

## 0.1 · WHAT IS ALREADY MEASURED ON PROD — and nothing else is

| PROD fact | Value | Measured | What it settles |
|---|---|---|---|
| `public.leads` row count | **144** | 2026-08-31 | PP1's identity expectation. Supersedes the older "101" (verified 2026-08-26). |
| `calendar_bookings.booking_group_id` | **absent** | 2026-08-31 | **PP2 / B3 pre-satisfied.** Re-confirm anyway — one query, and it is the pack's hardest STOP. |
| Reminder guard-URL baseline (0b `P-E2`, pre-0a variant) | `pending_rows` **0** · `transient` **0** · `permanent_floor` **0** · `approx_guard_url_bytes` **120** | 2026-08-31 | A **MEASURED ZERO** baseline. `120` is the empty-list base — no group ids inlined. Future growth in no-email bookings is detectable against these four zeros; without them it is not. |
| DEV's *deployed* `send-inspection-reminder` vs git | blob `fab3d39a…` = commit `c9761b6`, **one commit behind** `main`/`production`'s `bf95002f…` | 2026-08-31 | **SF-6: deployed-EF-vs-git drift is demonstrated, not hypothetical.** PROD's own deployed source is `UNKNOWN` until captured — see PP17. |

**Everything else on PROD is `UNKNOWN — MUST CAPTURE`.** No other PROD number in this document is a prediction you may act on.

### ⛔ ORDERING — `P-E2` cannot run on a project before 0a is applied there

The corrected `P-E2` in the 0b runbook selects `count(DISTINCT cb.booking_group_id)`. **On PROD that column does not exist yet** (measured above), so `P-E2` as written fails with **`42703 undefined column`** — a real `42703` was observed doing exactly this against PROD on 2026-08-31.

**Rule: 0a applies to a project FIRST; only then does `P-E2` run on that project.**

Before 0a, use the `booking_group_id`-free variant. This is the query that produced the measured zeros above:

```sql
SELECT count(*) FILTER (WHERE l.email IS NOT NULL AND l.email <> '')  AS pending_sendable_now,
       count(*) FILTER (WHERE l.email IS NULL     OR  l.email =  '')  AS pending_no_email_never_clears,
       count(*)                                                       AS pending_rows
FROM public.calendar_bookings cb
LEFT JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.reminder_sent = false
  AND cb.status = 'scheduled'
  AND cb.reminder_scheduled_for <= now()
  AND cb.lead_id IS NOT NULL;
```

| Column | Gate |
|---|---|
| `pending_sendable_now` | **MUST be 0** to deploy 0b and to run the 0b manual invoke. |
| `pending_no_email_never_clears` | **Expected standing non-zero.** A no-email row is skipped *before* the claim, so it never clears. **Record it; never wait on it.** |
| `pending_rows` | Informational — it decides which 0b response body you get. |
| `distinct_groups_in_guard_url` | **Only exists after 0a.** The `< 150` bound belongs on **DISTINCT `booking_group_id` over ALL pending rows** (including the no-email rows that never clear), **not** on `pending_sendable_now`. The pre-0a variant cannot produce it. |

---

## 0.2 · WHAT DEV PROVED, AND WHAT IT DID NOT

0a **is applied and verified on DEV** (2026-08-30: A1…A8 all pass; 3 bookings, 3 groups, fingerprint unchanged, 10 indexes, 0 audit rows). That run proved the migration's **design** — most importantly GUARD 2's assumption that a volatile `DEFAULT` is evaluated **per row**, now demonstrated on a real PostgreSQL instance rather than merely documented.

**It proved almost nothing about PROD's data.** DEV carries 3 leads and 3 bookings. The migration history is forked (16 shared / 104 local-only / 102 remote-only) and this project has demonstrably applied DDL to PROD out-of-band (`20260825141426_lead_notes.sql:3-10`), so even the *structural* facts are re-asked here rather than assumed — DEV's own run already caught two live/repo divergences (D16: the live `set_reminder_scheduled_for()` body has no `no_show` branch; the `email_logs_sent_by_fkey` that the repo drops and DEV still carries — PP15).

| DEV, captured 2026-08-30/31 | Kind | PROD | What gates on the PROD value |
|---|---|---|---|
| D3 / **B1** = **3 bookings** | count | **UNKNOWN — MUST CAPTURE** | **PP3.** Decides *apply-as-written vs Plan B*. Also the denominator of A2 and A7. |
| D3 size = 200 kB total / 16 kB heap / 144 kB idx | count | **UNKNOWN — MUST CAPTURE** | **PP3.** The lock window, and the free-disk gate. |
| D4 = `rows_in_group 1 × 2 groups` | count | **UNKNOWN — MUST CAPTURE** | **PP6a. The gate most likely to fire on PROD.** Any group > 1 ⇒ GUARD 1 aborts. |
| D4c (voided-inclusive) = `1 × 3` | count | **UNKNOWN — MUST CAPTURE** | Nothing. Explains a PP6a/unfiltered discrepancy. |
| D4d near-miss = **0 rows** | count | **UNKNOWN — MUST CAPTURE** | **PP6d.** Human gate, no automatic backstop (S4-R11). |
| D7 / **B4** = **9 indexes** | count + list | **UNKNOWN — MUST CAPTURE** | **PP9.** A3 is *your* count + 1. **Do not carry "10" over from DEV.** |
| D10a = 0 orphans / 3 total | count | **UNKNOWN — MUST CAPTURE** | Informational. See PP12a for PROD's one documented orphan source. |
| D10b reminder state (2 scheduled-unsent, 1 cancelled-unsent) | count | **UNKNOWN — MUST CAPTURE** | **PP12b.** The BEFORE evidence for Step 0b's "byte-identical in effect" claim. |
| D10c / **B7** = **0** | count | **UNKNOWN — MUST CAPTURE** | **PP12c.** A5 is an identity against it. |
| D12 / **B5** t0 `2026-08-30 19:30:00+10`, fingerprint `e92d84bdba558ccf08fa97828f26d217` | count | **UNKNOWN — MUST CAPTURE, and must be re-taken on PROD** | **B0/B5 → A4.** DEV's fingerprint and DEV's t0 are **meaningless on PROD**. Never compare a fingerprint across databases. |
| D13 `pending_sendable_now = 2` | count | **MEASURED ZERO on PROD** (§0.1) | Step 0b, not 0a. Runs at 0b time — **and only after 0a is applied to that project** (§0.1 ordering rule). |
| D14 `is_owner = true` | structural | **RE-ASK — PP4** | Whether `ALTER TABLE` is permitted at all. |
| D15 `pgrst_ddl_watch` present, `'O'` | structural | **RE-ASK — PP5** | What else fires on DDL. **DEV's one-line note is not the whole set — see PP5.** |
| D2 / **B3** column absent | structural | **MEASURED absent on PROD; re-confirm — PP2** | **STOP gate (S4-R1).** |
| D5 enum = `scheduled, in_progress, completed, cancelled, rescheduled` (**no** `no_show`) | structural | **RE-ASK — PP7** | GUARD 1's literals parse *and* which statuses count as live occurrences. |
| D6 exactly 2 triggers | structural | **RE-ASK — PP8** | The "no trigger fires / zero audit rows / `updated_at` untouched" claims. |
| D8 one policy (SF-1) | structural | **RE-ASK — PP10** | That no policy change is needed. HANDOFF P0's reasoning. |
| D9a `anon` holds `arwdDxtm` (SF-3) | structural | **RE-ASK — PP11a** | Nothing in 0a — but it is PP11b's discriminator. |
| D9b 0 column ACLs | structural | **RE-ASK — PP11b** | Whether a new column inherits a usable grant. |
| DEV carries `email_logs_sent_by_fkey` | structural | **RE-ASK — PP15 (G3)** | Whether §6.3/§6.4 of the 0b runbook are usable on PROD at all. |
| D11 cron | behavioural | **DIFFERENT BY CONSTRUCTION** | **PP13.** DEV's table has *no* scheduled writer; PROD's has **two callers**. |

**The rule this table encodes:** structural facts transfer to PROD as *expectations to be confirmed*, never as *evidence already in hand*.

---

## 1 · THE GATE TABLE

| ID | = S4 / B | What it asks | ⛔? |
|---|---|---|---|
| **PP1** | S4-P1 | Which database am I on, and does `gen_random_uuid()` resolve? | ⛔ |
| **PP2** | S4-P2 = B3 | Does `booking_group_id` already exist? | ⛔ |
| **PP3** | S4-P3 = B1 | How many rows, how big, **is there disk for a second copy**? | ⛔ |
| **PP4** | (D14) | Can this session actually `ALTER` the table? | ⛔ |
| **PP5** | (D15) | Which event triggers fire **on this migration**? | ⛔ |
| **PP6a** | S4-P4a | Does any natural group hold > 1 live row? | ⛔ **most likely to fire** |
| **PP6b** | S4-P4b = B2 | The offending groups, for adjudication | ⛔ |
| **PP6c** | S4-P4c | Voided-inclusive count | — |
| **PP6d** | S4-P4d | Near-miss pairs GUARD 1 cannot see | human gate |
| **PP6e** | new | Has any such group already been **claimed** more than once — and did it **send**? | evidence |
| **PP7** | S4-P5 | Live `booking_status` labels | ⛔ |
| **PP8** | S4-P6 | Triggers on `calendar_bookings` **and their live function bodies** | ⛔ |
| **PP9** | S4-P7 = B4 | Index-name collision **across the schema** + count | ⛔ |
| **PP10** | S4-P8 | RLS posture | — |
| **PP11a** | S4-P9a | Table-level grants | — |
| **PP11b** | S4-P9b | **Column-level** ACLs + the table-privilege discriminator | ⛔ conditional |
| **PP12a** | S4-P10a = B6 | Orphan bookings | — |
| **PP12b** | S4-P10b | Reminder-state baseline (0b's BEFORE) | — |
| **PP12c** | S4-P10c = B7 | audit_logs baseline, scoped | — |
| **PP13** | S4-P11 | The hourly cron, the second caller, and the drain proof | ⛔ timing |
| **PP14** | — | HANDOFF **P0** RLS re-harvest (gates **Step 1**, not 0a) | capture now |
| **PP15** | **G3, new** | `email_logs.sent_by` FK — was `20260813120000` applied to PROD? | capture now; **raise before the 0b deploy** |
| **PP17** | — | SF-5 / SF-6: `functions list` baselines (terminal) | capture now; gates 0b/0c |
| **PP18** | — | Vault claims query: **DEV, not here** | do not run in this pack |

Blocks marked `= Bn` are the same query as the migration's BEFORE check. Run once; record under both IDs — **except B2 and B5, which must be re-taken in the apply window (§2).**

---

## PP1 · Identity, and the one assumption the migration rests on — S4-P1 ⛔

### PP1a — which database

```sql
SELECT current_database(),
       current_user,
       inet_server_addr(),
       version(),
       (SELECT count(*) FROM public.leads)             AS leads_rows,
       (SELECT count(*) FROM public.calendar_bookings) AS booking_rows;
```

**PROD expects:** `leads_rows` = **144 or a little more** (MEASURED 144 on 2026-08-31; the Framer webhook adds leads continuously, so drift upward is normal). `booking_rows` **UNKNOWN — MUST CAPTURE**. DEV showed `leads_rows = 3` / `booking_rows = 3` on PG 17.6.

**⛔ STOP if:** `leads_rows` is 3, or single-digit, or anything that looks like the sandbox — **you are on DEV and must not proceed**. **⛔ STOP also if `leads_rows` is materially *below* 144** — leads do not disappear, so that is either the wrong database or a deletion nobody has reported. STOP if you cannot tell: re-check the Studio project selector rather than guessing.

Record `inet_server_addr()` and the PG major version; both are needed later.

### PP1b — does the column default actually resolve? ⛔

```sql
SELECT current_setting('server_version_num')::int      AS server_version_num,
       to_regprocedure('pg_catalog.gen_random_uuid()') AS builtin_gen_random_uuid,
       to_regprocedure('public.gen_random_uuid()')     AS public_gen_random_uuid,
       current_setting('search_path')                  AS search_path;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV is PG 17.6.

**⛔ STOP if `builtin_gen_random_uuid` is NULL.** The migration's column default is an **unqualified** `gen_random_uuid()` — its own header calls this "the single assumption this file rests on". From PG13 (`server_version_num >= 130000`) it lives in `pg_catalog` and always resolves. Below that it comes from `pgcrypto`, and whether it resolves depends on `search_path` and on which schema the extension was installed into. That is not a question to answer inside a transaction holding `ACCESS EXCLUSIVE` on a live table.

---

## PP2 · The column must not already exist — S4-P2 = B3 ⛔

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'calendar_bookings'
  AND column_name IN ('booking_group_id', 'group_id', 'booking_group');
```

**PROD: MEASURED 2026-08-31 = 0 rows — the column is absent.** DEV returned 0 rows before its apply. **Re-run it anyway in the apply session:** it is one query, it is the pack's hardest STOP, and a measurement is a point in time on a project with a forked history.

**⛔ STOP on ANY row.** This is S4-R1. A `booking_group_id` that exists on PROD but not in this repo has unknown type, unknown nullability and unknown population; creating a second grouping column beside it is the worst outcome available.

The migration's backstop is real — DEV proved it. The 2026-08-30 DEV re-paste failed loudly at **`42701 column already exists`** and rolled back cleanly, because the migration uses a bare `ADD COLUMN`, not `IF NOT EXISTS`. That backstop works; this gate exists so you learn the answer *before* pasting, not during.

---

## PP3 · Size, and whether there is room — S4-P3 = B1 ⛔ **decides apply-as-written vs Plan B**

### PP3a — row count

```sql
SELECT count(*) AS calendar_bookings_rows FROM public.calendar_bookings;
```

### PP3b — the sizes that matter

```sql
SELECT pg_size_pretty(pg_table_size('public.calendar_bookings'))          AS table_size,
       pg_size_pretty(pg_indexes_size('public.calendar_bookings'))        AS indexes_size,
       pg_size_pretty(pg_total_relation_size('public.calendar_bookings')) AS total_size;
```

`table_size` is **`pg_table_size`**, not `pg_relation_size`. The rewrite copies TOAST as well as the heap, and `pg_relation_size` sees neither TOAST nor the free-space/visibility maps. On DEV: 200 kB total vs 16 kB heap + 144 kB indexes — the missing 40 kB is exactly what `pg_relation_size` hides. `calendar_bookings` carries `description TEXT` and `location_address VARCHAR(500)`, both TOAST-able.

### PP3c — free disk ⛔ **the one failure a timeout does not make safe**

```sql
SELECT pg_size_pretty(pg_database_size(current_database()))                   AS database_size,
       pg_size_pretty(pg_table_size('public.calendar_bookings'))              AS table_size_heap_toast_maps,
       pg_size_pretty(pg_indexes_size('public.calendar_bookings'))            AS indexes_size,
       pg_size_pretty(2 * pg_total_relation_size('public.calendar_bookings')) AS peak_extra_space_the_rewrite_needs;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. Read `peak_extra_space_the_rewrite_needs` against the project's free disk in **Dashboard → Settings → Database → Disk size / Disk usage** — that number is not available from SQL.

**⛔ STOP if free disk is less than `peak_extra_space_the_rewrite_needs` plus a comfortable margin.** The rewrite writes a whole new copy of the heap **and** rebuilds every index before the old files are released at `COMMIT`, plus WAL for all of it. Every other failure in this pack aborts cleanly and leaves the table byte-identical; a **full disk puts the Supabase project into read-only mode**, which is an outage on mrcsystem.com, not a clean abort. At a few hundred rows this is a formality — record it anyway, because the number that makes it a formality is the number PP3a has not measured yet.

### Why the row count decides everything

The column is added `NOT NULL DEFAULT gen_random_uuid()`. `gen_random_uuid()` is **volatile**, so Postgres cannot use the PG11+ catalog-only fast path: it performs a **full table rewrite under `ACCESS EXCLUSIVE`**, evaluating the default once per row. That is what makes the column born-populated with no NULL window — and it is the entire cost of the design.

| `calendar_bookings_rows` | `table_size` | Decision |
|---|---|---|
| < 10,000 | < 50 MB | **Apply as written.** Expected PROD case. |
| < 10,000 | 50 MB – 1 GB | **Apply as written**, outside working hours; budget seconds. A wide-row table rewrites like a bigger one. |
| 10,000 – 499,999 | < 1 GB | **Apply as written**, outside working hours; budget seconds, not milliseconds. |
| ≥ 500,000 | **or** ≥ 1 GB | **DO NOT APPLY AS WRITTEN.** Plan B (`SESSION-4-PROD-PREFLIGHT.md` §3), with explicit sign-off on the extra risk: it rewrites `updated_at` on every row, spams every logged-in technician's phone via Realtime, and its step 5 has no Studio route at all. |

**What the expected count actually is.** PROD's `calendar_bookings` was driven to **zero** on 5 Aug 2026 by the test-lead purge (`docs/TEST_LEAD_PURGE_RUNBOOK.md` deleted its 11 bookings outright), and everything in it was created since. The 144 leads arrived mostly through the Framer webhook and most are not booked. **So the expected count is tens, not hundreds — which is a reason to read PP3a's actual number, not a reason to skip it.**

### The lock window, in plain English

**For as long as the transaction runs, every read and every write of `calendar_bookings` anywhere in the system waits in line:** the technician calendar, the booking form, `LeadDetail`, the reminder Edge Function, the travel-time Edge Function, the export function. Nothing errors — they queue.

The transaction takes `ACCESS EXCLUSIVE` up front and then runs four heavy statements under it — GUARD 1's scan, the `ALTER` rewrite, `CREATE INDEX`, and GUARD 2's `count(DISTINCT …)` scan — each bounded by `statement_timeout = '60s'`, which is **per statement, not per transaction**. **The honest worst case to plan the window around is roughly 4 × 60 s ≈ four minutes, not sixty seconds.** `lock_timeout = '3s'` means the migration fails fast rather than forming a queue behind someone else's long transaction. Either timeout aborts the whole transaction cleanly and leaves the table byte-identical: **a failed apply is safe; a queued lock is not.**

**But `statement_timeout` bounds the SERVER, not the browser.** The Studio SQL editor and the dashboard gateway impose their own request timeout, which `SET LOCAL` cannot raise and which is well under four minutes. A long transaction therefore returns a transport error to the browser **while the transaction continues on the server** — exactly what happened on DEV, where the apply committed during a wifi drop and looked like a failure.

**Agree the consequences before you paste, not after:**

| PP3a band | What a browser timeout means |
|---|---|
| < 10,000 rows | Theoretical. The whole transaction is sub-second. |
| 10,000 – 499,999 | **A browser-side timeout is a likely outcome and is NOT a failure.** Do **not** re-paste. Run **A1** first (§6 correction 2): column present ⇒ it applied, go on to A2…A8; column absent ⇒ it rolled back and a clean re-paste is safe. |
| Any band, if you want the problem gone | That is a direct `psql` session — a second channel this pack does not have. **Decide that before the window, not at 2 a.m.** |

---

## PP4 · Ownership — can this session `ALTER` the table at all? ⛔

```sql
SELECT c.relname                                        AS table_name,
       pg_get_userbyid(c.relowner)                      AS table_owner,
       current_user                                     AS running_as,
       pg_has_role(current_user, c.relowner, 'USAGE')   AS is_owner_inherited,
       pg_has_role(current_user, c.relowner, 'MEMBER')  AS is_owner_via_set_role,
       has_table_privilege(current_user, c.oid, 'UPDATE')   AS has_update,
       has_table_privilege(current_user, c.oid, 'DELETE')   AS has_delete,
       has_table_privilege(current_user, c.oid, 'TRUNCATE') AS has_truncate
FROM pg_class c
WHERE c.oid = 'public.calendar_bookings'::regclass;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: `is_owner = true`, running as `postgres`.

**⛔ STOP if `is_owner_inherited` is false AND `is_owner_via_set_role` is false.** `ALTER TABLE … ADD COLUMN` and `CREATE INDEX` both require ownership or membership in the owning role; otherwise the migration fails at `42501` **mid-transaction**. That failure is safe (the whole transaction rolls back) but it is an avoidable 2 a.m. surprise, and it means the apply needs a different connection — arranged *before* the window, not during it.

`is_owner_inherited = false` with `is_owner_via_set_role = true` means the membership is `NOINHERIT`: the apply needs a `SET ROLE`, which also has to be arranged before the window.

`LOCK TABLE … IN ACCESS EXCLUSIVE MODE` (SECTION 0) needs **UPDATE, DELETE *or* TRUNCATE** — any one of the three, or ownership. **Record all three**; the earlier two-of-three note was wrong.

---

## PP5 · Event triggers — which ones fire **on this migration** ⛔

```sql
SELECT et.evtname,
       et.evtevent,
       et.evtenabled,
       et.evttags,
       pg_get_userbyid(et.evtowner)  AS owner,
       n.nspname || '.' || p.proname AS function_name,
       (    et.evtenabled <> 'D'
        AND et.evtevent IN ('ddl_command_start','ddl_command_end','table_rewrite')
        AND (et.evttags IS NULL
             OR et.evttags && ARRAY['ALTER TABLE','CREATE INDEX','COMMENT'])
       ) AS fires_on_this_migration
FROM pg_event_trigger et
JOIN pg_proc      p ON p.oid = et.evtfoid
JOIN pg_namespace n ON n.oid = p.pronamespace
ORDER BY fires_on_this_migration DESC, et.evtname;
```

**PROD expects the stock Supabase set of SIX, and that is NOT a finding:** `issue_graphql_placeholder`, `issue_pg_cron_access`, `issue_pg_graphql_access`, `issue_pg_net_access`, `pgrst_ddl_watch`, `pgrst_drop_watch`.

The four `issue_*` are tag-scoped to `CREATE EXTENSION` / `DROP EXTENSION`, and `pgrst_drop_watch` is `sql_drop` only — **so only `pgrst_ddl_watch` can fire inside this transaction.** DEV's D15 recorded one line (`pgrst_ddl_watch`, `'O'`) because that is all the old query surfaced; a whitelist built from that one line would have produced a **guaranteed false STOP** on a stock project.

**⛔ STOP only on a row where `fires_on_this_migration = true` and `evtname` is not `pgrst_ddl_watch`.** Read `table_rewrite` rows with particular care: **this migration rewrites the table**, so a `table_rewrite` trigger runs inside your `ACCESS EXCLUSIVE` window and can do arbitrary work you did not budget or lock for. That event class exists and the old gate had no concept of it.

**What `pgrst_ddl_watch` does and why you want it:** it tells PostgREST to reload its schema cache, so the new column becomes visible to the API almost immediately. That is expected, and it is the mechanism behind the one observable change the migration admits to — **one extra field** in the shape returned to three `SELECT *`-style consumers (`export-inspection-context/index.ts:94`, `src/pages/LeadDetail.tsx:320`, and the Realtime payload to `src/hooks/useTechnicianJobs.ts:356-395`). None of the three reads the field; no row count, ordering or filter result changes anywhere.

---

## PP6 · Natural-group ambiguity — S4-P4 ⛔ **THE GATE MOST LIKELY TO FIRE**

DEV had 3 bookings and 2 live groups. PROD has years of hand-entered history behind it. Treat a clean result here as the surprise, not the default.

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

### PP6a-x — the cross-check, as ONE self-contained query

```sql
SELECT count(*)                                                              AS b1_total_rows,
       count(*) FILTER (WHERE lead_id IS NULL)                               AS orphan_rows,
       count(*) FILTER (WHERE lead_id IS NOT NULL
                          AND status IN ('cancelled','rescheduled'))         AS voided_non_orphan_rows,
       count(*) FILTER (WHERE lead_id IS NOT NULL
                          AND (status IS NULL
                               OR status NOT IN ('cancelled','rescheduled'))) AS live_non_orphan_rows
FROM public.calendar_bookings;
```

Two identities, both from this one result set — **no cross-block arithmetic**:

1. `orphan_rows + voided_non_orphan_rows + live_non_orphan_rows = b1_total_rows` — always true. If it is not, re-read the numbers.
2. `live_non_orphan_rows` must equal **PP6a's `number_of_groups` exactly when every group holds one row.** If PP6a is clean and these two differ, one of them was taken at a different moment — re-take both.

On DEV: `3 | 0 | 1 | 2`, and PP6a's `number_of_groups` was 2. ✅

> The old `B1 − number_of_groups = orphans + voided` form is **withdrawn**: PP12b never splits on `lead_id IS NULL`, so a cancelled orphan is double-counted and the identity breaks on healthy PROD data. It balanced on DEV only because DEV had zero orphans.

**Do not carry `number_of_groups` forward into A7.** A7's `number_of_groups` counts *every* row — orphans and cancelled included, because each gets its own `gen_random_uuid()` — so A7's number is **B1**, not PP6a's. On DEV those were 3 and 2. Write both down separately.

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

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: 0 rows. **This must be re-taken in the apply window — see §2.**

### Adjudication — the questions to ask **per offending-group shape**

A migration must not decide any of these. The shape is read off `technicians`, `statuses` and the `created_at` spread.

**Shape A — two rows, two *different* `technicians`, both live statuses, `created_at` close together.**
A de-facto two-technician booking, created by hand before the feature existed.
- Is this Glen and Clayton on the same job — confirmed with them by lead, not by inference?
- Is the booking **in the future**? If so the customer is scheduled to receive **two reminder emails** (PP6e says whether it has already happened).
- Same `start_datetime` *and* same end time, or is one a partial-day attendance?
- **Decision:** these two rows should share one group id. **The migration cannot give them one** — GUARD 1 aborts precisely because it will not guess. In order of preference: **(1)** if one row is redundant, cancel it; **(2)** defer 0a until Step 2's fan-out design covers pre-existing pairs, recording this group as the reason; **(3)** a documented, signed-off, one-off data correction *before* the apply. Option 3 is a **write to a live customer table** and belongs in a deploy runbook with its own gates and rollback, not here.

**Shape B — two rows, the *same* technician twice, both live.** A duplicate booking, i.e. a data bug.
- Which `booking_id` did the field actually work — check `created_at`, and whether either has an `inspection_id` or a job completion hanging off it.
- Has either already been claimed or sent (PP6e)?
- **Decision:** almost certainly cancel or delete, not group. The one shape with a clean answer — still a write, still needs sign-off.

**Shape C — two rows, `created_at` far apart (days or weeks).** A re-book where the original was never cancelled.
- Why did the original survive? Is `status` on the older row still `scheduled`?
- Does the customer expect the old slot or the new one?
- **Decision:** the stale row should carry `cancelled` or `rescheduled` — which is also what makes GUARD 1 stop seeing it. This exact pattern is a **pre-existing** duplicate-email source under today's code, independent of 0a and 0b; do not let 0b be blamed for it later.

**Shape D — `statuses` contains a label DEV never had (e.g. `no_show`).**
GUARD 1 excludes **only** `'cancelled'` and `'rescheduled'`, so a `no_show` row counts as a live occurrence and can collide with a re-booking of the same slot.
- Is `no_show` semantically a voided occurrence in this business, or a real attended-but-absent record?
- **Decision:** if genuinely voided, the correct change is to GUARD 1's exclusion list — **a migration edit needing review and a fresh DEV run**, not a keyboard change at 2 a.m.

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

Collisions here but not in PP6a involve a **voided** row — a cancel-then-rebook of the same slot, or a `'rescheduled'` **tombstone** left at the original `start_datetime` when a booking was moved (`src/hooks/useTechnicianJobs.ts:248-249`) and the freed slot later refilled. Benign; the guard is right to ignore them. **Expect PP6a, PP6c and SESSION 1's unfiltered P5 to differ from each other; that is not a discrepancy.**

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

**This gates nothing automatically, and GUARD 1 is deliberately NOT loosened to match it** — a fuzzy abort predicate would false-abort on legitimately distinct bookings. This is a **person's** job. If it returns rows, run them through the PP6b shape questions. **Fix the data before applying; do not change the guard.**

### PP6e — has any group been claimed twice, and did it actually send?

```sql
WITH grp AS (
  SELECT lead_id, event_type, start_datetime,
         count(*)                              AS rows_in_group,
         count(*) FILTER (WHERE reminder_sent) AS rows_claimed
  FROM public.calendar_bookings
  WHERE lead_id IS NOT NULL
    AND (status IS NULL OR status NOT IN ('cancelled', 'rescheduled'))
  GROUP BY lead_id, event_type, start_datetime
  HAVING count(*) FILTER (WHERE reminder_sent) > 1
)
SELECT g.lead_id, g.event_type, g.start_datetime, g.rows_in_group, g.rows_claimed,
       (SELECT count(*) FROM public.email_logs e
         WHERE e.lead_id = g.lead_id AND e.template_name = 'inspection_reminder'
           AND e.status = 'sent')                          AS sent_rows_for_this_lead,
       (SELECT count(DISTINCT e.provider_message_id) FROM public.email_logs e
         WHERE e.lead_id = g.lead_id AND e.template_name = 'inspection_reminder'
           AND e.status = 'sent')                          AS distinct_message_ids,
       (SELECT count(*) FROM public.email_logs e
         WHERE e.lead_id = g.lead_id AND e.template_name = 'inspection_reminder'
           AND e.status = 'sent' AND e.provider_message_id IS NULL)
                                                           AS sent_rows_without_provider_id
FROM grp g
ORDER BY g.start_datetime DESC;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. No gate — this is evidence for a PP6b adjudication.

**`rows_claimed` counts CLAIMS, NOT SENDS.** The EF sets `reminder_sent = true` **before** calling Resend (`index.ts:332-338`) and deliberately keeps the claim without sending on a permanent 4xx (`index.ts:444-451`).

| Reading | Meaning |
|---|---|
| `rows_claimed > 1`, `sent_rows_for_this_lead <= 1` | Retained claims. **Not** a duplicate-send incident. |
| `rows_claimed > 1`, `distinct_message_ids > 1` | **CONFIRMED customer-visible duplicate.** Its own ticket, regardless of 0a. |
| `sent_rows_without_provider_id > 0` | **UNDECIDABLE from the DB.** `provider_message_id` is `result.data?.id \|\| null`, and `count(DISTINCT …)` ignores NULLs — two NULL-id sent rows read as zero distinct messages. Resolve in Resend (that recipient + subject) before standing down. |

Both send counts are a **lower bound**: `email_logs` was silently empty on the Framer path until the PromiseLike fix (`index.ts:236-238`), it carries `lead_id` with **no booking id** so it cannot be attributed to one row of the group, and — see **PP15** — if PROD still carries `email_logs_sent_by_fkey`, every system insert into that table has been failing `23503` and the number is structurally zero.

---

## PP7 · Live `booking_status` labels — S4-P5 ⛔

One query. It resolves the type from the column itself, so **there is nothing to substitute by hand**:

```sql
SELECT n.nspname                          AS type_schema,
       t.typname                          AS type_name,
       t.typtype                          AS typtype,   -- 'e' = enum, 'b' = base (e.g. text)
       a.attnotnull                       AS status_is_not_null,
       pg_get_expr(ad.adbin, ad.adrelid)  AS status_default,
       e.enumlabel,
       e.enumsortorder
FROM pg_attribute a
JOIN pg_type      t  ON t.oid = a.atttypid
JOIN pg_namespace n  ON n.oid = t.typnamespace
LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
LEFT JOIN pg_enum    e  ON e.enumtypid = t.oid
WHERE a.attrelid = 'public.calendar_bookings'::regclass
  AND a.attname  = 'status'
ORDER BY e.enumsortorder;
```

**PROD expects** five rows: `public | booking_status | e | false | 'scheduled'::booking_status` with labels `scheduled, in_progress, completed, cancelled, rescheduled` — **no `no_show`** (repo agrees: `20251028135212:86-92`). **PROD value: `UNKNOWN — MUST CAPTURE`.**

**⛔ STOP if `typtype = 'e'` and either `'cancelled'` or `'rescheduled'` is absent.** GUARD 1 then fails with `invalid input value for enum booking_status` under the `ACCESS EXCLUSIVE` lock. Loud and harmless — nothing applies — but never a surprise at the keyboard.

**One row with `typtype <> 'e'` and a NULL `enumlabel`** means `status` is not an enum on this database (probably `text`). The guard's comparison still works. Record it and move on. **There is now no way to confuse that with a mistyped type name** — the old two-query form returned zero rows for both cases.

**PROD-specific reading:**

- **Extra labels are not a STOP, but they change PP6's meaning.** GUARD 1 excludes *only* `'cancelled'` and `'rescheduled'`; any additional live label counts as a real occurrence and can make GUARD 1 abort on a slot a human would consider free. Re-read PP6b's `statuses` arrays with Shape D in mind.
- **`'completed'` is deliberately NOT excluded.** A completed row is an occurrence that really happened; two in one slot deserve a person's attention.
- **The drift is documented and real.** `set_reminder_scheduled_for()` in the repo tests `NEW.status IN ('cancelled','completed','no_show')` (`20260218000001:18`) against an enum with no such label — that body **cannot execute**, which independently proves the live function is not the repo function. DEV's D16 confirmed it. **Read the live catalog; do not read the migration files.**

---

## PP8 · Triggers on `calendar_bookings`, and their **live** bodies — S4-P6 ⛔

### PP8a — the triggers

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
| `update_calendar_bookings_updated_at` | `BEFORE UPDATE … FOR EACH ROW`, **no column list** (`20251111000016`, PART 5) | Any `UPDATE`-based backfill would rewrite `updated_at` on **100 %** of rows. The migration uses an `ALTER` instead, and **`ALTER TABLE` rewrites fire no row triggers** — that is the whole basis of the B5/A4 identity. |
| `trigger_set_reminder_scheduled_for` | `BEFORE INSERT OR UPDATE OF start_datetime, status` (`20260218000001:34-37`) | Column-scoped, so it would not have fired on a `booking_group_id` write either. |

### PP8b — the live function bodies ⛔

```sql
SELECT n.nspname AS function_schema,
       p.proname AS function_name,
       pg_get_functiondef(p.oid) AS live_body
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.oid IN (
  SELECT DISTINCT tg.tgfoid
  FROM pg_trigger tg
  JOIN pg_class     c  ON c.oid  = tg.tgrelid
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public'
    AND c.relname  = 'calendar_bookings'
    AND NOT tg.tgisinternal
)
ORDER BY p.proname;
```

**Read both bodies. Do not skim them.** The A4/A5 identities rest on `update_updated_at_column()` doing nothing but `NEW.updated_at = NOW()` — a claim the pack previously took on the authority of a migration file, on a database where this exact class of object has already drifted out-of-band (D16).

**⛔ STOP if that body writes to any other table, or to `audit_logs`** — A5's "zero audit rows" claim is then void.

`set_reminder_scheduled_for()` **is expected to differ** from `20260218000001`. That divergence is context, not a gate.

### ⛔ STOP rules, PROD-specific

- **More than two triggers ⇒ read every extra one before applying, and paste it.**
- **Anything named `audit`, or any `AFTER INSERT` / `AFTER UPDATE` trigger, is an immediate STOP.** `CLAUDE.md` fixes the audit foundation at 29 triggers across 10 tables and `calendar_bookings` is **not** one of them — but the repo has been wrong about live triggers before, and PROD is where that shows up.
- **Read `tgenabled` on each.** `'O'` is normal (origin). `'D'` = **disabled** — if `update_calendar_bookings_updated_at` is disabled on PROD, the A4 fingerprint identity becomes weaker evidence than on DEV (it would hold for a second reason); say so in the record rather than claiming a proof you did not get. `'A'` / `'R'` (replica) are unexpected and warrant a read.
- Any `AFTER INSERT` trigger is also context Step 0b needs.

---

## PP9 · Index-name collision and count — S4-P7 = B4 ⛔

### PP9a — is the name free **in the schema**? ⛔ **run this FIRST**

```sql
SELECT to_regclass('public.idx_calendar_bookings_booking_group_id') AS name_already_taken,
       (SELECT c.relkind FROM pg_class c
         WHERE c.oid = to_regclass('public.idx_calendar_bookings_booking_group_id')) AS relkind,
       (SELECT tn.nspname || '.' || t.relname
          FROM pg_class c
          LEFT JOIN pg_index     i  ON i.indexrelid = c.oid
          LEFT JOIN pg_class     t  ON t.oid = i.indrelid
          LEFT JOIN pg_namespace tn ON tn.oid = t.relnamespace
         WHERE c.oid = to_regclass('public.idx_calendar_bookings_booking_group_id')) AS attached_to_table;
```

**PROD expects `name_already_taken` = NULL.**

**⛔ STOP on any non-NULL value, whatever `relkind` says** — `r` / `v` / `S` / `i` all collide, because `CREATE INDEX` needs the name free across the whole `public` schema, not just on this table. The migration's SECTION 3 is a bare `CREATE INDEX` with no `IF NOT EXISTS`, so a collision fails at `42P07` **mid-transaction, after the `ACCESS EXCLUSIVE` rewrite has already run**. `pg_indexes` filtered by `tablename` cannot answer that question and **must not be used as the gate**.

### PP9b — the list and the count

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
ORDER BY indexname;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. Record **the full list AND the count**. DEV: 9 (pkey, inspection_id, lead_start, reminder_pending, start_time, tech_date_status, tech_end_time, technician_id, technician_time), all traceable to repo migrations.

- **A3's expectation is *your* count + 1, with nothing removed.** DEV's AFTER count was 10 because DEV's BEFORE count was 9. **Do not carry "10" to PROD.**
- An index on PROD this repo cannot account for is a **forked-history finding** in its own right. Not a STOP for 0a — record it and raise it separately.
- A large `indexes_size` from PP3b means the in-transaction `CREATE INDEX` contributes more to the lock window; fold it into the PP3 banding.

---

## PP10 · RLS posture — S4-P8

```sql
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
ORDER BY policyname;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV showed exactly one (SF-1): `authenticated_full_access_bookings`, `cmd = ALL`, `roles = {public}`, `qual` and `with_check` both `((SELECT auth.uid()) IS NOT NULL)`.

**No gate.** A column added to an existing table is covered by that table's existing policies. This confirms PROD agrees with DEV *before* that reasoning is relied on, per HANDOFF P0.

**Capture it anyway, because it is somebody's business:** if PROD matches DEV, **every authenticated user can read and write every booking row, including other technicians'.** That is standing finding **SF-1**, it needs its own ticket, and it is explicitly not fixed here. It should also change how anyone reads the fifteen `.eq('assigned_to', …)` filters in `src/` — those are UX scoping, not a security boundary.

---

## PP11 · Grants — S4-P9

### PP11a — table-level

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

No gate. **Record whether SF-3 reproduces on PROD:** `anon` holding SELECT/INSERT/UPDATE/DELETE on the live bookings table means RLS (enabled, **not forced**, single `auth.uid() IS NOT NULL` policy) is the sole control, and `anon` is denied only because `auth.uid()` is NULL. It materialises the moment RLS is disabled on the table or a permissive `anon` policy is added. Its own ticket.

### PP11b — column-level ACLs, with the discriminator ⛔ conditional

⚠️ **Do NOT use `information_schema.column_privileges`.** That view unions column-level ACLs *with* table-level ACLs expanded one row per column, so on a normal Supabase table it returns rows for `anon`, `authenticated` and `service_role` whether or not a single column-level grant exists. Reading it literally produces a **guaranteed false STOP**.

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

```sql
SELECT (SELECT count(*)
          FROM pg_attribute a
         WHERE a.attrelid = 'public.calendar_bookings'::regclass
           AND a.attnum > 0 AND NOT a.attisdropped
           AND a.attacl IS NOT NULL)                                       AS columns_with_own_acl,
       has_table_privilege('authenticated','public.calendar_bookings','INSERT') AS authenticated_table_insert,
       has_table_privilege('authenticated','public.calendar_bookings','UPDATE') AS authenticated_table_update,
       has_table_privilege('service_role','public.calendar_bookings','INSERT')  AS service_role_table_insert,
       has_table_privilege('service_role','public.calendar_bookings','UPDATE')  AS service_role_table_update;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: 0 rows / `0 | true | true | true | true`.

**⛔ STOP only if `columns_with_own_acl > 0` AND any of the four `*_table_*` booleans is `false`.**

`has_table_privilege` reports **TABLE-level** privilege only, so those four booleans answer exactly the question this gate asks: *will a newly added column inherit a usable grant?* A column-level grant on an unrelated column does not remove or weaken the table grant, and a newly added column falls back to the table ACL. **`columns_with_own_acl > 0` with all four `true` is a forked-history curiosity for its own ticket — not a reason to stop a live apply.** Zero columns with their own ACL and four `true`s is the expected, healthy answer.

**Why the gate exists at all (S4-R4).** The migration adds no `GRANT`, on the reasoning that a new column inherits the *table's* grants (`pg_default_acl` only auto-grants on new **tables and functions**). That reasoning has exactly one failure mode: if the writer roles hold **no** table-level INSERT/UPDATE and access is granted per column instead, a newly added column receives **no privilege at all**, and every write naming `booking_group_id` fails with `42501 permission denied for column`. **The failure is latent** — nothing names the column until Step 2's fan-out writer, so on PROD it would surface **months later, in the field, on a real booking.**

---

## PP12 · Baselines — S4-P10 (no gates, but the AFTER checks need them)

### PP12a — orphan bookings = B6

```sql
SELECT count(*) FILTER (WHERE lead_id IS NULL) AS bookings_with_null_lead_id,
       count(*)                                AS bookings_total
FROM public.calendar_bookings;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: 0 orphans / 3 total.

`calendar_bookings.lead_id` is `ON DELETE SET NULL` (`20251028135212:624`), so these are orphans of deleted leads. GUARD 1 excludes them by design — grouping unrelated orphans that merely share an `event_type` and a timestamp would produce a **false abort**. Every orphan still gets its own group id, so it counts toward A2 and A7.

**PROD has exactly one documented orphan source, and it is days old.** `docs/TEST_LEAD_PURGE_ZZ_TEST_MICHAEL.md` (26 Aug 2026) deleted a lead relying on CASCADE and records in terms that `calendar_bookings` is `SET NULL` from `leads`, "so they survive with a null `lead_id` — that is intended". Any orphan you see most likely traces to that. By contrast the 5 Aug purge (`docs/TEST_LEAD_PURGE_RUNBOOK.md`) deleted its 11 bookings outright and left none. **A count materially larger than that history explains is its own finding and its own ticket, not a 0a gate.**

### PP12b — reminder-state baseline (Step 0b's BEFORE evidence)

```sql
SELECT status, event_type, reminder_sent, count(*)
FROM public.calendar_bookings
GROUP BY status, event_type, reminder_sent
ORDER BY status, event_type, reminder_sent;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. DEV: `scheduled/inspection/unsent = 2`, `cancelled/inspection/unsent = 1`.

Capture **before** Step 0a, and again **after** Step 0b's Edge Function has been deployed and has run once on PROD. Step 0b's entire claim is that its group-aware `UPDATE` is byte-identical in effect to today's per-row CAS while every group holds one row. **This table is the evidence, and without the BEFORE capture there is nothing to compare against.**

> The 0b runbook's `P-E1`/`P-E2` are **not** in this pack and **cannot run on PROD until 0a is applied there** — see §0.1's ordering rule. The pre-0a variant and PROD's measured zeros are recorded there.

### PP12c — audit_logs baseline, scoped = B7

```sql
SELECT count(*) AS audit_rows_before
FROM public.audit_logs
WHERE entity_type = 'calendar_bookings';
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`, almost certainly 0. DEV: 0.

**The `WHERE` clause is load-bearing — do not simplify it back.** 29 triggers on 10 *other* tables write `audit_logs` on every ordinary lead edit, inspection save or photo write, so on **PROD, during business hours, an unscoped delta measures whether anyone used the app.** `audit_log_trigger()` records the source table in `entity_type` (`20260311000001:12-21`), so scoping it makes A5 mean what it says: a non-zero delta can only be an audit trigger on `calendar_bookings` that neither this repo nor DEV has.

---

## PP13 · The reminder cron, the second caller, and the drain proof — S4-P11 ⛔ **timing**

### PP13a — what is scheduled, with identity columns attached

```sql
SELECT current_database()                                              AS db,
       inet_server_addr()                                              AS server_addr,
       (SELECT count(*) FROM public.leads)                             AS leads_rows,
       j.jobid, j.jobname, j.schedule, j.active,
       substring(j.command from 'https://([a-z0-9-]+)\.supabase\.co')  AS target_project_ref,
       j.command
FROM cron.job j
ORDER BY j.jobname;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. Expect `send-inspection-reminders` on `0 * * * *` and probably `check-overdue-invoices` on `0 23 * * *`. (If `cron.job` is unreadable or the extension is absent, record that and say so.)

⚠️ **`target_project_ref` is NOT an identity check and must never be read as one.** DEV's jobs 3 and 4 target `ecyivrxjpsmjmexqatym` too (D11 — that is SF-5), so this output is **indistinguishable on the two databases** apart from `leads_rows` and `server_addr`. **PP1a's `leads_rows` is the only identity check in this pack.** If `leads_rows` here disagrees with what PP1a returned, stop and work out why before doing anything else.

### What is different on PROD

`20260601120000_fix_cron_auth_headers.sql:7-8, 21-30` is the **live** schedule: it `cron.unschedule`s both jobs created by `20260218000003` and `20260420000000` (whose originals sent **no** Authorization header and therefore 401'd on every firing) and re-creates them, posting to `https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder` **every hour on the hour, 24/7**, with `'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')`. That Vault read is the mechanism SF-5 is about. **Confirm against PP13a's `command` column what is actually scheduled on PROD — do not infer it from either migration file.**

The Edge Function then runs `UPDATE calendar_bookings SET reminder_sent, reminder_sent_at` (`index.ts:333-338`) and a row-scoped release (`index.ts:460-464`) — **both fire `update_calendar_bookings_updated_at` and move `updated_at`.**

**On DEV, this table had no scheduled writer at all.** On PROD it has a scheduled writer **and** a second, unauthorised caller:

1. **PROD's own pg_cron** fires at `:00` with a PROD-Vault bearer.
2. **DEV's pg_cron** fires at `:00` with a **DEV-Vault bearer that PROD accepts** — **SF-5**, proven not suspected: DEV's `net._http_response` id 1377 shows `200`, and PROD's own run summary `{"processed":1,"sent":0,"failed":0,"skipped":0,"alreadyClaimed":1,"released":0}` at `2026-08-30 09:00:00.023502+00`.

**So PROD's `send-inspection-reminder` is invoked TWICE at every `:00`.** Expect **two** `Processing N booking row(s) in M group(s)` lines per hour on PROD; **that is not fan-out.** The per-row CAS absorbs it (`alreadyClaimed:1, sent:0` is the live proof), so it is not a duplicate-email source today. SF-5 is **live and unremediated** and out of scope for this pack — the point here is that both callers converge on the same minute, making the top of the hour *busier*.

### ⛔ The apply window, concretely

**Start the apply between `:10` and `:20`. Never between `:45` and `:10`.**

The whole transaction is budgeted at up to ~4 × 60 s (PP3), so a `:12` start finishes by roughly `:16` and clears the next top-of-hour by ~44 minutes. **`:00`–`:10` is the burst, not the safe zone:** PROD's own pg_cron fires at `:00` and DEV's SF-5 twin fires at `:00` as well.

**Why the asymmetry matters.** A blocked **claim** is recoverable — the select uses `.lte('reminder_scheduled_for', now)` with no lower bound, so a missed hour retries. A blocked **release** is not: `index.ts:460-464` sets `reminder_sent` back to false only on a transient failure and `index.ts:470-472` merely logs `releaseError`. A booking claimed at `:00`, whose send fails transiently, whose release is then blocked by `ACCESS EXCLUSIVE` until it errors, stays `reminder_sent = true` **forever** and that customer's 48-hour notice is silently lost.

### ⛔ Prove the burst has drained — do not assume it

Run **both**, immediately before pasting the migration.

```sql
SELECT jobid, runid, status, start_time, end_time,
       end_time - start_time AS duration,
       left(return_message, 200) AS return_message
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'send-inspection-reminders')
ORDER BY start_time DESC
LIMIT 10;
```

```sql
SELECT max(updated_at)          AS newest_booking_write,
       now() - max(updated_at)  AS since_last_write,
       now()                    AS now_server
FROM public.calendar_bookings;
```

pg_net posts asynchronously, so `cron.job_run_details` shows a near-zero duration for the job itself — **the EF's own writes land back through PostgREST minutes later, which is what `since_last_write` measures.**

**⛔ If `since_last_write` is under ~3 minutes, the hour's run is still landing. Wait.**

### The daily job is on a different clock — read it, do not assume it

```sql
SELECT now()                                    AS now_server,
       current_setting('TimeZone')              AS session_timezone,
       current_setting('cron.timezone', true)   AS cron_timezone,
       now() AT TIME ZONE 'Australia/Melbourne' AS now_melbourne;
```

**Also avoid `23:00`–`23:10` UTC — which is `09:00`–`09:10` Melbourne in AEST (`10:00`–`10:10` AEDT), i.e. business hours, not the middle of the night.** `check-overdue-invoices` fires at `0 23 * * *`, and **pg_cron schedules in the database's timezone, not yours** (`20260420000000_create_overdue_invoices_cron.sql:1` says so: "23:00 UTC (9:00 AM AEST)"). Like the reminder job it is fired twice — DEV's jobid 3 targets PROD as well (D11). It writes `invoices`, not `calendar_bookings`, so it does not contend for this lock; it is simply more concurrent load for no benefit.

Every `:MM` in this section is a minute of the hour and so is timezone-free; only the daily `23:00` job needs this conversion.

### What straddling `:00` costs, specifically

1. **The lock.** Both invocations' `UPDATE`s queue behind `ACCESS EXCLUSIVE`. They either time out — **skipping or partially claiming that hour's real customer reminders, with the unrecoverable release case above** — or one wins the race and the migration loses its own 3 s `lock_timeout` and aborts.
2. **Verification A4.** A cron write between B5 and A4 moves `updated_at` on any row it claims, changing the fingerprint for a reason unrelated to this migration.
3. **Verification A2/A7.** A concurrent write is not a row-count change, but a *new booking* created in the window is — see §3.

> **Why pausing the cron is deliberately NOT in this pack.** Pausing means `cron.unschedule('send-inspection-reminders')`, which is a **write**, and a reminder job left unscheduled **stops every customer inspection reminder silently** — nothing errors, nothing logs, and the next person to notice is a customer who did not get their 48-hour notice. A pre-flight pack must be safe to run in full, at any hour, by someone tired; a statement whose failure mode is silent and customer-facing does not belong in one. If it is genuinely needed, it belongs in the **deploy runbook** as an explicit step with its own restore gate — captured verbatim from PP13a, restored verbatim, confirmed by re-running PP13a. A `:10`–`:20` start plus the drain proof makes it unnecessary.

---

## PP14 · HANDOFF **P0** — re-harvest the technician-referencing RLS policies

> **⛔ READ THIS FIRST: this gates STEP 1 (`lead_assignments` + the 16-policy RLS rewrite), NOT Step 0a.** A difference here does **not** block the 0a apply. Capture it now purely because the human is already in PROD's Studio with the ritual done.

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

| Diff result | Consequence |
|---|---|
| Identical to DEV | SESSION 1 §5f's 32 DDL statements are a work order. |
| PROD has a policy DEV lacks | It needs its own rewrite authored; the "16 policies / 20 bodies / 32 statements" figure is wrong and must be recomputed. |
| PROD lacks a policy DEV has | A `DROP POLICY` in §5f will fail; re-derive, do not patch. |
| Same names, different predicate bodies | **The most dangerous shape.** A `DROP`+`CREATE` would silently replace PROD's real policy with DEV's. Stop and re-author. |

- **Statement form is `DROP POLICY` + `CREATE POLICY`, never `ALTER POLICY`** — a comment-stripped replay of all 124 migrations finds 211 CREATE / 88 DROP / **0 ALTER**.
- **Do not forget the deliberate exclusion.** One of the 17 is excluded on purpose (HANDOFF §6): post-migration, `tech_update_assigned_leads` must **still** read `(assigned_to = auth.uid())` in **both** bodies. It looks exactly like an omission to a reviewer.

---

## PP15 · `email_logs.sent_by` FK — was `20260813120000` applied to PROD? (**G3, new**)

> **Not a 0a gate and not a 0b deploy blocker — emails still send either way.** But if it fires, §6.3 and §6.4 of the 0b runbook are **unusable on PROD**, and that must be raised **before** the 0b deploy, not discovered after it.

```sql
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.email_logs'::regclass
  AND contype  = 'f'
ORDER BY conname;
```

**PASS = `email_logs_lead_id_fkey` and `email_logs_inspection_id_fkey` only, with `email_logs_sent_by_fkey` ABSENT.**

**PROD expects:** `UNKNOWN — MUST CAPTURE`. **DEV still carries `email_logs_sent_by_fkey → auth.users(id)`** (measured 2026-08-31).

**⚠️ Ask the right question.** It is **not** "does `SYSTEM_USER_UUID` resolve to an `auth.users` row?" — **it should not, by design, on either project.** The sentinel `a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f` is deliberately not an `auth.users` row (`docs/system-user-uuid.md`), mirroring `audit_logs.user_id`, which intentionally carries no FK. A zero from an `auth.users` lookup is the **expected and correct** answer and proves nothing. **Do not gate on it.**

The question is **"was `supabase/migrations/20260813120000_drop_email_logs_sent_by_fkey.sql` applied to PROD?"** — and it must be verified **live**, from `pg_constraint`, never from repo file presence. DEV never received that migration (forked history), which is why every system `email_logs` insert on DEV fails `23503`.

**If `email_logs_sent_by_fkey` is present on PROD:**

| Consequence | Detail |
|---|---|
| PROD's reminder `email_logs` writes have been failing `23503` all along | Non-fatal by design: `logReminderEmail` catches everything; `sent++` is driven by `result.success`, and the release by `result.success` / `isPermanentFailure`. The claim, the counters, the release and the customer email are unaffected. |
| 0b runbook §6.3 (duplicate detector) and §6.4 (`sent_by` attribution) are **unusable on PROD** | Their zeros would be environmental, not evidence. |
| PP6e's send counts are structurally zero | Read them as no evidence, not as "no duplicates". |
| Action | **Raise before the 0b deploy.** It does not block the deploy. |

---

## 2 · THE BEFORE CAPTURE SHEET — B0…B7, uncommented

The migration file carries B1…B7 inside `--` comments, so they are **not runnable as shipped**. Here they are as SQL — **and two of them have been CHANGED, not merely uncommented:**

- **B5** pins with `coalesce(created_at, '-infinity'::timestamptz) <= t0`, where the migration file (line 579) has a bare `created_at <= t0`. `created_at` is nullable (`DEFAULT NOW()`, no `NOT NULL`), and the bare form silently drops those rows from the fingerprint.
- **The A4 discriminator** (§3) carries the same `coalesce`, for the same reason — the migration file's version at line 652 does not.

> **Where this pack and the migration file's comment block disagree, THIS PACK WINS, and B5 and A4 must both be run from here.** Running B5 from one and A4 from the other guarantees a mismatched digest on any row with a NULL `created_at`. This supersedes `SESSION-4-PROD-PREFLIGHT.md` §2's "use the versions in the migration file" **for B5/A4 only**; it still holds for B7/A5, which are unchanged.

**B1, B3, B4, B6 and B7** are the same queries as PP3a, PP2, PP9b, PP12a and PP12c — if you ran those in this same Studio session and nothing has been applied since, record the same numbers here rather than re-running.

**⛔ B2 and B5 are different: BOTH must be re-taken in the apply window, immediately before pasting the migration.**

- **B5** because the table has a scheduled writer (PP13).
- **B2** because it is GUARD 1's rehearsal against a table that `src/lib/bookingService.ts:119` and `src/components/leads/BookJobSheet.tsx:433` can write to at any moment — the latter does DELETE-then-INSERT on every reschedule. A booking created after PP6b forms a new natural-key collision, and **GUARD 1 then aborts *after* `ACCESS EXCLUSIVE` has been taken and every booking read in the app has queued behind it.** A clean PP6b an hour ago is history, not a gate.

**Same 30-minute rule for both: if more than ~30 minutes elapse between B2/B5 and the apply, re-take them.**

---

### B0 · Choose `t0` — run this FIRST, immediately before B5

```sql
SELECT now()                       AS t0,
       now()::text                 AS t0_literal,
       current_setting('TimeZone') AS session_timezone;
```

**Copy `t0_literal` EXACTLY as returned — every digit, and the trailing offset (`+00`, `+10`, …).**

**Paste that literal verbatim into B5, and again into A4 and A4's discriminator. Do not retype it. Do not reformat it. Do not drop the offset** — a bare timestamp is interpreted in the *session's* `TimeZone`, so if A4 runs in a different Studio tab with a different `TimeZone`, the pinned row set silently changes and the fingerprint comparison becomes meaningless.

```
t0_literal = ______________________________________________
```

### B0b · How many rows have a NULL `created_at`? (run once, alongside B0)

```sql
SELECT count(*)                                    AS rows_total,
       count(*) FILTER (WHERE created_at IS NULL)  AS rows_with_null_created_at,
       count(*) FILTER (WHERE updated_at IS NULL)  AS rows_with_null_updated_at
FROM public.calendar_bookings;
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. **Not a gate — but write it down.** Those rows are inside B5/A4's pinned set, and they are the ones the A4 discriminator can only see with the `coalesce`. Knowing the number before the apply turns a surprising A4 into arithmetic instead of an incident.

**Timing rule, PROD-specific:** take B0/B5 inside the same `:10`–`:20` window as the apply, after PP13's drain proof passes.

---

### B1 · Row count — the denominator for every AFTER identity (= PP3a)

```sql
SELECT count(*) AS bookings_before FROM public.calendar_bookings;
```

**DEV: 3. PROD: `UNKNOWN — MUST CAPTURE` → `B1 = __________`**

---

### B2 · GUARD 1's predicate as a query — MUST RETURN ZERO ROWS (= PP6b) · **re-take in the window**

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

**DEV: 0 rows. PROD: MEASURED 0 rows on 2026-08-31 — re-confirm. Any row ⇒ STOP.**

---

### B4 · Index list and count (= PP9b)

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
ORDER BY indexname;
```

**DEV: 9, `idx_calendar_bookings_booking_group_id` absent. PROD: `UNKNOWN — MUST CAPTURE` → `B4 count = __________` (A3 is this + 1).** The name-collision gate is **PP9a**, not this listing.

---

### B5 · `updated_at` fingerprint — the "nothing behaved differently" proof · **re-take in the window**

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

Load-bearing notes:

- **The row set is pinned by `created_at <= t0` precisely because PROD's table has a scheduled writer** (PP13). The pin also excludes bookings *created* during the window — which is what you want.
- **`coalesce(created_at, …)`** because a NULL `created_at` would otherwise drop that row from the fingerprint while B0b says it exists.
- **It fingerprints `extract(epoch …)`, not `updated_at::text`,** because casting a `timestamptz` to text renders through the *session's* `TimeZone` and `DateStyle`.
- **`coalesce(…, 'NULL')` on the epoch** because `updated_at` is nullable; without it `string_agg` drops NULL rows and silently shrinks the fingerprint's coverage.
- `newest_updated_at` is display-only (it renders in the session `TimeZone`). **Ignore it.** `row_count` and `fingerprint` are the identity.
- On PG14+ `extract(epoch FROM timestamptz)` returns `numeric`; on PG13 and earlier, `double precision`, whose `::text` is governed by `extra_float_digits`. Both runs are on the same database — **unless you change `extra_float_digits` between them. Don't.** (PP1 records the version.)

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

Do not carry DEV's AFTER expectations across. **PROD is a live system with real writers.**

| Check | DEV expectation | **PROD expectation** |
|---|---|---|
| **A1** column shape | `booking_group_id \| uuid \| NO \| gen_random_uuid()` | **Identical.** `is_nullable = YES` ⇒ the NOT NULL did not take, **STOP**. `column_default` NULL ⇒ every future INSERT that omits the column will now FAIL, **STOP and roll back**. |
| **A2** `bookings \| distinct_groups \| nulls` | `3 \| 3 \| 0` | **`bookings = distinct_groups` AND `nulls = 0` is the load-bearing part — NOT the match to B1.** A booking created between B1 and the apply makes `bookings > B1` legitimately. Compare `bookings` to a **fresh `count(*)`**, not to B1. |
| **A3** index list | B4's list + the new index, nothing removed | **Identical rule, against PROD's own B4 count + 1** — not against DEV's 10. |
| **A4** fingerprint | identical digest to B5 | **Identical rule.** Survives new bookings unchanged, because the row set is pinned by `created_at <= t0`. If the digest differs, run the discriminator **below** before concluding anything. |
| **A5** audit rows | identical to B7 | **Identical rule** — and it holds on PROD *because* it is scoped to `entity_type = 'calendar_bookings'`. Do not simplify to an unscoped `count(*)`. |
| **A6** GUARD 1 predicate | 0 rows | **0 rows — with one PROD-only caveat.** If it returns rows, check their `created_at` first: a booking created *after* the apply can form a new natural-key collision through ordinary use — new activity, not a migration failure. Rows created *before* the apply would mean GUARD 1 did not run. |
| **A7** groups | `1 \| 3` | **one row, `rows_in_group = 1`, `number_of_groups` = the CURRENT row count** (every row, orphans and cancelled included). **This is not PP6a's `number_of_groups`.** On DEV those were 3 and 2. Any `rows_in_group > 1` before Step 2 ships means something fanned out early — **STOP and do not deploy the reminder Edge Function.** |
| **A8** | `true` | The `booking_group_id IS NULL` count must be 0 — a tautology while `NOT NULL` holds, which is the point. |

### The A4 discriminator — use THIS form, with the same `t0_literal` in both places

```sql
SELECT count(*) AS rows_touched_since_t0
FROM public.calendar_bookings
WHERE coalesce(created_at, '-infinity'::timestamptz) <= '<PASTE t0_literal HERE>'::timestamptz
  AND updated_at > '<PASTE t0_literal HERE>'::timestamptz;
```

A non-zero result is almost certainly the hourly reminder cron (or its SF-5 twin) and **that is your explanation**. `ALTER TABLE` rewrites fire no row triggers. **Only a changed digest with a zero result here is unexplained.**

> **The `coalesce` is not optional.** The migration file's version (line 652) uses a bare `created_at <= t0`, which drops exactly the rows B5 deliberately includes — so an ordinary cron write to a NULL-`created_at` row would produce a changed digest **and** a zero discriminator, i.e. a declared incident, at the exact moment you have just applied DDL to a live customer database. B0b tells you in advance whether any such row exists.

> ⚠️ **You will NOT see the guards pass.** Both announce success with `RAISE NOTICE`, and the Studio SQL editor renders result sets and errors but **not** server NOTICE messages. A clean apply shows only *"Success. No rows returned."* — indistinguishable from a run where a guard had been edited out. **A2 and A6 are therefore the only operator-visible proof, and they are not optional.** A2 restates GUARD 2's identity; A6 restates GUARD 1's predicate. The only *pre-hoc* check for a removed guard is §6 correction 0.

---

## 4 · THE SF-5 / SF-6 INFORMATIONAL READS

### PP17 · `functions list` — record the baselines for BOTH functions (terminal, not Studio)

State the ref and its role aloud and get confirmation, exactly as for the SQL. Read-only; applies nothing.

```
npx supabase functions list --project-ref ecyivrxjpsmjmexqatym -o json
```

**PROD expects:** `UNKNOWN — MUST CAPTURE`. Record, for **both** `send-inspection-reminder` and `calculate-travel-time`: `id`, `slug`, `status`, **`version`**, **`verify_jwt`**, `created_at`, `updated_at`.

**⛔ Check the output actually contains `verify_jwt` for both slugs.** `-o` is a root-level persistent flag described as "output format of status variables", and the pretty table has **no `verify_jwt` column**. If a formatted table is printed, or the JSON has no `verify_jwt` key, **the value has NOT been captured** — and the 0b deploy makes it unrecoverable. Fall back to the Management API, which is where the CLI gets it (token from your shell env, never pasted inline):

```
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" https://api.supabase.com/v1/projects/ecyivrxjpsmjmexqatym/functions
```

The per-function detail page in the dashboard is a third route. **Do not proceed to the 0b deploy gate until `verify_jwt` for `send-inspection-reminder` is written down.**

**Why it belongs in this pack even though it gates nothing in 0a:**

1. **It is the before-baseline for the 0b and 0c deploy gates.** Those gates assert `version` **+1** and `verify_jwt` **unchanged** after each deploy. A baseline captured after the fact is not a baseline.
2. **It is the SF-5 H2 discriminator, and the Step 0b deploy destroys it.** `supabase/config.toml` has **no** `[functions.send-inspection-reminder]` section, so every CLI deploy re-asserts the default `verify_jwt = true`. If PROD currently reads `verify_jwt = false`, the DEV→PROD calls are passing because the gateway is not checking at all (H2) — and the 0b deploy will flip it to `true` and silently change that behaviour, including whether the SF-5 second invocation continues at all. **It is also the input to the rollback command**: a rollback deploy re-asserts `true` too unless it carries `--no-verify-jwt`. **Capture it now or the question becomes unanswerable.**
3. Record any function on PROD that `docs/edge-function-attribution-manifest.md` does not list.

**⛔ `version` is NOT identity — SF-6.** DEV's deployed `send-inspection-reminder` is blob `fab3d39a…` (commit `c9761b6`), **one commit behind** `main`/`production`'s `bf95002f…`, and its version number said nothing about that. **The deployed-source hash capture is a separate mandatory gate (G1) in the 0b/0c runbook** — `functions download --use-api --workdir <empty dir>` then `git hash-object` on the specific `index.ts`. Round-trip fidelity is proven (downloaded bytes hashed to an exact historical git blob), so `hash-object` on a download is valid — but **the download also writes `supabase/.temp/**`, so NEVER verify by tree cleanliness** (G2).

**Two operational rules regardless:** the CLI is pinned at **2.101.0** (2.116.0 exists — **do NOT upgrade mid-sequence**; it would change the bundler between the DEV rehearsal and the PROD deploy), and **do not run `functions deploy` from this window** — deploys are their own gated step with their own identity checks and their own decision table.

### PP18 · The Vault claims query — **not in this pack**

SF-5's discriminating query (`SF-5-prod-credential-in-dev-vault.md` §3) decodes the **JWT payload claims only** (`ref`, `role`, `iat`, `exp`, never the token itself) of the Vault secret named `service_role_key`. **The H1/H2 discriminator targets DEV `ctppzqnysmzynkxjlzta`** — the question is *"what is inside **DEV's** Vault secret, and is it PROD-signed?"*, and decoding **PROD's** own entry answers nothing about that.

**It is not a 0a gate in any form.** Nothing in this migration reads, writes or depends on Vault.

There *is* a separate, later, PROD-targeted claims check — it belongs to the **0b deploy runbook's `verify_jwt` decision (§A.3.1)** and to SF-5 §5's pre-rotation task, each with its own PASS criteria (exactly one row; `key_kind`, `ref_claim`, `role_claim`; `expires_at` in the future) and its own runbook. **Run it there, not here.**

---

## 5 · STOP CONDITIONS — any ONE of these means do not apply 0a on PROD

Paste the output and wait.

| # | Condition | Block |
|---|---|---|
| 1 | `leads_rows` looks like DEV, is materially below **144**, or the ref in the address bar is not `ecyivrxjpsmjmexqatym` | PP1a |
| 2 | `builtin_gen_random_uuid` is NULL | PP1b |
| 3 | `booking_group_id` (or `group_id` / `booking_group`) already exists | PP2 / B3 |
| 4 | `calendar_bookings_rows ≥ 500,000` **or** `table_size ≥ 1 GB` | PP3a / PP3b / B1 |
| 5 | Free disk (Dashboard → Settings → Database) is less than `peak_extra_space_the_rewrite_needs` plus margin | PP3c |
| 6 | `is_owner_inherited` **and** `is_owner_via_set_role` are both false | PP4 |
| 7 | Any event trigger with `fires_on_this_migration = true` whose `evtname` is not `pgrst_ddl_watch` | PP5 |
| 8 | Any `rows_in_group > 1` | PP6a / PP6b / B2 |
| 9 | `typtype = 'e'` and `'cancelled'` or `'rescheduled'` is absent | PP7 |
| 10 | More than the two known triggers — **especially anything named `audit`, or any `AFTER` trigger** — **or** a live trigger-function body that writes to another table | PP8a / PP8b |
| 11 | `to_regclass('public.idx_calendar_bookings_booking_group_id')` is not NULL | PP9a |
| 12 | `columns_with_own_acl > 0` **AND** any writer role lacks the corresponding TABLE-level privilege | PP11b |
| 13 | The apply cannot be started in the `:10`–`:20` window (i.e. it would straddle `:45`–`:10`, when PROD's cron **and** its SF-5 DEV twin both fire), **or** the pre-lock drain check shows a booking write in the last ~3 minutes | PP13 |

**Human gates — not automatic STOPs, but a person must look before the apply:** PP6d (near-miss pairs) and PP6e (groups claimed more than once).

**Not a stop for 0a, but capture it while you are here:** PP14 (HANDOFF P0 — gates Step 1), **PP15 (G3 — raise before the 0b deploy)**, PP17 (SF-5/SF-6 baselines — gates the 0b/0c deploys).

---

## 6 · HANDOFF TO THE APPLY — four corrections that came out of the DEV run and the review

Not part of this pack. Stated here so the gate results are handed over with them attached.

**0. Verify the bytes before they reach the editor.** Two read-only commands. No checkout, no working-tree change, literal paths, one line each:

```
git -C /Users/michaelyoussef/mrc-app-1 cat-file blob 6d4cb51db8c0251098307fc4b7fcc94fa9b4356b | git hash-object --stdin
```
must print exactly `6d4cb51db8c0251098307fc4b7fcc94fa9b4356b`.

```
git -C /Users/michaelyoussef/mrc-app-1 cat-file blob 6d4cb51db8c0251098307fc4b7fcc94fa9b4356b | pbcopy
```
the clipboard now holds the pinned migration, byte for byte.

**Paste from that clipboard. Do not open the file in an editor first, and do not retype any part of it.** This is the **only** check that exists for a removed guard: Studio does not render `RAISE NOTICE`, so a clean apply and an apply with GUARD 1 deleted look identical on screen — and on clean data A2 and A6 look identical too. S4-R2 names "a person editing the guard out at a keyboard under time pressure" as the real danger; this is the one command that answers it.

**1. The migration body from `BEGIN;` to `COMMIT;` is ONE Studio execution.** Do not run it statement by statement — that drops the `SET LOCAL` timeouts and the `LOCK TABLE`, and every protection in the file with them.

**2. A non-Postgres error (browser timeout, wifi drop, gateway 5xx) is NOT proof of rollback.** DEV's apply committed *during* a wifi drop and looked like a failure, and PP3 explains why a browser-side timeout is a **likely** outcome above ~10,000 rows. **Run A1 first. Do not re-paste blind.** A1 shows the column ⇒ it applied; proceed to A2…A8. A1 shows nothing ⇒ the transaction rolled back and a clean re-paste is safe. The bare `ADD COLUMN` is the backstop either way: a blind re-paste against an applied migration fails loudly at `42701` and rolls back, exactly as it did on DEV.

**3. Plan B is not a preference.** It is reached only if PP3 crosses the thresholds, it is strictly riskier, and its step 5 (`CREATE INDEX CONCURRENTLY`) **cannot run in the Studio SQL editor at all** (`25001` — the editor is a transaction block). Decide that route *before* starting, not at 2 a.m. with steps 1–4 already committed. Full text: `SESSION-4-PROD-PREFLIGHT.md` §3.

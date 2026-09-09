# Session log — 2026-09-08 — feat/per-item-equipment-days

## Header

- Date: 2026-09-08
- Lane: schema — per-item equipment days, stage 1 (SQL only, not applied)
- Branch: feat/per-item-equipment-days
- Worktree: /Users/michaelyoussef/mrc-per-item
- Tool: CC
- Model: claude-opus-5[1m], ultrathink
- Baseline commit: 7dfda73 (origin/main, verified current against `git ls-remote origin refs/heads/main`)
- Starting tsc error lines: 100 raw `error TS` lines, 41 unique after stripping `(line,col)`. Measured in THIS worktree on 2026-09-08 after a clean `npm ci` (typescript 5.8.3 installed = pinned ^5.8.3, lockfile untouched). Normalised list kept for the stage-2 diff.
- Starting test count: 77 files / 1296 tests, 1 failing — `src/lib/api/reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves` (T24, known, excluded). No unloadable test files.
- Session id: session_01Jc8ahhioe1G8tVuSvkdTUZ

## Intent

Stage 1 only: write (do NOT apply) one new migration taking inspections from a single shared
equipment_days to four independent per-item hire periods, matching the four actuals already on
job_completions, so three of the four billed items stop being reconciled against a figure that was
never specific to them.

## Touching

- `docs/sessions/2026-09-08-feat-per-item-equipment-days.md` (this log)
- `supabase/migrations/20260908233000_inspections_per_item_equipment_days.sql` (new file, 170 lines, never applied by CC)
- `docs/TODO.md` — one appended row, P2-32 (2026-09-09)
- `docs/sessions/2026-09-08-fix-equipment-days-form.md` — correction note appended at the end;
  line 24 deliberately untouched (2026-09-09)
- No `src/` changes this session. No application code at all.

## Step log

Append a line BEFORE each unit of work. Sub-agents prefix every line with `[<agent-name>]`.
Format: `- HH:MM · tool · agent · what · files · outcome` — tool is `CC` or `codex`, so both agents' work reads in one log.

- 23:19 · CC · CC · worktree cut from origin/main @7dfda73, npm ci (exit 0, lockfile clean), .env.test.local written with placeholder host localhost.invalid — no real .env copied · (none tracked) · ok
- 23:19 · CC · CC · baselines: vitest 77 files/1296 tests, 1 known failure (T24); tsc 100 error lines / 41 unique normalised · (none) · ok
- 23:19 · CC · CC · filled header · docs/sessions/2026-09-08-feat-per-item-equipment-days.md · ok
- 23:19 · CC · [survey x5] · read-only survey of migration conventions, inspections triggers, column precedent, view/RLS exposure, name collisions · (read-only) · ok
- 23:30 · CC · CC · wrote the migration + V0/V1/V2 verification queries · supabase/migrations/20260908233000_inspections_per_item_equipment_days.sql, docs/sessions/2026-09-08-feat-per-item-equipment-days.md · ok, not applied
- 23:51 · CC · [attack x6] · adversarial review of the draft: 33 findings, 4 blocker / 11 major / 18 minor; central claim survived all six lenses; accepted fixes applied, 6 deferred to Open · supabase/migrations/20260908233000_inspections_per_item_equipment_days.sql · ok, still not applied
- 2026-09-09 16:51 · CC · CC · Michael's triage: cap waiver 2 granted+recorded; removed the SET DEFAULT 'per_item' statement and rewrote its HAZARD note; filed P2-32; appended the supersession note to the fix/equipment-days-form log · supabase/migrations/20260908233000_inspections_per_item_equipment_days.sql, docs/TODO.md, docs/sessions/2026-09-08-fix-equipment-days-form.md, docs/sessions/2026-09-08-feat-per-item-equipment-days.md · ok, still not applied
- 2026-09-09 17:04 · CC · CC · Codex round 1: Target `branch diff against origin/main`, 171 reviewable lines, verdict approve, 0 findings; caught+fixed a stale origin/main before the run; logged the row · docs/codex-review-log.md, docs/sessions/2026-09-08-feat-per-item-equipment-days.md · ok, nothing applied
- 2026-09-09 17:43 · CC · CC · recorded Michael's dispositions on both Codex next steps (ANALYZE accepted with reasoning, file unchanged; disposable-DB test covered by the DEV-first plan) and the #653 stale-base catch · docs/codex-review-log.md, docs/sessions/2026-09-08-feat-per-item-equipment-days.md · ok, no code change, not committed

## Codex threads

Write `codex resume <threadId>` here the moment it is printed — on stderr as `Thread ready (<id>)`, or by `node <companion> status`. The plugin SessionEnd hook deletes every job of the session, running or finished.

- `codex resume 01a084f7-bdf1-7ad0-8882-e400af0c17d9` — round 1, adversarial-review, `--base origin/main`, 2026-09-09. Turn `01a084f7-becf-7440-b451-08b6e5ffb419`.

## Review

- Target: `branch diff against origin/main` — verbatim, printed and checked before any finding was read.
- Diff lines excl. docs/sessions/: **171** — the migration file (170) plus one appended row in
  `docs/TODO.md`. Over the 150 cap, under the waiver below.
- Verdict: `approve` — "No material findings."
- Findings: **0**. Two next steps returned. Both triaged by Michael on 2026-09-09 and **closed** —
  neither is outstanding, and neither changed the file:
  1. **Post-COMMIT `ANALYZE` outside the transaction timeouts — ACCEPTED, file unchanged.** Codex is
     factually correct that `SET LOCAL` dies at `COMMIT`, so `ANALYZE public.inspections;` runs with
     no `lock_timeout` / `statement_timeout`. Accepted anyway on two grounds. **Lock:** `ANALYZE`
     takes **SHARE UPDATE EXCLUSIVE** — it conflicts with other `ANALYZE`/`VACUUM` and with DDL, but
     **not** with `SELECT`/`INSERT`/`UPDATE`/`DELETE`, so it never blocks application traffic. (Not
     ACCESS SHARE; the conclusion is the same either way, the lock name is not.) **Size:** 44 rows /
     432 kB on PROD, so it finishes in milliseconds. **And the remedy is worse than the defect:** a
     bare `SET statement_timeout` outside the transaction is session-scoped, so it would leak past
     this migration into whatever the Studio connection runs next — a durable, invisible change to
     an unrelated session, traded for bounding a millisecond-scale statement. Accepted with
     reasoning, not deferred.
  2. **Disposable-database test before applying — ALREADY COVERED BY PLAN, not outstanding.** DEV
     `ctppzqnysmzynkxjlzta` (2 rows) *is* the disposable database, and it takes the apply first with
     V0 before and V1 after, before PROD is touched. That covers Codex's list exactly: mixed
     NULL/non-NULL periods, unchanged timestamps, unchanged audit rows, rerun rejection via the
     section 2 guard, and rollback.
- Rounds: 1 of 2. Stopped at 1 — a second round on a zero-finding approve would re-litigate, not add.
- **Base staleness — #653 observed live, and the fetch-before-review step is what caught it.** Local
  `origin/main` was stale at `4119215` against a true remote head of `1551635`. A stale base widens
  the diff and returns a verdict **indistinguishable from a correct one**: no error, no warning, a
  confident `approve`. It was caught only because the base was checked against `git ls-remote` and
  refreshed with a narrow `git fetch origin +refs/heads/main:refs/remotes/origin/main` **before** the
  run, rather than assumed. Treat that fetch as part of the invocation, not a nicety. Here it
  happened to cost nothing — after the fetch the merge base was still `7dfda73` and the count still
  171 — but that was luck, not structure. Same failure family as the zsh focus-string split: both
  produce a truncated or widened review that looks exactly like a complete one.
- Focus-truncation check: focus single-quoted; the verdict addresses clauses after the first
  semicolon (rerun guard, RLS, rollback), so the whole string reached Codex.
- **The approve is a claim about the reviewer, not about the software.** Codex's own words, kept
  verbatim and adjacent: "Section 3b detects incorrect copies, including NULL mismatches; it does not
  prove trigger silence" and "Database behavior remains untested." Nothing in this migration has
  executed anywhere. The trigger-free claim is settled only by V0/V1 on DEV after apply.
- codex-review-log row: added 2026-09-09.
- Cap waiver 1: PRE-GRANTED by Michael before the run, for the regenerated `src/integrations/supabase/types.ts` in stage 2 only. Every later unit holds the ~150 line cap.
- **Cap waiver 2: GRANTED by Michael before the run**, for
  `20260908233000_inspections_per_item_equipment_days.sql`. Split at the time of granting:
  **169 lines, ~45 SQL and ~124 comment** (170 after the `SET DEFAULT` statement was removed and its
  HAZARD note rewritten). Granted on the basis that the file cannot be split — two migrations means
  an apply window in which the three columns exist unbackfilled — and with the explicit instruction
  **not to trim the ROLLBACK block, the STATUS header or the HAZARD note** to get under the line.
  Nothing was subtracted from the count to fit.

## Adversarial review (pre-Codex, in-session)

Six independent read-only attackers over the draft: Postgres rewrite semantics, brief compliance,
operational failure modes, security/RLS, house convention, and one whose only job was to refute the
central claim. 33 findings — 4 blocker, 11 major, 18 minor.

**Central claim survived all six** (`holds` ×3, `holds-with-caveat` ×3). The rewrite-semantics
attacker traced it to `ATColumnChangeRequiresRewrite` in `tablecmds.c`: the predicate returns false
only for a Var on the *same* attnum, so `USING equipment_days` on a different column falls through
to `return true` and forces the rewrite; `ATRewriteTable` then writes rows via `table_tuple_insert`
into a transient heap, a path with no trigger machinery on it. Nobody could refute it. It remains
**unexecuted** — no Postgres is reachable from an agent session on this machine (`psql` 18.4 is
installed, but libpq client only: no server binary, no docker). Section 3b exists so that if it is
wrong, the migration aborts instead of silently copying nothing.

Applied from the findings: the whole-paste warning; the 3b post-condition guard;
`idle_in_transaction_session_timeout`; corrected lock-window and "nothing rewrites it" wording;
`ANALYZE` after COMMIT; timeouts in the rollback block; the rollback-is-lossless caveat; scoping the
`equipment_days_source` comment off HEPA; and the t0-pinned verification above.

The six that were not applied straight away went to Michael. Their dispositions, after his triage on
2026-09-09, are in the "Open" section below — two resolved in the file, one filed as `P2-32`, one
answered with measurements, two ruled deliberate.

## Verification queries

Run **V0 before** applying and **V1 after**. V0 is what makes the "no row trigger fired" claim
provable rather than asserted.

**Every check is pinned to `t0`, the timestamp V0 returns.** Without that pin, one ordinary
inspection save between the two runs moves `max(updated_at)` and writes an audit row — which reads
exactly like a fired trigger, on the one check whose whole purpose is to rule that out. Even pinned,
neither trigger check can fully separate a fired trigger from ordinary traffic on a busy database,
so **take the definitive reading on DEV, where there is none.** On PROD, apply out of hours and
treat a small non-zero as traffic to be explained rather than automatically as a failure.

**V0 — run BEFORE applying. Record `t0` verbatim; V1 needs it pasted in.**

```sql
SELECT
  now()                                                                    AS t0,
  (SELECT count(*) FROM public.inspections)                                AS total_rows,
  (SELECT count(*) FROM public.inspections WHERE equipment_days IS NULL)   AS equipment_days_null_rows,
  (SELECT max(updated_at) FROM public.inspections)                         AS max_updated_at,
  (SELECT count(*) FROM public.audit_logs
     WHERE entity_type = 'inspections'
       AND action = 'inspection_updated')                                  AS inspection_update_audit_rows;
```

**V1 — run AFTER applying.** Replace both `<t0>` with the value V0 returned, quoted and cast, e.g.
`'2026-09-08 23:45:12.345+10'::timestamptz`. `created_at` is nullable on this table, so the
`IS NULL` arm is what stops legacy rows being silently dropped from the population.

```sql
SELECT
  count(*)                                                                                    AS rows_as_at_t0,
  count(*) FILTER (WHERE commercial_dehumidifier_days IS NOT DISTINCT FROM equipment_days)    AS dehumidifier_matches,
  count(*) FILTER (WHERE air_movers_days              IS NOT DISTINCT FROM equipment_days)    AS air_mover_matches,
  count(*) FILTER (WHERE rcd_box_days                 IS NOT DISTINCT FROM equipment_days)    AS rcd_matches,
  count(*) FILTER (WHERE equipment_days_source = 'shared')                                    AS flagged_shared,
  count(*) FILTER (WHERE equipment_days_source IS NULL)                                       AS source_null_rows,
  count(*) FILTER (WHERE equipment_days IS NULL)                                              AS equipment_days_null_rows,
  count(*) FILTER (WHERE equipment_days IS NULL
                     AND commercial_dehumidifier_days IS NULL
                     AND air_movers_days IS NULL
                     AND rcd_box_days IS NULL)                                                AS null_copied_as_null,
  count(*) FILTER (WHERE updated_at > <t0>)                                                   AS pre_t0_rows_touched_since,
  (SELECT count(*) FROM public.audit_logs
     WHERE entity_type = 'inspections' AND action = 'inspection_updated'
       AND created_at > <t0>)                                                                 AS audit_rows_since_t0
FROM public.inspections
WHERE created_at <= <t0> OR created_at IS NULL;
```

PASS is all of:

| Column | Expected | Proves |
|---|---|---|
| `rows_as_at_t0` | = V0 `total_rows` | the whole pre-migration population is in scope |
| `dehumidifier_matches`, `air_mover_matches`, `rcd_matches` | each = `rows_as_at_t0` | the backfill copied `equipment_days` into all three, on every row |
| `flagged_shared` | = `rows_as_at_t0` | every pre-existing row reads `'shared'` |
| `source_null_rows` | 0 | the column really is NOT NULL |
| `equipment_days_null_rows` | = V0 `equipment_days_null_rows` | `equipment_days` itself was not touched |
| `null_copied_as_null` | = `equipment_days_null_rows` | a NULL hire period copied through as NULL, not as 0 |
| `pre_t0_rows_touched_since` | **0** | `update_inspections_updated_at` did not fire |
| `audit_rows_since_t0` | **0** | `audit_inspections_update` did not fire |

The last two are the trigger-free proof. Non-zero on a quiet database means a row trigger fired and
the design's central claim is false — stop and report rather than proceeding.

**V2 — structure, optional.**

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inspections'
  AND column_name IN ('equipment_days', 'commercial_dehumidifier_days',
                      'air_movers_days', 'rcd_box_days', 'equipment_days_source')
ORDER BY column_name;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.inspections'::regclass
  AND conname IN ('inspections_equipment_days_source_check', 'inspections_equipment_days_check');
```

Expect the three day columns `integer` / `YES` / no default; `equipment_days_source` `text` / `NO` /
**`'shared'::text`** — the flip to `'per_item'` is deliberately not in this migration and ships with
the form writer; `equipment_days` unchanged; and the CHECK reading
`CHECK ((equipment_days_source = ANY (ARRAY['shared'::text, 'per_item'::text])))`.

## Did

- Cut the worktree, installed with `npm ci`, took both baselines in-tree on the day.
- Wrote one new migration, `20260908233000_inspections_per_item_equipment_days.sql`, and ran a
  six-lens adversarial review over it before handing it across.

## Did NOT

- Did NOT apply the migration anywhere. No `db push`, no `--linked`, no MCP write, no MCP read.
- Did NOT touch any application code, any Edge Function, or any existing migration.
- Did NOT run any git write beyond the instructed `worktree add`. Zero commits, zero pushes.

## Broke

- nothing known

## Open

- Stage 2 is blocked on Michael applying the migration by hand in Studio and confirming.
- **Second cap waiver** for the 169-line migration — requested above, not granted.

### Findings — dispositions after Michael's triage, 2026-09-09

1. **BLOCKER — RESOLVED, statement removed.** `ALTER COLUMN equipment_days_source SET DEFAULT
   'per_item'` is no longer in the migration. The column stays `DEFAULT 'shared'`, and the flip
   ships in the same wave as the form writer that populates the three day columns. The reasoning is
   recorded at the site: until that writer exists, a new inspection has `equipment_days` set and
   three NULL day columns, which **is** a shared-model row — `'shared'` is its true value, not a
   placeholder, and flagging it `'per_item'` would make the column lie. Nothing else in the file
   changed. V2's expected `column_default` is therefore `'shared'::text`.
2. **MAJOR — FILED, not fixed. `docs/TODO.md` P2-32.** The three day columns carry no `CHECK`, so a
   0 or negative hire period is accepted where `equipment_days` has enforced `>= 1` since
   20251122000001. Not added, and the reasoning is the row's substance: the per-item writer's
   zero-quantity behaviour is unknown, so a constraint that fires on an ordinary save is worse than
   a permissive column, and the guard belongs in the engine — same class as P2-26, to be picked up
   with it. The ready-made `DO $$ … pg_constraint … $$` block is on the row.
3. **Pre-flight — ANSWERED by Michael, deferred not changed.** `statement_timeout = '60s'` was a
   guess; this session could not measure the table. Michael's figures: **44 rows / 432 kB on PROD**,
   so the section-3 rewrite is sub-second and 60s is ample with a wide margin. The value stays as
   written; it is now a justified number rather than an unexamined one.
4. **Naming split — DELIBERATE, ruled.** `commercial_dehumidifier_days` / `air_movers_days` are
   plural because they mirror **this** table's own qty columns (`commercial_dehumidifier_qty`,
   `air_movers_qty`); `job_completions` is singular (`actual_air_mover_days`) because it mirrors
   **that** table's. The mapping layer already renames across the boundary, so the split costs
   nothing and each table stays internally consistent. Not an accident; do not "fix" it.
5. **New pattern — accepted, flagged.** `ALTER COLUMN … TYPE … USING <another column>` appears
   nowhere else in this repo. Accepted on the doctrine 20260828120000 already states in prose.
6. **Record contradiction — RESOLVED by appending, not editing.** A dated correction note is
   appended to the end of `docs/sessions/2026-09-08-fix-equipment-days-form.md` recording that its
   line 24 ruling ("one shared hire period, not per-item Days") was superseded on 2026-09-08, and
   naming this branch. **Line 24 itself is untouched** — it is historical.

## Resume from here

<!-- resume:start -->
<!-- hook-maintained by .claude/hooks/session-resume.sh after every turn; do not hand-edit between the markers; never quote the marker lines elsewhere in this log -->

- Next command: none — waiting on Michael to apply the migration in Studio, then stage 2 (regenerate types against DEV ctppzqnysmzynkxjlzta, re-run vitest + tsc against the baselines above).
- Uncommitted files: the new migration under `supabase/migrations/` and this log. Nothing else.
- Untested: the migration SQL has never been executed against any database.
<!-- resume:end -->

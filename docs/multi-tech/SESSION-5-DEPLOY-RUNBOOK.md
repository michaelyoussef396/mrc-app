# SESSION 5 — DEPLOY RUNBOOK · `send-inspection-reminder` group claim

**Step 0b of the multi-tech deploy order** (`docs/multi-tech/HANDOFF.md` §3).
**Deploys this commit:** `cf49ebfe2f62abc6a1e62129dd458550dc6c1b72`
**Deploys this file content:** `supabase/functions/send-inspection-reminder/index.ts`,
blob `6df442b819e70c27d92704bd4f5ccc513b906b49`

**Read this cold. Run it top to bottom. Every ⛔ is a STOP, not a note.**

Edge Function deploys are **global-immediate** — no preview, no branch, no gradual rollout, no
automatic rollback. The moment this deploys it is live for every customer. This function sends real
customer email.

---

## 0 · NAMED DEPENDENCIES

These are not background. If either is untrue at deploy time, **do not deploy.**

### ⛔ D1 — SESSION 4 contract: the fan-out writer MUST set `booking_group_id` on every row

> **Owner: SESSION 4 / step 2 (the multi-tech picker and fan-out writer).**
>
> Every `calendar_bookings` row written by the fan-out writer **must** carry a
> `booking_group_id`, and all rows for one job on one day **must** carry the **same** one.

This is the single assumption that, if broken, turns this fix into the exact bug it prevents.

The function falls back to a per-row claim when `booking_group_id` is NULL. That fallback is safe
**only** because a writer that does not know about the column also does not know about fan-out, and
therefore wrote exactly one row. A writer that fans out to two rows **without** setting the group id
breaks that reasoning: the fallback sees two unrelated single-row groups, claims each one
separately, and sends **two identical reminder emails to one customer** — the original incident,
restored in full.

**How to hold the contract:**
- SESSION 4 / step 2 sets `booking_group_id` in the same insert as the fan-out rows. Not a follow-up
  `UPDATE`; a row that exists with a NULL group for even one reminder tick is claimable alone.
- Consider making the column `NOT NULL` (with a `gen_random_uuid()` default) in the step-1 migration
  once every writer sets it. A default makes an unmigrated writer produce a *distinct* group per
  row, which is still one email per row — so the default is not a substitute for the contract, only
  a guard against NULLs.
- Watch for the breach in production: `booking_group_id is NULL` warnings in this function's logs
  (§7). They are the tripwire.

### ⛔ D2 — Step 0a must already be applied to the target project

`booking_group_id` must exist on `calendar_bookings` **before** this function is deployed. The
function selects the column. If it is missing, every reminder run fails with PostgREST `42703`
(`column calendar_bookings.booking_group_id does not exist`) and **no customer gets a reminder**
until it is fixed.

There is deliberately no compatibility shim for this. It is an operator-ordering error, gated in §1.

### Ordering context

| Step | What | Status |
|---|---|---|
| 0a | Migration: add + backfill + index `calendar_bookings.booking_group_id` | SESSION 4 |
| **0b** | **This runbook.** Deploy the group-aware reminder EF, verify on one-row data | ← you are here |
| 0c | `calculate-travel-time` leads-side filters | SESSION 6 |
| 1 | `lead_assignments` migration + 16 policy rewrites + Part D | later |
| 2 | Multi-tech picker + fan-out writer — **the first step that creates a two-row booking** | later |

**0b must be live and verified before step 1.** If a two-row booking can exist before this lands,
the first two-tech booking sends a duplicate email with no code change in between.

---

## 1 · PRE-FLIGHT — read-only SQL, run in Studio on the TARGET project

State the target ref and its role out loud before running anything, per `CLAUDE.md`.

| ref | role |
|---|---|
| `ecyivrxjpsmjmexqatym` | **PROD — LIVE.** mrcsystem.com. Real customer email. |
| `ctppzqnysmzynkxjlzta` | **DEV — sandbox.** Safe to break. |

Studio shows only the last result set of a multi-statement run. **Run each block on its own.**

### P-A ⛔ Confirm the project (never infer it)

```sql
SELECT current_database(), current_user, inet_server_addr();
```

### P-B ⛔ `booking_group_id` exists — gates D2

```sql
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'calendar_bookings'
   AND column_name  = 'booking_group_id';
```

**Expect exactly one row, `uuid`.** Zero rows ⇒ **STOP.** Step 0a is not applied here. Deploying now
breaks every reminder run.

### P-C ⛔ No un-backfilled rows

```sql
SELECT count(*) AS null_group_rows
  FROM public.calendar_bookings
 WHERE booking_group_id IS NULL;
```

**Expect `0`.** Non-zero is not an automatic stop — those rows take the per-row fallback, which is
correct for single-row bookings — but it means 0a's backfill was partial. Record the number, and
confirm each such row is a single-row booking before continuing.

### P-D Group shape (the P5 check, on live data)

```sql
SELECT booking_group_id, count(*) AS rows_in_group
  FROM public.calendar_bookings
 WHERE booking_group_id IS NOT NULL
 GROUP BY booking_group_id
HAVING count(*) > 1;
```

**Expect zero rows before step 2.** Any row here means a two-row group already exists — the world
this function is being deployed to protect. Not a stop for *this* deploy (the new code handles it),
but it means the ordering assumption has already been violated somewhere: find the writer.

### P-E ⛔ Nothing pending in the current tick

```sql
SELECT count(*) AS pending_now
  FROM public.calendar_bookings
 WHERE reminder_sent = false
   AND status = 'scheduled'
   AND reminder_scheduled_for <= now();
```

**Expect `0`.** Non-zero ⇒ wait, or deploy immediately after a tick completes.

Why: this change moves the Resend `Idempotency-Key` from the booking id to the group id. A reminder
that failed transiently and released its claim just before the deploy would retry afterwards under a
*new* key. If that failure was a false negative (Resend accepted, the response was lost), the retry
would send a genuine duplicate. Deploying with nothing pending closes the window entirely.

The cron fires hourly at `:00`. **Deploy between :10 and :50.**

---

## 2 · ⛔ DEPLOY IDENTITY GATE

> `npx supabase functions deploy` uploads `supabase/functions/<name>/index.ts` **from the current
> working directory**, ignoring which branch you think you are on. On 2026-08-26 this shipped stale
> EF code from a worktree sitting on an old feature branch. The version incremented and the CLI
> reported success, so it looked fine. It was a no-op redeploy of the wrong source.

**Deploy origin: `~/mrc-reminder-ef`.** Branch names drift; content hashes do not. Run all four
checks. **All four must pass. Do not proceed on three.**

```bash
# 1 — the right worktree
git -C ~/mrc-reminder-ef rev-parse --show-toplevel
#    EXPECT: /Users/michaelyoussef/mrc-reminder-ef

# 2 — HEAD is the deploy commit, or a descendant of it
git -C ~/mrc-reminder-ef merge-base --is-ancestor \
    cf49ebfe2f62abc6a1e62129dd458550dc6c1b72 HEAD && echo "ANCESTOR OK"
#    EXPECT: ANCESTOR OK   (exit 0)

# 3 — no uncommitted edit to the function being deployed
git -C ~/mrc-reminder-ef status --porcelain -- supabase/functions/send-inspection-reminder/
#    EXPECT: no output at all

# 4 — THE DEPLOY IDENTITY: the exact bytes that will be uploaded
git -C ~/mrc-reminder-ef hash-object supabase/functions/send-inspection-reminder/index.ts
#    EXPECT: 6df442b819e70c27d92704bd4f5ccc513b906b49
```

**Check 4 is the one that matters.** It hashes file *content*, so it is invariant to branch name,
rebase, cherry-pick, amend and merge. A wrong branch, a stale worktree or a stray local edit all
produce a different hash and fail the gate. `(a modified file is dirty)` appended to the hash also
fails it — check 3 catches that first.

**Equivalent alternative — a disposable worktree at the SHA.** Same four checks, run against
`/tmp/mrc-ef-0b`, and it leaves no long-lived worktree sitting in a deployable state:

```bash
git -C ~/mrc-app-1 worktree add --detach /tmp/mrc-ef-0b cf49ebfe2f62abc6a1e62129dd458550dc6c1b72
git -C /tmp/mrc-ef-0b hash-object supabase/functions/send-inspection-reminder/index.ts
#    EXPECT: 6df442b819e70c27d92704bd4f5ccc513b906b49
# ... deploy from /tmp/mrc-ef-0b ... then:
git -C ~/mrc-app-1 worktree remove /tmp/mrc-ef-0b
```

**Do NOT deploy from `~/mrc-app-prod`.** It is on `feat/area-hide-in-report-main`, not `production`,
and does not contain this change.

---

## 3 · DEV REHEARSAL FIRST — `ctppzqnysmzynkxjlzta` (sandbox)

Requires 0a applied to DEV. Run §1 against DEV, then §2, then:

```bash
cd ~/mrc-reminder-ef
npx supabase functions deploy send-inspection-reminder --project-ref ctppzqnysmzynkxjlzta
```

Then run §5 (download-and-diff) and §6 (behaviour) against DEV. Only continue to PROD when both
pass. DEV has 3 leads and 3 bookings, all single-row groups — exactly the shape PROD is in today.

---

## 4 · PROD DEPLOY — `ecyivrxjpsmjmexqatym`

> **Target: `ecyivrxjpsmjmexqatym`. This is PROD. It is the LIVE project behind mrcsystem.com and it
> sends real email to real customers. There is no preview, no staging buffer and no automatic
> rollback.**
>
> Per `CLAUDE.md`, say that out loud and confirm before running the command.

§1 and §2 must have passed **against PROD**, in this sitting, not from memory.

```bash
cd ~/mrc-reminder-ef
npx supabase functions deploy send-inspection-reminder --project-ref ecyivrxjpsmjmexqatym
```

Record the reported version number. **It is a log line, not a verification** — see §5.

---

## 5 · ⛔ VERIFY BY DOWNLOADING THE DEPLOYED SOURCE AND DIFFING IT

**Never verify by version number.** A version bump proves an upload happened, not that the right
source was uploaded. That is exactly how stale code shipped on 2026-08-26 while every indicator
looked green.

`functions download` writes into `supabase/functions/<name>/` of the **current project directory**.
Run it in a **disposable worktree** — never in `~/mrc-reminder-ef`, where it would overwrite the
source you are verifying.

```bash
# disposable worktree at the deployed commit
git -C ~/mrc-app-1 worktree add --detach /tmp/mrc-ef-verify cf49ebfe2f62abc6a1e62129dd458550dc6c1b72
cd /tmp/mrc-ef-verify

# overwrite the local copy with whatever is actually deployed
npx supabase functions download send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api

# the diff IS the verification
git -C /tmp/mrc-ef-verify status --porcelain -- supabase/functions/send-inspection-reminder/
#    PASS: no output — deployed source is byte-identical to the deploy commit
#    FAIL: any output — STOP and inspect:
git -C /tmp/mrc-ef-verify diff -- supabase/functions/send-inspection-reminder/

# belt and braces: hash what came back
git -C /tmp/mrc-ef-verify hash-object supabase/functions/send-inspection-reminder/index.ts
#    EXPECT: 6df442b819e70c27d92704bd4f5ccc513b906b49

# clean up only after a PASS
cd ~ && git -C ~/mrc-app-1 worktree remove --force /tmp/mrc-ef-verify
```

`--use-api` unbundles server-side, so Docker is not required.

⛔ **A non-empty diff means the deployed source is not the reviewed source. Stop. Do not run §6.
Go to §8.**

---

## 6 · BEHAVIOUR VERIFICATION ON LIVE ONE-ROW DATA

This is the whole point of step 0b: prove the group claim behaves identically to today *before* any
two-row booking can exist.

### 6.1 Invoke manually

```bash
curl -s -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d '{}'
```

Take the service-role JWT from the Studio dashboard or your own shell env — never paste it into a
chat window.

**Expect a 200 with the response shape:**

```json
{ "processed": N, "groups": N, "sent": …, "failed": 0, "skipped": …, "alreadyClaimed": 0, "released": 0 }
```

⛔ **`processed` must equal `groups`.** On today's data every group has exactly one row, so any
divergence means a multi-row group exists that §1 P-D did not catch.

Also acceptable: `{"processed":0,"sent":0,"failed":0,"message":"No pending reminders"}` — that path
is unchanged and returns no `groups` field.

### 6.2 Group claim held — the strongest single assertion

Every row claimed by one group claim gets the **same** `reminder_sent_at`, because one statement
writes one timestamp to all of them. Two distinct timestamps in one group means two separate claims
ran — which is the duplicate-send condition.

```sql
SELECT booking_group_id, count(DISTINCT reminder_sent_at) AS distinct_claim_times
  FROM public.calendar_bookings
 WHERE reminder_sent = true
   AND booking_group_id IS NOT NULL
 GROUP BY booking_group_id
HAVING count(DISTINCT reminder_sent_at) > 1;
```

⛔ **Must return zero rows.** Run it after every reminder window for the first week.

### 6.3 One email per group

```sql
SELECT lead_id, subject, count(*) AS sends
  FROM public.email_logs
 WHERE template_name = 'inspection_reminder'
   AND sent_at > now() - interval '7 days'
 GROUP BY lead_id, subject
HAVING count(*) > 1;
```

⛔ **Must return zero rows.** The subject carries the inspection date, so `lead_id + subject` is the
logical email — two rows is a customer-visible duplicate.

> **Do NOT use the R1 detector from `SESSION-1-DB-RLS-FINDINGS.md` (`count(*) FILTER (WHERE
> reminder_sent) > 1` per group) after this deploy.** It was written for the per-row world. The group
> claim deliberately sets `reminder_sent` on **every** row of the group, so a legitimate two-row
> group scores 2 and the query false-positives on correct behaviour. 6.2 and 6.3 replace it.

### 6.4 `email_logs` attribution unchanged

```sql
SELECT sent_by, template_name, status, sent_at
  FROM public.email_logs
 WHERE template_name = 'inspection_reminder'
 ORDER BY sent_at DESC
 LIMIT 5;
```

**Expect** `sent_by = a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f` (SYSTEM_USER_UUID). Bucket B, unchanged.

### 6.5 Idempotency — invoke twice

Run 6.1 again immediately. **Expect** `{"processed":0, … "message":"No pending reminders"}`, or a
run reporting `alreadyClaimed` with `sent: 0`. **No second email.** Confirm 6.3 still returns zero
rows.

---

## 7 · FIRST REMINDER WINDOW AFTER DEPLOY — WHAT TO WATCH

The cron fires hourly at `:00`. Watch the first two or three ticks, then daily for a week.
Function logs: Studio → Edge Functions → `send-inspection-reminder` → Logs.

| Signal | Where | Means | Action |
|---|---|---|---|
| ⛔ `booking_group_id is NULL — falling back to per-row claim` | function logs | **D1 tripwire.** A writer is inserting rows without a group id. Harmless while that writer inserts one row; catastrophic the moment it fans out. | Find the writer. Block step 2 until it sets the group id. |
| ⛔ `rows disagree on start_datetime/location_address` | function logs | Rows in one group describe different jobs or times. The email is built from one of them, and a retry could change the payload under the same idempotency key → Resend 409 → reminder silently suppressed. | Investigate the group immediately. |
| ⛔ `Failed to check claimed groups` (HTTP 500) | curl / logs | The already-claimed guard read failed, so the run aborted rather than risk a duplicate. No email went out this tick. | Recovers on the next tick. Persisting ⇒ investigate PostgREST/DB. |
| `Group <id>: another row in this group is already claimed, skipping send` | function logs | Working as designed — a row joined an already-reminded group. | None. Expected only after step 2. |
| `Processing N booking row(s) in M group(s)` | function logs | Baseline. **N must equal M until step 2 ships.** | N > M before step 2 ⇒ a two-row group exists early. Investigate. |
| `claim failed` / `claim release failed` | function logs | Unchanged failure paths. | As before. |
| Duplicate reminder in a customer inbox | Slack failure feed, customer reply, 6.3 | The thing this deploy exists to prevent. | §8, then incident review. |
| Slack `email_logs` firehose | Slack | Successes are suppressed; failures still post. | Unchanged by this deploy. |

**Zero reminders at all** is as much a failure as a duplicate. If the first tick after deploy logs
nothing, check for the `42703` missing-column error first (D2), then P-E.

---

## 8 · MANUAL ROLLBACK — there is no automatic one

Redeploy the previous source from a **disposable worktree** at the pre-change commit. Never edit the
working tree to roll back.

```bash
git -C ~/mrc-app-1 worktree add --detach /tmp/mrc-ef-rollback c99caa40cb267ad096de8b16dc63f3fcf128cee7
cd /tmp/mrc-ef-rollback

# same identity gate, pre-change values
git -C /tmp/mrc-ef-rollback hash-object supabase/functions/send-inspection-reminder/index.ts
#    EXPECT: bf95002f7bfd76506c3fc71783fb35e59681e1f3

npx supabase functions deploy send-inspection-reminder --project-ref ecyivrxjpsmjmexqatym

# verify the rollback the same way — download and diff, never the version number
npx supabase functions download send-inspection-reminder \
    --project-ref ecyivrxjpsmjmexqatym --use-api
git -C /tmp/mrc-ef-rollback status --porcelain -- supabase/functions/send-inspection-reminder/
#    PASS: no output

cd ~ && git -C ~/mrc-app-1 worktree remove --force /tmp/mrc-ef-rollback
```

### What rollback does NOT undo

- **Emails already sent cannot be recalled.** This is the one-way door.
- **`reminder_sent` flags set by the group claim stay set.** Rolling back the code does not re-arm
  them, and it should not: those customers were reminded. On a one-row group this is identical to
  what the old code would have written anyway.
- **`reminder_sent_at` values stay.** Harmless; the column is informational.
- ⛔ **Rolling back while a two-row group exists reinstates the duplicate-send bug.** After step 2
  ships, rollback is not a safe option — fix forward. Before step 2, rollback is safe because every
  group has one row and the two code paths are equivalent.

### If rollback is because of duplicates already sent

1. Roll back (above).
2. Run 6.3 with a wider window to size the blast radius.
3. `SELECT * FROM email_logs WHERE template_name='inspection_reminder' ORDER BY sent_at DESC` for
   the affected `lead_id`s — provider message ids are the evidence trail.
4. Customer communication is Glen and Clayton's call, not an engineering decision.

---

## 9 · SIGN-OFF

Deploy is complete only when **all** of these are true:

- [ ] D1 contract recorded and understood; D2 verified on the target (§1 P-B)
- [ ] §1 P-A…P-E run against the target project **in this sitting**
- [ ] §2 identity gate: all four checks passed, blob = `6df442b819e70c27d92704bd4f5ccc513b906b49`
- [ ] DEV rehearsal passed (§3)
- [ ] PROD deployed with the ref stated aloud and confirmed (§4)
- [ ] §5 download-and-diff clean — **not** a version-number check
- [ ] §6.1 `processed == groups`; §6.2 and §6.3 return zero rows; §6.4 attribution intact;
      §6.5 double-invoke sends nothing
- [ ] First reminder window watched (§7) with no ⛔ signals

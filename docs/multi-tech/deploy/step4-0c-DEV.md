# STEP 4 — 0c `calculate-travel-time` on DEV (`ctppzqnysmzynkxjlzta`, sandbox)

Staged 2026-08-31 while step 3 finishes. **0c is independent of 0a and 0b** — it references neither
`booking_group_id` nor `lead_assignments`, so it can run whether or not 0b is signed off.

**What changes:** the two `leads`-side technician filters become
`.or(attendedLeadsFilter(...))` instead of `.eq('assigned_to', technician_id)`, and the existing
`fetchMelbourneBookings` call is hoisted above each `leads` query so its lead ids are available to
the filter. Three hunks, ~35 net lines. Blob `afc363caae3464e61f8670b9155dabc23e2bc258`.

**Why it is safe on today's data:** with one technician per lead, every booking row for technician T
belongs to a lead whose `assigned_to` is already T, so the booking-sourced id set is a **subset** of
the pointer-matched set and `A OR (subset of A)` is `A`. The result set is unchanged. The filter is
provably a **superset**, which is what makes the pass criterion directional (§4.7).

---

## 4.1 · Environment — already established, no action

| | |
|---|---|
| `GOOGLE_MAPS_API_KEY` on DEV | ✅ present. An expired key would still be fine — the function returns `source: "unavailable"` with `day_schedule` and `previous_appointment` populated, which is the part being compared. **Absent** would 500 before reaching the changed code; it is not absent. |
| `SENTRY_DSN` on DEV | **absent** — so no `production`-tagged Sentry noise from this rehearsal. (0c imports `_shared/errorReporting.ts`; 0b does not.) |
| DEV's deployed 0c | blob `897042d76a41e674deaf113c2bccb3c5f00927bb`, deployed 2026-08-27 07:56 AEST, 26 min after commit `92f5487`. Same blob `production` carries ⇒ DEV is at the correct pre-0c state. |

## 4.2 · Capture the running source — the rollback artefact

```bash
mkdir -p ~/ef-scratch/0c-before-dev
```
```bash
npx supabase@2.101.0 functions download calculate-travel-time --project-ref ctppzqnysmzynkxjlzta --use-api --workdir ~/ef-scratch/0c-before-dev
```
```bash
find ~/ef-scratch/0c-before-dev -type f | sort && git hash-object ~/ef-scratch/0c-before-dev/supabase/functions/calculate-travel-time/index.ts
```
**Expect `897042d76a41e674deaf113c2bccb3c5f00927bb`.** Anything else ⇒ paste it and stop; per SF-6
the deployed source is not necessarily any committed source, and the rollback target changes.
`supabase/.temp/**` in the listing is expected — never verify by tree cleanliness.

## 4.3 · Identity gate — `~/mrc-travel-ef` ONLY

Not `~/mrc-reminder-ef` (carries the old 0c blob), not `~/mrc-app-prod` (on
`feat/area-hide-in-report-main`, both blobs old). `~/mrc-merge` also carries `afc363ca` and is
acceptable if `~/mrc-travel-ef` has moved.

```bash
echo "toplevel: $(git -C ~/mrc-travel-ef rev-parse --show-toplevel)"; echo "branch:   $(git -C ~/mrc-travel-ef branch --show-current) @ $(git -C ~/mrc-travel-ef rev-parse --short=7 HEAD)"; git -C ~/mrc-travel-ef merge-base --is-ancestor 1ca3bec9a4866b9a3818304310c043ef59aa835f HEAD && echo "ancestor: OK" || echo "ancestor: FAIL"; echo "dirty:    [$(git -C ~/mrc-travel-ef status --porcelain --untracked-files=all -- supabase/ | tr '\n' ';')]"; echo "dir:      $(ls ~/mrc-travel-ef/supabase/functions/calculate-travel-time/ | tr '\n' ' ')"; echo "index.ts: $(git -C ~/mrc-travel-ef hash-object supabase/functions/calculate-travel-time/index.ts)"; echo "_shared:  $(git -C ~/mrc-travel-ef hash-object supabase/functions/_shared/errorReporting.ts)"; echo "config:   $(git -C ~/mrc-travel-ef hash-object supabase/config.toml)"
```

All eight lines must read:
```
toplevel: /Users/michaelyoussef/mrc-travel-ef
branch:   fix/travel-time-multitech @ 1ca3bec
ancestor: OK
dirty:    []
dir:      index.ts
index.ts: afc363caae3464e61f8670b9155dabc23e2bc258
_shared:  fccc83ebeaf9feb4bf93828532728e4f7cf3a0b6
config:   ce718aa0578ea180dbd6571a6932b91f4c942129
```
`_shared/errorReporting.ts` is in the gate because **0c imports it and the deploy bundles it** — 0b
did not, which is why step 3's gate had one fewer line. It is byte-identical on every ref, so a
mismatch means a local edit.

## 4.4 · Baseline BEFORE deploying — this is the comparison

Steps 4.6/4.7 are a diff against these. Capture them first or there is nothing to compare to.

**0c-DEV-1 · pick the positive-control pair (Studio, read-only).** A `(technician, Melbourne date)`
pair with at least one non-cancelled booking row carrying a `lead_id` is the only kind that emits the
risky `id.in.(…)` term. A pair without one exercises only the single-term `.or()`, which already has
shipped precedent — and would validate nothing.

```sql
SELECT cb.assigned_to AS technician_id,
       (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date AS mel_date,
       l.id AS lead_id, l.full_name, l.property_address_suburb AS suburb,
       l.assigned_to AS lead_pointer,
       l.inspection_scheduled_date, l.scheduled_time,
       cb.event_type, cb.status::text,
       to_char(cb.start_datetime AT TIME ZONE 'Australia/Melbourne','HH24:MI') AS booking_start,
       to_char(cb.end_datetime   AT TIME ZONE 'Australia/Melbourne','HH24:MI') AS booking_end,
       (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date = l.inspection_scheduled_date AS positive_control
FROM public.calendar_bookings cb
JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.status <> 'cancelled'
ORDER BY cb.start_datetime;
```
Take a row with `positive_control = true`. **T** = `technician_id`, **D** = `inspection_scheduled_date`.
If no row is `true`, DEV cannot exercise the `id.in.(…)` term and that must be recorded as a gap in
the rehearsal rather than glossed over — the PROD run then carries that risk unrehearsed.

**0c-P1 · the delta set — what the new filter can ADD.** Mirrors the EF exactly
(`status <> 'cancelled'`, which also excludes NULL status as `.neq()` does).

```sql
SELECT cb.assigned_to AS booked_technician, l.assigned_to AS lead_pointer,
       l.id AS lead_id, l.full_name, l.inspection_scheduled_date,
       (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date AS booking_mel_date,
       cb.event_type, cb.status::text
FROM public.calendar_bookings cb
JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.status <> 'cancelled'
  AND l.assigned_to IS DISTINCT FROM cb.assigned_to
ORDER BY l.inspection_scheduled_date;
```
**Expect 0 rows on DEV** (SESSION 1 measured `bucket2 = 0`). Zero rows ⇒ 0c must return byte-identical
answers on DEV, which makes §4.7 a strict equality check here. Any row ⇒ that lead is one 0c will
legitimately ADD to that technician's day; predict it now so it is not diagnosed later.

**Baseline the two endpoints.** Same shell, one line each, using the pbpaste-gated form from step 3
(clipboard = DEV `service_role`). Substitute T and D from 0c-DEV-1.

```bash
K=$(pbpaste | tr -d '[:space:]'); curl -s -X POST "https://ctppzqnysmzynkxjlzta.supabase.co/functions/v1/calculate-travel-time" -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{"action":"check_availability","technician_id":"<T>","date":"<D>","requested_time":"10:00","destination_address":"1 Test St, Melbourne VIC 3000"}' | python3 -m json.tool > ~/ef-scratch/0c-before-availability.json; cat ~/ef-scratch/0c-before-availability.json
```
```bash
K=$(pbpaste | tr -d '[:space:]'); curl -s -X POST "https://ctppzqnysmzynkxjlzta.supabase.co/functions/v1/calculate-travel-time" -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{"action":"get_recommended_dates","technician_id":"<T>","destination_address":"1 Test St, Melbourne VIC 3000","days_ahead":14}' | python3 -m json.tool > ~/ef-scratch/0c-before-recommended.json; cat ~/ef-scratch/0c-before-recommended.json
```

## 4.5 · Deploy

```bash
cd ~/mrc-travel-ef && npx supabase@2.101.0 functions deploy calculate-travel-time --project-ref ctppzqnysmzynkxjlzta --use-api
```
Expect version 6 → 7. A log line, not verification.

## 4.6 · Verify by download-and-hash

```bash
mkdir -p ~/ef-scratch/0c-after-dev && git -C ~/mrc-app-1 cat-file blob afc363caae3464e61f8670b9155dabc23e2bc258 > ~/ef-scratch/expected/0c-index.ts && echo "expected: $(git hash-object ~/ef-scratch/expected/0c-index.ts)"
```
```bash
npx supabase@2.101.0 functions download calculate-travel-time --project-ref ctppzqnysmzynkxjlzta --use-api --workdir ~/ef-scratch/0c-after-dev
```
```bash
git hash-object ~/ef-scratch/0c-after-dev/supabase/functions/calculate-travel-time/index.ts && cmp ~/ef-scratch/expected/0c-index.ts ~/ef-scratch/0c-after-dev/supabase/functions/calculate-travel-time/index.ts && echo "BYTE-IDENTICAL"
```
**PASS = `afc363ca…` + `BYTE-IDENTICAL`.** Then the marker counts on the **downloaded** file — a
permanent post-deploy check for this function, not a one-off:
```bash
D=~/ef-scratch/0c-after-dev/supabase/functions/calculate-travel-time/index.ts; echo "attendedLeadsFilter: $(grep -c attendedLeadsFilter $D)"; echo "leads-side eq:       $(grep -c "\.eq('assigned_to', technician_id)" $D)"; echo "bookings-side eq:    $(grep -c "\.eq('assigned_to', technicianId)" $D)"
```
Expect **3 / 0 / 1**. On the old blob these read 0 / 2 / 1, so they discriminate old from new.
```bash
npx supabase@2.101.0 functions list --project-ref ctppzqnysmzynkxjlzta --output json | python3 -m json.tool
```
`calculate-travel-time` version +1, `verify_jwt` unchanged; `send-inspection-reminder` still at 9.

## 4.7 · Behaviour — directional, not equality

Re-run the two baseline curls from §4.4 and diff against the saved JSON.

```bash
diff <(python3 -m json.tool ~/ef-scratch/0c-before-availability.json) <(K=$(pbpaste | tr -d '[:space:]'); curl -s -X POST "https://ctppzqnysmzynkxjlzta.supabase.co/functions/v1/calculate-travel-time" -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{"action":"check_availability","technician_id":"<T>","date":"<D>","requested_time":"10:00","destination_address":"1 Test St, Melbourne VIC 3000"}' | python3 -m json.tool) && echo "IDENTICAL"
```

With 0c-P1 returning zero rows on DEV, **expect byte-identical output.** The criterion is
nonetheless directional, because the filter is a provable superset:

| Outcome | Verdict |
|---|---|
| `day_schedule` **shrinks**, or a non-empty day becomes **empty** | 🔴 **FAIL — roll back.** Impossible under a superset filter; means the `or=` string is malformed. |
| `day_schedule` / `appointment_count` **grows** | 🟠 **Investigate, do not roll back.** Reconcile against 0c-P1. Growth is the fix working. |
| `earliest_start`, `score`, `reason`, `buffer_minutes`, which dates are returned and their order **move either way** on a day whose count changed | 🟢 Expected, not a signal — an added appointment can become `previous_appointment` or change the suburb match. |
| Identical | 🟢 Expected on DEV. |

**§4.7b · The malformed-filter detector — the check this step exists for.** The function **fails
soft**: a bad `or=` yields a PostgREST 4xx that is logged while the function still returns HTTP 200
with an empty `day_schedule`. A technician reads as *freer*, not as an outage.

Studio → Edge Functions → `calculate-travel-time` → Logs. **`Error fetching appointments:` must be
absent.** Do not infer success from a 200. Run this against the 0c-DEV-1 positive-control pair
specifically — the old predicate alone would have matched that lead, so an empty `day_schedule`
there can only be a parse failure.

Also check the UI at **375px** on a Vercel **Preview** deployment (Preview points at DEV; the local
`.env` points at PROD, so never use `npm run dev` for this): open the booking flow for T on D and
confirm the availability panel loads with the same appointments, same times, same travel origin as
before.

## 4.8 · What DEV cannot rehearse

The acceptance test for the whole fix — a **secondary** technician's shared job appearing in their
day schedule — needs a two-technician booking, which cannot exist until Step 2. §4.7 is the proxy:
*today's data must produce today's answers*. Record that plainly in the sign-off rather than letting
a green DEV run imply the multi-tech case was tested.

## 4.9 · Rollback

Redeploy the captured bytes; never `git checkout` in a shared worktree.
```bash
npx supabase@2.101.0 functions deploy calculate-travel-time --project-ref ctppzqnysmzynkxjlzta --use-api --workdir ~/ef-scratch/0c-before-dev
```
Then verify the rollback the same way — download, hash, `cmp` against `897042d…`. A rollback deploy
is a deploy; it earns no more trust than the one it undoes.

Safe before Step 1. After the fan-out migration ships, rolling this back reinstates the silent
double-book — fix forward instead.

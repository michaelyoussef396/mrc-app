# SESSION 6 — `calculate-travel-time` DEPLOY RUNBOOK

**Written:** 2026-08-28 · **Worktree:** `~/mrc-travel-ef` · **Branch:** `fix/travel-time-multitech`
**Change:** the two `leads`-side technician filters (HANDOFF §4, EF-2) now also match a technician
via their own `calendar_bookings` rows.

**Status: CODE COMPLETE. NOT DEPLOYED.** Michael is deployment captain. Nothing below runs itself.

---

## 0 · WHERE THIS SITS IN THE ORDER

This is **step 0c**. It must be live and verified **before** the migration that permits fan-out
(HANDOFF §3, Step 1), and it is independent of 0a/0b.

| Step | What | This doc |
|---|---|---|
| 0a | Migration: `calendar_bookings.booking_group_id` | — |
| 0b | Deploy group-aware `send-inspection-reminder` (SESSION 5) | — |
| **0c** | **Deploy `calculate-travel-time` (this)** | ✅ |
| 1 | Migration: junction + 16 policy rewrites + Part D | must come after 0c |
| 2 | Code: multi-tech picker + fan-out writer | the gate |

**Why before, not after.** Edge Functions are global-immediate — no preview, no branch, no rollback
window. If a two-technician booking can exist before this is live, the secondary's availability
check silently under-reports their day and the engine offers a slot on top of a job they are already
attending. It does not throw. It offers a booking.

**0c and 0b are independent.** Either order is safe. Neither depends on the other.

---

## 1 · WHAT CHANGED

One file: `supabase/functions/calculate-travel-time/index.ts`. Three hunks, ~35 net lines.

1. **New helper `attendedLeadsFilter(technicianId, bookings)`** — builds a PostgREST filter matching
   leads the technician is the primary on **OR** leads named by their own booking rows.
2. **`check_availability`** — the existing `fetchMelbourneBookings` call moved above the `leads`
   query; `.eq('assigned_to', technician_id)` → `.or(attendedLeadsFilter(...))`.
3. **`get_recommended_dates`** — same reordering, same filter swap.

No new query. No new round trip. Both call sites already called `fetchMelbourneBookings`; the call
was only hoisted so its lead ids are available to the filter.

**Not touched:** the travel-time calculation, the Google Maps integration, the Distance Matrix
caching, the Sentry reporting, the rate limiter, the Zod schemas, the response shapes.

### The one `.eq('assigned_to')` that remains — and should

`index.ts:739` still reads `.eq('assigned_to', technicianId)` on **`calendar_bookings`**. That is
correct and must stay: `calendar_bookings` is the table that fans out, so a per-technician equality
on it is exactly right before and after fan-out.

---

## 2 · WHY THIS IS SAFE ON TODAY'S SINGLE-TECHNICIAN DATA

With one technician per lead, every booking row for technician T belongs to a lead whose
`assigned_to` is already T. The booking-sourced id set is therefore a **subset** of the
pointer-matched set, and `A OR (subset of A)` is `A`. **The result set is unchanged.**

### The one delta that is possible today — and it is a fix

A `calendar_bookings` row assigned to T whose lead has `assigned_to` NULL or a *different*
technician. HANDOFF §7 P3 measured this as `bucket2_null_pointer_but_booked = 0` on DEV and
**never measured it on PROD**.

If PROD has such rows, this change **adds** those leads to T's day. That is the correct answer — T
is booked on that job — and it is the same correction fan-out delivers. It is a widening toward
truth, not a regression. Expect it to show as a technician's day reading *busier* than before,
never freer.

**There is no input for which this returns fewer appointments than the old code.**

### The filter syntax has shipped precedent in this repo

The riskiest assumption in the change is the PostgREST `or=` string, because a malformed one fails
soft (§5.3). Both halves of it are already proven against this same PostgREST instance and this same
`leads` table:

| Shape | Proven by |
|---|---|
| `.or(...)` with a **single** term — the empty-day branch | `src/lib/api/leadDuplicates.ts:44` builds `conditions` that is one element whenever only a phone or only an email is supplied |
| `in.(…)` nested **inside** an `or` group | `src/hooks/useLeadsToSchedule.ts:74` — `.or('and(status.in.(new_lead,hipages_lead),assigned_to.is.null),status.eq.job_waiting')` |

The empty-day branch is the common path, so §5.2 row 5 tests it explicitly.

---

## 3 · DEPLOY

### 3.1 · Pre-flight, in `~/mrc-app-prod`

Per `feedback_ef_deploy_and_storage_swap`: **the deploy uploads from the current working directory,
not from the merged branch.** Deploying from `~/mrc-travel-ef` ships this worktree's tree. Merge
first, then deploy from `~/mrc-app-prod`.

```bash
cd ~/mrc-app-prod
git fetch --all
git status                 # must be clean
git log --oneline -3
```

Confirm the merge containing `fix/travel-time-multitech` is present, then prove the file on disk is
the one you intend to ship:

```bash
grep -n "attendedLeadsFilter" supabase/functions/calculate-travel-time/index.ts
```

**Expected: 3 lines** — the definition plus the two call sites. Zero lines means you are on the wrong
tree and the deploy would ship the old code. **STOP.**

### 3.2 · Target ref — state it aloud before running

> **Deploying `calculate-travel-time` to `ecyivrxjpsmjmexqatym`, which is PROD — the LIVE
> mrcsystem.com project serving real customers.** Global-immediate, no rollback window.

Per `CLAUDE.md`, get explicit confirmation before the next command runs.

### 3.3 · The command

```bash
cd ~/mrc-app-prod
npx supabase functions deploy calculate-travel-time --project-ref ecyivrxjpsmjmexqatym
```

---

## 4 · VERIFY BY DOWNLOADING THE DEPLOYED SOURCE AND DIFFING IT

**A version number is not verification.** The version increments on any deploy, including one that
uploaded the wrong tree. Per `feedback_ef_deploy_and_storage_swap`: verify by downloading the
deployed source and diffing it against the file you meant to ship.

```bash
cd ~/mrc-app-prod
npx supabase functions download calculate-travel-time --project-ref ecyivrxjpsmjmexqatym
```

The download overwrites `supabase/functions/calculate-travel-time/` in the working tree with what
PROD is actually running. Diff it against the committed source:

```bash
git diff --stat supabase/functions/calculate-travel-time/index.ts
```

**PASS: empty output.** Byte-identical — PROD is running the committed code.

**FAIL: any diff.** PROD is running something else. Read the diff before doing anything: it tells
you whether the wrong tree was uploaded or the deploy silently did not take.

If the download refuses to overwrite a dirty tree, put it somewhere else and diff explicitly:

```bash
mkdir -p /tmp/ef-verify && cd /tmp/ef-verify
npx supabase functions download calculate-travel-time --project-ref ecyivrxjpsmjmexqatym
diff -u ~/mrc-app-prod/supabase/functions/calculate-travel-time/index.ts \
        /tmp/ef-verify/supabase/functions/calculate-travel-time/index.ts
```

`diff` exiting 0 with no output is the pass condition.

### 4.1 · Belt-and-braces content check

Independent of the diff, confirm the three markers are present in the **downloaded** file:

```bash
grep -c "attendedLeadsFilter" <downloaded index.ts>                    # expect 3
grep -c "\.eq('assigned_to', technician_id)" <downloaded index.ts>     # expect 0
grep -c "\.eq('assigned_to', technicianId)" <downloaded index.ts>      # expect 1  (calendar_bookings)
```

The second is the one that matters: **zero** `leads`-side `assigned_to` equality filters remain.

---

## 5 · VERIFY CORRECT BEHAVIOUR ON TODAY'S SINGLE-TECHNICIAN DATA

The whole point of 0c is that it is verifiable **before** any multi-tech data exists. Today's data
must produce today's answers.

### 5.1 · Take a before-baseline FIRST

Steps 5.2/2–4 are a comparison. Before deploying, capture the day schedule and the recommended-dates
list for one technician and one date they are already booked on. Screenshots are enough.

### 5.2 · Through the real UI (the check that matters)

In the booking flow on mrcsystem.com, for a technician who **has at least one appointment on the
chosen date**:

| # | Action | Expected |
|---|---|---|
| 1 | Open the booking form, pick a technician and a date they are already booked on | Availability panel loads, no error toast |
| 2 | Read the day schedule | Same appointments, same times, same `ends_at` as the baseline |
| 3 | Read "previous appointment" / travel origin | Same suburb and address as the baseline |
| 4 | Open recommended dates | Same 5 days, same order, same scores, same slot lists |
| 5 | Pick a technician with an **empty** day | Still reads "Free all day, N min from home" |

**Any change in these numbers on single-technician data is a FAIL**, not an improvement — unless it
is the `bucket2` case in §2, which shows as *extra* appointments on a day where a booking exists but
`leads.assigned_to` does not point at that technician. If you see extra appointments, check that
lead's `assigned_to` before treating it as a bug.

Do this at **375px**, per `CLAUDE.md`.

### 5.3 · Watch the logs

```
Supabase Dashboard → PROD (ecyivrxjpsmjmexqatym) → Edge Functions → calculate-travel-time → Logs
```

Look for `Error fetching appointments:` — a malformed `or=` filter surfaces there as a PostgREST
`4xx` while the function still returns HTTP 200 with an empty schedule. **The function fails soft on
this path**, so a broken filter looks like "the technician has no appointments", not like an outage.
This log line is the only signal. Check it explicitly; do not infer success from a 200.

### 5.4 · After fan-out lands (Step 2) — the check this was built for

With a two-technician booking in place, run `check_availability` for the **secondary**:

- The shared job **must** appear in their day schedule.
- Their day **must not** score as "Free all day" in recommended dates.

Before this change, both would have been wrong. This is the acceptance test for the whole fix, but
it cannot run until Step 2 — which is exactly why §5.2 exists.

---

## 6 · ROLLBACK — MANUAL, NO PLATFORM SUPPORT

There is no `supabase functions rollback`. Rollback is a forward deploy of the previous source.

```bash
cd ~/mrc-app-prod
git log --oneline -- supabase/functions/calculate-travel-time/index.ts
git checkout <commit-before-this-change> -- supabase/functions/calculate-travel-time/index.ts
npx supabase functions deploy calculate-travel-time --project-ref ecyivrxjpsmjmexqatym
```

Then **verify the rollback the same way** — download and diff (§4). A rollback deploy is a deploy;
it earns no more trust than the one it is undoing.

```bash
git checkout HEAD -- supabase/functions/calculate-travel-time/index.ts   # restore the worktree
```

### Rollback is only safe before Step 1

Once the fan-out migration is live and a two-technician booking exists, rolling this back
**reinstates the silent double-book**. After Step 1, fix forward.

### Blast radius if you do nothing

The failure mode of this change is bounded: a wrong `or=` filter makes the appointments query fail
soft, so `check_availability` and `get_recommended_dates` report technicians as *freer* than they
are — the pre-existing behaviour this change fixes. It cannot corrupt data. The function performs no
writes.

---

## 7 · CALLERS — CONTRACT UNCHANGED

Every caller in the repo, and what this change does to it.

| # | Caller | Action | Transport | Effect |
|---|---|---|---|---|
| 1 | `src/hooks/useGoogleMaps.ts:55` | *(default)* | `supabase.functions.invoke` | **None.** Plain origin→destination; touches neither edited block. |
| 2 | `src/hooks/useBookingValidation.ts:246` | `check_availability` | direct `fetch` | Same request, same response shape. Only the row set behind `day_schedule` / `previous_appointment` widens. |
| 3 | `src/hooks/useBookingValidation.ts:345` | `get_recommended_dates` | direct `fetch` | Same request, same response shape. Only `appointment_count` / `reason` / `available_slots` reflect a fuller day. |

**Request schemas unchanged.** No field added, removed, renamed or made optional. The Zod schemas at
`index.ts:46` and `:56` are untouched, so no caller needs to send anything new.

**Response interfaces unchanged.** `AvailabilityResponse`, `RecommendedDatesResponse`,
`TriageLeadResponse` and `DateRecommendation` are byte-identical. No frontend deploy is coupled to
this one — 0c ships alone.

**`triage_lead` has no caller.** A repo-wide search finds the action string only inside the Edge
Function itself. It is dead on the wire today. It was read and left alone (§8.2).

**Source-asserting test still passes:** `src/lib/__tests__/travelTimeProvenance.test.ts` reads this
EF as text and asserts 18 invariants about fabricated travel figures and provenance. **18/18 pass**
after the change.

**Type check:** `deno check supabase/functions/calculate-travel-time/index.ts` exits 0. Note that
plain `deno check` fails in this worktree on a pre-existing, unrelated `npm:openai` type-resolution
error that an untouched sibling Edge Function reproduces identically; use
`deno check --node-modules-dir=auto` to get a real check. `npm run typecheck` is a no-op here and
proves nothing.

---

## 8 · EXAMINED AND DELIBERATELY NOT CHANGED

Recorded so a later reader does not mistake these for oversights.

### 8.1 · `endMinutesByLead` keyed by lead id

HANDOFF §4 flags that this map (now `index.ts:1085-1087`) is keyed by `leadId`, so a second row for
the same lead overwrites the first.

**Tracked as R12 in `docs/TODO.md`** — under "BUGS FOUND, NOT SCHEDULED", so it outlives this
runbook.

**Fan-out does not make this worse.** `fetchMelbourneBookings` filters
`.eq('assigned_to', technicianId)`, so it only ever sees **one technician's** rows. Fan-out adds a
row for the *other* technician, which this query never returns. The overwrite needs one technician
with two bookings on the same lead **on the same day** — possible today (a split morning/afternoon
job), unaffected by fan-out, and out of scope for a minimal 0c diff.

Left as-is. Worth its own ticket.

### 8.2 · `recommended_technician_id` is a scalar

HANDOFF §4 notes it "cannot express a pair" (`index.ts:1016`).

Widening it is a **contract change** to `TriageLeadResponse`, which 0c must not make. It is also
unnecessary: the same response already returns `ranked_technicians`, the **full** ranked list, so a
multi-tech picker has everything it needs without an EF change. And `triage_lead` currently has no
caller at all.

Left as-is. It belongs to Step 2's picker work, as a product decision.

### 8.3 · `inspection_scheduled_date` gates both leads queries

Both queries still filter on `leads.inspection_scheduled_date`, so a *remediation* booking whose
lead has a different `inspection_scheduled_date` does not appear in the day schedule.

This is pre-existing and applies **identically to the primary technician today**. Overlap blocking
for those jobs already comes from `fetchMelbourneBookings`, which is table-correct. Changing it would
alter today's behaviour, which 0c must not do.

Left as-is.

### 8.4 · URL length

`get_recommended_dates` inlines the booking-sourced lead ids into the query string. Worst realistic
case is ~14 business days of bookings — a few dozen UUIDs, ~1–2 KB. Well inside PostgREST and
gateway limits. Not a concern at MRC's volume; worth remembering if `days_ahead` ever grows a lot.

---

## 9 · WHAT WAS NOT DONE

- **Nothing deployed.** No Supabase command was run against any project by the authoring session.
- **No database was contacted.** Neither PROD nor DEV. `calendar_bookings`' column list was read
  from the committed `src/integrations/supabase/types.ts`, not from a live query.
- **`lead_assignments` is not referenced anywhere in the change.** It does not exist, and 0c deploys
  before it does. The fix works without it and needs no revisit once it lands.
- **No migration written or touched.** `supabase/migrations/**` is SESSION 4's.
- **`send-inspection-reminder` not touched.** That is SESSION 5's. No other Edge Function was
  modified.

# Codex week plan — 11–14 Sep 2026

Read `docs/CODEX_AUTHOR_BRIEF.md` first. This file is the work list; the
brief is the procedure. Working window is Fri–Sun, Claude returns Sunday
6pm.

## Production snapshot — 11 Sep monitoring intake

**`origin/production` is `bd0e984` and has not moved since 8 Sep. The
week's changes merged to main — the Sentry `ignoreErrors` fix, equipment
day counts, and per-item equipment days — are NOT in production.** A
main merge is not a production release. Michael supplied this production
state; local refs agree (`origin/main` is now `222386f`, after PR #169;
the lane cut at `9f831b6` below remains historical). Edge Function changes
also require Michael's separate deploy, including P2-23.

**Any monitoring note saying `sentry.ts` still suppresses `Failed to fetch`,
`NetworkError`, `Load failed` and `AuthRetryableFetchError` is CORRECT about
production and stale about main.** PR #167 removed them on main; all four
remain in the `bd0e984` production revision. Do not dismiss a production
finding from a main code read, or repeat the already-merged fix on main.

The Sentry connector was **`needs_reconnect` in all seven runs, 8–11 Sep**:
four days without browser-error visibility through monitoring. **Michael's
OAuth reconnect, not a code item (T25).** This is separate from the
suppression rules; no Sentry findings during that gap is not a health signal.

**New live P0 intake:** P0-14 (lost job-booking confirmation), P0-A
(inspection version inserts rejected), P0-B (unretried bounced confirmation).
These require explicit triage alongside P0-13; the pre-intake priority wording
below is historical and does not rank these newly verified incidents below it.
Details and proposed fixes are in `docs/TODO.md`; this intake writes docs only.

## Read first — the highest-priority item this window is NOT yours

**P0-13, quote PDF layout overlap, outranks everything below. Codex must
not attempt any part of it.** Customer-facing, on live quotes, reported by
Vryan 2026-09-10 and unanswered for two days. Three defects on one page:

- **(c) needs NO CODE.** `generate-inspection-pdf` must be **deployed**.
  The fix is already merged (`ff2d24a`, P2-23) and sitting on `origin/main`
  — the repo is right and the live quote is wrong purely because the
  Edge Function has not been deployed. **Michael. Do this first.**
- **(a) and (b)** live in the Edge Function and the Storage template.
  **Both SACRED, both human-applied.** Per P2-17 the live template is read
  from the `pdf-templates` bucket, not from git, so editing
  `src/templates/inspection-report-template.html` is **inert** anyway.

**This is a MICHAEL task, not a Codex lane.** Do not open a worktree for
it, do not "helpfully" edit the template, do not prepare a deploy command
unless asked. Full detail is P0-13 in `docs/TODO.md`.

## The three lanes

Three lanes, file-disjoint, all cut from `origin/main` at **9f831b6**
(verified 11 Sep). **Cap is three concurrent worktrees.** One unit at a
time inside a lane: build → tests → commit locally → next. Nothing is
pushed, nothing is merged, no PR is opened.

## Lane A — `~/mrc-p0-hidden`, branch `fix/inspection-save-integrity`

At **5848ed5**. Owns `src/pages/TechnicianInspectionForm.tsx`.

| Unit | Work |
|---|---|
| **A1** | **Serialise complete saves including child reconciliation, on BOTH the create and the update paths. HIGHEST VALUE — do this first.** The reproduction is `docs/repro/REPRO-stale-snapshot-delete.test.tsx.txt`. **That file exists only inside this worktree**, committed at `5848ed5`; it is not on `origin/main`, so it will not be found from any other tree. Copy it to `src/pages/__tests__/` and run it before writing a fix — **it MUST fail**. If it passes, stop: the harness is wrong, not the defect. |
| **A2** | Lift `getLabourWorkDays`, `getExplicitEquipmentDays` and `getSharedEquipmentDays` out to `src/lib/calculations/` and unit-test them directly (**P2-29**). They are pure functions of `formData`, so no render harness is needed. |
| **A3** | Twelve stepper buttons at `w-10` (40px) against the 48px minimum (**P2-33**). |

## Lane B — `~/mrc-stalled-sweep`, branch `feat/stalled-inspection-visibility`

Tip is **30a7090** (a session-log commit); **be78c19** is the B1/B2
feature commit directly beneath it. Owns the new hooks plus
`AdminDashboard.tsx`.

| Unit | Work |
|---|---|
| **B1** | `useStalledInspections` + test. Cap **210**, PRE-GRANTED. |
| **B2** | `StalledInspectionsCard` + tile + `AdminDashboard`. Cap **175**, PRE-GRANTED. |

Both commits, **ONE PR**. Neither lands alone.

**No longer urgent — do not treat this as a live P0 (11 Sep).** The three
leads that made it urgent — `MRC-2026-0136`, `MRC-2026-0168` and
`MRC-2026-0127` — are all finished as of 11 Sep, verified in PROD: none
appears in the stalled predicate any more. Clayton completed them
unprompted. The remaining stalled set is the two known triple-fire stubs
on `MRC-2026-0124` (**P2-44**, explicitly not this window) plus two August
jobs already scheduled. **Lane B stays worth building — it is prevention,
not remediation** — but it is ordinary P2 work now and must not be
described as live damage.

## Lane C — `~/mrc-timeline-attr` (NEW worktree, create it)

Owns `ActivityTimeline.tsx` plus the six writer paths. **This is app-code,
NOT a migration** — no DB function writes `activities`, verified in PROD
9 Sep.

| Unit | Work |
|---|---|
| **C1** | `ActivityTimeline` fallback: a row with no `user_id` must render "System" / "Website", not a bare timestamp. **123 of 207 leads have `created_by` NULL**, so this is a legitimate state, not an error state — render it as one. |
| **C2** | The six writer paths pass `user_id`. Verified in PROD 9 Sep, all NULL: `status_change` 8/8, `inspection_booked` 93/93, `booking_cancelled` 45/45, `job_completion_submitted` 5/5, `archived` 3/3, `lead_not_proceeding` 1/1. |

Filed together as **P2-39**.

## NOT this window

| Item | Why |
|---|---|
| **P0-13** — quote PDF layout overlap | **Highest priority item in the repo and still not yours.** (c) is a deploy of already-merged code; (a) and (b) are the Edge Function and the Storage template. Michael only — see the top of this file. |
| **P2-23** — equipment days on the quote PDF | Merged at `ff2d24a`, **not deployed**. There is no code left to write. Deploy only. |
| **P2-44** — `MRC-2026-0124` child-row re-parent | Live data surgery. Both FKs are `ON DELETE CASCADE`; deleting the stub destroys the only area record. Michael only. |
| **P2-42** — migration drift | Needs PROD queries, and every `supabase` command is banned this window. |
| **P2-36** — six lead-source categories | Scope runs Framer form → `receive-framer-lead` EF → `leads.lead_source`, which crosses `supabase/functions/`. SACRED. Filed, not scheduled. |
| **P1-21** — "Recommend Dehumidifier Hire" toggle | May be inert; the template lives in Storage, not the repo. |
| Anything under `supabase/` | Migrations and Edge Functions are human-applied. Write the SQL, Michael runs it. |

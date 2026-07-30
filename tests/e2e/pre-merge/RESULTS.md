# Pre-merge breadth run — results

**Run:** 2026-07-29 · **Branch:** `fix/admin-analytics-accuracy`
**Target:** `http://localhost:8080` (local dev) · **Database:** DEV `ctppzqnysmzynkxjlzta`
**Result: 40 passed · 48 skipped · 0 failed** (20 + 24 per project × 2 projects)

Projects: `chromium` 1440×900 and `mobile-chromium` 375×667. Every spec is named
`*.mobile.spec.ts` so it runs under both.

---

## ⚠️ Two caveats on this run

**1. This did NOT run against the Vercel preview.** The preview URL arrived twice as an
unfilled placeholder (`<paste pinned commit-hash URL>` then `<paste>`), and the Vercel MCP
returns **403 Forbidden** for project `prj_TxVagFdUy1oPQwCrqZkYr35ZkJ9H`, so it could not be
looked up. Local dev was used instead: same source, and `.env.development.local` points it
at the same DEV project the preview's Preview-scope env vars use — so selector and render
results transfer. **The bundle check was not performed** and must be redone against the
real preview URL.

**2. The merge described in the instructions has not happened.** Verified:
`origin/main` is at `97f3b44`, *behind* local `main` (`008e6aa`), and **neither contains
`launch/checks` nor `fix/admin-analytics-accuracy`**. The four `launch/checks` specs were
therefore **not** un-skipped — those surfaces do not exist in any reachable checkout, and
un-skipping would produce false failures.

---

## Pass / fail by spec

| Spec | Route | Tests | Result |
|---|---|---|---|
| `auth-smoke` | `/` | 3 | ✅ pass |
| `reports` | `/admin/reports` | 9 | ✅ pass (1 documented expected-failure, below) |
| `invoice-helper` | `/admin/invoice/:leadId` | 3 | ✅ pass |
| `job-completion` | `/technician/job-completion/:leadId` | 3 | ✅ pass |
| `inspection-form` | `/technician/inspection?leadId=` | 2 | ✅ pass |
| `technicians` (§3.5 + §3.6) | `/admin/technicians`, `/admin/technicians/:id` | 8 | ⏭️ **skipped — blocked, see below** |
| `admin-dashboard.skip` | `/admin` | 7 | ⏭️ skipped — `launch/checks` `91dd58f` |
| `leads-pipeline.skip` | `/admin/leads` | 5 | ⏭️ skipped — `launch/checks` `d50b117`, `396ca9c` |
| `settings-profile.skip` | `/admin/settings`, `/admin/profile` | 4 | ⏭️ skipped — `launch/checks` `b4d4cc3` |

No console errors and no error boundary on any route that ran.

---

## Findings

### 🔴 1. Reports scrolls horizontally at 375px — REAL DEFECT, pre-existing

| | |
|---|---|
| **Route** | `/admin/reports` |
| **Checklist entry** | §3.4 — "375px. KPI cards stack, chart does not overflow." |
| **Console error** | none — this is a layout defect, not a JS error |
| **Measured** | document `521px` against a `375px` viewport |
| **Culprit** | `src/components/reports/PeriodFilter.tsx:22` — `inline-flex` row of four buttons, 318px wide, does not wrap. Sits in `AdminPageLayout`'s right-hand `actions` slot; its right edge lands at 521px. |
| **Introduced by this branch?** | **No.** `git log main..HEAD -- PeriodFilter.tsx AdminPageLayout.tsx` is empty. |
| **Comparison** | `/admin` measures exactly 375px — the defect is specific to the Reports header. |

Notably **no single element is wider than the viewport**, which is why this is easy to miss
by eye: the filter is normal-width but pushed right by the title beside it.

Recorded as `test.fail()` in `reports.mobile.spec.ts` rather than deleted, so the suite is
green *and* honest. Playwright flips it to a hard failure the moment the CSS is fixed —
that is the signal to remove the marker. Likely fix: `flex-wrap` on the filter, or let the
layout header wrap below `sm`.

### 🟠 2. Technicians list and profile cannot be tested on DEV — environment gap

| | |
|---|---|
| **Routes** | `/admin/technicians`, `/admin/technicians/:id` |
| **Checklist entries** | §3.5, §3.6 |
| **Cause** | `manage-users` Edge Function returns **404 on DEV** (`ctppzqnysmzynkxjlzta`) — probed directly. |

Both surfaces are driven entirely by `useTechnicianStats` / `useTechnicianDetail`, which
fetch that function. The fetch fails, the hook catches and returns `[]`, and the page
renders "No Technicians Found" — so every assertion fails on absent elements. This matches
`docs/TODO.md`: the DEV restore never carried any Edge Function, and only
`generate-inspection-pdf`, `generate-job-report-pdf` and `generate-inspection-summary` were
later deployed.

**Preview deploys use the same DEV project, so this cannot pass there either.** Unblock with:

```
npx supabase functions deploy manage-users --project-ref ctppzqnysmzynkxjlzta
```

Then delete `.skip` from the two `test.describe.skip(` calls in `technicians.mobile.spec.ts`.
The stale `technicians-list.*.png` screenshots in `__screenshots__/` show the blocked empty
state and are evidence of this, not of a passing run.

### 🟡 3. `playwright.config.ts` webServer URL is wrong — pre-existing

`webServer.url` is `http://localhost:5173`, but Vite serves this project on **8080**. Any
`npx playwright test` without `PLAYWRIGHT_BASE_URL` set waits 120s and dies with
`Timed out waiting 120000ms from config.webServer`. This affects the **9 pre-existing
specs** in `tests/e2e/` too, not just these.

Not fixed here — `playwright.config.ts` is outside the permitted edit scope for this task.
Worth a one-line follow-up.

### 🟡 4. Technician-toggle login does not land on `/technician`

`Login.tsx` `redirectByRole()` (lines 237-248) routes to the landing page of the role it
resolves. The test account holds admin, technician **and** developer, and the technician
toggle was observed staying on `/`. Account/app behaviour, not a defect in any surface
under test.

Worked around in `helpers/session.ts`: sign in via the working admin path, then navigate
directly to the `/technician/*` route. `RoleProtectedRoute` checks role **membership**, not
which toggle was used, so the guard passes. `signInAndGoto` asserts the guard did not bounce,
so a permissions problem can never read as a render problem.

---

## Deliberately not asserted

**Section 7 HEPA panel (§3.1).** The inspection form mounts on Section 1 and the HEPA
control is not in the DOM until Section 7 is opened. Reaching it requires clicking through
section navigation, and `TechnicianInspectionForm` **saves on section change** — a write,
which this run forbids. Section 7 verification stays manual, as §3.1 already specifies
(panel gating, "Auto (N) days", $100/unit/day, autosave round-trip).

**All money values.** Breadth run: shape only (`/^\$[\d,.]+k?$/`, `/^\d{2}\/\d{2}$/`,
integer, duration), never specific figures. DEV data differs from the PROD figures quoted
in the checklist. Correctness stays manual.

---

## Write safety — what this run actually did

No form submitted, no record created, updated or deleted, no Edge Function deployed, no
migration run, no merge, no production push, no change to `ALL_STATUSES`.

Two honest caveats:

- **Logging in writes.** Each test authenticates, creating `login_activity` /
  `user_sessions` rows. Unavoidable for an authenticated app; no business record touched.
- **The forms autosave, and were verified safe before being opened.**
  `useJobCompletionForm` runs a 30s interval that *does* save to the DB, gated on
  `hasUnsavedChanges`. That flag has exactly two setters — `handleChange` (line 265) and
  the "Restore" toast `onClick` (line 358). Mount never sets it. The specs never focus,
  type into, or clear a field, and never click Restore. `job-completion.mobile.spec.ts`
  additionally asserts no unsaved-changes state appears, which would be the tripwire.

---

## Re-running

```bash
set -a; . ./.env.test; set +a
PLAYWRIGHT_BASE_URL=http://localhost:8080 npx playwright test tests/e2e/pre-merge --reporter=list
```

Against the real preview, replace `PLAYWRIGHT_BASE_URL` with the pinned per-deployment
commit-hash URL (never the branch alias) and do the bundle check first — fetch the main JS
bundle and confirm whether it carries `ctppzqnysmzynkxjlzta` (DEV) or `ecyivrxjpsmjmexqatym`
(PROD) before trusting any figure on screen.

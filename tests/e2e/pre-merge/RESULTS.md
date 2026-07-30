# Pre-merge breadth run — results

**Run:** 2026-07-30 · **Branch:** `main` @ `8fe47e9` (both streams merged)
**Target:** `http://localhost:8080` (local dev) · **Database:** DEV `ctppzqnysmzynkxjlzta`
**Result: 88 passed · 0 failed · 0 skipped** — 44 tests × 2 viewport projects

Projects: `chromium` 1440×900 and `mobile-chromium` 375×667. Every spec is named
`*.mobile.spec.ts` so it runs under both. 19 screenshots in `__screenshots__/`.

---

## ⚠️ This did NOT run against the Vercel preview

**Vercel Deployment Protection (SSO) is enabled** on
`mrc-system-ecukblmoh-michaelyoussef396s-projects.vercel.app`. The root returns
**HTTP 302** to `https://vercel.com/sso-api?url=…`, so neither curl nor Playwright can
load it, and no bypass secret (`VERCEL_AUTOMATION_BYPASS_SECRET`) is available in the
environment.

**Consequence: the bundle check could not be performed.** The bundle itself sits behind the
redirect, so the DEV-vs-PROD question the check exists to answer is *unresolved for the
preview*. That is a gate, not a formality — running a suite against a preview that might be
wired to PROD is exactly what the check prevents. **It must be redone before anyone trusts a
figure on the preview.**

To unblock, either:
- add `VERCEL_AUTOMATION_BYPASS_SECRET` to the env and pass
  `x-vercel-protection-bypass`, or
- disable Deployment Protection for this deployment.

**What was run instead, and why it is still meaningful:** local dev against the same DEV
project. Confirmed behaviourally, not assumed — on 2026-07-29 the technicians page rendered
empty *because `manage-users` 404'd*, and that 404 was DEV-only (PROD has it deployed).
Local dev therefore talks to DEV. Same source, same database as the preview's Preview-scope
env, so selector and render results transfer. Only the built-bundle-specific risks (env-var
wiring, build-time substitution) remain unverified.

---

## Pass / fail by spec

| Spec | Route | Tests | Result |
|---|---|---|---|
| `auth-smoke` | `/` | 3 | ✅ |
| `admin-dashboard` | `/admin` | 7 | ✅ |
| `reports` | `/admin/reports` | 9 | ✅ (1 armed expected-failure, below) |
| `technicians` §3.5 | `/admin/technicians` | 5 | ✅ |
| `technicians` §3.6 | `/admin/technicians/:id` | 3 | ✅ |
| `leads-pipeline` | `/admin/leads` | 5 | ✅ |
| `invoice-helper` | `/admin/invoice/:leadId` | 3 | ✅ |
| `settings-profile` | `/admin/settings`, `/admin/profile` | 4 | ✅ |
| `job-completion` | `/technician/job-completion/:leadId` | 3 | ✅ |
| `inspection-form` | `/technician/inspection?leadId=` | 2 | ✅ |

**No failures.** No console errors and no error boundary on any route.

---

## Verified working

| Behaviour | Commit | Evidence |
|---|---|---|
| Pipeline tab order matches `ALL_STATUSES` | `d50b117` | All 17 rendered labels match in exact order |
| `pending_review` immediately after `job_completed` | `d50b117` | Index assertion, both viewports |
| `?status=` deep links pre-select the tab | `396ca9c` | `?status=pending_review` activates Pending Review; `LeadsManagement.tsx:143` reads the param |
| Dashboard card deep-links to a filtered leads page | `396ca9c` | Overdue card → `/admin/leads?status=…`, non-`All` tab active |
| Settings lost "Log out from ALL devices" | `b4d4cc3` | Absent on Settings, present on Profile — both asserted |
| Dashboard KPI reporting | `91dd58f` | Overdue renders `2 · $8,928.67`; revenue, today's jobs, leads-to-assign all render figures |
| Technician card shows Active Leads **and** real Inspections | `613a4a7` | Four stat labels + the period caption |
| "Not Landed" replaces "Cancelled" | `48702a3` | Workload legend asserted; old label asserted absent |
| Total Leads KPI equals chart total | `526bf1d` | The headline fix — numbers now agree |
| Avg Response Time never `"0 min"` | `526bf1d` | `expectDuration` rejects that string outright |
| Australian DD/MM last-seen | — | Rendered `04/05`, `02/03`, `10/03` — the exact values from the PROD audit |
| Invoice helper survives with no saved invoice | §4 | All money rows valid currency, no `NaN` |

---

## Findings

### 🔴 1. Reports scrolls horizontally at 375px — REAL DEFECT, pre-existing, **left armed**

| | |
|---|---|
| **Route** | `/admin/reports` |
| **Checklist entry** | §3.4 — "375px. KPI cards stack, chart does not overflow." |
| **Console error** | none — layout defect, not a JS error |
| **Measured** | document `521px` against a `375px` viewport |
| **Culprit** | `src/components/reports/PeriodFilter.tsx:22` — `inline-flex` row of four buttons, 318px, does not wrap. Sits in `AdminPageLayout`'s right-hand `actions` slot; right edge lands at 521px. |
| **Pre-existing?** | Yes — `git log` shows neither file touched by the analytics work. |
| **Comparison** | `/admin` measures exactly 375px. Specific to the Reports header. |

**No single element exceeds the viewport**, which is why it survives visual review — the
filter is normal-width but pushed right by the title beside it.

Kept as `test.fail()` at `reports.mobile.spec.ts:58`, **armed as requested**. It will flip
to a hard failure the moment the `flex-wrap` fix lands — that is the signal to delete the
marker.

### 🟡 2. `playwright.config.ts` webServer URL is wrong — pre-existing, not fixed

`webServer.url` is `http://localhost:5173`; Vite serves this project on **8080**. Any
`npx playwright test` without `PLAYWRIGHT_BASE_URL` waits 120s then dies with
`Timed out waiting 120000ms from config.webServer`. **This affects the 9 pre-existing specs
in `tests/e2e/` too.** Not fixed — the config is outside this task's edit scope. One-line
follow-up.

### 🟡 3. Technician login toggle does not land on `/technician`

`Login.tsx` `redirectByRole()` (237-248) routes to the landing page of the role it resolves.
The test account holds admin, technician **and** developer, and the technician toggle was
observed staying on `/`. Account/app behaviour, not a defect in any surface under test.

Handled in `helpers/session.ts`: sign in via the working admin path, then navigate directly.
`RoleProtectedRoute` checks role **membership**, not the login toggle. `signInAndGoto`
asserts the guard did not bounce, so a permissions problem can never read as a render problem.

### 🟡 4. Google Maps key absent from the build env — allowlisted, worth checking on deploys

`[useGoogleMaps] Google Maps API key not configured — VITE_GOOGLE_MAPS_API_KEY missing at
build time` on `/admin`. Environmental, not code. Allowlisted in `helpers/breadth.ts` with
that reason, and every suppressed message is still attached to the test report rather than
hidden. **It will appear on any deploy whose env lacks the key — worth confirming Preview
and Production scope both have it.**

---

## Deliberately not asserted

**Section 7 HEPA panel (§3.1).** The inspection form mounts on Section 1 and the HEPA control
is not in the DOM until Section 7 opens. Reaching it requires section navigation, and
`TechnicianInspectionForm` **saves on section change** — a write, which this run forbids.
Stays manual, as §3.1 already specifies (panel gating, "Auto (N) days", $100/unit/day,
autosave round-trip).

**All money values.** Shape only — currency, DD/MM, integer, duration — never specific
figures. DEV data differs from the PROD figures in the checklist. Correctness stays manual.

**Cross-surface count equality.** The sidebar badge counts unassigned `new_lead`/
`hipages_lead`; "Leads to Assign" is its own query. Asserting they match is a correctness
claim, left to the manual pass.

---

## Write safety

No form submitted, no record created/updated/deleted, no Edge Function deployed, no
migration run, no merge, no production push, no change to `ALL_STATUSES`.

**Migration `20260729153000_invoice_totals_integrity_checks.sql` was NOT applied.** It is on
main but applied nowhere, and per `docs/TODO.md` must run only *after* the invoice row
deletions — both gated until after 4 Aug.

Two honest caveats:

- **Logging in writes.** Each test authenticates, creating `login_activity` /
  `user_sessions` rows. Unavoidable for an authenticated app; no business record touched.
- **The forms autosave, and were verified safe before being opened.**
  `useJobCompletionForm` runs a 30s interval that *does* save, gated on `hasUnsavedChanges`.
  That flag has exactly two setters — `handleChange` (line 265) and the "Restore" toast
  `onClick` (line 358). Mount never sets it. The specs never focus, type into, or clear a
  field, and never click Restore. `job-completion.mobile.spec.ts` additionally asserts no
  unsaved-changes state appears, as a tripwire.

---

## Re-running

```bash
set -a; . ./.env.test; set +a
PLAYWRIGHT_BASE_URL=http://localhost:8080 npx playwright test tests/e2e/pre-merge --reporter=list --workers=2
```

Against the preview, once SSO is bypassed: replace `PLAYWRIGHT_BASE_URL` with the pinned
per-deployment commit-hash URL and **do the bundle check first** — fetch the main JS bundle
and confirm whether it carries `ctppzqnysmzynkxjlzta` (DEV) or `ecyivrxjpsmjmexqatym` (PROD)
before trusting any figure on screen.

`--workers=2` matters: at full concurrency the dev server starves and the EF-backed
technician surfaces time out.

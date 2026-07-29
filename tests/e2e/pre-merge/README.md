# Pre-merge breadth run

Proves every user-visible surface in `docs/PRE_MERGE_TESTING_CHECKLIST.md` renders,
navigates and survives 375px. **Breadth, not correctness** — money values stay manual.

## Run

```bash
# 1. Credentials (never committed — see ../env.example)
export ADMIN_EMAIL=... ADMIN_PASSWORD=...
export TECH_EMAIL=...  TECH_PASSWORD=...

# 2. Target the pinned per-deployment preview URL, never the branch alias.
#    PLAYWRIGHT_BASE_URL is what playwright.config.ts reads.
export PLAYWRIGHT_BASE_URL="https://mrc-app-1-<commit-hash>-....vercel.app"

npx playwright test tests/e2e/pre-merge --reporter=list
```

Omitting `PLAYWRIGHT_BASE_URL` makes the config auto-start `npm run dev` and run
against local dev instead.

## Why every file is named `*.mobile.spec.ts`

`playwright.config.ts` gates the 375px project on `testMatch: /mobile\.spec\.ts$/`.
The naming makes each spec run under **both** projects — `chromium` (1440×900) and
`mobile-chromium` (375×667) — from one file. Renaming away from that suffix silently
drops 375px coverage.

## Write safety

This run is read-only against business data. It never submits a form, creates,
updates or deletes a record, deploys an Edge Function or runs a migration.

Two caveats stated plainly:

- **Logging in writes.** Authenticating creates `login_activity` / `user_sessions`
  rows. Unavoidable for testing an authenticated app; no business record is touched.
- **The forms autosave.** `useJobCompletionForm` runs a 30s interval that *does* save
  to the DB, gated on `hasUnsavedChanges`. That flag is only set by `handleChange`
  (field edits) and the "Restore" toast's `onClick` — mount never sets it. The specs
  therefore **never focus, type into, or clear a field, and never click Restore**.
  Keep it that way when extending them.

## Skipped specs — post-merge surfaces

`*.skip.mobile.spec.ts` files are scaffolded but `test.describe.skip`-ed. They cover
behaviour that lands with `launch/checks` (`0350749`), which is not on `main`; this
branch descends from `main`, so their absence here is branch scoping, not a defect.

| File | Un-skip when | Commit |
|---|---|---|
| `admin-dashboard.skip` | dashboard reporting fixes land | `91dd58f` |
| `leads-pipeline.skip` | tab reorder + `?status=` deep links land | `d50b117`, `396ca9c` |
| `settings-profile.skip` | Settings danger-zone removal lands | `b4d4cc3` |

Un-skip by deleting `.skip` from the `test.describe.skip(` call, then run as part of
the combined post-merge pass.

**Do not "fix" a failing pipeline-order test by editing `ALL_STATUSES`.** That array is
frozen: `LeadDetail.tsx` `handleChangeStatus` uses `ALL_STATUSES.indexOf()` against
hardcoded thresholds to null `assigned_to`, booking dates, `invoice_amount`,
`invoice_sent_date` and `payment_received_date` on status reversion. Reordering it
silently wipes customer financial data. The spec asserts the UI matches the array —
the array is authoritative.

## Fixtures

`helpers/fixtures.ts` holds row ids only, no credentials. Defaults are the DEV rows
staged by the HEPA/waste session; override with `PRE_MERGE_JOB_LEAD_ID`,
`PRE_MERGE_INSPECTION_LEAD_ID`, `PRE_MERGE_INVOICE_LEAD_ID`.

`/technician/job-completion/:leadId` takes the **lead** id. For JOB-2026-2237
(`1b81f7e7-…33c5`) that is `24422eb2-…`. The job-completion id would 404.

Em-dashes / "not quoted" states on that fixture are **correct** — the row predates the
quoted-snapshot code and exercises the legacy never-quoted path.

Both `/technician/*` routes are gated on the `technician` role, and RLS limits
technicians to assigned leads, so `TECH_EMAIL` must hold that role *and* be assigned
to the fixture leads.

## Output

- `__screenshots__/<route>.375.png` for every route; `.1920.png` additionally for admin routes.
- `RESULTS.md` — pass/fail table naming route, console error and checklist entry per failure.

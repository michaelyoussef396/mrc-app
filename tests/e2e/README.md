# E2E Tests

Playwright E2E suite for the MRC app. Covers the automatable portions of
`docs/MANUAL_TESTING_CHECKLIST.md` — auth, navigation, dashboards, form
scaffolding, and role protection. Anything requiring real email delivery,
real phone calls, or destructive state mutations stays manual.

## Setup

```bash
npm install -D @playwright/test
npx playwright install chromium
cp .env.test.example .env.test
# fill in ADMIN_EMAIL, ADMIN_PASSWORD, TECH_EMAIL, TECH_PASSWORD
```

## Run

```bash
# local dev server (auto-started by Playwright)
npx playwright test

# against production
PLAYWRIGHT_BASE_URL=https://your-prod-url.vercel.app npx playwright test

# one file
npx playwright test auth.spec.ts

# list every test case
npx playwright test --list
```

## Fixtures

State-dependent tests (lead detail, job report, revision, invoice pipeline)
skip unless you supply fixture IDs via env:

| Env var             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `TEST_LEAD_ID`      | Any existing lead UUID (read-only flows)      |
| `TEST_INSPECTION_ID`| Inspection with a generated PDF               |
| `REVISION_LEAD_ID`  | Lead currently in revision-pending state      |
| `INVOICED_LEAD_ID`  | Lead at `invoicing_sent` status               |
| `PAID_LEAD_ID`      | Lead at `paid` status                         |
| `FINISHED_LEAD_ID`  | Lead at `finished` status                     |

## Writing new tests

- Use the helpers in `helpers/auth.ts` to log in — never hard-code creds.
- Prefer role-based locators (`getByRole`, `getByText`) over CSS selectors.
- Assert on visible text / URL / toast — not on visual pixel output.
- Skip rather than fail when a prerequisite fixture is missing.
- Mobile-viewport tests live inside `test.describe('mobile (375px)')` blocks.

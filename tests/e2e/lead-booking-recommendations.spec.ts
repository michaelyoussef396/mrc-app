import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Booking card — advisory preferred slot + recommendation failure surfacing.
 *
 * Two behaviours under test:
 *  1. The customer's preferred slot is displayed and feeds the ranking, but never
 *     pre-fills the date/time pickers. The admin picks deliberately.
 *  2. A failed recommendation lookup renders an amber role="alert" banner that is
 *     distinct from the genuine "no free days" empty state. Previously both rendered
 *     the same sentence, so the admin could not tell a broken backend from a
 *     scheduling answer.
 *
 * The failure path needs no mocking on DEV: calculate-travel-time is not deployed
 * there (probe-verified HTTP 404, versus 401 for a function that does exist), so
 * selecting a technician takes the failure branch for real.
 *
 * Not named *.mobile.spec.ts on purpose — that pattern routes to the Pixel 5 project,
 * which pins one viewport. Widths are driven in-spec so all three are covered.
 */

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
] as const;

const FAILURE_COPY = /Couldn't reach the scheduling service — pick a date manually/i;
const EMPTY_COPY = /No free days in the next 14 days/i;

/** The desktop queue lives in an `lg:` aside; below 1024px it is behind a FAB sheet. */
async function openLeadsQueue(page: Page, width: number): Promise<void> {
  await page.goto('/admin/schedule');
  if (width < 1024) {
    const fab = page.locator('.lg\\:hidden button').first();
    await expect(fab).toBeVisible({ timeout: 25_000 });
    await fab.click();
  }
}

/**
 * Expand the first inspection lead in the queue and return its card.
 * Returns null when the queue holds no inspection leads.
 */
async function expandFirstInspectionCard(page: Page): Promise<Locator | null> {
  const dateInputs = page.locator('[data-testid="inspection-date"]');

  // Cards render collapsed; the chevron toggles them. Try each visible card header.
  const headers = page.locator('div:visible', { hasText: /Prefers|No suburb|•/ });
  const toggles = page.locator('button:visible').filter({ has: page.locator('svg') });

  for (let i = 0; i < Math.min(await toggles.count(), 12); i += 1) {
    if (await dateInputs.locator('visible=true').count()) break;
    await toggles.nth(i).click({ trial: false }).catch(() => undefined);
    await page.waitForTimeout(250);
  }

  if (!(await dateInputs.locator('visible=true').count())) {
    void headers;
    return null;
  }
  return page.locator('[data-testid="inspection-date"]:visible').first();
}

for (const vp of VIEWPORTS) {
  test.describe(`LeadBookingCard @ ${vp.name} (${vp.width}px)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsAdmin(page);
      await openLeadsQueue(page, vp.width);
    });

    test('the inspection date picker starts empty', async ({ page }) => {
      const dateInput = await expandFirstInspectionCard(page);
      if (!dateInput) test.skip(true, 'No inspection leads in the scheduling queue');

      await expect(dateInput!).toHaveValue('');
    });

    test('the time slot picker starts empty', async ({ page }) => {
      const dateInput = await expandFirstInspectionCard(page);
      if (!dateInput) test.skip(true, 'No inspection leads in the scheduling queue');

      await expect(page.locator('[data-testid="inspection-time"]:visible').first()).toHaveValue('');
    });

    test('a failed recommendation lookup renders the amber alert banner', async ({ page }) => {
      test.skip(
        !!process.env.PLAYWRIGHT_PROD,
        'calculate-travel-time is deployed on prod, so the failure path does not fire',
      );

      const dateInput = await expandFirstInspectionCard(page);
      if (!dateInput) test.skip(true, 'No inspection leads in the scheduling queue');

      // Scheduling is pointer-events:none until the address is confirmed.
      await page.getByRole('button', { name: /Address is Correct/i }).first().click();
      await page.locator('button:visible').filter({ hasText: /^[A-Z]/ }).first().waitFor();

      const technician = page
        .locator('div:visible')
        .filter({ hasText: /Assign Technician/i })
        .locator('button:visible')
        .first();
      await technician.click();

      const alert = page.locator('[data-testid="recs-error"]');
      await expect(alert).toBeVisible({ timeout: 20_000 });
      await expect(alert).toHaveText(FAILURE_COPY);
    });

    test('a failed lookup is not reported as a scheduling answer', async ({ page }) => {
      test.skip(
        !!process.env.PLAYWRIGHT_PROD,
        'calculate-travel-time is deployed on prod, so the failure path does not fire',
      );

      const dateInput = await expandFirstInspectionCard(page);
      if (!dateInput) test.skip(true, 'No inspection leads in the scheduling queue');

      await page.getByRole('button', { name: /Address is Correct/i }).first().click();
      const technician = page
        .locator('div:visible')
        .filter({ hasText: /Assign Technician/i })
        .locator('button:visible')
        .first();
      await technician.click();

      await expect(page.locator('[data-testid="recs-error"]')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(EMPTY_COPY)).toHaveCount(0);
      await expect(page.getByText(/No recommendations available/i)).toHaveCount(0);
    });

    test('the manual date picker stays usable after a failed lookup', async ({ page }) => {
      test.skip(
        !!process.env.PLAYWRIGHT_PROD,
        'calculate-travel-time is deployed on prod, so the failure path does not fire',
      );

      const dateInput = await expandFirstInspectionCard(page);
      if (!dateInput) test.skip(true, 'No inspection leads in the scheduling queue');

      await page.getByRole('button', { name: /Address is Correct/i }).first().click();
      await page
        .locator('div:visible')
        .filter({ hasText: /Assign Technician/i })
        .locator('button:visible')
        .first()
        .click();
      await expect(page.locator('[data-testid="recs-error"]')).toBeVisible({ timeout: 20_000 });

      const picker = page.locator('[data-testid="inspection-date"]:visible').first();
      await expect(picker).toBeEnabled();
    });

    test('the page does not scroll horizontally', async ({ page }) => {
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(
        overflow.scrollWidth,
        `horizontal scroll at ${overflow.clientWidth}px (document is ${overflow.scrollWidth}px)`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });
  });
}

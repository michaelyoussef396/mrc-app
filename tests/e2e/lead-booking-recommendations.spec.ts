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
const AVAILABILITY_FAILURE_COPY = /Couldn't reach the scheduling service — travel time unknown/i;

/** Tomorrow as YYYY-MM-DD — the date input enforces a min of today. */
const TOMORROW_ISO = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
})();

/** The desktop queue lives in an `lg:` aside; below 1024px it is behind a FAB sheet. */
async function openLeadsQueue(page: Page, width: number): Promise<void> {
  await page.goto('/admin/schedule');
  if (width < 1024) {
    const fab = page.locator('div.fixed.bottom-6.right-6 button').first();
    await expect(fab).toBeVisible({ timeout: 25_000 });
    await fab.click();
  }
}

/**
 * Expand the first inspection lead in the queue and return its date input.
 * Returns null when the queue holds no inspection leads.
 *
 * A LeadBookingCard header is a `cursor-pointer` div wrapping an <h4> with the customer
 * name; the compact "job to book" card uses a <p> instead, so <h4> selects inspection
 * cards only.
 */
async function expandFirstInspectionCard(page: Page): Promise<Locator | null> {
  // `:visible` matters below 1024px: the desktop aside is still in the DOM behind the
  // mobile sheet, and an unscoped .first() would resolve to its unclickable copy.
  const header = page
    .locator('div.cursor-pointer:visible')
    .filter({ has: page.locator('h4') })
    .first();

  try {
    await header.waitFor({ state: 'visible', timeout: 20_000 });
  } catch {
    return null;
  }
  await header.click();

  const dateInput = page.locator('[data-testid="inspection-date"]').first();
  try {
    await dateInput.waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    return null;
  }
  return dateInput;
}

/**
 * Pick the first technician. Scoped to the grid's testid on purpose: filtering an
 * unscoped `div` by text matches every ancestor up to the page shell, so `.first()`
 * resolves to the layout wrapper and the first button inside it is the sidebar.
 */
async function selectFirstTechnician(page: Page): Promise<void> {
  const technician = page.locator('[data-testid="technician-grid"]:visible button').first();
  await technician.waitFor({ state: 'visible', timeout: 15_000 });
  await technician.click();
}

/**
 * The time control is a three-column hour/minute/AM-PM picker, not a `<select>` —
 * iOS substitutes its own wheel for `<input type="time">` and ignores step/min/max.
 * Choosing any single option commits a complete "HH:mm".
 */
async function pickFirstAvailableTime(page: Page): Promise<void> {
  await page.locator('[data-testid="inspection-time"]:visible').first().click();
  await page.getByRole('listbox', { name: 'Hour' }).first().getByRole('option').first().click();
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

      await expect(page.locator('[data-testid="inspection-time"]:visible').first()).toHaveText(
        /Select time slot/i,
      );
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
      await selectFirstTechnician(page);

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
      await selectFirstTechnician(page);

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
      await selectFirstTechnician(page);
      await expect(page.locator('[data-testid="recs-error"]')).toBeVisible({ timeout: 20_000 });

      const picker = page.locator('[data-testid="inspection-date"]:visible').first();
      await expect(picker).toBeEnabled();
    });

    test('a failed availability lookup renders the amber alert, not a blank panel', async ({ page }) => {
      test.skip(
        !!process.env.PLAYWRIGHT_PROD,
        'calculate-travel-time is deployed on prod, so the failure path does not fire',
      );

      const dateInput = await expandFirstInspectionCard(page);
      if (!dateInput) test.skip(true, 'No inspection leads in the scheduling queue');

      await page.getByRole('button', { name: /Address is Correct/i }).first().click();
      await selectFirstTechnician(page);

      // The availability check only fires once date AND time are both set.
      await page.locator('[data-testid="inspection-date"]:visible').first().fill(TOMORROW_ISO);
      await pickFirstAvailableTime(page);

      const alert = page.locator('[data-testid="availability-error"]');
      await expect(alert).toBeVisible({ timeout: 20_000 });
      await expect(alert).toHaveText(AVAILABILITY_FAILURE_COPY);
    });

    test('a failed availability lookup does not render a travel answer', async ({ page }) => {
      test.skip(
        !!process.env.PLAYWRIGHT_PROD,
        'calculate-travel-time is deployed on prod, so the failure path does not fire',
      );

      const dateInput = await expandFirstInspectionCard(page);
      if (!dateInput) test.skip(true, 'No inspection leads in the scheduling queue');

      await page.getByRole('button', { name: /Address is Correct/i }).first().click();
      await selectFirstTechnician(page);
      await page.locator('[data-testid="inspection-date"]:visible').first().fill(TOMORROW_ISO);
      await pickFirstAvailableTime(page);

      await expect(page.locator('[data-testid="availability-error"]')).toBeVisible({ timeout: 20_000 });
      // Neither the travel panel nor the red buffer banner may claim anything.
      await expect(page.getByText(/Travel Feasible|Travel Warning/i)).toHaveCount(0);
      await expect(page.getByText(/more min to get there/i)).toHaveCount(0);
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

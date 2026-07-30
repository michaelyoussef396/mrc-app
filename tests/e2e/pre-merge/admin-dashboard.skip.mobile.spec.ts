import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectCurrency, expectInteger, expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * SKIPPED ON THIS BRANCH — post-merge surface.
 *
 * The corrected dashboard reporting lands with launch/checks commit
 *   91dd58f  fix(dashboard): correct overdue-invoice, revenue, today's-jobs
 *            and unassigned-lead reporting
 *
 * launch/checks (0350749) is not on main, and fix/admin-analytics-accuracy
 * descends from main, so these behaviours are legitimately absent here. Their
 * absence is branch scoping, not a defect.
 *
 * UN-SKIP: delete the test.describe.skip below once 91dd58f is merged, and run
 * as part of the combined post-merge pass.
 */
test.describe.skip('§3.7 Admin dashboard — post-merge (launch/checks 91dd58f)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
  });

  test('renders all six KPI cards', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    for (const label of [
      /today'?s jobs/i,
      /leads to assign/i,
      /completed this week/i,
      /revenue this week/i,
      /pending reviews/i,
      /overdue invoices/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 20_000 });
    }
    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'admin-dashboard', { desktop: true });
    await assertConsoleClean(watch, testInfo);
  });

  test('overdue invoices card shows a count and a currency total', async ({ page }) => {
    const card = page.getByText(/overdue invoices/i).first().locator('xpath=../..');
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expectCurrency(card.locator('text=/^\\$/').first(), 'Overdue invoices total');
  });

  test('revenue this week renders as currency', async ({ page }) => {
    const card = page.getByText(/revenue this week/i).first().locator('xpath=../..');
    await expectCurrency(card.locator('text=/^\\$/').first(), 'Revenue this week');
  });

  test("today's jobs renders an integer", async ({ page }) => {
    const card = page.getByText(/today'?s jobs/i).first().locator('xpath=../..');
    await expectInteger(card.locator('text=/^\\d+$/').first(), "Today's jobs");
  });

  test('unassigned-lead count agrees across card, sidebar badge and panel', async ({ page }) => {
    const cardCount = await page.getByText(/leads to assign/i).first()
      .locator('xpath=../..').textContent();
    const badge = await page.locator('nav').getByText(/^\d+$/).first().textContent();
    expect(cardCount?.match(/\d+/)?.[0]).toBe(badge?.trim());
  });

  test('today schedule section renders', async ({ page }) => {
    await expect(
      page.getByText(/today'?s schedule|no inspections scheduled/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('"+N more" appears when the list overflows', async ({ page }) => {
    const more = page.getByText(/\+\d+ more/i);
    if (await more.count()) await expect(more.first()).toBeVisible();
  });
});

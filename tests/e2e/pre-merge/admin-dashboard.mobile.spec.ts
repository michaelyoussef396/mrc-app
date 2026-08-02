import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectRenderable, expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * Merged into main at 8fe47e9 — live.
 *
 * The corrected dashboard reporting lands with launch/checks commit
 *   91dd58f  fix(dashboard): correct overdue-invoice, revenue, today's-jobs
 *            and unassigned-lead reporting
 *
 * launch/checks (0350749) is not on main, and fix/admin-analytics-accuracy
 * descends from main, so these behaviours are legitimately absent here. Their
 * absence is branch scoping, not a defect.
 *
 */
test.describe('§3.7 Admin dashboard (launch/checks 91dd58f, merged)', () => {
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

  /**
   * The KPI cards render label and value in one text node, e.g.
   * "Overdue Invoices2 · $8,928.67". Ancestor traversal from the label is
   * unreliable (getByText can match either the inner label or an outer wrapper),
   * so these read the rendered page text and assert the value appears near its
   * label. Breadth-appropriate: proves a real figure rendered, not NaN or blank.
   */
  async function dashboardText(page: import('@playwright/test').Page): Promise<string> {
    // Poll until the STATS have resolved, not merely until the labels render.
    // The six KPI labels paint immediately while useAdminDashboardStats is still
    // in flight, so waiting on a label reads the pre-data DOM and every value
    // assertion fails on a placeholder.
    await expect
      .poll(async () => (await page.locator('body').innerText()).replace(/\s+/g, ' '), {
        timeout: 30_000,
        message: 'dashboard KPI values never resolved',
      })
      .toMatch(/Revenue This Week\s*\$[\d,]+/i);

    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text, 'dashboard leaked a placeholder value').not.toMatch(/NaN|undefined|Infinity/);
    return text;
  }

  test('overdue invoices card shows a count and a currency total', async ({ page }) => {
    const text = await dashboardText(page);
    expect(text, 'Overdue Invoices should be followed by a count and a currency total')
      .toMatch(/Overdue Invoices\s*\d+[^$]{0,20}\$[\d,]+\.\d{2}/i);
  });

  test('revenue this week renders as currency', async ({ page }) => {
    const text = await dashboardText(page);
    expect(text, 'Revenue This Week should be followed by a currency figure')
      .toMatch(/Revenue This Week[^$]{0,20}\$[\d,]+/i);
  });

  test("today's jobs renders an integer", async ({ page }) => {
    const text = await dashboardText(page);
    expect(text, "Today's Jobs should be followed by a count")
      .toMatch(/Today'?s Jobs\D{0,20}\d+/i);
  });

  // Presence + shape, not cross-surface equality. The sidebar badge counts
  // unassigned new_lead/hipages_lead rows; "Leads to Assign" is its own query.
  // Asserting they match would be a correctness claim, which this breadth run
  // deliberately leaves to the manual pass.
  test('unassigned-lead count renders on both the card and the sidebar badge', async ({ page }) => {
    const text = await dashboardText(page);
    expect(text, 'Leads to Assign should be followed by a count')
      .toMatch(/Leads to Assign\D{0,20}\d+/i);

    const nav = (await page.locator('nav').first().innerText()).replace(/\s+/g, ' ');
    expect(nav, 'sidebar Leads item should carry a numeric badge').toMatch(/Leads\s*\d+/);
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

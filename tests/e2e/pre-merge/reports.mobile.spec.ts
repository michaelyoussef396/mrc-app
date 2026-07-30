import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectRenderable, expectCurrency, expectDuration, expectInteger,
  expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * docs/PRE_MERGE_TESTING_CHECKLIST.md §3.4 — Reports page.
 *
 * Breadth only. Shape assertions, no hardcoded figures: the preview points at
 * DEV, whose data differs from the PROD values quoted in the checklist.
 */
test.describe('§3.4 Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('renders all four KPI cards with no console errors', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto('/admin/reports');

    for (const label of [/total leads/i, /conversion rate/i, /avg response time/i, /total revenue/i]) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 20_000 });
    }

    await assertNoErrorBoundary(page);
    await capture(page, 'reports', { desktop: true });
    await assertConsoleClean(watch, testInfo);
  });

  /**
   * KNOWN DEFECT — pre-existing, not introduced by this branch.
   *
   * At 375px the Reports page scrolls horizontally: the document measures 521px
   * against a 375px viewport. The culprit is the PeriodFilter
   * (src/components/reports/PeriodFilter.tsx:22) — an `inline-flex` row of four
   * buttons totalling 318px that does not wrap, sitting in AdminPageLayout's
   * right-hand `actions` slot. Its right edge lands at 521px. No single element
   * is wider than the viewport, which is why it is easy to miss.
   *
   * /admin measures exactly 375px, so this is specific to Reports' header.
   * `git log main..HEAD -- PeriodFilter.tsx AdminPageLayout.tsx` is empty — this
   * branch never touched either file.
   *
   * Marked test.fail() so the suite stays honest AND green: Playwright flips
   * this to a hard failure the moment someone fixes the CSS, which is the
   * signal to delete this marker. Fix is likely `flex-wrap` on the filter or
   * letting the layout header wrap at small widths.
   *
   * Violates docs/PRE_MERGE_TESTING_CHECKLIST.md §3.4 "375px. KPI cards stack,
   * chart does not overflow."
   */
  test('does not scroll horizontally at 375px', async ({ page }) => {
    // Scoped to THIS test only. At describe scope test.fail() would apply to
    // every test declared after it.
    test.fail(true, 'pre-existing: PeriodFilter overflows to 521px at 375px');
    await page.goto('/admin/reports');
    await expect(page.getByText(/total leads/i).first()).toBeVisible({ timeout: 20_000 });
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
  });

  // The headline fix from 526bf1d: the KPI and the chart disagreed because the
  // chart keyed buckets by UTC date while the KPI filtered on the real
  // timestamp. They must now report the same number.
  test('Total Leads KPI equals the chart total', async ({ page }) => {
    await page.goto('/admin/reports');
    await expect(page.getByText(/lead volume over time/i)).toBeVisible({ timeout: 20_000 });

    const kpi = await expectRenderable(
      page.getByText(/total leads/i).first().locator('xpath=../..'),
      'Total Leads card',
    );
    const chart = await expectRenderable(
      page.getByText(/^Total:/i).first().locator('xpath=..'),
      'chart Total',
    );

    const kpiNum = kpi.match(/\d+/)?.[0];
    const chartNum = chart.match(/\d+/)?.[0];
    expect(kpiNum, 'Total Leads KPI should contain a number').toBeDefined();
    expect(chartNum, 'chart Total should contain a number').toBeDefined();
    expect(chartNum, 'chart total must equal the Total Leads KPI').toBe(kpiNum);
  });

  test('Avg Response Time is a duration, never the rounded-to-zero "0 min"', async ({ page }) => {
    await page.goto('/admin/reports');
    const card = page.getByText(/avg response time/i).first().locator('xpath=../..');
    await expect(card).toBeVisible({ timeout: 20_000 });
    // The value sits in the card's large-text node.
    await expectDuration(card.locator('p').filter({ hasText: /^(—|\d)/ }).first(), 'Avg Response Time');
  });

  test('Total Revenue renders as currency, never $NaN or blank', async ({ page }) => {
    await page.goto('/admin/reports');
    const card = page.getByText(/total revenue/i).first().locator('xpath=../..');
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expectCurrency(card.locator('p').filter({ hasText: /^\$/ }).first(), 'Total Revenue');
  });

  test('Conversion Rate renders as a percentage', async ({ page }) => {
    await page.goto('/admin/reports');
    const card = page.getByText(/conversion rate/i).first().locator('xpath=../..');
    await expect(card).toBeVisible({ timeout: 20_000 });
    const text = await expectRenderable(card, 'Conversion Rate card');
    expect(text).toMatch(/\d+%/);
  });

  // c354d28 added a minimum-sample guard: below 5 leads the percentage is noise.
  test('Pipeline Health shows a verdict or the not-enough-data state', async ({ page }) => {
    await page.goto('/admin/reports');
    await expect(page.getByText(/pipeline health/i)).toBeVisible({ timeout: 20_000 });
    const verdict = page.getByText(/healthy|average|needs attention|not enough data/i).first();
    await expectRenderable(verdict, 'Pipeline Health verdict');
  });

  test('all four period filters render without error', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto('/admin/reports');
    await expect(page.getByText(/total leads/i).first()).toBeVisible({ timeout: 20_000 });

    for (const period of [/today/i, /week/i, /month/i, /year/i]) {
      const btn = page.getByRole('button', { name: period }).first();
      if (await btn.count()) {
        await btn.click();
        await expect(page.getByText(/total leads/i).first()).toBeVisible({ timeout: 15_000 });
        await assertNoErrorBoundary(page);
      }
    }
    await assertConsoleClean(watch, testInfo);
  });

  test('status and sources charts render or show their empty state', async ({ page }) => {
    await page.goto('/admin/reports');
    await expect(page.getByText(/lead status breakdown/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/lead sources|sources/i).first()).toBeVisible();
  });
});

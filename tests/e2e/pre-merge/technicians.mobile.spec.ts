import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectRenderable, expectCurrency, expectInteger,
  expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * docs/PRE_MERGE_TESTING_CHECKLIST.md §3.5 and §3.6 —
 * Technicians list and technician profile.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SKIPPED — BLOCKED BY A DEV ENVIRONMENT GAP, NOT BY CODE.
 *
 * Both surfaces are driven entirely by useTechnicianStats / useTechnicianDetail,
 * which fetch the `manage-users` Edge Function. That function returns 404 on DEV
 * (ctppzqnysmzynkxjlzta) — verified 2026-07-29. docs/TODO.md records that the
 * DEV restore never carried any Edge Function; only generate-inspection-pdf,
 * generate-job-report-pdf and generate-inspection-summary were later deployed.
 *
 * With the fetch failing, useTechnicianStats catches and returns [], so the page
 * renders its "No Technicians Found" empty state and every assertion here fails
 * on absent elements. Preview deploys use Preview-scope env vars pointing at the
 * same DEV project, so this cannot pass there either.
 *
 * UN-SKIP once manage-users is deployed to DEV:
 *   npx supabase functions deploy manage-users --project-ref ctppzqnysmzynkxjlzta
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Breadth only. The PROD figures in the checklist (michael 12/10, Clayton 0/1)
 * do not apply — the preview points at DEV.
 */
test.describe.skip('§3.5 Technicians list — blocked: manage-users EF absent on DEV', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('renders with no console errors', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto('/admin/technicians');
    await expect(page.getByRole('heading', { name: /technicians/i }).first()).toBeVisible({ timeout: 20_000 });

    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'technicians-list', { desktop: true });
    await assertConsoleClean(watch, testInfo);
  });

  // 613a4a7 split the mislabelled single stat into Active Leads + Inspections.
  test('every card shows all four stat labels', async ({ page }) => {
    await page.goto('/admin/technicians');
    await expect(page.getByText(/active leads/i).first()).toBeVisible({ timeout: 20_000 });

    for (const label of [/active leads/i, /^inspections$/i, /upcoming/i, /revenue/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('the period caption states what Inspections and Revenue cover', async ({ page }) => {
    await page.goto('/admin/technicians');
    await expect(page.getByText(/inspections: all time/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/revenue: this month/i).first()).toBeVisible();
  });

  test('stat values are integers and currency, never NaN or blank', async ({ page }) => {
    await page.goto('/admin/technicians');
    const firstCard = page.getByText(/active leads/i).first().locator('xpath=../..');
    await expect(firstCard).toBeVisible({ timeout: 20_000 });

    await expectInteger(
      page.getByText(/active leads/i).first().locator('xpath=..').locator('span').last(),
      'Active Leads value',
    );
    await expectCurrency(
      page.getByText(/revenue/i).first().locator('xpath=..').locator('span').last(),
      'Revenue value',
    );
  });

  test('last seen renders relative time or DD/MM, never an ISO string', async ({ page }) => {
    await page.goto('/admin/technicians');
    const lastSeen = page.getByText(/last seen:/i).first();
    const text = await expectRenderable(lastSeen, 'Last seen');
    // Either relative ("19 hours ago", "Never") or Australian short date (04/05).
    expect(text).toMatch(/last seen:\s*(never|just now|\d+\s+(min|mins|hour|hours|day|days)\s+ago|\d{2}\/\d{2})/i);
    expect(text, 'last seen must not be an ISO timestamp').not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

test.describe.skip('§3.6 Technician profile — blocked: manage-users EF absent on DEV', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('opens from the list and renders the stats grid', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto('/admin/technicians');
    await page.getByRole('button', { name: /view profile/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/technicians\/[0-9a-f-]{36}/, { timeout: 15_000 });

    for (const label of [/today/i, /this week/i, /this month/i, /revenue/i]) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 20_000 });
    }

    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'technician-profile', { desktop: true });
    await assertConsoleClean(watch, testInfo);
  });

  // 48702a3 renamed the lost bucket from "Cancelled" to "Not Landed" and moved
  // `closed` into Completed.
  test('workload breakdown shows the Not Landed legend or its empty state', async ({ page }) => {
    await page.goto('/admin/technicians');
    await page.getByRole('button', { name: /view profile/i }).first().click();
    await expect(page.getByText(/workload breakdown/i)).toBeVisible({ timeout: 20_000 });

    const hasData = await page.getByText(/not landed/i).count();
    if (hasData) {
      for (const label of [/scheduled/i, /in progress/i, /completed/i, /not landed/i]) {
        await expect(page.getByText(label).first()).toBeVisible();
      }
      // The old label must be gone.
      await expect(page.getByText(/^cancelled$/i)).toHaveCount(0);
    } else {
      await expect(page.getByText(/no workload data available/i)).toBeVisible();
    }
  });

  test('upcoming jobs list renders entries or its empty state', async ({ page }) => {
    await page.goto('/admin/technicians');
    await page.getByRole('button', { name: /view profile/i }).first().click();
    await expect(page.getByText(/upcoming jobs & inspections/i)).toBeVisible({ timeout: 20_000 });

    const empty = await page.getByText(/no upcoming jobs/i).count();
    if (!empty) {
      // c354d28 collapses a multi-day job into one entry with a "N days" chip.
      await expect(page.getByText(/upcoming$/i).first()).toBeVisible();
    }
  });
});

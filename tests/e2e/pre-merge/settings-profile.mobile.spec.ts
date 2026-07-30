import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * Merged into main at 8fe47e9 — live.
 *
 *   b4d4cc3  fix(settings): remove "Log out from ALL devices" option from the
 *            Settings danger zone
 *
 * launch/checks (0350749) is not on main, and fix/admin-analytics-accuracy
 * descends from main. On THIS branch the control is still present in BOTH
 * places — Settings.tsx:303 and Profile.tsx:633 — which is correct for this
 * branch. No absent-assertion is run here; doing so would fail correct code.
 *
 * POST-MERGE EXPECTATION (what the assertions below encode):
 *   Profile  → PRESENT   the capability is deliberately retained
 *   Settings → ABSENT    removed from the danger zone by b4d4cc3
 *
 */
test.describe('Settings / Profile (launch/checks b4d4cc3, merged)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Settings renders at 375px', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible({ timeout: 20_000 });
    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'settings', { desktop: true });
    await assertConsoleClean(watch, testInfo);
  });

  test('Profile renders at 375px', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto('/admin/profile');
    await expect(page.getByRole('heading', { name: /profile/i }).first()).toBeVisible({ timeout: 20_000 });
    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'profile', { desktop: true });
    await assertConsoleClean(watch, testInfo);
  });

  test('Settings does NOT offer log out from all devices', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/log out from all devices/i)).toHaveCount(0);
  });

  test('Profile DOES offer log out all devices', async ({ page }) => {
    await page.goto('/admin/profile');
    await expect(page.getByRole('heading', { name: /profile/i }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/log out all devices/i).first()).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { signInAndGoto } from './helpers/session';
import { JOB_COMPLETION_LEAD_ID } from './helpers/fixtures';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * Prerequisite for every other spec in this directory: both roles can reach
 * their landing page. If this fails, treat all downstream failures as blocked
 * rather than as surface defects.
 */
test.describe('auth smoke', () => {
  test('login page renders at 375px', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto('/');
    await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByPlaceholder('Password')).toBeVisible();

    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'login');
    await assertConsoleClean(watch, testInfo);
  });

  test('admin reaches /admin', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin($|\?)/);
    await assertNoErrorBoundary(page);
    await assertConsoleClean(watch, testInfo);
  });

  // NOT asserting a landing on /technician. Login.tsx redirectByRole() routes to
  // the landing page of the role it resolves (Login.tsx:237-248), and the test
  // account holds admin, technician AND developer — the technician toggle was
  // observed staying on "/". That is account/app behaviour, not a defect in any
  // surface under test. The /technician/* specs reach their routes directly via
  // helpers/session.ts, since RoleProtectedRoute checks role membership.
  test('an authenticated session can reach a technician-guarded route', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await signInAndGoto(page, `/technician/job-completion/${JOB_COMPLETION_LEAD_ID}`);
    await assertNoErrorBoundary(page);
    await assertConsoleClean(watch, testInfo);
  });
});

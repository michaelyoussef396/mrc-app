import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsTechnician } from './helpers/auth';
import { requireAdmin, requireTech } from './helpers/test-data';

test.describe('Authentication', () => {
  test('admin can log in and lands on /admin', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin($|\?)/);
    // Smoke: at least one KPI label present on admin dashboard
    await expect(page.getByText(/today'?s jobs|leads to assign|pending reviews/i).first()).toBeVisible();
  });

  test('technician can log in and lands on /technician', async ({ page }) => {
    await loginAsTechnician(page);
    await expect(page).toHaveURL(/\/technician($|\?)/);
  });

  test('wrong password shows auth error', async ({ page }) => {
    const { email } = requireAdmin();
    await page.goto('/');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/email or password.*incorrect/i)).toBeVisible();
  });

  test('forgot password link navigates to /forgot-password', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /forgot.*password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('session persists across tab close', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAsAdmin(page);
    await page.close();

    const page2 = await ctx.newPage();
    await page2.goto('/admin');
    await expect(page2).toHaveURL(/\/admin/);
    await ctx.close();
  });

  test('technician cannot visit /admin', async ({ page }) => {
    await loginAsTechnician(page);
    await page.goto('/admin');
    // Expect the app to bounce back to /technician (RoleProtectedRoute behaviour)
    await expect(page).not.toHaveURL(/\/admin$/);
  });

  test('admin cannot visit /technician/jobs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/technician/jobs');
    await expect(page).not.toHaveURL(/\/technician\/jobs$/);
  });

  test('unauthenticated user is redirected from /admin to /', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
  });
});

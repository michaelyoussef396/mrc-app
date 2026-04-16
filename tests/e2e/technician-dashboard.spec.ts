import { test, expect } from '@playwright/test';
import { loginAsTechnician } from './helpers/auth';

test.describe('Technician Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTechnician(page);
  });

  test('home shows Next Job or empty state', async ({ page }) => {
    await page.goto('/technician');
    await expect(page.getByText(/next job|no jobs|today'?s jobs/i).first()).toBeVisible();
  });

  test('jobs page exposes tabs', async ({ page }) => {
    await page.goto('/technician/jobs');
    for (const label of [/today/i, /this week/i, /upcoming/i, /completed/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('alerts page loads', async ({ page }) => {
    await page.goto('/technician/alerts');
    await expect(page.locator('body')).toBeVisible();
  });

  test('profile page loads with avatar area', async ({ page }) => {
    await page.goto('/technician/profile');
    await expect(page.getByText(/my profile|profile/i).first()).toBeVisible();
    // The camera button has aria-label="Change profile photo" after our fix
    await expect(page.getByRole('button', { name: /change profile photo/i })).toBeVisible();
  });

  test.describe('mobile (375px)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('home does not horizontally scroll', async ({ page }) => {
      await page.goto('/technician');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });

    test('jobs page does not horizontally scroll', async ({ page }) => {
      await page.goto('/technician/jobs');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  });
});

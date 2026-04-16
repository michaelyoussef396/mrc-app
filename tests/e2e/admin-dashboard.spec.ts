import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
  });

  test('renders all 6 KPI labels', async ({ page }) => {
    for (const label of [
      /today'?s jobs/i,
      /leads to assign/i,
      /completed this week/i,
      /revenue this week/i,
      /pending reviews/i,
      /overdue invoices/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('Pending Reviews card navigates to filtered leads', async ({ page }) => {
    // Wait for stats to load (the label appears after data fetch)
    await expect(page.getByText(/pending reviews/i).first()).toBeVisible({ timeout: 20_000 });
    await page.getByText(/pending reviews/i).first().click();
    await expect(page).toHaveURL(/status=pending_review/, { timeout: 10_000 });
  });

  test('Overdue Invoices card navigates to filtered leads', async ({ page }) => {
    const card = page.getByText(/overdue invoices/i).first();
    await card.click();
    await expect(page).toHaveURL(/status=invoicing_sent/);
  });

  test('Today schedule section renders', async ({ page }) => {
    await expect(page.getByText(/today'?s schedule|schedule|no (inspections|jobs)/i).first()).toBeVisible();
  });

  test('Recent Activity section renders', async ({ page }) => {
    await expect(page.getByText(/recent activity|activity/i).first()).toBeVisible();
  });

  test('KPI values are not stuck on loading forever', async ({ page }) => {
    // Wait for loading ellipsis to resolve; a digit should appear under at least one KPI label.
    const anyDigit = page.locator('text=/^\\s*\\$?[0-9]/').first();
    await expect(anyDigit).toBeVisible({ timeout: 15_000 });
  });
});

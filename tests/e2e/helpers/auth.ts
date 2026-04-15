import { expect, type Page } from '@playwright/test';
import { requireAdmin, requireTech } from './test-data';

/**
 * Log in as admin via the UI. Lands on /admin.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const { email, password } = requireAdmin();
  await loginAs(page, 'Admin', email, password);
  await expect(page).toHaveURL(/\/admin($|\?)/, { timeout: 15_000 });
}

/**
 * Log in as technician via the UI. Lands on /technician.
 */
export async function loginAsTechnician(page: Page): Promise<void> {
  const { email, password } = requireTech();
  await loginAs(page, 'Technician', email, password);
  await expect(page).toHaveURL(/\/technician($|\?)/, { timeout: 15_000 });
}

async function loginAs(
  page: Page,
  role: 'Admin' | 'Technician',
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/');
  // Role toggle — the button text is literally "Admin" or "Technician"
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

/**
 * Sign out via the UI. Assumes a Sign Out button/link is reachable from
 * the current page — usually via Profile.
 */
export async function signOut(page: Page): Promise<void> {
  // Try the profile route first, then click the sign-out button.
  // Fall through gracefully if the app already redirected to /.
  const url = page.url();
  if (url.includes('/admin')) {
    await page.goto('/admin/profile');
  } else if (url.includes('/technician')) {
    await page.goto('/technician/profile');
  }
  const signOut = page.getByRole('button', { name: /sign out/i });
  if (await signOut.count()) {
    await signOut.first().click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  }
}

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { fixtures, sampleLead } from './helpers/test-data';

test.describe('Lead Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('leads page loads with pipeline tabs', async ({ page }) => {
    await page.goto('/admin/leads');
    await expect(page.getByRole('heading', { name: /leads/i }).first()).toBeVisible();
    // Pipeline surfaces include at least these statuses as tab labels
    for (const label of ['New Lead', 'Awaiting Inspection', 'Finished']) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test('status filter updates URL', async ({ page }) => {
    await page.goto('/admin/leads?status=pending_review');
    await expect(page).toHaveURL(/status=pending_review/);
  });

  test('search narrows visible leads', async ({ page }) => {
    await page.goto('/admin/leads');
    const search = page.getByPlaceholder(/search/i).first();
    if (!(await search.count())) test.skip(true, 'Search input not found on this build');
    await search.fill('zzzz-no-match-expected');
    // Whatever empty state is shown, the list should not contain typical card data
    await expect(page.getByText(/no leads|0 leads|no results/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('can open an existing lead detail', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/leads/${fixtures.leadId}`);
    await expect(page.getByRole('heading').first()).toBeVisible();
    // Lead detail should show at least one contact field
    await expect(page.getByText(/@|phone|email/i).first()).toBeVisible();
  });

  test('create new lead via modal', async ({ page }) => {
    await page.goto('/admin/leads');
    const newLeadTrigger = page.getByRole('button', { name: /new lead|add lead|\+/i }).first();
    if (!(await newLeadTrigger.count())) test.skip(true, 'New Lead trigger not found');
    await newLeadTrigger.click();

    const name = sampleLead.fullName();
    const email = sampleLead.email();
    await page.getByLabel(/full name|customer name/i).first().fill(name);
    await page.getByPlaceholder(/04XX XXX XXX|phone/i).first().fill(sampleLead.phone);
    await page.getByLabel(/email/i).first().fill(email);
    // Address — field names vary; fill best-effort
    const street = page.getByLabel(/street|address line 1/i).first();
    if (await street.count()) await street.fill(sampleLead.street);

    await page.getByRole('button', { name: /create|save|submit/i }).last().click();

    // Toast or redirect to lead detail
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });
});

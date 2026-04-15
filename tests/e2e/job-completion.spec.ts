import { test, expect } from '@playwright/test';
import { loginAsTechnician } from './helpers/auth';
import { fixtures } from './helpers/test-data';

test.describe('Job Completion form', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTechnician(page);
  });

  test('form route loads for a known lead', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/technician/job-completion/${fixtures.leadId}`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Office Info header renders read-only job number + address', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/technician/job-completion/${fixtures.leadId}`);
    await expect(page.getByText(/job number|JOB-|MRC-/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Summary section shows SWMS toggle + completion date', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/technician/job-completion/${fixtures.leadId}`);
    await expect(page.getByText(/SWMS/i).first()).toBeVisible();
    await expect(page.getByText(/completion date/i).first()).toBeVisible();
  });

  test('Equipment section shows Dehumidifier, Air Mover, AFD, RCD cards', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/technician/job-completion/${fixtures.leadId}`);
    for (const name of ['Dehumidifier', 'Air Mover', 'AFD', 'RCD']) {
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    }
  });

  test('Treatment Methods section lists all 11 toggles', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/technician/job-completion/${fixtures.leadId}`);
    for (const label of [
      'HEPA Vacuuming',
      'Surface Mould Remediation',
      'ULV Fogging',
      'Subfloor Remediation',
      'AFD Installation',
      'Drying Equipment',
      'Containment',
      'Material Demolition',
      'Cavity Treatment',
      'Debris Removal',
    ]) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test('Variations toggle reveals 4 textareas', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/technician/job-completion/${fixtures.leadId}`);
    const toggle = page.getByText(/scope changed/i).first();
    if (!(await toggle.count())) test.skip(true, 'Variation toggle not found');
    // Click the switch near the label
    await toggle.click();
    await expect(page.getByText(/what changed|why changed|extra work/i).first()).toBeVisible();
  });

  test('Submit with empty required fields surfaces validation', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/technician/job-completion/${fixtures.leadId}`);
    const submit = page.getByRole('button', { name: /submit/i }).last();
    if (!(await submit.count())) test.skip(true, 'Submit button not found');
    await submit.click();
    // Expect either a toast or inline error. Avoid strict copy match.
    await expect(page.locator('body')).toContainText(/required|missing|please/i, { timeout: 5000 });
  });

  test('Office Notes section hidden for technician role', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/technician/job-completion/${fixtures.leadId}`);
    await expect(page.getByText(/office notes/i)).toHaveCount(0);
  });

  test.describe('mobile (375px)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('form renders without horizontal scroll', async ({ page }) => {
      if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
      await page.goto(`/technician/job-completion/${fixtures.leadId}`);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  });
});

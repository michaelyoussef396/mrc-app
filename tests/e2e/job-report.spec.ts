import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { fixtures } from './helpers/test-data';

test.describe('Job Report PDF', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin job report route loads', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/admin/job-report/${fixtures.leadId}`);
    await expect(page.locator('body')).toBeVisible();
    // Expect SOMETHING report-ish to render (cover, warranty, or report title)
    await expect(page.locator('body')).toContainText(/job|report|warranty|mould/i, { timeout: 15_000 });
  });

  test('inspection report route loads', async ({ page }) => {
    if (!fixtures.inspectionId) test.skip(true, 'TEST_INSPECTION_ID not set');
    await page.goto(`/inspection/${fixtures.inspectionId}/report`);
    await expect(page.locator('body')).toContainText(/mould|inspection|report/i, { timeout: 15_000 });
  });

  test('edit mode toggle exposes text inputs', async ({ page }) => {
    if (!fixtures.inspectionId) test.skip(true, 'TEST_INSPECTION_ID not set');
    await page.goto(`/inspection/${fixtures.inspectionId}/report`);
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (!(await editBtn.count())) test.skip(true, 'Edit button not present');
    await editBtn.click();
    // After edit mode, at least one text input or textarea should appear
    const inputs = page.locator('input[type="text"], textarea');
    await expect(inputs.first()).toBeVisible({ timeout: 5000 });
  });

  test('download PDF button exists', async ({ page }) => {
    if (!fixtures.inspectionId) test.skip(true, 'TEST_INSPECTION_ID not set');
    await page.goto(`/inspection/${fixtures.inspectionId}/report`);
    await expect(page.getByRole('button', { name: /download/i }).first()).toBeVisible();
  });
});

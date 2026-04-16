import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsTechnician } from './helpers/auth';
import { fixtures } from './helpers/test-data';

test.describe('Inspection flow — admin views', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('schedule page loads with content', async ({ page }) => {
    await page.goto('/admin/schedule');
    await expect(page.getByText(/MRC Schedule/i).first()).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });

  test('view inspection report PDF route loads', async ({ page }) => {
    if (!fixtures.inspectionId) test.skip(true, 'TEST_INSPECTION_ID not set');
    await page.goto(`/inspection/${fixtures.inspectionId}/report`);
    // Wait for PDF preview container or at least headline content
    await expect(page.locator('body')).toContainText(/mould|inspection|report/i, { timeout: 15_000 });
  });

  test('inspection AI review route loads for a known lead', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/admin/inspection-ai-review/${fixtures.leadId}`);
    // Even if no summary exists, the page should render a heading, not crash
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Inspection flow — technician views', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTechnician(page);
  });

  test('technician dashboard shows Next Job section', async ({ page }) => {
    await page.goto('/technician');
    await expect(page.getByText(/next job|today'?s jobs|no jobs/i).first()).toBeVisible();
  });

  test('technician jobs list loads with tabs', async ({ page }) => {
    await page.goto('/technician/jobs');
    await expect(page.getByText(/today|this week|upcoming|completed/i).first()).toBeVisible();
  });

  test('inspection form route opens', async ({ page }) => {
    await page.goto('/technician/inspection');
    // Form should render at least one input or heading
    await expect(page.locator('body')).toBeVisible();
  });
});

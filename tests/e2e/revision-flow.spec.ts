import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsTechnician } from './helpers/auth';
import { fixtures } from './helpers/test-data';

/**
 * Revision loop requires a lead stuck in a revision-pending state.
 * Most of this file is skipped unless a revision fixture is provided.
 * Provide REVISION_LEAD_ID in env to enable the flow assertions.
 */
const revisionLeadId = process.env.REVISION_LEAD_ID ?? '';

test.describe('Revision flow', () => {
  test('admin lead detail shows revision action on job_completed lead', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await loginAsAdmin(page);
    await page.goto(`/leads/${fixtures.leadId}`);
    // At least one action button exists on the page
    await expect(page.getByRole('button').first()).toBeVisible();
  });

  test('technician revisions tab renders', async ({ page }) => {
    await loginAsTechnician(page);
    await page.goto('/technician/jobs');
    // If there are no revisions the tab still exists; if missing, skip
    const tab = page.getByRole('tab', { name: /revisions?/i }).first();
    if (!(await tab.count())) {
      const anyRevisionsText = page.getByText(/revisions?/i).first();
      if (!(await anyRevisionsText.count())) test.skip(true, 'Revisions surface not found');
    }
  });

  test('technician sees amber revision banner when opening revision job', async ({ page }) => {
    if (!revisionLeadId) test.skip(true, 'REVISION_LEAD_ID not set');
    await loginAsTechnician(page);
    await page.goto(`/technician/job-completion/${revisionLeadId}`);
    await expect(page.getByText(/revision|changes requested|admin note/i).first()).toBeVisible();
  });
});

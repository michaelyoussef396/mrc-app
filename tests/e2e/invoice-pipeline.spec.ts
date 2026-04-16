import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { fixtures } from './helpers/test-data';

/**
 * The invoice + payment pipeline is heavily state-dependent. Provide
 * dedicated fixture IDs to exercise specific stages; otherwise tests skip
 * rather than mutate a lead in a way we can't clean up.
 */
const invoicedLeadId = process.env.INVOICED_LEAD_ID ?? '';
const paidLeadId = process.env.PAID_LEAD_ID ?? '';
const finishedLeadId = process.env.FINISHED_LEAD_ID ?? '';

test.describe('Invoice + Payment pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('lead detail shows invoice summary card at invoicing_sent stage', async ({ page }) => {
    if (!invoicedLeadId) test.skip(true, 'INVOICED_LEAD_ID not set');
    await page.goto(`/leads/${invoicedLeadId}`);
    await expect(page.getByText(/invoice|payment|overdue|due date/i).first()).toBeVisible();
  });

  test('paid lead shows Google Review CTA', async ({ page }) => {
    if (!paidLeadId) test.skip(true, 'PAID_LEAD_ID not set');
    await page.goto(`/leads/${paidLeadId}`);
    await expect(page.getByText(/google review/i).first()).toBeVisible();
  });

  test('finished lead shows Lead Complete banner', async ({ page }) => {
    if (!finishedLeadId) test.skip(true, 'FINISHED_LEAD_ID not set');
    await page.goto(`/leads/${finishedLeadId}`);
    await expect(page.getByText(/lead complete|finished/i).first()).toBeVisible();
  });

  test('any lead detail renders a status badge', async ({ page }) => {
    if (!fixtures.leadId) test.skip(true, 'TEST_LEAD_ID not set');
    await page.goto(`/leads/${fixtures.leadId}`);
    // Status badge copy is one of the STATUS_FLOW titles
    await expect(
      page.getByText(/new lead|awaiting|scheduled|completed|invoiced|paid|review|finished/i).first(),
    ).toBeVisible();
  });
});

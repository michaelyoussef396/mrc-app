import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { sampleLead, uniqueSuffix } from './helpers/test-data';

/**
 * Runtime proof for the advisory preferred-slot model.
 *
 * CreateNewLeadModal used to write the customer's preferred slot into
 * inspection_scheduled_date / scheduled_time — the admin-confirmed booking columns —
 * so every consumer, which reads customer_preferred_date / customer_preferred_time,
 * saw NULL. This spec creates a real lead through the modal and asserts the
 * "Customer's Preferred Time" card on Lead Detail (LeadDetail.tsx:1481-1512) renders,
 * which it can only do when customer_preferred_date is populated.
 *
 * The spec prints the created lead_number so the DB side can be confirmed with a
 * read-only SELECT (customer_preferred_* populated, inspection_scheduled_date and
 * scheduled_time both NULL).
 *
 * Writes one lead row per run. Intended for DEV (ctppzqnysmzynkxjlzta) only.
 */

/** Tomorrow in Melbourne, as YYYY-MM-DD — the modal enforces a future date. */
function melbourneTomorrowISO(): string {
  const melbourneNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }),
  );
  melbourneNow.setDate(melbourneNow.getDate() + 1);
  const y = melbourneNow.getFullYear();
  const m = String(melbourneNow.getMonth() + 1).padStart(2, '0');
  const d = String(melbourneNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const PREFERRED_TIME = '09:00';

interface CreatedLead {
  name: string;
  preferredDate: string;
}

async function createLeadWithPreferredSlot(page: Page): Promise<CreatedLead> {
  await page.goto('/admin/leads');

  const trigger = page.getByRole('button', { name: /new lead/i }).first();
  await expect(trigger).toBeVisible({ timeout: 25_000 });
  await trigger.click();

  const modal = page.locator('form, div').filter({ hasText: /Preferred Date/ }).last();
  await expect(modal.getByPlaceholder('e.g. John Smith')).toBeVisible({ timeout: 10_000 });

  const name = `PW Preferred ${uniqueSuffix()}`;
  const preferredDate = melbourneTomorrowISO();

  await page.getByPlaceholder('e.g. John Smith').fill(name);
  await page.locator('input[type="date"]').first().fill(preferredDate);
  await page.getByPlaceholder('04XX XXX XXX').fill(sampleLead.phone);
  // Selects, in DOM order: 0 Preferred Time, 1 Lead Source.
  await page.locator('select').nth(0).selectOption(PREFERRED_TIME);
  await page.getByPlaceholder('Start typing address...').fill('1 Test Street');
  await page.getByPlaceholder('e.g. Melbourne').fill('Melbourne');
  await page.getByPlaceholder('e.g. 3000').fill('3000');
  await page.getByPlaceholder('email@example.com').fill(sampleLead.email());
  await page
    .getByPlaceholder('Describe the mould issue in detail...')
    .fill('Playwright preferred-slot verification lead. Mould across the bathroom ceiling.');
  await page.locator('select').nth(1).selectOption('google');

  await page.getByRole('button', { name: /^Create Lead$/ }).click();

  await expect(page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 20_000 });

  return { name, preferredDate };
}

test.describe('Preferred slot is captured as a preference, not a booking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('a lead created through the admin modal shows the Customer\'s Preferred Time card', async ({
    page,
  }, testInfo) => {
    const lead = await createLeadWithPreferredSlot(page);

    await page.goto('/admin/leads');
    await page.getByText(lead.name, { exact: false }).first().click();

    const card = page.getByText(/Customer's Preferred Time/i).first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    // Surface the identifiers so the DB assertion can target this exact row.
    testInfo.annotations.push({ type: 'created-lead', description: lead.name });
    testInfo.annotations.push({ type: 'preferred-date', description: lead.preferredDate });
    // eslint-disable-next-line no-console
    console.log(`[created-lead] ${lead.name} | preferred ${lead.preferredDate} ${PREFERRED_TIME}`);
  });

  test('the preferred date is rendered in Australian DD/MM/YYYY form', async ({ page }) => {
    const lead = await createLeadWithPreferredSlot(page);
    const [y, m, d] = lead.preferredDate.split('-');

    await page.goto('/admin/leads');
    await page.getByText(lead.name, { exact: false }).first().click();
    await expect(page.getByText(/Customer's Preferred Time/i).first()).toBeVisible({
      timeout: 20_000,
    });

    await expect(page.getByText(`${d}/${m}/${y}`).first()).toBeVisible();
  });
});

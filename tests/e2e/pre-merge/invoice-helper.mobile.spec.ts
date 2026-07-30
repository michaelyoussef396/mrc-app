import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { INVOICE_LEAD_ID } from './helpers/fixtures';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectCurrency, expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * docs/PRE_MERGE_TESTING_CHECKLIST.md §3.3 (invoice helper) and §4 (empty
 * invoices table).
 *
 * READ ONLY — this spec never saves, sends, marks paid, or presses a "Use"
 * button. It proves the page renders and its totals are well-formed.
 *
 * §4 context: once the invoice integrity runbook empties the invoices table,
 * `invoiceRow` is null for every lead and AdminInvoiceHelper falls back to the
 * live pricing estimate. Both states must render valid currency.
 */
test.describe('§3.3 / §4 Admin invoice helper', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('renders the invoice totals block with no console errors', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto(`/admin/invoice/${INVOICE_LEAD_ID}`);

    for (const label of [
      /labour \(after discount\)/i,
      /^equipment$/i,
      /subtotal ex gst/i,
      /gst 10%/i,
      /total inc gst/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 25_000 });
    }

    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'invoice-helper', { desktop: true });
    await assertConsoleClean(watch, testInfo);
  });

  test('every money row is valid currency, never NaN or blank', async ({ page }) => {
    await page.goto(`/admin/invoice/${INVOICE_LEAD_ID}`);
    await expect(page.getByText(/total inc gst/i).first()).toBeVisible({ timeout: 25_000 });

    for (const [label, pattern] of [
      ['Labour (after discount)', /labour \(after discount\)/i],
      ['Subtotal ex GST', /subtotal ex gst/i],
      ['GST 10%', /gst 10%/i],
      ['Total inc GST', /total inc gst/i],
    ] as const) {
      const value = page.getByText(pattern).first().locator('xpath=..').locator('span').last();
      await expectCurrency(value, label);
    }
  });

  test('page survives with no saved invoice (the post-delete §4 state)', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto(`/admin/invoice/${INVOICE_LEAD_ID}`);
    await expect(page.getByText(/total inc gst/i).first()).toBeVisible({ timeout: 25_000 });
    // Whether or not a saved invoice exists, the totals must be well-formed and
    // no error boundary may render.
    await assertNoErrorBoundary(page);
    await assertConsoleClean(watch, testInfo);
  });
});

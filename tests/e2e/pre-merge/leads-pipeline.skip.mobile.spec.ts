import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * SKIPPED ON THIS BRANCH — post-merge surfaces. Two launch/checks commits:
 *
 *   d50b117  fix(leads): reorder pipeline tabs to match canonical ALL_STATUSES
 *            — pending_review after job_completed
 *   396ca9c  fix(leads): honour ?status= deep links from dashboard cards and
 *            quick actions
 *
 * launch/checks (0350749) is not on main, and fix/admin-analytics-accuracy
 * descends from main. On this branch the dashboard cards DO produce
 * /admin/leads?status=…, but LeadsManagement has no useSearchParams, so the
 * param is not consumed. That is expected here, not a defect.
 *
 * NOTE ON THE FROZEN ARRAY: d50b117 reorders the TAB RENDERING to match
 * ALL_STATUSES. It does not reorder ALL_STATUSES itself, which is frozen —
 * LeadDetail.tsx handleChangeStatus uses ALL_STATUSES.indexOf() against
 * hardcoded thresholds (newRank < 1/2/6/7/10/11) to null assigned_to, booking
 * dates, invoice_amount, invoice_sent_date and payment_received_date on
 * reversion. Reordering the array would silently wipe customer financial data.
 * This spec asserts the UI matches the array; it must never be "fixed" by
 * editing the array.
 *
 * UN-SKIP: delete the test.describe.skip below once d50b117 and 396ca9c merge.
 */

/**
 * Canonical order from src/lib/statusFlow.ts ALL_STATUSES. Kept as a literal
 * rather than imported so the spec does not depend on the `@/` alias resolving
 * under Playwright's transform. If this drifts from statusFlow.ts, the source
 * is authoritative — update this list, never the other way round.
 */
const ALL_STATUSES_ORDER = [
  'new_lead',
  'inspection_waiting',
  'inspection_ai_summary',
  'approve_inspection_report',
  'inspection_email_approval',
  'job_waiting',
  'job_scheduled',
  'job_completed',
  'pending_review',
  'job_report_pdf_sent',
  'invoicing_sent',
  'paid',
  'google_review',
  'finished',
  'closed',
  'not_landed',
] as const;

test.describe.skip('Leads pipeline — post-merge (launch/checks d50b117, 396ca9c)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('renders the leads page at 375px', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto('/admin/leads');
    await expect(page.getByRole('heading', { name: /leads/i }).first()).toBeVisible({ timeout: 20_000 });
    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'leads-pipeline', { desktop: true });
    await assertConsoleClean(watch, testInfo);
  });

  test('pipeline tab order matches ALL_STATUSES', async ({ page }) => {
    await page.goto('/admin/leads');
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible({ timeout: 20_000 });

    const rendered = (await tabs.allTextContents()).map(t =>
      t.trim().toLowerCase().replace(/\s*\(\d+\)\s*$/, '').replace(/\s+/g, '_'),
    );
    const expected = ALL_STATUSES_ORDER.filter(s => rendered.includes(s));
    const actual = rendered.filter(r => (ALL_STATUSES_ORDER as readonly string[]).includes(r));
    expect(actual).toEqual(expected);
  });

  test('pending_review sits immediately after job_completed', async ({ page }) => {
    await page.goto('/admin/leads');
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible({ timeout: 20_000 });

    const rendered = (await tabs.allTextContents()).map(t => t.trim().toLowerCase());
    const done = rendered.findIndex(t => t.includes('job completed'));
    const review = rendered.findIndex(t => t.includes('pending review'));
    expect(done, 'job_completed tab should be present').toBeGreaterThanOrEqual(0);
    expect(review, 'pending_review should immediately follow job_completed').toBe(done + 1);
  });

  test('?status= deep link pre-filters the list', async ({ page }) => {
    await page.goto('/admin/leads?status=pending_review');
    await expect(page.getByRole('tab', { selected: true })).toContainText(/pending review/i, {
      timeout: 20_000,
    });
  });

  test('dashboard overdue card deep-links into a filtered leads page', async ({ page }) => {
    await page.goto('/admin');
    await page.getByText(/overdue invoices/i).first().click();
    await expect(page).toHaveURL(/\/admin\/leads\?status=/, { timeout: 15_000 });
    await expect(page.getByRole('tab', { selected: true })).not.toContainText(/new lead/i);
  });
});

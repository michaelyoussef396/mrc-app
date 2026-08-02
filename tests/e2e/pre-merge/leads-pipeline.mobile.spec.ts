import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectRenderable, expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * Leads pipeline — merged into main at 8fe47e9 via launch/checks:
 *   d50b117  fix(leads): reorder pipeline tabs to match canonical ALL_STATUSES
 *            — pending_review after job_completed
 *   396ca9c  fix(leads): honour ?status= deep links from dashboard cards and
 *            quick actions  (LeadsManagement.tsx:143 useSearchParams)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ALL_STATUSES IS FROZEN. If the order assertion below ever fails, the array is
 * authoritative — fix the UI, never the array.
 *
 * LeadDetail.tsx handleChangeStatus uses ALL_STATUSES.indexOf() against hardcoded
 * thresholds (newRank < 1/2/6/7/10/11) to null assigned_to, booking dates,
 * invoice_amount, invoice_sent_date and payment_received_date on reversion.
 * Reordering the array silently wipes customer financial data.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Implementation note: the pipeline tabs are NOT ARIA tabs — PipelineTabs.tsx
 * renders plain <button>s, so getByRole('tab') finds nothing. Active state is
 * expressed by the `bg-slate-900` class, not aria-selected.
 */

/**
 * Rendered tab labels in order, from PipelineTabs driven by getStatusCounts().
 * Maps 1:1 onto ALL_STATUSES (src/lib/statusFlow.ts) after the leading "All":
 *   new_lead, inspection_waiting, inspection_ai_summary,
 *   approve_inspection_report, inspection_email_approval, job_waiting,
 *   job_scheduled, job_completed, pending_review, job_report_pdf_sent,
 *   invoicing_sent, paid, google_review, finished, closed, not_landed
 */
const EXPECTED_TAB_ORDER = [
  'All',
  'New Lead',
  'Awaiting Inspection',
  'AI Review',
  'Approve Report',
  'Email Approval',
  'Awaiting Job',
  'Job Scheduled',
  'Job Completed',
  'Pending Review',
  'Report Sent',
  'Invoice Sent',
  'Paid',
  'Review',
  'Finished',
  'Closed',
  'Not Landed',
] as const;

/**
 * Tab labels as rendered, with their trailing count badge stripped.
 *
 * Scoped to the PipelineTabs strip (`div.min-w-max`, PipelineTabs.tsx:26) rather
 * than scanning every button on the page — the page header carries its own
 * "New Lead" create button, which a document-wide scan wrongly picks up as a tab.
 */
async function renderedTabLabels(page: import('@playwright/test').Page): Promise<string[]> {
  const raw = await page.locator('div.min-w-max button').allTextContents();
  return raw
    .map(t => t.replace(/\s+/g, ' ').trim().replace(/\d+$/, '').trim())
    .filter(Boolean);
}

test.describe('Leads pipeline (launch/checks d50b117, 396ca9c, merged)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('renders the leads page at 375px', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto('/admin/leads');
    await expect(page.getByRole('heading', { name: /lead management/i }).first())
      .toBeVisible({ timeout: 25_000 });

    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'leads-pipeline', { desktop: true });
    await assertConsoleClean(watch, testInfo);
  });

  test('pipeline tab order matches ALL_STATUSES', async ({ page }) => {
    await page.goto('/admin/leads');
    await expect(page.getByRole('heading', { name: /lead management/i }).first())
      .toBeVisible({ timeout: 25_000 });

    expect(await renderedTabLabels(page)).toEqual([...EXPECTED_TAB_ORDER]);
  });

  test('pending_review sits immediately after job_completed', async ({ page }) => {
    await page.goto('/admin/leads');
    await expect(page.getByRole('heading', { name: /lead management/i }).first())
      .toBeVisible({ timeout: 25_000 });

    const labels = await renderedTabLabels(page);
    const done = labels.indexOf('Job Completed');
    const review = labels.indexOf('Pending Review');
    expect(done, 'Job Completed tab should be present').toBeGreaterThanOrEqual(0);
    expect(review, 'Pending Review must immediately follow Job Completed').toBe(done + 1);
  });

  // 396ca9c — LeadsManagement.tsx:143 reads the status search param. Active tab is
  // styled with bg-slate-900 (PipelineTabs.tsx:37); there is no aria-selected.
  test('?status= deep link pre-selects the matching tab', async ({ page }) => {
    await page.goto('/admin/leads?status=pending_review');
    await expect(page.getByRole('heading', { name: /lead management/i }).first())
      .toBeVisible({ timeout: 25_000 });

    const active = page.locator('button.bg-slate-900').filter({ hasText: /pending review/i });
    await expect(active, '?status=pending_review should activate the Pending Review tab')
      .toHaveCount(1, { timeout: 15_000 });
  });

  test('dashboard overdue card deep-links into a pre-filtered leads page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText(/overdue invoices/i).first()).toBeVisible({ timeout: 25_000 });
    await page.getByText(/overdue invoices/i).first().click();

    await expect(page).toHaveURL(/\/admin\/leads\?status=/, { timeout: 15_000 });
    const active = page.locator('button.bg-slate-900').first();
    await expect(active, 'a pipeline tab should be pre-selected from the deep link')
      .toBeVisible({ timeout: 15_000 });
    const label = await expectRenderable(active, 'active tab');
    expect(label.toLowerCase(), 'deep link should not land on the default All tab')
      .not.toMatch(/^all/);
  });
});

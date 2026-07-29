import { test, expect } from '@playwright/test';
import { signIn } from './helpers/session';
import { JOB_COMPLETION_LEAD_ID } from './helpers/fixtures';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * docs/PRE_MERGE_TESTING_CHECKLIST.md §3.2 — job completion form at 375px,
 * against JOB-2026-2237.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WRITE SAFETY — read this before adding any interaction to this file.
 *
 * useJobCompletionForm runs a 30s setInterval that DOES save to the database,
 * but it is gated on `hasUnsavedChangesRef.current`. `setHasUnsavedChanges(true)`
 * has exactly two call sites:
 *   1. inside `handleChange`               (src/hooks/useJobCompletionForm.ts:265)
 *   2. inside the "Restore" toast onClick  (src/hooks/useJobCompletionForm.ts:358)
 * Mount never marks the form dirty, so the interval no-ops and this spec writes
 * nothing.
 *
 * Therefore: NEVER focus, type into, or clear a field, and NEVER click the
 * "Restore" action on the unsaved-work toast. Navigate, assert, screenshot, leave.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Route note: /technician/job-completion/:leadId takes the LEAD id. The
 * job_completion id (1b81f7e7-c094-43f0-9321-7424042433c5) would 404.
 *
 * Expected on this fixture: em-dashes / "not quoted" states on the HEPA and
 * waste comparisons are CORRECT. The row predates the quoted-snapshot code
 * (quoted_afd_qty and quoted_waste_disposal_cost are NULL), so it exercises the
 * legacy never-quoted path. Do not report them as failures.
 */
test.describe('§3.2 Job completion form', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('loads at 375px with no console errors or error boundary', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto(`/technician/job-completion/${JOB_COMPLETION_LEAD_ID}`);

    // The form renders a section shell regardless of which section is active.
    await expect(
      page.getByText(/job completion|office info|summary|equipment/i).first(),
    ).toBeVisible({ timeout: 30_000 });

    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'job-completion');
    await assertConsoleClean(watch, testInfo);
  });

  test('does not render NaN or undefined anywhere in the form', async ({ page }) => {
    await page.goto(`/technician/job-completion/${JOB_COMPLETION_LEAD_ID}`);
    await expect(
      page.getByText(/job completion|office info|summary|equipment/i).first(),
    ).toBeVisible({ timeout: 30_000 });

    const body = (await page.locator('body').textContent()) ?? '';
    expect(body, 'form leaked a placeholder value').not.toMatch(/NaN|\[object Object\]|Infinity/);
  });

  test('no unsaved-changes state is created by merely opening the form', async ({ page }) => {
    await page.goto(`/technician/job-completion/${JOB_COMPLETION_LEAD_ID}`);
    await expect(
      page.getByText(/job completion|office info|summary|equipment/i).first(),
    ).toBeVisible({ timeout: 30_000 });

    // A dirty-state indicator would mean mount marked the form dirty, which
    // would make the 30s autosave interval write. That would break the
    // read-only guarantee of this whole run.
    await expect(page.getByText(/unsaved changes/i)).toHaveCount(0);
  });
});

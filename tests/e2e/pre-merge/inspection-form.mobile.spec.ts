import { test, expect } from '@playwright/test';
import { signIn } from './helpers/session';
import { INSPECTION_LEAD_ID } from './helpers/fixtures';
import {
  watchConsole, assertNoErrorBoundary, assertConsoleClean,
  capture, expectNoHorizontalScroll, MOBILE,
} from './helpers/breadth';

/**
 * docs/PRE_MERGE_TESTING_CHECKLIST.md §3.1 — technician inspection form,
 * Section 7 HEPA panel.
 *
 * WRITE SAFETY: the inspection form autosaves every 30 seconds. This spec
 * navigates, asserts, screenshots and leaves — it NEVER focuses or types into a
 * field, so no change is registered and nothing is saved. Do not add
 * interactions here without re-checking the autosave trigger.
 *
 * Route: /technician/inspection?leadId=… (the leadId is a query param, not a
 * path segment — see TechnicianInspectionForm.tsx:2822).
 */
test.describe('§3.1 Technician inspection form', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('loads at 375px with no console errors or error boundary', async ({ page }, testInfo) => {
    const watch = watchConsole(page);
    await page.goto(`/technician/inspection?leadId=${INSPECTION_LEAD_ID}`);

    await expect(
      page.getByText(/inspection|property|section/i).first(),
    ).toBeVisible({ timeout: 30_000 });

    await assertNoErrorBoundary(page);
    await page.setViewportSize(MOBILE);
    await expectNoHorizontalScroll(page);
    await capture(page, 'inspection-form');
    await assertConsoleClean(watch, testInfo);
  });

  /**
   * NOT asserted here: the Section 7 HEPA panel (277cc86).
   *
   * The form mounts on Section 1 and the HEPA control is not in the DOM until
   * Section 7 is opened. Reaching it means clicking through section navigation,
   * and TechnicianInspectionForm saves on section change — that would be a
   * write, which this run forbids.
   *
   * Section 7 HEPA verification therefore stays MANUAL, per
   * docs/PRE_MERGE_TESTING_CHECKLIST.md §3.1, which already lists it as a
   * hands-on check (panel gating, "Auto (N) days", $100/unit/day, autosave
   * round-trip). This spec proves the form mounts and renders cleanly; the
   * money and gating behaviour is yours to confirm on the preview.
   */

  test('does not render NaN or undefined anywhere in the form', async ({ page }) => {
    await page.goto(`/technician/inspection?leadId=${INSPECTION_LEAD_ID}`);
    await expect(page.getByText(/inspection|property|section/i).first()).toBeVisible({ timeout: 30_000 });

    const body = (await page.locator('body').textContent()) ?? '';
    expect(body, 'form leaked a placeholder value').not.toMatch(/NaN|\[object Object\]|Infinity/);
  });
});

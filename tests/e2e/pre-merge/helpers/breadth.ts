import { expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Shared harness for the pre-merge breadth run.
 *
 * Purpose: prove every user-visible surface renders, navigates and survives a
 * 375px viewport. NOT a correctness audit — money values stay manual, so these
 * helpers assert SHAPE (is it a currency string? is it a date? is it not NaN?)
 * rather than specific figures. The preview points at DEV, whose row data
 * differs from the PROD figures quoted in docs/PRE_MERGE_TESTING_CHECKLIST.md.
 */

// The repo is ESM, so __dirname is unavailable — derive it from import.meta.
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCREENSHOT_DIR = path.join(HERE, '..', '__screenshots__');

export const MOBILE = { width: 375, height: 667 } as const;
export const DESKTOP = { width: 1920, height: 1080 } as const;

// ---------------------------------------------------------------------------
// Console / error-boundary watching
// ---------------------------------------------------------------------------

/**
 * Messages that are noise rather than defects. Kept deliberately small — every
 * suppressed message is still recorded and reported, so nothing is silently
 * hidden. Add to this list only with a stated reason.
 */
const CONSOLE_ALLOWLIST: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /React Router Future Flag Warning/i, reason: 'v7 opt-in notice, emitted by react-router v6' },
  { pattern: /favicon\.ico|manifest\.json|apple-touch-icon/i, reason: 'static asset 404s, not app code' },
  { pattern: /Download the React DevTools/i, reason: 'React dev build banner' },
  {
    pattern: /\[useGoogleMaps\] Google Maps API key not configured/i,
    reason: 'environmental: VITE_GOOGLE_MAPS_API_KEY absent from the build env, not a code defect. '
          + 'Will also appear on any deploy whose env lacks the key — check Preview/Production scope.',
  },
];

export interface ConsoleWatch {
  /** Errors that are NOT allowlisted — these fail the test. */
  errors: () => string[];
  /** Allowlisted messages, reported for transparency. */
  suppressed: () => string[];
}

/**
 * Attach console + pageerror listeners. Call BEFORE page.goto so nothing during
 * initial load is missed.
 */
export function watchConsole(page: Page): ConsoleWatch {
  const errors: string[] = [];
  const suppressed: string[] = [];

  const record = (text: string) => {
    const hit = CONSOLE_ALLOWLIST.find(entry => entry.pattern.test(text));
    if (hit) suppressed.push(`[${hit.reason}] ${text}`);
    else errors.push(text);
  };

  page.on('console', msg => {
    if (msg.type() === 'error') record(msg.text());
  });
  page.on('pageerror', err => record(`pageerror: ${err.message}`));

  return { errors: () => [...errors], suppressed: () => [...suppressed] };
}

/**
 * Assert no error boundary rendered. Both fallbacks live in
 * src/components/ErrorBoundary.tsx — the global one and the per-page one used
 * by the PageErrorBoundary wrappers in App.tsx.
 */
export async function assertNoErrorBoundary(page: Page): Promise<void> {
  await expect(page.getByText('Something went wrong', { exact: false })).toHaveCount(0);
  await expect(page.getByText('This section encountered an error', { exact: false })).toHaveCount(0);
}

/**
 * Fail the test if any non-allowlisted console error appeared, naming them.
 * Allowlisted messages are attached to the report rather than thrown.
 */
export async function assertConsoleClean(
  watch: ConsoleWatch,
  testInfo: TestInfo,
): Promise<void> {
  const muted = watch.suppressed();
  if (muted.length) {
    await testInfo.attach('suppressed-console', {
      body: muted.join('\n'),
      contentType: 'text/plain',
    });
  }
  expect(watch.errors(), `Console errors on ${testInfo.title}`).toEqual([]);
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

/**
 * Screenshot at 375px, and additionally at 1920px when `desktop` is set (admin
 * routes). The config uses screenshot:'only-on-failure', so every capture here
 * is explicit. Viewport is restored afterwards so the test's own project
 * viewport still governs any later assertions.
 */
export async function capture(
  page: Page,
  name: string,
  opts: { desktop?: boolean } = {},
): Promise<void> {
  const original = page.viewportSize();

  await page.setViewportSize(MOBILE);
  await page.waitForTimeout(250); // let responsive layout settle
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.375.png`), fullPage: true });

  if (opts.desktop) {
    await page.setViewportSize(DESKTOP);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.1920.png`), fullPage: true });
  }

  if (original) await page.setViewportSize(original);
}

// ---------------------------------------------------------------------------
// Shape matchers — presence and format, never specific values
// ---------------------------------------------------------------------------

const NEVER_RENDER = /NaN|undefined|null|Infinity|\[object Object\]/;

/** Text is present, non-empty, and contains no NaN/undefined/Infinity leakage. */
export async function expectRenderable(locator: Locator, label: string): Promise<string> {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const text = ((await locator.textContent()) ?? '').trim();
  expect(text, `${label} should not be empty`).not.toBe('');
  expect(text, `${label} leaked a placeholder value`).not.toMatch(NEVER_RENDER);
  return text;
}

/** e.g. "$0", "$1,234", "$11.0k", "$1,234.56" */
export async function expectCurrency(locator: Locator, label: string): Promise<void> {
  const text = await expectRenderable(locator, label);
  expect(text, `${label} should be a currency string`).toMatch(/^\$[\d,]+(\.\d{1,2})?k?$/);
}

/** Australian short date, e.g. "04/05". */
export async function expectShortDateAU(locator: Locator, label: string): Promise<void> {
  const text = await expectRenderable(locator, label);
  expect(text, `${label} should be DD/MM`).toMatch(/^\d{2}\/\d{2}$/);
}

/** A whole number, e.g. a count. */
export async function expectInteger(locator: Locator, label: string): Promise<void> {
  const text = await expectRenderable(locator, label);
  expect(text, `${label} should be an integer`).toMatch(/^\d+$/);
}

/**
 * A duration as rendered by dateUtils.formatDurationHours — "6 min", "2.3 hrs",
 * "26 hrs", or an em-dash when there is nothing to report. Critically, "0 min"
 * is NOT acceptable: that was the pre-526bf1d bug where the average was rounded
 * to whole hours before formatting.
 */
export async function expectDuration(locator: Locator, label: string): Promise<void> {
  const text = await expectRenderable(locator, label);
  expect(text, `${label} should be a duration or em-dash`).toMatch(/^(—|\d+ min|\d+(\.\d)? hrs)$/);
  expect(text, `${label} regressed to the rounded-to-zero bug`).not.toBe('0 min');
}

/** No horizontal overflow — the mobile-first rule at 375px. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    overflow.scrollWidth,
    `horizontal scroll at ${overflow.clientWidth}px (document is ${overflow.scrollWidth}px)`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1); // +1 for sub-pixel rounding
}

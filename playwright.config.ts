import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config. Run against local dev (default) or production by setting
 * PLAYWRIGHT_BASE_URL.
 *
 * ENV:
 *   PLAYWRIGHT_BASE_URL   — defaults to http://localhost:5173
 *   ADMIN_EMAIL           — admin test account
 *   ADMIN_PASSWORD
 *   TECH_EMAIL            — technician test account
 *   TECH_PASSWORD
 *   TEST_LEAD_ID          — optional existing lead UUID for read-only flow tests
 *   TEST_INSPECTION_ID    — optional existing inspection UUID
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 667 } },
      testMatch: /mobile\.spec\.ts$/,
    },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

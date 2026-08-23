import { expect, test } from '@playwright/test';

import { signIn } from './helpers/session';

/**
 * AdminHeader notifications coherence — visual/layout verification at the two
 * required viewports. State coherence (badge, list, mark-read sharing the
 * notifications table) is asserted at the component level in
 * src/components/admin/__tests__/AdminHeader.notifications.test.tsx; this spec
 * verifies the rendered surface: bell trigger present with a 48px touch
 * target, dropdown opens with the Notifications panel, and the layout holds
 * with no horizontal scroll at 375px. The table has no rows yet (writers ship
 * behind an unapplied migration), so the empty state is the expected content.
 */
const DESKTOP = { width: 1920, height: 1080 };
const MOBILE = { width: 375, height: 667 };

test.describe('AdminHeader notifications dropdown', () => {
  test('renders the notifications panel at 1920px', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page);

    const bell = page.getByTestId('notification-bell-trigger');
    await expect(bell).toBeVisible();
    await bell.click();

    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByText('No notifications yet')).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-header-notifications-1920.png' });
  });

  test('renders at 375px with a 48px bell target and no horizontal scroll', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page);

    const bell = page.getByTestId('notification-bell-trigger');
    await expect(bell).toBeVisible();

    const box = await bell.boundingBox();
    expect(box !== null && box.width >= 48 && box.height >= 48).toBe(true);

    await bell.click();
    await expect(page.getByText('No notifications yet')).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE.width);
    await page.screenshot({ path: 'test-results/admin-header-notifications-375.png' });
  });
});

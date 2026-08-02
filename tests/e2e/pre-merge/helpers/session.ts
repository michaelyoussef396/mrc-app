import { expect, type Page } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

/**
 * Sign in and land somewhere authenticated.
 *
 * Why not tests/e2e/helpers/auth.ts's loginAsTechnician for the /technician/*
 * routes: Login.tsx redirectByRole() sends the user to the landing page for the
 * role it resolves (Login.tsx:237-248). The test account holds admin,
 * technician AND developer, so the technician toggle does not reliably land on
 * /technician — observed staying on "/". That is an app/account behaviour, not
 * a defect in the surfaces under test.
 *
 * The /technician/* routes are guarded by RoleProtectedRoute
 * allowedRoles={["technician"]}, which checks role MEMBERSHIP, not which toggle
 * was used at login. So an authenticated session for an account holding the
 * technician role can navigate straight to them.
 */
export async function signIn(page: Page): Promise<void> {
  await loginAsAdmin(page);
}

/**
 * Sign in, then navigate directly to a role-guarded route. Fails loudly if the
 * guard bounced us, so a permissions problem never reads as a render problem.
 */
export async function signInAndGoto(page: Page, route: string): Promise<void> {
  await signIn(page);
  await page.goto(route);
  await expect(page, `route guard bounced ${route} — check the account's roles`)
    .toHaveURL(new RegExp(route.split('?')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { timeout: 15_000 });
}

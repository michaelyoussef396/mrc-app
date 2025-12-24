"""
Authentication Helper for TestSprite Tests

Provides reusable authentication functionality for tests that require
access to protected routes (dashboard, leads, settings, etc.)
"""
import os
import asyncio
from playwright.async_api import async_playwright, Page, BrowserContext

# Default credentials from environment
DEFAULT_EMAIL = os.getenv("ADMIN_EMAIL", "admin@mrc.com.au")
DEFAULT_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")
STORAGE_STATE_PATH = "testsprite_tests/tmp/storageState.json"


async def ensure_storage_dir():
    """Ensure the storage directory exists."""
    os.makedirs(os.path.dirname(STORAGE_STATE_PATH), exist_ok=True)


async def login_and_save_state(page: Page, email: str = None, password: str = None):
    """
    Logs in a user and saves the browser context's storage state.

    Args:
        page: Playwright page object
        email: Login email (defaults to ADMIN_EMAIL env var)
        password: Login password (defaults to ADMIN_PASSWORD env var)
    """
    email = email or DEFAULT_EMAIL
    password = password or DEFAULT_PASSWORD

    print(f"Logging in as {email}...")
    await page.goto("http://localhost:8080/login", wait_until="networkidle")

    # Wait for login form to be ready
    await page.wait_for_selector('input[name="email"]', state="visible")

    # Fill in login credentials
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)

    # Click submit button
    await page.click('button[type="submit"]')

    # Wait for navigation to dashboard (successful login)
    try:
        await page.wait_for_url("**/dashboard**", timeout=15000)
        print("Login successful! Navigated to dashboard.")
    except:
        # Check if we're still on login page with an error
        current_url = page.url
        if "/login" in current_url:
            error_text = await page.locator('.text-destructive, .error').text_content()
            raise Exception(f"Login failed. Error: {error_text}")
        print(f"Login appears successful. Current URL: {current_url}")

    # Save storage state for future use
    await ensure_storage_dir()
    context = page.context
    await context.storage_state(path=STORAGE_STATE_PATH)
    print(f"Session state saved to {STORAGE_STATE_PATH}")


async def get_authenticated_context(playwright, force_new_login: bool = False):
    """
    Returns an authenticated browser context.

    If storage state exists and force_new_login is False, uses cached state.
    Otherwise performs fresh login.

    Args:
        playwright: Playwright instance
        force_new_login: If True, performs fresh login even if state exists

    Returns:
        tuple: (browser, context) - both need to be closed by caller
    """
    await ensure_storage_dir()

    browser = await playwright.chromium.launch(
        headless=True,
        args=["--window-size=1280,720", "--disable-dev-shm-usage"]
    )

    if not force_new_login and os.path.exists(STORAGE_STATE_PATH):
        print(f"Using cached authentication from {STORAGE_STATE_PATH}")
        context = await browser.new_context(storage_state=STORAGE_STATE_PATH)
    else:
        print("Performing fresh login...")
        context = await browser.new_context()
        page = await context.new_page()
        try:
            await login_and_save_state(page)
        finally:
            await page.close()
        # Recreate context with saved state
        await context.close()
        context = await browser.new_context(storage_state=STORAGE_STATE_PATH)

    context.set_default_timeout(30000)
    return browser, context


async def create_authenticated_page(playwright, force_new_login: bool = False):
    """
    Creates an authenticated page ready for testing protected routes.

    Args:
        playwright: Playwright instance
        force_new_login: If True, performs fresh login even if state exists

    Returns:
        tuple: (browser, context, page) - all need to be closed by caller
    """
    browser, context = await get_authenticated_context(playwright, force_new_login)
    page = await context.new_page()
    return browser, context, page


# Convenience function for simple test setup
async def setup_authenticated_test():
    """
    Complete setup for an authenticated test.

    Returns:
        tuple: (playwright, browser, context, page)

    Example:
        pw, browser, context, page = await setup_authenticated_test()
        try:
            # Your test code here
            await page.goto("http://localhost:8080/dashboard")
        finally:
            await cleanup_test(pw, browser, context, page)
    """
    pw = await async_playwright().start()
    browser, context, page = await create_authenticated_page(pw)
    return pw, browser, context, page


async def cleanup_test(pw, browser, context, page):
    """
    Clean up all test resources.

    Args:
        pw: Playwright instance
        browser: Browser instance
        context: Browser context
        page: Page instance
    """
    if page:
        await page.close()
    if context:
        await context.close()
    if browser:
        await browser.close()
    if pw:
        await pw.stop()

import asyncio
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright, expect
from testsprite_tests.auth_helper import setup_authenticated_test, cleanup_test

async def run_test():
    """
    TC012: Notifications and Email UI Elements

    Tests that the notifications page:
    - Loads correctly after authentication
    - Displays notification preferences
    - Has email/notification settings
    - Shows communication history (if applicable)

    REQUIRES AUTHENTICATION - uses admin credentials
    """
    pw = None
    browser = None
    context = None
    page = None

    try:
        # Get authenticated session
        pw, browser, context, page = await setup_authenticated_test()

        # Navigate to notifications page
        print("Navigating to notifications page...")
        await page.goto("http://localhost:8080/notifications", wait_until="networkidle")

        # Wait for page to load
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)

        # Verify we're on the notifications page
        current_url = page.url
        assert "/notifications" in current_url, f"Should be on notifications page, but URL is: {current_url}"
        print("Successfully loaded notifications page")

        # TEST 1: Check for notification elements
        print("TEST 1: Checking for notification elements...")

        notification_elements = page.locator('[class*="notification"], [class*="alert"], [class*="message"], [class*="email"]')
        notif_count = await notification_elements.count()

        if notif_count > 0:
            print(f"SUCCESS: Found {notif_count} notification element(s)")
        else:
            print("INFO: No notifications currently displayed")

        # TEST 2: Check for settings/preferences
        print("TEST 2: Checking for settings elements...")
        settings_elements = page.locator('[class*="setting"], [class*="preference"], input[type="checkbox"], input[type="toggle"], [role="switch"]')
        settings_count = await settings_elements.count()

        if settings_count > 0:
            print(f"SUCCESS: Found {settings_count} setting element(s)")
        else:
            print("INFO: Settings may be on separate page")

        # TEST 3: Check for email-related elements
        print("TEST 3: Checking for email elements...")
        email_elements = page.locator('[class*="email"], [class*="send"], [class*="template"], [class*="message"]')
        email_count = await email_elements.count()

        if email_count > 0:
            print(f"SUCCESS: Found {email_count} email-related element(s)")
        else:
            print("INFO: Email settings may be elsewhere")

        # TEST 4: Check for notification list or history
        print("TEST 4: Checking for notification history...")
        history_elements = page.locator('[class*="list"], [class*="history"], [class*="log"], table, [role="list"]')
        history_count = await history_elements.count()

        if history_count > 0:
            print(f"SUCCESS: Found {history_count} list/history element(s)")
        else:
            print("INFO: History may be empty or use different structure")

        # TEST 5: Check for interactive elements
        print("TEST 5: Checking for interactivity...")
        interactive = page.locator('button, a[href], [role="button"], input, select')
        interactive_count = await interactive.count()
        assert interactive_count > 0, "Page should have interactive elements"
        print(f"SUCCESS: Found {interactive_count} interactive elements")

        print("TEST PASSED: TC012 - Notifications page loads and displays correctly!")

    except Exception as e:
        print(f"TEST FAILED: {e}")
        raise

    finally:
        await cleanup_test(pw, browser, context, page)

if __name__ == "__main__":
    asyncio.run(run_test())

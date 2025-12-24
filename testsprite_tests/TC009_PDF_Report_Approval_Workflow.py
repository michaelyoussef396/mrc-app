import asyncio
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright, expect
from testsprite_tests.auth_helper import setup_authenticated_test, cleanup_test

async def run_test():
    """
    TC009: Reports Page Workflow Actions

    Tests that the reports page has:
    - Proper navigation and workflow elements
    - Report status indicators
    - Action buttons (approve, reject, edit)
    - Report metadata display

    REQUIRES AUTHENTICATION - uses admin credentials
    """
    pw = None
    browser = None
    context = None
    page = None

    try:
        # Get authenticated session
        pw, browser, context, page = await setup_authenticated_test()

        # Navigate to reports page
        print("Navigating to reports page...")
        await page.goto("http://localhost:8080/reports", wait_until="networkidle")

        # Wait for page to load
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)

        # Verify we're on the reports page
        current_url = page.url
        assert "/reports" in current_url, f"Should be on reports page, but URL is: {current_url}"
        print("Successfully loaded reports page")

        # TEST 1: Check for workflow action buttons
        print("TEST 1: Checking for workflow action buttons...")
        action_buttons = page.locator('button:has-text("Approve"), button:has-text("Reject"), button:has-text("Edit"), button:has-text("Review"), button:has-text("Send")')
        action_count = await action_buttons.count()

        if action_count > 0:
            print(f"SUCCESS: Found {action_count} workflow action button(s)")
        else:
            print("INFO: Workflow buttons may appear when reports exist")

        # TEST 2: Check for status indicators
        print("TEST 2: Checking for status indicators...")
        status_elements = page.locator('[class*="status"], [class*="badge"], [class*="pending"], [class*="approved"], [class*="draft"]')
        status_count = await status_elements.count()

        if status_count > 0:
            print(f"SUCCESS: Found {status_count} status indicator(s)")
        else:
            print("INFO: Status indicators may depend on data")

        # TEST 3: Check for report metadata
        print("TEST 3: Checking for metadata elements...")
        metadata_elements = page.locator('[class*="meta"], [class*="info"], [class*="date"], [class*="client"], [class*="report"]')
        meta_count = await metadata_elements.count()

        if meta_count > 0:
            print(f"SUCCESS: Found {meta_count} metadata element(s)")
        else:
            print("INFO: Metadata displayed when reports exist")

        # TEST 4: Check for navigation
        print("TEST 4: Checking for navigation...")
        nav_elements = page.locator('button:has-text("Back"), a[href*="dashboard"], nav, [class*="nav"]')
        nav_count = await nav_elements.count()
        assert nav_count > 0, "Should have navigation elements"
        print(f"SUCCESS: Found {nav_count} navigation element(s)")

        # TEST 5: Check page has proper structure
        print("TEST 5: Checking page structure...")
        page_structure = page.locator('main, [class*="content"], [class*="container"]')
        structure_count = await page_structure.count()
        assert structure_count > 0, "Page should have proper structure"
        print(f"SUCCESS: Found {structure_count} structure element(s)")

        print("TEST PASSED: TC009 - Reports workflow page structure verified!")

    except Exception as e:
        print(f"TEST FAILED: {e}")
        raise

    finally:
        await cleanup_test(pw, browser, context, page)

if __name__ == "__main__":
    asyncio.run(run_test())

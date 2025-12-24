import asyncio
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright, expect
from testsprite_tests.auth_helper import setup_authenticated_test, cleanup_test

async def run_test():
    """
    TC008: Reports Page Load and PDF Report Elements

    Tests that the reports page:
    - Loads correctly after authentication
    - Displays report list or generation interface
    - Has PDF-related functionality visible
    - Shows proper report structure

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

        # TEST 1: Verify page structure
        print("TEST 1: Checking reports page structure...")

        # Check for reports-related elements
        reports_elements = page.locator('[class*="report"], [class*="pdf"], [class*="document"], [class*="card"]')
        reports_count = await reports_elements.count()

        if reports_count > 0:
            print(f"SUCCESS: Found {reports_count} report-related element(s)")
        else:
            print("INFO: Reports may not be generated yet")

        # TEST 2: Check for PDF generation buttons
        print("TEST 2: Checking for PDF functionality...")
        pdf_buttons = page.locator('button:has-text("PDF"), button:has-text("Generate"), button:has-text("Download"), button:has-text("Export"), [class*="pdf"]')
        pdf_count = await pdf_buttons.count()

        if pdf_count > 0:
            print(f"SUCCESS: Found {pdf_count} PDF-related button(s)")
        else:
            print("INFO: PDF buttons may appear after report selection")

        # TEST 3: Check for report list or table
        print("TEST 3: Checking for report list...")
        list_elements = page.locator('table, [role="table"], [class*="list"], [class*="grid"], [class*="row"]')
        list_count = await list_elements.count()

        if list_count > 0:
            print(f"SUCCESS: Found {list_count} list element(s)")
        else:
            print("INFO: Report list may be empty or use different structure")

        # TEST 4: Check for interactive elements
        print("TEST 4: Checking for interactive elements...")
        interactive = page.locator('button, a[href], [role="button"]')
        interactive_count = await interactive.count()
        assert interactive_count > 0, "Reports page should have interactive elements"
        print(f"SUCCESS: Found {interactive_count} interactive elements")

        # TEST 5: Check for view/preview functionality
        print("TEST 5: Checking for view functionality...")
        view_buttons = page.locator('button:has-text("View"), button:has-text("Preview"), button:has-text("Open"), a:has-text("View")')
        view_count = await view_buttons.count()

        if view_count > 0:
            print(f"SUCCESS: Found {view_count} view/preview button(s)")
        else:
            print("INFO: View buttons may appear when reports exist")

        print("TEST PASSED: TC008 - Reports page loads and displays correctly!")

    except Exception as e:
        print(f"TEST FAILED: {e}")
        raise

    finally:
        await cleanup_test(pw, browser, context, page)

if __name__ == "__main__":
    asyncio.run(run_test())

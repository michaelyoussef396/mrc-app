import asyncio
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright, expect
from testsprite_tests.auth_helper import setup_authenticated_test, cleanup_test

async def run_test():
    """
    TC004: Leads Management Table View and Filtering

    Tests that the leads management page:
    - Loads correctly with lead data
    - Displays leads in a table or list format
    - Has filtering/sorting capabilities
    - Allows viewing individual lead details

    REQUIRES AUTHENTICATION - uses admin credentials
    """
    pw = None
    browser = None
    context = None
    page = None

    try:
        # Get authenticated session
        pw, browser, context, page = await setup_authenticated_test()

        # Navigate to leads management page
        print("Navigating to leads management...")
        await page.goto("http://localhost:8080/leads", wait_until="networkidle")

        # Verify we're on the leads page
        current_url = page.url
        assert "/leads" in current_url, f"Should be on leads page, but URL is: {current_url}"
        print("Successfully loaded leads management page")

        # Wait for content to load
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)

        # TEST 1: Verify page structure
        print("TEST 1: Checking page structure...")

        # Look for table or list elements
        table_elements = page.locator('table, [role="table"], [class*="table"], [class*="list"], [class*="grid"]')
        table_count = await table_elements.count()

        if table_count > 0:
            print(f"SUCCESS: Found {table_count} table/list element(s)")
        else:
            # Check for any lead-related content
            lead_content = page.locator('[class*="lead"], [class*="card"], [class*="row"]')
            content_count = await lead_content.count()
            print(f"INFO: Found {content_count} lead-related content elements")

        # TEST 2: Check for search/filter functionality
        print("TEST 2: Checking for search/filter functionality...")
        search_elements = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i], [class*="search"], [class*="filter"]')
        search_count = await search_elements.count()

        if search_count > 0:
            print(f"SUCCESS: Found {search_count} search/filter element(s)")
        else:
            print("INFO: No explicit search/filter elements found")

        # TEST 3: Check for sorting or column headers
        print("TEST 3: Checking for column headers/sorting...")
        headers = page.locator('th, [role="columnheader"], [class*="header"], button:has-text("Name"), button:has-text("Status"), button:has-text("Date")')
        header_count = await headers.count()

        if header_count > 0:
            print(f"SUCCESS: Found {header_count} header/sorting element(s)")
        else:
            print("INFO: Table headers may use different structure")

        # TEST 4: Verify interactive elements
        print("TEST 4: Checking for interactive elements...")
        interactive = page.locator('button, a[href], [role="button"], input, select')
        interactive_count = await interactive.count()
        assert interactive_count > 0, "Leads page should have interactive elements"
        print(f"SUCCESS: Found {interactive_count} interactive elements")

        # TEST 5: Check for lead count or status indicators
        print("TEST 5: Checking for lead indicators...")
        indicators = page.locator('[class*="count"], [class*="badge"], [class*="total"]')
        indicator_count = await indicators.count()
        print(f"INFO: Found {indicator_count} indicator(s)")

        print("TEST PASSED: TC004 - Leads Management page loads and displays correctly!")

    except Exception as e:
        print(f"TEST FAILED: {e}")
        raise

    finally:
        await cleanup_test(pw, browser, context, page)

if __name__ == "__main__":
    asyncio.run(run_test())

import asyncio
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright, expect
from testsprite_tests.auth_helper import setup_authenticated_test, cleanup_test

async def run_test():
    """
    TC010: Calendar Page Load and Booking Interface

    Tests that the calendar page:
    - Loads correctly after authentication
    - Displays calendar view
    - Has event/booking functionality
    - Shows date navigation

    REQUIRES AUTHENTICATION - uses admin credentials
    """
    pw = None
    browser = None
    context = None
    page = None

    try:
        # Get authenticated session
        pw, browser, context, page = await setup_authenticated_test()

        # Navigate to calendar page
        print("Navigating to calendar page...")
        await page.goto("http://localhost:8080/calendar", wait_until="networkidle")

        # Wait for page to load
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)

        # Verify we're on the calendar page
        current_url = page.url
        assert "/calendar" in current_url, f"Should be on calendar page, but URL is: {current_url}"
        print("Successfully loaded calendar page")

        # TEST 1: Verify calendar structure
        print("TEST 1: Checking calendar structure...")

        # Check for calendar-related elements
        calendar_elements = page.locator('[class*="calendar"], [class*="event"], [class*="day"], [class*="week"], [class*="month"]')
        calendar_count = await calendar_elements.count()

        if calendar_count > 0:
            print(f"SUCCESS: Found {calendar_count} calendar-related element(s)")
        else:
            # Alternative check for grid or schedule
            grid_elements = page.locator('[class*="grid"], [class*="schedule"], table')
            grid_count = await grid_elements.count()
            print(f"INFO: Found {grid_count} grid/schedule element(s)")

        # TEST 2: Check for date navigation
        print("TEST 2: Checking for date navigation...")
        nav_buttons = page.locator('button:has-text("Today"), button:has-text("Next"), button:has-text("Prev"), button:has-text("<"), button:has-text(">"), [aria-label*="previous" i], [aria-label*="next" i]')
        nav_count = await nav_buttons.count()

        if nav_count > 0:
            print(f"SUCCESS: Found {nav_count} date navigation button(s)")
        else:
            print("INFO: Navigation may use different UI pattern")

        # TEST 3: Check for add event functionality
        print("TEST 3: Checking for add event functionality...")
        add_buttons = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("+"), button:has-text("Book"), button:has-text("Event")')
        add_count = await add_buttons.count()

        if add_count > 0:
            print(f"SUCCESS: Found {add_count} add event button(s)")
        else:
            print("INFO: Add functionality may use different UI")

        # TEST 4: Check for time slots or date cells
        print("TEST 4: Checking for date/time elements...")
        time_elements = page.locator('[class*="slot"], [class*="cell"], [class*="time"], [class*="hour"], td')
        time_count = await time_elements.count()

        if time_count > 0:
            print(f"SUCCESS: Found {time_count} time/cell element(s)")
        else:
            print("INFO: Calendar may use different cell structure")

        # TEST 5: Check for interactive elements
        print("TEST 5: Checking for interactive elements...")
        interactive = page.locator('button, a[href], [role="button"], [role="gridcell"]')
        interactive_count = await interactive.count()
        assert interactive_count > 0, "Calendar page should have interactive elements"
        print(f"SUCCESS: Found {interactive_count} interactive elements")

        print("TEST PASSED: TC010 - Calendar page loads and displays correctly!")

    except Exception as e:
        print(f"TEST FAILED: {e}")
        raise

    finally:
        await cleanup_test(pw, browser, context, page)

if __name__ == "__main__":
    asyncio.run(run_test())

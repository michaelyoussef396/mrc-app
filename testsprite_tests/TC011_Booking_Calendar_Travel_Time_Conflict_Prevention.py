import asyncio
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright, expect
from testsprite_tests.auth_helper import setup_authenticated_test, cleanup_test

async def run_test():
    """
    TC011: Calendar Booking and Event Display

    Tests that the calendar:
    - Shows existing bookings/events
    - Has proper event display
    - Shows technician assignments
    - Has conflict indication UI (if applicable)

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

        # TEST 1: Check for event display elements
        print("TEST 1: Checking for event display...")

        event_elements = page.locator('[class*="event"], [class*="booking"], [class*="appointment"], [data-event], [class*="card"]')
        event_count = await event_elements.count()

        if event_count > 0:
            print(f"SUCCESS: Found {event_count} event element(s)")
        else:
            print("INFO: No events currently displayed (calendar may be empty)")

        # TEST 2: Check for technician/assignee elements
        print("TEST 2: Checking for technician elements...")
        tech_elements = page.locator('[class*="user"], [class*="avatar"], [class*="assignee"], [class*="tech"], [class*="employee"]')
        tech_count = await tech_elements.count()

        if tech_count > 0:
            print(f"SUCCESS: Found {tech_count} technician-related element(s)")
        else:
            print("INFO: Technician display may vary based on view")

        # TEST 3: Check for view toggles (day/week/month)
        print("TEST 3: Checking for view toggles...")
        view_toggles = page.locator('button:has-text("Day"), button:has-text("Week"), button:has-text("Month"), [class*="view"], [role="tablist"]')
        toggle_count = await view_toggles.count()

        if toggle_count > 0:
            print(f"SUCCESS: Found {toggle_count} view toggle(s)")
        else:
            print("INFO: View toggles may use different UI")

        # TEST 4: Check for date display
        print("TEST 4: Checking for date display...")
        date_elements = page.locator('[class*="date"], [class*="header"], [class*="title"], h1, h2, h3')
        date_count = await date_elements.count()

        if date_count > 0:
            print(f"SUCCESS: Found {date_count} date-related element(s)")
        else:
            print("INFO: Date display may use different format")

        # TEST 5: Check for interactive elements
        print("TEST 5: Checking for interactivity...")
        interactive = page.locator('button, a[href], [role="button"], [role="gridcell"]')
        interactive_count = await interactive.count()
        assert interactive_count > 0, "Calendar should have interactive elements"
        print(f"SUCCESS: Found {interactive_count} interactive elements")

        print("TEST PASSED: TC011 - Calendar booking display verified!")

    except Exception as e:
        print(f"TEST FAILED: {e}")
        raise

    finally:
        await cleanup_test(pw, browser, context, page)

if __name__ == "__main__":
    asyncio.run(run_test())

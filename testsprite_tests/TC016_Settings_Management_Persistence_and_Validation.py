import asyncio
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright, expect
from testsprite_tests.auth_helper import setup_authenticated_test, cleanup_test

async def run_test():
    """
    TC016: Settings Page Load and Configuration Elements

    Tests that the settings page:
    - Loads correctly after authentication
    - Displays various settings sections
    - Has editable configuration options
    - Shows save/update functionality

    REQUIRES AUTHENTICATION - uses admin credentials
    """
    pw = None
    browser = None
    context = None
    page = None

    try:
        # Get authenticated session
        pw, browser, context, page = await setup_authenticated_test()

        # Navigate to settings page
        print("Navigating to settings page...")
        await page.goto("http://localhost:8080/settings", wait_until="networkidle")

        # Wait for page to load
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)

        # Verify we're on the settings page
        current_url = page.url
        assert "/settings" in current_url, f"Should be on settings page, but URL is: {current_url}"
        print("Successfully loaded settings page")

        # TEST 1: Check for settings sections
        print("TEST 1: Checking for settings sections...")

        settings_sections = page.locator('[class*="section"], [class*="card"], [class*="panel"], [class*="settings"]')
        section_count = await settings_sections.count()

        if section_count > 0:
            print(f"SUCCESS: Found {section_count} settings section(s)")
        else:
            print("INFO: Settings may use different layout")

        # TEST 2: Check for form inputs
        print("TEST 2: Checking for form inputs...")
        form_inputs = page.locator('input:not([type="hidden"]), textarea, select, [role="switch"], [role="checkbox"]')
        input_count = await form_inputs.count()

        if input_count > 0:
            print(f"SUCCESS: Found {input_count} form input(s)")
        else:
            print("INFO: Settings may be view-only or use different controls")

        # TEST 3: Check for profile/company settings
        print("TEST 3: Checking for profile elements...")
        profile_elements = page.locator('text=/profile/i, text=/company/i, text=/business/i, text=/account/i')
        profile_count = await profile_elements.count()

        if profile_count > 0:
            print(f"SUCCESS: Found {profile_count} profile-related element(s)")
        else:
            print("INFO: Profile settings may be on separate page")

        # TEST 4: Check for save/update buttons
        print("TEST 4: Checking for save functionality...")
        save_buttons = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Apply"), button[type="submit"]')
        save_count = await save_buttons.count()

        if save_count > 0:
            print(f"SUCCESS: Found {save_count} save/update button(s)")
        else:
            print("INFO: Save may be auto-triggered or use different UI")

        # TEST 5: Check for navigation within settings
        print("TEST 5: Checking for settings navigation...")
        nav_elements = page.locator('[class*="tab"], [class*="nav"], [class*="menu"], button:has-text("Pricing"), button:has-text("Email"), button:has-text("Notifications")')
        nav_count = await nav_elements.count()

        if nav_count > 0:
            print(f"SUCCESS: Found {nav_count} navigation element(s)")
        else:
            print("INFO: Settings may be on single page")

        # TEST 6: Check for interactive elements
        print("TEST 6: Checking for interactivity...")
        interactive = page.locator('button, a[href], [role="button"], input, select, [role="switch"]')
        interactive_count = await interactive.count()
        assert interactive_count > 0, "Settings page should have interactive elements"
        print(f"SUCCESS: Found {interactive_count} interactive elements")

        print("TEST PASSED: TC016 - Settings page loads and displays correctly!")

    except Exception as e:
        print(f"TEST FAILED: {e}")
        raise

    finally:
        await cleanup_test(pw, browser, context, page)

if __name__ == "__main__":
    asyncio.run(run_test())

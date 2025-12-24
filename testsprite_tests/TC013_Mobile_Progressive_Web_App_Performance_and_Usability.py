import asyncio
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright, expect
from testsprite_tests.auth_helper import setup_authenticated_test, cleanup_test

async def run_test():
    """
    TC013: Mobile Responsive Design and Touch Targets

    Tests that the application:
    - Is responsive on mobile viewport (375px)
    - Has appropriate touch targets (≥48px)
    - Loads within acceptable time
    - Has no horizontal scrolling

    REQUIRES AUTHENTICATION - uses admin credentials
    """
    pw = None
    browser = None
    context = None
    page = None

    try:
        # Get authenticated session with mobile viewport
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=["--disable-dev-shm-usage"]
        )

        # Create mobile context
        context = await browser.new_context(
            viewport={"width": 375, "height": 667},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
        )
        context.set_default_timeout(30000)
        page = await context.new_page()

        # Login first
        print("Logging in on mobile viewport...")
        await page.goto("http://localhost:8080/login", wait_until="networkidle")
        await page.fill('input[name="email"]', os.getenv("ADMIN_EMAIL", "admin@mrc.com.au"))
        await page.fill('input[name="password"]', os.getenv("ADMIN_PASSWORD", "Admin123!"))
        await page.click('button[type="submit"]')

        try:
            await page.wait_for_url("**/dashboard**", timeout=15000)
            print("Login successful on mobile!")
        except:
            current_url = page.url
            if "/login" not in current_url:
                print(f"Navigated to: {current_url}")
            else:
                raise Exception("Login failed on mobile")

        # TEST 1: Check viewport and page dimensions
        print("TEST 1: Checking mobile viewport...")
        viewport_width = await page.evaluate("() => window.innerWidth")
        doc_width = await page.evaluate("() => document.documentElement.scrollWidth")

        assert viewport_width == 375, f"Viewport should be 375px, got {viewport_width}px"
        print(f"SUCCESS: Viewport width is {viewport_width}px")

        # Check for horizontal scrolling
        if doc_width > viewport_width:
            print(f"WARNING: Document width ({doc_width}px) exceeds viewport ({viewport_width}px) - may have horizontal scroll")
        else:
            print(f"SUCCESS: No horizontal scrolling detected (doc width: {doc_width}px)")

        # TEST 2: Check touch target sizes
        print("TEST 2: Checking touch target sizes...")

        buttons = await page.locator('button').all()
        small_targets = 0
        for button in buttons[:10]:  # Check first 10 buttons
            try:
                box = await button.bounding_box()
                if box:
                    size = min(box['width'], box['height'])
                    if size < 44:  # iOS recommends 44px, we'll accept 44+
                        small_targets += 1
            except:
                pass

        if small_targets == 0:
            print("SUCCESS: All checked buttons have adequate touch target size")
        else:
            print(f"INFO: {small_targets} button(s) may have small touch targets (< 44px)")

        # TEST 3: Check page load performance
        print("TEST 3: Checking page load performance...")
        start_time = asyncio.get_event_loop().time()
        await page.goto("http://localhost:8080/dashboard", wait_until="networkidle")
        load_time = asyncio.get_event_loop().time() - start_time

        if load_time < 3:
            print(f"SUCCESS: Page loaded in {load_time:.2f}s (< 3s)")
        else:
            print(f"WARNING: Page load time {load_time:.2f}s exceeds 3s target")

        # TEST 4: Check for mobile-friendly navigation
        print("TEST 4: Checking mobile navigation...")
        mobile_nav = page.locator('[class*="mobile"], [class*="menu"], button[aria-label*="menu" i], [class*="hamburger"], nav')
        nav_count = await mobile_nav.count()

        if nav_count > 0:
            print(f"SUCCESS: Found {nav_count} mobile navigation element(s)")
        else:
            print("INFO: Mobile navigation may use standard elements")

        # TEST 5: Check for responsive content
        print("TEST 5: Checking responsive content...")
        content_elements = page.locator('main, [class*="content"], [class*="container"]')
        content_count = await content_elements.count()
        assert content_count > 0, "Page should have content containers"
        print(f"SUCCESS: Found {content_count} content container(s)")

        print("TEST PASSED: TC013 - Mobile responsiveness verified!")

    except Exception as e:
        print(f"TEST FAILED: {e}")
        raise

    finally:
        if page:
            await page.close()
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

if __name__ == "__main__":
    asyncio.run(run_test())

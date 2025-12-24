import asyncio
from playwright.async_api import async_playwright, expect

async def run_test():
    """
    TC002: Lead Capture Form Validation for Invalid Input

    Tests that the form properly validates input and shows error messages
    when submitted with invalid or missing required fields.

    NOTE: This is a PUBLIC form - no authentication required.
    """
    pw = None
    browser = None
    context = None

    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=["--window-size=1280,720", "--disable-dev-shm-usage"]
        )
        context = await browser.new_context()
        context.set_default_timeout(30000)
        page = await context.new_page()

        # Navigate to the public lead capture form
        print("Navigating to /request-inspection...")
        await page.goto("http://localhost:8080/request-inspection", wait_until="networkidle")

        # Wait for form to be ready
        await page.wait_for_selector('input[name="name"]', state="visible")
        print("Form loaded successfully")

        # TEST 1: Submit empty form and check for validation errors
        print("TEST 1: Submitting empty form...")
        await page.click('button[type="submit"]')
        await asyncio.sleep(1)

        # Check that validation errors appear (form should NOT navigate away)
        current_url = page.url
        assert "request-inspection/success" not in current_url, "Form should not submit with empty fields"

        # Check for at least one validation error message
        error_elements = page.locator('.text-red-500')
        error_count = await error_elements.count()
        assert error_count > 0, "Validation error messages should be visible for empty form"
        print(f"SUCCESS: Found {error_count} validation error(s) for empty form")

        # TEST 2: Test invalid phone number format
        print("TEST 2: Testing invalid phone number...")
        await page.fill('input[name="name"]', 'John Smith')
        await page.fill('input[name="phone"]', '123')  # Invalid phone
        await page.fill('input[name="email"]', 'john@example.com')
        await page.fill('input[name="streetAddress"]', '47 Brighton Road')
        await page.fill('input[name="suburb"]', 'Elwood')
        await page.fill('input[name="postcode"]', '3184')
        await page.select_option('select[name="urgency"]', 'within_week')
        await page.fill('textarea[name="description"]', 'This is a test description for the mould inspection request.')

        await page.click('button[type="submit"]')
        await asyncio.sleep(1)

        # Should still be on the form page with phone validation error
        current_url = page.url
        assert "request-inspection/success" not in current_url, "Form should not submit with invalid phone"

        # Check for phone validation error (contains Australian phone format message)
        phone_error = page.locator('text=valid Australian phone')
        phone_error_visible = await phone_error.count() > 0
        assert phone_error_visible, "Should show Australian phone format validation error"
        print("SUCCESS: Phone validation error displayed correctly")

        # TEST 3: Test invalid postcode (non-Melbourne)
        print("TEST 3: Testing invalid postcode...")
        await page.fill('input[name="phone"]', '0412345678')  # Fix phone
        await page.fill('input[name="postcode"]', '2000')  # Sydney postcode, not Melbourne

        await page.click('button[type="submit"]')
        await asyncio.sleep(1)

        # Should show postcode validation error
        current_url = page.url
        assert "request-inspection/success" not in current_url, "Form should not submit with non-Melbourne postcode"

        postcode_error = page.locator('text=Melbourne postcode')
        postcode_error_visible = await postcode_error.count() > 0
        assert postcode_error_visible, "Should show Melbourne postcode validation error"
        print("SUCCESS: Postcode validation error displayed correctly")

        # TEST 4: Test description too short
        print("TEST 4: Testing short description...")
        await page.fill('input[name="postcode"]', '3184')  # Fix postcode
        await page.fill('textarea[name="description"]', 'Too short')  # Less than 20 chars

        await page.click('button[type="submit"]')
        await asyncio.sleep(1)

        # Should show description validation error
        current_url = page.url
        assert "request-inspection/success" not in current_url, "Form should not submit with short description"

        desc_error = page.locator('text=minimum 20')
        desc_error_visible = await desc_error.count() > 0
        assert desc_error_visible, "Should show minimum characters validation error"
        print("SUCCESS: Description length validation error displayed correctly")

        print("TEST PASSED: TC002 - All form validation tests passed!")

    except Exception as e:
        print(f"TEST FAILED: {e}")
        raise

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

if __name__ == "__main__":
    asyncio.run(run_test())

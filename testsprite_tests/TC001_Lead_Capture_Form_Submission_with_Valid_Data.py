import asyncio
from playwright.async_api import async_playwright, expect

async def run_test():
    """
    TC001: Lead Capture Form Submission with Valid Data

    Tests that a user can successfully submit a PUBLIC inspection request form
    with valid Australian data and receives confirmation.

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

        # Navigate to the public lead capture form (NO AUTH REQUIRED)
        print("Navigating to /request-inspection...")
        await page.goto("http://localhost:8080/request-inspection", wait_until="networkidle")

        # Wait for form to be ready
        await page.wait_for_selector('input[name="name"]', state="visible")
        print("Form loaded successfully")

        # Fill in ALL required fields with valid Australian data
        print("Filling form fields...")

        # Section 1: Your Details
        await page.fill('input[name="name"]', 'John Smith')
        await page.fill('input[name="phone"]', '0412345678')
        await page.fill('input[name="email"]', 'john.smith@example.com')

        # Section 2: Property Location
        await page.fill('input[name="streetAddress"]', '47 Brighton Road')
        await page.fill('input[name="suburb"]', 'Elwood')
        await page.fill('input[name="postcode"]', '3184')

        # Section 3: Inspection Details
        await page.select_option('select[name="urgency"]', 'within_week')
        await page.fill('textarea[name="description"]', 'Mould growth visible on bathroom ceiling and walls. Recent leak from upstairs unit may be the cause. Need professional assessment.')

        print("All fields filled. Submitting form...")

        # Submit the form
        await page.click('button[type="submit"]')

        # Wait for navigation to success page OR success content
        try:
            # Option 1: Check if we navigated to success page
            await page.wait_for_url("**/request-inspection/success**", timeout=15000)
            print("Successfully navigated to success page!")

            # Verify success content is visible
            success_text = page.locator('text=Your Inspection Request Has Been Received')
            await expect(success_text).to_be_visible(timeout=5000)
            print("SUCCESS: Lead capture form submission completed successfully!")

        except Exception as nav_error:
            # Option 2: Check for success message on same page (in case of SPA)
            try:
                thank_you = page.locator('text=Thank You')
                await expect(thank_you).to_be_visible(timeout=5000)
                print("SUCCESS: Found thank you message!")
            except:
                # Check for any error messages
                error_elements = page.locator('.text-red-500, .text-destructive, [class*="error"]')
                error_count = await error_elements.count()
                if error_count > 0:
                    error_texts = []
                    for i in range(error_count):
                        text = await error_elements.nth(i).text_content()
                        if text:
                            error_texts.append(text.strip())
                    raise AssertionError(f"Form submission failed with errors: {error_texts}")

                # Get current URL for debugging
                current_url = page.url
                raise AssertionError(f"Form submission did not complete successfully. Current URL: {current_url}. Navigation error: {nav_error}")

        print("TEST PASSED: TC001 - Lead Capture Form Submission with Valid Data")

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

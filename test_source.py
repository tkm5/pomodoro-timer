"""Check if latest code is deployed."""

from playwright.sync_api import sync_playwright

URL = "https://pomodoro-timer-askhfcxc3-takumis-projects-98ad9a17.vercel.app/"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print(f"Navigating to {URL}...")
        page.goto(URL)
        page.wait_for_load_state("networkidle")

        # Get all script sources
        scripts = page.locator("script").all()
        print(f"\nFound {len(scripts)} script tags")

        # Get the page content and search for our debug strings
        content = page.content()

        # Check if console.log strings are present
        if "skipSession called" in content:
            print("✓ 'skipSession called' found in page source")
        else:
            print("✗ 'skipSession called' NOT found in page source")

        if "handleTimerComplete called" in content:
            print("✓ 'handleTimerComplete called' found in page source")
        else:
            print("✗ 'handleTimerComplete called' NOT found in page source")

        if "/api/discord" in content:
            print("✓ '/api/discord' found in page source")
        else:
            print("✗ '/api/discord' NOT found in page source")

        browser.close()


if __name__ == "__main__":
    main()

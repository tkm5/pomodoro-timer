"""Test script to check notification functionality on Vercel deployment."""

from playwright.sync_api import sync_playwright

URL = "https://pomodoro-timer-askhfcxc3-takumis-projects-98ad9a17.vercel.app/"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        # Capture errors
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        print(f"Navigating to {URL}...")
        page.goto(URL)
        page.wait_for_load_state("networkidle")

        # Take a screenshot
        page.screenshot(path="/tmp/pomodoro_initial.png", full_page=True)
        print("Initial screenshot saved to /tmp/pomodoro_initial.png")

        # Find and click the Skip button (SkipForward icon)
        print("\nLooking for Skip button...")

        # Get all buttons
        buttons = page.locator("button").all()
        print(f"Found {len(buttons)} buttons")

        for i, btn in enumerate(buttons):
            try:
                inner_html = btn.inner_html()
                print(f"Button {i}: {inner_html[:100]}...")
            except Exception as e:
                print(f"Button {i}: Error getting HTML - {e}")

        # Click the skip button (third button based on the Controls component)
        skip_button = page.locator("button").nth(3)  # 0: settings, 1: reset, 2: play, 3: skip
        print("\nClicking Skip button...")
        skip_button.click()

        # Wait for any async operations
        page.wait_for_timeout(2000)

        # Take another screenshot
        page.screenshot(path="/tmp/pomodoro_after_skip.png", full_page=True)
        print("After-skip screenshot saved to /tmp/pomodoro_after_skip.png")

        # Print console logs
        print("\n=== Console Logs ===")
        for log in console_logs:
            print(log)

        # Print errors
        if errors:
            print("\n=== Page Errors ===")
            for err in errors:
                print(err)
        else:
            print("\nNo page errors detected.")

        browser.close()


if __name__ == "__main__":
    main()

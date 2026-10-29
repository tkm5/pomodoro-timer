"""Test script to check notification functionality with network monitoring."""

from playwright.sync_api import sync_playwright

URL = "https://pomodoro-timer-askhfcxc3-takumis-projects-98ad9a17.vercel.app/"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        # Capture network requests
        requests_made = []
        page.on("request", lambda req: requests_made.append(f"[REQ] {req.method} {req.url}"))
        page.on("response", lambda res: requests_made.append(f"[RES] {res.status} {res.url}"))

        # Capture errors
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        print(f"Navigating to {URL}...")
        page.goto(URL)
        page.wait_for_load_state("networkidle")

        print("Page loaded. Clicking Skip button...")

        # Click the skip button (index 3: 0=settings, 1=reset, 2=play, 3=skip)
        skip_button = page.locator("button").nth(3)
        skip_button.click()

        # Wait for network requests
        page.wait_for_timeout(3000)

        # Print console logs
        print("\n=== Console Logs ===")
        if console_logs:
            for log in console_logs:
                print(log)
        else:
            print("(No console logs)")

        # Print network requests related to API
        print("\n=== API Requests ===")
        api_requests = [r for r in requests_made if "/api/" in r]
        if api_requests:
            for req in api_requests:
                print(req)
        else:
            print("(No API requests made)")

        # Print errors
        if errors:
            print("\n=== Page Errors ===")
            for err in errors:
                print(err)

        # Check the current state
        page.screenshot(path="/tmp/pomodoro_test2.png", full_page=True)
        print("\nScreenshot saved to /tmp/pomodoro_test2.png")

        browser.close()


if __name__ == "__main__":
    main()

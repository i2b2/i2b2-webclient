"""
i2b2 Webclient Login Smoke Test

Flow:

Open Webclient
        ↓
Wait for Login Button
        ↓
Click Login
        ↓
Monitor for:
    - Failure Alert
    - Run Button
        ↓
Pass / Fail
"""

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from login_utils import (
    LOGIN_BUTTON,
    PAGE_LOAD_TIMEOUT,
    create_driver,
    open_webclient,
    wait_for_login_result,
)


def main():
    """
    Execute login smoke test.
    """

    driver = create_driver()

    try:

        print("Opening webclient...")

        open_webclient(driver)

        print("Waiting for login button...")

        login_button = WebDriverWait(
            driver,
            PAGE_LOAD_TIMEOUT
        ).until(
            EC.element_to_be_clickable(
                LOGIN_BUTTON
            )
        )

        print("Clicking login button...")

        login_button.click()

        print("Waiting for login result...")

        wait_for_login_result(driver)

        print("Smoke test passed")

    finally:

        driver.quit()


if __name__ == "__main__":
    main()

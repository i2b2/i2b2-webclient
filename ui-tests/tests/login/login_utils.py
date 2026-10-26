"""
Shared utilities for i2b2 login smoke tests.
"""

import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.common.exceptions import (
    NoAlertPresentException,
    WebDriverException,
)

# ---------------------------------------------------------------------------
# Application Configuration
# ---------------------------------------------------------------------------

WEBCLIENT_URL = "http://i2b2-webclient/webclient/"

LOGIN_BUTTON = (
    By.CSS_SELECTOR,
    ".login-button"
)

RUN_BUTTON = (
    By.CSS_SELECTOR,
    ".button-run"
)

# ---------------------------------------------------------------------------
# Test Configuration
# ---------------------------------------------------------------------------

PAGE_LOAD_TIMEOUT = 20
LOGIN_RESULT_TIMEOUT = 20
POLL_INTERVAL = 1

# ---------------------------------------------------------------------------
# Browser Setup
# ---------------------------------------------------------------------------

def create_driver():
    """
    Create and configure a headless Chromium browser.
    """

    options = Options()

    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    return webdriver.Chrome(options=options)

# ---------------------------------------------------------------------------
# Common Application Functions
# ---------------------------------------------------------------------------

def open_webclient(driver):
    """
    Open the i2b2 webclient.

    Raises:
        AssertionError:
            If the webclient cannot be reached.
    """

    try:

        driver.get(WEBCLIENT_URL)

    except WebDriverException as e:

        raise AssertionError(
            f"Unable to access webclient "
            f"({WEBCLIENT_URL}). "
            f"Original error: {e.msg}"
        ) from e


def wait_for_login_result(driver):
    """
    Monitor login status.

    Success Criteria:
        The Run button becomes visible.

    Failure Criteria:
        A browser alert is displayed.

    Timeout Criteria:
        Neither success nor failure occurs within
        LOGIN_RESULT_TIMEOUT seconds.

    Raises:
        AssertionError:
            Login failed.

        AssertionError:
            Login timeout exceeded.
    """

    start_time = time.time()

    while time.time() - start_time < LOGIN_RESULT_TIMEOUT:

        #
        # Failure Condition
        #
        try:

            alert = driver.switch_to.alert

            raise AssertionError(
                f"Login failed: {alert.text}"
            )

        except NoAlertPresentException:
            pass

        #
        # Success Condition
        #
        run_buttons = driver.find_elements(
            *RUN_BUTTON
        )

        if (
            run_buttons and
            run_buttons[0].is_displayed()
        ):
            print("Run button detected")
            print("Login successful")

            return

        time.sleep(POLL_INTERVAL)

    raise AssertionError(
        f"Timed out after "
        f"{LOGIN_RESULT_TIMEOUT} seconds "
        f"waiting for login result."
    )

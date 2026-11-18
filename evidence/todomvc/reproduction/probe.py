"""Repeat the native-browser feasibility check on a locally served TodoMVC ES5 dist."""
import argparse
import json
from urllib.parse import urlparse

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys


def inspect(driver, url):
    def start():
        driver.get(url)
        entry = driver.find_element(By.CSS_SELECTOR, ".new-todo")
        for title in ("a", "b"):
            entry.send_keys(title, Keys.ENTER)

    def click(selector):
        driver.find_element(By.CSS_SELECTOR, selector).click()

    def snapshot(stage):
        return {
            "stage": stage,
            "count": driver.find_element(By.CSS_SELECTOR, ".todo-count").text,
            "master": driver.find_element(By.CSS_SELECTOR, ".toggle-all").is_selected(),
            "items": [
                {
                    "title": row.find_element(By.TAG_NAME, "label").text,
                    "checked": row.find_element(By.CSS_SELECTOR, ".toggle").is_selected(),
                }
                for row in driver.find_elements(By.CSS_SELECTOR, ".todo-list li")
            ],
        }

    master = ".toggle-all-label"
    first_item = ".todo-list li:first-child .toggle"
    start()
    captured = [snapshot("primary-start")]
    click(master)
    click(first_item)
    captured.append(snapshot("primary-before-final"))
    click(master)
    captured.append(snapshot("primary-after-final"))
    start()
    click(master)
    click(first_item)
    captured.append(snapshot("control-after-prefix"))
    return captured


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="Local URL serving the upstream ES5 dist")
    parser.add_argument("--driver", help="Optional path to an installed matching ChromeDriver")
    args = parser.parse_args()
    if urlparse(args.url).hostname not in {"localhost", "127.0.0.1", "::1"}:
        parser.error("Provide a loopback URL for the local checkout.")
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1100,850")
    with webdriver.Chrome(options=options, service=Service(args.driver)) as browser:
        print(json.dumps(inspect(browser, args.url), indent=2))

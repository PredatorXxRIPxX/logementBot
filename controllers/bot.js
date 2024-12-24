const { Builder, By, Key, until } = require("selenium-webdriver");
const express = require("express");

const CONFIG = {
  TIMEOUT: 10000,
  BROWSER: "firefox",
  DEFAULT_EMPTY: "(empty)",
  DEFAULT_NONE: "(none)",
};

const getElementInfo = async (element) => {
  try {
    const [tagName, text, isDisplayed, id, className, href, value, location] =
      await Promise.all([
        element.getTagName(),
        element.getText(),
        element.isDisplayed(),
        element.getAttribute("id"),
        element.getAttribute("class"),
        element.getAttribute("href"),
        element.getAttribute("value"),
        element.getRect(),
      ]);

    return {
      tagName,
      text: text || CONFIG.DEFAULT_EMPTY,
      isDisplayed,
      attributes: {
        id: id || CONFIG.DEFAULT_NONE,
        class: className || CONFIG.DEFAULT_NONE,
        href: href || CONFIG.DEFAULT_NONE,
        value: value || CONFIG.DEFAULT_NONE,
      },
      location: {
        x: location.x,
        y: location.y,
        width: location.width,
        height: location.height,
      },
    };
  } catch (error) {
    console.error("Error getting element info:", error.message);
    throw new Error(`Failed to get element info: ${error.message}`);
  }
};

const initializeDriver = async (url) => {
  let driver = null;
  try {
    driver = await new Builder().forBrowser(CONFIG.BROWSER).build();
    await driver.manage().setTimeouts({ implicit: CONFIG.TIMEOUT });
    await driver.get(url);
    return driver;
  } catch (error) {
    if (driver) {
      await driver.quit();
    }
    throw new Error(`Failed to initialize driver: ${error.message}`);
  }
};

const getElements = async (driver) => {
  try {
    const elements = await driver.findElements(By.tagName("a"));
    return Promise.all(elements.map(getElementInfo));
  } catch (error) {
    throw new Error(`Failed to get elements: ${error.message}`);
  }
};

const navigate = async (url, search) => {
  let driver = null;
  try {
    driver = await initializeDriver(url);

    const searchBox = await driver.wait(
      until.elementLocated(By.name("ville")),
      CONFIG.TIMEOUT,
      "Search box not found"
    );

    await driver.executeScript(
      `
            const select = arguments[0];
            const value = arguments[1];
            const option = Array.from(select.options).find(opt => 
                opt.text.toLowerCase().includes(value.toLowerCase())
            );
            if (option) {
                select.value = option.value;
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
            }
        `,
      searchBox,
      search
    );

    const submit = await driver.wait(
      until.elementLocated(By.tagName("input")),
      CONFIG.TIMEOUT,
      "Submit button not found"
    );
    await submit.click();

    return await getElements(driver);
  } catch (error) {
    throw new Error(`Navigation failed: ${error.message}`);
  } finally {
    if (driver) {
      await driver.quit().catch(console.error);
    }
  }
};

module.exports = { navigate };

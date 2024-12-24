const { Builder, By, Key, until } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");

const CONFIG = {
  TIMEOUT: 3000,
  BROWSER: "firefox",
  DEFAULT_EMPTY: "(empty)",
  DEFAULT_NONE: "(none)",
};

const checkAvailability = async (driver, urls) => {
  const availableUrls = [];

  for (const url of urls) {
    try {
      await driver.get(url);

      const logement = await driver.wait(
        until.elementLocated(By.className("medium-2 large-3 columns  liste-residence-recap")),
        CONFIG.TIMEOUT,
        "Logement not found"
      );

      if (logement) {
        const logementInfo = await getElementInfo(logement);

        if (logementInfo.attributes.href) {
          await driver.get(logementInfo.attributes.href);

          const element = await driver.wait(
            until.elementLocated(By.className("btn_reserver")),
            CONFIG.TIMEOUT,
            "Reservation button not found"
          );

          const isDisplayed = await element.isDisplayed();
          if (isDisplayed) {
            availableUrls.push(url);
            console.log(`URL ${url} is available for reservation`);
          }
        }
      }
    } catch (error) {
      console.error(`Error checking URL ${url}:`, error.message);
      continue;
    }
  }

  return availableUrls;
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
    const options = new firefox.Options();
    options.addArguments("-headless");
    options.addArguments("--width=1920");
    options.addArguments("--height=1080");
    options.setPreference("browser.download.folderList", 2);
    options.setPreference("browser.download.manager.showWhenStarting", false);
    options.setPreference(
      "browser.helperApps.neverAsk.saveToDisk",
      "application/pdf,application/x-pdf"
    );
    options.setPreference("pdfjs.disabled", true);

    driver = await new Builder()
      .forBrowser(CONFIG.BROWSER)
      .setFirefoxOptions(options)
      .build();

    await driver.manage().setTimeouts({
      implicit: CONFIG.TIMEOUT,
      pageLoad: CONFIG.TIMEOUT,
      script: CONFIG.TIMEOUT,
    });

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

    const elements = await getElements(driver);
    const urls = elements
      .filter(
        (elem) =>
          elem.attributes.href && elem.attributes.href !== CONFIG.DEFAULT_NONE
      )
      .map((elem) => elem.attributes.href)
      .filter((url) => url.includes("ville"));

    return await checkAvailability(driver, urls);
  } catch (error) {
    throw new Error(`Navigation failed: ${error.message}`);
  } finally {
    if (driver) {
      await driver.quit().catch(console.error);
    }
  }
};

module.exports = { navigate };

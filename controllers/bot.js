const { Builder, By, Key, until } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");

const CONFIG = {
  TIMEOUT: 3500, 
  BROWSER: "firefox",
  DEFAULT_EMPTY: "(empty)",
  DEFAULT_NONE: "(none)",
};

const initializeDriver = async () => {
  try {
    const options = new firefox.Options();
    options.addArguments("--width=1920");
    options.addArguments("--height=1080");
    options.setPreference("browser.download.folderList", 2);
    options.setPreference("browser.download.manager.showWhenStarting", false);
    options.setPreference(
      "browser.helperApps.neverAsk.saveToDisk",
      "application/pdf,application/x-pdf"
    );
    options.setPreference("pdfjs.disabled", true);

    const driver = await new Builder()
      .forBrowser(CONFIG.BROWSER)
      .setFirefoxOptions(options)
      .build();

    await driver.manage().setTimeouts({
      implicit: CONFIG.TIMEOUT,
      pageLoad: CONFIG.TIMEOUT,
      script: CONFIG.TIMEOUT,
    });

    return driver;
  } catch (error) {
    throw new Error(`Failed to initialize driver: ${error.message}`);
  }
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
    throw new Error(`Failed to get element info: ${error.message}`);
  }
};

// Highlight the element in the browser by changing its border color
const highlightElement = async (driver, element) => {
  await driver.executeScript(
    `
      arguments[0].style.border = '3px solid red';
      arguments[0].style.boxShadow = '0 0 10px 2px rgba(255, 0, 0, 0.8)';
    `,
    element
  );
};

const checkAvailability = async (urls) => {
  const availableUrls = [];
  const driver = await initializeDriver();
  let currenturl = null;
  try {
    for (const url of urls) {
      try {
        await driver.get(url);
        const logement = await driver.wait(
          until.elementsLocated(By.className("residence-gtm")),
          CONFIG.TIMEOUT,
          "Logement not found"
        );

        if (logement) {
          for (const element of logement) {
            const logementInfo = await getElementInfo(element);
            const urllogement = logementInfo.attributes.href;

            await driver.get(urllogement);
            currenturl = urllogement;
            console.log(`Checking: ${urllogement}`);

            // Log and highlight the clicked element
            console.log(`Clicking on: ${urllogement}`);
            await highlightElement(driver, element);

            // Execute script to check for availability
            const available = await driver.executeScript(
              `
                const elements = document.querySelectorAll("a");
                return Array.from(elements).some(
                  (element) => element.textContent.trim() === "Déposerunedemande"
                );
              `
            );

            if (available) {
              availableUrls.push(urllogement);
            }
          }
        }
      } catch (error) {
        console.error(`Error checking URL ${currenturl}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`Error during availability check:`, error.message);
  } finally {
    await driver.quit();
  }

  return availableUrls;
};

const navigate = async (url, search) => {
  const driver = await initializeDriver();
  try {
    await driver.get(url);

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

    const elements = await driver.findElements(By.tagName("a"));
    const urls = await Promise.all(
      elements.map(async (element) => {
        const href = await element.getAttribute("href");
        return href && href.includes("ville") ? href : null;
      })
    );

    return await checkAvailability(urls.filter(Boolean));
  } catch (error) {
    throw new Error(`Navigation failed: ${error.message}`);
  } finally {
    await driver.quit();
  }
};

module.exports = { navigate };

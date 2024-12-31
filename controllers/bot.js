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

const traitdata = async (urls, driver) => {
  try {
    let result = [];
    for (const url of urls) {
      try {
        await driver.get(url);
        const reservediv = await driver.findElement(By.className("reserver"));
        const isAvailable = await reservediv.findElement(By.xpath(".//a[contains(@class, 'btn_reserver')]"));
        console.log(isAvailable.toString());
        if (isAvailable) {
          result.push(url);
        }
      } catch (urlError) {
        console.error(`Error processing URL ${url}: ${urlError.message}`);
        continue;
      }
    }
    return result;
  } catch (error) {
    throw new Error(`Failed to get data: ${error.message}`);
  }
};

const checkavailability = async (logements, driver) => {
  try {
    const logementsList = await logements.findElements(
      By.className("liste-residence")
    );
    let urls = [];
    for (const logement of logementsList) {
      const element = await logement.findElement(By.className("residence-gtm"));
      const info = await getElementInfo(element);
      urls.push(info.attributes.href);
    }
    let finalresult = await traitdata(urls, driver);
    return finalresult;
  } catch (error) {
    throw new Error(`Failed to check availability: ${error.message}`);
  }
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

    const logements = await driver.findElement(
      By.className("block-grid large-block-grid-2 small-block-grid-1")
    );

    let result = await checkavailability(logements, driver);
    return result;
  } catch (error) {
    throw new Error(`Navigation failed: ${error.message}`);
  } finally {
    await driver.quit();
  }
};

module.exports = { navigate };

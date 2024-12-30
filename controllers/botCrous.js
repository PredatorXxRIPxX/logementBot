const { Builder, By, Key, until } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");

const CONFIG = {
  TIMEOUT: 3000,
  BROWSER: "firefox",
  DEFAULT_EMPTY: "(empty)",
  DEFAULT_NONE: "(none)",
  URL: "https://trouverunlogement.lescrous.fr/", // Add your website URL here
};

// Configure Firefox options
function getFirefoxOptions() {
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
  return options;
}

// Fill search field and click search button
async function searchLocation(driver) {
  try {
    // Wait for input element to be present
    const inputElement = await driver.wait(
      until.elementLocated(By.id("PlaceAutocompletearia-autocomplete-1-input")),
      CONFIG.TIMEOUT,
      "Search input not found"
    );

    // Clear existing text and enter new search term
    await inputElement.clear();
    await inputElement.sendKeys("Île-de-France");
    
    // Wait for autocomplete suggestions (if any)
    await driver.sleep(1000);

    // Wait for button and click
    const buttonElement = await driver.wait(
      until.elementLocated(By.css("button.fr-btn.svelte-w11odb")),
      CONFIG.TIMEOUT,
      "Search button not found"
    );
    await buttonElement.click();

    // Wait for results to load
    await driver.wait(
      until.elementLocated(By.className("fr-grid-row fr-grid-row--gutters svelte-11sc5my")),
      CONFIG.TIMEOUT,
      "Search results not loaded"
    );
  } catch (error) {
    throw new Error(`Failed to perform search: ${error.message}`);
  }
}

// Check search results
async function checkSearchResults(driver) {
  try {
    // Wait for results container
    const resultsContainer = await driver.wait(
      until.elementLocated(By.className("fr-grid-row fr-grid-row--gutters svelte-11sc5my")),
      CONFIG.TIMEOUT,
      "Results container not found"
    );

    // Get all list items
    const listItems = await resultsContainer.findElements(By.tagName("li"));
    
    if (listItems.length === 0) {
      return false;
    }

    // Check if any non-"Ulis" titles exist
    for (const item of listItems) {
      const titleElement = await item.findElement(By.css(".fr-card__title a"));
      const titleText = await titleElement.getText();
      if (titleText !== "Ulis") {
        return true;
      }
    }

    return false;
  } catch (error) {
    throw new Error(`Failed to check search results: ${error.message}`);
  }
}

// Display names and addresses
async function displayNamesAndAddresses(driver) {
    try {
      const resultsContainer = await driver.wait(
        until.elementLocated(By.className("fr-grid-row fr-grid-row--gutters svelte-11sc5my")),
        CONFIG.TIMEOUT,
        "Results container not found"
      );
  
      const listItems = await resultsContainer.findElements(By.tagName("li"));
      console.log("Found the following locations:");
  
      for (const item of listItems) {
        try {
          // Try to find the title element
          const titleElement = await item.findElement(By.css(".fr-card__title a"));
          const titleText = await titleElement.getText();
  
          // Try to find the address element
          let addressText;
          try {
            const addressElement = await item.findElement(By.css(".fr-card__detail"));
            addressText = await addressElement.getText();
          } catch (error) {
            addressText = "Address not found";
          }
  
          console.log(`Name: ${titleText}`);
          console.log(`Address: ${addressText}`);
        } catch (error) {
          console.log("Skipped an item due to missing elements.");
        }
      }
    } catch (error) {
      throw new Error(`Failed to display names and addresses: ${error.message}`);
    }
  }  
// Main execution function
async function main() {
  let driver;
  
  try {
    driver = await new Builder()
      .forBrowser(CONFIG.BROWSER)
      .setFirefoxOptions(getFirefoxOptions())
      .build();

    // Navigate to website
    await driver.get(CONFIG.URL);

    // Perform search
    await searchLocation(driver);

    // Check results
    const hasNonUlisResults = await checkSearchResults(driver);
    console.log("Search results contain non-Ulis items:", hasNonUlisResults);

    if (hasNonUlisResults) {
      await displayNamesAndAddresses(driver);
    }

    return hasNonUlisResults;
  } catch (error) {
    console.error("Error during execution:", error.message);
    throw error;
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

// Execute the script
if (require.main === module) {
  main()
    .then((result) => {
      console.log("Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

// Export for testing
module.exports = {
  searchLocation,
  checkSearchResults,
  displayNamesAndAddresses,
  main
};

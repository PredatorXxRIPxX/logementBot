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
  // Supprimer l'option -headless pour voir le navigateur en mode normal
  // options.addArguments("-headless");
  options.addArguments("--width=1920");
  options.addArguments("--height=1080");
  return options;
}

// Fill search field and click search button
async function searchLocation(driver) {
  try {
    console.log("Waiting for the input field...");
    const inputElement = await driver.wait(
      until.elementLocated(By.id("PlaceAutocompletearia-autocomplete-1-input")),
      CONFIG.TIMEOUT,
      "Search input not found"
    );

    console.log("Clearing input and typing 'Île-de-France'...");
    await inputElement.clear();
    await inputElement.sendKeys("Île-de-France");

    console.log("Waiting for autocomplete suggestions...");
    await driver.sleep(2000); // Augmenter le délai si nécessaire

    // Click on the first suggestion by its ID
    console.log("Clicking on the first suggestion...");
    const firstSuggestion = await driver.wait(
      until.elementLocated(By.id("PlaceAutocompletearia-autocomplete-1-option--0")),
      CONFIG.TIMEOUT,
      "First suggestion not found"
    );
    await firstSuggestion.click();

    console.log("Clicking search button...");
    const buttonElement = await driver.wait(
      until.elementLocated(By.css("button.fr-btn.svelte-w11odb")),
      CONFIG.TIMEOUT,
      "Search button not found"
    );
    await buttonElement.click();

    console.log("Waiting for results to load...");
    await driver.wait(
      until.elementLocated(By.className("fr-grid-row fr-grid-row--gutters svelte-11sc5my")),
      CONFIG.TIMEOUT,
      "Search results not loaded"
    );
  } catch (error) {
    console.error("Error during search:", error.message);
    throw error;
  }
}

// Display names and addresses of results
async function displayNamesAndAddresses(driver) {
  try {
    console.log("Fetching results...");

    // Wait for the results container to load
    const resultsContainer = await driver.wait(
      until.elementLocated(By.className("fr-grid-row fr-grid-row--gutters svelte-11sc5my")),
      CONFIG.TIMEOUT,
      "Results container not found"
    );

    // Get all list items (residences)
    const listItems = await resultsContainer.findElements(By.tagName("li"));

    if (listItems.length === 0) {
      console.log("No results found.");
      return;
    }

    // Extract and display names and addresses
    for (const item of listItems) {
      let titleText = '';
      let addressText = '';

      // Try to get the title
      try {
        const titleElement = await item.findElement(By.css(".fr-card__title a"));
        titleText = await titleElement.getText();
      } catch (error) {
        console.log("Title element not found in this result.");
      }

      // Try to get the address
      try {
        const addressElement = await item.findElement(By.css(".fr-card__desc"));
        addressText = await addressElement.getText();
      } catch (error) {
        console.log("Address element not found in this result.");
      }

      if (titleText && addressText) {
        console.log(`Name: ${titleText}`);
        console.log(`Address: ${addressText}`);
      } else {
        console.log("Some elements are missing in this result.");
      }
    }
  } catch (error) {
    console.error("Error during result extraction:", error.message);
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

    // Display the names and addresses of the search results
    await displayNamesAndAddresses(driver);
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
  displayNamesAndAddresses,
  main
};

const { Client, GatewayIntentBits } = require('discord.js');
const { Builder, By, until } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");

// Configuration du bot Discord
const BOT_TOKEN = 'MTMyMzQyNTY5NTg3OTM5NzQ0Nw.Gz92da.A_MUioPxsmVkHoIOVgURk7kWgUO9FEn24KcpG8';
const CHANNEL_ID = '1323725010644500553';

// Configuration de votre script de logement
const CONFIG = {
  TIMEOUT: 3000,
  BROWSER: "firefox",
  URL: "https://trouverunlogement.lescrous.fr/",
  CHECK_INTERVAL: 20000, // 20 secondes
  DAILY_STATUS_INTERVAL: 24 * 60 * 60 * 1000 // 24 heures en millisecondes
};

// Configure Firefox options
function getFirefoxOptions() {
  const options = new firefox.Options();
  options.addArguments("--width=1920");
  options.addArguments("--height=1080");
  return options;
}

// Fonction de recherche
async function searchLocation(driver) {
  try {
    const inputElement = await driver.wait(
      until.elementLocated(By.id("PlaceAutocompletearia-autocomplete-1-input")),
      CONFIG.TIMEOUT
    );
    await inputElement.clear();
    await inputElement.sendKeys("Île-de-France");

    await driver.sleep(2000);

    const firstSuggestion = await driver.wait(
      until.elementLocated(By.id("PlaceAutocompletearia-autocomplete-1-option--0")),
      CONFIG.TIMEOUT
    );
    await firstSuggestion.click();

    const buttonElement = await driver.wait(
      until.elementLocated(By.css("button.fr-btn.svelte-w11odb")),
      CONFIG.TIMEOUT
    );
    await buttonElement.click();

    await driver.wait(
      until.elementLocated(By.className("fr-grid-row fr-grid-row--gutters svelte-11sc5my")),
      CONFIG.TIMEOUT
    );
  } catch (error) {
    console.error("Error during search:", error.message);
    throw error;
  }
}

// Fonction d'affichage des résultats sous forme de tableau
async function displayNamesAndAddresses(driver) {
  try {
    const resultsContainer = await driver.wait(
      until.elementLocated(By.className("fr-grid-row fr-grid-row--gutters svelte-11sc5my")),
      CONFIG.TIMEOUT
    );

    const listItems = await resultsContainer.findElements(By.tagName("li"));
    const logements = [];

    for (const item of listItems) {
      let titleText = '';
      let addressText = '';

      try {
        const titleElement = await item.findElement(By.css(".fr-card__title a"));
        titleText = await titleElement.getText();
      } catch (error) {}

      try {
        const addressElement = await item.findElement(By.css(".fr-card__desc"));
        addressText = await addressElement.getText();
      } catch (error) {}

      if (titleText && addressText) {
        logements.push({ nom: titleText, adresse: addressText });
      }
    }

    return logements;
  } catch (error) {
    console.error("Error during result extraction:", error.message);
    return [];
  }
}

// Fonction pour comparer deux listes de logements
function areLogementsDifferent(oldLogements, newLogements) {
  if (oldLogements.length !== newLogements.length) {
    return true;
  }

  for (let i = 0; i < oldLogements.length; i++) {
    if (
      oldLogements[i].nom !== newLogements[i].nom ||
      oldLogements[i].adresse !== newLogements[i].adresse
    ) {
      return true;
    }
  }

  return false;
}

// Fonction pour créer le message de statut des logements
function createLogementStatusMessage(logements) {
  let message = '📊 **Rapport quotidien du bot de surveillance des logements**\n\n';
  
  if (logements.length === 0) {
    message += '❌ Aucun logement n\'est actuellement disponible.';
  } else {
    message += `✅ **${logements.length} logement(s) disponible(s) :**\n\n`;
    logements.forEach((logement, index) => {
      message += `${index + 1}. **Nom**: ${logement.nom}\n   **Adresse**: ${logement.adresse}\n\n`;
    });
  }

  message += '\n🤖 Le bot continue de surveiller les changements toutes les 20 secondes.';
  return message;
}

// Fonction principale d'exécution
let previousLogements = []; // Stockage de l'état initial

async function executeSearchAndNotify(client) {
  let driver;

  try {
    driver = await new Builder()
      .forBrowser(CONFIG.BROWSER)
      .setFirefoxOptions(getFirefoxOptions())
      .build();

    await driver.get(CONFIG.URL);
    await searchLocation(driver);

    const logements = await displayNamesAndAddresses(driver);

    if (areLogementsDifferent(previousLogements, logements)) {
      previousLogements = logements; // Mise à jour des logements précédents

      if (logements.length > 0) {
        const channel = await client.channels.fetch(CHANNEL_ID);

        let logementMessage = '⚡ Un changement dans les logements a été détecté !\n\nVoici la liste mise à jour :\n';

        logements.forEach(logement => {
          logementMessage += `**Nom**: ${logement.nom}\n**Adresse**: ${logement.adresse}\n\n`;
        });

        channel.send(logementMessage);
      } else {
        const channel = await client.channels.fetch(CHANNEL_ID);
        channel.send("⚡ Les logements ont changé, mais aucun nouveau logement n'est disponible !");
      }
    } else {
      console.log("Aucun changement détecté dans les logements.");
    }

    return logements; // Retourner les logements pour le rapport quotidien
  } catch (error) {
    console.error("Error during execution:", error.message);
    return [];
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

// Créer le client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Quand le bot est prêt
client.once('ready', () => {
  console.log('Le bot est prêt !');

  // Exécuter la recherche toutes les 20 secondes
  setInterval(async () => {
    console.log("Exécution du script...");
    await executeSearchAndNotify(client);
  }, CONFIG.CHECK_INTERVAL);

  // Envoyer un rapport quotidien
  setInterval(async () => {
    console.log("Génération du rapport quotidien...");
    const channel = await client.channels.fetch(CHANNEL_ID);
    const logements = await executeSearchAndNotify(client);
    const statusMessage = createLogementStatusMessage(logements);
    channel.send(statusMessage);
  }, CONFIG.DAILY_STATUS_INTERVAL);

  // Envoyer un message initial pour confirmer que le bot est en marche
  (async () => {
    const channel = await client.channels.fetch(CHANNEL_ID);
    channel.send("🟢 Le bot de surveillance des logements est maintenant actif et opérationnel !");
  })();
});

// Connecter le bot à Discord
client.login(BOT_TOKEN);
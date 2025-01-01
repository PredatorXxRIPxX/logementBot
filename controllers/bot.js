const { Client, GatewayIntentBits } = require('discord.js');
const { Builder, By, Key, until } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");

// Configuration du bot Discord
const BOT_TOKEN = 'MTMyMzcyMzE2OTk0MDM3NzY3MA.GgnMeo.2ruydeYVx4_rwsNp4qirLGNdV2lnhzTI82n_SM';
const CHANNEL_ID = '1323721445112545413';

// Configuration de Selenium
const CONFIG = {
  TIMEOUT: 3500,
  BROWSER: "firefox",
  DEFAULT_EMPTY: "(empty)",
  DEFAULT_NONE: "(none)",
  URL: "https://www.fac-habitat.com/fr/",
};

// Variables globales
let villeRecherchee = null;
let intervalId = null;
let dernierResultat = null;
let botStartTime = null;
let dernierMessage = null;

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


// ... (tout le code jusqu'à la fonction traitdata reste identique)

const traitdata = async (urls, driver) => {
  try {
    let result = [];
    for (const url of urls) {
      try {
        // Vérifier si l'URL est bien une URL de fac-habitat
        if (!url.includes('fac-habitat.com')) {
          console.log(`URL ignorée (non fac-habitat): ${url}`);
          continue; // Passer à l'URL suivante
        }

        await driver.get(url);
        const iframe = await driver.findElement(By.id("iFrameResizer0"));
        await driver.switchTo().frame(iframe);

        const children = await driver.executeScript(() => {
          const parentElement = document.body;
          return Array.from(parentElement.children).map((child) => {
            return {
              tagName: child.tagName,
              text: child.innerText || null,
              attributes: {
                id: child.id || null,
                class: child.className || null,
                href: child.getAttribute("href") || null,
                value: child.getAttribute("value") || null,
              },
            };
          });
        });

        const mainContent = children.find((child) => child.tagName === "MAIN")?.text;
        if (!mainContent) {
          console.log(`Pas de contenu principal trouvé pour: ${url}`);
          continue;
        }

        const structuredData = mainContent
          .split("\n")
          .reduce((acc, line) => {
            const columns = line.split(/\s{2,}/);
            if (columns.length >= 3) {
              acc.push({
                Type: columns[0] || null,
                "Loyer mensuel TCC*": columns[1] || null,
                "Disponibilite": columns[2] || null,
                Meublé: columns[3] || null,
                Action: columns[4] || null,
              });
            }
            return acc;
          }, []);

        for (const data of structuredData) {
          if (data["Disponibilite"] != null) {
            result.push({url, data});
          }
        }
        await driver.switchTo().defaultContent();
      } catch (urlError) {
        // Log l'erreur mais continue avec les autres URLs
        console.error(`Error processing URL ${url}: ${urlError.message}`);
        try {
          // Essayer de revenir au contexte par défaut en cas d'erreur
          await driver.switchTo().defaultContent();
        } catch (switchError) {
          console.error('Erreur lors du retour au contexte par défaut:', switchError);
        }
        continue;
      }
    }
    return result;
  } catch (error) {
    console.error(`Failed to get data: ${error.message}`);
    return []; // Retourner un tableau vide en cas d'erreur plutôt que de throw
  }
};

const checkavailability = async (logements, driver) => {
  try {
    const logementsList = await logements.findElements(
      By.className("liste-residence")
    );
    let urls = [];
    for (const logement of logementsList) {
      try {
        const element = await logement.findElement(By.className("residence-gtm"));
        const info = await getElementInfo(element);
        urls.push(info.attributes.href);
      } catch (error) {
        console.error("Erreur lors de l'extraction d'une URL:", error);
        continue; // Continuer avec le prochain logement
      }
    }
    let finalresult = await traitdata(urls, driver);
    return finalresult;
  } catch (error) {
    console.error(`Failed to check availability: ${error.message}`);
    return []; // Retourner un tableau vide en cas d'erreur plutôt que de throw
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
    console.error(`Navigation failed: ${error.message}`);
    return []; // Retourner un tableau vide en cas d'erreur plutôt que de throw
  } finally {
    try {
      await driver.quit();
    } catch (error) {
      console.error('Erreur lors de la fermeture du driver:', error);
    }
  }
};


// Fonction pour comparer les résultats
function resultatsIdentiques(resultat1, resultat2) {
  if (!resultat1 || !resultat2) return false;
  
  try {
    return JSON.stringify(resultat1) === JSON.stringify(resultat2);
  } catch (error) {
    console.error("Erreur lors de la comparaison des résultats:", error);
    return false;
  }
}

// Fonction pour vérifier si 24h se sont écoulées
function checkVingtQuatreHeures() {
  if (!botStartTime) return false;
  const maintenant = new Date();
  const tempsEcoule = maintenant - botStartTime;
  return tempsEcoule >= 24 * 60 * 60 * 1000;
}

// Fonction pour formater le message Discord
function formaterMessage(results, type = "normal") {
  let messageContent = "";
  
  if (type === "initial") {
    messageContent = `🔍 **Première recherche pour ${villeRecherchee}** :\n\n`;
  } else if (type === "changement") {
    messageContent = `🔄 **Nouveaux changements détectés pour ${villeRecherchee}** :\n\n`;
  } else if (type === "status") {
    messageContent = `📊 **Rapport de status quotidien pour ${villeRecherchee}** :\n\n`;
  }

  results.forEach((residence, index) => {
    messageContent += `**Résidence ${index + 1}**\n`;
    messageContent += `🔗 ${residence.url}\n`;
    
    const logement = residence.data;
    messageContent += `Type: ${logement.Type || 'Non spécifié'}\n`;
    messageContent += `Loyer: ${logement["Loyer mensuel TCC*"] || 'Non spécifié'}\n`;
    messageContent += `Disponibilité: ${logement.Disponibilite || 'Non spécifié'}\n`;
    if (logement.Meublé) {
      messageContent += `Meublé: ${logement.Meublé}\n`;
    }
    messageContent += '\n';
  });

  return messageContent;
}

// Fonction pour démarrer la recherche périodique
function startPeriodicSearch(channel) {
  if (intervalId) {
    clearInterval(intervalId);
  }

  botStartTime = new Date();
  let premiereRecherche = true;

  async function effectuerRecherche() {
    try {
      const results = await navigate(CONFIG.URL, villeRecherchee);
      
      if (results && results.length > 0) {
        let messageAEnvoyer;
        
        if (premiereRecherche) {
          messageAEnvoyer = formaterMessage(results, "initial");
          premiereRecherche = false;
        } else if (!resultatsIdentiques(results, dernierResultat)) {
          messageAEnvoyer = formaterMessage(results, "changement");
        } else if (checkVingtQuatreHeures()) {
          messageAEnvoyer = formaterMessage(results, "status");
          botStartTime = new Date();
        }

        // N'envoyer le message que s'il est différent du dernier message envoyé
        if (messageAEnvoyer && messageAEnvoyer !== dernierMessage) {
          await channel.send(messageAEnvoyer);
          dernierMessage = messageAEnvoyer;
          dernierResultat = results;
        }
      }
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
    }
  }

  intervalId = setInterval(effectuerRecherche, 30000); // 30 secondes
  effectuerRecherche(); // Lancer la première recherche immédiatement
}

// Créer le client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Quand le bot est prêt
client.once('ready', () => {
  console.log('Le bot est prêt !');
});

// Gérer les messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase().startsWith('!setcity ')) {
    villeRecherchee = message.content.slice(9).trim();
    
    if (villeRecherchee.length === 0) {
      await message.reply("⚠️ Veuillez spécifier une ville. Exemple: !setCity Paris");
      return;
    }

    await message.reply(`✅ Recherche configurée pour la ville : ${villeRecherchee}`);
    dernierResultat = null;
    dernierMessage = null;
    startPeriodicSearch(message.channel);
  }
});

// Gestion des erreurs
client.on('error', error => {
  console.error('Erreur Discord:', error);
});

process.on('unhandledRejection', error => {
  console.error('Erreur non gérée:', error);
});

// Connecter le bot à Discord
client.login(BOT_TOKEN).catch(console.error);
const { Builder, By, Key, until } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");

// id="PlaceAutocompletearia-autocomplete-1-input" pour la ville = "ile de france"
function remplirEtChercher() {
    // Récupérer l'élément <input> par son ID
    const inputElement = document.getElementById('PlaceAutocompletearia-autocomplete-1-input');
    
    // Vérifier si l'élément <input> existe
    if (inputElement) {
      // Remplir la case de texte avec 'Île-de-France'
      inputElement.value = 'Île-de-France';
  
      // Attendre un moment si nécessaire pour simuler l'entrée dans le champ (optionnel)
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  
      // Récupérer le bouton de recherche par sa classe
      const buttonElement = document.querySelector('button.fr-btn.svelte-w11odb');
      
      // Vérifier si le bouton existe
      if (buttonElement) {
        // Cliquer sur le bouton
        buttonElement.click();
        console.log('Recherche lancée');
      } else {
        console.log('Bouton de recherche introuvable');
      }
    } else {
      console.log('Champ de texte introuvable');
    }
  }
  
  // Appeler la fonction pour exécuter les actions
  remplirEtChercher();
  
function verifierUlisParClass() {
    // Récupérer le <ul> par sa classe
    const ulElement = document.getElementsByClassName('fr-grid-row fr-grid-row--gutters svelte-11sc5my')[0];
  
    // Vérifier si le <ul> existe
    if (!ulElement) {
      return false; // Si l'élément <ul> n'existe pas
    }
  
    // Récupérer tous les <li> à l'intérieur de ce <ul>
    const listItems = ulElement.getElementsByTagName('li');
  
    // Vérifier si le <ul> contient des <li>
    if (listItems.length === 0) {
      return false; // Si le <ul> n'a pas de <li>, retourner false
    }
  
    let allUlis = true;
  
    // Vérifier chaque élément <li>
    for (let item of listItems) {
      // Chercher le nom dans le titre du <h3>
      const title = item.querySelector('.fr-card__title a');
      if (title && title.textContent !== 'Ulis') {
        allUlis = false; // Si un titre n'est pas "Ulis", on marque que tous les titres ne sont pas "Ulis"
        break; // Pas besoin de continuer, on sait déjà que ce n'est pas "Ulis"
      }
    }
  
    // Si tous les titres sont "Ulis", retourner false
    if (allUlis) {
      return false;
    }
  
    // Sinon, retourner true
    return true;
  }
  
  console.log(verifierUlisParClass());
  
  const { Builder, By, Key, until } = require("selenium-webdriver");
  const firefox = require("selenium-webdriver/firefox");
  
  // Fonction pour remplir le champ de recherche et cliquer sur le bouton
  async function remplirEtChercher(driver) {
    // Ouvrir la page web
    await driver.get('https://trouverunlogement.lescrous.fr/'); // Remplacez par l'URL du site
  
    // Récupérer l'élément <input> par son ID
    const inputElement = await driver.findElement(By.id('PlaceAutocompletearia-autocomplete-1-input'));
    
    // Remplir le champ de texte avec 'Île-de-France'
    await inputElement.sendKeys('Île-de-France');
  
    // Attendre un moment si nécessaire pour simuler l'entrée dans le champ
    await driver.sleep(1000); // Attente d'une seconde (ajustez selon le besoin)
  
    // Trouver le bouton de recherche par sa classe et cliquer dessus
    const buttonElement = await driver.findElement(By.css('button.fr-btn.svelte-w11odb'));
    await buttonElement.click();
  
    // Attendre que la nouvelle page se charge
    await driver.wait(until.urlContains('nouvelle_url'), 5000); // Assurez-vous que l'URL contient un élément spécifique ou change
    console.log('Recherche lancée, page suivante chargée');
  }
  
  // Fonction pour vérifier le contenu du <ul> sur la nouvelle page
  async function verifierUlisParClass(driver) {
    // Récupérer le <ul> par sa classe
    const ulElement = await driver.findElement(By.className('fr-grid-row fr-grid-row--gutters svelte-11sc5my'));
    
    // Vérifier si le <ul> existe
    if (!ulElement) {
      console.log("Le <ul> n'existe pas");
      return false;
    }
  
    // Récupérer tous les <li> à l'intérieur de ce <ul>
    const listItems = await ulElement.findElements(By.tagName('li'));
  
    // Vérifier si le <ul> contient des <li>
    if (listItems.length === 0) {
      console.log("Le <ul> n'a pas de <li>");
      return false; // Si le <ul> n'a pas de <li>, retourner false
    }
  
    let allUlis = true;
  
    // Vérifier chaque élément <li>
    for (let item of listItems) {
      // Chercher le nom dans le titre du <h3>
      const title = await item.findElement(By.css('.fr-card__title a')).getText();
      if (title !== 'Ulis') {
        allUlis = false; // Si un titre n'est pas "Ulis", marquer que ce n'est pas "Ulis"
        break;
      }
    }
  
    // Si tous les titres sont "Ulis", retourner false
    if (allUlis) {
      console.log("Tous les titres sont 'Ulis'");
      return false;
    }
  
    console.log("Certains titres ne sont pas 'Ulis'");
    return true;
  }
  
  (async function main() {
    // Configurer Firefox (ou un autre navigateur) pour Selenium WebDriver
    let driver = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options()).build();
  
    try {
      // Appeler la première fonction pour remplir le champ et cliquer
      await remplirEtChercher(driver);
  
      // Après que la page ait changé, appeler la deuxième fonction pour vérifier le <ul>
      const result = await verifierUlisParClass(driver);
      console.log("Résultat de la vérification : ", result);
  
    } finally {
      // Fermer le navigateur après l'exécution
      await driver.quit();
    }
  })();
  
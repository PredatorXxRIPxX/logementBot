const { Builder, By, Key, until } = require('selenium-webdriver');
const express = require('express');
const router = express.Router();
const cors = require('cors');
const bodyParser = require('body-parser');

const fetchUrl = async (url) => {
    try {
        const driver = await new Builder().forBrowser('firefox').build();
        await driver.get(url);
        return driver;
    } catch (error) {
        console.error('Error in fetchUrl:', error);
        throw error;
    }
};

const getElements = async (driver) => {
    try {
    
        const elements = await driver.findElements(By.css('minirecap'));
        return elements;
    } catch (error) {
        console.error('Error in getElements:', error);
        throw error;
    }
};

const navigate = async (url, search) => {
    try {
        const driver = await fetchUrl(url); 
        
        const searchBox = await driver.wait(
            until.elementLocated(By.name('ville')),
            10000
        );
        await searchBox.sendKeys(search);
        
        const submit = await driver.wait(
            until.elementLocated(By.tagName('input')),
            10000
        );
        await submit.click();
        
        const elements = await getElements(driver);
        
        return { elements: elements.length };
    } catch (error) {
        console.error('Error in navigate:', error);
        throw error;
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
};

module.exports = { fetchUrl, navigate };
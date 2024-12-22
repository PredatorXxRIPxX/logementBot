const seliniuem = require('selenium-webdriver');
const { Builder, By, Key, until } = require('selenium-webdriver');
const express = require('express');
const router = express.Router();
const cors = require('cors');
const bodyParser = require('body-parser');
const e = require('express');

const fetchurl = async(url)  =>{
    let driver = await new Builder().forBrowser('firefox').build();
    await driver.get(url);
    let title = await driver.getTitle()
    return title;
}

module.exports = {fetchurl};

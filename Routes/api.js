const express = require('express');
const router = express.Router();
const {fetchurl} = require('../controllers/bot');

router.get('/url', async (req, res)  => {
    try {
        await fetchurl(req.query.url).then((title) => {
            res.status(200).json({title: title});
        });
    } catch (error) {
        res.status(500, {message: error.message});
    }
});

module.exports = router; 
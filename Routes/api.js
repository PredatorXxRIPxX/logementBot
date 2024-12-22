const express = require('express');
const router = express.Router();
const {navigate} = require('../controllers/bot');

router.get('/navigate', async (req, res) => {
    try {
        await navigate(req.query.url, req.query.search).then(() => {
            res.status(200).json({message: 'Navigation successful'});
        });
    } catch (error) {
        res.status(500).json({message: error.message});
    }
})

module.exports = router; 
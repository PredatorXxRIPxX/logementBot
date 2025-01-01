const express = require("express");
const router = express.Router();
const { navigate } = require("../controllers/bot");
const { main } = require("../controllers/botCrous");

router.get("/navigate", async (req, res) => {
  try {
    const { url, search } = req.query;

    if (!url || !search) {
      return res.status(400).json({
        message: "Missing required parameters: url and search are required",
      });
    }

    const result = await navigate(url, search);
    res.status(200).json({
      message: "Navigation successful",
      data: result,
    });
  } catch (error) {
    console.error("Navigation error:", error);
    res.status(500).json({
      message: "An error occurred during navigation",
      error: error.message,
    });
  }
});

router.get("/crous", async (req, res) => {
  try {
    const { url, search } = req.query;

    if (!url || !search) {
      return res.status(400).json({
        message: "Missing required parameters: url and search are required",
      });
    }

    const result = await main(url, search);

    res.status(200).json({
      message: "Navigation successful",
      data: result,
    });
  } catch (error) {
    console.error("Navigation error:", error);
    res.status(500).json({
      message: "An error occurred during navigation",
      error: error.message,
    });
  }
});

module.exports = router;

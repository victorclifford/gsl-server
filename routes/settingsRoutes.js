const express = require("express");
const { getSettings, updateSettings } = require("../controllers/SettingsController");
const { authorizeAdmin } = require("../middlewares/authorizations");

const router = express.Router();

router.get("/", getSettings);
router.put("/", authorizeAdmin, updateSettings);

module.exports = router;

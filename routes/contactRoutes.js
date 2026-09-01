const express = require("express");
const { createContactMessage } = require("../controllers/ContactController");

const router = express.Router();

// Public contact form submission
router.post("/", createContactMessage);

module.exports = router;

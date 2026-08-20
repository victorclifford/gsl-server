const express = require("express");
const {
  createQuote,
  getAllQuotes,
  getQuote,
  updateQuoteStatus,
  deleteQuote,
} = require("../controllers/QuoteController");
const {
  authorizeAdmin,
} = require("../middlewares/authorizations");

const router = express.Router();

// Public lead submission
router.post("/", createQuote);

// Admin lead management
router.get("/", authorizeAdmin, getAllQuotes);
router.get("/:id", authorizeAdmin, getQuote);
router.put("/:id", authorizeAdmin, updateQuoteStatus);
router.patch("/:id", authorizeAdmin, updateQuoteStatus);
router.delete("/:id", authorizeAdmin, deleteQuote);

module.exports = router;

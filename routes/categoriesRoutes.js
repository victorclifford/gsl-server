const express = require("express");
const upload = require("../utils/multer");
const {
  getAllCategories,
  getCategory,
} = require("../controllers/CategoryController.js");
// const { addProducts } = require("../controllers/ProductController.js");

const router = express.Router();

// get categories
router.get("/", getAllCategories);

router.get("/:id", getCategory);

module.exports = router;

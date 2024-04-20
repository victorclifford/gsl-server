const express = require("express");
const upload = require("../utils/multer");
const { getAllCategories } = require("../controllers/CategoryController.js");
// const { addProducts } = require("../controllers/ProductController.js");

const router = express.Router();

// get categories
router.get("/", getAllCategories);

module.exports = router;

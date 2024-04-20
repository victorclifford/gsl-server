const express = require("express");
const upload = require("../utils/multer");
const { getAllProducts } = require("../controllers/ProductController");
// const { addProducts } = require("../controllers/ProductController.js");

const router = express.Router();

// get categories
router.get("/", getAllProducts);

module.exports = router;

const express = require("express");
const upload = require("../utils/multer");
const ProductController = require("../controllers/ProductController");
// const { addProducts } = require("../controllers/ProductController.js");

const router = express.Router();

router.get("/", ProductController.getAllProducts);
router.get("/published", ProductController.getPublishedProducts);
router.get("/category/:categoryid", ProductController.getProductsByCategory);

router.get("/:productid", ProductController.getProduct);

router.delete("/:productid", ProductController.deleteProduct);

module.exports = router;

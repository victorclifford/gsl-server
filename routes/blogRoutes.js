const express = require("express");
const BlogController = require("../controllers/BlogController");

const router = express.Router();

// get blogs
router.get("/", BlogController.getBlogs);

// get single blog
router.get("/:blogid", BlogController.getBlog);

module.exports = router;

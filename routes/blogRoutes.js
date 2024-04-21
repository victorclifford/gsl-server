const express = require("express");
const BlogController = require("../controllers/BlogController");

const router = express.Router();

// get blogs
router.get("/", BlogController.getBlogs);

// get single blog
router.get("/:blogid", BlogController.getBlog);

router.delete("/:blogid", BlogController.deleteBlog);

module.exports = router;

const express = require("express");
const upload = require("../utils/multer");
const BlogController = require("../controllers/BlogController");
const { authorizeAdmin } = require("../middlewares/authorizations");

const router = express.Router();

// Public routes
router.get("/", BlogController.getBlogs);
router.get("/:blogid", BlogController.getBlog);

// Admin routes — RESTful CRUD matching frontend mutations
router.post("/", authorizeAdmin, upload.single("image"), BlogController.createBlog);
router.put("/:blogid", authorizeAdmin, upload.single("image"), BlogController.updateBlog);
router.delete("/:blogid", authorizeAdmin, BlogController.deleteBlog);

module.exports = router;

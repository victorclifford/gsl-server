const express = require("express");
const {
  getAllCategories,
  getCategoryTree,
  getCategory,
  addCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/CategoryController.js");
const {
  authorizeUser,
  authorizeAdmin,
} = require("../middlewares/authorizations");

const router = express.Router();

// PUBLIC: flat list of all categories
router.get("/", getAllCategories);

// PUBLIC: nested category tree (top-level + subcategories)
router.get("/tree", getCategoryTree);

// PUBLIC: single category by ID
router.get("/:id", getCategory);

// ADMIN: create category / subcategory
router.post("/", authorizeUser, authorizeAdmin, addCategory);

// ADMIN: update category
router.put("/", authorizeUser, authorizeAdmin, updateCategory);

// ADMIN: soft delete category
router.delete("/:id", authorizeUser, authorizeAdmin, deleteCategory);

module.exports = router;

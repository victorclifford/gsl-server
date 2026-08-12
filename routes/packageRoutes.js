const express = require("express");
const {
  getAllPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
} = require("../controllers/PackageController");
const {
  authorizeAdmin,
  authorizeSuperAdmin,
} = require("../middlewares/authorizations");

const router = express.Router();

// Public routes
router.get("/", getAllPackages);
router.get("/:identifier", getPackage);

// Admin routes
router.post("/", authorizeSuperAdmin, createPackage);
router.put("/:id", authorizeSuperAdmin, updatePackage);
router.delete("/:id", authorizeSuperAdmin, deletePackage);

module.exports = router;

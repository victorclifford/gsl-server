const express = require("express");
const upload = require("../utils/multer");
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require("../controllers/ProjectController");
const {
  authorizeSuperAdmin,
  authorizeAdmin,
} = require("../middlewares/authorizations");

const router = express.Router();

// Up to 5 images per project (matches products pattern)
const uploadProjectImages = upload.fields([{ name: "images", maxCount: 5 }]);

// Public routes
router.get("/", getAllProjects);
router.get("/:identifier", getProject);

// Admin routes — multipart/form-data with optional images
router.post("/", authorizeAdmin, uploadProjectImages, createProject);
router.put("/:id", authorizeAdmin, uploadProjectImages, updateProject);
router.delete("/:id", authorizeSuperAdmin, deleteProject);

module.exports = router;


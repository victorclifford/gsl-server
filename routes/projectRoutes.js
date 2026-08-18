const express = require("express");
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require("../controllers/ProjectController");
const {
  authorizeSuperAdmin,
} = require("../middlewares/authorizations");

const router = express.Router();

// Public routes
router.get("/", getAllProjects);
router.get("/:identifier", getProject);

// Admin routes
router.post("/", authorizeSuperAdmin, createProject);
router.put("/:id", authorizeSuperAdmin, updateProject);
router.delete("/:id", authorizeSuperAdmin, deleteProject);

module.exports = router;

const express = require("express");
const {
  getAnnouncement,
  updateAnnouncement,
} = require("../controllers/AnnouncementController");
const { authorizeAdmin } = require("../middlewares/authorizations");

const router = express.Router();

// Public route to fetch the announcement
router.get("/", getAnnouncement);

// Admin route to update the announcement
router.put("/", authorizeAdmin, updateAnnouncement);

module.exports = router;

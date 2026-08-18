const express = require("express");
const upload = require("../utils/multer");
const {
  getActiveBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
} = require("../controllers/BannerController");
const {
  authorizeSuperAdmin,
  authorizeAdmin,
} = require("../middlewares/authorizations");

const router = express.Router();

// Public routes
router.get("/", getActiveBanners);

// Admin routes
router.get("/all", authorizeAdmin, getAllBannersAdmin);
router.post("/", authorizeAdmin, upload.single("image"), createBanner);
router.put("/:id", authorizeAdmin, upload.single("image"), updateBanner);
router.patch("/:id/status", authorizeAdmin, toggleBannerStatus);
router.delete("/:id", authorizeAdmin, deleteBanner);

module.exports = router;

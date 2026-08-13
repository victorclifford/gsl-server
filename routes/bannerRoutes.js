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
router.post("/", authorizeSuperAdmin, upload.single("image"), createBanner);
router.put("/:id", authorizeSuperAdmin, upload.single("image"), updateBanner);
router.patch("/:id/status", authorizeSuperAdmin, toggleBannerStatus);
router.delete("/:id", authorizeSuperAdmin, deleteBanner);

module.exports = router;

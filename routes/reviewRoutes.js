const express = require("express");
const {
  getPublishedReviews,
  getAllReviewsAdmin,
  createReview,
  togglePublishReview,
  deleteReview,
} = require("../controllers/ReviewController");
const { authorizeAdmin } = require("../middlewares/authorizations");
const upload = require("../utils/multer");

const router = express.Router();

// Public routes
router.get("/", getPublishedReviews);
router.post("/", upload.single("videoFile"), createReview);

// Admin routes
router.get("/all", authorizeAdmin, getAllReviewsAdmin);
router.put("/:id/toggle-publish", authorizeAdmin, togglePublishReview);
router.delete("/:id", authorizeAdmin, deleteReview);

module.exports = router;

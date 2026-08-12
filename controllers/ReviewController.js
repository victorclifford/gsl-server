const ReviewModel = require("../models/ReviewModel");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all published reviews (Public)
// @route   GET /api/reviews
// @access  Public
exports.getPublishedReviews = async (req, res, next) => {
  try {
    const reviews = await ReviewModel.find({ isPublished: true }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all reviews including pending (Admin)
// @route   GET /api/reviews/all
// @access  Private/Admin
exports.getAllReviewsAdmin = async (req, res, next) => {
  try {
    const { isPublished, q } = req.query;
    const filter = {};

    if (isPublished !== undefined) {
      filter.isPublished = isPublished === "true";
    }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
      ];
    }

    const reviews = await ReviewModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Submit a review
// @route   POST /api/reviews
// @access  Public / Authenticated
exports.createReview = async (req, res, next) => {
  try {
    const reviewData = {
      ...req.body,
      // If submitted by regular user, requires admin moderation by default
      isPublished: req.user?.isAdmin || req.user?.isSuperAdmin ? true : false,
      user: req.user?._id,
    };

    const review = await ReviewModel.create(reviewData);

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      review,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Toggle review publish status
// @route   PATCH /api/reviews/:id/publish
// @access  Private/Admin
exports.togglePublishReview = async (req, res, next) => {
  try {
    const review = await ReviewModel.findById(req.params.id);

    if (!review) {
      return next(new ErrorResponse("Review not found", 404));
    }

    review.isPublished = !review.isPublished;
    await review.save();

    return res.status(200).json({
      success: true,
      message: `Review ${review.isPublished ? "published" : "unpublished"} successfully`,
      review,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await ReviewModel.findByIdAndDelete(req.params.id);

    if (!review) {
      return next(new ErrorResponse("Review not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

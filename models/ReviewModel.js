const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    role: {
      type: String,
      default: "Residential Customer",
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Review testimonial text is required"],
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const ReviewModel =
  mongoose.models.Review || mongoose.model("Review", reviewSchema);

module.exports = ReviewModel;

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
      trim: true,
      default: "",
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    videoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    videoId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

const ReviewModel =
  mongoose.models.Review || mongoose.model("Review", reviewSchema);

module.exports = ReviewModel;

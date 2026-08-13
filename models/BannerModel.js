const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    badge: {
      type: String,
      trim: true,
      default: "Special Highlight",
    },
    image: {
      type: String,
      required: [true, "Banner image is required"],
    },
    ctaText: {
      type: String,
      default: "Explore Now",
      trim: true,
    },
    ctaLink: {
      type: String,
      default: "/shop",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

const BannerModel =
  mongoose.models.Banner || mongoose.model("Banner", bannerSchema);

module.exports = BannerModel;

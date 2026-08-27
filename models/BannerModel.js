const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title/label is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Banner image is required"],
    },
    imageId: {
      type: String,
      default: "",
    },
    ctaLink: {
      type: String,
      default: "/products",
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
    placement: {
      type: String,
      enum: ["storefront_hero", "storefront_promo_strip", "storefront_promo_card", "storefront_leaderboard"],
      default: "storefront_hero",
    },
  },
  { timestamps: true }
);

const BannerModel =
  mongoose.models.Banner || mongoose.model("Banner", bannerSchema);

module.exports = BannerModel;

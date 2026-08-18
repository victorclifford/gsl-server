const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Offer title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    percentageOff: {
      type: Number,
      required: [true, "Discount percentage is required"],
      min: 1,
      max: 100,
    },
    bannerImage: {
      type: String,
      default: "",
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const OfferModel =
  mongoose.models.Offer || mongoose.model("Offer", offerSchema);

module.exports = OfferModel;

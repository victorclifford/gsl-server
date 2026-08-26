const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Offer name is required"],
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
  { timestamps: true },
);

const OfferModel =
  mongoose.models.Offer || mongoose.model("Offer", offerSchema);

module.exports = OfferModel;

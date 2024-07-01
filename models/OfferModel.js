const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const OfferModel = new Schema(
  {
    name: String,
    description: String,
    type: { type: String, enum: ["Price Slash", "Percentage Off"] },
    priceSlash: Number,
    percentageOff: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", OfferModel);

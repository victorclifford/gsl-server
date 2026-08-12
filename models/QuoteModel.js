const mongoose = require("mongoose");

const quoteSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Customer email is required"],
      trim: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Customer phone number is required"],
      trim: true,
    },
    state: {
      type: String,
      default: "Rivers",
    },
    city: {
      type: String,
      default: "Port Harcourt",
    },
    address: {
      type: String,
      trim: true,
    },
    dailyKwh: {
      type: Number,
      required: [true, "Daily kWh load is required"],
    },
    peakWatts: {
      type: Number,
      required: [true, "Peak wattage is required"],
    },
    recommendedInverter: {
      type: String,
      default: "5 kVA Hybrid",
    },
    recommendedBattery: {
      type: String,
      default: "10 kWh Lithium",
    },
    recommendedPv: {
      type: String,
      default: "4.5 kWp Solar PV",
    },
    appliances: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        powerWatts: { type: Number, default: 100 },
        hoursPerDay: { type: Number, default: 8 },
      },
    ],
    status: {
      type: String,
      enum: [
        "New Lead",
        "Contacted",
        "Quote Sent",
        "Site Inspected",
        "Won",
        "Declined",
      ],
      default: "New Lead",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const QuoteModel =
  mongoose.models.Quote || mongoose.model("Quote", quoteSchema);

module.exports = QuoteModel;

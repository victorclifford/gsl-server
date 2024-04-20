const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const trackingIdSchema = new Schema(
  {
    tracking_id: {
      type: String,
      required: true,
    },
    order: { type: Schema.ObjectId, ref: "Order", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrackingId", trackingIdSchema);

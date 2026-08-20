const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Announcement text is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const AnnouncementModel =
  mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);

module.exports = AnnouncementModel;

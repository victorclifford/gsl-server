const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const CategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    // parent category reference for subcategories (null = top-level)
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    icon: {
      type: String, // e.g. emoji or icon name for UI display
    },
    image: {
      type: String, // cloudinary URL for category banner
    },
    sortOrder: {
      type: Number,
      default: 0, // lower number = appears first in listings
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategorySchema);

const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const CategoryModel = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      // required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", CategoryModel);

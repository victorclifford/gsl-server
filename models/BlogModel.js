const mongoose = require("mongoose");

const { Schema } = mongoose;

// Define schema for the blog post
const blogSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    author: {
      // type: Schema.Types.ObjectId,
      // ref: "User",
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    imageId: {
      type: String,
    },
    tags: {
      type: Array,
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Define model for the blog post
const Blog = mongoose.model("Blog", blogSchema);

module.exports = Blog;

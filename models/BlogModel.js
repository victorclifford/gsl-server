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
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    excerpt: {
      type: String,
    },
    readTime: {
      type: Number,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Define model for the blog post
const Blog = mongoose.model("Blog", blogSchema);

module.exports = Blog;

const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const ProductSchema = new Schema(
  {
    //name of product
    name: {
      type: String,
      required: true,
    },
    //short description of product
    description: {
      type: String,
      required: true,
    },

    additionalInfo: {
      type: String,
    },
    //category of product
    category: {
      type: Schema.ObjectId,
      ref: "Category",
    },
    //images of product urls from cloudinary in an array
    images: {
      type: Array,
      required: true,
    },
    //product purchase price
    price: {
      type: Number,
      required: true,
    },
    withinLocationDeliveryFee: {
      type: Number,
      required: true,
    },
    outsideLocationDeliveryFee: {
      type: Number,
      required: true,
    },

    slug: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
    },
    quantityInStock: {
      type: Number,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);

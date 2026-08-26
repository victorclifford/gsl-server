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
    //category of product — must be a subcategory (parent !== null)
    category: {
      type: Schema.ObjectId,
      ref: "Category",
      required: true,
    },
    //images of product urls from cloudinary in an array
    images: {
      type: Array,
      required: true,
    },
    //product purchase price (regular / original price)
    price: {
      type: Number,
      required: true,
    },
    //discounted sale price (0 if no discount)
    discountPrice: {
      type: Number,
      default: 0,
    },
    //standalone manual discount price (preserved when joining/leaving campaign campaigns)
    manualDiscountPrice: {
      type: Number,
      default: 0,
    },
    //shipping / freight class for solar equipment
    shippingClass: {
      type: String,
      enum: ["standard", "medium", "heavy_freight"],
      default: "standard",
    },
    withinLocationDeliveryFee: {
      type: Number,
      default: 0,
    },
    outsideLocationDeliveryFee: {
      type: Number,
      default: 0,
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
      default: 0,
    },
    // optional link to a marketing campaign offer
    currentOffer: {
      type: Schema.ObjectId,
      ref: "Offer",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    // technical specification table shown on product detail page
    datasheet: [
      {
        key: { type: String, required: true }, // e.g. "Capacity"
        value: { type: String, required: true }, // e.g. "200Ah"
        _id: false,
      },
    ],
    // admin toggle — controls whether the datasheet table is visible on the storefront
    showDatasheet: {
      type: Boolean,
      default: false,
    },
    // product code for lookup and search
    productCode: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true },
);

// Auto-generate product code from MongoDB ObjectId if missing
ProductSchema.pre("save", function (next) {
  if (!this.productCode) {
    this.productCode = "GSL-" + this._id.toString().slice(-6).toUpperCase();
  }
  next();
});

// Enforce subcategory assignment when categories have children
ProductSchema.pre("save", async function (next) {
  if (!this.isModified("category") || !this.category) return next();

  try {
    const Category = mongoose.model("Category");
    const cat = await Category.findById(this.category);

    if (!cat) {
      return next(new Error("Invalid category: category not found."));
    }

    // If top-level category has subcategories, advise assigning to a subcategory
    if (!cat.parent) {
      const hasChildren = await Category.exists({
        parent: cat._id,
        isDeleted: false,
      });
      if (hasChildren) {
        return next(
          new Error(
            `"${cat.name}" is a top-level category. Please select one of its specific subcategories.`,
          ),
        );
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Product", ProductSchema);

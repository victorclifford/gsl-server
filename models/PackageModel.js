const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    tagline: {
      type: String,
      trim: true,
    },
    capacityKva: {
      type: Number,
      required: [true, "Capacity in kVA is required"],
    },
    batteryType: {
      type: String,
      enum: ["Lithium", "Tubular", "AGM", "Gel"],
      default: "Lithium",
    },
    batteryKwh: {
      type: Number,
      default: 5,
    },
    pvKwp: {
      type: Number,
      default: 3,
    },
    price: {
      type: Number,
      required: [true, "Package price is required"],
    },
    discountPrice: {
      type: Number,
      default: 0,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: "/images/bg/hero-bg.jpg",
    },
    description: {
      type: String,
      required: [true, "Package description is required"],
    },
    highlights: {
      type: [String],
      default: [],
    },
    powers: {
      type: [String],
      default: [],
    },
    constituents: [
      {
        item: { type: String, required: true },
        qty: { type: Number, default: 1 },
        spec: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate slug before saving
packageSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

const PackageModel =
  mongoose.models.Package || mongoose.model("Package", packageSchema);

module.exports = PackageModel;

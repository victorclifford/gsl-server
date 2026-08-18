const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    desc: {
      type: String,
      required: [true, "Project description is required"],
    },
    location: {
      type: String,
      required: [true, "Installation location is required"],
      trim: true,
    },
    date: {
      type: String,
      default: "August 2026",
    },
    image: {
      type: String,
      default: "/images/bg/hero-bg.jpg",
    },
    specs: {
      inverter: { type: String, default: "5 kVA" },
      pv: { type: String, default: "6 kWp" },
      battery: { type: String, default: "10 kWh" },
    },
    highlights: {
      type: [String],
      default: [],
    },
    powers: {
      type: [String],
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

projectSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

const ProjectModel =
  mongoose.models.Project || mongoose.model("Project", projectSchema);

module.exports = ProjectModel;

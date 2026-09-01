const mongoose = require("mongoose");

const financingSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email address is required"],
    },
    requestType: {
      type: String,
      required: [true, "Request type is required"],
      enum: ["individual", "corporate"],
      default: "individual",
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: [true, "Package ID is required"],
    },
    systemSize: {
      type: String,
      required: [true, "System size is required"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
    },
    nin: {
      type: String,
      required: [true, "NIN is required"],
    },
    directDebitSetup: {
      type: Boolean,
      default: false,
    },
    // Individual details
    firstName: {
      type: String,
      default: "",
    },
    lastName: {
      type: String,
      default: "",
    },
    officeAddress: {
      type: String,
      default: "",
    },
    jobRole: {
      type: String,
      default: "",
    },
    // Corporate details
    businessAddress: {
      type: String,
      default: "",
    },
    natureOfBusiness: {
      type: String,
      default: "",
    },
    yearsInBusiness: {
      type: Number,
      default: null,
    },
    documents: {
      passportPhoto: {
        type: String,
        default: "",
      },
      passportPhotoId: {
        type: String,
        default: "",
      },
      cacDocument: {
        type: String,
        default: "",
      },
      cacDocumentId: {
        type: String,
        default: "",
      },
    },
    provisionOfCheque: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "declined", "completed"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const FinancingModel =
  mongoose.models.Financing || mongoose.model("Financing", financingSchema);

module.exports = FinancingModel;

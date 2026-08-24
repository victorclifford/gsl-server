const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  paymentReference: {
    type: String,
    required: true,
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  type: {
    type: String,
    enum: ["down_payment", "installment"],
    required: true,
  },
});

const financingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
    },
    systemSize: {
      type: String,
      required: [true, "System size or package name is required"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
    },
    downPayment: {
      type: Number,
      required: [true, "Down payment is required"],
    },
    repaymentMonths: {
      type: Number,
      required: [true, "Repayment duration is required"],
      enum: [3, 6, 12, 24],
    },
    monthlyPayment: {
      type: Number,
      required: [true, "Monthly payment amount is required"],
    },
    employmentStatus: {
      type: String,
      required: [true, "Employment status is required"],
    },
    monthlyIncome: {
      type: Number,
      required: [true, "Monthly income is required"],
    },
    employerName: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
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
    payments: [paymentSchema],
  },
  { timestamps: true }
);

const FinancingModel =
  mongoose.models.Financing || mongoose.model("Financing", financingSchema);

module.exports = FinancingModel;

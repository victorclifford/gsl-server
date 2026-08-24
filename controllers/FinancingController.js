const FinancingModel = require("../models/FinancingModel");
const ErrorResponse = require("../utils/errorResponse");
const PaystackAPI = require("../utils/paystack");
const config = require("../utils/config");
const paginate = require("../utils/paginate");

// Create financing request
exports.requestFinancing = async (req, res, next) => {
  try {
    const {
      packageId,
      systemSize,
      totalAmount,
      downPayment,
      repaymentMonths,
      monthlyPayment,
      employmentStatus,
      monthlyIncome,
      employerName,
      phoneNumber,
      address,
    } = req.body;

    if (
      !systemSize ||
      !totalAmount ||
      !downPayment ||
      !repaymentMonths ||
      !monthlyPayment ||
      !employmentStatus ||
      !monthlyIncome ||
      !phoneNumber ||
      !address
    ) {
      return next(new ErrorResponse("All required fields must be provided", 400));
    }

    const newRequest = await FinancingModel.create({
      user: req.user._id,
      packageId: packageId || null,
      systemSize,
      totalAmount,
      downPayment,
      repaymentMonths,
      monthlyPayment,
      employmentStatus,
      monthlyIncome,
      employerName: employerName || "",
      phoneNumber,
      address,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Financing request submitted successfully",
      financing: newRequest,
    });
  } catch (error) {
    return next(error);
  }
};

// Get requests for logged-in user
exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await FinancingModel.find({ user: req.user._id })
      .populate("packageId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      financingRequests: requests,
    });
  } catch (error) {
    return next(error);
  }
};

// Get single request
exports.getSingleRequest = async (req, res, next) => {
  try {
    const request = await FinancingModel.findById(req.params.id)
      .populate("user", "firstname lastname email")
      .populate("packageId");

    if (!request) {
      return next(new ErrorResponse("Financing request not found", 404));
    }

    // Check if owner or admin
    if (
      request.user._id.toString() !== req.user._id.toString() &&
      !req.user.isAdmin &&
      !req.user.isSuperAdmin
    ) {
      return next(
        new ErrorResponse("Not authorized to view this request", 403)
      );
    }

    return res.status(200).json({
      success: true,
      financing: request,
    });
  } catch (error) {
    return next(error);
  }
};

// Initialize payment step (Downpayment or installment)
exports.payFinancingStep = async (req, res, next) => {
  try {
    const request = await FinancingModel.findById(req.params.id);
    if (!request) {
      return next(new ErrorResponse("Request not found", 404));
    }

    if (request.status !== "approved") {
      return next(
        new ErrorResponse("This plan is not approved for payments yet", 400)
      );
    }

    // Determine type: check if down payment has been paid
    const downPaymentPaid = request.payments.some(
      (p) => p.type === "down_payment" && p.status === "paid"
    );

    let amountToPay = 0;
    let paymentType = "";

    if (!downPaymentPaid) {
      amountToPay = request.downPayment;
      paymentType = "down_payment";
    } else {
      // Calculate how many installment payments are already paid
      const installmentsPaidCount = request.payments.filter(
        (p) => p.type === "installment" && p.status === "paid"
      ).length;

      if (installmentsPaidCount >= request.repaymentMonths) {
        return next(new ErrorResponse("All installments already paid!", 400));
      }

      amountToPay = request.monthlyPayment;
      paymentType = "installment";
    }

    const paystack = new PaystackAPI();
    const reference = `FIN-${request._id.toString().substring(0, 8)}-${Date.now()}`;
    const payload = {
      email: req.user.email,
      amount: Math.round(amountToPay * 100), // in kobo
      callback_url: `${config.HOMEPAGE || "http://localhost:3000"}/account/financing?ref=${reference}`,
      reference,
    };

    const initializeResponse = await paystack.initializeTransaction(payload);
    if (!initializeResponse || !initializeResponse.status) {
      return next(new ErrorResponse("Paystack initialization failed", 400));
    }

    // Push pending payment object
    request.payments.push({
      amount: amountToPay,
      paymentReference: reference,
      status: "pending",
      type: paymentType,
    });
    await request.save();

    return res.status(200).json({
      success: true,
      authorization_url: initializeResponse.data.authorization_url,
      reference,
    });
  } catch (error) {
    return next(error);
  }
};

// Verify single step payment
exports.verifyFinancingPayment = async (req, res, next) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return next(new ErrorResponse("Payment reference is required", 400));
    }

    const request = await FinancingModel.findOne({
      "payments.paymentReference": reference,
    });

    if (!request) {
      return next(new ErrorResponse("Financing plan not found for this reference", 404));
    }

    const paymentIndex = request.payments.findIndex(
      (p) => p.paymentReference === reference
    );

    if (request.payments[paymentIndex].status === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        financing: request,
      });
    }

    const paystack = new PaystackAPI();
    const verifiedPayment = await paystack.verifyPayment(reference);

    if (
      !verifiedPayment ||
      !verifiedPayment.status ||
      verifiedPayment.data.status !== "success"
    ) {
      request.payments[paymentIndex].status = "failed";
      await request.save();
      return next(new ErrorResponse("Payment verification failed", 400));
    }

    // Check amount (expected vs paid)
    const expectedKobo = Math.round(request.payments[paymentIndex].amount * 100);
    if (verifiedPayment.data.amount !== expectedKobo) {
      request.payments[paymentIndex].status = "failed";
      await request.save();
      return next(new ErrorResponse("Payment amount mismatch", 400));
    }

    // Success: mark as paid
    request.payments[paymentIndex].status = "paid";

    // Recheck completion state
    const installmentsPaidCount = request.payments.filter(
      (p) => p.type === "installment" && p.status === "paid"
    ).length;

    const hasPaidDownPayment = request.payments.some(
      (p) => p.type === "down_payment" && p.status === "paid"
    );

    if (hasPaidDownPayment && installmentsPaidCount >= request.repaymentMonths) {
      request.status = "completed";
    }

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      financing: request,
    });
  } catch (error) {
    return next(error);
  }
};

// Admin list all requests
exports.adminGetAllRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = "" } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const { data: requests, pagination } = await paginate(FinancingModel, query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: "user", select: "firstname lastname email" },
        { path: "packageId" },
      ],
    });

    return res.status(200).json({
      success: true,
      requests,
      pagination,
    });
  } catch (error) {
    return next(error);
  }
};

// Admin approve request
exports.adminApproveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNotes, monthlyPayment, downPayment } = req.body;

    const request = await FinancingModel.findById(id);
    if (!request) {
      return next(new ErrorResponse("Financing request not found", 404));
    }

    if (request.status !== "pending") {
      return next(
        new ErrorResponse("Financing request is already processed", 400)
      );
    }

    request.status = "approved";
    if (adminNotes) request.adminNotes = adminNotes;
    if (monthlyPayment) request.monthlyPayment = monthlyPayment;
    if (downPayment) request.downPayment = downPayment;

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Financing request approved successfully",
      financing: request,
    });
  } catch (error) {
    return next(error);
  }
};

// Admin decline request
exports.adminDeclineRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const request = await FinancingModel.findById(id);
    if (!request) {
      return next(new ErrorResponse("Financing request not found", 404));
    }

    if (request.status !== "pending") {
      return next(
        new ErrorResponse("Financing request is already processed", 400)
      );
    }

    request.status = "declined";
    if (adminNotes) request.adminNotes = adminNotes;

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Financing request declined successfully",
      financing: request,
    });
  } catch (error) {
    return next(error);
  }
};

const QuoteModel = require("../models/QuoteModel");
const UserModel = require("../models/UserModel");
const ErrorResponse = require("../utils/errorResponse");
const { sendBrevoEmail } = require("../utils/sendBrevoEmail");

// @desc    Submit energy calculator lead or quote request
// @route   POST /api/quotes
// @access  Public
exports.createQuote = async (req, res, next) => {
  try {
    const quote = await QuoteModel.create(req.body);

    // Send admin notification to ADMIN_EMAIL
    const adminEmail = process.env.ADMIN_EMAIL || "";
    const recipients = [{ email: adminEmail, name: "Go Solar Admin" }];

    const dashboardUrl = `${process.env.HOMEPAGE || "http://localhost:3000"}/dashboard/quotes`;

    sendBrevoEmail({
      subject: `New Solar Lead: ${quote.fullName}`,
      to: recipients,
      templateName: "quote-notification",
      parameters: {
        fullName: quote.fullName,
        phoneNumber: quote.phoneNumber,
        email: quote.email,
        address: quote.address || "N/A",
        city: quote.city || "N/A",
        state: quote.state || "N/A",
        dailyKwh: quote.dailyKwh,
        peakWatts: quote.peakWatts,
        recommendedInverter: quote.recommendedInverter,
        recommendedBattery: quote.recommendedBattery,
        recommendedPv: quote.recommendedPv,
        notes: quote.notes,
        dashboardUrl: dashboardUrl,
      },
    }).catch((err) => {
      console.error("Failed to dispatch admin email notification:", err);
    });

    return res.status(201).json({
      success: true,
      message:
        "Quote request submitted successfully. A solar engineer will contact you shortly.",
      quote,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all quote requests & leads
// @route   GET /api/quotes
// @access  Private/Admin
exports.getAllQuotes = async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const filter = {};

    if (status && status !== "All") {
      filter.status = status;
    }
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phoneNumber: { $regex: q, $options: "i" } },
      ];
    }

    const quotes = await QuoteModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quotes.length,
      quotes,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get single quote details
// @route   GET /api/quotes/:id
// @access  Private/Admin
exports.getQuote = async (req, res, next) => {
  try {
    const quote = await QuoteModel.findById(req.params.id);

    if (!quote) {
      return next(new ErrorResponse("Quote lead not found", 404));
    }

    return res.status(200).json({
      success: true,
      quote,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update quote status or notes
// @route   PATCH /api/quotes/:id
// @access  Private/Admin
exports.updateQuoteStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const updateData = {};

    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const quote = await QuoteModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    if (!quote) {
      return next(new ErrorResponse("Quote lead not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Quote updated successfully",
      quote,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete a quote request
// @route   DELETE /api/quotes/:id
// @access  Private/Admin
exports.deleteQuote = async (req, res, next) => {
  try {
    const quote = await QuoteModel.findByIdAndDelete(req.params.id);

    if (!quote) {
      return next(new ErrorResponse("Quote lead not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Quote lead deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

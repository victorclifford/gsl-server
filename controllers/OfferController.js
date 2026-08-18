const OfferModel = require("../models/OfferModel");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get active sales offers (Public)
// @route   GET /api/offers
// @access  Public
exports.getActiveOffers = async (req, res, next) => {
  try {
    const offers = await OfferModel.find({ isActive: true })
      .populate("products", "title price images discountPrice")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all sales offers (Admin)
// @route   GET /api/offers/all
// @access  Private/Admin
exports.getAllOffersAdmin = async (req, res, next) => {
  try {
    const offers = await OfferModel.find({})
      .populate("products", "title price images discountPrice")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Create a sales offer
// @route   POST /api/offers
// @access  Private/SuperAdmin
exports.createOffer = async (req, res, next) => {
  try {
    const offer = await OfferModel.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Sales offer created successfully",
      offer,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update a sales offer
// @route   PUT /api/offers/:id
// @access  Private/SuperAdmin
exports.updateOffer = async (req, res, next) => {
  try {
    const offer = await OfferModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!offer) {
      return next(new ErrorResponse("Sales offer not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Sales offer updated successfully",
      offer,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete a sales offer
// @route   DELETE /api/offers/:id
// @access  Private/SuperAdmin
exports.deleteOffer = async (req, res, next) => {
  try {
    const offer = await OfferModel.findByIdAndDelete(req.params.id);

    if (!offer) {
      return next(new ErrorResponse("Sales offer not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Sales offer deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const OfferModel = require("../models/OfferModel");
const ProductModel = require("../models/ProductModel");
const ErrorResponse = require("../utils/errorResponse");
const { syncOfferProducts } = require("../utils/offerSyncHelper");

// @desc    Get active sales offers (Public)
// @route   GET /api/offers
// @access  Public
exports.getActiveOffers = async (req, res, next) => {
  try {
    const now = new Date();
    const offers = await OfferModel.find({
      isActive: true,
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] }
      ]
    })
      .populate("products", "name price images discountPrice")
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
      .populate("products", "name price images discountPrice")
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

    await syncOfferProducts(offer._id);

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

    await syncOfferProducts(offer._id);

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

    await syncOfferProducts(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Sales offer deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Add products to a sales offer
// @route   POST /api/offers/add-products
// @access  Private/Admin
exports.addProductsToOffer = async (req, res, next) => {
  try {
    const { offer: offerId, products: productIds } = req.body;

    if (!offerId || !Array.isArray(productIds)) {
      return next(new ErrorResponse("Please provide an offer ID and an array of product IDs", 400));
    }

    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      return next(new ErrorResponse("Sales offer not found", 404));
    }

    // 1. Update the currentOffer and discountPrice on each product
    const products = await ProductModel.find({ _id: { $in: productIds }, isDeleted: false });
    
    for (const product of products) {
      product.currentOffer = offer._id;
      // Calculate discount price based on offer percentageOff
      product.discountPrice = Math.round(product.price * (1 - offer.percentageOff / 100));
      await product.save();
    }

    // 2. Add products to the offer's products array, avoiding duplicates
    const existingProductIds = offer.products.map(p => p.toString());
    const newProductIds = productIds.filter(id => !existingProductIds.includes(id));
    
    if (newProductIds.length > 0) {
      offer.products.push(...newProductIds);
      await offer.save();
    }

    await syncOfferProducts(offer._id);

    return res.status(200).json({
      success: true,
      message: "Products added to offer successfully",
      offer,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get a single sales offer by ID
// @route   GET /api/offers/:id
// @access  Public
exports.getOfferById = async (req, res, next) => {
  try {
    const offer = await OfferModel.findById(req.params.id)
      .populate("products", "name price images discountPrice");

    if (!offer) {
      return next(new ErrorResponse("Sales offer not found", 404));
    }

    return res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Remove a product from a sales offer
// @route   POST /api/offers/remove-product
// @access  Private/Admin
exports.removeProductFromOffer = async (req, res, next) => {
  try {
    const { productId, offerId } = req.body;

    if (!productId || !offerId) {
      return next(new ErrorResponse("Please provide a product ID and an offer ID", 400));
    }

    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      return next(new ErrorResponse("Sales offer not found", 404));
    }

    // 1. Remove product from offer's products list
    offer.products = offer.products.filter(id => id.toString() !== productId);
    await offer.save();

    // 2. Clear product's currentOffer and reset discountPrice to manualDiscountPrice
    const product = await ProductModel.findById(productId);
    if (product) {
      product.currentOffer = null;
      product.discountPrice = product.manualDiscountPrice || 0;
      await product.save();
    }

    // 3. Trigger pricing sync helper
    await syncOfferProducts(offerId);

    return res.status(200).json({
      success: true,
      message: "Product removed from offer successfully",
      offer,
    });
  } catch (error) {
    return next(error);
  }
};

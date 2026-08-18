const PackageModel = require("../models/PackageModel");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all solar packages
// @route   GET /api/packages
// @access  Public
exports.getAllPackages = async (req, res, next) => {
  try {
    const { capacityKva, batteryType, inStock } = req.query;
    const filter = {};

    if (capacityKva) {
      filter.capacityKva = Number(capacityKva);
    }
    if (batteryType) {
      filter.batteryType = batteryType;
    }
    if (inStock !== undefined) {
      filter.inStock = inStock === "true";
    }

    const packages = await PackageModel.find(filter)
      .populate("constituents.product")
      .sort({ capacityKva: 1 });

    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get single solar package by ID or Slug
// @route   GET /api/packages/:identifier
// @access  Public
exports.getPackage = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    let pkg;

    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      pkg = await PackageModel.findById(identifier).populate("constituents.product");
    } else {
      pkg = await PackageModel.findOne({ slug: identifier }).populate("constituents.product");
    }

    if (!pkg) {
      return next(new ErrorResponse("Solar package not found", 404));
    }

    return res.status(200).json({
      success: true,
      package: pkg,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Create a solar package
// @route   POST /api/packages
// @access  Private/Admin
exports.createPackage = async (req, res, next) => {
  try {
    const pkg = await PackageModel.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Solar package created successfully",
      package: pkg,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update a solar package
// @route   PUT /api/packages/:id
// @access  Private/Admin
exports.updatePackage = async (req, res, next) => {
  try {
    const pkg = await PackageModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!pkg) {
      return next(new ErrorResponse("Solar package not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Solar package updated successfully",
      package: pkg,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete a solar package
// @route   DELETE /api/packages/:id
// @access  Private/Admin
exports.deletePackage = async (req, res, next) => {
  try {
    const pkg = await PackageModel.findByIdAndDelete(req.params.id);

    if (!pkg) {
      return next(new ErrorResponse("Solar package not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Solar package deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

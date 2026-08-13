const fs = require("fs");
const BannerModel = require("../models/BannerModel");
const ErrorResponse = require("../utils/errorResponse");
const { cloudinary } = require("../utils/cloudinary");

// @desc    Get active banners for customer storefront
// @route   GET /api/banners
// @access  Public
exports.getActiveBanners = async (req, res, next) => {
  try {
    const banners = await BannerModel.find({ isActive: true }).sort({
      order: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: banners.length,
      banners,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all banners for admin management
// @route   GET /api/banners/all
// @access  Private/Admin
exports.getAllBannersAdmin = async (req, res, next) => {
  try {
    const banners = await BannerModel.find({}).sort({
      order: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: banners.length,
      banners,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Create a banner
// @route   POST /api/banners
// @access  Private/SuperAdmin
exports.createBanner = async (req, res, next) => {
  try {
    const { title, subtitle, badge, ctaText, ctaLink, order, isActive, image } =
      req.body;

    if (!title) {
      return next(new ErrorResponse("Banner title is required", 400));
    }

    let bannerImageUrl = image || "";

    // If a file was uploaded through multipart/form-data
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "goSolar/banners",
      });
      bannerImageUrl = uploadResult.secure_url;

      // Clean up local temp file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error removing local temp file:", err);
      });
    }

    if (!bannerImageUrl) {
      return next(
        new ErrorResponse("Please provide or upload a banner image", 400)
      );
    }

    const banner = await BannerModel.create({
      title,
      subtitle: subtitle || "",
      badge: badge || "Special Highlight",
      image: bannerImageUrl,
      ctaText: ctaText || "Explore Now",
      ctaLink: ctaLink || "/shop",
      order: Number(order) || 0,
      isActive: isActive === undefined ? true : Boolean(isActive),
    });

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      banner,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return next(error);
  }
};

// @desc    Update a banner
// @route   PUT /api/banners/:id
// @access  Private/SuperAdmin
exports.updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    let banner = await BannerModel.findById(id);

    if (!banner) {
      return next(new ErrorResponse("Banner not found", 404));
    }

    const { title, subtitle, badge, ctaText, ctaLink, order, isActive, image } =
      req.body;

    let bannerImageUrl = image || banner.image;

    // Handle new uploaded image if provided
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "goSolar/banners",
      });
      bannerImageUrl = uploadResult.secure_url;

      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error removing local temp file:", err);
      });
    }

    banner = await BannerModel.findByIdAndUpdate(
      id,
      {
        title: title || banner.title,
        subtitle: subtitle !== undefined ? subtitle : banner.subtitle,
        badge: badge !== undefined ? badge : banner.badge,
        image: bannerImageUrl,
        ctaText: ctaText || banner.ctaText,
        ctaLink: ctaLink || banner.ctaLink,
        order: order !== undefined ? Number(order) : banner.order,
        isActive: isActive !== undefined ? Boolean(isActive) : banner.isActive,
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      banner,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return next(error);
  }
};

// @desc    Delete a banner
// @route   DELETE /api/banners/:id
// @access  Private/SuperAdmin
exports.deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await BannerModel.findById(id);

    if (!banner) {
      return next(new ErrorResponse("Banner not found", 404));
    }

    await BannerModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Toggle banner active status
// @route   PATCH /api/banners/:id/status
// @access  Private/SuperAdmin
exports.toggleBannerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await BannerModel.findById(id);

    if (!banner) {
      return next(new ErrorResponse("Banner not found", 404));
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    return res.status(200).json({
      success: true,
      message: `Banner ${banner.isActive ? "activated" : "deactivated"} successfully`,
      banner,
    });
  } catch (error) {
    return next(error);
  }
};

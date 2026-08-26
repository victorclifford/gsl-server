const BannerModel = require("../models/BannerModel");
const ErrorResponse = require("../utils/errorResponse");
const { cloudinary, uploadImage } = require("../utils/cloudinary");

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
    const { title, ctaLink, order, isActive, image, placement } =
      req.body;

    if (!title) {
      return next(new ErrorResponse("Banner title/label is required", 400));
    }

    let bannerImageUrl = image || "";
    let bannerImageId = "";

    // If a file was uploaded through multipart/form-data
    if (req.file) {
      const uploadResult = await uploadImage(req.file, {
        folder: "goSolar/banners",
      });
      bannerImageUrl = uploadResult.url;
      bannerImageId = uploadResult.public_id;
    }

    if (!bannerImageUrl) {
      return next(
        new ErrorResponse("Please provide or upload a banner image", 400)
      );
    }

    const banner = await BannerModel.create({
      title,
      image: bannerImageUrl,
      imageId: bannerImageId,
      ctaLink: ctaLink || "/products",
      order: Number(order) || 0,
      isActive: isActive === undefined ? true : Boolean(isActive),
      placement: placement || "storefront_hero",
    });

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      banner,
    });
  } catch (error) {
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

    const { title, ctaLink, order, isActive, image, placement } =
      req.body;

    let bannerImageUrl = image || banner.image;
    let bannerImageId = banner.imageId || "";

    // Handle new uploaded image if provided
    if (req.file) {
      if (banner.imageId) {
        try {
          await cloudinary.uploader.destroy(banner.imageId);
        } catch (cloudinaryError) {
          console.error("Failed to destroy old banner image from Cloudinary:", cloudinaryError);
        }
      }
      const uploadResult = await uploadImage(req.file, {
        folder: "goSolar/banners",
      });
      bannerImageUrl = uploadResult.url;
      bannerImageId = uploadResult.public_id;
    }

    banner = await BannerModel.findByIdAndUpdate(
      id,
      {
        title: title || banner.title,
        image: bannerImageUrl,
        imageId: bannerImageId,
        ctaLink: ctaLink || banner.ctaLink,
        order: order !== undefined ? Number(order) : banner.order,
        isActive: isActive !== undefined ? Boolean(isActive) : banner.isActive,
        placement: placement !== undefined ? placement : banner.placement,
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      banner,
    });
  } catch (error) {
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

    if (banner.imageId) {
      try {
        await cloudinary.uploader.destroy(banner.imageId);
      } catch (cloudinaryError) {
        console.error("Failed to delete banner image from Cloudinary:", cloudinaryError);
      }
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

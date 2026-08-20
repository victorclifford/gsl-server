const AnnouncementModel = require("../models/AnnouncementModel");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get active announcement (Public)
// @route   GET /api/announcements
// @access  Public
exports.getAnnouncement = async (req, res, next) => {
  try {
    let announcement = await AnnouncementModel.findOne();
    if (!announcement) {
      // Create a default inactive one
      announcement = await AnnouncementModel.create({
        text: "⚡ Welcome to GoSolar! Free Shipping on Orders Over ₦2,500,000!",
        isActive: false,
        link: "",
      });
    }
    return res.status(200).json({
      success: true,
      announcement,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update/save announcement settings (Admin)
// @route   PUT /api/announcements
// @access  Private/Admin
exports.updateAnnouncement = async (req, res, next) => {
  try {
    const { text, isActive, link } = req.body;

    if (text === undefined || text === null || text === "") {
      return next(new ErrorResponse("Announcement text cannot be empty", 400));
    }

    let announcement = await AnnouncementModel.findOne();
    if (!announcement) {
      announcement = await AnnouncementModel.create({ text, isActive, link });
    } else {
      announcement.text = text;
      announcement.isActive = isActive;
      announcement.link = link;
      await announcement.save();
    }

    return res.status(200).json({
      success: true,
      message: "Announcement settings updated successfully",
      announcement,
    });
  } catch (error) {
    return next(error);
  }
};

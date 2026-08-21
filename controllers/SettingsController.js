const SettingsModel = require("../models/SettingsModel");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get store settings (Public)
// @route   GET /api/settings
// @access  Public
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await SettingsModel.findOne();
    if (!settings) {
      settings = await SettingsModel.create({});
    }
    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update store settings (Admin)
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = async (req, res, next) => {
  try {
    let settings = await SettingsModel.findOne();
    if (!settings) {
      settings = new SettingsModel(req.body);
    } else {
      // Merge updates
      Object.assign(settings, req.body);
    }

    await settings.save();
    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    return next(error);
  }
};

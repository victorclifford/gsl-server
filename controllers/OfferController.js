const mongoose = require("mongoose");
const Offer = require("../models/OfferModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { slugify } = require("../utils/helpers.js");
const { offerValidationSchema } = require("../utils/validationSchemas");
const { firstLetterInStringToUppercase } = require("../utils/helpers");

exports.createOffer = async (req, res, next) => {
  try {
    const { name, description, type, percentageOff, priceSlash } = req.body;

    //validate user input
    try {
      await offerValidationSchema.validate(req.body, { abortEarly: true });

      if (percentageOff && priceSlash) {
        return next(
          new ErrorResponse(
            "Percentage off and Price slash cannot be used together!",
            400,
            "validationError"
          )
        );
      }
    } catch (e) {
      e.statusCode = 400;
      return next(e);
    }

    const offerName = firstLetterInStringToUppercase(name);
    const offerExist = await Offer.findOne({ name: offerName });
    if (offerExist) {
      return next(
        new ErrorResponse(
          "Another offer with the same name already exists!",
          400,
          "duplicateKeys"
        )
      );
    }

    const offerData = {
      name: firstLetterInStringToUppercase(name),
      type,
      description,
    };

    if (percentageOff) {
      offerData.percentageOff = parseFloat(percentageOff);
    }

    if (priceSlash) {
      offerData.priceSlash = parseInt(priceSlash);
    }

    const newOffer = await Offer.create(offerData);
    if (newOffer) {
      //return response
      return res.status(201).json({
        success: true,
        message: "Offer created successfully",
        offer: newOffer,
      });
    }
  } catch (error) {
    return next(error);
  }
};

//get all categories
exports.getOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find({})
      .sort({
        createdAt: -1,
      })
      .lean();
    return res.status(200).json({
      success: true,
      message: "Offers fetch successful",
      offers,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findOne({ _id: id }).lean();

    if (!offer) {
      return next(new ErrorResponse("Offer not found!", 404, "notFound"));
    }

    return res.status(200).json({
      success: true,
      message: "Offer fetch successful",
      offer,
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateOffer = async (req, res, next) => {
  try {
    const { name, description, percentageOff, priceSlash, type } = req.body;
    const { offerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return next(new ErrorResponse("Invalid offer ID!", 400, "validationError"));
    }

    const offerToBeUpdated = await Offer.findById(offerId);

    if (!offerToBeUpdated) {
      return next(new ErrorResponse("Offer not found!", 404, "notFound"));
    }

    if (name) {
      if (name?.length) {
        if (name.length > 100 || name.length < 2) {
          return next(
            new ErrorResponse(
              "The field 'Name', cannot be more than 100 characters long and lesser than 2 characters",
              400,
              "validationError"
            )
          );
        }
      }
    }

    if (description) {
      if (description?.length) {
        if (description.length > 250 || description.length < 5) {
          return next(
            new ErrorResponse(
              "The field 'Description', cannot be more than 250 characters long and lesser than 5 characters",
              400,
              "validationError"
            )
          );
        }
      }
    }

    if (percentageOff && priceSlash) {
      return next(
        new ErrorResponse(
          "Percentage off and Price slash cannot be used together!",
          400,
          "validationError"
        )
      );
    }

    if (percentageOff) {
      if (parseFloat(percentageOff) > 99) {
        return next(
          new ErrorResponse(
            "The field 'Percentage Off', should be more than 99 percent",
            400,
            "validationError"
          )
        );
      }
    }

    const cleanUpdateData = (updateData) => {
      const cleanedData = Object.keys(updateData).reduce((acc, key) => {
        const value = updateData[key];
        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0)
        ) {
          acc[key] = value;
        }
        return acc;
      }, {});
      return cleanedData;
    };

    const cleanedData = cleanUpdateData(req.body);

    if (percentageOff !== undefined) {
      cleanedData.percentageOff = percentageOff;
    }

    if (priceSlash !== undefined) {
      cleanedData.priceSlash = priceSlash;
    }

    //update document after validations for available fields are complete
    const updatedOffer = await Offer.findOneAndUpdate(
      { _id: offerId },
      { ...cleanedData },
      { new: true }
    );

    if (updatedOffer) {
      return res.status(200).json({
        success: true,
        message: "Offer updated successfully",
        offer: updatedOffer,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update offer!",
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorResponse("Invalid offer ID!", 400, "validationError"));
    }

    const deleted = await Offer.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Offer to delete not found!",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const OfferModel = require("../models/OfferModel");
const ProductModel = require("../models/ProductModel");

/**
 * Synchronizes products associated with a specific Sales Offer.
 * Recalculates discountPrice or restores manualDiscountPrice based on campaign state.
 * @param {string} offerId - The ID of the Offer to synchronize
 */
const syncOfferProducts = async (offerId) => {
  try {
    const offer = await OfferModel.findById(offerId);

    // If offer was deleted, clear references on all products pointing to it
    if (!offer) {
      const affectedProducts = await ProductModel.find({
        currentOffer: offerId,
      });
      for (const product of affectedProducts) {
        product.currentOffer = null;
        product.discountPrice = product.manualDiscountPrice || 0;
        await product.save();
      }
      return;
    }

    const now = new Date();
    const isDateActive =
      (!offer.startDate || now >= new Date(offer.startDate)) &&
      (!offer.endDate || now <= new Date(offer.endDate));
    const isActiveCampaign = offer.isActive && isDateActive;

    const targetProductIds = offer.products.map((id) => id.toString());

    // 1. Restore products that were removed from this offer
    const removedProducts = await ProductModel.find({
      currentOffer: offer._id,
      _id: { $nin: targetProductIds },
    });

    for (const product of removedProducts) {
      product.currentOffer = null;
      product.discountPrice = product.manualDiscountPrice || 0;
      await product.save();
    }

    // 2. Update target products in the offer
    const targetProducts = await ProductModel.find({
      _id: { $in: targetProductIds },
      isDeleted: false,
    });

    for (const product of targetProducts) {
      if (isActiveCampaign) {
        product.currentOffer = offer._id;
        product.discountPrice = Math.round(
          product.price * (1 - offer.percentageOff / 100),
        );
      } else {
        // Keep the association but revert to manual discount or base price
        product.currentOffer = offer._id;
        product.discountPrice = product.manualDiscountPrice || 0;
      }
      await product.save();
    }
  } catch (error) {
    console.error("Error synchronizing offer products:", error);
    throw error;
  }
};

module.exports = { syncOfferProducts };

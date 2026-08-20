const express = require("express");
const {
  getActiveOffers,
  getAllOffersAdmin,
  createOffer,
  updateOffer,
  deleteOffer,
  addProductsToOffer,
} = require("../controllers/OfferController");
const {
  authorizeSuperAdmin,
  authorizeAdmin,
} = require("../middlewares/authorizations");

const router = express.Router();

// Public routes
router.get("/", getActiveOffers);

// Admin routes
router.get("/all", authorizeAdmin, getAllOffersAdmin);
router.post("/", authorizeSuperAdmin, createOffer);
router.post("/add-products", authorizeAdmin, addProductsToOffer);
router.put("/:id", authorizeSuperAdmin, updateOffer);
router.delete("/:id", authorizeSuperAdmin, deleteOffer);

module.exports = router;

const express = require("express");
const {
  getActiveOffers,
  getAllOffersAdmin,
  createOffer,
  updateOffer,
  deleteOffer,
  addProductsToOffer,
  getOfferById,
  removeProductFromOffer,
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
router.post("/remove-product", authorizeAdmin, removeProductFromOffer);
router.put("/:id", authorizeSuperAdmin, updateOffer);
router.delete("/:id", authorizeSuperAdmin, deleteOffer);

// Get single offer by ID (placed last to prevent wildcard collision with /all)
router.get("/:id", getOfferById);

module.exports = router;

const express = require("express");
const { authorizeAdmin } = require("../middlewares/authorizations");
const {
  createOffer,
  getOffers,
  getOffer,
  updateOffer,
  deleteOffer,
} = require("../controllers/OfferController.js");

const router = express.Router();

router.get("/", getOffers);

router.get("/:id", getOffer);

router.post("/create-offer", authorizeAdmin, createOffer);

router.put("/update-offer/:offerId", authorizeAdmin, updateOffer);

router.delete("/delete-offer/:id", authorizeAdmin, deleteOffer);

module.exports = router;

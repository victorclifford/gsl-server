const express = require("express");
const OrderController = require("../controllers/OrderController");
const {
  authorizeUser,
  authorizeAdmin,
} = require("../middlewares/authorizations");

const router = express.Router();

// User placed orders
router.post("/", authorizeUser, OrderController.createOrder);
router.get("/user", authorizeUser, OrderController.getUserOrders);
router.get("/:orderid", authorizeUser, OrderController.getOrder);

// Admin tracking status updates (accept both POST and PUT for frontend compatibility)
router.post(
  "/update-tracking-level",
  authorizeAdmin,
  OrderController.updateOrderTrackingLevel,
);
router.put(
  "/update-tracking-level",
  authorizeAdmin,
  OrderController.updateOrderTrackingLevel,
);

module.exports = router;

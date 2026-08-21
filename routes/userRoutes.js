const express = require("express");
const OrderController = require("../controllers/OrderController");
const { authorizeUser, authorizeAdmin } = require("../middlewares/authorizations");

const router = express.Router();

// create order
router.post("/orders/create-order", authorizeUser, OrderController.createOrder);
router.post("/orders/initialize-payment", authorizeUser, OrderController.initializeOrder);
router.post("/orders/verify-payment", authorizeUser, OrderController.verifyOrderPayment);

router.get("/orders/user-orders", authorizeUser, OrderController.getUserOrders);

// get single order
router.get("/orders/:orderid", OrderController.getOrder);

router.post(
  "/orders/update-tracking-level",
  authorizeAdmin,
  OrderController.updateOrderTrackingLevel
);

module.exports = router;

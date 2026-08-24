const express = require("express");
const {
  requestFinancing,
  getMyRequests,
  getSingleRequest,
  payFinancingStep,
  verifyFinancingPayment,
  adminGetAllRequests,
  adminApproveRequest,
  adminDeclineRequest,
} = require("../controllers/FinancingController");
const {
  authorizeUser,
  authorizeAdmin,
} = require("../middlewares/authorizations");

const router = express.Router();

// User endpoints
router.post("/request", authorizeUser, requestFinancing);
router.get("/my-requests", authorizeUser, getMyRequests);
router.get("/:id", authorizeUser, getSingleRequest);
router.post("/:id/pay", authorizeUser, payFinancingStep);
router.post("/verify-payment", authorizeUser, verifyFinancingPayment);

// Admin endpoints
router.get("/admin/all", authorizeAdmin, adminGetAllRequests);
router.put("/admin/:id/approve", authorizeAdmin, adminApproveRequest);
router.put("/admin/:id/decline", authorizeAdmin, adminDeclineRequest);

module.exports = router;

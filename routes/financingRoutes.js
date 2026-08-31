const express = require("express");
const {
  requestFinancing,
  getSingleRequest,
  adminGetAllRequests,
  adminApproveRequest,
  adminDeclineRequest,
  adminDeleteRequest,
} = require("../controllers/FinancingController");
const {
  authorizeUser,
  authorizeAdmin,
  authorizeSuperAdmin,
} = require("../middlewares/authorizations");
const upload = require("../utils/multer");

const router = express.Router();

// User endpoints
router.post(
  "/request",
  upload.fields([
    { name: "passportPhoto", maxCount: 1 },
    { name: "cacDocument", maxCount: 1 },
  ]),
  requestFinancing
);
router.get("/:id", authorizeUser, getSingleRequest);

// Admin endpoints
router.get("/admin/all", authorizeAdmin, adminGetAllRequests);
router.put("/admin/:id/approve", authorizeAdmin, adminApproveRequest);
router.put("/admin/:id/decline", authorizeAdmin, adminDeclineRequest);
router.delete("/admin/:id/delete", authorizeSuperAdmin, adminDeleteRequest);

module.exports = router;

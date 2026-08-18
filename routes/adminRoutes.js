const express = require("express");
const upload = require("../utils/multer");
const {
  addCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/CategoryController.js");
const {
  authorizeSuperAdmin,
  authorizeAdmin,
} = require("../middlewares/authorizations");
const {
  addProducts,
  updateProduct,
  updateProductImage,
  updateProductsOffer,
} = require("../controllers/ProductController.js");
const BlogController = require("../controllers/BlogController");
const OrderController = require("../controllers/OrderController");
const AdminController = require("../controllers/AdminController");

const router = express.Router();

// create a category
router.post("/create-category", authorizeAdmin, addCategory);

router.patch("/update-category", authorizeAdmin, updateCategory);

router.delete("category/:id", authorizeAdmin, deleteCategory);

//add product
const uploadFields = upload.fields([{ name: "images", maxCount: 5 }]);
router.post("/add-product", authorizeAdmin, uploadFields, addProducts);

//update product(details)
router.patch("/update-product-details", authorizeAdmin, updateProduct);

router.patch("/add-offer-to-products", authorizeAdmin, updateProductsOffer);

//update product(img)
router.patch(
  "/update-product-image",
  authorizeAdmin,
  upload.single("updateImg"),
  updateProductImage,
);

//add blog
router.post(
  "/add-blog",
  authorizeAdmin,
  upload.single("blogImage"),
  BlogController.createBlog,
);

//update blog
router.patch(
  "/update-blog",
  authorizeAdmin,
  upload.single("updateImage"),
  BlogController.updateBlog,
);

router.get("/all-orders", authorizeAdmin, OrderController.getAllOrders);

router.get("/users", authorizeAdmin, AdminController.getUsers);

router.post(
  "/create-account",
  authorizeSuperAdmin,
  AdminController.createAccount,
);

router.get("/users/:userid", authorizeAdmin, AdminController.getUser);

router.get("/admins", authorizeSuperAdmin, AdminController.getAdminUsers);

router.patch(
  "/users/:userid/role",
  authorizeSuperAdmin,
  AdminController.updateUserRole,
);

router.get(
  "/dashboard-stats",
  authorizeAdmin,
  AdminController.getDashboardStats,
);

module.exports = router;

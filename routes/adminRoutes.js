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
} = require("../controllers/ProductController.js");
const BlogController = require("../controllers/BlogController");
const OrderController = require("../controllers/OrderController");
const AdminController = require("../controllers/AdminController");

const router = express.Router();

// create a category
router.post("/create-category", authorizeSuperAdmin, addCategory);

router.patch("/update-category", authorizeSuperAdmin, updateCategory);

router.delete("category/:id", authorizeSuperAdmin, deleteCategory);

//add product
const uploadFields = upload.fields([{ name: "images", maxCount: 5 }]);
router.post("/add-product", authorizeSuperAdmin, uploadFields, addProducts);

//update product(details)
router.patch("/update-product-details", updateProduct);

//update product(img)
router.patch(
  "/update-product-image",
  authorizeSuperAdmin,
  upload.single("updateImg"),
  updateProductImage
);

//add blog
router.post(
  "/add-blog",
  authorizeSuperAdmin,
  upload.single("blogImage"),
  BlogController.createBlog
);

//update blog
router.patch(
  "/update-blog",
  authorizeSuperAdmin,
  upload.single("updateImage"),
  BlogController.updateBlog
);

router.get("/all-orders", authorizeAdmin, OrderController.getAllOrders);

router.get("/users", authorizeAdmin, AdminController.getUsers);

router.post("/create-account", authorizeAdmin, AdminController.createAccount);

router.get("/users/:userid", authorizeAdmin, AdminController.getUser);

router.get("/admins", authorizeAdmin, AdminController.getAdminUsers);

router.patch(
  "/users/:userid/role",
  authorizeSuperAdmin,
  AdminController.updateUserRole
);

router.get(
  "/dashboard-stats",
  authorizeAdmin,
  AdminController.getDashboardStats
);

module.exports = router;

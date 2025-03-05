const express = require("express");
const router = express.Router();
const {
  getLogin,
  doLogin,
  doLogout,
} = require("../controllers/admin/adminController");

const { isLogin, isLogout } = require("../middlewares/adminAuth");
const { usersPage, blockUser } = require("../controllers/admin/UserManagement");
const uploadImages = require("../middlewares/multer");

const {
  addCategoryPage,
  addNewCategory,
  showCategoryPage,
  unListCategory,
  showEditCategory,
  updateCategory,
} = require("../controllers/admin/categoryManagement");

const {
  showProduct,
  addProductPage,
  addProduct,
  blockProduct,
  showeditProduct,
  updateProduct,
  deleteProdImage,
} = require("../controllers/admin/productManagement");

const { ordersPage, orderDetails, changeStatus } = require("../controllers/admin/ordersManagement");

// 🔹 Admin Authentication Routes
router.get("/login", isLogout, getLogin);
router.post("/login", isLogout, doLogin);
router.get("/logout", isLogin, doLogout);  // 🔹 Ensure only logged-in admins can log out

// 🔹 Admin Dashboard
router.get("/home", isLogin, (req, res) => {
  res.render("admin/home", { layout: "adminLayout" });
});

// 🔹 User Management
router.get("/users", isLogin, usersPage);
router.put("/blockuser", isLogin, blockUser);

// 🔹 Product Management
router.get("/product", isLogin, showProduct);
router.get("/addProduct", isLogin, addProductPage);
router.post("/addProduct", isLogin, uploadImages.productImages, addProduct);
router.put("/blockProduct", isLogin, blockProduct);
router.post("/unlistCategory", isLogin, unListCategory);
router.get("/editProduct/:id", isLogin, showeditProduct);
router.post("/updateProduct/:id", isLogin, uploadImages.productImages, updateProduct);
router.delete("/product_img_delete", isLogin, deleteProdImage);

// 🔹 Category Management
router.get("/addCategory", isLogin, addCategoryPage);
router.post("/addCategory", isLogin, uploadImages.categoryImage, addNewCategory);
router.get("/category", isLogin, showCategoryPage);
router.get("/editCategory/:id", isLogin, showEditCategory);
router.post("/updateCategory/:id", isLogin, uploadImages.categoryImage, updateCategory);

// 🔹 Orders Page
router.get('/orders', isLogin, ordersPage);
router.get('/order_details/:id', isLogin, orderDetails);
router.post('/change_status/:id', isLogin, changeStatus);

module.exports = router;

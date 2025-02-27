const express = require("express");
const router = express.Router();
const {
  getLogin,
  doLogin,
  doLogout,
} = require("../controllers/admin/adminController");
const { isLogin, isLogout } = require("../middlewares/adminAuth");
const { usersPage, blockUser } = require("../controllers/admin/UserManagement");
const uploadImages = require("../middlewares/multer"); // Import updated multer middleware
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

// Admin Authentication Routes
router.get("/login", isLogout, getLogin);
router.post("/login", isLogout, doLogin);
router.get("/logout", doLogout);

// Admin Home Route
router.get("/home", isLogin, (req, res) => {
  res.render("admin/home", { layout: "adminLayout" });
});

// User Management Routes
router.get("/users", isLogin, usersPage);
router.put("/blockuser", isLogin, blockUser);

// Product Management Routes
router.get("/product", isLogin, showProduct);
router.get("/addProduct", isLogin, addProductPage);
router.post("/addProduct", isLogin, uploadImages.productImages, addProduct);
router.put("/blockProduct", isLogin, blockProduct);
router.post("/unlistCategory", isLogin, unListCategory);
router.get("/editProduct/:id", isLogin, showeditProduct);
router.post("/updateProduct/:id", isLogin, uploadImages.productImages, updateProduct);
router.delete("/product_img_delete", isLogin, deleteProdImage);

// Category Management Routes
router.get("/addCategory", isLogin, addCategoryPage);
router.post("/addCategory", isLogin, uploadImages.categoryImage, addNewCategory);
router.get("/category", isLogin, showCategoryPage);
router.get("/editCategory/:id", isLogin, showEditCategory);
router.post("/updateCategory/:id", isLogin, uploadImages.categoryImage, updateCategory);

module.exports = router;

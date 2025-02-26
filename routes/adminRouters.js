const express = require("express");
const router = express.Router();
const {
  getLogin,
  doLogin,
  doLogout,
} = require("../controllers/admin/adminController");
const { isLogin, isLogout } = require("../middlewares/adminAuth");
const { usersPage, blockUser } = require("../controllers/admin/UserManagement");
const {
  addCategoryPage,
  addNewCategory,
  showCategoryPage,
  unListCategory,
  showEditCategory,
  updateCategory,
} = require("../controllers/admin/categoryManagement");
const store = require("../middlewares/multer");
const {
  showProduct,
  addProductPage,
  addProduct,
  blockProduct,
  showeditProduct,
  updateProduct,
  deleteProdImage,
} = require("../controllers/admin/productManagement");

// Admin login routes
router.get("/login", isLogout, getLogin);
router.post("/login", isLogout, doLogin);
router.get("/logout", doLogout);

// Admin home route
router.get("/home", isLogin, (req, res) => {
  res.render("admin/home", { layout: "adminLayout" });
});

// Users Page
router.get("/users", isLogin, usersPage);
router.put("/blockuser", isLogin, blockUser);

// Category Page

router.get("/addCategory", isLogin, addCategoryPage);
router.post("/addCategory", isLogin, store.single("image"), addNewCategory);
router.get("/category", isLogin, showCategoryPage);
router.get("/editCategory/:id", showEditCategory);
router.post("/updateCategory/:id", store.single("image"), updateCategory);
router.post("/unlistCategory", isLogin, unListCategory);

// Product Page

router.get("/product", showProduct);
router.get("/addProduct", isLogin, addProductPage);
router.post("/addProduct", isLogin, store.array("image", 5), addProduct);
router.put("/blockProduct", isLogin, blockProduct);
router.post("/unlistCategory", isLogin, unListCategory);
router.get("/editProduct/:id", isLogin, showeditProduct);
router.post(
  "/updateProduct/:id",
  isLogin,
  store.array("image", 5),
  updateProduct
);
router.delete("/product_img_delete", isLogin, deleteProdImage);

module.exports = router;

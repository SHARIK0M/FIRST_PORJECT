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

const { couponPage, addCouponPage, addCouponPost, editCouponPage, editCouponPost, deleteCoupon } = require('../controllers/admin/couponManagement');


const { ordersPage, orderDetails, changeStatus } = require("../controllers/admin/ordersManagement");

const{ productOfferPage, addProductOfferPage, addProductOffer, editProductOfferPage, editProductOffer, deleteProductOffer, categoryOfferPage, addCategoryOfferPage, addCategoryOffer, editCategoryOfferPage, editCategoryOffer, deleteCategoryOffer } = require('../controllers/admin/offerManagement');


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
router.get("/add-product", isLogin, addProductPage);
router.post("/add-product", isLogin, uploadImages.productImages, addProduct);
router.put("/block-product", isLogin, blockProduct);
router.post("/unlist-category", isLogin, unListCategory);
router.get("/edit-product/:id", isLogin, showeditProduct);
router.post("/update-product/:id", isLogin, uploadImages.productImages, updateProduct);
router.delete("/product-image-delete", isLogin, deleteProdImage);

// 🔹 Category Management
router.get("/add-category", isLogin, addCategoryPage);
router.post("/add-category", isLogin, uploadImages.categoryImage, addNewCategory);
router.get("/category", isLogin, showCategoryPage);
router.get("/edit-category/:id", isLogin, showEditCategory);
router.post("/update-category/:id", isLogin, uploadImages.categoryImage, updateCategory);

// 🔹 Orders Page
router.get('/orders', isLogin, ordersPage);
router.get('/order-details/:id', isLogin, orderDetails);
router.post('/change-status/:id', isLogin, changeStatus);

// coupon
router.get('/coupons',isLogin,couponPage)
router.get('/addcoupon',isLogin,addCouponPage)
router.post('/add_coupon', isLogin, addCouponPost)
router.get('/editcoupon/:id', editCouponPage);
router.post('/editcoupon/:id', editCouponPost);
router.delete('/delete_coupon',isLogin,deleteCoupon)


router.get('/productOffers', isLogin, productOfferPage)
router.get('/addProOffers', isLogin, addProductOfferPage)
router.post('/addProOffers', isLogin, addProductOffer)
router.get('/editProductOffer/:id', isLogin, editProductOfferPage)
router.post("/editProductOffer/:id", isLogin, editProductOffer);
router.delete('/deleteProOffer/:id', isLogin, deleteProductOffer)

router.get('/categoryOffers', isLogin, categoryOfferPage)
router.get('/addCatOffers', isLogin, addCategoryOfferPage)
router.post('/addCatOffers', isLogin, addCategoryOffer)
router.get('/editCategoryOffer/:id', isLogin, editCategoryOfferPage)
router.post("/editCategoryOffer/:id", isLogin, editCategoryOffer);
router.delete('/deleteCatOffer/:id', isLogin, deleteCategoryOffer)


module.exports = router;

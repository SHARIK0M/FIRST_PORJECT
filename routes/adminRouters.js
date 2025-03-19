const express = require("express");
const router = express.Router();
const {getLogin,doLogin,doLogout,} = require("../controllers/admin/adminController");
const { isLogin, isLogout } = require("../middlewares/adminAuth");
const { usersPage, blockUser } = require("../controllers/admin/UserManagement");
const uploadImages = require("../middlewares/multer");
const {addCategoryPage,addNewCategory,showCategoryPage,unListCategory,showEditCategory,updateCategory,} = require("../controllers/admin/categoryManagement");
const {showProduct,addProductPage,addProduct,blockProduct,showeditProduct,updateProduct,deleteProdImage,} = require("../controllers/admin/productManagement");
const { couponPage, addCouponPage, addCouponPost, editCouponPage, editCouponPost, deleteCoupon } = require('../controllers/admin/couponManagement');
const { ordersPage, orderDetails, changeStatus } = require("../controllers/admin/ordersManagement");
const{ productOfferPage, addProductOfferPage, addProductOffer, editProductOfferPage, editProductOffer, deleteProductOffer, categoryOfferPage, addCategoryOfferPage, addCategoryOffer, editCategoryOfferPage, editCategoryOffer, deleteCategoryOffer } = require('../controllers/admin/offerManagement');
const {  loadDashboard, getSales,getChartData}=require('../controllers/admin/dashBoardManagement');
const { walletManagement, transactionDetails } = require('../controllers/admin/walletManagement');



// 🔹 Admin Authentication Routes
router.get("/login", isLogout, getLogin);
router.post("/login", isLogout, doLogin);
router.get("/logout", isLogin, doLogout); 

// 🔹 Admin Dashboard
router.get('/home', isLogin, loadDashboard)


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

// 🔹 Coupon Page
router.get('/coupons',isLogin,couponPage)
router.get('/add-coupon',isLogin,addCouponPage)
router.post('/add-coupon', isLogin, addCouponPost)
router.get('/edit-coupon/:id', editCouponPage);
router.post('/edit-coupon/:id', editCouponPost);
router.delete('/delete-coupon',isLogin,deleteCoupon)

// 🔹 productOffer Page
router.get('/productOffers', isLogin, productOfferPage)
router.get('/add-ProductOffers', isLogin, addProductOfferPage)
router.post('/add-ProductOffers', isLogin, addProductOffer)
router.get('/edit-ProductOffer/:id', isLogin, editProductOfferPage)
router.post("/edit-ProductOffer/:id", isLogin, editProductOffer);
router.delete('/delete-ProductOffer/:id', isLogin, deleteProductOffer)

// 🔹 CategoryOffer Page
router.get('/categoryOffers', isLogin, categoryOfferPage)
router.get('/add-CategoryOffers', isLogin, addCategoryOfferPage)
router.post('/add-CategoryOffers', isLogin, addCategoryOffer)
router.get('/edit-CategoryOffer/:id', isLogin, editCategoryOfferPage)
router.post("/edit-CategoryOffer/:id", isLogin, editCategoryOffer);
router.delete('/delete-CategoryOffer/:id', isLogin, deleteCategoryOffer)

// 🔹 Sales Page
router.get('/get-sales',isLogin, getSales)
router.get('/get_chart_data',isLogin, getChartData)


router.get('/wallet' , walletManagement)
router.get('/wallet/:transactionId', transactionDetails);

module.exports = router;

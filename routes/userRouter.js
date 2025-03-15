const express = require("express");
const router = express.Router();
const passport = require("passport");
require("../middlewares/googleAuth");
const { logedout, logedin, isBlocked } = require("../middlewares/userAuth");
const {getHome,getLogin,getSignup,doSignup,getOtp,submitOtp,resendOtp,doLogin,doLogout,googleCallback,productDetails,verifyReferelCode,} = require("../controllers/user/userController");
const {showError} = require("../controllers/user/errorController");
const {submitMail,submitMailPost,forgotOtppage,forgotOtpSubmit,resetPasswordPage,resetPassword,resendOTP} = require("../controllers/user/forgotPassword");
const { getProduct, searchAndSort } = require("../controllers/user/shopManagement");
const { viewUserProfile, EditUserProfile, updateUserProfile, changePassword, updatePassword, my_Orders, orderDetails ,sendOTP,verifyOTP,  verify,walletpage,retryPayment} = require('../controllers/user/profile');
const { addAddress, addAddressPost, manageAddress,  editAddressPost, deleteAddress ,checkAddressPost} = require('../controllers/user/addressManagement');
const { loadCartPage, addToCart, removeFromCart, updateCart, checkOutOfStock } = require('../controllers/user/cart');
const { loadCheckoutPage, placeorder, orderSuccess , validateCoupon,applyCoupon,removeCoupon,} = require('../controllers/user/checkoutManagement');
const { payment_failed, cancelOrder, returnOrder, cancelOneProduct, returnOneProduct ,generateInvoice} = require('../controllers/user/orderManagement');
const { showWishlistPage, addToWishList, removeFromWishList,checkWishlist } = require('../controllers/user/wishlistManagement')
const uploadImages = require("../middlewares/multer");
const { addMoneyToWallet , verifyPayment }= require('../controllers/user/walletManagement')



// 🔹 Google authentication
router.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), googleCallback);

router.use(isBlocked);
// 🔹 Home Page
router.get("/", getHome);

// 🔹 Login & Logout
router.get("/login", logedout, getLogin);
router.post('/login', doLogin);
router.get('/logout', logedin, doLogout);

// 🔹 Signup
router.get("/signup", logedout, getSignup);
router.post('/signup', logedout, doSignup);

// 🔹 OTP Verification
router.get('/otp/submit', logedout, getOtp);
router.post('/otp/submit', logedout, submitOtp);
router.get('/otp/resend', logedout, resendOtp);

// 🔹 Forgot Password
router.get('/password/forgot', logedout, submitMail);
router.post('/password/forgot', logedout, submitMailPost);
router.get('/password/otp', logedout, forgotOtppage);
router.post('/password/otp', forgotOtpSubmit);
router.post('/password/otp/resend', resendOTP);
router.get('/password/reset', logedout, resetPasswordPage);
router.post('/password/reset', logedout, resetPassword);

// 🔹 Shop Page
router.get('/shop', getProduct);
router.post('/search', searchAndSort);

// 🔹 Product Detail Page
router.get('/product/:id', productDetails);

// 🔹 User Profile Page
router.get('/profile', isBlocked, logedin, viewUserProfile);
router.get('/profile/edit', isBlocked, logedin, EditUserProfile);
router.post('/profile/edit/:id', isBlocked, logedin, uploadImages.profileImage, updateUserProfile);
router.get('/profile/password', isBlocked, logedin, changePassword);
router.post('/profile/password/update', isBlocked, logedin, updatePassword);
router.post("/profile/otp/send", logedin, sendOTP);
router.post("/profile/otp/verify", logedin, verifyOTP);

// 🔹 Address Management
router.get('/address/add', isBlocked, logedin, addAddress);
router.get('/addresses', isBlocked, logedin, manageAddress);
router.post('/address/add', isBlocked, logedin, addAddressPost);
router.post('/address/edit/:id', isBlocked, logedin, editAddressPost);
router.delete('/address/delete/:id', isBlocked, logedin, deleteAddress);

// 🔹 Order Management
router.get('/orders', isBlocked, logedin, my_Orders);
router.get('/order/:id', isBlocked, logedin, orderDetails);

// 🔹 Cart Management
router.get('/cart', isBlocked, logedin, loadCartPage);
router.post('/cart/add/:id', isBlocked, logedin, addToCart);
router.post('/cart/remove', isBlocked, logedin, removeFromCart);
router.post('/cart/update', isBlocked, logedin, updateCart);
router.post('/cart/check-stock', checkOutOfStock);

// 🔹 Checkout
router.get('/checkout', isBlocked, logedin, loadCheckoutPage);
router.post('/checkout/address/check', checkAddressPost);
router.post('/checkout/place-order', isBlocked, logedin, placeorder);
router.get('/checkout/success', isBlocked, logedin, orderSuccess);
router.get('/checkout/payment-failed', isBlocked, logedin, payment_failed);


// 🔹 Cancel & Return Orders
router.put('/order/cancel/:id', isBlocked, logedin, cancelOrder);
router.put('/order/return/:id', isBlocked, logedin, returnOrder);  
router.put('/order/item/cancel', isBlocked, logedin, cancelOneProduct);
router.put('/order/item/return', isBlocked, logedin, returnOneProduct);

// 🔹 Wishlist Page
router.get('/wishlist', logedin, isBlocked, showWishlistPage)
router.post('/addtowishlist', logedin, isBlocked, addToWishList)
router.post('/removeFromWishList', logedin, isBlocked, removeFromWishList)
router.post('/checkwishlist', checkWishlist);


// 🔹 coupon Page
router.post('/coupon/validate', logedin, isBlocked, validateCoupon)
router.post('/coupon/apply',logedin, isBlocked, applyCoupon)
router.post('/coupon/remove', logedin, isBlocked, removeCoupon)


// 🔹 Wallet Page
router.get('/wallet', logedin, isBlocked,walletpage)
router.post('/addmoneytowallet', logedin, isBlocked,addMoneyToWallet)
router.post('/verifypayment', logedin, isBlocked,verifyPayment)
router.post('/verifyPayment', logedin, isBlocked, verify)
router.post('/retrypayment/:id',logedin, isBlocked, retryPayment)

// 🔹 Referal Page
router.post('/verifyReferalCode',verifyReferelCode)


// 🔹 Invoice Page
router.get('/invoice', logedin, isBlocked, generateInvoice)

// 🔹 Error Page
router.get("/error",logedin,isBlocked,showError)


module.exports = router;

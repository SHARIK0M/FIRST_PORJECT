const express = require("express");
const router = express.Router();
const passport = require("passport");
require("../middlewares/googleAuth");

const { logedout, logedin, isBlocked } = require("../middlewares/userAuth");
const {
  getHome,
  getLogin,
  getSignup,
  doSignup,
  getOtp,
  submitOtp,
  resendOtp,
  doLogin,
  doLogout,
  googleCallback,
  productDetails,
} = require("../controllers/user/userController");

const {
  submitMail,
  submitMailPost,
  forgotOtppage,
  forgotOtpSubmit,
  resetPasswordPage,
  resetPassword,
  resendOTP
 
} = require("../controllers/user/forgotPassword");

const { getProduct, searchAndSort } = require("../controllers/user/shopManagement");

const { 
  viewUserProfile, EditUserProfile, updateUserProfile, changePassword, updatePassword, 
  my_Orders, orderDetails 
} = require('../controllers/user/profile');

const { 
  addAddress, addAddressPost, manageAddress,  editAddressPost, deleteAddress ,checkAddressPost
} = require('../controllers/user/addressManagement');

const { 
  loadCartPage, addToCart, removeFromCart, updateCart, checkOutOfStock 
} = require('../controllers/user/cart');

const { 
  loadCheckoutPage, placeorder, orderSuccess 
} = require('../controllers/user/checkoutManagement');

const { 
  payment_failed, cancelOrder, returnOrder, cancelOneProduct, returnOneProduct ,generateInvoice
} = require('../controllers/user/orderManagement');

const { showWishlistPage, addToWishList, removeFromWishList,checkWishlist } = require('../controllers/user/wishlistManagement')


const uploadImages = require("../middlewares/multer"); // Import updated multer middleware

// 🔹 Google authentication
router.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), googleCallback);

router.use(isBlocked);
// 🔹 Home Page
router.get("/", getHome);

// 🔹 Login & Logout
router.get("/login", logedout, getLogin);
router.post('/login', doLogin);
router.get('/logout', logedin, doLogout); // Ensure only logged-in users can log out

// 🔹 Signup
router.get("/signup", logedout, getSignup);
router.post('/signup', logedout, doSignup);

// 🔹 OTP Verification
router.get('/submit_otp', logedout, getOtp);
router.post('/submit_otp', logedout, submitOtp);
router.get('/resend_Otp', logedout, resendOtp);

// 🔹 Forgot Password
router.get('/forgotPassword', logedout, submitMail);
router.post('/forgotPassword', logedout, submitMailPost);
router.get('/otp', logedout, forgotOtppage);
router.post('/otp', forgotOtpSubmit);
router.post('/otp/resend', resendOTP);
router.get('/resetPassword', logedout, resetPasswordPage);
router.post('/resetPassword', logedout, resetPassword);

// 🔹 Shop Page
router.get('/shop', getProduct);
router.post('/search', searchAndSort);

// 🔹 Product Detail Page
router.get('/productDetails/:id', productDetails);

// 🔹 User Profile Page (Ensure blocked users can't access)
router.get('/profile', isBlocked, logedin, viewUserProfile);
router.get('/edit_profile', isBlocked, logedin, EditUserProfile);
router.post('/edit_profile/:id', isBlocked, logedin, uploadImages.profileImage, updateUserProfile);
router.get('/changePassword', isBlocked, logedin, changePassword);
router.post('/updatePassword', isBlocked, logedin, updatePassword);

// 🔹 Address Management
router.get('/add_address', isBlocked, logedin, addAddress);
router.get('/addresses', isBlocked, logedin, manageAddress);
router.post('/add_address', isBlocked, logedin, addAddressPost);
router.post('/edit_address/:id', isBlocked, logedin, editAddressPost);
router.delete('/delete_address/:id', isBlocked, logedin, deleteAddress);

// 🔹 Order Management
router.get('/myOrders', isBlocked, logedin, my_Orders);
router.get('/orderDetails/:id', isBlocked, logedin, orderDetails);

// 🔹 Cart Management
router.get('/cart', isBlocked, logedin, loadCartPage);
router.post('/addtocart/:id', isBlocked, logedin, addToCart);
router.post('/removeFromCart', isBlocked, logedin, removeFromCart);
router.post('/updatecart', isBlocked, logedin, updateCart);
router.post('/checkOutOfStock', checkOutOfStock);

// 🔹 Checkout
router.get('/cart/checkout', isBlocked, logedin, loadCheckoutPage);
router.post('/check_addaddress', checkAddressPost);
router.post('/placeorder', isBlocked, logedin, placeorder);
router.get('/orderPlaced', isBlocked, logedin, orderSuccess);
router.get('/payment_failed', isBlocked, logedin, payment_failed);

// 🔹 Cancel & Return Orders
router.put('/cancel-order/:id', isBlocked, logedin, cancelOrder);
router.put('/return-order/:id', isBlocked, logedin, returnOrder);
router.put('/cancel-one-product', isBlocked, logedin, cancelOneProduct);
router.put('/return-one-product', isBlocked, logedin, returnOneProduct);

// Wishlist Page

router.get('/wishlist', logedin, isBlocked, showWishlistPage)
router.post('/addtowishlist', logedin, isBlocked, addToWishList)
router.post('/removeFromWishList', logedin, isBlocked, removeFromWishList)
router.post('/checkwishlist', checkWishlist);


router.get('/get_invoice', logedin, isBlocked, generateInvoice)


module.exports = router;

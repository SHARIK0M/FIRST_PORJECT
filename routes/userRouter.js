const express = require("express");
const router = express.Router();
const { logedout, checkUserBlocked } = require("../middlewares/userAuth");
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
  resendOTP,
} = require("../controllers/user/forgotPassword");
require("../middlewares/googleAuth");
const passport = require("passport");
const {
  getProduct,
  searchAndSort,
} = require("../controllers/user/shopManagement");

// Apply `checkUserBlocked` middleware to all routes that require authentication
router.get("/", checkUserBlocked, getHome);
router.get("/shop", checkUserBlocked, getProduct);
router.get("/productDetails/:id", checkUserBlocked, productDetails);
router.post("/search", checkUserBlocked, searchAndSort);

// Signup
router.get("/signup", logedout, getSignup);
router.post("/signup", logedout, doSignup);

// Submit Otp & Resend Otp
router.get("/submit_otp", logedout, getOtp);
router.post("/submit_otp", logedout, submitOtp);
router.get("/resend_otp", logedout, resendOtp);

// Google authentication
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  googleCallback
);

// Login & Logout
router.get("/login", logedout, getLogin);
router.post("/login", doLogin);
router.get("/logout", doLogout);

// Forgot Password
router.get("/forgotPassword", logedout, submitMail);
router.post("/forgotPassword", logedout, submitMailPost);
router.get("/otp", logedout, forgotOtppage);
router.post("/otp", forgotOtpSubmit);
router.get("/resetPassword", logedout, resetPasswordPage);
router.post("/resetPassword", resetPassword);
router.post("/resend_OTP", resendOTP);

module.exports = router;

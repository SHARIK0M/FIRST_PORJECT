const express = require("express");
const router = express.Router();
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
} = require("../controllers/user/forgotPassword");

require("../middlewares/googleAuth");
const passport = require("passport");
const store = require("../middlewares/multer");

const {
  getProduct,
  searchAndSort,
} = require("../controllers/user/shopManagement");

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

// Get Home Page
router.get("/", getHome);

// Login & Logout
router.get("/login", logedout, getLogin);
router.post("/login", doLogin);
router.get("/logout", doLogout);

// Signup
router.get("/signup", logedout, getSignup);
router.post("/signup", logedout, doSignup);

// Submit Otp & Resend Otp
router.get("/submit_otp", logedout, getOtp);
router.post("/submit_otp", logedout, submitOtp);
router.get("/resend_otp", logedout, resendOtp);

router.get("/shop", getProduct);
router.post("/search", searchAndSort);
router.get("/productDetails/:id", productDetails);

router.get("/forgotPassword", logedout, submitMail);
router.post("/forgotPassword", logedout, submitMailPost);
router.get("/otp", logedout, forgotOtppage);
router.post("/otp", forgotOtpSubmit);
router.get("/resetPassword", logedout, resetPasswordPage);
router.post("/resetPassword", resetPassword);

module.exports = router;

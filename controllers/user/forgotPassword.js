const userHelper = require("../../helpers/user.helper");
const User = require("../../models/userSchema");
const argon = require("argon2");
const HttpStatus = require("../../httpStatus");

// Render Email Submission Page for Forgot Password
const submitMail = async (req, res) => {
  try {
    const mailError = req.session.mailError ? "Invalid User" : null;
    req.session.mailError = false;
    res.render("user/forgotPassword/mailSubmit", { mailError });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Handle Forgot Password Email Submission
const submitMailPost = async (req, res) => {
  try {
    const email = req.body.email;
    const userData = await User.findOne({ email }).lean();

    if (userData) {
      const otp = await userHelper.verifyEmail(email);
      req.session.userResetData = { email };
      req.session.otp = otp;
      res.redirect("/otp");
    } else {
      req.session.mailError = true;
      res.redirect("/forgotPassword");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Render OTP Submission Page
const forgotOtppage = async (req, res) => {
  try {
    const otpErr = req.session.otpErr ? "Incorrect OTP!" : null;
    req.session.otpErr = false;
    res.render("user/forgotPassword/submitOtp", { otpErr });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Handle OTP Submission
const forgotOtpSubmit = async (req, res) => {
  try {
    const { otp } = req.body;
    const storedOtp = req.session.otp;

    if (!storedOtp) {
      return res.status(400).json({ error: "Session expired. Please request a new OTP." });
    }

    if (otp.trim() === storedOtp.toString().trim()) {
      req.session.otp = null; // Clear OTP after successful verification
      return res.status(200).json({ redirect: "/resetPassword" });
    } else {
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};



// Resend OTP for Forgot Password
const resendOTP = async (req, res) => {
  try {
    const email = req.session.userResetData?.email;
    if (!email) {
      return res
        .status(400)
        .json({
          error: "No email found in session. Please submit your email first.",
        });
    }

    const otp = await userHelper.verifyEmail(email);
    req.session.otp = otp;
    req.session.otpTimestamp = Date.now();
    return res.json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res
      .status(500)
      .json({ error: "Error resending OTP. Please try again later." });
  }
};

// Render Reset Password Page
const resetPasswordPage = async (req, res) => {
  try {
    res.render("user/forgotPassword/resetPassword");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Handle Password Reset Submission
const resetPassword = async (req, res) => {
  try {
    if (!req.session.userResetData?.email) {
      return res
        .status(400)
        .send({ error: "User email not found in session." });
    }

    const email = req.session.userResetData.email;
    const hashedPassword = await userHelper.hashPassword(req.body.password);

    await User.updateOne({ email }, { $set: { password: hashedPassword } });

    req.session.userResetData = null;
    req.session.successMessage = true;

    res.redirect("/login");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  submitMail,
  submitMailPost,
  forgotOtppage,
  forgotOtpSubmit,
  resetPassword,
  resetPasswordPage,
  resendOTP
};
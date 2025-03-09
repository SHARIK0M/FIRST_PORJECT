const userHelper = require("../../helpers/user.helper");
const User = require("../../models/userSchema");


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
      const otpResponse = await userHelper.verifyEmail(email);
      const otp = otpResponse.otp || otpResponse; // Extract OTP value if it's inside an object

      console.log("Generated OTP:", otp);

      req.session.userResetData = { email };
      req.session.otp = String(otp); // Store only the OTP as a string
      req.session.otpTimestamp = Date.now() + 60 * 1000; // OTP expires in 60 seconds

      res.redirect("/password/otp");
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
    let storedOtp = req.session.otp;
    const otpTimestamp = req.session.otpTimestamp;


    if (!storedOtp || !otpTimestamp) {
      console.log("Error: OTP session expired or not found.");
      return res.status(400).json({ error: "Session expired. Please request a new OTP." });
    }

    if (Date.now() > otpTimestamp) {
      console.log("Error: OTP expired.");
      req.session.otp = null;
      req.session.otpTimestamp = null;
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }

    storedOtp = String(storedOtp); // Convert stored OTP to a string
    if (otp.trim() === storedOtp.trim()) {
      req.session.otp = null;
      req.session.otpTimestamp = null;
      return res.json({ redirect: "/resetPassword" });
    } else {
      console.log("❌ Error: Invalid OTP entered.");
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
      console.log("Error: No email found in session.");
      return res.status(400).json({ error: "No email found in session. Please submit your email first." });
    }

    const otpResponse = await userHelper.verifyEmail(email);
    const otp = otpResponse.otp || otpResponse; // Extract OTP value if it's inside an object

    console.log("Generated Resend OTP:", otp);

    req.session.otp = String(otp); // Store only the OTP as a string
    req.session.otpTimestamp = Date.now() + 60 * 1000; // Reset OTP expiry


    return res.json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({ error: "Error resending OTP. Please try again later." });
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
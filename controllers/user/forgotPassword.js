const userHelper = require("../../helpers/user.helper");
const User = require("../../models/userSchema");
const argon = require("argon2");
const HttpStatus = require('../../httpStatus');


let otp;
let email;


const submitMail = async (req, res) => {
  try {
    const mailError = "Invalid User";
    if (req.session.mailError) {
      res.render("user/forgotPassword/mailSubmit", { mailError });
      req.session.mailError = false;
    } else {
      res.render("user/forgotPassword/mailSubmit");
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



const submitMailPost = async (req, res) => {
  try {
    email = req.body.email;
    const userData = await User.findOne({ email: email }).lean();
    console.log(userData);
    if (userData) {
      otp = await userHelper.verifyEmail(email);
      console.log(otp);
      res.redirect("/otp");
    } else {
      req.session.mailError = true;
      res.redirect("/forgotPassword");
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



const forgotOtppage = async (req, res) => {
  try {
    const otpErr = "Incorrect otp..!!";

    if (req.session.otpErr) {
      console.log("OTP Error:", req.session.otpErr);
      res.render("user/forgotPassword/submitOtp", { otpErr });
    } else {
      res.render("user/forgotPassword/submitOtp");
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



const forgotOtpSubmit = async (req, res) => {
  let enteredOtp = req.body.otp;

  console.log("Entered OTP:", enteredOtp);
  console.log("Stored OTP:", otp);

  if (enteredOtp === otp) {
    res.redirect("/resetPassword");
  } else {
    req.session.otpErr = true;
    console.log("Incorrect OTP. Redirecting to /otp");
    res.redirect("/otp");
  }
};



const resetPasswordPage = async (req, res) => {
  try {
    res.render("user/forgotPassword/resetPassword");
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



const resetPassword = async (req, res) => {
  try {
    hashedPassword = await userHelper.hashPassword(req.body.password);

    await User.updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );
    req.session.successMessage = true;
    res.redirect("/login");
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};


module.exports = {
  submitMail,
  submitMailPost,
  forgotOtppage,
  forgotOtpSubmit,
  resetPassword,
  resetPasswordPage,
};

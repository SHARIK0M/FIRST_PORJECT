const User = require("../../models/userSchema");
const argon2 = require("argon2");
const userHelper = require("../../helpers/user.helper");
const mongoose = require("mongoose");
const HttpStatus = require("../../httpStatus");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");


let otp, userOtp, userEmail, hashedPassword, userRegData, userData;

/**
 * Renders the home page.
 */
const getHome = async (req, res) => {
  try {
    const userData = req.session.user;

    const Products = await Product.aggregate([
      { $match: { isBlocked: false } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      {
        $lookup: {
          from: "productoffers",
          localField: "_id",
          foreignField: "productId",
          as: "productOffer",
        },
      },
      {
        $addFields: {
          productOffer: {
            $ifNull: [{ $arrayElemAt: ["$productOffer", 0] }, null],
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          price: 1,
          description: 1,
          stock: 1,
          popularity: 1,
          bestSelling: 1,
          imageUrl: 1,
          category: {
            _id: 1,
            category: 1,
            imageUrl: 1,
            isListed: 1,
            bestSelling: 1,
          },
          discountPrice: {
            $cond: {
              if: {
                $and: [
                  { $eq: ["$productOffer.currentStatus", true] },
                  { $gt: ["$productOffer.discountPrice", 0] },
                ],
              },
              then: "$productOffer.discountPrice",
              else: null,
            },
          },
        },
      },
    ]);

    console.log(Products);
    console.log("Aggregated Product Details 1:", Products);

    const category = await Category.find({ isListed: true }).lean();
    res.render("user/home", { category, Products, userData });
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

/**
 * Renders the login page with appropriate messages.
 */
const getLogin = async (req, res) => {
  const messages = {
    regSuccessMsg: "User registered successfully..!!",
    blockMsg: "User has been Blocked..!!",
    mailErr: "Incorrect email or password..!!",
    successMessage: "Password reset successfully!",
  };

  try {
    for (const key in messages) {
      if (req.session[key]) {
        res.render("user/login", { [key]: messages[key] });
        req.session[key] = false;
        return;
      }
    }
    res.render("user/login");
  } catch (error) {
    console.error("Error loading login page:", error.message);
  }
};

/**
 * Handles user login authentication.
 */
const doLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    userData = await User.findOne({ email });

    if (userData && (await argon2.verify(userData.password, password))) {
      if (!userData.isBlocked) {
        req.session.LoggedIn = true;
        req.session.user = userData;
        return res.redirect("/");
      }
      req.session.blockMsg = true;
    } else {
      req.session.mailErr = true;
    }
    res.redirect("/login");
  } catch (error) {
    console.error("Error during login:", error.message);
  }
};

/**
 * Handles user logout.
 */
const doLogout = async (req, res) => {
  try {
    req.session.user = null;
    userData = null;
    res.redirect("/login");
  } catch (error) {
    console.error("Error during logout:", error.message);
  }
};

/**
 * Renders the signup page.
 */
const getSignup = async (req, res) => {
  try {
    res.render("user/signup");
  } catch (error) {
    console.error("Error loading signup page:", error.message);
  }
};

/**
 * Handles user signup and OTP verification.
 */
const doSignup = async (req, res) => {
  try {
    hashedPassword = await userHelper.hashPassword(req.body.password);
    userEmail = req.body.email;
    userMobile = req.body.phone;
    userRegData = req.body;

    const userExist = await User.findOne({ email: userEmail }).lean();
    const mobileExist = await User.findOne({ mobile: userMobile }).lean();

    if (!userExist && !mobileExist) {
      otp = await userHelper.verifyEmail(userEmail);
      return res.render("user/submitOtp");
    }

    const messages = {
      message: userExist ? "!!User Already Exist!!" : "",
      message1: mobileExist ? "!!Mobile Number Already Exist!!" : "",
    };

    res.render("user/signup", messages);
  } catch (error) {
    console.error("Error during signup:", error.message);
  }
};

/**
 * Renders the OTP submission page.
 */
const getOtp = (req, res) => {
  try {
    res.render("user/submitOtp");
  } catch (error) {
    console.error("Error loading OTP page:", error.message);
  }
};

/**
 * Handles OTP submission and user registration.
 */
const submitOtp = async (req, res) => {
  try {
    userOtp = req.body.otp;

    if (userOtp == otp) {
      const newUser = new User({
        name: userRegData.name,
        email: userRegData.email,
        mobile: userRegData.phone,
        password: hashedPassword,
        isVerified: true,
        isBlocked: false,
      });

      await newUser.save();
      req.session.regSuccessMsg = true;
      return res.json({ success: true, redirectUrl: "/" });
    }

    res.json({ error: "Incorrect OTP" });
  } catch (error) {
    console.error("Error submitting OTP:", error.message);
    res.json({ error: "An error occurred while submitting the OTP." });
  }
};

/**
 * Resends OTP to the user.
 */
const resendOtp = async (req, res) => {
  try {
    if (userEmail) {
      otp = await userHelper.verifyEmail(userEmail);
      console.log("Resending OTP to:", userEmail, otp);
      res.redirect("/submit_otp");
    }
  } catch (error) {
    console.error("Error resending OTP:", error.message);
  }
};

/**
 * Handles Google authentication callback.
 */
const googleCallback = async (req, res) => {
  try {
    userData = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: { name: req.user.displayName, isVerified: true } },
      { upsert: true, new: true }
    );

    if (userData.isBlocked) {
      req.session.blockMsg = true;
      return res.redirect("/login");
    }

    req.session.LoggedIn = true;
    req.session.user = userData;
    res.redirect("/");
  } catch (error) {
    console.error("Error handling Google callback:", error.message);
    res.redirect("/login");
  }
};


const productDetails = async (req, res) => {
  try {
    const productID = req.params.id;
    console.log("Product ID:", productID);

    const products = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(productID) } },
      {
        $lookup: {
          from: "productoffers",
          localField: "_id",
          foreignField: "productId",
          as: "productOffer",
        },
      },
      { $unwind: { path: "$productOffer", preserveNullAndEmptyArrays: true } },
    ]);

    let product = products[0];
    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("user/productDetails", {
      product,
      layout: "layout",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};



module.exports = {
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
};

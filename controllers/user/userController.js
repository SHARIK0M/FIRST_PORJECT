const User = require("../../models/userSchema");
const argon2 = require("argon2");
const userHelper = require("../../helpers/user.helper");
const mongoose = require("mongoose");
const HttpStatus = require("../../httpStatus");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");


let otp, userOtp, userEmail, hashedPassword, userRegData, userData;

//Renders the home page.
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
         
        },
      },
      { $limit: 4 }, // Only fetch 4 products
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

//Renders the login page with appropriate messages.
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

//Handles user login authentication.
const doLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email });

    if (userData && (await argon2.verify(userData.password, password))) {
      if (!userData.isBlocked) {
        req.session.regenerate((err) => {
          if (err) return res.redirect("/login");
          
          req.session.user = userData;
          req.session.admin = null; // ✅ Ensure admin session is cleared
          req.session.save(() => res.redirect("/"));
        });
      } else {
        req.session.blockMsg = true;
        res.redirect("/login");
      }
    } else {
      req.session.mailErr = true;
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error during login:", error.message);
  }
};


//Handles user logout.
const doLogout = async (req, res) => {
  try {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  } catch (error) {
    console.error("Error during logout:", error.message);
  }
};

//Renders the signup page.
const getSignup = async (req, res) => {
  try {
    res.render("user/signup");
  } catch (error) {
    console.error("Error loading signup page:", error.message);
  }
};

const doSignup = async (req, res) => {
  try {
    const hashedPassword = await userHelper.hashPassword(req.body.password);
    const userEmail = req.body.email;
    const userMobile = req.body.phone;
    const userRegData = req.body;

    const userExist = await User.findOne({ email: userEmail }).lean();
    const mobileExist = await User.findOne({ mobile: userMobile }).lean();

    if (!userExist && !mobileExist) {
      const { otp, otpTimestamp } = await userHelper.verifyEmail(userEmail);

      if (!otp) {
        return res.render("user/signup", { message: "Error generating OTP. Try again." });
      }

      req.session.userEmail = userEmail;
      req.session.userRegData = userRegData;
      req.session.hashedPassword = hashedPassword;
      req.session.otp = otp;
      req.session.otpTimestamp = otpTimestamp;

      return res.render("user/submitOtp");
    }

    res.render("user/signup", {
      message: userExist ? "!!User Already Exists!!" : "",
      message1: mobileExist ? "!!Mobile Number Already Exists!!" : "",
    });
  } catch (error) {
    res.render("user/signup", { message: "An error occurred. Please try again." });
  }
};



//Renders the OTP submission page
const getOtp = (req, res) => {
  try {
    res.render("user/submitOtp");
  } catch (error) {
    console.error("Error loading OTP page:", error.message);
  }
};

// Handles OTP submission and user registration.
const submitOtp = async (req, res) => {
  try {
    let userOtp = req.body.otp;

    if (!req.session.otp || !req.session.otpTimestamp) {
      return res.status(400).json({ error: "Session expired. Please request a new OTP." });
    }

    if (Date.now() - req.session.otpTimestamp > 60000) {
      req.session.otp = null;
      req.session.otpTimestamp = null;
      return res.status(400).json({ error: "OTP expired. Please request a new OTP." });
    }

    userOtp = Array.isArray(userOtp) ? userOtp.join("") : userOtp.toString().trim();

    if (userOtp === req.session.otp.toString().trim()) {
      if (!req.session.userRegData) {
        return res.status(400).json({ error: "Session expired. Please start the registration process again." });
      }

      const newUser = new User({
        name: req.session.userRegData.name,
        email: req.session.userRegData.email,
        mobile: req.session.userRegData.phone,
        password: req.session.hashedPassword,
        isVerified: true,
        isBlocked: false,
      });

      await newUser.save();
      req.session.regSuccessMsg = true;
      req.session.otp = null;
      req.session.otpTimestamp = null;
      req.session.userRegData = null;
      req.session.hashedPassword = null;

      return res.status(200).json({ success: true, redirectUrl: "/login" });
    } else {
      return res.status(400).json({ error: "Incorrect OTP" });
    }
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while submitting the OTP." });
  }
};

// Resends OTP to the user.
const resendOtp = async (req, res) => {
  try {
    if (!req.session.userRegData || !req.session.userRegData.email) {
      return res.status(400).json({ error: "User email not found in session." });
    }

    const userEmail = req.session.userRegData.email.trim();
    if (!userEmail) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    const { otp, otpTimestamp } = await userHelper.verifyEmail(userEmail);
    if (!otp) {
      return res.status(500).json({ error: "Failed to generate OTP. Try again." });
    }

    req.session.otp = otp;
    req.session.otpTimestamp = otpTimestamp;

    return res.json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to resend OTP" });
  }
};






//Handles Google authentication callback.
const googleCallback = async (req, res) => {
  try {
    userData = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: { name: req.user.displayName, isVerified: true } },
      { upsert: true, new: true }
    );
    console.log(userData);

    if (userData.isBlocked) {
      req.session.blockMsg = true;
      res.redirect("/login");
    } else {
      req.session.LoggedIn = true;
      req.session.user = userData;
      res.redirect("/");
    }
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
};

const productDetails = async (req, res) => {
  try {
    const productID = req.params.id;
    console.log("Product ID:", productID);

    const products = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(productID) } },
      
     
    ]);

    await Product.findByIdAndUpdate(productID, {$inc: {popularity: 1}})
    let product = products[0];
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Check if product is in cart
    let productexistInCart = false;
    const userData = req.session.user; // Get user session

    if (userData) {
      const existingCartItem = await Cart.findOne({
        userId: userData._id,
        product_Id: productID,
      });

      productexistInCart = !!existingCartItem; // Convert to boolean
    }

    res.render("user/productDetails", {
      product,
      productexistInCart, // Pass this to the template
      layout: "layout",
      userData
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

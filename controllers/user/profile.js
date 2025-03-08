const User = require("../../models/userSchema");
const { Address } = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const argon2 = require("argon2");
const mongoose = require("mongoose");
const { Types: { ObjectId } } = mongoose;
const userHelper = require("../../helpers/user.helper");


// View User Profile
const viewUserProfile = async (req, res) => {
  try {
    const user = req.session.user;
    const id = user._id;
    const userData = await User.findById(id);
    const userDataObject = userData.toObject();
    res.render("user/profile", { userData: userDataObject });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Edit User Profile
const EditUserProfile = async (req, res) => {
  try {
    const user = req.session.user;
    const id = user._id;
    const userData = await User.findById(id);

    if (!userData) {
      return res.status(404).send("User not found");
    }

    const userDataObject = userData.toObject();
    res.render("user/editProfile", { userData: userDataObject });
  } catch (error) {
    console.log("Error fetching user data:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Update User Profile (name, mobile, and image)
const updateUserProfile = async (req, res) => {
  try {
    const user = req.session.user;
    const id = user._id;

    // Collect the data to update
    const updatedData = {
      name: req.body.name,
      mobile: req.body.mobile,
    };

    // Check if email is being updated and if it is verified
    if (req.body.email && req.session.otpVerified) {
      updatedData.email = req.body.email; // Update email if verified
      req.session.otpVerified = false; // Reset OTP verified flag after saving
    }

    // Check if a new image was uploaded
    if (req.file) {
      updatedData.image = req.file.filename;
    }

    // Update user in the database
    const userData = await User.findByIdAndUpdate(id, updatedData, { new: true });

    if (!userData) {
      return res.status(404).send("User not found");
    }

    // After successful update, redirect to the profile page
    res.redirect("/edit_profile");
  } catch (error) {
    console.log("Error updating user profile:", error.message);
    res.status(500).send("Internal Server Error");
  }
};


// Change User Password
const changePassword = async (req, res) => {
  try {
    const user = req.session.user;
    const id = user._id;
    const userData = await User.findById(id);
    res.render("user/changePassword", { userData });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Update User Password
const updatePassword = async (req, res) => {
  try {
    const { oldPass, newPass } = req.body;
    const userId = req.session.user;
    const findUser = await User.findOne({ _id: userId }).lean();
    const passwordMatch = await argon2.verify(findUser.password, oldPass);

    if (passwordMatch) {
      const hashedPassword = await argon2.hash(newPass);
      await User.updateOne(
        { _id: userId },
        { $set: { password: hashedPassword } }
      );
      res.json({ status: true });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// View User Orders with Pagination
const my_Orders = async (req, res) => {
  try {
    const user = req.session.user;
    const id = user._id;
    const userData = await User.findById(id).lean();
    let page = req.query.page || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const myOrders = await Order.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      {
        $project: {
          _id: 1,
          date: 1,
          orderId: 1,
          status: 1,
          totalAmount: 1,
          total: 1,
        },
      },
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const count = await Order.find({}).countDocuments();
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render("user/myOrders", {
      userData,
      myOrders,
      pages,
      currentPage: page,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// View Order Details
const orderDetails = async (req, res) => {
  try {
    let ct = 0;
    let ct2 = 0;
    const orderId = req.params.id;
    const user = req.session.user;
    const userId = user._id;
    let offerprice = 0;

    // Retrieve user and order data
    const userData = await User.findById(userId).lean();
    const myOrderDetails = await Order.findById(orderId).populate('address').lean();

    myOrderDetails.product.forEach((product) => {
      if (product.isReturned) ct++;
      if (product.isCancelled) ct2++;
      offerprice += product.price * product.quantity;
    });

    const checkStatus = (a, b) => a + b === myOrderDetails.product.length;

    // Update order status if all items are cancelled or returned
    if (checkStatus(ct, ct2) && ct > 0 && myOrderDetails.status !== "Returned") {
      await Order.findByIdAndUpdate(myOrderDetails._id, { $set: { status: 'Returned' } });
      myOrderDetails.status = "Returned";
    } else if (checkStatus(ct2, ct) && ct2 > 0 && myOrderDetails.status !== "Cancelled" && myOrderDetails.status !== "Returned") {
      await Order.findByIdAndUpdate(myOrderDetails._id, { $set: { status: 'Cancelled' } });
      myOrderDetails.status = "Cancelled";
    }

    const orderedProDet = await Order.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
      { $unwind: "$product" },
      { $project: { _id: 1, product: 1 } },
    ]);

    const address = await Address.findOne({ userId }).lean();

    offerprice -= myOrderDetails.total;

    res.render('user/orderDetails', { offerprice, address, orderedProDet, myOrderDetails, userData });
  } catch (error) {
    console.error("Error fetching order details:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Store OTP and timestamp in session
const sendOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.json({ success: false, message: "Email is required." });
  }

  try {
    const { otp, otpTimestamp } = await userHelper.verifyEmail(email); // Fix: Call from userHelper

    if (!otp) {
      return res.json({ success: false, message: "Failed to generate OTP." });
    }

    req.session.otp = otp; // Store OTP in session
    req.session.otpTimestamp = otpTimestamp;
    req.session.tempEmail = email; // Store email temporarily

    res.json({ success: true, message: "OTP sent successfully!" });
  } catch (error) {
    res.json({ success: false, message: "Error sending OTP: " + error.message });
  }
};


// Verify OTP and update email
const verifyOTP = async (req, res) => {
  const { otp } = req.body;

  if (!req.session.otp || !req.session.tempEmail) {
      return res.json({ success: false, message: "OTP expired or not requested." });
  }

  // OTP Expiry Check (5 minutes)
  if (Date.now() - req.session.otpTimestamp > 5 * 60 * 1000) {
      req.session.otp = null;
      return res.json({ success: false, message: "OTP expired." });
  }

  // Verify OTP
  if (otp !== req.session.otp) {
      return res.json({ success: false, message: "Invalid OTP." });
  }

  try {
      // Email is now verified
      req.session.otpVerified = true;

      // Update Email in Database (if not already updated)
      req.session.tempEmail = req.session.tempEmail || req.body.email;

      res.json({ success: true, message: "Email verified successfully!" });
  } catch (error) {
      res.json({ success: false, message: "Error verifying OTP." });
  }
};



module.exports = {
  viewUserProfile,
  EditUserProfile,
  updateUserProfile,
  changePassword,
  updatePassword,
  my_Orders,
  orderDetails,
  verifyOTP,
  sendOTP
};

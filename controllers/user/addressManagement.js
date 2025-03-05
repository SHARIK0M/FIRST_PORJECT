// Importing necessary models
const User = require("../../models/userSchema");
const { Address } = require("../../models/addressSchema");
const mongoose = require("mongoose");

// Extracting ObjectId from mongoose
const {
  Types: { ObjectId },
} = mongoose;

// Render add address page
const addAddress = async (req, res) => {
  try {
    // Fetching user data from session
    const user = req.session.user;
    const userData = await User.findById(user._id);

    // Rendering add address page with user data
    res.render("user/addAddress", { userData });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Handle new address submission
const addAddressPost = async (req, res) => {
  try {
    // Fetching user data from session
    const userData = req.session.user;
    const userId = userData._id;

    // Creating new address object
    const address = new Address({
      userId: userId,
      name: req.body.name,
      mobile: req.body.mobile,
      addressLine1: req.body.address1,
      addressLine2: req.body.address2,
      city: req.body.city,
      state: req.body.state,
      pin: req.body.pin,
      is_default: false,
    });

    // Saving the address to the database
    await address.save();
    res.redirect("/addresses");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const checkAddressPost = async (req, res) => {
  try {
    // Fetching user data from session
    const userData = req.session.user;
    const userId = userData._id;

    // Creating new address object
    const address = new Address({
      userId: userId,
      name: req.body.name,
      mobile: req.body.mobile,
      addressLine1: req.body.address1,
      addressLine2: req.body.address2,
      city: req.body.city,
      state: req.body.state,
      pin: req.body.pin,
      is_default: false,
    });

    // Saving the address to the database
    await address.save();
    res.redirect("/cart/checkout");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};
// Render manage addresses page
const manageAddress = async (req, res) => {
  try {
    // Fetching user data from session
    const user = req.session.user;
    const userId = user._id;

    // Fetching user's saved addresses
    const userAddresses = await Address.find({ userId: userId }).lean();
    const userData = await User.findById(userId);

    // Rendering manage addresses page with user's data
    res.render("user/address", {
      userAddress: userAddresses,
      userData: userData,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Render edit address page
const editAddress = async (req, res) => {
  try {
    // Fetching address data by address id
    const addressId = req.params.id;
    const address = await Address.findById(addressId).lean();

    // Rendering edit address page with address data
    res.render("user/editAddress", { address });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Handle address update
const editAddressPost = async (req, res) => {
  try {
    const addressId = req.params.id;

    // Updating the address details in the database
    await Address.findByIdAndUpdate(
      addressId,
      {
        $set: {
          name: req.body.name,
          mobile: req.body.mobile,
          addressLine1: req.body.address1,
          addressLine2: req.body.address2,
          city: req.body.city,
          state: req.body.state,
          pin: req.body.pin,
        },
      },
      { new: true }
    );

    // Redirecting to the addresses page
    res.redirect("/addresses");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Handle address deletion
const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;

    // Deleting the address from the database
    await Address.findByIdAndDelete(addressId);
    res.redirect("/addresses");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Exporting functions for routing
module.exports = {
  addAddress,
  addAddressPost,
  manageAddress,
  editAddress,
  editAddressPost,
  deleteAddress,
  checkAddressPost
};

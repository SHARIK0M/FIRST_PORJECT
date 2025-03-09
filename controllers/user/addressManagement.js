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
    res.redirect("/checkout");
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

    // Send success response for the AJAX request
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


// Handle address deletion
const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;

    // Check if the address exists before deleting
    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(404).send("Address not found");
    }

    // Deleting the address from the database
    const deletedAddress = await Address.findByIdAndDelete(addressId);

    // Log to confirm the address was deleted
    console.log("Deleted Address: ", deletedAddress);

    // Send a success response
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// Exporting functions for routing
module.exports = {
  addAddress,
  addAddressPost,
  manageAddress,
  editAddressPost,
  deleteAddress,
  checkAddressPost
};

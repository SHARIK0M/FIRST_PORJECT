const User = require("../models/userSchema");

// Middleware to check if a user is logged in
const logedin = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    next();
  } catch (error) {
    console.error("Error in logedin middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Middleware to check if a user is logged out
const logedout = async (req, res, next) => {
  try {
    if (req.session.user) {
      return res.redirect("/");
    }
    next();
  } catch (error) {
    console.error("Error in logedout middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Middleware to check if a user is blocked
const isBlocked = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user?._id);

    if (!user) {
      return res.redirect("/login");
    }

    if (user.isBlocked) {
      return res.redirect("/logout");
    }

    next();
  } catch (error) {
    console.error("Error in isBlocked middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  logedin,
  logedout,
  isBlocked,
};

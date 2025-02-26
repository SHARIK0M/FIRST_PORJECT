const User = require("../models/userSchema");

const logedout = async (req, res, next) => {
  try {
    if (req.session.user) {
      res.redirect("/");
    } else next();
  } catch (error) {
    console.log(error);
  }
};

// Middleware to check if the user is blocked and only destroy their session
const checkUserBlocked = async (req, res, next) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user._id);
      if (user && user.isBlocked) {
        // Remove only the user session
        req.session.user = null;
        return res.render("user/login", {
          message: "Your account has been blocked. Please contact support.",
        });
      }
    }
    next();
  } catch (error) {
    console.log("Error in checkUserBlocked middleware:", error);
    res.redirect("/login");
  }
};

module.exports = {
  logedout,
  checkUserBlocked,
};

// Middleware to check if the admin is logged in
const isLogin = (req, res, next) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login"); // Redirects to login if admin is not logged in
    }
    next(); // Proceeds to the next middleware or route handler
  } catch (error) {
    console.error("Error in isLogin middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Middleware to check if the admin is logged out
const isLogout = (req, res, next) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin/home"); // Redirects to home if admin is already logged in
    }
    next(); // Proceeds to the next middleware or route handler
  } catch (error) {
    console.error("Error in isLogout middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  isLogin,
  isLogout,
};

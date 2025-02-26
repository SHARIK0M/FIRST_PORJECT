// Middleware to check if the admin is logged in
const isLogin = (req, res, next) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login"); // Redirect if admin is not logged in
    }
    next();
  } catch (error) {
    console.error("Error in isLogin middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Middleware to check if the admin is logged out
const isLogout = (req, res, next) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin/home"); // Redirect if admin is already logged in
    }
    next();
  } catch (error) {
    console.error("Error in isLogout middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  isLogin,
  isLogout,
};

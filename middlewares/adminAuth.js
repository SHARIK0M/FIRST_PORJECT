const isLogin = (req, res, next) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }
    next();
  } catch (error) {
    console.error("Error in isLogin middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

const isLogout = (req, res, next) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin/home");
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

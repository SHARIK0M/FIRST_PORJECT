const HttpStatus = require("../../httpStatus");

// Render Admin Login Page
const getLogin = async (req, res) => {
  try {
    res.render("admin/login", { layout: "adminLayout", isLoginPage: true });
  } catch (error) {
    console.error("Error in getLogin:", error);
    res
      .status(HttpStatus.InternalServerError)
      .json({ message: "Something went wrong" });
  }
};

// Handle Admin Login
const doLogin = async (req, res) => {
  try {
    const admin = {
      mail: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    };

    const { email, password } = req.body;

    if (admin.mail === email && admin.password === password) {
      req.session.regenerate((err) => {
        if (err) return res.redirect("/admin/login");

        req.session.admin = admin;
        req.session.user = null; // ✅ Ensure user session is cleared
        req.session.save(() => res.redirect("/admin/home"));
      });
    } else {
      res.render("admin/login", {
        layout: "adminLayout",
        message: "Invalid Credentials",
        isLoginPage: true,
      });
    }
  } catch (error) {
    console.error("Error in doLogin:", error);
    res.status(500).send("Internal Server Error");
  }
};



// Handle Admin Logout
const doLogout = async (req, res) => {
  try {
    req.session.destroy(() => {
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.error("Error during logout:", error.message);
  }
};



module.exports = {
  getLogin,
  doLogin,
  doLogout,
};

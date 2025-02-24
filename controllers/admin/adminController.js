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
      req.session.admin = admin;
      console.log("Admin logged in:", req.session);
      return res.redirect("/admin/home");
    }

    res.render("admin/login", {
      layout: "adminLayout",
      message: "Invalid Credentials",
      isLoginPage: true,
    });
  } catch (error) {
    console.error("Error in doLogin:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Handle Admin Logout
const doLogout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error in doLogout:", err);
        return res.status(HttpStatus.InternalServerError).send("Logout Failed");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.error("Error in doLogout:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

module.exports = {
  getLogin,
  doLogin,
  doLogout,
};

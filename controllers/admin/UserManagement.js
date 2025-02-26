const User = require("../../models/userSchema");
const HttpStatus = require("../../httpStatus");

// Fetch and display the user management page with pagination
const usersPage = async (req, res) => {
  try {
    const page = req.query.page ? req.query.page : 1;
    const limit = 3;

    const users = await User.find({})
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const count = await User.countDocuments();
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render("admin/userManagement", {
      admin: true,
      pages,
      currentPage: page,
      users,
      layout: "adminLayout",
    });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Toggle user block status
const blockUser = async (req, res) => {
  try {
    const { id } = req.body;
    const user = await User.findById(id);

    if (!user) {
      return res.status(HttpStatus.NotFound).send("User not found");
    }

    const isBlocked = !user.isBlocked;
    await User.findByIdAndUpdate(id, { $set: { isBlocked } });

    // If user is blocked and currently logged in, set session flag
    if (
      isBlocked &&
      req.session.user &&
      req.session.user._id.toString() === id
    ) {
      req.session.userBlocked = true; // Set flag to indicate user is blocked
      delete req.session.user; // Remove user session
    }

    res.redirect("/admin/users");
  } catch (error) {
    console.error("Error blocking user:", error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};


module.exports = {
  usersPage,
  blockUser,
};

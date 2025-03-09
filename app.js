require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const path = require("path");
const app = express();

// 🔹 Connect to Database
connectDB();

// 🔹 Apply General Middlewares
require("./middlewares/generalMiddleware")(app);

// 🔹 Setup Handlebars
require("./middlewares/handlebarsSetup")(app);

// 🔹 Apply Sessions Middleware
app.use(require("./middlewares/userSession"));
app.use("/admin", require("./middlewares/adminSession"));

// 🔹 Apply Passport Middleware
require("./middlewares/passportSetup")(app);

// 🔹 Import Routes
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouters");
// 🔹 Home & Admin Routes
app.use("/", userRouter);
app.use("/admin", adminRouter);

// 🔹 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});

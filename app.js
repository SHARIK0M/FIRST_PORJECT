require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const { engine } = require("express-handlebars");
const path = require("path");
const app = express();
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouters");
const session = require("express-session");
const nocache = require("nocache");

// Connect to Database
connectDB();

// Static files middleware
app.use(express.static(path.join(__dirname, "public")));

// Set up views and the view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs"); // Use "hbs" for view engine

// Corrected express-handlebars setup with helpers
app.engine(
  "hbs",
  engine({
    layoutsDir: path.join(__dirname, "views/layouts"), // Layouts directory
    extname: "hbs", // File extension
    defaultLayout: "layout", // Default layout
    partialsDir: path.join(__dirname, "views/partials/"),
    helpers: {
      times: function (n, block) {
        let accum = "";
        for (let i = 0; i < n; ++i) {
          accum += block.fn(i);
        }
        return accum;
      },
      subtract: function (a, b) {
        return a - b;
      },
    }, // Partials directory
  })
);

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 10 * 60 * 1000 }, // 10 minutes
  })
);

app.use(nocache()); // avoid showing old data

// Middleware to parse request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home route
app.use("/", userRouter);
app.use("/admin", adminRouter);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

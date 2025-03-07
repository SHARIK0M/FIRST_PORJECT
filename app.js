require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const { engine } = require("express-handlebars");
const Handlebars = require("handlebars");
const hbsHelper = require("./helpers/hbsHelpers");
const path = require("path");
const app = express();
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouters");
const session = require("express-session");
const nocache = require("nocache");
const passport = require("passport");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const cors = require('cors');

// 🔹 Connect to Database
connectDB();
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:2000",
  credentials: true,
}));
// 🔹 Static files middleware
app.use(express.static(path.join(__dirname, "public")));

// 🔹 Set up views and Handlebars engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// 🔹 Handlebars setup with helpers
app.engine(
  "hbs",
  engine({
    layoutsDir: path.join(__dirname, "views/layouts"),
    extname: "hbs",
    defaultLayout: "layout",
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
    },
    runtimeOptions: {
      allowProtoPropertiesByDefault: true, // Allow prototype property access
      allowProtoMethodsByDefault: true, // Allow prototype method access (optional)
    },
  })
);

// 🔹 Apply Middleware
app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 🔹 User Session Middleware (Exclusive to User Routes)
const userSession = session({
  name: "userSessionID", // ✅ Unique session name for users
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, collectionName: "userSessions" }),
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60, path: "/" } // ✅ User-specific session
});
app.use((req, res, next) => {
  if (!req.path.startsWith("/admin")) {
    userSession(req, res, next); // Apply user session only if NOT in /admin
  } else {
    next();
  }
});


// 🔹 Admin Session Middleware (Exclusive to Admin Routes)
const adminSession = session({
  name: "adminSessionID", // ✅ Unique session name for admins
  secret: process.env.SECRET_KEYY + "_admin",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, collectionName: "adminSessions" }),
  cookie: { secure: false, httpOnly: true, maxAge: 2000 * 60 * 60, path: "/admin" } // ✅ Admin-specific session
});
app.use("/admin", adminSession);

// 🔹 Apply Passport (After Sessions)
app.use(passport.initialize());
app.use(passport.session());

// 🔹 Register Handlebars Helpers
Handlebars.registerHelper(
  hbsHelper.incHelper(Handlebars),
  hbsHelper.incrementHelper(Handlebars),
  hbsHelper.mulHelper(Handlebars),
  hbsHelper.addHelper(Handlebars),
  hbsHelper.isCancelled(Handlebars),
  hbsHelper.registerHelpers(Handlebars),
  hbsHelper.isequal(Handlebars),
  hbsHelper.ifCondition1(Handlebars),
  hbsHelper.length(Handlebars),
  hbsHelper.singleIsCancelled(Handlebars),
  hbsHelper.ifCondition(Handlebars),
  hbsHelper.statushelper(Handlebars),
  hbsHelper.eqHelper(Handlebars),
  hbsHelper.orHelper(Handlebars)

);

// 🔹 Home & Admin Routes
app.use("/", userRouter);
app.use("/admin", adminRouter);

// 🔹 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});

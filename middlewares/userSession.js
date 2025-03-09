const session = require("express-session");
const MongoStore = require("connect-mongo");

const userSession = session({
  name: "userSessionID",
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, collectionName: "userSessions" }),
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60, path: "/" }
});

module.exports = (req, res, next) => {
  if (!req.path.startsWith("/admin")) {
    userSession(req, res, next);
  } else {
    next();
  }
};

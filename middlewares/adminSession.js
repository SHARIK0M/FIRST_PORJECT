const session = require("express-session");
const MongoStore = require("connect-mongo");

const adminSession = session({
  name: "adminSessionID",
  secret: process.env.SECRET_KEY + "_admin",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, collectionName: "adminSessions" }),
  cookie: { secure: false, httpOnly: true, maxAge: 2000 * 60 * 60, path: "/admin" }
});

module.exports = adminSession;

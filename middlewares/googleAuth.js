const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth2").Strategy;

// Google Authentication Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "/google/callback",
      passReqToCallback: true,
    },
    async function (request, accessToken, refreshToken, profile, done) {
      return done(null, profile);
    }
  )
);

// Store user information in the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Retrieve user information from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

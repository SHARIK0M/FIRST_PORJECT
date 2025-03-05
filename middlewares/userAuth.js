const User = require('../models/userSchema');

const logedin = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        next();
    } catch (error) {
        console.error("Error in logedin middleware:", error);
        res.status(500).send("Internal Server Error");
    }
};

const logedout = async (req, res, next) => {
    try {
        if (req.session.user) {
            return res.redirect('/');
        }
        next();
    } catch (error) {
        console.error("Error in logedout middleware:", error);
        res.status(500).send("Internal Server Error");
    }
};

const isBlocked = async (req, res, next) => {
    try {
        if (!req.session.user) return next(); // Skip if user is not logged in
        
        const user = await User.findById(req.session.user._id);
        if (!user) {
            req.session.destroy(() => res.redirect('/login'));
            return;
        }

        if (user.isBlocked) {
            req.session.destroy(() => res.redirect('/login'));
            return;
        }

        next();
    } catch (error) {
        console.error("Error in isBlocked middleware:", error);
        res.status(500).send("Internal Server Error");
    }
};



module.exports = {
    logedin,
    logedout,
    isBlocked
};


const logedout = async (req, res, next) => {
  try {
    if (req.session.user) {
      res.redirect("/");
    } else next();
  } catch (error) {
    console.log(error);
  }
};


module.exports = {
  logedout,
};

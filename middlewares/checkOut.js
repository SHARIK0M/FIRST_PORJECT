const isOrderPlaced = async  (req, res, next) => {
    try {
        console.log(req.session.orderCompleted)
        
        if (req.session.orderCompleted) {
          return res.redirect("/");
        }
        next()
        

    } catch (error) {
        
    }
  }

  module.exports = {
    isOrderPlaced
  }
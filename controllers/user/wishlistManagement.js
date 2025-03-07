const Cart = require("../../models/cartSchema");
const Wishlist = require('../../models/wishlistSchema')
const HttpStatus = require('../../httpStatus');

const mongoose = require("mongoose");
const ObjectId = require("mongoose");

const swal = require('sweetalert2')

let userData


const showWishlistPage = async (req, res) => {
  const userData = req.session.user;

  try {
      const userId = new mongoose.Types.ObjectId(userData._id);

      // Find the user's wishlist
      const wishlist = await Wishlist.findOne({ user: userId });
      const wishlistCount = wishlist?.productId?.length || 0;

      // Fetch cart items and store their product IDs
      const cartItems = await Cart.find({ userId });
      const cartProductIds = cartItems.map(item => item.product_Id.toString());

      // Aggregate wishlist products
      const WishListProd = await Wishlist.aggregate([
          { $match: { user: userId } },
          { $unwind: '$productId' },
          {
              $lookup: {
                  from: 'products',
                  foreignField: '_id',
                  localField: 'productId',
                  as: 'productData'
              }
          },
          { $unwind: { path: '$productData', preserveNullAndEmptyArrays: true } },
          {
              $lookup: {
                  from: 'productoffers',
                  localField: 'productData._id',
                  foreignField: 'productId',
                  as: 'productOffer'
              }
          },
          { $unwind: { path: '$productOffer', preserveNullAndEmptyArrays: true } },
          {
              $project: {
                  _id: 1,
                  productId: 1,
                  productName: "$productData.name",
                  productImage: "$productData.imageUrl",
                  productDescription: "$productData.description",
                  productQuantity: "$productData.stock",
                  productPrice: {
                      $cond: {
                          if: { $gt: [{ $ifNull: ["$productOffer.discountPrice", 0] }, 0] },
                          then: "$productOffer.discountPrice",
                          else: "$productData.price"
                      }
                  },
                  outOfStock: { $lte: ["$productData.stock", 0] },
                  ProductExistInCart: {
                      $in: ["$productId", cartProductIds.map(id => new mongoose.Types.ObjectId(id))]
                  }
              }
          }
      ]);

      console.log(WishListProd, "WishListProd");

      if (WishListProd.length > 0) {
        res.render('user/wishlist', { userData, WishListProd, wishCt: wishlistCount, isWishlistEmpty: false });
    } else {
        res.render('user/wishlist', { userData, isWishlistEmpty: true });
    }
  } catch (error) {
      console.log(error.message);
      res.status(500).send("Internal Server Error");
  }
};


const addToWishList = async (req, res) => {
    try {
        let { id } = req.body;
        const userId = new mongoose.Types.ObjectId(req.session.user._id);
        let productId = new mongoose.Types.ObjectId(id);
  
        // Check if the product already exists in the wishlist
        let existingWishlist = await Wishlist.findOne({ user: userId, productId: productId });
  
        if (existingWishlist) {
            return res.json({ success: false, message: "Already in wishlist" });
        }
  
        // Add the product if not already in wishlist
        let wishlistData = await Wishlist.findOneAndUpdate(
            { user: userId },
            { $addToSet: { productId: productId } },
            { upsert: true, new: true }
        );
  
        if (wishlistData) {
            res.json({ success: true, message: "Added to wishlist" });
        } else {
            res.json({ success: false, message: "Failed to add to wishlist" });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
  };
  

const removeFromWishList = async (req, res) => {
  try {
      let { id } = req.body;
      let productIdToRemove = new mongoose.Types.ObjectId(id);
      const userId = new mongoose.Types.ObjectId(req.session.user._id);

      let wishlistUpdateResult = await Wishlist.updateOne(
          { user: userId },
          { $pull: { productId: productIdToRemove } }
      );

      if (wishlistUpdateResult.modifiedCount > 0) {
          res.json({ success: true });
      } else {
          res.json({ success: false });
      }
  } catch (error) {
      console.log(error.message);
      res.status(500).send("Internal Server Error");
  }
};

const checkWishlist = async (req, res) => {
    try {
        let { id } = req.body;
        const userId = new mongoose.Types.ObjectId(req.session.user._id);
        let productId = new mongoose.Types.ObjectId(id);

        let existingWishlist = await Wishlist.findOne({ user: userId, productId: productId });

        if (existingWishlist) {
            return res.json({ exists: true });
        }
        res.json({ exists: false });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};



module.exports = {
    showWishlistPage,
    addToWishList,
    removeFromWishList,
    checkWishlist
}
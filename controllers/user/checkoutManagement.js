const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const { Address } = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const HttpStatus = require('../../httpStatus');


const mongoose = require("mongoose");


const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    let userData = await User.findById(userId).lean();
    const ID = new mongoose.Types.ObjectId(userId);

    // Fetch user address data
    const addressData = await Address.find({ userId }).lean();

    // Fetch available coupons (only those not used by the current user)
    const coupon = await Coupon.find({
      $or: [
        { usedBy: { $ne: userId } }, // Not used by this user
        { usedBy: { $exists: false } }, // Not assigned to any user
        { isUsed: false } // If you track usage with a boolean field
      ]
    }).lean();

    // Fetch cart items
    const cartItems = await Cart.find({ userId: ID }).lean();

    // Fetch cart items with product details
    const cartItemtoRender = await Cart.find({ userId: ID })
      .populate({ path: "product_Id", model: "Product" })
      .lean();
const balnace = Math.floor(userData.wallet)
    // If no items in the cart, return empty cart details
    if (!cartItems.length) {
      return res.render("user/checkout", {
        userData,
        addressData,
        subTotal: 0,
        cart: [],
        coupon,
        balnace
      });
    }

    // Fetch product details with offers if available
    const productIds = cartItems.map((item) => item.product_Id);
    const products = await Product.aggregate([
      { $match: { _id: { $in: productIds } } },
      {
        $lookup: {
          from: "productoffers",
          localField: "_id",
          foreignField: "productId",
          as: "productOffer",
        },
      },
      { $unwind: { path: "$productOffer", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: 1,
          stock: 1,
          price: {
            $cond: {
              if: { $gt: [{ $ifNull: ["$productOffer.discountPrice", 0] }, 0] },
              then: "$productOffer.discountPrice",
              else: "$price",
            },
          },
          description: 1,
          imageUrl: 1,
        },
      },
    ]);

    // Combine cart quantities and product data
    const cart = cartItems.map((cartItem) => {
      const product = products.find((p) => p._id.equals(cartItem.product_Id));
      return {
        ...cartItem,
        productName: product?.name || "Unknown Product",
        productPrice: product?.price || 0,
        productStock: product?.stock,
        productDescription: product?.description || "No description available",
        productImage: product?.imageUrl || "default_image.png",
        value: (product?.price || 0) * cartItem.quantity,
      };
    });

    // Calculate subtotal
    const subTotal = cart.reduce((total, item) => total + item.value, 0);

    console.log("Final Cart:", cart);
    console.log("Subtotal:", subTotal);

    res.render("user/checkout", {
      userData,
      addressData,
      subTotal,
      cart,
      coupon,
      balnace
    });
  } catch (error) {
    console.log("Error loading checkout page:", error.message);
    res.status(500).send("Internal Server Error");
  }
};


const orderSuccess = async (req, res) => {
  try {
    // ✅ Ensure session exists
    if (!req.session || !req.session.user) {
      console.error("❌ Error: User session not found!");
      return res.status(400).send("User session not found. Please log in again.");
    }

    // ✅ Define userData properly
    const userData = req.session.user;

    res.render("user/orderPlaced", {
      title: "Order Placed",
      userData, // ✅ Now userData is defined
    });

  } catch (error) {
    console.log("❌ Error in orderSuccess:", error.message);
    res.status(500).send("Internal Server Error");
  }
};


const placeorder = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(400).json({ error: "User session not found. Please log in again." });
    }

    const userData = req.session.user;
    const userID = new mongoose.Types.ObjectId(userData._id);
    const addressId = req.body.selectedAddress;
    const payMethod = req.body.selectedPayment;
    let totalAmount = req.session.discountedTotal || req.body.amount;
    const appliedCoupon = req.session.appliedCoupon || req.body.couponVal;

    console.log("addressId ..................................",addressId)

    if (!addressId || !payMethod || !totalAmount) {
      return res.status(400).json({ error: "Missing required order details" });
    }

    // Fetch user details including wallet balance
    const user = await User.findById(userID);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    let walletBalance = user.wallet || 0; // Ensure wallet balance exists

    // Generate a unique order ID
    const orderId = Math.random().toString(36).substring(2, 7) + Math.floor(100000 + Math.random() * 900000);

    const cartProducts = await Cart.aggregate([
      { $match: { userId: userID } },
      {
        $lookup: {
          from: "products",
          foreignField: "_id",
          localField: "product_Id",
          as: "productData",
        },
      },
      { $unwind: "$productData" },
      {
        $lookup: {
          from: "productoffers",
          localField: "productData._id",
          foreignField: "productId",
          as: "productOffer",
        },
      },
      { $unwind: { path: "$productOffer", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          product_Id: 1,
          userId: 1,
          quantity: 1,
          name: "$productData.name",
          price: {
            $cond: {
              if: { $gt: [{ $ifNull: ["$productOffer.discountPrice", 0] }, 0] },
              then: "$productOffer.discountPrice",
              else: "$productData.price",
            },
          },
          image: "$productData.imageUrl",
          stock: "$productData.stock",
        },
      },
    ]);

    let products = cartProducts.map((item) => ({
      _id: item.product_Id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image[0],
      stock: item.stock,
    }));

    for (let product of products) {
      if (product.quantity > product.stock) {
        return res.json({
          message: `Insufficient stock for product: ${product.name}. Available stock: ${product.stock}`,
        });
      }
    }

    let discountAmount = 0;
    if (appliedCoupon && !req.session.discountedTotal) {
      const coupon = await Coupon.findOne({ code: appliedCoupon });
      if (coupon) {
        if (coupon.expiryDate < new Date()) {
          return res.status(400).json({ error: "Coupon expired" });
        } else if (totalAmount < coupon.minPurchase) {
          return res.status(400).json({ error: "Minimum purchase amount not met" });
        } else {
          discountAmount = Math.min((totalAmount * coupon.discount) / 100, coupon.maxDiscount);
          totalAmount -= discountAmount;
        }
      } else {
        return res.status(400).json({ error: "Invalid coupon code" });
      }
    } else {
      discountAmount = req.session.discountAmount || 0;
    }

    const DELIVERY_CHARGE = 50;
    const grandTotal = totalAmount + DELIVERY_CHARGE;

    // **Wallet Payment Deduction**
    if (payMethod === "wallet") {
      if (walletBalance < grandTotal) {
        return res.status(400).json({ error: "Insufficient wallet balance" });
      }
      walletBalance -= grandTotal;
      await User.updateOne(
  { _id: req.session.user._id },
  {
    $inc: { wallet: -grandTotal }, // Deduct wallet balance
    $push: {
      history: {
        amount: grandTotal,
        status: "Debited",
        date: Date.now(),
      },
    },
  }
);

    }

    const order = new Order({
      userId: userID,
      product: products,
      address: addressId,
      orderId: orderId,
      total: grandTotal,
      paymentMethod: payMethod,
      totalAmount: grandTotal,
      appliedCoupon: appliedCoupon || null,
      discountAmt: discountAmount,
    });

    if (req.body.status) {
      order.status = "Payment Failed";
    }

    await order.save();

    products.forEach(async (product) => {
      await Product.updateMany(
        { _id: product._id },
        { $inc: { stock: -product.quantity, bestSelling: 1 } }
      );
    });

    products.forEach(async (product) => {
      const populatedProd = await Product.findById(product._id).populate("category").lean();
      await Category.updateMany({ _id: populatedProd.category._id }, { $inc: { bestSelling: 1 } });
    });

    if (appliedCoupon) {
      await Coupon.updateOne(
        { code: appliedCoupon },
        { $addToSet: { usedBy: userID }, $set: { isUsed: true } }
      );
    }

    await Cart.deleteMany({ userId: userID });

    req.session.appliedCoupon = null;
    req.session.discountedTotal = null;
    req.session.discountAmount = null;

    if (req.headers.accept.includes("text/html")) {
      res.redirect("/checkout/success");
    } else {
      res.json({ success: true, orderId, grandTotal, appliedCoupon, walletBalance });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};


const validateCoupon = async (req, res) => {
  try {
    const { couponVal, subTotal } = req.body;
    console.log(couponVal, subTotal);

    const coupon = await Coupon.findOne({ code: couponVal });

    if (!coupon) {
      return res.json("invalid");
    } else if (coupon.expiryDate < new Date()) {
      return res.json("expired");
    } else if (subTotal < coupon.minPurchase) {
      return res.json("Minimum Amount Required");
    }

    const userId = req.session.user._id;
    const isCouponAlreadyUsed = await Coupon.exists({
      _id: coupon._id,
      usedBy: userId,
    });

    if (isCouponAlreadyUsed) {
      return res.json("already used");
    }

    const discountAmt = Math.min((subTotal * coupon.discount) / 100, coupon.maxDiscount);
    const newTotal = subTotal - discountAmt;

    res.json({ discountAmt, newTotal, discount: coupon.discount, success: "success" });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


const applyCoupon = async (req, res) => {
  try {
    const { couponVal, subTotal } = req.body;
    const userId = req.session.user._id;

    const coupon = await Coupon.findOne({ code: couponVal });

    if (!coupon) {
      return res.json({ status: "invalid" });
    } else if (coupon.expiryDate < new Date()) {
      return res.json({ status: "expired" });
    } else if (subTotal < coupon.minPurchase) {
      return res.json({ status: "min_purchase_not_met" });
    }

    // ✅ Check if the coupon is already used by this user
    const isCouponUsed = await Coupon.exists({ code: couponVal, usedBy: userId });

    if (isCouponUsed) {
      return res.json({ status: "already_used" });
    }

    let discountAmt = Math.min((subTotal * coupon.discount) / 100, coupon.maxDiscount);
    const newTotal = subTotal - discountAmt;

    // ✅ Store coupon details in session
    req.session.appliedCoupon = couponVal;
    req.session.discountedTotal = newTotal;
    req.session.discountAmount = discountAmt;

    return res.json({ discountAmt, newTotal, discount: coupon.discount, status: "applied", couponVal });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", error });
  }
};


const removeCoupon = async (req, res) => {
  try {
    const { couponVal, subTotal } = req.body;
    const coupon = await Coupon.findOne({ code: couponVal });
    const userId = req.session.user._id;

    if (!coupon) {
      return res.json({ status: "invalid" });
    }

    // ✅ Check if the coupon is applied in session
    if (req.session.appliedCoupon !== couponVal) {
      return res.json({ status: "not_applied" }); // 🔹 New status for better debugging
    }

    // ✅ Remove from session and database (if previously used)
    req.session.appliedCoupon = null;

    if (coupon.usedBy.includes(userId)) {
      await Coupon.updateOne({ _id: coupon._id }, { $pull: { usedBy: userId } });
    }

    return res.json({ discountAmt: 0, newTotal: subTotal, status: "removed", couponVal });
  } catch (error) {
    console.log("❌ Error in removeCoupon:", error);
    res.status(500).json({ status: "error", error });
  }
};



module.exports = {
  loadCheckoutPage,
  placeorder,
  orderSuccess,
  validateCoupon,
  applyCoupon,
  removeCoupon,
};

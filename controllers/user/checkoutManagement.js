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
    let userData = await User.findById(req.session.user._id).lean();
    const ID = new mongoose.Types.ObjectId(userData._id);

    const addressData = await Address.find({ userId: userData._id }).lean();
    // let coupon = await Coupon.find().lean();

    const subTotal = await Cart.aggregate([
      {
        $match: { userId: ID },
      },
      {
        $lookup: {
          from: "products",
          foreignField: "_id",
          localField: "product_Id",
          as: "productData",
        },
      },
      {
        $project: {
          productPrice: { $arrayElemAt: ["$productData.price", 0] }, 
          quantity: 1,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ["$productPrice", "$quantity"] } },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
        },
      },
    ]);

    const coupon = await Coupon.find().lean();
    
    let cart = await Cart.aggregate([
      {
        $match: {
          userId: ID,
        },
      },
      {
        $lookup: {
          from: "products",
          foreignField: "_id",
          localField: "product_Id",
          as: "productData",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          quantity: 1,
          value: 1,
          productName: { $arrayElemAt: ["$productData.name", 0] },
          productPrice: { $arrayElemAt: ["$productData.price", 0] },
          productDescription: { $arrayElemAt: ["$productData.description", 0] },
          productImage: { $arrayElemAt: ["$productData.imageUrl", 0] },
        },
      },
    ]);
    console.log(cart);

    res.render("user/checkout", {
      userData,
      addressData,
      subTotal: subTotal[0].total,
      cart,
      coupon
    });
  } catch (error) {
    console.log(error.message);
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


// Place Order Function
const placeorder = async (req, res) => {
  try {
    console.log("🔹 Session Data at Start:", req.session);

    // ✅ Ensure session and user data exist
    if (!req.session || !req.session.user) {
      console.error("❌ Error: User session not found!");
      return res.status(400).json({ error: "User session not found. Please log in again." });
    }

    // ✅ Define userData safely
    const userData = req.session.user;
    console.log("🔹 User Data:", userData);

    // Extract necessary data
    const userID = new mongoose.Types.ObjectId(userData._id);
    const addressId = req.body.selectedAddress;
    const payMethod = req.body.selectedPayment;
    let totalAmount = req.body.amount;
    const appliedCoupon = req.session.appliedCoupon || req.body.couponVal;

    console.log("🔹 Order details:", { addressId, payMethod, totalAmount, appliedCoupon });

    if (!addressId || !payMethod || !totalAmount) {
      return res.status(400).json({ error: "Missing required order details" });
    }

    // Generate unique order ID
    const orderId = Math.random().toString(36).substring(2, 7) + Math.floor(100000 + Math.random() * 900000);

    // Fetch cart products
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
      {
        $project: {
          product_Id: 1,
          userId: 1,
          quantity: 1,
          name: { $arrayElemAt: ["$productData.name", 0] },
          price: { $arrayElemAt: ["$productData.price", 0] },
          image: { $arrayElemAt: ["$productData.imageUrl", 0] },
        },
      },
    ]);

    let products = cartProducts.map((item) => ({
      _id: item.product_Id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image[0],
    }));

    console.log("🔹 Cart Products:", products);

    // Apply discount if a valid coupon is used
    let discountAmount = 0;
    if (appliedCoupon) {
      const coupon = await Coupon.findOne({ code: appliedCoupon });

      if (coupon) {
        if (coupon.expiryDate < new Date()) {
          return res.status(400).json({ error: "Coupon expired" });
        } else if (totalAmount < coupon.minPurchase) {
          return res.status(400).json({ error: "Minimum purchase amount not met" });
        } else {
          discountAmount = Math.min((totalAmount * coupon.discount) / 100, coupon.maxDiscount);
          totalAmount -= discountAmount;

          // Mark coupon as used by the user
          await Coupon.updateOne({ code: appliedCoupon }, { $addToSet: { usedBy: userID } });
          console.log(`✅ Coupon ${appliedCoupon} applied. Discount: ${discountAmount}`);
        }
      } else {
        return res.status(400).json({ error: "Invalid coupon code" });
      }
    }

    const DELIVERY_CHARGE = 50;
    const grandTotal = totalAmount + DELIVERY_CHARGE;

    // Create order
    const order = new Order({
      userId: userID,
      product: products,
      address: addressId,
      orderId: orderId,
      total: grandTotal,
      paymentMethod: payMethod,
      totalAmount: grandTotal,
      appliedCoupon: appliedCoupon || null,
      discount: discountAmount,
    });

    if (req.body.status) {
      order.status = "Payment Failed";
    }

    await order.save();
    console.log("✅ Order placed successfully!");

    // Update stock and best-selling count
    for (const product of products) {
      await Product.updateOne(
        { _id: product._id },
        { $inc: { stock: -product.quantity, bestSelling: 1 } }
      );

      const populatedProd = await Product.findById(product._id).populate("category").lean();
      if (populatedProd && populatedProd.category) {
        await Category.updateOne({ _id: populatedProd.category._id }, { $inc: { bestSelling: 1 } });
      }
    }

    // Clear cart after order
    await Cart.deleteMany({ userId: userID });
    console.log("✅ Cart cleared after order!");

    // ✅ Redirect or send response
    if (req.headers.accept.includes("text/html")) {
      res.redirect("/checkout/success");
    } else {
      res.json({ success: true, orderId, grandTotal, appliedCoupon });
    }

  } catch (error) {
    console.error("❌ Error in placeorder:", error);

    if (typeof userData === "undefined") {
      console.error("🔹 userData became undefined at some point!");
    }

    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};



// Validate Coupon
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

// Apply Coupon
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

    const isCouponUsed = await Coupon.exists({ code: couponVal, usedBy: userId });

    if (isCouponUsed) {
      return res.json({ status: "already_used" });
    }

    let discountAmt = Math.min((subTotal * coupon.discount) / 100, coupon.maxDiscount);
    const newTotal = subTotal - discountAmt;

    req.session.appliedCoupon = couponVal; // ✅ Store in session

    return res.json({ discountAmt, newTotal, discount: coupon.discount, status: "applied", couponVal });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", error });
  }
};

// Remove Coupon
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

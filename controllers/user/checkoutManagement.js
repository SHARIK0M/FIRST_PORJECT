const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const { Address } = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");

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
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


const placeorder = async (req, res) => {
  try {
    console.log("place order ");
    userData = req.session.user;
    const ID = new mongoose.Types.ObjectId(userData._id);
    const addressId = req.body.selectedAddress;
    const payMethod = req.body.selectedPayment;
    const totalamount = req.body.amount;
    console.log("Request dot body  ", addressId, payMethod, totalamount);

   

    const result = Math.random().toString(36).substring(2, 7);
    const id = Math.floor(100000 + Math.random() * 900000);
    const ordeId = result + id;

    const productInCart = await Cart.aggregate([
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
          product_Id: 1,
          userId: 1,
          quantity: 1,
          value: 1,
          name: { $arrayElemAt: ["$productData.name", 0] },
          price: { $arrayElemAt: ["$productData.price", 0] },
          productDescription: { $arrayElemAt: ["$productData.description", 0] },
          image: { $arrayElemAt: ["$productData.imageUrl", 0] },
        },
      },
    ]);
    console.log(productInCart);

    let productDet = productInCart.map((item) => {
      return {
        _id: item.product_Id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image[0],
      };
    });

    console.log(productDet, "aggregated cart prods");

    // Apply coupon if present
    let finalTotal = totalamount;


    const DELIVERY_CHARGE = 50;
    const grandTotal = finalTotal + DELIVERY_CHARGE;



    // Save the order
    let saveOrder = async () => {
      const order = new Order({
        userId: ID,
        product: productDet,
        address: addressId,
        orderId: ordeId,
        total: grandTotal,
        paymentMethod: payMethod,
        totalAmount: grandTotal,  
       
      });

      if (req.body.status) {
        order.status = "Payment Failed";
        console.log("Payment Failed  ", order.status)
    }

      const ordered = await order.save();
      console.log(ordered, "ordersaved DATAAAA");

      productDet.forEach(async (product) => {
        await Product.updateMany(
          { _id: product._id },
          { $inc: { stock: -product.quantity, bestSelling:1 } }
        );
      });
      productDet.forEach(async (product) => {
        const populatedProd= await Product.findById(product._id).populate("category").lean()
        await Category.updateMany({ _id: populatedProd.category._id }, { $inc: { bestSelling:1} });

    })

      const deletedCart = await Cart.deleteMany({
        userId: ID,
      }).lean();

      console.log(deletedCart, "deletedCart");
    };

    if (addressId) {
      if (payMethod) {
        console.log("CASH ON DELIVERY");
        await saveOrder();
        res.json({ COD: true });
      }  
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


const orderSuccess = async (req, res) => {
  try {
    res.render("user/orderPlaced", {
      title: "Order Placed",
      userData,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};






module.exports = {
  loadCheckoutPage,
  placeorder,
  orderSuccess,
};

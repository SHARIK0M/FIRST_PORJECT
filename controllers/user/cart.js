const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");

// Load the user's cart page with product details
const loadCartPage = async (req, res) => {
  try {
    const userData = req.session.user;
    const ID = new mongoose.Types.ObjectId(userData._id);

    // Get the cart items and join with product data
    let cartProd = await Cart.aggregate([
      { $match: { userId: ID } },
      {
        $lookup: {
          from: "products",
          foreignField: "_id",
          localField: "product_Id",
          as: "productData",
        },
      },
      { $unwind: { path: "$productData", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "productData.isBlocked": { $ne: true }, // Exclude blocked products
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          quantity: 1,
          value: 1,
          productName: "$productData.name",
          productPrice: "$productData.price",
          productDescription: "$productData.description",
          productImage: "$productData.imageUrl",
          stock: "$productData.stock",
        },
      },
    ]);

    cartProd = cartProd.map((item) => {
      if (item.stock <= 0) {
        item.outOfStock = true;
      }
      return item;
    });

    const subTotal = await Cart.aggregate([
      { $match: { userId: ID } },
      { $group: { _id: null, total: { $sum: "$value" } } },
      { $project: { _id: 0, total: 1 } },
    ]);

    if (cartProd.length > 0) {
      res.render("user/cart", {
        userData,
        cartProd,
        subTotal: subTotal[0]?.total || 0,
      });
    } else {
      res.render("user/emptyCart", { userData });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


// Add a product to the user's cart
const addToCart = async (req, res) => {
  try {
    const userData = req.session.user;
    if (!userData) {
      return res.status(401).json({ success: false, message: "Login Required" });
    }

    const { prodId, quantity } = req.body;

    if (!prodId || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const productToCart = await Product.findById(prodId);
    if (!productToCart) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (productToCart.isBlocked) {
      return res.status(403).json({ success: false, message: "This product is no longer available." });
    }

    const cartData = await Cart.create({
      userId: userData._id,
      product_Id: prodId,
      quantity,
      price: productToCart.price,
      value: productToCart.price * quantity,
    });

    res.json({ success: true, message: "Product added to cart", cartItem: cartData });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Remove a product from the cart
const removeFromCart = async (req, res) => {
  try {
    const { id } = req.body;
    const removeCartItem = await Cart.findByIdAndDelete(id);
    if (removeCartItem) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Update the quantity of a product in the cart
const updateCart = async (req, res) => {
  try {
    const { cartIdForUpdate, newValue } = req.body;

    const oldCart = await Cart.findById(cartIdForUpdate);
    const product = await Product.findById(oldCart.product_Id);

    if (!oldCart || !product) {
      return res.json({ success: false, message: "Invalid product/cart item" });
    }

    if (product.isBlocked) {
      return res.json({ success: false, message: "This product is no longer available." });
    }

    if (newValue > product.stock) {
      return res.json({ success: false, message: "Insufficient stock" });
    }

    const updatedCart = await Cart.findByIdAndUpdate(
      cartIdForUpdate,
      { quantity: newValue, value: product.price * newValue },
      { new: true }
    );

    const subTotal = await Cart.aggregate([
      { $match: { userId: oldCart.userId } },
      { $group: { _id: null, total: { $sum: "$value" } } },
      { $project: { _id: 0, total: 1 } },
    ]);

    res.json({
      success: true,
      message: "Cart updated",
      updatedItem: {
        _id: updatedCart._id,
        quantity: updatedCart.quantity,
        totalAmount: `₹${updatedCart.value}`,
      },
      subTotal: `₹${subTotal[0]?.total || 0}`,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


// Check if any product in the cart is out of stock
const checkOutOfStock = async (req, res) => {
  try {
    const userData = req.session.user;
    const cartItems = await Cart.find({ userId: userData._id });

    let outOfStockProducts = [];

    // Check stock status of each product in the cart
    for (let item of cartItems) {
      const product = await Product.findById(item.product_Id);
      if (product.stock <= 0) {
        outOfStockProducts.push(product.name);
      }
    }

    if (outOfStockProducts.length > 0) {
      return res.json({
        success: false,
        message: `Out of stock: ${outOfStockProducts.join(", ")}`,
      });
    }

    res.json({ success: true, message: "All products are in stock" });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};



module.exports = {
  loadCartPage,
  addToCart,
  removeFromCart,
  updateCart,
  checkOutOfStock,
};

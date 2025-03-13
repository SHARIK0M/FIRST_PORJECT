const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const productOffer = require("../../models/proOfferSchema");




const loadCartPage = async (req, res) => {
  try {
    const userData = req.session.user;
    const ID = new mongoose.Types.ObjectId(userData._id);

    // Get cart items with product and offer details
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
      { $match: { "productData.isBlocked": { $ne: true } } }, // Exclude blocked products
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
          _id: 1,
          userId: 1,
          quantity: 1,
          value: 1,
          productName: "$productData.name",
          productPrice: {
            $cond: {
              if: { $gt: [{ $ifNull: ["$productOffer.discountPrice", 0] }, 0] }, 
              then: "$productOffer.discountPrice",
              else: "$productData.price",
            },
          },
          productDescription: "$productData.description",
          productImage: "$productData.imageUrl",
          stock: "$productData.stock",
        },
      },
    ]);

    // Mark products that are out of stock
    cartProd = cartProd.map((item) => {
      if (item.stock <= 0) {
        item.outOfStock = true;
      }
      return item;
    });

    // Calculate subtotal
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

    // Fetch product details along with product offers
    const productToLookup = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(prodId) } }, 
      {
        $lookup: {
          from: "productoffers",
          localField: "_id",
          foreignField: "productId",
          as: "productOffer",
        },
      },
      { $unwind: { path: "$productOffer", preserveNullAndEmptyArrays: true } },
    ]);

    if (!productToLookup || productToLookup.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let productToCart = productToLookup[0];

    // Check if the product is blocked
    if (productToCart.isBlocked) {
      return res.status(403).json({ success: false, message: "This product is no longer available." });
    }

    // Use discounted price if available
    const priceToUse = productToCart.productOffer?.discountPrice || productToCart.price;

    // Check if the product is already in the cart
    const existingCartItem = await Cart.findOne({
      userId: userData._id,
      product_Id: prodId,
    });

    if (existingCartItem) {
      return res.json({
        success: false,
        message: "Product already exists in cart",
      });
    }

    // Add or update the cart
    const cartData = await Cart.findOneAndUpdate(
      { userId: userData._id, product_Id: prodId },
      { quantity, price: priceToUse, value: priceToUse * quantity },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: "Product added to cart",
      cartItem: cartData,
    });

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

const updateCart = async (req, res) => {
  try {
    const { cartIdForUpdate, newValue } = req.body;

    // Fetch the cart item
    const oldCart = await Cart.findById(cartIdForUpdate);
    if (!oldCart) {
      return res.json({ success: false, message: "Invalid cart item" });
    }

    // Fetch the product details
    const product = await Product.findById(oldCart.product_Id, { price: 1, stock: 1, isBlocked: 1 }).lean();
    if (!product) {
      return res.json({ success: false, message: "Invalid product" });
    }

    // Check if the product is blocked
    if (product.isBlocked) {
      return res.json({ success: false, message: "This product is no longer available." });
    }

    // Fetch the product offer (if any)
    const existingOffer = await productOffer.findOne({
      productId: product._id,
      currentStatus: true,
    });

    // Determine final price (discounted if applicable)
    const finalPrice = existingOffer && existingOffer.discountPrice > 0 ? existingOffer.discountPrice : product.price;

    // Check stock limits
    if (newValue > product.stock) {
      return res.json({ success: false, message: "Product stock limit reached!" });
    }

    // Limit the quantity per user to 4
    if (newValue > 4) {
      return res.json({ success: false, message: "You can only choose up to 4 units of this product." });
    }

    // Calculate new total value dynamically
    const updatedValue = newValue * finalPrice;

    // Update cart item
    const updatedCart = await Cart.findByIdAndUpdate(
      cartIdForUpdate,
      { quantity: newValue, value: updatedValue },  // Ensure the value is updated dynamically
      { new: true }
    );

    // Calculate subtotal dynamically
    const subTotal = await Cart.aggregate([
      { $match: { userId: oldCart.userId } },
      { $group: { _id: null, total: { $sum: "$value" } } },
      { $project: { _id: 0, total: 1 } },
    ]);

    // Prepare updated cart data
    const updatedItem = {
      _id: updatedCart._id,
      quantity: updatedCart.quantity,
      totalAmount: product.stock <= 0 ? "Out of Stock" : `₹${updatedCart.value}`, // Ensure total amount is dynamically calculated
      currentStock: product.stock,
      outOfStock: product.stock <= 0,
    };

    res.json({
      success: true,
      message: "Cart Updated",
      updatedItem,
      cartValue: subTotal[0]?.total || 0, // Ensure subtotal is also updated dynamically
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

// Import necessary models
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const { Address } = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");

const mongoose = require("mongoose");

// Controller to handle the orders page
const ordersPage = async (req, res) => {
  try {
    // Fetch the user details based on the session
    const user = await User.findOne({ _id: req.session.user_id });

    // Set the current page, default to 1 if not provided
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }

    // Define the limit of orders per page
    let limit = 3;

    // Fetch orders with pagination and sorting by date (most recent first)
    const ordersData = await Order.find()
      .sort({ date: -1 })
      .skip((page - 1) * limit) // Skip the orders of previous pages
      .limit(limit) // Limit the number of orders per page
      .lean();

    // Get the total number of orders
    const count = await Order.countDocuments();

    // Calculate total pages for pagination
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    // Render the orders page with the data
    res.render("admin/orders", {
      admin: true,
      pages,
      currentPage: page,
      ordersData,
      layout: "adminLayout",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Controller to handle the order details page
const orderDetails = async (req, res) => {
  try {
    // Get the order ID from the URL
    const orderId = req.params.id;
    const IDORDER = new mongoose.Types.ObjectId(orderId);

    // Fetch the order details from the database
    const myOrderDetails = await Order.findOne({ _id: orderId }).lean();

    // Fetch the shipping address related to the order
    const address = await Address.findOne({
      _id: myOrderDetails.address,
    }).lean();

    // Fetch the products related to this order
    const orderedProDet = await Order.aggregate([
      { $match: { _id: IDORDER } },
      { $unwind: "$product" }, // Unwind the product array for detailed info
      { $unwind: "$product" }, // Repeat unwind (possible mistake? Only need one)
      { $project: { _id: 0, product: 1 } }, // Project only the product details
    ]);

    // Render the order details page with the relevant data
    res.render("admin/order_Details", {
      admin: true,
      orderedProDet,
      layout: "adminlayout",
      address,
      myOrderDetails,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

// Controller to change the order status
const changeStatus = async (req, res) => {
  try {
      const orderID = req.params.id;
      const newStatus = req.body.status;

      // Fetch the current order status from the database
      const order = await Order.findById(orderID);

      if (!order) {
          return res.status(404).send("Order not found");
      }

      // Prevent status change if the order is Canceled or Delivered
      if (order.status === "Canceled" || order.status === "Delivered") {
          return res.status(400).send("Order status cannot be changed");
      }

      // Prevent setting "Shipped" if the order is already "Delivered"
      if (newStatus === "Shipped" && order.status === "Delivered") {
          return res.status(400).send("Cannot set Shipped after Delivered");
      }

      // Update the status in the database
      order.status = newStatus;
      await order.save();

      res.redirect("/admin/orders");
  } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
  }
};


// Export the controller functions for use in routes
module.exports = {
  ordersPage,
  orderDetails,
  changeStatus,
};

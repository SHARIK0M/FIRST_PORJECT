const mongoose = require("mongoose");
const { isCancelled } = require("../helpers/hbsHelpers");
const Schema=mongoose.Schema

const orderSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  product: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "products" },
      name: { type: String },
      price: { type: Number },
      quantity: { type: Number },
      image: { type: String },
      isCancelled: { type: Boolean, default: false }, // Add this
      isReturned: { type: Boolean, default: false }, // Add this
      cancelReason: { type: String, default: null },  // Store cancel reason
      returnReason: { type: String, default: null }   // Store return reason
     
    },
  ],

  address: {
    type: String,
    required: true,
  },

  orderId: {
    type: String,
    required: true,
  },

  total: {
    type: Number,
    required: true,
  },

  discountAmt: {
    type: Number,
  },

  totalAmount: {
    type: Number,
  
  },
  paymentMethod: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    enum: ["pending", "Shipped", "Delivered", 'Cancelled', 'Returned' , 'Payment Failed'],
    default: "pending",
  },

  date: {
    type: Date,
    default: Date.now,
  },
  cancelReason: { type: String, default: null },  // Store reason for entire order cancellation
  returnReason: { type: String, default: null }   // Store reason for entire order return
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;

const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const { Address } = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const moment = require('moment');
const mongoose = require('mongoose');

// Handle payment failure
const payment_failed = (req, res) => {
    try {
        const userData = req.session.user;  // Get user data from session
        const { error, payment_method, order_id } = req.query;  // Extract error, payment method, and order ID from query params

        // Log the error for debugging
        console.error("Payment failed for order:", order_id);
        console.error("Error details:", error);

        // Render the payment failed page with relevant details
        res.render('user/paymentFailed', {
            userData,
            error,
            payment_method,
            order_id,
            message: 'Your payment attempt failed. Please try again or choose another payment method.'
        });
    } catch (error) {
        console.log("Error in payment_failed route:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Cancel the entire order with reason
const cancelOrder = async (req, res) => {
    try {
        const id = req.params.id;  // Get order ID from the route parameters
        const { reason } = req.body; // Get cancellation reason from request body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        let canceledOrder = await Order.findOne({ _id: ID });

        if (!canceledOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update order status and store cancel reason (only at the order level)
        await Order.updateOne({ _id: ID }, { $set: { status: 'Cancelled', cancelReason: reason } });

        // Update product stock and mark products as cancelled (without storing reason at the product level)
        for (const product of canceledOrder.product) {
            if (!product.isCancelled) {
                await Product.updateOne(
                    { _id: product.id },
                    { $inc: { stock: product.quantity } }
                );
                await Order.updateOne(
                    { _id: ID, 'product.id': product.id },
                    { $set: { 'product.$.isCancelled': true } }
                );
            }
        }

        res.json({
            success: true,
            message: 'Successfully cancelled Order'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Return the entire order with reason
const returnOrder = async (req, res) => {
    try {
        const id = req.params.id;  // Get order ID from route parameters
        const { reason } = req.body; // Get return reason from request body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        let returnedOrder = await Order.findOne({ _id: ID });

        if (!returnedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update order status and store return reason (only at the order level)
        await Order.updateOne({ _id: ID }, { $set: { status: 'Returned', returnReason: reason } });

        // Update product stock and mark products as returned (without storing reason at the product level)
        for (const product of returnedOrder.product) {
            if (!product.isReturned) {
                await Product.updateOne(
                    { _id: product.id },
                    { $inc: { stock: product.quantity } }
                );
                await Order.updateOne(
                    { _id: ID, 'product.id': product.id },
                    { $set: { 'product.$.isReturned': true } }
                );
            }
        }

        res.json({
            success: true,
            message: 'Successfully returned Order'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};



const cancelOneProduct = async (req, res) => {
    try {
        const { id, prodId, reason } = req.body;  // Get reason from request body
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(prodId)) {
            return res.status(400).json({ error: 'Invalid order or product ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        const PRODID = new mongoose.Types.ObjectId(prodId);

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: ID, 'product._id': PRODID },
            { 
                $set: { 
                    'product.$.isCancelled': true, 
                    'product.$.status': "Canceled", 
                    'product.$.cancelReason': reason 
                } 
            },
            { new: true }
        ).lean();

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order or product not found' });
        }

        // Verify if status is updated
        console.log("Updated Order:", updatedOrder);

        // Fetch the updated product details
        const result = await Order.findOne(
            { _id: ID, 'product._id': PRODID }, 
            { 'product.$': 1 }
        ).lean();

        console.log("Product after update:", result);

        const productQuantity = result.product[0].quantity;
        const productPrice = result.product[0].price * productQuantity;

        // Update product stock
        await Product.findOneAndUpdate(
            { _id: PRODID },
            { $inc: { stock: productQuantity } }
        );

        // Refund user
        await User.updateOne(
            { _id: req.session.user._id },
            { $inc: { wallet: productPrice } }
        );

        // Add refund history
        await User.updateOne(
            { _id: req.session.user._id },
            { 
                $push: { 
                    history: { 
                        amount: productPrice, 
                        status: `Refund of: ${result.product[0].name}`, 
                        date: Date.now() 
                    } 
                } 
            }
        );

        res.json({
            success: true,
            message: 'Successfully canceled product'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Return a single product in the order
const returnOneProduct = async (req, res) => {
    try {
        const { id, prodId, reason } = req.body;  // Get reason from request body
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(prodId)) {
            return res.status(400).json({ error: 'Invalid order or product ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        const PRODID = new mongoose.Types.ObjectId(prodId);

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: ID, 'product._id': PRODID },
            { 
                $set: { 
                    'product.$.isReturned': true, 
                    'product.$.status': "Returned", 
                    'product.$.returnReason': reason 
                } 
            },
            { new: true }
        ).lean();

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order or product not found' });
        }

        console.log("Updated Order:", updatedOrder);

        // Fetch the updated product details
        const result = await Order.findOne(
            { _id: ID, 'product._id': PRODID }, 
            { 'product.$': 1 }
        ).lean();

        console.log("Product after update:", result);

        const productQuantity = result.product[0].quantity;
        const productPrice = result.product[0].price * productQuantity;

        // Update product stock
        await Product.findOneAndUpdate(
            { _id: PRODID },
            { $inc: { stock: productQuantity } }
        );

        // Add refund history
        await User.updateOne(
            { _id: req.session.user._id },
            { 
                $push: { 
                    history: { 
                        amount: productPrice, 
                        status: `[return] Refund of: ${result.product[0].name}`, 
                        date: Date.now() 
                    } 
                } 
            }
        );

        res.json({
            success: true,
            message: 'Successfully returned product'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    payment_failed,
    cancelOrder,
    cancelOneProduct,
    returnOrder,
    returnOneProduct
};

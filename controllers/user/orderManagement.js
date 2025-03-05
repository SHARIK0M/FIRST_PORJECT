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

// Cancel the entire order
const cancelOrder = async (req, res) => {
    try {
        const id = req.params.id;  // Get order ID from the route parameters
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });  // Validate order ID
        }

        const ID = new mongoose.Types.ObjectId(id);  // Convert to ObjectId
        let canceledOrder = await Order.findOne({ _id: ID });  // Find the order by ID

        if (!canceledOrder) {
            return res.status(404).json({ error: 'Order not found' });  // If order not found
        }

        // Update order status to 'Cancelled'
        await Order.updateOne({ _id: ID }, { $set: { status: 'Cancelled' } });

        // Update product stock and cancel product
        for (const product of canceledOrder.product) {
            if (!product.isCancelled) {
                await Product.updateOne(
                    { _id: product._id },
                    { $inc: { stock: product.quantity }, $set: { isCancelled: true } }
                );
                await Order.updateOne(
                    { _id: ID, 'product._id': product._id },
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

// Return the entire order
const returnOrder = async (req, res) => {
    try {
        const id = req.params.id;  // Get order ID from route parameters
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });  // Validate order ID
        }

        const ID = new mongoose.Types.ObjectId(id);
        let returnedOrder = await Order.findOne({ _id: ID }).lean();  // Find order by ID

        // Update order status to 'Returned'
        const returnedorder = await Order.findByIdAndUpdate(ID, { $set: { status: 'Returned' } }, { new: true });

        // Update product stock and set 'isReturned' flag
        for (const product of returnedorder.product) {
            if (!product.isCancelled) {
                await Product.updateOne(
                    { _id: product._id },
                    { $inc: { stock: product.quantity } }
                );
                await Order.updateOne(
                    { _id: ID, 'product._id': product._id },
                    { $set: { 'product.$.isReturned': true } }
                );
            }
        }

        res.json({
            success: true,
            message: 'Successfully Returned Order'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    
    }
};

// Cancel a single product in the order
const cancelOneProduct = async (req, res) => {
    try {
        const { id, prodId } = req.body;  // Get order and product IDs from request body
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(prodId)) {
            return res.status(400).json({ error: 'Invalid order or product ID' });  // Validate IDs
        }

        const ID = new mongoose.Types.ObjectId(id);
        const PRODID = new mongoose.Types.ObjectId(prodId);

        // Update product's 'isCancelled' status in order
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: ID, 'product._id': PRODID },
            { $set: { 'product.$.isCancelled': true } },
            { new: true }
        ).lean();

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order or product not found' });
        }

        const result = await Order.findOne({ _id: ID, 'product._id': PRODID }, { 'product.$': 1 }).lean();
        const productQuantity = result.product[0].quantity;
        const productPrice = result.product[0].price * productQuantity;

        // Update product stock and user wallet
        await Product.findOneAndUpdate({ _id: PRODID }, { $inc: { stock: productQuantity } });
        await User.updateOne({ _id: req.session.user._id }, { $inc: { wallet: productPrice } });
        
        // Add refund history for the user
        await User.updateOne(
            { _id: req.session.user._id },
            { $push: { history: { amount: productPrice, status: `refund of: ${result.product[0].name}`, date: Date.now() } } }
        );

        res.json({
            success: true,
            message: 'Successfully removed product'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Return a single product in the order
const returnOneProduct = async (req, res) => {
    try {
        const { id, prodId } = req.body;  // Get order and product IDs from request body
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(prodId)) {
            return res.status(400).json({ error: 'Invalid order or product ID' });  // Validate IDs
        }

        const ID = new mongoose.Types.ObjectId(id);
        const PRODID = new mongoose.Types.ObjectId(prodId);

        // Update product's 'isReturned' status in order
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: ID, 'product._id': PRODID },
            { $set: { 'product.$.isReturned': true } },
            { new: true }
        ).lean();

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order or product not found' });
        }

        const result = await Order.findOne({ _id: ID, 'product._id': PRODID }, { 'product.$': 1 }).lean();
        const productQuantity = result.product[0].quantity;
        const productPrice = result.product[0].price * productQuantity;

        // Update product stock and add return history for the user
        await Product.findOneAndUpdate({ _id: PRODID }, { $inc: { stock: productQuantity } });
        await User.updateOne(
            { _id: req.session.user._id },
            { $push: { history: { amount: productPrice, status: `[return]refund of: ${result.product[0].name}`, date: Date.now() } } }
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

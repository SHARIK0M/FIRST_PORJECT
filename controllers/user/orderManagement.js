const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const { Address } = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const moment = require('moment');
const mongoose = require('mongoose');
const easyinvoice = require('easyinvoice');

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
        const id = req.params.id;  // Get order ID from request params
        const { reason } = req.body; // Get cancellation reason

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        let order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if order is already cancelled
        if (order.status === 'Cancelled') {
            return res.status(400).json({ error: 'Order is already cancelled' });
        }

        // **Step 1: Cancel all products**
        let allProductsCancelled = true;
        
        for (let product of order.product) {
            if (!product.isCancelled) {
                product.isCancelled = true;
                product.status = "Cancelled";
            }

            if (!product.isCancelled) {
                allProductsCancelled = false;
            }
        }

        // **Step 2: Set cancelReason only for entire order**
        if (allProductsCancelled) {
            order.status = "Cancelled";
            order.cancelReason = reason; // Store reason only in main order
        } else {
            order.status = "Partially Cancelled";
        }

        await order.save(); // Save updated order details

        // **Step 3: Restore stock for all cancelled products**
        for (const product of order.product) {
            await Product.updateOne(
                { _id: product.id },
                { $inc: { stock: product.quantity } }
            );
        }

        // **Step 4: Refund full amount (if fully cancelled)**
        if (order.status === "Cancelled") {
            await User.updateOne(
                { _id: req.session.user._id },
                { $inc: { wallet: order.total } }
            );

            // Add refund history
            await User.updateOne(
                { _id: req.session.user._id },
                { 
                    $push: { 
                        history: { 
                            amount: order.total, 
                            status: `Refund for Order ID: ${id}`, 
                            date: Date.now() 
                        } 
                    } 
                }
            );
        }

        res.json({
            success: true,
            message: order.status === "Cancelled" 
                ? 'Successfully cancelled the entire order' 
                : 'Partially cancelled the order'
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Return the entire order with reason
const returnOrder = async (req, res) => {
    try {
        const id = req.params.id;  // Get order ID from request parameters
        const { reason } = req.body; // Get return reason from request body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        let order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if order is already returned
        if (order.status === 'Returned') {
            return res.status(400).json({ error: 'Order is already returned' });
        }

        let allProductsReturned = true;
        let anyProductReturned = false;

        for (let product of order.product) {
            // Skip canceled products (they cannot be returned)
            if (product.isCancelled) continue;

            // If not already returned, mark it as returned
            if (!product.isReturned) {
                product.isReturned = true;
                anyProductReturned = true;
            }

            // If any product is not returned, mark order as partially returned
            if (!product.isReturned) {
                allProductsReturned = false;
            }
        }

        // If at least one non-canceled product was returned, update the order status
        if (anyProductReturned) {
            if (allProductsReturned) {
                order.status = "Returned";
                order.returnReason = reason;
            } else {
                order.status = "Partially Returned";
            }
        }

        await order.save();

        // Restore stock for returned products
        for (const product of order.product) {
            if (product.isReturned && !product.isCancelled) {
                await Product.updateOne(
                    { _id: product.id },
                    { $inc: { stock: product.quantity } }
                );
            }
        }

        // Refund full amount if fully returned
        if (order.status === "Returned") {
            await User.updateOne(
                { _id: req.session.user._id },
                { $inc: { wallet: order.total } }
            );

            // Add refund history
            await User.updateOne(
                { _id: req.session.user._id },
                { 
                    $push: { 
                        history: { 
                            amount: order.total, 
                            status: `Refund for Order ID: ${id}`, 
                            date: Date.now() 
                        } 
                    } 
                }
            );
        }

        res.json({
            success: true,
            message: order.status === "Returned" 
                ? 'Successfully returned the entire order' 
                : 'Partially returned the order'
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

const generateInvoice = async (req, res) => {
    try {
        const orderId = req.query.id;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send({ message: 'Order not found' });
        }

        // Fetch user and address details
        const { userId, address: addressId } = order;
        const [user, address] = await Promise.all([
            User.findById(userId),
            Address.findById(addressId),
        ]);

        if (!user || !address) {
            return res.status(404).send({ message: 'User or address not found' });
        }

        // Prepare invoice data
        const products = order.product.map((product) => ({
            quantity: product.quantity.toString(),
            description: product.name,
            tax: product.tax,
            price: product.price,
        }));

        // Add delivery charge
        products.push({
            quantity: '1',
            description: 'Delivery Charge',
            tax: 0,
            price: 50,
        });

        const date = moment(order.date).format('MMMM D, YYYY');

        const data = {
            currency: 'INR',
            taxNotation: 'vat',
            marginTop: 25,
            marginRight: 25,
            marginLeft: 25,
            marginBottom: 25,
            sender: {
                company: 'Floritta',
                address: 'Park Avenue',
                zip: '600034',
                city: 'Chennai',
                country: 'India',
            },
            client: {
                company: user.name,
                address: address.addressLine1,
                zip: address.pin,
                city: address.city,
                country: 'India',
            },
            information: {
                number: `INV-${orderId}`,
                date: date,
            },
            products: products,
        };

        // Generate invoice PDF
        easyinvoice.createInvoice(data, function (result) {
            const fileName = `invoice_${orderId}.pdf`;
            const pdfBuffer = Buffer.from(result.pdf, 'base64');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            res.send(pdfBuffer);
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
}

module.exports = {
    payment_failed,
    cancelOrder,
    cancelOneProduct,
    returnOrder,
    returnOneProduct,
    generateInvoice
};

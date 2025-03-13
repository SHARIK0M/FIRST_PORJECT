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



const cancelOrder = async (req, res) => {
    try {
        const id = req.params.id;
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        let order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        if (order.status === 'Cancelled') {
            return res.status(400).json({ error: 'Order is already cancelled' });
        }

        let totalRefund = 0;
        let totalOrderValue = order.product.reduce((acc, product) => acc + (product.price * product.quantity), 0);
        console.log(`Total Order Value Before Cancellation: ${totalOrderValue}`);

        let newlyCancelledProducts = [];

        for (let product of order.product) {
            if (!product.isCancelled) {
                product.isCancelled = true;
                product.status = "Cancelled";
                totalRefund += product.price * product.quantity;
                newlyCancelledProducts.push(product);
                console.log(`Cancelled Product: ${product.name}, Price: ${product.price}, Quantity: ${product.quantity}, Refund Added: ${totalRefund}`);
            }
        }

        let allProductsCancelled = order.product.every(p => p.isCancelled);
        if (allProductsCancelled) {
            order.status = "Cancelled";
            order.cancelReason = reason;
            order.orderRefunded = true;
        } else {
            order.status = "Partially Cancelled";
        }

        // Apply Coupon Discount Calculation
        if (order.discountAmt && newlyCancelledProducts.length > 0) {
            let discountPerProduct = order.discountAmt / order.product.length;
            let totalDiscountToDeduct = discountPerProduct * newlyCancelledProducts.length;
            console.log(`Discount Per Product: ${discountPerProduct}, Newly Canceled Products: ${newlyCancelledProducts.length}, Total Discount Deducted: ${totalDiscountToDeduct}`);

            totalRefund -= totalDiscountToDeduct;
            if (totalRefund < 0) totalRefund = 0;
        }
        console.log(`Total Refund After Coupon Adjustment: ${totalRefund}`);

        await order.save();

        for (const product of newlyCancelledProducts) {
            await Product.updateOne(
                { _id: product.id },
                { $inc: { stock: product.quantity } }
            );
            product.refunded = true;
            console.log(`Stock Updated for Product: ${product.name}, Quantity Restocked: ${product.quantity}`);
        }

        if (totalRefund > 0) {
            await User.updateOne(
                { _id: req.session.user._id },
                { $inc: { wallet: totalRefund } }
            );
            console.log(`Final Refund Processed: ${totalRefund}`);

            await User.updateOne(
                { _id: req.session.user._id },
                {
                    $push: {
                        history: {
                            amount: totalRefund,
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

const returnOrder = async (req, res) => {
    try {
        const id = req.params.id; // Get order ID from request parameters
        const { reason } = req.body; // Get return reason from request body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        let order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if the order is already fully returned
        if (order.status === 'Returned') {
            return res.status(400).json({ error: 'Order is already fully returned' });
        }

        let totalRefund = 0;
        let newlyReturnedProducts = [];

        // Calculate total order value before return
        let totalOrderValue = order.product.reduce((acc, product) => {
            return acc + (product.price * product.quantity);
        }, 0);

        console.log("Total Order Value Before Return:", totalOrderValue);

        for (let product of order.product) {
            // Skip cancelled products (they cannot be returned)
            if (product.isCancelled) continue;

            // Skip already returned products to prevent double refund
            if (product.isReturned) continue;

            // Mark the product as returned
            product.isReturned = true;
            totalRefund += product.price * product.quantity;
            newlyReturnedProducts.push(product);
            console.log(`Returned Product: ${product.name}, Price: ${product.price}, Quantity: ${product.quantity}, Refund Added: ${totalRefund}`);
        }

        // Check if all products are returned
        let allProductsReturned = order.product.every(p => p.isCancelled || p.isReturned);

        if (allProductsReturned) {
            order.status = "Returned";
            order.returnReason = reason;
        } else {
            order.status = "Partially Returned";
        }

        // **Apply Coupon Refund Logic**
        if (order.discountAmt && newlyReturnedProducts.length > 0) {
            let discountPerProduct = order.discountAmt / order.product.length;
            let discountToDeduct = newlyReturnedProducts.length * discountPerProduct;
            totalRefund -= discountToDeduct;

            console.log(`Discount Per Product: ${discountPerProduct}, Returned Products: ${newlyReturnedProducts.length}, Total Discount Deducted: ${discountToDeduct}`);
            if (totalRefund < 0) totalRefund = 0; // Ensure refund is not negative
        }

        await order.save();

        // Restore stock for newly returned products
        for (const product of newlyReturnedProducts) {
            await Product.updateOne(
                { _id: product.id },
                { $inc: { stock: product.quantity } }
            );
            console.log(`Stock Updated for Product: ${product.name}, Quantity Restocked: ${product.quantity}`);
        }

        // Process refund for newly returned products
        if (totalRefund > 0) {
            await User.updateOne(
                { _id: req.session.user._id },
                { $inc: { wallet: totalRefund } }
            );
            console.log("Final Refund Processed:", totalRefund);

            await User.updateOne(
                { _id: req.session.user._id },
                { 
                    $push: { 
                        history: { 
                            amount: totalRefund, 
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
        const { id, prodId, reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(prodId)) {
            return res.status(400).json({ error: 'Invalid order or product ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        const PRODID = new mongoose.Types.ObjectId(prodId);

        const order = await Order.findById(ID);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Find the product in the order
        const product = order.product.find(p => p._id.toString() === prodId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found in order' });
        }

        if (product.isCancelled) {
            return res.status(400).json({ error: 'Product is already cancelled' });
        }

        // Mark product as cancelled
        product.isCancelled = true;
        product.status = "Cancelled";
        product.cancelReason = reason;

        // Calculate proportional discount for this product
        const totalProducts = order.product.length;
        const discountAmt = order.discountAmt || 0;  // Ensure discountAmt exists
        const productDiscount = discountAmt / totalProducts;  // Divide discount equally

        // Calculate refund amount (Price * Quantity - Proportional Discount)
        const productQuantity = product.quantity;
        const productPrice = product.price * productQuantity;
        const refundAmount = productPrice - productDiscount;

        console.log("Product Price:", productPrice);
        console.log("Discount Per Product:", productDiscount);
        console.log("Refund Amount:", refundAmount);

        // Save the updated order
        await order.save();

        // Update product stock
        await Product.findOneAndUpdate(
            { _id: PRODID },
            { $inc: { stock: productQuantity } }
        );

        // Refund user (adjusted for discount)
        await User.updateOne(
            { _id: req.session.user._id },
            { $inc: { wallet: refundAmount } }
        );

        // Add refund history
        await User.updateOne(
            { _id: req.session.user._id },
            { 
                $push: { 
                    history: { 
                        amount: refundAmount, 
                        status: `Refund for ${product.name} (Order ID: ${id})`, 
                        date: Date.now() 
                    } 
                } 
            }
        );

        res.json({
            success: true,
            message: 'Successfully cancelled product and processed refund'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const returnOneProduct = async (req, res) => {
    try {
        const { id, prodId, reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(prodId)) {
            return res.status(400).json({ error: 'Invalid order or product ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        const PRODID = new mongoose.Types.ObjectId(prodId);

        const order = await Order.findById(ID);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Find the product in the order
        const product = order.product.find(p => p._id.toString() === prodId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found in order' });
        }

        if (product.isReturned) {
            return res.status(400).json({ error: 'Product is already returned' });
        }

        // Mark product as returned
        product.isReturned = true;
        product.status = "Returned";
        product.returnReason = reason;

        // Calculate proportional discount for this product
        const totalProducts = order.product.length;
        const discountAmt = order.discountAmt || 0;  // Ensure discountAmt exists
        const productDiscount = discountAmt / totalProducts;  // Divide discount equally

        // Calculate refund amount (Price * Quantity - Proportional Discount)
        const productQuantity = product.quantity;
        const productPrice = product.price * productQuantity;
        const refundAmount = productPrice - productDiscount;

        console.log("Product Price:", productPrice);
        console.log("Discount Per Product:", productDiscount);
        console.log("Refund Amount:", refundAmount);

        // Save the updated order
        await order.save();

        // Update product stock
        await Product.findOneAndUpdate(
            { _id: PRODID },
            { $inc: { stock: productQuantity } }
        );

        // Refund user (adjusted for discount)
        await User.updateOne(
            { _id: req.session.user._id },
            { $inc: { wallet: refundAmount } }
        );

        // Add refund history
        await User.updateOne(
            { _id: req.session.user._id },
            { 
                $push: { 
                    history: { 
                        amount: refundAmount, 
                        status: `[return] Refund for ${product.name} (Order ID: ${id})`, 
                        date: Date.now() 
                    } 
                } 
            }
        );

        res.json({
            success: true,
            message: 'Successfully returned product and processed refund'
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

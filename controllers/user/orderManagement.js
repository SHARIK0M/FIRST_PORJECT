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
        let newlyCancelledProducts = [];

        // Calculate total order amount & discount percentage
        const totalAmt = order.totalAmt && order.totalAmt > 0 
            ? order.totalAmt 
            : order.product.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const discountAmt = order.discountAmt || 0;
        const discountPercentage = totalAmt > 0 ? (discountAmt / totalAmt) * 100 : 0;

        console.log("Total Order Value:", totalAmt);
        console.log("Discount Percentage:", discountPercentage.toFixed(2) + "%");

        for (let product of order.product) {
            if (!product.isCancelled) {
                product.isCancelled = true;
                product.status = "Cancelled";
                newlyCancelledProducts.push(product);

                // Calculate refund amount per product
                const productTotal = product.price * product.quantity;
                const productDiscount = (productTotal * discountPercentage) / 100;
                const refundAmount = Math.max(productTotal - productDiscount, 0);

                totalRefund += refundAmount;

                console.log(`Cancelled Product: ${product.name}, Price: ${product.price}, Quantity: ${product.quantity}`);
                console.log(`Product Discount: ${productDiscount}, Final Refund: ${refundAmount}`);
            }
        }

        // Check if all products are cancelled
        let allProductsCancelled = order.product.every(p => p.isCancelled);

        if (allProductsCancelled) {
            order.status = "Cancelled";
            order.cancelReason = reason;
            order.orderRefunded = true;
        } else {
            order.status = "Partially Cancelled";
        }

        console.log(`Total Refund After Coupon Adjustment: ${totalRefund}`);

        await order.save();

        // Restore stock for newly cancelled products
        for (const product of newlyCancelledProducts) {
            await Product.updateOne(
                { _id: product._id },
                { $inc: { stock: product.quantity } }
            );
            product.refunded = true;
            console.log(`Stock Updated for Product: ${product.name}, Quantity Restocked: ${product.quantity}`);
        }

        // Process refund for newly cancelled products
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
                            amount: Math.floor(totalRefund),
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

        // Calculate total order amount & discount percentage
        const totalAmt = order.totalAmt && order.totalAmt > 0 
            ? order.totalAmt 
            : order.product.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const discountAmt = order.discountAmt || 0;
        const discountPercentage = totalAmt > 0 ? (discountAmt / totalAmt) * 100 : 0;

        console.log("Total Order Value:", totalAmt);
        console.log("Discount Percentage:", discountPercentage.toFixed(2) + "%");

        for (let product of order.product) {
            // Skip cancelled or already returned products
            if (product.isCancelled || product.isReturned) continue;

            // Mark the product as returned
            product.isReturned = true;
            product.status = "Returned";
            newlyReturnedProducts.push(product);

            // Calculate refund amount per product
            const productTotal = product.price * product.quantity;
            const productDiscount = (productTotal * discountPercentage) / 100;
            const refundAmount = Math.max(productTotal - productDiscount, 0);

            totalRefund += refundAmount;

            console.log(`Returned Product: ${product.name}, Price: ${product.price}, Quantity: ${product.quantity}`);
            console.log(`Product Discount: ${productDiscount}, Final Refund: ${refundAmount}`);
        }

        // Check if all products are returned
        let allProductsReturned = order.product.every(p => p.isCancelled || p.isReturned);

        if (allProductsReturned) {
            order.status = "Returned";
            order.returnReason = reason;
        } else {
            order.status = "Partially Returned";
        }

        await order.save();

        // Restore stock for newly returned products
        for (const product of newlyReturnedProducts) {
            await Product.updateOne(
                { _id: product._id },
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
                            amount: Math.floor(totalRefund), 
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

        // Correctly retrieve total order amount and discount
        const totalAmt = order.totalAmt && order.totalAmt > 0 ? order.totalAmt : order.product.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const discountAmt = order.discountAmt || 0;

        // Calculate correct discount percentage
        const discountPercentage = totalAmt > 0 ? (discountAmt / totalAmt) * 100 : 0;

        // Calculate refund amount with correct discount reduction
        const productQuantity = product.quantity;
        const productPrice = product.price * productQuantity;
        const discountForProduct = (productPrice * discountPercentage) / 100;
        const refundAmount = Math.max(productPrice - discountForProduct, 0);

        console.log("Subtotal:", totalAmt);
        console.log("Total Order Amount:", totalAmt);
        console.log("Product Price:", productPrice);
        console.log("Discount Percentage:", discountPercentage.toFixed(2) + "%");
        console.log("Discount Amount for Product:", discountForProduct);
        console.log("Final Refund Amount:", refundAmount);

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
                        amount: Math.floor(refundAmount), 
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

        // Correctly retrieve total order amount and discount
        const totalAmt = order.totalAmt && order.totalAmt > 0 ? order.totalAmt : order.product.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const discountAmt = order.discountAmt || 0;

        // Calculate correct discount percentage
        const discountPercentage = totalAmt > 0 ? (discountAmt / totalAmt) * 100 : 0;

        // Calculate refund amount with correct discount reduction
        const productQuantity = product.quantity;
        const productPrice = product.price * productQuantity;
        const discountForProduct = (productPrice * discountPercentage) / 100;
        const refundAmount = Math.max(productPrice - discountForProduct, 0);

        console.log("Subtotal:", totalAmt);
        console.log("Total Order Amount:", totalAmt);
        console.log("Product Price:", productPrice);
        console.log("Discount Percentage:", discountPercentage.toFixed(2) + "%");
        console.log("Discount Amount for Product:", discountForProduct);
        console.log("Final Refund Amount:", refundAmount);

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
                        amount: Math.floor(refundAmount), 
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
            return res.status(HttpStatus.NotFound).send({ message: 'Order not found' });
        }

        const { userId, address: addressId, discountAmt = 0 } = order;
        const [user, address] = await Promise.all([
            User.findById(userId),
            Address.findById(addressId),
        ]);

        if (!user || !address) {
            return res.status(HttpStatus.NotFound).send({ message: 'User or address not found' });
        }

        let products = order.product.map((product) => ({
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

        // Add discount as a separate item
        if (discountAmt > 0) {
            products.push({
                quantity: '1',
                description: 'Discount Applied',
                tax: 0,
                price: `-${discountAmt}`,
                  // Ensure discount is negative
            });
        }

        const date = moment(order.date).format('MMMM D, YYYY');

        const data = {
            mode: "development",
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
                address: address.adressLine1,
                zip: address.pin,
                city: address.city,
                country: 'India',
            },
            information: {
                date: date,
            },
            products: products,
            bottomNotice: "Thank you for your purchase!", // Add a bottom note
        };

        easyinvoice.createInvoice(data, function (result) {
            const fileName = `invoice_${orderId}.pdf`;
            const pdfBuffer = Buffer.from(result.pdf, 'base64');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            res.send(pdfBuffer);
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(HttpStatus.InternalServerError).send('Internal Server Error');
    }
};







module.exports = {
    payment_failed,
    cancelOrder,
    cancelOneProduct,
    returnOrder,
    returnOneProduct,
    generateInvoice
};

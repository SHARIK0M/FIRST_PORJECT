const moment = require('moment');
const Sale = require("../../models/orderSchema");
const Order = require("../../models/orderSchema");
const PDFDocument = require('pdfkit');
const hbs = require('hbs');
const Handlebars = require('handlebars');
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const HttpStatus = require('../../httpStatus');


let months = [];
let odersByMonth = [];
let revnueByMonth = [];
let totalRevnue = 0;
let totalSales = 0;
let categories = [];
let revenues = [];

const loadDashboard = async (req, res) => {
    try {
    // Count the total number of categories
        const categoryCount = await Category.countDocuments();
            // Calculate revenue per category
        const categoryRevenue = await Order.aggregate([
            { $unwind: "$product" },
            {
                $lookup: {
                    from: "products",
                    localField: "product._id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.category",
                    totalRevenue: { $sum: { $multiply: ["$product.quantity", "$productDetails.price"] } }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $project: {
                    _id: 0,
                    category: "$categoryDetails.category",
                    totalRevenue: 1
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

            // Extract category names and revenues
        categories = categoryRevenue.map(item => item.category);
        revenues = categoryRevenue.map(item => item.totalRevenue);

    // Fetch all sales records
        const sales = await Sale.find({}).lean();

        const salesByMonth = {};

        sales.forEach((sale) => {
            const monthYear = moment(sale.date).format('MMMM YYYY');
            if (!salesByMonth[monthYear]) {
                salesByMonth[monthYear] = {
                    totalOrders: 0,
                    totalRevenue: 0
                };
            }
            
            salesByMonth[monthYear].totalOrders += 1;
            salesByMonth[monthYear].totalRevenue += sale.total;
        });
    
            // Prepare chart data
        const chartData = [];

        Object.keys(salesByMonth).forEach((monthYear) => {
            const { totalOrders, totalRevenue } = salesByMonth[monthYear];
            chartData.push({
                month: monthYear.split(' ')[0],
                totalOrders: totalOrders || 0,
                totalRevenue: totalRevenue || 0
            });
        });

        console.log(chartData);

        months = [];
        odersByMonth = [];
        revnueByMonth = [];
        totalRevnue = 0;
        totalSales = 0;

            // Process chart data
        chartData.forEach((data) => {
            months.push(data.month);
            odersByMonth.push(data.totalOrders);
            revnueByMonth.push(data.totalRevenue);
            totalRevnue += Number(data.totalRevenue);
            totalSales += Number(data.totalOrders);
        });


    // Get current month's data
        const thisMonthOrder = odersByMonth.length > 0 ? odersByMonth[odersByMonth.length - 1] : 0;
        const thisMonthSales = revnueByMonth.length > 0 ? revnueByMonth[revnueByMonth.length - 1] : 0;

            // Fetch best-selling and popular products/categories
        let bestSellings = await Product.find().sort({ bestSelling: -1 }).limit(5).lean();
        let popuarProducts = await Product.find().sort({ popularity: -1 }).limit(5).lean();
        let bestSellingCategory = await Category.find().sort({ bestSelling: -1 }).limit(5).lean();

    // Render dashboard with calculated data
        res.render('admin/dashBoard', {
            categoryCount,
            revnueByMonth,
            bestSellingCategory,
            bestSellings,
            popuarProducts,
            months,
            odersByMonth,
            totalRevnue,
            categoryRevenue,
            totalSales,
            thisMonthOrder,
            thisMonthSales,
            layout: 'adminLayout'
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(HttpStatus.InternalServerError).send('Internal Server Error');
    }
};


const getSales = async (req, res) => {
    const { stDate, edDate } = req.query;

    // Convert query parameters to Date objects
    const startDate = new Date(stDate);
    const endDate = new Date(new Date(edDate).setHours(23, 59, 59, 999));

    try {
        // Fetch orders within the given date range and with 'Delivered' status
        const orders = await Order.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'Delivered',
        }).sort({ date: 'desc' });

        // Format order data
        const formattedOrders = orders.map((order) => ({
            date: moment(order.date).format('YYYY-MM-DD'),
            ...order._doc,
        }));

        let salesData = [];
        let grandTotal = 0;

        // Process sales data
        formattedOrders.forEach((order) => {
            salesData.push({
                date: order.date,
                orderId: order.orderId,
                total: order.total,
                payMethod: order.paymentMethod,
                coupon: order.coupon,
                couponUsed: order.couponUsed,
                proName: order.product,
                discountAmt: order.discountAmt,
            });
            grandTotal += order.total;
        });

        const salesCount = salesData.length;

        // Send response with sales summary
        res.json({
            grandTotal,
            salesCount,
            orders: salesData,
        });
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(HttpStatus.InternalServerError).send('Internal Server Error');
    }
};



module.exports = {
    loadDashboard,
    getSales,
};

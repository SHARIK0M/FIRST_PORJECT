const User = require('../../models/userSchema');

// Function to manage wallet transactions and display them with pagination

const walletManagement = async (req, res) => {
    try {
        // Retrieve all users from the database
        const users = await User.find({});

        let transactions = [];

        // Extract transaction history from each user
        users.forEach(user => {
            user.history.forEach(transaction => {
                console.log(`Transaction Amount: ${transaction.amount}, User: ${user.name}`);

                transactions.push({
                    transactionId: transaction.date,
                    transactionDate: new Date(transaction.date).toLocaleString(),
                    user: { name: user.name },
                    transactionType: transaction.status.startsWith("Refund") ? "Debit" : (transaction.amount < 0 ? "Debit" : "Credit"),
                });
            });
        });

        // Sort transactions in descending order (most recent first)
        transactions.sort((a, b) => new Date(b.transactionId) - new Date(a.transactionId));

        // Pagination Logic
        const page = parseInt(req.query.page) || 1; // Get current page from query or default to 1
        const limit = 10; // Number of transactions per page
        const totalTransactions = transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);

        // Get transactions for the current page
        const paginatedTransactions = transactions.slice((page - 1) * limit, page * limit);

        // Create an array of page numbers for pagination
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }

        // Render the wallet management page with transaction data
        res.render("admin/walletManagement", {
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages: totalPages,
            pages: pages, 
            layout: 'adminlayout'
        });
    } catch (error) {
        console.error("Error fetching wallet transactions:", error);
        res.status(500).send("Internal Server Error");
    }
};


// Function to fetch and display details of a specific transaction
const transactionDetails = async (req, res) => {
    try {
        const transactionDate = Number(req.params.transactionId); // Convert ID to number
        
        // Find the user who has this transaction in their history
        const user = await User.findOne({ "history.date": transactionDate }, "name email history");
        if (!user) return res.status(404).send("Transaction not found");

        // Retrieve the specific transaction
        const transaction = user.history.find(trx => trx.date === transactionDate);
        if (!transaction) return res.status(404).send("Transaction not found");

        // Extract Order ID from the transaction status if available
        const orderIdMatch = transaction.status.match(/\(Order ID: ([a-fA-F0-9]+)\)/);
        const orderId = orderIdMatch ? orderIdMatch[1] : null;

        // Prepare transaction details for rendering
        const transactionDetails = {
            transactionId: transaction.date,
            transactionDate: new Date(transaction.date).toLocaleString(),
            user: { name: user.name, email: user.email },
            transactionType: transaction.status.startsWith("Refund") ? "Debit" : (transaction.amount < 0 ? "Debit" : "Credit"),
            amount: transaction.amount,
            status: transaction.status,
            orderId: transaction.orderId
        };

        // Render the transaction details page
        res.render("admin/transactionDetails", {
            transaction: transactionDetails,
            layout: 'adminlayout'
        });
    } catch (error) {
        console.error("Error fetching transaction details:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { walletManagement, transactionDetails };
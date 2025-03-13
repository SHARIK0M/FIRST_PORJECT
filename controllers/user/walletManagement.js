const User = require("../../models/userSchema");
const Razorpay = require("razorpay")
const HttpStatus = require('../../httpStatus');

require('dotenv').config();

let instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET
})




let addMoneyToWallet = async (req, res) => {
    try {
        console.log(req.body)

        var options = {
            amount: parseInt(req.body.total) * 100,
            currency: "INR",
            receipt: "" + Date.now(),
        }
        console.log("Creating Razorpay order with options:", options);

        instance.orders.create(options, async function (error, order) {
            if (error) {
                console.log("Error while creating order : ", error);

            }
            else {

                var amount = order.amount / 100
                console.log(amount);
                await User.updateOne(
                    {
                        _id: req.session.user._id
                    },
                    {
                        $push: {
                            history: {
                                amount: amount,
                                status: "Amount Credited",
                                date: Date.now()
                            }
                        }
                    }
                )

            }
            res.json({
                order: order,
                razorpay: true
            })
        })


    } catch (error) {
        console.log("Something went wrong", error);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");

    }
}




const verifyPayment = async (req, res) => {
    try {
        let details = req.body
        console.log("req.body => ",details);
        let amount = parseInt(details.order.order.amount) / 100
        console.log("wallet amount =>" , amount)
        const updated = await User.updateOne(
            {
                _id: req.session.user._id
            },
            {
                $inc: {
                    wallet: amount
                }
            },
            { upsert: true }
        )
        console.log(updated)
        res.json({
            success: true
        })
    } catch (error) {
        console.log("Something went wrong", error);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
}



module.exports = {
    addMoneyToWallet,
    verifyPayment
}
const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema({
 
    userId: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    mobile: {
        type: String,
        required: true
    },

    addressLine1: {
        type: String,
         required: true
    },

    
    addressLine2: {
        type: String,
    },

    city: {
        type: String,
        required: true
    },

    state: {
        type: String,
        required: true
    },

    pin: {
        type: String,
        required: true
    },

    is_default: {
        type: Boolean,
        required: true
    }
})




const Address=mongoose.model('address',addressSchema);
module.exports={
    Address
}
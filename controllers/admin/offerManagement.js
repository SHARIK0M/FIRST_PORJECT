const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const productOffer = require("../../models/proOfferSchema");
const categoryOffer = require("../../models/catOfferSchema")
const moment = require('moment');
const HttpStatus = require('../../httpStatus');




const productOfferPage = async (req, res) => {
    try {
        let page = req.query.page ? req.query.page : 1;
        const limit = 3;
        
        // Fetch product offers with pagination
        let productOfferData = await productOffer.find()
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        
        const count = await productOffer.countDocuments();
        const totalPages = Math.ceil(count / limit);
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

        // Update the current status based on the date
        productOfferData.forEach(async (data) => {
            const isActive = data.endDate >= new Date() && data.startDate <= new Date();
            await productOffer.updateOne({ _id: data._id }, { $set: { currentStatus: isActive } });
        });

        // Format dates for rendering
        productOfferData = productOfferData.map((data) => {
            data.startDate = moment(data.startDate).format("YYYY-MM-DD");
            data.endDate = moment(data.endDate).format("YYYY-MM-DD");
            return data;
        });

        res.render("admin/productOffer", { layout: "adminLayout", productOfferData, pages });
    } catch (error) {
        console.error(error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};

const addProductOfferPage = async (req, res) => {
    try {
        const products = await Product.find({}).lean();
        res.render("admin/addProductOffer", { layout: "adminLayout", products });
    } catch (error) {
        console.error(error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};

const addProductOffer = async (req, res) => {
    try {
        const { productName, productOfferPercentage, startDate, endDate } = req.body;
        const product = await Product.findOne({ name: productName });
        
        // Check if an active offer already exists
        const existingOffer = await productOffer.findOne({ productId: product._id, currentStatus: true });
        if (existingOffer) return res.status(HttpStatus.BadRequest).json({ message: "Offer already exists" });
        
        const discount = parseFloat(productOfferPercentage);
        if (isNaN(discount) || discount < 5 || discount > 90) {
            return res.status(HttpStatus.BadRequest).json({ message: "Percentage must be between 5 and 90." });
        }

        const isActive = new Date(endDate) >= new Date() && new Date(startDate) <= new Date();
        
        // Check if category offer exists and apply only the greater offer
        const existingCategoryOffer = await categoryOffer.findOne({ categoryId: product.category, currentStatus: true });
        const categoryDiscount = existingCategoryOffer ? existingCategoryOffer.categoryOfferPercentage : 0;
        const finalDiscount = Math.max(discount, categoryDiscount);
        const discountPrice = product.price - (product.price * finalDiscount) / 100;

        const proOffer = new productOffer({
            productId: product._id,
            productName,
            productOfferPercentage: finalDiscount,
            discountPrice,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            currentStatus: isActive
        });

        await proOffer.save();
        return res.status(HttpStatus.OK).json({ message: "Product offer added successfully!" });
    } catch (error) {
        console.error('Error adding product offer:', error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};

const editProductOfferPage = async (req, res) => {
    try {
        const { id } = req.params;
        const editProductOfferData = await productOffer.findById(id).lean();
        const products = await Product.find().lean();
        
        let startDate = moment(editProductOfferData.startDate).format('YYYY-MM-DD');
        let endDate = moment(editProductOfferData.endDate).format('YYYY-MM-DD');

        res.render("admin/editProductOffer", { layout: "adminLayout", editProductOfferData, startDate, endDate, products });
    } catch (error) {
        console.error(error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};

const editProductOffer = async (req, res) => {
    try {
        const { offerId, productName, productOfferPercentage, startDate, endDate } = req.body;
        const productOfferData = await productOffer.findById(offerId);
        const product = await Product.findOne({ name: productName });

        const discount = parseFloat(productOfferPercentage);
        if (isNaN(discount) || discount < 5 || discount > 90) {
            return res.status(HttpStatus.BadRequest).json({ message: "Percentage must be between 5 and 90." });
        }

        // Check for existing active offers excluding the current one
        const existingActiveOffer = await productOffer.findOne({ productId: product._id, _id: { $ne: offerId }, currentStatus: true });
        if (existingActiveOffer) {
            return res.status(HttpStatus.BadRequest).json({ message: "Offer already exists for this product." });
        }

        const isActive = new Date(endDate) >= new Date() && new Date(startDate) <= new Date();
        const discountPrice = product.price - (product.price * discount) / 100;

        // Update product offer details
        Object.assign(productOfferData, {
            productName,
            productOfferPercentage: discount,
            discountPrice,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            currentStatus: isActive
        });

        await productOfferData.save();
        return res.status(HttpStatus.OK).json({ message: "Product offer updated successfully" });
    } catch (error) {
        console.error("Error editing product offer:", error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};

const deleteProductOffer = async (req, res) => {
    try {
        const { id } = req.params;
        await productOffer.findByIdAndDelete(id);
        res.status(HttpStatus.OK).send("Product offer deleted successfully.");
    } catch (error) {
        console.error(error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};



const categoryOfferPage = async (req, res) => {
    try {
        let page = req.query.page || 1;
        let limit = 2;
        
        let categoryOffers = await categoryOffer.find()
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        
        const count = await categoryOffer.countDocuments();
        const totalPages = Math.ceil(count / limit);
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

        // Update current status of each category offer
        for (const data of categoryOffers) {
            const isActive = data.endDate >= new Date() && data.startDate <= new Date();
            await categoryOffer.updateOne({ _id: data._id }, { $set: { currentStatus: isActive } });
        }

        categoryOffers = categoryOffers.map(data => ({
            ...data,
            startDate: moment(data.startDate).format('YYYY-MM-DD'),
            endDate: moment(data.endDate).format('YYYY-MM-DD')
        }));
        
        res.render("admin/categoryOffer", { layout: "adminLayout", categoryOffers, pages });
    } catch (error) {
        console.error(error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};

const addCategoryOfferPage = async (req, res) => {
    try {
        const category = await Category.find({}).lean();
        res.render("admin/addCategoryOffer", { layout: "adminLayout", category });
    } catch (error) {
        console.error(error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};


const addCategoryOffer = async (req, res) => {
    try {
        const { categoryName, categoryOfferPercentage, categoryOfferStartDate, categoryOfferEndDate } = req.body;
        const category = await Category.findOne({ category: categoryName });

        const existingOffer = await categoryOffer.findOne({ categoryId: category._id, currentStatus: true });
        if (existingOffer) return res.status(HttpStatus.BadRequest).json({ message: "Offer already exists" });

        const discount = parseFloat(categoryOfferPercentage);
        if (isNaN(discount) || discount < 5 || discount > 90) {
            return res.status(HttpStatus.BadRequest).json({ message: "Percentage must be between 5 and 90." });
        }

        const catOffer = new categoryOffer({
            categoryName,
            categoryId: category._id,
            categoryOfferPercentage: discount,
            startDate: new Date(categoryOfferStartDate),
            endDate: new Date(categoryOfferEndDate),
            currentStatus: new Date(categoryOfferEndDate) >= new Date() && new Date(categoryOfferStartDate) <= new Date()
        });
        
        await catOffer.save();
        console.log("Category Offer saved:", catOffer);

        // Apply offer to products in the category
        const productsInCategory = await Product.find({ category: category._id });
        for (const product of productsInCategory) {
            const existingProductOffer = await productOffer.findOne({ productId: product._id });
            const productDiscount = existingProductOffer ? existingProductOffer.productOfferPercentage : 0;
            const finalDiscount = Math.max(discount, productDiscount);
            const discountPrice = product.price - (product.price * finalDiscount) / 100;
            
            if (existingProductOffer) {
                Object.assign(existingProductOffer, { productOfferPercentage: finalDiscount, discountPrice, startDate: new Date(categoryOfferStartDate), endDate: new Date(categoryOfferEndDate), currentStatus: new Date(categoryOfferEndDate) >= new Date() && new Date(categoryOfferStartDate) <= new Date() });
                await existingProductOffer.save();
            } else {
                await new productOffer({ productId: product._id, productName: product.name, productOfferPercentage: finalDiscount, discountPrice, startDate: new Date(categoryOfferStartDate), endDate: new Date(categoryOfferEndDate), currentStatus: new Date(categoryOfferEndDate) >= new Date() && new Date(categoryOfferStartDate) <= new Date() }).save();
            }
        }
        return res.status(HttpStatus.OK).json({ message: "Category offer added successfully!" });
    } catch (error) {
        console.error("Error adding category offer:", error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};

const editCategoryOfferPage = async (req, res) => {
    try {
        const { id } = req.params;
        const editCategoryOfferData = await categoryOffer.findById(id).lean();
        const category = await Category.find().lean();

        res.render("admin/editCategoryOffer", {
            layout: "adminLayout",
            editCategoryOfferData,
            startDate: moment(editCategoryOfferData.startDate).format('YYYY-MM-DD'),
            endDate: moment(editCategoryOfferData.endDate).format('YYYY-MM-DD'),
            category
        });
    } catch (error) {
        console.error(error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};

const editCategoryOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryName, categoryOfferPercentage, categoryOfferStartDate, categoryOfferEndDate } = req.body;
        const discount = parseFloat(categoryOfferPercentage);
        if (isNaN(discount) || discount < 5 || discount > 90) {
            return res.status(HttpStatus.BadRequest).json({ message: "Percentage must be between 5 and 90." });
        }

        const catOffer = await categoryOffer.findById(id);
        Object.assign(catOffer, { categoryName, categoryOfferPercentage: discount, startDate: new Date(categoryOfferStartDate), endDate: new Date(categoryOfferEndDate), currentStatus: new Date(categoryOfferEndDate) >= new Date() && new Date(categoryOfferStartDate) <= new Date() });
        await catOffer.save();
        
        const category = await Category.findOne({ category: categoryName });
        const productsInCategory = await Product.find({ category: category._id });
        for (const product of productsInCategory) {
            const existingProductOffer = await productOffer.findOne({ productId: product._id });
            const discountPrice = product.price - (product.price * discount) / 100;
            
            if (existingProductOffer) {
                Object.assign(existingProductOffer, { productOfferPercentage: discount, discountPrice, startDate: new Date(categoryOfferStartDate), endDate: new Date(categoryOfferEndDate), currentStatus: new Date(categoryOfferEndDate) >= new Date() && new Date(categoryOfferStartDate) <= new Date() });
                await existingProductOffer.save();
            } else {
                await new productOffer({ productId: product._id, productName: product.name, productOfferPercentage: discount, discountPrice, startDate: new Date(categoryOfferStartDate), endDate: new Date(categoryOfferEndDate), currentStatus: new Date(categoryOfferEndDate) >= new Date() && new Date(categoryOfferStartDate) <= new Date() }).save();
            }
        }
        return res.status(HttpStatus.OK).json({ message: "Category offer updated successfully!" });
    } catch (error) {
        console.error("Error editing category offer:", error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};

const deleteCategoryOffer = async (req, res) => {
    try {
        await categoryOffer.findByIdAndDelete(req.params.id);
        res.status(HttpStatus.OK).send("Category offer deleted successfully.");
    } catch (error) {
        console.error(error.message);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
};




module.exports = {
    productOfferPage,
    addProductOfferPage,
    addProductOffer,
    editProductOfferPage,
    editProductOffer,
    deleteProductOffer,
    categoryOfferPage,   
    addCategoryOfferPage,
    addCategoryOffer,
    editCategoryOfferPage,
    editCategoryOffer,
    deleteCategoryOffer
}
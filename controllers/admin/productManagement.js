const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const fs = require("fs");
const path = require("path");
const HttpStatus = require("../../httpStatus");

// Display Product Page with Pagination
const showProduct = async (req, res) => {
  try {
    let page = req.query.page || 1;
    const limit = 4;

    const product = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "Category",
        },
      },
      { $unwind: "$Category" },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    const count = await Product.countDocuments();
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render("admin/product", { layout: "adminLayout", product, pages });
  } catch (error) {
    console.error(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Display Add Product Page
const addProductPage = async (req, res) => {
  try {
    const category = await Category.find({}).lean();
    const productExists = req.session.productExists;
    req.session.productExists = null;

    res.render("admin/add_product", {
      layout: "adminLayout",
      category,
      productExists,
    });
  } catch (error) {
    console.error(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Add a New Product
const addProduct = async (req, res) => {
  try {
    const { name, price, description, category, stock } = req.body;
    const images = req.files.map((file) => file.filename);

    const existingProduct = await Product.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingProduct) {
      req.session.productExists = true;
      return res.redirect("/admin/addProduct");
    }

    const newProduct = new Product({
      name,
      price,
      description,
      category,
      stock,
      imageUrl: images,
    });

    await newProduct.save();
    res.redirect("/admin/product");
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Display Edit Product Page
const showeditProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const productData = await Product.findById(productId).lean();
    const categories = await Category.find({ isListed: true }).lean();

    categories.forEach((category) => {
      category.isSelected =
        category._id.toString() === productData.category.toString();
    });

    res.render("admin/editProduct", {
      productData,
      categories,
      layout: "adminLayout",
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Update Product Details
const updateProduct = async (req, res) => {
  try {
    const proId = req.params.id;
    const product = await Product.findById(proId);
    const exImage = product.imageUrl;
    const updImages =
      req.files.length > 0
        ? [...exImage, ...req.files.map((file) => file.filename)]
        : exImage;

    const { name, price, description, category, stock } = req.body;

    await Product.findByIdAndUpdate(proId, {
      name,
      price,
      description,
      category,
      stock,
      isBlocked: false,
      imageUrl: updImages,
    });

    if (product.price !== price) {
      const existingOffer = await productOffer.findOne({
        productId: product._id,
        currentStatus: true,
      });

      if (existingOffer) {
        existingOffer.discountPrice =
          price - (price * existingOffer.productOfferPercentage) / 100;
        await existingOffer.save();
      }
    }

    req.session.productSave = true;
    res.redirect("/admin/product");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Delete Product Image
const deleteProdImage = async (req, res) => {
  try {
    const { id, image } = req.query;
    const product = await Product.findById(id);

    if (!product || !product.imageUrl[image]) {
      return res.status(HttpStatus.NotFound).send({ error: "Image not found" });
    }

    const deletedImage = product.imageUrl.splice(image, 1)[0];
    await product.save();

    const imagePath = path.join(
      __dirname,
      `../../public/assets/imgs/products/${deletedImage}`
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.status(200).send({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Block/Unblock Product
const blockProduct = async (req, res) => {
  try {
    const { id } = req.body;
    const product = await Product.findById(id);
    await Product.findByIdAndUpdate(id, {
      $set: { isBlocked: !product.isBlocked },
    });
    res.redirect("/admin/product");
  } catch (error) {
    console.error(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

module.exports = {
  showProduct,
  addProductPage,
  addProduct,
  showeditProduct,
  updateProduct,
  deleteProdImage,
  blockProduct,
};

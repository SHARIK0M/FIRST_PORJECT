const Product = require("../../models/productSchema");
const fs = require("fs");
const path = require("path");
const Category = require("../../models/categorySchema");
const productOffer = require("../../models/proOfferSchema"); 

// Display Products with Pagination
const showProduct = async (req, res) => {
  try {
    let page = req.query.page || 1;
    let limit = 3;

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
      { $sort: { createdAt: -1 } }, // 🔹 Sort by newest products first
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    const count = await Product.countDocuments();
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render("admin/product", { layout: "adminlayout", product, pages });
  } catch (error) {
    console.error(error);
  }
};

// Render Add Product Page
const addProductPage = async (req, res) => {
  try {
    const category = await Category.find({}).lean();
    res.render("admin/add_product", { layout: "adminlayout", category });
  } catch (error) {
    console.error(error);
  }
};


// Add New Product
const addProduct = async (req, res) => {
  try {
      const { name, price, description, category, stock } = req.body;

      // Check if a product with the same name already exists
      const existingProduct = await Product.findOne({ name: name });
      if (existingProduct) {
          return res.status(400).json({
              error: "Product name already exists! Please choose a different name."
          });
      } 

      const images = req.files.map((file) => file.filename);

      const newProduct = new Product({
          name,
          price,
          description,
          category,
          stock,
          imageUrl: images,
      });

      await newProduct.save();
      return res.json({ message: "Product added successfully!" });

  } catch (error) {
      console.error("Error creating Product:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
};





// Render Edit Product Page
const showeditProduct = async (req, res) => {
  try {
    const productData = await Product.findById(req.params.id).lean();
    const categories = await Category.find({ isListed: true }).lean();

    res.render("admin/editProduct", {
      productData,
      categories,
      layout: "adminlayout",
    });
  } catch (error) {
    console.error(error);
  }
};

const updateProduct = async (req, res) => {
  try {
    const proId = req.params.id;
    const product = await Product.findById(proId);
    let updImages = product.imageUrl;

    // Check if a cropped image was uploaded
    if (req.body.croppedImage) {
      const base64Data = req.body.croppedImage.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const filename = `cropped-${Date.now()}.png`;
      const filepath = `./public/assets/imgs/products/${filename}`;
      require("fs").writeFileSync(filepath, buffer);

      updImages.push(filename);
    }

    const { name, price, description, category, stock } = req.body;

    await Product.findByIdAndUpdate(
      proId,
      { name, price, description, category, stock, isBlocked: false, imageUrl: updImages },
      { new: true }
    );

    if (product.price !== price) {
      const existingOffer = await productOffer.findOne({
        productId: product._id,
        currentStatus: true, 
      });

      if (existingOffer) {
        const newDiscountPrice = price - (price * existingOffer.productOfferPercentage) / 100;
        existingOffer.discountPrice = newDiscountPrice;
        await existingOffer.save();
      }
    }

    req.session.productSave = true;
    res.redirect("/admin/product");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send("Internal Server Error");
  }
};


// Delete Product Image
const deleteProdImage = async (req, res) => {
  try {
    const { id, image } = req.query;
    const product = await Product.findById(id);

    if (!product) return res.status(404).send({ error: "Product not found" });

    const deletedImage = product.imageUrl.splice(image, 1)[0];
    if (!deletedImage) return res.status(400).send({ error: "Image not found" });

    await product.save();

    const imagePath = path.join(__dirname, `../../public/assets/imgs/products/${deletedImage}`);

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    } else {
      return res.status(404).send({ error: "Image file not found" });
    }

    res.status(200).send({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).send({ error: error.message });
  }
};

// Toggle Product Block Status

const blockProduct = async (req, res) => {
  try {
    const { id } = req.body;
    const product = await Product.findById(id);

    if (product) {
      await Product.findByIdAndUpdate(id, { $set: { isBlocked: !product.isBlocked } });
    }

    res.redirect("/admin/product");
  } catch (error) {
    console.error(error);
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

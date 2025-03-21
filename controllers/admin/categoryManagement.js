const Category = require("../../models/categorySchema");
const productModel = require("../../models/productSchema");
const HttpStatus = require("../../httpStatus");

// Display Category Page with Pagination
const showCategoryPage = async (req, res) => {
  try {
    let page = req.query.page ? req.query.page : 1;
    const limit = 3;
    const category = await Category.find({})
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    const count = await Category.countDocuments();
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render("admin/show_category", {
      admin: true,
      pages,
      currentPage: page,
      category,
      layout: "adminLayout",
    });
  } catch (error) {
    console.error("Error displaying category page:", error);
  }
};

// Render Add Category Page with Messages
const addCategoryPage = (req, res) => {
  try {
    let messages = {}; // Initialize an empty messages object

    if (req.session.catSave) {
      messages.catSaveMsg = "Category added successfully!";
      req.session.catSave = false; // Reset session flag
    } 
    
    if (req.session.catExist) {
      messages.catExistMsg = "Category already exists!";
      req.session.catExist = false; // Reset session flag
    }

    res.render("admin/add_category", { ...messages, layout: "adminLayout" });
  } catch (error) {
    console.error("Error rendering add category page:", error);
  }
};

// Add New Category
const addNewCategory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Invalid image type. Please upload a valid JPG, PNG, or GIF." });
    }

    const catName = req.body.name;
    const image = req.file;
    const catExist = await Category.findOne({ category: { $regex: new RegExp(`^${catName}$`, "i") } });

    if (!catExist) {
      const category = new Category({ category: catName, imageUrl: image.filename });
      await category.save();
      req.session.catSave = true;
    } else {
      req.session.catExist = true;
    }

    res.redirect("/admin/add-category");
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Toggle Category Listing Status
const unListCategory = async (req, res) => {
  try {
    const { id } = req.body;
    const category = await Category.findById(id);
    const newListed = category.isListed;

    await Category.findByIdAndUpdate(id, { isListed: !newListed }, { new: true });
    await productModel.updateMany({ category: category }, { isBlocked: newListed });

    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error updating category status:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Render Edit Category Page
const showEditCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    res.render("admin/editCategory", { layout: "adminLayout", category });
  } catch (error) {
    console.error("Error rendering edit category page:", error);
  }
};

// Update Category Details
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).send("Category not found");

    const newCategoryName = req.body.name;
    const image = req.file;
    const updatedImage = image ? image.filename : category.imageUrl;
    
    const categoryExist = await Category.findOne({
      category: { $regex: new RegExp(`^${newCategoryName}$`, "i") },
      _id: { $ne: id },
    });

    if (categoryExist) {
      req.session.catExist = true;
      return res.redirect(`/admin/edit-category/${id}`);
    }

    await Category.findByIdAndUpdate(id, { category: newCategoryName, imageUrl: updatedImage }, { new: true });
    req.session.categoryUpdate = true;
    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  addCategoryPage,
  addNewCategory,
  showCategoryPage,
  unListCategory,
  showEditCategory,
  updateCategory,
};

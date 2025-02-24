const Category = require("../../models/categorySchema");
const HttpStatus = require("../../httpStatus");

// Load Category Page
const showCategoryPage = async (req, res) => {
  try {
    let page = req.query.page ? req.query.page : 1;
    const limit = 5;

    // Fetch categories with pagination
    const category = await Category.find({})
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Count total categories
    const count = await Category.countDocuments();
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    // Category added message
    const catSaveMsg = req.session.catSave
      ? "Category added successfully..!!"
      : null;
    req.session.catSave = false;

    res.render("admin/show_category", {
      admin: true,
      pages,
      currentPage: page,
      category,
      catSaveMsg,
      layout: "adminLayout",
    });
  } catch (error) {
    console.error(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Load Add Category Page
const addCategoryPage = (req, res) => {
  try {
    const catExistMsg = req.session.catExist
      ? "Category already exists..!!"
      : null;
    req.session.catExist = false;

    res.render("admin/add_category", {
      admin: true,
      catExistMsg,
      layout: "adminLayout",
    });
  } catch (error) {
    console.error(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Add New Category
const addNewCategory = async (req, res) => {
  try {
    const catName = req.body.name;
    const image = req.file;

    // Check if category already exists (case-insensitive)
    const catExist = await Category.findOne({
      category: { $regex: new RegExp(`^${catName}$`, "i") },
    });

    if (!catExist) {
      await new Category({
        category: catName,
        imageUrl: image.filename,
      }).save();
      req.session.catSave = true;
      return res.redirect("/admin/category");
    }

    req.session.catExist = true;
    res.redirect("/admin/addCategory");
  } catch (error) {
    console.error(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Unlist Category
const unListCategory = async (req, res) => {
  try {
    const { id } = req.body;

    // Toggle category listing status
    const category = await Category.findById(id);
    await Category.findByIdAndUpdate(
      id,
      { isListed: !category.isListed },
      { new: true }
    );

    res.redirect("/admin/category");
  } catch (error) {
    console.error(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Load Edit Category Page
const showEditCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    res.render("admin/editCategory", { layout: "adminLayout", category });
  } catch (error) {
    console.error(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};

// Update Category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const newCategoryName = req.body.name;
    const image = req.file;

    // Fetch existing category
    const category = await Category.findById(id).lean();
    const updImage = image ? image.filename : category.imageUrl;

    // Check if category name already exists (excluding current category)
    const categoryExist = await Category.findOne({
      category: { $regex: new RegExp(`^${newCategoryName}$`, "i") },
      _id: { $ne: id },
    });

    if (categoryExist) {
      req.session.catExist = true;
      return res.redirect(`/admin/editCategory/${id}`);
    }

    await Category.findByIdAndUpdate(
      id,
      { category: newCategoryName, imageUrl: updImage },
      { new: true }
    );
    req.session.categoryUpdate = true;
    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
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

const multer = require("multer");
const path = require("path");

// Allowed file types for image uploads
const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "image/avif": "avif",
};

// Storage configuration for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    const uploadError = isValid ? null : new Error("Invalid image type");

    cb(uploadError, path.join(__dirname, "../public/assets/imgs/products"));
  },
  filename: function (req, file, cb) {
    const fileName = Date.now() + "_" + file.originalname;
    cb(null, fileName);
  },
});

// Multer instance for handling both single and multiple uploads
const store = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (FILE_TYPE_MAP[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
});

// Middleware to handle various image upload scenarios
const uploadImages = {
  categoryImage: store.single("image"), // For categories (single image)
  productImages: store.array("image", 5), // For products (multiple images)
};

module.exports = uploadImages;

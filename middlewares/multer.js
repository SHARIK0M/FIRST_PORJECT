const fs = require("fs");
const multer = require("multer");
const path = require("path");

// Allowed file types for image uploads
const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "image/avif": "avif",
};

// Function to configure storage for different upload types
const configureStorage = (folderName) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      const isValid = FILE_TYPE_MAP[file.mimetype];
      const uploadError = isValid ? null : new Error("Invalid image type");

      const uploadPath = path.join(__dirname, `../public/assets/imgs/${folderName}`);

      // Ensure the folder exists before saving
      fs.mkdir(uploadPath, { recursive: true }, (err) => {
        if (err) {
          console.error("Error creating upload directory:", err);
          return cb(err);
        }
        cb(uploadError, uploadPath);
      });
    },
    filename: function (req, file, cb) {
      const fileName = `${Date.now()}_${file.originalname}`;
      cb(null, fileName);
    },
  });
};

// Multer instances for different upload types
const profileStorage = configureStorage("profiles");
const productStorage = configureStorage("products");

// Middleware for different image upload scenarios
const uploadImages = {
  profileImage: multer({ storage: profileStorage }).single("image"), // For profile pictures (single image)
  categoryImage: multer({ storage: productStorage }).single("image"), // For categories (single image)
  productImages: multer({ storage: productStorage }).array("image", 5), // For products (multiple images)
};

module.exports = uploadImages;

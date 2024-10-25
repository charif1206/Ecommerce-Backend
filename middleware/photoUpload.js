const path = require("path");
const multer = require("multer");

// Configure disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "../images")); // Save in uploads folder
    },
    filename: function (req, file, cb) {
        cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname);
    },
});
// Initialize multer with the storage configuration
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith("image")) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only images are allowed!"), false);
        }
    },
    limits: {
        fileSize: 1024 * 1024 * 5, // Limit file size to 5MB
    },
});

module.exports = {upload};

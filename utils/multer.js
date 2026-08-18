const multer = require("multer");

// Keep files in memory — no temp folder needed.
// Cloudinary uploads are done directly from the buffer in the controller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/webp"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format. Use PNG, JPEG, or WEBP."), false);
    }
  },
});

module.exports = upload;

const multer = require("multer");

// Keep files in memory — no temp folder needed.
// Cloudinary uploads are done directly from the buffer in the controller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file to support short video clips
  fileFilter: function (req, file, cb) {
    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "video/mp4",
      "video/quicktime", // .mov
      "video/webm",
      "video/mpeg",
      "video/avi",
      "application/pdf", // For CAC documents
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file format. Use PNG, JPEG, WEBP, PDF, or video files (MP4, WEBM, MOV)."
        ),
        false
      );
    }
  },
});

module.exports = upload;

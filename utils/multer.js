const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString() + "_" + file.originalname);
  },
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname + "/uploads/"));
  },
});

const upload = multer({
  storage: storage,
  limits: 10 * (1024 * 1024), //5mb (max image size)
  fileFilter: function (req, file, cb) {
    if (file.mimetype === "image/png" || file.mimetype === "image/jpeg") {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format/type!"), false);
    }
  },
});

module.exports = upload;

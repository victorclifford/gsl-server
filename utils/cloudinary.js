const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a multer memoryStorage file directly to Cloudinary.
 * @param {Express.Multer.File} file - The file object from req.file / req.files
 * @param {object} options - Additional cloudinary uploader options (folder, public_id, overwrite, etc.)
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadImage = async (file, options = {}) => {
  const b64 = Buffer.from(file.buffer).toString("base64");
  const dataURI = `data:${file.mimetype};base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataURI, {
    transformation: [
      { width: 1200, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
    ...options,
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
  };
};

module.exports = {
  cloudinary,
  uploadImage,
};

// import dotenv from "dotenv";
const dotenv = require("dotenv");

dotenv.config();

const config = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY,
  HOMEPAGE: process.env.HOMEPAGE,
  EMAIL_SERVICE: process.env.EMAIL_SERVICE,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_USERNAME: process.env.EMAIL_USERNAME,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};
// export default config;
module.exports = config;

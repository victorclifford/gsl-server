const mongoose = require("mongoose");
const User = require("../models/UserModel");
const Auth = require("../models/AuthModel");
const Product = require("../models/ProductModel");

const runDbMigration = async () => {
  try {
    console.log("Checking for database migrations...");

    // 1. User Auth migration
    const usersToMigrate = await User.find({
      $or: [
        { password: { $exists: true, $ne: null } },
        { refreshToken: { $exists: true, $ne: null } },
        { verification_token: { $exists: true, $ne: null } },
        { resetPasswordToken: { $exists: true, $ne: null } },
        { token: { $exists: true, $ne: null } }
      ]
    });

    if (usersToMigrate.length > 0) {
      console.log(`Migrating auth & credential data for ${usersToMigrate.length} user(s)...`);
      for (const user of usersToMigrate) {
        const userObj = user.toObject();
        const updateData = {};

        if (userObj.password) updateData.password = userObj.password;
        if (userObj.refreshToken) updateData.refreshToken = userObj.refreshToken;
        if (userObj.verification_token) updateData.verification_token = userObj.verification_token;
        if (userObj.verificationExpiry) updateData.verificationExpiry = userObj.verificationExpiry;
        if (userObj.resetPasswordToken) updateData.resetPasswordToken = userObj.resetPasswordToken;
        if (userObj.resetPasswordExpiration) updateData.resetPasswordExpiration = userObj.resetPasswordExpiration;

        if (Object.keys(updateData).length > 0) {
          await Auth.collection.updateOne(
            { userId: user._id },
            { $set: updateData },
            { upsert: true }
          );
        }

        await User.collection.updateOne(
          { _id: user._id },
          {
            $unset: {
              password: "",
              token: "",
              refreshToken: "",
              verification_token: "",
              verificationExpiry: "",
              resetPasswordToken: "",
              resetPasswordExpiration: ""
            }
          }
        );
      }
      console.log("User auth migration complete.");
    }

    // 2. Product productCode migration
    const productsToMigrate = await Product.find({
      $or: [{ productCode: { $exists: false } }, { productCode: "" }],
    });
    if (productsToMigrate.length > 0) {
      console.log(`Migrating ${productsToMigrate.length} products to assign productCode...`);
      for (let product of productsToMigrate) {
        product.productCode = "GSL-" + product._id.toString().slice(-6).toUpperCase();
        await product.save();
      }
      console.log("Product code migration complete.");
    }

    console.log("✅ Database migration completed successfully!");
  } catch (error) {
    console.error("❌ Database migration failed:", error.message);
  }
};

module.exports = runDbMigration;

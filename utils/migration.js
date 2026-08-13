const mongoose = require("mongoose");
const User = require("../models/UserModel");
const Auth = require("../models/AuthModel");

const runDbMigration = async () => {
  try {
    console.log("Checking for database migrations...");

    // Find any users that still have old token or credential fields in the user document
    const usersToMigrate = await User.find({
      $or: [
        { password: { $exists: true, $ne: null } },
        { refreshToken: { $exists: true, $ne: null } },
        { verification_token: { $exists: true, $ne: null } },
        { resetPasswordToken: { $exists: true, $ne: null } },
        { token: { $exists: true, $ne: null } }
      ]
    });

    if (usersToMigrate.length === 0) {
      console.log("No users need database migration.");
      return;
    }

    console.log(`Migrating auth & credential data for ${usersToMigrate.length} user(s)...`);

    for (const user of usersToMigrate) {
      const userObj = user.toObject();
      const updateData = {};

      // Map existing values to Auth collection (copying hash directly without re-hashing)
      if (userObj.password) updateData.password = userObj.password;
      if (userObj.refreshToken) updateData.refreshToken = userObj.refreshToken;
      if (userObj.verification_token) updateData.verification_token = userObj.verification_token;
      if (userObj.verificationExpiry) updateData.verificationExpiry = userObj.verificationExpiry;
      if (userObj.resetPasswordToken) updateData.resetPasswordToken = userObj.resetPasswordToken;
      if (userObj.resetPasswordExpiration) updateData.resetPasswordExpiration = userObj.resetPasswordExpiration;

      // Update Auth collection directly (bypassing Mongoose pre-save password-hashing hook)
      if (Object.keys(updateData).length > 0) {
        await Auth.collection.updateOne(
          { userId: user._id },
          { $set: updateData },
          { upsert: true }
        );
      }

      // Clean up fields from the User document using raw MongoDB driver to bypass Mongoose strict schema filtering
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

    console.log("✅ Database migration completed successfully!");
  } catch (error) {
    console.error("❌ Database migration failed:", error.message);
  }
};

module.exports = runDbMigration;

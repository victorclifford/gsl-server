require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../utils/config");
const { signupValidationSchema } = require("../utils/validationSchemas");
const ErrorResponse = require("../utils/errorResponse");

const Schema = mongoose.Schema;
const UserSchema = new Schema(
  {
    //users fistname
    firstname: {
      type: String,
      required: true,
    },
    //users lastname
    lastname: {
      type: String,
      required: true,
    },
    //users slug (optional)
    slug: {
      type: String,
      required: false,
    },
    //mobile number
    phoneNumber: {
      type: String,
      required: true,
    },
    //email
    email: {
      type: String,
      required: true,
      unique: true,
    },
    //if user is a super admin
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },
    //if user has verified the email provided
    is_verified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);



UserSchema.methods.getSignedToken = async function () {
  const signedToken = await jwt.sign(
    {
      id: this._id,
      isAdmin: this.isAdmin,
      isSuperAdmin: this.isSuperAdmin,
    },
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRY,
    }
  );
  return signedToken;
};

UserSchema.methods.getSignedRefreshToken = async function () {
  const signedRefreshToken = await jwt.sign(
    { id: this._id },
    config.REFRESH_TOKEN_SECRET,
    {
      expiresIn: config.REFRESH_TOKEN_EXPIRY,
    }
  );
  return signedRefreshToken;
};

module.exports = mongoose.model("User", UserSchema);

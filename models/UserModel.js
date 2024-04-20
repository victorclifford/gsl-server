require("dotenv").config;
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
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
    //users slug
    slug: {
      type: String,
      required: true,
    },
    //hashed user password
    password: {
      type: String,
      required: true,
      select: false,
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
    //jwt signed token
    token: {
      type: String,
      select: false,
    },
    verification_token: {
      type: String,
    },
    // verification_code: {
    //   type: String,
    // },
    verificationExpiry: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpiration: {
      type: Date,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // generate salt, and hash password with generated salt
  const salt = await bcrypt.genSalt(10);
  //   console.log("ppp::", this.password);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPasswords = async function (password) {
  // console.log("db-pass::", this.password);
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.getSignedToken = async function () {
  const signedToken = await jwt.sign({ id: this._id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRY,
  });
  this.token = signedToken;
  return signedToken;
};

//method to generate the reset password token
UserSchema.methods.getResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  //now hashing the generated token and save to the user schema
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //setting the token expiry
  this.resetPasswordExpiration = Date.now() + 10 * (60 * 1000);

  return resetToken;
};

//method to generate verification token
UserSchema.methods.getVerificationToken = async function () {
  const verificationToken = crypto.randomBytes(12).toString("hex");

  //hashing verification code (*will be saved and used to find user*)
  this.verification_token = crypto
    .createHmac("sha256", process.env.HASH_SALT)
    .update(verificationToken)
    .digest("hex");

  //setting the verification code expiry
  this.verificationExpiry = Date.now() + 7 * 24 * (60 * 1000);

  //   console.log("verificationToken on method::", this.verification_token);
  return this.verification_token;
};

//method to generate verification code
UserSchema.methods.getVerificationCode = function () {
  const verificationCode = crypto
    .randomInt(0, 1000000)
    .toString()
    .padStart(6, 0);

  //hashing verification code (*will be saved and used to find user*)
  this.verification_code = crypto
    .createHmac("sha256", process.env.HASH_SALT)
    .update(verificationCode)
    .digest("hex");

  //setting the verification code expiry
  this.verificationExpiry = Date.now() + 60 * 24 * (60 * 1000);

  return verificationCode;
};

module.exports = mongoose.model("User", UserSchema);

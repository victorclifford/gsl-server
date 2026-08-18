const crypto = require("crypto");
const User = require("../models/UserModel");
const Auth = require("../models/AuthModel");
const ErrorResponse = require("../utils/errorResponse");
const config = require("../utils/config");
const { sendEmail } = require("../utils/sendEmail");
const sendMail2 = require("../utils/sendEmail2");
const { signupValidationSchema } = require("../utils/validationSchemas");
const jwt = require("jsonwebtoken");
const { firstLetterInStringToUppercase } = require("../utils/helpers.js");

const sendToken = async (user, statusCode, message, res) => {
  const accessToken = await user.getSignedToken();
  const refreshToken = await user.getSignedRefreshToken();

  // Save the refresh token to the Auth document associated with the user
  let auth = await Auth.findOne({ userId: user._id });
  if (!auth) {
    auth = new Auth({ userId: user._id });
  }
  auth.refreshToken = refreshToken;
  await auth.save();

  // Record the last login timestamp
  user.lastLogin = Date.now();
  await user.save();

  const sanitizedUser = {
    _id: user._id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    phoneNumber: user.phoneNumber,
    isAdmin: Boolean(user.isAdmin),
    isSuperAdmin: Boolean(user.isSuperAdmin),
    is_verified: Boolean(user.is_verified),
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    token: accessToken,
    accessToken,
    refreshToken,
  };

  return res.status(statusCode).json({
    success: true,
    message,
    accessToken,
    refreshToken,
    data: {
      user: sanitizedUser,
    },
  });
};

const getUserFromToken = async (token) => {
  try {
    if (token) {
      const userId = jwt.verify(token, process.env.JWT_SECRET);
      //  const user = await User.findById(userId)
      //  return user
      return userId;
    }
    return null;
  } catch (error) {
    console.log("errVerifyingToken::", error);
    return null;
  }
};

//signup user controller func
const signupUser = async (req, res, next) => {
  try {
    // 1. Validate input shape with Yup schema
    await signupValidationSchema.validate(req.body, { abortEarly: true });

    const { firstName, lastName, phonenumber, phoneNumber, email, password } =
      req.body;

    const cleanEmail = email.toLowerCase().trim();
    const phone = (phoneNumber || phonenumber || "").trim();

    if (!phone) {
      return next(new ErrorResponse("Phone number is required", 400));
    }

    // 2. Check if email already exists in DB
    const userExist = await User.findOne({ email: cleanEmail });
    if (userExist) {
      return next(
        new ErrorResponse(
          "This email is already in use!",
          400,
          "duplicateKeys",
        ),
      );
    }

    // 3. Create user record
    const user = await User.create({
      firstname: firstLetterInStringToUppercase(firstName.trim()),
      lastname: firstLetterInStringToUppercase(lastName.trim()),
      phoneNumber: phone,
      email: cleanEmail,
    });

    // 5. Generate verification token and save to Auth document
    const verificationToken = crypto.randomBytes(12).toString("hex");
    const salt = process.env.HASH_SALT || config.JWT_SECRET || "gosolar_verification_salt_2026";
    const hashedToken = crypto
      .createHmac("sha256", salt)
      .update(verificationToken)
      .digest("hex");

    const auth = new Auth({
      userId: user._id,
      password, // Password will be hashed by Auth schema pre-save hook
      verification_token: hashedToken,
      verificationExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    await auth.save();

    const tokenWithId = `${verificationToken}${user._id}`;
    const verificationUrl = `${config.HOMEPAGE}/auth/verify/${tokenWithId}`;

    sendEmail({
      from: config.EMAIL_FROM,
      to: user.email,
      name: user.firstname,
      subject: "Activate Your Go Solar Account",
      verificationUrl,
      template: "welcome",
    });

    // 6. Return a simple success — no tokens until the account is verified
    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your inbox for a verification link.",
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      error.statusCode = 400;
    }
    return next(error);
  }
};

//----------------LOGIN USER ----------------
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  console.log("args::", { ...req.body });

  if (!email || !password) {
    return next(
      new ErrorResponse("please provide an EMAIL and PASSWORD!", 400),
    );
  }
  try {
    //getting user by email entered for login
    const user = await User.findOne({ email });
    //check if any user by such email exists
    if (!user) {
      return next(new ErrorResponse("invalid EMAIL or PASSWORD!", 404));
    }
    //if user exist, then match encrypted password from Auth record
    const auth = await Auth.findOne({ userId: user._id });
    const isMatch = auth ? await auth.matchPasswords(password) : false;
    if (!isMatch) {
      return next(
        new ErrorResponse(
          "invalid EMAIL or PASSWORD!",
          401,
          "Validation Error",
        ),
      );
    }
    // Block login for unverified accounts
    if (!user.is_verified) {
      return next(
        new ErrorResponse(
          "Your account is not verified. Please check your inbox for the activation link.",
          403,
          "UnverifiedAccount",
        ),
      );
    }
    //if passwords where matched correctly then send token and login user
    sendToken(user, 200, "Authentication Successful", res);
  } catch (error) {
    return next(error);
  }
};

//--------FORGOT PASSWORD ---------------------
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    //checking if email actually exists
    if (!user) {
      return next(new ErrorResponse("Email not registered!", 404));
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    let auth = await Auth.findOne({ userId: user._id });
    if (!auth) {
      auth = new Auth({ userId: user._id });
    }
    auth.resetPasswordToken = resetPasswordToken;
    auth.resetPasswordExpiration = Date.now() + 10 * 60 * 1000; // 10 minutes
    await auth.save();

    //create reset link
    const host = config.HOMEPAGE;
    const resetURL = `${host}/auth/reset-password/${resetToken}`;
    console.log(`sending reset password email to ${email}...`);

    try {
      sendEmail({
        from: config.EMAIL_FROM,
        to: user.email,
        name: user.firstname,
        subject: "Forgot Your Password?",
        resetURL,
        template: "forget-password",
      });
    } catch (e) {
      // Clear fields on email failure
      auth.resetPasswordToken = undefined;
      auth.resetPasswordExpiration = undefined;
      await auth.save();

      return next(new ErrorResponse("Failed to send mail", 500));
    }

    return res
      .status(200)
      .json({ success: true, data: "Email sent! Please check your inbox" });
  } catch (error) {
    return next(error);
  }
};

const requestUserVerification = async (req, res, next) => {
  try {
    // const token = req.get("Authorization");
    // console.log({ token });

    // const decryptedUser = await getUserFromToken(token.split(" ")[1]);

    // if (!decryptedUser) {
    //   return next(new ErrorResponse("Please login to continue", 400));
    // }

    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: `Pls check your inbox. If your email was registered with us, a verification link will be sent to "${cleanEmail}"`,
      });
    }

    // Generate verification token and save to Auth document
    const verificationToken = crypto.randomBytes(12).toString("hex");
    const salt = process.env.HASH_SALT || config.JWT_SECRET || "gosolar_verification_salt_2026";
    const hashedToken = crypto
      .createHmac("sha256", salt)
      .update(verificationToken)
      .digest("hex");

    let auth = await Auth.findOne({ userId: user._id });
    if (!auth) {
      auth = new Auth({ userId: user._id });
    }
    auth.verification_token = hashedToken;
    auth.verificationExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    await auth.save();

    const tokenWithId = `${verificationToken}${user._id}`;
    const host = config.HOMEPAGE;
    const verificationUrl = `${host}/auth/verify/${tokenWithId}`;

    sendEmail({
      from: config.EMAIL_FROM,
      to: user.email,
      name: user.firstname,
      subject: "Activate Your Go Solar Account",
      verificationUrl,
      template: "welcome",
    });

    const message = `A verification link has been sent to ${user.email}`;

    return res.status(200).json({
      success: true,
      message,
      //  data: { user },
    });
  } catch (error) {
    return next(error);
  }
};

const userVerification = async (req, res, next) => {
  try {
    const { verifytoken } = req.params;

    let query = {};
    if (verifytoken && verifytoken.length === 48) {
      // New format: unhashed token (24 chars) + userId (24 chars)
      const plainToken = verifytoken.slice(0, 24);
      const userId = verifytoken.slice(24);
      const salt = process.env.HASH_SALT || config.JWT_SECRET || "gosolar_verification_salt_2026";
      const hashedToken = crypto
        .createHmac("sha256", salt)
        .update(plainToken)
        .digest("hex");
      query = { verification_token: hashedToken, userId };
    } else if (verifytoken && verifytoken.length === 88) {
      // Legacy format: hashed token (64 chars) + userId (24 chars)
      const hashedToken = verifytoken.slice(0, 64);
      const userId = verifytoken.slice(64);
      query = { verification_token: hashedToken, userId };
    } else if (verifytoken && verifytoken.length === 64) {
      // Hashed token only
      query = { verification_token: verifytoken };
    } else if (verifytoken && verifytoken.length === 24) {
      // Unhashed token only
      const salt = process.env.HASH_SALT || config.JWT_SECRET || "gosolar_verification_salt_2026";
      const hashedToken = crypto
        .createHmac("sha256", salt)
        .update(verifytoken)
        .digest("hex");
      query = { verification_token: hashedToken };
    } else {
      return next(new ErrorResponse("Invalid verification token format", 400));
    }

    // Find Auth record
    const auth = await Auth.findOne(query);

    if (!auth || !auth.verificationExpiry || auth.verificationExpiry.getTime() <= Date.now()) {
      return next(
        new ErrorResponse("Invalid or expired verification code", 401)
      );
    }

    // Find user to verify
    const user = await User.findById(auth.userId);
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    // Verify user if user was found
    user.is_verified = true;
    await user.save();

    // Clear verification fields from Auth record
    auth.verification_token = undefined;
    auth.verificationExpiry = undefined;
    await auth.save();

    const message = "Verification successful";
    return res.status(200).json({
      success: true,
      message,
      data: { user },
    });
  } catch (error) {
    return next(error);
  }
};

//--------------------reset password --------------
const resetPassword = async (req, res, next) => {
  console.log({ resettoken: req.params.resettoken });
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");

  try {
    const auth = await Auth.findOne({
      resetPasswordToken,
      resetPasswordExpiration: { $gt: Date.now() },
    });

    if (!auth) {
      return next(new ErrorResponse("invalid Reset Token!", 400));
    }

    //validate password
    if (!req.body.password) {
      return next(
        new ErrorResponse(
          "Please provide your new password",
          400,
          "validationError",
        ),
      );
    }

    const user = await User.findById(auth.userId);
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    auth.password = req.body.password;
    auth.resetPasswordToken = undefined;
    auth.resetPasswordExpiration = undefined;
    await auth.save();

    //send mail
    sendEmail({
      from: config.EMAIL_FROM,
      to: user.email,
      name: user.firstname,
      subject: "Password Reset Successful",
      template: "password-reset-success",
    });

    return res.status(201).json({
      success: true,
      message: "Password Reset Successful",
    });
  } catch (error) {
    return next(error);
  }
};

//---------------- REFRESH TOKEN ----------------
const refreshToken = async (req, res, next) => {
  const token = req.body.refreshToken || req.headers["x-refresh-token"];

  if (!token) {
    return next(new ErrorResponse("Refresh token is required", 400));
  }

  try {
    const decoded = jwt.verify(token, config.REFRESH_TOKEN_SECRET);
    const auth = await Auth.findOne({ userId: decoded.id });

    if (!auth || auth.refreshToken !== token) {
      return next(
        new ErrorResponse(
          "Invalid or expired refresh token. Please login again.",
          401,
        ),
      );
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(
        new ErrorResponse(
          "User not found.",
          404,
        ),
      );
    }

    const newAccessToken = await user.getSignedToken();
    const newRefreshToken = await user.getSignedRefreshToken();

    auth.refreshToken = newRefreshToken;
    await auth.save();

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return next(
      new ErrorResponse(
        "Invalid or expired refresh token. Please login again.",
        401,
      ),
    );
  }
};

//---------------- LOGOUT USER ----------------
const logoutUser = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.headers["x-refresh-token"];

    if (token) {
      try {
        const decoded = jwt.verify(token, config.REFRESH_TOKEN_SECRET);
        await Auth.updateOne(
          { userId: decoded.id },
          { $unset: { refreshToken: "" } }
        );
      } catch (jwtErr) {
        // Token is already expired or invalid, nothing to invalidate
      }
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
};

//---------------- UPDATE USER PROFILE ----------------
const updateUserProfile = async (req, res, next) => {
  try {
    const { firstname, lastname, phoneNumber } = req.body;
    const user = req.user;

    if (firstname) user.firstname = firstLetterInStringToUppercase(firstname.trim());
    if (lastname) user.lastname = firstLetterInStringToUppercase(lastname.trim());
    if (phoneNumber !== undefined) user.phoneNumber = (phoneNumber || "").trim();

    await user.save();

    const sanitizedUser = {
      _id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isAdmin: Boolean(user.isAdmin),
      isSuperAdmin: Boolean(user.isSuperAdmin),
      is_verified: Boolean(user.is_verified),
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: sanitizedUser,
      },
    });
  } catch (error) {
    return next(error);
  }
};

//---------------- CHANGE PASSWORD ----------------
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return next(new ErrorResponse("Please provide current and new passwords", 400));
    }

    const auth = await Auth.findOne({ userId: user._id });
    if (!auth) {
      return next(new ErrorResponse("Authentication credentials not found", 404));
    }

    const isMatch = await auth.matchPasswords(currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse("Invalid current password", 401));
    }

    auth.password = newPassword;
    await auth.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  signupUser,
  loginUser,
  forgotPassword,
  resetPassword,
  userVerification,
  requestUserVerification,
  refreshToken,
  logoutUser,
  updateUserProfile,
  changePassword,
};
